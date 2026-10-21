// Audit complet de listes Tabletop Admiral réelles par la certification automatique β (lecture seule, aucun accès réseau).
// Pour chaque carte : métadonnées, visuels EN/FR locaux, traduction, mots-clés certifiés, état « prête » et blocages précis.
// Pour chaque unité : PV, courage, défense, vitesse, rang, type, effectif, figurines ajoutées, armes (dés, portées, mots-clés),
// améliorations et commandements équipés, et contrôle des variantes d'un même personnage.
// Les données moteur viennent du référentiel historique (public/assistant/reference-data.js), qui n'est jamais modifié.
// Usage : node scripts/audit-auto-certification-lists.mjs liste1.json [liste2.json …] [--out docs/audit/fichier.md]
import fs from 'node:fs'
import path from 'node:path'
import { listCards, loadAssistantData, readJson, root } from './lib/auto-certification-pdf.mjs'

const args = process.argv.slice(2)
const outIndex = args.indexOf('--out')
const out = outIndex >= 0 ? path.resolve(args[outIndex + 1]) : path.join(root, 'docs/audit/certification-auto-listes.md')
const listFiles = args.filter((arg, index) => !arg.startsWith('--') && (outIndex < 0 || index !== outIndex + 1))
if (!listFiles.length) throw new Error('Indiquez au moins une liste Tabletop Admiral (JSON).')

// Deux lectures : en local (visuels AMG « usage personnel » présents sur ce poste) et telle que le site GitHub Pages la publie.
const { window: data, resolver, catalog, personalLoaded } = loadAssistantData()
const { resolver: onlineResolver } = loadAssistantData({ personal: false })
const ref = data.SWL_REFERENCE
const inventory = data.SWL_AUTO_CERTIFICATION_ASSETS
const keywordsById = new Map((ref.keywords || []).map((keyword) => [keyword.id, keyword]))
const keywordsByName = new Map((ref.keywords || []).map((keyword) => [resolver.normalize(keyword.name.replace(/\s+X$/i, '')), keyword]))
const RANK = { 1: 'commandant', 6: 'operative', 2: 'corps', 3: 'special', 4: 'support', 5: 'heavy' }
const UNIT_TYPE = { 1: 'Trooper', 2: 'Repulsor Vehicle', 3: 'Ground Vehicle', 4: 'Emplacement Trooper', 5: 'Clone Trooper', 6: 'Droid Trooper', 7: 'Creature Trooper', 9: 'Mandalorian Trooper' }
const kindLabel = { unit: 'Unité', upgrade: 'Amélioration', command: 'Commandement', contingency: 'Contingence' }
const dice = (list) => (list === 'variable' ? 'variable' : (list || []).map((die) => `${die.count} ${die.color}`).join(' + ') || '—')
const keywordLabel = (tag) => { const keyword = keywordsById.get(tag.keywordId ?? tag); return `${keyword?.name ?? tag.keywordId ?? tag}${tag.value ? ` ${tag.value}` : ''}` }

/** Mot-clé Tabletop Admiral → traduction du glossaire → mot-clé certifié du référentiel SWL (avec définition). */
function keywordCertification(keyword) {
  if (!keyword.fr) return { certified: false, reason: `« ${keyword.name} » absent du glossaire` }
  const base = resolver.normalize(String(keyword.fr).split(':')[0].replace(/\s+X$/i, ''))
  const swl = keywordsByName.get(base) || [...keywordsByName.entries()].find(([name]) => name.split(' ').length > 1 && name.startsWith(`${base} `))?.[1]
  if (!swl) return { certified: false, reason: `« ${keyword.fr} » sans entrée dans le glossaire SWL` }
  if (!String(swl.definition || '').trim()) return { certified: false, reason: `« ${swl.name} » sans définition` }
  return { certified: true, swl }
}

