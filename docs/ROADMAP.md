# Feuille de route

## Dernier lot prêt à valider

- [x] (16/09/2026, décision produit utilisateur) Retiré le suivi des PV et de
  l'effectif des deux interfaces (site principal et Assistant) : plus de
  compteur de PV, d'effectif ni de répartition des blessures par figurine
  nulle part dans l'appli — ça se gère à la table, comme le reste du jeu de
  figurines. Le moteur continue de calculer et d'afficher le résultat
  d'une attaque (succès/critiques → blessures) mais n'applique/ne retient
  plus rien automatiquement ensuite. « Unité vaincue » et « Enragé »
  deviennent des états manuels (« Hors combat » / « Enragé atteint »).
  Ténacité reste une question Oui/Non obligatoire, sans plus être doublée
  d'une détection automatique sur les PV — voir le commit pour le détail
  complet des conséquences assumées. Le moral, la suppression et
  Ionisant/Immobilisant/Poison/Bouclier restent entièrement automatiques
  (ils dépendent du courage et des pions Suppression, pas des PV).
  `unitModels.ts` expose désormais `getUnitMoraleProfile()` (courage
  seulement) à la place de `buildCertifiedUnitRoster()`.

- [x] (16/09/2026, décision produit utilisateur) Réorganisé l'écran d'unité
  de l'Assistant : « Cartes et mots-clés » remonte juste après l'identité/
  Suppression (voir toutes les compétences avant de décider comment jouer
  l'unité, plutôt qu'après) ; le Briefing tactique se restructure en deux
  sections dans l'ordre où elles servent (Activation & Déplacement, puis
  Attaque — la Défense de l'unité n'y figure plus, elle s'affiche côté
  défenseur). Le Parcours guidé (Ordre/Effets/Actions/Fin, sélecteur à 7
  boutons) est retiré, jugé trop de clics pour la valeur apportée ; seul
  le bouton Résoudre une attaque subsiste. Les pions Viser/Esquive/
  Adrénaline, qui n'étaient mis à jour que par ce sélecteur, deviennent
  une saisie manuelle au moment de l'attaque (comme les PV). Restent
  inatteignables sans remplacement : la réaction Attente, l'attaque
  gratuite après déplacement (Charge/Aguerri/Implacable), le doublement
  Viser/Esquive par les cartes Posture — leur code reste en place au cas
  où une autre voie leur serait donnée plus tard.

