# Feuille de route

## Dernier lot prêt à valider

- [x] (17/09/2026, demande utilisateur) Audité les 85 mots-clés
  automatiques/assistés (plus Intrépide, Contrainte, Démoraliser X,
  Indomptable, Enragé X) un par un contre l'app : 56 ont déjà un rappel
  dédié (encart, question ou saisie) au bon endroit ; 4 s'appliquaient
  correctement mais sans être nommés à l'écran (Suppressif, Immunité :
  Déflagration, Immunité : Déflexion, Maîtrise du Soresu — non corrigé,
  jugé mineur) ; les 24 restants sont les mots-clés « assistés » déjà
  identifiés le 16/09/2026 comme dépendant du jugement de table (ligne de
  vue, position, timing entre joueurs), déjà listés par nom et définition
  dans le Briefing tactique, volontairement non automatisés.
  Suite à cet audit, ajouté un pop-up de fin d'attaque
  (`attackConclusionPopupContent`, déclenché une seule fois par attaque à
  l'arrivée sur l'étape Suppression) qui regroupe, filtrés sur les
  mots-clés réels de l'attaquant et du défenseur de cette attaque
  précise, tous les effets de fin d'attaque purement informatifs :
  Suppression et Ionique à poser, Immobilisation/Poison/Câble de
  remorquage/Dispersion, Déflexion, Agile, Maîtrise de l'Ataru, Matamore,
  Maîtrise du Djem So. Les effets liés à une case à cocher
  (Immobilisation/Poison/Câble/Dispersion) restent aussi affichés en
  ligne à côté de leur case pour rester corrigibles après coup. Les
  encarts désormais redondants sont retirés : `combatFollowupPanel`
  (Ataru/Matamore/Djem So), l'encart Agile de l'écran Défense, la note
  Déflexion de l'écran Suppression.

- [x] (17/09/2026, demande utilisateur) Deuxième passe de polish sur
  l'écran d'unité iPad, suite aux retours sur le premier rendu réel :
  bandeau d'identité (`.hero`/`.unit-identity-panel`) nettement réduit
  (padding, icône de rang et titre plus petits) ; bandeau des étapes
  (`<nav id="progress">`, 1 Unités → 8 Suppression) supprimé du header —
  il ne faisait que passif (aucun clic dessus n'a jamais eu d'effet) et
  prenait de la hauteur sur chaque écran ; réagencement de la colonne de
  droite en grand écran pour suivre l'ordre d'usage réel : Automatismes
  d'activation en haut, Briefing tactique (« ce que cette unité peut
  faire ») en dessous, la bande de cartes remontant juste sous l'identité
  à gauche. Rendu du Briefing tactique amélioré : titres de section
  agrandis, et les trois blocs (Activation & Déplacement, Attaque, Effets
  de carte) reçoivent chacun une couleur dédiée (bleu/rouge/or, déjà
  présentes dans la palette) via un liseré de gauche, pour les distinguer
  au premier coup d'œil.

- [x] (17/09/2026, demande utilisateur) Mis en place la disposition à deux
  colonnes proposée dans la maquette « refonte iPad », qui n'avait pas
  encore été implémentée (seul le contenu de la bande de cartes l'avait
  été jusque-là) : à partir d'environ la largeur d'un iPad Air en paysage
  (1180pt), l'écran de l'attaquant passe en grille (`.overview.attack`)
  avec identité, bande de cartes et état de l'unité dans une colonne de
  gauche étroite (~30%) et le Briefing tactique dominant toute la hauteur
  de la colonne de droite — sans changement de DOM/JS, uniquement via
  `grid-area`/`grid-column` en CSS (`ipad-compact.css`). En dessous de ce
  seuil (iPad portrait, mobile), l'écran repasse automatiquement en une
  seule colonne empilée, comme avant. Limité à l'écran de l'attaquant :
  côté défenseur, le Briefing tactique ne s'affiche pas (il ne concerne
  que l'activation de l'unité), la grille y serait donc inutile.
  Supprimé au passage le grand visuel de la carte Unité du bandeau
  d'identité (`.hero`), devenu redondant avec la vignette cliquable de
  `.card-strip` : `.hero` ne contient plus que l'identité et les pastilles
  Suppression/Moral. Corrigé un bug latent (pas causé par ce lot) où le
  texte d'une section de Briefing sans mot-clé (« Aucun effet spécial
  d'activation... ») héritait par erreur de la grille 82px/1fr prévue pour
  les lignes de mot-clé, le confinant à une colonne de 82px de large.

