/* Cohérence du référentiel livré à l'Assistant (public/assistant/reference-data.js).
   Filet de sécurité contre la classe d'erreur « une carte a un mot-clé dans une
   source et pas dans l'autre » (incident Stormtroopers / Précis 1, 19/09/2026).

   Politique (voir scripts/generate-assistant-reference.mjs) : deux sources de mots-clés par carte,
   les étiquettes de base et la certification complète. Le moteur applique leur UNION tant que la
   certification n'a pas été relue en connaissance du désaccord (keywordsReviewed) : jamais de mot-clé perdu.
   Ce test vérifie que cette garantie tient, et que tout désaccord est visible :
   - tout mot-clé certifié est présent dans les étiquettes livrées (ou la certification est relue) ;
   - aucune certification complète sans liste de mots-clés, ni VIDE face à des étiquettes non vides ;
   - aucun identifiant de mot-clé inconnu ;
   - le registre de corrections manuelles ne contient que des corrections sourcées ;
   - chaque désaccord non relu est compté : il apparaît dans l'écran « Certification des cartes ». */
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
const keywordIds = new Set(ref.keywords.map((keyword) => keyword.id))
const failures = []
const fail = (message) => failures.push(message)
const keyed = (list) => new Map((list || []).map((tag) => [tag.keywordId, tag.value ?? null]))

for (const [card, tags] of Object.entries(ref.tags)) {
  for (const tag of tags) if (!keywordIds.has(tag.keywordId)) fail(`${card} : mot-clé inconnu « ${tag.keywordId} » dans les étiquettes`)
}

let certified = 0
for (const [card, profile] of Object.entries(ref.weapons)) {
  const full = profile.fullCardCertification
  if (!full) continue
  certified++
  if (!Array.isArray(full.keywords)) { fail(`${card} : certification complète sans liste de mots-clés (mettre [] et noKeywordsConfirmed explicitement si la carte n'en a aucun)`); continue }
  for (const tag of full.keywords) if (!keywordIds.has(tag.keywordId)) fail(`${card} : mot-clé certifié inconnu « ${tag.keywordId} »`)
  const shipped = keyed(ref.tags[card])
  if (full.keywordsReviewed !== true) {
    for (const tag of full.keywords) if (!shipped.has(tag.keywordId)) fail(`${card} : mot-clé certifié « ${tag.keywordId} » absent des étiquettes livrées (union non appliquée)`)
  }
  const conflict = ref.keywordConflicts?.[card]
  if (conflict?.suspiciousEmpty) fail(`${card} : certification VIDE alors que la base porte des mots-clés — à relire sur la carte (cocher « aucun mot-clé » si c'est vrai)`)
}

for (const correction of sandbox.window.SWL_REFERENCE_CORRECTIONS || []) {
  if (!correction.source || !correction.date) fail(`correction sans source/date : ${JSON.stringify(correction)}`)
}

// Garde-fous nommés sur l'incident d'origine.
assert.equal(keyed(ref.tags.stormtroopers).get('precis-x'), 1, 'Stormtroopers doit avoir Précis 1 dans les étiquettes livrées')
assert.equal(keyed(ref.weapons.stormtroopers?.fullCardCertification?.keywords).get('precis-x'), 1, 'Stormtroopers doit avoir Précis 1 dans sa certification')
assert.ok(keyed(ref.tags['boba fett infamous bounty hunter']).has('arsenal-x'), 'Boba Fett doit garder Arsenal (union base + certification)')

if (failures.length) {
  console.error(`Cohérence du référentiel : ${failures.length} problème(s)`)
  for (const message of failures) console.error(' - ' + message)
  process.exit(1)
}
const open = Object.values(ref.keywordConflicts || {}).filter((conflict) => !conflict.reviewed).length
const crosschecked = Object.keys(ref.crosscheck || {}).length
console.log(`Cohérence du référentiel OK : ${certified} cartes à certification complète ; ${open} désaccord(s) base/certification et ${crosschecked} écart(s) Legion Helper à relire dans l'écran de certification.`)
