import { normalizeName } from '../lib/normalize';

/**
 * Titre français tel qu'imprimé sur la carte officielle, pour chaque nom
 * anglais (format Tabletop Admiral, voir cardTags.ts/cardImages.ts) —
 * utilisé pour l'AFFICHAGE uniquement. Les clés internes (tagLibrary,
 * CARD_IMAGES, identité des cartes) restent en anglais partout ailleurs
 * dans le code ; ne jamais utiliser cette table pour une comparaison ou un
 * lookup de données, uniquement via lib/cardNames.ts (frenchCardName()).
 *
 * Constituée le 02/09/2026 en relisant directement le texte imprimé sur
 * chaque visuel déjà extrait (public/cards/*.jpg — bandeau de titre en
 * bas de carte pour les unités/améliorations génériques, en-tête pour les
 * personnages nommés), pas deviné : signalement utilisateur (« les cartes
 * d'amélioration s'affichent en anglais »), demande de basculer partout en
 * français avec le titre imprimé sur les cartes Empire et Alliance
 * Rebelle. Beaucoup de noms restent identiques en français (personnages
 * nommés type Chewbacca, Ahsoka Tano, ou unités jamais traduites comme
 * Stormtroopers/Scout Troopers/Range Troopers) — présents quand même dans
 * la table pour documenter la vérification et couvrir les futurs cas où
 * seule la casse/orthographe changerait.
 *
 * 116 entrées, une par clé de cardTags.ts/cardImages.ts (même couverture).
 * Une carte absente de cette table (nouvelle carte pas encore vérifiée sur
 * son visuel officiel) s'affiche simplement sous son nom anglais tel quel
 * plutôt que sous un nom deviné.
 */
