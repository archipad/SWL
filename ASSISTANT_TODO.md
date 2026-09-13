# Assistant d’unité — reste à faire

## Priorité 1 — Certification des dés

- [ ] Comparer visuellement les 146 profils d’armes encore non certifiés avec leur cartes de référence.
- [ ] Comparer visuellement les 51 profils de défense encore non certifiés.
- [ ] Renseigner `verifiedAgainstCard`, `verificationSource`, `defenseVerifiedAgainstCard` et `defenseVerificationSource` uniquement après contrôle visuel.
- [ ] Exécuter `npm run verify:assistant-dice` après chaque lot de corrections.
- [x] Détecter dans l’écran de certification les cartes importées totalement
  absentes du catalogue (ni visuel ni profil de dés) — section « Cartes
  inconnues » (signalement Chewbacca Walking Carpet, 13/09/2026).
- [x] Permettre de résoudre une carte inconnue en l’aliasant vers une carte
  déjà certifiée (`src/data/cardKeyAliases.json`, partagé avec l’appli
  principale via `src/lib/cardNames.ts`).
- [x] Permettre de créer une carte entièrement nouvelle depuis l’écran de
  certification (nom FR, dés, PV/courage/effectif, visuel) —
  `src/data/customCards.json`, appliquée par le même circuit issue GitHub
  + Action que les corrections de dés (voir `newCards` dans
  `scripts/apply-dice-certification.mjs`). Le visuel se colle dans l’issue
  juste après un repère (`IMG-1`, `IMG-2`…) plutôt que d’être encodé dans
  le lot, pour rester dans la même limite de taille.
- [x] Inclure les mots-clés de la carte dans ce même formulaire « Nouvelle
  carte » (sélecteur type `KeywordTagEditor`, mêmes identifiants que le
  glossaire), fusionnés dans `SEED_CARD_TAGS` (`src/data/cardTags.ts`) au
  lieu de dépendre systématiquement du tag manuel « + mot-clé » séparé de
  l’onglet Armées (qui reste disponible, notamment pour corriger un tag
  après coup).

## Priorité 2 — État persistant des unités

- [x] Afficher dès la sélection les blessures, les points de vie restants et les pions Suppression de chaque unité.
- [x] Calculer et afficher clairement les états **démoralisé** et **paniqué** selon le courage applicable.
- [x] Conserver ces valeurs localement entre deux attaques et permettre leur correction manuelle.
- [x] Signaler une unité vaincue et empêcher sa sélection comme attaquant.

## Priorité 3 — Ralliement

- [x] Ajouter une étape de début d’activation pour les unités ayant des pions Suppression.
- [x] Indiquer précisément le nombre de dés blancs de défense à lancer pour le ralliement.
- [x] Permettre de saisir les blocages et adrénalines obtenus et retirer automatiquement les pions Suppression correspondants.
- [x] Recalculer après le ralliement les états démoralisé et paniqué avant de poursuivre l’activation.
- [ ] Intégrer les mots-clés et effets qui modifient le ralliement, la suppression ou le courage.

## Priorité 4 — Validation en situation

- [x] Ajouter une matrice automatisée couvrant les scénarios à distance et au corps-à-corps.
- [x] Vérifier automatiquement les enchaînements Couvert, Esquive, Impact, Armure, Perforant, Gardien, Bouclier, Ion et Suppression.
- [x] Vérifier que chaque question conditionnelle bloque la progression tant que Oui ou Non n’a pas été choisi.
- [x] Vérifier automatiquement les contraintes de mise en page et de saisie tactile iPad.
- [ ] Exécuter une recette visuelle sur un iPad physique pour les orientations portrait et paysage.
