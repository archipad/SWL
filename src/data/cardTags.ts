import type { CardKeywordTag, CardTagLibrary } from '../types';
import { normalizeName } from '../lib/normalize';

/**
 * Mots-clés d'unité vérifiés depuis les vraies cartes Unité Galactic Empire
 * fournies par l'utilisateur (versions EN puis FR — la FR fait foi en cas
 * d'écart, ex. Vador : la version EN indiquait "Pierce 3" sur son sabre par
 * erreur de lecture de grille d'impression, corrigé ici en "Perforant 1"
 * d'après la carte FR ; on retire même cette valeur par prudence, voir
 * plus bas). Pas une invention.
 *
 * N'écrase jamais les tags déjà sauvegardés par un utilisateur : voir
 * lib/useCardTags.ts, qui ne s'en sert que comme valeur initiale tant que
 * rien n'existe en localStorage.
 *
 * L'AT-ST existe en deux configurations imprimées différentes (Point
 * Faible 1 : Flancs à 145 pts, ou Point Faible 1 : Arrière à 125 pts) ;
 * celle retenue ici est la plus courante (Armure 5, Canons Jumelés/Quadruples)
 * — vérifiez votre carte.
 */
const RAW: Record<string, { keywordId: string; value?: number }[]> = {
  'Darth Vader Dark Lord of the Sith': [
    { keywordId: 'compel' },
    { keywordId: 'deflexion' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'maitre-de-la-force-x', value: 1 },
    { keywordId: 'implacable' },
    // Valeurs d'Impact/Perforant du sabre volontairement omises : la
    // version EN et la version FR du PDF se contredisaient (grille
    // d'impression ambiguë, 2 Vador différents imprimés côte à côte) —
    // vérifiez la carte plutôt que de faire confiance à un chiffre non
    // confirmé de façon croisée.
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
};

export const SEED_CARD_TAGS: CardTagLibrary = Object.fromEntries(
  Object.entries(RAW).map(([name, tags]) => [normalizeName(name), tags as CardKeywordTag[]]),
);
