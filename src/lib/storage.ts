import { useEffect, useState } from 'react';

/** Hook d'état persisté dans localStorage (avec garde SSR/PWA offline-safe). */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // stockage plein ou indisponible : on continue en mémoire seulement
    }
  }, [key, value]);

  return [value, setValue] as const;
}
