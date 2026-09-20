/* Audit « chaque effet propre à une carte d'amélioration est pris en charge » (20/09/2026).
   Toute carte qui a une note d'effet, une icône ↱ / ✖ ou une action dans le moteur doit être classée :
     bouton-fiche  : bouton d'action sur la fiche d'unité (CARD_KEYWORD_ACTIONS, champ « card ») ;
     attaque       : panneau « cartes qui peuvent intervenir » à l'étape concernée (ATTACK_CARD_FX) ;
     automatique   : intégrée au calcul (dés, mots-clés, défense, conversions…) ou bouton dédié historique ;
     statistique   : bonus permanent de vitesse / courage ;
     face          : carte retournable (mots-clés selon la face visible) ;
     rappel        : règle permanente rappelée dans le briefing de l'unité (aucune action à effectuer) ;
     liste         : contrainte de construction d'armée, sans effet en jeu.
   Les cartes à icône ↱ / ✖ ne peuvent PAS rester en simple rappel : elles doivent avoir un bouton qui suit leur état.
   Sortie : docs/audit/cartes-effets.md ; code de sortie 1 s'il reste une carte non classée ou non vérifiable. */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { JSDOM, ResourceLoader, VirtualConsole } from 'jsdom'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const assistantDir = path.join(root, 'public/assistant')
const baseUrl = 'http://localhost/SWL/assistant/'
const sandbox = { window: {} }
vm.createContext(sandbox)
vm.runInContext(fs.readFileSync(path.join(assistantDir, 'reference-data.js'), 'utf8'), sandbox)
vm.runInContext(fs.readFileSync(path.join(assistantDir, 'card-notes.js'), 'utf8'), sandbox)
const ref = sandbox.window.SWL_REFERENCE
const notes = sandbox.window.SWL_CARD_NOTES
const appSource = fs.readFileSync(path.join(assistantDir, 'app.js'), 'utf8')

// Effets déjà intégrés au moteur avant l'audit : la preuve est un marqueur dans le code ou un champ de données.
const AUTOMATIC = {
  'force choke': 'app:force-choke', 'force reflexes': 'app:force reflexes', 'burst of speed': 'app:burst of speed', 'offensive push': 'app:offensive push',
  'linked targeting array': 'app:linked targeting array', 'emergency transponder': 'app:emergency transponder', 'in the fray': 'app:in the fray',
  'proton charge saboteur': 'app:proton charge saboteur', 'sonic charge saboteur': 'app:sonic charge saboteur', tenacity: 'app:tenacity', 'point blank': 'app:point blank',
  'saber throw': 'app:saber throw', 'fire control': 'data:fireControl', 'combat armor rebel': 'data:defenseColorOverride', 'reluctant hero': 'data:criticalPerSuppression',
  'chewbacca upgrade': 'app:chewbaccaUpgrades', 'imperial hammers elite armor pilot': 'data:attackSurgeOverride', crosshair: "app:'crosshair'",
  'fragmentation grenades': 'weapon:attackSurge', 'sabine s grapple line': 'app:grappin', 'ascension cables': 'app:cables',
}
const RAPPEL = {
  'command system': 'règle permanente de la porteuse (portée de Coordination 2), rappelée dans le briefing',
  'comms jammer': 'agit sur les unités ennemies proches : rappelé dans le briefing des unités ennemies',
  'strict orders': 'agit sur les unités alliées : rappelé dans leur briefing',
  'defensive posture': 'carte retournable ; règle de l’action Esquiver rappelée dans le briefing',
  'offensive posture': 'carte retournable ; règle de l’action Viser rappelée dans le briefing',
  'ig11 nanny programming': 'mots-clés gagnés (IA) ; règle de création d’armée rappelée dans le briefing',
  'ig11 prime programming': 'mots-clés gagnés (Prime, IA) ; effet lié au rang choisi rappelé dans le briefing',
  'cad bane electro gauntlets': 'règle de déplacement engagé rappelée dans le briefing',
  'programmed loyalty': 'restriction d’ordres rappelée dans le briefing',
  wrecker: 'protection de l’Alter Ego Omega rappelée dans le briefing',
  'black sun enforcer concealment': 'conserve Cache si la figurine est vaincue : rappelé dans le briefing',
  'pyke foot soldier concealment': 'conserve Cache si la figurine est vaincue : rappelé dans le briefing',
  'super commando concealment': 'conserve Cache si la figurine est vaincue : rappelé dans le briefing',
}
const LISTE = { 'imperial comms technician': 'contrainte de construction (amélioration Comms obligatoire)', 'rebel comms technician': 'contrainte de construction (amélioration Comms obligatoire)' }
const REQUIRES_BUTTON = new Set(['exhaust', 'discard', 'both'])

