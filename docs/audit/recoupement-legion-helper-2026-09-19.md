# Recoupement du référentiel avec Legion Helper — 2026-09-19

> Deuxième avis automatique, **pas une vérité** : un écart peut venir de l’appli, du site ou d’un appariement de mots-clés. Chaque écart se tranche sur la carte physique / le visuel (docs/PROCESSUS-VERIFICATION.md). Aucune donnée du site n’est copiée dans le dépôt.

## Résumé

- Site : 105 cartes Unité, 464 cartes Amélioration, 195 mots-clés d’unité / d’arme / d’amélioration.
- Appli : 281 cartes avec étiquettes, 199 mots-clés, 300 profils d’armes.
- Cartes appariées par le nom : **136** (les autres portent un nom différent des deux côtés : à apparier à la main).
- Mots-clés du site : 195, dont 176 appariés à l’appli via scripts/data/takras-keyword-map.json (12 « probables », à confirmer). **Non appariés : 19.**
- Appariements contredits par les cartes communes : **10** ; ids de la table inconnus de l’appli : **0**.
- **Écarts de mots-clés** sur les cartes appariées (mots-clés à appariement sûr) : **20**.
- **Écarts de caractéristiques** (figurines, PV, dés de défense, armes) : **13**.

## Écarts de mots-clés par carte

### DF-90 Mortar Trooper (unité) — clé appli `df 90 mortar trooper`
- Sur le site mais **absent de l’appli** : fixed → fixe

### Imperial Special Forces (unité) — clé appli `imperial special forces`
- Sur le site mais **absent de l’appli** : equip → equipe, retinue_x → escorte

### E-Web Heavy Blaster Team (unité) — clé appli `e web heavy blaster team`
- Sur le site mais **absent de l’appli** : fixed → fixe

### Major Marquand (unité) — clé appli `major marquand`
- Valeur différente : impact-x : site 1 / appli —

### •The Darksaber (amélioration) — clé appli `the darksaber`
- Dans l’appli mais **absent du site** : immunite-perforant-corps-a-corps
- Valeur différente : perforant-x : site 1 / appli 2 ; impact-x : site 1 / appli 2
- Non comparés (appariement à confirmer) : immune, melee

### Mandalorian Resistance (unité) — clé appli `mandalorian resistance`
- Sur le site mais **absent de l’appli** : retinue_x → escorte, equip → equipe

### Chewbacca (unité) — clé appli `chewbacca`
- Sur le site mais **absent de l’appli** : charge → charge

### •Sabine Wren (amélioration) — clé appli `sabine wren`
- Sur le site mais **absent de l’appli** : leader → chef
- Dans l’appli mais **absent du site** : saut-x, pistolero, insensible, agile, perforant-x

### Ahsoka Tano (unité) — clé appli `ahsoka tano`
- Sur le site mais **absent de l’appli** : shien_mastery → maitrise-du-shien, associate → associe, independent_x → autonome, scout_x → eclaireur-x
- Dans l’appli mais **absent du site** : charge, defense-x
- Valeur différente : perforant-x : site 1 / appli 2

### AT-RT (unité) — clé appli `at rt`
- Sur le site mais **absent de l’appli** : critical_x → critique-x

### 1.4 FD Laser Cannon Team (unité) — clé appli `1 4 fd laser cannon team`
- Sur le site mais **absent de l’appli** : impact_x → impact-x, fixed → fixe

### Protector (amélioration) — clé appli `protector`
- Sur le site mais **absent de l’appli** : guardian_x → gardien-x

### Engagement Protocols (amélioration) — clé appli `engagement protocols`
- Dans l’appli mais **absent du site** : ia

### Barrage Generator (amélioration) — clé appli `barrage generator`
- Sur le site mais **absent de l’appli** : fixed → fixe

### Kraken (unité) — clé appli `kraken`
- Sur le site mais **absent de l’appli** : strategize_x → stratege-x, charge → charge, exemplar → exemplaire, sharpshooter_x → tireur-delite-x, lethal_x → letal-x
- Non comparés (appariement à confirmer) : override

### Pyke Syndicate Capo (amélioration) — clé appli `pyke syndicate capo`
- Sur le site mais **absent de l’appli** : leader → chef
- Dans l’appli mais **absent du site** : mercenaire, aide, intuition-du-danger-x, autonome