- [x] (17/09/2026, demande utilisateur) Étendu le balayage « Star Wars »
  (`.page-wipe`/`.step-wipe`, déjà utilisé aux changements d'écran) aux
  fenêtres modales (`<dialog>`) : nouveau pop-up de rappel Moral/
  Suppression, zoom de carte et avertissement de réserve mixte s'ouvrent
  désormais avec la même animation (`.dialog-wipe`, classe commune posée
  sur chaque `<dialog>` à sa création) plutôt qu'un simple fondu natif —
  pour renforcer l'identité visuelle de l'appli. Corrigé au passage un bug
  latent sur les trois fenêtres : `dialog.close()` ne déclenchait pas de
  façon fiable l'événement `close` dans ce moteur, laissant l'élément
  fermé mais jamais retiré du DOM ; chaque bouton de fermeture appelle
  maintenant `remove()` explicitement en plus de `close()`.

- [x] (17/09/2026, décision produit utilisateur) Retiré le mini-jeu de
  ralliement de l'Assistant (saisie des résultats de dés Blocage/Adrénaline/
  Vierge, case Courage d'un commandant, bouton « Appliquer le ralliement »,
  verrouillage automatique du bouton Suivant en cas de panique détectée) :
  cette manipulation se fait maintenant entièrement à la table, comme le
  reste du jeu. À la place, un pop-up de rappel de règle s'affiche une seule
  fois à l'ouverture d'une unité démoralisée ou à risque de panique
  (`moralPopupContent`/`showRulePopup`), indiquant combien de dés lancer, la
  conversion Blocage/Adrénaline, la limite de rétention Discret/Intuition du
  Danger et la conséquence d'une panique (aucune action, retrait de
  Suppression égal au Courage en fin d'activation) — sans jamais attendre ou
  calculer le résultat réel, qui reste saisi à la main dans le compteur
  Suppression déjà existant. Le pop-up n'apparaît qu'à l'ouverture réelle de
  l'unité (pas à chaque clic sur les compteurs d'état) grâce à un suivi de
  dernière unité ouverte (`lastOverviewEntryId`). Intrépide, Contrainte et
  Démoraliser X restent disponibles (`postRallyPanel`, renommé « Options
  unité démoralisée ») mais sont désormais dérivés en continu de l'état
  Suppression/Courage actuel plutôt que d'un indicateur « ralliement
  effectué » — bug corrigé au passage : ce panneau s'affichait par erreur
  même à Suppression 0 dès qu'une unité alliée portait Contrainte. Le bloc
  redondant « Suppression à prévoir » du dernier écran d'attaque est retiré
  (l'écran affichait déjà les mêmes informations, en plus complet et
  éditable, via le panneau Suppression et moral existant). CSS : nouvelle
  classe `.rule-popup` (remplace `.panic-resolution`), `.rally-panel` /
  `.rally-counter` / `.rally-dice` / `.rally-options` / `.rally-command` /
  `.rally-result` supprimées (plus émises par l'appli).

- [x] (19/09/2026, demande utilisateur) Design de référence « carte de pions »
  (validé) : l'encadré « Pions Viser disponibles » (teinte + halo bleu, étiquette
  INFO) reçoit à droite le compteur − / + pour corriger le stock, et sert de
  modèle unique (`tokenCard` dans app.js, `.token-card` dans resolver-polish.css)
  pour Viser, Adrénaline d'attaque, Esquive du défenseur et Adrénaline de défense,
  avec l'icône du pion (Adrénaline : symbole existant asurge/dsurge ; Viser et
  Esquive : `stat-icons/aim.svg` et `dodge.svg`, dessinés ici — à remplacer par
  les visuels officiels si fournis). La phrase « Indiquez ce que l'unité a
  actuellement… » est supprimée. Le stock corrigé est aussi écrit dans le suivi
  de l'unité (syncTokenStock).

