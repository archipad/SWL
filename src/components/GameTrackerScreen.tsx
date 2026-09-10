import { useEffect, useState } from 'react';
import { ADVANTAGE_CARDS, OBJECTIVE_CARDS, SECONDARY_OBJECTIVE_CARDS } from '../data/battleCards';
import certifications from '../data/diceCertifications.json';
import { canonicalCardKey, frenchCardName } from '../lib/cardNames';
import type { useGameTracker } from '../lib/useGameTracker';
import type { SyncStatus } from '../lib/useSync';
import type { ParsedList } from '../types';

interface Props {
  listP1: ParsedList | null;
  listP2: ParsedList | null;
  tracker: ReturnType<typeof useGameTracker>;
  onSync: (state: ReturnType<typeof useGameTracker>['state']) => void;
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
}

const ROUNDS = [1, 2, 3, 4, 5];
const UNIT_STATE_KEY = 'swl.assistant.unit-state.v1';
type UnitState = { wounds?: number; suppression?: number; ion?: number; immobilize?: number; poison?: number; shield?: number; modelWounds?: Record<string, number> };
type UnitStates = Record<string, UnitState>;
type CertifiedRecord = { unitStats?: { woundsPerModel: number; courage: number | null; baseModels: number; suppressionImmune?: boolean }; addedModels?: number; addedModelWounds?: number };
const certified = certifications as Record<string, CertifiedRecord>;

function readUnitStates(): UnitStates {
  try { return JSON.parse(localStorage.getItem(UNIT_STATE_KEY) || '{}') as UnitStates; }
  catch { return {}; }
}

function playerLabel(list: ParsedList | null, fallback: string): string {
  return list?.listName ?? list?.faction ?? fallback;
}

export function GameTrackerScreen({ listP1, listP2, tracker, onSync, syncStatus, lastSyncAt }: Props) {
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  const [unitStates, setUnitStates] = useState<UnitStates>(readUnitStates);
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

  useEffect(() => {
    const refresh = () => setUnitStates(readUnitStates());
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); };
  }, [lastSyncAt]);

  const unitSnapshot = (unit: ParsedList['units'][number], player: 'p1' | 'p2', index: number) => {
    const state = unitStates[`${player}:${index}`] ?? {};
    const base = certified[canonicalCardKey(unit.name)]?.unitStats;
    const models = base ? [
      ...Array.from({ length: base.baseModels }, (_, modelIndex) => ({ id: `base-${modelIndex}`, health: base.woundsPerModel })),
      ...unit.upgrades.flatMap((upgrade, upgradeIndex) => {
        const profile = certified[canonicalCardKey(upgrade.name)];
        return Array.from({ length: profile?.addedModels ?? 0 }, (_, modelIndex) => ({ id: `upgrade-${upgradeIndex}-${canonicalCardKey(upgrade.name)}-${modelIndex}`, health: profile?.addedModelWounds ?? base.woundsPerModel }));
      }),
    ] : [];
    const detailedTotal = models.reduce((sum, model) => sum + Math.max(0, Math.min(model.health, state.modelWounds?.[model.id] ?? 0)), 0);
    const hasConsistentDetail = !!state.modelWounds && detailedTotal === Math.max(0, state.wounds ?? 0);
    let budget = Math.max(0, state.wounds ?? 0);
    const remaining = models.reduce((sum, model) => {
      const applied = hasConsistentDetail ? Math.max(0, Math.min(model.health, state.modelWounds?.[model.id] ?? 0)) : Math.min(model.health, budget);
      if (!hasConsistentDetail) budget -= applied;
      return sum + (applied < model.health ? 1 : 0);
    }, 0);
    const totalWounds = models.reduce((sum, model) => sum + model.health, 0);
    const suppression = base?.suppressionImmune || base?.courage === null ? 0 : Math.max(0, state.suppression ?? 0);
    const courage = base?.courage ?? null;
    return { state, base, totalModels: models.length, remaining, totalWounds, suppression, panicked: courage !== null && suppression >= courage * 2, suppressed: courage !== null && suppression >= courage, defeated: !!models.length && remaining === 0 };
  };

  const armySummary = (list: ParsedList | null, player: 'p1' | 'p2') => {
    const units = list?.units ?? [];
    return {
      units: units.length,
      wounded: units.filter((_, index) => (unitStates[`${player}:${index}`]?.wounds ?? 0) > 0).length,
      suppression: units.reduce((sum, _, index) => sum + (unitStates[`${player}:${index}`]?.suppression ?? 0), 0),
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
          <a className="btn btn-primary tracker-combat-link" href="./assistant/">⚔ Assistant d’unité</a>
        </div>
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

      <section className="tracker-unit-status tracker-console-panel" aria-label="État détaillé des armées">
        <h3>État des unités</h3>
        <div className="tracker-unit-columns">
          {([[listP1, 'p1', 'Joueur 1'], [listP2, 'p2', 'Joueur 2']] as const).map(([list, player, fallback]) => (
            <div className="tracker-unit-column" key={player}>
              <strong>{playerLabel(list, fallback)}</strong>
              {(list?.units ?? []).map((unit, index) => {
                const snapshot = unitSnapshot(unit, player, index);
                const morale = snapshot.defeated ? 'Vaincue' : snapshot.panicked ? 'Paniquée' : snapshot.suppressed ? 'Démoralisée' : snapshot.suppression ? 'Ralliement' : 'Stable';
                return <article className={`tracker-unit-row ${snapshot.defeated ? 'defeated' : snapshot.panicked ? 'panicked' : snapshot.suppressed ? 'suppressed' : ''}`} key={`${player}:${index}`}>
                  <div><b>{frenchCardName(unit.name)}</b><small>{morale}</small></div>
                  <dl>
                    <div><dt>Fig.</dt><dd>{snapshot.base ? `${snapshot.remaining}/${snapshot.totalModels}` : '?'}</dd></div>
                    <div><dt>Bless.</dt><dd>{snapshot.state.wounds ?? 0}{snapshot.totalWounds ? `/${snapshot.totalWounds}` : ''}</dd></div>
                    <div><dt>Supp.</dt><dd>{snapshot.base?.suppressionImmune || snapshot.base?.courage === null ? '—' : snapshot.suppression}</dd></div>
                  </dl>
                </article>;
              })}
            </div>
          ))}
        </div>
      </section>

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
