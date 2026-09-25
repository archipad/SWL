import { useEffect, useState } from 'react';
import type { CommandCard } from '../data/commandCards';
import { commandCardById, commandFactionForList, eligibleCommandCards, suiteIsComplete, suitePipCounts } from '../lib/commandDeck';
import { readGameActions, recordGameAction, removeGameAction, type GameActionEntry } from '../lib/gameActionHistory';
import type { BattleColor, CommandDeckState, useGameTracker } from '../lib/useGameTracker';
import { DEFAULT_STATE } from '../lib/useGameTracker';
import { SideDot, UiIcon } from '../lib/uiIcons';
import type { ParsedList } from '../types';

/** Ordres Permanents (4 PIP) est obligatoire et unique : jamais un vrai
 * choix, donc jamais une tuile à cliquer (voir la philosophie « pas de clic
 * pour un choix forcé » déjà appliquée à la sélection d'arme unique dans
 * l'Assistant) -- elle est ajoutée automatiquement à la suite. */
const withStandingOrders = (suite: string[]) => (suite.includes('ordres-permanents') ? suite : [...suite, 'ordres-permanents']);

interface Props {
  listP1: ParsedList | null;
  listP2: ParsedList | null;
  tracker: ReturnType<typeof useGameTracker>;
  onSync: (state: ReturnType<typeof useGameTracker>['state']) => void;
}

function playerLabel(list: ParsedList | null, fallback: string): string {
  return list?.listName ?? list?.faction ?? fallback;
}

/** Vignette visuelle d'une carte (image + PIP), même grammaire que les
 * armes/couvert de l'écran de résolution de l'Assistant : tuile cliquable,
 * bordure + halo orange quand sélectionnée, jamais de liste texte seule.
 * La loupe (agrandissement, pour lire le texte de règles) est un bouton
 * frère indépendant — jamais imbriqué dans le bouton de sélection (HTML
 * n'autorise pas un bouton dans un bouton), et jamais désactivée même
 * quand la sélection l'est (carte déjà jouée, PIP complet…). */
function CardTile({ card, selected, onSelect, onZoom }: { card: CommandCard; selected: boolean; onSelect?: () => void; onZoom?: () => void }) {
  return (
    <div className={`card-tile ${selected ? 'on' : ''} ${onSelect ? '' : 'inert'}`}>
      <button type="button" className="card-tile-select" onClick={onSelect} disabled={!onSelect} title={card.requirement}>
        <span className="card-tile-badge">PIP {card.pip}</span>
        {selected && <span className="card-tile-check">✓</span>}
        {card.image ? <img src={card.image} alt={card.name} loading="lazy" /> : <span className="card-tile-noimage">{card.name}</span>}
        <span className="card-tile-name">{card.name}</span>
      </button>
      {onZoom && card.image && (
        <button type="button" className="card-tile-zoom" aria-label={`Agrandir ${card.name}`} onClick={onZoom}><UiIcon id="zoom" /></button>
      )}
    </div>
  );
}

