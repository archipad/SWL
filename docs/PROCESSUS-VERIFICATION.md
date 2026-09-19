# Processus de vérification des règles et des données de cartes

Objectif : **aucune règle oubliée ni donnée de carte fausse pendant une partie.**
Ce document décrit ce qui protège l'Assistant, ce qui ne le protège pas encore, et ce qu'il faut faire à chaque ajout de cartes.

## 1. Ce qui s'est passé (incident Précis / Stormtroopers, 19/09/2026)

Le moteur ignorait Précis 1 pour les Stormtroopers alors que la carte le porte. Trois couches ont laissé passer l'erreur :

1. **Un correctif manuel faux** (`public/assistant/reference-corrections.js`) retirait « Précis 1 » de la carte au chargement, en supposant qu'il venait de la Lunette de Visée.
2. **Le stockage local de l'iPad masquait la donnée livrée** : une copie locale des étiquettes prenait le dessus sur le référentiel du dépôt, et le correctif la réécrivait. Corriger le dépôt ne suffisait donc pas.
3. **La certification de la carte contenait `keywords: []`** alors que les étiquettes livrées disaient Précis 1 : aucun contrôle ne comparait les deux sources, et une liste vide était acceptée comme « vérifié ».

Corrections apportées : registre de corrections vidé (et interdit sans source), le référentiel livré fait foi (le local n'ajoute ou ne retire que **explicitement**), la certification des Stormtroopers est corrigée, un test de parcours reproduit le cas, et un test de cohérence compare désormais certification ↔ étiquettes à chaque build.

## 2. Les garde-fous actuels

| Couche | Ce qu'elle garantit | Où |
|---|---|---|
| Source unique par carte | Le référentiel livré (`cardTags.ts`, `keywords.ts`, `diceCertifications.json`, `customCards.json`) → `reference-data.js`. Le stockage local n'ajoute/retire que par action explicite (`swl.card-tags-removed.v1`). | `generate-assistant-reference.mjs`, `app.js` ligne 6 |
| Aucune correction silencieuse | `reference-corrections.js` est vide ; toute correction doit porter `source` + `date`, sinon le build échoue. Il ne touche plus jamais au stockage local. | `test-assistant-contracts.mjs`, `test-reference-consistency.mjs` |
| Certification ↔ étiquettes | Deux sources de mots-clés par carte. En cas de désaccord le moteur applique leur **union** (jamais un mot-clé perdu) tant que la certification n'a pas été relue avec le désaccord affiché (`keywordsReviewed`). Une certification vide face à une base non vide, un mot-clé inconnu ou une liste absente font échouer le build. Chaque désaccord reste « à contrôler » dans l'écran de certification. | `generate-assistant-reference.mjs`, `test-reference-consistency.mjs` |
| Mots-clés de combat traités | Chaque mot-clé de combat est classé automatique (51) / assisté (34) / non traité (0) ; « non traité » fait échouer le build. | `audit-assistant-automation.mjs` |
| Mots-clés : étape et traitement | Chaque mot-clé du glossaire est soit de combat (moteur), soit rangé à son étape (mise en place, ordre reçu, déplacement, actions, fin d'activation, rallier, phase finale, réactions, permanent, composition d'armée) avec son traitement (bouton / rappel / composition) dans `scripts/data/keyword-timing.json`. Un mot-clé sans étape, ou déclaré « bouton » sans code, fait échouer le build. Rapport : `docs/audit/mots-cles-etapes.md`. | `audit-keyword-timing.mjs` |
| Mots-clés à valeur | Un mot-clé « X » sans valeur sur une carte (le moteur compterait 0) fait échouer le build ; un mot-clé sans valeur (Insensible, Profil bas, Blocage, Agile) compte pour 1. | `test-reference-consistency.mjs`, `app.js` `keywordValue` |
| Moteur | Résolution d'attaque, scénarios de règles, parcours réels (jsdom) dont le cas Précis. | `test-assistant-engine/scenarios/parcours` |
| Deuxième source | Recoupement avec Legion Helper (legion.takras.net) : mots-clés par carte, valeurs, figurines, PV, dés de défense, armes. **Avis, pas vérité.** Les écarts sont embarqués (`src/data/crosscheckTakras.json`) et affichés dans l'écran de certification ; ils restent à relire tant que la certification ne porte pas leur signature. | `npm run audit:takras` → `docs/audit/` |

## 3. Ce qui n'est PAS encore garanti (état honnête)

- **Seules 48 cartes sur ~300 ont une certification complète** (visuel + statistiques + armes + conversions + **mots-clés**). 78 ont leurs statistiques certifiées, ~160 leurs armes. Pour le reste, les mots-clés viennent de la base d'étiquettes, jamais confrontée à la carte physique : c'est là que pourrait se cacher un autre « Précis ».
- ~~L'écran de certification acceptait une liste de mots-clés vide et n'affichait pas les sources.~~ Corrigé le 19/09/2026 : l'écran liste **toute** carte non certifiée à 100 % (filtres : mes listes, écarts à relire, jamais certifiées), affiche côte à côte la base de l'appli, la dernière certification et les écarts Legion Helper, exige la case « aucun mot-clé » quand la liste est vide et la lecture des écarts avant de certifier, et permet de corriger la portée imprimée de chaque arme. Les mots-clés (de la carte et de chaque arme) s'ajoutent par un **champ de recherche** sur le glossaire (orthographe et syntaxe garanties, valeur X demandée) ; un bouton unique « tout est conforme » certifie la carte et ouvre la suivante, et l'envoi se fait par lots de 40 cartes (limite de taille d'une issue GitHub).
- **Pas de porte à l'import** : de nouvelles cartes / nouveaux mots-clés entrent avec leurs étiquettes sans être recoupés. Le test de cohérence et l'audit takras le détectent après coup, mais rien n'empêche encore l'import lui-même. À faire : que `apply-dice-certification.mjs` et l'import lancent la même vérification et refusent un lot incohérent.
- Le recoupement takras ne couvre que les cartes portant le même nom des deux côtés (136 cartes sur 281 au 19/09/2026) ; les autres sont à apparier à la main. L'appariement de mots-clés anglais ↔ français est une table écrite à la main (`scripts/data/takras-keyword-map.json`, entrées « probable » à confirmer).
- Les mots-clés « affichage / vérification humaine » (hors combat : Éclaireur, Transport, Redéploiement…) sont affichés à l'écran mais leur application reste au joueur.

## 4. Processus à suivre

### À chaque nouvel import (cartes, mots-clés, extension)
1. Importer, puis `npm run generate:assistant-data`.
2. `node scripts/test-reference-consistency.mjs` : doit passer. Un échec = une carte dont les sources se contredisent → trancher **sur la carte physique**, corriger la source (`cardTags.ts` ou `diceCertifications.json`), jamais un patch de chargement.
3. `npm run audit:takras` puis lire le rapport de `docs/audit/` : chaque écart est un point à contrôler sur la carte. Un écart n'est pas forcément une erreur de l'appli (le site peut se tromper ou différer de version de carte) — mais il ne doit jamais rester non regardé.
4. Mots-clés **nouveaux** : les ajouter à `keywords.ts` avec définition, les classer dans `audit-assistant-automation.mjs` (automatique / assisté), écrire un scénario si le moteur doit les appliquer. Un mot-clé « non traité » bloque le build.
5. Certifier les nouvelles cartes dans l'écran de certification : identité, visuel, statistiques (figurines, PV, courage, dés de défense), armes (dés, portée, mots-clés d'arme), conversions (adrénaline), **mots-clés** — en cochant explicitement « aucun mot-clé » quand c'est le cas.
6. Ajouter à la table `takras-keyword-map.json` tout mot-clé du site marqué « non apparié ».

### Avant une partie
1. `npm run build` complet (tous les tests ci-dessus).
2. Ouvrir l'Assistant, **charger les listes réelles**, vérifier chaque carte alignée sur le visuel. Priorité : cartes non certifiées de la liste (l'écran de certification en donne le compte).
3. Vider le cache de la PWA sur l'iPad après un déploiement (ancienne interface sinon).
4. Lancer « Tester mes listes ».

### Collisions unité / amélioration
Tabletop Admiral peut nommer une amélioration exactement comme une carte Unité (cas Chewbacca, 19/09/2026 : l'amélioration recevait les armes et mots-clés de l'unité). Table explicite : `src/data/upgradeNameCollisions.json` (appliquée à l'import et au chargement de l'Assistant). Toute autre collision est signalée par l'audit d'import ; l'ajouter à la table, puis raccorder la carte d'amélioration avec sa photo (écran de certification, « cartes inconnues »).

### Règles d'or
- Une donnée se corrige **dans sa source**, après vérification sur la carte. Pas de patch au chargement, pas de correction du stockage local par le code.
- Un « vide » n'est jamais une réponse valide : « aucun mot-clé » se déclare.
- Un désaccord (base ↔ certification, ou Legion Helper) se résout dans l'écran de certification ; il ne s'accumule pas.
- Le deuxième avis (takras) ne remplace jamais la carte.
