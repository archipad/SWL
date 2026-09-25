/**
 * Icônes d'interface (actions, statuts) en SVG, même style de trait que
 * lib/navIcons.tsx : un seul langage d'icônes pour tout le site plutôt que
 * des emoji dont le dessin dépend de la police système (Apple Color Emoji,
 * Noto, Segoe UI Emoji...) et qui jurent avec la barre de navigation.
 * `currentColor` : l'icône prend la couleur du texte du bouton (orange en
 * primaire, rouge en danger...). Décoratives (aria-hidden) : le libellé
 * texte du bouton porte le sens ; pour un bouton sans texte, poser un
 * aria-label sur le <button>.
 */
export type UiIconId =
  | 'print'
  | 'trash'
  | 'zoom'
  | 'reset'
  | 'undo'
  | 'restore'
  | 'cards'
  | 'saber'
  | 'new'
  | 'trophy'
  | 'audit'
  | 'device'
  | 'warning'
  | 'skull';

export function UiIcon({ id }: { id: UiIconId }) {
  return (
    <svg
      className="ui-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {id === 'print' && (
        <>
          <path d="M7 8V4h10v4" />
          <rect x="4" y="8" width="16" height="8" rx="1.5" />
          <rect x="7" y="14" width="10" height="7" />
        </>
      )}
      {id === 'trash' && (
        <>
          <path d="M4 7h16" />
          <path d="M9 7V4h6v3" />
          <path d="M6 7l1 13h10l1-13" />
          <path d="M10 11v6M14 11v6" />
        </>
      )}
      {id === 'zoom' && (
        <>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15l5 5" />
          <path d="M10.5 8v5M8 10.5h5" />
        </>
      )}
      {id === 'reset' && (
        <>
          <path d="M20 12a8 8 0 1 1-2.6-5.9" />
          <path d="M20 4v5h-5" />
        </>
      )}
      {id === 'undo' && (
        <>
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
        </>
      )}
      {id === 'restore' && (
        <>
          <path d="M4 12a8 8 0 1 0 2.6-5.9" />
          <path d="M4 4v5h5" />
          <path d="M12 8v4l3 2" />
        </>
      )}
      {id === 'cards' && (
        <>
          <rect x="5" y="3.5" width="14" height="17" rx="1.6" />
          <circle cx="9.3" cy="8" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="13.3" cy="8" r="1.5" fill="currentColor" stroke="none" />
          <path d="M8 14h8M8 17h5" />
        </>
      )}
      {id === 'saber' && (
        <>
          <path d="M12 3v11" strokeWidth="2.4" />
          <path d="M8.5 14.5h7" />
          <path d="M12 16.5v3.5" />
          <circle cx="12" cy="21" r="0.9" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'new' && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="1.6" />
          <path d="M12 8v8M8 12h8" />
        </>
      )}
      {id === 'trophy' && (
        <>
          <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
          <path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3" />
          <path d="M12 13v4M9 20h6M10 17h4" />
        </>
      )}
      {id === 'audit' && (
        <>
          <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
          <path d="M8 15h8" />
        </>
      )}
      {id === 'device' && (
        <>
          <rect x="7" y="3" width="10" height="18" rx="2" />
          <path d="M11 18h2" />
        </>
      )}
      {id === 'warning' && (
        <>
          <path d="M12 4l9 16H3L12 4z" />
          <path d="M12 10v4" />
          <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'skull' && (
        <>
          <path d="M5 11a7 7 0 0 1 14 0v4l-2 1v3h-2v-2h-2v2h-2v-2H9v2H7v-3l-2-1v-4z" />
          <circle cx="9.5" cy="11.5" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="11.5" r="1.4" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

/** Pastille de camp (Bleu / Rouge) : remplace les emoji 🔵/🔴, dont la teinte varie selon la plateforme. */
export function SideDot({ color }: { color: 'bleu' | 'rouge' }) {
  return <span className={`side-dot side-dot-${color}`} role="img" aria-label={color === 'bleu' ? 'Bleu' : 'Rouge'} />;
}
