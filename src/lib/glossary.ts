import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';
import { frenchCardName, canonicalCardKey } from './cardNames';
import { cardNoteFor } from '../data/cardNotes';

export interface GlossaryEntry {
  keyword: KeywordDef;
  cards: string[];
}

export interface CardNoteEntry {
  /** Nom d'affichage français de la carte. */
  displayName: string;
  note: string;
}

export function buildGlossary(list: ParsedList, tagLibrary: CardTagLibrary, keywords: KeywordDef[]): GlossaryEntry[] {
  const byId = new Map(keywords.map((k) => [k.id, k]));
  const entries = new Map<string, GlossaryEntry>();

  const visit = (name: string) => {
    const tags = tagLibrary[canonicalCardKey(name)] ?? [];
    for (const t of tags) {
      const kw = byId.get(t.keywordId);
      if (!kw) continue;
      let entry = entries.get(kw.id);
      if (!entry) {
        entry = { keyword: kw, cards: [] };
        entries.set(kw.id, entry);
      }
      const displayName = frenchCardName(name);
      const cardLabel = kw.hasValue && t.value ? `${displayName} (${t.value})` : displayName;
      if (!entry.cards.includes(cardLabel)) entry.cards.push(cardLabel);
    }
  };

  for (const unit of list.units) {
    visit(unit.name);
    for (const up of unit.upgrades) visit(up.name);
  }

  return [...entries.values()].sort((a, b) => a.keyword.name.localeCompare(b.keyword.name, 'fr'));
}

/**
 * Cartes de la liste dont l'effet imprimé ne se réduit à AUCUN mot-clé du
 * glossaire (cardTags.ts à `[]`, ou avec des mots-clés qui ne couvrent pas
 * tout le texte) mais qui ont malgré tout un texte propre référencé dans
 * cardNotes.ts — sinon buildGlossary() ci-dessus les laisse invisibles
 * (aucun mot-clé à afficher), donnant l'impression qu'elles n'ont « pas de
 * définition » alors qu'elles ont un effet réel (signalement utilisateur du
 * 06/09/2026 : Présence Inspirante/Pointe de Vitesse/Ténacité). Dédupliqué
 * par nom de carte (une unité + une amélioration partageant le même texte
 * ne comptent que pour une entrée), trié alphabétiquement comme
 * buildGlossary().
 */
export function buildCardNotes(list: ParsedList): CardNoteEntry[] {
  const seen = new Map<string, CardNoteEntry>();

  const visit = (name: string) => {
    const key = canonicalCardKey(name);
    if (seen.has(key)) return;
    const note = cardNoteFor(name);
    if (!note) return;
    seen.set(key, { displayName: frenchCardName(name), note });
  };

  for (const unit of list.units) {
    visit(unit.name);
    for (const up of unit.upgrades) visit(up.name);
  }

  return [...seen.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'));
}