- [x] (19/09/2026, demande utilisateur) Pions Viser : les relances se font à la
  table. Retrait des champs « Pions Viser en réserve », « Pions Viser dépensés
  pour relancer » et « Dés effectivement relancés » (et du blocage « ne possède
  que N pion(s) Viser », ainsi que de l'encadré « Relances autorisées »). Un bloc
  d'information « PIONS VISER DISPONIBLES : N » (suivi de l'activation, moins
  le Viser de Longue Distance) indique s'il reste des Viser et le maximum de
  relances possibles. ATTENTION, les pions Viser servent encore au moteur pour
  Débordement (+1 suppression), Duelliste (+1 Perforant au corps-à-corps) et
  Matamore : une seule case « Un pion Viser a été dépensé pendant cette attaque »
  est affichée, uniquement pour ces mots-clés (elle alimente aims/rerolled).
  Létal X garde son compteur. Saisie de dés incorrecte : c'est désormais la zone
  de saisie des dés qui vibre (et non celle des pions en réserve).

- [x] (19/09/2026, demande utilisateur) Gain de temps : le choix de l'unité
  attaquée ouvre directement la résolution d'attaque, sans afficher la fiche de
  l'unité attaquée (sauf unité vaincue, dont la fiche reste accessible pour
  corriger son état). « Revoir la cible » (étape 1) revient à la liste des cibles.

- [x] (19/09/2026, demande utilisateur) Résolution d'attaque, suite : dés à lancer
  tout en haut avec la progression de saisie sur la même ligne ; barre collante
  (dés + saisie + résultat en cours en grand, teinte rouge + halo) ; plateau de
  dés (faces en tuiles) ; dés à lancer et zones de saisie en teinte + halo orange ;
  progression rouge tant que le compte n'est pas exact, verte ensuite. Lisibilité
  bloquant / à saisir / information : pastille « ⛔ BLOQUÉ … / ✓ PRÊT » dans la
  barre d'actions et bouton « Étape suivante » verrouillé (issus de stepIssue()) ;
  étiquettes À SAISIR / À VÉRIFIER / INFO / BLOQUANT sur les cadres ; champs de
  dés vides qui pulsent en orange (verts une fois la saisie complète) ; rappels
  d'information repliés en « ℹ n rappels de règle » ; pions en réserve réduits à
  une ligne récapitulative une fois les dés saisis (rouvrable) ; défilement
  automatique jusqu'au premier élément à faire à l'arrivée sur une étape.

