# Legion Compagnon

Appli compagnon (PWA) non officielle pour **Star Wars: Legion**, pensée pour
être utilisée à table pendant une partie afin de limiter les allers-retours
dans le livret de règles papier.

> Outil personnel, non affilié à Atomic Mass Games / Lucasfilm. Le glossaire
> des mots-clés reprend le texte du livret de règles officiel (fourni par
> l'utilisateur) pour un usage personnel entre joueurs, pas pour redistribution.

## Ce que ça fait

L'appli est pensée pour suivre **une partie à deux** : les deux joueurs
importent leur liste, puis l'onglet **Combat** sert d'assistant pendant
chaque affrontement pour ne rater aucun mot-clé, des deux côtés.

1. **Listes (import)** — chaque joueur colle l'export de sa liste depuis
   [Tabletop Admiral](https://tabletopadmiral.com/legion/) dans son propre
   emplacement (Joueur 1 / Joueur 2). Le format **JSON** (recommandé — noms
   de cartes exacts, faction, points, cartes Commandement) est détecté et
   parsé nativement (`lib/parseListJson.ts`). L'export **texte** reste aussi
   accepté via un parseur tolérant qui reconnaît les sections (Commandant,
   Corps, Forces Spéciales…) et les cartes au format `Nom (points)` — tout ce
   qu'il ne reconnaît pas reste visible plutôt que d'être perdu
   silencieusement. Les onglets Armées et Combat ne s'activent qu'une fois
   les **deux** listes importées.
2. **Mots-clés par carte** — sur chaque unité/amélioration d'une liste
   importée (onglet **Armées**, avec un sélecteur Joueur 1 / Joueur 2),
   ajoutez les mots-clés qu'elle porte (ex. *Tireur d'élite 2*) via le
   bouton **+ mot-clé**. C'est un tag manuel (une seule fois par carte, en
   lisant la carte) : l'appli garde ensuite le lien "cette carte → ces
   mots-clés" en mémoire sur l'appareil (partagé entre les deux joueurs), et
   le réutilise automatiquement à chaque future liste contenant cette carte.
3. **Glossaire de la liste** — sous la composition de chaque liste, l'appli
   calcule automatiquement la liste, sans doublon, de tous les mots-clés
   présents dans cette armée, avec leur définition classée par impact
   (Attaque / Défense / Autre) et les icônes officielles de résultat de dé
   (▼ Bloc, ✹ Critique, ● Touche, ◆/◇ Adrénaline attaque/défense).
4. **Combat** — choisissez librement un attaquant et un défenseur parmi les
   unités des deux listes : leurs mots-clés (unité **+** toutes ses
   améliorations équipées, fusionnés) s'affichent côte à côte avec leur
   définition complète, classés par impact — l'écran à garder ouvert pendant
   la résolution d'une attaque pour suivre les règles des deux camps sans se
   tromper (`lib/combat.ts`).
5. **Impression** — bouton *Imprimer le glossaire* sur l'onglet Armées : met
   en page uniquement le glossaire de la liste affichée (deux colonnes, noir
   sur blanc) via une feuille de style dédiée à l'impression.
6. **Glossaire complet** (onglet dédié) — parcourt/édite tous les mots-clés
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
  data/keywords.ts        glossaire officiel (200 mots-clés + définitions)
  lib/importList.ts       point d'entrée import : détecte JSON vs texte
  lib/parseListJson.ts    parseur JSON Tabletop Admiral -> unités/améliorations
  lib/parseList.ts        parseur de liste texte (fallback) -> unités/améliorations
  lib/glossary.ts         calcule le glossaire d'une liste importée
  lib/combat.ts           fusionne unité+améliorations -> mots-clés, répertoire attaquant/défenseur
  lib/useKeywordLibrary.ts état persisté des mots-clés (localStorage)
  lib/useCardTags.ts      état persisté carte -> mots-clés (localStorage, partagé entre les 2 joueurs)
  components/
    SetupScreen.tsx        import des deux listes (Joueur 1 / Joueur 2)
    ArmyScreen.tsx          composition + glossaire d'une liste (basculé par joueur depuis App.tsx)
    CombatScreen.tsx        sélection attaquant/défenseur + mots-clés côte à côte
    KeywordDefinitionList.tsx bloc mots-clés groupés par impact, partagé CardRow/CombatScreen
    LibraryScreen.tsx       glossaire complet, édition des mots-clés et des cartes taguées
```

## Limites connues / pistes d'évolution

- L'appli exige les deux listes (Joueur 1 et Joueur 2) pour débloquer les
  onglets Armées et Combat — choix assumé pour une appli pensée pour la
  table à deux, pas pour la consultation solo d'une seule liste.
- Le glossaire (200 mots-clés : unité, arme, cartes Amélioration/Commandement)
  couvre les définitions génériques des mots-clés. Une base "carte précise →
  mots-clés qu'elle porte" (`src/data/cardTags.ts`) est amorcée avec ~109
  cartes vérifiées depuis de vraies cartes Empire/Alliance Rebelle (unités et
  améliorations) fournies par l'utilisateur ; elle est mergée sans écraser vos
  propres tags, et reste loin d'être exhaustive sur les ~300 cartes du jeu.
  Certains noms anglais (clé de la base, format Tabletop Admiral) sont encore
  marqués « à vérifier » en commentaire faute de pouvoir les confirmer contre
  un export réel — à corriger au fil de l'eau si une carte n'affiche pas ses
  mots-clés. Pour toute carte non couverte, le tag manuel une fois par carte
  (en lisant la vraie carte) reste le filet de sécurité, et se retient
  ensuite. À enrichir au fil des parties.
- Le parseur d'import est tolérant mais n'a pas pu être calé sur un export
  réel de Tabletop Admiral au moment de l'écriture (site injoignable depuis
  cet environnement) — si un export ne se découpe pas correctement, envoyez
  un exemple pour ajuster les expressions régulières dans `lib/parseList.ts`.
- Pas encore de calculateur de probabilités de dés ni de suivi de manche —
  volontairement laissés pour une itération suivante.