function cardAudit(card, context, R = resolver) {
  const match = R.findMeta(card.name, card.kind, context)
  const s = R.status(match.meta)
  const keywordChecks = s.keywords.map((keyword) => ({ ...keyword, ...keywordCertification(keyword) }))
  const blocks = []
  if (!match.meta) blocks.push(match.certainty === 'ambiguous' ? `métadonnées ambiguës : ${match.options.map((option) => `n° ${option.sourceId}${option.points != null ? ` (${option.points} pts)` : ''}`).join(' / ')} — choisir la bonne carte` : 'aucune métadonnée Tabletop Admiral')
  if (match.meta && !s.en) blocks.push(R === onlineResolver && data.SWL_AUTO_CERTIFICATION_ASSETS.personalHashes?.[`${match.meta.kind}:${match.meta.sourceId}:en`] ? 'visuel anglais non disponible en ligne (AMG, usage personnel)' : 'visuel anglais à rechercher (absent des PDF officiels AMG relevés)')
  if (match.meta && s.en && s.en.certainty !== 'certain') blocks.push('visuel anglais à contrôler')
  if (match.meta && !s.fr) blocks.push(s.frAmbiguous ? `visuel français ambigu (${s.frAmbiguous.join(', ')})` : s.pdf ? `visuel français à extraire (${s.pdf.pdfSource} p. ${s.pdf.page})` : 'visuel français absent')
  if (match.meta && s.fr && s.fr.certainty !== 'certain') blocks.push(`rapprochement français proposé à confirmer (${s.fr.origin})`)
  if (match.meta && !s.frenchName) blocks.push('nom français inconnu')
  if (s.newKeywords.length) blocks.push(`mot(s)-clé(s) nouveau(x) : ${s.newKeywords.map((keyword) => keyword.name).join(', ')}`)
  const partial = s.keywords.filter((keyword) => keyword.partial)
  const uncertified = keywordChecks.filter((keyword) => keyword.fr && !keyword.certified)
  const published = R.publishedValidation(match.meta, s)
  // Quatre états : une carte « certifiée et inchangée » n'exige aucune comparaison EN/FR (ni visuel anglais).
  const classification = R.classify(card.name, card.kind, match)
  const certified = classification.state === 'certified'
  return { ...card, match, status: s, keywordChecks, partial, uncertified, blocks: certified ? [] : [`${classification.label}${classification.reasons.length ? ` (${classification.reasons.join(' ; ')})` : ''}`, ...blocks], published, classification, certified, validated: !certified && !!published?.intact, ready: !certified && !published?.intact && s.ready && !!s.frenchName && !s.newKeywords.length }
}

/** Données moteur d'une unité et de ses améliorations (référentiel historique), confrontées aux métadonnées Tabletop Admiral. */
// Clé SWL d'une carte de liste : celle du site (alias historiques) si elle existe, sinon celle du nouveau circuit, signalée.
function engineKey(name, kind, meta) {
  // Comme le site : nom complet d'abord (« Combat Armor (Rebel) » → combat armor rebel), puis sans la précision entre parenthèses.
  const fullKey = resolver.keyOf(name)
  if (ref.weapons?.[fullKey] || ref.names?.[fullKey]) return { key: fullKey, missingAlias: false }
  const siteKey = resolver.keyOf(name.replace(/\s*\([^)]*\)\s*$/, ''))
  if (ref.weapons?.[siteKey] || ref.names?.[siteKey]) return { key: siteKey, missingAlias: false }
  const found = meta ? resolver.swlKey(meta) : null
  if (found?.key) return { key: found.key, missingAlias: true, via: found.via }
  return { key: siteKey, missingAlias: false, ambiguous: found?.ambiguous }
}

