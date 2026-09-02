import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';
import { buildRoster, resolveUnitKeywords, type PlayerId, type ResolvedTag, type RosterEntry } from '../lib/combat';
import { KeywordDefinitionList } from './KeywordDefinitionList';
import { usePersistentState } from '../lib/storage';
import { CARD_IMAGES } from '../data/cardImages';
import { normalizeName } from '../lib/normalize';
import { frenchCardName } from '../lib/cardNames';
import { detectInteractions } from '../lib/keywordInteractions';
import { AttackSequenceGuide } from './AttackSequenceGuide';
import { DiceProbabilities } from './DiceProbabilities';
import { CombatPitfalls } from './CombatPitfalls';

interface Props {
  listP1: ParsedList | null;
  listP2: ParsedList | null;
  tagLibrary: CardTagLibrary;
  keywords: KeywordDef[];
}

/** Combine joueur + clé d'unité : deux unités de listes différentes peuvent partager la même clé. */
function entryId(entry: RosterEntry): string {
  return `${entry.player}:${entry.unit.key}`;
}

function findEntry(roster: RosterEntry[], id: string): RosterEntry | undefined {
  return roster.find((e) => entryId(e) === id);
}

function Side({
  role, entry, resolved, highlightedIds,
}: {
  role: 'Attaquant' | 'Défenseur';
  entry: RosterEntry | undefined;
  resolved: ResolvedTag[];
  highlightedIds: Set<string>;
}) {
  if (!entry) {
    return (
      <div className={`combat-side combat-side-${role === 'Attaquant' ? 'attack' : 'defense'}`}>
        <h3 className="combat-side-role">{role}</h3>
        <p className="empty-hint">Choisissez une unité ci-dessus.</p>
      </div>
    );
  }

  const imageSrc = CARD_IMAGES[normalizeName(entry.unit.name)];

  return (
    <div className={`combat-side combat-side-${role === 'Attaquant' ? 'attack' : 'defense'}`}>
      <h3 className="combat-side-role">{role}</h3>
      <p className="combat-side-player">{entry.playerLabel}</p>
      {imageSrc && (
        <img
          className="combat-side-image"
          src={imageSrc}
          alt={`Carte ${frenchCardName(entry.unit.name)}`}
          loading="lazy"
          // Se cache proprement si l'image n'est pas servable (ex. miroir Artifact
          // à fichier unique, où public/cards/ n'existe pas) plutôt que d'afficher
          // l'icône d'image cassée du navigateur.
          onError={(e) => { e.currentTarget.hidden = true; }}
        />
      )}
      <div className="combat-side-head">
        <span className="card-row-name">{frenchCardName(entry.unit.name)}</span>
        {entry.unit.points !== undefined && <span className="card-row-points">{entry.unit.points}</span>}
      </div>
      {entry.unit.upgrades.length > 0 && (
        <p className="combat-side-upgrades">
          Équipée de : {entry.unit.upgrades.map((u) => frenchCardName(u.name)).join(', ')}
        </p>
      )}
      {resolved.length === 0 ? (
        <p className="empty-hint">
          Aucun mot-clé renseigné pour cette carte — ouvrez l'onglet Armées pour les ajouter.
        </p>
      ) : (
        <KeywordDefinitionList resolved={resolved} showSource={entry.unit.upgrades.length > 0} highlightedIds={highlightedIds} />
      )}
    </div>
  );
}

