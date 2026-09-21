/* Test de PARCOURS de l'Assistant (19/09/2026) : le vrai code (app.js et ses
   dépendances) est exécuté dans jsdom, et on rejoue ce qu'un joueur fait à
   l'écran — choisir son unité, sa cible, la portée, les armes, saisir les
   dés, le couvert, la défense, lire le résumé — en vérifiant à chaque étape ce
   que l'interface affiche, bloque ou grise. Contrairement à
   test-assistant-contracts.mjs (qui vérifie la présence de morceaux de code),
   ce test échoue si le comportement change.

   Limites assumées : jsdom n'applique pas les feuilles de style (pas de mise
   en page ni de mesures de pixels) ; on teste donc la structure du DOM, les
   classes d'état, les textes et la logique — pas le rendu visuel. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM, ResourceLoader, VirtualConsole } from 'jsdom'

const here = path.dirname(fileURLToPath(import.meta.url))
const assistantDir = path.resolve(here, '../public/assistant')
// Origine http (et non file:) : sinon jsdom n'offre pas localStorage.
const baseUrl = 'http://localhost/SWL/assistant/'
const indexUrl = `${baseUrl}index.html`

class LocalScriptsOnly extends ResourceLoader {
  fetch(url) {
    // Uniquement les scripts de l'Assistant, lus sur disque : ni polices Google, ni feuilles de style, ni images.
    if (url.startsWith(baseUrl) && new URL(url).pathname.endsWith('.js')) {
      return Promise.resolve(fs.readFileSync(path.join(assistantDir, path.basename(new URL(url).pathname))))
    }
    return Promise.resolve(Buffer.from(''))
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Charge l'Assistant dans jsdom, avec un stockage local pré-rempli (listes, états d'unités). */
async function openAssistant(storage = {}) {
  const errors = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (error) => errors.push(String(error.message || error)))
  const dom = new JSDOM(fs.readFileSync(path.join(assistantDir, 'index.html'), 'utf8'), {
    url: indexUrl,
    runScripts: 'dangerously',
    resources: new LocalScriptsOnly(),
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, JSON.stringify(value))
      // Ce que jsdom ne fournit pas et que l'application utilise.
      window.structuredClone ||= structuredClone
      window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
      window.Element.prototype.scrollIntoView = function () {}
      window.scrollTo = () => {}
      window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
      window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
      window.addEventListener('error', (event) => errors.push(String(event.message)))
    },
  })
  await new Promise((resolve) => dom.window.addEventListener('load', resolve))
  await sleep(120)
  const { window } = dom
  const { document } = window
  const $ = (selector, root = document) => root.querySelector(selector)
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
  const text = (element) => (element?.textContent || '').replace(/\s+/g, ' ').trim()
  const settle = (ms = 90) => sleep(ms)
  const click = async (target) => {
    const element = typeof target === 'string' ? $(target) : target
    assert.ok(element, `élément introuvable : ${target}`)
    element.click()
    await settle()
  }
  const setValue = async (id, value) => {
    const input = document.getElementById(id)
    assert.ok(input, `champ introuvable : #${id}`)
    input.value = String(value)
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
    input.dispatchEvent(new window.Event('change', { bubbles: true }))
    await settle()
  }
  const dismissDialogs = () => $$('dialog').forEach((dialog) => dialog.remove())
  const pickUnit = async (name) => {
    const tile = $$('.unit-tile').find((candidate) => text(candidate).includes(name))
    assert.ok(tile, `unité introuvable dans la sélection : ${name}`)
    await click(tile)
    dismissDialogs()
    await settle()
  }
  const center = () => $('.resolve-center')
  const gate = () => text($('.gate-status'))
  const isDimmed = (selector) => $(selector, center())?.classList.contains('is-dimmed') === true
  const nextAttack = async () => { await click('#nextAttack'); dismissDialogs(); await settle(150) }
  return { dom, window, document, errors, $, $$, text, settle, click, setValue, pickUnit, dismissDialogs, center, gate, isDimmed, nextAttack }
}

let passed = 0
const scenarios = []
const scenario = (name, run) => scenarios.push({ name, run })

/* ------------------------------------------------------------------ */
scenario('Attaque complète à distance : sélection → portée → armes → dés → couvert → modifications → défense → résumé', async () => {
  const app = await openAssistant()
  const { $, $$, text, click, setValue, pickUnit, center, gate, isDimmed, nextAttack, document } = app

  // 1. Sélection de l'unité : trois cartes, un bouton par troupe.
  assert.equal($$('.unit-tile').length, 3, 'la démonstration propose 3 unités impériales')
  await pickUnit('Stormtroopers')

  // 2. Fiche d'unité : effectif certifié, pions éditables, briefing replié sur les effets de carte.
  assert.match(text($('.models-chip')), /6\s*figurines/, 'effectif = 4 de base + 1 arme lourde + 1 spécialiste')
  assert.equal($$('.token-mini').length, 3, 'Viser, Esquive, Adrénaline')
  assert.equal($$('.activation-briefing details.brief-section').length, 3, 'trois sections de briefing repliables')
  assert.equal($$('.activation-briefing details.brief-section[open]').length, 2, 'les effets de carte sont repliés par défaut')
  await click('[data-state-field="aim"][data-delta="1"]')
  assert.match(text($$('.token-mini')[0]), /Viser\s*−\s*1\s*\+/, 'un pion Viser ajouté depuis la fiche')
  await click('#next')

  // 3. Sélection de la cible → la résolution s'ouvre directement (pas de fiche de la cible).
  assert.match(text($('h1')), /attaquée/)
  await pickUnit('Soldats Rebelles')
  assert.ok(center(), 'la résolution est affichée directement')
  assert.ok(!$('.overview'), 'aucune fiche de l’unité attaquée')

  // 4. Étape 1 : portée d'abord ; le reste est grisé et le bouton verrouillé.
  assert.match(gate(), /BLOQUÉ.*portée/i)
  assert.ok(isDimmed('.weapon-picker'), 'les armes sont grisées tant que la portée manque')
  assert.ok($('#nextAttack').classList.contains('locked'))
  await click('[data-range="2"]')
  assert.match(gate(), /BLOQUÉ.*arme/i)
  assert.ok(!isDimmed('.weapon-picker'), 'les armes se dégrisent une fois la portée saisie')
  assert.ok(isDimmed('.dice-pool'), 'les dés à lancer restent grisés jusqu’au choix des armes')
  await click('.weapon-toggle[data-key$=":1"]')
  assert.match(gate(), /PRÊT/)
  assert.match(text($('.weapon-choice.on')), /Effectif : 4 \+ 1/, 'l’effectif proposé inclut les figurines ajoutées')
  assert.match(text($('.dice-pool')), /DÉS À LANCER\s*5/, '5 dés (4 + 1 figurines)')
  await nextAttack()

  // 5. Étape 2 : Viser / Adrénaline en information, vierges automatiques.
  assert.match(text($('.token-card.aim')), /PIONS VISER DISPONIBLES : 1/, 'le Viser ajouté sur la fiche est repris')
  assert.equal($('#availableAttackSurges').value, '0')
  assert.match(gate(), /BLOQUÉ.*0 dés/)
  assert.ok(isDimmed('.roll-conversion-panel'), 'la conversion attend la saisie des dés')
  await setValue('rollHit', 3)
  assert.equal(document.getElementById('rollBlank').value, '2', 'vierges = 5 - 3')
  assert.match(gate(), /PRÊT/)
  await setValue('rollCrit', 1)
  assert.equal(document.getElementById('rollBlank').value, '1', 'vierges recalculées')
  assert.match(text($('.entry-progress')), /5 \/ 5/)
  await setValue('rollBlank', 0) // saisie manuelle : reprend la main
  assert.match(gate(), /BLOQUÉ/, 'total incorrect = bloquant')
  await setValue('rollBlank', 1)
  assert.match(gate(), /PRÊT/)
  await nextAttack()

  // 6. Étape 3 : le couvert se choisit explicitement.
  assert.match(gate(), /BLOQUÉ.*couvert/i)
  assert.ok(isDimmed('.token-card.dodge'), 'les esquives sont grisées tant que le couvert manque')
  await click('[data-cover="none"]')
  assert.match(gate(), /PRÊT/)
  assert.match(text($('.token-card.dodge')), /PIONS ESQUIVE DISPONIBLES : 0/)
  await nextAttack()

  // 7. Étape 4 : ni Impact ni Armure → information et « Passer ».
  assert.match(text($('.idle-step')), /NE S’APPLIQUE PAS ICI/)
  assert.ok(!$('#impact'), 'pas de saisie Impact/Armure')
  await click('[data-skip-step]')

  // 8. Étape 5 : défense, vierges automatiques.
  assert.match(text($('.defense-dice-pool')), /DÉS DE DÉFENSE À LANCER\s*4/)
  assert.match(gate(), /BLOQUÉ/)
  await setValue('defBlock', 1)
  assert.equal(document.getElementById('defBlank').value, '3', 'vierges = 4 - 1')
  assert.match(gate(), /PRÊT/)
  assert.match(text($('.live-defense-strip')), /1 blocage.*3 blessure/)
  await nextAttack()

  // 9. Étape 6 : résumé de l'attaque.
  assert.equal(text($('.recap-card.wounds .recap-num')), '3', '3 blessures')
  assert.equal(text($('.recap-card.suppression .recap-num')), '1', '1 suppression')
  assert.equal($$('.recap-spent .spent-item').length, 4, 'quatre types de pions dépensés')
  assert.ok($('details.morale-fold') && !$('details.morale-fold').open, 'suppression et moral repliés par défaut')
  assert.equal(app.errors.length, 0, `aucune erreur JavaScript : ${app.errors.join(' | ')}`)
  app.window.close()
})

/* Listes de test : un camp rebelle avec escouade et Contrôle de Tir, contre des Stormtroopers. */
const rebels = {
  listName: 'Test rebelles', faction: 'Rebelles',
  units: [
    { name: 'Rebel Troopers', upgrades: [{ name: 'Rebel Trooper Squad' }, { name: 'Z-6 Trooper' }] },
    { name: 'Rebel Veterans', upgrades: [{ name: 'Fire Control' }] },
  ],
}
const empire = { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades: [] }] }

const indexOfChild = (center, selector) => [...center.children].findIndex((child) => child.matches(selector))

