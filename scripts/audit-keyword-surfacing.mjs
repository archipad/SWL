/* Audit « chaque mot-clé remonte au bon endroit » (20/09/2026).
   Pour chaque mot-clé du glossaire officiel, on charge le VRAI Assistant dans jsdom avec une carte qui porte ce mot-clé,
   on rejoue un parcours (fiche d'unité, puis attaque complète si c'est un mot-clé de combat) et on relève À QUELLE ÉTAPE
   le nom du mot-clé est affiché. Un mot-clé qui n'apparaît nulle part là où il agit est un oubli potentiel.
   Sortie : docs/audit/mots-cles-affichage.md (matrice) ; code de sortie 1 si un mot-clé attendu n'apparaît pas. */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { JSDOM, ResourceLoader, VirtualConsole } from 'jsdom'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const assistantDir = path.join(root, 'public/assistant')
const baseUrl = 'http://localhost/SWL/assistant/'
const sandbox = { window: {} }
vm.createContext(sandbox)
vm.runInContext(fs.readFileSync(path.join(assistantDir, 'reference-data.js'), 'utf8'), sandbox)
const ref = sandbox.window.SWL_REFERENCE
const appSource = fs.readFileSync(path.join(assistantDir, 'app.js'), 'utf8')
const rankCatalog = vm.runInNewContext('(' + appSource.match(/const rankCatalog=(\{[\s\S]*?\});/)[1] + ')')
const unitKeys = new Set(Object.values(rankCatalog).flat())
const isUnit = (key) => unitKeys.has(key)

