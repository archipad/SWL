# Feuille de route

## Dernier lot prêt à valider

- [x] Ajouter la faction Mercenaire (18 unités : Syndicat Pyke, Soleil Noir, Gar Saxon, Maul, Boba Fett (2 versions), Bossk, Cad Bane, IG-88, IG-11, Din Djarin, Grogu, Super Commandos Mandaloriens, Le Bad Batch, Omega) avec visuels, profils de dés et effectifs certifiés — voir `verificationSource` dans `customCards.json` pour la provenance (planches PDF fournies par l'utilisateur, lecture visuelle IA à spot-checker en jouant).
- [x] Corriger `unitModels.ts` qui ne fusionnait pas `CUSTOM_CARDS` (contrairement à `diceProfiles.ts`/`cardImages.ts`/`cardNamesFr.ts`) : toute carte ajoutée uniquement via l'écran « Nouvelle carte » se voyait signalée à tort « Effectif impossible à calculer avec certitude ».
- [x] Corrigé (14/09/2026, signalement utilisateur) : les 18 visuels Mercenaire étaient recadrés à 90° du sens de lecture (contenu du PDF source imprimé pivoté), sans que ça saute aux yeux à la relecture — d'où aussi plusieurs couleurs/valeurs de dés mal lues (ex. Boba Fett, IG-88, Bossk, Vigo du Soleil Noir). Re-recadrage correct (rotation + marge anti-bavure, format paysage cohérent avec le reste du catalogue) et toutes les réserves de dés des 18 unités relues une par une sur les visuels corrigés.
- [ ] Cartes Amélioration de la faction Mercenaire (une trentaine : débloquages d'unité, équipements, armes des personnages) — non incluses dans ce lot faute de nom Tabletop Admiral fiable à vérifier ; à ajouter une fois une liste Mercenaire réellement exportée de Tabletop Admiral disponible pour confirmer les clés exactes.
- [ ] Cartes de Commandement Mercenaire (Maul, Gar Saxon, IG-11, Super Commandos…) — écran de consultation dédié à construire (aucun équivalent existant dans l'appli, sur le modèle des cartes Objectif/Avantage de `battleCards.ts`).

- [x] Intégrer Ténacité à la constitution de la réserve : corps-à-corps uniquement, unité blessée ou ayant perdu une figurine, choix Oui/Non obligatoire, puis ajout d’un unique dé rouge.
- [x] Protéger Ténacité par les contrats de l’Assistant et la validation complète du projet.
- [x] Effectuer un contrôle visuel tactile du parcours Ténacité avant publication (parcours local équivalent tablette ; portrait/paysage matériel reste dans la passe responsive finale).

## Priorité haute

- [ ] Valider en conditions réelles sur iPad le cockpit tactique v75.
- [x] Compléter le ralliement et le cycle d'activation dans le suivi de partie, y compris une fin d’activation sans attaque.
- [x] Finaliser la résolution des blessures multi-PV, les dégâts excédentaires et la suppression d'une unité vaincue.
- [x] Couvrir par scénarios les interactions de mots-clés ayant un impact sur les dés (Critical, Impact/Armure, Létal/Perforant/Insensible et Bélier).
- [x] Protéger le parcours complet attaque → couvert → défense → blessures → suppression par des scénarios bout-en-bout.
- [x] Traiter automatiquement le courage « — », les véhicules et l’immunité à la suppression dans le moteur de moral et de ralliement.
- [ ] Convertir les 45 mots-clés assistés en automatismes déterministes ou questions contextuelles obligatoires (4 terminés : Anti-matériel, Anti-personnel, Duelliste et Point faible ; 41 restants).

## Robustesse des données

- [x] Ajouter un jeu de fixtures Tabletop Admiral Empire et Rebelles plus large.
- [x] Détecter automatiquement toute image de `public/cards/` sans entrée canonique exploitable.
- [x] Détecter toute carte importée connue dont la traduction, le profil ou la certification manque.
- [x] Tester les ajouts de figurines multiples et les PV différents de la carte Unité.
- [x] Distinguer dans chaque import les cartes inconnues, visuels non raccordés, traductions et certifications moteur.
- [x] Protéger le parcours import → audit → effectif → attaque → blessures par un test utilisateur transversal.

## Suivi de partie

- [x] Afficher clairement ralliement, démoralisation, panique et immunités.
- [x] Unifier blessures, suppressions, figurines restantes et journal d'attaque entre les deux interfaces.
- [x] Fusionner et tester les états d’unités et journaux multiappareil sans écrasement par un appareil en retard.
- [ ] Valider la synchronisation sur deux appareils physiques avec un même Gist.
- [x] Arbitrer les suivis concurrents par horodatage et afficher le résultat de la fusion.
- [x] Ajouter un journal borné des modifications, l’appareil d’origine et l’annulation de la dernière action.

## Interface

- [x] Réaliser une première passe responsive iPad portrait et paysage, isolée des thèmes visuels.
- [x] Protéger par contrat les tailles tactiles, les zones sûres et la hiérarchie des actions sur tablette.
- [ ] Valider sur un iPad physique la hauteur sans défilement et les deux orientations.
- [ ] Harmoniser les thèmes Rebelles/Empire sans modifier leur palette respective.
- [x] Charger les écrans secondaires à la demande et mettre les visuels de cartes en cache PWA.

## Processus

- [x] Documenter l'architecture et les règles de contribution.
- [ ] Restaurer l'authentification Git en écriture par SSH.
- [ ] Publier cette documentation après réconciliation sûre de la branche locale.
