# Feuille de route

## Dernier lot prêt à valider

- [x] (19/09/2026, incident) Précis 1 des Stormtroopers ignoré par le moteur :
  cause = correctif manuel faux (reference-corrections.js) + copie locale des
  étiquettes qui masquait le référentiel livré + certification `keywords: []`
  jamais confrontée aux étiquettes. Corrigé (registre de corrections vide et
  sourcé obligatoire, référentiel livré prioritaire, retraits locaux explicites,
  certification corrigée), test de parcours dédié, test de cohérence
  certification ↔ étiquettes dans le build, recoupement avec Legion Helper
  (`npm run audit:takras`, rapport dans docs/audit/) et processus écrit dans
  docs/PROCESSUS-VERIFICATION.md.
- [ ] Trancher sur les cartes physiques les écarts ouverts : `KNOWN_DISCREPANCIES`
  (6 cartes) et le rapport docs/audit/recoupement-legion-helper-2026-09-19.md
  (20 écarts de mots-clés, 13 de caractéristiques).
- [x] (19/09/2026) Écran de certification : liste toute carte non certifiée à 100 %, comparaison des sources,
  écarts Legion Helper à relire, « aucun mot-clé » explicite, portée modifiable. Reste : porte à l'import qui
  refuse un lot incohérent, et mots-clés d'arme éditables (seuls 48 profils sur ~300 ont une certification complète).
- [x] (19/09/2026) Arsenal X : carte d'information bleue avant le choix des armes ; portée des armes en orange.

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

- [x] (19/09/2026, suite de l'audit) Résolution : bandeau du haut non collant (≈55 px
  rendus), résultat « avant » fusionné dans la barre « après », « Suppression et
  moral » replié (une ligne de résumé), améliorations des colonnes latérales
  repliées ; vierges automatiques (après la 1re saisie : vierges = dés de la
  réserve − autres résultats ; « Tout vierge » ; saisie manuelle reprend la main,
  bouton « ↺ Vierges automatiques ») ; textes utiles ≥ 11 px, cibles ≥ 40-44 px,
  bouton principal rouge à contraste ≥ 4,5:1 ; une seule pulsation (le point
  bloquant courant) ; toucher une section grisée ramène au point bloquant.
  Fiche d'unité : pions Viser / Esquive / Adrénaline éditables (seule source de
  leur stock), effectif certifié (« 6 figurines (4 + 1 + 1) »), briefing en
  sections repliables (effets de carte repliés), carte Unité de hauteur limitée
  et améliorations sur une rangée, libellés À SAISIR / INFO.
  Test de parcours réel : `scripts/test-assistant-parcours.mjs` exécute app.js dans
  jsdom et rejoue 6 scénarios (attaque complète, escouade + Contrôle de Tir,
  couvert + esquives, Impact/Armure + Encombrant, régression Adrénaline, saisie des
  dés) ; il fait partie de `npm run build`. Limite : pas de rendu CSS (structure,
  états et textes seulement). Dépendance ajoutée : jsdom (devDependency).

