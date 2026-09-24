import { useEffect, useState } from 'react';
import { ADVANTAGE_CARDS, OBJECTIVE_CARDS, SECONDARY_OBJECTIVE_CARDS } from '../data/battleCards';
import { frenchCardName } from '../lib/cardNames';
import { getUnitMoraleProfile } from '../lib/unitModels';
import { DEFAULT_STATE, type useGameTracker } from '../lib/useGameTracker';
import { useGameArchive, type ArchivedGame } from '../lib/useGameArchive';
import type { SyncStatus } from '../lib/useSync';
import type { ParsedList } from '../types';
import { writeGameEpoch } from '../lib/gistSync';
import { clearGameActions, deviceLabel, readGameActions, recordGameAction, removeGameAction, type GameActionEntry } from '../lib/gameActionHistory';

interface Props {
  listP1: ParsedList | null;
  listP2: ParsedList | null;
  tracker: ReturnType<typeof useGameTracker>;
  onSync: (state: ReturnType<typeof useGameTracker>['state']) => void;
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
  onOpenCommandCards: () => void;
}

const ROUNDS = [1, 2, 3, 4, 5];
const UNIT_STATE_KEY = 'swl.assistant.unit-state.v1';
type UnitState = { suppression?: number; ion?: number; immobilize?: number; poison?: number; shield?: number; outOfAction?: boolean };
type UnitStates = Record<string, UnitState>;
type AttackHistoryEntry = { id: string; at: string; attacker: string; defender: string; weapons?: string[]; wounds: number; blocks?: number };

function readUnitStates(): UnitStates {
  try { return JSON.parse(localStorage.getItem(UNIT_STATE_KEY) || '{}') as UnitStates; }
  catch { return {}; }
}

function readAttackHistory(): AttackHistoryEntry[] {
  try { return JSON.parse(localStorage.getItem('swl.assistant.attack-history.v1') || '[]') as AttackHistoryEntry[]; }
  catch { return []; }
}

function playerLabel(list: ParsedList | null, fallback: string): string {
  return list?.listName ?? list?.faction ?? fallback;
}

const unitIdFor = (player: 'p1' | 'p2', unit: ParsedList['units'][number], index: number) => `${player}:${unit.key || index}`;

function gameWinner(game: ArchivedGame): string {
  const bleuLabel = game.p1Color === 'bleu' ? game.p1Label : game.p2Label;
  const rougeLabel = game.p1Color === 'bleu' ? game.p2Label : game.p1Label;
  if (game.vpBleu === game.vpRouge) return 'Égalité';
  return game.vpBleu > game.vpRouge ? `🔵 ${bleuLabel}` : `🔴 ${rougeLabel}`;
}

