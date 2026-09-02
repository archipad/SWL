import type { ResolvedTag } from '../lib/combat';
import { ATTACK_SEQUENCE, keywordsForStep, type AttackStep } from '../lib/attackSequence';
import type { DetectedInteraction } from '../lib/keywordInteractions';
import { DefinitionText } from '../lib/diceIcons';
import { shortDef } from '../lib/keywordText';
import { frenchCardName } from '../lib/cardNames';

/**
 * Logique et rendu communs aux deux présentations du guide pas-à-pas
 * (liste complète dans AttackSequenceGuide.tsx, plein écran animé dans
 * CombatSequenceFullscreen.tsx) — regroupés ici pour que les deux imports
 * restent à sens unique (pas de dépendance circulaire entre les deux
 * composants).
 */
export interface StepData {
  step: AttackStep;
  index: number;
  attackerKeywords: ResolvedTag[];
  defenderKeywords: ResolvedTag[];
  stepInteractions: DetectedInteraction[];
  hasContent: boolean;
}

export function buildSteps(
  attackerResolved: ResolvedTag[],
  defenderResolved: ResolvedTag[],
  interactions: DetectedInteraction[],
): StepData[] {
  return ATTACK_SEQUENCE.map((step, index) => {
    const attackerKeywords = keywordsForStep(step, attackerResolved, 'attaque');
    const defenderKeywords = keywordsForStep(step, defenderResolved, 'défense');
    const stepInteractions = interactions.filter(
      (int) =>
        attackerKeywords.some((r) => r.tag.keywordId === int.attackerKeywordId) &&
        defenderKeywords.some((r) => r.tag.keywordId === int.defenderKeywordId),
    );
    return { step, index, attackerKeywords, defenderKeywords, stepInteractions, hasContent: attackerKeywords.length > 0 || defenderKeywords.length > 0 };
  });
}

function KeywordLine({ tag, def, source }: ResolvedTag) {
  return (
    <p className="sequence-keyword">
      <strong>{def.name}{def.hasValue && tag.value ? ` ${tag.value}` : ''}</strong>
      {' — '}<DefinitionText text={shortDef(def)} />
      <span className="card-row-definition-source"> ({frenchCardName(source)})</span>
    </p>
  );
}

export function StepBody({ data }: { data: StepData }) {
  const { step, attackerKeywords, defenderKeywords, stepInteractions } = data;
  if (attackerKeywords.length === 0 && defenderKeywords.length === 0) {
    return <p className="sequence-step-hint">{step.hint}</p>;
  }
  return (
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
  );
}
