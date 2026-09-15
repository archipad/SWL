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
const unitModels = fs.readFileSync(new URL('../src/lib/unitModels.ts', import.meta.url), 'utf8')
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
assert.match(app, /attackState\.range==='melee'.*hasCard\(attacker,'tenacity'\).*stateFor\(attacker\)\.wounds>0/, 'Ténacité doit exiger une attaque au corps-à-corps et une unité blessée ou ayant perdu une figurine')
assert.match(app, /rouge:result\.rouge\+tenacity/, 'Ténacité doit ajouter exactement un dé rouge à la réserve')
assert.match(app, /souhaitez-vous appliquer Ténacité/, 'Ténacité étant facultative, le joueur doit confirmer son application')
assert.match(cardNames, /while \(CARD_KEY_ALIASES\[current\]/, 'Les alias successifs doivent converger vers la carte canonique finale')
assert.match(applyScript, /Cycle d'alias détecté/, 'Un lot de certification ne doit jamais pouvoir créer une boucle d’alias')

// Contrats de saisie : chaque résultat doit correspondre exactement à la réserve.
assert.match(app, /total===expected/, 'Le compteur de saisie exacte est absent')
assert.match(app, /rolled!==expected/, 'Le verrou du jet de défense est absent')
assert.match(app, /Object\.values\(attackState\.roll\).*rolled!==expected/, 'Le verrou du jet d’attaque est absent')

// Contrats de suivi de partie : les blessures restent affectées aux bonnes figurines.
assert.match(app, /modelWounds/, 'La répartition persistante des blessures par figurine est absente')
assert.match(app, /eligibleWoundTarget/, 'Le contrôle de la figurine éligible est absent')
assert.match(app, /progress\.assigned!==progress\.required/, 'La fin d’attaque doit être bloquée tant que les blessures ne sont pas réparties')
assert.match(app, /required=Math\.min\(rolled,capacity\)/, 'Les blessures excédentaires ne doivent pas bloquer une unité déjà vaincue')
assert.match(app, /attackHistory\[0\]\.wounds=applied/, 'Le journal doit enregistrer les blessures réellement attribuées, pas les dégâts excédentaires')
assert.match(app, /if\(summary\)remaining=summary\.remaining/, 'L’Assistant doit afficher le même effectif détaillé que le suivi de partie')
assert.match(app, /outcome\?\.panicked/, 'Une unité encore paniquée après ralliement doit être détectée')
assert.match(app, /Unité paniquée : aucune action/, 'La panique doit interdire les actions')
assert.match(app, /state\.suppression-courage/, 'La fin d’activation paniquée doit retirer la valeur de Courage en suppression')
assert.match(trackerState, /activatedUnitIds: string\[\]/, 'Le suivi persistant des activations est absent')
assert.match(trackerUi, /toggleActivation/, 'Le bouton Jouée / À jouer est absent')
assert.match(trackerUi, /round === state\.round \? activatedUnitIds : \[\]/, 'Un nouveau round doit remettre les activations à zéro')
assert.match(trackerUi, /!unitSnapshot\(unit, player, index\)\.defeated/, 'Une unité vaincue ne doit pas compter parmi les activations restantes')
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
// les quatre autres tables ci-dessus — buildCertifiedUnitRoster() signalait
// donc à tort « Effectif impossible à calculer avec certitude » pour toute
// carte ajoutée uniquement via l'écran « Nouvelle carte ».
assert.match(unitModelsSource, /import \{ CUSTOM_CARDS \} from '\.\.\/data\/customCards';/, 'buildCertifiedUnitRoster() doit fusionner les cartes ajoutées depuis l’assistant (sinon effectif « non certifié » à tort)')

// Une nouvelle carte peut aussi recevoir ses mots-clés dans le même
// formulaire (plutôt que de dépendre du tag manuel "+ mot-clé" séparé sur
// l'onglet Armées), fusionnés dans SEED_CARD_TAGS comme le reste.
const cardTagsSource = fs.readFileSync(new URL('../src/data/cardTags.ts', import.meta.url), 'utf8')
assert.match(cardTagsSource, /import \{ CUSTOM_CARDS \} from '\.\/customCards';/, 'SEED_CARD_TAGS doit fusionner les mots-clés des cartes ajoutées depuis l’assistant')
assert.match(certificationUi, /data-add-keyword/, 'Le sélecteur de mots-clés est absent du formulaire « Nouvelle carte »')
assert.match(certificationUi, /data-remove-keyword/, 'Le retrait d’un mot-clé déjà ajouté est absent du formulaire « Nouvelle carte »')
assert.match(applyScript, /const knownKeywordIds = new Set/, 'Les mots-clés d’une nouvelle carte doivent être validés contre le glossaire réel')
assert.match(applyScript, /Mot-clé inconnu pour/, 'Un identifiant de mot-clé inventé ne doit jamais pouvoir être enregistré')

// Tout nouvel import doit produire un diagnostic explicite et utiliser le
// même calcul d'effectif que le tableau de suivi.
assert.match(setupUi, /ImportCompatibilityReport/, 'Le rapport de compatibilité doit être visible après import')
assert.match(importAudit, /Visuel non raccordé/, 'Un visuel inconnu doit être signalé')
assert.match(importAudit, /PV, courage ou effectif non certifiés/, 'Une unité non certifiée doit être signalée')
assert.match(importAudit, /Dés d.attaque non certifiés/, 'Une arme non certifiée doit être signalée')
assert.match(importAudit, /weapon\.verifiedAgainstCard/, 'L’audit doit respecter la certification portée par le profil de dés')
assert.match(importAudit, /profile\.defenseVerifiedAgainstCard/, 'L’audit doit respecter la certification de défense portée par le profil')
assert.match(importAudit, /scope: 'catalog'/, 'Les raccordements de catalogue doivent être séparés des certifications moteur')
assert.match(importAudit, /resolution: unknownCard \? 'unknown-card' : 'visual-unmapped'/, 'Le rapport doit distinguer une carte inconnue d’un visuel seulement non raccordé')
assert.match(importAudit, /certificationCards: uniqueCards/, 'Le compteur doit compter les cartes à certifier, pas additionner leurs anomalies')
assert.match(unitModels, /addedModelWounds \?\? base\.woundsPerModel/, 'Les figurines hétérogènes doivent conserver leurs propres PV')
assert.match(trackerUi, /buildCertifiedUnitRoster/, 'Le suivi de partie doit utiliser le calcul d’effectif central')

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
assert.match(headerSync, /\.page-wipe,\s*\.step-wipe\s*\{\s*animation:\s*none/, 'prefers-reduced-motion doit aussi désactiver les deux balayages (plein écran et colonne centrale)')
assert.match(app, /stageWipe=true;pick\('attacker'\)/, 'Changer de joueur doit déclencher le balayage')
assert.ok(app.includes("$('#unitSearch').oninput=e=>{unitQuery=e.target.value;pick(role);requestAnimationFrame(()=>{$('#unitSearch')?.focus();$('#unitSearch')?.setSelectionRange(unitQuery.length,unitQuery.length)})};"), 'Taper dans la recherche ne doit pas déclencher le balayage (gestionnaire de recherche modifié de façon inattendue)')
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
assert.match(app, /<\/section><div class="\$\{wipe\?`page-wipe`:``\}"><section class="unit-tools">/, 'Le balayage doit envelopper uniquement la zone des unités, pas le sélecteur de joueur')
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
assert.match(app, /function suggestedWeaponCount\(row\)/, 'Les figurines par arme doivent être préremplies depuis l’effectif survivant')
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
assert.match(app, /setInterval\(\(\)=>\{if\(document\.visibilityState!==['"]visible['"]\)return;syncUnitStates\(['"]pull['"]\)/, 'L’Assistant doit relever régulièrement l’état de l’autre tablette')
for (const effect of ['force-reflexes', 'burst-of-speed', 'offensive-push', 'linked-targeting-array', 'emergency-transponder', 'in-the-fray', 'force-choke']) {
  assert.ok(app.includes(effect), `${effect}: automatisme d’activation absent`)
}
assert.match(app, /hasCard\(attacker,'point blank'\).*attackType\(\)==='ranged'.*attackState\.range\)==='2'/, 'À Bout Portant doit ajouter son esquive uniquement après une attaque à distance 2')
assert.match(app, /burstOfSpeedRound.*immobilize/, 'Pointe de Vitesse doit appliquer son Immobilisation à la phase finale')
assert.match(app, /persistWounds\(target,1\).*exhaustCard\(entry,'force-choke'\)/, 'Strangulation doit enregistrer une blessure et incliner la carte')
assert.match(app, /function activationBriefing\(entry\)/, 'La fiche unité doit synthétiser les décisions de son activation')
assert.match(app, /CE QUE CETTE UNITÉ PEUT FAIRE MAINTENANT/, 'Le briefing doit être identifiable en un coup d’œil')
assert.match(app, /place-proton.*detonate-proton/, 'Les charges à protons doivent être suivies de la pose à la détonation')
assert.match(app, /place-sonic.*detonate-sonic/, 'Les charges soniques doivent être suivies de la pose à la détonation')
assert.match(app, /SABRE LANCÉ.*moitié.*arrondie au supérieur/, 'Sabre Lancé doit rappeler son calcul à partir de l’arme de corps-à-corps')
assert.match(app, /aim:0,dodge:0,surge:0,standby:0,exhaustedCards:\[\]/, 'La phase finale doit retirer les pions temporaires et redresser les cartes')
assert.match(app, /function activationJourney\(entry\)/, 'La fiche unité doit proposer un parcours d’activation guidé')
assert.match(app, /Ordre face visible.*Pion tiré de la réserve/, 'Les deux origines légales de l’activation doivent être demandées')
assert.doesNotMatch(app, /data-activation-source="no-order"/, 'Une unité ne doit pas pouvoir être activée sans pion Ordre')
assert.match(app, /autonomous&&state\.activationSource==='pool'/, 'Autonome doit se déclencher lorsque le pion est tiré de la réserve')
assert.match(app, /activation-checklist/, 'Le parcours doit afficher les phases Ordre, effets, actions et fin')
assert.match(app, /action!=='move'.*action!=='card'.*actions\.includes\(action\)/, 'Une action normale autre que Se déplacer ne doit pas être répétée')
assert.match(app, /case'place-proton'.*activationActions:\[\.\.\.actions,'arm-proton'\]/, 'Armer une charge à protons doit consommer une action')
assert.match(app, /case'place-sonic'.*activationActions:\[\.\.\.actions,'arm-sonic'\]/, 'Armer une charge sonique doit consommer une action')
assert.match(app, /actions\.before\(automation\)/, 'Les effets de carte doivent être placés entre les obligations et les actions normales')
assert.match(app, /CHOISISSEZ D’ABORD LE PION/, 'Les actions doivent rester verrouillées tant que l’origine de l’activation est inconnue')
assert.match(index, /app\.js\?v=84/, 'La correction Agile et Autonome doit invalider le cache JavaScript')
assert.match(app, /function movementFreeAttack\(entry\)/, 'Charge, Aguerri et Implacable doivent proposer leur attaque gratuite après le déplacement')
assert.match(app, /attackState\?\.freeAttackRange==='melee'/, 'Charge doit limiter la réserve aux armes de corps-à-corps')
assert.match(app, /attackState\?\.freeAttackRange==='ranged'/, 'Aguerri doit limiter la réserve aux armes à distance')
assert.match(app, /if\(attackState\?\.freeAttack\)return/, 'Une attaque gratuite ne doit pas terminer prématurément l’activation')
assert.match(app, /state\.freeAttackRound===currentRound\(\).*actions\.includes\('attack'\)/, 'Une unité ne doit jamais effectuer deux actions Attaquer pendant la même activation')
assert.match(app, /function reportFingerprint\(value\)/, 'Le rapport de préparation doit identifier précisément chaque version de liste')
assert.match(app, /automaticRules.*humanChecks.*addedModels/s, 'Le rapport doit distinguer automatismes, contrôles humains et figurines ajoutées')
assert.match(app, /function activationActionLimit\(entry\).*suppressed\?1:2/, 'Une unité démoralisée doit être limitée à une action')
assert.match(app, /linkedTargetingAppliedRound/, 'Système de Visée Jumelé doit se déclencher avec un ordre face visible')
assert.match(app, /action==='recover'.*suppression=0.*exhaustedCards=\[\]/, 'Récupérer doit retirer la suppression et redresser les améliorations')
assert.match(app, /mandatoryMoveDone/, 'Speeder doit imposer le suivi du déplacement obligatoire')
assert.match(app, /defensive posture.*dodge.*2|dodge.*defensive posture.*2/, 'La posture défensive doit doubler le gain d’esquive')
assert.match(app, /offensive posture.*aim.*2|aim.*offensive posture.*2/, 'La posture offensive doit doubler le gain de visée')
assert.match(app, /availableAims.*availableAttackSurges.*availableDodges.*availableDefenseSurges/, 'La résolution doit charger les stocks de pions des deux unités')
assert.match(app, /Cette unité ne possède que.*pion\(s\) Viser/, 'La dépense de pions Viser doit être plafonnée')
assert.match(app, /Le défenseur ne possède que.*pion\(s\) Esquive/, 'La dépense de pions Esquive doit être plafonnée')
assert.match(app, /attackerState\.aim.*attackerState\.surge/, 'Les pions offensifs dépensés doivent être retirés du suivi')
assert.match(app, /defenderState\.dodge.*defenderState\.surge/, 'Les pions défensifs dépensés doivent être retirés du suivi')
assert.match(app, /action==='move'.*keywordValue\(entry,'agile'\).*patch\.dodge/, 'Agile doit gagner ses Esquives après un déplacement standard effectué comme action')
assert.doesNotMatch(app, /agileReturned/, 'Agile ne doit plus utiliser son ancien déclenchement après une défense')
assert.deepEqual(customCards['rebel agent defender of democracy'].autonomousTokens, [{ token: 'dodge', count: 1 }], 'L’Agent rebelle doit gagner Autonome : Esquive 1')
assert.deepEqual(customCards['boba fett infamous bounty hunter'].autonomousTokens, [{ token: 'aim', count: 1 }, { token: 'dodge', count: 1 }], 'Boba Fett doit choisir Viser 1 ou Esquive 1 avec Autonome')
assert.equal(customCards['boba fett infamous bounty hunter'].unitStats.courage, 3, 'Boba Fett doit avoir Courage 3')
assert.ok(customCards['boba fett infamous bounty hunter'].keywords.some(tag=>tag.keywordId==='arsenal-x'&&tag.value===2), 'Boba Fett doit avoir Arsenal 2')
assert.match(index, /style\.css\?v=81/, 'Le rapport des listes en ligne doit invalider le cache CSS')
assert.match(index, /reference-data\.js\?v=76/, 'Les valeurs certifiées de Boba et Autonome doivent invalider le cache du référentiel')
assert.match(app, /const standbyRange=entry=>hasResolvedKeyword\(entry,'sentinelle'\)\?3:2/, 'Sentinelle doit étendre le déclenchement d’Attente à portée 3')
assert.match(app, /standby:Math\.max\(0,\(state\.standby\|\|0\)-1\)/, 'Le pion Attente doit être consommé par la réaction')
assert.match(app, /attackState\.standbyReaction=true/, 'Une attaque issue d’Attente doit être identifiée comme gratuite')
assert.match(app, /!attackState&&stage===2&&attacker.*overview\(attacker,'attack'\)/, 'La fiche de l’unité doit refléter les réactions de l’autre tablette sans navigation')
assert.match(app, /activatedUnitIds:\(tracker\.activatedUnitIds\|\|\[\]\)\.filter/, 'Une attaque d’Attente ne doit pas activer l’unité')
assert.match(app, /state\.suppression>previousSuppression&&state\.standby/, 'Gagner de la suppression doit retirer le pion Attente')
assert.match(app, /field==='suppression'.*next\.standby=0/, 'Une suppression ajoutée manuellement doit également retirer Attente')
assert.match(app, /aim:0,dodge:0,surge:0,standby:0/, 'La phase finale doit retirer Attente')
assert.match(app, /const canStandby=entry=>!isVehicle\(entry\)\|\|hasResolvedKeyword\(entry,'sustentation'\)/, 'Les véhicules ne doivent pouvoir attendre qu’avec Sustentation')
assert.match(index, /id="gameReadiness"/, 'Un bouton doit lancer le test des listes réellement importées')
assert.match(app, /function buildLiveGameReport\(\)/, 'Le navigateur doit construire son propre rapport de partie')
assert.match(app, /source:'Listes réellement chargées dans le navigateur'/, 'Le rapport doit identifier sa source réelle')
assert.match(app, /simulatedAttacks/, 'Le rapport doit compter la matrice arme/cible réellement testée')
assert.match(app, /downloadLiveGameReport/, 'Le rapport complet doit pouvoir être téléchargé')
assert.doesNotMatch(app.slice(app.indexOf('function buildLiveGameReport'),app.indexOf('applyFactionTheme',app.indexOf('function buildLiveGameReport'))), /syncTokenKey|syncGistKey|localStorage\.getItem/, 'Le rapport ne doit lire aucun secret de synchronisation')
assert.match(app, /stage===1&&!root\.querySelector\('\.live-game-report'\)/, 'La synchronisation ne doit jamais fermer le rapport de test ouvert')
assert.match(index, /upgrades\.css\?v=2/, 'Le déplacement du bouton de fermeture doit invalider son cache CSS')
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
