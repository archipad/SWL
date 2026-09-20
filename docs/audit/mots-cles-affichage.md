# Où chaque mot-clé s’affiche dans l’Assistant

Généré par `node scripts/audit-keyword-surfacing.mjs` : pour chaque mot-clé du glossaire, une carte qui le porte est chargée dans le vrai Assistant (jsdom), on relève les écrans où son nom apparaît.
S1 = armes & portée, S2 = jet & relances, S3 = couvert & esquive, S4 = modifications (Impact/Armure…), S5 = défense, S6 = résumé, POPUP = pop-up de fin d’attaque.

| Mot-clé | Combat | Carte testée | Fiche d’unité | Écrans d’attaque où il apparaît | Remarque |
|---|---|---|---|---|---|
| Accomplir la Mission | attaque | (aucune carte) | — | — |  |
| Agile | défense | iden versio | **non** | S1, S2, S3, S4, S5, S6 |  |
| Aguerri |  | snowtroopers | oui | — |  |
| Aide : Affiliation/Type d'Unité |  | pyke syndicate capo | oui | — |  |
| Alliés de Circonstance |  | lando calrissian | oui | — |  |
| Aléas X |  | (aucune carte) | — | — |  |
| Alourdi |  | (aucune carte) | — | — |  |
| Alter Ego : Nom d'Unité |  | iden s id10 seeker droid | oui | — |  |
| Ascension |  | range troopers | oui | — |  |
| Autoritaire |  | (aucune carte) | — | — |  |
| Armure / Armure X | défense | at st | **non** | S1, S2, S3, S4, S5, S6 |  |
| Arsenal X | attaque | at st | oui | S1, S2, S3, S4, S5, S6 |  |
| Assistance X |  | (aucune carte) | — | — |  |
| Associé : Nom d'Unité |  | the seventh sister | oui | — |  |
| Attaque Impétueuse |  | (aucune carte) | — | — |  |
| Autodestruction X (unité) | attaque | (aucune carte) | — | — |  |
| Autonome : Pion X/Action |  | jyn erso | oui | — |  |
| Barrage | attaque | (aucune carte) | — | — |  |
| Blessure X |  | maul a rival | oui | — |  |
| Blocage | défense | the fifth brother | **non** | S1, S2, S3, S4, S5, S6 |  |
| Bouclier X | défense | iden s id10 seeker droid | oui | S1, S2, S3, S4, S5, S6 |  |
| Cache |  | prepared materiel | oui | — |  |
| Calcul de Probabilités |  | k 2so | oui | — |  |
| Charge | attaque | stormtrooper riot squad | oui | S1, S2, S3, S4, S5, S6 |  |
| Chasseur de Jedi | attaque | darth vader the emperor s apprentice | oui | S1, S2, S3, S4, S5, S6 |  |
| Ciblage Avancé : Type d'Unité X | attaque | range troopers | oui | S1, S2, S3, S4, S5, S6 |  |
| Cloué au Sol |  | (aucune carte) | — | — |  |
| Cible X |  | linked targeting array | oui | — |  |
| Commandant des Opérations |  | cassian andor | oui | — |  |
| Conseils : Type d'Unité |  | general veers | oui | — |  |
| Contrainte : Rang/Type d'Unité |  | darth vader dark lord of the sith | oui | — |  |
| Coordination : Nom/Type d'Unité |  | shoretroopers | oui | — |  |
| Coup de Chance X | défense | lando calrissian | **non** | S1, S2, S3, S4, S5, S6 |  |
| Couvert X | défense | 74 z speeder bikes | **non** | S1, S2, S3, S4, S5, S6 |  |
| Défense X |  | ahsoka tano | oui | — |  |
| Défaut |  | (aucune carte) | — | — |  |
| Déflexion | défense | darth vader dark lord of the sith | **non** | S1, S2, S3, S4, S5, S6 |  |
| Démoraliser X |  | the darksaber | oui | — |  |
| Détachement : Nom/Type d'Unité |  | scout troopers strike team | oui | — |  |
| Discipliné X |  | imperial death troopers | oui | — |  |
| Discret | défense | r2 d2 | oui | S1, S2, S3, S4, S5, S6 |  |
| Distraire |  | c 3po | oui | — |  |
| Duelliste | attaque | wookiee warriors freedom fighters | oui | S1, S2, S3, S4, S5, S6 |  |
| Éclaireur X |  | scout troopers | oui | — |  |
| Équipe d'Éclaireurs X |  | (aucune carte) | — | — |  |
| Enragé X |  | the fifth brother | oui | — |  |
| Entourage : Nom d'Unité |  | director orson krennic | oui | — |  |
| Équipe |  | imperial special forces inferno squad | oui | — |  |
| Équipe avec Arme Lourde |  | scout troopers strike team | oui | — |  |
| Exemplaire | attaque | general veers | oui | S1, S2, S3, S4, S5, S6 |  |
| Escorte : Nom/Type d'Unité |  | imperial special forces inferno squad | oui | — |  |
| Fiable X |  | imperial special forces | oui | — |  |
| Fumée X | défense | smoke grenades | oui | S1, S2, S3, S4, S5, S6 |  |
| Gardien X | défense | chewbacca | oui | S1, S2, S3, S4, S5, S6 |  |
| Générateur X |  | (aucune carte) | — | — |  |
| Grimpeur Expérimenté |  | at rt | oui | — |  |
| IA : Action |  | imperial hammers elite armor pilot | oui | — |  |
| Immunité : Armes Portée 1 | défense | laat le patrol transport | oui | S1, S2, S3, S4, S5, S6 |  |
| Immunité : Corps-à-Corps | défense | laat le patrol transport | oui | S1, S2, S3, S4, S5, S6 |  |
| Immunité : Déflagration | défense | laat le patrol transport | oui | S1, S2, S3, S4, S5, S6 |  |
| Immunité : Effets Ennemis |  | (aucune carte) | — | — |  |
| Immunité : Perforant | défense | darth vader dark lord of the sith | oui | S1, S2, S3, S4, S5, S6 |  |
| Immunité : Perforant au Corps-à-Corps | défense | agent kallus | **non** | S1, S2, S3, S4, S5, S6 |  |
| Impitoyable |  | moff gideon | oui | — |  |
| Implacable | attaque | darth vader dark lord of the sith | oui | S1, S2, S3, S4, S5, S6 |  |
| Inarrêtable |  | dark trooper squad | oui | — |  |
| Incognito | défense | k 2so | **non** | S1, S2, S3, S4, S5, S6 |  |
| Indifférent | défense | dark trooper squad | oui | S1, S2, S3, S4, S5, S6 |  |
| Indomptable |  | range troopers | oui | — |  |
| Infanterie Mécanisée |  | (aucune carte) | — | — |  |
| Infiltration |  | imperial special forces | oui | — |  |
| Influence Divine | défense | (aucune carte) | — | — |  |
| Insensible | défense | mandalorian resistance | **non** | S1, S2, S3, S4, S5, S6 |  |
| Inspiration X |  | general veers | oui | — |  |
| Instinct de Survie |  | pyke syndicate foot soldiers | oui | — |  |
| Interrogatoire |  | agent kallus | oui | — |  |
| Intrépide |  | the fifth brother | oui | — |  |
| Intuition du Danger X | défense | cassian andor | **non** | S1, S2, S3, S4, S5, S6 |  |
| Je Fais Partie de l'Équipe Aussi |  | omega | oui | — |  |
| Je Sens le Profit |  | (aucune carte) | — | — |  |
| La Mort Venue du Ciel | attaque | (aucune carte) | — | — |  |
| La Victoire ou la Mort | défense | (aucune carte) | — | — |  |
| Les Mandaloriens sont Plus Forts Ensemble | attaque | (aucune carte) | — | — |  |
| Longueur d'Avance |  | lando calrissian | oui | — |  |
| Maître Conteur |  | (aucune carte) | — | — |  |
| Maître de la Force X |  | darth vader dark lord of the sith | oui | — |  |
| Maîtrise de l'Ataru | attaque | (aucune carte) | — | — |  |
| Maîtrise du Djem So | défense | (aucune carte) | — | — |  |
| Maîtrise du Jar'Kai | attaque | ahsoka tano | oui | S1, S2, S3, S4, S5, S6 |  |
| Maîtrise du Juyo |  | maul a rival | oui | — |  |
| Maîtrise du Makashi | attaque | (aucune carte) | — | — |  |
| Maîtrise du Shien | défense | (aucune carte) | — | — |  |
| Maîtrise du Soresu | défense | (aucune carte) | — | — |  |
| Maîtrise du Vaapad | attaque | (aucune carte) | — | — |  |
| Malin |  | director orson krennic | oui | — |  |
| Manœuvre Improbable | défense | situational awareness | **non** | S1, S2, S3, S4, S5, S6 |  |
| Marche Forcée |  | dewback rider | oui | — |  |
| Matamore | attaque | (aucune carte) | — | — |  |
| Mercenaire : Faction |  | boba fett infamous bounty hunter | oui | — |  |
| Mettre à Couvert X |  | leia organa | oui | — |  |
| Mission Secrète |  | r2 d2 | oui | — |  |
| Mobile |  | (aucune carte) | — | — |  |
| Mobilité Difficile |  | dark trooper squad | oui | — |  |
| Mode Roue |  | (aucune carte) | — | — |  |
| Nous nous Battons pour notre Famille | attaque | (aucune carte) | — | — |  |
| Observateur X |  | general veers | oui | — |  |
| Nous Ne Sommes Pas des Regs |  | the bad batch | oui | — |  |
| Opérationnel X |  | imperial death troopers | oui | — |  |
| Opérations Secrètes |  | (aucune carte) | — | — |  |
| Ordre Direct : Nom/Type d'Unité |  | agent kallus | oui | — |  |
| Paquetage |  | (aucune carte) | — | — |  |
| Pilotage de Véhicule X |  | (aucune carte) | — | — |  |
| Pistolero | attaque | sabine wren | oui | S1, S2, S3, S4, S5, S6 |  |
| Pivot Complet |  | df 90 mortar trooper | oui | — |  |
| Point Faible X : Avant/Arrière/Flancs | défense | at st | **non** | S1, S2, S3, S4, S5, S6 |  |
| Position Préparée |  | shoretroopers | oui | — |  |
| Pouvoir Latent |  | grogu | oui | — |  |
| Précis X | attaque | imperial death troopers | oui | S1, S2, S3, S4, S5, S6 |  |
| Preste X |  | rebel troopers | oui | — |  |
| Prime |  | agent kallus | oui | — |  |
| Profil Bas | défense | scout troopers | **non** | S1, S2, S3, S4, S5, S6 |  |
| Programmé |  | ig 11 | oui | — |  |
| Recharger X |  | iden s id10 seeker droid | oui | — |  |
| Redéploiement |  | df 90 mortar trooper | oui | — |  |
| Régénérer X |  | bossk terror of trandosha | oui | — |  |
| Renforts |  | swoop bike riders | oui | — |  |
| Retrait |  | luke skywalker jedi knight | oui | — |  |
| Riposte Graduée X |  | stormtrooper heavy gunner squad | oui | — |  |
| Sans Entrave |  | stormtrooper heavy gunner squad | oui | — |  |
| Saut X |  | the seventh sister | oui | — |  |
| Sentinelle |  | df 90 mortar trooper | oui | — |  |
| Spécificité : Force Armée |  | stormtrooper heavy gunner squad | oui | — |  |
| Speeder X |  | 74 z speeder bikes | oui | — |  |
| Déplacement Obligatoire |  | (aucune carte) | — | — |  |
| Stationnaire |  | 1 4 fd laser cannon team | oui | — |  |
| Stratège X |  | (aucune carte) | — | — |  |
| Surcharge X |  | (aucune carte) | — | — |  |
| Surveillance X | attaque | moff gideon | oui | S1, S2, S3, S4, S5, S6 |  |
| Sustentation : Terrestre/Aérienne X |  | laat le patrol transport | oui | — |  |
| Tacticien X |  | moff gideon | oui | — |  |
| Telle est la Voie |  | (aucune carte) | — | — |  |
| Tenir Bon | attaque | stormtrooper riot squad | oui | S1, S2, S3, S4, S5, S6 |  |
| Tenir le Cap : Mot-clé |  | (aucune carte) | — | — |  |
| Tentation |  | (aucune carte) | — | — |  |
| Tirer les Ficelles |  | (aucune carte) | — | — |  |
| Tireur d'Élite X | attaque | scout troopers | oui | S1, S2, S3, S4, S5, S6 |  |
| Tireur Embusqué | attaque | imperial special forces | oui | S1, S2, S3, S4, S5, S6 |  |
| Tir de Soutien | attaque | df 90 mortar trooper | oui | S1 | bloqué : ⛔ BLOQUÉSélectionnez la portée mesurée. |
| Transport |  | tx 225 occupier tank | oui | — |  |
| Transport X : Ouvert/Fermé | attaque | (aucune carte) | — | — |  |
| Transport Léger X : Ouvert/Fermé |  | (aucune carte) | — | — |  |
| Traqué |  | grogu | oui | — |  |
| Travail d'Équipe : Nom d'Unité |  | chewbacca | oui | — |  |
| Véhicule Grimpant |  | at rt | oui | — |  |
| Vivacité d'Esprit |  | iden versio | oui | — |  |
| Anti-matériel X | attaque | (aucune carte) | — | — |  |
| Anti-personnel X | attaque | (aucune carte) | — | — |  |
| Arme à Effet de Zone | attaque | (aucune carte) | — | — |  |
| Armer X : Type de Charge |  | (aucune carte) | — | — |  |
| Assaut X | attaque | (aucune carte) | — | — |  |
| Autodestruction X (arme) | attaque | (aucune carte) | — | — |  |
| Bélier X | attaque | tauntaun riders | oui | S1, S2, S3, S4, S5, S6 |  |
| Bordée X | attaque | swoop bike riders | oui | S1, S2, S3, S4, S5, S6 |  |
| Câble de Remorquage | attaque | mo dk power harpoon | oui | S1, S2, S3, S4, S5, S6 |  |
| Critique X | attaque | iden versio | oui | S1, S2, S3, S4, S5, S6 |  |
| Débordement | attaque | (aucune carte) | — | — |  |
| Déflagration | attaque | major marquand | oui | S1, S2, S3, S4, S5, S6 |  |
| Dispersion | attaque | anti bunker shells | oui | S1, S2, S3, S4, S5, POPUP, S6 |  |
| Encombrant | attaque | mark ii medium blaster trooper | oui | S1, S2, S3, S4, S5, S6 |  |
| Équipe Sniper | attaque | (aucune carte) | — | — |  |
| Explosion X : Type de Charge | attaque | (aucune carte) | — | — |  |
| Fixe : Avant/Arrière/Flancs | attaque | at st | oui | S1, S2, S3, S4, S5, S6 |  |
| Haute Vélocité | attaque | iden versio | oui | S1, S2, S3, S4, S5, S6 |  |
| Immobiliser X | attaque | din djarin amban rifle | oui | S1, S2, S3, S4, S5, S6 |  |
| Immunité : Déflexion | attaque | (aucune carte) | — | — |  |
| Impact X | attaque | 74 z speeder bikes | oui | S1, S2, S3, S4, S5, S6 |  |
| Ion X | attaque | emp grenades | oui | S1, S2, S3, S4, S5, POPUP, S6 |  |
| Létal X | attaque | chewbacca | oui | S1, S2, S3, S4, S5, S6 |  |
| Longue Distance | attaque | cassian andor operative | oui | S1, S2, S3, S4, S5, S6 |  |
| Perforant X | attaque | bowcaster wookiee | oui | S1, S2, S3, S4, S5, S6 |  |
| Poison X | attaque | (aucune carte) | — | — |  |
| Polyvalent | attaque | boba fett infamous bounty hunter | oui | S1, S2, S3, S4, S5, S6 |  |
| Primitif | attaque | (aucune carte) | — | — |  |
| Rayons X | attaque | (aucune carte) | — | — |  |
| Souffle | attaque | din djarin flamethrower | oui | S1, S2, S3, S4, S5, S6 |  |
| Suppressif | attaque | jyn erso | oui | S1, S2, S3, S4, S5, S6 |  |
| Arme de Poing : Corps-à-Corps/à Distance | attaque | kallus the operative | oui | S1, S2, S3, S4, S5, S6 |  |
| Chef |  | imperial officer | oui | — |  |
| Cycle |  | sm 9 dark trooper | oui | — |  |
| Divulgation |  | (aucune carte) | — | — |  |
| Non-combattant | attaque | fx 9 medical droid | oui | S1, S2, S3, S4, S5, S6 |  |
| Permanent |  | (aucune carte) | — | — |  |
| Petit | défense | iden s id10 seeker droid | **non** | S1, S2, S3, S4, S5, POPUP, S6 |  |
| Pions Bane (Cad Bane) |  | (aucune carte) | — | — |  |
| Pions Graffiti |  | (aucune carte) | — | — |  |
| Reconfiguration |  | e 11d focused strike config | oui | — |  |
| Réparation X : Capacité Y |  | r2 d2 | oui | — |  |
| Restaurer |  | (aucune carte) | — | — |  |
| Traiter X : Capacité Y |  | fx 9 medical droid | oui | — |  |
