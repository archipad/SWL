import type { CardKeywordTag, CardTagLibrary } from '../types';
import { normalizeName } from '../lib/normalize';

/**
 * Mots-clés d'unité vérifiés depuis de vraies cartes Unité (Empire et
 * Alliance Rebelle), fournies par l'utilisateur. Pas une invention.
 *
 * N'écrase jamais les tags déjà sauvegardés par un utilisateur : voir
 * lib/useCardTags.ts, qui ne s'en sert que comme valeur initiale tant que
 * rien n'existe en localStorage.
 *
 * Les clés sont les noms ANGLAIS tels qu'exportés par Tabletop Admiral
 * (confirmé par l'utilisateur) — les cartes source sont en français, donc
 * chaque nom a été traduit. Les traductions non confirmées par un export
 * TTA réel sont marquées « nom EN à vérifier » : si une carte de ta liste
 * n'affiche pas ses mots-clés, c'est probablement que sa traduction ici
 * est légèrement différente de celle utilisée par Tabletop Admiral —
 * dis-moi le nom exact et je corrige la clé.
 *
 * L'AT-ST existe en deux configurations imprimées différentes (Point
 * Faible 1 : Flancs à 145 pts, ou Point Faible 1 : Arrière à 125 pts) ;
 * celle retenue ici est la plus courante (Armure 5, Canons Jumelés/Quadruples)
 * — vérifiez votre carte. Même remarque pour TR-TT (deux configurations
 * d'armes, valeur de Point Faible et bonus Redéploiement/Transport variables
 * selon celle choisie : ces deux derniers mots-clés sont omis par prudence).
 *
 * Dark Vador, Seigneur Noir des Sith : la première extraction (PDF officiel
 * EN+FR) avait lu « Contraindre : Type » (Compel), mot-clé introuvable dans
 * le glossaire officiel malgré deux sources croisées. Le livret Iron
 * Squadron (source plus récente, image nette) montre en fait
 * « Contrainte : Soldat » — mot-clé bien réel du glossaire. Corrigé ici ;
 * l'entrée « Compel » du glossaire (jamais confirmée) a été retirée.
 */
