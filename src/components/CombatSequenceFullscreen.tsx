import { useEffect, useState } from 'react';
import type { RosterEntry, ResolvedTag } from '../lib/combat';
import { cardImageFor } from '../data/cardImages';
import { frenchCardName } from '../lib/cardNames';
import { DefinitionText } from '../lib/diceIcons';
import { diceProfileFor, type DiceColor, type WeaponDice, type WeaponProfile } from '../data/diceProfiles';
import { buildSteps, StepBody, KeywordLine } from './SequenceStepShared';
import { detectInteractions } from '../lib/keywordInteractions';

interface Props {
  attacker: RosterEntry;
  defender: RosterEntry;
  attackerResolved: ResolvedTag[];
  defenderResolved: ResolvedTag[];
  checked: Set<string>;
  onToggle: (stepId: string) => void;
  focusIndex: number;
  setFocusIndex: (i: number) => void;
  onClose: () => void;
  /** Depuis la dernière étape, "Suivante" démarre un nouveau combat (retour à la sélection, rôles réinitialisés) plutôt que d'avancer. */
  onFinish: () => void;
}

/** Étapes purement informatives, sans action ni mot-clé jamais applicable : retirées de ce flux plein écran (restent dans le Combat classique, inchangé). */
const REMOVED_STEP_IDS = new Set(['declare-defender']);
/**
 * Étapes toujours affichées même sans mot-clé applicable : soit une vraie
 * action à faire quoi qu'il arrive (choisir les armes, déterminer le
 * couvert), soit une étape où un pion (Viser, Esquive) peut se dépenser
 * indépendamment de tout mot-clé — sans cette exception, le rappel de
 * pion n'apparaîtrait quasiment jamais, la dépense de pions n'étant pas
 * elle-même un mot-clé du glossaire.
 */
const ALWAYS_SHOWN_STEP_IDS = new Set(['build-pool', 'determine-cover', 'modify-attack', 'apply-dodge-cover']);

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
  const img = cardImageFor(entry.unit.name);
  const upgradeImages = entry.unit.upgrades
    .map((u) => ({ key: u.key, name: u.name, img: cardImageFor(u.name) }))
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

/** Un losange coloré + son chiffre, dans le même code couleur que sur les cartes (blanc/rouge/noir). */
function DiceBadge({ color, count }: { color: DiceColor; count: number }) {
  return (
    <span className={`dice-badge dice-badge-${color}`}>
      <span>{count}</span>
    </span>
  );
}

function DiceRow({ dice }: { dice: WeaponDice[] }) {
  return (
    <span className="dice-row">
      {dice.map((d) => <DiceBadge key={d.color} color={d.color} count={d.count} />)}
    </span>
  );
}

/**
 * Chiffres et couleurs lus directement sur la carte (losange coloré = dé de
 * cette couleur, chiffre = nombre à lancer) — voir data/diceProfiles.ts.
 * Quand une arme a un pool variable (ex. Sabre Lancé, moitié des dés d'une
 * autre arme), le nombre exact n'est volontairement pas calculé : le texte
 * de la carte reste affiché plus haut pour appliquer la règle à la main.
 */
function WeaponDiceLine({ weapon }: { weapon: WeaponProfile }) {
  if (weapon.dice === 'variable') {
    return <span className="hud-weapon-dice-variable">dés variables — voir le texte de la carte</span>;
  }
  return <DiceRow dice={weapon.dice} />;
}

const DICE_COLOR_ORDER: DiceColor[] = ['noir', 'rouge', 'blanc'];

/** Additionne, couleur par couleur, les pools de toutes les armes cochées. Une arme au pool variable est ignorée dans le total (signalée à part). */
function sumWeaponDice(weapons: WeaponProfile[]): { totals: WeaponDice[]; hasVariable: boolean } {
  const totals = new Map<DiceColor, number>();
  let hasVariable = false;
  for (const w of weapons) {
    if (w.dice === 'variable') { hasVariable = true; continue; }
    for (const d of w.dice) totals.set(d.color, (totals.get(d.color) ?? 0) + d.count);
  }
  return { totals: DICE_COLOR_ORDER.filter((c) => totals.has(c)).map((color) => ({ color, count: totals.get(color)! })), hasVariable };
}

