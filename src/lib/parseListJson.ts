import type { ParsedCard, ParsedList, ParsedUnit } from '../types';
import { normalizeName } from './normalize';

/** Forme du JSON exporté par Tabletop Admiral pour Star Wars: Legion. */
interface TabletopAdmiralUnit {
  name: string;
  upgrades?: string[];
  loadout?: string[];
}

interface TabletopAdmiralList {
  listname?: string;
  points?: number;
  author?: string;
  numActivations?: number;
  armyFaction?: string;
  battleForce?: string | null;
  commandCards?: string[];
  contingencies?: string[];
  units: TabletopAdmiralUnit[];
  battlefieldDeck?: unknown;
  listlink?: string;
}

const FACTION_LABELS: Record<string, string> = {
  empire: 'Empire Galactique',
  rebel: 'Alliance Rebelle',
  rebels: 'Alliance Rebelle',
  republic: 'République Galactique',
  separatist: 'Alliance Séparatiste',
  separatists: 'Alliance Séparatiste',
  mercenary: 'Mercenaires',
  mercenaries: 'Mercenaires',
  scum: 'Mercenaires',
};

function looksLikeTabletopAdmiral(value: unknown): value is TabletopAdmiralList {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.units) && v.units.every((u) => u && typeof (u as { name?: unknown }).name === 'string');
}

/**
 * Parse un export JSON de Tabletop Admiral (structure stable, bien plus
 * fiable que la vue texte). Retourne `null` si le texte fourni n'est pas un
 * JSON reconnaissable dans ce format, pour laisser la main au parseur texte.
 */
export function parseArmyListJson(input: string): ParsedList | null {
  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch {
    return null;
  }
  if (!looksLikeTabletopAdmiral(data)) return null;

  const seen = new Map<string, number>();
  const nextSlug = (name: string) => {
    const base = normalizeName(name) || 'carte';
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };

  const units: ParsedUnit[] = data.units.map((u) => {
    const upgradeNames = [...(u.upgrades ?? []), ...(u.loadout ?? [])];
    const upgrades: ParsedCard[] = upgradeNames.map((name) => ({
      key: nextSlug(name), name, kind: 'upgrade',
    }));
    return {
      key: nextSlug(u.name), name: u.name, kind: 'unit', section: 'Unités', upgrades,
    };
  });

  const factionKey = data.armyFaction?.toLowerCase().trim();
  const faction = (factionKey && FACTION_LABELS[factionKey]) || data.armyFaction || undefined;

  return {
    faction,
    totalPoints: typeof data.points === 'number' ? data.points : undefined,
    units,
    unparsedLines: [],
    listName: data.listname,
    commandCards: data.commandCards?.length ? data.commandCards : undefined,
    contingencies: data.contingencies?.length ? data.contingencies : undefined,
    battleForce: data.battleForce ?? undefined,
  };
}
