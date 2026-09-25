import type { CSSProperties } from 'react';

/**
 * Pictogrammes du pack « Codex Legion » (public/codex/icons, PNG blancs à
 * fond transparent, 128 px). Utilisés comme MASQUE CSS : la forme vient du
 * PNG, la couleur de `currentColor` -- une seule série d'images sert tous
 * les thèmes (blanc/rouge en Empire, bleu marine/ambre en Rébellion) sans
 * fichier par couleur. Décoratifs (aria-hidden) : le libellé texte à côté
 * porte le sens.
 */
export type CxIconName =
  | 'ability' | 'aim' | 'army' | 'attack' | 'close' | 'courage' | 'cover' | 'critical' | 'defense' | 'dice'
  | 'dodge' | 'health' | 'hit' | 'impact' | 'info' | 'minus' | 'mission' | 'move' | 'next' | 'play' | 'plus'
  | 'range' | 'rules' | 'settings' | 'strategy' | 'suppression' | 'surge' | 'tools' | 'units' | 'wound';

export function CxIcon({ name, className }: { name: CxIconName; className?: string }) {
  const style = { '--cx-icon': `url(${import.meta.env.BASE_URL}codex/icons/${name}.png)` } as CSSProperties;
  return <span className={className ? `cx-icon ${className}` : 'cx-icon'} style={style} aria-hidden="true" />;
}
