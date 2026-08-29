import type { CardKeywordTag, CardTagLibrary, KeywordDef, ParsedList, ParsedUnit } from '../types';
import { normalizeName } from './normalize';

export interface ResolvedTag {
  tag: CardKeywordTag;
  def: KeywordDef;
  /** Carte d'origine du mot-clé (nom de l'unité, ou d'une amélioration équipée). */
  source: string;
}

/**
 * Fusionne les mots-clés d'une unité et de toutes ses améliorations
 * équipées en une seule liste dédupliquée (par mot-clé) — c'est ce qui
 * compte réellement pour une attaque ou une défense : l'unité seule ne
 * suffit pas, ses armes/améliorations changent souvent l'issue du combat.
 * En cas de doublon (même mot-clé sur l'unité et une amélioration), la
 * première occurrence rencontrée (unité, puis améliorations dans l'ordre)
 * est conservée.
 */
export function resolveUnitKeywords(
  unit: ParsedUnit,
  tagLibrary: CardTagLibrary,
  keywords: KeywordDef[],
): ResolvedTag[] {
  const byId = new Map(keywords.map((k) => [k.id, k]));
  const seen = new Set<string>();
  const result: ResolvedTag[] = [];

  const collect = (cardName: string) => {
    const tags = tagLibrary[normalizeName(cardName)] ?? [];
    for (const tag of tags) {
      if (seen.has(tag.keywordId)) continue;
      const def = byId.get(tag.keywordId);
      if (!def) continue;
      seen.add(tag.keywordId);
      result.push({ tag, def, source: cardName });
    }
  };

  collect(unit.name);
  for (const up of unit.upgrades) collect(up.name);

  return result;
}

/** Identifiant du camp — pour l'instant toujours deux (Joueur 1 / Joueur 2). */
export type PlayerId = 'p1' | 'p2';

export interface RosterEntry {
  player: PlayerId;
  playerLabel: string;
  unit: ParsedUnit;
}

/** Combine les unités des deux listes en un seul répertoire, pour les sélecteurs attaquant/défenseur. */
export function buildRoster(listP1: ParsedList | null, listP2: ParsedList | null): RosterEntry[] {
  const roster: RosterEntry[] = [];
  const add = (player: PlayerId, list: ParsedList | null) => {
    if (!list) return;
    const playerLabel = list.listName ?? list.faction ?? (player === 'p1' ? 'Joueur 1' : 'Joueur 2');
    for (const unit of list.units) roster.push({ player, playerLabel, unit });
  };
  add('p1', listP1);
  add('p2', listP2);
  return roster;
}
