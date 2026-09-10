import { usePersistentState } from './storage';

export type BattleColor = 'bleu' | 'rouge';
export interface RoundHistoryEntry { round: number; activatedUnitIds: string[]; vpBleu: number; vpRouge: number; completedAt: string }

export interface GameTrackerState {
  round: number;
  p1Color: BattleColor;
  vpBleu: number;
  vpRouge: number;
  objectiveId: string | null;
  secondaryId: string | null;
  advantageBleuId: string | null;
  advantageRougeId: string | null;
  activatedUnitIds: string[];
  roundHistory: RoundHistoryEntry[];
}

const DEFAULT_STATE: GameTrackerState = {
  round: 1,
  p1Color: 'bleu',
  vpBleu: 0,
  vpRouge: 0,
  objectiveId: null,
  secondaryId: null,
  advantageBleuId: null,
  advantageRougeId: null,
  activatedUnitIds: [],
  roundHistory: [],
};

/**
 * Suivi de partie (round, activations, points de victoire, objectifs sélectionnés).
 * Les points de victoire et les cartes Avantage sont
 * rattachés à la couleur (bleu/rouge), comme sur le tapis de jeu physique ;
 * `p1Color` retient quel côté (bleu ou rouge) le Joueur 1 a choisi en début
 * de partie, pour afficher son nom à côté du bon badge.
 */
export function useGameTracker() {
  const [state, setState] = usePersistentState<GameTrackerState>('swl.game-tracker.v1', DEFAULT_STATE);

  const patch = (changes: Partial<GameTrackerState>) => setState((prev) => ({ ...prev, ...changes }));

  const reset = () => setState(DEFAULT_STATE);

  return { state, patch, reset, replace: setState };
}
