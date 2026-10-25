import { COMMAND_CARDS, COMMAND_SUITE_RULE, type CommandCard, type CommandFaction } from '../data/commandCards';
import type { ParsedList } from '../types';
import { canonicalCardKey } from './cardNames';

/** Détecte la faction Commandement (Empire/Rebelles) d'une liste importée à
 * partir du texte libre de `faction` (pas de valeur normalisée garantie côté
 * import .txt) — renvoie `null` si aucune correspondance sûre, plutôt que de
 * deviner, pour ne pas bloquer ni afficher un mauvais catalogue. */
export function commandFactionForList(list: ParsedList | null): CommandFaction | null {
  const label = (list?.faction || '').toLowerCase();
  if (label.includes('empire')) return 'empire';
  if (label.includes('rebel')) return 'rebelles';
  return null;
}

/** Noms canoniques des unités et améliorations d'une liste (pour débloquer les commandements mercenaires). */
function listCardKeys(list: ParsedList | null | undefined): string[] {
  if (!list) return [];
  return list.units.flatMap((unit) => [unit.name, ...unit.upgrades.map((up) => up.name)]).map(canonicalCardKey);
}

/** Une carte mercenaire est jouable si la liste contient son personnage (unité ou amélioration) ou l'a déjà choisie. */
export function mercenaryCardUnlocked(card: CommandCard, list: ParsedList | null | undefined): boolean {
  if (card.faction !== 'mercenaire') return false;
  const keys = listCardKeys(list);
  if ((card.unlockedBy ?? []).some((prefix) => keys.some((key) => key === prefix || key.startsWith(`${prefix} `)))) return true;
  return (list?.commandCards ?? []).some((name) => commandCardForName(name)?.id === card.id);
}

export function eligibleCommandCards(faction: CommandFaction | null, list?: ParsedList | null): CommandCard[] {
  return COMMAND_CARDS.filter((card) => card.faction === 'generique' || (faction !== null && card.faction === faction)
    || mercenaryCardUnlocked(card, list));
}

export function commandCardById(id: string): CommandCard | undefined {
  return COMMAND_CARDS.find((card) => card.id === id);
}

/** Carte du paquet du site désignée par un nom de liste importée : identifiant, nom français ou nom
 * anglais Tabletop Admiral (englishName), comme la reconnaissance de l'écran d'import. */
export function commandCardForName(name: string): CommandCard | undefined {
  const key = canonicalCardKey(name);
  return COMMAND_CARDS.find((card) => card.id.replace(/-/g, ' ') === key || canonicalCardKey(card.name) === key
    || (card.englishName !== undefined && canonicalCardKey(card.englishName) === key));
}

/** Nombre de cartes déjà choisies par valeur de PIP dans une suite en cours
 * de construction (y compris la carte à 4 PIP obligatoire). */
export function suitePipCounts(suite: string[]): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const id of suite) {
    const card = commandCardById(id);
    if (card) counts[card.pip] += 1;
  }
  return counts;
}

/** Règle officielle : exactement 2 cartes à 1/2/3 PIP + 1 carte à 4 PIP (7 au total, sans doublon). */
export function suiteIsComplete(suite: string[]): boolean {
  const counts = suitePipCounts(suite);
  return suite.length === COMMAND_SUITE_RULE.total
    && counts[1] === COMMAND_SUITE_RULE.perPip[1]
    && counts[2] === COMMAND_SUITE_RULE.perPip[2]
    && counts[3] === COMMAND_SUITE_RULE.perPip[3]
    && counts[4] === COMMAND_SUITE_RULE.perPip[4];
}

/** Un joueur peut encore ajouter une carte de ce PIP à sa suite (moins de 2,
 * ou moins de 1 pour la carte à 4 PIP) et elle n'y est pas déjà. */
export function canAddToSuite(suite: string[], cardId: string): boolean {
  if (suite.includes(cardId)) return false;
  const card = commandCardById(cardId);
  if (!card) return false;
  const counts = suitePipCounts(suite);
  const limit = COMMAND_SUITE_RULE.perPip[card.pip as 1 | 2 | 3 | 4];
  return counts[card.pip] < limit;
}
