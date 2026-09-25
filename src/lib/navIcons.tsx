/**
 * Emblèmes de faction (Alliance Rebelle / Empire Galactique), dessinés en SVG.
 *
 * Un seul des deux est visible à la fois, selon le thème actif (voir .ni-*
 * dans index.css). `FactionCrest` est la version pleine du grand emblème de
 * la barre latérale ; les icônes de navigation elles-mêmes viennent du pack
 * d'icônes « Codex Legion » (src/lib/codexIcons.tsx).
 */

/** Insigne Impérial : disque clair, anneau sombre, moyeu et six rayons. */
function ImperialCrest() {
  return (
    <>
      <circle cx="24" cy="24" r="22" fill="currentColor" />
      <circle cx="24" cy="24" r="17.5" fill="none" stroke="var(--t-bg)" strokeWidth="2.6" />
      <circle cx="24" cy="24" r="5.4" fill="var(--t-bg)" />
      <path d="M24 18.6V6.5M28.7 21.3l10.5-6M28.7 26.7l10.5 6M24 29.4v12.1M19.3 26.7l-10.5 6M19.3 21.3l-10.5-6" stroke="var(--t-bg)" strokeWidth="4" strokeLinecap="butt" fill="none" />
    </>
  );
}

/** Insigne Rebelle : oiseau stellaire (crête, deux ailes, queue), rempli. */
function RebelCrest() {
  return (
    <g fill="currentColor">
      <path d="M24 5c2.4 3.1 3.2 6.4 2.8 10h-5.6c-.4-3.6.4-6.9 2.8-10z" />
      <path d="M20.6 19.4C16.4 18.6 9.6 16 4.8 10.4 6.2 19.6 10.6 26.6 18.2 29.8z" />
      <path d="M27.4 19.4c4.2-.8 11-3.4 15.8-9 -1.4 9.2-5.8 16.2-13.4 19.4z" />
      <path d="M19.2 31.4L24 43l4.8-11.6c-1.6.6-3.2.8-4.8.8s-3.2-.2-4.8-.8z" />
    </g>
  );
}

/** Grand emblème de la barre latérale (viewBox 48). */
export function FactionCrest() {
  return (
    <svg className="faction-crest" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <g className="ni-imperial"><ImperialCrest /></g>
      <g className="ni-rebel"><RebelCrest /></g>
    </svg>
  );
}
