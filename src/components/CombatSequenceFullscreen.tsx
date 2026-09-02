import { useEffect, useState } from 'react';
import type { RosterEntry, ResolvedTag } from '../lib/combat';
import { CARD_IMAGES } from '../data/cardImages';
import { normalizeName } from '../lib/normalize';
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

/**
 * Sélection de la carte qui fournit l'arme de cette attaque (unité ou une
 * amélioration équipée) — un seul porteur d'arme actif à la fois, comme aux
 * règles (on n'utilise qu'une arme par attaque), imposé par `onToggle` côté
 * parent. Les cartes sans arme (Chef, Personnel, pouvoirs...) restent des
 * cases à cocher indépendantes : elles n'entrent pas dans ce choix, seuls
 * leurs mots-clés comptent pour la suite de la séquence.
 *
 * Une carte avec plusieurs lignes d'arme (ex. l'unité elle-même : corps-à-
 * corps + à distance) propose en plus un choix entre ses propres armes.
 */
function WeaponSelectPanel({
  attacker, attackerResolved, selected, onToggle, weaponIndex, onPickWeapon,
}: {
  attacker: RosterEntry;
  attackerResolved: ResolvedTag[];
  selected: Set<string>;
  onToggle: (name: string) => void;
  weaponIndex: number;
  onPickWeapon: (i: number) => void;
}) {
  const cards = [attacker.unit.name, ...attacker.unit.upgrades.map((u) => u.name)];
  const activeWeaponCard = cards.find((name) => selected.has(name) && (diceProfileFor(name)?.weapons.length ?? 0) > 0);
  const activeProfile = activeWeaponCard ? diceProfileFor(activeWeaponCard) : undefined;
  const activeWeapon = activeProfile?.weapons[Math.min(weaponIndex, activeProfile.weapons.length - 1)];

  return (
    <div className="hud-weapon-select">
      {activeWeapon && (
        <div className="hud-dice-total">
          <span className="hud-dice-total-label">Dés à lancer</span>
          <WeaponDiceLine weapon={activeWeapon} />
        </div>
      )}
      {cards.map((name) => {
        const img = CARD_IMAGES[normalizeName(name)];
        const isOn = selected.has(name);
        const cardKeywords = attackerResolved.filter((r) => r.source === name);
        const profile = diceProfileFor(name);
        const weapons = profile?.weapons ?? [];
        const isWeaponCard = weapons.length > 0;
        return (
          <button
            key={name}
            type="button"
            className={`hud-weapon-tile${isOn ? ' hud-weapon-tile-on' : ''}${isWeaponCard ? ' hud-weapon-tile-radio' : ''}`}
            onClick={() => onToggle(name)}
          >
            <span className="hud-weapon-check" aria-hidden="true">{isOn ? (isWeaponCard ? '●' : '✓') : ''}</span>
            {img && <img className="hud-weapon-image" src={img} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />}
            <div className="hud-weapon-info">
              <span className="hud-weapon-name">{frenchCardName(name)}</span>
              {weapons.length > 0 && (
                <div className="hud-weapon-options">
                  {weapons.map((w, i) => (
                    <span
                      key={w.name}
                      role={weapons.length > 1 ? 'button' : undefined}
                      className={`hud-weapon-option${isOn && i === weaponIndex ? ' hud-weapon-option-on' : ''}`}
                      onClick={(e) => {
                        if (weapons.length <= 1) return;
                        e.stopPropagation();
                        if (!isOn) onToggle(name);
                        onPickWeapon(i);
                      }}
                    >
                      <span className="hud-weapon-option-name">{frenchCardName(w.name)}</span>
                      <WeaponDiceLine weapon={w} />
                    </span>
                  ))}
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
          </button>
        );
      })}
      <p className="hud-weapon-note">
        💡 Une seule carte-arme active à la fois (●) — les autres cases (✓) sont les cartes dont les
        mots-clés s'appliquent quand même (Chef, pouvoirs, améliorations passives...).
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
   * améliorations-armes) et passives (Chef, pouvoirs, Personnel...). Par
   * défaut : toutes les passives + l'arme de l'unité elle-même (ou, si
   * l'unité n'en a pas — ex. un compagnon —, la première amélioration-arme
   * trouvée).
   */
  const cardNames = [attacker.unit.name, ...attacker.unit.upgrades.map((u) => u.name)];
  const isWeaponCard = (name: string) => (diceProfileFor(name)?.weapons.length ?? 0) > 0;
  const [selectedSources, setSelectedSources] = useState<Set<string>>(() => {
    const passive = cardNames.filter((n) => !isWeaponCard(n));
    const defaultWeapon = cardNames.find((n) => isWeaponCard(n));
    return new Set(defaultWeapon ? [...passive, defaultWeapon] : passive);
  });
  const [weaponIndex, setWeaponIndex] = useState(0);

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

  /** Une seule carte-arme active à la fois (règle : une arme par attaque) ; les cartes passives se cochent librement. */
  const toggleSource = (name: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        if (isWeaponCard(name)) {
          for (const n of cardNames) if (n !== name && isWeaponCard(n)) next.delete(n);
        }
        next.add(name);
      }
      return next;
    });
    setWeaponIndex(0);
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
        <div key={data.step.id} className={`hud-panel hud-panel-enter-${dir}`}>
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
                selected={selectedSources}
                onToggle={toggleSource}
                weaponIndex={weaponIndex}
                onPickWeapon={setWeaponIndex}
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
