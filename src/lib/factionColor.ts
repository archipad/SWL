import type { ParsedList } from '../types';

/**
 * Couleur d'accent par faction — sert uniquement à faire ressortir visuellement
 * les en-têtes de groupe (ex. écran de sélection du Combat interactif), pas à
 * représenter une règle de jeu. Couvre les factions déjà normalisées par
 * parseListJson.ts (FACTION_LABELS) ; une faction non reconnue (ex. ligne de
 * faction texte libre) retombe sur la couleur neutre habituelle plutôt que de
 * deviner.
 */
const FACTION_COLORS: Record<string, string> = {
  'empire galactique': '#d83a2f',
  'alliance rebelle': '#e0a940',
  'république galactique': '#4a90d9',
  'alliance séparatiste': '#c0622e',
  mercenaires: '#4caf7d',
};

export function factionColor(list: ParsedList | null): string | undefined {
  const key = list?.faction?.toLowerCase().trim();
  if (!key) return undefined;
  return FACTION_COLORS[key];
}
