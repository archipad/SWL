import type { KeywordDef } from '../types';
import type { ResolvedTag } from '../lib/combat';
import { DefinitionText } from '../lib/diceIcons';
import { shortDef } from '../lib/keywordText';
import { frenchCardName } from '../lib/cardNames';

interface Props {
  resolved: ResolvedTag[];
  /** Affiche la carte d'origine du mot-clé (utile quand plusieurs cartes sont fusionnées, ex. écran Combat). */
  showSource?: boolean;
  /** keywordId à faire ressortir visuellement (ex. interaction avec le camp adverse, écran Combat). */
  highlightedIds?: Set<string>;
}

const IMPACT_ORDER: { id: KeywordDef['impact']; label: string }[] = [
  { id: 'attaque', label: 'Attaque' },
  { id: 'défense', label: 'Défense' },
  { id: 'autre', label: 'Autre' },
];

export function KeywordDefinitionList({ resolved, showSource, highlightedIds }: Props) {
  if (resolved.length === 0) return null;

  return (
    <div className="card-row-definitions">
      {IMPACT_ORDER.map(({ id, label }) => {
        const items = resolved.filter((r) => r.def.impact === id);
        if (items.length === 0) return null;
        return (
          <div key={id} className="card-row-definitions-group">
            <span className="card-row-definitions-heading">{label}</span>
            {items.map(({ tag, def, source }) => {
              const highlighted = highlightedIds?.has(tag.keywordId) ?? false;
              return (
                <p
                  key={tag.keywordId}
                  className={highlighted ? 'card-row-definition card-row-definition-highlight' : 'card-row-definition'}
                >
                  {highlighted && <span className="card-row-definition-bolt" title="Interagit avec le camp adverse">⚡</span>}
                  <strong>{def.name}{def.hasValue && tag.value ? ` ${tag.value}` : ''}</strong>
                  {' — '}<DefinitionText text={shortDef(def)} />
                  {showSource && <span className="card-row-definition-source"> ({frenchCardName(source)})</span>}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
