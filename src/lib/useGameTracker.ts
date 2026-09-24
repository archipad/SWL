import { usePersistentState } from './storage';

export type BattleColor = 'bleu' | 'rouge';
export interface RoundHistoryEntry { round: number; activatedUnitIds: string[]; vpBleu: number; vpRouge: number; completedAt: string }

/** Suite de Commandement d'un joueur : les 7 cartes construites une fois en
 * début de partie (`suite`), celles déjà révélées et donc injouables pour le
 * reste de la partie (`played`), et le choix du round en cours tant qu'il
 * n'a pas été révélé (`pendingId`, jamais montré à l'adversaire). */
export interface CommandDeckState {
  suite: string[];
  played: string[];
  pendingId: string | null;
}
/** Dernières cartes de Commandement révélées simultanément (`round` permet
 * de savoir si l'affichage correspond encore au round en cours). */
export interface CommandRevealState { round: number; bleuId: string; rougeId: string }

const EMPTY_COMMAND_DECK: CommandDeckState = { suite: [], played: [], pendingId: null };

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
  commandDecks: { bleu: CommandDeckState; rouge: CommandDeckState };
  commandReveal: CommandRevealState | null;
}

export const DEFAULT_STATE: GameTrackerState = {
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
  commandDecks: { bleu: EMPTY_COMMAND_DECK, rouge: EMPTY_COMMAND_DECK },
  commandReveal: null,
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
