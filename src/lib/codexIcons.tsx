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
  | 'range' | 'rules' | 'search' | 'settings' | 'strategy' | 'suppression' | 'surge' | 'tools' | 'units' | 'wound';

/* Loupe : absente du pack PNG, dessinée en SVG (masque, même principe que les autres pictogrammes). */
const SEARCH_ICON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='10' cy='10' r='6.2' fill='none' stroke='%23000' stroke-width='2.6'/%3E%3Cpath d='M14.6 14.6L21 21' fill='none' stroke='%23000' stroke-width='2.8' stroke-linecap='round'/%3E%3C/svg%3E\")";

export function CxIcon({ name, className }: { name: CxIconName; className?: string }) {
  const style = { '--cx-icon': name === 'search' ? SEARCH_ICON : `url(${import.meta.env.BASE_URL}codex/icons/${name}.png)` } as CSSProperties;
  return <span className={className ? `cx-icon ${className}` : 'cx-icon'} style={style} aria-hidden="true" />;
}
