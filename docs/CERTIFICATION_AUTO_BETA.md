# Certification automatique — bêta

Ce laboratoire fonctionne en parallèle de la certification historique. Il n'utilise ni son stockage local (`swl-dice-certification-batch-v1`, alias historiques) ni son lot GitHub, et ne modifie pas la base moteur.

## File de préparation

La bêta ne traite que les cartes **des listes importées** : unités, améliorations, cartes de commandement et contingences (les listes Tabletop Admiral ne contiennent pas de cartes de bataille). Chaque carte affiche des états indépendants :

- métadonnées trouvées (ou ambiguës : choix humain, jamais automatique) ;
- visuel anglais local ;
- visuel français local ;
- traduction complète (nom français et mots-clés connus du glossaire) ;
- mots-clés nouveaux à valider ;
- prête pour validation humaine (les deux visuels sont dans le dépôt).

Une carte validée passe dans « Déjà validées » et n'est plus retraitée.

### Quatre états : la comparaison EN/FR n'est exigée que si nécessaire

| État | Condition | Comparaison EN/FR |
|---|---|---|
| **Certifiée et inchangée** | certification historique présente ; données moteur, visuel français et définitions inchangés depuis l'index ; identité Tabletop Admiral rattachée sans ambiguïté ; aucun mot-clé Tabletop Admiral nouveau | **non** : « Certification existante valide », hors de la file, aucun visuel anglais demandé |
| **Certification devenue obsolète** | données, visuel français ou définition modifiés, ou nouveau mot-clé Tabletop Admiral | oui |
| **Carte connue mais incomplète** | carte du site sans certification complète (dont toutes les cartes de commandement), ou identité incertaine | oui |
| **Carte réellement nouvelle** | inconnue du référentiel SWL | oui |

- L'index versionné `src/data/autoCertificationHistoricalIndex.json` fige les empreintes SHA-256 de chaque certification historique : données moteur, visuel français et définitions de mots-clés. Il garde aussi les cartes Tabletop Admiral rattachées sans ambiguïté : même type, et seule carte possible ou retenue par une décision certifiée.
- Le build ne le réécrit jamais. Après une certification validée, on le met à jour volontairement avec `npm run index:auto-certification-historical`.
- L'inventaire publié compare à chaque build l'état actuel à cet index.

### Visuel anglais importé sur l'appareil

Pour une carte qui exige une comparaison sans visuel anglais disponible, la fiche propose « Importer le visuel anglais » : sélection d'un fichier, glisser-déposer ou collage depuis le presse-papiers.

- **Formats et contrôles :** JPEG, PNG ou WebP uniquement. Le type et les dimensions sont lus dans la signature réelle du fichier. Minimum 20 Ko et 600 × 400 pixels, maximum 15 Mo.
- **Stockage :** l'image est enregistrée **uniquement dans IndexedDB**, sur l'appareil. Jamais en `localStorage`, jamais envoyée au dépôt, au Gist ni à un service externe.
- **Empreinte :** le SHA-256 est calculé localement.
- **Provenance :** une provenance textuelle est obligatoire.
- **Suppression :** le visuel peut être supprimé après validation ; la validation garde son empreinte.

### Lot partageable sans image

« Validations prêtes à envoyer » regroupe les validations de l'appareil dans **un seul export JSON** (`format: swl-auto-certification-validations`, `formatVersion: 2`), à fusionner dans `validations` de `src/data/autoCertificationDecisions.json`. Chaque entrée contient :
- l'identité canonique et le type de carte ;
- les données moteur certifiées ;
- la traduction française ;
- les mots-clés et leurs définitions ;
- la provenance textuelle et le SHA-256 du visuel anglais ;
- le SHA-256 du visuel français ;
- la version des règles et la date.

Aucune image n'y figure. Une fois publiée, la validation vaut sur tous les appareils tant que les empreintes sont inchangées.

### Variantes ambiguës

Quand plusieurs cartes Tabletop Admiral portent le nom d'une carte de liste, « Comparer les variantes » les affiche côte à côte :
- visuels locaux ;
- identifiant, nom, titre et nom d'export ;
- coût, type et rang, caractéristiques ;
- armes (seulement si un visuel les montre) et mots-clés ;
- version des règles ;
- unité de la liste qui l'utilise, avec ses améliorations ;
- raison probable de la duplication ;
- recommandation, présentée comme telle.

L'analyse vient de `src/data/autoCertificationVariants.json`. Elle est publiée dans l'inventaire, avec un contrôle des empreintes des visuels. Deux boutons sont proposés : « Utiliser cette variante » et « Laisser à contrôler ».

### Décisions certifiées (communes à tous les appareils)

`src/data/autoCertificationDecisions.json` est versionné et publié dans l'inventaire.

- **`variants`** : variante retenue pour un nom de liste (clé « type:nom normalisé »).
  - Chaque décision conserve les identifiants comparés, la règle appliquée, la justification et la date.
  - Un import identique (même nom) retrouve donc la même carte, sur n'importe quel appareil.
  - Une décision peut être limitée à une faction : l'AT-RT n° 1 vaut pour les listes rebelles (« Alliance Rebelle », « rebel », « Rebels »). Celui d'une liste de la République reste un choix humain.
