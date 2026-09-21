import fs from 'node:fs'
import vm from 'node:vm'
const dir = process.env.TEMP + '/takras'
const chunks = fs.readdirSync(dir).map((f) => fs.readFileSync(dir + '/' + f, 'utf8'))
const kc = chunks.find((c) => c.includes('{keyword:"latent_power"'))
function balanced(text, start) {
  const open = text[start], close = open === '[' ? ']' : '}'
  let depth = 0, inString = null
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inString) { if (c === '\\') i++; else if (c === inString) inString = null; continue }
    if (c === '"' || c === "'" || c === '`') { inString = c; continue }
    if (c === open) depth++
    else if (c === close) { depth--; if (depth === 0) return text.slice(start, i + 1) }
  }
}
const ev = (s) => new vm.Script('(' + s + ')').runInNewContext({ t: new Proxy({}, { get: (_, k) => String(k) }) })
const defs = []
for (let i = -1; (i = kc.indexOf('[{keyword:"', i + 1)) >= 0;) { try { const lit = balanced(kc, i); const list = ev(lit); if (list.some((k) => k.tag)) defs.push(...list); i += lit.length } catch { /* suite */ } }
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const map = JSON.parse(fs.readFileSync('scripts/data/takras-keyword-map.json', 'utf8')).map
const byName = new Map()
for (const d of defs) byName.set(norm(String(d.name).replace(/\s+X$/i, '')), d.keyword)
const cards = Object.values(JSON.parse(fs.readFileSync(process.env.TEMP + '/legionhq/cards.json', 'utf8')))
const names = new Set()
for (const c of cards.filter((x) => x.cardType === 'unit' || x.cardType === 'upgrade')) { for (const k of c.keywords || []) names.add(typeof k === 'string' ? k : k.name); for (const w of c.weapons || []) for (const k of w.keywords || []) names.add(typeof k === 'string' ? k : k.name) }
const sb = { window: {} }
vm.runInNewContext(fs.readFileSync('public/assistant/reference-data.js', 'utf8'), sb)
const appIds = new Set(sb.window.SWL_REFERENCE.keywords.map((k) => k.id))
const result = {}, missing = []
for (const name of [...names].sort()) {
  const site = byName.get(norm(name)) || byName.get(norm(name.replace(/^Immune: /, 'immune ')))
  const appId = site && map[site] ? map[site][0] : null
  if (appId && appIds.has(appId)) result[name] = appId; else missing.push(name + (site ? ' [site:' + site + ']' : ''))
}
console.log(Object.keys(result).length, 'appariés,', missing.length, 'manquants')
console.log(missing.join(' | '))
fs.writeFileSync(process.env.TEMP + '/hqkw.json', JSON.stringify(result, null, 1))
console.log(sb.window.SWL_REFERENCE.keywords.map((k) => k.id).filter((id) => /immun|armure|ia|fixe|deflag|souffle|cycle|charge|saut|immobil|ion|poison|repar|traiter|gardien|deflex|maitre/.test(id)).join(', '))