- [x] (19/09/2026, demande utilisateur) Refonte des écrans 3 à 6. Contrôle de Tir :
  reformulé d'après la carte (« améliorez 2 dés d'attaque quand une autre unité
  alliée à portée 1 attaque une cible en ligne de vue DU PORTEUR ») — le porteur
  a également la cible en ligne de vue. Couvert & esquive : barre « dés de couvert
  à lancer » + état du jet (même design que Jet/Défense), plateau de dés pour le
  jet de couvert, Esquive sur une ligne (stock en lecture seule issu du suivi de
  l'activation, dépense à droite). Modifications : « avant / après » en haut ;
  la saisie Impact/Armure n'existe que si l'attaquant a Impact ET le défenseur
  Armure, sinon information « ne s'applique pas ici » (Armure seule = automatique).
  Défense : déjà alignée (barre orange, plateau, rouge réservé aux blessures).
  Suppression = résumé de l'attaque : blessures et suppression à appliquer
  (cartes rouges, gros chiffres, icônes), ionique si applicable, pions dépensés
  (esquives, Viser, Adrénaline attaque/défense) en cartes d'information bleues.

- [x] (19/09/2026, demande utilisateur) Même logique étape par étape sur les
  autres écrans de résolution. Couvert & esquive (attaque à distance) : couvert
  observé à choisir explicitement (« Aucun » n'apparaît plus sélectionné par
  défaut) → jet de couvert à saisir puis à valider (bouton) quand des dés sont à
  lancer → esquives (carte de pions + dépensées, désormais section à part). Le
  changement de couvert invalide la validation. Modifications non vide (Impact,
  Armure, boucliers, Gardien…) : bouton « Valider les modifications » obligatoire
  (étape vide = bandeau « Passer », inchangé). Une vérification obligatoire
  (Encombrant…) devient le point bloquant du grisage. Bouton de validation
  commun `.phase-confirm` (orange à valider, vert validé, modifiable). Défense et
  Jet/relances suivaient déjà la logique (saisie des dés = point bloquant).
  Suppression & moral : ordre et design alignés, sans blocage supplémentaire (le
  bouton final « Appliquer les blessures et terminer » sert de validation).

- [x] (19/09/2026, demande utilisateur) Étape 1 réordonnée : portée en haut →
  Contrôle de Tir (grisé tant que la portée manque) → choix des armes → dés à
  lancer tout en bas, sous les armes. Le Contrôle de Tir n'est plus un rappel bleu
  mais une action à saisir (orange, « À SAISIR ») : source, deux conditions à
  cocher mentalement (portée 1 de l'attaquant, cible en ligne de vue), effet,
  boutons OUI / NON ; cadre vert « ✓ SAISI » une fois répondu ; il passe avant les
  armes dans l'ordre des blocages (stepIssue). Le dégrisage retrouve la section
  suivante par la classe du point bloquant. L'encadré « Conversion Adrénaline »
  devient dépliable : replié en mode rapide, déplié sinon (comme « Règles qui
  interviennent »), état mémorisé pendant l'attaque.

- [x] (19/09/2026, demande utilisateur) Fil du processus d'attaque : tant qu'un
  résultat ou une information obligatoire manque (stepIssue()), tout ce qui suit
  est grisé (opacité .34, désaturé, non interactif) ; dès qu'il est saisi, la
  suite se dégrise (halo vert), et l'écran défile jusqu'à elle si elle n'est pas
  déjà bien visible — aussi quand le blocage avance dans l'étape (portée puis
  armes). Le passage à l'étape suivante reste manuel. Plateau de dés avec du
  relief : médaillons ronds (dégradé radial, halo, ombres intérieures) qui
  passent au vert / rouge avec l'état de la saisie, tuiles surélevées, boutons
  biseautés, champ en creux.

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

- [x] (20/09/2026) Audit « où remonte chaque mot-clé » (`scripts/audit-keyword-surfacing.mjs`, matrice dans `docs/audit/mots-cles-affichage.md`) : 48 mots-clés d'armes (Mercenaires) rattachés aux étiquettes de leur carte (ils étaient ignorés en attaque), 10 valeurs X relues sur les visuels, Harpon Mo/DK corrigé (Câble de Remorquage, Fixe), À Bout Portant annoncé (pop-up + résumé), mots-clés d'autres unités rappelés (Exemplaire, Tir de Soutien, La Victoire ou la Mort, Nous nous Battons…), ciblage restreint signalé sur les tuiles (Incognito, Petit, Discret, Immunité corps-à-corps), Surveillance X (pions + dépense à l'étape des relances). Reste à faire par le joueur : relire le Perforant du pistolet de Gar Saxon Militant (visuel coupé). Limite : 60 mots-clés du glossaire n'ont aucune carte dans le catalogue actuel (non testables par carte).

- [x] (21/09/2026) Cycle de vie des cartes d'amélioration : icône ↱ = carte inclinée (redressée à la Phase Finale), icône ✖ = carte SUPPRIMÉE de la partie (usage unique : Pointe de Vitesse, Transpondeur d'urgence). Panneau « prête · inclinée · supprimée » sur la fiche d'unité pour toutes les cartes (les deux effets possibles sur une même carte). ANNULER / Réactiver étendus aux automatismes de cartes ; historique du round. Aide contextuelle « ? » (fiche, sélection, chaque étape de l'attaque, raison du blocage, règles en jeu). Actions de carte : Électro-grappin de Sabine, Câbles ascensionnels ; notes : IG-11 Nanny/Prime Programming. Garde-fou de build : `audit-keyword-surfacing.mjs --check` (échantillon de 14 mots-clés, ~20 s).
- [x] (20/09/2026) Effets propres aux cartes d'amélioration : audit visuel des 223 cartes (`scripts/audit-card-effects.mjs`, tableau dans `docs/audit/cartes-effets.md`, dans le build). 92 cartes portent un effet imprimé hors mots-clés ; 25 d'entre elles cachaient un texte derrière des mots-clés (Générateur de Barrage, Capitaines, Wedge, Kallus, Hunter, Fusil Amban, Gouverneur Pryce, Shriv…). Chacune est maintenant classée : bouton d'action sur la fiche (→ action, » gratuite, ↱ incline, ✖ supprime, coût en actions), panneau « cartes qui peuvent intervenir » aux étapes d'attaque (Barrage/Surcharge ajoutent des dés et des mots-clés, Barrière de Force, Protecteur, Stimulants, Clairvoyance, Évitement et Couvert, Colère, Terreur), bonus de vitesse/courage, cartes retournables (Bouclier de Combat, Cassian face A/B) ou rappel justifié. Une carte ↱/✖ ne peut plus rester en simple rappel (garde-fou du build). Relecture des données sur les visuels : 3 visuels décalés (Chef de Groupe, Objectif de Mission, Agent de Confiance) ré-extraits du PDF, 21 portées « corps-à-corps ET distance » (badge rouge+bleu) corrigées, dés des Galar-90 / ZX / Carabine du Super Commando, courage/PV/défense de IG-11, IG-88, Gar Saxon, Bad Batch, Vigo et Hommes de Main, figurines ajoutées (Kallus, Rook Kast, Soldat de la Flotte). Reste à faire : les corrections d'unités et de cartes certifiées sont à confirmer dans l'écran de Certification (défilé rapide).
- [x] (21/09/2026) Pions Viser : compteur « Pions Viser dépensés » à l'étape des relances (comme les Adrénalines), limité au stock, retiré du suivi à la fin de l'attaque (relances, Létal, Longue Distance, Tireur Embusqué). Écran « Phases du round » (bouton dans le bandeau) : Phase de Commandement, début et fin de la Phase d'Activation, Phase Finale, avec les mots-clés du calendrier, les mêmes boutons d'actions de carte que la fiche d'unité, et les cartes qui agissent sur d'autres unités (Brouilleur Comms, Ordres Stricts). Relecture IA de tous les visuels (`src/data/aiReview.json` : relue / corrigée / illisible) affichée dans la certification : pastille par carte, filtre « à confirmer », défilé limité aux cartes corrigées ou illisibles. Rangs relus sur l'icône : Kallus, Cassian, Jyn = Opérateurs ; Dark Troopers = Lourd ; Range Troopers = Soutien ; Unité Lourde d'Intervention, Mortier DF-90, Mark II = Corps. Adrénalines d'attaque et de défense des 78 unités relues : aucun écart.
- [x] (21/09/2026) Legion HQ retenu comme référence : `scripts/audit-legionhq.mjs --write` (142 cartes appariées, alias dans `scripts/data/legionhq-aliases.json`). Certification : vitesse préremplie pour les unités sans vitesse (47 unités, à confirmer sur la carte), pastille et panneau d'écarts Legion HQ, filtre « À confirmer : Legion HQ et relecture IA », défilé sur ces cartes. 13 écarts déjà tranchés sur les visuels ne sont plus signalés (`src/data/legionhqTriage.json`). Reste : apparier les 71 cartes non appariées.
- [x] (21/09/2026) Legion HQ : mots-clés comparés (carte + armes, valeurs comprises, 170 noms appariés) et 36 améliorations de plus appariées (193 sur 223, 30 restent). Deux vrais manques trouvés et corrigés d'après le visuel : Reconfiguration sur A280 Pistolet/Sniper, Chef sur l'amélioration Agent Kallus. Écarts déjà tranchés (Transport des escouades, DH-447, DLT-19x, Del Meeko) dans `legionhqTriage.json`. Reste à trancher dans la certification : environ 70 cartes en écart de mots-clés (Chef, Tireur d'élite, Perforant… à comparer au visuel).
- [x] (21/09/2026) Errata Reference FR du 17/06/2026 appliqué (détail dans `docs/audit/errata-2026-06-17.md`, données dans `src/data/errata.json`) : 8 cartes mises à jour (visuels remplacés, dés, portées, mots-clés, rang des équipes Commandos / Scout), corrections de texte (Agent de Confiance, Rex, Stimulants, DF-90, Tireur Embusqué Rebelle, type Soldat Mandalorien), 10 cartes retirées du jeu (bandeau sur la fiche, avertissement dans « Tester mes listes », exclues de la certification). Les quatre PDF Units / Upgrades FR fournis sont identiques aux précédents.
- [x] (21/09/2026) Import assisté depuis Legion HQ : boutons « Utiliser la valeur Legion HQ » dans la certification (corrigent le brouillon, validation sur le visuel conservée), alias élargis (195 améliorations appariées, 28 non appariées dont les cartes 2026 absentes de Legion HQ et les cartes retirées), classement des écarts par historique daté, adrénalines préremplies depuis les profils imprimés.
- [x] (22/09/2026) Certification limitée à vos listes : filtre « Dans mes listes » par défaut (mémorisé), compteur du bandeau = cartes de vos listes seulement (2 au lieu de 242 pour une liste de 9 cartes), synthèse « Vos listes », bouton « Confirmer les N cartes concordantes » (carte de vos listes, relue sans écart, Legion HQ et Legion Helper sans désaccord, rien de bloquant ; fenêtre de confirmation avec la liste des noms).
- [ ] À faire : réserves multiples avec Arsenal (règle à confirmer sur le livret) ; icônes ↱ / ✖ à renseigner carte par carte pour les ~170 autres améliorations (aujourd'hui le joueur les coche à la main dans le panneau) ; test réel sur iPad Air.

- [x] (21/09/2026) Audit des 223 cartes d'AMÉLIORATION : détection des symboles ↱ / ✖ sur les visuels (`scripts/tools/`), `src/data/upgradeCardUse.json` (186 permanentes, 28 qui s'inclinent, 8 supprimées, 1 double), champ « Utilisation de la carte » dans la certification, panneau prête/inclinée/supprimée adapté à chaque carte, notes corrigées (le ✖ est « supprimer », pas « incliner »), test de build : aucune carte non classée. Portée `melee-N` expliquée + raccourcis dans la certification, portée invalide refusée. Chewbacca (amélioration) : dés d'attaque améliorés dans la réserve + rappel en défense.

- [x] (21/09/2026) Armes manquantes : 10 cartes imprimaient des armes absentes de la base (Soldat avec Mortier DF-90, Soldat Monté sur Dewback, Équipe Blaster E-Web, Stormtroopers Unité Lourde d'Intervention, Kraken, Captain Rex, Mounted Gunners, Kallus l'Opérative, Dark Vador L'Apprenti, Droïde ID10) — détectées en comptant les icônes de portée sur les 301 visuels (les 291 autres cartes concordent). Vitesse : obligatoire pour toute unité dans la certification (choix 1/2/3, lot refusé sinon), affichée sur la fiche d'unité (puce + mobilité avec Immobilisation et Pointe de vitesse). À certifier : les unités encore sans vitesse (signalées « Vitesse ? »).

- [x] (22/09/2026) Bug « Nouvelle partie » : suppressions, états (démoralisé…) et round 5 revenaient à la synchro (la fusion n'efface jamais rien et le gist gardait l'ancienne partie ; la relève de l'Assistant réécrasait aussi le suivi). Correctif : numéro de partie (`swl.game-epoch.v1`, horodatage de « Nouvelle partie » / restauration) synchronisé avec le gist ; le plus récent gagne, l'ancienne partie est abandonnée par tous les appareils et par l'Assistant. Tests : `test-sync-merge.mjs` et scénario jsdom de synchro.

- [x] (22/09/2026) Certification accélérée : plus de cases à cocher obligatoires ; liste groupée (vos listes — unités puis améliorations —, écarts à relire, autres cartes) ; « Défilé rapide » : une carte à la fois (visuel + récapitulatif), « Conforme » (un clic, carte suivante), « À corriger… », « Passer », vitesse / utilisation de la carte demandées sur place.