- **Quatre décisions acceptées le 21/10/2026** : GALAAR-90 (Armament) → n° 22654, Combat Armor (Rebel) → n° 20282, AT-RT rebelle → n° 1, Rebel Commandos Strike Team → n° 25979 (version actuelle).
- **Surcharge locale** : « Utiliser cette variante » ou « Laisser à contrôler » ne vaut que pour cet appareil (`swl-auto-certification-beta-v1`). « Revenir à la décision du dépôt » l'annule.
- **`validations`** : validations publiées (clé « type:identifiant Tabletop Admiral »), avec le nom français et les empreintes SHA-256 des deux visuels comparés.
  - Une validation faite dans le navigateur est proposée dans « Publier mes validations » (bloc JSON à ajouter à ce fichier) ; une fois publiée, elle s'applique partout.

Rien de cela n'écrit dans le catalogue historique ni dans les données moteur.

### Invalidation par SHA-256

Une validation, locale ou publiée, retient les empreintes des deux visuels. L'inventaire publie l'empreinte de chaque visuel réellement déployé : `public/cards`, cartes françaises extraites, `public/commandcards`. Dès qu'une empreinte diffère, la validation tombe : la carte revient dans la file avec « validation invalidée ».

Le visuel anglais AMG à usage personnel n'est pas publié. En ligne, son empreinte (`personalHashes`, sans chemin) sert seulement à reconnaître une validation publiée.

## Validation humaine

Le validateur n'a qu'à :

