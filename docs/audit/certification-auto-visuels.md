# Audit des visuels locaux — certification automatique β

Généré le 2026-10-21 depuis les fichiers du dépôt (aucun accès réseau). Tabletop Admiral ne fournit que des métadonnées ; seuls les fichiers du dépôt sont des visuels.

## 1. Visuels locaux

- `public/cards/` : **299 visuels français** (recadrés des PDF FR).
- `public/commandcards/` : **82 cartes de Commandement françaises**.
- `public/cards/auto-certification/en/` : **0 visuels anglais** extraits des PDF officiels AMG (cdn.svc.asmodee.net), identifiés par OCR du titre.
- `public/cards/auto-certification/fr/` : **44 cartes françaises** extraites des PDF du disque (37 identifiées, 7 à contrôler), dont 16 reliées aux métadonnées.
- Table explicite d’alias : 30 commandements (27 confirmés, 3 proposés) et 3 carte(s).

### Cartes françaises extraites « À contrôler »

| Carte | PDF | Page | Raison |
|---|---|---|---|
| La Menace Fantôme | Mercenary Commands FR.pdf | 1 | titre lu « IA MENACE FANTÔME » (0.867) |
| Tracer son Chemin dans la Galaxie | Mercenary Commands FR.pdf | 3 | identifiée par élimination |
| Agent Kallus (déblocage) | Nouvelles cartes amélio FR MAJ23.02.2026.pdf | 3 | doublon possible de `public/cards/kallus-the-operative.jpg` |
| Capitaine Clone Rex (déblocage) | Nouvelles cartes amélio FR MAJ23.02.2026.pdf | 3 | doublon possible de `public/cards/captain-rex.jpg` |
| Cassian Andor (déblocage, variante) | Nouvelles cartes amélio FR MAJ23.02.2026.pdf | 3 | doublon possible de `public/cards/cassian-andor-operative.jpg` |
| Frappe et Repli | Nouvelles cartes amélio FR MAJ23.02.2026.pdf | 1 | doublon possible de `public/cards/hit-and-run.jpg` |
| Terreur | Nouvelles cartes amélio FR MAJ23.02.2026.pdf | 1 | doublon possible de `public/cards/dread.jpg` |

## 2. Couverture du catalogue de métadonnées

962 cartes Tabletop Admiral (version 2026.10.20.0).

| Type | Cartes | Visuel FR local | Visuel EN local | Prêtes pour validation |
|---|---|---|---|---|
| unité | 203 | 88 | 17 | 17 |
| amélioration | 508 | 208 | 33 | 32 |
| commandement | 251 | 99 | 10 | 10 |

## 3. File de préparation des listes

### Fixture Empire complète (`tabletop-admiral-empire.json`)

10 cartes · métadonnées **9/10** · EN local **8/10** · FR local **9/10** · prêtes pour validation **8/10**.

| Carte | Type | Métadonnées | EN local | FR local | Traduction | Mots-clés nouveaux | Prête |
|---|---|---|---|---|---|---|---|
| Stormtroopers | unité | ✓ unit:5 | ✓ `auto-certification/en/unit-5-stormtroopers.jpg` | ✓ `stormtroopers.jpg` | ✓ Stormtroopers | — | ✓ |
| RT-97C Stormtrooper | amélioration | ✓ upgrade:121 | ✓ `auto-certification/en/upgrade-121-rt-97c-stormtrooper.jpg` | ✓ `rt-97c-stormtrooper.jpg` | ✓ Stormtrooper avec RT-97C | — | ✓ |
| Stormtrooper | amélioration | ✓ upgrade:14 | ✓ `auto-certification/en/upgrade-14-stormtrooper.jpg` | ✓ `stormtrooper.jpg` | ✓ Stormtrooper | — | ✓ |
| Impact Grenades | amélioration | ✓ upgrade:30 | ✓ `auto-certification/en/upgrade-30-impact-grenades.jpg` | ✓ `impact-grenades.jpg` | ✓ Grenades à Impact | — | ✓ |
| Snowtroopers | unité | ✓ unit:7 | ✓ `auto-certification/en/unit-7-snowtroopers.jpg` | ✓ `snowtroopers.jpg` | ✓ Snowtroopers | — | ✓ |
| T-7 Ion Snowtrooper | amélioration | ✓ upgrade:21 | ✗ à rechercher | ✓ `t-7-ion-snowtrooper.jpg` | ✓ Snowtrooper avec T-7 à Ions | — | ✗ |
| Snowtrooper Squad Expansion | amélioration | ✗ introuvables | ✗ à rechercher | ✗ | ✗ | — | ✗ |
| Darth Vader Dark Lord of the Sith | unité | ✓ unit:3 | ✓ `auto-certification/en/unit-3-darth-vader-dark-lord-of-the-sith.jpg` | ✓ `darth-vader-dark-lord-of-the-sith.jpg` | ✓ Dark Vador, Seigneur Noir des Sith | — | ✓ |
| Force Reflexes | amélioration | ✓ upgrade:10 | ✓ `auto-certification/en/upgrade-10-force-reflexes.jpg` | ✓ `force-reflexes.jpg` | ✓ Réflexes de la Force | — | ✓ |
| Tenacity | amélioration | ✓ upgrade:54 | ✓ `auto-certification/en/upgrade-54-tenacity.jpg` | ✓ `tenacity.jpg` | ✓ Ténacité | — | ✓ |

