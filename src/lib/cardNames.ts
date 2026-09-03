import { normalizeName } from './normalize';
import { CARD_NAMES_FR, EN_KEY_BY_FRENCH_NAME } from '../data/cardNamesFr';

/**
 * Nom d'affichage d'une carte (unité ou amélioration) : le titre français
 * officiel s'il est connu (CARD_NAMES_FR), sinon le nom tel quel (format
 * Tabletop Admiral, anglais) — jamais d'erreur ni de case vide pour une
 * carte pas encore vérifiée. À utiliser UNIQUEMENT pour l'affichage ;
 * toute logique de comparaison/lookup passe par canonicalCardKey()
 * ci-dessous (tagLibrary, CARD_IMAGES, diceProfiles).
 */
export function frenchCardName(name: string): string {
  return CARD_NAMES_FR[normalizeName(name)] ?? name;
}

/**
 * Clé normalisée à utiliser pour tout lookup de données de carte (mots-clés,
 * visuel, dés). Toutes ces tables sont indexées par nom ANGLAIS (format
 * Tabletop Admiral) — mais une liste peut aussi être saisie en texte libre
 * avec les noms FRANÇAIS imprimés sur les vraies cartes (ex. « Marche
 * Impériale » au lieu de « Imperial March »), auquel cas un simple
 * normalizeName(name) ne matche plus rien et la carte perd silencieusement
 * ses mots-clés/son visuel. On tente donc, dans l'ordre : la clé anglaise
 * directe, puis la table inverse FR -> EN ; à défaut (carte inconnue des
 * deux côtés), le nom normalisé tel quel, sans erreur.
 */
export function canonicalCardKey(name: string): string {
  const norm = normalizeName(name);
  if (norm in CARD_NAMES_FR) return norm;
  return EN_KEY_BY_FRENCH_NAME[norm] ?? norm;
}