export function CommandCardsScreen({ listP1, listP2, tracker, onSync }: Props) {
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  const [activeColor, setActiveColor] = useState<BattleColor>('bleu');
  // Choix « brouillon » avant confirmation : local et non synchronisé, pour
  // qu'un mauvais clic ne divulgue rien à l'adversaire et pour garder une
  // étape de confirmation explicite avant d'engager la carte du round.
  const [draft, setDraft] = useState<{ bleu: string; rouge: string }>({ bleu: '', rouge: '' });
  const [editingSuite, setEditingSuite] = useState<{ bleu: boolean; rouge: boolean }>({ bleu: false, rouge: false });
  const [actionHistory, setActionHistory] = useState<GameActionEntry[]>(readGameActions);

  const { state, patch } = tracker;
  const update = (changes: Partial<typeof state>, label: string) => {
    const next = { ...state, ...changes };
    if (JSON.stringify(next) === JSON.stringify(state)) return;
    setActionHistory(recordGameAction(label, state));
    patch(changes);
    onSync(next);
  };
  const undoLastAction = () => {
    const latest = actionHistory.find((entry) => !entry.undoneAt);
    if (!latest) return;
    tracker.replace(latest.before);
    onSync(latest.before);
    setActionHistory(removeGameAction(latest.id));
  };

  const commandDecks = state.commandDecks ?? DEFAULT_STATE.commandDecks;
  const commandReveal = state.commandReveal ?? null;
  const revealedThisRound = commandReveal?.round === state.round;
  const p1Label = playerLabel(listP1, 'Joueur 1');
  const p2Label = playerLabel(listP2, 'Joueur 2');
  const labelFor = (color: BattleColor) => (state.p1Color === color ? p1Label : p2Label);
  const listFor = (color: BattleColor) => (state.p1Color === color ? listP1 : listP2);
  const zoom = (card: CommandCard) => card.image && setPreview({ src: card.image, alt: card.name });

  const setDeck = (color: BattleColor, changes: Partial<CommandDeckState>, label: string) =>
    update({ commandDecks: { ...commandDecks, [color]: { ...commandDecks[color], ...changes } } }, label);

  // Ordres Permanents (obligatoire, sans alternative) n'est jamais retiré ou
  // recliqué : on s'assure juste, une fois au montage, qu'elle est bien dans
  // les deux suites (compatibilité avec une suite construite avant ce
  // correctif, ou tout juste commencée) -- sans clic ni confirmation, comme
  // tout choix qui n'en est pas vraiment un.
  useEffect(() => {
    const bleuSuite = withStandingOrders(commandDecks.bleu.suite);
    const rougeSuite = withStandingOrders(commandDecks.rouge.suite);
    if (bleuSuite === commandDecks.bleu.suite && rougeSuite === commandDecks.rouge.suite) return;
    update({ commandDecks: { bleu: { ...commandDecks.bleu, suite: bleuSuite }, rouge: { ...commandDecks.rouge, suite: rougeSuite } } }, 'Ordres Permanents ajoutée automatiquement');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refresh = () => setActionHistory(readGameActions());
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); };
  }, []);

  const toggleSuiteCard = (color: BattleColor, card: CommandCard) => {
    if (card.id === 'ordres-permanents') return; // jamais un vrai choix (voir plus haut)
    const deck = commandDecks[color];
    if (deck.suite.includes(card.id)) {
      setDeck(color, { suite: deck.suite.filter((id) => id !== card.id) }, `Suite de Commandement ${color} : ${card.name} retirée`);
      return;
    }
    const sameCount = deck.suite.filter((id) => commandCardById(id)?.pip === card.pip).length;
    if (sameCount >= 2) return; // règle officielle : 2 cartes maximum par PIP (bouton déjà inerte, sécurité supplémentaire)
    setDeck(color, { suite: [...deck.suite, card.id] }, `Suite de Commandement ${color} : ${card.name} ajoutée`);
  };

  const resetSuite = (color: BattleColor) => {
    if (!window.confirm(`Réinitialiser la suite de ${labelFor(color)} ? Les cartes déjà choisies (hors Ordres Permanents) seront retirées.`)) return;
    setDeck(color, { suite: ['ordres-permanents'] }, `Suite de Commandement ${color} réinitialisée`);
    setEditingSuite((prev) => ({ ...prev, [color]: true }));
  };

  const confirmPick = (color: BattleColor) => {
    const cardId = draft[color];
    if (!cardId) return;
    setDeck(color, { pendingId: cardId }, `Carte de Commandement ${color} engagée`);
    setDraft((prev) => ({ ...prev, [color]: '' }));
  };
  const cancelPending = (color: BattleColor) => setDeck(color, { pendingId: null }, `Carte de Commandement ${color} : choix annulé`);
  const reveal = () => {
    const bleuId = commandDecks.bleu.pendingId;
    const rougeId = commandDecks.rouge.pendingId;
    if (!bleuId || !rougeId) return;
    update({
      commandDecks: {
        bleu: { ...commandDecks.bleu, pendingId: null, played: [...commandDecks.bleu.played, bleuId] },
        rouge: { ...commandDecks.rouge, pendingId: null, played: [...commandDecks.rouge.played, rougeId] },
      },
      commandReveal: { round: state.round, bleuId, rougeId },
    }, 'Cartes de Commandement révélées');
  };

  const statusFor = (color: BattleColor): string => {
    const deck = commandDecks[color];
    if (!suiteIsComplete(deck.suite)) return 'suite en construction';
    if (revealedThisRound) return 'carte révélée';
    if (deck.pendingId) return 'carte engagée ✓';
    return 'en train de choisir…';
  };

  const renderSide = (color: BattleColor) => {
    const deck = commandDecks[color];
    const faction = commandFactionForList(listFor(color));
    const eligible = eligibleCommandCards(faction);
    const complete = suiteIsComplete(deck.suite);
    const counts = suitePipCounts(deck.suite);
    const remaining = deck.suite.filter((id) => !deck.played.includes(id));
    const revealedCardId = revealedThisRound ? (color === 'bleu' ? commandReveal!.bleuId : commandReveal!.rougeId) : null;
    const revealedCard = revealedCardId ? commandCardById(revealedCardId) : null;
    const standingOrders = commandCardById('ordres-permanents')!;

    if (!complete || editingSuite[color]) {
      return (
        <div className="command-phase">
          <p className="step-help">
            1. Construisez la suite de {labelFor(color)} : exactement 2 cartes à 1 PIP, 2 à 2 PIP, 2 à 3 PIP, plus Ordres Permanents (déjà incluse).
            Touchez une carte pour l’ajouter ou la retirer, la loupe pour la lire en grand.
          </p>
          {!faction && (
            <p className="empty-hint">
              Faction non reconnue pour cette liste (le texte importé ne contient ni « Empire » ni « Rebel ») : seule Ordres Permanents est proposée.
            </p>
          )}
          <p className={`command-progress ${complete ? 'done' : 'todo'}`}>
            {deck.suite.length}/7 cartes — PIP 1 : {counts[1]}/2 · PIP 2 : {counts[2]}/2 · PIP 3 : {counts[3]}/2 · Ordres Permanents inclus
          </p>
          <div className="command-builder-actions">
            {complete && <button type="button" className="btn btn-ghost" onClick={() => setEditingSuite((prev) => ({ ...prev, [color]: false }))}>Terminé</button>}
            <button type="button" className="btn btn-ghost btn-danger" disabled={deck.played.length > 0} title={deck.played.length > 0 ? 'Impossible : des cartes de cette suite ont déjà été jouées cette partie.' : undefined} onClick={() => resetSuite(color)}>
              <UiIcon id="reset" />Réinitialiser la suite
            </button>
          </div>
          <div className="command-pip-block">
            <h4>PIP 4 (obligatoire)</h4>
            <div className="card-tile-grid card-tile-grid-single">
              <CardTile card={standingOrders} selected />
            </div>
          </div>
          {([1, 2, 3] as const).map((pip) => (
            <div className="command-pip-block" key={pip}>
              <h4>PIP {pip}</h4>
              <div className="card-tile-grid">
                {eligible.filter((c) => c.pip === pip).map((card) => {
                  const selected = deck.suite.includes(card.id);
                  const pipFull = counts[pip] >= 2 && !selected;
                  return <CardTile key={card.id} card={card} selected={selected} onSelect={pipFull ? undefined : () => toggleSuiteCard(color, card)} onZoom={() => zoom(card)} />;
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="command-phase">
        <p className="step-help">2. Chaque round, choisissez une carte en secret parmi celles restantes de {labelFor(color)}.</p>
        <div className="command-builder-actions">
          <p className="command-progress done">✓ Suite complète — {deck.played.length}/7 déjà jouée{deck.played.length > 1 ? 's' : ''}</p>
          <button type="button" className="btn btn-ghost" onClick={() => setEditingSuite((prev) => ({ ...prev, [color]: true }))}>Modifier la suite</button>
        </div>

        {revealedThisRound && revealedCard ? (
          <div className="command-reveal-card">
            <span className="command-status-badge command-status-done">✓ Révélée — round {state.round}</span>
            <div className="card-tile-grid card-tile-grid-single">
              <CardTile card={revealedCard} selected onZoom={() => zoom(revealedCard)} />
            </div>
          </div>
        ) : deck.pendingId ? (
          <div className="command-locked">
            <span className="command-status-badge command-status-pending">✓ Carte engagée — cachée jusqu’à la révélation</span>
            <button type="button" className="btn btn-ghost" onClick={() => cancelPending(color)}>Changer mon choix</button>
          </div>
        ) : draft[color] ? (
          <div className="command-draft">
            <div className="card-tile-grid card-tile-grid-single">
              <CardTile card={commandCardById(draft[color])!} selected onZoom={() => zoom(commandCardById(draft[color])!)} />
            </div>
            <div className="command-draft-actions">
              <button type="button" className="btn btn-primary phase-confirm" onClick={() => confirmPick(color)}>Confirmer ce choix</button>
              <button type="button" className="btn btn-ghost" onClick={() => setDraft((prev) => ({ ...prev, [color]: '' }))}>Annuler</button>
            </div>
          </div>
        ) : remaining.length ? (
          <div className="card-tile-grid">
            {remaining.map((id) => {
              const card = commandCardById(id)!;
              return <CardTile key={id} card={card} selected={false} onSelect={() => setDraft((prev) => ({ ...prev, [color]: id }))} onZoom={() => zoom(card)} />;
            })}
          </div>
        ) : (
          <p className="empty-hint">Toutes les cartes de la suite ont déjà été jouées.</p>
        )}

        {deck.played.length > 0 && (
          <details className="command-played-fold">
            <summary>Cartes déjà jouées ({deck.played.length})</summary>
            <div className="card-tile-grid card-tile-grid-compact">
              {deck.played.map((id) => { const card = commandCardById(id)!; return <CardTile key={id} card={card} selected onZoom={() => zoom(card)} />; })}
            </div>
          </details>
        )}
      </div>
    );
  };

  const otherColor: BattleColor = activeColor === 'bleu' ? 'rouge' : 'bleu';

  return (
    <div className="command-cards-screen no-print">
      <header className="command-cards-header">
        <span className="tracker-eyebrow">Centre de commandement</span>
        <h2>Cartes de Commandement</h2>
        <button type="button" className="btn btn-ghost command-undo-btn" disabled={!actionHistory.some((entry) => !entry.undoneAt)} onClick={undoLastAction}><UiIcon id="undo" />Annuler la dernière action</button>
      </header>

      <div className="command-duel">
        <strong className={activeColor === 'bleu' ? 'active' : ''}><SideDot color="bleu" />{labelFor('bleu')}</strong>
        <span>Suite de Commandement</span>
        <strong className={activeColor === 'rouge' ? 'active' : ''}><SideDot color="rouge" />{labelFor('rouge')}</strong>
      </div>

      <div className="segmented-tabs">
        <button type="button" className={`segmented-tab ${activeColor === 'bleu' ? 'active' : ''}`} onClick={() => setActiveColor('bleu')}>
          <SideDot color="bleu" />{labelFor('bleu')}
        </button>
        <button type="button" className={`segmented-tab ${activeColor === 'rouge' ? 'active' : ''}`} onClick={() => setActiveColor('rouge')}>
          <SideDot color="rouge" />{labelFor('rouge')}
        </button>
      </div>

      <p className="command-adversary-status">
        <SideDot color={otherColor} />{labelFor(otherColor)} : {statusFor(otherColor)}
      </p>

      {renderSide(activeColor)}

      {commandDecks.bleu.pendingId && commandDecks.rouge.pendingId && !revealedThisRound && (
        <button type="button" className="btn btn-primary btn-large command-reveal-btn" onClick={reveal}>
          <UiIcon id="cards" />Révéler les cartes du round {state.round}
        </button>
      )}

      {preview && (
        <div className="tracker-card-preview" role="dialog" aria-modal="true" aria-label={preview.alt} onClick={() => setPreview(null)}>
          <button type="button" aria-label="Fermer" onClick={() => setPreview(null)}>×</button>
          <img src={preview.src} alt={preview.alt} />
        </div>
      )}
    </div>
  );
}
