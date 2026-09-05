import { normalizeName } from '../lib/normalize';
import { canonicalCardKey } from '../lib/cardNames';

export type DiceColor = 'blanc' | 'rouge' | 'noir';

export interface WeaponDice {
  color: DiceColor;
  count: number;
}

export interface WeaponProfile {
  /** Nom affiché de l'arme, tel qu'imprimé sur la carte (déjà en français). */
  name: string;
  /** Un tableau car une arme peut piocher dans plusieurs couleurs à la fois (ex. 2 rouges + 2 noirs). */
  dice: WeaponDice[] | 'variable';
  /** Distance imprimée sur la carte (ex. '1-3', 'melee', '-2' pour une arme de lancer). Purement informatif ici. */
  range?: string;
  /** Présent seulement quand dice = 'variable' : renvoie au texte de la carte pour le calcul exact. */
  note?: string;
}

export interface CardDiceProfile {
  weapons: WeaponProfile[];
  /** Couleur du dé de défense de l'unité (absent : carte sans défense propre — compagnon, ou amélioration). */
  defenseColor?: DiceColor;
  note?: string;
}

/**
 * Dés d'attaque (couleur + nombre) et dé de défense, lus directement sur les
 * visuels de cartes déjà utilisés par l'appli (public/cards/*.jpg) — losange
 * coloré = couleur du dé, chiffre à l'intérieur = nombre de dés. Vérifié
 * carte par carte (comme cardNamesFr.ts), jamais deviné : une arme dont le
 * nombre de dés dépend du texte de la carte (ex. Sabre Lancé) est marquée
 * `dice: 'variable'` plutôt que de fabriquer un chiffre.
 *
 * Couvre les 116 cartes de cardTags.ts. Une carte sans arme (améliorations
 * Personnel/Chef/Commandement, droïdes non-combattants, compagnons...) a
 * `weapons: []` — volontaire, pas un oubli.
 *
 * Volontairement absent : la conversion de surcharge (icônes de part et
 * d'autre du dé de défense sur la carte). Leur signification exacte n'a pas
 * été confirmée avec certitude — mieux vaut ne rien afficher que d'inventer
 * une règle. Le visuel de la carte reste affiché à l'écran pour qui veut
 * les lire directement.
 */
