/**
 * Icônes de la barre de navigation, dessinées en SVG plutôt qu'en emoji.
 *
 * Deux raisons à ce choix (demande utilisateur) :
 * - Unité visuelle : un seul style de trait (même épaisseur, mêmes coins)
 *   pour toutes les icônes, plutôt que des emoji multicolores.
 * - Rendu identique sur toutes les plateformes : contrairement aux emoji
 *   (dont le dessin dépend de la police système), un SVG en `currentColor`
 *   s'affiche pixel pour pixel à l'identique partout, tablette comme PC.
 *
 * Refonte « Star Wars » (25/09/2026) : angles coupés plutôt qu'arrondis
 * (langage des interfaces impériales), sabre laser incliné avec halo,
 * hologramme hexagonal, holocron ; l'icône « Armées » affiche l'insigne de
 * la faction du thème actif (Rébellion / Empire, voir .ni-* dans index.css).
 */
export type NavIconId =
  | 'listes'
  | 'armees'
  | 'suivi'
  | 'commandement'
  | 'assistant'
  | 'glossaire'
  | 'pense-bete'
  | 'imprimer';

/** Insigne Impérial (roue à 6 rayons) — repris par l'icône Armées et l'emblème du bandeau. */
function ImperialMark() {
  return (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none" />
      <path d="M12 9.6V3M14.08 10.8l5.72-3.3M14.08 13.2l5.72 3.3M12 14.4V21M9.92 13.2l-5.72 3.3M9.92 10.8L4.2 7.5" />
    </>
  );
}

/** Insigne Rebelle (oiseau stellaire, forme simplifiée). */
function RebelMark() {
  return (
    <path d="M12 21.5c-.7-2.9-1.5-5-3.1-6.8C6.7 12.5 4.6 11 3 8.4c2.7.9 4.7.9 6.3.1L12 2.8l2.7 5.7c1.6.8 3.6.8 6.3-.1-1.6 2.6-3.7 4.1-5.9 6.3-1.6 1.8-2.4 3.9-3.1 6.8z" />
  );
}

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
        // Datapad à coin coupé — ordre de bataille.
        <>
          <path d="M5 3.5h10l4 4v13H5z" />
          <path d="M15 3.5v4h4" />
          <path d="M8 11h8M8 14h8M8 17h5" />
        </>
      )}
      {id === 'armees' && (
        // Insigne de la faction du thème actif (un seul des deux est affiché, voir .ni-*).
        <>
          <g className="ni-imperial"><ImperialMark /></g>
          <g className="ni-rebel"><RebelMark /></g>
        </>
      )}
      {id === 'suivi' && (
        // Hologramme tactique : hexagone + réticule.
        <>
          <path d="M12 2.8l7.4 4.3v8.6L12 20l-7.4-4.3V7.1z" />
          <circle cx="12" cy="11.4" r="2.2" />
          <path d="M12 6.2v3M12 13.6v3M7.4 11.4h2.4M14.2 11.4h2.4" />
        </>
      )}
      {id === 'commandement' && (
        // Carte de Commandement : silhouette à coins coupés + pions PIP.
        <>
          <path d="M7 3.5h10l2 2v13l-2 2H7l-2-2v-13z" />
          <circle cx="9.6" cy="8.4" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="14.4" cy="8.4" r="1.4" fill="currentColor" stroke="none" />
          <path d="M8.5 14h7M8.5 17h4.5" />
        </>
      )}
      {id === 'assistant' && (
        // Sabre laser incliné : lame + halo, garde, poignée à anneaux, pommeau.
        <g transform="rotate(40 12 12)">
          <path d="M12 2.4v10" strokeWidth="6" opacity="0.28" />
          <path d="M12 2.4v10" strokeWidth="2.4" />
          <path d="M9.5 13h5" />
          <path d="M10.6 13.4v6.4h2.8v-6.4" />
          <path d="M10.6 15.5h2.8M10.6 17.6h2.8" />
          <path d="M11 21h2" />
        </g>
      )}
      {id === 'glossaire' && (
        // Holocron (cube en perspective) — le savoir.
        <>
          <path d="M12 2.8l7.4 4.3v9.8L12 21.2l-7.4-4.3V7.1z" />
          <path d="M4.6 7.1L12 11.4l7.4-4.3M12 11.4v9.8" />
        </>
      )}
      {id === 'pense-bete' && (
        // Datapad de mission : pince en haut + cases cochées.
        <>
          <path d="M5 4.5h14v16H5z" />
          <path d="M9 3h6v3H9z" />
          <path d="M8 11l1.4 1.4L12 9.8M8 16l1.4 1.4L12 14.8M14 11h3M14 16h3" />
        </>
      )}
      {id === 'imprimer' && (
        // Imprimante.
        <>
          <path d="M7 8V4h10v4" />
          <path d="M4 8h16v8H4z" />
          <path d="M7 14h10v7H7z" />
          <circle cx="16.5" cy="11" r="0.8" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

/** Emblème du bandeau : insigne de la faction du thème actif, avec halo (voir .faction-emblem). */
export function FactionEmblem() {
  return (
    <svg
      className="faction-emblem"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <g className="ni-imperial"><ImperialMark /></g>
      <g className="ni-rebel"><RebelMark /></g>
    </svg>
  );
}
