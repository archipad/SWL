import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { JSDOM } from 'jsdom'

const root = path.resolve('public/assistant-evolutions-maquette')
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const script = fs.readFileSync(path.join(root, 'mockup.js'), 'utf8')
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/assistant-evolutions-maquette/' })
dom.window.scrollTo = () => {}
dom.window.eval(script)

const $ = selector => dom.window.document.querySelector(selector)
const click = selector => $(selector).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))

assert.equal($('.view.active').id, 'dock')
click('[data-view="table"]')
assert.equal($('.view.active').id, 'table', 'les onglets changent de maquette')
assert.equal(dom.window.document.querySelectorAll('.unit-row').length, 8, 'les deux armées sont affichées')
click('[data-unit="wookies"]')
assert.match($('#tableSelection').textContent, /GUERRIERS WOOKIES/)
click('[data-view="physical"]')
click('[data-physical-answer="yes"]')
assert.match($('#physicalResult').textContent, /CONDITION CONFIRMÉE/)
click('[data-view="dock"]')
click('[data-token="aim"]')
assert.equal($('#aimValue').textContent, '1', 'les pions de la barre compacte sont interactifs')

console.log('Maquette Assistant : navigation, table, contrôle physique et barre rapide OK')
dom.window.close()
