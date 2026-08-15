import { useCallback, useEffect } from 'react';
import { usePersistentState } from './storage';
import { normalizeName } from './normalize';
import { SEED_CARD_TAGS } from '../data/cardTags';
import type { CardKeywordTag, CardTagLibrary } from '../types';

const STORAGE_KEY = 'swl.card-tags.v1';
const APPLIED_SEED_KEY = 'swl.card-tags-seed-applied.v1';

export function useCardTags() {
  const [library, setLibrary] = usePersistentState<CardTagLibrary>(STORAGE_KEY, {});
  // Mémorise, par carte, les entrées d'amorce déjà appliquées sur cet
  // appareil — pour appliquer une fois chaque nouveauté de data/cardTags.ts
  // (y compris sur un appareil qui a déjà utilisé l'appli avant son ajout),
  // sans jamais revenir sur une suppression volontaire de l'utilisateur.
  const [appliedSeedKeys, setAppliedSeedKeys] = usePersistentState<string[]>(APPLIED_SEED_KEY, []);

  useEffect(() => {
    const applied = new Set(appliedSeedKeys);
    const pending = Object.entries(SEED_CARD_TAGS).filter(([key]) => !applied.has(key));
    if (pending.length === 0) return;

    setLibrary((prev) => {
      const next = { ...prev };
      for (const [key, tags] of pending) {
        const existing = next[key] ?? [];
        const merged = [...existing];
        for (const tag of tags) {
          if (!merged.some((t) => t.keywordId === tag.keywordId)) merged.push(tag);
        }
        next[key] = merged;
      }
      return next;
    });
    setAppliedSeedKeys([...applied, ...pending.map(([key]) => key)]);
    // Ne doit s'exécuter qu'une fois par nouvelle entrée d'amorce, pas à
    // chaque changement de `library` (sinon on annulerait les suppressions).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