function unitAudit(unit, cardIndex) {
  const meta = cardIndex.get(`unit:${unit.name}`)?.match
  const resolved = engineKey(unit.name, 'unit', meta?.meta)
  const key = resolved.key
  const entry = ref.weapons?.[key]
  const certification = entry?.fullCardCertification
  const stats = entry?.unitStats
  const issues = []
  if (resolved.missingAlias) issues.push(`alias historique manquant : le site ne relie pas « ${unit.name} » à « ${key} » (trouvé par ${resolved.via})`)
  if (!entry) issues.push('aucune donnée moteur pour cette unité')
  if (certification && !certification.unitType) issues.push('type d’unité non renseigné dans la certification')
  if (entry && !stats?.verifiedAgainstCard) issues.push('PV / courage / effectif non certifiés sur la carte')
  if (entry && entry.defenseColor && !entry.defenseVerifiedAgainstCard) issues.push('dé de défense non certifié')
  if (entry && !certification) issues.push('certification complète absente (rang, vitesse, mots-clés)')
  const tta = meta?.meta
  if (tta && stats) {
    if (tta.health != null && Number(tta.health) !== Number(stats.woundsPerModel)) issues.push(`PV : Tabletop Admiral ${tta.health} / SWL ${stats.woundsPerModel}`)
    // Métadonnées Tabletop Admiral : simple signal à vérifier sur la carte officielle (leurs vitesses sont parfois fausses).
    // Vitesse Tabletop Admiral : non fiable (fausse pour Dark Vador, les Dark Troopers et les Tauntaun, vérifiés sur la carte) → simple information.
    if (tta.rank != null && certification?.rank && RANK[tta.rank] !== certification.rank) issues.push(`rang à vérifier sur la carte : Tabletop Admiral ${RANK[tta.rank]} / SWL ${certification.rank}`)
  }
  // Variantes d'un même personnage : le nom court doit désigner la même carte des deux côtés.
  let variant = 'aucune autre variante'
  if (tta) {
    const others = catalog.filter((card) => card.kind === 'unit' && card.englishName === tta.englishName && resolver.fullEnglish(card) !== resolver.fullEnglish(tta))
    variant = others.length ? `${others.length} autre(s) variante(s) (${[...new Set(others.map((card) => card.englishTitle || 'sans titre'))].join(', ')}) — carte retenue : « ${resolver.fullEnglish(tta)} » n° ${tta.sourceId}` : variant
    if (resolver.fullFrench(tta) && ref.names?.[key] && !resolver.normalize(ref.names[key]).startsWith(resolver.normalize(tta.frenchName || ''))) variant += ` · nom français : SWL « ${ref.names[key]} », Tabletop Admiral « ${resolver.fullFrench(tta)} »`
  } else if (meta?.certainty === 'ambiguous') { variant = `ambiguë entre ${meta.options.length} cartes`; issues.push('variante ambiguë') }
  const upgrades = unit.upgrades.map((name) => {
    const upgradeMatch = cardIndex.get(`upgrade:${name}`)?.match
    const upgradeResolved = engineKey(name, 'upgrade', upgradeMatch?.meta)
    const upgradeKey = upgradeResolved.key
    const upgrade = ref.weapons?.[upgradeKey]
    const upgradeIssues = []
    if (upgradeMatch?.certainty === 'ambiguous') upgradeIssues.push(`carte ambiguë (${upgradeMatch.options.length} cartes Tabletop Admiral)`)
    if (upgradeResolved.missingAlias) upgradeIssues.push(`alias historique manquant (« ${upgradeKey} », trouvé par ${upgradeResolved.via})`)
    if (!upgrade && !ref.names?.[upgradeKey]) upgradeIssues.push('amélioration inconnue du référentiel')
    else if (upgrade && !upgrade.fullCardCertification) upgradeIssues.push('certification complète absente')
    if (upgrade?.addedModels && !upgrade.addedModelsVerifiedAgainstCard) upgradeIssues.push('figurine ajoutée non certifiée')
    if ((upgrade?.weapons || []).some((weapon) => !weapon.verifiedAgainstCard)) upgradeIssues.push('arme non certifiée')
    return { name, key: upgradeKey, frenchName: ref.names?.[upgradeKey] || null, addedModels: upgrade?.addedModels || 0, addedWounds: upgrade?.addedModelWounds || null, weapons: upgrade?.weapons || [], issues: upgradeIssues }
  })
  for (const upgrade of upgrades) for (const issue of upgrade.issues) issues.push(`${upgrade.name} : ${issue}`)
  const added = upgrades.reduce((sum, upgrade) => sum + upgrade.addedModels, 0)
  return { unit, key, tta, frenchName: ref.names?.[key] || null, entry, stats, certification, upgrades, added, issues, variant }
}

