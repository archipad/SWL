# Atelier — contrôle complet des mots-clés (31 octobre 2026)

Les 275 cartes restantes ont été relues visuellement : 81 unités, 169 améliorations et 25 commandements. Avec le lot initial de 203 cartes, les 478 rectos possèdent désormais une décision tracée et une empreinte SHA-256. Le catalogue contient 333 versos renseignés et 145 volontairement vierges. Sept anciens versos renseignés ont été vidés après retrait de faux mots-clés. Les doublons et alias préexistants sont conservés sur leurs identifiants ; aucune nouvelle carte créée.

## Sources et définition de « vérifié »

156 définitions complètes utilisées dans le catalogue : 52 du premier lot et 104 du contrôle complémentaire. Les 104 entrées ajoutées ont été comparées au glossaire du règlement officiel AMG du 17 juin 2026 ; 38 ont nécessité une correction du texte FR du dépôt. Titres anglais, pages 46 à 62, URL et empreinte du PDF sont enregistrés dans src/data/workshopOfficialKeywords.json. Les symboles de dés, rangs et portées ont été recoupés visuellement et par extraction des caractères de la police officielle. Il s’agit de traductions françaises vérifiées par IA de l’anglais officiel, pas d’une édition française officielle publiée par AMG ni d’une certification humaine.

Sources : [règles et errata AMG](https://www.atomicmassgames.com/swlegiondocs/), règlement et Errata Reference effectifs au 17/06/2026. Les errata ont été recoupés pour les suppressions et remplacements pertinents. Aucune donnée ou certification du moteur n’a été modifiée. L’actualité intégrale des rectos (points, dés et effets propres) n’est pas certifiée par ce lot.

Corrections sensibles : Tirs de Soutien donne désormais un pion En attente après réception d’un ordre ; Programmé exige une amélioration Programmation ; Aide, Calcul de Probabilités, Observateur, Stratège et Mettre à Couvert sont à portée 2 ; Je Fais Aussi Partie de l’Équipe modifie la distance de contestation à 1 au lieu de ½ ; Commandant des Opérations tient compte du pion Commandant, de la faction/affiliation et de la portée 3 ; Insensible réduit Perforant X au début de Modifier les dés de défense ; Stationnaire impose le déploiement de Position Préparée.

Réparation : le PDF officiel p. 62 indique littéralement « up to 1 » pour le retrait des pions et X pour la restauration des figurines. La traduction conserve cette valeur. Aucun erratum correspondant trouvé dans les sources consultées ; cette particularité est tracée dans editorialNote. Restaurer est une rubrique distincte et n’est pas ajoutée artificiellement à la définition de Réparation.

## Associations

40 des 275 cartes ont des associations de mots-clés ou valeurs corrigées (32 associations/valeurs ajoutées, 23 retirées, les changements de valeur comptant des deux côtés). Exemples : Équipe ajouté à l’Agent rebelle ; Impact 1 et Suppressif à la Cellule dormante ; Déflagration à E-11D Lance-Grenades ; Transport sur les sept améliorations d’escouades qui le citent ; Cycle aux roquettes de Saxon ; Impact et Perforant du Sabre Noir corrigés à 1 pour le recto conservé. Les types de pions d’Autonome et de Cache, les capacités Y de Réparation/Traiter, les noms d’Alter Ego et les arcs Fixe sont précisés lorsque relus. Les symboles Critique et les pions Poison ne deviennent pas les mots-clés Critique X et Poison X. Les titres de figurines et d’armes ne créent pas de mots-clés.

Une définition complète n’est imprimée qu’une fois par famille de mot-clé, même lorsque plusieurs valeurs sont présentes (par exemple Impact 1 / Impact 3). Le texte conserve X, notamment pour les références à d’autres mots-clés et les exemples. Les définitions des anciennes cartes personnelles enregistrées sont réactualisées lorsqu’une entrée officielle vérifiée existe.

## Rectos historiques et limites signalées

10 cartes du catalogue sont retirées du jeu par les errata p. 7 : Résistance Mandalorienne, Résistance Mandalorienne Clan Wren, Bouclier de Sabine, Bouclier de Saxon, Projecteurs de Flammes de Boba, de Din et de Saxon, Roquettes Dorsales de la Résistance Mandalorienne, Boucliers de Combat Super Commando, Roquettes Dorsales Super Commando. Elles sont conservées avec avertissement pour consultation historique.

Tristan Wren et Ursa Wren ont encore un recto ancien : les versions remplacées aux p. 8 et 12 utilisent respectivement Précis 2 + Chef et Défense 1 + Chef. Les définitions de leur verso décrivent les mots-clés du recto historique conservé ; les nouveaux mots-clés sont tracés séparément dans currentOfficialKeywords et affichés dans l’avertissement. Ne pas présenter ces rectos comme les versions de jeu actuelles.

Le recto Agent Rebelle, Défenseur de la Démocratie est encore anglais : signalement explicite et aucune fausse déclaration de traduction. Les trois mots-clés Équipe, Autonome : Esquive 1 et Agile ont été relus et disposent de définitions FR.

## Impression

Toujours exactement un recto et un verso par exemplaire. Aucun effet propre, référence, note de source ou avertissement sur le verso. Les versos sans mot-clé restent réellement vierges. Aucun texte coupé, résumé ni carte de suite.

Mesures Chromium sur les 478 cartes : 330 tiennent au format classique 62 × 88 mm ; 139 supplémentaires au format agrandi 138 × 195 mm ; 9 exigent le grand format A4 195 × 282 mm. Les dimensions sont inversées pour les cartes horizontales ; leurs feuilles grand format A4 passent en paysage. Les 478 tiennent au grand format A4. La taille minimale demeure 7,5 pt. Le format inadéquat bloque l’impression avec le format suivant proposé. Les formats agrandis utilisent une seule carte par feuille et deux pages par exemplaire, recto verso bord long.

## Validation

Tests atelier (478 empreintes, 156 références, 333/145 versos, mots-clés manquants, faux positifs, valeurs, 10 retraits, 2 rectos anciens, stockage et duplex), pipeline import Tabletop, catalogue, cartes FR, moteur et contrats Assistant, génération, audit, TypeScript et compilation Vite : réussis. Mesures des trois formats dans le navigateur : grand format A4 sans débordement. La vérification générale reste affectée par l’échec préexistant du parcours Certification automatique β (#validateAutoCard) ; aucun commit ou déploiement par ce lot.

## Rectos actuels — Tristan, Ursa et Agent Rebelle (31/10/2026)

Les trois rectos sont remplacés dans l’atelier : Tristan = Chef et Précis 2 ; Ursa = +1 Courage, Défense 1 et Chef ; Agent Rebelle = recto FR, Équipe : doctrine. Source des Wren : PDF officiel AMG Mandalorian Cards v1.1 (juillet 2026), p. 9. Les versos suivent les nouveaux rectos. Catalogue inchangé à 478 cartes, aucun doublon. Les anciennes alertes de ces trois cartes sont supprimées ; les dix cartes retirées restent signalées. Rapport, fichiers et contrôles : docs/CARD_WORKSHOP_FRONTS_CURRENT.md. Traductions locales relues par IA, validation humaine restant à effectuer ; aucune publication.