/* ------------------------------------------------------------------ */
scenario('Étape 1 : portée → Contrôle de Tir (le porteur a la ligne de vue) → armes → dés en bas ; effectif d’escouade', async () => {
  const app = await openAssistant({ 'swl.list.p1.v1': rebels, 'swl.list.p2.v1': empire })
  const { $, $$, text, click, pickUnit, center, gate, isDimmed } = app
  await pickUnit('Soldats Rebelles')
  assert.match(text($('.models-chip')), /10\s*figurines/, 'fiche : 4 de base + 5 d’escouade + 1 arme lourde Z-6')
  await click('#next')
  await pickUnit('Stormtroopers')

  const c = center()
  const order = ['.range-picker', '.fire-control-card', '.weapon-picker', '.dice-pool'].map((selector) => indexOfChild(c, selector))
  assert.ok(order.every((index) => index >= 0), `blocs attendus présents : ${order}`)
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'ordre : portée, Contrôle de Tir, armes, dés à lancer')

  assert.ok(isDimmed('.fire-control-card'), 'le Contrôle de Tir est grisé tant que la portée manque')
  await click('[data-range="2"]')
  assert.ok(!isDimmed('.fire-control-card'), 'il se dégrise une fois la portée saisie')
  assert.ok(isDimmed('.weapon-picker'), 'les armes attendent la réponse')
  assert.match(gate(), /Contrôle de Tir/)
  const card = text($('.fire-control-card'))
  assert.match(card, /Vétérans Rebelles/, 'le porteur est nommé')
  assert.match(card, /portée 1 de Soldats Rebelles/, 'condition 1 : portée 1 de l’unité qui attaque')
  assert.match(card, /a également la cible en ligne de vue/, 'condition 2 : le porteur a également la ligne de vue')
  await click('[data-fire-control="true"]')
  assert.ok(!isDimmed('.weapon-picker'))
  await click('.weapon-toggle[data-key$=":1"]')
  assert.match(text($('.weapon-choice.on')), /Effectif : 4 \+ 5/, 'l’escouade ajoute 5 figurines')
  assert.equal($('.weapon-choice.on input[data-count]').value, '9', '9 figurines proposées')
  assert.ok($('.pool-note'), 'la note « dés améliorés » est affichée')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Étape 3 : couvert choisi → jet de couvert validé → esquives dépensées (stock en lecture seule)', async () => {
  const app = await openAssistant({ 'swl.assistant.unit-state.v1': { 'p2:0': { dodge: 2 } } })
  const { $, text, click, setValue, pickUnit, center, gate, isDimmed, nextAttack } = app
  await pickUnit('Stormtroopers')
  await click('#next')
  await pickUnit('Soldats Rebelles')
  await click('[data-range="2"]')
  await click('.weapon-toggle[data-key$=":1"]')
  await nextAttack()
  await setValue('rollHit', 3)
  await setValue('rollCrit', 1)
  await nextAttack()

  assert.match(gate(), /BLOQUÉ.*couvert/i, 'le couvert doit être choisi explicitement')
  assert.ok($('.cover-options.unset'), '« Aucun » n’apparaît pas comme choisi par défaut')
  await click('[data-cover="light"]')
  assert.match(text($('.cover-pool')), /DÉS DE COUVERT À LANCER\s*3/)
  assert.match(gate(), /BLOQUÉ.*jet de couvert/i)
  assert.ok(isDimmed('.token-card.dodge'), 'les esquives attendent la validation du jet')
  await setValue('coverBlock', 1)
  await click('.phase-confirm')
  assert.match(gate(), /PRÊT/)
  assert.equal(text($('[data-live-hit]')), '2', '3 touches - 1 blocage de couvert')
  assert.match(text($('.token-card.dodge')), /PIONS ESQUIVE DISPONIBLES : 2/)
  assert.ok(!$('#availableDodges'), 'le stock d’esquives n’est pas modifiable dans cet écran')
  await click('[data-adjust="dodges"][data-delta="1"]')
  assert.equal(text($('[data-live-hit]')), '1', 'une esquive dépensée annule une touche')
  // Changer de couvert invalide le jet déjà validé.
  await click('[data-cover="heavy"]')
  assert.match(gate(), /BLOQUÉ.*jet de couvert/i)
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Étape 4 : Impact + Armure → saisie et validation obligatoires ; vérification Encombrant bloquante', async () => {
  const app = await openAssistant()
  const { $, $$, text, click, setValue, pickUnit, gate, isDimmed, nextAttack, document } = app
  await pickUnit('Stormtroopers')
  await click('#next')
  await pickUnit('Airspeeder')
  await click('[data-range="3"]')
  await click('.weapon-toggle[data-key="hh 12 stormtrooper:0"]')
  assert.match(gate(), /Encombrant/, 'Encombrant doit être vérifié avant de poursuivre')
  assert.ok(isDimmed('.range-picker') || isDimmed('.weapon-picker') || isDimmed('.dice-pool'), 'la suite est grisée')
  await click('#cumbersomeConfirmed')
  assert.match(gate(), /PRÊT/)
  await nextAttack()
  await setValue('rollHit', 2)
  await setValue('rollCrit', 1)
  assert.equal(document.getElementById('rollBlank').value, '0', 'aucune vierge : 3 dés, 3 résultats')
  await nextAttack()
  await click('[data-cover="none"]')
  await nextAttack()
  assert.ok($('#impact') && $('#armor'), 'Impact chez l’attaquant et Armure chez le défenseur : saisie proposée')
  assert.match(gate(), /BLOQUÉ.*modifications/i)
  assert.ok($('.phase-confirm-row'))
  await click('.phase-confirm')
  assert.match(gate(), /PRÊT/)
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Régression : corriger le stock d’Adrénaline sous ce qui est « dépensé » ne bloque plus', async () => {
  const app = await openAssistant()
  const { click, setValue, pickUnit, gate, nextAttack, $ } = app
  await pickUnit('Stormtroopers')
  await click('#next')
  await pickUnit('Soldats Rebelles')
  await click('[data-range="2"]')
  await click('.weapon-toggle[data-key$=":1"]')
  await nextAttack()
  await click('[data-adjust="availableAttackSurges"][data-delta="1"]')
  await click('[data-adjust="availableAttackSurges"][data-delta="1"]')
  await setValue('attackSurgesSpent', 2)
  await click('[data-adjust="availableAttackSurges"][data-delta="-1"]')
  await click('[data-adjust="availableAttackSurges"][data-delta="-1"]')
  await setValue('rollHit', 3)
  await setValue('rollCrit', 1)
  assert.doesNotMatch(gate(), /Pas assez de pions/)
  assert.match(gate(), /PRÊT/)
  assert.ok(!$('#nextAttack').classList.contains('locked'))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Saisie des dés : un seul point bloquant à la fois, « Tout vierge », vierges manuelles reprises en main', async () => {
  const app = await openAssistant()
  const { $, $$, click, setValue, pickUnit, gate, nextAttack, document } = app
  await pickUnit('Stormtroopers')
  await click('#next')
  await pickUnit('Soldats Rebelles')
  assert.equal($$('.blocker-current').length, 1, 'un seul point bloquant à la fois (étape 1)')
  assert.ok($('.range-picker').classList.contains('blocker-current'))
  // Toucher une section grisée ne débloque rien et ne casse rien.
  await click($('.weapon-picker'))
  assert.match(gate(), /BLOQUÉ.*portée/i)
  await click('[data-range="2"]')
  await click('.weapon-toggle[data-key$=":1"]')
  await nextAttack()
  await click('[data-all-blank="roll"]')
  assert.equal(document.getElementById('rollBlank').value, '5', 'tout vierge : 5 dés')
  assert.match(gate(), /PRÊT/)
  await setValue('rollHit', 2)
  assert.equal(document.getElementById('rollBlank').value, '3')
  await setValue('rollBlank', 1)
  assert.match(gate(), /BLOQUÉ/, 'vierges saisies à la main : le compte doit être exact')
  assert.ok($('[data-auto-blank="roll"]'), 'bouton pour revenir aux vierges automatiques')
  await click('[data-auto-blank="roll"]')
  assert.equal(document.getElementById('rollBlank').value, '3')
  assert.match(gate(), /PRÊT/)
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Précis : les Stormtroopers ont Précis 1 sur leur carte (2 avec la Lunette de Visée), même si le stockage local a été « nettoyé »', async () => {
  // Reproduit l'ancien correctif fautif : la copie locale des étiquettes ne contient plus Précis pour les Stormtroopers.
  const staleLocalTags = { stormtroopers: [] }
  const precisOf = async (upgrades) => {
    const app = await openAssistant({
      'swl.card-tags.v1': staleLocalTags,
      'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades }] },
      'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [] }] },
      'swl.assistant.unit-state.v1': { 'p1:0': { aim: 1 } },
    })
    await app.pickUnit('Stormtroopers')
    await app.click('#next')
    await app.pickUnit('Soldats Rebelles')
    await app.click('[data-range="2"]')
    await app.click('.weapon-toggle[data-key$=":1"]')
    await app.nextAttack()
    const info = app.text(app.$('.token-card.aim'))
    assert.match(app.text(app.$('.rules-panel')), /Précis/, 'Précis est listé parmi les règles qui interviennent')
    assert.equal(app.errors.length, 0, app.errors.join(' | '))
    app.window.close()
    return info
  }
  assert.match(await precisOf([]), /jusqu’à 3 dés \(1 × \(2 \+ Précis 1\)\)/, 'Précis 1 de la carte Unité : 3 relances par pion Viser')
  assert.match(await precisOf([{ name: 'Targeting Scopes' }]), /jusqu’à 4 dés \(1 × \(2 \+ Précis 2\)\)/, 'Précis 1 + Lunette de Visée (Précis 1) = Précis 2')
})

/* ------------------------------------------------------------------ */
scenario('Arsenal : carte d’information bleue avant le choix des armes ; portée des armes en orange', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Boba Fett Infamous Bounty Hunter', upgrades: [] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [] }] },
  })
  await app.pickUnit('Boba Fett')
  await app.click('#next')
  await app.pickUnit('Soldats Rebelles')
  await app.click('[data-range="2"]')
  const card = app.$('.arsenal-card', app.center())
  assert.ok(card, 'la carte Arsenal est affichée à l’étape des armes')
  assert.match(app.text(card), /ARSENAL 2/)
  assert.match(app.text(card), /jusqu’à 2 armes/)
  const picker = app.$('.weapon-picker', app.center())
  assert.ok(picker && card !== picker && (card.compareDocumentPosition(picker) & 4), 'la carte précède le choix des armes : ' + card.outerHTML.slice(0, 80) + ' / ' + [...app.center().children].map((child) => child.className.split(' ')[0]).join(','))
  assert.ok(app.$('.weapon-copy .range-tag'), 'la portée de chaque arme est balisée pour l’affichage orange')
  assert.match(app.text(app.$('.weapon-copy .range-tag')), /^portée /)
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
})

/* ------------------------------------------------------------------ */
scenario('Certification : tout ce qui n’est pas certifié à 100 % est listé, les écarts doivent être relus avant de certifier', async () => {
  const app = await openAssistant()
  const { $, $$, text, click, document } = app
  await click('#certification')
  const total = Number(text($('#certificationCount')))
  assert.ok(total > 100, 'toutes les cartes sans certification complète comptent : ' + total)
  assert.ok($$('[data-cert-filter]').length === 5, 'filtres : toutes, mes listes, écarts, jamais certifiées, à confirmer (relecture IA)')
  await click('[data-cert-filter="gaps"]')
  const gaps = $$('.cert-list button[data-cert-card]')
  assert.ok(gaps.length >= 20, 'les cartes avec écart Legion Helper ou base ≠ certification sont listées : ' + gaps.length)
  assert.match(text($('.cert-list')), /Écart Legion Helper/)

  // Une carte déjà certifiée mais avec écart : reste à contrôler, et exige la lecture des écarts.
  const chewie = gaps.find((button) => decodeURIComponent(button.dataset.certCard) === 'chewbacca')
  assert.ok(chewie, 'Chewbacca (certifié, écart Charge chez Legion Helper) est à relire')
  await click(chewie)
  assert.match(text($('.cert-sources')), /À COMPARER AVEC LE VISUEL/)
  assert.match(text($('.cert-sources')), /Charge/, 'l’écart signalé est affiché')
  assert.ok($$('input[data-weapon-range]').length >= 1, 'la portée de chaque arme est modifiable')
  assert.equal($$('[data-full-check]').length + $$('[data-full-ack]').length, 0, 'plus aucune case à cocher obligatoire (six contrôles, lecture des écarts)')
  assert.ok(!$('#queueFullCard').disabled, 'un seul clic suffit pour certifier la carte (le bouton vaut lecture des écarts)')
  await click('#queueFullCard')
  await click('#backCertification')
  assert.match(text($('.cert-batch-bar')), /correction/)
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
})

