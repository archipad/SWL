/* Audit de PARTIE COMPLÈTE pour une liste importée (22/09/2026).
   Objectif : avant une partie, vérifier qu'AUCUN mot-clé, amélioration ou information ne pose
   problème pour les troupes réellement jouées -- pas seulement un échantillon de cartes de
   démonstration. Le vrai Assistant (app.js) est chargé dans jsdom, exactement comme
   test-assistant-parcours.mjs, mais piloté par un joueur générique (scripts/lib/auto-attack.mjs)
   qui rejoue :
     1. La fiche de CHAQUE unité (et de ses améliorations) des deux listes : chaque mot-clé imprimé
        sur la carte doit être visible quelque part sur la fiche (« information au bon endroit »).
     2. UNE attaque complète pour CHAQUE arme de CHAQUE unité, contre CHAQUE unité adverse, dans les
        deux sens (liste A → liste B puis B → A) : portée, contrôle de tir, contrôles de ciblage,
        dés, couvert, modificateurs, défense, résumé -- jusqu'à l'écran final ou un blocage réel.
     3. Les actions de fiche (mots-clés hors combat, effets de carte) disponibles sans configuration
        préalable, une fois chacune.

   Usage :
     node scripts/audit-list-playthrough.mjs <liste.json> [autre-liste.json]
     node scripts/audit-list-playthrough.mjs --list scripts/fixtures/tabletop-admiral-empire.json
   Le fichier est le même texte qu'on colle dans l'écran d'import (export Tabletop Admiral, JSON
   ou texte). Si une seule liste est fournie, elle est dupliquée pour avoir un adversaire.
   Code de sortie 1 s'il reste des cartes non certifiées, un blocage ou une information absente. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { openAssistant } from './lib/assistant-harness.mjs'
import { autoResolveAttack, norm } from './lib/auto-attack.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const files = args.filter((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--list' && args[i - 1] !== '--max-attacks')
const listArg = flag('--list')
if (listArg) files.unshift(listArg)
const maxAttacks = Number(flag('--max-attacks') || 400)

if (!files.length) {
  console.error('Usage : node scripts/audit-list-playthrough.mjs <liste.json> [autre-liste.json] [--max-attacks N]')
  console.error('Exemple : node scripts/audit-list-playthrough.mjs scripts/fixtures/tabletop-admiral-empire.json scripts/fixtures/tabletop-admiral-rebel.json')
  process.exit(1)
}

const findings = [] // { level: 'error'|'warning', scope, message }
const say = (level, scope, message) => { findings.push({ level, scope, message }); console.log(`${level === 'error' ? '✗' : '⚠'} [${scope}] ${message}`) }

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
try {
  const { importArmyList } = await vite.ssrLoadModule('/src/lib/importList.ts')
  const { auditImportedList } = await vite.ssrLoadModule('/src/lib/importAudit.ts')

  const readList = (file) => importArmyList(fs.readFileSync(path.resolve(file), 'utf8'))
  const listA = readList(files[0])
  const listB = files[1] ? readList(files[1]) : listA
  if (!files[1]) console.log('Une seule liste fournie : elle est dupliquée comme adversaire pour avoir des cibles.')

  console.log('')
  let blockingCertification = false
  for (const [label, list] of [['Liste A', listA], ['Liste B', listB]]) {
    const audit = auditImportedList(list)
    console.log(`${label} « ${list.listName || 'sans nom'} » : ${list.units.length} unité(s), ${audit.cards} carte(s), ${audit.readyCards} déjà prête(s)`)
    if (audit.catalogIssues.length) {
      blockingCertification = true
      for (const issue of audit.catalogIssues) say('error', 'catalogue', `${issue.unit} → ${issue.card} : ${issue.message}`)
    }
    if (!audit.safeForEngine) {
      blockingCertification = true
      for (const issue of audit.certificationIssues) if (issue.message !== 'Certification complète de la carte manquante') say('error', 'certification', `${issue.unit} → ${issue.card} : ${issue.message}`)
    }
  }
  if (blockingCertification) {
    console.error('\nCertification insuffisante pour jouer cette liste en toute confiance : corrigez les cartes ci-dessus dans l’écran « Certification des cartes », puis relancez cet audit.')
    process.exit(1)
  }
  console.log('Certification : toutes les cartes utilisées ont des dés/défense/courage certifiés. Poursuite de l’audit.\n')

  const toEntries = (list) => list.units.map((unit) => ({ name: unit.name, upgrades: unit.upgrades.map((upgrade) => ({ name: upgrade.name })) }))
  const p1 = { listName: listA.listName || 'Liste A', faction: listA.faction || '', units: toEntries(listA) }
  const p2 = { listName: listB.listName || 'Liste B', faction: listB.faction || '', units: toEntries(listB) }

  const app = await openAssistant({ 'swl.list.p1.v1': p1, 'swl.list.p2.v1': p2, 'swl.assistant.player-side.v1': 'p1' })
  const evalStr = (code) => app.window.eval(code)
  const evalJson = (code) => JSON.parse(evalStr(`JSON.stringify(${code})`))
  const keywordNames = Object.fromEntries(evalJson('window.SWL_REFERENCE.keywords').map((keyword) => [keyword.id, keyword.name]))
  const shortName = (id) => norm((keywordNames[id] || id).split(':')[0].replace(/\s+X\b.*$/i, ''))

  const setArmy = async (side) => { await app.click(app.$$('.army-switch button').find((button) => button.dataset.army === side) || app.$(`[data-army="${side}"]`)); }
  const resetToPicker = async () => { evalStr('attackState=null;attackStep=0;attacker=null;defender=null;stage=1;stageWipe=true;pick("attacker")'); await app.settle() }
  // Le nom importé (anglais, Tabletop Admiral) n'est pas forcément le texte affiché sur la tuile
  // (traduction FR) : on retrouve l'identifiant réel de l'entrée en jeu plutôt que de faire
  // correspondre du texte, pour rester robuste à toute carte dont la traduction diffère du nom importé.
  const entryIdFor = (sideId, unitName) => evalStr(`entries.find(e=>e.army===${JSON.stringify(sideId)}&&e.unit.name===${JSON.stringify(unitName)}&&e.occurrence===1)?.id||null`)
  const clickTileById = async (id, label) => {
    const tile = id ? app.$(`.unit-tile[data-id="${id}"]`) : null
    if (!tile) { say('error', 'sélection', `${label} : tuile introuvable dans le sélecteur d’unité (id attendu : ${id})`); return false }
    await app.click(tile)
    app.dismissDialogs()
    await app.settle()
    return true
  }

  const sides = [{ id: 'p1', list: listA }, { id: 'p2', list: listB }]
  const uniqueUnits = (list) => { const seen = new Set(); return list.units.filter((unit) => (seen.has(unit.name) ? false : (seen.add(unit.name), true))) }

  // --- 1. Fiche de chaque unité et de ses améliorations : chaque mot-clé imprimé doit être visible. ---
  console.log('--- Fiches d’unité : chaque mot-clé imprimé doit apparaître sur la fiche ---')
  let sheetsChecked = 0, cardsChecked = 0
  for (const side of sides) {
    await setArmy(side.id)
    for (const unit of uniqueUnits(side.list)) {
      if (!(await clickTileById(entryIdFor(side.id, unit.name), unit.name))) continue
      if (!app.$('.overview')) { say('error', 'fiche', `${unit.name} : la fiche d’unité ne s’est pas affichée`); continue }
      sheetsChecked += 1
      const sheetText = norm(app.text(app.$('#app')))
      const cards = [unit.name, ...unit.upgrades.map((upgrade) => upgrade.name)]
      for (const cardName of cards) {
        cardsChecked += 1
        const cardKey = evalStr(`cardKey(${JSON.stringify(cardName)})`)
        const tags = evalJson(`window.SWL_REFERENCE.tags[${JSON.stringify(cardKey)}]||[]`)
        for (const tag of tags) {
          if (!sheetText.includes(shortName(tag.keywordId))) say('error', 'placement', `${unit.name} : le mot-clé « ${keywordNames[tag.keywordId] || tag.keywordId} » (carte ${cardName}) n’apparaît pas sur la fiche`)
        }
      }
      await app.click('#back')
    }
  }
  console.log(`${sheetsChecked} fiche(s) contrôlée(s), ${cardsChecked} carte(s) (unités + améliorations).\n`)

  // --- 2. Une attaque complète par arme, par unité attaquante, contre chaque unité adverse, dans les deux sens. ---
  console.log('--- Attaques : chaque arme, contre chaque unité adverse, dans les deux sens ---')
  let attacksRun = 0, attacksBlocked = 0, attacksWithNewErrors = 0
  const cardFxSeen = new Set()
  outer: for (const [attackerSide, defenderSide] of [[sides[0], sides[1]], [sides[1], sides[0]]]) {
    await setArmy(attackerSide.id)
    for (const unit of uniqueUnits(attackerSide.list)) {
      const weapons = evalJson(`(() => {
        const cards=[${JSON.stringify(unit.name)}, ...(${JSON.stringify(unit.upgrades.map((u) => u.name))})]
        return cards.flatMap(card => (profileFor(card)?.weapons||[]).map((w,i) => ({card, key: norm(card)+':'+i, name:w.name, variable: w.dice==='variable'})))
      })()`)
      if (!weapons.length) { say('warning', 'armes', `${unit.name} : aucune arme exploitable par le moteur (carte purement passive ?)`); continue }
      for (const weapon of weapons) {
        if (weapon.variable) { say('warning', 'armes', `${unit.name} / ${weapon.name} : réserve variable, non pilotée par cet audit automatique (à vérifier à la main)`); continue }
        for (const target of uniqueUnits(defenderSide.list)) {
          if (attacksRun >= maxAttacks) { say('warning', 'limite', `Plafond de ${maxAttacks} attaques atteint : audit interrompu avant la fin de la matrice (relancez avec --max-attacks pour aller plus loin)`); break outer }
          if (!(await clickTileById(entryIdFor(attackerSide.id, unit.name), unit.name))) continue
          await app.click('#next')
          if (!(await clickTileById(entryIdFor(defenderSide.id, target.name), target.name))) { await resetToPicker(); continue }
          if (!app.$('.resolve-center')) { say('error', 'attaque', `${unit.name} → ${target.name} : l’écran de résolution ne s’est pas ouvert`); await resetToPicker(); continue }
          const errorsBefore = app.errors.length
          const result = await autoResolveAttack(app, { weaponKey: weapon.key })
          attacksRun += 1
          const newErrors = app.errors.slice(errorsBefore)
          if (newErrors.length) { attacksWithNewErrors += 1; say('error', 'erreur', `${unit.name} (${weapon.name}) → ${target.name} : ${newErrors.join(' | ')}`) }
          if (!result.finished) { attacksBlocked += 1; say('error', 'blocage', `${unit.name} (${weapon.name}) → ${target.name} : ${result.stuck}`) }
          for (const key of result.cardFxUsed) cardFxSeen.add(key)
          await resetToPicker()
          if (attacksRun % 10 === 0) process.stdout.write(`  … ${attacksRun} attaque(s) rejouée(s)\n`)
        }
      }
    }
  }
  console.log(`${attacksRun} attaque(s) rejouée(s), ${attacksBlocked} blocage(s), ${attacksWithNewErrors} avec une erreur JavaScript, ${cardFxSeen.size} effet(s) de carte exercé(s).\n`)

  // --- 3. Actions de fiche disponibles sans configuration préalable (mots-clés hors combat, effets de carte). ---
  console.log('--- Actions de fiche (hors combat) disponibles immédiatement ---')
  let actionsRun = 0
  for (const side of sides) {
    await setArmy(side.id)
    for (const unit of uniqueUnits(side.list)) {
      if (!(await clickTileById(entryIdFor(side.id, unit.name), unit.name))) continue
      if (!app.$('.overview')) { await resetToPicker(); continue }
      for (let guard = 0; guard < 15; guard += 1) {
        const button = app.$$('[data-kw-apply-action]:not([disabled])')[0] || app.$$('[data-card-fx]:not([disabled])')[0]
        if (!button) break
        const label = button.dataset.kwApplyAction || button.dataset.cardFx
        const errorsBefore = app.errors.length
        await app.click(button)
        actionsRun += 1
        const newErrors = app.errors.slice(errorsBefore)
        if (newErrors.length) say('error', 'action-fiche', `${unit.name} : l’action « ${label} » a provoqué une erreur : ${newErrors.join(' | ')}`)
      }
      await app.click('#back')
    }
  }
  console.log(`${actionsRun} action(s) de fiche exercée(s).\n`)

  await resetToPicker()
  const globalErrors = app.errors.length
  if (globalErrors) say('error', 'console', `${globalErrors} erreur(s) JavaScript relevée(s) au total pendant l’audit`)

  const errorCount = findings.filter((f) => f.level === 'error').length
  const warningCount = findings.filter((f) => f.level === 'warning').length
  console.log('='.repeat(70))
  if (errorCount) {
    console.error(`ÉCHEC : ${errorCount} problème(s) bloquant(s), ${warningCount} avertissement(s) (voir ci-dessus).`)
    process.exitCode = 1
  } else {
    console.log(`OK : 0 erreur, 0 blocage sur ${sheetsChecked} fiche(s) et ${attacksRun} attaque(s) (${warningCount} avertissement(s) non bloquant(s)).`)
  }
  app.window.close() // sinon les temporisations internes de jsdom empêchent le processus de se terminer
} finally {
  await vite.close()
}
