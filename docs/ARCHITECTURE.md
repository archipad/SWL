# Architecture de SWL

## Deux interfaces, un même référentiel

La SPA React/Vite vit dans `src/`. Elle gère les listes, l'import, la bibliothèque, le suivi de partie et la synchronisation. L'Assistant d'unité est une application autonome dans `public/assistant/`, accessible sous `/SWL/assistant/`.

Les deux interfaces doivent employer les mêmes clés canoniques et certifications. `scripts/generate-assistant-reference.mjs` transforme les données TypeScript/JSON du projet en `public/assistant/reference-data.js` consommable sans compilation par l'Assistant.

## Flux d'un import

1. `src/lib/parseListJson.ts` lit prioritairement le JSON Tabletop Admiral.
2. `src/lib/cardNames.ts` ramène les variantes anglaises ou françaises vers une clé canonique.
3. `src/data/cardImages.ts`, `cardNamesFr.ts`, `cardTags.ts` et `cardNotes.ts` fournissent présentation et effets.
4. `src/data/diceProfiles.ts` décrit les profils utilisables par le moteur.
5. `src/data/diceCertifications.json` confirme dés, défense, PV, courage et figurines.
6. `src/lib/unitModels.ts` calcule l'effectif et les PV en intégrant seulement les améliorations déclarées comme ajoutant des figurines.
7. `src/lib/importAudit.ts` sépare les problèmes de catalogue des données moteur non certifiées.

## État de partie

Les listes et l'état courant sont conservés localement. `src/lib/gistSync.ts` et `src/lib/useSync.ts` synchronisent les listes, le suivi de partie, les états d'unités et le journal d'attaques via le Gist configuré par l'utilisateur. L'Assistant emploie les mêmes clés de stockage et restaure les données synchronisées.

## Assistant de résolution

- `public/assistant/app.js` : parcours, interface, sélection des unités/armes, états persistants.
- `public/assistant/attack-engine-v32.js` : calculs de résolution et interactions de règles.
- `public/assistant/certification.js` : contrôle humain et préparation des lots de corrections.
- `public/assistant/engine.css` et feuilles associées : interface tactile et thèmes de faction.

## Construction et déploiement

`npm run build` régénère le référentiel, lance les tests et audits, compile TypeScript puis produit `dist/`. `.github/workflows/deploy-pages.yml` exécute ce même build et déploie GitHub Pages sur les branches autorisées.
