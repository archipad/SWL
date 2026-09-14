import type { GameTrackerState } from './useGameTracker';

export interface GameActionEntry {
  id: string;
  at: string;
  device: string;
  label: string;
  before: GameTrackerState;
  undoneAt?: string;
}

const HISTORY_KEY = 'swl.game-action-history.v1';
const DEVICE_KEY = 'swl.device-label.v1';
const MAX_ACTIONS = 30;

export function deviceLabel(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const value = `Appareil ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    localStorage.setItem(DEVICE_KEY, value);
    return value;
  } catch { return 'Cet appareil'; }
}

export function readGameActions(): GameActionEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as GameActionEntry[]; }
  catch { return []; }
}

export function recordGameAction(label: string, before: GameTrackerState): GameActionEntry[] {
  const entry: GameActionEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), device: deviceLabel(), label, before };
  const next = [entry, ...readGameActions()].slice(0, MAX_ACTIONS);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* mémoire locale indisponible */ }
  return next;
}

export function removeGameAction(id: string): GameActionEntry[] {
  const next = readGameActions().map((entry) => entry.id === id ? { ...entry, undoneAt: new Date().toISOString() } : entry);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* mémoire locale indisponible */ }
  return next;
}

export function clearGameActions(): void {
  try { localStorage.setItem(HISTORY_KEY, '[]'); } catch { /* mémoire locale indisponible */ }
}
