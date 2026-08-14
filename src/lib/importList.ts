import type { ParsedList } from '../types';
import { parseArmyListJson } from './parseListJson';
import { parseArmyListText } from './parseList';

/**
 * Point d'entrée unique pour l'import : détecte automatiquement si le texte
 * collé est un JSON Tabletop Admiral (format stable, fiable) et l'utilise en
 * priorité, sinon retombe sur le parseur de texte tolérant.
 */
export function importArmyList(input: string): ParsedList {
  const trimmed = input.trim();
  if (trimmed.startsWith('{')) {
    const fromJson = parseArmyListJson(trimmed);
    if (fromJson) return fromJson;
  }
  return parseArmyListText(input);
}
