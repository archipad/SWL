@AGENTS.md

# Consignes propres à Claude Code

Les consignes communes sont dans `AGENTS.md` (importé ci-dessus) ; ce fichier n'ajoute que ce qui
concerne les sessions Claude Code. En cas de contradiction, `AGENTS.md` prévaut.

## Échanges avec Antoine

- Toujours répondre en français.
- Ne jamais pousser sans le mot explicite « pousse ». Committer d'abord en local, présenter le
  résultat, attendre.
- Une session parallèle (Claude ou Codex) travaille sur la même branche. Avant chaque push :
  `git fetch`, puis s'il y a de nouveaux commits distants, rebaser proprement (jamais de
  `--force`), relancer les tests concernés, et relancer `npm run build` si le rebase a touché du code.

## Validation

- `npm run build` (= `npm run verify`, ~15 min) doit finir en `EXIT 0` avant de considérer un lot
  comme validé ; le lancer en arrière-plan et rediriger la sortie vers un fichier.
- Boucle rapide pendant le travail sur l'Assistant : `npm run verify:assistant-dice`
  (moteur + contrats + parcours jsdom + audit d'automatisation).
- Après un build, `git diff --stat` avant de committer : `docs/audit/*.md` et
  `public/assistant/reference-data.js` sont régénérés et ne diffèrent souvent que par les fins de
  ligne. Ne les écarter (`git checkout --`) que si `git diff --stat` ne montre aucune ligne
  modifiée ; un vrai changement (ex. après une certification) se committe. Supprimer les
  `build-log*.txt`.

## Pièges connus

- Chaque fichier de `public/assistant/` est chargé avec `?v=N` dans `index.html` : incrémenter le
  numéro à chaque modification. Certains numéros sont aussi vérifiés littéralement dans
  `scripts/test-assistant-contracts.mjs` (`certification.js`, `command-cards.js`,
  `unit-screen.css`…) : les mettre à jour en même temps.
- `public/assistant/app.js` mélange des fins de ligne LF et CRLF selon les blocs : pour un
  remplacement scripté, vérifier la fin de ligne réelle autour de la zone ciblée.
- Dans l'outil Bash de cette machine, les `\\` d'un heredoc peuvent être réduits à `\` (une regex
  `\d` devient `d`) : pour du code contenant des barres obliques inverses, utiliser Write/Edit,
  puis relire la ligne produite.
- `cardKey(displayName(key))` ne redonne pas toujours `key` dans l'Assistant : dans les tests,
  utiliser directement la clé canonique comme nom de carte.
- `scripts/lib/assistant-harness.mjs` (jsdom) : `openAssistant(stockage, { query })` accepte une
  query string (ex. `?selfaudit=1`) ; `app.window.eval(...)` donne accès aux variables globales
  d'`app.js` (`entries`, `attackState`, `overview`, `unitStates`…).
- La fiche d'unité est reconstruite toutes les 5 s par la synchro des états ; tout état d'interface
  à conserver (volet ouvert, sélection) doit survivre à `overview(...)` (voir `sheetFoldMemory`).
- Les cartes de Commandement (`src/data/commandCards.ts`) se régénèrent vers
  `public/assistant/command-cards.js` avec `node scripts/generate-assistant-command-cards.cjs` ;
  `scripts/tools/check-command-pips.py` recompte les PIP sur les visuels.
- Modifier `src/data/diceCertifications.json` rend la certification « obsolète » dans la bêta tant
  que l'index n'est pas refait : `node scripts/generate-assistant-reference.mjs`, puis
  `npm run index:auto-certification-historical`, puis le build.
- Un test qui lance beaucoup de processus en parallèle (`test-universal-certification`) peut
  échouer sans cause quand un serveur Vite de prévisualisation tourne (port 24678) : l'arrêter
  avant `npm run build`.

## Cartes françaises manquantes (fiches FR communautaires)

- Traduction faite par Claude **dans la conversation, par lots** (~25 cartes, page de revue
  EN/FR envoyée à Antoine) ; **jamais** de clé d'API ni de traduction automatique en workflow.
- Avant de traduire une carte, chercher un visuel FR existant : `public/cards/`,
  `public/commandcards/` et surtout `public/cards/auto-certification/fr/` (cartes découpées du PDF
  AMG français). Un visuel FR officiel prime toujours ; ne jamais écraser un visuel FR.
- Avant de présenter un lot, contrôler les dés, portées et mots-clés d'arme contre
  `diceCertifications.json` / `diceProfiles.ts` plutôt que de les redemander à Antoine.
- Générateur : `scripts/fr-cards/` (`render.py` superpose la traduction sur le visuel Legion HQ ;
  `integrate.mjs` intègre une fiche validée ; atelier dans la certification + workflow GitHub
  « Fiche FR communautaire » avec `/valider-fiche-fr`). Termes : index V2.6
  (`src/data/translationGlossary.json`) et noms des mots-clés de `src/data/keywords.ts`.
- Visuels Legion HQ : CDN `d2maxvwz12z6fm.cloudfront.net` (Tabletop Admiral refuse le hotlink) ;
  les visuels AMG anglais restent à usage personnel, jamais publiés.
- Commandements : `faction` vaut `rebelles`, `empire`, `generique` (livret de règles) ou
  `mercenaire` (carte d'un personnage mercenaire : reconnue à l'import, jamais proposée d'office
  dans une main de faction).
- Texte complet des améliorations pour l'encart imprimé : `src/data/upgradeTextsFr.json`
  (lu par `src/data/upgradeTexts.ts`) ; les mots-clés cités sont mis en gras et définis entre
  parenthèses par `annotateKeywords` (`src/lib/keywordText.ts`).

## Atelier de cartes FR : compléter le catalogue

- Périmètre retenu par Antoine (03/11/2026) : **Rebelles + Empire + Mercenaires** ; la République
  et les Séparatistes sont écartés. Inventaire et liste des manques (~130 cartes, dont 9 avec un
  visuel FR officiel) : `docs/ROADMAP.md`, section « Atelier de cartes FR ».
- PDF FR officiels sur le Bureau : `App Web SWL V2/Nouveau dossier/` (Empire, Rebelles, génériques,
  nouvelles cartes), `App Web SWL V2/aGENTS/` (Mercenaires) et `Errata Reference FR 17.06.26.pdf`
  (p. 9-12 : cartes mises à jour, dont Axe Woves ; p. 3-5 : noms FR officiels dans les tables de
  points). Les PDF Rebelles posés directement sur le Bureau sont identiques à ceux déjà exploités.
  « Cartes Legion FR · recto verso.pdf » n'est que l'impression des 478 cartes de l'atelier.
- Extraction : `scripts/tools/extract_pdf_cards.py`, puis OCR des bandeaux de titre avec
  `scripts/tools/windows-ocr.ps1 -Language fr-FR -ListFile ...`. Comparer les titres OCR aux **noms FR**
  de l'atelier : c'est plus fiable que la comparaison avec Legion HQ.
- Comparer au catalogue Legion HQ (base extraite du bundle `legionhq2.com`, voir
  `scripts/audit-legionhq.mjs`) produit beaucoup de faux manques, car les noms anglais diffèrent
  (« Strike and Fade » / « Hit and Run », « Door Gunners » / « Mounted Gunners »…). Passer par
  `scripts/data/legionhq-aliases.json`, puis par le nom FR, et vérifier chaque manque sur le visuel.
- Catalogue complété le 04/11/2026 (605 cartes). Doublons : comparer aussi le TEXTE des fiches à
  l'OCR des rectos FR existants (noms Legion HQ ≠ noms FR : Terror = « Effroi »/Terreur, Strike Team
  Leader = Chef de Groupe de Combat, Dug In = Retranchement, Overwatch = Vigilance…).
- Une carte ajoutée à l'atelier doit avoir : `customCards.json` (données moteur), `workshopKeywordReviews.json`
  (verso, empreinte du recto), `upgradeCardUse.json`, un portrait (`portrait-assets.js`, ?v=N) pour une unité,
  une collision dans `upgradeNameCollisions.json` si l'amélioration porte le nom d'une unité, et un bouton
  dans `app.js` (CARD_KEYWORD_ACTIONS) si elle s'incline ou se défausse ; mots-clés absents de la référence
  AMG à lister dans `KEYWORDS_OUTSIDE_CORE_RULES` (`test-card-workshop.mjs`).
- Gabarit de découpe imprimé en 3D pour le massicot d'Antoine : à traiter dans une conversation
  séparée, après les traductions.

## Impression (atelier de cartes)

- Format `cut` « Découpe plastifiée » (`src/lib/cardWorkshopPrint.ts`) : cartes de 68 × 98 mm
  jointives, 8 par A4, bloc centré (marges de 7 mm sur les côtés, 12,5 mm en haut et en bas).
  Les traits de coupe sont dans les marges, à 1,5 mm des cartes et à au moins 3 mm du bord de la
  feuille.
- Les traits de coupe sont dessinés en **bordures CSS**, pas en fonds : ils doivent apparaître dans
  un PDF imprimé sans graphiques d'arrière-plan.
- Méthode de plastification et de découpe : plastifier la feuille entière ; couper les marges
  gauche, droite et haute sur les traits ; puis couper à la butée 68 mm (bandes) et 98 mm (cartes).
- PDF témoin : servir par Vite une page temporaire qui appelle `prepareWorkshopPrint` dans une
  iframe (base `/SWL/`, script dans `src/`), puis lancer
  `msedge --headless=new --no-pdf-header-footer --virtual-time-budget=40000 --print-to-pdf=...`.
  Supprimer les fichiers temporaires et arrêter Vite avant `npm run build`.

## Impression (page Listes)

- « Imprimer la liste (visuel + mots-clés) » : une unité par demi-page A4 (jamais coupée), encart
  « Améliorations » puis mots-clés groupés par moment d'usage, et cartes de Commandement au format
  réel en dernière page (`VisualListSection.tsx`, `CommandCardsPrintSection.tsx`).
- Les icônes de dés s'impriment comme de vraies images (pas un masque CSS sur fond) : un PDF sans
  « graphiques d'arrière-plan » doit les montrer. Vérifier un changement d'impression en PDF
  (Edge sans interface, `Page.printToPDF` avec `printBackground: false`).

## Outils d'audit

- `node scripts/audit-list-playthrough.mjs <liste.json> [autre.json] --rounds 2` : partie complète
  automatisée sur des listes au format d'export Tabletop Admiral (JSON avec `upgrades` en chaînes).
  Long (plus d'une heure pour deux listes de 1000 pts) : le lancer en arrière-plan.
- L'auto-diagnostic du site (`assistant/?selfaudit=1`, lancé depuis l'écran d'import) reprend la
  même logique dans `public/assistant/self-audit.js` : toute évolution du pilote
  `scripts/lib/auto-attack.mjs` ou du harnais doit y être reportée (test dans
  `scripts/test-assistant-game-tools.mjs`).
- Les listes en cours d'Antoine sont dans le `localStorage` de son navigateur
  (`swl.list.p1.v1` / `swl.list.p2.v1`) sur https://archipad.github.io/SWL/assistant/.
