import { useState } from 'react';
import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';
import { buildRoster, resolveUnitKeywords, type RosterEntry } from '../lib/combat';
import { usePersistentState } from '../lib/storage';
import { CARD_IMAGES } from '../data/cardImages';
import { normalizeName } from '../lib/normalize';
import { frenchCardName } from '../lib/cardNames';
import { detectInteractions } from '../lib/keywordInteractions';
import { CombatSequenceFullscreen } from './CombatSequenceFullscreen';

interface Props {
  listP1: ParsedList | null;
  listP2: ParsedList | null;
  tagLibrary: CardTagLibrary;
  keywords: KeywordDef[];
  onGoToGameTracker: () => void;
}

type Role = 'attaquant' | 'defenseur';

/** Combine joueur + clé d'unité : deux unités de listes différentes peuvent partager la même clé. */
function entryId(entry: RosterEntry): string {
  return `${entry.player}:${entry.unit.key}`;
}

function findEntry(roster: RosterEntry[], id: string): RosterEntry | undefined {
  return roster.find((e) => entryId(e) === id);
}

function LiveTile({
  entry, role, onTap,
}: { entry: RosterEntry; role: Role | null; onTap: () => void }) {
  const img = CARD_IMAGES[normalizeName(entry.unit.name)];
  return (
    <button
      type="button"
      className={`live-tile${role ? ` live-tile-${role}` : ''}`}
      onClick={onTap}
    >
      {role && (
        <span className={`live-tile-badge live-tile-badge-${role}`}>
          {role === 'attaquant' ? '🎯 ATQ' : '🛡 DÉF'}
        </span>
      )}
      <span className="live-tile-frame">
        {img ? (
          <img src={img} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />
        ) : (
          <span className="live-tile-placeholder" aria-hidden="true">?</span>
        )}
      </span>
      <span className="live-tile-name">{frenchCardName(entry.unit.name)}</span>
    </button>
  );
}

function LaunchThumb({ entry }: { entry: RosterEntry }) {
  const img = CARD_IMAGES[normalizeName(entry.unit.name)];
  return (
    <span className="live-launch-side">
      {img && <img src={img} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />}
      <span>{frenchCardName(entry.unit.name)}</span>
    </span>
  );
}

/**
 * Onglet Combat interactif — doublon du Combat classique, pensé pour aller
 * de pair avec le Suivi de partie et optimisé pour être posé à plat sur
 * une tablette (iPad Air) à côté du plateau. Différence clé avec le
 * Combat classique : un seul répertoire d'unités affiché une fois (pas un
 * panneau « Attaquant » et un panneau « Défenseur » listant chacun les
 * deux armées) — on touche une carte, on répond « Attaquant » ou
 * « Défenseur », c'est fait.
 */