class LocalScriptsOnly extends ResourceLoader {
  fetch(url) {
    if (url.startsWith(baseUrl) && new URL(url).pathname.endsWith('.js')) return Promise.resolve(fs.readFileSync(path.join(assistantDir, path.basename(new URL(url).pathname))))
    return Promise.resolve(Buffer.from(''))
  }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function open(p1, p2) {
  const errors = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (error) => errors.push(String(error.message || error)))
  const dom = new JSDOM(fs.readFileSync(path.join(assistantDir, 'index.html'), 'utf8'), {
    url: `${baseUrl}index.html`, runScripts: 'dangerously', resources: new LocalScriptsOnly(), pretendToBeVisual: true, virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem('swl.list.p1.v1', JSON.stringify({ listName: 'Audit A', faction: 'Empire', units: p1 }))
      window.localStorage.setItem('swl.list.p2.v1', JSON.stringify({ listName: 'Audit B', faction: 'Rebelles', units: p2 }))
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
  await sleep(60)
  const { window } = dom, { document } = window
  const $ = (selector) => document.querySelector(selector)
  const $$ = (selector) => [...document.querySelectorAll(selector)]
  const text = (element) => (element?.textContent || '').replace(/\s+/g, ' ').trim()
  const settle = (ms = 40) => sleep(ms)
  const click = async (target) => { const element = typeof target === 'string' ? $(target) : target; if (!element) return false; element.click(); await settle(); return true }
  const setValue = async (id, value) => {
    const input = document.getElementById(id); if (!input) return false
    input.value = String(value)
    input.dispatchEvent(new window.Event('input', { bubbles: true })); input.dispatchEvent(new window.Event('change', { bubbles: true }))
    await settle(); return true
  }
  const pickTile = async () => { const tile = $$('.unit-tile')[0]; if (!tile) return false; tile.click(); await settle(); $$('dialog').forEach((d) => d.remove()); await settle(); return true }
  return { dom, window, document, errors, $, $$, text, settle, click, setValue, pickTile }
}

const norm = (value) => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').toLowerCase().replace(/\s+/g, ' ').trim()
// « Perforant X » → « perforant » ; « Conseils : Type d'Unité » → « conseils ».
const shortName = (keyword) => norm(keyword.name.split(':')[0].replace(/\s+X\b.*$/i, ''))

/** Rejoue l'attaque et renvoie le texte affiché à chaque étape (S1 armes … S6 résumé, POPUP). */
async function attackFlow(app, weaponHint) {
  const seen = {}
  const add = (label, text) => { seen[label] = (seen[label] || '') + ' ' + text }
  let step = 1, stuck = ''
  for (let i = 0; i < 70; i++) {
    const label = 'S' + Math.min(step, 6)
    const dialogsText = app.text(app.$('dialog'))
    add(label, app.text(app.$('.resolve-center') || app.$('#app')))
    if (dialogsText) add('POPUP', app.$$('dialog').map((d) => app.text(d)).join(' '))
    if (!app.$('.resolve-center')) { stuck = 'pas d’écran de résolution'; break }
    const gate = app.text(app.$('.gate-status')); if (process.env.TRACE) console.log('  it', i, 'step', step, gate.slice(0, 110))
    if (/portée/i.test(gate) && app.$('[data-range]')) {
      const range = String(weaponHint?.range || '2'), wanted = /melee|corps/i.test(range) ? 'melee' : (range.match(/\d+/) || ['2'])[0]
      const choice = app.$(`[data-range="${wanted}"]`) || app.$$('[data-range]')[0]
      await app.click(choice); continue
    }
    if (/arc de tir/.test(gate) && app.$('#fixedArcConfirmed')) { const box = app.$('#fixedArcConfirmed'); if (!box.checked) { await app.click(box); continue } }
    if (/Sélectionnez au moins une arme/i.test(gate)) {
      const toggles = app.$$('.weapon-toggle').filter((button) => !button.disabled)
      const preferred = toggles.find((button) => weaponHint?.name && norm(app.text(button.closest('.weapon-choice') || button)).includes(norm(weaponHint.name))) || toggles[0]
      if (!preferred) { stuck = 'aucune arme sélectionnable'; break }
      await app.click(preferred); continue
    }
    if (/Répondez Oui ou Non/.test(gate)) { const pending = app.$$('[data-condition][data-value="true"]').find((button) => !button.classList.contains('on') && !app.$(`[data-condition="${button.dataset.condition}"].on`)); if (pending) { await app.click(pending); continue } }
    const cumbersome = app.$('#cumbersomeConfirmed'); if (cumbersome && !cumbersome.checked) { await app.click(cumbersome); continue }
    if (/couvert/i.test(gate)) { await app.click('[data-cover="none"]'); continue }
    if (app.$('#rollHit') && /BLOQUÉ/.test(gate) && step === 2) {
      const total = Number((gate.match(/réserve en contient (\d+)/) || [0, 0])[1]) || 1
      await app.setValue('rollHit', total); continue
    }
    if (app.$('#defBlank') && /BLOQUÉ/.test(gate)) {
      const strip = app.text(app.$$('.result-strip').find((element) => /À DÉFENDRE/.test(app.text(element))))
      const numbers = (strip.match(/\d+/g) || []).map(Number)
      const total = numbers.length >= 2 ? numbers[numbers.length - 2] + numbers[numbers.length - 1] : 0
      await app.setValue('defBlank', total); continue
    }
    if (app.$('[data-skip-step]')) { await app.click('[data-skip-step]'); step++; continue }
    if (app.$('.phase-confirm') && /BLOQUÉ/.test(gate)) { await app.click('.phase-confirm'); continue }
    if (/BLOQUÉ/.test(gate)) { stuck = 'bloqué : ' + gate.slice(0, 120); break }
    if (step >= 6) break
    await app.click('#nextAttack'); step++
    const popups = app.$$('dialog').map((d) => app.text(d)).join(' ')
    if (popups) add('POPUP', popups)
    if (step === 6) { await app.settle(80); add('S6', app.text(app.$('.resolve-center') || app.$('#app'))); const late = app.$$('dialog').map((d) => app.text(d)).join(' '); if (late) add('POPUP', late); break }
    app.$$('dialog').forEach((d) => d.remove())
  }
  return { seen, stuck }
}

const STANDARD_UNIT = 'stormtroopers'
const STANDARD_FOE = 'rebel troopers'
const cardsWithKeyword = (id) => {
  const holders = []
  for (const [card, list] of Object.entries(ref.tags)) if (list.some((tag) => tag.keywordId === id)) holders.push({ card, where: 'carte' })
  for (const [card, profile] of Object.entries(ref.weapons)) {
    const weapon = (profile.weapons || []).find((item) => (item.keywordIds || []).includes(id))
    if (weapon) holders.push({ card, where: 'arme', weapon: weapon.name, range: String(weapon.range || '') })
  }
  return holders
}
const asEntry = (card) => isUnit(card) ? { units: [{ name: card, upgrades: [] }] } : { units: [{ name: STANDARD_UNIT, upgrades: [{ name: card }] }] }

const rows = []
const CHECK_SAMPLE = ['perforant-x', 'armure-x', 'souffle', 'immobiliser-x', 'deflagration', 'letal-x', 'ion-x', 'suppressif', 'longue-distance', 'exemplaire', 'surveillance-x', 'autonome', 'arsenal-x', 'discret']
const checkMode = process.argv.includes('--check')
const only = checkMode ? CHECK_SAMPLE : process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
for (const keyword of ref.keywords) {
  if (only.length && !only.includes(keyword.id)) continue
  const combat = [keyword.impact, ...(keyword.displaySections || [])].some((section) => section === 'attaque' || section === 'défense')
  const defenseSide = keyword.impact === 'défense'
  const holders = cardsWithKeyword(keyword.id)
  const row = { keyword, combat, defenseSide, holders: holders.length, sheet: null, flow: null, stuck: '', card: '' }
  const name = shortName(keyword)
  // Le porteur utilisé : de préférence une carte Unité (rend la fiche complète), sinon une amélioration.
  const holder = (keyword.impact === 'attaque' ? holders.find((item) => item.where === 'arme') : null) || holders.find((item) => isUnit(item.card) && item.where === 'carte') || holders.find((item) => item.where === 'carte') || holders[0]
  if (holder) {
    row.card = holder.card
    try {
      const mine = asEntry(holder.card).units
      const app = await open(defenseSide ? [{ name: STANDARD_UNIT, upgrades: [] }] : mine, defenseSide ? mine : [{ name: STANDARD_FOE, upgrades: [] }])
      // 1. Fiche d'unité du porteur
      const sheetApp = await open(mine, [{ name: STANDARD_FOE, upgrades: [] }])
      await sheetApp.pickTile()
      row.sheet = norm(sheetApp.text(sheetApp.$('#app'))).includes(name)
      if (process.env.DUMP === 'SHEET') console.log('--- sheet', keyword.id, holder.card, sheetApp.text(sheetApp.$('#app')).slice(0, 1500))
      sheetApp.window.close()
      if (combat) {
        // 2. Attaque complète (le porteur attaque ou défend selon le mot-clé)
        await app.pickTile(); await app.click('#next'); await app.pickTile()
        const flow = await attackFlow(app, holder.where === 'arme' ? { name: holder.weapon, range: holder.range } : null)
        row.flow = Object.fromEntries(Object.entries(flow.seen).map(([label, value]) => [label, norm(value).includes(name)]))
        row.stuck = flow.stuck
        if (process.env.DUMP) for (const label of process.env.DUMP.split(',')) console.log('---', keyword.id, label, ':', (flow.seen[label] || '').slice(0, 1500))
      }
      app.window.close()
    } catch (error) { row.stuck = 'erreur : ' + error.message }
  }
  rows.push(row)
  process.stdout.write(`${keyword.id}: fiche=${row.sheet} flux=${row.flow ? Object.entries(row.flow).filter(([, ok]) => ok).map(([label]) => label).join(',') || '—' : 'n/a'}${row.stuck ? ' ⚠ ' + row.stuck : ''}\n`)
}

const lines = ['# Où chaque mot-clé s’affiche dans l’Assistant', '',
  'Généré par `node scripts/audit-keyword-surfacing.mjs` : pour chaque mot-clé du glossaire, une carte qui le porte est chargée dans le vrai Assistant (jsdom), on relève les écrans où son nom apparaît.',
  'S1 = armes & portée, S2 = jet & relances, S3 = couvert & esquive, S4 = modifications (Impact/Armure…), S5 = défense, S6 = résumé, POPUP = pop-up de fin d’attaque.', '',
  '| Mot-clé | Combat | Carte testée | Fiche d’unité | Écrans d’attaque où il apparaît | Remarque |', '|---|---|---|---|---|---|']
for (const row of rows) {
  const flow = row.flow ? Object.entries(row.flow).filter(([, ok]) => ok).map(([label]) => label).join(', ') || '**aucun**' : '—'
  lines.push(`| ${row.keyword.name} | ${row.combat ? (row.defenseSide ? 'défense' : 'attaque') : ''} | ${row.card || '(aucune carte)'} | ${row.sheet === null ? '—' : row.sheet ? 'oui' : '**non**'} | ${flow} | ${row.stuck} |`)
}
if (checkMode) {
  // Garde-fou du build : un échantillon représentatif ; chaque mot-clé doit apparaître là où il agit.
  const bad = rows.filter((row) => row.holders && (row.combat ? !(row.flow && Object.values(row.flow).some(Boolean)) : row.sheet === false))
  if (bad.length) { console.error('Mots-clés qui ne remontent plus dans l’Assistant : ' + bad.map((row) => row.keyword.id).join(', ')); process.exit(1) }
  console.log(`Remontée des mots-clés OK : ${rows.length} mots-clés de l’échantillon apparaissent à l’écran.`)
} else if (!only.length) {
  // Le tableau complet n'est écrit que pour un passage sur tous les mots-clés (jamais pour un échantillon).
  fs.mkdirSync(path.join(root, 'docs/audit'), { recursive: true })
  fs.writeFileSync(path.join(root, 'docs/audit/mots-cles-affichage.md'), lines.join('\n') + '\n')
}
