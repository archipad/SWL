import { useEffect, useState } from 'react';
import type { ResolvedTag, RosterEntry } from '../lib/combat';
import type { DetectedInteraction } from '../lib/keywordInteractions';
import { frenchCardName } from '../lib/cardNames';
import { cardImageFor } from '../data/cardImages';
import { usePersistentState } from '../lib/storage';
import { buildSteps, StepBody, type StepData } from './SequenceStepShared';

interface Props {
  attacker: RosterEntry;
  defender: RosterEntry;
  attackerResolved: ResolvedTag[];
  defenderResolved: ResolvedTag[];
  interactions: DetectedInteraction[];
  /** Change à chaque nouvelle paire attaquant/défenseur, pour réinitialiser les cases cochées. */
  resetKey: string;
}

/**
 * Bandeau d'identité (attaquant/défenseur en cours) épinglé en haut du guide
 * pendant le défilement — sur une checklist de 11 étapes, on perd vite de
 * vue qui on résout sans avoir à remonter tout en haut de l'écran. Le
 * visuel de carte n'est qu'un rappel (déjà affiché en entier dans la vue
 * « Mots-clés »), donc en miniature ici.
 */
function SequenceBanner({
  attacker, defender, mode, onToggleMode,
}: { attacker: RosterEntry; defender: RosterEntry; mode: 'liste' | 'plein-écran'; onToggleMode: () => void }) {
  const attackerImg = cardImageFor(attacker.unit.name);
  const defenderImg = cardImageFor(defender.unit.name);
  return (
    <div className="sequence-banner no-print">
      <div className="sequence-banner-side sequence-banner-attack">
        {attackerImg && <img src={attackerImg} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />}
        <span>{frenchCardName(attacker.unit.name)}</span>
      </div>
      <span className="sequence-banner-vs">VS</span>
      <div className="sequence-banner-side sequence-banner-defense">
        {defenderImg && <img src={defenderImg} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />}
        <span>{frenchCardName(defender.unit.name)}</span>
      </div>
      <button type="button" className="btn btn-ghost sequence-mode-btn" onClick={onToggleMode}>
        {mode === 'liste' ? '▣ Une étape à la fois' : '☰ Liste complète'}
      </button>
    </div>
  );
}

export function AttackSequenceGuide({ attacker, defender, attackerResolved, defenderResolved, interactions, resetKey }: Props) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [mode, setMode] = usePersistentState<'liste' | 'plein-écran'>('swl.sequence-mode.v1', 'liste');
  const [focusIndex, setFocusIndex] = useState(0);

  // Nouvelle paire attaquant/défenseur = nouvelle attaque : on repart d'une checklist vierge et de la première étape.
  useEffect(() => {
    setChecked(new Set());
    setFocusIndex(0);
  }, [resetKey]);

  const toggle = (stepId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId); else next.add(stepId);
      return next;
    });
  };

  const steps = buildSteps(attackerResolved, defenderResolved, interactions);

  return (
    <>
      <SequenceBanner
        attacker={attacker}
        defender={defender}
        mode={mode}
        onToggleMode={() => setMode(mode === 'liste' ? 'plein-écran' : 'liste')}
      />

      {mode === 'liste' ? (
        <ol className="sequence-guide">
          {steps.map((data) => {
            const isChecked = checked.has(data.step.id);
            return (
              <li
                key={data.step.id}
                className={`sequence-step${data.hasContent ? ' sequence-step-active' : ''}${isChecked ? ' sequence-step-done' : ''}`}
              >
                <label className="sequence-step-head">
                  <input type="checkbox" checked={isChecked} onChange={() => toggle(data.step.id)} />
                  <span className="sequence-step-number">{data.index + 1}</span>
                  <span className="sequence-step-label">{data.step.label}</span>
                </label>
                <StepBody data={data} />
              </li>
            );
          })}
        </ol>
      ) : (
        <FocusMode steps={steps} checked={checked} onToggle={toggle} focusIndex={focusIndex} setFocusIndex={setFocusIndex} />
      )}
    </>
  );
}

/**
 * Vue « une étape à la fois » : pensée pour être posée à plat sur la table
 * et lue à distance (gros caractères), sans avoir à faire défiler toute la
 * liste — on avance étape par étape avec les boutons, ou en tapant
 * directement un repère de progression pour sauter à une étape précise.
 * Parcourt les 11 étapes officielles dans l'ordre, y compris celles sans
 * mot-clé applicable : l'étape reste à effectuer même sans texte à lire.
 */
function FocusMode({
  steps, checked, onToggle, focusIndex, setFocusIndex,
}: {
  steps: StepData[];
  checked: Set<string>;
  onToggle: (stepId: string) => void;
  focusIndex: number;
  setFocusIndex: (i: number) => void;
}) {
  const data = steps[focusIndex];
  const isChecked = checked.has(data.step.id);
  const isFirst = focusIndex === 0;
  const isLast = focusIndex === steps.length - 1;

  const goNext = () => {
    if (!isLast) setFocusIndex(focusIndex + 1);
  };

  return (
    <div className="sequence-focus">
      <div className="sequence-focus-dots">
        {steps.map((s, i) => (
          <button
            key={s.step.id}
            type="button"
            className={`sequence-focus-dot${i === focusIndex ? ' sequence-focus-dot-current' : ''}${s.hasContent ? ' sequence-focus-dot-active' : ''}${checked.has(s.step.id) ? ' sequence-focus-dot-done' : ''}`}
            onClick={() => setFocusIndex(i)}
            aria-label={`Étape ${i + 1} : ${s.step.label}`}
            title={s.step.label}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <label className="sequence-focus-head">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggle(data.step.id)}
        />
        <span className="sequence-focus-number">Étape {data.index + 1} / {steps.length}</span>
      </label>
      <h3 className="sequence-focus-label">{data.step.label}</h3>

      <div className="sequence-focus-body">
        <StepBody data={data} />
      </div>

      <div className="sequence-focus-nav">
        <button type="button" className="btn btn-ghost" onClick={() => setFocusIndex(focusIndex - 1)} disabled={isFirst}>
          ◀ Précédente
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => { if (!isChecked) onToggle(data.step.id); goNext(); }}
          disabled={isLast}
        >
          Suivante ▶
        </button>
      </div>
    </div>
  );
}
