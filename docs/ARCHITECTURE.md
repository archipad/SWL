# Architecture de SWL

## Deux interfaces, un même référentiel

La SPA React/Vite vit dans `src/`. Elle gère les listes, l'import, la bibliothèque, le suivi de partie et la synchronisation. L'Assistant d'unité est une application autonome dans `public/assistant/`, accessible sous `/SWL/assistant/`.

Les deux interfaces doivent employer les mêmes clés canoniques et certifications. `scripts/generate-assistant-reference.mjs` transforme les données TypeScript/JSON du projet en `public/assistant/reference-data.js` consommable sans compilation par l'Assistant.

## Flux d'un import

1. `src/lib/parseListJson.ts` lit prioritairement le JSON Tabletop Admiral.
2. `src/lib/cardNames.ts` ramène les variantes anglaises ou françaises vers une clé canonique.
3. `src/data/cardImages.ts`, `cardNamesFr.ts`, `cardTags.ts` et `cardNotes.ts` fournissent présentation et effets. `certifiedCardTags.json`, généré par `generate-assistant-reference.mjs`, donne à l'application principale les mêmes mots-clés certifiés que l'Assistant ; `src/lib/certifiedTags.ts` les fait primer sur la copie locale `swl.card-tags.v1`.
4. `src/data/diceProfiles.ts` décrit les profils utilisables par le moteur.
5. `src/data/diceCertifications.json` confirme dés, défense, PV, courage et figurines.
6. `src/lib/unitModels.ts` calcule l'effectif et les PV en intégrant seulement les améliorations déclarées comme ajoutant des figurines.
7. `src/lib/importAudit.ts` sépare les problèmes de catalogue des données moteur non certifiées.

## Atelier de cartes FR (31/10/2026)

`src/components/CardWorkshopScreen.tsx` est accessible depuis Gestion Armée et `#atelier-cartes`.
`src/lib/cardWorkshop.ts` assemble les mêmes cartes, traductions, définitions et commandements que le reste du projet et résout le panier Tabletop.
`cardWorkshopPrint.ts` mesure et pagine les définitions, construit les planches A4 recto verso bord long et refuse les rectos manquants.
`cardWorkshopStorage.ts` conserve les rectos personnels uniquement dans IndexedDB. Le panier possède sa propre clé ; aucune dépendance au moteur d'attaque ni modification des certifications. Portée et suites : `docs/CARD_WORKSHOP.md`.

## État de partie

Les listes et l'état courant sont conservés localement. `src/lib/gistSync.ts` et `src/lib/useSync.ts` synchronisent les listes, le suivi de partie, les états d'unités et le journal d'attaques via le Gist configuré par l'utilisateur. L'Assistant emploie les mêmes clés de stockage et restaure les données synchronisées.

## Assistant de résolution

- `public/assistant/app.js` : parcours, interface, sélection des unités/armes, états persistants.
- `public/assistant/attack-engine-v32.js` : calculs de résolution et interactions de règles.
- `public/assistant/certification.js` : contrôle humain et préparation des lots de corrections.
- `public/assistant/engine.css` et feuilles associées : interface tactile et thèmes de faction.

## Fiches d'unité

`public/fiches/` (`/SWL/fiches/`) est une interface de consultation autonome : sélecteur identique à celui de l'Assistant, puis carte, améliorations, effets de cartes et mots-clés définis, rangés par type (Améliorations, Attaque, Défense, Autre). Elle lit les listes importées et le référentiel, mais ne charge ni `app.js` ni le moteur et ne suit aucun état de partie. Les effets de cartes viennent de `upgradeTextFor`, générés vers `upgrade-texts.js` par `scripts/generate-fiches-upgrades.mjs`. Contrôle : `scripts/test-fiches.mjs`, qui compare aussi les tables recopiées d'`app.js` et la liste des feuilles de style.

## Construction et déploiement

`npm run build` régénère le référentiel, lance les tests et audits, compile TypeScript puis produit `dist/`. `.github/workflows/deploy-pages.yml` exécute ce même build et déploie GitHub Pages sur les branches autorisées.


Traductions locales du 31/10/2026 : cinq rectos anglais traduits sans service payant, Cassian FR réutilisé, identifiants existants conservés. Voir docs/CARD_WORKSHOP_TRANSLATIONS.md. Le parcours assisté pour les cartes inconnues reste à réaliser.
## Atelier de cartes FR — publication du 01/11/2026

La page `print-cards` et les ancres `#imprimer` / `#atelier-cartes` ouvrent désormais `CardWorkshopScreen`. L’entrée de menu existante est renommée « Atelier de cartes FR » : aucun doublon de navigation. Impression : un recto et un verso par exemplaire, uniquement les définitions au dos. Voir docs/CARD_WORKSHOP.md et docs/CARD_WORKSHOP_FRONTS_CURRENT.md. Les sources anglaises personnelles des recettes ne sont pas publiées.

## Versos compacts et planches A4 — 01/11/2026

Le mode condensé et le format commun 68 × 98 mm (8/A4) sont proposés par défaut. Les textes intégraux restent inchangés. Voir docs/CARD_WORKSHOP_COMPACT.md pour les 156 résumés, Tough, la couverture des 197 entrées HQ et les essais des deux listes réelles. Aucun changement du moteur ni des certifications humaines.
