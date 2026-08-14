import type { CardKeywordTag, CardTagLibrary } from '../types';
import { normalizeName } from '../lib/normalize';

/**
 * Mots-clés d'unité vérifiés depuis un vrai PDF de cartes Unité (Galactic
 * Empire, fourni par l'utilisateur) — pas une invention. Sert d'amorce : ne
 * couvre que quelques unités emblématiques d'Empire Galactique, pas les
 * cartes Amélioration (pas de source fournie pour celles-ci pour l'instant).
 *
 * N'écrase jamais les tags déjà sauvegardés par un utilisateur : voir
 * lib/useCardTags.ts, qui ne s'en sert que comme valeur initiale tant que
 * rien n'existe en localStorage.
 *
 * L'AT-ST existe en deux configurations imprimées différentes (Weak Point:
 * Sides à 145 pts, ou Weak Point: Rear à 125 pts) ; celle retenue ici est la
 * plus courante (Armor 5, Twin/Quad Cannons) — vérifiez votre carte.
 */
const RAW: Record<string, { keywordId: string; value?: number }[]> = {
  'Darth Vader Dark Lord of the Sith': [
    { keywordId: 'compel' },
    { keywordId: 'deflexion' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'maitre-de-la-force-x', value: 1 },
    { keywordId: 'implacable' },
    { keywordId: 'impact-x', value: 3 },
    { keywordId: 'perforant-x', value: 3 },
  ],
  'Stormtrooper Riot Squad': [
    { keywordId: 'charge' },
    { keywordId: 'hold-the-line' },
    { keywordId: 'suppressif' },
  ],
  'Snowtroopers': [
    { keywordId: 'stable' },
  ],
  'Imperial Death Troopers': [
    { keywordId: 'discipline-x', value: 1 },
    { keywordId: 'precis-x', value: 2 },
    { keywordId: 'ready-x', value: 1 },
  ],
  'Scout Troopers': [
    { keywordId: 'low-profile' },
    { keywordId: 'eclaireur-x', value: 3 },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  'Scout Troopers Strike Team': [
    { keywordId: 'detachement' },
    { keywordId: 'equipe-avec-arme-lourde' },
    { keywordId: 'incognito' },
    { keywordId: 'low-profile' },
    { keywordId: 'position-preparee' },
  ],
  '74-Z Speeder Bikes': [
    { keywordId: 'couvert-x', value: 1 },
    { keywordId: 'speeder-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
  ],
  'AT-ST': [
    { keywordId: 'armure-x', value: 5 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'repositionnement' },
    { keywordId: 'transport' },
    { keywordId: 'point-faible-x', value: 1 },
    { keywordId: 'suppressif' },
    { keywordId: 'impact-x', value: 2 },
  ],
};

export const SEED_CARD_TAGS: CardTagLibrary = Object.fromEntries(
  Object.entries(RAW).map(([name, tags]) => [normalizeName(name), tags as CardKeywordTag[]]),
);