/* ------------------------------------------------------------------ */
scenario('Certification : recherche de mots-clés (carte et armes), validation en un clic, passage à la carte suivante', async () => {
  const app = await openAssistant()
  const { $, $$, text, click, settle, window } = app
  const fire = async (element, type = 'input') => { element.dispatchEvent(new window.Event(type, { bubbles: true })); await settle() }
  await click('#certification')
  await click($$('[data-cert-card]').find((button) => decodeURIComponent(button.dataset.certCard) === 'stormtroopers'))
  const before = text($('.cert-detail h2'))

  // Recherche : seuls les mots-clés du glossaire sont proposés (orthographe et syntaxe garanties), ceux déjà présents sont exclus.
  const search = $('[data-kw-search="card"]')
  assert.ok(search, 'champ de recherche des mots-clés de la carte')
  search.value = 'prec'
  await fire(search)
  assert.ok(!$$('[data-kw-add]').some((button) => /Précis/.test(text(button))), 'un mot-clé déjà présent n’est pas reproposé')
  const box = $('[data-kw-search="card"]')
  box.value = 'zzzz'
  await fire(box)
  assert.match(text($('.kw-none')), /Aucun mot-clé du glossaire/)

  // Mot-clé d'arme avec valeur : recherche, valeur obligatoire, puis ajout à l'arme ET à la liste de la carte.
  const weaponSearch = $('[data-kw-search="w0"]')
  assert.ok(weaponSearch, 'champ de recherche des mots-clés de la première arme')
  weaponSearch.value = 'perfo'
  await fire(weaponSearch)
  const perforant = $$('[data-kw-add]').find((button) => /^Perforant X/.test(text(button)))
  assert.ok(perforant, 'Perforant X est proposé')
  await click(perforant)
  const value = $('[data-kw-value]')
  assert.ok(value, 'la valeur X est demandée')
  value.value = '2'
  await fire(value)
  await click('[data-kw-confirm]')
  assert.match(text($('[data-kw-scope="w0"] .kw-chips')), /Perforant X 2/, 'le mot-clé est ajouté à l’arme avec sa valeur')
  assert.match(text($('[data-kw-scope="card"] .kw-chips')), /Perforant X 2/, 'et reporté dans la liste de la carte')

  // Validation en un clic : la carte part dans le lot et la carte suivante s'ouvre.
  await click('#certifyAndNext')
  const after = text($('.cert-detail h2'))
  assert.ok(after && after !== before, 'la carte suivante à contrôler s’ouvre')
  await click('#backCertification')
  assert.match(text($('.cert-batch-bar')), /1 correction/)
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
})

/* ------------------------------------------------------------------ */
scenario('Import : l’amélioration « Chewbacca » n’est jamais la carte Unité Chewbacca (armes, mots-clés) et réclame sa propre carte', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Wookiee Warriors Kashyyyk Resistance', upgrades: [{ name: 'Chewbacca' }] }] },
    'swl.list.p2.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades: [] }] },
  })
  await app.pickUnit('Guerriers Wookies')
  await app.click('#next')
  await app.pickUnit('Stormtroopers')
  await app.click('[data-range="2"]')
  const weapons = app.text(app.$('.weapon-picker'))
  assert.ok(!/Prépotence/.test(weapons), 'les armes de l’unité Chewbacca ne sont pas attribuées à l’amélioration')
  assert.match(weapons, /Arbalète de Chewbacca/, 'l’arme propre à la carte d’amélioration est proposée')
  await app.click('#certification')
  assert.doesNotMatch(app.text(app.$('.cert-page')), /Chewbacca Upgrade/, 'l’amélioration est raccordée : plus de carte inconnue')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
})

/* ------------------------------------------------------------------ */
scenario('Certification : explication en langage courant du désaccord (Boba Fett) et récapitulatif à comparer au visuel', async () => {
  const app = await openAssistant()
  const { $, $$, text, click } = app
  // Le désaccord réel de Boba a été résolu par sa certification : on le rejoue avec un désaccord de test (le scénario ne doit pas dépendre de l'état des données).
  app.window.SWL_REFERENCE.keywordConflicts['boba fett infamous bounty hunter'] = { certifiedOnly: ['impact-x', 'perforant-x', 'polyvalent'], tagsOnly: ['arsenal-x'], valueDiffs: [], suspiciousEmpty: false, reviewed: false }
  await click('#certification')
  await click('[data-cert-filter="gaps"]')
  await click($$('[data-cert-card]').find((button) => decodeURIComponent(button.dataset.certCard) === 'boba fett infamous bounty hunter'))
  const panel = text($('.cert-sources'))
  assert.match(panel, /« Arsenal X » était dans nos données du moteur mais avait été oublié à la dernière validation : il est déjà ajouté/)
  assert.match(panel, /« Impact X » est imprimé sur la carte ou sur une arme mais manquait dans nos données du moteur/)
  assert.doesNotMatch(panel, /Base de l’appli|Dans la certification seulement/, 'plus de jargon « base / certification »')
  assert.match(panel, /Roquettes Intégrées — 3 noir — portée 1-2 — Impact X 1, Polyvalent/, 'le récapitulatif liste chaque arme avec ses mots-clés')
  assert.match(panel, /Tous les mots-clés de la carte.*Arsenal X 2/, 'la liste proposée contient Arsenal X 2')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
})

/* ------------------------------------------------------------------ */
scenario('Mots-clés sans valeur (Insensible, Agile, Profil bas, Blocage) : pris en compte par le moteur (ils valaient 0 et n’étaient jamais appliqués)', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Han Solo', upgrades: [] }, { name: 'Iden Versio', upgrades: [] }, { name: 'Boba Fett Infamous Bounty Hunter', upgrades: [] }] },
    'swl.list.p2.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades: [] }] },
  })
  const value = (unit, id) => app.window.eval('keywordValue(entries.find(e=>e.unit.name===' + JSON.stringify(unit) + '),' + JSON.stringify(id) + ')')
  assert.ok(value('Han Solo', 'profil-bas') > 0, 'Profil bas de Han Solo')
  assert.ok(value('Iden Versio', 'agile') > 0, 'Agile d’Iden Versio')
  assert.ok(value('Boba Fett Infamous Bounty Hunter', 'insensible') > 0, 'Insensible de Boba Fett')
  assert.equal(value('Stormtroopers', 'insensible'), 0, 'un mot-clé absent reste à 0')
  assert.equal(value('Han Solo', 'perforant-x'), 2, 'un mot-clé à valeur garde sa valeur')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
})

/* ------------------------------------------------------------------ */
scenario('Mots-clés d’unité : pastille d’étape dans le Briefing, boutons d’application (Preste à chaque déplacement, Fiable une fois par round)', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [] }] },
    'swl.list.p2.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Imperial Special Forces', upgrades: [] }] },
  })
  const { $, $$, text, click } = app
  const dodge = () => Number(text($('.token-mini:nth-child(2) .token-value, .token-mini:nth-child(2) input') || $$('.token-mini')[1]).replace(/\D+/g, '').slice(-1) || 0)
  await app.pickUnit('Soldats Rebelles')
  const briefing = text($('.activation-briefing'))
  assert.match(briefing, /Déplacement/, 'Preste X est rangé à l’étape Déplacement')
  assert.match($('.keyword-automation') ? text($('.keyword-automation')) : '', /PRESTE 1/, 'bouton Preste 1')
  await click('[data-kw-apply="preste-x"]')
  await click('[data-kw-apply="preste-x"]')
  assert.match(text($$('.token-mini')[1]), /2/, 'Preste appliqué deux fois : 2 pions Esquive')
  assert.ok(!$('[data-kw-apply="preste-x"]').disabled, 'Preste reste disponible à chaque déplacement')
  await click('#next')
  await app.pickUnit('Forces Spéciales')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
})

