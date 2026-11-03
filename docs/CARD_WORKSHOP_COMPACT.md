# Cartes FR compactes — 1 novembre 2026

Format commun conseillé : **68 × 98 mm**, 8 cartes par feuille A4 (2 colonnes × 4 lignes). Les unités peuvent être tournées sur la planche pour remplir le papier. Après découpe, chaque exemplaire possède exactement un recto et un verso. Le verso ne contient que les définitions des mots-clés ; il reste vierge si la carte n’en a aucun.

## Imprimer et ranger

1. Imprimer d’abord Calibration_68x98_A4.pdf : A4 portrait, taille réelle 100 %, recto verso **bord long**, sans ajustement à la page ni en-têtes/pieds de page.
2. Vérifier par transparence que chaque numéro recto rejoint le même numéro verso. Régler si nécessaire le décalage propre à l’imprimante.
3. Imprimer le lot avec ces mêmes réglages, découper sur les pointillés, ranger dans des pochettes acceptant au moins 68 × 98 mm. Le format dépasse les pochettes classiques de 63 × 88 mm.

## Lots fournis

| Lot exact du dépôt | Cartes physiques | Feuilles A4 recto verso | Pages PDF |
|---|---:|---:|---:|
| Antoine - Empire Moff G. (1000 points) | 37 | 5 | 10 |
| Rebelle - Simon 3 (1001 points dans la source) | 37 | 5 | 10 |
| Bibliothèque complète, un exemplaire par modèle | 478 | 60 | 120 |

Les armées proviennent de scripts/data/real-lists/empire-moff-gideon.json et rebelles-simon-3.json ; unités, améliorations, sept commandements et doublons sont conservés. Aucun élément Rebelle n’a été inventé ni ajusté pour modifier le total de points. Les 478 modèles incluent les cartes historiques déjà présentes ; leur présence n’établit pas leur légalité actuelle. Les avertissements restent dans l’interface. 145 versos sont volontairement vierges.

## Définitions et sources

Les 156 définitions existantes ont une version courte ; Tough, absent de la base, a été ajouté avec une traduction locale « Coriace ». Les déclenchements, coûts, valeurs et restrictions sont conservés. Ce sont des aides condensées en français, relues par IA, pas une traduction française publiée par AMG ni une certification humaine. Le texte intégral et ses références restent accessibles dans l’atelier.

Source principale : [règlement officiel AMG du 17 juin 2026](https://cdn.svc.asmodee.net/production-amgcom/uploads/2026/06/DOC56_SWQ_Rulebook-2.pdf), pages indiquées dans Definitions_courtes_FR.md. [Index officiel](https://www.atomicmassgames.com/swlegiondocs/), vérifié le 1 novembre 2026. [Tough, présentation officielle du 10 septembre 2026](https://www.atomicmassgames.com/transmission/scene-to-stats-han-chewie-notorious-scoundrels/).

L’audit de [LegionHQ2](https://legionhq2.com/cards) porte sur ses 197 entrées : 190 noms de mots-clés, 3 types d’unité et 4 sous-règles. Toutes disposent d’une définition FR dans la base ou les rubriques correspondantes. Des correspondances erronées ont été corrigées, notamment Overrun/Bordée et Hold the Line/Tenir bon. Ce contrôle de présence ne prétend pas recertifier tous les anciens textes de la base. Les règles AMG priment.

## Contrôles réalisés

Essai navigateur sur les 478 modèles : zéro débordement au format 68 × 98 mm ; taille minimale 7,5 pt (9 pt Empire, 8 pt Rebelles). Vérification de chaque paire et des positions miroir, y compris pages partielles et orientations mixtes. PDF contrôlés pour leurs nombres de faces, pages et titres de mots-clés ; pages rendues et examinées visuellement. L’alignement physique dépend de votre imprimante : la calibration n’a pas été imprimée matériellement ici.

Le format classique 62 × 88 mm reste proposé (9 cartes/A4), mais 11 modèles trop denses nécessitent un format supérieur ; aucun texte n’est coupé et aucun verso de suite n’est créé. Le format 90 × 128 mm propose 4 cartes/A4 avec davantage de confort.

## Mise en œuvre

workshopCompactKeywords.json trace les sources par page et empreinte du texte intégral ; cardWorkshopText.ts applique les paramètres sans remplacer le X des autres mots-clés. cardWorkshopPrint.ts groupe toutes les orientations sur une grille commune et reflète les colonnes au verso (bord long). La bibliothèque entière sélectionne un modèle de chaque carte, dans la limite de 600 exemplaires. Les trois types d’unité restent consultables dans les sources, hors du dos réservé aux mots-clés.

Tests : test:workshop-compact vérifie couverture HQ, empreintes des 156 définitions sources, paramètres indépendants, variante aérienne, grilles et appariement recto verso. Les mesures navigateur et PDF locaux complètent ces tests.

Validation finale : `npm run verify` terminé avec succès le 01/11/2026 (tests moteur, contrats, imports, 77 parcours, ateliers, audits, TypeScript, build et PWA). L’aperçu de la bibliothèque complète dans l’interface confirme 478 cartes / 60 feuilles / 120 pages et 7,5 pt minimum.
