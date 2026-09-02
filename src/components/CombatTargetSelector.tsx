import type { RosterEntry } from '../lib/combat';
import { CARD_IMAGES } from '../data/cardImages';
import { normalizeName } from '../lib/normalize';
import { frenchCardName } from '../lib/cardNames';

interface TileProps {
  entry: RosterEntry;
  selected: boolean;
  onSelect: () => void;
}

/** Combine joueur + clé d'unité, comme dans CombatScreen (identifiant de sélection). */
function entryId(entry: RosterEntry): string {
  return `${entry.player}:${entry.unit.key}`;
}

function TargetTile({ entry, selected, onSelect }: TileProps) {
  const img = CARD_IMAGES[normalizeName(entry.unit.name)];
  return (
    <button
      type="button"
      className={`target-tile${selected ? ' target-tile-selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="target-tile-frame">
        {img ? (
          <img src={img} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />
        ) : (
          <span className="target-tile-placeholder" aria-hidden="true">?</span>
        )}
      </span>
      <span className="target-tile-name">{frenchCardName(entry.unit.name)}</span>
    </button>
  );
}

function TargetGroup({
  label, entries, selectedId, onSelect,
}: { label: string; entries: RosterEntry[]; selectedId: string; onSelect: (id: string) => void }) {
  if (entries.length === 0) return null;
  return (
    <div className="target-group">
      <span className="target-group-label">{label}</span>
      <div className="target-strip">
        {entries.map((e) => (
          <TargetTile key={entryId(e)} entry={e} selected={entryId(e) === selectedId} onSelect={() => onSelect(entryId(e))} />
        ))}
      </div>
    </div>
  );
}

interface Props {
  rosterP1: RosterEntry[];
  rosterP2: RosterEntry[];
  p1Label: string;
  p2Label: string;
  attackerId: string;
  defenderId: string;
  onSelectAttacker: (id: string) => void;
  onSelectDefender: (id: string) => void;
  onSwap: () => void;
}

/**
 * Sélection visuelle de l'attaquant et du défenseur — remplace les deux
 * menus déroulants par des vignettes illustrées (comme demandé : « une
 * première page pour sélectionner l'attaquant et le défenseur, avec le
 * visuel »). Un clic direct sur la carte plutôt qu'un menu déroulant à
 * ouvrir puis parcourir.
 */
export function CombatTargetSelector({
  rosterP1, rosterP2, p1Label, p2Label, attackerId, defenderId, onSelectAttacker, onSelectDefender, onSwap,
}: Props) {
  return (
    <div className="target-selector">
      <div className="target-selector-side target-selector-attack">
        <h3 className="target-selector-heading">🎯 Attaquant</h3>
        <TargetGroup label={p1Label} entries={rosterP1} selectedId={attackerId} onSelect={onSelectAttacker} />
        <TargetGroup label={p2Label} entries={rosterP2} selectedId={attackerId} onSelect={onSelectAttacker} />
      </div>
      <button
        type="button"
        className="target-selector-swap"
        onClick={onSwap}
        disabled={!attackerId && !defenderId}
        aria-label="Inverser attaquant et défenseur"
        title="Inverser attaquant et défenseur"
      >
        ⇄
      </button>
      <div className="target-selector-side target-selector-defense">
        <h3 className="target-selector-heading">🛡 Défenseur</h3>
        <TargetGroup label={p1Label} entries={rosterP1} selectedId={defenderId} onSelect={onSelectDefender} />
        <TargetGroup label={p2Label} entries={rosterP2} selectedId={defenderId} onSelect={onSelectDefender} />
      </div>
    </div>
  );
}
