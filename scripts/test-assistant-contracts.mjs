import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = fs.readFileSync(new URL('../public/assistant/app.js', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('../public/assistant/engine.css', import.meta.url), 'utf8')
const index = fs.readFileSync(new URL('../public/assistant/index.html', import.meta.url), 'utf8')
const certificationUi = fs.readFileSync(new URL('../public/assistant/certification.js', import.meta.url), 'utf8')
const referenceData = fs.readFileSync(new URL('../public/assistant/reference-data.js', import.meta.url), 'utf8')
const reference = JSON.parse(referenceData.replace(/^window\.SWL_REFERENCE=/, '').replace(/;\s*$/, ''))
const trackerUi = fs.readFileSync(new URL('../src/components/GameTrackerScreen.tsx', import.meta.url), 'utf8')
const trackerState = fs.readFileSync(new URL('../src/lib/useGameTracker.ts', import.meta.url), 'utf8')
const certifications = JSON.parse(fs.readFileSync(new URL('../src/data/diceCertifications.json', import.meta.url), 'utf8'))
const importAudit = fs.readFileSync(new URL('../src/lib/importAudit.ts', import.meta.url), 'utf8')
const unitModels = fs.readFileSync(new URL('../src/lib/unitModels.ts', import.meta.url), 'utf8')
const setupUi = fs.readFileSync(new URL('../src/components/SetupScreen.tsx', import.meta.url), 'utf8')
const syncUi = fs.readFileSync(new URL('../src/lib/useSync.ts', import.meta.url), 'utf8')
const gistSync = fs.readFileSync(new URL('../src/lib/gistSync.ts', import.meta.url), 'utf8')
const jsonImporter = fs.readFileSync(new URL('../src/lib/parseListJson.ts', import.meta.url), 'utf8')
const certificationUiSource = fs.readFileSync(new URL('../public/assistant/certification.js', import.meta.url), 'utf8')

// Les cartes de personnel et d'armes lourdes ajoutent chacune leur figurine.
// Ces contrats protègent notamment les effectifs complets des Soldats et Vétérans rebelles.
const totalModels = (unit, upgrades) => certifications[unit].unitStats.baseModels
  + upgrades.reduce((sum, upgrade) => sum + (certifications[upgrade]?.addedModels || 0), 0)
assert.equal(totalModels('rebel troopers', ['z 6 trooper', 'rebel trooper']), 6, 'Soldats rebelles : 4 + Z-6 + Soldat Rebelle doit donner 6')
assert.equal(totalModels('rebel veterans', ['cm o 93 trooper', 'rebel veteran']), 6, 'Vétérans rebelles : 4 + CM-O/93 + Vétéran Rebelle doit donner 6')

const expectedAddedModels = {
  'rebel trooper': 1,
  'rebel veteran': 1,
  'rebel trooper specialist': 1,
  'rebel comms technician': 1,
  'sleeper cell astromech': 1,
  'kraken': 1,
  'captain rex': 1,
  'fleet trooper squad': 5,
  'rebel trooper squad': 5,
  'rebel veteran squad': 5,
  'stormtrooper squad': 5,
  'stormtrooper squad expansion': 5,
  'snowtrooper squad expansion': 5,
  'shoretrooper squad expansion': 5,
}
for (const [card, expected] of Object.entries(expectedAddedModels)) {
  assert.equal(certifications[card]?.addedModels, expected, `${card}: nombre de figurines ajoutées incorrect ou absent`)
}

for (const [card, record] of Object.entries(certifications)) {
  if (record.unitStats || !(record.weapons || []).length) continue
  assert.ok(Number.isInteger(record.addedModels), `${card}: impact sur l'effectif non déclaré`)
}

// Toute situation dont la réponse modifie une règle doit avoir trois états :
// non répondue, oui et non. Une case décochée ne suffit pas à prouver un « non ».
const mandatoryConditions = [
  ['ramEligible', 'belier-x'],
  ['engaged', 'tenir-bon'],
  ['targetForceUpgrade', 'chasseur-de-jedi'],
  ['priorityMissionAttack', 'accomplir-la-mission'],
  ['priorityMissionDefense', 'accomplir-la-mission'],
]
for (const [field, keyword] of mandatoryConditions) {
  assert.match(app, new RegExp(`${field}:null`), `${field} doit commencer sans réponse`)
  assert.match(app, new RegExp(`conditionalChoice\\('${field}'`), `${field} doit proposer Oui et Non`)
  assert.match(app, new RegExp(`${field}===null`), `${field} doit bloquer la progression sans réponse`)
  assert.match(app, new RegExp(keyword.replace('-', '\\-')), `${keyword} doit rester relié à sa condition`)
}
assert.match(app, /data-condition="\$\{id\}" data-value="true"/, 'Bouton Oui manquant')
assert.match(app, /data-condition="\$\{id\}" data-value="false"/, 'Bouton Non manquant')
assert.match(app, /if\(stepIssue\(\)\)\{resolveScreen\(\);return\}/, 'Le bouton suivant doit respecter tous les blocages')
assert.match(app, /\+b\.dataset\.go<=attackStep\|\|!stepIssue\(\)/, 'La navigation directe ne doit pas contourner un blocage')

// Contrats de saisie : chaque résultat doit correspondre exactement à la réserve.
assert.match(app, /total===expected/, 'Le compteur de saisie exacte est absent')
assert.match(app, /rolled!==expected/, 'Le verrou du jet de défense est absent')
assert.match(app, /Object\.values\(attackState\.roll\).*rolled!==expected/, 'Le verrou du jet d’attaque est absent')

// Contrats de suivi de partie : les blessures restent affectées aux bonnes figurines.
assert.match(app, /modelWounds/, 'La répartition persistante des blessures par figurine est absente')
assert.match(app, /eligibleWoundTarget/, 'Le contrôle de la figurine éligible est absent')
assert.match(app, /progress\.assigned!==progress\.required/, 'La fin d’attaque doit être bloquée tant que les blessures ne sont pas réparties')
assert.match(app, /outcome\?\.panicked/, 'Une unité encore paniquée après ralliement doit être détectée')
assert.match(app, /Unité paniquée : aucune action/, 'La panique doit interdire les actions')
assert.match(app, /state\.suppression-courage/, 'La fin d’activation paniquée doit retirer la valeur de Courage en suppression')
assert.match(trackerState, /activatedUnitIds: string\[\]/, 'Le suivi persistant des activations est absent')
assert.match(trackerUi, /toggleActivation/, 'Le bouton Jouée / À jouer est absent')
assert.match(trackerUi, /round === state\.round \? activatedUnitIds : \[\]/, 'Un nouveau round doit remettre les activations à zéro')
assert.match(trackerUi, /!unitSnapshot\(unit, player, index\)\.defeated/, 'Une unité vaincue ne doit pas compter parmi les activations restantes')
assert.match(app, /markUnitActivated\(attacker\)/, 'Une attaque terminée doit marquer automatiquement l’attaquant comme joué')
assert.match(app, /markUnitActivated\(entry\)/, 'Une activation paniquée terminée doit être marquée comme jouée')
assert.match(trackerState, /roundHistory: RoundHistoryEntry\[\]/, 'L’historique des rounds est absent')
assert.match(trackerUi, /round: state\.round \+ 1/, 'Le passage contrôlé au round suivant est absent')
assert.match(trackerUi, /roundHistory: \[\.\.\.roundHistory/, 'Le round terminé doit être archivé avant la remise à zéro')

// Contrats iPad : viewport, trois colonnes adaptatives, cibles tactiles et barre d’action visible.
assert.match(index, /viewport-fit=cover/, 'Le viewport iPad doit respecter les zones sûres')
assert.match(css, /@media \(min-width:768px\) and \(max-width:1180px\)/, 'Point de rupture iPad absent')
assert.match(css, /grid-template-columns:minmax\(150px,185px\) minmax\(0,1fr\) minmax\(150px,185px\)/, 'Disposition iPad à trois colonnes absente')
assert.match(css, /env\(safe-area-inset-bottom\)/, 'La barre basse ne respecte pas la zone sûre iPad')
assert.match(css, /\.touch-counter button[^}]*min-width:(?:4[4-9]|[5-9]\d)px[^}]*min-height:(?:4[4-9]|[5-9]\d)px/s, 'Les boutons +/- doivent conserver une cible tactile suffisante')
assert.match(certificationUi, /!!weaponProfiles\[card\]\?\.unitStats/, 'Une carte avec caractéristiques certifiées doit être reconnue comme carte Unité')
assert.match(referenceData, /"offensive posture":"\/SWL\/cards\/offensive-posture\.jpg"/, 'Posture Offensive doit être raccordée au sous-chemin GitHub Pages')
assert.doesNotMatch(referenceData, /"images":\{[^}]*":"\/cards\//, 'Aucun visuel ne doit cibler la racine du domaine')
assert.match(referenceData, /"offensive posture":\{"weapons":\[\],"note":"carte sans dés ni figurine ajoutée"\}/, 'Toute carte illustrée doit rester raccordée au référentiel')
assert.doesNotMatch(referenceData, /"offensive posture":\{[^}]*"addedModels"/, 'Une amélioration sans figurine ne doit pas créer un faux contrôle de figurines')
assert.match(certificationUi, /Number\.isInteger\(profile\.addedModels\)/, 'Seules les cartes déclarées comme ajoutant des figurines doivent entrer dans ce contrôle')
assert.match(app, /'ahsoka tano fulcrum':'ahsoka tano'/, 'Ahsoka Fulcrum doit réutiliser son profil certifié Ahsoka Tano')
assert.match(app, /window\.SWL_REFERENCE\?\.images/, 'L’assistant doit utiliser le catalogue central des visuels')
assert.match(app, /'ahsoka tano fulcrum':'ahsoka tano'/, 'La variante Tabletop Admiral d’Ahsoka doit utiliser la certification canonique')
assert.match(app, /const key=cardKey\(unit\.name\)/, 'Le rang des unités importées doit utiliser leur clé canonique')

// Tout nouvel import doit produire un diagnostic explicite et utiliser le
// même calcul d'effectif que le tableau de suivi.
assert.match(setupUi, /ImportCompatibilityReport/, 'Le rapport de compatibilité doit être visible après import')
assert.match(importAudit, /Visuel non raccordé/, 'Un visuel inconnu doit être signalé')
assert.match(importAudit, /PV, courage ou effectif non certifiés/, 'Une unité non certifiée doit être signalée')
assert.match(importAudit, /Dés d.attaque non certifiés/, 'Une arme non certifiée doit être signalée')
assert.match(unitModels, /addedModelWounds \?\? base\.woundsPerModel/, 'Les figurines hétérogènes doivent conserver leurs propres PV')
assert.match(trackerUi, /buildCertifiedUnitRoster/, 'Le suivi de partie doit utiliser le calcul d’effectif central')

// État, journal d'attaque et suivi de partie voyagent dans un même format
// versionné afin que deux appareils affichent le même état de partie.
assert.match(gistSync, /schemaVersion\?: number/, 'Le format de synchronisation doit être versionné')
assert.match(gistSync, /assistantAttackHistory\?: unknown\[\]/, 'Le journal des attaques doit faire partie de la synchronisation')
assert.match(syncUi, /swl\.assistant\.attack-history\.v1/, 'Le journal distant doit être restauré localement')
assert.match(app, /assistantAttackHistory:attackHistory/, 'L’assistant doit envoyer son journal de résolution')
assert.match(trackerUi, /Journal de résolution/, 'Le suivi de partie doit afficher le journal synchronisé des attaques')
assert.match(jsonImporter, /const unitKey = nextSlug\(u\.name\)/, 'La clé stable d’une unité doit être réservée avant ses améliorations')
assert.match(app, /unit\.key\|\|index/, 'L’assistant doit conserver une identité stable lors d’une réimportation')
assert.match(app, /legacyId/, 'Les blessures enregistrées avec les anciens identifiants doivent être migrées')
assert.match(certificationUiSource, /location\.hash==='\#certification'/, 'Le rapport d’import doit pouvoir ouvrir directement la certification')

// Couverture exhaustive des ressources déjà présentes : tout nouveau fichier
// de carte doit être nommé et raccordé avant qu'une publication puisse passer.
const imageFiles = fs.readdirSync(new URL('../public/cards/', import.meta.url))
  .filter((file) => /\.(?:jpe?g|png|webp)$/i.test(file))
const mappedImageFiles = new Set(Object.values(reference.images).map((path) => path.split('/').pop().toLowerCase()))
for (const file of imageFiles) assert.ok(mappedImageFiles.has(file.toLowerCase()), `${file}: visuel non raccordé au catalogue`)
for (const card of Object.keys(reference.images)) assert.ok(reference.names[card], `${card}: traduction française absente`)
for (const [card, profile] of Object.entries(reference.weapons)) {
  if (profile.defenseColor) assert.ok(profile.unitStats?.verifiedAgainstCard, `${card}: PV/courage/figurines non certifiés`)
  if (Number.isInteger(profile.addedModels)) assert.ok(profile.addedModelsVerifiedAgainstCard, `${card}: ajout de figurines non certifié`)
}

// La base centrale ne doit contenir que des valeurs exploitables par le moteur.
const colors = new Set(['rouge', 'noir', 'blanc'])
let certifiedWeapons = 0
let certifiedDefense = 0
for (const [card, record] of Object.entries(certifications)) {
  assert.ok(card.trim(), 'Une certification possède un nom de carte vide')
  for (const weapon of record.weapons || []) {
    assert.ok(Number.isInteger(weapon.index) && weapon.index >= 0, `${card}: index d’arme invalide`)
    assert.ok(weapon.name, `${card}: nom d’arme manquant`)
    if (weapon.dice !== 'variable') for (const die of weapon.dice || []) {
      assert.ok(colors.has(die.color), `${card}/${weapon.name}: couleur invalide`)
      assert.ok(Number.isInteger(die.count) && die.count > 0, `${card}/${weapon.name}: quantité invalide`)
    }
    certifiedWeapons++
  }
  if (record.defenseColor) {
    assert.ok(record.defenseColor === 'rouge' || record.defenseColor === 'blanc', `${card}: défense invalide`)
    certifiedDefense++
  }
}

console.log(`Assistant contracts: conditions, saisies, iPad et base OK (${certifiedWeapons} armes, ${certifiedDefense} défenses)`)
