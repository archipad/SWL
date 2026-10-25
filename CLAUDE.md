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
