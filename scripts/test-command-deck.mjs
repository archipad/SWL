/* Test des Cartes de Commandement (24/09/2026) : règle officielle de
   construction de la Suite (2×1/2×2/2×3 PIP + Ordres Permanents, 7 cartes,
   sans doublon) et intégrité du catalogue extrait des planches AMG. */
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
try {
  const { COMMAND_CARDS, COMMAND_SUITE_RULE } = await vite.ssrLoadModule('/src/data/commandCards.ts')
  const { suiteIsComplete, suitePipCounts, canAddToSuite, commandFactionForList, eligibleCommandCards, commandCardById } = await vite.ssrLoadModule('/src/lib/commandDeck.ts')

  // Intégrité du catalogue : identifiants uniques, pips valides, une seule carte à 4 PIP (Ordres Permanents).
  const ids = COMMAND_CARDS.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length, 'Deux cartes de Commandement partagent le même identifiant')
  assert.ok(COMMAND_CARDS.every((c) => [1, 2, 3, 4].includes(c.pip)), 'Une carte a une valeur de PIP hors 1-4')
  assert.equal(COMMAND_CARDS.filter((c) => c.pip === 4).length, 1, 'Une seule carte à 4 PIP (Ordres Permanents) doit exister')
  assert.ok(COMMAND_CARDS.find((c) => c.id === 'ordres-permanents' && c.faction === 'generique'), 'Ordres Permanents doit être générique (utilisable par les deux factions)')
  const rebel = COMMAND_CARDS.filter((c) => c.faction === 'rebelles')
  const empire = COMMAND_CARDS.filter((c) => c.faction === 'empire')
  assert.equal(rebel.length, 42, 'Planche Alliance Rebelle : 42 cartes attendues')
  assert.equal(empire.length, 39, 'Planche Empire Galactique : 39 cartes attendues')

  // Règle officielle : 2 cartes par PIP 1/2/3, 1 carte à 4 PIP, 7 au total.
  assert.deepEqual(COMMAND_SUITE_RULE.perPip, { 1: 2, 2: 2, 3: 2, 4: 1 })
  assert.equal(COMMAND_SUITE_RULE.total, 7)

  const rebelPip1 = rebel.filter((c) => c.pip === 1).map((c) => c.id)
  const rebelPip2 = rebel.filter((c) => c.pip === 2).map((c) => c.id)
  const rebelPip3 = rebel.filter((c) => c.pip === 3).map((c) => c.id)
  const suite7 = [rebelPip1[0], rebelPip1[1], rebelPip2[0], rebelPip2[1], rebelPip3[0], rebelPip3[1], 'ordres-permanents']
  assert.ok(suiteIsComplete(suite7), 'Une suite avec 2/2/2 + Ordres Permanents doit être valide')
  assert.deepEqual(suitePipCounts(suite7), { 1: 2, 2: 2, 3: 2, 4: 1 })

  const missingStanding = suite7.slice(0, 6)
  assert.ok(!suiteIsComplete(missingStanding), 'Sans Ordres Permanents, la suite ne doit pas être valide (règle obligatoire)')

  const tooManyPip1 = [rebelPip1[0], rebelPip1[1], rebel.filter((c) => c.pip === 1)[2]?.id, rebelPip2[0], rebelPip3[0], rebelPip3[1], 'ordres-permanents'].filter(Boolean)
  assert.ok(!suiteIsComplete(tooManyPip1), '3 cartes à 1 PIP ne doivent jamais rendre la suite valide')

  // canAddToSuite : refuse un doublon et refuse de dépasser la limite du PIP (2 par PIP 1/2/3).
  assert.equal(canAddToSuite([rebelPip1[0]], rebelPip1[0]), false, 'La même carte ne peut pas être ajoutée deux fois')
  assert.equal(canAddToSuite([rebelPip1[0], rebelPip1[1]], rebelPip1[2]), false, 'Un 3e 1 PIP ne doit jamais être accepté')
  assert.equal(canAddToSuite([rebelPip1[0]], rebelPip1[1]), true, 'Un 2e 1 PIP doit rester accepté')
  assert.equal(canAddToSuite([rebelPip1[0], rebelPip1[1]], rebelPip2[0]), true, 'Un PIP différent doit rester accepté même si un autre PIP est déjà complet')

  // Détection de faction : uniquement sur un texte contenant clairement Empire/Rebel, jamais une supposition.
  assert.equal(commandFactionForList({ faction: 'Empire Galactique' }), 'empire')
  assert.equal(commandFactionForList({ faction: 'Alliance Rebelle' }), 'rebelles')
  assert.equal(commandFactionForList({ faction: 'République Galactique' }), null, 'Une faction sans catalogue connu ne doit jamais être devinée')
  assert.equal(commandFactionForList(null), null)

  // eligibleCommandCards : jamais de blocage total -- au moins la carte générique reste proposée si la faction est inconnue.
  assert.ok(eligibleCommandCards(null).length >= 1)
  assert.ok(eligibleCommandCards('empire').every((c) => c.faction === 'empire' || c.faction === 'generique'))
  assert.ok(eligibleCommandCards('rebelles').every((c) => c.faction === 'rebelles' || c.faction === 'generique'))

  assert.equal(commandCardById('ordres-permanents')?.pip, 4)

  console.log(`Cartes de Commandement OK : ${COMMAND_CARDS.length} cartes (${rebel.length} Alliance Rebelle, ${empire.length} Empire Galactique, 1 générique), règle de suite vérifiée.`)
} finally {
  await vite.close()
}
