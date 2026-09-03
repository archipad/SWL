import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';
import { frenchCardName, canonicalCardKey } from './cardNames';

export interface GlossaryEntry {
  keyword: KeywordDef;
  cards: string[];
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