const RAW: Record<string, CardDiceProfile> = {
  '2-1B Medical Droid': { weapons: [], note: 'Non-combattant' },
  // 'Canon Blaster' corrigé le 06/09/2026 : 3 losanges sur le visuel
  // (rouge/blanc/noir), le noir manquait entièrement.
  '74-Z Speeder Bikes': { weapons: [{ name: 'Blaster de Poche EC-17', dice: [{ color: 'noir', count: 2 }], range: '1-2' }, { name: 'Canon Blaster', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: '1-3' }], defenseColor: 'rouge' },
  '88i Twin Light Blaster': { weapons: [{ name: 'Blasters Légers Jumelés 88i', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: '1-3' }] },
  'A280-CFE Pistol/Sniper Config': { weapons: [{ name: 'A280, Config Fusil', dice: [{ color: 'rouge', count: 1 }, { color: 'noir', count: 1 }], range: '1-#' }] },
  'AG-2G Quad Laser': { weapons: [{ name: 'Quadrilaser AG-2G', dice: [{ color: 'noir', count: 6 }], range: '1-3' }] },
  'AT-RT': { weapons: [{ name: 'Griffes Agrippantes', dice: [{ color: 'rouge', count: 3 }], range: 'melee' }, { name: 'Fusil Blaster A300', dice: [{ color: 'blanc', count: 2 }], range: '1-3' }], defenseColor: 'rouge' },
  'AT-ST': { weapons: [{ name: 'Pinces Coupantes', dice: [{ color: 'rouge', count: 4 }], range: 'melee' }, { name: 'Blasters Jumelés MS-4', dice: [{ color: 'rouge', count: 2 }, { color: 'blanc', count: 2 }, { color: 'noir', count: 2 }], range: '1-4' }], defenseColor: 'rouge' },
  'AT-ST Mortar Launcher': { weapons: [{ name: 'Lance-mortier de TR-TT', dice: [{ color: 'blanc', count: 3 }], range: '4-#' }] },
  'Agent Kallus': { weapons: [{ name: 'Fusil-Bo J-19', dice: [{ color: 'rouge', count: 1 }, { color: 'noir', count: 3 }], range: '-2' }], defenseColor: 'rouge' },
  'Ahsoka Tano': { weapons: [{ name: 'Sabres Laser d\'Ahsoka', dice: [{ color: 'rouge', count: 2 }, { color: 'blanc', count: 2 }, { color: 'noir', count: 2 }], range: 'melee' }], defenseColor: 'rouge' },
  'Battle Shield Wookiee': { weapons: [{ name: 'Bouclier de Combat', dice: [{ color: 'noir', count: 2 }], range: 'melee' }] },
  'Beskad Duelist': { weapons: [{ name: 'Vibrolame', dice: [{ color: 'rouge', count: 2 }], range: 'melee' }] },
  'Bowcaster Wookiee': { weapons: [{ name: 'Arbalète', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 1 }], range: '1-3' }] },
  'Burst of Speed': { weapons: [], note: 'carte de commandement, pas d\'arme' },
  'C-3PO': { weapons: [{ name: 'Coup de Pied Maladroit', dice: [{ color: 'blanc', count: 1 }], range: 'melee' }], note: 'Compagnon (Alter Ego : R2-D2) — pas de défense propre, utilise celle de l\'unité hôte' },
  'CM-O/93 Trooper': { weapons: [{ name: 'CM-O/93', dice: [{ color: 'blanc', count: 4 }], range: '1-4' }] },
  'Cassian Andor': { weapons: [{ name: 'Arts Martiaux', dice: [{ color: 'noir', count: 3 }], range: 'melee' }, { name: 'Blaster Modulaire de Cassian', dice: [{ color: 'blanc', count: 2 }, { color: 'noir', count: 2 }], range: '1-2' }], defenseColor: 'rouge' },
  'Chewbacca': { weapons: [{ name: 'Prépotence', dice: [{ color: 'rouge', count: 4 }], range: 'melee' }, { name: 'Arbalète de Chewbacca', dice: [{ color: 'rouge', count: 2 }, { color: 'blanc', count: 2 }], range: '1-3' }], defenseColor: 'rouge' },
  'DF-90 Mortar Trooper': { weapons: [], note: 'carte extension d\'unité (personnel), pas de bloc arme propre' },
  'DH-447 Sniper': { weapons: [{ name: 'Fusil de Sniper DH-447', dice: [{ color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: '1-5' }] },
  'DLT-19 Stormtrooper': { weapons: [{ name: 'Fusil Blaster DLT-19', dice: [{ color: 'rouge', count: 2 }], range: '1-4' }] },
  'DLT-19D Trooper': { weapons: [{ name: 'Fusil Blaster DLT-19D', dice: [{ color: 'rouge', count: 2 }, { color: 'blanc', count: 1 }], range: '1-4' }] },
  'DLT-19x Sniper': { weapons: [{ name: 'Fusil DLT-19x', dice: [{ color: 'noir', count: 2 }], range: '1-5' }] },
  'DLT-20A Range Trooper': { weapons: [{ name: 'Fusil Blaster DLT-20A', dice: [{ color: 'rouge', count: 2 }], range: '1-5' }] },
  'DLT-20A Trooper': { weapons: [{ name: 'Fusil Blaster DLT-20A', dice: [{ color: 'blanc', count: 1 }, { color: 'noir', count: 2 }], range: '1-4' }] },
  'DW-3 Concussion Grenade Launcher': { weapons: [{ name: 'Lance-grenades DW-3', dice: [{ color: 'noir', count: 2 }], range: '1-2' }] },
  'Dark Trooper Squad': { weapons: [{ name: 'Poing Écrasant', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 1 }], range: 'melee' }, { name: 'Blaster E-11D', dice: [{ color: 'noir', count: 1 }], range: '1-3' }], defenseColor: 'rouge' },
  'Darth Vader Dark Lord of the Sith': { weapons: [{ name: 'Sabre Laser de Vador', dice: [{ color: 'rouge', count: 6 }], range: 'melee' }], defenseColor: 'rouge' },
  'Dewback Rider': { weapons: [], note: 'carte extension d\'unité (personnel), pas de bloc arme propre' },
  'Director Orson Krennic': { weapons: [{ name: 'Non armé', dice: [{ color: 'noir', count: 1 }], range: 'melee' }, { name: 'Blaster de Krennic', dice: [{ color: 'rouge', count: 3 }], range: '1-2' }], defenseColor: 'rouge' },
  'E-Web Heavy Blaster Team': { weapons: [], note: 'carte extension d\'unité (personnel), pas de bloc arme propre' },
  'FX-9 Medical Droid': { weapons: [], note: 'Non-combattant' },
  'Flametrooper': { weapons: [{ name: 'Lance-flammes', dice: [{ color: 'noir', count: 1 }], range: '-1' }] },
  'Fleet Trooper Squad': { weapons: [], note: 'règle de cohésion, pas d\'arme' },
  'Fleet Troopers': { weapons: [{ name: 'Pistolet Blaster DH-17', dice: [{ color: 'blanc', count: 2 }], range: '-2' }], defenseColor: 'rouge' },
  'Force Choke': { weapons: [], note: 'carte de commandement (Force), pas d\'arme à dés' },
  'General Veers': { weapons: [{ name: 'Expertise du Combat', dice: [{ color: 'noir', count: 2 }], range: 'melee' }, { name: 'Fusil Blaster de Veers', dice: [{ color: 'rouge', count: 3 }], range: '1-3' }], defenseColor: 'rouge' },
  'HH-12 Stormtrooper': { weapons: [{ name: 'Lance-roquettes HH-12', dice: [{ color: 'noir', count: 3 }], range: '2-4' }] },
  'Heavy Laser Retrofit': { weapons: [{ name: 'Conversion Laser Lourd', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: '1-4' }] },
  'Hotshot Pilot': { weapons: [], note: 'confère Tireur d\'Élite 1, pas d\'arme propre' },
  'Han Solo': { weapons: [{ name: 'Bagarre', dice: [{ color: 'blanc', count: 3 }], range: 'melee' }, { name: 'Blaster DL-44 de Han', dice: [{ color: 'rouge', count: 2 }], range: '1-2' }], defenseColor: 'rouge' },
  'A-A5 Speeder Truck': { weapons: [], defenseColor: 'rouge', note: 'véhicule de transport, pas d\'arme propre' },
  'Rebel Sleeper Cell': { weapons: [{ name: 'Pack d\'Explosifs', dice: [{ color: 'rouge', count: 1 }], range: 'melee' }, { name: 'Pistolets Blaster', dice: [{ color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: 'melee' }, { name: 'Pistolets Blaster', dice: [{ color: 'noir', count: 2 }], range: '1-2' }], defenseColor: 'rouge' },
  // 'Non armé' corrigé le 06/09/2026 : losange noir plein sur le visuel —
  // même confusion pastille rouge (badge de portée mêlée) / dé que sur
  // Scout Troopers ci-dessus.
  '1.4 FD Laser Cannon Team': { weapons: [{ name: 'Non armé', dice: [{ color: 'noir', count: 2 }], range: 'melee' }, { name: 'Pistolets Blaster', dice: [{ color: 'blanc', count: 4 }], range: '1-2' }, { name: 'Canon Laser 1.4 FD', dice: [{ color: 'noir', count: 5 }], range: '1-5' }], defenseColor: 'rouge' },
  'Mandalorian Resistance Clan Wren': { weapons: [{ name: 'Blasters WESTAR-35', dice: [{ color: 'noir', count: 2 }], range: '-2' }], defenseColor: 'rouge' },
  'Iden Versio': { weapons: [{ name: 'Arts Martiaux', dice: [{ color: 'noir', count: 3 }], range: 'melee' }, { name: 'Fusil DLT-20A d\'Iden', dice: [{ color: 'noir', count: 2 }], range: '1-#' }, { name: 'Répétiteur TL-50 d\'Iden', dice: [{ color: 'rouge', count: 2 }, { color: 'blanc', count: 2 }, { color: 'noir', count: 1 }], range: '1-3' }], defenseColor: 'rouge' },
  // 'Fusil Blaster E-11D' corrigé le 06/09/2026 : losange noir plein sur le
  // visuel, pas blanc.
  'Imperial Death Troopers': { weapons: [{ name: 'Combat Rapproché', dice: [{ color: 'rouge', count: 1 }], range: 'melee' }, { name: 'Blaster Léger SE-14r', dice: [{ color: 'blanc', count: 2 }], range: '1-2' }, { name: 'Fusil Blaster E-11D', dice: [{ color: 'noir', count: 1 }], range: '1-3' }], defenseColor: 'rouge' },
  'Imperial March': { weapons: [], note: 'carte de commandement, pas d\'arme' },
  'Imperial Officer': { weapons: [], note: 'Chef, pas d\'arme propre' },
  'Imperial Special Forces': { weapons: [{ name: 'Non armé', dice: [{ color: 'noir', count: 1 }], range: 'melee' }, { name: 'Fusil Blaster E-11', dice: [{ color: 'noir', count: 1 }], range: '1-3' }], defenseColor: 'rouge' },
  'Imperial Special Forces Inferno Squad': { weapons: [{ name: 'Combat Rapproché', dice: [{ color: 'rouge', count: 1 }], range: 'melee' }, { name: 'Fusil Blaster E-11', dice: [{ color: 'noir', count: 2 }], range: '1-3' }], defenseColor: 'rouge' },
  'Jetpack Rockets': { weapons: [{ name: 'Roquettes Dorsales', dice: [{ color: 'rouge', count: 1 }], range: '3-4' }] },
  'Jyn Erso': { weapons: [{ name: 'Tonfa Télescopique', dice: [{ color: 'noir', count: 4 }], range: 'melee' }, { name: 'Pistolet Blaster A-180', dice: [{ color: 'rouge', count: 2 }, { color: 'blanc', count: 1 }], range: '1-2' }], defenseColor: 'rouge' },
  'K-2SO': { weapons: [{ name: 'Domination', dice: [{ color: 'rouge', count: 4 }], range: 'melee' }], defenseColor: 'rouge' },
  'KX-Series Security Droids': { weapons: [{ name: 'Oppression', dice: [{ color: 'rouge', count: 1 }], range: 'melee' }] },
  'LAAT/le Patrol Transport': { weapons: [{ name: 'Canons Laser Jumelés', dice: [{ color: 'rouge', count: 2 }, { color: 'noir', count: 2 }], range: '1-3' }], defenseColor: 'rouge' },
  'Lando Calrissian': { weapons: [{ name: 'Plan de Secours', dice: [{ color: 'noir', count: 3 }], range: 'melee' }, { name: 'Blaster X-8 de Lando', dice: [{ color: 'rouge', count: 1 }, { color: 'noir', count: 3 }], range: '1-2' }], defenseColor: 'rouge' },
  'Leia Organa': { weapons: [{ name: 'Arts Martiaux', dice: [{ color: 'noir', count: 3 }], range: 'melee' }, { name: 'Blaster de Leia', dice: [{ color: 'rouge', count: 3 }], range: '1-3' }], defenseColor: 'rouge' },
  'Linked Targeting Array': { weapons: [], note: 'confère Cible 1, pas d\'arme propre' },
  'Long Gun Wookiee': { weapons: [{ name: 'Arme d\'Épaule', dice: [{ color: 'noir', count: 2 }], range: '1-4' }] },
  'Luke Skywalker Hero of the Rebellion': { weapons: [{ name: 'Sabre Laser d\'Anakin', dice: [{ color: 'rouge', count: 2 }, { color: 'noir', count: 3 }], range: 'melee' }, { name: 'Blaster de Luke', dice: [{ color: 'rouge', count: 1 }, { color: 'noir', count: 3 }], range: '1-2' }], defenseColor: 'rouge' },
  'Luke Skywalker Jedi Knight': { weapons: [{ name: 'Sabre Laser de Luke', dice: [{ color: 'noir', count: 7 }], range: 'melee' }], defenseColor: 'rouge' },
  'M-45 Ion Blaster': { weapons: [{ name: 'Blaster Ionique M-45', dice: [{ color: 'blanc', count: 2 }, { color: 'noir', count: 2 }], range: '1-4' }] },
  'MPL-57 Barrage Trooper': { weapons: [{ name: 'MPL-57 de Barrage', dice: [{ color: 'blanc', count: 2 }, { color: 'noir', count: 1 }], range: '1-3' }] },
  'MPL-57 Ion Trooper': { weapons: [{ name: 'MPL-57 à Ions', dice: [{ color: 'blanc', count: 1 }, { color: 'noir', count: 2 }], range: '1-3' }] },
  'Major Marquand': { weapons: [{ name: 'Lance-grenades', dice: [{ color: 'noir', count: 2 }], range: '-2' }, { name: 'Blasters Légers Jumelés 88', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: '-3' }, { name: 'Blasters Jumelés MS-4', dice: [{ color: 'rouge', count: 2 }, { color: 'blanc', count: 2 }, { color: 'noir', count: 2 }], range: '1-4' }], defenseColor: 'rouge' },
  'Mandalorian Combat Shields': { weapons: [], note: 'confère Bouclier 2, pas d\'arme propre' },
  'Mandalorian Resistance': { weapons: [{ name: 'Blasters WESTAR-35', dice: [{ color: 'noir', count: 2 }], range: '-2' }], defenseColor: 'rouge' },
  // 'Non armé' corrigé le 06/09/2026 : dé noir sur le visuel (losange plein
  // noir, pas blanc) — signalé par l'utilisateur.
  'Mark II Medium Blaster Trooper': { weapons: [{ name: 'Non armé', dice: [{ color: 'noir', count: 1 }], range: 'melee' }, { name: 'Blaster Moyen Mark II', dice: [{ color: 'noir', count: 4 }], range: '1-3' }], defenseColor: 'rouge' },
  'Mo/DK Power Harpoon': { weapons: [{ name: 'Harpon Magnétique Mo/DK', dice: [{ color: 'rouge', count: 1 }], range: '1-2' }] },
  'Moff Gideon': { weapons: [{ name: 'Entraînement au Combat', dice: [{ color: 'rouge', count: 2 }], range: 'melee' }, { name: 'Blaster de Gideon', dice: [{ color: 'rouge', count: 1 }, { color: 'noir', count: 2 }], range: '1-2' }], defenseColor: 'rouge' },
  'Offensive Push': { weapons: [], note: 'carte de commandement, pas d\'arme' },
  'Outer Rim Speeder Jockey': { weapons: [], note: 'confère Couvert 1, pas d\'arme propre' },
  'Proton Charge Saboteur': { weapons: [{ name: 'Charge à Protons', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: '-1' }] },
  'R2-D2': { weapons: [{ name: 'Électrochoc', dice: [{ color: 'blanc', count: 3 }], range: '-1' }], defenseColor: 'rouge' },
  'R5 Astromech Droid': { weapons: [], note: 'Non-combattant' },
  'RPS-6 Rocket Gunner': { weapons: [{ name: 'Lance-roquettes RPS-6', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: '2-4' }] },
  // 'Fusil Blaster E-10R' corrigé le 06/09/2026 : losange noir plein sur le
  // visuel, pas blanc ('Coup de Botte-crampon' au-dessus est bien blanc,
  // vérifié séparément).
  'Range Troopers': { weapons: [{ name: 'Coup de Botte-crampon', dice: [{ color: 'blanc', count: 2 }], range: 'melee' }, { name: 'Fusil Blaster E-10R', dice: [{ color: 'noir', count: 1 }], range: '1-4' }], defenseColor: 'rouge' },
  'Rebel Commandos': { weapons: [{ name: 'Non armé', dice: [{ color: 'noir', count: 1 }], range: 'melee' }, { name: 'Fusil Blaster A280', dice: [{ color: 'noir', count: 1 }], range: '1-3' }], defenseColor: 'rouge' },
  'Rebel Commandos Strike Team': { weapons: [{ name: 'Non armé', dice: [{ color: 'noir', count: 1 }], range: 'melee' }, { name: 'Fusil Blaster A280', dice: [{ color: 'noir', count: 1 }], range: '1-3' }], defenseColor: 'rouge' },
  'Rebel Officer': { weapons: [], note: 'Chef, pas d\'arme propre' },
  'Rebel Trooper Captain': { weapons: [], note: 'Chef, pas d\'arme propre' },
  'Rebel Trooper Squad': { weapons: [], note: 'règle de cohésion, pas d\'arme' },
  'Rebel Troopers': { weapons: [{ name: 'Non armé', dice: [{ color: 'noir', count: 1 }], range: 'melee' }, { name: 'Fusil Blaster A280', dice: [{ color: 'noir', count: 1 }], range: '1-3' }], defenseColor: 'rouge' },
  'Rebel Veteran Squad': { weapons: [], note: 'règle de cohésion, pas d\'arme' },
  'Rebel Veterans': { weapons: [{ name: 'Non armé', dice: [{ color: 'noir', count: 1 }], range: 'melee' }, { name: 'Fusil Blaster A280', dice: [{ color: 'noir', count: 1 }], range: '1-3' }], defenseColor: 'rouge' },
  'SX-21 Trooper': { weapons: [{ name: 'Blaster à Dispersion SX-21', dice: [{ color: 'rouge', count: 2 }, { color: 'blanc', count: 2 }], range: '1-2' }] },
  'Saber Throw': { weapons: [{ name: 'Sabre Lancé', dice: 'variable', range: '1-2', note: 'dés variables = moitié (arrondi sup.) du total de dés de l\'arme de corps-à-corps choisie ; voir texte de la carte' }] },
  'Sabine Wren': { weapons: [{ name: 'Blasters WESTAR-35', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: '-2' }], defenseColor: 'rouge' },
  'Scatter Gun Trooper': { weapons: [{ name: 'Fusil à Dispersion', dice: [{ color: 'rouge', count: 2 }], range: '-2' }] },
  // 'Blaster de Poche EC-17' corrigé le 06/09/2026 (ici et sur 74-Z Speeder
  // Bikes ci-dessus) : losange noir plein sur le visuel, pas blanc.
  // 'Non armé' corrigé le 06/09/2026 (ici et sur Strike Team ci-dessous) :
  // losange noir plein sur le visuel — la pastille rouge à côté est le badge
  // de portée mêlée (croix), pas la couleur du dé ; confondre les deux avait
  // causé l'erreur initiale.
  'Scout Troopers': { weapons: [{ name: 'Non armé', dice: [{ color: 'noir', count: 1 }], range: 'melee' }, { name: 'Blaster de Poche EC-17', dice: [{ color: 'noir', count: 2 }], range: '1-2' }], defenseColor: 'rouge' },
  'Scout Troopers Strike Team': { weapons: [{ name: 'Non armé', dice: [{ color: 'noir', count: 1 }], range: 'melee' }, { name: 'Blaster de Poche EC-17', dice: [{ color: 'noir', count: 2 }], range: '1-2' }], defenseColor: 'rouge' },
  // 'Non armé' et 'Fusil Blaster E-22' corrigés le 06/09/2026 : les deux
  // losanges sont noirs sur le visuel (même confusion badge/dé que ci-dessus
  // pour 'Non armé' ; 'Fusil Blaster E-22' était noté blanc par erreur).
  'Shoretroopers': { weapons: [{ name: 'Non armé', dice: [{ color: 'noir', count: 1 }], range: 'melee' }, { name: 'Fusil Blaster E-22', dice: [{ color: 'noir', count: 1 }], range: '1-3' }], defenseColor: 'rouge' },
  'Shriv Suurgav': { weapons: [], note: 'carte de soutien pilote, pas d\'arme' },
  'Snowtrooper': { weapons: [], note: 'figurine additionnelle, pas d\'arme propre' },
  'Snowtroopers': { weapons: [{ name: 'Matraque', dice: [{ color: 'blanc', count: 1 }], range: 'melee' }, { name: 'Fusil Blaster E-11', dice: [{ color: 'blanc', count: 1 }], range: '1-3' }], defenseColor: 'rouge' },
  'Sonic Charge Saboteur': { weapons: [{ name: 'Charge Sonique', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 1 }, { color: 'noir', count: 2 }], range: '-1' }] },
  'Stormtrooper Heavy Gunner Squad': { weapons: [], note: 'carte extension d\'unité (personnel), pas de bloc arme propre' },
  // 'Bâton Étourdissant' corrigé le 06/09/2026 : losange noir plein sur le
  // visuel, pas blanc ('Fusil Blaster E-11' en dessous, lui, est bien blanc —
  // vérifié pixel par pixel pour ne pas confondre avec le pastille rouge du
  // badge de portée mêlée, distinct du losange de dé).
  'Stormtrooper Riot Squad': { weapons: [{ name: 'Bâton Étourdissant', dice: [{ color: 'noir', count: 1 }], range: 'melee' }, { name: 'Fusil Blaster E-11', dice: [{ color: 'blanc', count: 1 }], range: '1-3' }], defenseColor: 'rouge' },
  'Stormtrooper Squad': { weapons: [], note: 'règle de cohésion, pas d\'arme' },
  'Stormtroopers': { weapons: [{ name: 'Matraque', dice: [{ color: 'blanc', count: 1 }], range: 'melee' }, { name: 'Fusil Blaster E-11', dice: [{ color: 'blanc', count: 1 }], range: '1-3' }], defenseColor: 'rouge' },
  'T-21 Stormtrooper': { weapons: [{ name: 'Blaster à Répétition T-21', dice: [{ color: 'blanc', count: 4 }], range: '1-3' }] },
  'T-21A Range Trooper': { weapons: [{ name: 'Blaster à Répétition T-21A', dice: [{ color: 'blanc', count: 2 }, { color: 'noir', count: 2 }], range: '1-4' }] },
  'T-21B Shoretrooper': { weapons: [{ name: 'Blaster à Répétition T-21B', dice: [{ color: 'blanc', count: 2 }, { color: 'noir', count: 2 }], range: '1-4' }] },
  'T-47 Airspeeder': { weapons: [{ name: 'Canon Laser Double', dice: [{ color: 'rouge', count: 3 }, { color: 'noir', count: 3 }], range: '1-3' }], defenseColor: 'rouge' },
  'T-7 Ion Snowtrooper': { weapons: [{ name: 'Fusil T-7 à Ions', dice: [{ color: 'blanc', count: 1 }, { color: 'noir', count: 2 }], range: '1-3' }] },
  'TL-TT': { weapons: [{ name: 'Griffes Agrippantes', dice: [{ color: 'rouge', count: 3 }], range: 'melee' }, { name: 'Fusil Blaster A300', dice: [{ color: 'blanc', count: 2 }], range: '1-3' }], defenseColor: 'rouge' },
  'TL-TT Flame Projector': { weapons: [{ name: 'Lance-flammes de TL-TT', dice: [{ color: 'noir', count: 2 }], range: '-1' }] },
  'AT-RT Flamethrower': { weapons: [{ name: 'Lance-flammes de TL-TT', dice: [{ color: 'noir', count: 2 }], range: '-1' }] },
  'Ax-108 "Ground Buzzer"': { weapons: [{ name: 'Ax-108 « Ground Buzzer »', dice: [{ color: 'noir', count: 4 }], range: '1-2' }] },
  'Z-6 Trooper': { weapons: [{ name: 'Blaster Rotatif Z-6', dice: [{ color: 'noir', count: 6 }], range: '1-3' }] },
  'TL-TT Laser Cannon': { weapons: [{ name: 'Canon Laser de TL-TT', dice: [{ color: 'rouge', count: 1 }, { color: 'noir', count: 2 }], range: '2-4' }] },
  'TL-TT Rotary Blaster': { weapons: [{ name: 'Blaster Rotatif de TL-TT', dice: [{ color: 'blanc', count: 5 }], range: '1-3' }] },
  'X-34 Gunner': { weapons: [{ name: 'Fusil Blaster A300', dice: [{ color: 'blanc', count: 2 }], range: '1-3' }] },
  'X-34 Mark II Blaster': { weapons: [{ name: 'Blaster Moyen Mark II', dice: [{ color: 'noir', count: 4 }], range: '1-3' }] },
  'TR-TT': { weapons: [{ name: 'Pinces Coupantes', dice: [{ color: 'rouge', count: 4 }], range: 'melee' }, { name: 'Blasters Jumelés MS-4', dice: [{ color: 'rouge', count: 2 }, { color: 'blanc', count: 2 }, { color: 'noir', count: 2 }], range: '1-4' }], defenseColor: 'rouge' },
  'TX-225 Occupier Tank': { weapons: [{ name: 'Canons Jumelés', dice: [{ color: 'rouge', count: 1 }, { color: 'noir', count: 1 }], range: '1-2' }, { name: 'Quadruples Canons', dice: [{ color: 'rouge', count: 2 }, { color: 'noir', count: 2 }], range: '1-4' }], defenseColor: 'rouge' },
  'Targeting Scopes': { weapons: [], note: 'confère Précis 1, pas d\'arme propre' },
  'Tauntaun Riders': { weapons: [{ name: 'Cavalcade', dice: [{ color: 'blanc', count: 1 }, { color: 'noir', count: 2 }], range: 'melee' }, { name: 'Pistolets Blaster', dice: [{ color: 'rouge', count: 2 }], range: '1-2' }], defenseColor: 'rouge' },
  'The Darksaber': { weapons: [{ name: 'Le Sabre Noir', dice: [{ color: 'noir', count: 5 }], range: 'melee' }] },
  'The Fifth Brother': { weapons: [{ name: 'Sabre Laser Rotatif', dice: [{ color: 'noir', count: 5 }], range: 'melee' }, { name: 'Sabre Laser Lancé', dice: [{ color: 'noir', count: 3 }], range: '1-2' }], defenseColor: 'rouge' },
  'The Seventh Sister': { weapons: [{ name: 'Sabre Laser Rotatif', dice: [{ color: 'noir', count: 5 }], range: 'melee' }, { name: 'Sabre Laser Lancé', dice: [{ color: 'noir', count: 3 }], range: '1-2' }], defenseColor: 'rouge' },
  'Tristan Wren': { weapons: [{ name: 'Blaster de Tristan', dice: [{ color: 'noir', count: 2 }], range: '1-3' }] },
  'Ursa Wren': { weapons: [{ name: 'Blaster d\'Ursa', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: '-2' }] },
  'Wedge Antilles': { weapons: [], note: 'carte de soutien pilote, pas d\'arme' },
  'Wookiee Warriors Freedom Fighters': { weapons: [{ name: 'Poignard Ryyk', dice: [{ color: 'noir', count: 2 }], range: 'melee' }, { name: 'Pistolet Kashyyyk', dice: [{ color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: '1-2' }], defenseColor: 'rouge' },
  'Wookiee Warriors Kashyyyk Resistance': { weapons: [{ name: 'Entraînement au Combat', dice: [{ color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: 'melee' }, { name: 'Carabine X1', dice: [{ color: 'blanc', count: 2 }], range: '1-3' }], defenseColor: 'rouge' },
  'X-34 Landspeeder': { weapons: [{ name: 'Pistolet Blaster', dice: [{ color: 'blanc', count: 2 }], range: '1-2' }], defenseColor: 'rouge' },

  // Second passage complet sur Galactic_Empire_Upgrades_FR.pdf (voir
  // cardTags.ts pour le détail de l'audit).
  'RT-97C Stormtrooper': { weapons: [{ name: 'Fusil Blaster RT-97C', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 3 }], range: '1-4' }] },
  'DT-F16': { weapons: [{ name: 'Fusil Blaster E-11D', dice: [{ color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: '1-3' }] },
  'Del Meeko': { weapons: [{ name: 'DLT-19x de Del', dice: [{ color: 'noir', count: 2 }], range: '1-5' }] },
  'Gideon Hask': { weapons: [{ name: 'E-11 de Gideon', dice: [{ color: 'rouge', count: 2 }], range: '1-3' }] },
  'T-21 Special Forces Trooper': { weapons: [{ name: 'Blaster à Répétition T-21', dice: [{ color: 'blanc', count: 4 }], range: '1-3' }] },
  'SM-9 Dark Trooper': { weapons: [{ name: 'Lanceur à Fragmentation SM-9', dice: [{ color: 'rouge', count: 2 }, { color: 'noir', count: 1 }], range: '1-2' }] },
  'XS-IV Dark Trooper': { weapons: [{ name: 'Canon d\'Assaut XS-IV', dice: [{ color: 'noir', count: 4 }], range: '1-3' }] },
  'Cleaver Dark Trooper': { weapons: [{ name: 'Tranchoir', dice: [{ color: 'rouge', count: 2 }, { color: 'noir', count: 1 }], range: 'melee' }] },
  'E-11D Focused Strike Config': { weapons: [{ name: 'E-11D Frappe Concentrée', dice: [{ color: 'blanc', count: 1 }], range: '1-4' }] },
  'E-11D Grenade Launcher Config': { weapons: [{ name: 'E-11D Lance-grenades', dice: [{ color: 'rouge', count: 1 }], range: '1-2' }] },
  'CR-24 Flame Rifle': { weapons: [{ name: 'Fusil Lance-flammes CR-24', dice: [{ color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: 'melee' }] },
  'RT-97C Dewback Rider': { weapons: [{ name: 'Fusil Blaster RT-97C', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 3 }], range: '1-4' }] },
  'T-21 Dewback Rider': { weapons: [{ name: 'Fusil Blaster T-21', dice: [{ color: 'blanc', count: 4 }], range: '1-3' }] },
  'DLT-19 Pintle Mount': { weapons: [{ name: 'DLT-19 sur Pivot', dice: [{ color: 'rouge', count: 2 }], range: '1-4' }] },
  'RT-97C Pintle Mount': { weapons: [{ name: 'RT-97C sur Pivot', dice: [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 3 }], range: '1-4' }] },
  'Programmed Loyalty': { weapons: [], note: 'améliore Escorte, pas d\'arme propre' },
  'Inquisitorius Training': { weapons: [], note: 'améliore Démoraliser 1, pas d\'arme propre' },
  'R4 Astromech Droid': { weapons: [], note: 'figurine additionnelle, pas d\'arme propre' },
  'Imperial Comms Technician': { weapons: [], note: 'figurine additionnelle, pas d\'arme propre' },
  'Stormtrooper Captain': { weapons: [], note: 'figurine additionnelle (Chef), pas d\'arme propre' },
  'Stormtrooper Specialist': { weapons: [], note: 'figurine additionnelle, pas d\'arme propre' },
  'Stormtrooper Sharpshooter': { weapons: [], note: 'figurine additionnelle, pas d\'arme propre' },
  'Stormtrooper': { weapons: [], note: 'figurine additionnelle, pas d\'arme propre' },
  'Shoretrooper': { weapons: [], note: 'figurine additionnelle, pas d\'arme propre' },
  'Range Trooper': { weapons: [], note: 'figurine additionnelle, pas d\'arme propre' },
  'Stormtrooper Squad Expansion': { weapons: [], note: 'carte d\'extension (5 figurines), pas d\'arme propre' },
  'Snowtrooper Squad Expansion': { weapons: [], note: 'carte d\'extension (5 figurines), pas d\'arme propre' },
  'Shoretrooper Squad Expansion': { weapons: [], note: 'carte d\'extension (5 figurines), pas d\'arme propre' },

  'Governor Pryce': { weapons: [], note: 'équipage de véhicule, pas d\'arme propre' },
  'First Sergeant Arbmab': { weapons: [], note: 'équipage de véhicule, pas d\'arme propre' },
  'General Weiss': { weapons: [], note: 'équipage de véhicule, pas d\'arme propre' },
  'Baron Rudor': { weapons: [], note: 'équipage de véhicule, pas d\'arme propre' },
  'Imperial Hammers Elite Armor Pilot': { weapons: [], note: 'équipage de véhicule, pas d\'arme propre' },
  'Imperial TIE Pilot': { weapons: [], note: 'équipage de véhicule, pas d\'arme propre' },

  // === Genrela_upgrade_fr_30mo.pdf (audité le 06/09/2026)
  'Concussion Grenades': { weapons: [{ name: 'Grenade à Concussion', dice: [{ color: 'noir', count: 1 }], range: 'grenade' }] },
  'EMP Grenades': { weapons: [{ name: 'Grenades « Anti-droïdes » EMP', dice: [{ color: 'noir', count: 1 }], range: 'grenade' }] },
  'Fragmentation Grenades': { weapons: [{ name: 'Grenade à Fragmentation', dice: [{ color: 'noir', count: 1 }], range: 'grenade' }] },
  'Impact Grenades': { weapons: [{ name: 'Grenade à Impact', dice: [{ color: 'noir', count: 1 }], range: '-1' }] },
  'Sonic Imploders': { weapons: [{ name: 'Imploseur Sonique', dice: [{ color: 'noir', count: 1 }], range: 'grenade' }] },
  'Armor-Piercing Shells': { weapons: [{ name: 'Obus Antiblindage', dice: [{ color: 'blanc', count: 1 }, { color: 'noir', count: 2 }], range: '2-3' }] },
  'High-Energy Shells': { weapons: [{ name: 'Obus à Haute Énergie', dice: [{ color: 'blanc', count: 2 }, { color: 'noir', count: 1 }], range: '2-4' }] },
  'Anti-Bunker Shells': { weapons: [{ name: 'Obus « Antibunker »', dice: [{ color: 'rouge', count: 3 }, { color: 'noir', count: 1 }], range: '1-2' }] },

  // === Nouvelles_cartes_amelio_FR_MAJ23.02.2026.pdf (audité le 06/09/2026)
  'Mounted Gunners': { weapons: [{ name: 'Blaster Monté', dice: [{ color: 'blanc', count: 2 }, { color: 'noir', count: 2 }], range: '1-2' }] },
  'Kraken': { weapons: [{ name: 'Blaster de Kraken', dice: [{ color: 'noir', count: 2 }], range: '-3' }] },
  'Kallus the Operative': { weapons: [{ name: 'Fusil-Bo J-19', dice: [{ color: 'blanc', count: 1 }, { color: 'noir', count: 1 }], range: '-2' }] },
  'Captain Rex': { weapons: [{ name: 'Paire de Blasters de Poche', dice: [{ color: 'rouge', count: 1 }], range: '-2' }] },
  // Carte recto/verso : arme recto (visible en début de partie) seule
  // reprise ici, comme pour les autres cartes fusionnées de ce fichier — le
  // verso (Opérations Secrètes, 1 rouge, Longue Distance) n'a pas de champ
  // dédié dans ce modèle de données.
  'Cassian Andor Operative': { weapons: [{ name: 'A280 Configuration Sniper', dice: [{ color: 'noir', count: 1 }], range: '1-3' }] },
};

export const DICE_PROFILES: Record<string, CardDiceProfile> = Object.fromEntries(
  Object.entries(RAW).map(([name, profile]) => [normalizeName(name), profile]),
);

/** Accepte aussi bien un nom anglais (Tabletop Admiral) qu'un nom français recopié depuis la carte — voir canonicalCardKey(). */
export function diceProfileFor(cardName: string): CardDiceProfile | undefined {
  return DICE_PROFILES[canonicalCardKey(cardName)];
}
