# SWL — consignes permanentes

## Objectif

Maintenir l'application Star Wars: Legion, son Assistant d'unité et le suivi de partie sans régresser sur les règles, les imports Tabletop Admiral ni l'usage sur iPad.

## Avant toute modification

- Lire `docs/ARCHITECTURE.md`, puis uniquement la documentation liée au lot.
- Exécuter `git status --short` et préserver toutes les modifications existantes.
- Ne jamais remplacer un fichier distant récent par une ancienne copie locale.
- Ne pas modifier le design de l'Assistant pendant qu'Antoine signale travailler lui-même dessus.
- Regrouper les demandes cohérentes en un lot ; ne publier qu'après validation du lot.

## Sources de vérité

- Noms et variantes de cartes : `src/data/cardNamesFr.ts` et `src/lib/cardNames.ts`.
- Visuels : `src/data/cardImages.ts` et `public/cards/`.
- Profils de dés et règles : `src/data/diceProfiles.ts`.
- Certifications humaines : `src/data/diceCertifications.json`.
- Calcul des figurines/PV : `src/lib/unitModels.ts`.
- Référentiel généré de l'Assistant : `public/assistant/reference-data.js` ; ne pas l'éditer à la main.
- Moteur autonome de l'Assistant : `public/assistant/attack-engine-v32.js` et `public/assistant/app.js`.

## Règles d'implémentation

- Une correction de mot-clé doit s'appliquer à toutes les unités et armes concernées.
- Toute donnée moteur critique doit venir d'une donnée certifiée, jamais d'une approximation visuelle silencieuse.
- Les compteurs préremplis restent modifiables par le joueur.
- Les avertissements bloquants sont affichés à proximité immédiate de la zone d'action.
- Les imports Tabletop Admiral utilisent une clé canonique ; toute nouvelle variante doit être couverte par un test.
- Préserver l'identité stable d'une unité lors des réimports afin de conserver blessures et suppressions.
- Le rendu doit rester utilisable tactilement et sans défilement excessif sur iPad.

## Validation proportionnée

- Texte/CSS isolé : test de contrat ciblé et contrôle visuel utile.
- Moteur, dés, portée ou mot-clé : tests moteur + contrats Assistant.
- Import, carte, traduction, image, effectif ou PV : pipeline d'import + génération + audit.
- Avant publication d'un lot fonctionnel : `npm run verify`.
- Ne pas répéter toute la suite si aucun fichier pertinent n'a changé depuis son dernier passage réussi.

## Publication

- Branche : `claude/star-wars-legion-app-49rc3z`.
- Une version et un commit fonctionnel par lot autant que possible.
- Ne pas publier `.npm-cache/`, `tmp/`, `dist/` ou des fichiers de diagnostic.
- Après le push, vérifier la dernière exécution « Déploiement GitHub Pages ».
- Procédure complète : `docs/RELEASE.md`.

## Fin de tâche

Indiquer les fichiers modifiés, les validations exécutées, le commit publié le cas échéant et les points réellement restants dans `docs/ROADMAP.md`.
