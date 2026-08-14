/** Normalise un nom de carte pour s'en servir de clé stable (comparaison, stockage). */
export function normalizeName(raw: string): string {
  return raw
    .normalize('NFD')
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, '') // marques diacritiques (accents) après décomposition NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