class LocalScriptsOnly extends ResourceLoader {
  fetch(url) {
    if (url.startsWith(baseUrl) && new URL(url).pathname.endsWith('.js')) return Promise.resolve(fs.readFileSync(path.join(assistantDir, path.basename(new URL(url).pathname))))
    return Promise.resolve(Buffer.from(''))
  }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function open(p1, p2) {
  const errors = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (error) => errors.push(String(error.message || error)))
  const dom = new JSDOM(fs.readFileSync(path.join(assistantDir, 'index.html'), 'utf8'), {
    url: `${baseUrl}index.html`, runScripts: 'dangerously', resources: new LocalScriptsOnly(), pretendToBeVisual: true, virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem('swl.list.p1.v1', JSON.stringify({ listName: 'Audit A', faction: 'Empire', units: p1 }))
      window.localStorage.setItem('swl.list.p2.v1', JSON.stringify({ listName: 'Audit B', faction: 'Rebelles', units: p2 }))
      window.localStorage.setItem('swl.assistant.player-side.v1', 'p1')
      window.structuredClone ||= structuredClone
      window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
      window.Element.prototype.scrollIntoView = function () {}
      window.scrollTo = () => {}
      window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
      window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
      window.addEventListener('error', (event) => errors.push(String(event.message)))
    },
  })
  await new Promise((resolve) => dom.window.addEventListener('load', resolve))
  await sleep(50)
  return { dom, errors }
}
async function sheetOf(cardKey) {
  const app = await open([{ name: 'Stormtroopers', upgrades: [{ name: cardKey }] }, { name: 'Snowtroopers', upgrades: [] }], [{ name: 'Sabine Wren', upgrades: [] }])
  const { document } = app.dom.window
  document.querySelector('.unit-tile')?.click()
  await sleep(40)
  document.querySelectorAll('dialog').forEach((dialog) => dialog.remove())
  await sleep(30)
  const result = { html: document.body.textContent.replace(/\s+/g, ' '), actions: [...document.querySelectorAll('[data-card-action]')].map((button) => button.dataset.cardAction), errors: app.errors }
  app.dom.window.close()
  return result
}

const engine = await open([{ name: 'Stormtroopers', upgrades: [] }], [{ name: 'Sabine Wren', upgrades: [] }])
const win = engine.dom.window
const defs = win.eval('Object.entries(CARD_KEYWORD_ACTIONS).filter(([, def]) => def.card).map(([id, def]) => ({ id, cards: [].concat(def.card), use: def.use || null }))')
const attackFx = win.eval('ATTACK_CARD_FX.map((fx) => ({ id: fx.id, card: fx.card, steps: fx.steps, use: fx.use || null, info: !!fx.info }))')
const speed = Object.keys(win.eval('CARD_SPEED_BONUS')), courage = Object.keys(win.eval('CARD_COURAGE_BONUS'))
const flips = [...win.eval('FLIP_CARDS')]
const crossCards = win.eval('SHEET_CROSS_CARDS.map((item) => item.card)')
engine.dom.window.close()