Cartes encore sans visuel anglais ou français : T-7 Ion Snowtrooper (EN), Snowtrooper Squad Expansion (EN + FR).

### Fixture Rebelles complète (`tabletop-admiral-rebel.json`)

11 cartes · métadonnées **11/11** · EN local **11/11** · FR local **11/11** · prêtes pour validation **11/11**.

| Carte | Type | Métadonnées | EN local | FR local | Traduction | Mots-clés nouveaux | Prête |
|---|---|---|---|---|---|---|---|
| Chewbacca Walking Carpet | unité | ✓ unit:25 | ✓ `auto-certification/en/unit-25-chewbacca-walking-carpet.jpg` | ✓ `chewbacca.jpg` | ✓ Chewbacca | — | ✓ |
| Tenacity | amélioration | ✓ upgrade:54 | ✓ `auto-certification/en/upgrade-54-tenacity.jpg` | ✓ `tenacity.jpg` | ✓ Ténacité | — | ✓ |
| Duck and Cover | amélioration | ✓ upgrade:33 | ✓ `auto-certification/en/upgrade-33-duck-and-cover.jpg` | ✓ `evasive-cover.jpg` | ✓ Évitement et Couvert | — | ✓ |
| Rebel Troopers | unité | ✓ unit:6 | ✓ `auto-certification/en/unit-6-rebel-troopers.jpg` | ✓ `rebel-troopers.jpg` | ✓ Soldats Rebelles | — | ✓ |
| Z-6 Trooper | amélioration | ✓ upgrade:16 | ✓ `auto-certification/en/upgrade-16-z-6-trooper.jpg` | ✓ `z-6-trooper.jpg` | ✓ Soldat avec Z-6 | — | ✓ |
| Rebel Trooper | amélioration | ✓ upgrade:12 | ✓ `auto-certification/en/upgrade-12-rebel-trooper.jpg` | ✓ `rebel-trooper.jpg` | ✓ Soldat Rebelle | — | ✓ |
| Fragmentation Grenades | amélioration | ✓ upgrade:57 | ✓ `auto-certification/en/upgrade-57-fragmentation-grenades.jpg` | ✓ `fragmentation-grenades.jpg` | ✓ Grenades à Fragmentation | — | ✓ |
| Rebel Veterans | unité | ✓ unit:36 | ✓ `auto-certification/en/unit-36-rebel-veterans.jpg` | ✓ `rebel-veterans.jpg` | ✓ Vétérans Rebelles | — | ✓ |
| CM-0/93 Trooper | amélioration | ✓ upgrade:98 | ✓ `auto-certification/en/upgrade-98-cm-0-93-trooper.jpg` | ✓ `cm-o93-trooper.jpg` | ✓ Soldat avec CM-O/93 | — | ✓ |
| Rebel Veteran | amélioration | ✓ upgrade:76 | ✓ `auto-certification/en/upgrade-76-rebel-veteran.jpg` | ✓ `rebel-veteran.jpg` | ✓ Vétéran Rebelle | — | ✓ |
| Situational Awareness | amélioration | ✓ upgrade:172 | ✓ `auto-certification/en/upgrade-172-situational-awareness.jpg` | ✓ `situational-awareness.jpg` | ✓ Conscience de la Situation | — | ✓ |

Cartes encore sans visuel anglais ou français : aucune.

## 4. Sources

1. **Fichiers du dépôt** : `public/cards/`, `public/commandcards/` et la table explicite `src/data/autoCertificationAliases.json`.
2. **PDF français du disque** (`App Web SWL V2`) : `npm run extract:auto-certification-fr`.
3. **PDF officiels AMG/Asmodee** (`cdn.svc.asmodee.net`, liste blanche `scripts/data/auto-certification-sources.json`) : `npm run fetch:auto-certification-assets -- liste.json`.
4. Tabletop Admiral : métadonnées uniquement ; ses images ne sont jamais utilisées.
