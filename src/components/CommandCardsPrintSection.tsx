import { cardImageFor } from '../data/cardImages';
import { frenchCardName } from '../lib/cardNames';
import { commandCardForName } from '../lib/commandDeck';
import type { ParsedList } from '../types';

interface Props {
  list: ParsedList;
  label: string;
}

/**
 * Cartes de Commandement (et contingences) de la liste importée, à la suite
 * des fiches imprimées depuis la page Listes : même case au format réel
 * qu'« Imprimer des cartes » (62×88 mm, repère de coupe en pointillé), sur
 * une nouvelle page pour qu'on puisse les découper et les glisser dans les
 * protège-cartes. Le visuel vient du paquet du site (commandCards.ts : carte
 * officielle ou fiche FR communautaire), sinon de cardImages ; une carte
 * sans visuel est nommée, jamais remplacée par une case vide.
 */
export function CommandCardsPrintSection({ list, label }: Props) {
  const names = [...new Set([...(list.commandCards ?? []), ...(list.contingencies ?? [])])];
  if (names.length === 0) return null;
  const cards = names.map((name) => {
    const card = commandCardForName(name);
    return { name, title: card?.name ?? frenchCardName(name), src: card?.image ?? cardImageFor(name) };
  });
  const missing = cards.filter((c) => !c.src);
  return (
    <div className="command-cards-print">
      <h2 className="print-title">Cartes de Commandement — {label}</h2>
      <div className="print-cards-grid">
        {cards.filter((c) => c.src).map((c) => (
          <div key={c.name} className="print-card-box">
            <img src={c.src} alt={c.title} />
          </div>
        ))}
      </div>
      {missing.length > 0 && (
        <p className="command-cards-print-missing">Visuel indisponible : {missing.map((c) => c.title).join(', ')}.</p>
      )}
    </div>
  );
}
