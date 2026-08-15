/** Une carte (unité ou amélioration) telle qu'extraite d'une liste importée. */
export interface ParsedCard {
  /** Identifiant stable = nom normalisé (voir lib/normalize.ts) */
  key: string;
  /** Nom affiché tel que trouvé dans le texte importé */
  name: string;
  points?: number;
  kind: 'unit' | 'upgrade';
}

export interface ParsedUnit extends ParsedCard {
  kind: 'unit';
  section: string;
  upgrades: ParsedCard[];
}

export interface ParsedList {
  faction?: string;
  totalPoints?: number;
  pointsLimit?: number;
  units: ParsedUnit[];
  /** Lignes du texte source que le parseur n'a pas su classer, pour transparence */
  unparsedLines: string[];
  /** Métadonnées disponibles seulement via un import JSON (ex. Tabletop Admiral) */
  listName?: string;
  commandCards?: string[];
  contingencies?: string[];
  battleForce?: string | null;
}

/** Un mot-clé du glossaire (règle générique, indépendante d'une carte précise). */
export interface KeywordDef {
  id: string;
  name: string;
  /** true si le mot-clé porte une valeur numérique sur les cartes, ex. "Tireur d'élite X" */
  hasValue: boolean;
  /** Reprend les 3 sections du glossaire officiel, + "autre" pour vos ajouts libres. */
  category: 'unité' | 'arme' | 'carte' | 'autre';
  /**
   * Impact pour la carte qui porte ce mot-clé : affecte-t-il sa propre
   * attaque, sa propre défense, ou autre chose (mouvement, commandement,
   * construction d'armée...) ? "autre" couvre aussi les mots-clés qui
   * affectent les deux à parts égales (ex. Duelliste).
   */
  impact: 'attaque' | 'défense' | 'autre';
  definition: string;
  /** true pour les mots-clés ajoutés/édités par l'utilisateur (non fournis par défaut) */
  custom?: boolean;
}

/** Un tag mot-clé posé sur une carte précise (unité ou amélioration) par l'utilisateur. */
export interface CardKeywordTag {
  keywordId: string;
  value?: number;
}

/** Bibliothèque persistée : nom de carte normalisé -> mots-clés qu'elle porte. */
export type CardTagLibrary = Record<string, CardKeywordTag[]>;
