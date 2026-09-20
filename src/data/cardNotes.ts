import { normalizeName } from '../lib/normalize';
import { canonicalCardKey } from '../lib/cardNames';

/**
 * Texte d'effet propre à une carte, en français, pour les cartes dont le
 * texte imprimé ne se réduit à AUCUN mot-clé du glossaire (keywords.ts) —
 * donc invisibles dans le Glossaire/mode rapide/vue visuelle malgré un
 * effet réel, puisque ces trois vues n'affichent jusqu'ici que des
 * définitions de mots-clés (buildGlossary()/resolveUnitKeywords()).
 *
 * Signalement utilisateur du 06/09/2026 : « Présence Inspirante / Pointe de
 * Vitesse / Ténacité je ne vois pas de définition » — ces 3 cartes ont
 * `cardTags.ts` à `[]` (aucun mot-clé ne correspond à leur effet), donc
 * rien ne s'affichait. Plutôt que d'inventer un faux mot-clé, ce fichier
 * ajoute une table séparée : nom de carte -> paraphrase française de son
 * effet réel, telle que vue sur le PDF source lors de l'audit. N'existe QUE
 * pour les cartes à `[]` dans cardTags.ts qui ont un effet propre non-vide
 * (les cartes « Ajoutez 1 figurine de X » sans texte au-delà du nom restent
 * volontairement absentes d'ici, elles n'ont réellement rien à afficher).
 *
 * Même logique nom-normalisé -> valeur que cardImages.ts/diceProfiles.ts ;
 * canonicalCardKey() gère aussi bien un nom EN (Tabletop Admiral) que FR
 * (recopié depuis la carte).
 */
