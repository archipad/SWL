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
 * AT-ST / TR-TT (30/08/2026, signalement utilisateur avec scan officiel FR
 * à l'appui) : la précédente remarque ci-dessous parlait à tort de « deux
 * configurations » d'un même AT-ST — en réalité 'AT-ST' (le nom anglais
 * utilisé par Tabletop Admiral) pointait vers les stats d'une tout autre
 * unité, le Tank « Occupier » TX-225 GAVw (Armure 5, Arsenal 2, Redéploiement,
 * Transport, Point Faible 1 : Flancs, Canons Jumelés/Quadruples Canons) —
 * absent par ailleurs de cette liste. Le vrai AT-ST, dont le nom sur la
 * carte française est « TR-TT », n'a qu'une seule version imprimée dans
 * Galactic_Empire_Units_FR.pdf : Armure 5, Arsenal 2, Point Faible 1 :
 * Arrière, Pinces Coupantes (sans mot-clé) et Blasters Jumelés MS-4
 * (Fixe : Avant, Impact 3) — c'est cette entrée qui est désormais sous la
 * clé 'AT-ST' (celle qui matche vraiment les imports). Visuel (public/cards/
 * tr-tt.jpg) réextrait au bon endroit de la grille d'impression au passage
 * (l'ancien at-st.jpg affichait carrément le Tank Occupier).
 *
 * Dark Vador, Seigneur Noir des Sith : la première extraction (PDF officiel
 * EN+FR) avait lu « Contraindre : Type » (Compel), mot-clé introuvable dans
 * le glossaire officiel malgré deux sources croisées. Le livret Iron
 * Squadron (source plus récente, image nette) montre en fait
 * « Contrainte : Soldat » — mot-clé bien réel du glossaire. Corrigé ici ;
 * l'entrée « Compel » du glossaire (jamais confirmée) a été retirée.
 *
 * Passe de vérification des noms anglais (recherche web, wiki communautaire
 * Star Wars Legion + comparaison avec le seul export TTA réel dont on
 * dispose, Darth Vador « Dark Lord of the Sith ») : la plupart des noms
 * devinés étaient corrects ou quasi corrects (quelques erreurs de détail
 * corrigées : singulier/pluriel, « Fusil à Dispersion » = Scatter Gun
 * Trooper et pas une traduction littérale, etc.). Repère utile trouvé au
 * passage : Tabletop Admiral aplati les sous-titres de carte (parenthèses,
 * virgules) en texte simple séparé par des espaces — ex. la page wiki
 * « Darth Vader (Dark Lord of the Sith) » correspond bien à la clé plate
 * ci-dessus, sans parenthèses ni virgule. Les noms encore marqués
 * « à vérifier » n'ont pas pu être confirmés par une source fiable malgré
 * plusieurs recherches (cartes très récentes ou peu documentées en ligne).
 *
 * Passe de vérification complète des 108 cartes (suite à un signalement
 * utilisateur : Impact/Perforant du sabre de Dark Vador manquants) — chaque
 * carte recomparée un par un à son scan officiel (public/cards/*.jpg) au
 * lieu de faire confiance à la première extraction de texte. Une vingtaine
 * de mots-clés d'arme manquaient, surtout sur les personnages nommés avec
 * plusieurs armes (le texte d'ability était bien repris mais la ligne
 * d'arme sous l'illustration était parfois ratée) : Impact/Perforant du
 * sabre de Dark Vador (les deux versions), du sabre de Luke (les deux
 * versions) et d'Ahsoka, Bélier de La Septième Sœur→Le Cinquième Frère et
 * des Tauntaun, Immunité: Armes Portée 1 + Armure/Arsenal/Couvert du LAAT
 * et du T-47, Létal/Longue Distance d'Agent Kallus (à la place d'un
 * Perforant erroné), Longue Distance de Shoretroopers/Luke/Lando, Suppressif
 * de Jyn Erso/R2-D2, Traiter 1 de FX-9 (déjà présent sur 2-1B mais oublié
 * ici), Travail d'Équipe de Chewbacca/K-2SO, Équipe de Forces Spéciales
 * Impériales Escouade Inferno. Trouvé au passage : un bug dans le script de
 * découpage d'image (page "1" confondue avec "10"/"11"/"12"/"13" par un
 * matching de nom de fichier trop permissif) avait corrompu l'image de DLT-19
 * Stormtrooper — corrigé et réextraite.
 */
const RAW: Record<string, { keywordId: string; value?: number }[]> = {
  // --- Empire Galactique ---
  'Darth Vader Dark Lord of the Sith': [
    { keywordId: 'contrainte' },
    { keywordId: 'deflexion' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'maitre-de-la-force-x', value: 1 },
    { keywordId: 'implacable' },
    // Impact/Perforant du sabre laser : ambiguïté d'origine (grille
    // d'impression peu nette) résolue par le scan recadré et vérifié
    // (public/cards/darth-vader-dark-lord-of-the-sith.jpg) — la carte
    // affiche sans ambiguïté "Sabre Laser de Vador : Impact 3, Perforant 3".
    { keywordId: 'impact-x', value: 3 },
    { keywordId: 'perforant-x', value: 3 },
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
    { keywordId: 'point-faible-x', value: 1 },
    { keywordId: 'impact-x', value: 3 },
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
    { keywordId: 'longue-distance' },
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
    { keywordId: 'equipe' },
    { keywordId: 'infiltration' },
    { keywordId: 'tireur-embusque' },
    { keywordId: 'fiable-x', value: 1 },
    { keywordId: 'escorte' },
  ],
  'E-Web Heavy Blaster Team': [
    { keywordId: 'position-preparee' },
    { keywordId: 'redeploiement' },
    { keywordId: 'sentinelle' },
    { keywordId: 'encombrant' },
    { keywordId: 'impact-x', value: 1 },
  ],
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
  // = AT-ST en anglais (nom Tabletop Admiral) ; entrée dupliquée ici sous le
  // nom imprimé sur la carte française, au cas où un import l'utiliserait
  // tel quel. Voir la note du 30/08/2026 en tête de fichier : la carte
  // "autre config" à laquelle une note précédente comparait celle-ci était
  // en fait le Tank « Occupier » TX-225 GAVw, une unité différente.
  'TR-TT': [
    { keywordId: 'armure-x', value: 5 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'point-faible-x', value: 1 },
    { keywordId: 'impact-x', value: 3 },
  ],
  'LAAT/le Patrol Transport': [
    { keywordId: 'armure-x', value: 5 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'couvert-x', value: 1 },
    { keywordId: 'sustentation', value: 2 },
    { keywordId: 'immunite-deflagration' },
    { keywordId: 'immunite-corps-a-corps' },
    { keywordId: 'immunite-armes-portee-1' },
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
  "Darth Vader The Emperor's Apprentice": [
    { keywordId: 'deflexion' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'chasseur-de-jedi' },
    { keywordId: 'maitre-de-la-force-x', value: 1 },
    { keywordId: 'implacable' },
    { keywordId: 'impact-x', value: 3 },
    { keywordId: 'perforant-x', value: 3 },
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
    { keywordId: 'letal-x', value: 1 },
    { keywordId: 'longue-distance' },
  ],
  'The Fifth Brother': [
    { keywordId: 'blocage' },
    { keywordId: 'intrepide' },
    { keywordId: 'enrage-x', value: 2 },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'perforant-x', value: 1 },
    { keywordId: 'belier-x', value: 2 },
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
    { keywordId: 'traiter-x', value: 1 },
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
  'Wookiee Warriors Kashyyyk Resistance': [
    { keywordId: 'indomptable' },
    { keywordId: 'ascension' },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
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
    { keywordId: 'belier-x', value: 1 },
  ],
  'T-47 Airspeeder': [
    { keywordId: 'armure-x', value: 3 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'couvert-x', value: 1 },
    { keywordId: 'immunite-deflagration' },
    { keywordId: 'immunite-corps-a-corps' },
    { keywordId: 'immunite-armes-portee-1' },
    { keywordId: 'speeder-x', value: 2 },
    { keywordId: 'impact-x', value: 3 },
  ],
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
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'perforant-x', value: 1 },
    { keywordId: 'longue-distance' },
  ],
  'Luke Skywalker Jedi Knight': [
    { keywordId: 'saut-x', value: 1 },
    { keywordId: 'charge' },
    { keywordId: 'deflexion' },
    { keywordId: 'retrait' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'maitre-de-la-force-x', value: 1 },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'perforant-x', value: 2 },
  ],
  'Jyn Erso': [
    { keywordId: 'preste-x', value: 1 },
    { keywordId: 'retrait' },
    { keywordId: 'autonome' },
    { keywordId: 'infiltration' },
    { keywordId: 'agile' },
    { keywordId: 'tireur-delite-x', value: 1 },
    { keywordId: 'suppressif' },
    { keywordId: 'longue-distance' },
    { keywordId: 'perforant-x', value: 1 },
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
    { keywordId: 'longue-distance' },
  ],
  'Chewbacca': [
    { keywordId: 'enrage-x', value: 4 },
    { keywordId: 'gardien-x', value: 3 },
    { keywordId: 'ascension' },
    { keywordId: 'travail-dequipe' },
    { keywordId: 'letal-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'perforant-x', value: 1 },
  ],
  'Sabine Wren': [
    { keywordId: 'saut-x', value: 2 },
    { keywordId: 'pistolero' },
    { keywordId: 'insensible' },
    { keywordId: 'agile' },
    { keywordId: 'perforant-x', value: 1 },
  ],
  'R2-D2': [
    { keywordId: 'reparation-x', value: 2 },
    { keywordId: 'discret' },
    { keywordId: 'infiltration' },
    { keywordId: 'mission-secrete' },
    { keywordId: 'suppressif' },
  ],
  'Ahsoka Tano': [
    { keywordId: 'saut-x', value: 2 },
    { keywordId: 'charge' },
    { keywordId: 'defense-x', value: 1 },
    { keywordId: 'deflexion' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'maitrise-du-jarkai' },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'perforant-x', value: 2 },
  ],
  'K-2SO': [
    { keywordId: 'calcul-de-probabilites' },
    { keywordId: 'armure-x', value: 1 },
    { keywordId: 'detachement' },
    { keywordId: 'incognito' },
    { keywordId: 'infiltration' },
    { keywordId: 'travail-dequipe' },
  ],

  // --- Améliorations Alliance Rebelle ---
  'MPL-57 Ion Trooper': [
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'ion-x', value: 1 },
  ],
  'DLT-20A Trooper': [
    { keywordId: 'critique-x', value: 1 },
  ],
  'SX-21 Trooper': [
    { keywordId: 'impact-x', value: 1 },
  ],
  'MPL-57 Barrage Trooper': [
    { keywordId: 'deflagration' },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'cycle' },
  ],
  'CM-O/93 Trooper': [
    { keywordId: 'critique-x', value: 2 },
  ],
  'Proton Charge Saboteur': [
    { keywordId: 'deflagration' },
    { keywordId: 'critique-x', value: 2 },
    { keywordId: 'impact-x', value: 3 },
  ],
  'Scatter Gun Trooper': [
    { keywordId: 'perforant-x', value: 1 },
  ],
  'Long Gun Wookiee': [
    { keywordId: 'suppressif' },
  ],
  'DH-447 Sniper': [
    { keywordId: 'haute-velocite' },
    { keywordId: 'perforant-x', value: 1 },
  ],
  // Armure 1 conditionnelle (carte retournée en début d'activation)
  'Battle Shield Wookiee': [
    { keywordId: 'armure-x', value: 1 },
  ],
  // nom EN à vérifier
  'Rebel Trooper Squad': [
    { keywordId: 'indomptable' },
  ],
  'Bowcaster Wookiee': [
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'perforant-x', value: 1 },
  ],
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
  'Rebel Officer': [
    { keywordId: 'chef' },
    { keywordId: 'inspiration-x', value: 1 },
  ],
  'Rebel Trooper Captain': [
    { keywordId: 'chef' },
  ],
  '2-1B Medical Droid': [
    { keywordId: 'non-combattant' },
    { keywordId: 'traiter-x', value: 1 },
  ],
  'R5 Astromech Droid': [
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
  'Hotshot Pilot': [
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  'RPS-6 Rocket Gunner': [
    { keywordId: 'impact-x', value: 2 },
  ],
  'Wedge Antilles': [
    { keywordId: 'commandant-des-operations' },
  ],
  'Outer Rim Speeder Jockey': [
    { keywordId: 'couvert-x', value: 1 },
  ],
  'Mo/DK Power Harpoon': [
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
  'M-45 Ion Blaster': [
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'ion-x', value: 1 },
  ],
  // nom EN à vérifier
  'Mandalorian Combat Shields': [
    { keywordId: 'bouclier-x', value: 2 },
  ],
  'Jetpack Rockets': [
    { keywordId: 'deflagration' },
    { keywordId: 'impact-x', value: 1 },
  ],
  'AG-2G Quad Laser': [
    { keywordId: 'impact-x', value: 2 },
  ],
  'Heavy Laser Retrofit': [
    { keywordId: 'critique-x', value: 1 },
  ],
  // Config Fusil (Encombrant/Haute Vélocité) et Config Pistolet (Longue
  // Distance) fusionnées : carte unique recto/verso avec Reconfiguration,
  // Perforant 1 commun aux deux faces.
  'A280-CFE Pistol/Sniper Config': [
    { keywordId: 'perforant-x', value: 1 },
    { keywordId: 'encombrant' },
    { keywordId: 'haute-velocite' },
    { keywordId: 'longue-distance' },
  ],
  "Jyn's SE-14 Blaster": [
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
