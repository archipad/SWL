import { useMemo } from 'react';
import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';
import { buildGlossary, buildCardNotes } from '../lib/glossary';
import { DefinitionText } from '../lib/diceIcons';

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

/**
 * Cartes à effet propre (cardNotes.ts) : pas un mot-clé du glossaire, donc
 * une section à part plutôt que mêlée aux groupes attaque/défense/autre
 * ci-dessus (qui n'ont de sens que pour un vrai KeywordDef.impact).
 */
function CardNotesGroup({ list }: { list: ParsedList }) {
  const notes = useMemo(() => buildCardNotes(list), [list]);
  if (notes.length === 0) return null;
  return (
    <div className="glossary-impact-group">
      <h3 className="glossary-impact-heading">Effets propres aux cartes</h3>
      {notes.map((n) => (
        <div key={n.displayName} className="glossary-entry">
          <h4>{n.displayName}</h4>
          <p><DefinitionText text={n.note} /></p>
        </div>
      ))}
    </div>
  );
}

export function GlossarySection({ list, tagLibrary, keywords }: Props) {
  const entries = useMemo(() => buildGlossary(list, tagLibrary, keywords), [list, tagLibrary, keywords]);
  const hasNotes = useMemo(() => buildCardNotes(list).length > 0, [list]);

  if (entries.length === 0 && !hasNotes) {
    return (
      <p className="empty-hint">
        Aucun mot-clé n'a encore été renseigné pour cette liste. Ouvrez chaque carte (bouton
        « + mot-clé ») pour les ajouter — ils seront mémorisés et réapparaîtront automatiquement
        la prochaine fois que vous jouerez cette carte.
      </p>
    );
  }

  return (
    <>
      {/* Écran : groupé par impact (attaque/défense/autre) — utile pour situer
          un mot-clé pendant la partie, quand on sait déjà dans quel contexte
          il s'applique. */}
      <div className="glossary no-print">
        {IMPACT_GROUPS.map(({ id, label }) => {
          const items = entries.filter((e) => e.keyword.impact === id);
          if (items.length === 0) return null;
          return (
            <div key={id} className="glossary-impact-group">
              <h3 className="glossary-impact-heading">{label}</h3>
              {items.map((e) => (
                <div key={e.keyword.id} className="glossary-entry">
                  <h4>{e.keyword.name}</h4>
                  <p><DefinitionText text={e.keyword.definition} /></p>
                  <p className="glossary-cards">Sur : {e.cards.join(', ')}</p>
                </div>
              ))}
            </div>
          );
        })}
        <CardNotesGroup list={list} />
      </div>
      {/* Impression : liste unique triée par ordre alphabétique — sur papier on
          cherche un nom précis, pas une catégorie, donc pas de groupes à
          parcourir. entries est déjà trié par buildGlossary(). */}
      <div className="glossary print-only">
        {entries.map((e) => (
          <div key={e.keyword.id} className="glossary-entry">
            <h4>{e.keyword.name}</h4>
            <p><DefinitionText text={e.keyword.definition} /></p>
            <p className="glossary-cards">Sur : {e.cards.join(', ')}</p>
          </div>
        ))}
        <CardNotesGroup list={list} />
      </div>
    </>
  );
}
