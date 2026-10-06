import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCardCatalog, keywordLabel, rankLabel, type CatalogCard, type CatalogKeyword } from '../lib/cardCatalog';
import { DefinitionText } from '../lib/diceIcons';
import { shortDef } from '../lib/keywordText';
import { normalizeName } from '../lib/normalize';
import type { CardTagLibrary, KeywordDef } from '../types';

/**
 * Consultation des cartes (06/10/2026) : toutes les cartes connues de l'appli, avec une recherche,
 * le visuel en grand, puis la définition de chaque mot-clé de la carte et enfin ses armes (dés,
 * portée et mots-clés d'arme définis). Lecture seule : les données viennent du catalogue certifié.
 */

type Filter = 'all' | 'unit' | 'upgrade';
const SELECTED_KEY = 'swl.card-browser.selected.v1';
const FILTER_LABELS: Record<Filter, string> = { all: 'Toutes', unit: 'Unités', upgrade: 'Améliorations' };
const DIE_LABEL: Record<string, string> = { rouge: 'rouge', noir: 'noir', blanc: 'blanc' };

function rangeLabel(range?: string): string {
  if (!range) return '—';
  if (range === 'melee') return 'Corps à corps';
  const meleeReach = range.match(/^melee-(\d+)$/);
  if (meleeReach) return `Corps à corps et portée 1–${meleeReach[1]}`;
  return `Portée ${range.replace(/^-/, '').replace('#', '∞').replace('-', '–')}`;
}

function readSelected(): string | null {
  try { return localStorage.getItem(SELECTED_KEY); } catch { return null; }
}

/** Remplace le X du mot-clé par sa valeur, mais pas celui d'un AUTRE mot-clé cité dans la définition
 * (« contre un défenseur Armure X », « via Gardien X ») : un X précédé d'un mot à majuscule est laissé. */
