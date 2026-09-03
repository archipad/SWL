import { useState } from 'react';
import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';
import { buildRoster, resolveUnitKeywords, type RosterEntry } from '../lib/combat';
import { usePersistentState } from '../lib/storage';
import { cardImageFor } from '../data/cardImages';
import { frenchCardName, isCombatTeamVariant } from '../lib/cardNames';
import { factionColor } from '../lib/factionColor';
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

/**
 * Sous-titre texte identifiant précisément une unité au-delà de son nom
 * (souvent partagé par plusieurs cartes de la liste, ex. deux « Commandos
 * Rebelles ») : étiquette Groupe de Combat le cas échéant, puis la liste
 * des améliorations équipées — de quoi choisir la bonne carte sans avoir
 * à deviner. Rien à afficher pour une unité de base sans amélioration.
 */
function UnitSubtitle({ unit }: { unit: RosterEntry['unit'] }) {
  const isTeam = isCombatTeamVariant(unit.name);
  const upgradeNames = unit.upgrades.map((u) => frenchCardName(u.name));
  if (!isTeam && upgradeNames.length === 0) return null;
  return (
    <span className="live-tile-subtitle">
      {isTeam && <span className="live-tile-team-badge">Groupe de Combat</span>}
      {upgradeNames.length > 0 && upgradeNames.join(', ')}
    </span>
  );
}

function LiveTile({
  entry, role, onTap,
}: { entry: RosterEntry; role: Role | null; onTap: () => void }) {
  const img = cardImageFor(entry.unit.name);
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
      <UnitSubtitle unit={entry.unit} />
    </button>
  );
}

/**
 * Emplacement du duel (colonne de droite) : visuel de carte agrandi pour
 * être lisible de loin, attaquant au-dessus / défenseur en dessous comme
 * demandé. Vide tant que le rôle correspondant n'a pas été assigné.
 */
function PreviewSlot({ role, entry }: { role: Role; entry: RosterEntry | undefined }) {
  const img = entry ? cardImageFor(entry.unit.name) : undefined;
  return (
    <div className={`live-preview-slot live-preview-slot-${role}`}>
      <span className="live-preview-role">{role === 'attaquant' ? '🎯 Attaquant' : '🛡 Défenseur'}</span>
      {entry ? (
        <>
          <span className="live-preview-frame">
            {img ? (
              <img src={img} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />
            ) : (
              <span className="live-tile-placeholder" aria-hidden="true">?</span>
            )}
          </span>
          <span className="live-preview-name">{frenchCardName(entry.unit.name)}</span>
          <UnitSubtitle unit={entry.unit} />
        </>
      ) : (
        <p className="empty-hint live-preview-empty">Touchez une carte à gauche.</p>
      )}
    </div>
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

  /** Fin de séquence (dernière étape) : repart d'une sélection vierge pour le combat suivant. */
  const startNewCombat = () => {
    setAttackerId('');
    setDefenderId('');
    setStage('select');
  };

  /** Riposte / tir croisé : échange les rôles sans quitter la séquence, on reprend à l'étape 1 avec les nouveaux rôles. */
  const swapSides = () => {
    setAttackerId(defenderId);
    setDefenderId(attackerId);
    setChecked(new Set());
  };

  const p1Group = roster.filter((e) => e.player === 'p1');
  const p2Group = roster.filter((e) => e.player === 'p2');

  const attackerResolved = attacker ? resolveUnitKeywords(attacker.unit, tagLibrary, keywords) : [];
  const defenderResolved = defender ? resolveUnitKeywords(defender.unit, tagLibrary, keywords) : [];

  if (stage === 'sequence' && attacker && defender) {
    return (
      <CombatSequenceFullscreen
        attacker={attacker}
        defender={defender}
        attackerResolved={attackerResolved}
        defenderResolved={defenderResolved}
        checked={checked}
        onToggle={(stepId) => setChecked((prev) => {
          const next = new Set(prev);
          if (next.has(stepId)) next.delete(stepId); else next.add(stepId);
          return next;
        })}
        focusIndex={focusIndex}
        setFocusIndex={setFocusIndex}
        onClose={() => setStage('select')}
        onFinish={startNewCombat}
        onSwapSides={swapSides}
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

      <div className="live-layout">
        <div className="live-roster">
          {p1Group.length > 0 && (
            <div className="live-roster-group">
              <span className="live-roster-group-label" style={{ color: factionColor(listP1) }}>{p1Group[0].playerLabel}</span>
              <div className="live-roster-grid">
                {p1Group.map((e) => (
                  <LiveTile key={entryId(e)} entry={e} role={roleFor(entryId(e))} onTap={() => setPendingId(entryId(e))} />
                ))}
              </div>
            </div>
          )}
          {p2Group.length > 0 && (
            <div className="live-roster-group">
              <span className="live-roster-group-label" style={{ color: factionColor(listP2) }}>{p2Group[0].playerLabel}</span>
              <div className="live-roster-grid">
                {p2Group.map((e) => (
                  <LiveTile key={entryId(e)} entry={e} role={roleFor(entryId(e))} onTap={() => setPendingId(entryId(e))} />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="live-preview-col">
          <span className="live-preview-heading">Duel</span>
          <PreviewSlot role="attaquant" entry={attacker} />
          <span className="live-preview-vs">VS</span>
          <PreviewSlot role="defenseur" entry={defender} />
          <button
            type="button"
            className="btn btn-primary btn-large live-preview-launch"
            onClick={launchSequence}
            disabled={!attacker || !defender}
          >
            ▶ Lancer la séquence
          </button>
        </aside>
      </div>

      {pendingEntry && (
        <div className="live-modal-backdrop" onClick={() => setPendingId(null)}>
          <div className="live-modal" onClick={(e) => e.stopPropagation()}>
            <div className="live-modal-preview">
              {cardImageFor(pendingEntry.unit.name) && (
                <img src={cardImageFor(pendingEntry.unit.name)} alt="" />
              )}
              <strong>{frenchCardName(pendingEntry.unit.name)}</strong>
              <UnitSubtitle unit={pendingEntry.unit} />
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

    </div>
  );
}
