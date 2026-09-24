import { COMMAND_CARDS, COMMAND_SUITE_RULE, type CommandCard, type CommandFaction } from '../data/commandCards';
import type { ParsedList } from '../types';

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

export function eligibleCommandCards(faction: CommandFaction | null): CommandCard[] {
  if (!faction) return COMMAND_CARDS.filter((card) => card.faction === 'generique');
  return COMMAND_CARDS.filter((card) => card.faction === faction || card.faction === 'generique');
}

export function commandCardById(id: string): CommandCard | undefined {
  return COMMAND_CARDS.find((card) => card.id === id);
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
