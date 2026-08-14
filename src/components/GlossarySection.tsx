import { useMemo } from 'react';
import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';
import { buildGlossary } from '../lib/glossary';

interface Props {
  list: ParsedList;
  tagLibrary: CardTagLibrary;
  keywords: KeywordDef[];
}

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
      {entries.map((e) => (
        <div key={e.keyword.id} className="glossary-entry">
          <h3>{e.keyword.name}</h3>
          <p>{e.keyword.definition}</p>
          <p className="glossary-cards">Sur : {e.cards.join(', ')}</p>
        </div>
      ))}
    </div>
  );
}
