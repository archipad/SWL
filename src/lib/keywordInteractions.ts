import type { ResolvedTag } from './combat';

/**
 * Interactions connues entre un mot-clé côté attaquant et un mot-clé côté
 * défenseur, quand les deux cartes sélectionnées dans l'écran Combat en
 * portent chacune un — c'est justement ce type de croisement qui est
 * source d'erreurs (cf. le bug Perforant/Bloc corrigé suite à un
 * signalement). Volontairement limité aux interactions bien documentées où
 * un mot-clé cite explicitement l'autre dans sa définition officielle —
 * pas de déduction hasardeuse depuis le texte libre.
 *
 * Note : Perforant X (annule des résultats Bloc, dés de défense) et Armure
 * (annule des résultats Touche, dés d'attaque) portent sur deux jets et
 * deux résultats différents — ce ne sont PAS des mots-clés opposés, malgré
 * l'intuition. Le vrai contre d'Armure est Impact X (justement fait pour
 * convertir des Touche en Critique et passer outre l'annulation d'Armure).
 */
export interface KeywordInteraction {
  attackerKeywordId: string;
  defenderKeywordId: string;
  note: string;
}

export const KEYWORD_INTERACTIONS: KeywordInteraction[] = [
  {
    attackerKeywordId: 'impact-x',
    defenderKeywordId: 'armure-x',
    note: "Impact X convertit des résultats Touche en Critique — justement pensé pour contourner l'annulation de Touche d'Armure.",
  },
  {
    attackerKeywordId: 'primitif',
    defenderKeywordId: 'armure-x',
    note: "Primitif reconvertit tous les Critique en Touche face à un défenseur avec Armure — annule l'effet d'Impact X sur cette attaque.",
  },
  {
    attackerKeywordId: 'perforant-x',
    defenderKeywordId: 'immunite-perforant',
    note: 'Le défenseur bloque totalement Perforant X : ses résultats Bloc ne peuvent pas être annulés.',
  },
  {
    attackerKeywordId: 'perforant-x',
    defenderKeywordId: 'immunite-perforant-corps-a-corps',
    note: "Le défenseur bloque Perforant X, mais seulement si l'attaque est au corps-à-corps.",
  },
  {
    attackerKeywordId: 'perforant-x',
    defenderKeywordId: 'insensible',
    note: 'Le défenseur annule un Bloc de moins que ce que Perforant X aurait dû permettre.',
  },
  {
    attackerKeywordId: 'letal-x',
    defenderKeywordId: 'immunite-perforant',
    note: 'Létal X convertit des pions Viser en Perforant 1 — si utilisé, le défenseur bloque cette conversion tout de même.',
  },
  {
    attackerKeywordId: 'letal-x',
    defenderKeywordId: 'immunite-perforant-corps-a-corps',
    note: 'Létal X convertit des pions Viser en Perforant 1 — bloqué par le défenseur si cette attaque est au corps-à-corps.',
  },
  {
    attackerKeywordId: 'letal-x',
    defenderKeywordId: 'insensible',
    note: 'Létal X convertit des pions Viser en Perforant 1 — le défenseur en annule un de moins que prévu.',
  },
  {
    attackerKeywordId: 'maitrise-du-makashi',
    defenderKeywordId: 'immunite-perforant',
    note: "Maîtrise du Makashi empêche justement le défenseur d'utiliser cette immunité pendant cette attaque au corps-à-corps.",
  },
  {
    attackerKeywordId: 'maitrise-du-makashi',
    defenderKeywordId: 'immunite-perforant-corps-a-corps',
    note: "Maîtrise du Makashi empêche justement le défenseur d'utiliser cette immunité pendant cette attaque.",
  },
  {
    attackerKeywordId: 'maitrise-du-makashi',
    defenderKeywordId: 'insensible',
    note: "Maîtrise du Makashi empêche justement le défenseur d'utiliser Insensible pendant cette attaque au corps-à-corps.",
  },
  {
    attackerKeywordId: 'deflagration',
    defenderKeywordId: 'immunite-deflagration',
    note: 'Le défenseur ignore totalement les effets de Déflagration pour cette attaque.',
  },
  {
    attackerKeywordId: 'tireur-delite-x',
    defenderKeywordId: 'couvert-x',
    note: "Tireur d'Élite X réduit la valeur de couvert augmentée par Couvert X — les deux valeurs se combinent, à recalculer ensemble.",
  },
  {
    attackerKeywordId: 'immunite-deflexion',
    defenderKeywordId: 'deflexion',
    note: "L'attaquant ne peut pas subir de blessure due à Déflexion pendant cette attaque (au moins une arme de la réserve porte Immunité : déflexion).",
  },
  {
    attackerKeywordId: 'haute-velocite',
    defenderKeywordId: 'deflexion',
    note: "Si la réserve d'attaque ne contient QUE des armes Haute Vélocité, Déflexion n'a aucun effet sur cette attaque (et le défenseur ne peut pas non plus dépenser d'Esquive).",
  },
];

export interface DetectedInteraction extends KeywordInteraction {}

/** Détecte, parmi les mots-clés déjà résolus des deux côtés, les interactions connues. */
export function detectInteractions(
  attackerResolved: ResolvedTag[],
  defenderResolved: ResolvedTag[],
): DetectedInteraction[] {
  const attackerIds = new Set(attackerResolved.map((r) => r.tag.keywordId));
  const defenderIds = new Set(defenderResolved.map((r) => r.tag.keywordId));
  return KEYWORD_INTERACTIONS.filter(
    (i) => attackerIds.has(i.attackerKeywordId) && defenderIds.has(i.defenderKeywordId),
  );
}
