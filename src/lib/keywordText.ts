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
