# Cartes, certifications et imports

## Format recommandé

Importer le JSON exporté par Tabletop Admiral. Le parseur texte reste un secours, mais ne garantit pas toutes les métadonnées.

## Raccordement automatique

Une carte importée est immédiatement fonctionnelle si sa variante se résout vers une clé canonique possédant :

- un nom français si une traduction existe ;
- un visuel dans `public/cards/` et un raccordement dans `cardImages.ts` ;
- ses effets/notes lorsque nécessaires ;
- un profil de dés pour toute arme ;
- une certification pour toute donnée moteur critique ;
- `addedModels` uniquement si l'amélioration ajoute réellement des figurines.

## Ajouter une nouvelle carte

1. Ajouter le visuel couleur dans `public/cards/` avec un nom stable.
2. Ajouter le nom Tabletop Admiral et ses variantes à la canonicalisation.
3. Ajouter la traduction française vérifiée sur la carte.
4. Ajouter tags, notes et profil de dés applicables.
5. Certifier les données critiques dans `diceCertifications.json`.
6. Régénérer `reference-data.js`.
7. Lancer `npm run verify`.

## Ce que l'audit doit distinguer

- Problème catalogue : image ou traduction absente ; la carte peut néanmoins avoir un moteur certifié.
- Problème de certification : dés, défense, PV, courage ou effectif non vérifié ; l'automatisation concernée ne doit pas être présentée comme certaine.

Une amélioration sans arme et sans ajout de figurine ne doit pas apparaître artificiellement dans la certification des dés/effectifs. Elle reste contrôlée par le catalogue et, si nécessaire, par ses tags ou notes.
