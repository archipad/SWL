import { useEffect, useState } from 'react';
import type { RosterEntry, ResolvedTag } from '../lib/combat';
import { cardImageFor } from '../data/cardImages';
import { frenchCardName } from '../lib/cardNames';
import { DefinitionText } from '../lib/diceIcons';
import { diceProfileFor, type DiceColor, type WeaponDice, type WeaponProfile } from '../data/diceProfiles';
import { buildSteps, StepBody, KeywordLine } from './SequenceStepShared';
import { detectInteractions } from '../lib/keywordInteractions';
import { useWeaponPreferences } from '../lib/weaponPrefs';

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
  /** Échange attaquant/défenseur sans repasser par l'écran de sélection (ripostes, tirs croisés...). */
  onSwapSides: () => void;
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
function IdentityCard({
  entry, side, onZoom,
}: { entry: RosterEntry; side: 'attack' | 'defense'; onZoom: (src: string, alt: string) => void }) {
  const img = cardImageFor(entry.unit.name);
  const upgradeImages = entry.unit.upgrades
    .map((u) => ({ key: u.key, name: u.name, img: cardImageFor(u.name) }))
    .filter((u) => u.img);

  return (
    <div className={`hud-identity hud-identity-${side}`}>
      {img && (
        <button type="button" className="hud-identity-portrait-btn" onClick={() => onZoom(img, frenchCardName(entry.unit.name))}>
          <img className="hud-identity-portrait" src={img} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />
        </button>
      )}
      <div className="hud-identity-text">
        <span className="hud-identity-name">{frenchCardName(entry.unit.name)}</span>
        {upgradeImages.length > 0 && (
          <div className="hud-identity-upgrades">
            {upgradeImages.map((u) => (
              <button key={u.key} type="button" className="hud-identity-upgrade-btn" onClick={() => onZoom(u.img!, frenchCardName(u.name))}>
                <img src={u.img} alt="" title={frenchCardName(u.name)} onError={(e) => { e.currentTarget.hidden = true; }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Visuel agrandi, pour vérifier soi-même ce qui est imprimé sur la carte
 * (dés, mots-clés...) — fermeture par clic en dehors, bouton ✕, ou Échap.
 * Un tap sur l'image bascule entre "cadré" et "taille réelle" (défilable,
 * pour lire un texte encore plus fin) ; le pincement natif du navigateur
 * fonctionne aussi, rien ici ne le bloque.
 */
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className={`hud-lightbox-backdrop${zoomed ? ' hud-lightbox-backdrop-zoomed' : ''}`} onClick={onClose}>
      <img
        className={`hud-lightbox-img${zoomed ? ' hud-lightbox-img-zoomed' : ''}`}
        src={src}
        alt={alt}
        onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
      />
      <button type="button" className="hud-lightbox-close" onClick={onClose} aria-label="Fermer le visuel">✕</button>
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
function WeaponDiceLine({ dice }: { dice: WeaponDice[] | 'variable' }) {
  if (dice === 'variable') {
    return <span className="hud-weapon-dice-variable">dés variables — voir le texte de la carte</span>;
  }
  return <DiceRow dice={dice} />;
}

const DICE_COLOR_ORDER: DiceColor[] = ['noir', 'rouge', 'blanc'];

/** Additionne, couleur par couleur, les pools de toutes les armes cochées (déjà mises à l'échelle par leur nombre de figurines). Une arme au pool variable est ignorée dans le total (signalée à part). */
function sumWeaponDice(weapons: (WeaponDice[] | 'variable')[]): { totals: WeaponDice[]; hasVariable: boolean } {
  const totals = new Map<DiceColor, number>();
  let hasVariable = false;
  for (const dice of weapons) {
    if (dice === 'variable') { hasVariable = true; continue; }
    for (const d of dice) totals.set(d.color, (totals.get(d.color) ?? 0) + d.count);
  }
  return { totals: DICE_COLOR_ORDER.filter((c) => totals.has(c)).map((color) => ({ color, count: totals.get(color)! })), hasVariable };
}

/** Multiplie le pool imprimé sur la carte par le nombre de figurines qui utilisent cette arme (variable : inchangé, le calcul dépend du texte de la carte). */
function scaleDice(dice: WeaponDice[] | 'variable', count: number): WeaponDice[] | 'variable' {
  if (dice === 'variable' || count === 1) return dice;
  return dice.map((d) => ({ ...d, count: d.count * count }));
}

/** Identifiant unique d'une arme = carte + index (le nom seul peut se répéter, ex. "Non armé" sur plusieurs unités). */
function weaponKey(cardName: string, index: number): string {
  return `${cardName}::${index}`;
}

/** Stepper compact −/N/+ pour le nombre de figurines utilisant une arme donnée (min 1). */
function CountStepper({
  count, onChange, label,
}: { count: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="hud-weapon-count-stepper">
      <button type="button" onClick={() => onChange(count - 1)} disabled={count <= 1} aria-label={`Moins de figurines utilisant ${label}`}>−</button>
      <span className="hud-weapon-count-value">×{count}</span>
      <button type="button" onClick={() => onChange(count + 1)} aria-label={`Plus de figurines utilisant ${label}`}>+</button>
    </div>
  );
}

/** Au-delà de ce nombre de mots-clés d'arme, la carte est repliée par défaut (bouton pour dérouler) — évite qu'une carte très chargée (Vador, Iden Versio...) domine toute la grille. */
const COLLAPSE_KEYWORDS_ABOVE = 2;

/** Une carte-arme de la grille de sélection : visuel, choix d'arme(s) + stepper de figurines, et ses mots-clés d'arme (repliables si nombreux). */
function WeaponTile({
  name, weapons, selectedWeapons, onToggleWeapon, weaponCounts, onCountChange, weaponKeywords, onZoom,
}: {
  name: string;
  weapons: WeaponProfile[];
  selectedWeapons: Set<string>;
  onToggleWeapon: (cardName: string, index: number) => void;
  weaponCounts: Record<string, number>;
  onCountChange: (key: string, count: number) => void;
  weaponKeywords: ResolvedTag[];
  onZoom: (src: string, alt: string) => void;
}) {
  const [expanded, setExpanded] = useState(weaponKeywords.length <= COLLAPSE_KEYWORDS_ABOVE);
  const img = cardImageFor(name);
  const isOn = weapons.some((_, i) => selectedWeapons.has(weaponKey(name, i)));

  return (
    <div className={`hud-weapon-tile${isOn ? ' hud-weapon-tile-on' : ''}`}>
      {img && (
        <button
          type="button"
          className="hud-weapon-image-btn"
          onClick={(e) => { e.stopPropagation(); onZoom(img, frenchCardName(name)); }}
          aria-label={`Agrandir le visuel de ${frenchCardName(name)}`}
        >
          <img className="hud-weapon-image" src={img} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />
        </button>
      )}
      <div className="hud-weapon-info">
        <span className="hud-weapon-name">{frenchCardName(name)}</span>
        <div className="hud-weapon-options">
          {weapons.map((w, i) => {
            const key = weaponKey(name, i);
            const on = selectedWeapons.has(key);
            const count = weaponCounts[key] ?? 1;
            return (
              <div key={key} className={`hud-weapon-option${on ? ' hud-weapon-option-on' : ''}`}>
                <button type="button" className="hud-weapon-option-toggle" onClick={() => onToggleWeapon(name, i)}>
                  <span className="hud-weapon-check" aria-hidden="true">{on ? '✓' : ''}</span>
                  <span className="hud-weapon-option-name">{frenchCardName(w.name)}</span>
                </button>
                <CountStepper count={count} onChange={(n) => onCountChange(key, n)} label={frenchCardName(w.name)} />
                <WeaponDiceLine dice={scaleDice(w.dice, count)} />
              </div>
            );
          })}
        </div>
        {weaponKeywords.length > 0 && (
          expanded ? (
            <div className="hud-weapon-keywords">
              {weaponKeywords.map((r) => <KeywordLine key={r.tag.keywordId} {...r} hideSource />)}
              {weaponKeywords.length > COLLAPSE_KEYWORDS_ABOVE && (
                <button type="button" className="hud-weapon-collapse-btn" onClick={() => setExpanded(false)}>▴ Replier</button>
              )}
            </div>
          ) : (
            <button type="button" className="hud-weapon-collapse-btn" onClick={() => setExpanded(true)}>
              ▾ Voir {weaponKeywords.length} mots-clés
            </button>
          )
        )}
      </div>
    </div>
  );
}

/**
 * Sélection des armes de cette attaque : chaque arme (celles de l'unité
 * elle-même + celles de chaque amélioration-arme équipée) est une case à
 * cocher indépendante — on peut en cocher plusieurs — avec un réglage du
 * nombre de figurines qui l'utilisent (le nombre de dés imprimé sur la
 * carte est par figurine ; le total en haut multiplie et additionne tout
 * ça, couleur par couleur). Les améliorations sans arme (Chef, Personnel,
 * pouvoirs...) n'apparaissent pas ici : leurs mots-clés s'appliquent de
 * toute façon, sans qu'un choix soit à faire pour cette étape.
 */
function WeaponSelectPanel({
  attacker, attackerResolved, selectedWeapons, onToggleWeapon, weaponCounts, onCountChange, onZoom,
}: {
  attacker: RosterEntry;
  attackerResolved: ResolvedTag[];
  selectedWeapons: Set<string>;
  onToggleWeapon: (cardName: string, index: number) => void;
  weaponCounts: Record<string, number>;
  onCountChange: (key: string, count: number) => void;
  onZoom: (src: string, alt: string) => void;
}) {
  const allCards = [attacker.unit.name, ...attacker.unit.upgrades.map((u) => u.name)];
  const weaponCards = allCards.filter((name) => (diceProfileFor(name)?.weapons.length ?? 0) > 0);

  const chosenDice: (WeaponDice[] | 'variable')[] = [];
  for (const name of weaponCards) {
    const weapons = diceProfileFor(name)?.weapons ?? [];
    weapons.forEach((w, i) => {
      const key = weaponKey(name, i);
      if (selectedWeapons.has(key)) chosenDice.push(scaleDice(w.dice, weaponCounts[key] ?? 1));
    });
  }
  const { totals, hasVariable } = sumWeaponDice(chosenDice);

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
      {weaponCards.length === 0 ? (
        <p className="hud-weapon-empty">Aucune arme connue pour cette unité — voir directement la carte.</p>
      ) : (
        <div className="hud-weapon-grid">
        {weaponCards.map((name) => (
          <WeaponTile
            key={name}
            name={name}
            weapons={diceProfileFor(name)?.weapons ?? []}
            selectedWeapons={selectedWeapons}
            onToggleWeapon={onToggleWeapon}
            weaponCounts={weaponCounts}
            onCountChange={onCountChange}
            // Uniquement les mots-clés de catégorie "arme" (Impact X, Perforant X, Fixe...) : les
            // mots-clés d'unité (Armure, Grimpeur, Éclaireur...) s'appliquent quoi qu'il arrive,
            // indépendamment de l'arme choisie — les afficher ici aussi noyait l'info utile.
            weaponKeywords={attackerResolved.filter((r) => r.source === name && r.def.category === 'arme')}
            onZoom={onZoom}
          />
        ))}
        </div>
      )}
      <p className="hud-weapon-note">
        💡 Coche toutes les armes utilisées pour cette attaque et règle le nombre de figurines qui
        tirent avec chacune (× N) — le nombre de dés imprimé sur la carte est par figurine, le total
        en haut multiplie et additionne tout automatiquement.
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
  checked, onToggle, focusIndex, setFocusIndex, onClose, onFinish, onSwapSides,
}: Props) {
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
  const { getPref, savePref } = useWeaponPreferences();
  /**
   * Cartes porteuses d'arme (unité + améliorations-armes équipées) : chaque
   * arme est cochable individuellement, plusieurs à la fois. Les
   * améliorations sans arme (Chef, Personnel, pouvoirs...) n'ont pas de
   * choix à faire ici — leurs mots-clés s'appliquent automatiquement,
   * comme avant l'ajout de ce panneau de sélection.
   *
   * Le choix par défaut reprend le dernier réglage connu pour cette carte
   * (useWeaponPreferences, persisté en localStorage) — sinon, comme avant,
   * la première arme de l'unité elle-même est cochée à ×1.
   */
  const cardNames = [attacker.unit.name, ...attacker.unit.upgrades.map((u) => u.name)];
  const isWeaponCard = (name: string) => (diceProfileFor(name)?.weapons.length ?? 0) > 0;
  const [selectedWeapons, setSelectedWeapons] = useState<Set<string>>(() => {
    const fromPrefs = new Set<string>();
    for (const name of cardNames) {
      const pref = getPref(name);
      if (pref) for (const idx of pref.selected) fromPrefs.add(weaponKey(name, idx));
    }
    if (fromPrefs.size > 0) return fromPrefs;
    const firstWeaponCard = cardNames.find(isWeaponCard);
    return new Set(firstWeaponCard ? [weaponKey(firstWeaponCard, 0)] : []);
  });
  /** Nombre de figurines par arme (clé = weaponKey) — le pool imprimé sur la carte est par figurine, défaut 1. */
  const [weaponCounts, setWeaponCounts] = useState<Record<string, number>>(() => {
    const fromPrefs: Record<string, number> = {};
    for (const name of cardNames) {
      const pref = getPref(name);
      if (pref) for (const [idx, count] of Object.entries(pref.counts)) fromPrefs[weaponKey(name, Number(idx))] = count;
    }
    return fromPrefs;
  });

  const weaponCardOf = (key: string) => key.slice(0, key.lastIndexOf('::'));
  const selectedSources = new Set([
    ...cardNames.filter((name) => isWeaponCard(name) && [...selectedWeapons].some((k) => weaponCardOf(k) === name)),
    ...cardNames.filter((name) => !isWeaponCard(name)),
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

  /** Sauvegarde le réglage courant d'une carte (armes cochées + figurines) pour le retrouver au prochain combat. */
  const persistPref = (cardName: string, weapons: Set<string>, counts: Record<string, number>) => {
    const n = diceProfileFor(cardName)?.weapons.length ?? 0;
    const selected: number[] = [];
    const savedCounts: Record<number, number> = {};
    for (let i = 0; i < n; i++) {
      const k = weaponKey(cardName, i);
      if (weapons.has(k)) selected.push(i);
      savedCounts[i] = counts[k] ?? 1;
    }
    savePref(cardName, { selected, counts: savedCounts });
  };

  const toggleWeapon = (cardName: string, index: number) => {
    const key = weaponKey(cardName, index);
    setSelectedWeapons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      persistPref(cardName, next, weaponCounts);
      return next;
    });
  };
  const changeWeaponCount = (key: string, count: number) => {
    setWeaponCounts((prev) => {
      const next = { ...prev, [key]: Math.max(1, count) };
      persistPref(weaponCardOf(key), selectedWeapons, next);
      return next;
    });
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Échap ferme d'abord le visuel agrandi s'il y en a un, pas toute la séquence d'un coup.
      if (e.key === 'Escape') { if (zoomedImage) setZoomedImage(null); else onClose(); }
      else if (e.key === 'ArrowRight') { if (isLast) onFinish(); else goTo(safeFocusIndex + 1, 'next'); }
      else if (e.key === 'ArrowLeft' && !isFirst) goTo(safeFocusIndex - 1, 'prev');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeFocusIndex, isFirst, isLast, zoomedImage]);

  const goTo = (i: number, direction: 'next' | 'prev') => {
    setDir(direction);
    setFocusIndex(i);
  };
  const onZoom = (src: string, alt: string) => setZoomedImage({ src, alt });

  return (
    <div className="hud-overlay">
      <div className="hud-topbar">
        <IdentityCard entry={attacker} side="attack" onZoom={onZoom} />
        <button
          type="button"
          className="hud-swap"
          onClick={() => { onSwapSides(); setFocusIndex(0); }}
          aria-label="Inverser attaquant et défenseur"
          title="Inverser attaquant et défenseur"
        >
          <span className="hud-swap-icon" aria-hidden="true">⇄</span>
          VS
        </button>
        <IdentityCard entry={defender} side="defense" onZoom={onZoom} />
        <button type="button" className="hud-close" onClick={onClose} aria-label="Fermer la séquence plein écran">
          ✕
        </button>
      </div>

      <div className="hud-dots">
        {steps.map((s, i) => (
          <button
            key={s.step.id}
            type="button"
            className={`hud-dot-wrap${i === safeFocusIndex ? ' hud-dot-current' : ''}`}
            onClick={() => goTo(i, i > safeFocusIndex ? 'next' : 'prev')}
            aria-label={`Étape ${i + 1} : ${s.step.label}`}
            title={s.step.label}
          >
            <span className={`hud-dot${s.hasContent ? ' hud-dot-active' : ''}${checked.has(s.step.id) ? ' hud-dot-done' : ''}`} aria-hidden="true" />
            <span className="hud-dot-label">{s.step.shortLabel}</span>
          </button>
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
                weaponCounts={weaponCounts}
                onCountChange={changeWeaponCount}
                onZoom={onZoom}
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
        <div className="hud-nav-left">
          <button
            type="button"
            className="btn btn-ghost hud-nav-btn hud-nav-btn-icon"
            onClick={() => goTo(0, 'prev')}
            disabled={isFirst}
            aria-label="Revenir au début de la séquence"
            title="Revenir au début"
          >
            ⏮
          </button>
          <button type="button" className="btn btn-ghost hud-nav-btn" onClick={() => goTo(safeFocusIndex - 1, 'prev')} disabled={isFirst}>
            ◀ Précédente
          </button>
        </div>
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

      {zoomedImage && (
        <ImageLightbox src={zoomedImage.src} alt={zoomedImage.alt} onClose={() => setZoomedImage(null)} />
      )}
    </div>
  );
}
