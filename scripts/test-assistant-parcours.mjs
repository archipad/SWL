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
  assert.ok(total > 250, 'toutes les cartes sans certification complète comptent : ' + total)
  assert.ok($$('[data-cert-filter]').length === 4, 'filtres : toutes, mes listes, écarts, jamais certifiées')
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
  assert.ok($('#queueFullCard').disabled, 'certifier est impossible sans relire les écarts')
  for (const box of $$('[data-full-check]')) { box.checked = true; box.dispatchEvent(new app.window.Event('change', { bubbles: true })); await app.settle() }
  assert.ok($('#queueFullCard').disabled, 'les six contrôles ne suffisent pas : la lecture des écarts est obligatoire')
  const ack = $('[data-full-ack]')
  assert.ok(ack, 'case de lecture des écarts')
  ack.checked = true
  ack.dispatchEvent(new app.window.Event('change', { bubbles: true }))
  await app.settle()
  assert.ok(!$('#queueFullCard').disabled, 'certification possible après relecture')
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
