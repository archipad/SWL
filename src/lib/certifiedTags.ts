import certified from '../data/certifiedCardTags.json';
import type { CardTagLibrary } from '../types';

const CERTIFIED_TAGS = certified.tags as CardTagLibrary;
const RETIRED_KEYWORDS = certified.retiredKeywords as Record<string, string[]>;

/**
 * Mots-clés effectifs d'un appareil : même règle que l'Assistant (public/assistant/app.js, `tags`).
 * La valeur certifiée l'emporte sur swl.card-tags.v1, qui garde une copie de l'ancienne amorce
 * (Critique 0 pour Héros Malgré Lui, Démoraliser sur le Sabre Noir). Un retrait volontaire reste
 * respecté, et une étiquette ajoutée à la main sur un mot-clé non certifié est conservée.
 */
export function applyCertifiedTags(local: CardTagLibrary, removed: Record<string, string[]>): CardTagLibrary {
  const merged: CardTagLibrary = {};
  for (const key of new Set([...Object.keys(CERTIFIED_TAGS), ...Object.keys(local)])) {
    const excluded = new Set([...(removed[key] ?? []), ...(RETIRED_KEYWORDS[key] ?? [])]);
    const tags = (CERTIFIED_TAGS[key] ?? []).filter((tag) => !excluded.has(tag.keywordId));
    const certifiedIds = new Set(tags.map((tag) => tag.keywordId));
    merged[key] = [...tags, ...(local[key] ?? []).filter((tag) => !excluded.has(tag.keywordId) && !certifiedIds.has(tag.keywordId))];
  }
  return merged;
}
