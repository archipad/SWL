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
};

export const SEED_CARD_TAGS: CardTagLibrary = Object.fromEntries(
  Object.entries(RAW).map(([name, tags]) => [normalizeName(name), tags as CardKeywordTag[]]),
);