export function GameTrackerScreen({ listP1, listP2, tracker, onSync, syncStatus, lastSyncAt, onOpenCommandCards }: Props) {
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  const [unitStates, setUnitStates] = useState<UnitStates>(readUnitStates);
  const [attackHistory, setAttackHistory] = useState<AttackHistoryEntry[]>(readAttackHistory);
  const [actionHistory, setActionHistory] = useState<GameActionEntry[]>(readGameActions);
  const { state, patch } = tracker;
  const update = (changes: Partial<typeof state>, label = 'Mise à jour du suivi') => {
    const next = { ...state, ...changes };
    if (JSON.stringify(next) === JSON.stringify(state)) return;
    setActionHistory(recordGameAction(label, state));
    patch(changes);
    onSync(next);
  };
  const undoLastAction = () => {
    const latest = actionHistory.find((entry) => !entry.undoneAt);
    if (!latest) return;
    tracker.replace(latest.before);
    onSync(latest.before);
    setActionHistory(removeGameAction(latest.id));
  };
  const activatedUnitIds = state.activatedUnitIds ?? [];
  const roundHistory = state.roundHistory ?? [];
  const toggleActivation = (unitId: string) => update({ activatedUnitIds: activatedUnitIds.includes(unitId) ? activatedUnitIds.filter((id) => id !== unitId) : [...activatedUnitIds, unitId] }, activatedUnitIds.includes(unitId) ? 'Activation annulée' : 'Unité marquée comme jouée');
  const changeRound = (round: number) => update({ round, activatedUnitIds: round === state.round ? activatedUnitIds : [] }, `Passage au round ${round}`);
  const nextRound = () => {
    if (state.round >= ROUNDS.at(-1)!) return;
    update({
      round: state.round + 1,
      activatedUnitIds: [],
      roundHistory: [...roundHistory.filter((entry) => entry.round !== state.round), { round: state.round, activatedUnitIds, vpBleu: state.vpBleu, vpRouge: state.vpRouge, completedAt: new Date().toISOString() }],
    }, `Fin du round ${state.round}`);
  };
  const p1Label = playerLabel(listP1, 'Joueur 1');
  const p2Label = playerLabel(listP2, 'Joueur 2');
  const bleuLabel = state.p1Color === 'bleu' ? p1Label : p2Label;
  const rougeLabel = state.p1Color === 'bleu' ? p2Label : p1Label;

  const archiveHook = useGameArchive();
  // Rien à archiver pour une partie qui n'a pas commencé (évite de polluer
  // l'historique si le bouton est cliqué par erreur juste après l'import).
  const hasProgress = state.round > 1 || state.vpBleu > 0 || state.vpRouge > 0 || Object.keys(unitStates).length > 0 || attackHistory.length > 0;
  const archiveCurrentGame = () => archiveHook.archive({
    p1Label, p2Label, p1Color: state.p1Color,
    vpBleu: state.vpBleu, vpRouge: state.vpRouge,
    finalRound: state.round,
    objectiveId: state.objectiveId, secondaryId: state.secondaryId,
    snapshot: { gameTracker: state, unitStates, attackHistory },
  });
  const applySnapshot = (snapshot: ArchivedGame['snapshot']) => {
    localStorage.setItem(UNIT_STATE_KEY, JSON.stringify(snapshot.unitStates));
    localStorage.setItem('swl.assistant.unit-state-clock.v1', '{}');
    localStorage.removeItem('swl.kw-undo.v1');
    writeGameEpoch(Date.now());
    localStorage.setItem('swl.assistant.attack-history.v1', JSON.stringify(snapshot.attackHistory));
    setUnitStates(snapshot.unitStates as UnitStates);
    setAttackHistory(snapshot.attackHistory as AttackHistoryEntry[]);
    update(snapshot.gameTracker);
    onSync(snapshot.gameTracker);
  };
  const startNewGame = () => {
    if (!window.confirm('Démarrer une nouvelle partie ? Ça efface les blessures, suppressions et pions de toutes les unités, remet le round à 1 et réinitialise le suivi (points de victoire, objectifs, avantage, historique). Les listes importées restent en place — la partie en cours est archivée avant, pour pouvoir la restaurer en cas d’erreur.')) return;
    if (hasProgress) archiveCurrentGame();
    localStorage.setItem(UNIT_STATE_KEY, '{}');
    localStorage.setItem('swl.assistant.unit-state-clock.v1', '{}');
    localStorage.removeItem('swl.kw-undo.v1');
    localStorage.setItem('swl.assistant.attack-history.v1', '[]');
    // Nouveau numéro de partie : les autres appareils et l'Assistant abandonnent l'ancienne partie au lieu de la re-synchroniser.
    writeGameEpoch(Date.now());
    setUnitStates({});
    setAttackHistory([]);
    clearGameActions();
    setActionHistory([]);
    tracker.replace(DEFAULT_STATE);
    onSync(DEFAULT_STATE);
  };
  const restoreGame = (game: ArchivedGame) => {
    const label = new Date(game.archivedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    if (!window.confirm(`Restaurer la partie du ${label} (${game.p1Label} vs ${game.p2Label}) ? L’état actuel sera remplacé — il est archivé avant, au cas où.`)) return;
    if (hasProgress) archiveCurrentGame();
    applySnapshot(game.snapshot);
  };

  const objective = OBJECTIVE_CARDS.find((o) => o.id === state.objectiveId) ?? null;
  const secondary = SECONDARY_OBJECTIVE_CARDS.find((o) => o.id === state.secondaryId) ?? null;
  const advantageBleu = ADVANTAGE_CARDS.find((a) => a.id === state.advantageBleuId) ?? null;
  const advantageRouge = ADVANTAGE_CARDS.find((a) => a.id === state.advantageRougeId) ?? null;

  useEffect(() => {
    const refresh = () => { setUnitStates(readUnitStates()); setAttackHistory(readAttackHistory()); setActionHistory(readGameActions()); };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); };
  }, [lastSyncAt]);

  const unitSnapshot = (unit: ParsedList['units'][number], player: 'p1' | 'p2', index: number) => {
    const state = unitStates[unitIdFor(player, unit, index)] ?? unitStates[`${player}:${index}`] ?? {};
    const moraleProfile = getUnitMoraleProfile(unit);
    const suppression = moraleProfile.suppressionImmune ? 0 : Math.max(0, state.suppression ?? 0);
    const courage = moraleProfile.courage;
    return {
      state,
      moraleProfile,
      suppression,
      panicked: courage !== null && suppression >= courage * 2,
      suppressed: courage !== null && suppression >= courage,
      outOfAction: !!state.outOfAction,
    };
  };

  const armySummary = (list: ParsedList | null, player: 'p1' | 'p2') => {
    const units = list?.units ?? [];
    return {
      units: units.length,
      suppression: units.reduce((sum, unit, index) => sum + unitSnapshot(unit, player, index).suppression, 0),
      remainingActivations: units.filter((unit, index) => !activatedUnitIds.includes(unitIdFor(player, unit, index)) && !unitSnapshot(unit, player, index).outOfAction).length,
    };
  };
  const p1Summary = armySummary(listP1, 'p1');
  const p2Summary = armySummary(listP2, 'p2');
  const syncLabel = syncStatus === 'syncing' ? 'Synchronisation…' : syncStatus === 'error' ? 'Synchronisation en erreur' : syncStatus === 'disabled' ? 'Synchronisation non configurée' : lastSyncAt ? `Synchronisé à ${new Date(lastSyncAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Synchronisation active';

  return (
    <div className="game-tracker-screen no-print">
      <header className="tracker-command-header">
        <a className="tracker-back" href="./assistant/">‹ Assistant d’unité</a>
        <div>
          <span className="tracker-eyebrow">Centre de commandement</span>
          <h2>Suivi de partie</h2>
        </div>
        <div className="tracker-header-actions">
          <span className={`tracker-sync tracker-sync-${syncStatus}`}><i />{syncLabel}</span>
          <span className="tracker-device" title="Identifiant local utilisé dans le journal">{deviceLabel()}</span>
          <button type="button" className="btn btn-ghost" disabled={!actionHistory.some((entry) => !entry.undoneAt)} onClick={undoLastAction}>↶ Annuler</button>
          <button type="button" className="btn btn-ghost btn-danger" onClick={startNewGame}>🆕 Nouvelle partie</button>
          <a className="btn btn-primary tracker-combat-link" href="./assistant/">⚔ Assistant d’unité</a>
        </div>
      </header>

      {/* Round + points de victoire : les seules données mises à jour en fin de
          round, donc juste sous le bandeau de titre, dans le même style que le
          bandeau Joueur 1/2 ci-dessous (demande utilisateur, 13/09/2026). */}
      <div className="tracker-topbar tracker-armies">
        <article className="tracker-army tracker-round-card">
          <div><span>Round</span><strong>{state.round} / {ROUNDS.length}</strong></div>
          <div className="tracker-round-controls">
            <select value={state.round} onChange={(e) => changeRound(Number(e.target.value))} aria-label="Choisir le round">
              {ROUNDS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button type="button" className="btn btn-primary tracker-next-round" disabled={state.round >= ROUNDS.at(-1)!} onClick={nextRound}>Round suivant →</button>
          </div>
        </article>
        <article className="tracker-army tracker-army-bleu">
          <div><span>🔵 Bleu</span><strong>{bleuLabel}</strong></div>
          <div className="tracker-vp-controls">
            <button type="button" className="btn btn-ghost" onClick={() => update({ vpBleu: Math.max(0, state.vpBleu - 1) })}>−</button>
            <span className="tracker-vp-value">{state.vpBleu}</span>
            <button type="button" className="btn btn-ghost" onClick={() => update({ vpBleu: state.vpBleu + 1 })}>+</button>
          </div>
        </article>
        <article className="tracker-army tracker-army-rouge">
          <div><span>🔴 Rouge</span><strong>{rougeLabel}</strong></div>
          <div className="tracker-vp-controls">
            <button type="button" className="btn btn-ghost" onClick={() => update({ vpRouge: Math.max(0, state.vpRouge - 1) })}>−</button>
            <span className="tracker-vp-value">{state.vpRouge}</span>
            <button type="button" className="btn btn-ghost" onClick={() => update({ vpRouge: state.vpRouge + 1 })}>+</button>
          </div>
        </article>
      </div>

      <div className="tracker-armies">
        {([[listP1, p1Summary, 'Joueur 1', 'bleu'], [listP2, p2Summary, 'Joueur 2', 'rouge']] as const).map(([list, summary, fallback, color]) => (
          <article className={`tracker-army tracker-army-${color}`} key={fallback}>
            <div><span>{fallback}</span><strong>{playerLabel(list, fallback)}</strong></div>
            <dl>
              <div><dt>Unités</dt><dd>{summary.units}</dd></div>
              <div><dt>Suppression</dt><dd>{summary.suppression}</dd></div>
              <div><dt>À jouer</dt><dd>{summary.remainingActivations}</dd></div>
            </dl>
          </article>
        ))}
      </div>

      {roundHistory.length > 0 && <section className="tracker-round-history tracker-console-panel">
        <h3>Rounds terminés</h3>
        <div>{roundHistory.slice().reverse().map((entry) => <article key={entry.round}><b>Round {entry.round}</b><span>{entry.activatedUnitIds.length} activation(s)</span><span>🔵 {entry.vpBleu} · 🔴 {entry.vpRouge}</span></article>)}</div>
      </section>}

      <section className="tracker-round-history tracker-action-history tracker-console-panel" aria-label="Historique des actions du suivi">
        <h3>Dernières modifications</h3>
        {actionHistory.length ? <div>{actionHistory.slice(0, 8).map((entry) => <article className={entry.undoneAt ? 'undone' : ''} key={entry.id}><b>{entry.undoneAt ? '↶ ' : ''}{entry.label}</b><span>{entry.device}</span><span>{new Date(entry.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></article>)}</div> : <p className="empty-hint">Aucune modification manuelle enregistrée.</p>}
      </section>

      <section className="tracker-unit-status tracker-console-panel" aria-label="État détaillé des armées">
        <h3>État des unités</h3>
        <div className="tracker-unit-columns">
          {([[listP1, 'p1', 'Joueur 1'], [listP2, 'p2', 'Joueur 2']] as const).map(([list, player, fallback]) => (
            <div className="tracker-unit-column" key={player}>
              <strong>{playerLabel(list, fallback)}</strong>
              {(list?.units ?? []).map((unit, index) => {
                const snapshot = unitSnapshot(unit, player, index);
                const morale = snapshot.outOfAction ? 'Hors combat' : snapshot.panicked ? 'Paniquée' : snapshot.suppressed ? 'Démoralisée' : snapshot.suppression ? 'Ralliement' : 'Stable';
                const unitId = unitIdFor(player, unit, index);
                const activated = activatedUnitIds.includes(unitId);
                return <article className={`tracker-unit-row ${activated ? 'activated' : ''} ${snapshot.outOfAction ? 'defeated' : snapshot.panicked ? 'panicked' : snapshot.suppressed ? 'suppressed' : ''}`} key={unitId}>
                  <div><b>{frenchCardName(unit.name)}</b><small>{morale}</small></div>
                  <dl>
                    <div><dt>Supp.</dt><dd>{snapshot.moraleProfile.suppressionImmune ? '—' : snapshot.suppression}</dd></div>
                  </dl>
                  <button type="button" className={`tracker-activation ${activated ? 'done' : ''}`} disabled={snapshot.outOfAction} onClick={() => toggleActivation(unitId)}>{snapshot.outOfAction ? '☠' : activated ? '✓ Jouée' : 'À jouer'}</button>
                </article>;
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="tracker-round-history tracker-console-panel" aria-label="Dernières attaques résolues">
        <h3>Journal de résolution</h3>
        {attackHistory.length ? <div>{attackHistory.slice(0, 8).map((entry) => <article key={entry.id}>
          <b>{entry.attacker} → {entry.defender}</b>
          <span>{entry.weapons?.join(' · ') || 'Arme non renseignée'}</span>
          <span>{entry.wounds} blessure{entry.wounds > 1 ? 's' : ''} · {entry.blocks ?? 0} blocage{(entry.blocks ?? 0) > 1 ? 's' : ''}</span>
        </article>)}</div> : <p className="empty-hint">Les attaques terminées dans l’Assistant apparaîtront ici automatiquement.</p>}
      </section>

      {archiveHook.games.length > 0 && <section className="tracker-round-history tracker-game-archive tracker-console-panel" aria-label="Parties précédentes">
        <h3>Parties précédentes</h3>
        <div>{archiveHook.games.map((game) => <article key={game.id}>
          <b>{game.p1Label} vs {game.p2Label}</b>
          <span>{new Date(game.archivedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} · round {game.finalRound}</span>
          <span>🔵 {game.vpBleu} · 🔴 {game.vpRouge} · 🏆 {gameWinner(game)}</span>
          <div className="tracker-archive-actions">
            <button type="button" className="btn btn-ghost" onClick={() => restoreGame(game)}>↩ Restaurer</button>
            <button type="button" className="btn btn-ghost btn-danger" aria-label={`Supprimer la partie du ${new Date(game.archivedAt).toLocaleDateString('fr-FR')}`} onClick={() => { if (window.confirm('Supprimer cette partie de l’historique ? Définitif.')) archiveHook.remove(game.id); }}>🗑</button>
          </div>
        </article>)}</div>
      </section>}

      {/* Juste au-dessus d'Objectif/Avantage : ces éléments, comme l'attribution
          Bleu/Rouge, ne se choisissent qu'une fois en début de partie (demande
          utilisateur, 13/09/2026). */}
      <div className="tracker-color-assign tracker-console-panel">
        <strong>Attribution tactique</strong>
        <span>Joueur 1 :</span>
        <button
          type="button"
          className={state.p1Color === 'bleu' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => update({ p1Color: 'bleu' })}
        >
          🔵 Bleu
        </button>
        <button
          type="button"
          className={state.p1Color === 'rouge' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => update({ p1Color: 'rouge' })}
        >
          🔴 Rouge
        </button>
      </div>

      <section className="tracker-section tracker-section-objective">
        <h3>Objectif</h3>
        <select value={state.objectiveId ?? ''} onChange={(e) => update({ objectiveId: e.target.value || null })}>
          <option value="">— Choisir —</option>
          {OBJECTIVE_CARDS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        {objective && (
          <div className="tracker-visuals">
            <button type="button" className="tracker-card-button" onClick={() => setPreview({ src: objective.cardImage, alt: objective.name })} aria-label={`Agrandir ${objective.name}`}>
              <img src={objective.cardImage} alt={objective.name} className="tracker-card-image" onError={(e) => { e.currentTarget.hidden = true; }} />
            </button>
            {objective.mapImage ? (
              <button type="button" className="tracker-card-button" onClick={() => setPreview({ src: objective.mapImage!, alt: `Déploiement — ${objective.name}` })} aria-label={`Agrandir le déploiement ${objective.name}`}>
                <img src={objective.mapImage} alt={`Déploiement — ${objective.name}`} className="tracker-card-image" onError={(e) => { e.currentTarget.hidden = true; }} />
              </button>
            ) : (
              <p className="empty-hint tracker-missing-visual">
                Visuel de déploiement non fourni pour « {objective.name} » dans le PDF importé.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="tracker-section tracker-section-secondary">
        <h3>Objectif secondaire</h3>
        <select value={state.secondaryId ?? ''} onChange={(e) => update({ secondaryId: e.target.value || null })}>
          <option value="">— Choisir —</option>
          {SECONDARY_OBJECTIVE_CARDS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        {secondary && (
          <div className="tracker-visuals">
            <button type="button" className="tracker-card-button" onClick={() => setPreview({ src: secondary.image, alt: secondary.name })} aria-label={`Agrandir ${secondary.name}`}>
              <img src={secondary.image} alt={secondary.name} className="tracker-card-image" onError={(e) => { e.currentTarget.hidden = true; }} />
            </button>
          </div>
        )}
      </section>

      <section className="tracker-section tracker-section-advantage">
        <h3>Avantage</h3>
        <div className="tracker-advantage-columns">
          <div className="tracker-advantage-side">
            <span className="tracker-player-badge">🔵 {bleuLabel}</span>
            <select value={state.advantageBleuId ?? ''} onChange={(e) => update({ advantageBleuId: e.target.value || null })}>
              <option value="">— Choisir —</option>
              {ADVANTAGE_CARDS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {advantageBleu && (
              <button type="button" className="tracker-card-button" onClick={() => setPreview({ src: advantageBleu.image, alt: advantageBleu.name })} aria-label={`Agrandir ${advantageBleu.name}`}>
                <img src={advantageBleu.image} alt={advantageBleu.name} className="tracker-card-image" onError={(e) => { e.currentTarget.hidden = true; }} />
              </button>
            )}
          </div>
          <div className="tracker-advantage-side">
            <span className="tracker-player-badge">🔴 {rougeLabel}</span>
            <select value={state.advantageRougeId ?? ''} onChange={(e) => update({ advantageRougeId: e.target.value || null })}>
              <option value="">— Choisir —</option>
              {ADVANTAGE_CARDS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {advantageRouge && (
              <button type="button" className="tracker-card-button" onClick={() => setPreview({ src: advantageRouge.image, alt: advantageRouge.name })} aria-label={`Agrandir ${advantageRouge.name}`}>
                <img src={advantageRouge.image} alt={advantageRouge.name} className="tracker-card-image" onError={(e) => { e.currentTarget.hidden = true; }} />
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="tracker-combat-cta">
        <button type="button" className="btn btn-primary btn-large" onClick={onOpenCommandCards}>
          🎴 Cartes de Commandement
        </button>
        <a className="btn btn-primary btn-large" href="./assistant/">
          ⚔️ Ouvrir l’Assistant d’unité
        </a>
      </div>
      {preview && (
        <div className="tracker-card-preview" role="dialog" aria-modal="true" aria-label={preview.alt} onClick={() => setPreview(null)}>
          <button type="button" aria-label="Fermer" onClick={() => setPreview(null)}>×</button>
          <img src={preview.src} alt={preview.alt} />
        </div>
      )}
    </div>
  );
}
