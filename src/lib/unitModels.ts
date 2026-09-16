import certifications from '../data/diceCertifications.json';
import { CUSTOM_CARDS } from '../data/customCards';
import { canonicalCardKey } from './cardNames';
import type { ParsedUnit } from '../types';

type CertifiedRecord = {
  unitStats?: { woundsPerModel: number; courage: number | null; baseModels: number; suppressionImmune?: boolean };
  addedModels?: number;
  addedModelWounds?: number;
};

// Les cartes ajoutées depuis l'écran « Nouvelle carte » de l'assistant
// (src/data/customCards.json, déjà certifiées à l'ajout — voir son en-tête)
// doivent aussi compter ici : sans cette fusion, buildCertifiedUnitRoster()
// ne les voit jamais (il ne lisait jusqu'ici que diceCertifications.json en
// dur) et signale à tort « Effectif impossible à calculer avec certitude »
// pour toute carte ajoutée par ce circuit — alors que cardImages.ts,
// cardNamesFr.ts et diceProfiles.ts fusionnent bien CUSTOM_CARDS, eux.
const certified: Record<string, CertifiedRecord> = {
  ...(certifications as Record<string, CertifiedRecord>),
  ...Object.fromEntries(
    Object.entries(CUSTOM_CARDS).map(([key, card]) => [
      key,
      { unitStats: card.unitStats, addedModels: card.addedModels, addedModelWounds: card.addedModelWounds },
    ]),
  ),
};

export interface UnitMoraleProfile {
  courage: number | null;
  suppressionImmune: boolean;
  /** Le courage/l'immunité de cette carte ont été vérifiés sur une carte réelle. */
  certified: boolean;
}

/**
 * Source unique du courage/immunité à la suppression pour l'assistant et le
 * suivi de partie. L'application ne suit plus les PV ni l'effectif d'une
 * unité (choix produit) : seul ce qui alimente le moral (démoralisé/paniqué)
 * reste calculé ici.
 */
export function getUnitMoraleProfile(unit: ParsedUnit): UnitMoraleProfile {
  const base = certified[canonicalCardKey(unit.name)]?.unitStats;
  if (!base) {
    return { courage: null, suppressionImmune: false, certified: false };
  }
  return {
    courage: base.courage,
    suppressionImmune: !!base.suppressionImmune || base.courage === null,
    certified: true,
  };
}
