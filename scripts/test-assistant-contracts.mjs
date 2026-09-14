import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = fs.readFileSync(new URL('../public/assistant/app.js', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('../public/assistant/engine.css', import.meta.url), 'utf8')
const ipadCss = fs.readFileSync(new URL('../public/assistant/ipad-compact.css', import.meta.url), 'utf8')
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
const cardNames = fs.readFileSync(new URL('../src/lib/cardNames.ts', import.meta.url), 'utf8')
const cardKeyAliases = JSON.parse(fs.readFileSync(new URL('../src/data/cardKeyAliases.json', import.meta.url), 'utf8'))
const applyScript = fs.readFileSync(new URL('../scripts/apply-dice-certification.mjs', import.meta.url), 'utf8')
const diceProfilesSource = fs.readFileSync(new URL('../src/data/diceProfiles.ts', import.meta.url), 'utf8')
const cardImagesSource = fs.readFileSync(new URL('../src/data/cardImages.ts', import.meta.url), 'utf8')
const cardNamesFrSource = fs.readFileSync(new URL('../src/data/cardNamesFr.ts', import.meta.url), 'utf8')
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
assert.match(importAudit, /certificationCards: uniqueCards/, 'Le compteur doit compter les cartes à certifier, pas additionner leurs anomalies')
assert.match(unitModels, /addedModelWounds \?\? base\.woundsPerModel/, 'Les figurines hétérogènes doivent conserver leurs propres PV')
assert.match(trackerUi, /buildCertifiedUnitRoster/, 'Le suivi de partie doit utiliser le calcul d’effectif central')

// "Nouvelle partie" doit repartir de zéro sans exiger de réimporter les
// listes : round/activations/VP/objectifs (tracker) ET blessures/suppression
// (état des unités, partagé avec l'Assistant) remis à zéro ensemble.
assert.match(trackerUi, /window\.confirm\(/, 'Nouvelle partie doit demander confirmation (action destructive)')
assert.match(trackerUi, /UNIT_STATE_KEY, '\{\}'/, 'Nouvelle partie doit effacer les blessures/suppressions de toutes les unités')
assert.match(trackerUi, /'swl\.assistant\.attack-history\.v1', '\[\]'/, 'Nouvelle partie doit effacer le journal de résolution')
assert.match(trackerUi, /update\(DEFAULT_STATE\)/, 'Nouvelle partie doit remettre le round, les VP et les objectifs à zéro')
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
assert.match(gistSync, /assistantUnitStateUpdatedAt\?: Record<string, number>/, 'Chaque unité doit posséder une horloge de conflit indépendante')
assert.match(gistSync, /mergeAssistantUnitStates/, 'Les états venant de plusieurs appareils doivent être fusionnés')
assert.match(gistSync, /mergeAttackHistory/, 'Les journaux venant de plusieurs appareils doivent être fusionnés sans doublon')
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
assert.match(certificationUiSource, /location\.hash==='\#certification'/, 'Le rapport d’import doit pouvoir ouvrir directement la certification')
assert.match(app, /function suggestedWeaponCount\(row\)/, 'Les figurines par arme doivent être préremplies depuis l’effectif survivant')
assert.match(app, /attackState\.manualCounts/, 'Une correction manuelle du nombre de figurines doit rester prioritaire')
assert.match(app, /PRÉREMPLI · MODIFIABLE/, 'Le caractère modifiable du préremplissage doit être explicite')
assert.match(app, /function decorateTacticalResolution\(\)/, 'La zone d’action et la télémétrie doivent être hiérarchisées')
assert.match(app, /DÉ.*BLANC.*À LANCER/, 'L’étape de couvert doit annoncer clairement les dés blancs à lancer')

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
