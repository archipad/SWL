import type { KeywordDef } from '../types';
import type { ResolvedTag } from '../lib/combat';
import { DefinitionText } from '../lib/diceIcons';

interface Props {
  resolved: ResolvedTag[];
  /** Affiche la carte d'origine du mot-clé (utile quand plusieurs cartes sont fusionnées, ex. écran Combat). */
  showSource?: boolean;
}

const IMPACT_ORDER: { id: KeywordDef['impact']; label: string }[] = [
  { id: 'attaque', label: 'Attaque' },
  { id: 'défense', label: 'Défense' },
  { id: 'autre', label: 'Autre' },
];

export function KeywordDefinitionList({ resolved, showSource }: Props) {
  if (resolved.length === 0) return null;

  return (
    <div className="card-row-definitions">
      {IMPACT_ORDER.map(({ id, label }) => {
        const items = resolved.filter((r) => r.def.impact === id);
        if (items.length === 0) return null;
        return (
          <div key={id} className="card-row-definitions-group">
            <span className="card-row-definitions-heading">{label}</span>
            {items.map(({ tag, def, source }) => (
              <p key={tag.keywordId} className="card-row-definition">
                <strong>{def.name}{def.hasValue && tag.value ? ` ${tag.value}` : ''}</strong>
                {' — '}<DefinitionText text={def.definition} />
                {showSource && <span className="card-row-definition-source"> ({source})</span>}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
