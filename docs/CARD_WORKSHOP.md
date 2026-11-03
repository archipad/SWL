# Atelier de cartes FR — format recto verso strict

Une carte sélectionnée = un seul recto et un seul verso.
Le recto conserve le visuel français. Le verso contient uniquement les noms et
définitions des mots-clés, sans effet propre, résumé du commandement, timing séparé,
référence, titre de carte ni avertissement. Les informations de suivi restent dans
l’interface. Sans mot-clé associé, le verso est vierge ; l’interface le signale.

Les définitions concises déjà présentes dans le glossaire sont utilisées ; à défaut,
la définition complète est conservée. Les mots-clés identiques partagés par plusieurs
armes sont regroupés, tout en conservant les valeurs distinctes.

La mise en page essaie des tailles de 9 à 7,5 points, sans supprimer de texte.
Si les définitions ne tiennent pas lisiblement, l’impression est bloquée avec le nom
de la carte. Aucune carte de suite n’est créée et aucun texte n’est rogné.
Les planches A4 alternent rectos et versos, impression à 100 %, bord long.

Accès : Gestion Armée → Atelier de cartes FR, ou #atelier-cartes.
Catalogue : unités, améliorations, commandements ; panier Tabletop avec quantités.
Les rectos personnels français sont conservés uniquement dans IndexedDB.
Les anciennes fiches personnelles sont filtrées à l’affichage sans effacer leur source.

Validation ciblée : npm run test:card-workshop, TypeScript, build et contrôle navigateur.
Le test de rendu garantit l’absence des effets propres sur les versos.
L’OCR et la traduction automatique des images anglaises restent le prochain lot.
La suite générale demeure bloquée par le parcours existant de Certification β
signalé dans la feuille de route. Aucun déploiement de ce lot.


Traductions locales du 31/10/2026 : cinq rectos anglais traduits sans service payant, Cassian FR réutilisé, identifiants existants conservés. Voir docs/CARD_WORKSHOP_TRANSLATIONS.md. Le parcours assisté pour les cartes inconnues reste à réaliser.


## Atelier — contrôle des 203 versos du 31/10/2026

65 versos complétés et 138 confirmés vierges. Définitions complètes vérifiées sur AMG 17/06/2026 (traductions FR de l’anglais officiel), références et empreintes conservées. Format agrandi disponible pour les 16 versos trop longs au format classique ; toujours un recto et un verso, sans coupure. Voir docs/CARD_WORKSHOP_KEYWORDS.md.


## Atelier — contrôle complet des 275 cartes restantes (31/10/2026)

Les 478 rectos sont relus : 333 versos renseignés, 145 vierges, 156 définitions complètes vérifiées sur AMG 17/06/2026. Les 40 corrections d’associations, 10 cartes retirées, 2 rectos Tristan/Ursa anciens et le recto Agent rebelle anglais sont tracés et signalés. Trois formats ; toujours un recto et un verso. Les 478 tiennent en grand format A4 (9 cartes l’exigent). Voir docs/CARD_WORKSHOP_KEYWORDS_COMPLETE.md. Les rectos anciens/anglais restent à remplacer ; aucun nouveau statut de certification du moteur ni déploiement.

## Rectos actuels — Tristan, Ursa et Agent Rebelle (31/10/2026)

Les trois rectos sont remplacés dans l’atelier : Tristan = Chef et Précis 2 ; Ursa = +1 Courage, Défense 1 et Chef ; Agent Rebelle = recto FR, Équipe : doctrine. Source des Wren : PDF officiel AMG Mandalorian Cards v1.1 (juillet 2026), p. 9. Les versos suivent les nouveaux rectos. Catalogue inchangé à 478 cartes, aucun doublon. Les anciennes alertes de ces trois cartes sont supprimées ; les dix cartes retirées restent signalées. Rapport, fichiers et contrôles : docs/CARD_WORKSHOP_FRONTS_CURRENT.md. Traductions locales relues par IA, validation humaine restant à effectuer ; aucune publication.
