# Contrat du moteur de règles

## Principes

- Une réserve de dés provient des armes sélectionnées, du nombre de figurines qui les utilisent et des modificateurs applicables.
- Attaque et défense conservent leurs couleurs et formes propres.
- Portée, corps-à-corps, couvert, conversions, relances, perforant et immunités doivent être appliqués dans l'ordre du parcours.
- Une condition nécessaire reçoit une réponse explicite Oui/Non et bloque l'étape suivante tant qu'elle reste sans réponse.
- Le total de dés saisi doit correspondre au total attendu avant de poursuivre.
- Toute modification doit rester visible dans le suivi des dés jusqu'à la fin de la résolution.

## Données critiques

Les couleurs de dés, portées, défenses, PV, courage et effectifs ne doivent être exploités automatiquement que lorsqu'ils sont présents dans les profils certifiés. Une carte inconnue doit être signalée au lieu d'inventer une valeur.

## Effectifs et blessures

`buildCertifiedUnitRoster()` est la source commune de calcul. La carte Unité fournit figurines de base, PV par figurine et courage. Une amélioration ne modifie l'effectif que si sa certification contient `addedModels`; `addedModelWounds` surcharge les PV individuels si nécessaire.

Les blessures sont réparties par figurine. Le nombre restant correspond aux figurines dont les PV ne sont pas entièrement consommés. Une unité sans courage ou immunisée à la suppression n'entre pas dans les états démoralisé/paniqué.

## Tests obligatoires lors d'une correction de règle

- Ajouter un cas représentatif dans `scripts/test-assistant-engine.mjs` ou `scripts/test-assistant-contracts.mjs`.
- Vérifier au moins une unité différente partageant le même mot-clé.
- Pour un changement de carte ou d'import, exécuter également `scripts/test-import-pipeline.mjs`.
- Ne jamais considérer une vérification visuelle comme substitut aux tests de calcul.