/* ------------------------------------------------------------------ */
scenario('Lot 1 : actions de carte des mots-clés (Vivacité d’esprit, Observateur X, Escorte…) appliquent les pions et consomment l’action', async () => {
  const lists = {
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Iden Versio', upgrades: [] }, { name: 'General Veers', upgrades: [] }, { name: 'Stormtroopers', upgrades: [] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [] }] },
  }
  const tokens = (app, name) => JSON.parse(app.window.eval('JSON.stringify((()=>{const s=stateFor(entries.find(e=>e.unit.name===' + JSON.stringify(name) + '));return {aim:s.aim,dodge:s.dodge,surge:s.surge,suppression:s.suppression,actions:s.activationActions}})())'))

  // Vivacité d'esprit : effet sur soi, une action consommée, bouton ensuite désactivé.
  let app = await openAssistant(lists)
  await app.pickUnit('Iden Versio')
  assert.match(app.text(app.$('.keyword-automation')), /VIVACITÉ D’ESPRIT/)
  await app.click('[data-card-action="vivacite-desprit"]')
  assert.deepEqual([tokens(app, 'Iden Versio').aim, tokens(app, 'Iden Versio').dodge], [1, 1], '+1 Viser et +1 Esquive')
  assert.deepEqual(tokens(app, 'Iden Versio').actions, ['card:vivacite-desprit'], 'une action consommée')
  assert.ok(app.$('[data-card-action="vivacite-desprit"]').disabled, 'une fois par activation')
  app.window.close()

  // Observateur X : choix d'une cible alliée, +1 Viser à la cible.
  app = await openAssistant(lists)
  await app.pickUnit('Veers')
  await app.click('[data-card-action="observateur-x"]')
  assert.ok(app.$('[data-kw-apply-action]').disabled, 'aucune cible choisie : appliquer est verrouillé')
  await app.click(app.$$('[data-kw-target]').find((button) => /Stormtroopers/.test(app.text(button))))
  await app.click('[data-kw-apply-action]')
  assert.equal(tokens(app, 'Stormtroopers').aim, 1, 'la cible gagne 1 Viser')
  assert.equal(tokens(app, 'General Veers').aim, 0, 'l’unité qui agit n’a rien gagné')
  assert.deepEqual(tokens(app, 'General Veers').actions, ['card:observateur-x'])
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Lot 2 : Régénérer X (blessures), Conseils (action gratuite offerte), Distraire (cible imposée à l’attaque)', async () => {
  const lists = {
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Bossk Terror of Trandosha', upgrades: [] }, { name: 'General Veers', upgrades: [] }, { name: 'Stormtroopers', upgrades: [] }, { name: 'C-3PO', upgrades: [] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [] }] },
  }
  const stateOf = (app, name) => JSON.parse(app.window.eval('JSON.stringify(stateFor(entries.find(e=>e.unit.name===' + JSON.stringify(name) + ')))'))

  // Régénérer 3 : 3 Blessures, 3 dés blancs, 2 résultats BLOC/ADR-DEF -> il reste 1 Blessure.
  let app = await openAssistant(lists)
  await app.pickUnit('Bossk')
  assert.match(app.text(app.$('.keyword-automation')), /RÉGÉNÉRER 3/)
  for (let i = 0; i < 3; i++) await app.click('[data-kw-counter="wound:1"]')
  assert.equal(stateOf(app, 'Bossk Terror of Trandosha').wound, 3)
  await app.click('[data-kw2-open="regen"]')
  assert.match(app.text(app.$('.kw-input')), /0 à 3/, '3 dés blancs à lancer')
  const input = app.$('[data-kw2-input]')
  input.value = '2'
  input.dispatchEvent(new app.window.Event('input', { bubbles: true }))
  await app.click('[data-kw2-apply="regen"]')
  assert.equal(stateOf(app, 'Bossk Terror of Trandosha').wound, 1, '2 Blessures retirées')
  assert.ok(app.$('[data-kw2-open="regen"]').disabled, 'une fois par activation')
  app.window.close()

  // Conseils : action de carte, une unité alliée reçoit une action gratuite à effectuer.
  app = await openAssistant(lists)
  await app.pickUnit('Veers')
  await app.click('[data-card-action="conseils"]')
  await app.click(app.$$('[data-kw-target]').find((button) => /Stormtroopers/.test(app.text(button))))
  await app.click('[data-kw-apply-action]')
  const offers = stateOf(app, 'Stormtroopers').freeActionOffers
  assert.equal(offers.length, 1, 'une action gratuite est offerte à la cible')
  assert.match(offers[0].label, /action gratuite/)
  app.window.close()

  // Distraire : l'unité ennemie doit attaquer C-3PO ; l'alerte apparaît à son étape des armes.
  app = await openAssistant(lists)
  await app.pickUnit('C-3PO')
  await app.click('[data-card-action="distraire"]')
  await app.click(app.$$('[data-kw-target]').find((button) => /Soldats Rebelles/.test(app.text(button))))
  await app.click('[data-kw-apply-action]')
  assert.ok(stateOf(app, 'Rebel Troopers').distractedBy, 'la cible est marquée Distraite')
  assert.ok(app.$('[data-card-action="distraire"]').disabled, 'Distraire : une fois par round')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Lot 3 : mise en place (Position préparée, Prime, Infiltration, Blessure X) appliquée une seule fois au round 1', async () => {
  const lists = {
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Shoretroopers', upgrades: [] }, { name: 'Bossk Terror of Trandosha', upgrades: [] }, { name: 'Iden Versio', upgrades: [] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Luke Skywalker Hero of the Rebellion', upgrades: [] }, { name: 'Rebel Troopers', upgrades: [] }] },
  }
  const stateOf = (app, name) => JSON.parse(app.window.eval('JSON.stringify(stateFor(entries.find(e=>e.unit.name===' + JSON.stringify(name) + ')))'))

  // Position préparée : +1 Esquive une seule fois, puis « fait ».
  let app = await openAssistant(lists)
  await app.pickUnit('Shoretroopers')
  assert.match(app.text(app.$('[data-card-action="position-preparee"]')), /touchez quand c’est fait/)
  await app.click('[data-card-action="position-preparee"]')
  assert.equal(stateOf(app, 'Shoretroopers').dodge, 1, '+1 pion Esquive')
  assert.ok(app.$('[data-card-action="position-preparee"]').disabled, 'appliqué une seule fois')
  assert.match(app.text(app.$('[data-card-action="position-preparee"]')), /fait/)
  app.window.close()

  // Prime : une unité ennemie reçoit le pion Butin.
  app = await openAssistant(lists)
  await app.pickUnit('Bossk')
  await app.click('[data-card-action="prime"]')
  await app.click(app.$$('[data-kw-target]').find((button) => /Luke/.test(app.text(button))))
  await app.click('[data-kw-apply-action]')
  assert.ok(stateOf(app, 'Luke Skywalker Hero of the Rebellion').lootFrom, 'la cible porte le pion Butin')
  assert.ok(app.$('[data-card-action="prime"]').disabled)
  app.window.close()

  // Après le round 1, la mise en place n'est plus proposée.
  app = await openAssistant({ ...lists, 'swl.game-tracker.v1': { round: 2 } })
  await app.pickUnit('Iden Versio')
  assert.ok(!app.$('[data-card-action="infiltration"]'), 'plus de mise en place au round 2')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Lots 4-5 : Ordre direct (offre d’ordre), Marche forcée (vitesse + Suppression), Speeder (déplacement obligatoire), Mission secrète (une fois par partie)', async () => {
  const lists = {
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Agent Kallus', upgrades: [] }, { name: 'Range Troopers', upgrades: [] }, { name: '74-Z Speeder Bikes', upgrades: [] }, { name: 'Stormtroopers', upgrades: [] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'R2-D2', upgrades: [] }, { name: 'Rebel Troopers', upgrades: [] }] },
  }
  const stateOf = (app, name) => JSON.parse(app.window.eval('JSON.stringify(stateFor(entries.find(e=>e.unit.name===' + JSON.stringify(name) + ')))'))

  let app = await openAssistant(lists)
  await app.pickUnit('Agent Kallus')
  await app.click('[data-card-action="ordre-direct"]')
  await app.click(app.$$('[data-kw-target]').find((button) => /Stormtroopers/.test(app.text(button))))
  await app.click('[data-kw-apply-action]')
  assert.match(stateOf(app, 'Stormtroopers').freeActionOffers[0].label, /ordre reçu par Ordre direct/, 'la cible reçoit un ordre')
  assert.ok(app.$('[data-card-action="ordre-direct"]').disabled, 'une fois par round')
  app.window.close()

  app = await openAssistant(lists)
  await app.pickUnit('Range Troopers')
  await app.click('[data-card-action="marche-forcee"]')
  const forced = stateOf(app, 'Range Troopers')
  assert.equal(forced.suppression, 1, '+1 Suppression')
  assert.equal(forced.speedDelta, 1, 'vitesse maximale +1')
  assert.match(app.text(app.$('.move-rules')), /Vitesse maximale \+1/, 'la vitesse modifiée est affichée dans le Briefing')
  app.window.close()

  app = await openAssistant(lists)
  await app.pickUnit('Speeder')
  assert.match(app.text(app.$('.move-rules')), /Déplacement obligatoire/, 'alerte tant que le déplacement obligatoire n’est pas fait')
  await app.click('[data-card-action="speeder-x"]')
  assert.equal(stateOf(app, '74-Z Speeder Bikes').mandatoryMoveDone, true)
  assert.doesNotMatch(app.$('.move-rules') ? app.text(app.$('.move-rules')) : '', /Déplacement obligatoire/)
  app.window.close()

  // Mission secrète : le camp choisi est celui de la première liste ; on inverse pour jouer R2-D2.
  app = await openAssistant({ 'swl.list.p1.v1': lists['swl.list.p2.v1'], 'swl.list.p2.v1': lists['swl.list.p1.v1'] })
  await app.pickUnit('R2-D2')
  await app.click('[data-card-action="mission-secrete"]')
  assert.equal(stateOf(app, 'R2-D2').secretMission, 1, '+1 pion Mission secrète')
  assert.ok(app.$('[data-card-action="mission-secrete"]').disabled, 'une seule fois par partie')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Lot 6 : Autonome (pion choisi), Impitoyable (blessure + action offerte), Réparation X (soigne un allié et charge la carte)', async () => {
  const stateOf = (app, name) => JSON.parse(app.window.eval('JSON.stringify(stateFor(entries.find(e=>e.unit.name===' + JSON.stringify(name) + ')))'))
  const enemy = { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades: [] }] }

  let app = await openAssistant({ 'swl.list.p1.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Jyn Erso', upgrades: [] }] }, 'swl.list.p2.v1': enemy })
  await app.pickUnit('Jyn Erso')
  await app.click('[data-card-action="autonome"]')
  await app.click(app.$$('[data-kw-choice]').find((button) => /Viser/.test(app.text(button))))
  assert.equal(stateOf(app, 'Jyn Erso').aim, 1, 'Autonome : +1 Viser')
  assert.ok(app.$('[data-card-action="autonome"]').disabled, 'une fois par round')
  app.window.close()

  app = await openAssistant({ 'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Moff Gideon', upgrades: [] }, { name: 'Stormtroopers', upgrades: [] }] }, 'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [] }] } })
  await app.pickUnit('Moff Gideon')
  await app.click('[data-card-action="impitoyable"]')
  await app.click(app.$$('[data-kw-target]').find((button) => /Stormtroopers/.test(app.text(button))))
  await app.click('[data-kw-apply-action]')
  const trooper = stateOf(app, 'Stormtroopers')
  assert.equal(trooper.wound, 1, 'la cible subit 1 Blessure')
  assert.match(trooper.freeActionOffers[0].label, /action gratuite/, 'et reçoit une action gratuite')
  app.window.close()

  app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'R2-D2', upgrades: [] }, { name: 'Rebel Troopers', upgrades: [] }] },
    'swl.list.p2.v1': enemy,
    'swl.assistant.unit-state.v1': { 'p1:1': { wound: 2 } },
  })
  await app.pickUnit('R2-D2')
  await app.click('[data-card-action="reparation-x"]')
  await app.click(app.$$('[data-kw-target]').find((button) => /Soldats Rebelles/.test(app.text(button))))
  await app.click(app.$$('[data-kw-choice]').find((button) => /Blessures/.test(app.text(button))))
  assert.ok(stateOf(app, 'Rebel Troopers').wound < 2, 'des Blessures sont retirées à l’allié')
  assert.equal(stateOf(app, 'R2-D2').cardWound, 1, 'un pion Blessure est placé sur la carte Réparation')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Défense : avec Impact et Armure, le nombre de dés à lancer affiché est celui qui débloque la résolution', async () => {
  const app = await openAssistant()
  const { $, $$, text, click, setValue, pickUnit, gate, nextAttack, document } = app
  await pickUnit('Stormtroopers')
  await click('#next')
  await pickUnit('Airspeeder')
  await click('[data-range="3"]')
  await click('.weapon-toggle[data-key="hh 12 stormtrooper:0"]')
  await click('#cumbersomeConfirmed')
  await nextAttack()
  await setValue('rollHit', 2)
  await setValue('rollCrit', 1)
  await nextAttack()
  await click('[data-cover="none"]')
  await nextAttack()
  await click('.phase-confirm')
  await nextAttack()
  // Étape Défense : on saisit exactement le nombre de dés annoncé « À DÉFENDRE ».
  const strip = text($$('.result-strip').find((element) => /À DÉFENDRE/.test(text(element))))
  const numbers = strip.match(/\d+/g).map(Number)
  const toRoll = numbers[numbers.length - 2] + numbers[numbers.length - 1]
  await setValue('defBlank', toRoll)
  assert.doesNotMatch(gate(), /doivent être lancés/, 'la validation exige le même nombre que celui affiché (' + toRoll + ') : ' + gate())
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Défense : Boba Fett contre TL-TT (Armure 2) — le nombre de dés exigé est celui affiché après Impact et Armure', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Boba Fett Infamous Bounty Hunter', upgrades: [] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'AT-RT', upgrades: [] }] },
  })
  const { $, $$, text, click, setValue, pickUnit, gate, nextAttack } = app
  await pickUnit('Boba')
  await click('#next')
  await pickUnit('TL-TT')
  await click('[data-range="2"]')
  await click(app.$$('.weapon-toggle').find((button) => /Roquettes/.test(text(button))))
  await nextAttack()
  await setValue('rollHit', 3)
  await nextAttack()
  await click('[data-cover="none"]')
  await nextAttack()
  await click('.phase-confirm')
  await nextAttack()
  const strip = text($$('.result-strip').find((element) => /À DÉFENDRE/.test(text(element))))
  const numbers = strip.match(/\d+/g).map(Number)
  const toRoll = numbers[numbers.length - 2] + numbers[numbers.length - 1]
  await setValue('defBlank', toRoll)
  assert.doesNotMatch(gate(), /doivent être lancés/, 'À DÉFENDRE affiche ' + toRoll + ' dé(s) : la validation doit exiger le même nombre — ' + gate())
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Mots-clés : une application faite par erreur (Autonome de Boba Fett) peut être annulée', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Boba Fett Infamous Bounty Hunter', upgrades: [] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'AT-RT', upgrades: [] }] },
  })
  const { $, $$, text, click, pickUnit } = app
  await pickUnit('Boba')
  const autonome = () => $('[data-card-action="autonome"]')
  const tokens = () => text($('.keyword-automation footer'))
  assert.ok(autonome() && !autonome().disabled, 'Autonome est proposé et cliquable')
  await click('[data-card-action="autonome"]')
  await click($$('[data-kw-choice]').find((button) => /Viser/.test(text(button))))
  assert.ok(autonome().disabled, 'après application, Autonome est grisé (une fois par round)')
  assert.match(tokens(), /Viser\s*1/, 'le pion Viser est ajouté')
  assert.ok($('[data-kw-undo]'), 'un bouton ANNULER est proposé')
  await click('[data-kw-undo]')
  assert.ok(!autonome().disabled, 'après annulation, Autonome est de nouveau disponible')
  assert.match(tokens(), /Viser\s*0/, 'le pion Viser est retiré')
  assert.ok(!$('[data-kw-undo]'), 'plus rien à annuler')
  await click('[data-card-action="autonome"]')
  await click($$('[data-kw-choice]').find((button) => /Esquive/.test(text(button))))
  assert.match(tokens(), /Esquive\s*1/, 'on peut réappliquer avec l’autre choix')
  assert.ok(autonome().disabled, 'Autonome est de nouveau grisé')
  // Application antérieure à ANNULER (ou après rechargement) : « Réactiver » rend le bouton cliquable sans toucher aux pions.
  await click('[data-kw-reset="autonome"]')
  assert.ok(!autonome().disabled, 'Réactiver rend Autonome de nouveau cliquable')
  assert.match(tokens(), /Esquive\s*1/, 'Réactiver ne retire pas les pions déjà gagnés')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('À Bout Portant : attaque à portée 2, l’Esquive gagnée est annoncée dans le pop-up (avec la Suppression) et dans le résumé', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades: [{ name: 'Point Blank' }] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [] }] },
  })
  const { $, $$, text, click, setValue, pickUnit, gate, nextAttack } = app
  await pickUnit('Stormtroopers')
  await click('#next')
  await pickUnit('Rebel')
  await click('[data-range="2"]')
  await click('.weapon-toggle[data-key$=":1"]')
  await nextAttack()
  await setValue('rollHit', 2)
  await nextAttack()
  await click('[data-cover="none"]')
  await nextAttack()
  await click('[data-skip-step]')
  const defense = Number($('.defense-dice-pool') ? (text($('.defense-dice-pool')).match(/LANCER\s*(\d+)/) || [0, 0])[1] : 0)
  await setValue('defBlank', defense)
  await click('#nextAttack') // sans nextAttack() : il ferme les pop-up
  await app.settle(150)
  const popupEl = app.document.querySelector('.rule-popup'); assert.ok(popupEl, 'un pop-up de fin d’attaque s’ouvre'); const popup = text(popupEl)
  assert.match(popup, /À Bout Portant/, 'le pop-up de fin d’attaque annonce l’Esquive : ' + popup)
  assert.match(popup, /Suppression/, 'avec la Suppression dans le même pop-up : ' + popup)
  assert.match(text($('.attack-recap')), /À BOUT PORTANT/, 'le résumé de l’attaque annonce l’Esquive')
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Mots-clés d’autres unités : Exemplaire rappelé à l’étape Armes, Incognito signalé sur la tuile de la cible', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades: [] }, { name: 'General Veers', upgrades: [] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'K-2SO', upgrades: [] }] },
  })
  const { $, $$, text, click, pickUnit } = app
  await pickUnit('Stormtroopers')
  await click('#next')
  const tile = $$('.unit-tile').find((candidate) => /K-2SO/.test(text(candidate)))
  assert.ok(tile, 'K-2SO est proposé comme cible')
  assert.match(text(tile), /Incognito/, 'la tuile signale Incognito : ' + text(tile))
  await pickUnit('K-2SO')
  assert.match(text($('.cross-triggers')), /Exemplaire.*General Veers|Exemplaire.*Veers/i, 'Exemplaire (Veers) est rappelé à l’étape Armes : ' + text($('.cross-triggers')))
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

