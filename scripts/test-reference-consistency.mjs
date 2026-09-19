/* Cohérence du référentiel livré à l'Assistant (public/assistant/reference-data.js).
   Filet de sécurité contre la classe d'erreur « une carte a un mot-clé dans une
   source et pas dans l'autre » (incident Stormtroopers / Précis 1, 19/09/2026) :
   - les mots-clés certifiés d'une carte (diceCertifications.json) doivent être
     identiques à ses étiquettes livrées (cardTags.ts) — sauf écarts DÉCLARÉS
     ci-dessous, qui restent à arbitrer sur la carte physique ;
   - aucun identifiant de mot-clé inconnu ;
   - aucune carte certifiée sans étiquettes ni sans certification de mots-clés ;
   - le registre de corrections manuelles ne contient que des corrections sourcées.
   Toute NOUVELLE incohérence (import de cartes, certification, correction) fait
   échouer la construction : il faut la trancher, pas la contourner. */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sandbox = { window: {} }
vm.createContext(sandbox)
for (const file of ['reference-data.js', 'reference-corrections.js']) vm.runInContext(fs.readFileSync(path.join(root, 'public/assistant', file), 'utf8'), sandbox)
const ref = sandbox.window.SWL_REFERENCE
const certifications = JSON.parse(fs.readFileSync(path.join(root, 'src/data/diceCertifications.json'), 'utf8'))
const keywordIds = new Set(ref.keywords.map((keyword) => keyword.id))

/* Écarts connus entre la certification et les étiquettes livrées, en attente
   d'arbitrage sur la carte physique. Format : carte -> { certifiedOnly, tagsOnly, valueDiffs }.
   Retirer une entrée dès que la source fautive est corrigée ; ne JAMAIS en
   ajouter pour faire passer un test sans avoir regardé la carte. */
const KNOWN_DISCREPANCIES = {
  '88i twin light blaster': { certifiedOnly: [], tagsOnly: ['fixe'], valueDiffs: [] },
  'at st': { certifiedOnly: [], tagsOnly: ['fixe'], valueDiffs: [] },
  'at st mortar launcher': { certifiedOnly: [], tagsOnly: ['fixe'], valueDiffs: [] },
  'tl tt laser cannon': { certifiedOnly: [], tagsOnly: ['fixe'], valueDiffs: [] },
  'boba fett infamous bounty hunter': { certifiedOnly: ['polyvalent', 'perforant-x', 'impact-x'], tagsOnly: ['arsenal-x'], valueDiffs: [] },
  // Volontaire : Critique 1 imprimé, mais modélisé « Critique 0 + 1 par pion Suppression » (customCards.json, criticalPerSuppression).
  'reluctant hero': { certifiedOnly: [], tagsOnly: [], valueDiffs: ['critique-x'] },
}

const failures = []
const fail = (message) => failures.push(message)
const keyed = (list) => new Map((list || []).map((tag) => [tag.keywordId, tag.value ?? null]))
let comparedCards = 0

for (const [card, tags] of Object.entries(ref.tags)) {
  for (const tag of tags) if (!keywordIds.has(tag.keywordId)) fail(`${card} : mot-clé inconnu « ${tag.keywordId} » dans les étiquettes`)
}

for (const [card, record] of Object.entries(certifications)) {
  const full = record.fullCardCertification
  if (!full) continue
  if (!Array.isArray(full.keywords)) { fail(`${card} : certification complète sans liste de mots-clés (mettre [] explicitement si la carte n'en a aucun)`); continue }
  const certified = keyed(full.keywords)
  for (const id of certified.keys()) if (!keywordIds.has(id)) fail(`${card} : mot-clé certifié inconnu « ${id} »`)
  const tagged = keyed(ref.tags[card])
  const certifiedOnly = [...certified.keys()].filter((id) => !tagged.has(id)).sort()
  const tagsOnly = [...tagged.keys()].filter((id) => !certified.has(id)).sort()
  const valueDiffs = [...certified.keys()].filter((id) => tagged.has(id) && certified.get(id) !== tagged.get(id))
  comparedCards++
  const known = KNOWN_DISCREPANCIES[card]
  if (known) {
    if (JSON.stringify(known.certifiedOnly.slice().sort()) === JSON.stringify(certifiedOnly) && JSON.stringify(known.tagsOnly.slice().sort()) === JSON.stringify(tagsOnly) && JSON.stringify((known.valueDiffs || []).slice().sort()) === JSON.stringify(valueDiffs.slice().sort())) continue
    fail(`${card} : l'écart connu a changé (certifié seul ${certifiedOnly}, étiquettes seules ${tagsOnly}) — mettre KNOWN_DISCREPANCIES à jour ou corriger la source`)
    continue
  }
  if (certifiedOnly.length) fail(`${card} : certifié mais absent des étiquettes livrées : ${certifiedOnly.join(', ')}`)
  if (tagsOnly.length) fail(`${card} : dans les étiquettes livrées mais absent de la certification : ${tagsOnly.join(', ')}`)
  for (const id of valueDiffs) fail(`${card} : valeur de « ${id} » différente (certifiée ${certified.get(id)}, étiquettes ${tagged.get(id)})`)
}

for (const card of Object.keys(KNOWN_DISCREPANCIES)) if (!certifications[card]?.fullCardCertification) fail(`KNOWN_DISCREPANCIES : « ${card} » n'est plus une carte certifiée, retirer l'entrée`)

for (const correction of sandbox.window.SWL_REFERENCE_CORRECTIONS || []) {
  if (!correction.source || !correction.date) fail(`correction sans source/date : ${JSON.stringify(correction)}`)
}

// Garde-fous nommés sur l'incident d'origine.
const precise = ref.tags.stormtroopers?.find((tag) => tag.keywordId === 'precis-x')
assert.equal(precise?.value, 1, 'Stormtroopers doit avoir Précis 1 dans les étiquettes livrées')
assert.equal(keyed(certifications.stormtroopers?.fullCardCertification?.keywords).get('precis-x'), 1, 'Stormtroopers doit avoir Précis 1 dans sa certification')

if (failures.length) {
  console.error(`Cohérence du référentiel : ${failures.length} problème(s)`)
  for (const message of failures) console.error(' - ' + message)
  process.exit(1)
}
console.log(`Cohérence du référentiel OK : ${comparedCards} cartes certifiées comparées, ${Object.keys(KNOWN_DISCREPANCIES).length} écarts connus à arbitrer.`)
