import { useState } from 'react';
import type { CardKeywordTag, KeywordDef, ParsedCard } from '../types';
import { KeywordTagEditor } from './KeywordTagEditor';
import { KeywordDefinitionList } from './KeywordDefinitionList';
import { stripDiceTokens } from '../lib/diceIcons';

interface Props {
  card: ParsedCard;
  tags: CardKeywordTag[];
  keywords: KeywordDef[];
  onAddTag: (cardName: string, keywordId: string, value?: number) => void;
  onRemoveTag: (cardName: string, keywordId: string) => void;
  onCreateKeyword: (kw: KeywordDef) => void;
}

export function CardRow({ card, tags, keywords, onAddTag, onRemoveTag, onCreateKeyword }: Props) {
  const [editing, setEditing] = useState(false);
  const byId = new Map(keywords.map((k) => [k.id, k]));

  const resolved = tags
    .map((t) => ({ tag: t, def: byId.get(t.keywordId), source: card.name }))
    .filter((r): r is { tag: CardKeywordTag; def: KeywordDef; source: string } => !!r.def);

  return (
    <div className={`card-row card-row-${card.kind}`}>
      <div className="card-row-head">
        <span className="card-row-name">{card.name}</span>
        {card.points !== undefined && <span className="card-row-points">{card.points}</span>}
      </div>
      <div className="card-row-tags">
        {resolved.map(({ tag, def }) => (
          <span key={tag.keywordId} className="chip" title={stripDiceTokens(def.definition)}>
            {def.name}{def.hasValue && tag.value ? ` ${tag.value}` : ''}
            <button
              type="button"
              className="chip-remove"
              aria-label={`Retirer ${def.name}`}
              onClick={() => onRemoveTag(card.name, tag.keywordId)}
            >
              ×
            </button>
          </span>
        ))}
        {!editing && (
          <button type="button" className="chip chip-add" onClick={() => setEditing(true)}>
            + mot-clé
          </button>
        )}
      </div>
      {editing && (
        <KeywordTagEditor
          keywords={keywords}
          existingIds={new Set(tags.map((t) => t.keywordId))}
          onAdd={(id, value) => onAddTag(card.name, id, value)}
          onCreateKeyword={onCreateKeyword}
          onClose={() => setEditing(false)}
        />
      )}
      <KeywordDefinitionList resolved={resolved} />
    </div>
  );
}