const use = (key) => ref.cardUse?.[key] || 'passive'
const keys = [...new Set([...Object.keys(notes), ...Object.keys(ref.cardUse).filter((key) => REQUIRES_BUTTON.has(use(key)))])].sort()
const defByCard = new Map(defs.flatMap((def) => def.cards.map((card) => [card, def])))
const fxByCard = new Map(attackFx.map((fx) => [fx.card, fx]))
const problems = [], rows = []
const proofOf = (marker, key) => {
  const [kind, needle] = marker.split(':')
  if (kind === 'app') return appSource.includes(needle) || appSource.includes(needle.replace(/ /g, '-'))
  if (kind === 'data') return !!ref.weapons[key]?.[needle]
  if (kind === 'weapon') return (ref.weapons[key]?.weapons || []).some((weapon) => weapon[needle])
  return false
}
for (const key of keys) {
  const cardUse = use(key)
  let treatment = null, where = '', remark = ''
  if (defByCard.has(key)) { treatment = 'bouton-fiche'; where = 'fiche d’unité · automatismes' }
  else if (fxByCard.has(key)) { const fx = fxByCard.get(key); treatment = 'attaque'; where = 'étape(s) ' + fx.steps.map((step) => step + 1).join(', ') + (fx.info ? ' (rappel)' : ' (bouton)') }
  else if (AUTOMATIC[key]) { treatment = 'automatique'; where = 'calcul de l’attaque / de la défense / bouton dédié'; if (!proofOf(AUTOMATIC[key], key)) problems.push(`${key} : marqueur d’automatisme introuvable (${AUTOMATIC[key]})`) }
  else if (flips.includes(key)) { treatment = 'face'; where = 'bouton « Retourner la carte » (mots-clés, vitesse et courage selon la face)' }
  else if (speed.includes(key) || courage.includes(key)) { treatment = 'statistique'; where = 'vitesse / courage de la fiche' }
  else if (RAPPEL[key]) { treatment = 'rappel'; where = 'briefing tactique'; remark = RAPPEL[key] }
  else if (LISTE[key]) { treatment = 'liste'; where = '—'; remark = LISTE[key] }
  else problems.push(`${key} : effet non classé (ni bouton, ni automatisme, ni rappel justifié)`)
  if (treatment && REQUIRES_BUTTON.has(cardUse) && !['bouton-fiche', 'attaque', 'automatique'].includes(treatment)) problems.push(`${key} : carte ${cardUse === 'discard' ? '✖' : '↱'} sans bouton de suivi (${treatment})`)
  if (treatment === 'attaque') {
    const fx = fxByCard.get(key)
    if (!fx.info && REQUIRES_BUTTON.has(cardUse) && !fx.use) problems.push(`${key} : réaction ↱/✖ sans consommation de la carte`)
    if (fx.steps.some((step) => step < 0 || step > 5)) problems.push(`${key} : étape d’attaque invalide`)
  }
  if (!ref.names[key]) problems.push(`${key} : carte inconnue du référentiel`)
  rows.push({ key, name: ref.names[key] || key, cardUse, treatment, where, remark })
}
// Sonde réelle : chaque bouton de fiche est bien affiché quand la carte est équipée, chaque rappel apparaît dans le briefing.
let probes = 0
for (const row of rows) {
  if (!['bouton-fiche', 'rappel', 'face'].includes(row.treatment)) continue
  const sheet = await sheetOf(row.key)
  probes++
  if (sheet.errors.length) problems.push(`${row.key} : erreur pendant l’affichage — ${sheet.errors[0]}`)
  if (row.treatment === 'bouton-fiche') {
    const id = defByCard.get(row.key).id
    if (!sheet.actions.includes(id)) problems.push(`${row.key} : bouton « ${id} » absent de la fiche d’unité`)
  } else if (!sheet.html.includes(String(row.name).toUpperCase().slice(0, 12)) && !sheet.html.toLowerCase().includes(String(row.name).toLowerCase().slice(0, 12))) {
    problems.push(`${row.key} : ni la carte ni son rappel n’apparaissent dans la fiche d’unité`)
  }
}
for (const card of crossCards) if (!ref.names[card]) problems.push(`${card} : rappel inter-unités sur une carte inconnue`)

const symbol = { passive: '—', exhaust: '↱', discard: '✖', both: '↱ / ✖' }
const label = { 'bouton-fiche': 'Bouton (fiche d’unité)', attaque: 'Panneau d’attaque', automatique: 'Automatique', statistique: 'Statistique', face: 'Carte retournable', rappel: 'Rappel (briefing)', liste: 'Construction de liste' }
const lines = [
  '# Effets propres aux cartes d’amélioration : où chacun est pris en charge',
  '',
  'Généré par `node scripts/audit-card-effects.mjs` (sondes réelles dans jsdom). Une carte à icône ↱ ou ✖ ne peut pas rester en simple rappel : son état (prête / inclinée / supprimée) doit être suivi.',
  '',
  `${rows.length} cartes à effet propre · ${probes} sondes rejouées dans l’Assistant.`,
  '',
  '| Carte | ↱ / ✖ | Traitement | Où | Remarque |',
  '|---|---|---|---|---|',
  ...rows.map((row) => `| ${row.name} | ${symbol[row.cardUse] || row.cardUse} | ${label[row.treatment] || '**NON CLASSÉ**'} | ${row.where} | ${row.remark} |`),
  '',
]
fs.writeFileSync(path.join(root, 'docs/audit/cartes-effets.md'), lines.join('\n'))
const counts = rows.reduce((acc, row) => ({ ...acc, [row.treatment || 'non classé']: (acc[row.treatment || 'non classé'] || 0) + 1 }), {})
console.log(`Audit effets de cartes : ${rows.length} cartes, ${probes} sondes — ` + Object.entries(counts).map(([name, count]) => `${name} ${count}`).join(', '))
if (problems.length) {
  console.error('\n' + problems.map((problem) => '✗ ' + problem).join('\n'))
  process.exit(1)
}
