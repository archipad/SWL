import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';
import { resolveCardKeywords } from '../lib/combat';
import { normalizeName } from '../lib/normalize';
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

function MinimalCard({ name, tagLibrary, keywords }: { name: string; tagLibrary: CardTagLibrary; keywords: KeywordDef[] }) {
  const resolved = resolveCardKeywords(name, tagLibrary, keywords);

  return (
    <div className="mini-card">
      <h4 className="mini-card-name">{name}</h4>
      {resolved.length === 0 ? (
        <p className="empty-hint">Aucun mot-clé renseigné pour cette carte.</p>
      ) : (
        IMPACT_GROUPS.map(({ id, label }) => {
          const items = resolved.filter((r) => r.def.impact === id);
          if (items.length === 0) return null;
          return (
            <div key={id} className="mini-card-group">
              <span className="mini-card-group-label">{label}</span>
              {items.map((r) => (
                <p key={r.tag.keywordId} className="mini-kw">
                  <strong>{r.def.name}{r.def.hasValue && r.tag.value ? ` ${r.tag.value}` : ''}</strong>
                  {' — '}
                  <DefinitionText text={r.def.definition} />
                </p>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * Format minimaliste, texte seul (sans visuel de carte), pensé pour trier
 * les cartes physiques avant une partie et servir d'aide-mémoire rapide
 * pendant la partie : une carte distincte par bloc (unités ET améliorations
 * confondues, dédupliquées par nom — inutile d'imprimer deux fois la même
 * carte parce que deux escouades la portent), triées par ordre alphabétique
 * (on cherche un nom précis dans le tas de cartes, pas une catégorie).
 *
 * Mots-clés propres à cette carte uniquement — pas de fusion unité +
 * améliorations comme dans l'onglet Combat ou les fiches avec visuel
 * (resolveCardKeywords, pas resolveUnitKeywords) : chaque carte physique
 * n'affiche que ce qu'elle porte elle-même. Regroupés dans l'ordre
 * Attaque / Défense / Autre à l'intérieur de chaque carte (pas de section
 * Mouvement séparée : ce n'est pas une catégorie du glossaire actuel).
 *
 * Flux multi-colonnes classique façon glossaire (voir index.css) plutôt
 * que le découpage en paires par page des fiches avec visuel : sans image,
 * un bloc carte tient presque toujours sur une fraction de colonne, la
 * pagination automatique du navigateur suffit.
 */
export function MinimalKeywordsSection({ list, tagLibrary, keywords }: Props) {
  if (list.units.length === 0) {
    return <p className="empty-hint">Aucune unité dans cette liste.</p>;
  }

  const seen = new Set<string>();
  const cardNames: string[] = [];
  const addCard = (name: string) => {
    const key = normalizeName(name);
    if (seen.has(key)) return;
    seen.add(key);
    cardNames.push(name);
  };
  for (const unit of list.units) {
    addCard(unit.name);
    for (const up of unit.upgrades) addCard(up.name);
  }
  cardNames.sort((a, b) => a.localeCompare(b, 'fr'));

  return (
    <div className="mini-cards">
      {cardNames.map((name) => (
        <MinimalCard key={name} name={name} tagLibrary={tagLibrary} keywords={keywords} />
      ))}
    </div>
  );
}
