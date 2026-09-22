/* Audit des écrans d'impression (22/09/2026) : jusqu'ici aucun test ne couvrait
   UnitCardsSection / MinimalKeywordsSection / VisualListSection / PrintCardsScreen (les quatre
   formats imprimables depuis l'écran d'import et depuis « Imprimer des cartes »), alors qu'ils
   sont utilisés à la table pendant une vraie partie. Comme ce sont des composants React purs
   (pas d'appel réseau, pas d'animation), on les rend directement côté serveur avec
   react-dom/server -- pas besoin de jsdom ni de navigateur.
   Vérifie :
     1. Chaque section se rend sans exception pour les deux listes fixtures (Empire, Rebelles).
     2. Chaque section se rend sans exception pour CHAQUE unité connue du catalogue (une par une,
        pour savoir précisément laquelle casse si l'une d'elles pose problème) et pour un
        échantillon d'améliorations.
     3. Le rendu contient bien le nom français de chaque unité de la liste (pas une page blanche).
     4. UnitCardsSection signale « Données manquantes » pour une carte réellement inconnue du
        catalogue, et ne le fait PAS pour une liste entièrement connue (positif ET négatif).
     5. PrintCardsScreen (composant à état, sélection de cartes à imprimer au format réel) se
        rend sans exception à l'état initial (catalogue non vide, bandeau « aucune sélection »). */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
try {
  const { importArmyList } = await vite.ssrLoadModule('/src/lib/importList.ts')
  const { SEED_CARD_TAGS } = await vite.ssrLoadModule('/src/data/cardTags.ts')
  const { SEED_KEYWORDS } = await vite.ssrLoadModule('/src/data/keywords.ts')
  const { CARD_IMAGES } = await vite.ssrLoadModule('/src/data/cardImages.ts')
  const { frenchCardName, canonicalCardKey } = await vite.ssrLoadModule('/src/lib/cardNames.ts')
  const { UnitCardsSection } = await vite.ssrLoadModule('/src/components/UnitCardsSection.tsx')
  const { MinimalKeywordsSection } = await vite.ssrLoadModule('/src/components/MinimalKeywordsSection.tsx')
  const { VisualListSection } = await vite.ssrLoadModule('/src/components/VisualListSection.tsx')
  const { PrintCardsScreen } = await vite.ssrLoadModule('/src/components/PrintCardsScreen.tsx')

  const sections = [
    ['UnitCardsSection', UnitCardsSection],
    ['MinimalKeywordsSection', MinimalKeywordsSection],
    ['VisualListSection', VisualListSection],
  ]
  const render = (Component, props) => renderToStaticMarkup(Component(props))

  // --- 1 + 3. Les deux listes fixtures, dans les trois formats. ---
  const readList = (file) => importArmyList(fs.readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'))
  const fixtures = [['Fixture Empire', readList('tabletop-admiral-empire.json')], ['Fixture Rebelles', readList('tabletop-admiral-rebel.json')]]
  let renders = 0
  for (const [label, list] of fixtures) {
    for (const [name, Component] of sections) {
      const html = render(Component, { list, tagLibrary: SEED_CARD_TAGS, keywords: SEED_KEYWORDS })
      renders += 1
      assert.ok(html.length > 200, `${name} (${label}) : rendu suspicieusement vide (${html.length} caractères)`)
      for (const unit of list.units) assert.ok(html.includes(frenchCardName(unit.name)), `${name} (${label}) : « ${frenchCardName(unit.name)} » absent du rendu`)
    }
  }
  console.log(`Listes fixtures : ${renders} rendu(s) (2 listes × 3 formats) OK, chaque unité retrouvée dans le texte.`)

  // --- 2. Chaque carte connue du catalogue (visuel + nom), une par une (localise précisément
  //        la carte fautive s'il y en a une) -- posée comme « unité » avec aucune amélioration :
  //        les composants ne distinguent pas unité/amélioration pour leur propre rendu, seul
  //        importAudit.ts (ailleurs) a besoin de cette distinction. ---
  const catalogKeys = Object.keys(CARD_IMAGES)
  assert.ok(catalogKeys.length > 200, `Le catalogue de visuels doit connaître largement plus de 200 cartes (trouvé ${catalogKeys.length}) : le chargement a-t-il échoué ?`)
  let cardsChecked = 0, failures = []
  for (const key of catalogKeys) {
    const list = { units: [{ key, name: key, kind: 'unit', section: 'Unités', upgrades: [] }], unparsedLines: [] }
    for (const [name, Component] of sections) {
      try { render(Component, { list, tagLibrary: SEED_CARD_TAGS, keywords: SEED_KEYWORDS }) } catch (error) { failures.push(`${name} / ${key} : ${error.message}`) }
    }
    cardsChecked += 1
  }
  if (failures.length) { console.error('Cartes qui font planter un format d’impression :\n' + failures.map((line) => '  ✗ ' + line).join('\n')); process.exitCode = 1 }
  else console.log(`Catalogue complet : ${cardsChecked} carte(s) rendues sans exception dans les trois formats.`)

  // --- 4. « Données manquantes » : positif (carte inconnue) puis négatif (liste connue). ---
  const unknownList = { units: [{ key: 'inconnue', name: 'Carte Totalement Imaginaire Qui NExiste Pas', kind: 'unit', section: 'Unités', upgrades: [] }], unparsedLines: [] }
  const unknownHtml = render(UnitCardsSection, { list: unknownList, tagLibrary: SEED_CARD_TAGS, keywords: SEED_KEYWORDS })
  assert.match(unknownHtml, /Données manquantes/, 'UnitCardsSection doit signaler une carte réellement inconnue du catalogue')
  const [, knownList] = fixtures[0]
  const knownHtml = render(UnitCardsSection, { list: knownList, tagLibrary: SEED_CARD_TAGS, keywords: SEED_KEYWORDS })
  assert.ok(!/Données manquantes/.test(knownHtml), `UnitCardsSection ne doit PAS signaler de données manquantes pour une liste entièrement connue (fixture Empire) : ${knownHtml.match(/<li>.*?<\/li>/)?.[0] || ''}`)
  console.log('Signalement « Données manquantes » : positif sur une carte inconnue, silencieux sur une liste entièrement connue.')

  // --- 5. PrintCardsScreen (composant à état, hooks React) : rendu initial. Passé par
  //        React.createElement (pas un appel direct comme les sections ci-dessus) : ce
  //        composant utilise useState/useMemo, qui ont besoin du contexte de rendu React. ---
  const emptyHtml = renderToStaticMarkup(React.createElement(PrintCardsScreen))
  assert.match(emptyHtml, /Imprimer des cartes/, 'PrintCardsScreen doit afficher son titre au rendu initial')
  assert.match(emptyHtml, /Aucune carte sélectionnée/, 'Aucune sélection au premier rendu : le bandeau doit le dire')
  const sampleCard = Object.keys(CARD_IMAGES)[0]
  assert.ok(sampleCard, 'CARD_IMAGES ne doit pas être vide : PrintCardsScreen ne pourrait rien lister')
  assert.ok(emptyHtml.includes(frenchCardName(canonicalCardKey(sampleCard))) || emptyHtml.includes(sampleCard), 'La liste de sélection doit lister au moins une carte connue')
  console.log('PrintCardsScreen : rendu initial OK (titre, bandeau « aucune sélection », liste des cartes non vide).')

  console.log(`Audit des écrans d'impression OK.`)
} finally {
  await vite.close()
}
