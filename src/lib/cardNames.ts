import { normalizeName } from './normalize';
import { CARD_NAMES_FR, EN_KEY_BY_FRENCH_NAME } from '../data/cardNamesFr';
import aliasesJson from '../data/cardKeyAliases.json';
import upgradeCollisionsJson from '../data/upgradeNameCollisions.json';

// Alias de clés de carte partagés entre l'appli principale et l'assistant
// (public/assistant/, qui lit ce même fichier via reference-data.js généré) --
// voir src/data/cardKeyAliases.json pour la liste et son historique.
const CARD_KEY_ALIASES: Record<string, string> = aliasesJson;

function resolveAlias(key: string): string {
  const visited = new Set<string>();
  let current = key;
  while (CARD_KEY_ALIASES[current] && !visited.has(current)) {
    visited.add(current);
    current = CARD_KEY_ALIASES[current];
  }
  return current;
}

/**
 * Nom d'affichage d'une carte (unité ou amélioration) : le titre français
 * officiel s'il est connu (CARD_NAMES_FR), sinon le nom tel quel (format
 * Tabletop Admiral, anglais) — jamais d'erreur ni de case vide pour une
 * carte pas encore vérifiée. À utiliser UNIQUEMENT pour l'affichage.
 *
 * Passe par canonicalCardKey() (et donc par CARD_KEY_ALIASES) avant le
 * lookup — indispensable pour qu'un alias (ex. « Chewbacca Walking Carpet »
 * -> « Chewbacca ») affiche le vrai nom français au lieu de retomber sur le
 * nom brut de l'export Tabletop Admiral faute d'entrée CARD_NAMES_FR dédiée
 * à cette variante précise (signalement utilisateur, 13/09/2026 — jusque-là,
 * seul « Ahsoka Tano Fulcrum » avait sa propre entrée manuelle). Un nouvel
 * alias ajouté depuis l'assistant récupère donc automatiquement le bon nom,
 * sans entrée CARD_NAMES_FR supplémentaire à ajouter à la main.
 */
export function frenchCardName(name: string): string {
  return CARD_NAMES_FR[canonicalCardKey(name)] ?? name;
}

/**
 * Clé normalisée à utiliser pour tout lookup de données de carte (mots-clés,
 * visuel, dés). Toutes ces tables sont indexées par nom ANGLAIS (format
 * Tabletop Admiral) — mais une liste peut aussi être saisie en texte libre
 * avec les noms FRANÇAIS imprimés sur les vraies cartes (ex. « Marche
 * Impériale » au lieu de « Imperial March »), auquel cas un simple
 * normalizeName(name) ne matche plus rien et la carte perd silencieusement
 * ses mots-clés/son visuel. On tente donc, dans l'ordre : la clé anglaise
 * directe, puis la table inverse FR -> EN ; à défaut (carte inconnue des
 * deux côtés), le nom normalisé tel quel, sans erreur.
 */
export function canonicalCardKey(name: string): string {
  const norm = normalizeName(name);
  if (norm in CARD_KEY_ALIASES) return resolveAlias(norm);
  if (norm in CARD_NAMES_FR) return norm;
  const translated = EN_KEY_BY_FRENCH_NAME[norm] ?? norm;
  return resolveAlias(translated);
}

// Améliorations que Tabletop Admiral nomme exactement comme une carte Unité (clé normalisée -> nom distinct).
// Sans cette table, l'importeur rattachait l'amélioration à la carte UNITÉ (ex. l'amélioration
// « Chewbacca » recevait les armes et les mots-clés de l'unité Chewbacca). Voir src/data/upgradeNameCollisions.json ;
// src/lib/importAudit.ts signale toute autre collision non répertoriée.
const UPGRADE_NAME_COLLISIONS: Record<string, string> = upgradeCollisionsJson;

/** Résout les collisions où Tabletop Admiral donne à une amélioration
 * exactement le même titre qu'à la carte Unité correspondante. */
export function canonicalImportedUpgradeName(name: string): string {
  return UPGRADE_NAME_COLLISIONS[normalizeName(name)] ?? name;
}

/**
 * Vrai si cette carte est la variante « Groupe de Combat » (Strike Team,
 * nom Tabletop Admiral) d'une unité — le titre imprimé sur la carte est
 * identique à la version classique (même frenchCardName()), donc les deux
 * ne se distinguent PAS à l'affichage sans cette étiquette. Sert à
 * départager, dans un sélecteur attaquant/défenseur, deux unités qui
 * afficheraient sinon un nom strictement identique (ex. deux « Commandos
 * Rebelles » dont un seul est un Groupe de Combat) — signalement
 * utilisateur du 04/09/2026.
 */
export function isCombatTeamVariant(name: string): boolean {
  return canonicalCardKey(name).includes('strike team');
}
