import type { ResolvedTag } from '../lib/combat';
import { ATTACK_SEQUENCE, keywordsForStep, type AttackStep } from '../lib/attackSequence';
import type { DetectedInteraction } from '../lib/keywordInteractions';
import { DefinitionText } from '../lib/diceIcons';
import { shortDef, substituteValue } from '../lib/keywordText';
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

/**
 * `hideSource` : quand la ligne apparaît déjà sous un en-tête nommant la carte (ex. vignette de
 * sélection d'arme), répéter « (nom de la carte) » à chaque mot-clé n'apporte rien.
 *
 * L'éclair ⚡ (même traitement que les notes d'interaction ci-dessous) marque un mot-clé qui agit
 * réellement à cette étape côté attaque/défense (def.impact === 'attaque'/'défense') — par
 * opposition aux mots-clés « autre » (contraintes, conditions...) qui ne font que rappeler une
 * règle sans modifier quoi que ce soit ici. Distinction déjà présente dans le glossaire, pas
 * inventée pour l'occasion.
 */
export function KeywordLine({ tag, def, source, hideSource }: ResolvedTag & { hideSource?: boolean }) {
  const isAction = def.impact !== 'autre';
  const value = def.hasValue ? tag.value : undefined;
  return (
    <p className={`sequence-keyword${isAction ? ' sequence-keyword-action' : ''}`}>
      {isAction && <span className="sequence-keyword-bolt" aria-hidden="true">⚡</span>}
      <strong>{substituteValue(def.name, value)}</strong>
      {' — '}<DefinitionText text={substituteValue(shortDef(def), value)} />
      {!hideSource && (
        <span className="card-row-definition-source"> ({frenchCardName(source)})</span>
      )}
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
