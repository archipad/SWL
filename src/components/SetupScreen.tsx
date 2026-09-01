import { useEffect, useState } from 'react';
import { ImportScreen } from './ImportScreen';
import { SyncSettings } from './SyncSettings';
import { UnitCardsSection } from './UnitCardsSection';
import { MinimalKeywordsSection } from './MinimalKeywordsSection';
import { DiceIcon } from '../lib/diceIcons';
import type { useSync } from '../lib/useSync';
import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';

interface SlotProps {
  playerLabel: string;
  list: ParsedList | null;
  onParse: (text: string) => void;
  onClear: () => void;
  onPrint: () => void;
  onPrintMinimal: () => void;
}

function ImportSlot({ playerLabel, list, onParse, onClear, onPrint, onPrintMinimal }: SlotProps) {
  if (!list) {
    return <ImportScreen playerLabel={playerLabel} onParse={onParse} />;
  }

  return (
    <div className="setup-slot-filled">
      <h2>{playerLabel}</h2>
      <p className="setup-slot-summary">
        <strong>{list.listName ?? list.faction ?? 'Liste importée'}</strong>
        {list.faction && list.listName ? ` — ${list.faction}` : ''}
        {list.totalPoints !== undefined ? ` · ${list.totalPoints} pts` : ''}
        {' · '}
        {list.units.length} unité{list.units.length > 1 ? 's' : ''}
      </p>
      <div className="setup-slot-actions">
        <button type="button" className="btn btn-ghost" onClick={onPrint}>
          🖶 Imprimer les fiches d'unité
        </button>
        <button type="button" className="btn btn-ghost" onClick={onPrintMinimal}>
          🖶 Imprimer mots-clés (mode rapide)
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-danger"
          onClick={() => {
            if (window.confirm(`Supprimer la liste « ${list.listName ?? list.faction ?? playerLabel} » ? Vous pourrez en importer une nouvelle juste après.`)) {
              onClear();
            }
          }}
        >
          🗑 Supprimer la liste
        </button>
      </div>
    </div>
  );
}

interface Props {
  listP1: ParsedList | null;
  listP2: ParsedList | null;
  tagLibrary: CardTagLibrary;
  keywords: KeywordDef[];
  onParseP1: (text: string) => void;
  onParseP2: (text: string) => void;
  onClearP1: () => void;
  onClearP2: () => void;
  sync: ReturnType<typeof useSync>;
}

type PrintMode = 'cards' | 'minimal';
type PrintTarget = { player: 'p1' | 'p2'; mode: PrintMode } | null;

export function SetupScreen({ listP1, listP2, tagLibrary, keywords, onParseP1, onParseP2, onClearP1, onClearP2, sync }: Props) {
  // Fiches imprimables depuis cette page, une armée à la fois, sous deux
  // formats — distinct du bouton « Imprimer le glossaire » de l'écran
  // Armées, qui reste purement textuel :
  //  - « cards » : visuel de carte + mots-clés (UnitCardsSection), pensé
  //    pour être posé à côté de la table à la place de la carte physique ;
  //  - « minimal » : mots-clés seuls, sans visuel (MinimalKeywordsSection),
  //    pensé pour trier les cartes physiques avant une partie et servir
  //    d'aide-mémoire rapide pendant la partie.
  // On imprime la liste choisie dès que l'état est posé : le contenu
  // (classe print-only, cf. index.css) reste invisible à l'écran quoi qu'il
  // arrive, donc pas de risque de flash.
  const [printTarget, setPrintTarget] = useState<PrintTarget>(null);

  useEffect(() => {
    if (!printTarget) return;
    let cancelled = false;
    // Attendre que les visuels de carte (mode « cards » uniquement — le mode
    // minimaliste n'en contient aucun, la liste est alors vide) aient fini
    // de charger avant d'ouvrir la boîte d'impression — sans ça, une image
    // pas encore récupérée sur le réseau imprimerait comme une case vide.
    const waitForImages = async () => {
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.print-only img'));
      await Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      }))));
      if (!cancelled) window.print();
    };
    waitForImages();
    const reset = () => setPrintTarget(null);
    window.addEventListener('afterprint', reset, { once: true });
    return () => { cancelled = true; window.removeEventListener('afterprint', reset); };
  }, [printTarget]);

  const printList = printTarget?.player === 'p1' ? listP1 : printTarget?.player === 'p2' ? listP2 : null;
  const printLabel = printTarget?.player === 'p1'
    ? (listP1?.listName ?? listP1?.faction ?? 'Joueur 1')
    : (listP2?.listName ?? listP2?.faction ?? 'Joueur 2');

  return (
    <div className="setup-screen">
      <div className="no-print">
        <p className="import-note setup-intro">
          Importez la liste de chaque joueur pour débloquer les onglets Armées et Combat — l'appli est
          pensée pour suivre une partie à deux, avec les mots-clés des deux camps sous la main.
        </p>
        <div className="setup-columns">
          <ImportSlot
            playerLabel="Joueur 1"
            list={listP1}
            onParse={onParseP1}
            onClear={onClearP1}
            onPrint={() => setPrintTarget({ player: 'p1', mode: 'cards' })}
            onPrintMinimal={() => setPrintTarget({ player: 'p1', mode: 'minimal' })}
          />
          <ImportSlot
            playerLabel="Joueur 2"
            list={listP2}
            onParse={onParseP2}
            onClear={onClearP2}
            onPrint={() => setPrintTarget({ player: 'p2', mode: 'cards' })}
            onPrintMinimal={() => setPrintTarget({ player: 'p2', mode: 'minimal' })}
          />
        </div>
        <SyncSettings
          token={sync.token}
          status={sync.status}
          error={sync.error}
          lastSyncAt={sync.lastSyncAt}
          onSaveToken={sync.saveToken}
          onRemoveToken={sync.removeToken}
          onSyncNow={sync.pull}
        />
      </div>

      {printList && printTarget?.mode === 'cards' && (
        <section className="unit-cards-section print-only">
          <h2 className="print-title">
            Fiches d'unité — {printLabel}
            {printList.totalPoints !== undefined ? ` (${printList.totalPoints} pts)` : ''}
          </h2>
          <p className="icon-legend">
            <DiceIcon type="bloc" /> Bloc · <DiceIcon type="critique" /> Critique ·{' '}
            <DiceIcon type="touche" /> Touche · <DiceIcon type="adr-atq" /> Adrénaline (attaque) ·{' '}
            <DiceIcon type="adr-def" /> Adrénaline (défense) · <strong>①②③</strong> portée/distance
          </p>
          <UnitCardsSection list={printList} tagLibrary={tagLibrary} keywords={keywords} />
        </section>
      )}

      {printList && printTarget?.mode === 'minimal' && (
        <section className="minimal-keywords-section print-only">
          <h2 className="print-title">
            Mots-clés — {printLabel}
            {printList.totalPoints !== undefined ? ` (${printList.totalPoints} pts)` : ''}
          </h2>
          <p className="icon-legend">
            <DiceIcon type="bloc" /> Bloc · <DiceIcon type="critique" /> Critique ·{' '}
            <DiceIcon type="touche" /> Touche · <DiceIcon type="adr-atq" /> Adrénaline (attaque) ·{' '}
            <DiceIcon type="adr-def" /> Adrénaline (défense) · <strong>①②③</strong> portée/distance
          </p>
          <MinimalKeywordsSection list={printList} tagLibrary={tagLibrary} keywords={keywords} />
        </section>
      )}
    </div>
  );
}