scenario('Surveillance X : les pions se posent sur un ennemi puis sont proposés à l’étape des relances', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Moff Gideon', upgrades: [] }, { name: 'Stormtroopers', upgrades: [] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [] }] },
  })
  const { $, $$, text, click, pickUnit, nextAttack } = app
  await pickUnit('Gideon')
  await click('[data-card-action="surveillance-x"]')
  await click('[data-kw-target]')
  await click('[data-kw-choice="0"]')
  await click('#restart')
  await pickUnit('Stormtroopers')
  await click('#next')
  await pickUnit('Rebel')
  await click('[data-range="2"]')
  await click('.weapon-toggle[data-key$=":1"]')
  await nextAttack()
  assert.match(text($('.resolve-center')), /SURVEILLANCE : 1 pion/, 'le pion Surveillance placé est proposé à l’étape des relances')
  await click('[data-surveillance-spend]')
  assert.doesNotMatch(text($('.resolve-center')), /SURVEILLANCE : \d pion/, 'le pion dépensé est retiré')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Cartes d’amélioration : ✖ (Pointe de Vitesse) supprimée pour toute la partie, ↱ (Réflexes de la Force) redressée au round suivant, aide contextuelle', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Darth Vader Dark Lord of the Sith', upgrades: [{ name: 'Burst of Speed' }, { name: 'Force Reflexes' }] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [] }] },
  })
  const { $, $$, text, click, pickUnit } = app
  await pickUnit('Vador')
  const burst = () => $('[data-unit-effect="burst-of-speed"]'), reflexes = () => $('[data-unit-effect="force-reflexes"]')
  assert.ok(burst() && !burst().disabled && reflexes() && !reflexes().disabled, 'les deux cartes sont proposées')
  assert.match(text(burst()), /supprime la carte/, 'Pointe de Vitesse annonce l’usage unique : ' + text(burst()))
  await click(burst()); await click($('[data-unit-effect="force-reflexes"]'))
  assert.ok(burst().disabled && reflexes().disabled, 'les deux sont appliquées')
  assert.match(text($('.card-lifecycle')), /Supprimée/, 'le panneau des cartes indique Pointe de Vitesse supprimée')
  assert.ok($$('.card-gone').length >= 1, 'le visuel de la carte supprimée est grisé')
  // Round suivant : la carte ↱ se redresse, la carte ✖ ne revient pas.
  app.window.localStorage.setItem('swl.game-tracker.v1', JSON.stringify({ round: 2, activatedUnitIds: [] }))
  await click('#restart')
  await pickUnit('Vador')
  assert.ok(burst().disabled, 'Pointe de Vitesse reste supprimée au round 2')
  assert.ok(!reflexes().disabled, 'Réflexes de la Force est redressée au round 2')
  // Correction d’une erreur : Restaurer.
  await click($$('[data-card-life^="gone:"]').find((button) => /restaurer/i.test(text(button))))
  assert.ok(!burst().disabled, 'Restaurer rend la carte de nouveau utilisable')
  // Aide contextuelle.
  assert.ok($('#helpFab') && !$('#helpFab').hidden, 'le bouton d’aide est visible')
  await click('#helpFab')
  assert.match(text($('.help-popup')), /AIDE · Fiche d’unité/, 'l’aide de la fiche s’ouvre')
  $$('dialog').forEach((dialog) => dialog.remove())
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

scenario('Aide contextuelle à l’écran de résolution : étape en cours et raison du blocage', async () => {
  const app = await openAssistant()
  const { $, text, click, pickUnit } = app
  await pickUnit('Stormtroopers')
  await click('#next')
  await pickUnit('Soldats Rebelles')
  await click('#helpFab')
  const help = text($('.help-popup'))
  assert.match(help, /AIDE · 1 · Armes & portée/, 'l’aide décrit l’étape 1 : ' + help)
  assert.match(help, /Pourquoi c’est bloqué/, 'et explique le blocage : ' + help)
  assert.match(help, /portée/i)
  app.$$('dialog').forEach((dialog) => dialog.remove())
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Électro-grappin de Sabine et Câbles ascensionnels : actions de carte appliquées (2 Immobilisation + 2 Suppression sur l’ennemi)', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Sabine Wren', upgrades: [{ name: "Sabine's Grapple Line" }, { name: 'Ascension Cables' }] }] },
    'swl.list.p2.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades: [] }] },
  })
  const { $, $$, text, click } = app
  app.window.localStorage.setItem('swl.assistant.player-side.v1', 'p1')
  await app.pickUnit('Sabine')
  assert.ok($('[data-card-action="carte-cables-ascensionnels"]'), 'Câbles ascensionnels est proposé')
  await click('[data-card-action="carte-grappin-de-sabine"]')
  await click('[data-kw-target]')
  await click('[data-kw-apply-action]')
  assert.ok($('[data-card-action="carte-grappin-de-sabine"]').disabled, 'le grappin est appliqué')
  const states = JSON.parse(app.window.localStorage.getItem('swl.assistant.unit-state.v1') || '{}')
  assert.ok(Object.values(states).some((state) => state.immobilize === 2 && state.suppression === 2), 'la cible ennemie a 2 Immobilisation et 2 Suppression : ' + JSON.stringify(states))
  await click('[data-kw-undo]')
  assert.ok(!$('[data-card-action="carte-grappin-de-sabine"]').disabled, 'ANNULER rend le grappin utilisable')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Chewbacca (amélioration) : dés d’attaque améliorés dans la réserve, rappel des dés de défense améliorés', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Wookiee Warriors Kashyyyk Resistance', upgrades: [{ name: 'Chewbacca' }] }] },
    'swl.list.p2.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades: [] }] },
  })
  const { $, $$, text, click, setValue, pickUnit } = app
  await pickUnit('Guerriers Wookies')
  await click('#next')
  await pickUnit('Stormtroopers')
  await click('[data-range="2"]')
  await click($$('.weapon-toggle').find((button) => /Chewbacca/.test(text(button.closest('.weapon-choice') || button))))
  assert.ok($('#chewbaccaUpgrades'), 'le nombre de dés améliorés est proposé : ' + text($('.resolve-center')).slice(0, 200))
  const upgraded = $('.dice-pool').innerHTML
  await setValue('chewbaccaUpgrades', 0)
  const plain = $('.dice-pool').innerHTML
  assert.notEqual(upgraded, plain, 'améliorer des dés change la composition de la réserve')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

