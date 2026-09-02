import type { KeywordDef } from '../types';

/**
 * Texte à afficher pour un mot-clé PARTOUT SAUF l'onglet Glossaire (qui
 * reste sur `def.definition`, le texte officiel intégral — demande
 * explicite de l'utilisateur : la version courte est pratique en jeu, mais
 * la référence complète doit rester consultable quelque part). Retombe sur
 * `definition` si `shortDefinition` n'est pas encore renseignée, pour
 * qu'aucun mot-clé ne se retrouve sans texte — ex. un mot-clé ajouté par
 * l'utilisateur via le bouton « + mot-clé personnalisé ».
 */
export function shortDef(def: KeywordDef): string {
  return def.shortDefinition ?? def.definition;
}
