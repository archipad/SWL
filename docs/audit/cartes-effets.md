# Effets propres aux cartes d’amélioration : où chacun est pris en charge

Généré par `node scripts/audit-card-effects.mjs` (sondes réelles dans jsdom). Une carte à icône ↱ ou ✖ ne peut pas rester en simple rappel : son état (prête / inclinée / supprimée) doit être suivi.

99 cartes à effet propre · 59 sondes rejouées dans l’Assistant.

| Carte | ↱ / ✖ | Traitement | Où | Remarque |
|---|---|---|---|---|
| Fournitures Supplémentaires | ✖ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Colère | — | Panneau d’attaque | étape(s) 6 (bouton) |  |
| Câbles Ascensionnels | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Baron Rudor | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Générateur de Barrage | ↱ | Panneau d’attaque | étape(s) 1 (bouton) |  |
| Wookie avec Bouclier de Combat | — | Carte retournable | bouton « Retourner la carte » (mots-clés, vitesse et courage selon la face) |  |
| Homme de Main du Soleil Noir | — | Rappel (briefing) | briefing tactique | conserve Cache si la figurine est vaincue : rappelé dans le briefing |
| Boba Fett, Daimyo de Mos Espa | — | Rappel (briefing) | briefing tactique | carte Unité : type d’unité Soldat Mandalorien (erratum 17/06/2026), rappelé dans le briefing |
| Boba Fett, Infâme Chasseur de Primes | — | Rappel (briefing) | briefing tactique | carte Unité : type d’unité Soldat Mandalorien (erratum 17/06/2026), rappelé dans le briefing |
| Pointe de Vitesse | ✖ | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Électro-Gantelets | — | Rappel (briefing) | briefing tactique | règle de déplacement engagé rappelée dans le briefing |
| Capitaine Rex | — | Panneau d’attaque | étape(s) 6 (rappel) |  |
| Cassian Andor | — | Carte retournable | bouton « Retourner la carte » (mots-clés, vitesse et courage selon la face) |  |
| Clairvoyance | ✖ | Panneau d’attaque | étape(s) 5 (bouton) |  |
| Câbles d'Escalade | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Armure de Combat | — | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Chef de Groupe de Combat | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Système de Commande | — | Rappel (briefing) | briefing tactique | règle permanente de la porteuse (portée de Coordination 2), rappelée dans le briefing |
| Unité de Piratage Comms | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Brouilleur Comms | — | Rappel (briefing) | briefing tactique | agit sur les unités ennemies proches : rappelé dans le briefing des unités ennemies |
| Crosshair | — | Panneau d’attaque | étape(s) 1 (rappel) |  |
| Posture Défensive | — | Carte retournable | bouton « Retourner la carte » (mots-clés, vitesse et courage selon la face) |  |
| Fusil Amban de Din | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Jetpack de Din | — | Statistique | vitesse / courage de la fiche |  |
| Effroi | — | Panneau d’attaque | étape(s) 6 (bouton) |  |
| Évitement et Couvert | — | Panneau d’attaque | étape(s) 3 (bouton) |  |
| Stimulants d'Urgence | ↱ | Panneau d’attaque | étape(s) 5, 6 (bouton) |  |
| Transpondeur d'Urgence | ✖ | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Endurance | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Retranché | — | Panneau d’attaque | étape(s) 3 (rappel) |  |
| Contrôle de Tir | — | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Barrière de la Force | ↱ | Panneau d’attaque | étape(s) 4 (bouton) |  |
| Strangulation de la Force | ↱ | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Guidé par la Force | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Poussée de la Force | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Réflexes de la Force | ↱ | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Grenades à Fragmentation | — | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Gar Saxon | — | Rappel (briefing) | briefing tactique | carte Unité : type d’unité Soldat Mandalorien (erratum 17/06/2026), rappelé dans le briefing |
| Surcharge du Générateur | ↱ | Panneau d’attaque | étape(s) 1 (bouton) |  |
| •Gideon Hask | — | Statistique | vitesse / courage de la fiche |  |
| Gouverneur Pryce | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Frappe et Fuite | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Liaison HQ | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Hunter | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Programmation « Nounou » | — | Rappel (briefing) | briefing tactique | mots-clés gagnés (IA) ; règle de création d’armée rappelée dans le briefing |
| Programmation « Prime » | — | Rappel (briefing) | briefing tactique | mots-clés gagnés (Prime, IA) ; effet lié au rang choisi rappelé dans le briefing |
| Technicien Comms Impérial | — | Construction de liste | — | contrainte de construction (amélioration Comms obligatoire) |
| Pilote de l'Unité d'Élite Blindée Imperial Hammers | — | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Marche Impériale | ✖ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Officier Impérial | — | Statistique | vitesse / courage de la fiche |  |
| Pilote de TIE Impérial | — | Statistique | vitesse / courage de la fiche |  |
| Ordres Improvisés | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Dans la Mêlée | — | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Entraînement de l'Inquisitorius | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Présence Inspirante | — | Panneau d’attaque | étape(s) 6 (rappel) |  |
| Agent Kallus | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Kraken | — | Panneau d’attaque | étape(s) 1, 2 (rappel) |  |
| Super Commandos Mandaloriens | — | Rappel (briefing) | briefing tactique | carte Unité : type d’unité Soldat Mandalorien (erratum 17/06/2026), rappelé dans le briefing |
| Objectif de Mission | ↱ | Panneau d’attaque | étape(s) 2 (bouton) |  |
| Artilleurs Montés | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Posture Offensive | — | Carte retournable | bouton « Retourner la carte » (mots-clés, vitesse et courage selon la face) |  |
| Poussée Offensive | ↱ | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Vieille Ruse Jedi | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| En Chasse | — | Panneau d’attaque | étape(s) 2 (bouton) |  |
| À Bout Portant | — | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Loyauté Programmée | — | Rappel (briefing) | briefing tactique | restriction d’ordres rappelée dans le briefing |
| Protecteur | ↱ | Panneau d’attaque | étape(s) 4 (bouton) |  |
| Saboteur avec Charge à Protons | — | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Fantassin du Syndicat Pyke | — | Rappel (briefing) | briefing tactique | conserve Cache si la figurine est vaincue : rappelé dans le briefing |
| Tireur Embusqué Rebelle | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Technicien Comms Rebelle | — | Construction de liste | — | contrainte de construction (amélioration Comms obligatoire) |
| Officier Rebelle | — | Statistique | vitesse / courage de la fiche |  |
| Capitaine Soldat Rebelle | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Spécialiste Soldat Rebelle | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Médecin d'un Monde Reculé | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Blaster Répétiteur | — | Statistique | vitesse / courage de la fiche |  |
| Ryder Azadi | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Sabre Lancé | — | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Électro-grappin | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Sabine Wren | — | Rappel (briefing) | briefing tactique | carte Unité : type d’unité Soldat Mandalorien (erratum 17/06/2026), rappelé dans le briefing |
| Saisir l'Opportunité | ✖ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Sérénité | ↱ / ✖ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Shriv Suurgav | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Astromech | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Grenades Fumigènes | ✖ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Saboteur avec Charge Sonique | — | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Liaison d'Observateur | — | Panneau d’attaque | étape(s) 1 (bouton) |  |
| Capitaine Stormtrooper | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Tireur Embusqué Stormtrooper | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Spécialiste Stormtrooper | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Ordres Stricts | — | Rappel (briefing) | briefing tactique | agit sur les unités alliées : rappelé dans leur briefing |
| Super Commando Mandalorien | — | Rappel (briefing) | briefing tactique | conserve Cache si la figurine est vaincue : rappelé dans le briefing |
| Ténacité | — | Automatique | calcul de l’attaque / de la défense / bouton dédié |  |
| Agent de Confiance | ✖ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Tacticien Peu Orthodoxe | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Astromech Instable | ✖ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Vigilance | — | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Wedge Antilles | ↱ | Bouton (fiche d’unité) | fiche d’unité · automatismes |  |
| Wrecker | — | Rappel (briefing) | briefing tactique | protection de l’Alter Ego Omega rappelée dans le briefing |
