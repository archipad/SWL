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
| Automatisation des mots-clés hors combat | 78 mots-clés ont un bouton d'application dans la fiche d'unité (« Automatismes des mots-clés ») qui met le suivi des pions à jour au bon moment : actions de carte avec choix des cibles, mise en place (round 1), Phase de Commandement, vitesse et déplacements obligatoires, fin d'activation (Régénérer, Recharger, Cycle…), réactions (Sentinelle, Impitoyable…). 12 règles de mouvement sont affichées dans la ligne « règles de mouvement ». Restent en simple rappel : 7 effets permanents (Chef, Permanent, Restauration, Tenir le cap, Je sens le profit, Immunité effets ennemis, Nous ne sommes pas des Regs), Instinct de survie et Pions Graffiti. | `keyword-timing.json`, `app.js` `CARD_KEYWORD_ACTIONS` |
| Où remonte chaque mot-clé (audit du 20/09/2026) | `node scripts/audit-keyword-surfacing.mjs` charge le vrai Assistant avec une carte qui porte chacun des 199 mots-clés du glossaire, rejoue une attaque complète et relève les écrans où le nom apparaît (fiche d’unité, Armes, Jet, Couvert, Modifications, Défense, Résumé, pop-up). Résultat dans `docs/audit/mots-cles-affichage.md`. Il a révélé : 48 mots-clés d’armes ignorés en attaque (Souffle, Immobiliser, Perforant, Létal… cartes Mercenaires), 10 valeurs X absentes, Câble de Remorquage jamais actif sur le Harpon, À Bout Portant appliqué sans annonce, et des mots-clés d’autres unités (Exemplaire, Tir de Soutien…) affichés nulle part. | `audit-keyword-surfacing.mjs`, `test-reference-consistency.mjs` (invariant arme → étiquettes) |
| Effets propres aux cartes d’amélioration (audit du 20/09/2026) | `node scripts/audit-card-effects.mjs` classe chaque carte qui a une note d’effet ou une icône ↱ / ✖ : bouton de fiche, panneau d’attaque, automatisme, statistique, carte retournable, rappel justifié ou contrainte de liste. Il rejoue dans le vrai Assistant une sonde par carte (le bouton ou le rappel doit apparaître) et échoue si une carte ↱ / ✖ n’a pas de bouton de suivi. Résultat dans `docs/audit/cartes-effets.md`. Le texte des effets vient de `src/data/cardNotes.ts` (généré vers `card-notes.js` par `scripts/generate-card-notes.mjs`). | `audit-card-effects.mjs`, `test-assistant-parcours.mjs` (3 scénarios de cartes) |
| Relecture IA des visuels (21/09/2026) | `src/data/aiReview.json` recense, pour chaque carte, ce que l’IA a relu sur le visuel : « relue » (aucun écart), « corrigée » (donnée modifiée, à confirmer) ou « illisible » (à lire sur la carte). Il alimente l’écran de certification (pastille, filtre, défilé des cartes à confirmer). C’est un deuxième avis : la certification à la main reste la seule validation. Une lecture automatique par traitement d’image a été essayée puis écartée (25 à 40 % de lectures justes sur les cartes déjà certifiées). | `test-assistant-parcours.mjs` (scénario « relecture IA ») |
| Recoupement avec Legion HQ et Legion Helper (21/09/2026) | `node scripts/audit-legionhq.mjs` (base structurée de legionhq2.com : rang, vitesse, figurines, PV, courage, défense, adrénalines, dés et portée de chaque arme) et `node scripts/audit-takras-stats.mjs` (Legion Helper). Manuels, ils interrogent le réseau (option `--cache`). Sorties : `docs/audit/recoupement-legionhq.md` et `recoupement-caracteristiques-legion-helper.md`. Deuxième avis : les sites appliquent les errata et se trompent parfois, chaque écart est tranché sur le visuel (verdicts dans `recoupement-legionhq-triage.md`). Aucune donnée du site n’est recopiée dans le dépôt. | `audit-legionhq.mjs`, `audit-takras-stats.mjs` |
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

## Certification : portée, mots-clés d'arme et utilisation de la carte (21/09/2026)
- **Portée d'une arme** : `melee` = icône de corps-à-corps seule ; `melee-2` = arme à DEUX icônes (corps-à-corps ET tir de 1 à 2, ex. pistolet DH-17 des Fleet Troopers) ; `1-3` = distance seule ; `1-#` = distance illimitée. L'écran de certification affiche « Lu par le moteur : … » et propose des raccourcis ; une portée illisible est refusée à l'application du lot.
- **Mots-clés** : ceux d'une ARME se cochent sur l'arme (champ « Mots-clés imprimés sur cette arme »), ceux de la CARTE (unité ou amélioration) dans « Mots-clés de la carte ». Ensuite un seul clic : « ✓ TOUT EST CONFORME À LA CARTE · certifier et passer à la suivante » (ou « Certifier toute la carte en une fois »), qui ajoute la carte ET ses armes au lot ; puis « Envoyer » une seule fois à la fin.
- **Utilisation de la carte** (améliorations) : permanente, ↱ s'incline (redressée à la Phase Finale), ✖ supprimée de la partie, ou les deux. Détectée automatiquement sur les 223 visuels (`scripts/tools/detect-upgrade-icons.py`), à confirmer dans la certification.