const sections = []
const summaries = []
const onlineSummaries = []
const summarize = (name, cards, count, engine) => ({
  name, total: cards.length, copies: cards.reduce((sum, card) => sum + count(card.name, card.kind), 0),
  certified: cards.filter((card) => card.classification.state === 'certified').length, obsolete: cards.filter((card) => card.classification.state === 'obsolete').length,
  incomplete: cards.filter((card) => card.classification.state === 'incomplete').length, fresh: cards.filter((card) => card.classification.state === 'new').length,
  interventions: cards.filter((card) => !card.certified && !card.validated).length,
  validated: cards.filter((card) => card.validated).length, ready: cards.filter((card) => card.ready).length,
  en: cards.filter((card) => card.match.meta && !card.status.en).length, fr: cards.filter((card) => card.match.meta && !card.status.fr).length,
  translation: cards.filter((card) => card.match.meta && (!card.status.frenchName || card.partial.length)).length, keyword: cards.filter((card) => card.status.newKeywords.length || card.uncertified.length).length,
  metadata: cards.filter((card) => !card.match.meta).length, engine,
})
for (const file of listFiles) {
  const list = readJson(file)
  const units = (list.units || []).map((unit) => ({ name: unit.name, upgrades: (unit.upgrades || []).map((upgrade) => (typeof upgrade === 'string' ? upgrade : upgrade.name)) }))
  const context = { factions: [list.armyFaction, list.faction].filter(Boolean) }
  const cards = listCards(list).map((card) => cardAudit(card, context))
  const onlineCards = listCards(list).map((card) => cardAudit(card, context, onlineResolver))
  const cardIndex = new Map(cards.map((card) => [`${card.kind}:${card.name}`, card]))
  const unitAudits = units.map((unit) => unitAudit(unit, cardIndex))
  const count = (name, kind) => (kind === 'unit' ? units.filter((unit) => unit.name === name).length : kind === 'upgrade' ? units.reduce((sum, unit) => sum + unit.upgrades.filter((upgrade) => upgrade === name).length, 0) : 1)
  const engineUncertain = unitAudits.filter((audit) => audit.issues.length)
  const summary = summarize(list.listname || path.basename(file), cards, count, engineUncertain.length)
  const onlineSummary = summarize(summary.name, onlineCards, count, engineUncertain.length)
  onlineSummary.blocked = onlineCards.filter((card) => !card.certified && !card.validated).map((card) => `${card.name} — ${card.blocks.join(' ; ')}${card.status.en ? '' : ' → importer le visuel anglais sur l’appareil pour comparer'}`)
  summaries.push(summary)
  onlineSummaries.push(onlineSummary)
  const onlineByKey = new Map(onlineCards.map((card) => [`${card.kind}:${card.name}`, card]))
  const lines = [`## ${summary.name}`, '', `Fichier : \`${path.basename(file)}\` · ${list.points ?? '?'} points · faction ${list.armyFaction ?? '?'} · ${units.length} unités · ${summary.total} cartes distinctes (${summary.copies} exemplaires).`, '']
  lines.push('### Cartes', '', '| Carte | Type | Ex. | État | Métadonnées | EN local | EN en ligne | FR | Traduction | Mots-clés certifiés | Prête (local / en ligne) | Blocage précis (local) |', '|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const card of cards) {
    const s = card.status
    const meta = card.match.meta ? `✓ n° ${card.match.meta.sourceId}${card.match.meta.points != null ? ` · ${card.match.meta.points} pts` : ''}${card.match.certainty === 'decision' ? ` (décision certifiée du ${card.match.decision.decidedAt} parmi n° ${card.match.decision.compared.join(' / ')})` : ''}` : card.match.certainty === 'ambiguous' ? `! ambiguës (${card.match.options.length})` : '✗'
    const online = onlineByKey.get(`${card.kind}:${card.name}`)
    const kw = !s.keywords.length ? '— (aucun)' : card.keywordChecks.every((keyword) => keyword.certified) ? `✓ ${s.keywords.length}` : `! ${card.keywordChecks.filter((keyword) => !keyword.certified).map((keyword) => keyword.reason).join(' ; ')}`
    lines.push(`| ${card.name} | ${kindLabel[card.kind]} | ${count(card.name, card.kind)} | ${card.certified ? '✓ Certification existante valide' : card.classification.label} | ${meta} | ${s.en ? (s.en.certainty === 'certain' ? '✓' : '!') : '✗'} | ${online.status.en ? '✓' : '✗ non disponible en ligne'} | ${s.fr ? `${s.fr.certainty === 'certain' ? '✓' : '!'} ${s.fr.origin}` : '✗'} | ${s.frenchName ? `${card.partial.length ? '!' : '✓'} ${s.frenchName}${card.partial.length ? ` (précision à confirmer : ${card.partial.map((keyword) => keyword.name).join(', ')})` : ''}` : '✗'} | ${kw} | ${card.certified ? 'sans objet' : card.validated ? 'validée' : card.ready ? '✓' : '✗'} / ${online.certified ? 'sans objet' : online.validated ? 'validée' : online.ready ? '✓' : '✗'} | ${card.blocks.join(' ; ') || '—'} |`)
  }
  lines.push('', '### Données moteur des unités (référentiel historique, lecture seule)', '')
  for (const audit of unitAudits) {
    const c = audit.certification, st = audit.stats
    const base = st?.baseModels ?? '?'
    lines.push(`#### ${audit.unit.name}${audit.frenchName ? ` — ${audit.frenchName}` : ''}`, '',
      `- PV ${st?.woundsPerModel ?? '?'} · courage ${st ? (st.courage ?? '—') : '?'} · défense ${audit.entry?.defenseColor ?? '?'} · vitesse ${c?.speed || '?'} · rang ${c?.rank || '?'} · type ${c?.unitType || '?'}${st?.suppressionImmune ? ' · immunisée à la suppression' : ''}${audit.tta?.speed != null && c?.speed && Number(audit.tta.speed) !== Number(c.speed) ? ` (vitesse Tabletop Admiral : ${audit.tta.speed}, non fiable)` : ''}`,
      `- Effectif initial ${base}${audit.added ? ` + ${audit.added} figurine(s) ajoutée(s) (${audit.upgrades.filter((upgrade) => upgrade.addedModels).map((upgrade) => `${upgrade.name} : ${upgrade.addedModels}${upgrade.addedWounds ? ` × ${upgrade.addedWounds} PV` : ''}`).join(', ')})` : ''} = **${typeof base === 'number' ? base + audit.added : '?'}** figurine(s)`,
      `- Armes : ${[...(audit.entry?.weapons || []).map((weapon) => ({ ...weapon, from: 'carte' })), ...audit.upgrades.flatMap((upgrade) => upgrade.weapons.map((weapon) => ({ ...weapon, from: upgrade.name })))].map((weapon) => `${weapon.name} [${weapon.from}] ${dice(weapon.dice)} portée ${weapon.range ?? '?'}${(weapon.keywordIds || []).length ? ` (${weapon.keywordIds.map((id) => keywordLabel({ keywordId: id, value: weapon.keywordValues?.[id] })).join(', ')})` : ''}${weapon.verifiedAgainstCard ? '' : ' ⚠ non certifiée'}`).join(' ; ') || 'aucune'}`,
      `- Mots-clés de la carte : ${(c?.keywords || ref.tags?.[audit.key] || []).map(keywordLabel).join(', ') || 'aucun'}${(() => { const missing = [...(c?.keywords || ref.tags?.[audit.key] || []), ...audit.upgrades.flatMap((upgrade) => (ref.weapons?.[upgrade.key]?.fullCardCertification?.keywords || []))].filter((tag) => !String(keywordsById.get(tag.keywordId)?.definition || '').trim()); return missing.length ? ` ⚠ sans définition : ${missing.map(keywordLabel).join(', ')}` : ' (définitions présentes)' })()}`,
      `- Améliorations : ${audit.upgrades.map((upgrade) => `${upgrade.name}${upgrade.frenchName ? ` (${upgrade.frenchName})` : ''}`).join(', ') || 'aucune'}`,
      `- Variantes : ${audit.variant}`,
      `- Données moteur : ${audit.issues.length ? `⚠ ${audit.issues.join(' ; ')}` : '✓ certifiées sur la carte'}`, '')
  }
  lines.push(`### Cartes de commandement équipées`, '', `${(list.commandCards || []).join(', ') || 'aucune'}${(list.contingencies || []).length ? ` · contingences : ${list.contingencies.join(', ')}` : ' · aucune contingence'}.`, '')
  const interventions = [
    ...cards.filter((card) => !card.match.meta && card.match.certainty === 'ambiguous').map((card) => `Choisir la carte Tabletop Admiral de « ${card.name} » : ${card.match.options.map((option) => `n° ${option.sourceId}${option.points != null ? ` (${option.points} pts)` : ''}`).join(' ou ')}.`),
    ...cards.filter((card) => card.match.meta && !card.status.en).map((card) => `Fournir ou autoriser une source pour le visuel anglais de « ${card.name} ».`),
    ...cards.filter((card) => card.match.meta && !card.status.fr).map((card) => `Fournir le visuel français de « ${card.name} »${card.status.pdf ? ` (à extraire de ${card.status.pdf.pdfSource} p. ${card.status.pdf.page})` : ''}.`),
    ...cards.filter((card) => card.status.fr && card.status.fr.certainty !== 'certain').map((card) => `Confirmer le rapprochement français de « ${card.name} » (${card.status.fr.origin}).`),
    ...cards.filter((card) => card.partial.length).map((card) => `Confirmer la précision traduite de « ${card.name} » : ${card.partial.map((keyword) => `${keyword.name} → ${keyword.fr}`).join(', ')}.`),
    ...cards.filter((card) => card.status.newKeywords.length).map((card) => `Traduire et valider les mots-clés nouveaux de « ${card.name} » : ${card.status.newKeywords.map((keyword) => keyword.name).join(', ')}.`),
    ...cards.filter((card) => card.uncertified.length).map((card) => `Certifier dans SWL les mots-clés de « ${card.name} » : ${card.uncertified.map((keyword) => keyword.reason).join(' ; ')}.`),
    ...engineUncertain.map((audit) => `Vérifier les données moteur de « ${audit.unit.name} » : ${audit.issues.join(' ; ')}.`),
    ...cards.filter((card) => card.ready).map((card) => `Validation finale de « ${card.name} » (comparaison EN/FR, nom français, traductions).`),
  ]
  lines.push('### Interventions humaines restantes', '', ...[...new Set(interventions)].map((item) => `- ${item}`), '')
  sections.push(...lines)
}