- [x] (16/09/2026) Audité les 41 mots-clés « assistés » contre la séquence
  de résolution d'attaque de legion.takras.net (référence croisée externe,
  pas recopiée dans le dépôt). Triage : 24 restent assistés durablement
  (dépendance de ligne de vue/position que l'appli ne modélise pas —
  Gardien, Tir de Soutien, Ciblage Avancé, Exemplaire, Fumée, Influence
  Divine, Discret, Intuition du Danger, etc.) ; 4 sont devenus sans objet
  avec les retraits récents (Non-combattant : plus de PV ; Charge/
  Implacable/Barrage : plus de suivi des actions). Les 7 restants étaient
  du calcul pur, sans dépendance de table, et sont maintenant tous
  automatiques : Tireur Embusqué, Maîtrise du Jar'Kai, Maîtrise du
  Makashi, Maîtrise du Soresu, Déflexion (n'avait aucun code avant ce
  lot), Maîtrise du Shien et Immunité : Déflexion. Simplification
  documentée : Déflexion via Gardien X (dés du Gardien, pas ceux de la
  défense normale) n'est pas couverte — Gardien X et Déflexion touchent
  rarement la même unité en pratique. Score final : 51 automatiques / 34
  assistés (était 44/41 avant l'audit).

- [x] Audit exhaustif des 13 PDF de cartes (`aGENTS` + `Nouveau dossier`, hors Galactic Empire Commands FR exclu sur demande) : 185 cartes cataloguées dans `src/data/pdfCardManifest.json`, comparées carte par carte au catalogue central. Résultat : Empire Units et Rebel Alliance Units 100 % déjà certifiés (aucun écart) ; 15 écarts confirmés (7 Empire Upgrades, 8 Rebel Upgrades) ; ~50 cartes Mercenary/Generic Upgrades identifiées mais non certifiées ; 1 écart de traduction repéré (Lead by Example = « Meneur d'Hommes » au catalogue vs « Donner l'Exemple » sur le visuel lu). Détail complet : `docs/PDF_CATALOG_AUDIT.md`. Nouveau test bloquant `scripts/test-pdf-catalog-manifest.mjs` (intégré à `npm run build`) protégeant ces constats contre toute régression future.

- [x] Ajouter la faction Mercenaire (18 unités : Syndicat Pyke, Soleil Noir, Gar Saxon, Maul, Boba Fett (2 versions), Bossk, Cad Bane, IG-88, IG-11, Din Djarin, Grogu, Super Commandos Mandaloriens, Le Bad Batch, Omega) avec visuels, profils de dés et effectifs certifiés — voir `verificationSource` dans `customCards.json` pour la provenance (planches PDF fournies par l'utilisateur, lecture visuelle IA à spot-checker en jouant).
- [x] Corriger `unitModels.ts` qui ne fusionnait pas `CUSTOM_CARDS` (contrairement à `diceProfiles.ts`/`cardImages.ts`/`cardNamesFr.ts`) : toute carte ajoutée uniquement via l'écran « Nouvelle carte » se voyait signalée à tort « Effectif impossible à calculer avec certitude ».
- [x] Corrigé (14/09/2026, signalement utilisateur) : les 18 visuels Mercenaire étaient recadrés à 90° du sens de lecture (contenu du PDF source imprimé pivoté), sans que ça saute aux yeux à la relecture — d'où aussi plusieurs couleurs/valeurs de dés mal lues (ex. Boba Fett, IG-88, Bossk, Vigo du Soleil Noir). Re-recadrage correct (rotation + marge anti-bavure, format paysage cohérent avec le reste du catalogue) et toutes les réserves de dés des 18 unités relues une par une sur les visuels corrigés.
- [x] (15/09/2026) Intégré les 29 cartes Amélioration Mercenaire (Pyke Syndicate, Soleil Noir, Super Commandos, Rook Kast, Din Djarin, Gar Saxon, Boba Fett, Cad Bane, IG-11, Le Bad Batch x5) dans `customCards.json` — noms, alias anglais (best-effort, à spot-checker), visuels recadrés, dés/mots-clés certifiés à fort zoom. Corrigé au passage « The Darksaber » (5→6 dés noirs, Impact 2/Perforant 2 manquants). Corrigé les 15 écarts confirmés Empire/Rebel Upgrades (la plupart déjà présents via une session parallèle, juste `verifiedAgainstCard` manquant ; 1 vraie correction de dés — Duelliste avec Beskad rouge 1→2).
- [x] (15/09/2026) Intégré ~57 cartes Amélioration Générique (Generic Upgrades FR.pdf, 22 pages) : 6 armes à dés certifiées (grenades, imploseurs, obus de véhicule), ~50 cartes à effet seul raccordées (nom + visuel, sans dé inventé). Corrigé un bug confirmé de `cardKeyAliases.json` (« Defensive Posture »/« Offensive Stance » aliasaient tous les deux vers « Offensive Posture » — toute liste important ces cartes littéralement recevait le mauvais texte de mot-clé) et plusieurs traductions FR imprécises (Brouilleur Comms, Système de Commande, Scanner Portatif, Guidé par la Force, Conscience de la Situation, Contacts dans la Pègre, Canal Comms de Bord…). « Lead by Example » utilise désormais « Donner l'Exemple » comme nom de référence (« Meneur d'Hommes » conservé en alias). Nouveau garde-fou dans `scripts/test-pdf-catalog-manifest.mjs`.
- [ ] Cartes de Commandement Mercenaire (Maul, Gar Saxon, IG-11, Super Commandos…) — écran de consultation dédié à construire (aucun équivalent existant dans l'appli, sur le modèle des cartes Objectif/Avantage de `battleCards.ts`).

- [x] Intégrer Ténacité à la constitution de la réserve : corps-à-corps uniquement, unité blessée ou ayant perdu une figurine, choix Oui/Non obligatoire, puis ajout d’un unique dé rouge.
- [x] Protéger Ténacité par les contrats de l’Assistant et la validation complète du projet.
- [x] Effectuer un contrôle visuel tactile du parcours Ténacité avant publication (parcours local équivalent tablette ; portrait/paysage matériel reste dans la passe responsive finale).

## Priorité haute

- [ ] Valider en conditions réelles sur iPad le cockpit tactique v75.
- [x] Compléter le ralliement et le cycle d'activation dans le suivi de partie, y compris une fin d’activation sans attaque.
- [x] ~~Finaliser la résolution des blessures multi-PV, les dégâts excédentaires et la suppression d'une unité vaincue.~~ Retiré le 16/09/2026 (voir plus haut) : le suivi des PV n'existe plus.
- [x] Couvrir par scénarios les interactions de mots-clés ayant un impact sur les dés (Critical, Impact/Armure, Létal/Perforant/Insensible et Bélier).
- [x] Protéger le parcours complet attaque → couvert → défense → blessures → suppression par des scénarios bout-en-bout.
- [x] Traiter automatiquement le courage « — », les véhicules et l’immunité à la suppression dans le moteur de moral et de ralliement.
- [ ] Convertir les 45 mots-clés assistés en automatismes déterministes ou questions contextuelles obligatoires (4 terminés : Anti-matériel, Anti-personnel, Duelliste et Point faible ; 41 restants).

## Robustesse des données

- [x] Ajouter un jeu de fixtures Tabletop Admiral Empire et Rebelles plus large.
- [x] Détecter automatiquement toute image de `public/cards/` sans entrée canonique exploitable.
- [x] Détecter toute carte importée connue dont la traduction, le profil ou la certification manque.
- [x] ~~Tester les ajouts de figurines multiples et les PV différents de la carte Unité.~~ Retiré le 16/09/2026 : ce calcul n'existe plus dans l'appli.
- [x] Distinguer dans chaque import les cartes inconnues, visuels non raccordés, traductions et certifications moteur.
- [x] Protéger le parcours import → audit → effectif → attaque → blessures par un test utilisateur transversal.

## Suivi de partie

- [x] Afficher clairement ralliement, démoralisation, panique et immunités.
- [x] Unifier suppression et journal d'attaque entre les deux interfaces (blessures/figurines retirées du suivi le 16/09/2026, voir plus haut).
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
