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
assert.match(app.text(app.$('.aqd-tokens')), /ADRÉN/, 'le pion Adrénaline est lui aussi disponible dans la barre')
assert.ok(app.$('.hero .unit-state-editor'), 'blessures, élimination et pions persistants sont regroupés sous le portrait')
assert.ok(app.$('.ov-right > .cx-ov-title + .card-strip'), 'les cartes suivent immédiatement le nom dans la colonne centrale')
assert.equal(app.$$('.activation-briefing details[open]').length, 0, 'tous les groupes de mots-clés sont repliés par défaut')
assert.ok(app.$('.activation-fold') && !app.$('.activation-fold').open, 'les automatismes restent accessibles dans un volet replié')
assert.equal(app.$$('.automation-hub').length, 1, 'tous les automatismes sont réunis dans un seul volet')
assert.equal(app.$$('.overview > .ov-col > .activation-automation').length, 1, 'aucun panneau d’automatisme concurrent ne reste ouvert dans la colonne centrale')
assert.match(app.text(app.$('.ca-open-now')), /Voir l’action/i, 'le raccourci principal décrit clairement son action')
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

const boba = await openAssistant({
  'swl.list.p1.v1': { listName: 'Empire', faction: 'Empire', units: [{ name: 'Boba Fett Infamous Bounty Hunter', upgrades: [{ name: 'Emergency Transponder' }] }] },
  'swl.list.p2.v1': { listName: 'Rébellion', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [] }] },
})
await boba.pickUnit('Boba Fett')
assert.ok(boba.$('.card-lifecycle-central') && !boba.$('.unit-state-editor .card-lifecycle'), 'l’état des améliorations est centralisé sous les automatismes')
assert.ok(boba.$('[data-activation-source="pool"]'), 'le mode d’activation est demandé sur la fiche de Boba Fett')
await boba.click('[data-activation-source="pool"]')
assert.ok(boba.$('[data-unit-effect="transponder-aim"]'), 'le Transpondeur est proposé dans les automatismes quand il est applicable')
await boba.click('[data-unit-effect="transponder-aim"]')
const bobaState=JSON.parse(boba.window.localStorage.getItem('swl.assistant.unit-state.v1'))['p1:0']
assert.equal(bobaState.aim,1,'le Transpondeur met à jour le pion Viser')
assert.ok(bobaState.discardedCards.includes('emergency-transponder'),'le Transpondeur est supprimé après utilisation')
assert.ok(!boba.$('[data-card-life="gone:emergency-transponder"]'),'aucun second bouton manuel ne duplique l’action du Transpondeur')
assert.equal(boba.errors.length,0,boba.errors.join(' | '))
boba.window.close()
console.log('Assistant Table de jeu, barre rapide et contrôles physiques : OK')
