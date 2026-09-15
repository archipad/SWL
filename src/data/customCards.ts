import customCardsJson from './customCards.json';

export interface CustomCardWeapon {
  name: string;
  dice: { color: 'blanc' | 'rouge' | 'noir'; count: number }[] | 'variable';
  range?: string;
  keywordIds?: string[];
  keywordValues?: Record<string, number>;
  attackSurge?: 'hit' | 'crit';
}

export interface CustomCardEntry {
  /** Titre français tel qu'imprimé sur la carte. */
  nameFr: string;
  /** Nom de fichier dans public/cards/ (pas de chemin). */
  image?: string;
  weapons?: CustomCardWeapon[];
  defenseColor?: 'blanc' | 'rouge';
  /** Une amélioration peut remplacer le dé de défense de l'unité qui la porte. */
  defenseColorOverride?: 'blanc' | 'rouge';
  attackSurge?: 'hit' | 'crit';
  defenseSurge?: 'block';
  /** null retire explicitement la conversion imprimée de l'unité. */
  defenseSurgeOverride?: 'block' | null;
  /** Pions proposés par Autonome, lus sur la carte (un choix peut en contenir plusieurs). */
  autonomousTokens?: { token: 'aim' | 'dodge' | 'surge'; count: number }[];
  /** Critique X, où X est le nombre actuel de pions Suppression du porteur. */
  criticalPerSuppression?: boolean;
  /** Améliore deux dés d'une autre unité alliée à portée 1. */
  fireControl?: boolean;
  note?: string;
  unitStats?: {
    woundsPerModel: number;
    courage: number | null;
    baseModels: number;
    suppressionImmune?: boolean;
  };
  /** Figurines ajoutées par cette carte d'amélioration (absent pour une carte Unité). */
  addedModels?: number;
  addedModelWounds?: number;
  /** Mots-clés portés par cette carte précise (fusionnés dans SEED_CARD_TAGS, cardTags.ts). */
  keywords?: { keywordId: string; value?: number }[];
  verificationSource?: string;
  /** Date ISO de l'ajout, pour l'historique — informatif uniquement. */
  addedAt?: string;
}

/**
 * Cartes ajoutées au catalogue depuis l'écran « Nouvelle carte » de
 * l'assistant (public/assistant/certification.js) — au même titre que les
 * certifications de dés (src/data/diceCertifications.json), mais pour des
 * cartes qui n'avaient encore *aucune* entrée dans le catalogue (contraire
 * d'une carte connue-mais-pas-encore-certifiée). Saisies avec toutes leurs
 * valeurs déjà lues sur la carte physique par la personne qui les ajoute :
 * fusionnées ci-dessous comme déjà certifiées, pas comme « à vérifier ».
 *
 * Fusionné dans DICE_PROFILES (diceProfiles.ts), CARD_IMAGES (cardImages.ts)
 * et CARD_NAMES_FR (cardNamesFr.ts) pour l'appli principale, et dans le
 * référentiel généré pour l'assistant (scripts/generate-assistant-reference.mjs).
 */
export const CUSTOM_CARDS: Record<string, CustomCardEntry> = customCardsJson as Record<string, CustomCardEntry>;
