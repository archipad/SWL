import type { ResolvedTag } from './combat';

/**
 * Séquence officielle d'une attaque (Livre de Règles Legion), utilisée pour
 * le guide pas-à-pas de l'écran Combat. Les noms d'étape et leur ordre sont
 * ceux déjà cités entre guillemets dans les définitions de src/data/
 * keywords.ts (« Modifier les dés d'attaque », « Comparer les résultats »,
 * etc.) — pas une liste inventée à côté du glossaire.
 *
 * `matchNames` associe à chaque étape les variantes de nom trouvées dans le
 * glossaire (parfois deux formulations différentes pour la même étape,
 * héritées de passes de vérification successives — ex. « Appliquer le
 * couvert » et « Appliquer les esquives et couverts »). keywordsForStep()
 * s'en sert pour retrouver automatiquement, parmi les mots-clés déjà
 * résolus d'une carte, ceux qui s'appliquent à une étape donnée — par
 * simple recherche de texte, sans table à maintenir à la main : un mot-clé
 * dont la définition cite l'étape apparaît à cette étape.
 */
export interface AttackStep {
  id: string;
  label: string;
  /** Version courte (1-2 mots), affichée sous la frise d'étapes du Combat interactif où le libellé complet ne tiendrait pas. */
  shortLabel: string;
  matchNames: string[];
  hint: string;
}

export const ATTACK_SEQUENCE: AttackStep[] = [
  {
    id: 'declare-defender',
    label: 'Déclarer le défenseur',
    shortLabel: 'Défenseur',
    matchNames: ['Déclarer le défenseur', 'Déclarer un défenseur supplémentaire'],
    hint: 'Choisissez la cible : portée et ligne de vue requises.',
  },
  {
    id: 'build-pool',
    label: "Constituer la réserve d'attaque",
    shortLabel: 'Armes',
    matchNames: ["Choisir les armes et rassembler les dés", "Constituer la réserve d'attaque"],
    hint: 'Choisissez les armes utilisées et rassemblez les dés correspondants.',
  },
  {
    id: 'determine-cover',
    label: 'Déterminer le couvert',
    shortLabel: 'Couvert',
    matchNames: ['Déterminer le couvert', 'Lancer la réserve de couvert'],
    hint: 'Évaluez le couvert (léger/lourd) dont bénéficie le défenseur.',
  },
  {
    id: 'modify-attack',
    label: "Modifier les dés d'attaque",
    shortLabel: 'Dés ATQ',
    matchNames: ["Modifier les dés d'attaque", "Relancer les dés d'attaque"],
    hint: 'Impact, Précis, relances de dés d\'attaque…',
  },
  {
    id: 'convert-attack-surge',
    label: "Convertir les adrénalines d'attaque",
    shortLabel: 'Adré. ATQ',
    matchNames: ["Convertir les adrénalines d'attaque"],
    hint: "Convertissez les résultats Adrénaline selon la fenêtre de conversion de l'attaquant (Critique X…).",
  },
  {
    id: 'apply-dodge-cover',
    label: 'Appliquer les esquives et couverts',
    shortLabel: 'Esquive',
    matchNames: ['Appliquer les esquives et couverts', 'Appliquer le couvert'],
    hint: 'Le défenseur dépense des pions Esquive ; le couvert annule des résultats Touche.',
  },
  {
    id: 'roll-defense',
    label: 'Lancer les dés de défense',
    shortLabel: 'Dés DÉF',
    matchNames: ['Lancer les dés de défense'],
    hint: 'Le défenseur lance un dé de défense par blessure restant à encaisser.',
  },
  {
    id: 'modify-defense',
    label: 'Modifier les dés de défense',
    shortLabel: 'Mod. DÉF',
    matchNames: ['Modifier les dés de défense', 'Relancer les dés de défense'],
    hint: 'Perforant, relances de dés de défense…',
  },
  {
    id: 'convert-defense-surge',
    label: 'Convertir les adrénalines de défense',
    shortLabel: 'Adré. DÉF',
    matchNames: ['Convertir les adrénalines de défense'],
    hint: 'Convertissez les résultats Adrénaline selon la fenêtre de conversion du défenseur.',
  },
  {
    id: 'compare-results',
    label: 'Comparer les résultats',
    shortLabel: 'Résultat',
    matchNames: ['Comparer les résultats'],
    hint: 'Chaque résultat Bloc restant annule une blessure ; le reste blesse le défenseur.',
  },
  {
    id: 'assign-suppression',
    label: 'Attribuer un pion Suppression au défenseur',
    shortLabel: 'Suppr.',
    matchNames: ['Attribuer un pion Suppression au défenseur'],
    hint: 'Le défenseur gagne normalement un pion Suppression.',
  },
];

/**
 * Mots-clés déjà résolus d'une carte dont la définition cite cette étape —
 * limités à ceux pertinents pour le rôle joué par cette carte dans
 * l'attaque en cours (impact 'attaque' ou 'autre' côté attaquant, 'défense'
 * ou 'autre' côté défenseur). Sans ce filtre, un mot-clé qui n'affecte que
 * la propre attaque d'une carte (ex. Impact X, Arsenal X) apparaîtrait à
 * tort quand cette carte défend, alors qu'il ne joue aucun rôle tant
 * qu'elle n'attaque pas elle-même.
 */
export function keywordsForStep(
  step: AttackStep,
  resolved: ResolvedTag[],
  role: 'attaque' | 'défense',
): ResolvedTag[] {
  return resolved.filter(
    (r) =>
      (r.def.impact === role || r.def.impact === 'autre') &&
      step.matchNames.some((name) => r.def.definition.includes(name)),
  );
}
