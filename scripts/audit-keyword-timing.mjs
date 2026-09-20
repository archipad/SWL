/* Audit « chaque mot-clé est pris en compte à la bonne étape » (19/09/2026).
   - Mots-clés de combat (impact attaque / défense) : classés automatique / assisté par audit-assistant-automation.mjs
     et couverts par les tests du moteur.
   - Autres mots-clés : chacun doit figurer dans scripts/data/keyword-timing.json avec son étape (phase) et son traitement.
   - Traitement « auto » : le mot-clé doit être réellement référencé dans app.js (bouton ou automatisme) — sinon le build échoue.
   Écrit le tableau complet dans docs/audit/mots-cles-etapes.md. */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sandbox = { window: {} }
vm.createContext(sandbox)
vm.runInContext(fs.readFileSync(path.join(root, 'public/assistant/reference-data.js'), 'utf8'), sandbox)
const { keywords, tags } = sandbox.window.SWL_REFERENCE
const timing = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/keyword-timing.json'), 'utf8'))
const app = fs.readFileSync(path.join(root, 'public/assistant/app.js'), 'utf8')
const engine = fs.readFileSync(path.join(root, 'public/assistant/attack-engine-v32.js'), 'utf8')
const auditSource = fs.readFileSync(path.join(root, 'scripts/audit-assistant-automation.mjs'), 'utf8')
const readSet = (name) => new Set([...(auditSource.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`))?.[1] || '').matchAll(/'([^']+)'/g)].map((m) => m[1]))
const automatic = readSet('automatic'), assisted = readSet('assisted')

const isCombat = (keyword) => [keyword.impact, ...(keyword.displaySections || [])].some((section) => section === 'attaque' || section === 'défense')
const usage = new Map()
for (const list of Object.values(tags)) for (const tag of list) usage.set(tag.keywordId, (usage.get(tag.keywordId) || 0) + 1)

const failures = []
const rows = []
for (const keyword of keywords) {
  const cards = usage.get(keyword.id) || 0
  if (isCombat(keyword)) {
    const status = automatic.has(keyword.id) ? 'automatique' : assisted.has(keyword.id) ? 'assisté' : 'NON TRAITÉ'
    if (status === 'NON TRAITÉ') failures.push(`${keyword.id} : mot-clé de combat non traité par le moteur`)
    rows.push({ keyword, phase: keyword.impact === 'défense' ? 'Défense' : 'Attaque', treatment: `moteur (${status})`, cards })
    continue
  }
  const entry = timing.keywords[keyword.id]
  if (!entry) { failures.push(`${keyword.id} : mot-clé hors combat sans étape ni traitement dans scripts/data/keyword-timing.json`); continue }
  const [phase, treatment] = entry
  if (!timing.phases[phase]) failures.push(`${keyword.id} : étape inconnue « ${phase} »`)
  if (!['auto', 'rappel', 'composition', 'regle'].includes(treatment)) failures.push(`${keyword.id} : traitement inconnu « ${treatment} »`)
  if (treatment === 'regle' && !app.includes(`'${keyword.id}':'`)) failures.push(`${keyword.id} : déclaré « regle » mais absent de MOVE_RULES dans app.js`)
  if (treatment === 'auto' && !app.includes(`'${keyword.id}'`) && !engine.includes(`'${keyword.id}'`)) failures.push(`${keyword.id} : déclaré « auto » mais absent du code de l'Assistant`)
  rows.push({ keyword, phase: timing.phases[phase] || phase, treatment, cards })
}
for (const id of Object.keys(timing.keywords)) {
  const keyword = keywords.find((item) => item.id === id)
  if (!keyword) failures.push(`${id} : présent dans keyword-timing.json mais absent du glossaire`)
  else if (isCombat(keyword)) failures.push(`${id} : mot-clé de combat listé dans keyword-timing.json (doublon avec l'audit du moteur)`)
}

if (failures.length) {
  console.error(`Audit des mots-clés : ${failures.length} problème(s)`)
  for (const message of failures) console.error(' - ' + message)
  process.exit(1)
}

const byTreatment = (label) => rows.filter((row) => row.treatment === label).length
const lines = ['# Mots-clés : étape où ils agissent et traitement dans l’Assistant', '',
  `Généré par \`node scripts/audit-keyword-timing.mjs\` (dans \`npm run build\`). ${rows.length} mots-clés du glossaire.`, '',
  `- Combat (attaque / défense), gérés par le moteur : **${rows.filter((row) => row.treatment.startsWith('moteur')).length}** (${rows.filter((row) => row.treatment === 'moteur (automatique)').length} automatiques, ${rows.filter((row) => row.treatment === 'moteur (assisté)').length} assistés).`,
  `- Hors combat, **application par bouton** : ${byTreatment('auto')}.`,
  `- Hors combat, **règle de mouvement affichée dans le Briefing** : ${byTreatment('regle')}.`,
  `- Hors combat, **rappel à l’étape** (pastille d’étape dans le Briefing de la fiche d’unité) : ${byTreatment('rappel')}.`,
  `- Composition d’armée (rappel replié) : ${byTreatment('composition')}.`, '',
  '| Mot-clé | Étape | Traitement | Cartes |', '|---|---|---|---:|']
for (const row of rows.sort((a, b) => a.phase.localeCompare(b.phase, 'fr') || a.keyword.name.localeCompare(b.keyword.name, 'fr'))) {
  lines.push(`| ${row.keyword.name} | ${row.phase} | ${row.treatment} | ${row.cards} |`)
}
fs.mkdirSync(path.join(root, 'docs/audit'), { recursive: true })
fs.writeFileSync(path.join(root, 'docs/audit/mots-cles-etapes.md'), lines.join('\n') + '\n')
console.log(`Mots-clés OK : ${rows.length} au total, ${rows.filter((row) => row.treatment.startsWith('moteur')).length} de combat, ${byTreatment('auto')} par bouton, ${byTreatment('rappel')} en rappel d’étape, ${byTreatment('composition')} de composition.`)