### Black Sun Vigo (amélioration) — clé appli `black sun vigo`
- Sur le site mais **absent de l’appli** : leader → chef
- Dans l’appli mais **absent du site** : mercenaire, intrepide

### •Din Djarin (amélioration) — clé appli `din djarin`
- Sur le site mais **absent de l’appli** : this_is_the_way → telle-est-la-voie, leader → chef
- Dans l’appli mais **absent du site** : mercenaire, arsenal-x, prime, insensible, autonome, tacticien-x, longue-distance, polyvalent
- Valeur différente : letal-x : site 1 / appli —

### The Bad Batch (unité) — clé appli `the bad batch`
- Dans l’appli mais **absent du site** : mercenaire

### •Crosshair (amélioration) — clé appli `crosshair`
- Sur le site mais **absent de l’appli** : critical_x → critique-x
- Valeur différente : perforant-x : site 1 / appli —

## Écarts de caractéristiques

### DF-90 Mortar Trooper — `df 90 mortar trooper`
- armes (dés@portée) : site [1n@melee ; 2n@3-4] / appli []

### Imperial Special Forces — `imperial special forces`
- figurines : site 1 / appli 4
- armes (dés@portée) : site [1n@1-3 ; 1r@melee] / appli [1n@1-3 ; 1n@melee]

### E-Web Heavy Blaster Team — `e web heavy blaster team`
- armes (dés@portée) : site [1r+2b+2n@1-4 ; 2b@1-3 ; 2n@melee] / appli []

### Dewback Rider — `dewback rider`
- armes (dés@portée) : site [3b+3r@melee] / appli []

