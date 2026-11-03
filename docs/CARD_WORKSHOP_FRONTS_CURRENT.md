# Trois rectos FR actualisés — 31/10/2026

Les trois cartes remplacent leurs rectos dans l’atelier et les exports, sur les mêmes identifiants. Le catalogue reste à 478 cartes, 333 versos renseignés et 145 versos vierges. Un exemplaire a exactement un recto et un verso, avec uniquement les définitions au dos.

## Sources et traduction

Tristan Wren et Ursa Wren sont extraits sans perte des objets Im1 et Im2, page 9 du PDF officiel AMG **Mandalorian Cards v1.1**, actuellement lié sur https://www.atomicmassgames.com/swlegiondocs/ :
https://cdn.svc.asmodee.net/production-amgcom/uploads/2026/07/DOC56_Mandalorian_BattleForceCards-3.pdf

Empreinte SHA-256 du PDF : 17dc96519f5fb3614a70a4b14f1e1eb7880dc72268fee47a9249acfcc09635a9.
Les cartes remplacent les anciennes versions conformément aux errata du 17/06/2026, p. 8 et 12. Le PDF de juillet prévaut pour le rendu actuel. Les textes sont des traductions locales françaises relues par IA, pas une édition FR publiée par AMG ni une certification humaine.

- Tristan : 25 points ; restrictions d’unité conservées sous forme de symboles ; ajouter une figurine ; Chef ; Précis 2 ; les unités alliées de l’affiliation représentée peuvent lui donner des ordres quelle que soit leur affiliation. Aucun ancien profil d’arme ni Létal/Suppressif n’est conservé sur ce recto.
- Ursa : 25 points ; restriction symbolique conservée ; ajouter une figurine ; augmenter le Courage de 1 ; Défense 1 ; Chef. Aucun ancien profil d’arme, Intrépide ou Longue Distance n’est conservé.
- Agent Rebelle, Défenseur de la Démocratie : traduction du recto anglais existant, y compris nom, sous-titre, type et noms des deux armes. Équipe exige une **doctrine**, conformément au symbole du recto. Autonome : Esquive 1 et Agile restent définis au dos. L’illustration source de 420 × 293 pixels est agrandie trois fois ; aucun détail nouveau n’est inventé. Dés, portée, PV, Courage, vitesse, emplacements, conversion des adrénalines et taille d’unité sont préservés.

Les valeurs du moteur et les certifications ne sont pas modifiées. Les dix cartes retirées du lot précédent restent signalées pour usage historique.

## Fichiers du lot

- public/cards/workshop/{tristan-wren-current,ursa-wren-current,rebel-agent-fr}.png : nouveaux rectos.
- public/cards/workshop/sources/ : deux sources officielles extraites et source Agent agrandie ; les originaux historiques du dépôt sont conservés.
- scripts/data/workshop-translations/ : trois recettes avec textes EN/FR, empreintes, références, zones de texte, symboles et valeurs protégées.
- scripts/render-workshop-translation.py : zones supplémentaires pour les cartes d’unité et effacement propre des bandeaux sombres.
- src/data/workshopCardTranslations.json et workshopKeywordReviews.json : remplacement des visuels et mots-clés sur les trois identifiants stables ; suppression des alertes devenues obsolètes.
- scripts/test-workshop-translations.py et test-card-workshop.mjs : contrôle des huit traductions locales, sources, illustrations, valeurs et associations ; import des trois noms sans doublon.
- scripts/export-card-workshop-batch.mjs : catalogue et bilan de traduction actualisés, suppression de la mention erronée Agent encore anglais.

## Validation et livraison

Contrôle visuel des trois PNG ; contrôle pixel par pixel des valeurs protégées et de l’image hors texte ; tests atelier, import, cartes FR, catalogue, moteur et contrats ; génération et audit Assistant ; TypeScript et compilation Vite. Le contrôle d’impression vérifie les 478 versos et le panier des trois cartes. Les archives de l’atelier et du catalogue sont régénérées.

Aucun commit, push ou déploiement. L’échec préexistant du parcours Certification automatique bêta (#validateAutoCard), signalé au lot précédent, n’est pas corrigé ici. L’upload de nouvelles cartes à traduire automatiquement et la validation humaine restent hors de ce lot.

Résultat mesuré : les trois nouvelles cartes tiennent au format classique, 3 rectos et 3 versos sur 4 pages A4 (deux orientations). Catalogue entier : 331 cartes au format classique, 138 autres au format agrandi et 9 au grand format A4 ; aucun débordement en grand format.
