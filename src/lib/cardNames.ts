import { normalizeName } from './normalize';
import { CARD_NAMES_FR } from '../data/cardNamesFr';

/**
 * Nom d'affichage d'une carte (unité ou amélioration) : le titre français
 * officiel s'il est connu (CARD_NAMES_FR), sinon le nom tel quel (format
 * Tabletop Admiral, anglais) — jamais d'erreur ni de case vide pour une
 * carte pas encore vérifiée. À utiliser UNIQUEMENT pour l'affichage ;
 * toute logique de comparaison/lookup continue de passer par le nom brut
 * + normalizeName() (tagLibrary, CARD_IMAGES, identité de carte).
 */
export function frenchCardName(name: string): string {
  return CARD_NAMES_FR[normalizeName(name)] ?? name;
}
