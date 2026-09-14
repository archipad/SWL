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

export interface UnitModel {
  id: string;
  sourceCard: string;
  maxWounds: number;
  isUpgrade: boolean;
}

export interface CertifiedUnitRoster {
  models: UnitModel[];
  courage: number | null;
  suppressionImmune: boolean;
  certified: boolean;
  missingCards: string[];
}

/** Source unique du calcul d'effectif pour l'assistant et le suivi de partie. */
export function buildCertifiedUnitRoster(unit: ParsedUnit): CertifiedUnitRoster {
  const base = certified[canonicalCardKey(unit.name)]?.unitStats;
  if (!base) {
    return { models: [], courage: null, suppressionImmune: false, certified: false, missingCards: [unit.name] };
  }

  const models: UnitModel[] = Array.from({ length: base.baseModels }, (_, index) => ({
    id: `base-${index}`,
    sourceCard: unit.name,
    maxWounds: base.woundsPerModel,
    isUpgrade: false,
  }));
  const missingCards: string[] = [];

  unit.upgrades.forEach((upgrade, upgradeIndex) => {
    const profile = certified[canonicalCardKey(upgrade.name)];
    if (!profile || !Number.isInteger(profile.addedModels)) return;
    const addedModels = Math.max(0, profile.addedModels ?? 0);
    if (addedModels && !profile.addedModelWounds && !base.woundsPerModel) missingCards.push(upgrade.name);
    for (let modelIndex = 0; modelIndex < addedModels; modelIndex += 1) {
      models.push({
        id: `upgrade-${upgradeIndex}-${canonicalCardKey(upgrade.name)}-${modelIndex}`,
        sourceCard: upgrade.name,
        maxWounds: profile.addedModelWounds ?? base.woundsPerModel,
        isUpgrade: true,
      });
    }
  });

  return {
    models,
    courage: base.courage,
    suppressionImmune: !!base.suppressionImmune || base.courage === null,
    certified: missingCards.length === 0,
    missingCards,
  };
}
