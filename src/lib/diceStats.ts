import type { DiceIconType } from './diceIcons';

/**
 * Composition exacte des faces de dés de Star Wars: Legion — pas les
 * probabilités d'une réserve complète (ça dépendrait des dés choisis, des
 * relances, des conversions d'adrénaline propres à chaque unité/arme...),
 * juste la composition officielle de chaque dé pris isolément.
 *
 * Aucune de nos sources habituelles (livret officiel scanné, Codex-Xesh) ne
 * documente cette composition — vérifiée en recoupant deux implémentations
 * indépendantes et open source de simulateurs de dés Legion (mêmes valeurs
 * dans les deux, à l'ordre des faces près) :
 * - github.com/matanlurey/rollcrits (src/app/simulation.ts)
 * - github.com/andrew-s-hart/SW-Legion-Probability-Calculator (Form1.cs)
 */
export interface DiceFace {
  /** undefined = face vierge (aucun symbole). */
  type?: DiceIconType;
  count: number;
}

export interface DiceDef {
  id: string;
  label: string;
  /** Couleur d'affichage (pastille), proche de la couleur réelle du dé. */
  swatch: string;
  sides: number;
  faces: DiceFace[];
}

export const ATTACK_DICE: DiceDef[] = [
  {
    id: 'rouge-atq', label: 'Dé d’attaque rouge', swatch: '#c0392b', sides: 8,
    faces: [{ type: 'touche', count: 5 }, { type: 'critique', count: 1 }, { type: 'adr-atq', count: 1 }, { count: 1 }],
  },
  {
    id: 'noir-atq', label: 'Dé d’attaque noir', swatch: '#22232a', sides: 8,
    faces: [{ type: 'touche', count: 3 }, { type: 'critique', count: 1 }, { type: 'adr-atq', count: 1 }, { count: 3 }],
  },
  {
    id: 'blanc-atq', label: 'Dé d’attaque blanc', swatch: '#d9dbe0', sides: 8,
    faces: [{ type: 'touche', count: 1 }, { type: 'critique', count: 1 }, { type: 'adr-atq', count: 1 }, { count: 5 }],
  },
];

export const DEFENSE_DICE: DiceDef[] = [
  {
    id: 'rouge-def', label: 'Dé de défense rouge', swatch: '#c0392b', sides: 6,
    faces: [{ type: 'bloc', count: 3 }, { type: 'adr-def', count: 1 }, { count: 2 }],
  },
  {
    id: 'blanc-def', label: 'Dé de défense blanc', swatch: '#d9dbe0', sides: 6,
    faces: [{ type: 'bloc', count: 1 }, { type: 'adr-def', count: 1 }, { count: 4 }],
  },
];

export function facePercent(count: number, sides: number): string {
  return `${Math.round((count / sides) * 100)}%`;
}