### Iden Versio — `iden versio`
- armes (dés@portée) : site [1n+2b+2r@1-3 ; 2n@1-6 ; 3n@melee] / appli [1n+2b+2r@1-3 ; 2n@1-# ; 3n@melee]

### Major Marquand — `major marquand`
- armes (dés@portée) : site [1b+1n+1r@melee ; 2b+2n+2r@1-4 ; 2n@melee] / appli [1b+1n+1r@1-3 ; 2b+2n+2r@1-4 ; 2n@1-2]

### Agent Kallus — `agent kallus`
- armes (dés@portée) : site [1r+3n@melee] / appli [1r+3n@1-2]

### Fleet Troopers — `fleet troopers`
- armes (dés@portée) : site [2b@melee] / appli [2b@melee-2]

### Mandalorian Resistance — `mandalorian resistance`
- figurines : site 1 / appli 3
- armes (dés@portée) : site [2n@melee] / appli [2n@1-2]

### R2-D2 — `r2 d2`
- armes (dés@portée) : site [3b@melee] / appli [3b@1]

### Ahsoka Tano — `ahsoka tano`
- armes (dés@portée) : site [3b+5n@melee] / appli [2b+2n+2r@melee]

### AT-RT — `at rt`
- dés de défense : site rouge / appli blanc
- armes (dés@portée) : site [1n+2b@1-3 ; 3r@melee] / appli [2b@1-3 ; 3r@melee]

### The Bad Batch — `the bad batch`
- figurines : site 0 / appli 1

## Contrôle de la table d’appariement

- `ai_action` → `ia` : 0 carte(s) en commun, 0 avec le mot-clé du site seul, 1 avec celui de l’appli seul
- `aid` → `aide` : 0 carte(s) en commun, 0 avec le mot-clé du site seul, 1 avec celui de l’appli seul
- `associate` → `associe` : 0 carte(s) en commun, 1 avec le mot-clé du site seul, 0 avec celui de l’appli seul
- `defend_x` → `defense-x` : 0 carte(s) en commun, 0 avec le mot-clé du site seul, 1 avec celui de l’appli seul
- `independent_x` → `autonome` : 2 carte(s) en commun, 1 avec le mot-clé du site seul, 2 avec celui de l’appli seul
- `mercenary` → `mercenaire` : 0 carte(s) en commun, 0 avec le mot-clé du site seul, 4 avec celui de l’appli seul
- `shien_mastery` → `maitrise-du-shien` : 0 carte(s) en commun, 1 avec le mot-clé du site seul, 0 avec celui de l’appli seul
- `this_is_the_way` → `telle-est-la-voie` : 0 carte(s) en commun, 1 avec le mot-clé du site seul, 0 avec celui de l’appli seul
- `strategize_x` → `stratege-x` : 0 carte(s) en commun, 1 avec le mot-clé du site seul, 0 avec celui de l’appli seul
- `versatile` → `polyvalent` : 0 carte(s) en commun, 0 avec le mot-clé du site seul, 1 avec celui de l’appli seul

## Mots-clés du site et leur prise en compte dans l’appli

| Mot-clé (site) | Cartes | Mot-clé appli | Confiance | Prise en compte par le moteur |
|---|---|---|---|---|
| Advanced Targeting: Unit Type X | 2 | Ciblage Avancé : Type d'Unité X (`ciblage-avance`) | sur | assisté |
| Agile X | 5 | Preste X (`preste-x`) | sur | affichage / vérification humaine |
| AI: Action | 12 | IA : Action (`ia`) | sur | affichage / vérification humaine |
| Aid: Affiliation | 5 | Aide : Affiliation/Type d'Unité (`aide`) | sur | affichage / vérification humaine |
| Aim | 2 | à confirmer : `cache` (Cache) | — | — |
| Allies of Convenience | 4 | Alliés de Circonstance (`allies-de-circonstance`) | sur | affichage / vérification humaine |
| Anti-Materiel X | 3 | Anti-matériel X (`anti-materiel-x`) | sur | automatique |
| Anti-Personnel X | 2 | Anti-personnel X (`anti-personnel-x`) | sur | automatique |
| Arm X | 0 | Armer X : Type de Charge (`armer-x`) | sur | affichage / vérification humaine |
| Armor X | 19 | Armure / Armure X (`armure-x`) | sur | automatique |
| Arsenal X | 11 | Arsenal X (`arsenal-x`) | sur | assisté |
| Assault X | 2 | Assaut X (`assaut-x`) | sur | assisté |
| Associate: Unit Name | 1 | Associé : Nom d'Unité (`associe`) | sur | affichage / vérification humaine |
| Ataru Mastery | 0 | Maîtrise de l'Ataru (`maitrise-de-lataru`) | sur | automatique |
| Attack Run | 1 | Attaque Impétueuse (`attaque-impetueuse`) | sur | affichage / vérification humaine |
| Bane Tokens | 0 | Pions Bane (Cad Bane) (`pions-bane`) | sur | affichage / vérification humaine |
| Barrage | 0 | Barrage (`barrage`) | sur | assisté |
| Beam X | 2 | Rayons X (`rayons-x`) | sur | assisté |
| Blast | 29 | Déflagration (`deflagration`) | sur | automatique |
| Block | 5 | Blocage (`blocage`) | sur | automatique |
| Bolster X | 3 | **non apparié** | — | — |
| Bounty | 2 | Prime (`prime`) | probable | affichage / vérification humaine |
| Cache | 6 | Cache (`cache`) | sur | affichage / vérification humaine |
| Calculate Odds | 5 | Calcul de Probabilités (`calcul-de-probabilites`) | sur | affichage / vérification humaine |
| capacity_x | 7 | à confirmer : `non-combattant` (Non-combattant) | — | — |
| Charge | 34 | Charge (`charge`) | sur | assisté |
| Climbing | 1 | **non apparié** | — | — |
| Climbing Vehicle | 5 | Véhicule Grimpant (`vehicule-grimpant`) | sur | affichage / vérification humaine |
| Clone Trooper | 2 | **non apparié** | — | — |
| Command Vehicle X | 3 | **non apparié** | — | — |
| Compel: Rank/Unit Type | 9 | Contrainte : Rang/Type d'Unité (`contrainte`) | sur | affichage / vérification humaine |
| Complete the Mission | 2 | Accomplir la Mission (`accomplir-la-mission`) | sur | automatique |
| Coordinate: Type/Name | 8 | Coordination : Nom/Type d'Unité (`coordination`) | sur | affichage / vérification humaine |
| Counterpart | 2 | Alter Ego : Nom d'Unité (`alter-ego`) | probable | affichage / vérification humaine |
| Cover | 1 | **non apparié** | — | — |
| Cover X | 7 | Couvert X (`couvert-x`) | sur | assisté |
| Covert Ops | 0 | Opérations Secrètes (`operations-secretes`) | sur | affichage / vérification humaine |
| Critical X | 36 | Critique X (`critique-x`) | sur | automatique |
| Cumbersome | 8 | Encombrant (`encombrant`) | sur | automatique |
| Cunning | 3 | Malin (`malin`) | sur | affichage / vérification humaine |
| Cycle | 6 | Cycle (`cycle`) | sur | affichage / vérification humaine |
| Danger Sense | 2 | Intuition du Danger X (`intuition-du-danger-x`) | sur | assisté |
| Dauntless | 3 | Intrépide (`intrepide`) | sur | affichage / vérification humaine |
| Death From Above | 3 | La Mort Venue du Ciel (`la-mort-venue-du-ciel`) | sur | automatique |
| Defend X | 4 | Défense X (`defense-x`) | sur | affichage / vérification humaine |
| Deflect | 14 | Déflexion (`deflexion`) | sur | automatique |
| Demoralize X | 11 | Démoraliser X (`demoraliser-x`) | sur | affichage / vérification humaine |
| Detachment: Name/Type | 6 | Détachement : Nom/Type d'Unité (`detachement`) | sur | affichage / vérification humaine |
| Detonate X (Charge Type) | 0 | Explosion X : Type de Charge (`explosion-x`) | sur | assisté |
| Direct Name/Type | 12 | Ordre Direct : Nom/Type d'Unité (`ordre-direct`) | sur | affichage / vérification humaine |
| Disciplined X | 1 | Discipliné X (`discipline-x`) | sur | affichage / vérification humaine |
| Disengage | 4 | Retrait (`retrait`) | sur | affichage / vérification humaine |
| Distract | 2 | Distraire (`distraire`) | sur | affichage / vérification humaine |
| Divine Influence | 0 | Influence Divine (`influence-divine`) | sur | assisté |
| Divulge | 0 | Divulgation (`divulgation`) | sur | affichage / vérification humaine |
| Djem So Mastery | 1 | Maîtrise du Djem So (`maitrise-du-djem-so`) | sur | automatique |
| Dodge | 3 | à confirmer : `cache` (Cache) | — | — |
| Droid Trooper | 2 | **non apparié** | — | — |
| Duelist | 8 | Duelliste (`duelliste`) | sur | automatique |
| Emplacement Trooper | 1 | à confirmer : `coordination` (Coordination : Nom/Type d'Unité) | — | — |
| Enrage X | 2 | Enragé X (`enrage-x`) | sur | affichage / vérification humaine |
| Entourage: Unit Name | 4 | Entourage : Nom d'Unité (`entourage`) | sur | affichage / vérification humaine |
| Equip | 15 | Équipe (`equipe`) | sur | affichage / vérification humaine |
| Exemplar | 10 | Exemplaire (`exemplaire`) | sur | assisté |
| Expert Climber | 3 | Grimpeur Expérimenté (`grimpeur-experimente`) | sur | affichage / vérification humaine |
| Eyes on the Prize: Keyword | 0 | Tenir le Cap : Mot-clé (`tenir-le-cap`) | sur | affichage / vérification humaine |
| Field Commander | 10 | Commandant des Opérations (`commandant-des-operations`) | sur | affichage / vérification humaine |
| Fire Support | 2 | Tir de Soutien (`tirs-de-soutien`) | sur | assisté |
| Fixed: Front/Sides/Rear | 37 | Fixe : Avant/Arrière/Flancs (`fixe`) | sur | assisté |
| Flexible Response X | 3 | Riposte Graduée X (`riposte-graduee-x`) | sur | affichage / vérification humaine |
| Full Pivot | 2 | Pivot Complet (`pivot-complet`) | sur | affichage / vérification humaine |
| guardian_x | 8 | Gardien X (`gardien-x`) | sur | assisté |
| guidance | 3 | Conseils : Type d'Unité (`conseils`) | sur | affichage / vérification humaine |
| gunslinger | 6 | Pistolero (`pistolero`) | sur | assisté |
| heavy_weapon_team | 2 | Équipe avec Arme Lourde (`equipe-avec-arme-lourde`) | sur | affichage / vérification humaine |
| high_velocity | 12 | Haute Vélocité (`haute-velocite`) | sur | automatique |
| hover_x | 4 | Sustentation : Terrestre/Aérienne X (`sustentation`) | sur | affichage / vérification humaine |
| I'm Part of the Squad Too | 0 | Je Fais Partie de l'Équipe Aussi (`je-fais-aussi-partie-de-lequipe`) | sur | affichage / vérification humaine |
| Immobilize X | 5 | Immobiliser X (`immobiliser-x`) | sur | automatique |
| immune | 4 | à confirmer : `demoraliser-x` (Démoraliser X) | — | — |
| Immune: Blast | 3 | Immunité : Déflagration (`immunite-deflagration`) | sur | automatique |
| Immune: Deflect | 0 | Immunité : Déflexion (`immunite-deflexion`) | sur | automatique |
| Immune: Enemy Effects | 0 | Immunité : Effets Ennemis (`immunite-effets-ennemis`) | sur | affichage / vérification humaine |
| Immune: Melee | 2 | Immunité : Corps-à-Corps (`immunite-corps-a-corps`) | sur | automatique |
| Immune: Melee Pierce | 9 | Immunité : Perforant au Corps-à-Corps (`immunite-perforant-corps-a-corps`) | sur | automatique |
| Immune: Pierce | 23 | Immunité : Perforant (`immunite-perforant`) | sur | automatique |
| Immune: Range 1 Weapons | 3 | Immunité : Armes Portée 1 (`immunite-armes-portee-1`) | sur | automatique |
| Impact X | 101 | Impact X (`impact-x`) | sur | automatique |
| Impervious | 3 | Insensible (`insensible`) | probable | automatique |
| Incognito | 4 | Incognito (`incognito`) | sur | assisté |
| Inconspicious | 2 | Discret (`discret`) | probable | assisté |
| Independent: Token X/Action | 12 | Autonome : Pion X/Action (`autonome`) | sur | affichage / vérification humaine |
| Indomitable | 12 | Indomptable (`indomptable`) | sur | affichage / vérification humaine |
| Infiltrate | 14 | Infiltration (`infiltration`) | sur | affichage / vérification humaine |
| Inspire X | 18 | Inspiration X (`inspiration-x`) | sur | affichage / vérification humaine |
| Interrogate | 1 | Interrogatoire (`interrogatoire`) | sur | affichage / vérification humaine |
| Ion X | 6 | Ion X (`ion-x`) | sur | automatique |
| jedi_hunter | 2 | Chasseur de Jedi (`chasseur-de-jedi`) | sur | automatique |
| jump_x | 17 | Saut X (`saut-x`) | sur | affichage / vérification humaine |
| juyo_mastery | 1 | Maîtrise du Juyo (`maitrise-du-juyo`) | sur | affichage / vérification humaine |
| Latent Power | 0 | Pouvoir Latent (`pouvoir-latent`) | sur | affichage / vérification humaine |
| Leader | 49 | Chef (`chef`) | sur | affichage / vérification humaine |
| Lethal X | 25 | Létal X (`letal-x`) | sur | automatique |
| Long Shot | 11 | Longue Distance (`longue-distance`) | sur | automatique |
| Low Profile | 9 | Profil Bas (`profil-bas`) | sur | automatique |
| Makashi Mastery | 1 | Maîtrise du Makashi (`maitrise-du-makashi`) | sur | automatique |
| Mandalorians Are Stronger Together | 2 | Les Mandaloriens sont Plus Forts Ensemble (`les-mandaloriens-sont-plus-forts-ensemble`) | sur | assisté |
| Marksman | 6 | Tireur Embusqué (`tireur-embusque`) | probable | automatique |
| Master of the Force | 11 | Maître de la Force X (`maitre-de-la-force-x`) | sur | affichage / vérification humaine |
| Master Storyteller | 0 | Maître Conteur (`maitre-conteur`) | sur | affichage / vérification humaine |
| Mechanized Infantry | 1 | Infanterie Mécanisée (`infanterie-mecanisee`) | sur | affichage / vérification humaine |
| Melee | 1 | à confirmer : `demoraliser-x` (Démoraliser X) | — | — |
| Melee Pierce | 2 | **non apparié** | — | — |
| Mercenary: Faction | 0 | Mercenaire : Faction (`mercenaire`) | sur | affichage / vérification humaine |
| Mobile | 1 | Mobile (`mobile`) | sur | affichage / vérification humaine |
| Nimble | 8 | Agile X (`agile`) | sur | automatique |
| Noncombatant | 8 | Non-combattant (`non-combattant`) | sur | assisté |
| Observe X | 8 | Surveillance X (`surveillance-x`) | probable | assisté |
| One Step Ahead | 2 | Longueur d'Avance (`longueur-davance`) | sur | affichage / vérification humaine |
| Outmaneuver | 5 | Manœuvre Improbable (`manoeuvre-improbable`) | sur | automatique |
| Override | 3 | **non apparié** | — | — |
| Overrun X | 6 | Surcharge X (`surcharge`) | probable | affichage / vérification humaine |
| Overwhelm | 10 | Débordement (`debordement`) | probable | automatique |
| Permanent | 0 | Permanent (`permanent`) | sur | affichage / vérification humaine |
| Pierce X | 61 | Perforant X (`perforant-x`) | sur | automatique |
| Plodding | 1 | Mobilité Difficile (`mobilite-difficile`) | probable | affichage / vérification humaine |
| Poison X | 2 | Poison X (`poison-x`) | sur | automatique |
| Precise X | 9 | Précis X (`precis-x`) | sur | automatique |
| Prepared Positions | 9 | Position Préparée (`position-preparee`) | sur | affichage / vérification humaine |
| Primitive | 0 | Primitif (`primitif`) | sur | automatique |
| Programmed | 4 | Programmé (`programme`) | sur | affichage / vérification humaine |
| Pulling the Strings | 1 | Tirer les Ficelles (`tirer-les-ficelles`) | sur | affichage / vérification humaine |
| quick_thinking | 2 | Vivacité d'Esprit (`vivacite-desprit`) | sur | affichage / vérification humaine |
| Ram | 6 | Bélier X (`belier-x`) | sur | automatique |
| Recharge X | 8 | Recharger X (`recharger-x`) | sur | affichage / vérification humaine |
| Reconfigure | 6 | Reconfiguration (`reconfiguration`) | sur | affichage / vérification humaine |
| Reinforcements | 2 | Renforts (`renforts`) | sur | affichage / vérification humaine |
| Relentless | 8 | Implacable (`implacable`) | sur | assisté |
| Reliable X | 10 | Fiable X (`fiable-x`) | sur | affichage / vérification humaine |
| Repair X: Capacity Y | 7 | Réparation X : Capacité Y (`reparation-x`) | sur | affichage / vérification humaine |
| Reposition | 13 | Redéploiement (`redeploiement`) | sur | affichage / vérification humaine |
| Resiliency | 1 | **non apparié** | — | — |
| Restore | 0 | Restaurer (`restauration`) | sur | affichage / vérification humaine |
| Retinue: Unit/Unit Type | 9 | Escorte : Nom/Type d'Unité (`escorte`) | probable | affichage / vérification humaine |
| Ruthless | 1 | Impitoyable (`impitoyable`) | sur | affichage / vérification humaine |
| Scale | 15 | Ascension (`ascension`) | sur | affichage / vérification humaine |
| Scatter | 10 | Dispersion (`dispersion`) | sur | automatique |
| Scout X | 12 | Éclaireur X (`eclaireur-x`) | sur | affichage / vérification humaine |
| Scouting Party X | 2 | Équipe d'Éclaireurs X (`equipe-declaireurs-x`) | sur | affichage / vérification humaine |
| Secret Mission | 3 | Mission Secrète (`mission-secrete`) | sur | affichage / vérification humaine |
| Self-Destruct X | 2 | Autodestruction X (unité) (`autodestruction-x-unite`) | probable | assisté |
| Self-Preservation | 1 | Instinct de Survie (`instinct-de-survie`) | sur | affichage / vérification humaine |
| Sentinel | 5 | Sentinelle (`sentinelle`) | sur | affichage / vérification humaine |
| Sharpshooter | 25 | Tireur d'Élite X (`tireur-delite-x`) | sur | automatique |
| Shielded X | 12 | Bouclier X (`bouclier-x`) | sur | automatique |
| Shien Mastery | 1 | Maîtrise du Shien (`maitrise-du-shien`) | sur | automatique |
| Sidearm | 15 | Arme de Poing : Corps-à-Corps/à Distance (`arme-de-poing`) | sur | assisté |
| Small | 0 | Petit (`petit`) | sur | assisté |
| Smoke X | 1 | Fumée X (`fumee-x`) | sur | assisté |
| Sniper Team | 2 | Équipe Sniper (`equipe-sniper`) | sur | assisté |
| Soresu Mastery | 1 | Maîtrise du Soresu (`maitrise-du-soresu`) | sur | automatique |
| Special Issue: Battle Force | 6 | Spécificité : Force Armée (`specificite`) | sur | affichage / vérification humaine |
| Speeder X | 6 | Speeder X (`speeder-x`) | sur | affichage / vérification humaine |
| Spotter X | 5 | Observateur X (`observateur-x`) | sur | affichage / vérification humaine |
| Spray | 8 | Souffle (`souffle`) | probable | automatique |
| Spur | 6 | Marche Forcée (`marche-forcee`) | sur | affichage / vérification humaine |
| Stationary | 1 | Stationnaire (`stationnaire`) | sur | affichage / vérification humaine |
| Steady | 6 | Aguerri (`aguerri`) | sur | affichage / vérification humaine |
| Strafe Move | 0 | **non apparié** | — | — |
| Strategize X | 5 | Stratège X (`stratege-x`) | sur | affichage / vérification humaine |
| Suppressive | 35 | Suppressif (`suppressif`) | sur | automatique |
| Swashbuckler | 0 | Matamore (`matamore`) | sur | automatique |
| Tactical X | 10 | Tacticien X (`tacticien-x`) | sur | affichage / vérification humaine |
| Take Cover X | 3 | Mettre à Couvert X (`mettre-a-couvert-x`) | sur | affichage / vérification humaine |
| Target X | 6 | Cible X (`cible-x`) | sur | affichage / vérification humaine |
| Teamwork: Unit Name | 2 | Travail d'Équipe : Nom d'Unité (`travail-dequipe`) | sur | affichage / vérification humaine |
| Tempted | 1 | Tentation (`tentation`) | sur | affichage / vérification humaine |
| This is the Way | 4 | Telle est la Voie (`telle-est-la-voie`) | sur | affichage / vérification humaine |
| Tough | 2 | **non apparié** | — | — |
| Tow Cable | 1 | Câble de Remorquage (`cable-de-remorquage`) | sur | automatique |
| Transport | 7 | Transport (`transport`) | sur | affichage / vérification humaine |
| Treat X | 5 | Traiter X : Capacité Y (`traiter-x`) | sur | affichage / vérification humaine |
| Trooper | 4 | à confirmer : `coordination` (Coordination : Nom/Type d'Unité) | — | — |
| uncanny_luck_x | 4 | Coup de Chance X (`coup-de-chance-x`) | sur | automatique |
| unconcerned | 1 | Indifférent (`indifferent`) | sur | automatique |
| unhindered | 10 | Sans Entrave (`sans-entrave`) | sur | affichage / vérification humaine |
| unstoppable | 1 | Inarrêtable (`inarretable`) | sur | affichage / vérification humaine |
| upgrading_dice | 5 | **non apparié** | — | — |
| vaapad_mastery | 4 | Maîtrise du Vaapad (`maitrise-du-vaapad`) | sur | assisté |
| versatile | 3 | Polyvalent (`polyvalent`) | sur | assisté |
| victory_or_death | 1 | La Victoire ou la Mort (`la-victoire-ou-la-mort`) | sur | assisté |
| We Fight for Our Family | 1 | Nous nous Battons pour notre Famille (`nous-nous-battons-pour-notre-famille`) | sur | assisté |
| We're Not Regs | 1 | Nous Ne Sommes Pas des Regs (`on-est-pas-des-regs`) | sur | affichage / vérification humaine |
| Weak Point X | 7 | Point Faible X : Avant/Arrière/Flancs (`point-faible-x`) | sur | automatique |
| Weighed Down | 2 | Alourdi (`alourdissement`) | sur | affichage / vérification humaine |

## Mots-clés de l’appli sans équivalent apparié côté site (23)

`aleas-x` (Aléas X) · `autoritaire` (Autoritaire) · `assistance-x` (Assistance X) · `blessure-x` (Blessure X) · `cloue-au-sol` (Cloué au Sol) · `defaut` (Défaut) · `generateur-x` (Générateur X) · `je-sens-le-profit` (Je Sens le Profit) · `maitrise-du-jarkai` (Maîtrise du Jar'Kai) · `mode-roue` (Mode Roue) · `operationnel-x` (Opérationnel X) · `paquetage` (Paquetage) · `pilotage-de-vehicule-x` (Pilotage de Véhicule X) · `regenerer-x` (Régénérer X) · `deplacement-obligatoire` (Déplacement Obligatoire) · `tenir-bon` (Tenir Bon) · `transport-x` (Transport X : Ouvert/Fermé) · `transport-leger-x` (Transport Léger X : Ouvert/Fermé) · `traque` (Traqué) · `arme-a-effet-de-zone` (Arme à Effet de Zone) · `autodestruction-x-arme` (Autodestruction X (arme)) · `bordee-x` (Bordée X) · `pions-graffiti` (Pions Graffiti)
