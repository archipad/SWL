/* Test du catalogue de l'écran « Consultation des cartes » (06/10/2026) : toutes les cartes sont
   réunies une seule fois, avec visuel, mots-clés certifiés et armes, et chaque mot-clé d'arme est
   rattaché à la bonne arme (pas répété dans les mots-clés de la carte). */
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
try {
  const { buildCardCatalog, keywordLabel } = await vite.ssrLoadModule('/src/lib/cardCatalog.ts')
  const { SEED_KEYWORDS } = await vite.ssrLoadModule('/src/data/keywords.ts')
  const { SEED_CARD_TAGS } = await vite.ssrLoadModule('/src/data/cardTags.ts')
  const catalog = buildCardCatalog(SEED_CARD_TAGS, SEED_KEYWORDS)
  const byKey = new Map(catalog.map((card) => [card.key, card]))
  const byId = new Map(SEED_KEYWORDS.map((keyword) => [keyword.id, keyword]))

  assert.ok(catalog.length >= 250, `au moins 250 cartes consultables (${catalog.length})`)
  assert.equal(new Set(catalog.map((card) => card.key)).size, catalog.length, 'chaque carte n’apparaît qu’une fois (alias fusionnés)')
  assert.ok(catalog.filter((card) => card.image).length >= 240, 'les visuels connus sont tous rattachés')
  assert.ok(catalog.some((card) => card.type === 'upgrade') && catalog.some((card) => card.type === 'unit'), 'unités et améliorations sont présentes')

  // Luke, Héros de la Rébellion : mots-clés de la carte certifiés, mots-clés d'arme sur chaque arme.
  const luke = byKey.get('luke skywalker hero of the rebellion')
  assert.ok(luke?.image && luke.certified, 'Luke : visuel et certification')
  assert.deepEqual(luke.keywords.map((keyword) => keyword.keywordId).sort(), ['blocage', 'charge', 'immunite-perforant', 'inspiration-x', 'saut-x', 'tireur-delite-x'].sort(), 'Luke : mots-clés hors armes')
  const [saber, blaster] = luke.weapons
  assert.equal(saber.name, 'Sabre Laser d\'Anakin')
  assert.deepEqual(saber.keywords, [{ keywordId: 'impact-x', value: 2 }, { keywordId: 'perforant-x', value: 1 }], 'Sabre laser d’Anakin : Impact 2, Perforant 1')
  assert.deepEqual(blaster.keywords.map((keyword) => keyword.keywordId).sort(), ['longue-distance', 'perforant-x'], 'Blaster de Luke : Longue Distance, Perforant')
  assert.equal(keywordLabel(byId.get('impact-x'), 2), 'Impact 2')
  assert.equal(keywordLabel(byId.get('charge')), 'Charge')

  // Une amélioration sans arme reste consultable (visuel + mots-clés).
  const burst = byKey.get('burst of speed')
  assert.ok(burst?.image && burst.type === 'upgrade' && burst.weapons.length === 0, 'Pointe de Vitesse : amélioration sans arme')

  console.log(`Consultation des cartes OK : ${catalog.length} cartes (${catalog.filter((card) => card.type === 'unit').length} unités, ${catalog.filter((card) => card.certified).length} certifiées).`)
} finally {
  await vite.close()
}