- [x] (19/09/2026, demande utilisateur) Harmonisation des écrans de résolution
  (nouvelle feuille `resolver-polish.css`, chargée en dernier) : code couleur
  unique des encadrés (orange = à saisir/vérifier, bleu = rappel de règle,
  rouge = alerte) ; une seule barre de résumé (dés à lancer / à défendre /
  résultat) ; compteurs qui ne débordent plus (le « + » des pions Adrénaline
  sortait de son cadre) et qui s'empilent sous 660 px ; progression « n / N dés
  saisis » déplacée sous la barre de résumé ; colonnes latérales réduites
  (128-150 px) pour élargir la zone centrale ; étape Modifications sans effet
  → bandeau « Passer à la défense » avec saisie manuelle repliée ; journal de
  résolution replié par défaut. Contrôle de Tir : le message nomme désormais
  l'unité alliée qui fournit l'effet (carte Contrôle de Tir) et la condition
  à vérifier (portée 1 de l'attaquant + cible en ligne de vue du porteur) ;
  quand « Oui » est choisi, la source est rappelée sous les dés (les dés
  eux-mêmes étaient déjà améliorés automatiquement). Icône de rang de la
  sélection d'unité : légère transparence, contour sombre et ombre portée.

- [x] (19/09/2026, demande utilisateur) Résolution d'attaque : (1) effectif des
  armes de la carte Unité = effectif de base + figurines ajoutées par les
  améliorations certifiées sans arme propre (escouades « Stormtrooper Squad »,
  « Fleet Trooper Squad »…, +5 ; spécialistes, +1), avec le détail « Effectif :
  4 + 5 (…) » sous l'arme — jusqu'ici seul l'effectif de base était proposé ;
  une amélioration avec arme propre (arme lourde) reste comptée sur sa ligne ;
  les effectifs sont aussi appliqués dès l'ouverture de l'écran (le libellé
  « PRÉREMPLI » s'affichait avec 1). (2) Sélection de portée juste au-dessus
  des dés. (3) Encadrés de vérification (cases de situation, règles
  applicables, pions en réserve, avertissements) remontés juste sous les
  étapes, à chaque étape ; les encadrés-résultats calculés restent à côté de
  leur saisie. (4) « Suivi des dés » supprimé en bas des écrans.

- [x] (19/09/2026, demande utilisateur) Écrans de sélection d'unité (« Quelle
  unité jouez-vous ? » / « …est attaquée ? ») : retrait de la recherche, des
  filtres de rang, du titre de liste et des en-têtes de rang pour gagner de
  la place ; la carte Unité en grand (proportions natives, jamais rognée)
  devient le bouton de sélection, avec nom et améliorations dessous, rang en
  pastille sur la carte. Grille unique dont le nombre de colonnes suit le
  nombre d'unités (3 à 7) et dont la hauteur de carte est plafonnée pour que
  toutes les rangées tiennent sur iPad Air paysage sans défilement (vérifié
  jusqu'à 10 unités à 1180×820). Nouvelle feuille `unit-picker.css`.

- [x] (19/09/2026, demande utilisateur : « tout n'est pas aligné, uniforme ») Audit
  design de l'écran d'unité et mise en page unifiée dans une feuille dédiée
  `unit-screen.css` (chargée après `ipad-compact.css`, qui n'en porte plus la
  mise en page). Défauts corrigés : colonne de droite qui démarrait 130 px plus
  bas que celle de gauche (placement automatique de la grille) → `app.js`
  regroupe désormais les blocs en deux vraies colonnes `.ov-left` (identité,
  cartes) / `.ov-right` (automatismes, options de démoralisation, Briefing,
  état de l'unité), fusionnées en une colonne ordonnée sous 1000 px ;
  identité décalée de 14 px par rapport à la bande de cartes ; améliorations
  qui débordaient de leur cellule (grille sans `min-width:0`) ; carte Unité
  paysage écrasée dans une case portrait de 196 px (proportions natives
  restituées) ; cases vides plus claires dans le Briefing (lignes séparées par
  un filet au lieu d'un fond de grille) ; titre « État actuel de l'unité »
  cassé sur 3 lignes ; bandeau du haut sur 3 lignes (133 px) → une ligne
  (55 px). Un seul habillage de panneau (bordure, rayon 8 px, fond, repères
  d'angle, en-tête « libellé au-dessus, titre dessous ») pour identité,
  cartes, automatismes, Briefing, état de l'unité. Côté défenseur, la bande de
  cartes prend la grande colonne de droite. Vérifié à 1180×820, 820×1180,
  375×812.

- [x] (17/09/2026, décision produit utilisateur) Refonte visuelle de l'écran
  d'unité de l'Assistant, étape 1 (mise en page) : la carte Unité et ses
  cartes Amélioration deviennent une bande de vignettes cliquables
  (`card-strip`) — grande carte Unité à gauche, améliorations en petites
  vignettes à droite (pas besoin d'être grandes, elles s'agrandissent au
  clic). Le texte de mot-clé qui s'affichait sous chaque carte de l'ancienne
  galerie disparaît de cet endroit et rejoint le Briefing tactique dans une
  nouvelle section « Effets de carte » (troisième section, après Activation &
  Déplacement et Attaque), alimentée par les notes de la carte Unité et de
  toutes les améliorations. Le Briefing tactique devient ainsi le bloc de
  référence qui réunit tous les mots-clés de l'unité, comme demandé.
  `cardGalleryEntry`/`upgradeGallery` sont remplacés par
  `cardStripEntry`/`upgradeGallery` ; `bindCardViewer` reconnaît les
  nouvelles classes `.unit-card-visual`/`.upgrade-card-visual` en plus de
  `.upgrade-visual`/`.unit-card-zoom` (toujours utilisées par la colonne de
  résolution d'attaque). CSS dédiée dans `upgrades.css` (nouvelle mise en
  page) et `style.css` (titres de section du Briefing). Étapes suivantes du
  même lot (popups Suppression/Moral, retrait du mini-jeu de ralliement,
  extension de l'animation de balayage) à venir.

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
