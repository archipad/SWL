import type { CardKeywordTag, CardTagLibrary, KeywordDef, ParsedList } from '../types';
import { CardRow } from './CardRow';
import { GlossarySection } from './GlossarySection';
import { DiceIcon } from '../lib/diceIcons';

interface Props {
  list: ParsedList;
  playerLabel: string;
  tagLibrary: CardTagLibrary;
  keywords: KeywordDef[];
  getTags: (cardName: string) => CardKeywordTag[];
  onAddTag: (cardName: string, keywordId: string, value?: number) => void;
  onRemoveTag: (cardName: string, keywordId: string) => void;
  onCreateKeyword: (kw: KeywordDef) => void;
  onChangeList: () => void;
}

export function ArmyScreen({
  list, playerLabel, tagLibrary, keywords, getTags, onAddTag, onRemoveTag, onCreateKeyword, onChangeList,
}: Props) {
  const sections = new Map<string, typeof list.units>();
  for (const unit of list.units) {
    const arr = sections.get(unit.section) ?? [];
    arr.push(unit);
    sections.set(unit.section, arr);
  }

  return (
    <div className="army-screen">
      <div className="no-print army-toolbar">
        <div>
          <p className="army-player-label">{playerLabel}</p>
          {list.listName && <p className="army-faction">{list.listName}</p>}
          {list.faction && <p className="army-points">{list.faction}</p>}
          {(list.totalPoints !== undefined || list.pointsLimit !== undefined) && (
            <p className="army-points">
              {list.totalPoints ?? '?'}
              {list.pointsLimit !== undefined ? ` / ${list.pointsLimit}` : ''} points
            </p>
          )}
          {(list.commandCards?.length || list.contingencies?.length || list.battleForce) && (
            <p className="army-points">
              {list.battleForce ? `Force de combat : ${list.battleForce}. ` : ''}
              {list.commandCards?.length ? `Commandement : ${list.commandCards.join(', ')}. ` : ''}
              {list.contingencies?.length ? `Contingences : ${list.contingencies.join(', ')}.` : ''}
            </p>
          )}
        </div>
        <div className="army-toolbar-actions">
          <button type="button" className="btn btn-ghost" onClick={onChangeList}>Changer la liste</button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>Imprimer le glossaire</button>
        </div>
      </div>

      <section className="no-print">
        <h2>Composition de la liste</h2>
        {[...sections.entries()].map(([section, units]) => (
          <div key={section} className="army-section">
            <h3>{section}</h3>
            {units.map((unit) => (
              <div key={unit.key} className="army-unit">
                <CardRow
                  card={unit}
                  tags={getTags(unit.name)}
                  keywords={keywords}
                  onAddTag={onAddTag}
                  onRemoveTag={onRemoveTag}
                  onCreateKeyword={onCreateKeyword}
                />
                {unit.upgrades.length > 0 && (
                  <div className="army-upgrades">
                    {unit.upgrades.map((up) => (
                      <CardRow
                        key={up.key}
                        card={up}
                        tags={getTags(up.name)}
                        keywords={keywords}
                        onAddTag={onAddTag}
                        onRemoveTag={onRemoveTag}
                        onCreateKeyword={onCreateKeyword}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        {list.unparsedLines.length > 0 && (
          <details className="unparsed-lines">
            <summary>{list.unparsedLines.length} ligne(s) non reconnue(s) à l'import</summary>
            <pre>{list.unparsedLines.join('\n')}</pre>
          </details>
        )}
      </section>

      <section className="glossary-section">
        <h2 className="print-title">
          Glossaire — {list.listName ?? list.faction ?? 'Liste'}
          {list.totalPoints !== undefined ? ` (${list.totalPoints} pts)` : ''}
        </h2>
        <p className="import-note no-print">
          Classé par impact : ce que ce mot-clé change pour la carte qui le porte, quand elle
          attaque, quand elle défend, ou autre chose (mouvement, commandement...).
        </p>
        <p className="icon-legend">
          <DiceIcon type="bloc" /> Bloc · <DiceIcon type="critique" /> Critique ·{' '}
          <DiceIcon type="touche" /> Touche · <DiceIcon type="adr-atq" /> Adrénaline (attaque) ·{' '}
          <DiceIcon type="adr-def" /> Adrénaline (défense) · <strong>①②③</strong> portée/distance
        </p>
        <GlossarySection list={list} tagLibrary={tagLibrary} keywords={keywords} />
      </section>
    </div>
  );
}
