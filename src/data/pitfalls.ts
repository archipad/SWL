/**
 * Pièges de résolution fréquents — indépendants de l'attaquant/défenseur
 * sélectionné, contrairement aux interactions détectées automatiquement
 * (voir lib/keywordInteractions.ts). Utile pour clarifier une fois pour
 * toutes une confusion classique au sein du groupe, plutôt que de devoir la
 * rechercher à chaque fois qu'elle se présente en partie.
 *
 * Chaque entrée est directement traçable à une définition déjà présente
 * dans data/keywords.ts (glossaire officiel) — aucune règle inventée ou
 * déduite de mémoire, dans le même esprit que le reste de l'appli.
 */
export interface Pitfall {
  id: string;
  title: string;
  text: string;
}

export const COMBAT_PITFALLS: Pitfall[] = [
  {
    id: 'perforant-vs-armure',
    title: "Perforant X n'annule pas Armure (et inversement)",
    text: "Perforant X annule des résultats [BLOC] sur le jet de défense ; Armure annule des résultats [TOUCHE] sur le jet d'attaque. Deux jets différents, deux résultats différents : ils ne s'opposent pas entre eux, malgré l'intuition. Le vrai contre d'Armure est Impact X (convertit des [TOUCHE] en [CRITIQUE], qu'Armure n'annule pas).",
  },
  {
    id: 'gardien-troisieme-unite',
    title: 'Gardien X implique une troisième unité',
    text: "Quand une unité alliée proche utilise Gardien X pour intercepter des [TOUCHE] à la place du défenseur désigné, c'est elle — pas le défenseur choisi dans cet écran — qui lance les dés de défense correspondants. Perforant X de l'attaquant peut quand même annuler les [BLOC] qu'elle obtient.",
  },
  {
    id: 'point-faible-sans-mot-cle',
    title: "Point Faible X peut s'activer sans mot-clé côté attaquant",
    text: "Si le Chef de l'unité attaquante se trouve dans l'arc visé par Point Faible X (ou si, pour une arme à effet de zone, le pion Charge/Avantage en tient lieu), la réserve d'attaque gagne Impact X automatiquement — vérifiez l'arc avant de lancer les dés, l'attaquant n'a besoin d'aucun mot-clé pour en bénéficier.",
  },
  {
    id: 'haute-velocite-neutralise-deflexion',
    title: 'Haute Vélocité neutralise Esquive ET Déflexion',
    text: "Si TOUTE la réserve d'attaque est composée d'armes Haute Vélocité, le défenseur ne peut pas dépenser de pion Esquive pendant l'étape « Appliquer les esquives et couverts », et le mot-clé Déflexion n'a aucun effet sur cette attaque — les deux protections tombent en même temps.",
  },
  {
    id: 'adrenaline-vierge-sans-fenetre',
    title: 'Un résultat Adrénaline reste vierge sans fenêtre de conversion',
    text: "[ADR-ATQ] et [ADR-DEF] ne sont pas des résultats en soi : ils se convertissent uniquement selon la fenêtre de conversion propre à chaque camp (mot-clé natif de l'unité, arme utilisée, ou pion dépensé) — à défaut, ils restent vierges. Chaque camp convertit séparément, à sa propre étape (6 pour l'attaquant, 9 pour le défenseur).",
  },
];
