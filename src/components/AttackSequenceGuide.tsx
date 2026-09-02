import { useEffect, useState } from 'react';
import type { ResolvedTag } from '../lib/combat';
import { ATTACK_SEQUENCE, keywordsForStep } from '../lib/attackSequence';
import type { DetectedInteraction } from '../lib/keywordInteractions';
import { DefinitionText } from '../lib/diceIcons';
import { shortDef } from '../lib/keywordText';

interface Props {
  attackerResolved: ResolvedTag[];
  defenderResolved: ResolvedTag[];
  interactions: DetectedInteraction[];
  /** Change à chaque nouvelle paire attaquant/défenseur, pour réinitialiser les cases cochées. */
  resetKey: string;
}

function KeywordLine({ tag, def, source }: ResolvedTag) {
  return (
    <p className="sequence-keyword">
      <strong>{def.name}{def.hasValue && tag.value ? ` ${tag.value}` : ''}</strong>
      {' — '}<DefinitionText text={shortDef(def)} />
      <span className="card-row-definition-source"> ({source})</span>
    </p>
  );
}

export function AttackSequenceGuide({ attackerResolved, defenderResolved, interactions, resetKey }: Props) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());

  // Nouvelle paire attaquant/défenseur = nouvelle attaque : on repart d'une checklist vierge.
  useEffect(() => {
    setChecked(new Set());
  }, [resetKey]);

  const toggle = (stepId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId); else next.add(stepId);
      return next;
    });
  };

  return (
    <ol className="sequence-guide">
      {ATTACK_SEQUENCE.map((step, i) => {
        const attackerKeywords = keywordsForStep(step, attackerResolved, 'attaque');
        const defenderKeywords = keywordsForStep(step, defenderResolved, 'défense');
        const stepInteractions = interactions.filter(
          (int) =>
            attackerKeywords.some((r) => r.tag.keywordId === int.attackerKeywordId) &&
            defenderKeywords.some((r) => r.tag.keywordId === int.defenderKeywordId),
        );
        const hasContent = attackerKeywords.length > 0 || defenderKeywords.length > 0;
        const isChecked = checked.has(step.id);

        return (
          <li
            key={step.id}
            className={`sequence-step${hasContent ? ' sequence-step-active' : ''}${isChecked ? ' sequence-step-done' : ''}`}
          >
            <label className="sequence-step-head">
              <input type="checkbox" checked={isChecked} onChange={() => toggle(step.id)} />
              <span className="sequence-step-number">{i + 1}</span>
              <span className="sequence-step-label">{step.label}</span>
            </label>
            {hasContent ? (
              <div className="sequence-step-body">
                {stepInteractions.map((int) => (
                  <p key={`${int.attackerKeywordId}:${int.defenderKeywordId}`} className="sequence-interaction-note">
                    ⚡ {int.note}
                  </p>
                ))}
                {attackerKeywords.length > 0 && (
                  <div className="sequence-side sequence-side-attack">
                    <span className="sequence-side-label">Attaquant</span>
                    {attackerKeywords.map((r) => <KeywordLine key={r.tag.keywordId} {...r} />)}
                  </div>
                )}
                {defenderKeywords.length > 0 && (
                  <div className="sequence-side sequence-side-defense">
                    <span className="sequence-side-label">Défenseur</span>
                    {defenderKeywords.map((r) => <KeywordLine key={r.tag.keywordId} {...r} />)}
                  </div>
                )}
              </div>
            ) : (
              <p className="sequence-step-hint">{step.hint}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
