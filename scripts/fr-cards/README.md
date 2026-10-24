# Fiches FR communautaires

Création d'une carte française à partir du visuel anglais de Legion HQ, lancée depuis le site.

## Parcours

1. **Atelier dans le site.** Certification des cartes → carte inconnue → « Créer sa version française ».
   - L'atelier (`public/assistant/fr-card-workshop.js`) retrouve la carte dans le catalogue Legion HQ (`public/assistant/legionhq-catalog.js`).
   - Il vérifie la concordance avec Tabletop Admiral : nom, coût ou pips, mots-clés.
   - Il préremplit la traduction : mots-clés traduits par l'index V2.6 et le glossaire SWL, icônes, noms français connus.
   - Le texte des règles n'existe pas chez Legion HQ : il se recopie en français d'après le visuel affiché.
2. **Lancement.** « Lancer la création de la fiche sur GitHub » ouvre un ticket qui contient la fiche (bloc `<!-- SWL_FR_CARD … -->`).
3. **Aperçu.** Le workflow `.github/workflows/fr-card.yml` télécharge le visuel Legion HQ, génère l'image française (`render.py`) et publie l'aperçu en commentaire du ticket. Les points de mise en page douteux y sont listés.
4. **Validation.** Le commentaire `/valider-fiche-fr` intègre la fiche au site :
   - unité ou amélioration : visuel `public/cards/<nom>-fr-community.jpg`, entrées dans `cardImages.ts` et `cardNamesFr.ts` ;
   - commandement : visuel `public/commandcards/<id>.jpg`, entrée `community: true` dans `commandCards.ts`, alias Tabletop Admiral ;
   - traçabilité dans `src/data/frCommunityCards.json`.

   Le workflow lance ensuite `npm run build`, committe et déploie. `/apercu-fiche-fr` régénère l'aperçu après une correction de la fiche.

Une carte qui possède déjà un visuel n'est jamais écrasée. Une amélioration passive est enregistrée comme telle dans `upgradeCardUse.json`. Une amélioration ↱ ou ✖ est refusée à l'intégration (l'aperçu le signale), car son suivi (bouton prête / inclinée / supprimée) doit d'abord être ajouté au moteur de l'Assistant. Les données moteur (dés, PV, courage, mots-clés) ne sont pas écrites par ce circuit : elles se certifient ensuite dans l'écran de certification, qui affiche le visuel FR et la référence Legion HQ.

## Moteur de rendu

`render.py` (Python 3.12, `requirements.txt`) repère seul les zones de texte des gabarits Legion HQ :

| Gabarit | Zones repérées |
|---|---|
| Amélioration | Bloc de règles, cadres d'arme (nom, mots-clés), titre |
| Commandement générique | Titre, effectif, texte d'ambiance |
| Commandement de faction | Titre, bandeau d'effectif, texte, pied de carte |
| Unité | Nom, sous-titre, type, mots-clés, armes |

Le texte anglais est effacé par reconstruction du fond (OpenCV), puis le français est écrit avec les polices libres Exo 2 et Crimson Pro (`fonts/`, licence OFL). Si le texte ne tient pas, la police est réduite ; au-delà, le rapport signale « texte trop long ».

### Balisage des textes

- `**mot-clé**` : petites capitales grasses italiques.
- `__Étape__` : sérif gras.
- `{icône}` : symbole de la bibliothèque `icons/`, recoloré, par exemple `{suppr}`, `{incliner}`, `{action}`, `{soldat}`, `{courage}`, `{rang-agent}`, `{faction-empire}`, `{emplacement-armement}`.
- `{portee-N}` : portée N, dessinée.
- Retour à la ligne : nouveau paragraphe.
- Espace insécable : garde « Viser 1 » sur une même ligne.

## Commandes locales

```sh
pip install -r scripts/fr-cards/requirements.txt
npm run fr-card:preview -- fiche.json apercu.png --rapport rapport.json
npm run fr-card:integrate -- fiche.json
npm run test:fr-cards
```

`audit-legionhq.mjs --write` régénère le catalogue Legion HQ de l'atelier et l'index des visuels de la certification.
