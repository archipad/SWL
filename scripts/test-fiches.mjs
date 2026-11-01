/* Fiches d'unité (public/fiches/) : la page réelle, exécutée dans jsdom avec les listes de scripts/data/real-lists,
   doit afficher chaque unité, ses améliorations et tous ses mots-clés, sans dépendre du moteur de l'Assistant. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM, ResourceLoader, VirtualConsole } from 'jsdom'
import { openAssistant } from './lib/assistant-harness.mjs'

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

// Classement : chaque mot-clé tombe dans au moins une section connue.
const { keywords } = window.SWL_REFERENCE
// JSON : les tableaux créés dans jsdom viennent d'un autre royaume et ne passent pas deepEqual.
const sectionsOf = (id) => JSON.parse(window.eval(`JSON.stringify(keywordSections(keywords.find(item=>item.id===${JSON.stringify(id)})))`))
const known = new Set(window.eval('KEYWORD_SECTIONS.map(section=>section.id)'))
for (const keyword of keywords) {
  const sections = sectionsOf(keyword.id)
  assert.ok(sections.length && sections.every((section) => known.has(section)), `sections de ${keyword.id} : ${sections}`)
}
assert.deepEqual(sectionsOf('implacable').sort(), ['attaque', 'autre'])
assert.deepEqual(sectionsOf('impact-x'), ['attaque'])
assert.deepEqual(sectionsOf('saut-x'), ['autre'], 'un mot-clé de déplacement va dans Autre')
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
    assert.deepEqual([...document.querySelectorAll('[data-kw-section] h3')].map((title) => title.lastChild.previousSibling.textContent), ['Améliorations', 'Attaque', 'Défense', 'Autre'])
    const effects = document.querySelectorAll('[data-kw-section="amelioration"] .fiche-kw')
    assert.equal(effects.length, entry.unit.upgrades.length, `effets de cartes de ${entry.unit.name}`)
    assert.ok(![...effects].some((effect) => /undefined/.test(effect.textContent)))
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

// Une amélioration sans aucun mot-clé apparaît quand même, avec son texte (signalement : À Bout Portant).
const effectHtml = window.eval(`upgradeEffectRow({name:'Point Blank'})`)
assert.match(effectHtml, /À Bout Portant/)
assert.match(effectHtml, /gagne 1 pion Esquive/)
assert.match(window.eval(`upgradeEffectRow({name:'Tank Hunting Munitions'})`), /Usage unique/)
assert.match(window.eval(`upgradeEffectRow({name:'Carte inconnue'})`), /Texte non transcrit/)

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

// Assistant : même priorité que les Fiches, et les mots-clés retirés en certification ne reviennent pas par la copie locale.
const staleTags = {
  'reluctant hero': [{ keywordId: 'critique-x', value: 0 }, { keywordId: 'infiltration' }, { keywordId: 'implacable' }],
  'the darksaber': [{ keywordId: 'impact-x', value: 2 }, { keywordId: 'perforant-x', value: 2 }, { keywordId: 'demoraliser-x', value: 1 }],
  'proton charge saboteur': [{ keywordId: 'impact-x', value: 6 }],
  'a280 cfe pistol sniper config': [{ keywordId: 'longue-distance' }],
  'gar saxon militant commando': [{ keywordId: 'mercenaire' }],
  'maul a rival': [{ keywordId: 'mercenaire' }],
}
const assistant = await openAssistant({
  'swl.card-tags.v1': staleTags,
  'swl.list.p1.v1': { listName: 'Test rebelles', faction: 'Rebelles', units: [{ name: 'Rebel Agent Defender of Democracy', upgrades: [{ name: 'Reluctant Hero' }] }] },
  'swl.list.p2.v1': { listName: 'Test empire', faction: 'Empire', units: [{ name: 'Stormtroopers', upgrades: [] }] },
  'swl.assistant.unit-state.v1': { 'p1:0': { suppression: 2 } },
})
const tagOf = (card, id) => JSON.parse(assistant.window.eval(`JSON.stringify((tags[${JSON.stringify(card)}]||[]).find(tag=>tag.keywordId===${JSON.stringify(id)})||null)`))
assert.equal(tagOf('reluctant hero', 'critique-x').value, 1, 'Critique 1 imprimé sur Héros Malgré Lui')
assert.equal(tagOf('the darksaber', 'impact-x').value, 1, 'Impact 1 imprimé sur le Sabre Noir')
assert.equal(tagOf('the darksaber', 'perforant-x').value, 1, 'Perforant 1 imprimé sur le Sabre Noir')
assert.equal(tagOf('proton charge saboteur', 'impact-x').value, 6, 'Impact 6 imprimé sur la Charge à Protons')
assert.equal(tagOf('the darksaber', 'demoraliser-x'), null)
assert.equal(tagOf('a280 cfe pistol sniper config', 'longue-distance'), null)
assert.equal(tagOf('gar saxon militant commando', 'mercenaire'), null)
assert.equal(tagOf('maul a rival', 'mercenaire'), null)
assert.equal(tagOf('bossk terror of trandosha', 'autonome').value, 2)
// Héros Malgré Lui : Critique vaut le nombre de pions Suppression, jamais ce nombre + le 1 de la carte.
assistant.window.eval(`attacker=entries.find(entry=>entry.army==='p1');attackState={counts:{}};selectedWeaponRows=()=>[]`)
assert.equal(assistant.window.eval(`attackKeywordValue('critique-x')`), 2, 'Critique suit la suppression sans s’ajouter au 1 de la carte')
assistant.window.close()
console.log(`Fiches d'unité OK : ${opened} fiches ouvertes, ${keywords.length} mots-clés classés.`)