function withValue(text: string, value?: number): string {
  if (value === undefined) return text;
  return text.replace(/(?<![A-ZÀ-Ý][\p{L}’'-]*\s)\bX\b/gu, String(value));
}

function KeywordDefinition({ keyword, def }: { keyword: CatalogKeyword; def: KeywordDef }) {
  const summary = withValue(shortDef(def), keyword.value);
  const full = withValue(def.definition, keyword.value);
  return (
    <li className="cb-keyword">
      <h4>{keywordLabel(def, keyword.value)}</h4>
      <p><DefinitionText text={summary} /></p>
      {full && full !== summary && (
        <details>
          <summary>Règle complète</summary>
          <p><DefinitionText text={full} /></p>
        </details>
      )}
    </li>
  );
}

function KeywordList({ items, byId, empty }: { items: CatalogKeyword[]; byId: Map<string, KeywordDef>; empty?: string }) {
  const known = items.filter((item) => byId.has(item.keywordId));
  if (!known.length) return empty ? <p className="empty-hint">{empty}</p> : null;
  return <ul className="cb-keywords">{known.map((item) => <KeywordDefinition key={item.keywordId} keyword={item} def={byId.get(item.keywordId)!} />)}</ul>;
}

function CardDetail({ card, byId }: { card: CatalogCard; byId: Map<string, KeywordDef> }) {
  const meta = [card.type === 'unit' ? card.unitType || 'Unité' : 'Amélioration', rankLabel(card.rank)].filter(Boolean).join(' · ');
  const stats: [string, string][] = [];
  if (card.wounds != null) stats.push(['Blessures', String(card.wounds)]);
  if (card.courage !== undefined) stats.push(['Courage', card.courage === null ? '—' : String(card.courage)]);
  if (card.defenseColor) stats.push(['Défense', DIE_LABEL[card.defenseColor] ?? card.defenseColor]);
  if (card.speed) stats.push(['Vitesse', card.speed]);
  if (card.models) stats.push(['Figurines', String(card.models)]);
  return (
    <article className="cb-detail" aria-label={card.name}>
      <header className="cb-detail-head">
        <h3>{card.name}</h3>
        <p>{meta}{card.certified && <span className="cb-certified" title="Carte relue intégralement sur son visuel">Certifiée</span>}</p>
      </header>
      <div className={`cb-visual cb-visual-${card.type}`}>
        {card.image
          ? <img src={card.image} alt={`Carte ${card.name}`} />
          : <p className="empty-hint">Visuel non disponible pour cette carte.</p>}
      </div>
      {stats.length > 0 && (
        <dl className="cb-stats">
          {stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={label === 'Défense' ? `cb-def cb-def-${card.defenseColor}` : undefined}>{value}</dd></div>)}
        </dl>
      )}
      <section className="cb-section" aria-labelledby="cb-keywords-title">
        <h4 className="cb-section-title" id="cb-keywords-title">Mots-clés</h4>
        <KeywordList items={card.keywords} byId={byId} empty={card.weapons.some((weapon) => weapon.keywords.length) ? 'Pas de mot-clé hors armes.' : 'Aucun mot-clé sur cette carte.'} />
      </section>
      {card.weapons.length > 0 && (
        <section className="cb-section" aria-labelledby="cb-weapons-title">
          <h4 className="cb-section-title" id="cb-weapons-title">Armes</h4>
          {card.weapons.map((weapon, index) => (
            <div key={`${weapon.name}${index}`} className="cb-weapon">
              <div className="cb-weapon-head">
                <strong>{weapon.name}</strong>
                <span className="cb-weapon-range">{rangeLabel(weapon.range)}</span>
                <span className="cb-weapon-dice" aria-label="Dés d'attaque">
                  {weapon.dice === 'variable'
                    ? <em>{weapon.note ?? 'Réserve variable'}</em>
                    : weapon.dice.flatMap((group) => Array.from({ length: group.count }, (_, i) => (
                      <i key={`${group.color}${i}`} className={`cx-die cx-die-${group.color}`} title={`Dé ${DIE_LABEL[group.color]}`} />
                    )))}
                </span>
              </div>
              <KeywordList items={weapon.keywords} byId={byId} />
            </div>
          ))}
        </section>
      )}
    </article>
  );
}

export function CardBrowserScreen({ tagLibrary, keywords }: { tagLibrary: CardTagLibrary; keywords: KeywordDef[] }) {
  const catalog = useMemo(() => buildCardCatalog(tagLibrary, keywords), [tagLibrary, keywords]);
  const byId = useMemo(() => new Map(keywords.map((keyword) => [keyword.id, keyword])), [keywords]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(readSelected);
  const detailRef = useRef<HTMLDivElement>(null);

  const results = useMemo<(CatalogCard & { matchedKeyword?: string })[]>(() => {
    const needle = normalizeName(query);
    const byType = catalog.filter((card) => filter === 'all' || card.type === filter);
    if (!needle) return byType;
    const byName = byType.filter((card) => card.search.includes(needle));
    // Au-delà du nom : les cartes qui portent un mot-clé correspondant (« charge », « impact »…).
    const keywordHit = (card: CatalogCard) => [...card.keywords, ...card.weapons.flatMap((weapon) => weapon.keywords)]
      .map((keyword) => byId.get(keyword.keywordId)).find((def) => def && normalizeName(def.name).includes(needle));
    const byKeyword = needle.length >= 3
      ? byType.filter((card) => !byName.includes(card)).flatMap((card) => { const def = keywordHit(card); return def ? [{ ...card, matchedKeyword: def.name }] : [] })
      : [];
    return [...byName, ...byKeyword];
  }, [catalog, filter, query, byId]);

  // Une carte choisie reste affichée tant qu'elle figure dans les résultats ; sinon le premier résultat.
  const selected = results.find((card) => card.key === selectedKey) ?? results[0] ?? catalog.find((card) => card.key === selectedKey);
  useEffect(() => { if (selected) try { localStorage.setItem(SELECTED_KEY, selected.key); } catch { /* stockage indisponible */ } }, [selected]);

  const choose = (key: string) => {
    setSelectedKey(key);
    if (window.matchMedia('(max-width: 899px)').matches) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="card-browser no-print">
      <section className="cx-panel cb-list" aria-label="Recherche de cartes">
        <header className="cx-panel-head"><h3>Cartes</h3><b>{results.length}</b></header>
        <div className="cb-search">
          <input
            id="cardBrowserSearch"
            type="search"
            placeholder="Rechercher une carte ou un mot-clé…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Rechercher une carte ou un mot-clé"
          />
          <div className="cb-filters" role="group" aria-label="Type de carte">
            {(Object.keys(FILTER_LABELS) as Filter[]).map((id) => (
              <button key={id} type="button" className={filter === id ? 'btn btn-primary' : 'btn btn-ghost'} aria-pressed={filter === id} onClick={() => setFilter(id)}>{FILTER_LABELS[id]}</button>
            ))}
          </div>
        </div>
        {results.length === 0
          ? <p className="empty-hint cb-empty">Aucune carte ne correspond à « {query} ».</p>
          : (
            <ul className="cb-results">
              {results.map((card) => (
                <li key={card.key}>
                  <button type="button" className={`cb-result${selected?.key === card.key ? ' active' : ''}`} aria-pressed={selected?.key === card.key} onClick={() => choose(card.key)}>
                    <span className={`cb-thumb cb-thumb-${card.type}`} style={card.image ? { backgroundImage: `url(${card.image})` } : undefined} aria-hidden="true" />
                    <span className="cb-result-text">
                      <strong>{card.name}</strong>
                      <small>{card.matchedKeyword ? `Mot-clé : ${card.matchedKeyword}` : card.type === 'unit' ? [card.unitType || 'Unité', rankLabel(card.rank)].filter(Boolean).join(' · ') : 'Amélioration'}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </section>
      <div className="cx-panel cb-detail-panel" ref={detailRef}>
        {selected ? <CardDetail card={selected} byId={byId} /> : <p className="empty-hint">Choisissez une carte dans la liste.</p>}
      </div>
    </div>
  );
}
