import certifications from '../data/diceCertifications.json';
import { canonicalCardKey } from './cardNames';
import type { ParsedUnit } from '../types';

type CertifiedRecord = {
  unitStats?: { woundsPerModel: number; courage: number | null; baseModels: number; suppressionImmune?: boolean };
  addedModels?: number;
  addedModelWounds?: number;
};

const certified = certifications as Record<string, CertifiedRecord>;

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
