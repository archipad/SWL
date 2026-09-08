# Assistant d’unité — reste à faire

## Priorité 1 — Certification des dés

- [ ] Comparer visuellement les 146 profils d’armes encore non certifiés avec leur cartes de référence.
- [ ] Comparer visuellement les 51 profils de défense encore non certifiés.
- [ ] Renseigner `verifiedAgainstCard`, `verificationSource`, `defenseVerifiedAgainstCard` et `defenseVerificationSource` uniquement après contrôle visuel.
- [ ] Exécuter `npm run verify:assistant-dice` après chaque lot de corrections.

## Priorité 2 — État persistant des unités

- [ ] Afficher dès la sélection les blessures, les points de vie restants et les pions Suppression de chaque unité.
- [ ] Calculer et afficher clairement les états **démoralisé** et **paniqué** selon le courage applicable.
- [ ] Conserver ces valeurs localement entre deux attaques et permettre leur correction manuelle.
- [ ] Signaler une unité vaincue et empêcher sa sélection comme attaquant.

## Priorité 3 — Ralliement

- [ ] Ajouter une étape de début d’activation pour les unités ayant des pions Suppression.
- [ ] Indiquer précisément le nombre de dés blancs de défense à lancer pour le ralliement.
- [ ] Permettre de saisir les blocages obtenus et retirer automatiquement les pions Suppression correspondants.
- [ ] Recalculer après le ralliement les états démoralisé et paniqué avant de poursuivre l’activation.
- [ ] Intégrer les mots-clés et effets qui modifient le ralliement, la suppression ou le courage.

## Priorité 4 — Validation en situation

- [ ] Tester sur iPad des scénarios complets à distance et au corps-à-corps.
- [ ] Vérifier les enchaînements Couvert, Esquive, Impact, Armure, Perforant, Gardien, Bouclier, Ion et Suppression.
- [ ] Vérifier que chaque question conditionnelle bloque la progression tant que Oui ou Non n’a pas été choisi.