export function CombatInteractiveScreen({ listP1, listP2, tagLibrary, keywords, onGoToGameTracker }: Props) {
  const roster = buildRoster(listP1, listP2);
  const [attackerId, setAttackerId] = usePersistentState<string>('swl.live-attacker.v1', '');
  const [defenderId, setDefenderId] = usePersistentState<string>('swl.live-defender.v1', '');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [stage, setStage] = useState<'select' | 'sequence'>('select');
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [focusIndex, setFocusIndex] = useState(0);

  const attacker = findEntry(roster, attackerId);
  const defender = findEntry(roster, defenderId);
  const pendingEntry = pendingId ? findEntry(roster, pendingId) : undefined;

  const roleFor = (id: string): Role | null => {
    if (id === attackerId) return 'attaquant';
    if (id === defenderId) return 'defenseur';
    return null;
  };

  const assignRole = (id: string, role: Role) => {
    if (role === 'attaquant') {
      setAttackerId(id);
      if (defenderId === id) setDefenderId('');
    } else {
      setDefenderId(id);
      if (attackerId === id) setAttackerId('');
    }
    setPendingId(null);
  };

  const clearRole = (id: string) => {
    if (attackerId === id) setAttackerId('');
    if (defenderId === id) setDefenderId('');
    setPendingId(null);
  };

  const launchSequence = () => {
    setChecked(new Set());
    setFocusIndex(0);
    setStage('sequence');
  };

  const p1Group = roster.filter((e) => e.player === 'p1');
  const p2Group = roster.filter((e) => e.player === 'p2');

  const attackerResolved = attacker ? resolveUnitKeywords(attacker.unit, tagLibrary, keywords) : [];
  const defenderResolved = defender ? resolveUnitKeywords(defender.unit, tagLibrary, keywords) : [];
  const interactions = attacker && defender ? detectInteractions(attackerResolved, defenderResolved) : [];

  if (stage === 'sequence' && attacker && defender) {
    return (
      <CombatSequenceFullscreen
        attacker={attacker}
        defender={defender}
        attackerResolved={attackerResolved}
        defenderResolved={defenderResolved}
        interactions={interactions}
        checked={checked}
        onToggle={(stepId) => setChecked((prev) => {
          const next = new Set(prev);
          if (next.has(stepId)) next.delete(stepId); else next.add(stepId);
          return next;
        })}
        focusIndex={focusIndex}
        setFocusIndex={setFocusIndex}
        onClose={() => setStage('select')}
      />
    );
  }

  return (
    <div className="combat-screen live-select no-print">
      <div className="combat-header-row">
        <h2>Combat interactif</h2>
        <button type="button" className="btn btn-ghost" onClick={onGoToGameTracker}>
          📋 Suivi de partie
        </button>
      </div>
      <p className="import-note">
        Touchez une unité pour indiquer si elle attaque ou défend — chaque carte n'apparaît qu'une
        fois, plus besoin de la retrouver dans deux listes séparées.
      </p>

      <div className="live-roster">
        {p1Group.length > 0 && (
          <div className="live-roster-group">
            <span className="live-roster-group-label">{p1Group[0].playerLabel}</span>
            <div className="live-roster-grid">
              {p1Group.map((e) => (
                <LiveTile key={entryId(e)} entry={e} role={roleFor(entryId(e))} onTap={() => setPendingId(entryId(e))} />
              ))}
            </div>
          </div>
        )}
        {p2Group.length > 0 && (
          <div className="live-roster-group">
            <span className="live-roster-group-label">{p2Group[0].playerLabel}</span>
            <div className="live-roster-grid">
              {p2Group.map((e) => (
                <LiveTile key={entryId(e)} entry={e} role={roleFor(entryId(e))} onTap={() => setPendingId(entryId(e))} />
              ))}
            </div>
          </div>
        )}
      </div>

      {pendingEntry && (
        <div className="live-modal-backdrop" onClick={() => setPendingId(null)}>
          <div className="live-modal" onClick={(e) => e.stopPropagation()}>
            <div className="live-modal-preview">
              {CARD_IMAGES[normalizeName(pendingEntry.unit.name)] && (
                <img src={CARD_IMAGES[normalizeName(pendingEntry.unit.name)]} alt="" />
              )}
              <strong>{frenchCardName(pendingEntry.unit.name)}</strong>
            </div>
            <p className="live-modal-question">Cette unité est…</p>
            <div className="live-modal-actions">
              <button type="button" className="btn live-modal-role live-modal-role-attack" onClick={() => assignRole(pendingId!, 'attaquant')}>
                🎯 Attaquant
              </button>
              <button type="button" className="btn live-modal-role live-modal-role-defense" onClick={() => assignRole(pendingId!, 'defenseur')}>
                🛡 Défenseur
              </button>
            </div>
            {roleFor(pendingId!) && (
              <button type="button" className="btn btn-ghost btn-danger" onClick={() => clearRole(pendingId!)}>
                ✕ Retirer ce rôle
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setPendingId(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {attacker && defender ? (
        <div className="live-launch-bar">
          <LaunchThumb entry={attacker} />
          <span className="live-launch-vs">VS</span>
          <LaunchThumb entry={defender} />
          <button type="button" className="btn btn-primary btn-large" onClick={launchSequence}>
            ▶ Lancer la séquence
          </button>
        </div>
      ) : (
        <p className="empty-hint live-launch-hint">
          {!attacker && !defender
            ? "Choisissez un attaquant et un défenseur pour commencer."
            : !attacker
              ? 'Il manque encore un attaquant.'
              : 'Il manque encore un défenseur.'}
        </p>
      )}
    </div>
  );
}
