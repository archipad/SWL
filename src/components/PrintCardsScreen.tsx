import { useEffect, useMemo, useState } from 'react';
import { CARD_IMAGES } from '../data/cardImages';
import { frenchCardName } from '../lib/cardNames';
import { usePersistentState } from '../lib/storage';

/**
 * Format réel d'une carte Legion, imposé en dur dans index.css
 * (.print-card-box / .print-card-box-landscape) plutôt que défini ici :
 * mesuré directement sur les grilles d'impression 3×3 des PDF fournis par
 * l'utilisateur (repères de coupe repérés à 600 dpi, mêmes coordonnées pour
 * les cartes Amélioration et Unité, ces dernières étant simplement
 * dessinées à 90°) : 62 × 88 mm, portrait pour une amélioration, paysage
 * pour une unité. Cette valeur correspond aussi au format commercial des
 * protège-cartes compatibles Star Wars: Legion — confirmation indépendante
 * que la mesure est la bonne. Ne pas modifier sans re-mesurer sur un PDF
 * source : c'est ce qui garantit qu'une carte imprimée ici a la même
 * taille qu'une vraie carte (glissable dans le même protège-carte,
 * mélangeable au jeu).
 */
type Orientation = 'portrait' | 'landscape';

interface CardEntry {
  key: string;
  name: string;
  src: string;
}

/** Toutes les cartes pour lesquelles un visuel est connu, triées par nom français. */
function useAllCards(): CardEntry[] {
  return useMemo(() => {
    const entries = Object.entries(CARD_IMAGES).map(([key, src]) => ({
      key, src, name: frenchCardName(key),
    }));
    entries.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    return entries;
  }, []);
}

function QuantityStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="qty-stepper no-print">
      <button type="button" className="btn btn-ghost qty-btn" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0}>−</button>
      <input
        type="number"
        min={0}
        max={99}
        value={value}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) ? Math.max(0, Math.min(99, n)) : 0);
        }}
      />
      <button type="button" className="btn btn-ghost qty-btn" onClick={() => onChange(Math.min(99, value + 1))}>+</button>
    </div>
  );
}

/**
 * Sélecteur de cartes à imprimer au format réel (une carte physique
 * manquante à remplacer, ou un doublon à ajouter) — indépendant des listes
 * importées : puise directement dans toutes les cartes dont un visuel est
 * connu (CARD_IMAGES), avec une quantité par carte pour permettre plusieurs
 * exemplaires de la même carte en une seule impression.
 *
 * L'orientation (portrait ~62×88mm pour une amélioration, paysage ~88×62mm
 * pour une unité) n'est pas devinée depuis un nom de carte : elle est lue
 * directement sur l'image une fois chargée (naturalWidth/naturalHeight),
 * via la vignette déjà affichée dans la liste de sélection — fiable même
 * si de nouvelles cartes sont ajoutées plus tard sans mettre à jour une
 * table de classification séparée.
 */
export function PrintCardsScreen() {
  const cards = useAllCards();
  const [quantities, setQuantities] = usePersistentState<Record<string, number>>('swl.print-cards-qty.v1', {});
  const [orientations, setOrientations] = useState<Record<string, Orientation>>({});
  const [filter, setFilter] = useState('');
  const [printing, setPrinting] = useState(false);

  const setQty = (key: string, qty: number) => {
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[key]; else next[key] = qty;
      return next;
    });
  };

  const filtered = filter.trim()
    ? cards.filter((c) => c.name.toLowerCase().includes(filter.trim().toLowerCase()))
    : cards;

  const selected = cards.filter((c) => (quantities[c.key] ?? 0) > 0);
  const totalCount = selected.reduce((sum, c) => sum + (quantities[c.key] ?? 0), 0);

  const byOrientation = (o: Orientation) => selected.filter((c) => (orientations[c.key] ?? 'portrait') === o);

  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    const waitForImages = async () => {
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.print-cards-section img'));
      await Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      }))));
      if (!cancelled) window.print();
    };
    waitForImages();
    const reset = () => setPrinting(false);
    window.addEventListener('afterprint', reset, { once: true });
    return () => { cancelled = true; window.removeEventListener('afterprint', reset); };
  }, [printing]);

  return (
    <div className="print-cards-screen">
      <div className="no-print">
        <h2>Imprimer des cartes</h2>
        <p className="import-note">
          Sélectionnez les cartes qu'il vous manque (visuel officiel, même format que les vraies
          cartes — glissables dans les mêmes protège-cartes) et la quantité de chacune, puis
          imprimez. Utile pour remplacer une carte perdue ou abîmée, ou en avoir un second
          exemplaire.
        </p>
        <input
          className="print-cards-filter"
          placeholder="Filtrer par nom…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <ul className="print-cards-list">
          {filtered.map((c) => (
            <li key={c.key} className={`print-cards-row${(quantities[c.key] ?? 0) > 0 ? ' print-cards-row-selected' : ''}`}>
              <img
                className="print-cards-thumb"
                src={c.src}
                alt={c.name}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  const o: Orientation = img.naturalWidth > img.naturalHeight ? 'landscape' : 'portrait';
                  setOrientations((prev) => (prev[c.key] === o ? prev : { ...prev, [c.key]: o }));
                }}
                onError={(e) => { e.currentTarget.hidden = true; }}
              />
              <span className="print-cards-name">{c.name}</span>
              <QuantityStepper value={quantities[c.key] ?? 0} onChange={(v) => setQty(c.key, v)} />
            </li>
          ))}
          {filtered.length === 0 && <li className="empty-hint">Aucune carte ne correspond à ce filtre.</li>}
        </ul>
      </div>

      <div className="print-cards-bar no-print">
        <span>
          {totalCount === 0
            ? 'Aucune carte sélectionnée'
            : `${totalCount} carte${totalCount > 1 ? 's' : ''} sélectionnée${totalCount > 1 ? 's' : ''} (${selected.length} modèle${selected.length > 1 ? 's' : ''})`}
        </span>
        <button type="button" className="btn btn-primary" disabled={totalCount === 0} onClick={() => setPrinting(true)}>
          🖶 Imprimer
        </button>
      </div>

      {printing && (
        <section className="print-cards-section print-only">
          {/* Repères de coupe en pointillés sur chaque carte plutôt qu'un
              contour plein : une fois découpée au ciseau le long du repère,
              la carte ne garde aucune bordure imprimée résiduelle sur les
              bords. Paysage (cartes Unité) et portrait (Amélioration)
              regroupées séparément pour que chaque rangée de la grille
              reste uniforme (voir commentaire CARD_WIDTH_MM plus haut). */}
          {byOrientation('landscape').length > 0 && (
            <div className="print-cards-grid">
              {byOrientation('landscape').flatMap((c) =>
                Array.from({ length: quantities[c.key] ?? 0 }, (_, i) => (
                  <div key={`${c.key}-${i}`} className="print-card-box print-card-box-landscape">
                    <img src={c.src} alt={c.name} />
                  </div>
                )),
              )}
            </div>
          )}
          {byOrientation('portrait').length > 0 && (
            <div className="print-cards-grid">
              {byOrientation('portrait').flatMap((c) =>
                Array.from({ length: quantities[c.key] ?? 0 }, (_, i) => (
                  <div key={`${c.key}-${i}`} className="print-card-box">
                    <img src={c.src} alt={c.name} />
                  </div>
                )),
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
