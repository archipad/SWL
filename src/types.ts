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
}

/** Un mot-clé du glossaire (règle générique, indépendante d'une carte précise). */
export interface KeywordDef {
  id: string;
  name: string;
  /** true si le mot-clé porte une valeur numérique sur les cartes, ex. "Tireur d'élite X" */
  hasValue: boolean;
  category: 'attaque' | 'défense' | 'mouvement' | 'commandement' | 'autre';
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