const RAW: Record<string, string> = {
  "2-1B Medical Droid": "Droïde Médical 2-1B",
  "74-Z Speeder Bikes": "Speederbikes 74-Z",
  "88i Twin Light Blaster": "Blasters Légers Jumelés 88i",
  "A280-CFE Pistol/Sniper Config": "A280, Config Fusil",
  "AG-2G Quad Laser": "Quadrilaser AG-2G",
  "Agent Kallus": "Agent Kallus",
  "Ahsoka Tano": "Ahsoka Tano",
  "AT-RT": "TL-TT",
  "AT-ST": "TR-TT",
  "AT-ST Mortar Launcher": "Lance-mortier de TR-TT",
  "Battle Shield Wookiee": "Wookie avec Bouclier de Combat",
  "Beskad Duelist": "Duelliste avec Beskad",
  "Bowcaster Wookiee": "Wookie avec Arbalète",
  "Burst of Speed": "Pointe de Vitesse",
  "C-3PO": "C-3PO",
  "Cassian Andor": "Cassian Andor",
  "Chewbacca": "Chewbacca",
  "CM-O/93 Trooper": "Soldat avec CM-O/93",
  "Dark Trooper Squad": "Dark Troopers Impériaux",
  "Darth Vader Dark Lord of the Sith": "Dark Vador, Seigneur Noir des Sith",
  "Dewback Rider": "Soldat Monté sur Dewback",
  "DF-90 Mortar Trooper": "Soldat avec Mortier DF-90",
  "DH-447 Sniper": "Sniper avec DH-447",
  "Director Orson Krennic": "Directeur Orson Krennic",
  "DLT-19 Stormtrooper": "Stormtrooper avec DLT-19",
  "DLT-19D Trooper": "Soldat avec DLT-19D",
  "DLT-19x Sniper": "Sniper avec DLT-19x",
  "DLT-20A Range Trooper": "Range Trooper avec DLT-20A",
  "DLT-20A Trooper": "Soldat avec DLT-20A",
  "DW-3 Concussion Grenade Launcher": "Lance-grenades DW-3",
  "E-Web Heavy Blaster Team": "Équipe Blaster Lourd E-Web",
  "Flametrooper": "Flametrooper",
  "Fleet Trooper Squad": "Escouade Soldat de la Flotte",
  "Fleet Troopers": "Soldats de la Flotte",
  "Force Choke": "Strangulation de la Force",
  "FX-9 Medical Droid": "Droïde Médical FX-9",
  "General Veers": "Général Veers",
  "Heavy Laser Retrofit": "Conversion Laser Lourd",
  "HH-12 Stormtrooper": "Stormtrooper avec HH-12",
  "Hotshot Pilot": "Pilote Surdoué",
  "Iden Versio": "Iden Versio",
  "Imperial Death Troopers": "Death Troopers Impériaux",
  "Imperial March": "Marche Impériale",
  "Imperial Officer": "Officier Impérial",
  "Imperial Special Forces": "Forces Spéciales Impériales",
  "Imperial Special Forces Inferno Squad": "Forces Spéciales Impériales, Escouade Inferno",
  "Jetpack Rockets": "Roquettes Dorsales",
  "Jyn Erso": "Jyn Erso",
  "K-2SO": "K-2SO",
  "KX-Series Security Droids": "Droïdes de Sécurité de Série KX",
  "LAAT/le Patrol Transport": "Transport de Patrouille LAAT/LE",
  "Lando Calrissian": "Lando Calrissian",
  "Leia Organa": "Leia Organa",
  "Linked Targeting Array": "Système de Visée Jumelé",
  "Long Gun Wookiee": "Wookie avec Arme d'Épaule",
  "Luke Skywalker Hero of the Rebellion": "Luke Skywalker, Héros de la Rébellion",
  "Luke Skywalker Jedi Knight": "Luke Skywalker, Chevalier Jedi",
  "M-45 Ion Blaster": "Blaster Ionique M-45",
  "Major Marquand": "Major Marquand",
  "Mandalorian Combat Shields": "Boucliers de Combat Mandaloriens",
  "Mandalorian Resistance": "Résistance Mandalorienne",
  "Mark II Medium Blaster Trooper": "Soldat avec Blaster Moyen Mark II",
  "Mo/DK Power Harpoon": "Harpon Magnétique Mo/Dk",
  "Moff Gideon": "Moff Gideon",
  "MPL-57 Barrage Trooper": "Soldat avec MPL-57 de Barrage",
  "MPL-57 Ion Trooper": "Soldat avec MPL-57 à Ions",
  "Offensive Push": "Poussée Offensive",
  "Outer Rim Speeder Jockey": "Pilote de Speeder de la Bordure Extérieure",
  "Proton Charge Saboteur": "Saboteur avec Charge à Protons",
  "R2-D2": "R2-D2",
  "R5 Astromech Droid": "Droïde Astromech",
  "Range Troopers": "Range Troopers",
  "Rebel Commandos": "Commandos Rebelles",
  "Rebel Commandos Strike Team": "Commandos Rebelles",
  "Rebel Officer": "Officier Rebelle",
  "Rebel Trooper Captain": "Capitaine Soldat Rebelle",
  "Rebel Trooper Squad": "Escouade Soldat Rebelle",
  "Rebel Troopers": "Soldats Rebelles",
  "Rebel Veteran Squad": "Escouade Vétéran Rebelle",
  "Rebel Veterans": "Vétérans Rebelles",
  "RPS-6 Rocket Gunner": "Artilleur avec Lance-roquettes RPS-6",
  "Saber Throw": "Sabre Lancé",
  "Sabine Wren": "Sabine Wren",
  "Scatter Gun Trooper": "Soldat avec Fusil à Dispersion",
  "Scout Troopers": "Scout Troopers",
  "Scout Troopers Strike Team": "Scout Troopers",
  "Shoretroopers": "Shoretroopers",
  "Shriv Suurgav": "Shriv Suurgav",
  "Snowtrooper": "Snowtrooper",
  "Snowtroopers": "Snowtroopers",
  "Sonic Charge Saboteur": "Saboteur avec Charge Sonique",
  "Stormtrooper Heavy Gunner Squad": "Stormtroopers, Unité Lourde d'Intervention",
  "Stormtrooper Riot Squad": "Escouade Stormtrooper Antiémeute",
  "Stormtrooper Squad": "Escouade Stormtrooper",
  "Stormtroopers": "Stormtroopers",
  "SX-21 Trooper": "Soldat avec SX-21",
  "T-21 Stormtrooper": "Stormtrooper avec T-21",
  "T-21A Range Trooper": "Range Trooper avec T-21A",
  "T-21B Shoretrooper": "Shoretrooper avec T-21B",
  "T-47 Airspeeder": "Airspeeder T-47",
  "T-7 Ion Snowtrooper": "Snowtrooper avec T-7 à Ions",
  "Targeting Scopes": "Lunette de Visée",
  "Tauntaun Riders": "Soldats Montés sur Tauntaun",
  "The Darksaber": "Le Sabre Noir",
  "The Fifth Brother": "Le Cinquième Frère",
  "The Seventh Sister": "La Septième Sœur",
  "TL-TT": "TL-TT",
  "TL-TT Flame Projector": "Lance-flammes de TL-TT",
  "TL-TT Laser Cannon": "Canon Laser de TL-TT",
  "TR-TT": "TR-TT",
  "Tristan Wren": "Tristan Wren",
  "Ursa Wren": "Ursa Wren",
  "Wedge Antilles": "Wedge Antilles",
  "Wookiee Warriors Freedom Fighters": "Guerriers Wookies, Combattants de la Liberté",
  "Wookiee Warriors Kashyyyk Resistance": "Guerriers Wookies, Résistance de Kashyyyk",
  "X-34 Landspeeder": "Landspeeder X-34",
};

export const CARD_NAMES_FR: Record<string, string> = Object.fromEntries(
  Object.entries(RAW).map(([name, fr]) => [normalizeName(name), fr]),
);
