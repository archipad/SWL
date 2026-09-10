import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = fs.readFileSync(new URL('../public/assistant/app.js', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('../public/assistant/engine.css', import.meta.url), 'utf8')
const index = fs.readFileSync(new URL('../public/assistant/index.html', import.meta.url), 'utf8')
const certificationUi = fs.readFileSync(new URL('../public/assistant/certification.js', import.meta.url), 'utf8')
const trackerUi = fs.readFileSync(new URL('../src/components/GameTrackerScreen.tsx', import.meta.url), 'utf8')
const trackerState = fs.readFileSync(new URL('../src/lib/useGameTracker.ts', import.meta.url), 'utf8')
const certifications = JSON.parse(fs.readFileSync(new URL('../src/data/diceCertifications.json', import.meta.url), 'utf8'))

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
