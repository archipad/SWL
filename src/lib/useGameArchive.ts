import { usePersistentState } from './storage';
import type { GameTrackerState } from './useGameTracker';

/** Snapshot complet d'une partie, suffisant pour la restaurer telle quelle. */
export interface ArchivedGame {
  id: string;
  archivedAt: string;
  p1Label: string;
  p2Label: string;
  p1Color: GameTrackerState['p1Color'];
  vpBleu: number;
  vpRouge: number;
  finalRound: number;
  objectiveId: string | null;
  secondaryId: string | null;
  snapshot: {
    gameTracker: GameTrackerState;
    unitStates: Record<string, unknown>;
    attackHistory: unknown[];
  };
}

const STORAGE_KEY = 'swl.game-archive.v1';
// Conserve un historique utile sans grossir indéfiniment le stockage local.
const MAX_ENTRIES = 20;

/**
 * Historique des parties précédentes : capturé automatiquement juste avant
 * chaque remise à zéro (bouton « Nouvelle partie ») ou chaque restauration
 * (voir GameTrackerScreen.tsx), pour deux usages demandés par l'utilisateur —
 * revoir les résultats des parties passées entre amis, et annuler une remise
 * à zéro faite par erreur.
 */
export function useGameArchive() {
  const [games, setGames] = usePersistentState<ArchivedGame[]>(STORAGE_KEY, []);

  const archive = (entry: Omit<ArchivedGame, 'id' | 'archivedAt'>) => {
    const record: ArchivedGame = { ...entry, id: `${Date.now()}`, archivedAt: new Date().toISOString() };
    setGames((prev) => [record, ...prev].slice(0, MAX_ENTRIES));
    return record;
  };

  const remove = (id: string) => setGames((prev) => prev.filter((g) => g.id !== id));

  return { games, archive, remove };
}
