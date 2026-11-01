/* Fiches d'unité (public/fiches/) : la page réelle, exécutée dans jsdom avec les listes de scripts/data/real-lists,
   doit afficher chaque unité, ses améliorations et tous ses mots-clés, sans dépendre du moteur de l'Assistant. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM, ResourceLoader, VirtualConsole } from 'jsdom'

const here = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(here, '../public')
const baseUrl = 'http://localhost/SWL/'

class PublicScriptsOnly extends ResourceLoader {
  fetch(url) {
    const pathname = new URL(url).pathname
    if (url.startsWith(baseUrl) && pathname.endsWith('.js')) return Promise.resolve(fs.readFileSync(path.join(publicDir, pathname.replace('/SWL/', ''))))
    return Promise.resolve(Buffer.from(''))
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Forme stockée par la page Listes (parseArmyListJson), réduite à ce que lit la page.
function storedList(file) {
  const list = JSON.parse(fs.readFileSync(path.resolve(here, 'data/real-lists', file), 'utf8'))
  const faction = list.faction || (/empire/i.test(file) ? 'Empire Galactique' : 'Alliance Rebelle')
  return { listName: list.listname, faction, units: list.units.map((unit) => ({ name: unit.name, section: 'Unités', upgrades: (unit.upgrades || []).filter(Boolean).map((name) => ({ name })) })) }
}

async function openFiches(storage) {
  const errors = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (error) => errors.push(String(error.message || error)))
  const dom = new JSDOM(fs.readFileSync(path.join(publicDir, 'fiches/index.html'), 'utf8'), {
    url: `${baseUrl}fiches/index.html`,
    runScripts: 'dangerously',
    resources: new PublicScriptsOnly(),
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, JSON.stringify(value))
      window.scrollTo = () => {}
    },
  })
  for (let attempt = 0; attempt < 200 && !dom.window.document.querySelector('.unit-tile, .empty-selection'); attempt += 1) await sleep(25)
  return { dom, window: dom.window, document: dom.window.document, errors }
}

const empire = storedList('empire-moff-gideon.json')
const rebels = storedList('rebelles-simon-3.json')
const { window, document, errors } = await openFiches({ 'swl.list.p1.v1': empire, 'swl.list.p2.v1': rebels })
assert.deepEqual(errors, [], 'la page se charge sans erreur')

// Indépendance : aucun script du moteur ni de l'Assistant applicatif.
const scripts = [...document.scripts].map((script) => script.getAttribute('src')).filter(Boolean).join(' ')
assert.doesNotMatch(scripts, /app\.js|attack-engine|certification/, 'la page ne charge pas le moteur')
assert.equal(window.eval('typeof SWL_ATTACK_ENGINE'), 'undefined')

// Les tables recopiées d'app.js ne doivent pas diverger de l'original.
const app = fs.readFileSync(path.join(publicDir, 'assistant/app.js'), 'utf8')
const fiches = fs.readFileSync(path.join(publicDir, 'fiches/fiches.js'), 'utf8')
for (const pattern of [/const specialImages=\{.*?\};/, /^const rankCatalog=.*?\};/m]) {
  assert.equal(fiches.match(pattern)?.[0], app.match(pattern)?.[0], `table recopiée d'app.js : ${pattern}`)
}

// Mêmes feuilles que l'Assistant, dans le même ordre, sans quoi le sélecteur ne serait plus identique.
const sheets = (file) => [...fs.readFileSync(path.join(publicDir, file), 'utf8').matchAll(/href="\.?\.?\/(?:assistant\/)?([\w-]+\.css)/g)].map((match) => match[1])
assert.deepEqual(sheets('fiches/index.html').filter((sheet) => sheet !== 'fiches.css'), sheets('assistant/index.html'))

// Classement : chaque mot-clé tombe dans au moins une section connue, et « Déplacement » regroupe bien ces règles.
const { keywords, keywordTiming } = window.SWL_REFERENCE
// JSON : les tableaux créés dans jsdom viennent d'un autre royaume et ne passent pas deepEqual.
const sectionsOf = (id) => JSON.parse(window.eval(`JSON.stringify(keywordSections(keywords.find(item=>item.id===${JSON.stringify(id)})))`))
const known = new Set(window.eval('KEYWORD_SECTIONS.map(section=>section.id)'))
for (const keyword of keywords) {
  const sections = sectionsOf(keyword.id)
  assert.ok(sections.length && sections.every((section) => known.has(section)), `sections de ${keyword.id} : ${sections}`)
}
for (const id of window.eval('[...MOVEMENT_KEYWORDS]')) assert.ok(keywords.some((keyword) => keyword.id === id), `mot-clé de déplacement inconnu : ${id}`)
for (const [id, [phase]] of Object.entries(keywordTiming.keywords)) if (phase === 'deplacement') assert.ok(sectionsOf(id).includes('deplacement'), id)
assert.deepEqual(sectionsOf('implacable').sort(), ['attaque', 'deplacement'])
assert.deepEqual(sectionsOf('impact-x'), ['attaque'])
assert.deepEqual(sectionsOf('saut-x'), ['deplacement'])
assert.deepEqual(sectionsOf('position-preparee'), ['autre'])

// Chaque unité des deux armées : carte, améliorations, et tous les mots-clés portés par ses cartes.
let opened = 0
for (const army of ['p1', 'p2']) {
  const tab = document.querySelector(`.army-switch [data-army="${army}"]`)
  if (!tab.classList.contains('active')) tab.click()
  const list = army === 'p1' ? empire : rebels
  assert.equal(document.querySelectorAll('.unit-tile').length, list.units.length, `tuiles de ${army}`)
  const count = document.querySelectorAll('.unit-tile').length
  for (let index = 0; index < count; index += 1) {
    const tile = document.querySelectorAll('.unit-tile')[index]
    const entry = window.eval(`entries.find(item=>item.id===${JSON.stringify(tile.dataset.id)})`)
    tile.click()
    assert.ok(document.querySelector('.fiche'), `fiche ouverte pour ${tile.dataset.id}`)
    assert.equal(document.querySelectorAll('.fiche-card-unit').length, 1)
    assert.equal(document.querySelectorAll('.fiche-card-upgrade').length, entry.unit.upgrades.length, `améliorations de ${entry.unit.name}`)
    assert.deepEqual([...document.querySelectorAll('[data-kw-section] h3')].map((title) => title.lastChild.previousSibling.textContent), ['Attaque', 'Défense', 'Déplacement', 'Autre'])
    const expected = window.eval(`unitKeywordRows(entries.find(item=>item.id===${JSON.stringify(tile.dataset.id)})).map(row=>keywordLabel(row.def,row.tag))`)
    const shown = new Set([...document.querySelectorAll('.fiche-kw h4')].map((title) => title.textContent))
    for (const label of expected) assert.ok(shown.has(label), `${entry.unit.name} : ${label} absent de la fiche`)
    assert.doesNotMatch(document.querySelector('.fiche-keywords').textContent, /undefined|\[TOUCHE\]|\[CRITIQUE\]|\[BLOC\]/)
    assert.equal(document.querySelector('.fiche-warning'), null, `${entry.unit.name} : carte inconnue signalée à tort`)
    opened += 1
    document.querySelector('#back').click()
    if (!document.querySelector(`.army-switch [data-army="${army}"]`).classList.contains('active')) throw new Error('le retour change de camp')
  }
}
assert.equal(opened, empire.units.length + rebels.units.length)

// Deux occurrences d'une même unité restent distinctes (Stormtroopers 1 à 4 dans la liste Empire).
document.querySelector('.army-switch [data-army="p1"]').click()
const ids = [...document.querySelectorAll('.unit-tile')].map((tile) => tile.dataset.id)
assert.equal(new Set(ids).size, ids.length, 'identifiants de tuiles uniques')

// Une valeur d'amélioration et une valeur d'unité différentes ne s'additionnent pas : une ligne par valeur.
window.eval(`tags['test unite']=[{keywordId:'perforant-x',value:1}];tags['test amelioration']=[{keywordId:'perforant-x',value:2}]`)
const rows = window.eval(`unitKeywordRows({unit:{name:'test unite',upgrades:[{name:'test amelioration'}]}}).map(row=>keywordLabel(row.def,row.tag))`)
assert.equal(rows.length, 2)

// Stockage local périmé : la valeur certifiée gagne, un ajout local reste, un retrait volontaire reste retiré.
const local = await openFiches({
  'swl.list.p1.v1': empire,
  'swl.list.p2.v1': rebels,
  'swl.card-tags.v1': { 'reluctant hero': [{ keywordId: 'critique-x', value: 0 }, { keywordId: 'infiltration' }, { keywordId: 'charge' }] },
  'swl.card-tags-removed.v1': { 'reluctant hero': ['implacable'] },
})
assert.deepEqual(JSON.parse(local.window.eval(`JSON.stringify(tags['reluctant hero'])`)), [
  { keywordId: 'critique-x', value: 1 },
  { keywordId: 'infiltration' },
  { keywordId: 'charge' },
])
local.window.close()

window.close()
console.log(`Fiches d'unité OK : ${opened} fiches ouvertes, ${keywords.length} mots-clés classés.`)