scenario('Certification : portée « melee-2 » (corps-à-corps ET distance 1-2) expliquée, raccourcis de portée, utilisation de la carte (↱ / ✖)', async () => {
  const app = await openAssistant()
  const { $, $$, text, click } = app
  await click('#certification')
  await click($$('[data-cert-card]').find((button) => decodeURIComponent(button.dataset.certCard) === 'fleet troopers'))
  const page = text($('.cert-detail'))
  assert.match(page, /Lu par le moteur : corps-à-corps ET tir à distance de 1 à 2/, 'la portée melee-2 est expliquée : ' + page.slice(0, 300))
  assert.ok($$('[data-range-preset]').length >= 8, 'des raccourcis de portée sont proposés')
  await click($('[data-range-preset$=":1-3"]'))
  assert.match(text($('.cert-detail')), /Lu par le moteur : à distance, de 1 à 3/, 'le raccourci 1-3 est appliqué')
  await click('#backCertification')
  await click($$('[data-cert-card]').find((button) => decodeURIComponent(button.dataset.certCard) === 'burst of speed'))
  const use = $('select[data-full-field="cardUse"]')
  assert.ok(use, 'le champ « Utilisation de la carte » est proposé pour une amélioration')
  assert.equal(use.value, 'discard', 'Pointe de Vitesse est préremplie « supprimée » (✖)')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Strangulation de la Force : réactivable (Maître de la Force) et rappelée dans le résumé de l’attaque avec tous les effets appliqués', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Darth Vader Dark Lord of the Sith', upgrades: [{ name: 'Force Choke' }, { name: 'Force Reflexes' }] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [] }] },
  })
  const { $, $$, text, click, setValue, pickUnit, nextAttack } = app
  await pickUnit('Vador')
  await click('[data-force-choke]')
  const used = $('[data-unit-effect="force-choke-used"]')
  assert.ok(used && used.disabled, 'après usage, la carte reste visible et grisée (elle disparaissait)')
  assert.ok($('[data-kw-reset="force-choke"]'), 'un bouton « Réactiver » est proposé (Maître de la Force)')
  await click('[data-kw-reset="force-choke"]')
  assert.ok($('[data-force-choke]'), 'la carte redressée peut de nouveau être utilisée')
  await click('[data-force-choke]')
  await click('[data-unit-effect="force-reflexes"]')
  // Attaque complète jusqu'au résumé.
  await click('#next')
  await pickUnit('Soldats Rebelles')
  await click('[data-range="melee"]')
  await click($$('.weapon-toggle').find((button) => !button.disabled))
  await nextAttack()
  const total = Number((text($('.gate-status')).match(/réserve en contient (\d+)/) || [0, 1])[1]) || 1
  await setValue('rollHit', total)
  await nextAttack()
  await click('[data-cover="none"]')
  await nextAttack()
  if ($('[data-skip-step]')) await click('[data-skip-step]')
  else await click('.phase-confirm')
  const strip = text($$('.result-strip').find((element) => /À DÉFENDRE/.test(text(element))))
  const numbers = strip.match(/\d+/g).map(Number)
  await setValue('defBlank', numbers[numbers.length - 2] + numbers[numbers.length - 1])
  await click('#nextAttack')
  await app.settle(150)
  app.$$('dialog').forEach((dialog) => dialog.remove())
  const effects = text($('.recap-effects'))
  assert.match(effects, /STRANGULATION DE LA FORCE/, 'la Strangulation est rappelée dans le résumé : ' + effects)
  assert.match(effects, /subit 1 blessure/, 'avec la blessure à appliquer à la table : ' + effects)
  assert.match(effects, /RÉFLEXES DE LA FORCE|Réflexes/i, 'et les autres effets appliqués (Réflexes de la Force) : ' + effects)
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Vitesse : affichée sur la fiche d’unité (puce + mobilité) et obligatoire dans la certification des unités', async () => {
  const app = await openAssistant()
  const { $, $$, text, click, pickUnit } = app
  await pickUnit('Stormtroopers')
  assert.match(text($('.speed-chip')), /Vitesse\s*2/, 'la puce de vitesse est affichée : ' + text($('.speed-chip')))
  assert.match(text($('.movement-readout')), /VITESSE 2/, 'la mobilité annonce la vitesse : ' + text($('.movement-readout')))
  await click('#restart')
  // Unité non encore certifiée : la vitesse manquante est signalée.
  const tile = $$('.unit-tile').find((candidate) => !/Stormtroopers/.test(text(candidate)))
  if (tile) { await click(tile); const chip = $('.speed-chip'); if (chip) assert.ok(/Vitesse/.test(text(chip)), 'puce de vitesse présente') }
  await click('#certification')
  await click($$('[data-cert-card]').find((button) => decodeURIComponent(button.dataset.certCard) === 'stormtroopers'))
  const select = $('select[data-full-field="speed"]')
  assert.ok(select, 'la vitesse est un champ à choix (1, 2, 3) dans la certification de l’unité')
  assert.equal(select.value, '2', 'la vitesse déjà certifiée est reprise')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Certification : les armes ajoutées à la base apparaissent même si le brouillon local de la carte a été créé avant (Soldat avec Mortier DF-90)', async () => {
  // Brouillon local ancien : créé quand la carte n'avait encore aucune arme.
  const app = await openAssistant({ 'swl-dice-certification-batch-v1': { 'df 90 mortar trooper': { card: 'df 90 mortar trooper', weapons: [], defenseColor: 'rouge', defenseVerified: true, defenseQueued: false, unitStats: { woundsPerModel: 3, courage: 2, baseModels: 1, suppressionImmune: false }, unitStatsVerified: true, unitStatsQueued: false, addedModels: 0, addedModelWounds: 1, addedModelsVerified: false, addedModelsQueued: false } } })
  const { $, $$, text, click } = app
  await click('#certification')
  await click($$('[data-cert-card]').find((button) => decodeURIComponent(button.dataset.certCard) === 'df 90 mortar trooper'))
  const weapons = $$('.cert-weapon').map((article) => text(article))
  assert.equal(weapons.length, 2, 'les deux armes de la carte sont proposées : ' + weapons.join(' | ').slice(0, 300))
  assert.match(weapons.join(' '), /Mortier DF-90/, 'le Mortier DF-90 est listé')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Nouvelle partie : la synchro ne ressuscite ni suppressions, ni états, ni round de l’ancienne partie (numéro de partie)', async () => {
  const remoteOld = { gameEpoch: 1000, gameTracker: { round: 5 }, assistantUnitStates: { u1: { suppression: 3 } }, assistantUnitStateUpdatedAt: { u1: 900 }, assistantAttackHistory: [] }
  const gistResponse = (remote) => ({ ok: true, json: async () => ({ files: { 'legion-compagnon-lists.json': { content: JSON.stringify(remote) } } }) })
  // A. Nouvelle partie démarrée ICI (numéro 2000 > 1000) : on ne reprend rien de l'ancienne partie du gist.
  let app = await openAssistant({ 'swl.sync.token.v1': 'tok', 'swl.sync.gistId.v1': 'gist', 'swl.game-epoch.v1': 2000, 'swl.assistant.unit-state.v1': {}, 'swl.game-tracker.v1': { round: 1, activatedUnitIds: [] } })
  app.window.fetch = async () => gistResponse(remoteOld)
  assert.equal(await app.window.syncUnitStates('pull'), false, 'la relève est ignorée')
  assert.deepEqual(JSON.parse(app.window.localStorage.getItem('swl.assistant.unit-state.v1')), {}, 'aucune suppression ressuscitée')
  assert.equal(JSON.parse(app.window.localStorage.getItem('swl.game-tracker.v1')).round, 1, 'le round reste à 1 (il repassait à 5)')
  // B. L'envoi écrase l'ancienne partie du gist.
  let sent = null
  app.window.fetch = async (url, options = {}) => { if (options.method === 'PATCH') { sent = JSON.parse(JSON.parse(options.body).files['legion-compagnon-lists.json'].content); return { ok: true } } return gistResponse(remoteOld) }
  assert.equal(await app.window.syncUnitStates('push'), true)
  assert.deepEqual(sent.assistantUnitStates, {}, 'le gist reçoit la nouvelle partie, sans les anciennes suppressions')
  assert.equal(sent.gameEpoch, 2000)
  assert.equal(sent.gameTracker.round, 1)
  app.window.close()
  // C. Nouvelle partie démarrée AILLEURS (numéro 3000 > 1000) : on l'adopte et on abandonne l'état local.
  app = await openAssistant({ 'swl.sync.token.v1': 'tok', 'swl.sync.gistId.v1': 'gist', 'swl.game-epoch.v1': 1000, 'swl.assistant.unit-state.v1': { u1: { suppression: 2 } }, 'swl.game-tracker.v1': { round: 5, activatedUnitIds: [] } })
  app.window.fetch = async () => gistResponse({ gameEpoch: 3000, gameTracker: { round: 1, activatedUnitIds: [] }, assistantUnitStates: {}, assistantUnitStateUpdatedAt: {}, assistantAttackHistory: [] })
  assert.equal(await app.window.syncUnitStates('pull'), true)
  assert.deepEqual(JSON.parse(app.window.localStorage.getItem('swl.assistant.unit-state.v1')), {}, 'l’état local de l’ancienne partie est abandonné')
  assert.equal(JSON.parse(app.window.localStorage.getItem('swl.game-tracker.v1')).round, 1)
  assert.equal(app.window.localStorage.getItem('swl.game-epoch.v1'), '3000')
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Certification : liste groupée (mes listes, écarts, reste) et défilé rapide, un clic par carte conforme', async () => {
  const app = await openAssistant()
  const { $, $$, text, click } = app
  await click('#certification')
  const groups = $$('.cert-group').map((heading) => text(heading))
  assert.ok(groups.length >= 2 && /Dans vos listes/.test(groups[0]), 'la liste est groupée, vos listes d’abord : ' + groups.join(' | '))
  const start = $('#startReview')
  assert.ok(start && !start.disabled, 'le défilé rapide est proposé')
  await click(start)
  assert.ok($('.cert-review'), 'le défilé s’ouvre')
  assert.equal($$('[data-full-check]').length, 0, 'aucune case à cocher')
  const first = text($('.cert-review h2'))
  // On saute les cartes qui exigent une correction (vitesse à choisir, mots-clés à compléter) et on valide la première carte conforme.
  let validated = null
  for (let i = 0; i < 40 && !validated; i++) {
    const speed = $('[data-review-speed]')
    if (speed && !speed.value) { speed.value = '2'; speed.dispatchEvent(new app.window.Event('change', { bubbles: true })); await app.settle() }
    if ($('#reviewOk') && !$('#reviewOk').disabled) { validated = text($('.cert-review h2')); await click('#reviewOk') } else await click('#reviewSkip')
  }
  assert.ok(validated, 'au moins une carte se valide en un clic')
  assert.match(text($('.cert-review .kicker')), /DÉFILÉ RAPIDE/, 'on passe directement à la carte suivante')
  assert.notEqual(text($('.cert-review h2')), validated, 'la carte validée n’est plus proposée')
  await click('#reviewExit')
  assert.match(text($('.cert-batch-bar')), /[1-9]\d* correction/, 'la carte validée est dans le lot : ' + text($('.cert-batch-bar')))
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Certification : un mot-clé d’arme saisi seulement au niveau de la carte est rattaché à l’arme (une arme) ou à attribuer (plusieurs armes)', async () => {
  const fullCard = (keywords) => ({ cardType: 'upgrade', rank: '', unitType: '', speed: '', attackSurge: 'none', defenseSurge: 'none', keywords, noKeywords: false, ack: false, checks: { identity: false, visual: false, stats: false, weapons: false, conversions: false, keywords: false }, rulesVersion: 'AMG 2026-06-17', cardUse: 'passive' })
  const draft = (card, weapons, keywords) => ({ card, weapons, defenseColor: null, defenseVerified: false, defenseQueued: false, unitStats: { woundsPerModel: 1, courage: 1, baseModels: 1, suppressionImmune: false }, unitStatsVerified: false, unitStatsQueued: false, addedModels: 0, addedModelWounds: 1, addedModelsVerified: false, addedModelsQueued: false, fullCard: fullCard(keywords), fullCardQueued: false, weaponKwVersion: 2 })
  const app = await openAssistant({ 'swl-dice-certification-batch-v1': {
    'tl tt laser cannon': draft('tl tt laser cannon', [{ index: 0, name: 'Canon Laser de TL-TT', dice: [{ color: 'rouge', count: 1 }, { color: 'noir', count: 2 }], range: '2-4', verified: false, queued: false, keywords: [], kwEdited: true }], [{ keywordId: 'impact-x', value: 3 }, { keywordId: 'fixe' }]),
    'at rt': draft('at rt', [{ index: 0, name: 'Griffes Agrippantes', dice: [{ color: 'rouge', count: 3 }], range: 'melee', verified: false, queued: false, keywords: [], kwEdited: true }, { index: 1, name: 'Fusil Blaster A300', dice: [{ color: 'blanc', count: 2 }], range: '1-3', verified: false, queued: false, keywords: [], kwEdited: true }], [{ keywordId: 'impact-x', value: 1 }]),
  } })
  const { $, $$, text, click } = app
  await click('#certification')
  // Une seule arme : rattachement automatique à la certification.
  await click($$('[data-cert-card]').find((button) => decodeURIComponent(button.dataset.certCard) === 'tl tt laser cannon'))
  assert.match(text($('.cert-weapon-gap')), /rattachés automatiquement à « Canon Laser de TL-TT »/, 'annonce du rattachement automatique : ' + text($('.cert-weapon-gap')))
  await click('#certifyAndNext')
  const saved = JSON.parse(app.window.localStorage.getItem('swl-dice-certification-batch-v1'))
  assert.ok(saved['tl tt laser cannon'].weapons[0].keywords.some((tag) => tag.keywordId === 'impact-x'), 'Impact X est rattaché à l’arme dans ce qui sera envoyé')
  await click('#backCertification')
  // Plusieurs armes : blocage tant que le mot-clé n'est pas attribué.
  await click($$('[data-cert-card]').find((button) => decodeURIComponent(button.dataset.certCard) === 'at rt'))
  assert.ok($('.cert-weapon-gap[role="alert"]'), 'alerte : mot-clé d’arme à attribuer')
  assert.ok($('#certifyAndNext').disabled, 'certifier est impossible tant que le mot-clé n’est pas attribué')
  await click($('[data-kw-assign="impact-x|0"]'))
  assert.ok(!$('.cert-weapon-gap'), 'l’alerte disparaît une fois attribué')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Cartes d’amélioration : actions de fiche (Capitaine, Ravitaillement, Fusil Amban, Guidé par la Force, Tranquillité) avec ↱ / ✖ et coût en actions', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [
      { name: 'Stormtroopers', upgrades: [{ name: 'Stormtrooper Captain' }, { name: 'Additional Supplies' }, { name: 'Din Djarin Amban Rifle' }, { name: 'Force Guidance' }, { name: 'Serenity' }] },
      { name: 'Snowtroopers', upgrades: [] },
    ] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Sabine Wren', upgrades: [] }] },
  })
  const { $, $$, text, click } = app
  app.window.localStorage.setItem('swl.assistant.player-side.v1', 'p1')
  await app.pickUnit('Stormtroopers')
  const states = () => Object.values(JSON.parse(app.window.localStorage.getItem('swl.assistant.unit-state.v1') || '{}'))
  const button = (id) => $('[data-card-action="' + id + '"]')
  for (const id of ['stormtrooper-captain', 'additional-supplies', 'din-djarin-amban-rifle', 'force-guidance', 'serenity']) assert.ok(button(id), 'action de carte proposée : ' + id)
  assert.ok(button('additional-supplies').disabled, 'Ravitaillement : rien à redresser tant qu’aucune amélioration n’est inclinée')
  // ↱ Capitaine : la carte s'incline, le bouton se verrouille, l'effet est journalisé.
  await click(button('stormtrooper-captain'))
  assert.ok(button('stormtrooper-captain').disabled, 'le Capitaine est utilisé')
  assert.ok(states().some((state) => (state.exhaustedCards || []).includes('stormtrooper-captain')), 'la carte Capitaine est inclinée')
  assert.ok(states().some((state) => JSON.stringify(state.effectLog || []).includes('CAPITAINE STORMTROOPER')), 'l’effet est journalisé pour le résumé')
  // ✖ Ravitaillement : redresse la carte inclinée puis se supprime de la partie.
  assert.ok(!button('additional-supplies').disabled, 'Ravitaillement devient disponible')
  await click(button('additional-supplies'))
  await click($('[data-kw-choice]'))
  assert.ok(!states().some((state) => (state.exhaustedCards || []).includes('stormtrooper-captain')), 'le Capitaine est redressé')
  assert.ok(states().some((state) => (state.discardedCards || []).includes('additional-supplies')), 'Ravitaillement est supprimée de la partie')
  // →→ Fusil Amban : 2 actions consommées.
  await click(button('din-djarin-amban-rifle'))
  await click('[data-kw-target]')
  await click('[data-kw-apply-action]')
  assert.equal(states().flatMap((state) => state.activationActions || []).filter((item) => item === 'card:din-djarin-amban-rifle').length, 2, 'le Fusil Amban consomme 2 actions')
  // ↱» Guidé par la Force : 1 Adrénaline à l'allié choisi.
  await click(button('force-guidance'))
  await click('[data-kw-target]')
  await click('[data-kw-apply-action]')
  assert.ok(states().some((state) => state.surge === 1), 'l’allié gagne 1 Adrénaline')
  // ↱ ou ✖ Tranquillité : choix ✖ (dés rouges) -> carte supprimée.
  await click(button('serenity'))
  await click('[data-kw-target]')
  await click($$('[data-kw-choice]').find((choice) => /Supprimer/.test(text(choice))))
  assert.ok(states().some((state) => (state.discardedCards || []).includes('serenity')), 'Tranquillité est supprimée de la partie')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Cartes en combat : Générateur de Barrage ajoute 2 dés blancs (annulable), Évitement et Couvert, Barrière de Force, Stimulants d’Urgence', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'AT-ST', upgrades: [{ name: 'Barrage Generator' }, { name: 'AT-ST Mortar Launcher' }] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [{ name: 'Duck and Cover' }, { name: 'Emergency Stims' }] }, { name: 'Sabine Wren', upgrades: [{ name: 'Force Barrier' }] }] },
  })
  const { $, $$, text, click, setValue, pickUnit, nextAttack } = app
  const states = () => Object.values(JSON.parse(app.window.localStorage.getItem('swl.assistant.unit-state.v1') || '{}'))
  await pickUnit('TR-TT')
  await click('#next')
  await pickUnit('Soldats Rebelles')
  await click('[data-range="4"]')
  await click($$('.weapon-toggle').find((toggle) => /mortier|mortar/i.test(text(toggle.closest('.weapon-choice') || toggle))))
  assert.match(text($('.card-fx-panel')), /GÉNÉRATEUR DE BARRAGE/, 'la carte est proposée avec une arme à distance Fixe : ' + text($('.resolve-center')).slice(0, 200))
  const plain = $('.dice-pool').innerHTML
  await click('[data-card-fx^="barrage-generator|"]')
  assert.notEqual($('.dice-pool').innerHTML, plain, 'la réserve gagne 2 dés blancs')
  assert.ok(states().some((state) => (state.exhaustedCards || []).includes('barrage-generator')), 'la carte est inclinée')
  assert.match(text($('.card-fx-panel')), /2 dés blancs et Suppressif/, 'l’effet est annoncé')
  await click('[data-card-fx-undo^="barrage-generator|"]')
  assert.equal($('.dice-pool').innerHTML, plain, 'Annuler rétablit la réserve')
  assert.ok(!states().some((state) => (state.exhaustedCards || []).includes('barrage-generator')), 'Annuler redresse la carte')
  await click('[data-card-fx^="barrage-generator|"]')
  await click('#fixedArcConfirmed')
  await nextAttack()
  await setValue('rollHit', 2)
  await nextAttack()
  // Étape Couvert : Évitement et Couvert (défenseur).
  assert.match(text($('.card-fx-panel')), /ÉVITEMENT ET COUVERT/, 'Évitement et Couvert est proposé au couvert')
  await click('[data-card-fx^="duck-and-cover|"]')
  await click('[data-cover="none"]')
  await nextAttack()
  // Étape Modifications : Barrière de Force d'une unité alliée du défenseur.
  assert.match(text($('.card-fx-panel')), /BARRIÈRE DE FORCE/, 'Barrière de Force est proposée : ' + text($('.resolve-center')).slice(0, 200))
  await click('[data-card-fx^="force-barrier|"]')
  assert.ok(states().some((state) => (state.exhaustedCards || []).includes('force-barrier')), 'la Barrière de Force est inclinée')
  await click('[data-phase-confirm="mods"]')
  await nextAttack()
  assert.match(text($('.card-fx-panel')), /STIMULANTS D’URGENCE/, 'Stimulants d’Urgence est proposé à la défense : ' + app.gate() + ' | ' + text($('.resolve-center')).slice(0, 500))
  await click('[data-card-fx^="emergency-stims|"]')
  assert.ok(states().some((state) => state.cardWound >= 1), 'les blessures prévenues sont posées sur la carte')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Bonus permanents des cartes : courage (Gideon Hask) et vitesse (Pilote de TIE, Jetpack) dans les statistiques de l’unité', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Agent Kallus', upgrades: [{ name: 'Gideon Hask' }, { name: 'Imperial TIE Pilot' }] }, { name: 'Agent Kallus', upgrades: [] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Sabine Wren', upgrades: [] }] },
  })
  const evaluate = (code) => app.window.eval(code)
  const [boosted, plain] = [evaluate('certifiedUnitStats(entries[0]).courage'), evaluate('certifiedUnitStats(entries[1]).courage')]
  assert.equal(boosted, plain + 1, 'Gideon Hask augmente le courage de 1 (' + plain + ' → ' + boosted + ')')
  const readout = (index) => evaluate('mobilityReadout(entries[' + index + '],stateFor(entries[' + index + ']),0)')
  const speed = (index) => Number((readout(index).match(/VITESSE (\d+)/) || [])[1])
  assert.equal(speed(0), speed(1) + 1, 'Pilote de TIE Impérial augmente la vitesse maximale de 1 : ' + readout(0))
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Pions Viser : la dépense se saisit à l’étape des relances (comme les Adrénalines) et met le suivi à jour', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades: [] }] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [] }] },
  })
  const { $, text, click, setValue, pickUnit, nextAttack } = app
  app.window.eval("updateUnitState(entries[0],{aim:2})")
  const aimOf = () => app.window.eval('stateFor(entries[0]).aim')
  await pickUnit('Stormtroopers')
  await click('#next')
  await pickUnit('Soldats Rebelles')
  await click('[data-range="2"]')
  await click('.weapon-toggle[data-key$=":1"]')
  await nextAttack()
  assert.ok($('#aims'), 'le compteur de Viser dépensés est proposé : ' + text($('.resolve-center')).slice(0, 300))
  assert.match(text($('.token-card.aim')), /PIONS VISER DISPONIBLES : 2/, 'le stock est affiché')
  await setValue('aims', 1)
  assert.equal(Number($('#aims').value), 1, 'un Viser dépensé')
  await setValue('aims', 5)
  assert.ok(Number($('#aims').value) <= 2, 'la dépense est limitée au stock : ' + $('#aims').value)
  await setValue('aims', 1)
  await setValue('rollHit', 2)
  await nextAttack()
  await click('[data-cover="none"]')
  await nextAttack()
  await click('[data-skip-step]')
  const defense = Number($('.defense-dice-pool') ? (text($('.defense-dice-pool')).match(/LANCER\s*(\d+)/) || [0, 0])[1] : 0)
  await setValue('defBlank', defense)
  await click('#nextAttack')
  await app.settle(150)
  app.document.querySelectorAll('dialog, .rule-popup').forEach((element) => element.remove())
  assert.match(text($('.attack-recap')), /Viser/, 'le résumé mentionne les pions Viser dépensés')
  await click('#nextAttack')
  assert.equal(aimOf(), 1, 'un Viser est retiré du suivi de l’attaquant (2 → 1)')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Certification : relecture IA — badge par carte, filtre « à confirmer », défilé limité aux cartes corrigées ou illisibles', async () => {
  const app = await openAssistant()
  const { $, $$, text, click } = app
  await click('#certification')
  const review = app.window.SWL_REFERENCE.aiReview
  assert.ok(review && Object.keys(review).length > 200, 'la relecture IA est chargée : ' + Object.keys(review || {}).length)
  assert.ok(Object.values(review).some((item) => item.status === 'corrigee') && Object.values(review).some((item) => item.status === 'relue'), 'statuts corrigée et relue présents')
  assert.match(text($('.cert-list')), /IA : (corrigée, à confirmer|relue, aucun écart|illisible)/, 'chaque carte porte sa pastille de relecture IA')
  const filter = $('[data-cert-filter="ai"]')
  assert.ok(filter, 'filtre « À confirmer, relecture IA »')
  await click(filter)
  const flagged = $$('.cert-status-section.todo [data-cert-card]').map((button) => decodeURIComponent(button.dataset.certCard))
  const hqFlag = (card) => app.window.swlCertification.hqDiffs(card).length > 0
  assert.ok(flagged.length > 0 && flagged.every((card) => (review[card] && review[card].status !== 'relue') || hqFlag(card)), 'le filtre ne garde que les cartes corrigées, illisibles ou en écart Legion HQ : ' + flagged.slice(0, 5).join(', '))
  await click('#startReviewFlagged')
  assert.ok($('.cert-review'), 'le défilé des cartes à confirmer s’ouvre')
  assert.ok($('.cert-review .cert-ai.ai-flag'), 'la première carte du défilé est signalée (IA ou Legion HQ) : ' + text($('.cert-review')).slice(0, 200))
  const first = text($('.cert-review h2'))
  assert.ok(first, 'carte affichée : ' + first)
  assert.match(text($('.cert-review .kicker')), /DÉFILÉ RAPIDE · 1 \/ (\d+)/, 'compteur du défilé')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
