# Legion Compagnon

Appli compagnon (PWA) non officielle pour **Star Wars: Legion**, pensée pour
être utilisée à table pendant une partie afin de limiter les allers-retours
dans le livret de règles papier.

> Outil personnel, non affilié à Atomic Mass Games / Lucasfilm. Le glossaire
> des mots-clés reprend le texte du livret de règles officiel (fourni par
> l'utilisateur) pour un usage personnel entre joueurs, pas pour redistribution.

## Ce que ça fait

1. **Import de liste** — collez l'export de votre liste depuis
   [Tabletop Admiral](https://tabletopadmiral.com/legion/) : le format
   **JSON** (recommandé — noms de cartes exacts, faction, points, cartes
   Commandement) est détecté et parsé nativement (`lib/parseListJson.ts`).
   L'export **texte** reste aussi accepté via un parseur tolérant qui
   reconnaît les sections (Commandant, Corps, Forces Spéciales…) et les
   cartes au format `Nom (points)` — tout ce qu'il ne reconnaît pas reste
   visible plutôt que d'être perdu silencieusement.
2. **Mots-clés par carte** — sur chaque unité/amélioration de la liste
   importée, ajoutez les mots-clés qu'elle porte (ex. *Tireur d'élite 2*) via
   le bouton **+ mot-clé**. C'est un tag manuel (une seule fois par carte, en
   lisant la carte) : l'appli garde ensuite le lien "cette carte → ces
   mots-clés" en mémoire sur l'appareil, et le réutilise automatiquement à
   chaque future liste contenant cette carte.
3. **Glossaire de la liste** — l'appli calcule automatiquement la liste, sans
   doublon, de tous les mots-clés présents dans votre armée, avec leur
   définition — c'est l'écran (et la page imprimée) à garder sous la main
   pendant la partie.
4. **Impression** — bouton *Imprimer le glossaire* : met en page uniquement
   le glossaire de la liste en cours (deux colonnes, noir sur blanc) via une
   feuille de style dédiée à l'impression.
5. **Glossaire complet** (onglet dédié) — parcourt/édite tous les mots-clés
   connus de l'appli (ajout, modification, suppression, réinitialisation aux
   valeurs par défaut) et toutes les cartes déjà taguées.

Tout est stocké **localement sur l'appareil** (`localStorage`), rien n'est
envoyé à un serveur. L'appli est installable (PWA) et fonctionne hors-ligne
une fois ouverte une première fois.

## Développement

```bash
npm install
npm run dev       # serveur de dev
npm run build     # build de prod dans dist/
npm run lint
```

Icônes PWA générées sans dépendance externe par `scripts/generate-icons.mjs`
(un simple badge géométrique, pas de logo officiel) :

```bash
node scripts/generate-icons.mjs
```

## Structure

```
src/
  data/keywords.ts        glossaire officiel (187 mots-clés + définitions)
  lib/importList.ts       point d'entrée import : détecte JSON vs texte
  lib/parseListJson.ts    parseur JSON Tabletop Admiral -> unités/améliorations
  lib/parseList.ts        parseur de liste texte (fallback) -> unités/améliorations
  lib/glossary.ts         calcule le glossaire d'une liste importée
  lib/useKeywordLibrary.ts état persisté des mots-clés (localStorage)
  lib/useCardTags.ts      état persisté carte -> mots-clés (localStorage)
  components/             écrans (import, liste, bibliothèque) et widgets
```

## Limites connues / pistes d'évolution

- Le glossaire (187 mots-clés : unité, arme, cartes Amélioration/Commandement)
  couvre les définitions génériques des mots-clés. Il n'y a en revanche pas de
  base de données "carte précise → mots-clés qu'elle porte" pour les ~300
  cartes du jeu : plutôt que d'inventer ces associations avec un risque
  d'erreur difficile à vérifier hors ligne, l'appli mise sur un tag manuel une
  fois par carte (en lisant la vraie carte), qui se retient ensuite. À
  enrichir au fil des parties.
- Le parseur d'import est tolérant mais n'a pas pu être calé sur un export
  réel de Tabletop Admiral au moment de l'écriture (site injoignable depuis
  cet environnement) — si un export ne se découpe pas correctement, envoyez
  un exemple pour ajuster les expressions régulières dans `lib/parseList.ts`.
- Pas encore de calculateur de probabilités de dés ni de suivi de manche —
  volontairement laissés pour une itération suivante.
