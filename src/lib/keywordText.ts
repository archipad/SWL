import type { KeywordDef } from '../types';

/**
 * Texte à afficher pour un mot-clé PARTOUT SAUF l'onglet Glossaire (qui
 * reste sur `def.definition`, le texte officiel intégral — demande
 * explicite de l'utilisateur : la version courte est pratique en jeu, mais
 * la référence complète doit rester consultable quelque part). Retombe sur
 * `definition` si `shortDefinition` n'est pas encore renseignée, pour
 * qu'aucun mot-clé ne se retrouve sans texte — ex. un mot-clé ajouté par
 * l'utilisateur via le bouton « + mot-clé personnalisé ».
 */
export function shortDef(def: KeywordDef): string {
  return def.shortDefinition ?? def.definition;
}

/**
 * Remplace le X littéral (mot entier, ex. « Critique X », « jusqu'à X
 * résultats ») par la valeur réelle du mot-clé sur cette carte précise —
 * ex. "Critique X" + value 2 → "Critique 2". `value` vient de
 * `CardKeywordTag.value`, saisi lors du tagage de la carte (cardTags.ts) ;
 * si cette carte n'a pas de valeur connue pour ce mot-clé, le X reste tel
 * quel (mieux vaut un X visible qu'un chiffre inventé).
 */
export function substituteValue(text: string, value: number | undefined): string {
  if (value === undefined) return text;
  return text.replace(/\bX\b/g, String(value));
}

/** Partie générique d'un nom de mot-clé après « : » (« Mercenaire : Faction ») : le texte d'une carte y met une valeur précise. */
const GENERIC_SUFFIX = /\/|Nom|Type|Faction|Rang|Mot-clé|Pion|Capacité|Action|Affiliation/;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Libellé tel qu'il apparaît dans le texte d'une carte : « Impact X » → « Impact », « Fixe : Avant/Arrière » → « Fixe ». */
function printedKeywordName(name: string): string {
  let base = name.replace(/\s*\((?:unité|arme)\)\s*$/, '').replace(/\s+X$/, '');
  const colon = base.indexOf(' : ');
  if (colon > 0 && GENERIC_SUFFIX.test(base.slice(colon + 3))) base = base.slice(0, colon);
  if (base.includes(' / ')) base = base.split(' / ')[0];
  return base.replace(/\s+X$/, '');
}

export interface AnnotatedSegment {
  text: string;
  /** Mot-clé du glossaire, imprimé en gras comme sur les cartes. */
  keyword?: boolean;
}

/**
 * Découpe le texte d'une carte d'amélioration en segments : chaque mot-clé du glossaire cité est marqué
 * (rendu en gras, comme la nomenclature des cartes) et sa première occurrence est suivie de sa définition
 * courte entre parenthèses, valeur reportée (24/10/2026 : « Anti-matériel 2 et Impact 2 » de Munitions
 * Antichar n'étaient définis nulle part). Les mots-clés de `skip` (déjà définis sous l'unité) restent en
 * gras sans définition répétée. Un nom de mot-clé qui sert aussi de nom de pion (« pion Blessure »), de
 * règle (« Chef d'unité ») ou qui fait partie d'un nom propre (« Chef Mandalorien », « Blaster à
 * Dispersion SX-21 », « Saboteur avec Charge à Protons ») n'est pas pris pour le mot-clé.
 */
export function annotateKeywords(text: string, keywords: KeywordDef[], skip: Set<string>): AnnotatedSegment[] {
  const candidates = keywords
    .map((def) => ({ def, label: printedKeywordName(def.name) }))
    .filter((c) => c.label.length > 2)
    .sort((a, b) => b.label.length - a.label.length);
  const found: { start: number; end: number; definition?: string }[] = [];
  for (const { def, label } of candidates) {
    // « de Barrage », « à Dispersion » : fin d'un nom d'arme (MPL-57 de Barrage, Fusil à Dispersion).
    const re = new RegExp(`(?<![\\p{L}'’])(?<!pions? |avec |de |à )${escapeRe(label)}(?: (\\d+))?(?![\\p{L}'’-])(?! d['’]unit| \\p{Lu}| à \\p{Lu})`, 'gu');
    let first = true;
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (found.some((f) => start < f.end && end > f.start)) continue;
      const value = m[1] !== undefined ? Number(m[1]) : undefined;
      const definition = first && !skip.has(def.id) ? substituteValue(shortDef(def), value).replace(/\.\s*$/, '') : undefined;
      found.push({ start, end, definition });
      first = false;
    }
  }
  found.sort((a, b) => a.start - b.start);
  const segments: AnnotatedSegment[] = [];
  let at = 0;
  for (const f of found) {
    if (f.start > at) segments.push({ text: text.slice(at, f.start) });
    segments.push({ text: text.slice(f.start, f.end), keyword: true });
    if (f.definition) segments.push({ text: ` (${f.definition})` });
    at = f.end;
  }
  if (at < text.length) segments.push({ text: text.slice(at) });
  return segments;
}

/** Texte brut d'un texte annoté (tests, infobulles). */
export const annotatedText = (segments: AnnotatedSegment[]) => segments.map((s) => s.text).join('');
