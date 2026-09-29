import assert from 'node:assert/strict'
import { openAssistant } from './lib/assistant-harness.mjs'

const app = await openAssistant({
  'swl.list.p1.v1': { listName: 'Empire test', faction: 'Empire', units: [{ name: 'General Veers', upgrades: [] }, { name: 'Stormtroopers', upgrades: [] }] },
  'swl.list.p2.v1': { listName: 'Rébellion test', faction: 'Rebelles', units: [{ name: 'Luke Skywalker Hero of the Rebellion', upgrades: [] }, { name: 'Rebel Troopers', upgrades: [] }] },
  'swl.assistant.unit-state.v1': { 'p1:1': { suppression: 1 } },
})

await app.pickUnit('Veers')
assert.ok(app.$('.activation-quick-dock'), 'la barre rapide apparaît sur la fiche')
assert.ok(app.$('[data-aqd-attack]') && app.$('[data-aqd-finish]'), 'attaquer et terminer sont accessibles')
assert.match(app.text(app.$('.aqd-tokens')), /VISER.*ESQUIVE.*SUPPR/, 'les pions principaux sont regroupés')
await app.click('[data-end-activation]')
const physical = app.$('[data-ca-physical-yes="p1:1"]')
assert.ok(physical, 'Inspiration demande une confirmation de portée physique')
assert.match(app.text(physical.closest('.physical-check')), /portée 2/i)
assert.ok(app.$('[data-ca-card="inspiration-x"]').disabled, 'l’effet reste verrouillé avant confirmation')
await app.click(physical)
assert.ok(!app.$('[data-ca-card="inspiration-x"]').disabled, 'la confirmation rend l’effet applicable')
app.dismissDialogs()

app.window.eval('showTableGame()')
assert.equal(app.$$('.tg-army').length, 2, 'une colonne est affichée par joueur')
assert.equal(app.$$('.tg-unit').length, 4, 'toutes les unités des deux armées sont visibles')
assert.match(app.text(app.$('.tg-head')), /ROUND.*1/, 'round et scores restent visibles')
await app.click('[data-tg-score="bleu:1"]')
assert.equal(JSON.parse(app.window.localStorage.getItem('swl.game-tracker.v1')).vpBleu, 1, 'le score partagé est mis à jour')
await app.click('[data-tg-sheet="p2:0"]')
assert.match(app.text(app.$('.tg-drawer')), /Luke Skywalker/i, 'la fiche rapide s’ouvre sans quitter la table')
app.dismissDialogs()
await app.click('[data-tg-attack="p1:0"]')
assert.match(app.text(app.$('h1')), /Quelle unité est attaquée/i, 'Attaquer ouvre directement le choix de la cible')
assert.equal(app.errors.length, 0, app.errors.join(' | '))
app.window.close()
console.log('Assistant Table de jeu, barre rapide et contrôles physiques : OK')