1. comparer côte à côte le visuel anglais et le visuel français (cases bloquées tant que les deux images ne s'affichent pas réellement) ;
2. confirmer ou corriger le nom français ;
3. confirmer les traductions proposées par le glossaire (une précision propre à la carte, « Teamwork: Han Solo », est signalée « à confirmer ») ;
4. valider les mots-clés nouveaux (traduction saisie pour chacun).

La validation est conservée dans `swl-auto-certification-beta-v1` uniquement.

## Métadonnées (Tabletop Admiral)

`npm run refresh:auto-certification` produit `public/assistant/auto-certification-source.js` : noms et titres EN/FR (dont les noms français des cartes de commandement, `/api/official-commands`), identifiants, types, coûts, statistiques, factions, mots-clés et définitions. Ses adresses d'images ne sont jamais reprises (anciennes adresses Cloudinary mortes, nouvelles adresses CloudFront protégées contre le hotlinking — protection non contournée). Le fichier n'est réécrit que si les données changent ; une source tronquée est refusée.

## Visuels : uniquement des fichiers du dépôt

Résolveur partagé (`public/assistant/auto-certification-resolver.js`, utilisé par la page, l'audit, la récupération et les tests) :

1. table explicite `src/data/autoCertificationAliases.json` (« confirmed » : utilisé ; « proposed » : affiché comme rapprochement à confirmer) — dont `Underworld Connections → Contacts dans la Pègre`, `Imperial Dark Troopers → Dark Troopers Impériaux` et `XS-IV Assault Cannon → Dark Trooper avec Canon d'Assaut XS-IV` ; la même table donne les traductions de mots-clés que l'index V2.6 marque « N/A » (Assault X, Overwhelm, Sniper Team), relevées sur les cartes françaises ;
2. fichiers déjà présents dans `public/cards/` (nom anglais complet, nom français complet, nom court non ambigu) et `public/commandcards/` (nom français, nom anglais cité) ; plusieurs visuels possibles = « ambigu », jamais de choix silencieux ;
3. cartes françaises extraites des PDF du disque (`public/cards/auto-certification/fr/`) ;
4. visuels anglais officiels AMG (`public/cards/auto-certification/en/`) ;
5. sinon « visuel anglais à rechercher » / « visuel français absent ».

Une adresse distante n'est jamais un visuel disponible ; seuls `../cards/…` et `../commandcards/…` sont affichés.

### Visuels anglais : PDF officiels AMG

`npm run fetch:auto-certification-assets [-- liste.json …]` (par défaut : `scripts/fixtures/*.json`) ne cherche que les cartes des listes. Il lit la liste blanche `scripts/data/auto-certification-sources.json` (PDF officiels relevés sur la page « Rules & Organized Play » d'AMG, `cdn.svc.asmodee.net`), télécharge chaque PDF dans `node_modules/.cache/swl-auto-certification/` (jamais publié), puis :

- extrait chaque carte telle qu'elle est intégrée au PDF (`scripts/tools/extract_pdf_cards.py`, résolution native, jamais une page entière ; face « caractéristiques » pour les unités, comme les visuels français) ;
- lit son titre avec l'OCR local de Windows (`scripts/tools/windows-ocr.ps1`) et le compare à **toutes** les cartes du même type : « identifiée » si score ≥ 0,90 avec 0,10 d'avance (ou lecture exacte sans autre nom exact), « à contrôler » entre 0,75 et 0,90 (jamais utilisée), sinon inconnue ;
- copie le visuel identifié en JPEG RGB dans `public/cards/auto-certification/en/` et l'inscrit dans `src/data/autoCertificationAssets.json` : URL source exacte (PDF et page), domaine, date, type de source, nom canonique, SHA-256, format, dimensions, empreinte du PDF et lecture OCR.

Refusés : HTTP, domaines hors liste blanche, hôtes Tabletop Admiral, fichiers non PDF, invalides ou trop petits. Mention des PDF AMG : « Permission granted to print or photocopy for personal use only. »

**Usage personnel uniquement.** Ces visuels AMG sont marqués `publication: "usage-personnel"` dans le manifeste. Leur dossier `public/cards/auto-certification/en/` est ignoré par Git : ils ne sont jamais publiés automatiquement.

### Couverture locale et couverture en ligne

| | En local (`localhost`) | En ligne (GitHub Pages) |
|---|---|---|
| Inventaire principal `auto-certification-assets.js` (versionné, identique des deux côtés) | ✓ | ✓ |
| Inventaire personnel `auto-certification-personal.js` (ignoré par Git, régénéré si les fichiers existent) | chargé | jamais demandé |
| Visuels anglais AMG | utilisables (comparaison, validation) | « Visuel anglais non disponible en ligne » : carte non validable |
| Compteurs | publiés + personnels, distingués | fichiers déployés seulement |

- L'inventaire principal ne cite aucun fichier AMG personnel : ni chemin, ni compteur.
- Le build GitHub Pages le régénère sans ces fichiers et obtient le même résultat.
- Les tests locaux peuvent utiliser les fichiers ignorés. Les scénarios jsdom rejouent aussi l'origine du site publié.

Seconde lecture OCR (bandeau 3×, binarisé) pour les titres que la première ne départage pas ; la lecture retenue est tracée (`identification.pass`). Particularités gérées : PDF mêlant plusieurs types de cartes (`cardKinds`, une passe par type), cartes Unité dessinées de côté (`rotateUnits`), et **titres imprimés** différents du nom Tabletop Admiral (`printedTitles` de `src/data/autoCertificationAliases.json`, vérifiés à l'œil : « XS-IV Assault Cannon Dark Trooper », « T-7 Ion Rifle Snowtrooper »). Une précision de liste entre parenthèses (« GALAAR-90 Sniper Rifle (Armament) ») n'est retirée qu'en dernier recours ; plusieurs cartes possibles restent « ambiguës ».

### Visuels français : PDF du disque

`npm run extract:auto-certification-fr [-- --pdf-dir "…/App Web SWL V2"]` extrait les cartes du manifeste PDF qui n'ont pas encore de visuel local : même extraction (proportions natives rétablies quand un PDF étire la carte), titre lu par OCR et comparé aux cartes du même PDF, doublons repérés par empreinte perceptuelle face aux visuels existants. Une carte incertaine (lecture partielle, identification par élimination, doublon possible) est copiée mais classée « à contrôler », jamais certifiée.

`scripts/generate-auto-certification-assets.mjs` (lancé par `npm run generate:assistant-data`) refuse tout visuel absent, hors de `auto-certification/en|fr/`, sans format ni dimensions, ou dont l'empreinte a changé, vérifie que chaque alias pointe vers un visuel existant, puis publie l'inventaire `public/assistant/auto-certification-assets.js`.

## Audit

`npm run audit:auto-certification-lists -- liste.json …` audite des listes réelles, en deux résultats distincts (local avec les visuels AMG personnels, et en ligne tel que GitHub Pages le publie) : état de chaque carte (métadonnées, visuels, traduction, mots-clés certifiés, blocages précis), données moteur de chaque unité lues dans le référentiel historique (PV, courage, défense, vitesse, rang, type, effectif, figurines ajoutées, armes, variantes) avec les alias historiques manquants, et liste des interventions humaines restantes (`docs/audit/certification-auto-listes.md`).

`npm run audit:auto-certification-visuals [-- liste.json …]` écrit `docs/audit/certification-auto-visuels.md` avec le même résolveur que la page.

## Action planifiée

`.github/workflows/refresh-auto-certification.yml` actualise les métadonnées toutes les six heures (et à la demande) ; elle ne touche jamais aux visuels, échoue si un autre fichier que le catalogue a changé ou si la branche distante a évolué, ne pousse qu'en avance rapide puis déclenche le déploiement.

## Visuels manquants dans l'ancien écran

Toutes les images de `public/cards` sont recensées par le catalogue. Une carte inconnue (Mandalorian Hunter…) reçoit donc le remplacement local `assistant/visuel-indisponible.svg`, sans requête vers un fichier deviné. Ce remplacement est présenté comme tel (« Visuel indisponible »), jamais comme la vraie carte. Un visuel de carte qui ne se charge pas est remplacé de la même façon.

## Accès

Menu du site « Listes » → « Certification automatique β » (`assistant/?open=certification-auto`), distinct de « Cartes certifiées ».

## Étape suivante

Pour une carte dont aucun visuel français n'existe, un service devra produire une épreuve française depuis le visuel anglais local ; elle restera bloquée jusqu'à comparaison humaine. Le basculement vers la certification historique ne sera fait qu'après des essais concluants sur les quatre types de cartes.