scenario('Phases du round : Commandement (Agent de Confiance, Brouilleur Comms de l’adversaire), début d’activation, fin, Phase Finale', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test empire', faction: 'Empire', units: [
      { name: 'Stormtroopers', upgrades: [{ name: 'Trusted Agent' }, { name: 'Improvised Orders' }, { name: 'Endurance' }, { name: 'Vigilance' }] },
      { name: 'Snowtroopers', upgrades: [] },
    ] },
    'swl.list.p2.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Troopers', upgrades: [{ name: 'Comms Jammer' }, { name: 'Strict Orders' }] }] },
  })
  const { $, $$, text, click } = app
  app.window.localStorage.setItem('swl.assistant.player-side.v1', 'p1')
  const states = () => Object.values(JSON.parse(app.window.localStorage.getItem('swl.assistant.unit-state.v1') || '{}'))
  await click('#roundPhases')
  assert.ok($('.round-phases'), 'l’écran des phases s’ouvre')
  assert.match(text($('.rp-title')), /PHASE DE COMMANDEMENT/, 'première phase : Commandement')
  assert.match(text($('.rp-cross')), /BROUILLEUR COMMS/, 'le Brouilleur Comms de l’adversaire est signalé en tête de phase : ' + text($('.round-phases')).slice(0, 300))
  assert.ok($('[data-card-action="trusted-agent"]'), 'Agent de Confiance : bouton à la Phase de Commandement')
  await click('[data-card-action="trusted-agent"]')
  await click('.rp-unit [data-kw-target]')
  await click('.rp-unit [data-kw-apply-action]')
  assert.ok(states().some((state) => (state.discardedCards || []).includes('trusted-agent')), 'la carte ✖ est supprimée de la partie')
  assert.ok($('[data-card-action="trusted-agent"]').disabled, 'le bouton est verrouillé après usage')
  await click('[data-rp-tab="activation"]')
  assert.ok($('[data-card-action="improvised-orders"]'), 'Ordres Improvisés au début de la Phase d’Activation')
  assert.match(text($('.round-phases')), /ORDRES STRICTS/, 'Ordres Stricts (autre unité) signalé')
  await click('[data-rp-tab="fin"]')
  assert.ok($('[data-card-action="endurance"]'), 'Endurance en fin de Phase d’Activation')
  await click('[data-rp-tab="finale"]')
  assert.ok($('[data-card-action="vigilance"]'), 'Vigilance à la Phase Finale')
  await click('#closeRoundPhases')
  assert.ok(!$('.round-phases'), 'retour à l’assistant')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

