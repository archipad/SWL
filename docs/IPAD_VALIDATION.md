# Validation iPad

## Tailles couvertes automatiquement

- iPad portrait : 768 × 1024, interface tactile.
- iPad paysage : 1024 × 768, interface tactile.
- iPad Pro paysage : 1366 × 1024, interface tactile.

Les contrats vérifient la présence des deux orientations, des zones tactiles de 44 px, des marges sûres et de la grille centrale à trois colonnes. Le build protège également le parcours attaque complet.

## Contrôle matériel final

Sur Safari, vérifier dans les deux orientations : sélection des unités, choix des armes et de la portée, couvert, défense, blessures, ralliement, boutons collants et absence de recouvrement par les barres système. Cette vérification physique reste nécessaire car Safari iPad calcule ses barres dynamiques différemment d'un navigateur émulé.

Consigner une capture et la version testée avant de cocher la validation physique dans `ROADMAP.md`.
