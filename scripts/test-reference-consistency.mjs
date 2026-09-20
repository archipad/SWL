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

/* Mot-clé À VALEUR (« X ») imprimé sans valeur sur une carte : le moteur compterait 0 et n'appliquerait jamais l'effet
   (même famille d'erreur que Précis / Stormtroopers). Exceptions déclarées : Autonome (précision imprimée « Viser 1 ou Esquive 1 »,
   pas de valeur numérique) et Sustentation (« terrestre » sans X) ; les valeurs portées par les armes (Impact 1 sur une arme,
   Impact 3 sur une autre) sont lues dans keywordValues de l'arme. */
const VALUE_OPTIONAL = new Set(['autonome', 'sustentation'])
/* Valeurs impossibles à lire sur le visuel actuel (image recadrée : le bas de la carte manque). À relire sur la carte physique
   ou avec un visuel complet, puis certifier dans l'écran « Certification des cartes ». Liste fermée : toute autre absence échoue. */
const VALUE_UNREADABLE = new Set(['gar saxon militant commando:perforant-x'])
const keywordDefs = new Map(ref.keywords.map((keyword) => [keyword.id, keyword]))
for (const [card, tags] of Object.entries(ref.tags)) {
  for (const tag of tags) {
    if (!keywordDefs.get(tag.keywordId)?.hasValue || VALUE_OPTIONAL.has(tag.keywordId)) continue
    if (Number.isFinite(tag.value) && tag.value >= 0) continue
    const weaponValue = (ref.weapons[card]?.weapons || []).some((weapon) => Number.isFinite(weapon.keywordValues?.[tag.keywordId]))
    if (!weaponValue && VALUE_UNREADABLE.has(card + ':' + tag.keywordId)) { console.warn('À VÉRIFIER (valeur illisible sur le visuel) : ' + card + ' — ' + tag.keywordId); continue }
    if (!weaponValue) fail(card + ' : « ' + tag.keywordId + ' » est un mot-clé à valeur X mais aucune valeur n’est renseignée (le moteur compterait 0)')
  }
}

/* Tout mot-clé porté par une ARME doit exister dans les étiquettes de sa carte : l'Assistant construit les règles d'une attaque
   à partir des étiquettes (audit du 20/09/2026 : 48 mots-clés d'armes Mercenaires étaient ignorés en attaque). */
for (const [card, profile] of Object.entries(ref.weapons)) {
  for (const weapon of profile.weapons || []) {
    for (const id of weapon.keywordIds || []) {
      if (!(ref.tags[card] || []).some((tag) => tag.keywordId === id)) fail(`${card} / ${weapon.name} : mot-clé d’arme « ${id} » absent des étiquettes de la carte (ignoré en attaque)`)
    }
  }
}

/* Chaque carte d'AMÉLIORATION doit avoir son utilisation (passive / s'incline ↱ / supprimée ✖ / les deux) : c'est ce qui décide si
   le joueur peut la redresser ou si elle disparaît de la partie (Pointe de Vitesse). Une carte non classée fait échouer le build. */
const USES = new Set(['passive', 'exhaust', 'discard', 'both'])
const appSource = fs.readFileSync(path.join(root, 'public/assistant/app.js'), 'utf8')
const rankCatalog = vm.runInNewContext('(' + appSource.match(/const rankCatalog=(\{[\s\S]*?\});/)[1] + ')')
const unitCards = new Set(Object.values(rankCatalog).flat())
for (const [card, profile] of Object.entries(ref.weapons)) {
  if (unitCards.has(card) || profile.unitStats || profile.defenseColor || profile.fullCardCertification?.cardType === 'unit') continue
  if (!USES.has(ref.cardUse?.[card])) fail(`${card} : carte d’amélioration sans utilisation (passive / s’incline / supprimée) dans src/data/upgradeCardUse.json`)
}
for (const [card, use] of Object.entries(ref.cardUse || {})) if (!USES.has(use)) fail(`${card} : utilisation de carte inconnue « ${use} »`)

/* Armes imprimées sur des cartes qui n'en avaient aucune dans la base (audit du 21/09/2026 : comptage des icônes de portée sur les
   visuels). Ces cartes doivent garder leurs armes. */
for (const card of ['df 90 mortar trooper', 'dewback rider', 'e web heavy blaster team', 'stormtrooper heavy gunner squad', 'kraken', 'captain rex', 'mounted gunners', 'kallus the operative', 'darth vader the emperor s apprentice', 'iden s id10 seeker droid']) {
  if (!(ref.weapons[card]?.weapons || []).length) fail(card + ' : la carte imprime des armes, la base n’en a aucune')
}
/* Vitesse : obligatoire pour toute unité certifiée (rappel des unités encore sans vitesse, non bloquant pour l'existant). */
const noSpeed = Object.entries(ref.weapons).filter(([, profile]) => profile.fullCardCertification?.cardType === 'unit' && !['1', '2', '3'].includes(String(profile.fullCardCertification.speed))).map(([card]) => card)
if (noSpeed.length) console.warn('À CERTIFIER (vitesse manquante) : ' + noSpeed.join(', '))

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
