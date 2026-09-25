import { normalizeName } from '../lib/normalize';

/**
 * Portraits d'unités du pack « Codex Legion » (public/codex/portraits) : de
 * petites découpes de la maquette de l'utilisateur, à n'utiliser qu'en
 * vignette (pas de grands formats). Clé = nom de carte normalisé
 * (normalizeName). Une unité absente d'ici retombe sur un recadrage de son
 * visuel de carte (voir ArmyListView).
 */
const BASE = `${import.meta.env.BASE_URL}codex/portraits/`;

const PORTRAITS: Record<string, string> = {
  'darth vader dark lord of the sith': 'darth-vader.png',
  'stormtroopers': 'stormtroopers.png',
  'scout troopers': 'scout-troopers.png',
  'at st': 'at-st.png',
  'imperial officer': 'imperial-officer.png',
  'rebel troopers': 'rebel-troopers.png',
  'luke skywalker': 'luke-skywalker.png',
  'rebel commandos strike team': 'rebel-commandos.png',
  'rebel commandos': 'rebel-commandos.png',
  'at rt': 'at-rt.png',
  'rebel officer': 'rebel-officer.png',
};

export function codexPortraitFor(cardName: string): string | undefined {
  const file = PORTRAITS[normalizeName(cardName)];
  return file ? `${BASE}${file}` : undefined;
}
