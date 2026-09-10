import { ADVANTAGE_CARDS, OBJECTIVE_CARDS, SECONDARY_OBJECTIVE_CARDS } from '../data/battleCards';
import type { useGameTracker } from '../lib/useGameTracker';
import type { SyncStatus } from '../lib/useSync';
import type { ParsedList } from '../types';

interface Props {
  listP1: ParsedList | null;
  listP2: ParsedList | null;
  tracker: ReturnType<typeof useGameTracker>;
  onGoToCombat: () => void;
  onSync: (state: ReturnType<typeof useGameTracker>['state']) => void;
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
}

const ROUNDS = [1, 2, 3, 4, 5];

function playerLabel(list: ParsedList | null, fallback: string): string {
  return list?.listName ?? list?.faction ?? fallback;
}

export function GameTrackerScreen({ listP1, listP2, tracker, onGoToCombat, onSync, syncStatus, lastSyncAt }: Props) {
  const { state, patch } = tracker;
  const update = (changes: Partial<typeof state>) => { const next = { ...state, ...changes }; patch(changes); onSync(next); };
  const p1Label = playerLabel(listP1, 'Joueur 1');
  const p2Label = playerLabel(listP2, 'Joueur 2');
  const bleuLabel = state.p1Color === 'bleu' ? p1Label : p2Label;
  const rougeLabel = state.p1Color === 'bleu' ? p2Label : p1Label;

  const objective = OBJECTIVE_CARDS.find((o) => o.id === state.objectiveId) ?? null;
  const secondary = SECONDARY_OBJECTIVE_CARDS.find((o) => o.id === state.secondaryId) ?? null;
  const advantageBleu = ADVANTAGE_CARDS.find((a) => a.id === state.advantageBleuId) ?? null;
  const advantageRouge = ADVANTAGE_CARDS.find((a) => a.id === state.advantageRougeId) ?? null;

  const armySummary = (list: ParsedList | null, player: 'p1' | 'p2') => {
    let saved: Record<string, { wounds?: number; suppression?: number }> = {};
    try { saved = JSON.parse(localStorage.getItem('swl.assistant.unit-state.v1') || '{}'); } catch { /* état local illisible */ }
    const units = list?.units ?? [];
    return {
      units: units.length,
      wounded: units.filter((_, index) => (saved[`${player}:${index}`]?.wounds ?? 0) > 0).length,
      suppression: units.reduce((sum, _, index) => sum + (saved[`${player}:${index}`]?.suppression ?? 0), 0),
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
        <span className={`tracker-sync tracker-sync-${syncStatus}`}><i />{syncLabel}</span>
      </header>

      <div className="tracker-armies">
        {([[listP1, p1Summary, 'Joueur 1', 'bleu'], [listP2, p2Summary, 'Joueur 2', 'rouge']] as const).map(([list, summary, fallback, color]) => (
          <article className={`tracker-army tracker-army-${color}`} key={fallback}>
            <div><span>{fallback}</span><strong>{playerLabel(list, fallback)}</strong></div>
            <dl>
              <div><dt>Unités</dt><dd>{summary.units}</dd></div>
              <div><dt>Touchées</dt><dd>{summary.wounded}</dd></div>
              <div><dt>Suppression</dt><dd>{summary.suppression}</dd></div>
            </dl>
          </article>
        ))}
      </div>

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

      <div className="tracker-topbar tracker-console-panel">
        <label className="tracker-round field">
          Round
          <select value={state.round} onChange={(e) => update({ round: Number(e.target.value) })}>
            {ROUNDS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>

        <div className="tracker-vp">
          <div className="tracker-vp-side tracker-vp-bleu">
            <span className="tracker-player-badge">🔵 {bleuLabel}</span>
            <div className="tracker-vp-controls">
              <button type="button" className="btn btn-ghost" onClick={() => update({ vpBleu: Math.max(0, state.vpBleu - 1) })}>−</button>
              <span className="tracker-vp-value">{state.vpBleu}</span>
              <button type="button" className="btn btn-ghost" onClick={() => update({ vpBleu: state.vpBleu + 1 })}>+</button>
            </div>
          </div>
          <div className="tracker-vp-side tracker-vp-rouge">
            <span className="tracker-player-badge">🔴 {rougeLabel}</span>
            <div className="tracker-vp-controls">
              <button type="button" className="btn btn-ghost" onClick={() => update({ vpRouge: Math.max(0, state.vpRouge - 1) })}>−</button>
              <span className="tracker-vp-value">{state.vpRouge}</span>
              <button type="button" className="btn btn-ghost" onClick={() => update({ vpRouge: state.vpRouge + 1 })}>+</button>
            </div>
          </div>
        </div>
      </div>

      <section className="tracker-section tracker-section-objective">
        <h3>Objectif</h3>
        <select value={state.objectiveId ?? ''} onChange={(e) => update({ objectiveId: e.target.value || null })}>
          <option value="">— Choisir —</option>
          {OBJECTIVE_CARDS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        {objective && (
          <div className="tracker-visuals">
            <img
              src={objective.cardImage}
              alt={objective.name}
              className="tracker-card-image"
              onError={(e) => { e.currentTarget.hidden = true; }}
            />
            {objective.mapImage ? (
              <img
                src={objective.mapImage}
                alt={`Déploiement — ${objective.name}`}
                className="tracker-card-image"
                onError={(e) => { e.currentTarget.hidden = true; }}
              />
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
            <img
              src={secondary.image}
              alt={secondary.name}
              className="tracker-card-image"
              onError={(e) => { e.currentTarget.hidden = true; }}
            />
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
              <img
                src={advantageBleu.image}
                alt={advantageBleu.name}
                className="tracker-card-image"
                onError={(e) => { e.currentTarget.hidden = true; }}
              />
            )}
          </div>
          <div className="tracker-advantage-side">
            <span className="tracker-player-badge">🔴 {rougeLabel}</span>
            <select value={state.advantageRougeId ?? ''} onChange={(e) => update({ advantageRougeId: e.target.value || null })}>
              <option value="">— Choisir —</option>
              {ADVANTAGE_CARDS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {advantageRouge && (
              <img
                src={advantageRouge.image}
                alt={advantageRouge.name}
                className="tracker-card-image"
                onError={(e) => { e.currentTarget.hidden = true; }}
              />
            )}
          </div>
        </div>
      </section>

      <div className="tracker-combat-cta">
        <button type="button" className="btn btn-primary btn-large" onClick={onGoToCombat}>
          ⚔️ Aller au Combat interactif
        </button>
      </div>
    </div>
  );
}
