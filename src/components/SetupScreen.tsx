import { ImportScreen } from './ImportScreen';
import type { ParsedList } from '../types';

interface SlotProps {
  playerLabel: string;
  list: ParsedList | null;
  onParse: (text: string) => void;
  onClear: () => void;
}

function ImportSlot({ playerLabel, list, onParse, onClear }: SlotProps) {
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
      <button type="button" className="btn btn-ghost" onClick={onClear}>Changer la liste</button>
    </div>
  );
}

interface Props {
  listP1: ParsedList | null;
  listP2: ParsedList | null;
  onParseP1: (text: string) => void;
  onParseP2: (text: string) => void;
  onClearP1: () => void;
  onClearP2: () => void;
}

export function SetupScreen({ listP1, listP2, onParseP1, onParseP2, onClearP1, onClearP2 }: Props) {
  return (
    <div className="setup-screen">
      <p className="import-note setup-intro">
        Importez la liste de chaque joueur pour débloquer les onglets Armées et Combat — l'appli est
        pensée pour suivre une partie à deux, avec les mots-clés des deux camps sous la main.
      </p>
      <div className="setup-columns">
        <ImportSlot playerLabel="Joueur 1" list={listP1} onParse={onParseP1} onClear={onClearP1} />
        <ImportSlot playerLabel="Joueur 2" list={listP2} onParse={onParseP2} onClear={onClearP2} />
      </div>
    </div>
  );
}
