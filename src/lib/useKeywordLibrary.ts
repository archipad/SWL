import { useCallback } from 'react';
import { usePersistentState } from './storage';
import { SEED_KEYWORDS } from '../data/keywords';
import type { KeywordDef } from '../types';

const STORAGE_KEY = 'swl.keywords.v1';

export function useKeywordLibrary() {
  const [keywords, setKeywords] = usePersistentState<KeywordDef[]>(STORAGE_KEY, SEED_KEYWORDS);

  const upsertKeyword = useCallback(
    (kw: KeywordDef) => {
      setKeywords((prev) => {
        const i = prev.findIndex((k) => k.id === kw.id);
        if (i === -1) return [...prev, kw];
        const next = [...prev];
        next[i] = kw;
        return next;
      });
    },
    [setKeywords],
  );

  const removeKeyword = useCallback(
    (id: string) => setKeywords((prev) => prev.filter((k) => k.id !== id)),
    [setKeywords],
  );

  const resetToDefaults = useCallback(() => setKeywords(SEED_KEYWORDS), [setKeywords]);

  return { keywords, upsertKeyword, removeKeyword, resetToDefaults };
}

export function slugifyKeywordId(name: string): string {
  return (
    name
      .normalize('NFD')
      // eslint-disable-next-line no-misleading-character-class
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `mot-cle-${Date.now()}`
  );
}
