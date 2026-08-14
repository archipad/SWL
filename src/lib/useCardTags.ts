import { useCallback } from 'react';
import { usePersistentState } from './storage';
import { normalizeName } from './normalize';
import { SEED_CARD_TAGS } from '../data/cardTags';
import type { CardKeywordTag, CardTagLibrary } from '../types';

const STORAGE_KEY = 'swl.card-tags.v1';

export function useCardTags() {
  // SEED_CARD_TAGS ne sert que de valeur de départ : dès qu'un appareil a
  // sauvegardé quoi que ce soit (même après suppression totale), ses propres
  // données priment et ne sont jamais écrasées par l'amorce.
  const [library, setLibrary] = usePersistentState<CardTagLibrary>(STORAGE_KEY, SEED_CARD_TAGS);

  const getTags = useCallback(
    (cardName: string): CardKeywordTag[] => library[normalizeName(cardName)] ?? [],
    [library],
  );

  const addTag = useCallback(
    (cardName: string, tag: CardKeywordTag) => {
      const key = normalizeName(cardName);
      setLibrary((prev) => {
        const existing = prev[key] ?? [];
        if (existing.some((t) => t.keywordId === tag.keywordId)) return prev;
        return { ...prev, [key]: [...existing, tag] };
      });
    },
    [setLibrary],
  );

  const removeTag = useCallback(
    (cardName: string, keywordId: string) => {
      const key = normalizeName(cardName);
      setLibrary((prev) => {
        if (!prev[key]) return prev;
        const filtered = prev[key].filter((t) => t.keywordId !== keywordId);
        const next = { ...prev, [key]: filtered };
        if (filtered.length === 0) delete next[key];
        return next;
      });
    },
    [setLibrary],
  );

  return { library, getTags, addTag, removeTag };
}
