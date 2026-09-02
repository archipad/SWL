import { useEffect, useState } from 'react';
import type { RosterEntry } from '../lib/combat';
import { CARD_IMAGES } from '../data/cardImages';
import { normalizeName } from '../lib/normalize';
import { frenchCardName } from '../lib/cardNames';
import { buildSteps, StepBody } from './SequenceStepShared';
import type { ResolvedTag } from '../lib/combat';
import type { DetectedInteraction } from '../lib/keywordInteractions';

interface Props {
  attacker: RosterEntry;
  defender: RosterEntry;
  attackerResolved: ResolvedTag[];
  defenderResolved: ResolvedTag[];
  interactions: DetectedInteraction[];
  checked: Set<string>;
  onToggle: (stepId: string) => void;
  focusIndex: number;
  setFocusIndex: (i: number) => void;
  onClose: () => void;
  /** Depuis la dernière étape, "Suivante" démarre un nouveau combat (retour à la sélection, rôles réinitialisés) plutôt que d'avancer. */
  onFinish: () => void;
}

function HudCorners() {
  return (
    <>
      <span className="hud-corner hud-corner-tl" aria-hidden="true" />
      <span className="hud-corner hud-corner-tr" aria-hidden="true" />
      <span className="hud-corner hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner hud-corner-br" aria-hidden="true" />
    </>
  );
}

/**
 * Identité d'un camp dans le bandeau du haut : visuel de l'unité + son nom,
 * et — quand c'est possible (visuel connu) — une rangée de miniatures des
 * améliorations équipées, pour garder sous les yeux tout l'équipement de
 * l'unité pendant qu'on résout l'attaque, sans avoir à rouvrir l'écran de
 * sélection. Une amélioration sans visuel connu est simplement omise (pas
 * d'icône cassée).
 */
function IdentityCard({ entry, side }: { entry: RosterEntry; side: 'attack' | 'defense' }) {
  const img = CARD_IMAGES[normalizeName(entry.unit.name)];
  const upgradeImages = entry.unit.upgrades
    .map((u) => ({ key: u.key, name: u.name, img: CARD_IMAGES[normalizeName(u.name)] }))
    .filter((u) => u.img);

  return (
    <div className={`hud-identity hud-identity-${side}`}>
      {img && <img className="hud-identity-portrait" src={img} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />}
      <div className="hud-identity-text">
        <span className="hud-identity-name">{frenchCardName(entry.unit.name)}</span>
        {upgradeImages.length > 0 && (
          <div className="hud-identity-upgrades">
            {upgradeImages.map((u) => (
              <img key={u.key} src={u.img} alt="" title={frenchCardName(u.name)} onError={(e) => { e.currentTarget.hidden = true; }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Séquence d'attaque en plein écran, une étape par « page » — pensé pour
 * être posé sur la table et lu de loin : gros caractères, très peu de
 * texte à l'écran à la fois, transition rapide entre étapes (déclenchée
 * par un simple remount React sur `key={step.id}`, animée en CSS pur —
 * voir .hud-panel-enter-next/prev dans index.css). Reprend le code
 * couleur déjà utilisé partout dans l'appli (rouge = attaquant, bleu =
 * défenseur) avec un habillage « viseur » (coins, anneau d'étape) pour
 * évoquer l'univers Star Wars sans texte ni logo réutilisés.
 */
export function CombatSequenceFullscreen({
  attacker, defender, attackerResolved, defenderResolved, interactions,
  checked, onToggle, focusIndex, setFocusIndex, onClose, onFinish,
}: Props) {
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const steps = buildSteps(attackerResolved, defenderResolved, interactions);
  const data = steps[focusIndex];
  const isChecked = checked.has(data.step.id);
  const isFirst = focusIndex === 0;
  const isLast = focusIndex === steps.length - 1;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') { if (isLast) onFinish(); else goTo(focusIndex + 1, 'next'); }
      else if (e.key === 'ArrowLeft' && !isFirst) goTo(focusIndex - 1, 'prev');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIndex, isFirst, isLast]);

  const goTo = (i: number, direction: 'next' | 'prev') => {
    setDir(direction);
    setFocusIndex(i);
  };

  return (
    <div className="hud-overlay">
      <div className="hud-topbar">
        <IdentityCard entry={attacker} side="attack" />
        <span className="hud-identity-vs">VS</span>
        <IdentityCard entry={defender} side="defense" />
        <button type="button" className="hud-close" onClick={onClose} aria-label="Fermer la séquence plein écran">
          ✕
        </button>
      </div>

      <div className="hud-dots">
        {steps.map((s, i) => (
          <button
            key={s.step.id}
            type="button"
            className={`hud-dot${i === focusIndex ? ' hud-dot-current' : ''}${s.hasContent ? ' hud-dot-active' : ''}${checked.has(s.step.id) ? ' hud-dot-done' : ''}`}
            onClick={() => goTo(i, i > focusIndex ? 'next' : 'prev')}
            aria-label={`Étape ${i + 1} : ${s.step.label}`}
            title={s.step.label}
          />
        ))}
      </div>

      <div className="hud-stage">
        <div key={data.step.id} className={`hud-panel hud-panel-enter-${dir}`}>
          <HudCorners />
          <div className="hud-panel-head">
            <span className="hud-ring">{data.index + 1}<small>/{steps.length}</small></span>
            <h2 className="hud-panel-label">{data.step.label}</h2>
          </div>
          <div className="hud-panel-body">
            <StepBody data={data} />
          </div>
        </div>
      </div>

      <div className="hud-nav">
        <button type="button" className="btn btn-ghost hud-nav-btn" onClick={() => goTo(focusIndex - 1, 'prev')} disabled={isFirst}>
          ◀ Précédente
        </button>
        <label className="hud-nav-check">
          <input type="checkbox" checked={isChecked} onChange={() => onToggle(data.step.id)} />
          Fait
        </label>
        <button
          type="button"
          className="btn btn-primary hud-nav-btn"
          onClick={() => {
            if (!isChecked) onToggle(data.step.id);
            if (isLast) onFinish(); else goTo(focusIndex + 1, 'next');
          }}
        >
          {isLast ? '⚔️ Nouveau combat' : 'Suivante ▶'}
        </button>
      </div>
    </div>
  );
}
