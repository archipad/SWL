import upgradeCardUse from './upgradeCardUse.json';
import upgradeTextsFr from './upgradeTextsFr.json';
import { cardNoteFor } from './cardNotes';
import { CUSTOM_CARDS } from './customCards';
import { canonicalCardKey } from '../lib/cardNames';

export type UpgradeUse = 'passive' | 'exhaust' | 'discard' | 'both';

/**
 * Texte français complet d'une carte d'amélioration, pour l'encart imprimé sous chaque unité
 * (signalement du 24/10/2026 : le texte des petites cartes est illisible une fois imprimé, et une
 * carte sans mot-clé, comme Munitions Antichar, n'apparaissait nulle part). Sources, dans l'ordre :
 * transcription relue de la carte FR (upgradeTextsFr.json), texte français validé d'une fiche
 * communautaire (customCards.json, translationProof), puis la paraphrase de cardNotes.ts.
 */
export function upgradeTextFor(name: string): string | undefined {
  const key = canonicalCardKey(name);
  const transcribed = (upgradeTextsFr.cards as Record<string, { text: string }>)[key]?.text;
  return transcribed ?? CUSTOM_CARDS[key]?.translationProof?.frenchText ?? CUSTOM_CARDS[key]?.cardText ?? cardNoteFor(name);
}

/** Symbole d'utilisation imprimé sur la carte (↱ incliner, ✖ supprimer), s'il est connu. */
export function upgradeUseFor(name: string): UpgradeUse | undefined {
  return (upgradeCardUse.cards as Record<string, { use: UpgradeUse }>)[canonicalCardKey(name)]?.use;
}
