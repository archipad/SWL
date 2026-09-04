import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';
import { buildGlossary } from '../lib/glossary';
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
 * Format minimaliste, texte seul (sans visuel de carte), pensé pour trouver
 * très vite la définition d'un mot-clé pendant la partie. Contrairement à
 * l'ancienne version (une section par carte, mots-clés répétés autant de
 * fois que de cartes qui les portent), ce mode s'appuie sur buildGlossary —
 * la même déduplication que le glossaire de l'onglet Armées — pour n'
 * afficher chaque mot-clé qu'UNE SEULE FOIS, regroupé par impact (Attaque /
 * Défense / Autre, dans cet ordre : ce sont les trois seules valeurs de
 * KeywordDef.impact du glossaire actuel — pas de section « Mise en place »
 * distincte, ce texte relèverait d'« Autre »), et trié par ordre
 * alphabétique à l'intérieur de chaque groupe pour qu'on puisse chercher un
 * nom précis sans parcourir toute la page. Chaque entrée rappelle sur
 * quelle(s) carte(s) elle se trouve (avec la valeur X propre à chacune
 * quand elle diffère d'une carte à l'autre, ex. « Armure (3), Armure (5) »)
 * pour resituer le mot-clé sans revenir à l'onglet Armées.
 */
export function MinimalKeywordsSection({ list, tagLibrary, keywords }: Props) {
  const entries = buildGlossary(list, tagLibrary, keywords);

  if (entries.length === 0) {
    return <p className="empty-hint">Aucun mot-clé renseigné pour cette liste.</p>;
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
                <p><DefinitionText text={e.keyword.definition} /></p>
                <p className="glossary-cards">Sur : {e.cards.join(', ')}</p>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
