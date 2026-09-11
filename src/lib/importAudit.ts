import certifications from '../data/diceCertifications.json';
import { CARD_IMAGES } from '../data/cardImages';
import { CARD_NAMES_FR } from '../data/cardNamesFr';
import { DICE_PROFILES } from '../data/diceProfiles';
import { canonicalCardKey } from './cardNames';
import { buildCertifiedUnitRoster } from './unitModels';
import type { ParsedList } from '../types';

type CertifiedWeapon = { index?: number; name?: string };
type CertifiedRecord = { weapons?: CertifiedWeapon[]; defenseColor?: string; unitStats?: unknown; addedModels?: number };
const certified = certifications as Record<string, CertifiedRecord>;

export type ImportIssueKind = 'visual' | 'translation' | 'unit-stats' | 'dice' | 'models';
export type ImportIssueScope = 'certification' | 'catalog';
export interface ImportIssue { card: string; unit: string; kind: ImportIssueKind; scope: ImportIssueScope; message: string }
export interface ImportUnitAudit { name: string; models: number | null; maxWounds: number | null; issues: ImportIssue[] }
export interface ImportAudit {
  cards: number;
  readyCards: number;
  units: ImportUnitAudit[];
  issues: ImportIssue[];
  certificationIssues: ImportIssue[];
  catalogIssues: ImportIssue[];
  certificationCards: number;
  catalogCards: number;
  safeForEngine: boolean;
  complete: boolean;
}

const uniqueCards = (issues: ImportIssue[]) => new Set(issues.map((issue) => canonicalCardKey(issue.card))).size;

function weaponIsCertified(
  weapon: NonNullable<(typeof DICE_PROFILES)[string]>['weapons'][number],
  index: number,
  certification?: CertifiedRecord,
): boolean {
  if (weapon.verifiedAgainstCard) return true;
  return !!certification?.weapons?.some((entry) => entry.index === index || entry.name === weapon.name);
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
      if (!CARD_IMAGES[key]) unitIssues.push({ card: name, unit: unit.name, kind: 'visual', scope: 'catalog', message: 'Visuel non raccordé au catalogue' });
      if (!CARD_NAMES_FR[key]) unitIssues.push({ card: name, unit: unit.name, kind: 'translation', scope: 'catalog', message: 'Nom français non raccordé au catalogue' });
      const profile = DICE_PROFILES[key];
      const certification = certified[key];
      if (isUnit && !profile?.unitStats?.verifiedAgainstCard && !certification?.unitStats) {
        unitIssues.push({ card: name, unit: unit.name, kind: 'unit-stats', scope: 'certification', message: 'PV, courage ou effectif non certifiés' });
      }
      if (profile?.weapons?.some((weapon, index) => !weaponIsCertified(weapon, index, certification))) {
        unitIssues.push({ card: name, unit: unit.name, kind: 'dice', scope: 'certification', message: "Dés d’attaque non certifiés" });
      }
      if (profile?.defenseColor && !profile.defenseVerifiedAgainstCard && !certification?.defenseColor) {
        unitIssues.push({ card: name, unit: unit.name, kind: 'dice', scope: 'certification', message: 'Dé de défense non certifié' });
      }
      if (unitIssues.length === issuesBefore) readyCards += 1;
    };

    inspect(unit.name, true);
    unit.upgrades.forEach((upgrade) => inspect(upgrade.name, false));
    const roster = buildCertifiedUnitRoster(unit);
    const maxWounds = roster.models.length ? roster.models.reduce((sum, model) => sum + model.maxWounds, 0) : null;
    if (!roster.certified) unitIssues.push({ card: unit.name, unit: unit.name, kind: 'models', scope: 'certification', message: 'Effectif impossible à calculer avec certitude' });
    allIssues.push(...unitIssues);
    return { name: unit.name, models: roster.models.length || null, maxWounds, issues: unitIssues };
  });
  const certificationIssues = allIssues.filter((issue) => issue.scope === 'certification');
  const catalogIssues = allIssues.filter((issue) => issue.scope === 'catalog');
  return {
    cards,
    readyCards,
    units,
    issues: allIssues,
    certificationIssues,
    catalogIssues,
    certificationCards: uniqueCards(certificationIssues),
    catalogCards: uniqueCards(catalogIssues),
    safeForEngine: certificationIssues.length === 0,
    complete: allIssues.length === 0,
  };
}
