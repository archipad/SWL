/**
 * Icônes de la barre de navigation, dessinées en SVG plutôt qu'en emoji.
 *
 * Deux raisons à ce choix (demande utilisateur) :
 * - Unité visuelle : un seul style de trait (même épaisseur, mêmes coins
 *   arrondis) pour les 7 icônes, plutôt que des emoji multicolores et
 *   d'esprits graphiques différents.
 * - Rendu identique sur toutes les plateformes : contrairement aux emoji
 *   (dont le dessin dépend de la police système — Noto Color Emoji sur
 *   Android, Apple Color Emoji sur iOS, Segoe UI Emoji sur Windows —
 *   souvent différents les uns des autres), un SVG en `currentColor`
 *   s'affiche pixel pour pixel à l'identique partout, tablette comme PC.
 *   Même principe déjà utilisé pour les icônes de dés (voir diceIcons.tsx),
 *   ici en SVG inline plutôt qu'en masque PNG (pas de fichier supplémentaire
 *   à précacher pour le PWA).
 */
export type NavIconId =
  | 'listes'
  | 'armees'
  | 'suivi'
  | 'assistant'
  | 'glossaire'
  | 'pense-bete'
  | 'imprimer';

export function NavIcon({ id }: { id: NavIconId }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {id === 'listes' && (
        // Bordereau de liste (coin plié) — ordre de bataille.
        <>
          <path d="M6 3h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path d="M15 3v3h3" />
          <path d="M8 11h8M8 14h8M8 17h5" />
        </>
      )}
      {id === 'armees' && (
        // Insigne de rang (losange), comme sur les cartes Commandement.
        <>
          <path d="M12 3l7 7-7 7-7-7 7-7z" />
          <path d="M12 9.2l2.6 2.6-2.6 2.6-2.6-2.6L12 9.2z" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'suivi' && (
        // Réticule de ciblage.
        <>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'assistant' && (
        // Sabre laser : lame, garde, poignée, pommeau.
        <>
          <path d="M12 3v11" strokeWidth="2.4" />
          <path d="M8.5 14.5h7" />
          <path d="M12 16.5v3.5" />
          <circle cx="12" cy="21" r="0.9" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'glossaire' && (
        // Loupe.
        <>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15l5 5" />
        </>
      )}
      {id === 'pense-bete' && (
        // Datapad.
        <>
          <rect x="4.5" y="3" width="15" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </>
      )}
      {id === 'imprimer' && (
        // Imprimante.
        <>
          <path d="M7 8V4h10v4" />
          <rect x="4" y="8" width="16" height="8" rx="1.5" />
          <rect x="7" y="14" width="10" height="7" />
          <circle cx="16.5" cy="11" r="0.8" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
