import { useMemo } from 'react';
import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';
import { buildGlossary } from '../lib/glossary';

interface Props {
  list: ParsedList;
  tagLibrary: CardTagLibrary;
  keywords: KeywordDef[];
}

const IMPACT_GROUPS: { id: KeywordDef['impact']; label: string }[] = [
  { id: 'attaque', label: 'Attaque' },
  { id: 'défense', label: 'Défense' },
  { id: 'autre', label: 'Autre' },
];

export function GlossarySection({ list, tagLibrary, keywords }: Props) {
  const entries = useMemo(() => buildGlossary(list, tagLibrary, keywords), [list, tagLibrary, keywords]);

  if (entries.length === 0) {
    return (
      <p className="empty-hint">
        Aucun mot-clé n'a encore été renseigné pour cette liste. Ouvrez chaque carte (bouton
        « + mot-clé ») pour les ajouter — ils seront mémorisés et réapparaîtront automatiquement
        la prochaine fois que vous jouerez cette carte.
      </p>
    );
  }

  return (
    <div className="glossary">
      {IMPACT_GROUPS.map(({ id, label }) => {
        const items = entries.filter((e) => e.keyword.impact === id);
        if (items.length === 0) return null;
        return (
          <div key={id} className="glossary-impact-group">
            <h3 className="glossary-impact-heading">{label}</h3>
            {items.map((e) => (
              <div key={e.keyword.id} className="glossary-entry">
                <h4>{e.keyword.name}</h4>
                <p>{e.keyword.definition}</p>
                <p className="glossary-cards">Sur : {e.cards.join(', ')}</p>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
