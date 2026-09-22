/* Harnais partagé de test de l'Assistant (extrait de test-assistant-parcours.mjs le 22/09/2026) :
   le vrai code (app.js et ses dépendances) est exécuté dans jsdom, avec un stockage local
   pré-rempli (listes, états d'unités), pour rejouer ce qu'un joueur fait à l'écran.
   Utilisé par test-assistant-parcours.mjs et par audit-list-playthrough.mjs. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM, ResourceLoader, VirtualConsole } from 'jsdom'

const here = path.dirname(fileURLToPath(import.meta.url))
const assistantDir = path.resolve(here, '../../public/assistant')
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
export async function openAssistant(storage = {}) {
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
      for (const [key, value] of Object.entries({ 'swl.cert-filter.v1': 'all', ...storage })) window.localStorage.setItem(key, JSON.stringify(value))
      // Ce que jsdom ne fournit pas et que l'application utilise.
      window.structuredClone ||= structuredClone
      window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
      window.Element.prototype.scrollIntoView = function () {}
      window.scrollTo = () => {}
      window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
      window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
      // Aperçu d'une photo choisie dans le formulaire « nouvelle carte » de la certification (input file).
      window.URL.createObjectURL ||= () => 'blob:jsdom-fake-url'
      window.URL.revokeObjectURL ||= () => {}
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
