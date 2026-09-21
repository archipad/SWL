import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = fs.readFileSync(new URL('../public/assistant/app.js', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('../public/assistant/engine.css', import.meta.url), 'utf8')
const ipadCss = fs.readFileSync(new URL('../public/assistant/ipad-compact.css', import.meta.url), 'utf8')
const upgrades = fs.readFileSync(new URL('../public/assistant/upgrades.css', import.meta.url), 'utf8')
const index = fs.readFileSync(new URL('../public/assistant/index.html', import.meta.url), 'utf8')
const certificationUi = fs.readFileSync(new URL('../public/assistant/certification.js', import.meta.url), 'utf8')
const referenceData = fs.readFileSync(new URL('../public/assistant/reference-data.js', import.meta.url), 'utf8')
const reference = JSON.parse(referenceData.replace(/^window\.SWL_REFERENCE=/, '').replace(/;\s*$/, ''))
const trackerUi = fs.readFileSync(new URL('../src/components/GameTrackerScreen.tsx', import.meta.url), 'utf8')
const trackerState = fs.readFileSync(new URL('../src/lib/useGameTracker.ts', import.meta.url), 'utf8')
const certifications = JSON.parse(fs.readFileSync(new URL('../src/data/diceCertifications.json', import.meta.url), 'utf8'))
const customCards = JSON.parse(fs.readFileSync(new URL('../src/data/customCards.json', import.meta.url), 'utf8'))
const importAudit = fs.readFileSync(new URL('../src/lib/importAudit.ts', import.meta.url), 'utf8')
const setupUi = fs.readFileSync(new URL('../src/components/SetupScreen.tsx', import.meta.url), 'utf8')
const syncUi = fs.readFileSync(new URL('../src/lib/useSync.ts', import.meta.url), 'utf8')
const gistSync = fs.readFileSync(new URL('../src/lib/gistSync.ts', import.meta.url), 'utf8')
const jsonImporter = fs.readFileSync(new URL('../src/lib/parseListJson.ts', import.meta.url), 'utf8')
const cardNames = fs.readFileSync(new URL('../src/lib/cardNames.ts', import.meta.url), 'utf8')
const cardKeyAliases = JSON.parse(fs.readFileSync(new URL('../src/data/cardKeyAliases.json', import.meta.url), 'utf8'))
const applyScript = fs.readFileSync(new URL('../scripts/apply-dice-certification.mjs', import.meta.url), 'utf8')
const diceProfilesSource = fs.readFileSync(new URL('../src/data/diceProfiles.ts', import.meta.url), 'utf8')
const cardImagesSource = fs.readFileSync(new URL('../src/data/cardImages.ts', import.meta.url), 'utf8')
const cardNamesFrSource = fs.readFileSync(new URL('../src/data/cardNamesFr.ts', import.meta.url), 'utf8')
const unitModelsSource = fs.readFileSync(new URL('../src/lib/unitModels.ts', import.meta.url), 'utf8')
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
  ['tenacityUsed', 'tenacity'],
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
// L'appli ne suit plus les PV/effectif (choix produit) : l'éligibilité de
// Ténacité ne peut plus se déduire automatiquement des blessures. Le joueur
// répond lui-même Oui/Non (voir unansweredConditional() ci-dessous) —
// question devenue obligatoire dès que l'unité est en mesure de l'utiliser.
assert.match(app, /function tenacityEligible\(\)\{return attackStep===0&&attackState\.range==='melee'&&hasCard\(attacker,'tenacity'\)&&selectedWeaponRows\(\)\.length>0\}/, 'Ténacité doit rester proposée pour toute attaque au corps-à-corps avec la carte, en laissant le joueur confirmer si l’unité est blessée')
assert.match(app, /rouge:result\.rouge\+tenacity/, 'Ténacité doit ajouter exactement un dé rouge à la réserve')
assert.match(app, /souhaitez-vous appliquer Ténacité/, 'Ténacité étant facultative, le joueur doit confirmer son application')

// Tireur Embusqué / Maîtrise du Jar'Kai (16/09/2026) : passés en automatique
// — calcul pur (vierge→touche, touche→critique après conversion), sans
// dépendance de table contrairement aux autres mots-clés assistés.
assert.match(app, /function marksmanEligible\(\)\{return allResolved\(attacker\)\.some\(x=>x\.def\.id==='tireur-embusque'\)\}/, 'Tireur Embusqué doit être détecté sans condition de portée')
assert.match(app, /function jarkaiEligible\(\)\{return attackType\(\)==='melee'&&allResolved\(attacker\)\.some\(x=>x\.def\.id==='maitrise-du-jarkai'\)\}/, 'Maîtrise du Jar’Kai doit être réservée au corps-à-corps')
assert.match(app, /engine\.applyBlankUpgrade\(result\.hit,result\.crit,attackState\.roll\.blank,blankToHit,hitToCrit\)/, 'La conversion vierge/touche/critique doit utiliser le moteur partagé')
assert.match(app, /'marksmanBlankToHit','marksmanBlankToHit'.*'jarkaiHitToCrit','jarkaiHitToCrit'/, 'Les compteurs Tireur Embusqué/Jar’Kai doivent être branchés aux champs de saisie')

// Maîtrise du Makashi (16/09/2026) : passée en automatique — réduction de
// Perforant et refus d'Immunité : perforant (corps-à-corps), une fois la
// question Oui/Non répondue, sans dépendance de table.
assert.match(app, /function makashiEligible\(\)\{return attackStep===0&&attackType\(\)==='melee'&&allResolved\(attacker\)\.some\(x=>x\.def\.id==='maitrise-du-makashi'\)&&attackKeywordValue\('perforant-x'\)>0\}/, 'Maîtrise du Makashi doit être réservée au corps-à-corps avec du Perforant dans la réserve')
assert.match(app, /souhaitez-vous appliquer Maîtrise du Makashi/, 'Maîtrise du Makashi étant facultative, le joueur doit confirmer son application')
assert.match(app, /perforant-x'\)\+duelistAttack\.pierceBonus-\(makashiUsed\?1:0\)/, 'Maîtrise du Makashi doit réduire le Perforant total de 1 quand elle est utilisée')
assert.match(app, /immunite-perforant-corps-a-corps'&&attackType\(\)==='melee'&&!makashiUsed/, 'Maîtrise du Makashi doit interdire Immunité : perforant (corps-à-corps) quand elle est utilisée')

// Maîtrise du Soresu (16/09/2026) : passée en automatique — relance de tous
// les dés de défense en défense à distance, sans dépendance de table.
// Simplification documentée : le sous-cas « en utilisant Gardien X, dépenser
// un pion Esquive pour relancer les dés du Gardien » n'est pas couvert.
assert.match(app, /ranged&&allResolved\(defender\)\.some\(x=>x\.def\.id==='maitrise-du-soresu'\)\?a\.hit\+a\.crit:0/, 'Maîtrise du Soresu doit permettre de relancer tous les dés de défense à distance')

// Déflexion / Maîtrise du Shien / Immunité : Déflexion (16/09/2026) : passés
// en automatique. Simplification documentée : le sous-cas Déflexion via
// Gardien X (dés du Gardien, pas ceux de la défense normale) n'est pas
// couvert — seule la défense directe à distance l'est.
assert.match(app, /deflexionEligible=attackType\(\)==='ranged'&&allResolved\(defender\)\.some\(x=>x\.def\.id==='deflexion'\).*!selectedWeaponRows\(\)\.every\(row=>weaponHasKeyword\(row,'haute-velocite'\)\)/, 'Déflexion doit être ignorée si la réserve d’attaque n’a que des armes Haute Vélocité')
assert.match(app, /deflexionImmune=selectedWeaponRows\(\)\.some\(row=>weaponHasKeyword\(row,'immunite-deflexion'\)\)/, 'Immunité : Déflexion doit être détectée sur les armes de la réserve')
assert.match(app, /shienActive=deflexionEligible&&allResolved\(defender\)\.some\(x=>x\.def\.id==='maitrise-du-shien'\)/, 'Maîtrise du Shien ne doit s’activer qu’avec Déflexion effectivement en jeu')
assert.match(app, /deflexionWounds=deflexionEligible&&!deflexionImmune&&Number\(d\.surge\)>0\?\(shienActive\?Number\(d\.surge\):1\):0/, 'Maîtrise du Shien doit remplacer la blessure fixe de Déflexion par 1 par adrénaline de défense')
assert.match(app, /holdFast\|\|missionDefense\|\|deflexionEligible\?'block'/, 'Déflexion doit forcer la conversion d’adrénaline de défense en blocage')
assert.match(app, /shienDeniesSuppression=shienActive&&ranged&&result\.wounds===0/, 'Maîtrise du Shien doit annuler la suppression si aucune blessure n’a été subie')
assert.match(cardNames, /while \(CARD_KEY_ALIASES\[current\]/, 'Les alias successifs doivent converger vers la carte canonique finale')
assert.match(applyScript, /Cycle d'alias détecté/, 'Un lot de certification ne doit jamais pouvoir créer une boucle d’alias')

// Contrats de saisie : chaque résultat doit correspondre exactement à la réserve.
assert.match(app, /total===expected/, 'Le compteur de saisie exacte est absent')
assert.match(app, /rolled!==expected/, 'Le verrou du jet de défense est absent')
assert.match(app, /Object\.values\(attackState\.roll\).*rolled!==expected/, 'Le verrou du jet d’attaque est absent')

// L'appli ne suit plus les PV/effectif ni la répartition des blessures par
// figurine (choix produit) : ce contrat est retiré plutôt que contourné.
// Ralliement (17/09/2026, décision produit utilisateur) : plus de mini-jeu de
// saisie des dés ni de verrouillage automatique du bouton Suivant en cas de
// panique détectée par l'appli — remplacé par un pop-up de rappel de règle à
// l'ouverture de l'unité ; la suppression est ensuite corrigée à la main.
assert.match(app, /function moralPopupContent\(entry\)/, 'Le pop-up de rappel de ralliement/panique doit exister')
assert.match(app, /freshOpen&&role==='attack'&&!lost.*moralPopupContent\(entry\)/, 'Le pop-up de moral doit apparaître à l’ouverture de l’unité, pas à chaque re-rendu')
assert.match(app, /function showRulePopup\(innerHtml,className\)/, 'Les pop-up de rappel de règle doivent passer par un helper de dialogue commun')
assert.match(trackerState, /activatedUnitIds: string\[\]/, 'Le suivi persistant des activations est absent')
assert.match(trackerUi, /toggleActivation/, 'Le bouton Jouée / À jouer est absent')
assert.match(trackerUi, /round === state\.round \? activatedUnitIds : \[\]/, 'Un nouveau round doit remettre les activations à zéro')
assert.match(trackerUi, /!unitSnapshot\(unit, player, index\)\.outOfAction/, 'Une unité hors combat ne doit pas compter parmi les activations restantes')
assert.match(app, /markUnitActivated\(attacker\)/, 'Une attaque terminée doit marquer automatiquement l’attaquant comme joué')
assert.match(app, /markUnitActivated\(entry\)/, 'Une activation paniquée terminée doit être marquée comme jouée')
assert.match(app, /Terminer sans attaquer/, 'Une activation normale doit pouvoir être terminée sans attaque')
assert.match(trackerState, /roundHistory: RoundHistoryEntry\[\]/, 'L’historique des rounds est absent')
assert.match(trackerUi, /round: state\.round \+ 1/, 'Le passage contrôlé au round suivant est absent')
assert.match(trackerUi, /roundHistory: \[\.\.\.roundHistory/, 'Le round terminé doit être archivé avant la remise à zéro')

// Contrats iPad : viewport, trois colonnes adaptatives, cibles tactiles et barre d’action visible.
assert.match(index, /viewport-fit=cover/, 'Le viewport iPad doit respecter les zones sûres')
assert.match(index, /ipad-compact\.css/, 'La feuille responsive iPad dédiée doit être chargée en dernier')
assert.match(ipadCss, /orientation:portrait/, 'La disposition iPad portrait est absente')
assert.match(ipadCss, /orientation:landscape/, 'La disposition iPad paysage est absente')
assert.match(ipadCss, /pointer:coarse/, 'Les adaptations tablette doivent cibler les interfaces tactiles')
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
// Les alias de clés de carte vivent dans un seul fichier partagé
// (src/data/cardKeyAliases.json) -- l'assistant les lit depuis le
// référentiel généré plutôt que d'en garder une copie en dur, pour ne
// plus pouvoir diverger de l'appli principale (src/lib/cardNames.ts).
assert.match(app, /window\.SWL_REFERENCE\?\.aliases/, 'L’assistant doit lire les alias depuis le référentiel central, pas une copie locale')
assert.doesNotMatch(app, /const cardAliases=\{/, 'Les alias ne doivent plus être dupliqués en dur dans app.js')
assert.match(cardNames, /import aliasesJson from '\.\.\/data\/cardKeyAliases\.json'/, 'cardNames.ts doit lire les alias depuis le fichier JSON partagé')
assert.match(cardNames, /CARD_NAMES_FR\[canonicalCardKey\(name\)\]/, 'frenchCardName doit résoudre les alias avant de chercher le nom français (sinon un alias affiche le nom brut Tabletop Admiral)')
assert.equal(reference.aliases?.['ahsoka tano fulcrum'], 'ahsoka tano', 'Ahsoka Fulcrum doit réutiliser son profil certifié Ahsoka Tano')
assert.equal(reference.aliases?.['prepared supplies'], 'prepared materiel', 'L’assistant doit reconnaître Prepared Supplies')
assert.equal(reference.aliases?.['cm 0 93 trooper'], 'cm o 93 trooper', 'L’assistant doit reconnaître la variante CM-0/93')
assert.equal(reference.aliases?.['evasive cover'], 'duck and cover', 'L’ancienne clé Evasive Cover doit retrouver Duck and Cover')
assert.equal(reference.aliases?.['chewbacca walking carpet'], 'chewbacca', 'Chewbacca Walking Carpet doit réutiliser son profil certifié Chewbacca')
assert.match(app, /window\.SWL_REFERENCE\?\.images/, 'L’assistant doit utiliser le catalogue central des visuels')
assert.match(app, /const key=cardKey\(unit\.name\)/, 'Le rang des unités importées doit utiliser leur clé canonique')

// Cartes importées totalement absentes du catalogue (ni visuel ni profil de
// dés) : détection dans l'écran de certification, et deux façons de les
// résoudre (alias vers une carte déjà connue, ou nouvelle carte complète
// avec visuel) appliquées par le même circuit issue GitHub + Action.
assert.match(certificationUi, /function unknownCardEntries\(\)/, 'La détection des cartes totalement inconnues du catalogue est absente')
assert.match(certificationUi, /data-unknown-action="pick"/, 'Le choix « même carte que… » est absent de l’écran de certification')
assert.match(certificationUi, /data-unknown-action="new"/, 'Le choix « nouvelle carte » est absent de l’écran de certification')
assert.match(certificationUi, /ClipboardItem/, 'La copie du visuel d’une nouvelle carte vers le presse-papiers est absente')
assert.match(certificationUi, /imageMarker:`IMG-\$\{index\+1\}`/, 'Chaque nouvelle carte doit avoir un repère de visuel unique pour l’issue GitHub')
assert.match(applyScript, /const knownCard = \(key\) =>/, 'La validation des alias/nouvelles cartes doit vérifier le catalogue réel, pas seulement les fichiers JSON pris isolément')
assert.match(applyScript, /a déjà sa propre entrée dans le catalogue/, 'Un alias ne doit jamais pouvoir écraser silencieusement une carte déjà connue')
assert.match(applyScript, /existe déjà dans le catalogue/, 'Une « nouvelle carte » ne doit jamais pouvoir écraser silencieusement une carte déjà connue')
assert.match(applyScript, /execSync\('node scripts\/generate-assistant-reference\.mjs'/, 'Le référentiel doit être régénéré avant que verify:assistant-dice ne teste ses propres contrats')
assert.match(diceProfilesSource, /import \{ CUSTOM_CARDS \} from '\.\/customCards';/, 'DICE_PROFILES doit fusionner les cartes ajoutées depuis l’assistant')
assert.match(cardImagesSource, /import \{ CUSTOM_CARDS \} from '\.\/customCards';/, 'CARD_IMAGES doit fusionner les cartes ajoutées depuis l’assistant')
assert.match(cardNamesFrSource, /import \{ CUSTOM_CARDS \} from '\.\/customCards';/, 'CARD_NAMES_FR doit fusionner les cartes ajoutées depuis l’assistant')
// Signalement du 14/09/2026 (ajout de la faction Mercenaire) : unitModels.ts
// lisait diceCertifications.json en dur, sans fusionner CUSTOM_CARDS comme
// les quatre autres tables ci-dessus — la fonction de profil de moral
// signalait donc à tort un courage « non certifié » pour toute carte ajoutée
// uniquement via l'écran « Nouvelle carte ».
assert.match(unitModelsSource, /import \{ CUSTOM_CARDS \} from '\.\.\/data\/customCards';/, 'getUnitMoraleProfile() doit fusionner les cartes ajoutées depuis l’assistant (sinon courage « non certifié » à tort)')

// Une nouvelle carte peut aussi recevoir ses mots-clés dans le même
// formulaire (plutôt que de dépendre du tag manuel "+ mot-clé" séparé sur
// l'onglet Armées), fusionnés dans SEED_CARD_TAGS comme le reste.
const cardTagsSource = fs.readFileSync(new URL('../src/data/cardTags.ts', import.meta.url), 'utf8')
assert.match(cardTagsSource, /import \{ CUSTOM_CARDS \} from '\.\/customCards';/, 'SEED_CARD_TAGS doit fusionner les mots-clés des cartes ajoutées depuis l’assistant')
assert.match(certificationUi, /data-add-keyword/, 'Le sélecteur de mots-clés est absent du formulaire « Nouvelle carte »')
assert.match(certificationUi, /data-remove-keyword/, 'Le retrait d’un mot-clé déjà ajouté est absent du formulaire « Nouvelle carte »')
assert.match(applyScript, /const knownKeywordIds = new Set/, 'Les mots-clés d’une nouvelle carte doivent être validés contre le glossaire réel')
assert.match(applyScript, /Mot-clé inconnu pour/, 'Un identifiant de mot-clé inventé ne doit jamais pouvoir être enregistré')

// Tout nouvel import doit produire un diagnostic explicite.
assert.match(setupUi, /ImportCompatibilityReport/, 'Le rapport de compatibilité doit être visible après import')
assert.match(importAudit, /Visuel non raccordé/, 'Un visuel inconnu doit être signalé')
assert.match(importAudit, /Courage non certifié/, 'Une unité au courage non certifié doit être signalée')
assert.match(importAudit, /Dés d.attaque non certifiés/, 'Une arme non certifiée doit être signalée')
assert.match(importAudit, /weapon\.verifiedAgainstCard/, 'L’audit doit respecter la certification portée par le profil de dés')
assert.match(importAudit, /profile\.defenseVerifiedAgainstCard/, 'L’audit doit respecter la certification de défense portée par le profil')
assert.match(importAudit, /scope: 'catalog'/, 'Les raccordements de catalogue doivent être séparés des certifications moteur')
assert.match(importAudit, /resolution: unknownCard \? 'unknown-card' : 'visual-unmapped'/, 'Le rapport doit distinguer une carte inconnue d’un visuel seulement non raccordé')
assert.match(importAudit, /certificationCards: uniqueCards/, 'Le compteur doit compter les cartes à certifier, pas additionner leurs anomalies')
assert.match(trackerUi, /getUnitMoraleProfile/, 'Le suivi de partie doit utiliser le calcul de moral central')

// "Nouvelle partie" doit repartir de zéro sans exiger de réimporter les
// listes : round/activations/VP/objectifs (tracker) ET blessures/suppression
// (état des unités, partagé avec l'Assistant) remis à zéro ensemble.
assert.match(trackerUi, /window\.confirm\(/, 'Nouvelle partie doit demander confirmation (action destructive)')
assert.match(trackerUi, /UNIT_STATE_KEY, '\{\}'/, 'Nouvelle partie doit effacer les blessures/suppressions de toutes les unités')
assert.match(trackerUi, /'swl\.assistant\.attack-history\.v1', '\[\]'/, 'Nouvelle partie doit effacer le journal de résolution')
assert.match(trackerUi, /tracker\.replace\(DEFAULT_STATE\)/, 'Nouvelle partie doit remettre le round, les VP et les objectifs à zéro')
assert.match(trackerState, /export const DEFAULT_STATE/, 'DEFAULT_STATE doit être exporté pour que Nouvelle partie puisse le réutiliser')

// Balayage rejoué au changement de joueur (pas à chaque recherche/filtre),
// et colonnes de catégories équilibrées par nombre de figurines plutôt que
// par une correspondance catégorie->colonne figée (signalement utilisateur,
// 13/09/2026).
const headerSync = fs.readFileSync(new URL('../public/assistant/header-sync.css', import.meta.url), 'utf8')
assert.match(headerSync, /\.page-wipe\s*\{\s*animation:\s*pageWipe/, 'La classe .page-wipe doit rejouer la même animation pageWipe que le chargement de page')
// Balayage étendu (17/09/2026, demande utilisateur) aux pop-up (dialog) :
// rappel de règle Moral/Suppression, zoom de carte, avertissement mixte.
assert.match(headerSync, /\.dialog-wipe\s*\{\s*animation:\s*pageWipe/, 'Les pop-up (dialog) doivent rejouer la même animation pageWipe que le reste de l’appli')
assert.match(headerSync, /\.page-wipe,\s*\.step-wipe,\s*\.dialog-wipe\s*\{\s*animation:\s*none/, 'prefers-reduced-motion doit aussi désactiver les trois balayages (plein écran, colonne centrale et pop-up)')
assert.match(app, /dialog\.className=`rule-popup dialog-wipe/, 'Le pop-up de rappel de règle doit utiliser le balayage commun')
assert.match(app, /dialog\.className='card-dialog dialog-wipe'/, 'Le zoom de carte doit utiliser le balayage commun')
assert.match(app, /dialog\.className='warning-dialog dialog-wipe'/, 'L’avertissement de réserve mixte doit utiliser le balayage commun')
assert.match(app, /stageWipe=true;pick\('attacker'\)/, 'Changer de joueur doit déclencher le balayage')
assert.doesNotMatch(app, /unitSearch|data-rank|rank-filters|class="unit-tools"/, 'La recherche et les filtres de rang doivent avoir disparu de l’écran de sélection (demande utilisateur du 19/09/2026)')
assert.match(app, /function pickerGrid\(units\)\{const n=units\.length,cols=n<=3\?3:n<=8\?4:n<=10\?5:n<=12\?6:7;/, 'La grille de sélection doit adapter le nombre de colonnes au nombre d’unités pour tenir sans défilement')
assert.match(fs.readFileSync(new URL('../public/assistant/unit-picker.css', import.meta.url), 'utf8'), /max-height: calc\(\(100dvh - 330px\) \/ var\(--rows, 1\) - 58px\)/, 'La hauteur des cartes de sélection doit être plafonnée pour que toutes les rangées tiennent à l’écran')
assert.match(app, /data-faction="\$\{factionThemeForArmy\(e\.army\)\}" class="unit-tile[\s\S]*?<span class="tile-visual"><img [^>]*>\$\{rankMark\(e\)\}<\/span>/, 'L’icône de rang doit être dans la carte de la tuile, et la tuile doit porter l’armée de l’unité')
assert.match(fs.readFileSync(new URL('../public/assistant/unit-picker.css', import.meta.url), 'utf8'), /\[data-faction="rebel"\][^{]*\{ background: rgba\(255, 140, 26, \.86\); \}[\s\S]*\[data-faction="imperial"\][^{]*\{ background: rgba\(255, 69, 80, \.86\); \}/, 'L’icône de rang doit être orange pour les Rebelles et rouge pour l’Empire, avec une légère transparence')
assert.match(fs.readFileSync(new URL('../public/assistant/unit-picker.css', import.meta.url), 'utf8'), /drop-shadow\(1px 0 0 rgba\(0, 0, 0, \.75\)\)[\s\S]*drop-shadow\(0 3px 6px/, 'L’icône de rang doit avoir un contour sombre et une ombre portée')
// Résolution d'attaque (19/09/2026, demande utilisateur) : effectif des escouades, ordre de lecture, plus de « Suivi des dés ».
assert.match(app, /function squadAddedModels\(entry\)\{return \(entry\?\.unit\?\.upgrades\|\|\[\]\)\.reduce\(\(sum,card\)=>\{const profile=profileFor\(card\.name\),added=Number\(profile\?\.addedModels\)\|\|0;return added>0&&!\(profile\?\.weapons\|\|\[\]\)\.length\?sum\+added:sum\}/, 'Les améliorations d’escouade certifiées (addedModels, sans arme propre) doivent s’ajouter à l’effectif de la carte Unité')
assert.match(app, /if\(cardKey\(row\.card\)===cardKey\(attacker\.unit\.name\)\)return unitWeaponModels\(attacker\)/, 'Les armes de la carte Unité doivent être proposées avec l’effectif de base + les figurines d’escouade')
assert.doesNotMatch(app, /\$\{diceJourney\(\)\}/, 'Le « Suivi des dés » ne doit plus être affiché en bas des écrans de résolution')
assert.match(app, /\[warning,range,fire,arsenal,distract,weapons,pool,poolNote\]\.filter\(Boolean\)\.forEach\(element=>\{anchor\.after\(element\);anchor=element\}\)/, 'Étape 1 : la portée est en haut, puis le Contrôle de Tir, puis les armes, et les dés à lancer tout en bas, sous les armes')
assert.match(app, /matches\('\.situation-check,\.automation-card,\.token-budget,\.combat-warning,\.cumbersome-checks,\.token-card'\)/, 'Les encadrés de vérification doivent être remontés en haut de chaque étape de résolution')
assert.match(app, /resolveScreen=function\(\)\{if\(attackStep===0\)prefillWeaponCounts\(\);resolveTacticalBase\(\)/, 'Les effectifs suggérés doivent être appliqués dès l’ouverture de l’écran des armes')
assert.match(index, /resolver-polish\.css\?v=31/, 'La feuille d’harmonisation des écrans de résolution doit être chargée')
assert.ok(index.indexOf('resolver-polish.css') > index.indexOf('unit-screen.css'), 'resolver-polish.css doit être chargée en dernier')
assert.match(app, /function fireControlSources\(\)\{return fireControlCandidates\(\)\.map\(entry=>\(\{entry,card:/, 'Le Contrôle de Tir doit identifier l’unité alliée qui le fournit')
assert.match(app, /Fourni par \$\{who\} · carte \$\{cardName\}/, 'Le message du Contrôle de Tir doit nommer l’unité et la carte source')
assert.match(app, /Journal de résolution : replié par défaut/, 'Le journal de résolution doit être replié par défaut')
assert.match(app, /idle-step[\s\S]*Passer à la défense/, 'Une étape Modifications sans effet doit proposer un bandeau « Passer »')
assert.match(app, /poolBar=center\.querySelector\('\.dice-pool,\.defense-dice-pool'\)\;[^]*poolBar\.append\(entryProgress\)/, 'La progression de saisie doit être sur la même ligne que la barre « Dés à lancer »')
assert.match(app, /if\(attackStep!==0\)\{const bar=center\.querySelector\(':scope > \.dice-pool,:scope > \.defense-dice-pool'\)[\s\S]*?checks\.forEach\(element=>\{anchor\.after\(element\)/, 'Les dés à lancer doivent être tout en haut (sous les étapes), avant les encadrés de vérification, sauf à l’étape 1 où la portée les précède')
assert.match(app, /sticky\.className='sticky-summary';stepper\.after\(sticky\);if\(bar\)sticky\.append\(bar\);[\s\S]*?if\(live\)sticky\.append\(live\)/, 'La barre des dés et le résultat en cours doivent rester visibles (barre collante)')
assert.match(app, /tray\.className='dice-tray';faces\[0\]\.before\(tray\);tray\.append\(\.\.\.faces\)/, 'Les faces de dés doivent former un plateau de tuiles')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /\.live-result-strip > b:not\(:first-child\)[\s\S]*font-size: 1\.9rem/, 'Le résultat en cours doit être affiché en grand')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /\.entry-progress\.pending,\s*\.resolve-center \.entry-progress\.over \{ color: #ff665c; \}[\s\S]*\.entry-progress\.complete > span \{ background: #5cdda3/, 'La progression de saisie doit être rouge tant que le compte n’est pas exact, verte une fois complète')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /\.live-defense-strip \{\s*border-color: rgba\(255, 102, 92, \.55\)/, 'Le résultat en cours doit avoir un reflet rouge (l’orange est réservé aux actions à faire)')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /\.defense-dice-pool \{\s*border-color: rgba\(255, 140, 26, \.55\);[\s\S]*\.manual-focus \{\s*border-color: rgba\(255, 140, 26, \.55\)/, 'Les dés à lancer et les zones de saisie doivent avoir la teinte + halo orange (orange = à faire)')
assert.match(app, /function refreshGate\(\)\{[\s\S]*const issue=stepIssue\(\);[\s\S]*gate\.className='gate-status '\+\(issue\?'blocked':'ready'\)[\s\S]*next\.classList\.toggle\('locked',!!issue\)/, 'La pastille BLOQUÉ/PRÊT et le bouton verrouillé doivent dériver de stepIssue()')
assert.match(app, /\['input','click'\]\.forEach\(type=>document\.addEventListener\(type,event=>\{if\(event\.target\.closest\?\.\('\.resolve-center, \.actions'\)\)requestAnimationFrame\(refreshResolveUi\)\},true\)\)/, 'L’état bloqué/prêt doit se mettre à jour après chaque saisie')
assert.match(app, /attackState\.uiStep!==attackStep\)\{attackState\.uiStep=attackStep;requestAnimationFrame\(focusFirstTodo\)[\s\S]*function focusFirstTodo\(\)[\s\S]*scrollIntoView/, 'À l’arrivée sur une étape, l’écran doit défiler jusqu’au premier élément à faire')
assert.match(app, /className='info-fold'[\s\S]*rappel\$\{infoBlocks\.length>1\?'s':''\} de règle/, 'Les informations seules doivent être repliées en une ligne « n rappels de règle »')
assert.match(app, /budget-summary[\s\S]*budgetOpen!==attackStep/, 'Les pions en réserve doivent se réduire à une ligne quand la saisie des dés est complète')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /\.manual-focus::before \{ content: "À SAISIR"[\s\S]*content: "INFO"[\s\S]*content: "BLOQUANT"/, 'Les trois étiquettes À SAISIR / INFO / BLOQUANT doivent remplacer « ACTION REQUISE »')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /@keyframes todo-pulse[\s\S]*data-entry-state="pending"\] \.dice-tray > \.quick-field\.is-empty/, 'Les champs de dés encore vides doivent pulser en orange tant que la saisie est incomplète')
assert.match(app, /if\(isDefense\)\{defender=e;if\(defeated\(e\)\)\{stage=4;overview\(defender,'defense'\)\}else initAttack\(\)\}/, 'Choisir l’unité attaquée doit ouvrir directement la résolution (sauf unité vaincue, dont la fiche reste accessible)')
assert.match(app, /else\{attackState=null;attackStep=0;stage=3;stageWipe=true;pick\('defender'\)\}\};\$\('#nextAttack'\)\.onclick/, '« Revoir la cible » doit revenir à la liste des cibles')
// Pions Viser (19/09/2026, demande utilisateur) : relances à la table, plus de saisie ; information seule.
assert.doesNotMatch(app, /numberField\('availableAims'/, 'Les pions Viser en réserve ne doivent plus être saisissables (les champs « dépensés » et « relancés » sont retirés à l’exécution, voir dropNumberField)')
assert.match(app, /tokenCard\('aim','availableAims',available,'PIONS VISER DISPONIBLES'/, 'Un bloc d’information doit indiquer s’il reste des pions Viser')
assert.match(app, /html=dropNumberField\(dropNumberField\(html,'aims'\),'rerolled'\)/, 'Les champs Viser dépensés / dés relancés doivent être retirés de l’écran de jet')
assert.match(app, /id=\\"aimSpentFlag\\"|id="aimSpentFlag"[\s\S]*Débordement, Duelliste ou Matamore/, 'Une seule case « Viser dépensé » doit rester pour Débordement / Duelliste / Matamore')
assert.match(app, /aimFlag\.onchange=\(\)=>\{attackState\.aims=aimFlag\.checked\?1:0;attackState\.rerolled=aimFlag\.checked\?1:0/, 'La case « Viser dépensé » doit alimenter aims et rerolled (Matamore, Duelliste, Débordement)')
assert.doesNotMatch(app, /ne possède que \$\{attackState\.availableAims/, 'Plus de blocage sur le nombre de pions Viser (non saisissable)')
assert.match(app, /result-entry:has\(#rollHit\),\.resolve-center \.result-entry:has\(#defBlock\)/, 'Une saisie de dés incorrecte doit faire vibrer la zone de saisie des dés, pas celle des pions en réserve')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /\.token-card \{[\s\S]*rgba\(111, 189, 219, \.55\)/, 'Le bloc « pions Viser disponibles » doit être mis en avant (teinte + halo bleu)')
// Cartes de pions : design de référence de l'appli (information + − / + dans le même encadré).
assert.match(app, /function counterHtml\(id,value,max=20\)[\s\S]*data-adjust[\s\S]*function tokenCard\(kind,id,value,title,text,icon,max=20\)[\s\S]*class=\\?"token-card/, 'Un composant tokenCard unique doit porter les encadrés de pions (information + compteur − / +)')
assert.match(app, /tokenCard\('surge','availableAttackSurges'[\s\S]*class=\"token-card dodge[\s\S]*tokenCard\('surge','availableDefenseSurges'/, 'Adrénaline d’attaque, Esquive et Adrénaline de défense doivent reprendre le même encadré')
assert.match(app, /const tokenIcons=\{aim:[\s\S]*stat-icons\/aim\.svg[\s\S]*asurge\.png/, 'Les cartes de pions doivent afficher l’icône du pion')
assert.doesNotMatch(app, /PIONS ADRÉNALINE EN RÉSERVE|l’appli ne les suit plus entre les attaques/, 'La phrase « Indiquez ce que l’unité a actuellement… » doit avoir disparu')
assert.match(app, /function syncTokenStock\(key\)[\s\S]*persistUnitStates\(\)/, 'Le stock de pions corrigé doit être écrit dans le suivi de l’unité')
// Fil du processus + relief des dés (19/09/2026, demande utilisateur).
assert.match(app, /function applyProcessGate\(\)[\s\S]*gateBlocker\(center,stepIssue\(\)\|\|''\)[\s\S]*classList\.add\('is-dimmed'\)/, 'Tant qu’un élément obligatoire manque (stepIssue), ce qui suit doit être grisé')
assert.match(app, /classList\.add\('just-unlocked'\)[\s\S]*scrollIntoView/, 'Une fois l’élément obligatoire saisi, la suite doit se dégriser et l’écran défiler jusqu’à elle')
assert.match(app, /refreshFieldStates\(\);refreshGate\(\);applyProcessGate\(\)/, 'Le grisage doit être recalculé après chaque saisie')
assert.match(app, /medal\.className='face-medal'/, 'Les faces de dés doivent être dans des médaillons (relief)')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /\.resolve-center > \.is-dimmed \{ opacity: \.34; filter: grayscale\(\.85\); pointer-events: none/, 'Les parties grisées doivent être translucides, désaturées et non interactives')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /\.face-medal \{[\s\S]*radial-gradient[\s\S]*inset 0 -3px 6px/, 'Les médaillons de dés doivent avoir du relief')
// Contrôle de Tir en action à saisir, ordre portée -> Contrôle de Tir -> armes -> dés ; conversion dépliable.
assert.match(app, /panel\.className=\`fire-control-card conditional-card manual-focus/, 'Le Contrôle de Tir doit être une action à saisir (orange), pas un rappel bleu')
assert.match(app, /attackState\.range!=null&&fireControlCandidates\(\)\.length&&attackState\.fireControlUsed===null\)return 'Contrôle de Tir disponible/, 'Une fois la portée saisie, le Contrôle de Tir doit passer avant le choix des armes')
assert.match(app, /if\(attackState\.range==null\)return center\.querySelector\('\.range-picker'\);if\(fire&&attackState\.fireControlUsed===null\)return fire/, 'Le Contrôle de Tir doit être grisé tant que la portée n’est pas saisie')
assert.match(app, /attackState\.gateKey=\['range-picker','fire-control-card','weapon-picker'/, 'La section suivante doit être retrouvée par la classe du point bloquant (dégrisage + défilement)')
assert.match(app, /rollConversionPanel=function\(p,converted,critical\)\{[\s\S]*<details class=[\s\S]*\?'open':''[\s\S]*quickMode&&!open/, 'L’encadré Conversion Adrénaline doit être replié en mode rapide, déplié sinon')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /\.fire-control-card\.answered \{ border-color: rgba\(92, 221, 163/, 'Le Contrôle de Tir répondu doit passer au vert')
// Stock de pions corrigé sous la dépense : plus de blocage, la dépense est ramenée au stock.
assert.doesNotMatch(app, /Pas assez de pions Adrénaline/, 'Corriger le stock d’Adrénaline ne doit plus bloquer la résolution')
assert.match(app, /function clampSpentTokens\(key\)[\s\S]*attackSurgesSpent=Math\.min[\s\S]*defenseSurgesSpent=Math\.min[\s\S]*dodgeCrits=Math\.min/, 'La dépense de pions doit être ramenée au stock quand celui-ci baisse')
assert.match(app, /clampSpentTokens\(key\);syncTokenStock\(key\);updateLiveCounters\(\)/, 'Le plafonnement de la dépense doit s’appliquer à chaque correction du stock')
// Déroulé forcé des étapes Couvert et Modifications (19/09/2026, demande utilisateur).
assert.match(app, /Choisissez le couvert observé \(Aucun, Léger ou Lourd\)/, 'Le couvert doit être choisi explicitement (attaque à distance)')
assert.match(app, /Saisissez le jet de couvert \(\$\{dice\} dé\(s\)\) puis validez-le/, 'Le jet de couvert doit être saisi puis validé quand des dés sont à lancer')
assert.match(app, /attackState\.modsIdle===false&&!attackState\.modsConfirmed\)return 'Validez les modifications/, 'Une étape Modifications non vide doit être validée explicitement')
assert.match(app, /dodgeEntry\.className='result-entry dodge-entry'/, 'Les esquives doivent former leur propre section, sous leur carte de pions')
assert.match(app, /\[coverOptions,coverCard,coverEntry,dodgeCard,dodgeEntry\]\.filter\(Boolean\)/, 'Ordre de l’étape Couvert : couvert → jet de couvert → esquives')
assert.match(app, /document\.addEventListener\('click',event=>\{if\(attackState&&event\.target\.closest\?\.\('\[data-cover\]'\)\)\{attackState\.coverChosen=true;attackState\.coverRolled=false\}\},true\)/, 'Changer de couvert doit invalider le jet de couvert déjà validé')
assert.match(app, /if\(mandatory&&\/Confirmez\|vérifi\/i\.test\(issue\)\)return mandatory/, 'Une vérification obligatoire (ex. Encombrant) doit être le point bloquant du grisage')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /\.phase-confirm \{[\s\S]*\.phase-confirm\.done \{[\s\S]*#5cdda3/, 'Le bouton de validation d’une section doit exister (orange à valider, vert validé)')
// Refonte des écrans Couvert, Modifications, Défense, Suppression (19/09/2026, demande utilisateur).
assert.match(app, /<li>\$\{sources\.length>1\?'L’une de ces unités':who\} est à <b>portée 1<\/b>[\s\S]*a <b>également<\/b> la <b>cible en ligne de vue<\/b>/, 'Contrôle de Tir : le porteur a également la cible en ligne de vue (texte de la carte)')
assert.match(app, /bar\.className='dice-pool cover-pool';bar\.innerHTML=\`<span>DÉS DE COUVERT À LANCER/, 'Le couvert doit avoir sa barre « dés à lancer » comme les autres étapes')
assert.match(app, /counterHtml\('dodges',attackState\.dodges,stock\)[\s\S]*PIONS ESQUIVE DISPONIBLES : \$\{stock\}/, 'L’Esquive doit tenir sur une ligne : stock en lecture seule, dépense à droite')
assert.match(app, /modifierScreen=function\(\)\{[\s\S]*if\(impactX>0&&armor\.hasArmor\)return html;[\s\S]*NE S’APPLIQUE PAS ICI/, 'Impact / Armure ne se saisissent que si l’attaquant a Impact et le défenseur Armure ; sinon information')
assert.match(app, /class="was">avant : \$\{counts\[0\]\|\|0\} touche\(s\)/, 'Couvert et Modifications : le résultat « avant » est une mention dans la barre « après »')
assert.match(app, /function attackRecapHtml\(\)[\s\S]*BLESSURES À APPLIQUER[\s\S]*SUPPRESSION À ATTRIBUER[\s\S]*PIONS DÉPENSÉS PENDANT L’ATTAQUE/, 'L’écran Suppression doit résumer blessures, suppression et pions dépensés')
assert.match(app, /suppressionScreen=function\(\)\{return suppressionScreenRecapBase\(\)\.replace/, 'Le résumé doit remplacer l’ancien bloc de blessures')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /\.recap-card \{[\s\S]*rgba\(255, 102, 92[\s\S]*\.recap-spent \{[\s\S]*rgba\(111, 189, 219/, 'Le résumé doit utiliser le rouge pour les résultats à appliquer et le bleu pour les pions dépensés')
// Audit du 19/09/2026 : moins de défilement, vierges automatiques, une seule pulsation, fiche d'unité alignée. Le comportement est vérifié par test-assistant-parcours.mjs (jsdom) ; ici, seulement les garde-fous de structure.
assert.match(app, /function applyAutoBlank\(\)/, 'Les vierges doivent se calculer automatiquement')
assert.match(app, /classList\.add\('blocker-current'\)/, 'Un seul point bloquant courant doit être repéré (pulsation unique)')
assert.match(app, /pulseEl\(blocker,'denied-shake'\)/, 'Toucher une section grisée doit ramener au point bloquant')
assert.match(app, /className='morale-fold'/, 'Suppression et moral doit être replié par défaut')
assert.match(app, /function tokenMini\(entry,field,label,value,icon\)/, 'La fiche d’unité doit permettre d’éditer les pions Viser, Esquive et Adrénaline')
assert.match(app, /function unitModelsChip\(entry\)/, 'La fiche d’unité doit afficher l’effectif certifié')
assert.match(app, /className='side-upgrades'/, 'Les améliorations des colonnes latérales doivent être repliées')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /body\.resolving \.app-header-sticky \{ position: static; \}/, 'Le bandeau du haut ne doit pas rester collé pendant la résolution')
assert.match(fs.readFileSync(new URL('../public/assistant/resolver-polish.css', import.meta.url), 'utf8'), /\.resolve-center > \.is-dimmed \{ pointer-events: auto/, 'Une section grisée doit capter le toucher')
assert.match(fs.readFileSync(new URL('../public/assistant/unit-screen.css', import.meta.url), 'utf8'), /\.overview \.token-mini \{/, 'Les cartes de pions de la fiche d’unité doivent être stylées')
assert.match(JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts.build, /test:assistant-parcours/, 'Le test de parcours doit faire partie du build')
assert.match(index, /unit-picker\.css\?v=3/, 'La feuille de la grille de sélection doit être chargée')
assert.match(app, /if\(b\.dataset\.army===selectedArmy\)return;/, 'Recliquer le joueur déjà sélectionné ne doit rien re-balayer')
assert.doesNotMatch(app, /layout=\{commandant:0,agent:0,lourd:0,soutien:0,troupiers:1/, 'La répartition figée catégorie->colonne (jamais équilibrée) doit avoir disparu')
assert.match(app, /weight:\(Number\(group\.querySelector\('header small'\)\?\.textContent\)\|\|0\)\+1/, 'Les colonnes de catégories doivent se répartir par nombre de figurines, pas par une règle figée')
assert.match(app, /const target=totals\.indexOf\(Math\.min\(\.\.\.totals\)\)/, 'La répartition des catégories doit être équilibrée (colonne la moins remplie)')

// Affinages demandés le 13/09/2026 : le balayage ne doit couvrir QUE la
// zone des unités (pas les cartes Joueur 1/2), l'ordre des catégories doit
// respecter Commandant -> Agent -> Troupiers -> Forces spéciales -> Soutien
// -> Lourd (pas juste par poids), et une transition rapide et légère doit
// aussi jouer lors des changements d'écran (choix d'unité, changement de
// cible) et entre chaque étape de résolution d'attaque (colonne centrale
// uniquement, les deux côtés attaquant/défenseur ne bougeant pas).
assert.match(app, /sort\(\(a,b\)=>\(order\[a\.label\]\?\?9\)-\(order\[b\.label\]\?\?9\)\)/, 'Les catégories doivent être placées dans l’ordre Commandant->Agent->Troupiers->... avant équilibrage, pas par poids décroissant')
assert.match(app, /'forces speciales':3,soutien:4,lourd:5,'rang a verifier':6/, 'Les clés de la table d’ordre doivent être sans accent (norm() retire toujours les accents, sinon Forces spéciales/Rang à vérifier ne correspondent jamais)')
assert.doesNotMatch(app, /'forces spéciales':\d/, 'La table d’ordre ne doit plus utiliser de clé accentée (jamais reconnue par norm())')
assert.match(app, /root\.innerHTML=`<section class="intro">/, 'Le wrapper balayé de pick() doit exclure .intro (le sélecteur Joueur 1\/2)')
assert.match(app, /<\/section><div class="\$\{wipe\?`page-wipe`:``\}">\$\{available\.length\?/, 'Le balayage doit envelopper uniquement la zone des unités, pas le sélecteur de joueur')
assert.match(app, /function overview\(entry,role\)\{const wipe=stageWipe;stageWipe=false;/, 'Changer d’unité/de cible doit rejouer le balayage à l’entrée de l’aperçu d’unité')
assert.match(app, /function resolveScreen\(\)\{stage=4\+attackStep;const wipeStage=stageWipe;stageWipe=false;const wipeCenter=centerWipe;centerWipe=false;/, 'La résolution d’attaque doit distinguer le balayage plein écran (première entrée) du balayage de la seule colonne centrale (changement d’étape)')
assert.match(app, /<section class="resolve-center \$\{wipeCenter\?`step-wipe`:``\}">/, 'Seule .resolve-center (colonne centrale) doit être balayée entre deux étapes, pas les colonnes attaquant\/défenseur')
assert.match(headerSync, /\.step-wipe\s*\{\s*animation:\s*pageWipe 240ms/, 'Le balayage entre étapes doit être plus rapide que le balayage plein écran (pas d’interface lourde)')

// Historique des parties précédentes (archivage avant reset/restauration) :
// consultable entre joueurs, et filet de sécurité en cas de remise à zéro
// ou de restauration faite par erreur.
const gameArchive = fs.readFileSync(new URL('../src/lib/useGameArchive.ts', import.meta.url), 'utf8')
assert.match(gameArchive, /const MAX_ENTRIES = 20/, 'L’historique des parties doit rester borné (pas de croissance illimitée du stockage local)')
assert.match(trackerUi, /if \(hasProgress\) archiveCurrentGame\(\)/, 'Nouvelle partie doit archiver la partie en cours avant de la remettre à zéro')
assert.match(trackerUi, /const restoreGame = /, 'La restauration d’une partie archivée est absente')
assert.match(trackerUi, /if \(hasProgress\) archiveCurrentGame\(\);\s*\n\s*applySnapshot/, 'Restaurer une partie doit lui-même archiver l’état en cours avant de l’écraser (double filet de sécurité)')

// État, journal d'attaque et suivi de partie voyagent dans un même format
// versionné afin que deux appareils affichent le même état de partie.
assert.match(gistSync, /schemaVersion\?: number/, 'Le format de synchronisation doit être versionné')
assert.match(gistSync, /assistantAttackHistory\?: unknown\[\]/, 'Le journal des attaques doit faire partie de la synchronisation')
assert.match(gistSync, /gameActionHistory\?: unknown\[\]/, 'Le journal manuel du suivi doit être synchronisé entre appareils')
assert.match(gistSync, /mergeGameActionHistory/, 'Une action annulée doit rester annulée après une fusion multiappareil')
assert.match(gistSync, /assistantUnitStateUpdatedAt\?: Record<string, number>/, 'Chaque unité doit posséder une horloge de conflit indépendante')
assert.match(gistSync, /mergeAssistantUnitStates/, 'Les états venant de plusieurs appareils doivent être fusionnés')
assert.match(gistSync, /mergeAttackHistory/, 'Les journaux venant de plusieurs appareils doivent être fusionnés sans doublon')
assert.match(gistSync, /mergeGameTracker/, 'Le suivi de partie doit arbitrer les modifications concurrentes par horodatage')
assert.match(syncUi, /modification\(s\) concurrente\(s\) réconciliée\(s\)/, 'Une fusion concurrente doit être annoncée au joueur')
assert.match(app, /assistantUnitStateUpdatedAt:merged\.clock/, 'L’Assistant doit envoyer les horodatages par unité')
assert.doesNotMatch(app, /payload=\{[^\n]*gameTracker/, 'L’Assistant ne doit pas écraser un suivi de partie qu’il n’a pas modifié')
assert.match(syncUi, /swl\.assistant\.attack-history\.v1/, 'Le journal distant doit être restauré localement')
assert.match(app, /assistantAttackHistory:mergedHistory/, 'L’assistant doit envoyer son journal de résolution fusionné')
assert.match(trackerUi, /Journal de résolution/, 'Le suivi de partie doit afficher le journal synchronisé des attaques')
assert.match(jsonImporter, /const unitKey = nextUnitSlug\(u\.name\)/, 'La clé stable d’une unité JSON doit être indépendante de ses améliorations')
assert.match(jsonImporter, /const upgradeSeen = new Map/, 'Les doublons d’améliorations JSON doivent être identifiés localement dans leur unité')
const textImporter = fs.readFileSync(new URL('../src/lib/parseList.ts', import.meta.url), 'utf8')
assert.match(textImporter, /key: nextUnitSlug\(card\.name\)/, 'La clé stable d’une unité texte doit être indépendante de ses améliorations')
assert.equal(cardKeyAliases['prepared supplies'], 'prepared materiel', 'Prepared Supplies doit retrouver Matériel Préparé')
assert.equal(cardKeyAliases['cm 0 93 trooper'], 'cm o 93 trooper', 'CM-0\/93 doit retrouver la carte CM-O\/93')
assert.equal(cardKeyAliases['chewbacca walking carpet'], 'chewbacca', 'Chewbacca Walking Carpet doit retrouver la carte Chewbacca')
assert.equal(cardKeyAliases['into the fray'], 'in the fray', 'Into the Fray doit retrouver Dans la Mêlée')
assert.equal(cardKeyAliases['at rt laser cannon'], 'tl tt laser cannon', 'AT-RT Laser Cannon doit retrouver le Canon Laser de TL-TT')
assert.equal(cardKeyAliases['up close and personal'], 'point blank', 'Up Close and Personal doit retrouver À Bout Portant')
assert.deepEqual(reference.aliases, cardKeyAliases, 'Le référentiel généré doit refléter exactement src/data/cardKeyAliases.json')
for (const card of ['force reflexes', 'improvised orders', 'prepared materiel', 'fragmentation grenades', 'situational awareness', 'impact grenades', 'hq uplink', 'duck and cover']) {
  assert.ok(reference.images[card], `${card}: visuel générique non raccordé`)
  assert.ok(reference.names[card], `${card}: nom français générique non raccordé`)
}
assert.match(app, /unit\.key\|\|index/, 'L’assistant doit conserver une identité stable lors d’une réimportation')
assert.match(app, /legacyId/, 'Les blessures enregistrées avec les anciens identifiants doivent être migrées')
assert.equal(reference.weapons['fragmentation grenades'].weapons[0].dice[0].color, 'rouge', 'La grenade à fragmentation doit lancer un dé rouge')
assert.equal(reference.weapons['fragmentation grenades'].weapons[0].range, '1', 'La grenade à fragmentation doit être limitée à portée 1')
assert.equal(reference.weapons['fragmentation grenades'].weapons[0].attackSurge, 'crit', 'La grenade à fragmentation doit donner Adrénaline vers Critique à la réserve')
assert.equal(reference.weapons['impact grenades'].weapons[0].dice[0].color, 'noir', 'La grenade à impact doit lancer un dé noir')
assert.match(app, /function effectiveAttackProfile\(\)/, 'Les conversions accordées par les armes doivent être calculées au niveau de la réserve')
assert.match(app, /weaponKeywordValue\(row,'anti-materiel-x'\)/, 'Anti-matériel doit améliorer automatiquement les dés contre un véhicule')
assert.match(app, /engine\.duelistModifiers/, 'Duelliste doit être intégré au calcul automatique de Perforant et de son immunité')
assert.match(app, /weakPointExposed/, 'Point faible doit imposer une réponse contextuelle explicite')
assert.match(app, /engine\.weakPointImpact/, 'Point faible doit alimenter automatiquement la valeur d’Impact')
assert.match(app, /weaponKeywordValue\(row,'anti-personnel-x'\)/, 'Anti-personnel doit améliorer automatiquement les dés contre des soldats')
assert.match(certificationUiSource, /location\.hash==='\#certification'/, 'Le rapport d’import doit pouvoir ouvrir directement la certification')
assert.match(app, /function suggestedWeaponCount\(row\)/, 'Les figurines par arme doivent être préremplies depuis l’effectif certifié de la carte')
assert.match(app, /attackState\.manualCounts/, 'Une correction manuelle du nombre de figurines doit rester prioritaire')
assert.match(app, /PRÉREMPLI · MODIFIABLE/, 'Le caractère modifiable du préremplissage doit être explicite')
assert.match(app, /function decorateTacticalResolution\(\)/, 'La zone d’action et la télémétrie doivent être hiérarchisées')
assert.match(app, /DÉ.*BLANC.*À LANCER/, 'L’étape de couvert doit annoncer clairement les dés blancs à lancer')
assert.match(app, /criticalPerSuppression/, 'Héros Malgré Lui doit calculer Critique X depuis la suppression actuelle')
assert.match(app, /function fireControlCandidates\(\)/, 'Contrôle de Tir doit rechercher une autre unité alliée équipée')
assert.match(app, /upgradePoolDice\(result,2\)/, 'Contrôle de Tir doit améliorer exactement deux dés de la réserve')
assert.match(app, /defenseColorOverride/, 'Armure de Combat doit remplacer la couleur du dé de défense')
assert.match(app, /defenseSurgeOverride/, 'Armure de Combat doit pouvoir retirer la conversion défensive')
assert.match(app, /rebel agent defender of democracy.*boba fett infamous bounty hunter.*boba fett daimyo of mos espa/, 'L’Agent rebelle et les deux Boba Fett doivent être classés au rang Agent')
assert.match(app, /upgrade\.name='Cassian Andor Operative'/, 'Une liste déjà enregistrée doit migrer Cassian vers sa carte d’amélioration')
for (const card of ['reluctant hero', 'fire control', 'combat armor rebel', 'repeating blaster']) {
  assert.ok(reference.images[card], `${card}: visuel anglais absent du référentiel Assistant`)
  assert.ok(reference.names[card], `${card}: nom français absent du référentiel Assistant`)
}
assert.match(app, /swl\.assistant\.player-side\.v1/, 'Le camp choisi doit être mémorisé localement sur chaque tablette')
assert.match(app, /CAMP UTILISÉ SUR CETTE TABLETTE/, 'Le sélecteur doit expliquer que le camp est propre à la tablette')
assert.match(app, /setInterval\(\(\)=>\{if\(document\.visibilityState!==['"]visible['"]\|\|secondaryScreenOpen\(\)\)return;syncUnitStates\(['"]pull['"]\)/, 'L’Assistant doit relever régulièrement l’état de l’autre tablette hors écran secondaire')
for (const effect of ['force-reflexes', 'burst-of-speed', 'offensive-push', 'linked-targeting-array', 'emergency-transponder', 'in-the-fray', 'force-choke']) {
  assert.ok(app.includes(effect), `${effect}: automatisme d’activation absent`)
}
assert.match(app, /hasCard\(attacker,'point blank'\).*attackType\(\)==='ranged'.*attackState\.range\)==='2'/, 'À Bout Portant doit ajouter son esquive uniquement après une attaque à distance 2')
assert.match(app, /burstOfSpeedRound.*immobilize/, 'Pointe de Vitesse doit appliquer son Immobilisation à la phase finale')
// L'appli ne suit plus les PV (choix produit) : Strangulation incline la
// carte de commandement, la blessure s'applique manuellement à la table.
assert.match(app, /data-force-choke.*exhaustCard\(entry,'force-choke'\)/, 'Strangulation doit incliner la carte de commandement')
assert.match(app, /function activationBriefing\(entry\)/, 'La fiche unité doit synthétiser les décisions de son activation')
assert.match(app, /CE QUE CETTE UNITÉ PEUT FAIRE MAINTENANT/, 'Le briefing doit être identifiable en un coup d’œil')
// Refonte iPad (16/09/2026, décision produit utilisateur) : la carte unité et
// ses améliorations deviennent une bande de vignettes cliquables (card-strip)
// sans texte de mot-clé sous les cartes ; ce texte rejoint le Briefing
// tactique dans une section « Effets de carte » alimentée par noteFor().
assert.match(app, /function cardStripEntry\(name,label,isUnit\)/, 'Les cartes doivent se rendre comme des vignettes compactes réutilisables')
assert.match(app, /function upgradeGallery\(entry\)\{[\s\S]*?class="card-strip"/, 'La bande de cartes doit regrouper la carte Unité et ses améliorations')
assert.match(app, /querySelectorAll\('\.upgrade-visual,\.unit-card-zoom,\.unit-card-visual,\.upgrade-card-visual'\)/, 'Le visualiseur de carte doit aussi s’ouvrir depuis la nouvelle bande de vignettes')
assert.match(app, /noteSources=\[\{label:'Carte unité',name:entry\.unit\.name\}/, 'Le Briefing tactique doit rassembler les notes de la carte Unité et des améliorations')
assert.match(app, /EFFETS DE CARTE/, 'Le Briefing tactique doit exposer une section dédiée aux effets textuels des cartes')
// Disposition iPad (17/09/2026, demande utilisateur : mise en place de la
// disposition proposée dans la maquette « refonte iPad »). Le grand visuel
// de la carte Unité, dupliqué avec la vignette de .card-strip, est retiré
// du bandeau .hero ; à partir d'environ la largeur d'un iPad Air en
// paysage, l'écran de l'attaquant passe en deux colonnes avec le Briefing
// tactique dominant à droite (voir ipad-compact.css).
assert.doesNotMatch(app, /class="hero">\$\{unitIdentityPanel\(entry\)\}\$\{unitVisual/, 'Le bandeau d’identité ne doit plus dupliquer le grand visuel de la carte Unité')
assert.match(app, /class="hero">\$\{unitIdentityPanel\(entry\)\}<\/div>/, 'Le bandeau d’identité ne doit contenir que le panneau d’identité')
// Système de mise en page unifié de l'écran d'unité (19/09/2026, demande
// utilisateur : « tout n'est pas aligné, uniforme ») : deux vraies colonnes
// (.ov-left/.ov-right, posées par app.js) qui partent du même bord haut,
// un seul habillage de panneau, un bandeau du haut sur une seule ligne.
const unitScreen = fs.readFileSync(new URL('../public/assistant/unit-screen.css', import.meta.url), 'utf8')
assert.match(index, /unit-screen\.css\?v=23/, 'La feuille de mise en page de l’écran d’unité doit être chargée')
assert.ok(index.indexOf('unit-screen.css') > index.indexOf('ipad-compact.css'), 'unit-screen.css doit être chargée après ipad-compact.css pour gagner les égalités de spécificité')
assert.match(app, /overviewColumnsBase=overview;\s*overview=function\(entry,role\)\{overviewColumnsBase\(entry,role\);.*ov-left.*ov-right/, 'app.js doit regrouper les blocs de l’écran d’unité en deux colonnes réelles')
assert.match(app, /matches\('\.activation-automation,\.post-rally-panel,\.activation-briefing,\.unit-state-editor'\)\?right:left/, 'Automatismes, options de démoralisation, Briefing et état de l’unité doivent aller dans la colonne de droite')
assert.match(unitScreen, /@media \(min-width: 1000px\) \{\s*\.overview \{ grid-template-columns: minmax\(320px, 36%\) minmax\(0, 1fr\); \}/, 'À partir de 1000px, l’écran d’unité doit passer en deux colonnes')
assert.match(unitScreen, /\.overview > \.ov-col \{ display: contents; \}/, 'Sous 1000px, les colonnes doivent disparaître (display:contents) pour rétablir l’ordre d’origine')
assert.match(unitScreen, /\.overview \.card-strip \.upgrade-row \{ display: contents; \}/, 'Les améliorations doivent être des cases d’une même grille (3 colonnes égales) dans la colonne étroite')
assert.match(unitScreen, /\.topbar \{ grid-template-columns: auto minmax\(0, 1fr\) auto !important;/, 'Le bandeau du haut doit tenir sur une seule ligne alignée')
assert.match(unitScreen, /\.overview\.defense > \.ov-col > \.card-strip \{ grid-column: 2;/, 'Côté défenseur, la bande de cartes doit occuper la grande colonne de droite')
assert.match(fs.readFileSync(new URL('../public/assistant/style.css', import.meta.url), 'utf8'), /\.brief-empty\{grid-column:1\/-1!important;grid-template-columns:1fr!important/, 'Le texte d’une section de briefing sans mot-clé ne doit pas hériter de la grille 82px/1fr des lignes de mot-clé')
assert.match(app, /place-proton.*detonate-proton/, 'Les charges à protons doivent être suivies de la pose à la détonation')
assert.match(app, /place-sonic.*detonate-sonic/, 'Les charges soniques doivent être suivies de la pose à la détonation')
assert.match(app, /SABRE LANCÉ.*moitié.*arrondie au supérieur/, 'Sabre Lancé doit rappeler son calcul à partir de l’arme de corps-à-corps')
assert.match(app, /aim:0,dodge:0,surge:0,standby:0,exhaustedCards:\[\]/, 'La phase finale doit retirer les pions temporaires et redresser les cartes')
// Le Parcours guidé (Ordre/Effets/Actions/Fin, sélecteur d'actions) a été
// retiré le 16/09/2026 (choix produit : trop de clics pour trop peu de valeur) ;
// seul le bouton Résoudre une attaque subsiste sur l'écran d'unité.
assert.match(app, /case'place-proton'.*activationActions:\[\.\.\.actions,'arm-proton'\]/, 'Armer une charge à protons doit consommer une action')
assert.match(app, /case'place-sonic'.*activationActions:\[\.\.\.actions,'arm-sonic'\]/, 'Armer une charge sonique doit consommer une action')
// La grille d'actions elle-même (et son message de verrouillage) a été
// retirée avec le Parcours guidé (16/09/2026).
assert.match(index, /app\.js\?v=147/, 'Le verrou de navigation de la certification doit invalider le cache JavaScript')
// Pop-up de fin d'attaque (17/09/2026, demande utilisateur) : les effets
// purement informatifs de fin d'attaque (Agile, Maîtrise de l'Ataru,
// Matamore, Maîtrise du Djem So, Déflexion, Suppression/Ionique à poser)
// sont regroupés dans un seul pop-up filtré sur les mots-clés réels de
// l'attaquant et du défenseur, au lieu d'encarts dispersés — sauf ceux
// liés à une case à cocher (Immobilisation/Poison/Câble/Dispersion), qui
// restent en ligne pour rester corrigibles.
assert.match(app, /function attackConclusionPopupContent\(\)/, 'Le pop-up de fin d’attaque doit exister')
assert.match(app, /FIN D’ATTAQUE — ACTIONS À LA TABLE/, 'Le pop-up de fin d’attaque doit avoir un titre explicite')
assert.match(app, /attackState!==lastConclusionAttackState.*attackConclusionPopupContent\(\)/, 'Le pop-up de fin d’attaque ne doit se déclencher qu’une fois par attaque, pas à chaque re-rendu')
assert.doesNotMatch(app, /function combatFollowupPanel\(\)/, 'L’encart Ataru/Matamore/Djem So doit être retiré au profit du pop-up de fin d’attaque')
assert.doesNotMatch(app, /AGILE : GAGNEZ 1 PION ESQUIVE/, 'Le rappel Agile doit être retiré de l’écran Défense au profit du pop-up de fin d’attaque')
assert.doesNotMatch(app, /class="deflexion-note"/, 'La note Déflexion doit être retirée de l’écran Suppression au profit du pop-up de fin d’attaque')
assert.match(app, /function movementFreeAttack\(entry\)/, 'Charge, Aguerri et Implacable doivent proposer leur attaque gratuite après le déplacement')
assert.match(app, /attackState\?\.freeAttackRange==='melee'/, 'Charge doit limiter la réserve aux armes de corps-à-corps')
assert.match(app, /attackState\?\.freeAttackRange==='ranged'/, 'Aguerri doit limiter la réserve aux armes à distance')
assert.match(app, /if\(attackState\?\.freeAttack\)return/, 'Une attaque gratuite ne doit pas terminer prématurément l’activation')
assert.match(app, /state\.freeAttackRound===currentRound\(\).*actions\.includes\('attack'\)/, 'Une unité ne doit jamais effectuer deux actions Attaquer pendant la même activation')
assert.match(app, /function reportFingerprint\(value\)/, 'Le rapport de préparation doit identifier précisément chaque version de liste')
assert.match(app, /automaticRules.*humanChecks.*addedModels/s, 'Le rapport doit distinguer automatismes, contrôles humains et figurines ajoutées')
assert.match(app, /certificationV2Pending/, 'Le rapport doit distinguer une donnée jouable d’une carte entièrement certifiée')
assert.match(app, /strictReady/, 'Le rapport doit exposer un verdict de certification stricte')
assert.match(app, /function activationActionLimit\(entry\).*suppressed\?1:2/, 'Une unité démoralisée doit être limitée à une action')
// Sans suivi de l'origine de l'activation (Parcours guidé retiré le
// 16/09/2026), Système de Visée Jumelé redevient un bouton manuel comme
// les autres cartes à effet unique par activation.
assert.match(app, /case'linked-targeting-array':exhaustCard\(entry,'linked-targeting-array'/, 'Système de Visée Jumelé doit rester déclenchable manuellement, une fois par activation')
// L'action Récupérer (retire suppression + redresse les améliorations)
// dépendait du sélecteur d'actions retiré avec le Parcours guidé
// (16/09/2026) ; il n'y a plus d'équivalent applicatif.
assert.match(app, /mandatoryMoveDone/, 'Speeder doit imposer le suivi du déplacement obligatoire')
// Le doublement du gain de Viser/Esquive par une Posture dépendait des
// actions Viser/Esquiver du Parcours guidé, retiré le 16/09/2026 — les
// pions Viser/Esquive sont désormais déclarés manuellement à l'attaque.
assert.match(app, /availableAims.*availableAttackSurges.*availableDodges.*availableDefenseSurges/, 'La résolution doit charger les stocks de pions des deux unités')
// La dépense de pions Viser n'est plus saisie ni plafonnée (19/09/2026) : les relances se font à la table (voir « Pions Viser » plus haut).
assert.match(app, /Le défenseur ne possède que.*pion\(s\) Esquive/, 'La dépense de pions Esquive doit être plafonnée')
assert.match(app, /attackerState\.aim.*attackerState\.surge/, 'Les pions offensifs dépensés doivent être retirés du suivi')
assert.match(app, /defenderState\.dodge.*defenderState\.surge/, 'Les pions défensifs dépensés doivent être retirés du suivi')
// Le gain d'Esquive d'Agile après un déplacement dépendait de l'action Se
// déplacer du Parcours guidé, retiré le 16/09/2026.
assert.doesNotMatch(app, /agileReturned/, 'Agile ne doit plus utiliser son ancien déclenchement après une défense')
assert.deepEqual(customCards['rebel agent defender of democracy'].autonomousTokens, [{ token: 'dodge', count: 1 }], 'L’Agent rebelle doit gagner Autonome : Esquive 1')
assert.deepEqual(customCards['boba fett infamous bounty hunter'].autonomousTokens, [{ token: 'aim', count: 1 }, { token: 'dodge', count: 1 }], 'Boba Fett doit choisir Viser 1 ou Esquive 1 avec Autonome')
assert.equal(customCards['boba fett infamous bounty hunter'].unitStats.courage, 3, 'Boba Fett doit avoir Courage 3')
assert.ok(customCards['boba fett infamous bounty hunter'].keywords.some(tag=>tag.keywordId==='arsenal-x'&&tag.value===2), 'Boba Fett doit avoir Arsenal 2')
assert.match(index, /style\.css\?v=88/, 'La certification complète doit invalider le cache CSS')
assert.match(index, /reference-data\.js\?v=\d+/, 'Les valeurs certifiées doivent invalider le cache du référentiel')
assert.match(app, /const standbyRange=entry=>hasResolvedKeyword\(entry,'sentinelle'\)\?3:2/, 'Sentinelle doit étendre le déclenchement d’Attente à portée 3')
assert.match(app, /standby:Math\.max\(0,\(state\.standby\|\|0\)-1\)/, 'Le pion Attente doit être consommé par la réaction')
assert.match(app, /attackState\.standbyReaction=true/, 'Une attaque issue d’Attente doit être identifiée comme gratuite')
assert.match(app, /!attackState&&stage===2&&attacker.*overview\(attacker,'attack'\)/, 'La fiche de l’unité doit refléter les réactions de l’autre tablette sans navigation')
assert.match(app, /activatedUnitIds:\(tracker\.activatedUnitIds\|\|\[\]\)\.filter/, 'Une attaque d’Attente ne doit pas activer l’unité')
assert.match(app, /state\.suppression>previousSuppression&&state\.standby/, 'Gagner de la suppression doit retirer le pion Attente')
assert.match(app, /field==='suppression'.*next\.standby=0/, 'Une suppression ajoutée manuellement doit également retirer Attente')
assert.match(app, /aim:0,dodge:0,surge:0,standby:0/, 'La phase finale doit retirer Attente')
// L'action Attendre (et son garde-fou véhicule) dépendait du sélecteur
// d'actions retiré avec le Parcours guidé (16/09/2026).
assert.match(index, /id="gameReadiness"/, 'Un bouton doit lancer le test des listes réellement importées')
assert.match(app, /function buildLiveGameReport\(\)/, 'Le navigateur doit construire son propre rapport de partie')
assert.match(app, /source:'Listes réellement chargées dans le navigateur'/, 'Le rapport doit identifier sa source réelle')
assert.match(app, /simulatedAttacks/, 'Le rapport doit compter la matrice arme/cible réellement testée')
assert.match(app, /downloadLiveGameReport/, 'Le rapport complet doit pouvoir être téléchargé')
assert.doesNotMatch(app.slice(app.indexOf('function buildLiveGameReport'),app.indexOf('applyFactionTheme',app.indexOf('function buildLiveGameReport'))), /syncTokenKey|syncGistKey|localStorage\.getItem/, 'Le rapport ne doit lire aucun secret de synchronisation')
assert.match(app, /stage===1&&!secondaryScreenOpen\(\)/, 'La synchronisation initiale ne doit jamais fermer un écran secondaire')
assert.match(app, /const secondaryScreenOpen=.*certification-open.*live-game-report/, 'La synchronisation doit reconnaître tous les écrans secondaires')
assert.match(app, /document\.visibilityState!=='visible'\|\|secondaryScreenOpen\(\)/, 'La synchronisation périodique ne doit jamais fermer la certification')
assert.match(app, /if\(!secondaryScreenOpen\(\)\)location\.reload\(\)/, 'Une mise à jour de liste ne doit pas recharger la page pendant la certification')
assert.match(index, /upgrades\.css\?v=2/, 'Le déplacement du bouton de fermeture doit invalider son cache CSS')
assert.match(index, /certification\.js\?v=96/, 'La certification V2 doit invalider le cache de son interface')
assert.match(certificationUiSource, /function cfRow\(card,label,appText,hqText,control/, 'La certification doit proposer une fiche par carte avec « Appli » et « Legion HQ » devant chaque champ')
assert.match(certificationUiSource, /CERTIFIER TOUTE LA CARTE EN UNE FOIS/, 'La carte complète doit pouvoir être validée en une seule action')
assert.match(certificationUiSource, /\['identity','visual','stats','weapons','conversions','keywords'\]/, 'Les six familles de données doivent être confirmées')
assert.match(certificationUiSource, /version:5/, 'Le lot GitHub doit utiliser le schéma de certification exhaustive')
assert.match(applyScript, /fullCardCertification/, 'Le script central doit conserver la preuve de certification complète')
assert.match(applyScript, /required=\['identity','visual','stats','weapons','conversions','keywords'\]/, 'Le serveur doit refuser une certification complète partielle')
assert.match(applyScript, /createHash\('sha256'\)/, 'La certification doit enregistrer l’empreinte cryptographique du visuel contrôlé')
assert.match(fs.readFileSync(new URL('../scripts/generate-assistant-reference.mjs', import.meta.url), 'utf8'), /staleFullCardCertification/, 'Un visuel modifié doit invalider automatiquement sa certification complète')
assert.match(upgrades, /\.dialog-close \{ position: absolute; left: 8px; top: 8px; right: auto;/, 'Le bouton de fermeture des visuels doit être compact et placé en haut à gauche')

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

// Incident Précis / Stormtroopers (19/09/2026) : le référentiel livré est la référence ;
// le stockage local ne fait qu'ajouter ou retirer explicitement, et aucun patch silencieux ne retouche les données.
const corrections = fs.readFileSync(new URL('../public/assistant/reference-corrections.js', import.meta.url), 'utf8')
assert.match(corrections, /const corrections = \[\]/, 'Le registre de corrections doit rester vide tant qu’aucune correction sourcée n’est justifiée')
assert.doesNotMatch(corrections, /localStorage/, 'reference-corrections.js ne doit jamais toucher au stockage local')
assert.match(index, /reference-corrections\.js\?v=3/, 'Le registre de corrections doit être versionné dans index.html')
assert.match(app, /seedTags=window\.SWL_REFERENCE\?\.tags\|\|\{\},localTags=read\('swl\.card-tags\.v1',\{\}\),removedTags=read\('swl\.card-tags-removed\.v1',\{\}\)/, 'app.js doit fusionner étiquettes livrées + locales + retraits explicites')
