# Atelier — contrôle des 203 versos (31 octobre 2026)

203 rectos du lot précédent relus visuellement : 65 cartes complétées, 138 sans mot-clé fixe à définir (verso volontairement vierge). Le catalogue conserve 478 identifiants : 340 versos renseignés et 138 vierges. Cette relecture par IA ne modifie aucune certification du moteur et ne certifie pas l’actualité des rectos.

## Définitions

52 entrées complètes sont figées dans src/data/workshopOfficialKeywords.json. Référence primaire : [Core Rules AMG, mise à jour du 17 juin 2026](https://www.atomicmassgames.com/swlegiondocs/). Chaque entrée conserve le titre anglais et la page du PDF officiel ; l’empreinte SHA-256 du PDF est enregistrée. Les textes FR du dépôt ont été vérifiés/corrigés sur l’anglais officiel. Ce sont des traductions FR vérifiées, pas une édition française officielle publiée par AMG. Le PDF officiel FR retrouvé (v2.6.1, 14 novembre 2024) est trop ancien pour servir de référence actuelle.

Les définitions comprennent leurs conditions, restrictions et exemples du glossaire. Aucune shortDefinition n’est utilisée par l’atelier. X reste générique dans le corps de règle, afin de préserver les références aux autres mots-clés et les exemples ; la valeur de la carte figure dans le titre ou au recto. Les anciennes associations des 275 autres cartes ne sont pas certifiées par ce contrôle.

Corrections sensibles : Infiltration (activation et territoire allié), Agile (gain après résolution de l’attaque), Chasseur de Jedi (adrénaline vers critique), Déflexion (retrait de la condition Soresu erronée), Démoraliser (total des pions), Gardien (rang Troupes pour prêter main-forte), Alter Ego (dernière figurine), déplacement obligatoire de Speeder, portée ½ des Yeux sur le Butin.

## Rectos et associations

src/data/workshopKeywordReviews.json contient les 203 décisions, les mots-clés et les empreintes exactes des visuels contrôlés. Le test atelier et l’export refusent les images modifiées sans nouveau contrôle. Les titres de carte, pions et effets propres ne sont pas transformés en mots-clés. Les armes à icône de portée jaune reçoivent la définition Arme à effet de zone. Les mots-clés conférés ou explicitement référencés sont inclus, y compris Pistolero lorsqu’une carte le retire. Aucun effet propre n’est imprimé au dos.

## Impression

Un exemplaire possède exactement un recto et un verso. Les sources, alertes et références restent hors du verso. Un verso sans mot-clé est réellement vierge. Aucun texte coupé, aucune carte de suite, aucun raccourcissement automatique.

Format classique : 62 × 88 mm (dimensions inversées pour les cartes horizontales). Format agrandi : 138 × 195 mm, une carte par feuille A4 et deux pages par exemplaire. Le recto est agrandi proportionnellement. Contrôle dans Chromium : les 203 versos tiennent au format agrandi ; 16 nécessitent l’agrandissement pour conserver les définitions complètes à au moins 7,5 pt. Au format classique, l’impression de ces cartes est explicitement bloquée avec invitation à choisir le format agrandi.

Vérifications : test atelier (478 identifiants, 203 empreintes, 65/138 décisions, 52 références, cas sensibles, duplex), import Tabletop, catalogue, cartes FR, moteur et contrats, TypeScript, compilation Vite. La suite générale présente toujours un échec préexistant dans test-assistant-parcours (#validateAutoCard) ; aucun déploiement par ce lot.
