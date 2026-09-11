import certifications from '../data/diceCertifications.json';
import { CARD_IMAGES } from '../data/cardImages';
import { CARD_NAMES_FR } from '../data/cardNamesFr';
import { DICE_PROFILES } from '../data/diceProfiles';
import { canonicalCardKey } from './cardNames';
import { buildCertifiedUnitRoster } from './unitModels';
import type { ParsedList } from '../types';

type CertifiedRecord = { weapons?: unknown[]; defenseColor?: string; unitStats?: unknown; addedModels?: number };
const certified = certifications as Record<string, CertifiedRecord>;

export type ImportIssueKind = 'visual' | 'translation' | 'unit-stats' | 'dice' | 'models';
export interface ImportIssue { card: string; unit: string; kind: ImportIssueKind; message: string }
export interface ImportUnitAudit { name: string; models: number | null; maxWounds: number | null; issues: ImportIssue[] }
export interface ImportAudit {
  cards: number;
  readyCards: number;
  units: ImportUnitAudit[];
  issues: ImportIssue[];
  safeForEngine: boolean;
}

export function auditImportedList(list: ParsedList): ImportAudit {
  const allIssues: ImportIssue[] = [];
  let cards = 0;
  let readyCards = 0;
  const units = list.units.map((unit): ImportUnitAudit => {
    const unitIssues: ImportIssue[] = [];
    const inspect = (name: string, isUnit: boolean) => {
      cards += 1;
      const key = canonicalCardKey(name);
      const issuesBefore = unitIssues.length;
      if (!CARD_IMAGES[key]) unitIssues.push({ card: name, unit: unit.name, kind: 'visual', message: 'Visuel non raccordé' });
      if (!CARD_NAMES_FR[key]) unitIssues.push({ card: name, unit: unit.name, kind: 'translation', message: 'Nom français non raccordé' });
      const profile = DICE_PROFILES[key];
      const certification = certified[key];
      if (isUnit && !certification?.unitStats) unitIssues.push({ card: name, unit: unit.name, kind: 'unit-stats', message: 'PV, courage ou effectif non certifiés' });
      if (profile?.weapons?.length && !certification?.weapons?.length) unitIssues.push({ card: name, unit: unit.name, kind: 'dice', message: "Dés d’attaque non certifiés" });
      if (profile?.defenseColor && !certification?.defenseColor) unitIssues.push({ card: name, unit: unit.name, kind: 'dice', message: 'Dé de défense non certifié' });
      if (!profile && !CARD_IMAGES[key]) unitIssues.push({ card: name, unit: unit.name, kind: 'dice', message: 'Carte inconnue du référentiel moteur' });
      if (unitIssues.length === issuesBefore) readyCards += 1;
    };

    inspect(unit.name, true);
    unit.upgrades.forEach((upgrade) => inspect(upgrade.name, false));
    const roster = buildCertifiedUnitRoster(unit);
    const maxWounds = roster.models.length ? roster.models.reduce((sum, model) => sum + model.maxWounds, 0) : null;
    if (!roster.certified) unitIssues.push({ card: unit.name, unit: unit.name, kind: 'models', message: 'Effectif impossible à calculer avec certitude' });
    allIssues.push(...unitIssues);
    return { name: unit.name, models: roster.models.length || null, maxWounds, issues: unitIssues };
  });
  return { cards, readyCards, units, issues: allIssues, safeForEngine: allIssues.length === 0 };
}