const RAW: Record<string, { keywordId: string; value?: number }[]> = {
  // --- Empire Galactique ---
  'Darth Vader Dark Lord of the Sith': [
    { keywordId: 'contrainte' },
    { keywordId: 'deflexion' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'maitre-de-la-force-x', value: 1 },
    { keywordId: 'implacable' },
    // Valeurs d'Impact/Perforant du sabre volontairement omises : la
    // version EN et la version FR du premier PDF officiel se
    // contredisaient (grille d'impression ambiguë, 2 Vador différents
    // imprimés côte à côte) — vérifiez la carte plutôt que de faire
    // confiance à un chiffre non confirmé de façon croisée.
  ],
  'Stormtrooper Riot Squad': [
    { keywordId: 'charge' },
    { keywordId: 'tenir-bon' },
    { keywordId: 'suppressif' },
  ],
  'Snowtroopers': [
    { keywordId: 'aguerri' },
  ],
  'Imperial Death Troopers': [
    { keywordId: 'discipline-x', value: 1 },
    { keywordId: 'precis-x', value: 2 },
    { keywordId: 'operationnel-x', value: 1 },
  ],
  'Scout Troopers': [
    { keywordId: 'profil-bas' },
    { keywordId: 'eclaireur-x', value: 3 },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  'Scout Troopers Strike Team': [
    { keywordId: 'detachement' },
    { keywordId: 'equipe-avec-arme-lourde' },
    { keywordId: 'profil-bas' },
    { keywordId: 'eclaireur-x', value: 3 },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  '74-Z Speeder Bikes': [
    { keywordId: 'couvert-x', value: 1 },
    { keywordId: 'speeder-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
  ],
  'AT-ST': [
    { keywordId: 'armure-x', value: 5 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'redeploiement' },
    { keywordId: 'transport' },
    { keywordId: 'point-faible-x', value: 1 },
    { keywordId: 'suppressif' },
    { keywordId: 'impact-x', value: 2 },
  ],
  'Stormtroopers': [
    { keywordId: 'precis-x', value: 1 },
  ],
  // nom EN à vérifier
  'Stormtrooper Heavy Gunner Squad': [
    { keywordId: 'riposte-graduee-x', value: 2 },
    { keywordId: 'precis-x', value: 1 },
    { keywordId: 'specificite' },
    { keywordId: 'sans-entrave' },
  ],
  'Shoretroopers': [
    { keywordId: 'coordination' },
    { keywordId: 'position-preparee' },
  ],
  'DF-90 Mortar Trooper': [
    { keywordId: 'detachement' },
    { keywordId: 'tirs-de-soutien' },
    { keywordId: 'pivot-complet' },
    { keywordId: 'position-preparee' },
    { keywordId: 'redeploiement' },
    { keywordId: 'sentinelle' },
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'encombrant' },
    { keywordId: 'suppressif' },
  ],
  'Imperial Special Forces': [
    { keywordId: 'infiltration' },
    { keywordId: 'tireur-embusque' },
    { keywordId: 'fiable-x', value: 1 },
  ],
  'Imperial Special Forces Inferno Squad': [
    { keywordId: 'infiltration' },
    { keywordId: 'tireur-embusque' },
    { keywordId: 'fiable-x', value: 1 },
    { keywordId: 'escorte' },
  ],
  // nom EN à vérifier
  'E-Web Heavy Blaster Team': [
    { keywordId: 'position-preparee' },
    { keywordId: 'redeploiement' },
    { keywordId: 'sentinelle' },
    { keywordId: 'encombrant' },
    { keywordId: 'impact-x', value: 1 },
  ],
  // nom EN à vérifier
  'Dewback Rider': [
    { keywordId: 'armure-x', value: 1 },
    { keywordId: 'implacable' },
    { keywordId: 'redeploiement' },
    { keywordId: 'marche-forcee' },
    { keywordId: 'sans-entrave' },
    { keywordId: 'critique-x', value: 2 },
    { keywordId: 'suppressif' },
  ],
  'Range Troopers': [
    { keywordId: 'ciblage-avance', value: 1 },
    { keywordId: 'armure-x', value: 1 },
    { keywordId: 'indomptable' },
    { keywordId: 'ascension' },
    { keywordId: 'marche-forcee' },
  ],
  // Point Faible (direction) et Redéploiement/Transport diffèrent selon la
  // configuration d'armes choisie sur la carte : omis par prudence.
  'TR-TT': [
    { keywordId: 'armure-x', value: 5 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'point-faible-x', value: 1 },
  ],
  // nom EN à vérifier
  'LAAT/le Patrol Transport': [
    { keywordId: 'sustentation', value: 2 },
    { keywordId: 'immunite-deflagration' },
    { keywordId: 'immunite-corps-a-corps' },
    { keywordId: 'transport' },
    { keywordId: 'impact-x', value: 1 },
  ],
  // nom EN à vérifier (Dark Troopers Impériaux)
  'Dark Trooper Squad': [
    { keywordId: 'armure-x', value: 3 },
    { keywordId: 'mobilite-difficile' },
    { keywordId: 'indifferent' },
    { keywordId: 'inarretable' },
  ],
  'General Veers': [
    { keywordId: 'conseils' },
    { keywordId: 'observateur-x', value: 2 },
    { keywordId: 'exemplaire' },
    { keywordId: 'inspiration-x', value: 1 },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  'Director Orson Krennic': [
    { keywordId: 'observateur-x', value: 1 },
    { keywordId: 'contrainte' },
    { keywordId: 'malin' },
    { keywordId: 'entourage' },
    { keywordId: 'exemplaire' },
  ],
  // nom EN à vérifier
  "Darth Vader Emperor's Apprentice": [
    { keywordId: 'deflexion' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'chasseur-de-jedi' },
    { keywordId: 'maitre-de-la-force-x', value: 1 },
    { keywordId: 'implacable' },
    { keywordId: 'deflagration' },
    { keywordId: 'dispersion' },
  ],
  'Moff Gideon': [
    { keywordId: 'surveillance-x', value: 1 },
    { keywordId: 'entourage' },
    { keywordId: 'impitoyable' },
    { keywordId: 'tireur-delite-x', value: 1 },
    { keywordId: 'tacticien-x', value: 1 },
    { keywordId: 'perforant-x', value: 1 },
  ],
  // nom EN à vérifier
  "Iden's ID10 Seeker Droid": [
    { keywordId: 'surveillance-x', value: 1 },
    { keywordId: 'alter-ego' },
    { keywordId: 'recharger-x', value: 1 },
    { keywordId: 'bouclier-x', value: 1 },
    { keywordId: 'petit' },
    { keywordId: 'suppressif' },
  ],
  'Iden Versio': [
    { keywordId: 'vivacite-desprit' },
    { keywordId: 'infiltration' },
    { keywordId: 'tireur-embusque' },
    { keywordId: 'agile' },
    { keywordId: 'tireur-delite-x', value: 1 },
    { keywordId: 'haute-velocite' },
    { keywordId: 'perforant-x', value: 1 },
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
  ],
  // valeur d'Impact omise : diffère selon l'arme choisie (1 ou 3)
  'Major Marquand': [
    { keywordId: 'armure-x', value: 5 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'ordre-direct' },
    { keywordId: 'commandant-des-operations' },
    { keywordId: 'specificite' },
    { keywordId: 'point-faible-x', value: 1 },
    { keywordId: 'deflagration' },
    { keywordId: 'impact-x' },
  ],
  'Agent Kallus': [
    { keywordId: 'surveillance-x', value: 2 },
    { keywordId: 'prime' },
    { keywordId: 'charge' },
    { keywordId: 'ordre-direct' },
    { keywordId: 'immunite-perforant-corps-a-corps' },
    { keywordId: 'interrogatoire' },
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'perforant-x', value: 1 },
  ],
  'The Fifth Brother': [
    { keywordId: 'blocage' },
    { keywordId: 'intrepide' },
    { keywordId: 'enrage-x', value: 2 },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'perforant-x', value: 1 },
  ],
  'The Seventh Sister': [
    { keywordId: 'saut-x', value: 1 },
    { keywordId: 'associe' },
    { keywordId: 'blocage' },
    { keywordId: 'charge' },
    { keywordId: 'discipline-x', value: 1 },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'interrogatoire' },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'perforant-x', value: 1 },
  ],

  // --- Améliorations Empire (armes de rechange, cartes d'équipage/état-major) ---
  // Depuis le PDF Galactic Empire Upgrades (FR). Beaucoup de cartes de ce PDF
  // (meneurs d'escouade +5 figurines, techniciens, pilotes, personnages
  // nommés secondaires...) ne portent aucun mot-clé standard listé ici — soit
  // parce que leur effet est une capacité propre à la carte (pas un des 200
  // mots-clés du glossaire), soit parce que le nom anglais exact restait trop
  // incertain pour être une clé fiable. Seules les améliorations où le
  // mot-clé ET la traduction anglaise sont sûrs sont incluses.
  'DLT-19 Stormtrooper': [
    { keywordId: 'impact-x', value: 1 },
  ],
  'T-21 Stormtrooper': [
    { keywordId: 'critique-x', value: 2 },
  ],
  'HH-12 Stormtrooper': [
    { keywordId: 'encombrant' },
    { keywordId: 'impact-x', value: 3 },
  ],
  'Flametrooper': [
    { keywordId: 'deflagration' },
    { keywordId: 'souffle' },
  ],
  'T-7 Ion Snowtrooper': [
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'ion-x', value: 1 },
  ],
  'KX-Series Security Droids': [
    { keywordId: 'impact-x', value: 1 },
  ],
  'T-21B Shoretrooper': [
    { keywordId: 'critique-x', value: 1 },
  ],
  'DLT-19x Sniper': [
    { keywordId: 'haute-velocite' },
    { keywordId: 'perforant-x', value: 1 },
  ],
  'Sonic Charge Saboteur': [
    { keywordId: 'deflagration' },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'suppressif' },
  ],
  'DLT-19D Trooper': [
    { keywordId: 'impact-x', value: 1 },
  ],
  'DLT-20A Range Trooper': [
    { keywordId: 'impact-x', value: 2 },
  ],
  'T-21A Range Trooper': [
    { keywordId: 'suppressif' },
  ],
  'FX-9 Medical Droid': [
    { keywordId: 'non-combattant' },
  ],
  'Imperial Officer': [
    { keywordId: 'chef' },
    { keywordId: 'inspiration-x', value: 1 },
  ],
  '88i Twin Light Blaster': [
    { keywordId: 'impact-x', value: 1 },
  ],
  'DW-3 Concussion Grenade Launcher': [
    { keywordId: 'deflagration' },
  ],
  'The Darksaber': [
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'perforant-x', value: 1 },
    { keywordId: 'demoraliser-x', value: 1 },
    { keywordId: 'immunite-perforant-corps-a-corps' },
  ],

  // --- Alliance Rebelle (unités) ---
  // Depuis le PDF de cartes Unité Alliance Rebelle (FR). Même remarque que
  // pour l'Empire : les traductions non confirmées par un export TTA réel
  // sont marquées « nom EN à vérifier ».
  'Rebel Troopers': [
    { keywordId: 'preste-x', value: 1 },
    { keywordId: 'agile' },
  ],
  'Mark II Medium Blaster Trooper': [
    { keywordId: 'detachement' },
    { keywordId: 'tirs-de-soutien' },
    { keywordId: 'pivot-complet' },
    { keywordId: 'position-preparee' },
    { keywordId: 'redeploiement' },
    { keywordId: 'sentinelle' },
    { keywordId: 'critique-x', value: 2 },
    { keywordId: 'encombrant' },
  ],
  // nom EN à vérifier
  'Fleet Troopers': [
    { keywordId: 'charge' },
  ],
  'Rebel Veterans': [
    { keywordId: 'coordination' },
    { keywordId: 'profil-bas' },
    { keywordId: 'position-preparee' },
  ],
  'Rebel Commandos': [
    { keywordId: 'profil-bas' },
    { keywordId: 'eclaireur-x', value: 2 },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  // nom EN à vérifier
  'Rebel Commandos Strike Team': [
    { keywordId: 'detachement' },
    { keywordId: 'equipe-avec-arme-lourde' },
    { keywordId: 'profil-bas' },
    { keywordId: 'eclaireur-x', value: 2 },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  'Wookiee Warriors Freedom Fighters': [
    { keywordId: 'charge' },
    { keywordId: 'duelliste' },
    { keywordId: 'indomptable' },
    { keywordId: 'ascension' },
  ],
  // nom EN à vérifier
  'Wookiee Warriors Kashyyyk Resistance': [
    { keywordId: 'indomptable' },
    { keywordId: 'ascension' },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  // nom EN à vérifier
  'Mandalorian Resistance': [
    { keywordId: 'saut-x', value: 2 },
    { keywordId: 'insensible' },
    { keywordId: 'agile' },
  ],
  'Tauntaun Riders': [
    { keywordId: 'preste-x', value: 1 },
    { keywordId: 'implacable' },
    { keywordId: 'redeploiement' },
    { keywordId: 'tireur-delite-x', value: 1 },
    { keywordId: 'sans-entrave' },
  ],
  'T-47 Airspeeder': [
    { keywordId: 'armure-x', value: 3 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'couvert-x', value: 1 },
    { keywordId: 'speeder-x', value: 2 },
  ],
  // nom EN à vérifier
  'X-34 Landspeeder': [
    { keywordId: 'armure-x', value: 2 },
    { keywordId: 'arsenal-x', value: 3 },
    { keywordId: 'couvert-x', value: 1 },
    { keywordId: 'speeder-x', value: 1 },
  ],
  'Leia Organa': [
    { keywordId: 'mettre-a-couvert-x', value: 2 },
    { keywordId: 'exemplaire' },
    { keywordId: 'inspiration-x', value: 2 },
    { keywordId: 'agile' },
    { keywordId: 'tireur-delite-x', value: 2 },
  ],
  'C-3PO': [
    { keywordId: 'calcul-de-probabilites' },
    { keywordId: 'distraire' },
    { keywordId: 'alter-ego' },
  ],
  'Luke Skywalker Hero of the Rebellion': [
    { keywordId: 'saut-x', value: 1 },
    { keywordId: 'blocage' },
    { keywordId: 'charge' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'inspiration-x', value: 2 },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  'Luke Skywalker Jedi Knight': [
    { keywordId: 'saut-x', value: 1 },
    { keywordId: 'charge' },
    { keywordId: 'deflexion' },
    { keywordId: 'retrait' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'maitre-de-la-force-x', value: 1 },
  ],
  'Jyn Erso': [
    { keywordId: 'preste-x', value: 1 },
    { keywordId: 'retrait' },
    { keywordId: 'autonome' },
    { keywordId: 'infiltration' },
    { keywordId: 'agile' },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  'Cassian Andor': [
    { keywordId: 'intuition-du-danger-x', value: 3 },
    { keywordId: 'equipe' },
    { keywordId: 'commandant-des-operations' },
    { keywordId: 'infiltration' },
    { keywordId: 'tireur-embusque' },
    { keywordId: 'tireur-delite-x', value: 1 },
    { keywordId: 'tacticien-x', value: 1 },
  ],
  'Lando Calrissian': [
    { keywordId: 'conseils' },
    { keywordId: 'allies-de-circonstance' },
    { keywordId: 'longueur-davance' },
    { keywordId: 'aguerri' },
    { keywordId: 'coup-de-chance-x', value: 2 },
  ],
  'Chewbacca': [
    { keywordId: 'enrage-x', value: 4 },
    { keywordId: 'gardien-x', value: 3 },
    { keywordId: 'ascension' },
  ],
  'Sabine Wren': [
    { keywordId: 'saut-x', value: 2 },
    { keywordId: 'pistolero' },
    { keywordId: 'insensible' },
    { keywordId: 'agile' },
  ],
  'R2-D2': [
    { keywordId: 'reparation-x', value: 2 },
    { keywordId: 'discret' },
    { keywordId: 'infiltration' },
    { keywordId: 'mission-secrete' },
  ],
  'Ahsoka Tano': [
    { keywordId: 'saut-x', value: 2 },
    { keywordId: 'charge' },
    { keywordId: 'defense-x', value: 1 },
    { keywordId: 'deflexion' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'maitrise-du-jarkai' },
  ],
  'K-2SO': [
    { keywordId: 'calcul-de-probabilites' },
    { keywordId: 'armure-x', value: 1 },
    { keywordId: 'detachement' },
    { keywordId: 'incognito' },
    { keywordId: 'infiltration' },
  ],

  // --- Améliorations Alliance Rebelle ---
  // nom EN à vérifier
  'MPL-57 Ion Trooper': [
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'ion-x', value: 1 },
  ],
  // nom EN à vérifier
  'DLT-20A Trooper': [
    { keywordId: 'critique-x', value: 1 },
  ],
  // nom EN à vérifier
  'SX-21 Trooper': [
    { keywordId: 'impact-x', value: 1 },
  ],
  // nom EN à vérifier
  'MPL-57 Barrage Trooper': [
    { keywordId: 'deflagration' },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'cycle' },
  ],
  // nom EN à vérifier
  'CM-O/93 Trooper': [
    { keywordId: 'critique-x', value: 2 },
  ],
  // nom EN à vérifier
  'Proton Charges Saboteur': [
    { keywordId: 'deflagration' },
    { keywordId: 'critique-x', value: 2 },
    { keywordId: 'impact-x', value: 3 },
  ],
  // nom EN à vérifier
  'Dispersion Rifle Trooper': [
    { keywordId: 'perforant-x', value: 1 },
  ],
  // nom EN à vérifier, faible confiance
  'Shoulder-Mounted Cannon Wookiee': [
    { keywordId: 'suppressif' },
  ],
  // nom EN à vérifier
  'DH-447 Sniper': [
    { keywordId: 'haute-velocite' },
    { keywordId: 'perforant-x', value: 1 },
  ],
  // nom EN à vérifier ; Armure 1 conditionnelle (carte retournée en début d'activation)
  'Combat Shield Wookiee': [
    { keywordId: 'armure-x', value: 1 },
  ],
  // nom EN à vérifier
  'Rebel Trooper Squad': [
    { keywordId: 'indomptable' },
  ],
  // nom EN à vérifier
  'Bowcaster Wookiee': [
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'perforant-x', value: 1 },
  ],
  // nom EN à vérifier
  'Beskad Duelist': [
    { keywordId: 'duelliste' },
  ],
  'Tristan Wren': [
    { keywordId: 'letal-x', value: 1 },
    { keywordId: 'suppressif' },
  ],
  'Ursa Wren': [
    { keywordId: 'chef' },
    { keywordId: 'intrepide' },
    { keywordId: 'longue-distance' },
  ],
  // nom EN à vérifier
  'Rebel Officer': [
    { keywordId: 'chef' },
    { keywordId: 'inspiration-x', value: 1 },
  ],
  // nom EN à vérifier
  'Rebel Trooper Captain': [
    { keywordId: 'chef' },
  ],
  // nom EN à vérifier
  '2-1B Medical Droid': [
    { keywordId: 'non-combattant' },
    { keywordId: 'traiter-x', value: 1 },
  ],
  // nom EN à vérifier
  'Astromech Droid': [
    { keywordId: 'non-combattant' },
    { keywordId: 'reparation-x', value: 1 },
  ],
  // nom EN à vérifier
  'Fleet Trooper Squad': [
    { keywordId: 'indomptable' },
  ],
  // nom EN à vérifier
  'Rebel Veteran Squad': [
    { keywordId: 'indomptable' },
  ],
  'Shriv Suurgav': [
    { keywordId: 'commandant-des-operations' },
  ],
  // nom EN à vérifier
  'Gifted Pilot': [
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  // nom EN à vérifier
  'RPS-6 Trooper': [
    { keywordId: 'impact-x', value: 2 },
  ],
  'Wedge Antilles': [
    { keywordId: 'commandant-des-operations' },
  ],
  // nom EN à vérifier
  'Outer Rim Speeder Pilot': [
    { keywordId: 'couvert-x', value: 1 },
  ],
  // nom EN à vérifier
  'Mo/Dk Magnetic Harpoon': [
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'cable-de-remorquage' },
  ],
  // nom EN à vérifier
  'TL-TT Laser Cannon': [
    { keywordId: 'impact-x', value: 3 },
  ],
  // nom EN à vérifier
  'TL-TT Flame Projector': [
    { keywordId: 'deflagration' },
    { keywordId: 'souffle' },
  ],
  // nom EN à vérifier
  'M-45 Ion Blaster': [
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'ion-x', value: 1 },
  ],
  // nom EN à vérifier
  'Mandalorian Combat Shields': [
    { keywordId: 'bouclier-x', value: 2 },
  ],
  // nom EN à vérifier
  'Back-Mounted Rockets': [
    { keywordId: 'deflagration' },
    { keywordId: 'impact-x', value: 1 },
  ],
  // nom EN à vérifier
  'AG-2G Quad Laser': [
    { keywordId: 'impact-x', value: 2 },
  ],
  // nom EN à vérifier
  'Heavy Laser Conversion': [
    { keywordId: 'critique-x', value: 1 },
  ],
  // nom EN à vérifier ; Cassian Andor uniquement
  'A280 Rifle Configuration': [
    { keywordId: 'encombrant' },
    { keywordId: 'haute-velocite' },
    { keywordId: 'perforant-x', value: 1 },
  ],
  // nom EN à vérifier ; Cassian Andor uniquement
  'A280 Pistol Configuration': [
    { keywordId: 'longue-distance' },
    { keywordId: 'perforant-x', value: 1 },
  ],
  // nom EN à vérifier
  "Jyn's SE-14": [
    { keywordId: 'perforant-x', value: 1 },
    { keywordId: 'suppressif' },
  ],
  // nom EN à vérifier
  "Sabine's Combat Shield": [
    { keywordId: 'recharger-x', value: 1 },
    { keywordId: 'bouclier-x', value: 1 },
  ],
  // Carte « Le Sabre Noir » vue aussi dans les Améliorations Empire avec des
  // mots-clés différents (Impact X/Perforant X/Démoraliser X + Immunité :
  // perforant au corps-à-corps) — ici pour Sabine Wren : Impact 1, Perforant 1
  // + l'unité gagne Intrépide et Immunité : perforant au corps-à-corps.
  // Incohérence non résolue entre les deux PDF sources ; pas ajoutée une
  // deuxième fois ici pour ne pas écraser/dupliquer la clé existante.
};

export const SEED_CARD_TAGS: CardTagLibrary = Object.fromEntries(
  Object.entries(RAW).map(([name, tags]) => [normalizeName(name), tags as CardKeywordTag[]]),
);
