import { useCallback, useEffect, useRef, useState } from 'react';
import type { ParsedList } from '../types';
import * as gistSync from './gistSync';

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'error';

interface UseSyncOptions {
  listP1: ParsedList | null;
  listP2: ParsedList | null;
  setListP1: (l: ParsedList | null) => void;
  setListP2: (l: ParsedList | null) => void;
}

/**
 * Synchronise listP1/listP2 avec le Gist GitHub de l'utilisateur (voir
 * lib/gistSync.ts). Tire (pull) au montage et quand l'appli redevient
 * visible ; pousse (push) explicitement quand l'appelant importe ou
 * supprime une liste — voir `push` retourné par ce hook.
 */
export function useSync({ listP1, listP2, setListP1, setListP2 }: UseSyncOptions) {
  const [token, setTokenState] = useState<string | null>(() => gistSync.getToken());
  const [status, setStatus] = useState<SyncStatus>(() => (gistSync.getToken() ? 'idle' : 'disabled'));
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  // Horodatage du dernier état connu comme synchronisé (poussé ou tiré), pour
  // ne jamais écraser un import local plus récent par une réponse distante
  // plus ancienne.
  const knownUpdatedAt = useRef(0);

  const saveToken = useCallback((t: string) => {
    gistSync.setToken(t);
    knownUpdatedAt.current = 0;
    setTokenState(t);
    setStatus('idle');
    setError(null);
  }, []);

  const removeToken = useCallback(() => {
    gistSync.clearToken();
    setTokenState(null);
    setStatus('disabled');
    setError(null);
  }, []);

  const pull = useCallback(async () => {
    if (!token) return;
    setStatus('syncing');
    try {
      const remote = await gistSync.pullSync(token);
      if (remote.updatedAt > knownUpdatedAt.current) {
        setListP1(remote.listP1);
        setListP2(remote.listP2);
        knownUpdatedAt.current = remote.updatedAt;
      } else if (remote.updatedAt === 0 && (listP1 || listP2)) {
        // Gist tout juste créé (vide) mais on a déjà des listes localement :
        // on les y envoie pour amorcer la synchro sur les autres appareils.
        const saved = await gistSync.pushSync(token, { listP1, listP2 });
        knownUpdatedAt.current = saved.updatedAt;
      }
      setStatus('idle');
      setError(null);
      setLastSyncAt(Date.now());
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
    // listP1/listP2 volontairement omis : on ne veut relancer ce callback
    // que si le jeton change, pas à chaque import (voir push ci-dessous).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, setListP1, setListP2]);

  const push = useCallback(
    async (nextP1: ParsedList | null, nextP2: ParsedList | null) => {
      if (!token) return;
      setStatus('syncing');
      try {
        const saved = await gistSync.pushSync(token, { listP1: nextP1, listP2: nextP2 });
        knownUpdatedAt.current = saved.updatedAt;
        setStatus('idle');
        setError(null);
        setLastSyncAt(Date.now());
      } catch (e) {
        setStatus('error');
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [token],
  );

  useEffect(() => {
    if (token) pull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') pull();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [token, pull]);

  return { token, status, error, lastSyncAt, saveToken, removeToken, pull, push };
}