export function CombatScreen({ listP1, listP2, tagLibrary, keywords }: Props) {
  const roster = buildRoster(listP1, listP2);
  const [attackerId, setAttackerId] = usePersistentState<string>('swl.combat-attacker.v1', '');
  const [defenderId, setDefenderId] = usePersistentState<string>('swl.combat-defender.v1', '');
  const [view, setView] = usePersistentState<'sequence' | 'keywords'>('swl.combat-view.v1', 'sequence');

  const attacker = findEntry(roster, attackerId);
  const defender = findEntry(roster, defenderId);

  const attackerResolved = attacker ? resolveUnitKeywords(attacker.unit, tagLibrary, keywords) : [];
  const defenderResolved = defender ? resolveUnitKeywords(defender.unit, tagLibrary, keywords) : [];
  const interactions = attacker && defender ? detectInteractions(attackerResolved, defenderResolved) : [];
  const highlightedAttackerIds = new Set(interactions.map((i) => i.attackerKeywordId));
  const highlightedDefenderIds = new Set(interactions.map((i) => i.defenderKeywordId));

  const swap = () => {
    setAttackerId(defenderId);
    setDefenderId(attackerId);
  };

  const groupedByPlayer = (player: PlayerId) => roster.filter((e) => e.player === player);

  return (
    <div className="combat-screen no-print">
      <h2>Résolution de combat</h2>
      <p className="import-note">
        Choisissez l'unité qui attaque et celle qui défend : les mots-clés des deux camps (unité +
        améliorations équipées) apparaissent, selon la vue choisie, étape par étape dans l'ordre
        officiel de l'attaque, ou groupés par impact pour une consultation rapide.
      </p>
      <div className="combat-selectors">
        <label className="field">
          Attaquant
          <select value={attackerId} onChange={(e) => setAttackerId(e.target.value)}>
            <option value="">— Choisir —</option>
            <optgroup label={groupedByPlayer('p1')[0]?.playerLabel ?? 'Joueur 1'}>
              {groupedByPlayer('p1').map((e) => (
                <option key={entryId(e)} value={entryId(e)}>{frenchCardName(e.unit.name)}</option>
              ))}
            </optgroup>
            <optgroup label={groupedByPlayer('p2')[0]?.playerLabel ?? 'Joueur 2'}>
              {groupedByPlayer('p2').map((e) => (
                <option key={entryId(e)} value={entryId(e)}>{frenchCardName(e.unit.name)}</option>
              ))}
            </optgroup>
          </select>
        </label>
        <button type="button" className="btn btn-ghost combat-swap" onClick={swap} disabled={!attackerId && !defenderId}>
          ⇄ Inverser
        </button>
        <label className="field">
          Défenseur
          <select value={defenderId} onChange={(e) => setDefenderId(e.target.value)}>
            <option value="">— Choisir —</option>
            <optgroup label={groupedByPlayer('p1')[0]?.playerLabel ?? 'Joueur 1'}>
              {groupedByPlayer('p1').map((e) => (
                <option key={entryId(e)} value={entryId(e)}>{frenchCardName(e.unit.name)}</option>
              ))}
            </optgroup>
            <optgroup label={groupedByPlayer('p2')[0]?.playerLabel ?? 'Joueur 2'}>
              {groupedByPlayer('p2').map((e) => (
                <option key={entryId(e)} value={entryId(e)}>{frenchCardName(e.unit.name)}</option>
              ))}
            </optgroup>
          </select>
        </label>
      </div>

      <DiceProbabilities />

      <div className="btn-group combat-view-toggle">
        <button type="button" className={view === 'sequence' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setView('sequence')}>
          Étapes de l'attaque
        </button>
        <button type="button" className={view === 'keywords' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setView('keywords')}>
          Mots-clés (vue rapide)
        </button>
      </div>

      {view === 'keywords' && interactions.length > 0 && (
        <div className="combat-interactions">
          <h3 className="combat-interactions-heading">⚡ Interactions entre les deux camps</h3>
          <ul>
            {interactions.map((i) => (
              <li key={`${i.attackerKeywordId}:${i.defenderKeywordId}`}>{i.note}</li>
            ))}
          </ul>
        </div>
      )}

      {view === 'sequence' ? (
        <>
          <CombatPitfalls />
          {attacker && defender ? (
            <AttackSequenceGuide
              attacker={attacker}
              defender={defender}
              attackerResolved={attackerResolved}
              defenderResolved={defenderResolved}
              interactions={interactions}
              resetKey={`${attackerId}:${defenderId}`}
            />
          ) : (
            <p className="empty-hint">Choisissez un attaquant et un défenseur pour dérouler la séquence.</p>
          )}
        </>
      ) : (
        <div className="combat-columns">
          <Side role="Attaquant" entry={attacker} resolved={attackerResolved} highlightedIds={highlightedAttackerIds} />
          <div className="combat-vs">VS</div>
          <Side role="Défenseur" entry={defender} resolved={defenderResolved} highlightedIds={highlightedDefenderIds} />
        </div>
      )}
    </div>
  );
}