/** Identifiant unique d'une arme = carte + index (le nom seul peut se répéter, ex. "Non armé" sur plusieurs unités). */
function weaponKey(cardName: string, index: number): string {
  return `${cardName}::${index}`;
}

/**
 * Sélection des armes de cette attaque : chaque arme (celles de l'unité
 * elle-même + celles de chaque amélioration équipée) est une case à cocher
 * indépendante — on peut en cocher plusieurs, le total en haut additionne
 * les dés de toutes les armes cochées, couleur par couleur. Les cartes
 * sans arme (Chef, Personnel, pouvoirs...) restent des cases à cocher à
 * part, pour leurs mots-clés seulement.
 */
function WeaponSelectPanel({
  attacker, attackerResolved, selectedWeapons, onToggleWeapon, selectedPassive, onTogglePassive,
}: {
  attacker: RosterEntry;
  attackerResolved: ResolvedTag[];
  selectedWeapons: Set<string>;
  onToggleWeapon: (cardName: string, index: number) => void;
  selectedPassive: Set<string>;
  onTogglePassive: (cardName: string) => void;
}) {
  const cards = [attacker.unit.name, ...attacker.unit.upgrades.map((u) => u.name)];
  const chosenWeapons: WeaponProfile[] = [];
  for (const name of cards) {
    const weapons = diceProfileFor(name)?.weapons ?? [];
    weapons.forEach((w, i) => { if (selectedWeapons.has(weaponKey(name, i))) chosenWeapons.push(w); });
  }
  const { totals, hasVariable } = sumWeaponDice(chosenWeapons);

  return (
    <div className="hud-weapon-select">
      <div className="hud-dice-total">
        <span className="hud-dice-total-label">Dés à lancer</span>
        {totals.length > 0 ? (
          <span className="dice-row dice-row-big">
            {totals.map((d) => <DiceBadge key={d.color} color={d.color} count={d.count} />)}
          </span>
        ) : (
          <span className="hud-dice-total-empty">Aucune arme cochée</span>
        )}
        {hasVariable && <span className="hud-dice-total-variable">+ arme(s) à pool variable — voir carte</span>}
      </div>
      <div className="hud-weapon-grid">
      {cards.map((name) => {
        const img = cardImageFor(name);
        const cardKeywords = attackerResolved.filter((r) => r.source === name);
        const profile = diceProfileFor(name);
        const weapons = profile?.weapons ?? [];
        const isWeaponCard = weapons.length > 0;
        const isOn = isWeaponCard
          ? weapons.some((_, i) => selectedWeapons.has(weaponKey(name, i)))
          : selectedPassive.has(name);
        return (
          <div key={name} className={`hud-weapon-tile${isOn ? ' hud-weapon-tile-on' : ''}`}>
            {img && <img className="hud-weapon-image" src={img} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />}
            <div className="hud-weapon-info">
              {isWeaponCard ? (
                <span className="hud-weapon-name">{frenchCardName(name)}</span>
              ) : (
                <button
                  type="button"
                  className={`hud-weapon-name-btn${selectedPassive.has(name) ? ' hud-weapon-name-btn-on' : ''}`}
                  onClick={() => onTogglePassive(name)}
                >
                  <span className="hud-weapon-check" aria-hidden="true">{selectedPassive.has(name) ? '✓' : ''}</span>
                  <span className="hud-weapon-name">{frenchCardName(name)}</span>
                </button>
              )}
              {weapons.length > 0 && (
                <div className="hud-weapon-options">
                  {weapons.map((w, i) => {
                    const key = weaponKey(name, i);
                    const on = selectedWeapons.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`hud-weapon-option${on ? ' hud-weapon-option-on' : ''}`}
                        onClick={() => onToggleWeapon(name, i)}
                      >
                        <span className="hud-weapon-check" aria-hidden="true">{on ? '✓' : ''}</span>
                        <span className="hud-weapon-option-name">{frenchCardName(w.name)}</span>
                        <WeaponDiceLine weapon={w} />
                      </button>
                    );
                  })}
                </div>
              )}
              {cardKeywords.length === 0 ? (
                weapons.length === 0 && <span className="hud-weapon-empty">Aucun mot-clé renseigné.</span>
              ) : (
                <div className="hud-weapon-keywords">
                  {cardKeywords.map((r) => <KeywordLine key={r.tag.keywordId} {...r} hideSource />)}
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
      <p className="hud-weapon-note">
        💡 Coche toutes les armes utilisées pour cette attaque — le total en haut s'additionne
        automatiquement. Les cases sans dé (Chef, pouvoirs, améliorations passives...) n'apportent que
        leurs mots-clés.
      </p>
    </div>
  );
}

/**
 * Pense-bête couvert (étape « Déterminer le couvert ») : texte fourni par
 * l'utilisateur (règle officielle), affiché systématiquement à cette
 * étape en complément des mots-clés spécifiques déjà listés au-dessus.
 */
function CoverCheatsheet() {
  return (
    <div className="hud-cheatsheet">
      <h4>Pense-bête — Couvert</h4>
      <p>
        Il faut qu'au moins la moitié des figurines de l'unité défenseuse soient protégées. Une
        figurine est protégée si la ligne de vue entre n'importe quel point du chef d'unité
        attaquant et n'importe quel point de cette figurine passe par un décor procurant du
        couvert, à ½ de cette figurine.
      </p>
      <h4>Fonctionnement des dés de couvert</h4>
      <p>
        <DefinitionText text="Si le couvert s'applique, lancer 1 dé de défense blanc par résultat [TOUCHE] du pool d'attaque. Retirer 1 [TOUCHE] par résultat :" />
      </p>
      <ul>
        <li><DefinitionText text="[BLOC] si couvert léger" /></li>
        <li><DefinitionText text="[BLOC] ou [ADR-DEF] si couvert lourd" /></li>
      </ul>
      <p className="hud-cheatsheet-footnote">(Une unité Démoralisée ajoute 1 niveau de couvert.)</p>
    </div>
  );
}

/** Petit rappel visuel qu'un pion peut être dépensé à cette étape — mise en avant demandée, sans ajouter de règle non vérifiée. */
function TokenBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <p className="hud-token-badge">
      <span className="hud-token-icon" aria-hidden="true">{icon}</span> {text}
    </p>
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
 *
 * Deux différences avec la vue « liste complète » du Combat classique
 * (AttackSequenceGuide.tsx, inchangée) : l'étape « Déclarer le défenseur »
 * est retirée (aucune action ni mot-clé n'y intervient jamais) et toute
 * étape sans mot-clé applicable est sautée automatiquement — sauf
 * « Constituer la réserve d'attaque » et « Déterminer le couvert », qui
 * restent de vraies actions à faire quoi qu'il arrive.
 */
export function CombatSequenceFullscreen({
  attacker, defender, attackerResolved, defenderResolved,
  checked, onToggle, focusIndex, setFocusIndex, onClose, onFinish,
}: Props) {
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  /**
   * Départage les cartes de l'attaquant en porteuses d'arme (unité +
   * améliorations-armes, cochables arme par arme, plusieurs à la fois) et
   * passives (Chef, pouvoirs, Personnel...). Par défaut : toutes les
   * passives cochées + la première arme de l'unité elle-même cochée (ou,
   * si l'unité n'en a pas — ex. un compagnon —, la première arme trouvée
   * parmi les améliorations).
   */
  const cardNames = [attacker.unit.name, ...attacker.unit.upgrades.map((u) => u.name)];
  const isWeaponCard = (name: string) => (diceProfileFor(name)?.weapons.length ?? 0) > 0;
  const [selectedWeapons, setSelectedWeapons] = useState<Set<string>>(() => {
    const firstWeaponCard = cardNames.find(isWeaponCard);
    return new Set(firstWeaponCard ? [weaponKey(firstWeaponCard, 0)] : []);
  });
  const [selectedPassive, setSelectedPassive] = useState<Set<string>>(
    () => new Set(cardNames.filter((n) => !isWeaponCard(n))),
  );

  const weaponCardOf = (key: string) => key.slice(0, key.lastIndexOf('::'));
  const selectedSources = new Set([
    ...cardNames.filter((name) => isWeaponCard(name) && [...selectedWeapons].some((k) => weaponCardOf(k) === name)),
    ...selectedPassive,
  ]);

  const filteredAttackerResolved = attackerResolved.filter((r) => selectedSources.has(r.source));
  const interactions = detectInteractions(filteredAttackerResolved, defenderResolved);
  const steps = buildSteps(filteredAttackerResolved, defenderResolved, interactions)
    .filter((s) => !REMOVED_STEP_IDS.has(s.step.id))
    .filter((s) => s.hasContent || ALWAYS_SHOWN_STEP_IDS.has(s.step.id));

  const safeFocusIndex = Math.min(focusIndex, steps.length - 1);
  const data = steps[safeFocusIndex];
  const isChecked = checked.has(data.step.id);
  const isFirst = safeFocusIndex === 0;
  const isLast = safeFocusIndex === steps.length - 1;

  const toggleWeapon = (cardName: string, index: number) => {
    const key = weaponKey(cardName, index);
    setSelectedWeapons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const togglePassive = (name: string) => {
    setSelectedPassive((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') { if (isLast) onFinish(); else goTo(safeFocusIndex + 1, 'next'); }
      else if (e.key === 'ArrowLeft' && !isFirst) goTo(safeFocusIndex - 1, 'prev');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeFocusIndex, isFirst, isLast]);

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
            className={`hud-dot${i === safeFocusIndex ? ' hud-dot-current' : ''}${s.hasContent ? ' hud-dot-active' : ''}${checked.has(s.step.id) ? ' hud-dot-done' : ''}`}
            onClick={() => goTo(i, i > safeFocusIndex ? 'next' : 'prev')}
            aria-label={`Étape ${i + 1} : ${s.step.label}`}
            title={s.step.label}
          />
        ))}
      </div>

      <div className="hud-stage">
        <div key={data.step.id} className={`hud-panel hud-panel-enter-${dir}${data.step.id === 'build-pool' ? ' hud-panel-wide' : ''}`}>
          <HudCorners />
          <div className="hud-panel-head">
            <span className="hud-ring">{safeFocusIndex + 1}<small>/{steps.length}</small></span>
            <h2 className="hud-panel-label">{data.step.label}</h2>
          </div>
          <div className="hud-panel-body">
            {data.step.id === 'build-pool' ? (
              <WeaponSelectPanel
                attacker={attacker}
                attackerResolved={attackerResolved}
                selectedWeapons={selectedWeapons}
                onToggleWeapon={toggleWeapon}
                selectedPassive={selectedPassive}
                onTogglePassive={togglePassive}
              />
            ) : (
              <StepBody data={data} />
            )}
            {data.step.id === 'modify-attack' && (
              <TokenBadge icon="🎯" text="Pion Viser utilisable ici (relance de dés d'attaque)." />
            )}
            {data.step.id === 'apply-dodge-cover' && (
              <TokenBadge icon="🛡" text="Pion Esquive utilisable ici, côté défenseur." />
            )}
            {data.step.id === 'determine-cover' && <CoverCheatsheet />}
          </div>
        </div>
      </div>

      <div className="hud-nav">
        <button type="button" className="btn btn-ghost hud-nav-btn" onClick={() => goTo(safeFocusIndex - 1, 'prev')} disabled={isFirst}>
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
            if (isLast) onFinish(); else goTo(safeFocusIndex + 1, 'next');
          }}
        >
          {isLast ? '⚔️ Nouveau combat' : 'Suivante ▶'}
        </button>
      </div>
    </div>
  );
}
