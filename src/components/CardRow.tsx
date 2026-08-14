import { useState } from 'react';
import type { CardKeywordTag, KeywordDef, ParsedCard } from '../types';
import { KeywordTagEditor } from './KeywordTagEditor';

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

  return (
    <div className={`card-row card-row-${card.kind}`}>
      <div className="card-row-head">
        <span className="card-row-name">{card.name}</span>
        {card.points !== undefined && <span className="card-row-points">{card.points}</span>}
      </div>
      <div className="card-row-tags">
        {tags.map((t) => {
          const def = byId.get(t.keywordId);
          if (!def) return null;
          return (
            <span key={t.keywordId} className="chip" title={def.definition}>
              {def.name}{def.hasValue && t.value ? ` ${t.value}` : ''}
              <button
                type="button"
                className="chip-remove"
                aria-label={`Retirer ${def.name}`}
                onClick={() => onRemoveTag(card.name, t.keywordId)}
              >
                ×
              </button>
            </span>
          );
        })}
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
    </div>
  );
}