scenario('Certification : la vitesse manquante est préremplie d’après Legion HQ (à confirmer) et les écarts Legion HQ sont signalés', async () => {
  const app = await openAssistant()
  const { $, $$, text, click } = app
  await click('#certification')
  const reference = app.window.SWL_REFERENCE
  assert.ok(Object.keys(reference.legionhq || {}).length > 100, 'la référence Legion HQ est chargée')
  // une unité sans vitesse certifiée mais connue de Legion HQ
  const key = Object.keys(reference.legionhq).find((card) => reference.legionhq[card].kind === 'unit' && reference.legionhq[card].speed && !reference.weapons[card]?.fullCardCertification?.speed && !app.window.swlCertification.hqDiffs(card).length)
  assert.ok(key, 'une unité sans vitesse est disponible pour le test')
  await click($$('.cert-status-section.todo [data-cert-card]').find((button) => decodeURIComponent(button.dataset.certCard) === key))
  const speed = $('select[data-full-field="speed"]')
  assert.ok(speed, 'le champ vitesse est présent')
  assert.equal(speed.value, String(reference.legionhq[key].speed), 'la vitesse est préremplie : ' + speed.value)
  const withKeywords = Object.keys(reference.legionhq).filter((card) => app.window.swlCertification.hqDiffs(card).some((line) => /^mots-clés : /.test(line)))
  assert.ok(withKeywords.length > 5, 'les mots-clés sont aussi comparés à Legion HQ : ' + withKeywords.length + ' cartes en écart')
  assert.ok(!app.window.swlCertification.hqDiffs('kallus the operative').some((line) => /Chef/.test(line)), 'Chef de l’Agent Kallus (amélioration) corrigé')
  assert.match(text($('.cert-detail')), /préremplie d’après Legion HQ/, 'la provenance est annoncée')
  assert.match(text($('.cert-detail')), /Legion HQ \(référence\) : concordant/, 'Legion HQ concordant')
  await click('#backCertification')
  // une carte en écart : signalée dans la liste et dans le panneau
  const diff = Object.keys(reference.legionhq).find((card) => app.window.swlCertification.hqDiffs(card).length > 0 && $$('.cert-status-section.todo [data-cert-card]').some((button) => decodeURIComponent(button.dataset.certCard) === card))
  assert.ok(diff, 'une carte en écart Legion HQ est listée')
  // correction en un clic : une carte dont l'écart porte sur une valeur numérique ou un dé
  const fixable = Object.keys(reference.legionhq).find((card) => $$('.cert-status-section.todo [data-cert-card]').some((button) => decodeURIComponent(button.dataset.certCard) === card) && app.window.swlCertification.hqDiffItems(card).some((item) => item.apply && ['stat', 'defense', 'weapon', 'surge'].includes(item.apply.t)))
  assert.ok(fixable, 'une carte corrigeable en un clic existe')
  const before = app.window.swlCertification.hqDiffItems(fixable).length
  await click($$('.cert-status-section.todo [data-cert-card]').find((button) => decodeURIComponent(button.dataset.certCard) === fixable))
  const apply = $('[data-hq-apply]')
  assert.ok(apply, 'bouton « Utiliser la valeur Legion HQ » : ' + text($('.cert-detail')).slice(0, 200))
  await click(apply)
  assert.ok(app.window.swlCertification.hqDiffItems(fixable).length < before, 'l’écart disparaît une fois la valeur Legion HQ appliquée au brouillon')
  await click('#backCertification')
  assert.match(text($$('.cert-status-section.todo [data-cert-card]').find((button) => decodeURIComponent(button.dataset.certCard) === diff)), /Legion HQ : \d+ écart/, 'pastille d’écart dans la liste')
  await click($$('.cert-status-section.todo [data-cert-card]').find((button) => decodeURIComponent(button.dataset.certCard) === diff))
  assert.match(text($('.cert-detail')), /écart\(s\) avec l’appli/, 'panneau des écarts dans l’éditeur')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

scenario('Erratum FR 17/06/2026 : cartes retirées signalées et non certifiables, cartes mises à jour (DH-447, Charge à Protons, DF-90, Tireur Embusqué Rebelle)', async () => {
  const app = await openAssistant({
    'swl.list.p1.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Sabine Wren', upgrades: [{ name: "Sabine's Grapple Line" }, { name: 'Rebel Ambusher' }] }] },
    'swl.list.p2.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades: [] }] },
  })
  const { $, $$, text, click } = app
  app.window.localStorage.setItem('swl.assistant.player-side.v1', 'p1')
  const reference = app.window.SWL_REFERENCE
  assert.ok(reference.removedCards['sabine s grapple line'] && reference.removedCards['mandalorian resistance'], 'les cartes retirées sont chargées')
  await app.pickUnit('Sabine')
  assert.match(text($('.removed-card-banner')), /Électro-grappin/, 'bandeau « carte retirée du jeu » sur la fiche : ' + text($('.overview')).slice(0, 200))
  // mises à jour de l'erratum
  const weapon = (card, name) => reference.weapons[card].weapons.find((item) => item.name === name)
  assert.equal(JSON.stringify(weapon('dh 447 sniper', 'Fusil de Sniper DH-447').dice), JSON.stringify([{ color: 'blanc', count: 2 }, { color: 'noir', count: 1 }]), 'DH-447 : 2 blancs + 1 noir')
  assert.equal(weapon('dh 447 sniper', 'Fusil de Sniper DH-447').range, '2-5', 'DH-447 : portée 2-5')
  assert.equal(weapon('proton charge saboteur', 'Charge à Protons').keywordValues['impact-x'], 6, 'Charge à Protons : Impact 6')
  assert.equal(JSON.stringify(weapon('df 90 mortar trooper', 'Mortier DF-90').dice), JSON.stringify([{ color: 'noir', count: 2 }]), 'DF-90 : 2 dés noirs')
  assert.equal(reference.weapons['rebel ambusher'].addedModels, 1, 'Tireur Embusqué Rebelle : +1 figurine')
  assert.equal(reference.weapons['rebel commandos strike team'].defenseColor, 'blanc', 'Commandos (Groupe de Combat) : défense blanche')
  // la certification ne propose plus les cartes retirées
  await click('#certification')
  const listed = $$('[data-cert-card]').map((button) => decodeURIComponent(button.dataset.certCard))
  assert.ok(!listed.some((card) => reference.removedCards[card]), 'aucune carte retirée dans la certification')
  assert.equal(app.errors.length, 0, app.errors.join(' | '))
  app.window.close()
})

/* ------------------------------------------------------------------ */
async function run() {
  for (const { name, run: body } of scenarios) {
    try {
      await body()
      passed += 1
      console.log(`  ✓ ${name}`)
    } catch (error) {
      console.error(`  ✗ ${name}`)
      throw error
    }
  }
  console.log(`Assistant parcours : ${passed} scénario(s) rejoué(s) dans jsdom OK`)
}
run().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1) })
