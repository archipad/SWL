import { useEffect, useState } from 'react';
import type { ResolvedTag, RosterEntry } from '../lib/combat';
import type { DetectedInteraction } from '../lib/keywordInteractions';
import { frenchCardName } from '../lib/cardNames';
import { CARD_IMAGES } from '../data/cardImages';
import { normalizeName } from '../lib/normalize';
import { usePersistentState } from '../lib/storage';
import { buildSteps, StepBody } from './SequenceStepShared';
import { CombatSequenceFullscreen } from './CombatSequenceFullscreen';

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
  const attackerImg = CARD_IMAGES[normalizeName(attacker.unit.name)];
  const defenderImg = CARD_IMAGES[normalizeName(defender.unit.name)];
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

      {mode === 'plein-écran' && (
        <CombatSequenceFullscreen
          attacker={attacker}
          defender={defender}
          attackerResolved={attackerResolved}
          defenderResolved={defenderResolved}
          interactions={interactions}
          checked={checked}
          onToggle={toggle}
          focusIndex={focusIndex}
          setFocusIndex={setFocusIndex}
          onClose={() => setMode('liste')}
        />
      )}
    </>
  );
}
