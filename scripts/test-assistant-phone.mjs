/* Compagnon téléphone (27/09/2026) : phone.html/phone.js rejoués dans jsdom, comme le reste de
   l'Assistant (voir scripts/lib/assistant-harness.mjs). Lecture seule : round, points de victoire,
   unités restantes à jouer pour « mon camp », recherche de mot-clé. Aucune écriture du suivi de partie. */
import assert from 'node:assert/strict'
import { openPhone } from './lib/assistant-harness.mjs'

const scenarios = []
const scenario = (name, fn) => scenarios.push({ name, fn })

scenario('Sans aucune liste reçue : écran d’attente de synchronisation, pas d’erreur', async () => {
  const app = await openPhone({})
  const { $, text } = app
  assert.match(text($('.ph-pairing')), /EN ATTENTE DE SYNCHRONISATION/)
  assert.ok($('#phToken'), 'un champ pour coller le jeton est proposé')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

scenario('Avec une partie en cours : round, score, unités restantes pour mon camp, et bascule de camp', async () => {
  const app = await openPhone({
    'swl.list.p1.v1': { listName: 'Patrouille Impériale', faction: 'Empire', units: [{ name: 'Stormtroopers' }, { name: 'Snowtroopers' }, { name: 'TL-TT' }] },
    'swl.list.p2.v1': { listName: 'Patrouille Rebelle', faction: 'Rebelles', units: [{ name: 'Rebel Troopers' }, { name: 'Luke Skywalker' }] },
    'swl.game-tracker.v1': { round: 2, p1Color: 'bleu', vpBleu: 3, vpRouge: 1, activatedUnitIds: ['p1:0'] },
    'swl.assistant.unit-state.v1': { 'p1:2': { outOfAction: true } },
  })
  const { $, text, click } = app
  assert.match(text($('.gh-round')), /2\s*\/\s*5/, 'round affiché')
  assert.match(text($('.gh-vp.bleu')), /3/)
  assert.match(text($('.gh-vp.rouge')), /1/)
  assert.match(text($('.gh-vp.bleu')), /MON CAMP/, 'bleu est le camp par défaut')
  // p1 : 3 unités, 1 activée (p1:0), 1 hors de combat (p1:2) -> il en reste 1 à jouer.
  assert.match(text($('.ph-left-card')), /\b1\b/)
  assert.match(text($('.ph-left-card')), /3 au total/)
  await click('[data-ph-side="rouge"]')
  assert.match(text($('.gh-vp.rouge')), /MON CAMP/, 'un toucher sur la carte rouge en fait mon camp')
  // p2 : 2 unités, aucune activée ni hors de combat -> il en reste 2 à jouer.
  assert.match(text($('.ph-left-card')), /\b2\b/)
  assert.match(text($('.ph-left-card')), /2 au total/)
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

scenario('Recherche de mot-clé : résultats filtrés, définition affichée au clic', async () => {
  const app = await openPhone({ 'swl.list.p1.v1': { listName: 'Test', faction: 'Empire', units: [] } })
  const { $, $$, text, click, setValue } = app
  await click('[data-ph-search]')
  assert.ok($('.ph-search-dialog').hasAttribute('open'), 'la recherche s’ouvre en plein écran')
  await setValue('#phKwInput', 'arsenal')
  const results = $$('#phKwResults [data-ph-kw]')
  assert.ok(results.length >= 1, 'au moins un résultat pour « arsenal »')
  assert.match(text(results[0]), /Arsenal/i)
  await click(results[0])
  assert.match(text($('#phKwDetail')), /Arsenal/)
  assert.ok(text($('#phKwDetail')).length > 20, 'la définition complète est affichée, pas seulement le nom')
  await click('[data-ph-close-search]')
  assert.ok(!$('.ph-search-dialog').hasAttribute('open'), 'Fermer referme la recherche')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

let failed = 0
for (const { name, fn } of scenarios) {
  try { await fn(); console.log('  ✓ ' + name) }
  catch (error) { failed++; console.error('  ✗ ' + name); console.error(error) }
}
if (failed) { console.error(`Compagnon téléphone : ${failed} scénario(s) en échec`); process.exit(1) }
console.log(`Compagnon téléphone : ${scenarios.length} scénario(s) rejoué(s) dans jsdom OK`)