const RAW: Record<string, string> = {
  // === Force Choke / Saber Throw / Burst of Speed (Genrela_upgrade_fr_30mo.pdf)
  'Force Choke': "Côté Obscur uniquement. Choisissez une unité de soldats ennemie non-Massive, non-Énorme à ① de cette unité. L'unité choisie subit 1 blessure.",
  'Saber Throw': "Quand cette unité effectue une attaque avec cette arme, pendant l'étape « Constituer la réserve d'attaque », choisissez 1 des armes de corps-à-corps de cette unité. Les dés d'arme de cette arme sont égaux à la moitié du total de dés de l'arme choisie, arrondie au supérieur, et la réserve d'attaque gagne les mots-clés d'arme de l'arme choisie.",
  'Burst of Speed': "Au début de l'activation de cette unité, vous pouvez supprimer cette carte de la partie (icône ✖) pour considérer que la vitesse maximale de cette unité est 3 jusqu'à la fin du round. Dans ce cas, pendant la Phase Finale, cette unité gagne 1 pion Immobilisation.",
  // === Genrela_upgrade_fr_30mo.pdf — cartes Commandement
  'Vigilance': "Au début de l'étape « Retirer les pions », choisissez soit 1 unité de soldats alliée à ② de cette unité, soit jusqu'à 2 unités de soldats ▲ alliées à ② de cette unité. Chaque unité choisie ne retire pas jusqu'à 1 pion Esquive.",
  'Improvised Orders': "Pendant la Phase d'Activation, après avoir pioché un pion Ordre dans votre réserve d'ordres, vous pouvez incliner cette carte. Dans ce cas, piochez un second pion Ordre de cette réserve et choisissez 1 des pions Ordre piochés à utiliser. Ensuite, remélangez l'autre pion Ordre dans votre réserve d'ordres. Redressez cette carte pendant la Phase Finale.",
  'Strict Orders': "Pendant la Phase d'Activation, quand une unité alliée qui a un pion Ordre face visible commence son étape « Se rallier », elle peut choisir de retirer 1 pion Suppression au lieu de lancer les dés.",

  // === Genrela_upgrade_fr_30mo.pdf — cartes équipement/soldat
  'On the Hunt': "Quand cette unité attaque une unité de soldats qui a au moins 1 pion Blessure, elle peut gagner 1 pion Viser pendant l'étape « Lancer les dés d'attaque ».",
  'Endurance': "À la fin de la Phase d'Activation, cette unité peut retirer 1 pion Suppression.",
  'Point Blank': "Quand cette unité effectue une attaque à distance contre une unité ennemie à ②, après avoir résolu l'attaque, cette unité gagne 1 pion Esquive.",
  'In the Fray': "Pendant la Phase d'Activation, quand une unité ennemie commence son activation à ① de cette unité, cette unité peut gagner 1 pion Adrénaline.",
  'Protector': "Quand cette unité utilise Gardien X, vous pouvez incliner cette carte pour annuler les résultats obtenus grâce à Gardien X comme s'il s'agissait de résultats Bloc. Redressez cette carte pendant la Phase Finale.",
  'Seize the Opportunity': "Commandant ou Agent uniquement. Pendant l'étape « Donner des ordres » de la Phase de Commandement, vous pouvez supprimer cette carte de la partie (icône ✖). Dans ce cas, cette unité se donne un ordre à elle-même.",
  'Duck and Cover': "Quand cette unité défend contre une attaque à distance, au début de l'étape « Appliquer les esquives et couverts », elle peut gagner 1 pion Suppression.",
  'Emergency Stims': "Quand cette unité devrait subir 1 ou plusieurs blessures d'une attaque ennemie, vous pouvez incliner cette carte pour prévenir jusqu'à 2 de ces blessures et placer autant de pions Blessure sur cette carte à la place. Dans ce cas, au début de sa prochaine activation, cette unité retire chaque pion Blessure de cette carte et subit un nombre de blessures égal au nombre de pions Blessure ainsi retirés.",
  'Defensive Posture': "Seule une unité qui a au moins 1 icône d'amélioration Amélioration de Combat peut s'équiper de cette carte. Au début de l'activation de cette unité, vous pouvez retourner cette carte. Quand cette unité effectue une action Esquiver, elle gagne 2 pions Esquive au lieu de 1. Cette unité ne peut pas dépenser de pions Viser.",
  'Offensive Posture': "Seule une unité qui a au moins 1 icône d'amélioration Amélioration de Combat peut s'équiper de cette carte. Au début de l'activation de cette unité, vous pouvez retourner cette carte. Quand cette unité effectue une action Viser, elle gagne 2 pions Viser au lieu de 1. Cette unité ne peut pas dépenser de pions Esquive.",
  'Comms Jammer': "Les unités ennemies à ① de cette unité ne peuvent pas recevoir d'ordres, sauf si elles se donnent un ordre à elles-mêmes.",
  'Command System': "Véhicule uniquement. Quand cette unité utilise Coordination, elle peut donner un ordre à une unité à ② au lieu de ①.",
  'Emergency Transponder': "Au début de l'activation de cette unité, si elle a été activée grâce à un pion Ordre de la réserve d'ordres, vous pouvez supprimer cette carte de la partie (icône ✖). Dans ce cas, cette unité gagne 1 pion Viser ou 1 pion Esquive ou retire 1 pion Suppression.",
  'HQ Uplink': "Pendant l'étape « Donner des ordres » de la Phase de Commandement, vous pouvez incliner cette carte. Dans ce cas, cette unité peut se donner un ordre à elle-même.",
  'Comms Hacking Unit': "Pendant l'étape « Donner des ordres » de la Phase de Commandement, après qu'une unité ennemie à ① de cette unité a reçu un ordre, cette unité peut se donner un ordre à elle-même.",

  // === Genrela_upgrade_fr_30mo.pdf — grenades/imploseur/générateur/véhicule
  'Fragmentation Grenades': "Tant que cette arme est dans la réserve d'attaque, cette unité convertit ses adrénalines d'attaque en résultats Critique.",

  // === Genrela_upgrade_fr_30mo.pdf — Force/Côté Obscur/Côté Lumineux
  'Anger': "Côté Obscur uniquement. Quand cette unité subit au moins 1 blessure, après que l'effet a été résolu, elle gagne 1 pion Viser.",
  'Force Barrier': "Quand une autre unité de soldats alliée à ① de cette unité défend contre une attaque à distance, pendant l'étape « Modifier les dés d'attaque », vous pouvez incliner cette carte pour annuler soit 1 résultat Critique soit jusqu'à 2 résultats Touche.",

  // === Nouvelles_cartes_amelio_FR_MAJ23.02.2026.pdf
  'Hit and Run': "Unité ayant Speeder X uniquement (peut s'équiper même sans icône d'amélioration). Après que cette unité a effectué une action Attaquer, vous pouvez incliner cette carte pour effectuer une action Se déplacer.",
  'Dread': "Côté Obscur uniquement. Tant que cette unité n'est pas engagée, lorsqu'une unité ennemie à ② et en LdV de cette unité effectue une attaque à distance ciblant une autre unité alliée, l'unité attaquante gagne 1 pion Suppression après avoir résolu l'attaque.",
  'Entrenched': "Soldat en Position ou unité de soldats ayant Position Préparée uniquement (peut s'équiper même sans icône d'amélioration). Tant que cette unité est intégralement en territoire allié et qu'elle n'a pas de pion Ordre face cachée, elle lance des dés de défense rouges à la place des dés blancs quand elle lance sa réserve de couvert.",
  'Serenity': "Côté Lumineux uniquement. Après qu'une autre unité alliée à ② de cette unité s'est ralliée, mais avant son étape « Effectuer des actions », vous pouvez incliner cette carte. Dans ce cas, lancez un nombre de dés de défense blancs égal au courage de cette unité. Pour chaque résultat Bloc ou Adrénaline obtenu, cette unité et l'unité alliée retirent 1 pion Suppression. Lorsque vous devriez incliner cette carte, vous pouvez la supprimer de la partie (✖) à la place : lancez alors des dés de défense rouges au lieu des blancs.",
  'Additional Supplies': "À la fin de l'activation de cette unité, vous pouvez supprimer cette carte de la partie (icône ✖). Dans ce cas, redressez 1 des améliorations non-Ordonnance de cette unité.",
  'Clairvoyance': "Quand cette unité attaque, elle peut supprimer cette carte de la partie (icône ✖) pendant l'étape « Relancer les dés d'attaque » : elle relance tous ses dés d'attaque, puis convertit normalement tout résultat Adrénaline d'attaque ; ce jet ne peut plus être modifié ensuite. Quand cette unité défend, elle peut supprimer cette carte (✖) pendant l'étape « Relancer les dés » : elle relance tous ses dés de défense, puis convertit normalement tout résultat Adrénaline de défense ; ce jet ne peut plus être modifié.",
  'Mounted Gunners': "Véhicule ayant Transport uniquement (peut s'équiper même sans icône d'amélioration). Après que cette unité a effectué une action Attaquer pendant son activation, si elle n'a pas ajouté cette arme à une réserve d'attaque lors de cette action, elle peut effectuer une action Attaquer gratuite en n'utilisant que cette arme, même si elle a déjà attaqué ce tour.",
  'Kraken': "Unique, Soldat Droïde uniquement. Ajoute 1 figurine de Kraken (Chef). Cette unité gagne 1 icône d'amélioration Ordonnance et perd IA. Quand cette unité attaque, elle peut améliorer 1 dé d'attaque pour chaque figurine de cette unité qui a été précédemment vaincue.",
  'Captain Rex': "Unique, Soldat Clone uniquement. Ajoute 1 figurine du Capitaine Clone Rex (Chef). Cette unité augmente de 1 son courage et gagne 1 icône d'amélioration Personnel et 1 icône d'amélioration Ordonnance. Quand cette unité vainc une unité ennemie, après résolution de l'effet, elle peut effectuer 1 action gratuite.",

  // === Empire Galactique — améliorations à texte propre (audit précédent)
  'Stormtrooper Specialist': "Cette unité gagne 1 icône d'amélioration ; l'action associée (gagner 1 pion Viser ou 1 pion Adrénaline) est propre à la carte.",

  // === Signalées explicitement par l'utilisateur le 06/09/2026 comme sans
  // définition visible (Ténacité/Présence Inspirante/Pointe de Vitesse — cette
  // dernière déjà couverte ci-dessus sous 'Burst of Speed').
  'Tenacity': "Quand cette unité effectue une attaque au corps-à-corps, pendant l'étape « Constituer la réserve d'attaque », si elle a 1 ou plusieurs pions Blessure ou si 1 ou plusieurs de ses figurines sont vaincues, elle peut ajouter 1 dé d'attaque rouge à ses réserves d'attaque.",
  'Inspiring Presence': "Les unités alliées à ④ de cette unité peuvent utiliser son courage lorsqu'elles vérifient si elles sont paniquées. Cette portée peut être réduite par d'autres effets.",

  // === Batch 3 (06/09/2026) — cartes équipage/pilote sans mot-clé glossaire
  'Imperial TIE Pilot': "Véhicule à répulseurs uniquement. Augmentez de 1 la vitesse maximale de cette unité.",
  'Ryder Azadi': "Véhicule à répulseurs uniquement. Quand cette unité effectue un déplacement, vous pouvez incliner cette carte afin d'augmenter ou de réduire de 1 sa vitesse maximale.",
  'Unstable Astromech': "Landspeeder X-34 uniquement. À la fin de l'activation de cette unité, vous pouvez supprimer cette carte de la partie (icône ✖). Dans ce cas, cette unité peut effectuer une attaque ou se déplacer. Ensuite, après que l'effet a été résolu, lancez 3 dés d'attaque noirs. Cette unité subit 1 blessure pour chaque résultat Touche ou Critique obtenu.",
  'Unorthodox Tactician': "Camion Speeder A-A5 uniquement. Au début de l'activation de cette unité, lancez 3 dés de défense rouges. Pour chaque résultat Bloc ou Adrénaline obtenu, choisissez une unité alliée différente à ③. Chaque unité choisie gagne 1 pion Viser.",
  'Rebel Comms Technician': "Soldat Rebelle ▲ uniquement. Ajoute 1 figurine de Technicien Comms Rebelle. Cette unité gagne 1 icône d'amélioration Comms et doit s'équiper d'au moins 1 amélioration Comms.",

  // === Audit du 21/09/2026 — cartes sans mot-clé lues sur les visuels
  'IG11 Nanny Programming': "IG-11 uniquement. Lorsque vous créez votre armée, un Grogu allié gagne Alter Ego : IG-11. Cette unité gagne IA : Esquive, Déplacement.",
  'IG11 Prime Programming': "IG-11 uniquement. Cette unité gagne Prime et IA : Viser, Attaque. Si elle choisit comme cible de Prime une unité d'un certain rang, ses armes gagnent Perforant 1 ; pour un autre rang, Suppressif (rangs exacts : voir la carte).",
  'Smoke Grenades': "Pendant l'activation de cette unité, vous pouvez supprimer cette carte de la partie (icône ✖). Dans ce cas, cette unité effectue une action gratuite Fumée 1.",
  'Imperial March': "Quand cette unité effectue une deuxième action Se déplacer au cours de son activation, augmentez sa vitesse de 1 pendant cette action. De plus, quand cette unité effectue une action Se déplacer au cours de son activation, vous pouvez supprimer cette carte de la partie (icône ✖) : cette unité gagne Charge jusqu'à la fin de son activation.",

  // === Audit visuel du 20/09/2026 : effets propres relus sur chaque visuel (cartes à mots-clés incluses)
  "Barrage Generator": "Quand cette unité effectue une attaque avec une arme à distance qui a Fixe, pendant l'étape « Constituer la réserve d'attaque », vous pouvez incliner cette carte (↱). Dans ce cas, ajoutez 2 dés d'attaque blancs à la réserve d'attaque et elle gagne Suppressif.",
  "Generator Overcharge": "Quand cette unité effectue une attaque avec une arme à distance qui a Fixe, pendant l'étape « Constituer la réserve d'attaque », vous pouvez incliner cette carte (↱). Dans ce cas, ajoutez 1 dé d'attaque noir à la réserve d'attaque et elle gagne Impact 1.",
  "Stormtrooper Captain": "Stormtroopers uniquement. Ajoute 1 figurine de Capitaine Stormtrooper. Chef. Cette unité gagne 1 icône d'amélioration Entraînement. Au début de l'activation de cette unité, vous pouvez incliner cette carte (↱) : cette unité ne peut ni retirer de pions Suppression ni être démoralisée pendant cette activation.",
  "Rebel Trooper Captain": "Soldats Rebelles uniquement. Ajoute 1 figurine de Capitaine Soldat Rebelle. Chef. Cette unité gagne 1 icône d'amélioration Entraînement. Au début de l'activation de cette unité, vous pouvez incliner cette carte (↱) : cette unité ne peut ni retirer de pions Suppression ni être démoralisée pendant cette activation.",
  "Wedge Antilles": "Véhicule à répulseurs Rebelle uniquement. Cette unité gagne Commandant des Opérations. Action de carte gratuite (↱») : cette unité effectue un pivot.",
  "Hunter": "Le Bad Batch uniquement. Ajoute 1 figurine de Hunter. Chef. Action de carte gratuite (») : choisissez une unité de soldats ennemie non-Massive, non-Énorme à ① et en LdV. Lancez 1 dé d'attaque noir : sur un résultat Touche ou Critique, l'unité choisie subit 1 blessure.",
  "Kallus the Operative": "Unité Empire ▲ ou ▼▲ uniquement. Ajoute 1 figurine de l'Agent Kallus. Chef. Cette unité augmente de 1 son courage, gagne Démoraliser 1 et 1 icône d'amélioration Personnel. Action de carte gratuite (↱») : choisissez une unité ennemie engagée avec cette unité ; elle gagne 2 pions Immobilisation. Arme de Poing : à distance.",
  "Din Djarin Amban Rifle": "Din Djarin uniquement. Action de carte (→→, consomme 2 actions) : si cette unité n'est pas engagée, elle peut effectuer un déplacement à vitesse 1. Ensuite, choisissez une unité ennemie en LdV et lancez 1 dé d'attaque rouge : sur un résultat Touche ou Critique, l'unité choisie subit 1 blessure et gagne 1 pion Suppression.",
  "Climbing Cables": "Action de carte gratuite (↱») : cette unité gagne Ascension jusqu'à la fin de son activation.",
  "Fire Control": "Quand une autre unité alliée à ① effectue une attaque à distance contre une unité ennemie en LdV de cette unité, améliorez 2 des dés d'attaque de l'unité attaquante.",
  "Combat Armor Rebel": "Agent Rebelle ou Officier Rebelle uniquement. La défense de cette unité devient rouge au lieu de blanche, et cette unité n'a plus son adrénaline de défense (Adrénaline : Bloc).",
  "Imperial Comms Technician": "Soldat Empire ▲ uniquement. Ajoute 1 figurine de Technicien Comms Impérial. Cette unité gagne 1 icône d'amélioration Comms et doit s'équiper d'au moins 1 amélioration Comms (contrainte de construction de liste).",
  "Baron Rudor": "Véhicule à répulseurs Empire uniquement. Cette unité gagne Tireur Embusqué. Après que cette unité a effectué une action Récupérer, elle gagne 1 pion Viser.",
  "Battle Shield Wookiee": "Au début de l'activation de cette unité, vous pouvez retourner cette carte (bouton « Retourner la carte » de la fiche) : la vitesse maximale de cette unité est réduite de 1 et elle gagne Armure 1 (Armure 1 n'est active que carte retournée).",
  "Black Sun Enforcer Concealment": "Cette unité conserve Cache : Esquive 1 même si la figurine ajoutée par cette carte est vaincue.",
  "Pyke Foot Soldier Concealment": "Cette unité conserve Cache : Viser 1 même si la figurine ajoutée par cette carte est vaincue.",
  "Super Commando Concealment": "Cette unité conserve Cache : Adrénaline 2 même si la figurine ajoutée par cette carte est vaincue.",
  "Cad Bane Electro Gauntlets": "Cad Bane uniquement. Tant que cette unité est engagée, elle peut effectuer des déplacements normalement si une unité avec laquelle elle est engagée a 1 ou plusieurs pions Immobilisation.",
  "Cassian Andor Operative": "Carte à deux faces (face A au départ). Unité Rebelle ▲ uniquement. Ajoute 1 figurine de Cassian Andor. Chef. Cette unité augmente de 1 son courage et gagne 1 icône d'amélioration Personnel. FACE A : Profil Bas et Mission Secrète ; arme A280 Configuration Sniper. Quand au moins 1 figurine de cette unité est vaincue, vous pouvez retourner la carte (bouton « Retourner la carte » de la fiche). FACE B : le courage de cette unité devient « - » ; Coup de Chance 1 ; une fois par tour, quand cette unité constitue une réserve d'attaque, ajoutez 1 dé d'attaque blanc par figurine de cette unité précédemment vaincue ; arme Opérations Secrètes.",
  "Crosshair": "Ajoute 1 figurine de Crosshair. Cette unité gagne Précis 1. Tant qu'une réserve d'attaque ne contient que l'arme Fusil Firepuncher, la réserve d'attaque gagne Critique 1.",
  "Din Djarin Jetpack": "Din Djarin uniquement. Augmentez de 1 la vitesse de cette unité. Cette unité gagne Saut 2 (action).",
  "Governor Pryce": "Cette unité gagne Commandant des Opérations. Action de carte gratuite (») : choisissez une unité de soldats alliée à ② de cette unité ; elle gagne 1 pion Viser et 1 pion Suppression.",
  "Shriv Suurgav": "Cette unité gagne Commandant des Opérations. Action de carte gratuite (») : choisissez une unité de soldats alliée à ② de cette unité ; elle gagne 1 pion Esquive et peut gagner 1 pion Suppression.",
  "Gideon Hask": "Chef. Cette unité augmente de 1 son courage et gagne Coordination : Soldat ▲.",
  "Imperial Officer": "Soldat ▲ uniquement. Ajoute 1 figurine d'Officier Impérial. Chef. Cette unité augmente de 1 son courage et gagne Inspiration 1.",
  "Rebel Officer": "Soldat ▲ uniquement. Ajoute 1 figurine d'Officier Rebelle. Chef. Cette unité augmente de 1 son courage et gagne Inspiration 1.",
  "Inquisitorius Training": "La Septième Sœur uniquement. Cette unité gagne Démoraliser 1. Quand une unité ennemie à ① incline une amélioration (icône indiquée sur la carte), vous pouvez lancer un dé de défense rouge : sur un résultat Bloc ou Adrénaline, annulez l'effet de cette amélioration ; elle reste inclinée.",
  "Imperial Hammers Elite Armor Pilot": "Véhicule terrestre Empire uniquement. Cette unité gagne l'adrénaline d'attaque « Adrénaline : Critique ».",
  "Programmed Loyalty": "Dark Troopers Impériaux uniquement. Cette unité ne peut recevoir d'ordres que d'une unité du type indiqué sur la carte, et gagne Escorte : ce même type d'unité.",
  "Sleeper Cell Astromech": "Cellule Dormante Rebelle uniquement. Ajoute 1 figurine d'Astromech. Non-combattant. Quand cette unité termine un déplacement à ① d'au moins 1 pion Objectif, elle gagne 1 pion Esquive.",
  "Spotter Link": "Quand une autre unité alliée déclare une attaque à distance contre une unité ennemie à ① et en LdV de cette unité, si cette unité ennemie n'est pas engagée au corps-à-corps, l'unité attaquante gagne Tireur d'Élite 1.",
  "Repeating Blaster": "Officier Rebelle uniquement. Réduisez de 1 la vitesse maximale de cette unité. Cette unité gagne Précis 2.",
  "Wrecker": "Ajoute 1 figurine de Wrecker. Tant que cette figurine est sur le champ de bataille, l'Alter Ego Omega de cette unité ne peut pas se voir assigner de blessures.",
  "Combat Group Leader": "Unité ▲ uniquement. Lors de la mise en place, cette unité peut choisir une unité de troupes alliée qui a la même affiliation ou faction qu'elle. Au début de chaque Phase d'Activation, l'unité choisie gagne 1 pion Viser ou 1 pion Esquive si elle est à ② de cette unité. De plus, l'unité choisie peut prêter main-forte à cette unité.",
  "Mission Objective": "Soldat uniquement. Quand cette unité attaque une unité ennemie qui détient ou conteste au moins 1 pion Objectif, pendant l'étape « Relancer les dés d'attaque », vous pouvez incliner cette carte (↱) : cette unité relance 1 dé d'attaque. Au début de l'activation de cette unité, redressez cette carte.",
  "Trusted Agent": "Unique. Pendant l'étape « Donner des ordres » de la Phase de Commandement, vous pouvez supprimer cette carte de la partie (✖). Dans ce cas, choisissez une unité ▲ alliée : cette unité donne un ordre à l'unité choisie, quelle que soit son affiliation.",
  "Force Guidance": "Action de carte gratuite (↱») : choisissez jusqu'à 2 unités alliées à ② de cette unité. Chaque unité choisie gagne 1 pion Adrénaline.",
  "Force Push": "Action de carte gratuite (↱») : choisissez une unité de soldats ennemie à ① de cette unité. L'unité choisie effectue un déplacement à vitesse 1, même si elle est engagée. Vous résolvez ce déplacement.",
  "Old Jedi Trick": "Côté Lumineux uniquement. Action de carte gratuite (↱») : choisissez une unité de soldats ennemie non-Massive, non-Énorme à ② de cette unité. L'unité choisie gagne 2 pions Suppression.",
  "Force Reflexes": "Action de carte gratuite (↱») : cette unité gagne 1 pion Esquive.",
  "Ascension Cables": "Action de carte gratuite (↱») : cette unité gagne Ascension jusqu'à la fin de son activation.",
  "Sabine's Grapple Line": "Sabine Wren uniquement. Action de carte (↱→, la carte s'incline) : choisissez une unité de soldats ennemie à ① et en LdV de cette unité. L'unité choisie gagne 2 pions Immobilisation et 2 pions Suppression.",
  "Rebel Trooper Specialist": "Soldats Rebelles uniquement. Ajoute 1 figurine de Spécialiste Soldat Rebelle. Cette unité gagne 1 icône d'amélioration Comms. Action de carte gratuite (↱») : cette unité gagne 1 pion Esquive ou 1 pion Adrénaline.",
  "Stormtrooper Sharpshooter": "Antiémeute uniquement. Ajoute 1 figurine de Tireur Embusqué Stormtrooper. Action de carte (→) : si cette unité n'est pas engagée, choisissez une unité de soldats ennemie non engagée en LdV et lancez 1 dé d'attaque rouge : sur un résultat Touche ou Critique, l'unité choisie subit 1 blessure et gagne 1 pion Suppression.",
  "Rebel Ambusher": "Cellule Dormante Rebelle uniquement. Action de carte (→) : si cette unité n'est pas engagée, choisissez une unité de soldats ennemie non engagée en LdV et lancez 1 dé d'attaque rouge : sur un résultat Touche ou Critique, l'unité choisie subit 1 blessure et gagne 1 pion Suppression.",
  "Remote Doc": "Camion Speeder A-A5 uniquement. Action de carte (→) : choisissez une unité alliée de soldats non-droïdes à ① et en LdV de cette unité. Retirez 1 pion Blessure ou Poison, ou restaurez 1 figurine, de l'unité choisie. Ensuite, lancez 2 dés de défense blancs : l'unité choisie gagne 1 pion Suppression pour chaque résultat Bloc ou Adrénaline obtenu.",
};

export const CARD_NOTES: Record<string, string> = Object.fromEntries(
  Object.entries(RAW).map(([name, note]) => [normalizeName(name), note]),
);

/** Accepte aussi bien un nom anglais (Tabletop Admiral) qu'un nom français recopié depuis la carte — voir canonicalCardKey(). */
export function cardNoteFor(name: string): string | undefined {
  return CARD_NOTES[canonicalCardKey(name)];
}
