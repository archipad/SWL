# Audit du catalogue de cartes — 13 PDF (14/09/2026)

Audit exhaustif demandé par l'utilisateur des PDF de cartes françaises présents dans
`C:\Users\antoi\Desktop\App Web SWL V2\aGENTS` et `...\Nouveau dossier`, comparés au
catalogue central (`cardImages.ts`, `cardNamesFr.ts`, `cardTags.ts`, `diceProfiles.ts`,
`customCards.json`, `cardKeyAliases.json`, `public/cards`). Résultat détaillé
machine-lisible : [`src/data/pdfCardManifest.json`](../src/data/pdfCardManifest.json)
(185 entrées, validées par `scripts/test-pdf-catalog-manifest.mjs`).

**PDF exclu à la demande de l'utilisateur :** `Galactic Empire Commands FR.pdf`
(faction non jouée par l'utilisateur — non ouvert, non catalogué).

**Correction de métadonnées :** les comptes de pages annoncés par l'outil de lecture
au moment de joindre chaque PDF étaient très surestimés (ex. « 185 pages » annoncé
pour un fichier qui en contient réellement 6). Les comptes ci-dessous viennent d'une
lecture directe de chaque fichier (PyMuPDF) et sont les vrais comptes.

## 1. Nombre de cartes par PDF

| PDF | Pages réelles | Cartes uniques cataloguées | Nature |
|---|---:|---:|---|
| Mercenary Units FR.pdf | 6 | 18 | Unités — **déjà publiées** (lot précédent), visuels corrigés (rotation) |
| Mercenary Upgrades FR.pdf | 7 | 24 | Améliorations — identifiées, **pas encore intégrées** au catalogue central |
| Mercenary Commands FR.pdf | 4 | 33 | Commandement — catalogué pour mémoire, **volontairement hors moteur** |
| Battle Cards FR MAJ23.02.2026.pdf | 5 | 24 + 1 catégorie non couverte | Objectif/Secondaire/Avantage — **déjà couvert** par `battleCards.ts` |
| BattleForces FR 23.02.2026.pdf | 13 | 12 | Livret de règles (listes d'armée thématiques) — **informatif seul**, hors schéma carte |
| Nouvelles cartes amélio 07.25 VF - fantrad.pdf | 1 | 6 (dont 5 remplacées) | Améliorations — **superседée** par la version Fév. 2026 |
| Nouvelles cartes amélio FR MAJ23.02.2026.pdf | 3 | 10 | Améliorations + déblocages de personnages — version retenue |
| Galactic Empire Units FR.pdf | 11 | 1 entrée résumé | **100 % déjà certifié** dans le catalogue central, aucun écart |
| Galactic Empire Upgrades FR.pdf | 13 | 7 écarts | 7 cartes identifiées non encore certifiées |
| Rebel Alliance Units FR.pdf | 11 | 1 entrée résumé | **100 % déjà certifié** dans le catalogue central, aucun écart |
| Rebel Alliance Upgrades FR.pdf | 13 | 8 écarts | 8 cartes identifiées non encore certifiées |
| Generic Upgrades FR.pdf | 22 | 38 | **Contenu identique** à `general upgrade FR couleur.pdf` (même 22 pages, même cartes) |
| *(general upgrade FR couleur.pdf)* | *22* | *fusionné ci-dessus* | Même source que Generic Upgrades FR — un seul travail d'extraction pour les deux |

**Total : 185 entrées cataloguées dans le manifeste**, couvrant les 13 PDF demandés
(hors Galactic Empire Commands FR, exclu sur demande).

## 2. Doublons identifiés

- **Generic Upgrades FR.pdf ≡ general upgrade FR couleur.pdf** : mêmes 22 pages, mêmes
  cartes dans le même ordre (vérifié page par page). Traités comme une seule source
  dans le manifeste pour éviter un double travail.
- **Nouvelles cartes amélio (2 versions)** : la version « MAJ23.02.2026 » reprend et
  affine le texte de « 07.25 VF - fantrad » pour les cartes communes (Chef de Groupe
  de Combat, Objectif de Mission, Agent de Confiance, Marche Impériale, Terreur).
  5 cartes de l'ancienne version (Retranchés, Sérénité, Réserves Supplémentaires,
  Clairvoyance, Module de Ciblage Avancé, Mitrailleurs de Bord) n'apparaissent pas
  dans la nouvelle et sont marquées « remplacée, non reprise » — à revalider si
  l'utilisateur confirme qu'elles restent en usage.
- **Dans les planches à découper** (Mercenary Units/Upgrades/Commands, Empire/Rebel
  Units/Upgrades) : chaque carte physique est imprimée 3 à 9 fois par planche pour la
  découpe. Dédupliquées après comparaison visuelle des variantes (texte/dés
  identiques) ; une seule entrée par carte réellement distincte dans le manifeste.
- **« Le Sabre Noir »** : carte unique partagée par Maul (déjà en catalogue, lot
  Mercenaire) et Sabine Wren (vue dans Rebel Alliance Upgrades FR, page 13) — une
  seule entrée catalogue à terme, pas un doublon à créer.

## 3. Cartes ajoutées à ce lot

Aucune nouvelle entrée n'a été ajoutée à `customCards.json` / `cardNamesFr.ts` /
`cardImages.ts` dans ce lot. Ce lot est un **audit** : il produit le manifeste, le
test de non-régression et ce rapport, sans modifier les données moteur existantes
(conformément à la consigne « n'invente aucune donnée incertaine »). Les compléments
de catalogue identifiés ci-dessous restent pour un prochain lot, une fois les dés
recontrôlés avec la même rigueur que pour les 18 unités Mercenaires (voir la note du
14/09 dans `docs/ROADMAP.md` sur le bug de rotation).

## 4. Cartes encore incertaines (« à vérifier »)

**88 entrées** du manifeste portent `statutVerification: "a_verifier"`. Le détail
complet est dans le manifeste ; les plus importantes :

### Écarts confirmés contre le catalogue central (15 cartes, dés lus mais couleurs non recontrôlées)
- **Empire (7)** : Stormtrooper avec HH-12, Soldat avec DLT-19D (Death Troopers),
  •DT-F16, Capitaine Stormtrooper, Droïde Médical FX-9, Lance-mortier de TR-TT,
  Astromech R4.
- **Rebelle (8)** : Wookie avec Arme d'Épaule, Duelliste avec Beskad, Capitaine
  Soldat Rebelle, Wookie avec Arbalète, •Ryder Azadi, Harpon Magnétique Mo/Dk,
  •Électro-Grappin (Sabine Wren), •Blaster SE-14 de Jyn.

### Mercenary Upgrades (24 cartes, lues cette session, jamais certifiées)
Soldat avec Électro-fouet, déblocage Capo/Fantassin, Disrupteur P13-M, Fusil à
Dispersion, Rook Kast, Paire de Pistolets Blaster, Carabine Blaster, Entraînement au
Combat (Gar Saxon), Pistolet Blaster de Gar, Bouclier de Combat/Fusil Galar-90/
Roquettes Dorsales de Saxon, Le Sabre Noir, Programmation « Nounou »/« Prime »
(IG-11), Lance en Beskar/Fusil Amban/Jetpack (Din Djarin), Crosshair, Hunter, Tech,
Echo, Wrecker.

### Generic Upgrades / general upgrade FR couleur (~20 cartes sans arme)
Évitement et Couvert, Stimulants d'Urgence, Endurance, En Chasse, Poussée
Offensive, Données de Reconnaissance, Matériel Préparé, Lunette de Visée, Repérage,
Protecteur, Conscience de la Situation, Système de Commande, Brouilleur Comms, Unité
de Piratage Comms, Système de Visée Jumelé, Protocoles d'Attaque, Canal Comms de
Bord, Grenades à Concussion/Anti-droïdes EMP/à Impact, Imploseurs Soniques, Grenades
Fumigènes, **Guidé par la Force** (aucune entrée catalogue du tout, contrairement à
Force Barrier/Push/Reflexes déjà mappées).

### Écart de traduction repéré en cours d'audit
« Lead by Example » est déjà mappé vers **« Meneur d'Hommes »** dans le catalogue,
alors que le visuel lu cette session affiche **« Donner l'Exemple »** — à trancher
avant toute correction (laquelle est la traduction officielle actuelle ?).

## 5. Cartes volontairement hors moteur

- **35 entrées** `statutDonneesMoteur: "hors_moteur"` :
  - **33 cartes de Commandement Mercenaire** (Mercenary Commands FR.pdf) — décision
    déjà actée dans ce fil : pas d'écran de consultation dédié pour l'instant.
  - **12 « Forces de Bataille »** (BattleForces FR.pdf) — ce sont des livrets de
    règles (listes d'armée thématiques telles que « 212e Bataillon d'Attaque » ou
    « Collectif de l'Ombre »), pas des cartes : aucun dé, aucune figurine, aucun
    visuel individuel à cadrer. 2 des 12 (212e Bataillon, 501e Légion) décrivent la
    faction **République**, non supportée par l'appli (`armyFaction` limité à
    rebel/empire/mercenary) ; 2 autres (Droïdes Expérimentaux, Invasion Séparatiste)
    concernent la faction **Séparatiste**, également non supportée.
  - **Galactic Empire Commands FR.pdf** dans son intégralité — exclu de l'audit à la
    demande explicite de l'utilisateur (faction non jouée).
  - **Catégorie « Embuscade / Poussée / Assaut / Tenir la Position »** (Battle Cards
    FR, page 4) — 4 cartes qui ne correspondent à aucune des trois catégories déjà
    modélisées (Objectif/Secondaire/Avantage) dans `battleCards.ts` ; mécanique de
    déploiement/réserve à clarifier avant toute intégration, volontairement laissée
    de côté dans ce lot pour ne pas construire à l'aveugle.

## 6. Ce qui est déjà solide (aucune action requise)

- **Galactic Empire Units FR.pdf** (11 pages) et **Rebel Alliance Units FR.pdf**
  (11 pages) : chaque carte comparée individuellement au catalogue existant —
  **100 % déjà certifiées**, aucun écart. Couvre notamment tous les héros
  (Luke, Han, Leia, Chewbacca, Vador, Krennic, Veers...), tous les troopers de base
  et tous les véhicules terrestres/répulseurs usuels.
- **Battle Cards FR.pdf** : Objectif, Secondaire et Avantage déjà présents dans
  `battleCards.ts` à l'identique (24 cartes vérifiées).
- Le test `scripts/test-pdf-catalog-manifest.mjs` (nouveau, intégré à
  `npm run build`) protège ces constats : toute carte marquée « connue » dans le
  manifeste doit continuer à se résoudre dans le catalogue central, et les 18
  visuels Mercenaires doivent rester raccordés — une régression future ferait
  échouer le build.
