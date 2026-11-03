# Traductions locales de l’atelier — 31/10/2026

Le catalogue conserve ses 478 identifiants : 81 unités, 230 améliorations, 167 commandements.
Une lecture OCR locale des 478 visuels a repéré cinq rectos anglais : Armure de Combat,
Blaster Répétiteur, Chewbacca (amélioration), Contrôle de Tir et Héros Malgré Lui.
Ces cinq rectos ont été traduits et relus sur leurs sources locales, sans API ni abonnement ajouté.
Cette relecture IA ne vaut ni certification humaine ni vérification des derniers errata.
Le recto FR officiel local de Cassian Andor est réutilisé sur sa variante existante,
sans créer une deuxième carte. Sa face de jeu retournée reste à consulter séparément.

## Données et rendu

- src/data/workshopCardTranslations.json remplace uniquement la présentation des six entrées de l’atelier.
- Les originaux anglais, les profils et les certifications du moteur sont conservés.
- scripts/data/workshop-translations/ contient les cinq textes, empreintes sources, zones de texte et zones protégées.
- scripts/render-workshop-translation.py réutilise le moteur de rendu local fr-cards : polices et icônes existantes.
- Une source ou des dimensions inattendues interrompent le rendu. Les zones du coût, des dés, des portées et des autres valeurs sont restaurées à l’identique.
- Les noms anglais Tabletop Cassian Andor et Chewbacca sont résolus vers leurs améliorations existantes lorsque le type demandé est amélioration.
- Le X du mot-clé courant ne remplace pas le X d’Armure ou de Gardien cité dans sa définition.

## Traitement en lot

Depuis le dépôt :

    node scripts/export-card-workshop-batch.mjs dossier-sortie chemin-ocr.jsonl chemin-depot-sources

Les deux derniers arguments sont optionnels. Le fichier OCR est produit localement par
scripts/tools/windows-ocr.ps1 avec la langue fr-FR et une liste de visuels.
Le dossier contient le catalogue HTML de consultation, les visuels nécessaires,
les textes OCR, les propositions de mots-clés non validées, un manifeste avec empreintes
et le suivi CSV. Il ne s’agit pas d’une certification des cartes.
Les 60 sources EN suivies localement ont une correspondance dans l’atelier,
mais ce rapprochement ne remplace pas une comparaison des versions de règles.

## État des versos

275 cartes ont des définitions associées ; 203 n’en ont pas encore dans le catalogue.
Certaines cartes sans définition n’impriment aucun mot-clé, comme Armure de Combat et
Contrôle de Tir. Les autres restent à relire. Les propositions OCR sont séparées du
verso et ne sont jamais intégrées automatiquement. Aucun effet propre n’est imprimé au dos.

## Contrôles et suite

Tests atelier, import, cartes FR et catalogue ; génération et audit Assistant ; TypeScript
et compilation Vite. Le contrôle des cinq rendus vérifie les empreintes, dimensions,
valeurs protégées et pixels d’illustration hors texte :

    python scripts/test-workshop-translations.py chemin-depot-sources

Le contrôle des sources EN personnelles nécessite leur présence dans le dépôt source.
Pas de publication : la suite générale a un échec préexistant dans Certification β
(test-assistant-parcours.mjs, #validateAutoCard), documenté dans la feuille de route.
Restent la relecture des versos, la validation humaine des cinq traductions et le parcours
assisté d’upload/traduction de cartes inconnues. Aucun service payant n’est configuré.

## Rectos actuels — Tristan, Ursa et Agent Rebelle (31/10/2026)

Les trois rectos sont remplacés dans l’atelier : Tristan = Chef et Précis 2 ; Ursa = +1 Courage, Défense 1 et Chef ; Agent Rebelle = recto FR, Équipe : doctrine. Source des Wren : PDF officiel AMG Mandalorian Cards v1.1 (juillet 2026), p. 9. Les versos suivent les nouveaux rectos. Catalogue inchangé à 478 cartes, aucun doublon. Les anciennes alertes de ces trois cartes sont supprimées ; les dix cartes retirées restent signalées. Rapport, fichiers et contrôles : docs/CARD_WORKSHOP_FRONTS_CURRENT.md. Traductions locales relues par IA, validation humaine restant à effectuer ; aucune publication.