// Cartes françaises « à contrôler » : nécessaires aux listes importées, ou contrôle différable.
const allCards = listFiles.flatMap((file) => listCards(readJson(file)))
const needed = new Set(allCards.flatMap((card) => { const match = resolver.findMeta(card.name, card.kind, { factions: ['rebel', 'empire'] }); return match.meta ? [`${match.meta.kind}:${match.meta.sourceId}`] : [] }))
const neededNames = new Set(allCards.map((card) => resolver.normalize(card.name)))
const toCheck = [...Object.entries(inventory.assets).map(([id, asset]) => ({ id, ...asset })), ...inventory.unlinked].filter((asset) => asset.lang === 'fr' && asset.identification?.status === 'a-controler')
const isNeeded = (asset) => (asset.sourceId && needed.has(`${asset.kind}:${asset.sourceId}`)) || (asset.identification?.duplicateOf && [...neededNames].some((name) => asset.identification.duplicateOf.includes(name.replace(/ /g, '-'))))
const summaryTable = (rows) => ['| Liste | Cartes | Certifiées et inchangées | Certifications obsolètes | Connues mais incomplètes | Réellement nouvelles | Déjà validées (publiées) | Prêtes (EN + FR disponibles) | Interventions humaines restantes | Unités aux données moteur incertaines |', '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((s) => `| ${s.name} | ${s.total} (${s.copies} ex.) | ${s.certified} | ${s.obsolete} | ${s.incomplete} | ${s.fresh} | ${s.validated} | ${s.ready} | ${s.interventions} | ${s.engine} |`)]
const header = ['# Audit des listes réelles — certification automatique β', '', `Généré le ${new Date().toISOString().slice(0, 10)} (lecture seule : ni la certification historique, ni la base moteur ne sont modifiées par l'audit). « Déjà validées » ne compte que les validations publiées dans \`src/data/autoCertificationDecisions.json\` ; celles d'un navigateur restent dans \`swl-auto-certification-beta-v1\`.`, '',
  '## Synthèse — résultat local', '', `Avec les visuels AMG « usage personnel » présents sur ce poste${personalLoaded ? '' : ' (aucun trouvé : identique au résultat en ligne)'} : ils ne sont jamais publiés.`, '', ...summaryTable(summaries), '',
  '## Synthèse — résultat en ligne (GitHub Pages)', '', 'Calculé sur les seuls fichiers déployés. Une carte certifiée et inchangée ne demande aucun visuel anglais ; les autres exigent une comparaison EN/FR, avec un visuel anglais importé sur l’appareil (jamais publié) quand aucun n’est publié.', '', ...summaryTable(onlineSummaries), '',
  ...onlineSummaries.flatMap((s) => [`### Interventions humaines restantes en ligne — ${s.name} (${s.blocked.length})`, '', ...s.blocked.map((entry) => `- ${entry}`), '']),
  '## Cartes françaises extraites « à contrôler »', '', '| Carte | Groupe | Raison |', '|---|---|---|',
  ...toCheck.map((asset) => `| ${asset.nameFr || asset.canonicalName} | ${isNeeded(asset) ? '1 — nécessaire aux listes : à contrôler immédiatement' : '2 — absente des listes : contrôle différable'} | ${[asset.identification.method === 'elimination-sur-la-page' ? 'identifiée par élimination' : asset.identification.score < 0.9 ? `titre lu « ${asset.identification.text} »` : null, asset.identification.duplicateOf ? `doublon possible de \`${asset.identification.duplicateOf}\`` : null].filter(Boolean).join(' ; ')} |`), '']
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, `${[...header, ...sections].join('\n').trimEnd()}\n`)
console.log(`Rapport : ${path.relative(root, out)}`)
for (const [label, rows] of [['local', summaries], ['en ligne', onlineSummaries]]) for (const s of rows) console.log(`[${label}] ${s.name} : ${s.total} cartes — ${s.certified} certifiées et inchangées, ${s.obsolete} obsolètes, ${s.incomplete} connues incomplètes, ${s.fresh} nouvelles ; ${s.validated} validées, ${s.ready} prêtes, ${s.interventions} interventions humaines, moteur incertain ${s.engine}`)
