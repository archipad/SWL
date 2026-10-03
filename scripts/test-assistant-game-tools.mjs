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
assert.ok(app.$('.automation-hub-body') && !app.$('.automation-hub details'), 'les actions disponibles sont toujours déployées (plus de volet qui se replie)')
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
assert.ok(boba.$('.automation-hub') && !boba.$('.unit-state-editor .card-lifecycle'), 'les améliorations sont fusionnées dans le cadre des actions')
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

// Effet utilisé : ligne verte et réactivation par la seule icône ↩ (01/10/2026).
const luke = await openAssistant({
  'swl.list.p1.v1': { listName: 'Rébellion', faction: 'Rebelles', units: [{ name: 'Luke Skywalker Hero of the Rebellion', upgrades: [{ name: 'Burst of Speed' }, { name: 'Vigilance' }] }] },
  'swl.list.p2.v1': { listName: 'Empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades: [] }] },
})
await luke.pickUnit('Luke')
await luke.click('[data-unit-effect="burst-of-speed"]')
luke.dismissDialogs()
assert.ok(luke.$('.automation-hub-body') && !luke.$('.automation-hub details'), 'le cadre reste déplié après avoir appliqué un effet')
const usedRow = luke.$('[data-unit-effect="burst-of-speed"]').closest('.effect-row')
assert.ok(usedRow?.classList.contains('is-used'), 'l’effet utilisé est signalé (ligne verte)')
const reactivate = usedRow.querySelector('.reactivate-icon')
assert.equal(reactivate.querySelector('[aria-hidden]').textContent, '↩', 'la réactivation se fait par la seule icône')
assert.ok(reactivate.getAttribute('aria-label'), 'l’icône garde un libellé accessible')
assert.equal(luke.$('[data-unit-effect="burst-of-speed"] b').dataset.cardUse, '✖', 'l’icône ✖ de la carte est à droite du titre de l’action')
assert.ok(!luke.$('.automation-hub > header'), 'plus de titre général au-dessus du cadre')
assert.ok(!luke.$$('.card-life').length, 'aucune amélioration en double : Pointe de Vitesse, Vigilance et Dans la Mêlée ne réapparaissent pas dans un groupe Améliorations')
await luke.click(reactivate)
assert.ok(!luke.$('[data-unit-effect="burst-of-speed"]').disabled, 'l’icône ↩ rend l’effet de nouveau disponible')
assert.equal(luke.errors.length, 0, luke.errors.join(' | '))
luke.window.close()

// Auto-diagnostic du site (?selfaudit=1, lancé depuis l'écran d'import) : il tournait en boucle sur
// chaque attaque depuis les synthèses d'étape à confirmer (01/10/2026). Il doit aller au bout, OK.
const audit = await openAssistant({
  'swl.list.p1.v1': { listName: 'Rébellion', faction: 'Rebelles', units: [{ name: 'Luke Skywalker Hero of the Rebellion', upgrades: [] }] },
  'swl.list.p2.v1': { listName: 'Empire', faction: 'Empire', units: [{ name: 'Scout Troopers Strike Team', upgrades: [] }] },
}, { query: '?selfaudit=1&variants=1' })
const auditResult = await new Promise((resolve) => { const started = Date.now(); const timer = setInterval(() => { const done = audit.$('.self-audit-ok,.self-audit-fail'); if (done || Date.now() - started > 240000) { clearInterval(timer); resolve(done) } }, 500) })
assert.ok(auditResult, 'l’auto-diagnostic se termine')
assert.ok(auditResult.classList.contains('self-audit-ok'), 'l’auto-diagnostic se termine sans blocage : ' + audit.text(audit.$('#selfAuditLog')).slice(-600))
assert.match(audit.text(audit.$('#selfAuditLog')), /[1-9]\d* variante\(s\) à jet non nul rejouée\(s\), 0 blocage/, 'les variantes à dégâts réels sont rejouées')
audit.window.close()

// Volet déplié par le joueur : il reste ouvert quand la synchro (toutes les 5 s) redessine la fiche,
// et la barre rapide propose un retour à la liste des unités (03/10/2026).
const folds = await openAssistant({
  'swl.list.p1.v1': { listName: 'Rébellion', faction: 'Rebelles', units: [{ name: 'Luke Skywalker Hero of the Rebellion', upgrades: [] }, { name: 'Rebel Troopers', upgrades: [] }] },
  'swl.list.p2.v1': { listName: 'Empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades: [] }] },
})
await folds.pickUnit('Luke')
const firstFold = () => folds.$('.activation-briefing details.brief-section')
assert.ok(firstFold() && !firstFold().open, 'les volets du Briefing sont repliés par défaut')
const foldTitle = folds.text(firstFold().querySelector('summary small'))
await folds.click(firstFold().querySelector('summary'))
assert.ok(firstFold().open, 'le volet se déplie au toucher')
folds.window.eval("overview(entries.find(e=>e.unit.name==='Luke Skywalker Hero of the Rebellion'),'attack')")
await folds.settle()
const reopened = folds.$$('.activation-briefing details.brief-section').find((details) => folds.text(details.querySelector('summary small')) === foldTitle)
assert.ok(reopened?.open, 'le volet déplié reste ouvert après la reconstruction de la fiche (synchro)')
await folds.click(reopened.querySelector('summary'))
folds.window.eval("overview(entries.find(e=>e.unit.name==='Luke Skywalker Hero of the Rebellion'),'attack')")
await folds.settle()
assert.ok(!folds.$$('.activation-briefing details.brief-section').find((details) => folds.text(details.querySelector('summary small')) === foldTitle)?.open, 'un volet replié par le joueur reste replié')
const back = folds.$('[data-aqd-back]')
assert.ok(back, 'la barre rapide propose un bouton de retour')
await folds.click(back)
assert.ok(folds.$('.unit-tile') && !folds.$('.overview.attack'), 'le bouton de retour ramène à la liste des unités')
assert.equal(folds.errors.length, 0, folds.errors.join(' | '))
folds.window.close()
