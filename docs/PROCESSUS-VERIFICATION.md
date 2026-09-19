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
| Certification ↔ étiquettes | Pour toute carte à certification complète, mots-clés certifiés = étiquettes livrées (valeurs comprises). Les écarts encore ouverts sont **listés en dur** (`KNOWN_DISCREPANCIES`) : un nouvel écart fait échouer le build. Un identifiant de mot-clé inconnu aussi. | `test-reference-consistency.mjs` |
| Mots-clés de combat traités | Chaque mot-clé de combat est classé automatique (51) / assisté (34) / non traité (0) ; « non traité » fait échouer le build. | `audit-assistant-automation.mjs` |
| Moteur | Résolution d'attaque, scénarios de règles, parcours réels (jsdom) dont le cas Précis. | `test-assistant-engine/scenarios/parcours` |
| Deuxième source | Recoupement avec Legion Helper (legion.takras.net) : mots-clés par carte, valeurs, figurines, PV, dés de défense, armes. **Avis, pas vérité.** | `npm run audit:takras` → `docs/audit/` |

## 3. Ce qui n'est PAS encore garanti (état honnête)

- **Seules 48 cartes sur ~300 ont une certification complète** (visuel + statistiques + armes + conversions + **mots-clés**). 78 ont leurs statistiques certifiées, ~160 leurs armes. Pour le reste, les mots-clés viennent de la base d'étiquettes, jamais confrontée à la carte physique : c'est là que pourrait se cacher un autre « Précis ».
- L'écran de certification accepte une liste de mots-clés vide (« aucun mot-clé ») sans confirmation explicite et **sans afficher les étiquettes existantes ni le deuxième avis**. À faire : case « cette carte n'a aucun mot-clé » obligatoire, et affichage côte à côte.
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

### Règles d'or
- Une donnée se corrige **dans sa source**, après vérification sur la carte. Pas de patch au chargement, pas de correction du stockage local par le code.
- Un « vide » n'est jamais une réponse valide : « aucun mot-clé » se déclare.
- Un écart déclaré dans `KNOWN_DISCREPANCIES` se résout ; il ne s'accumule pas.
- Le deuxième avis (takras) ne remplace jamais la carte.
