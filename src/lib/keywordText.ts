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

/**
 * Ajoute, entre parenthèses après sa première occurrence, la définition courte de chaque mot-clé cité
 * dans le texte d'une carte d'amélioration (24/10/2026 : « Anti-matériel 2 et Impact 2 » de Munitions
 * Antichar n'étaient définis nulle part). Les mots-clés de `skip` (déjà définis sous l'unité) ne sont pas
 * répétés. Un nom de mot-clé qui sert aussi de nom de pion (« pion Blessure »), de règle (« Chef d'unité »)
 * ou qui fait partie d'un nom propre (« Chef Mandalorien », « Blaster à Dispersion SX-21 », « Saboteur avec
 * Charge à Protons ») n'est pas pris pour le mot-clé.
 */
export function annotateKeywords(text: string, keywords: KeywordDef[], skip: Set<string>): string {
  const candidates = keywords
    .filter((def) => !skip.has(def.id))
    .map((def) => ({ def, label: printedKeywordName(def.name) }))
    .filter((c) => c.label.length > 2)
    .sort((a, b) => b.label.length - a.label.length);
  const taken: [number, number][] = [];
  const inserts: { at: number; text: string }[] = [];
  for (const { def, label } of candidates) {
    const re = new RegExp(`(?<![\\p{L}'’])(?<!pions? |avec )${escapeRe(label)}(?: (\\d+))?(?![\\p{L}'’-])(?! d['’]unit| \\p{Lu}| à \\p{Lu})`, 'u');
    const m = re.exec(text);
    if (!m) continue;
    const start = m.index;
    const end = start + m[0].length;
    if (taken.some(([a, b]) => start < b && end > a)) continue;
    taken.push([start, end]);
    const value = m[1] !== undefined ? Number(m[1]) : undefined;
    inserts.push({ at: end, text: ` (${substituteValue(shortDef(def), value).replace(/\.\s*$/, '')})` });
  }
  return inserts.sort((a, b) => b.at - a.at).reduce((out, ins) => out.slice(0, ins.at) + ins.text + out.slice(ins.at), text);
}
