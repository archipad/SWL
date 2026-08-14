import type { ParsedCard, ParsedList, ParsedUnit } from '../types';
import { normalizeName } from './normalize';

const SECTION_HEADERS = [
  'commandant', 'commander', 'commanders',
  'opérative', 'operative', 'operatives', 'agent',
  'corps',
  'forces spéciales', 'forces speciales', 'special forces',
  'soutien', 'support',
  'lourd', 'heavy',
  'véhicule', 'vehicule', 'vehicle', 'vehicles', 'véhicules',
  'contingence', 'contingency',
  'force de combat', 'battle force',
  'allié', 'allie', 'ally', 'allies', 'alliés',
];

const FACTION_HINTS = [
  'empire galactique', 'galactic empire',
  'alliance rebelle', 'rebel alliance',
  'république galactique', 'republique galactique', 'galactic republic',
  'alliance séparatiste', 'alliance separatiste', 'separatist alliance', 'confédération', 'confederacy',
  'clone', 'mercenaire', 'mercenary', 'mercenaries', 'scum',
];

const BULLET_RE = /^\s*[-•*+‣▪]\s*/;
const POINTS_RE = /^(.*?)\s*[x×]\s*(\d+)?\s*\((\d+)\)\s*$|^(.*?)\s*\((\d+)\)\s*$/i;
const TOTAL_RE = /(\d+)\s*\/\s*(\d+)/;

function slugCounter() {
  const seen = new Map<string, number>();
  return (name: string) => {
    const base = normalizeName(name) || 'carte';
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };
}

/** Extrait "Nom" et "points" d'une ligne de carte, si elle en contient. */
function matchCardLine(line: string): { name: string; points?: number } | null {
  const m = POINTS_RE.exec(line.trim());
  if (!m) return null;
  const name = (m[1] ?? m[4] ?? '').trim();
  const pts = m[3] ?? m[5];
  if (!name) return null;
  return { name, points: pts ? Number(pts) : undefined };
}

function isSectionHeader(line: string): string | null {
  const t = normalizeName(line);
  if (!t) return null;
  for (const h of SECTION_HEADERS) {
    if (t === normalizeName(h)) return line.trim();
  }
  return null;
}

function isIndented(rawLine: string): boolean {
  return BULLET_RE.test(rawLine) || /^\s{2,}\S/.test(rawLine);
}

/**
 * Parseur tolérant pour les listes exportées en texte depuis un site de
 * construction de listes (ex. Tabletop Admiral, vue texte). Le format exact
 * varie selon la source ; ce parseur reconnaît :
 *  - une ligne de faction en tête de liste,
 *  - des en-têtes de section (Commandant, Corps, Spécial, Soutien, Lourd…),
 *  - une ligne d'unité "Nom (points)",
 *  - des lignes d'amélioration indentées ou précédées d'une puce "- Nom (points)",
 *  - une ligne de total "XXX/800".
 * Tout ce qui n'est pas reconnu est conservé dans `unparsedLines` plutôt que
 * silencieusement perdu.
 */
export function parseArmyListText(input: string): ParsedList {
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  const nextSlug = slugCounter();

  const result: ParsedList = { units: [], unparsedLines: [] };
  let currentSection = 'Liste';
  let currentUnit: ParsedUnit | null = null;
  let sawAnyStructure = false;

  const pushOrphan = (card: ParsedCard) => {
    // Une amélioration rencontrée sans unité précédente : on la range dans
    // une unité "fourre-tout" pour ne rien perdre.
    let bucket = result.units.find((u) => u.key === 'autres-cartes');
    if (!bucket) {
      bucket = {
        key: 'autres-cartes', kind: 'unit', name: 'Autres cartes',
        section: currentSection, upgrades: [],
      };
      result.units.push(bucket);
    }
    bucket.upgrades.push(card);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Total de points, ex "797/800" ou "Total : 797/800 pts"
    const totalMatch = TOTAL_RE.exec(line);
    if (totalMatch && /total|pts|points|\//i.test(line) && line.length < 40) {
      result.totalPoints = Number(totalMatch[1]);
      result.pointsLimit = Number(totalMatch[2]);
      sawAnyStructure = true;
      continue;
    }

    // Ligne de faction (uniquement avant la première section/unité repérée)
    if (!sawAnyStructure && !result.faction) {
      const t = normalizeName(line);
      if (FACTION_HINTS.some((f) => t.includes(normalizeName(f)))) {
        result.faction = line;
        continue;
      }
    }

    const header = isSectionHeader(line);
    if (header) {
      currentSection = header;
      sawAnyStructure = true;
      continue;
    }

    const indented = isIndented(rawLine);
    const cleanLine = line.replace(BULLET_RE, '');
    const card = matchCardLine(cleanLine);

    if (!card) {
      // Pas de points détectés : soit une ligne de titre de liste, soit du
      // bruit. On la garde de côté pour affichage/debug plutôt que la perdre.
      if (!sawAnyStructure && !result.faction) {
        result.faction = result.faction ?? line;
      } else {
        result.unparsedLines.push(line);
      }
      continue;
    }

    sawAnyStructure = true;

    if (indented) {
      const upgrade: ParsedCard = {
        key: nextSlug(card.name), name: card.name, points: card.points, kind: 'upgrade',
      };
      if (currentUnit) currentUnit.upgrades.push(upgrade);
      else pushOrphan(upgrade);
    } else {
      currentUnit = {
        key: nextSlug(card.name), name: card.name, points: card.points,
        kind: 'unit', section: currentSection, upgrades: [],
      };
      result.units.push(currentUnit);
    }
  }

  return result;
}
