#!/usr/bin/env node
/* Recoupement des CARACTÉRISTIQUES avec Legion Helper (https://legion.takras.net/) : rang, vitesse, figurines, PV, courage,
   dé de défense, adrénalines d'attaque et de défense, et pour chaque arme : dés, portée (minimum / maximum) et mots-clés.
   Complète scripts/audit-takras-reference.mjs (mots-clés) : ce script lit les mêmes fichiers JavaScript publics du site.

   Deuxième avis, pas une vérité : le site peut se tromper lui aussi. Chaque écart se tranche sur le visuel de la carte.
   Usage : node scripts/audit-takras-stats.mjs [--cache <dossier des fichiers .js déjà téléchargés>]
   Sortie : docs/audit/recoupement-caracteristiques-legion-helper.md (aucune donnée du site n'est recopiée : seuls les écarts sont écrits). */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const SITE = 'https://legion.takras.net'
const args = process.argv.slice(2)
const cacheDir = args.includes('--cache') ? args[args.indexOf('--cache') + 1] : null

/* ---------- Extraction des données du site ---------- */
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
  throw new Error('littéral non équilibré')
}
const evalLiteral = (source) => new vm.Script('(' + source + ')').runInNewContext({ t: new Proxy({}, { get: (_, key) => String(key) }) })
function objectsAt(text, marker) {
  const found = []
  for (let from = 0; ;) {
    const i = text.indexOf(marker, from)
    if (i < 0) break
    try { const literal = balanced(text, i); found.push(evalLiteral(literal)); from = i + literal.length } catch { from = i + marker.length }
  }
  return found
}
async function loadChunks() {
  if (cacheDir) return fs.readdirSync(cacheDir).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(cacheDir, f), 'utf8'))
  const html = await (await fetch(SITE + '/')).text()
  const urls = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"'\\]+\.js/g)].map((m) => SITE + m[0]))]
  const chunks = []
  for (const url of urls) { try { chunks.push(await (await fetch(url)).text()) } catch { /* fichier optionnel */ } }
  return chunks
}
const chunks = await loadChunks()
const dataChunk = chunks.find((c) => c.includes('filename:"stormtroopers"'))
if (!dataChunk) throw new Error('données introuvables : le site a changé de structure')
const siteUnits = objectsAt(dataChunk, '{faction:').filter((o) => o.filename && o.printData)
const siteUpgrades = objectsAt(dataChunk, '{name:["').filter((o) => Array.isArray(o.name) && o.type)

/* ---------- Référentiel de l'appli ---------- */
const sandbox = { window: {} }
vm.createContext(sandbox)
vm.runInContext(fs.readFileSync(path.join(root, 'public/assistant/reference-data.js'), 'utf8'), sandbox)
const ref = sandbox.window.SWL_REFERENCE
const appSource = fs.readFileSync(path.join(root, 'public/assistant/app.js'), 'utf8')
const catalog = vm.runInNewContext('(' + appSource.match(/const rankCatalog=(\{[\s\S]*?\});/)[1] + ')')
const rankOf = Object.fromEntries(Object.entries(catalog).flatMap(([rank, list]) => list.map((key) => [key, rank])))
const cStart = appSource.indexOf('const combatProfiles={'), cEnd = appSource.indexOf('\n};', cStart)
const combat = vm.runInNewContext('(function(){const profile=(attackSurge,defenseSurge)=>({attackSurge,defenseSurge});return (' + appSource.slice(cStart + 'const combatProfiles='.length, cEnd + 2) + ')})()')
const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const kwName = Object.fromEntries(ref.keywords.map((k) => [k.id, k.name]))
const keywordMap = JSON.parse(fs.readFileSync(path.join(here, 'data/takras-keyword-map.json'), 'utf8')).map

/* ---------- Conversions ---------- */
const RANK = { commander: 'commandant', operative: 'operative', corps: 'corps', special: 'special', support: 'support', heavy: 'heavy' }
const COLOR = { red: 'rouge', white: 'blanc', black: 'noir' }
const diceKey = (dice) => Object.entries(dice || {}).filter(([, n]) => n).map(([c, n]) => n + COLOR[c][0]).sort().join('+')
const appDiceKey = (dice) => Array.isArray(dice) ? dice.map((d) => d.count + d.color[0]).sort().join('+') : ''
// Portée du site (minRange / maxRange) -> format de l'appli : melee, melee-N, N, N-M, N-#
function siteRange(w) {
  const min = w.minRange, max = w.maxRange
  if (min === 0 && (max === undefined || max === null || max === 0)) return 'melee'
  if (min === 0) return 'melee-' + max
  if (max === undefined || max === null) return min + '-#'
  return min === max ? String(min) : min + '-' + max
}
const rangeText = (r) => r === 'melee' ? 'corps-à-corps' : r.startsWith('melee-') ? 'corps-à-corps ET distance 1-' + r.slice(6) : r
const frKeyword = (siteId) => { const id = keywordMap[siteId]?.[0]; return id ? kwName[id] || id : siteId }
const weaponLine = (dice, range) => `${dice || '?'} @ ${rangeText(range)}`

/* ---------- Comparaison ---------- */
const SURGE = { critical: 'crit', hit: 'hit' }
const problems = []
let comparedUnits = 0, comparedUpgrades = 0, weaponsCompared = 0
const problem = (kind, key, name, list) => { if (list.length) problems.push({ kind, key, name, list }) }
const byName = (list, nameOf) => { const map = new Map(); for (const item of list) { const k = norm(nameOf(item)); map.set(k, (map.get(k) || []).concat(item)) } return map }
const unitsByName = byName(siteUnits, (u) => u.name)
const upgradesByName = byName(siteUpgrades, (u) => u.name[0])

function compareWeapons(list, appWeapons, siteWeapons, checkKeywords, cardKeywords = []) {
  const site = (siteWeapons || []).filter((w) => w.dice).map((w) => ({ name: w.name, dice: diceKey(w.dice), range: siteRange(w), keywords: (w.keywords || []).map((k) => keywordMap[k.name]?.[0]).filter(Boolean).sort() }))
  const app = (appWeapons || []).map((w) => ({ name: w.name, dice: appDiceKey(w.dice), range: w.range || '', keywords: [...new Set([...(w.keywordIds || []), ...cardKeywords])].sort() }))
  if (site.length !== app.length) { list.push(`nombre d’armes : site ${site.length} / appli ${app.length}`); return }
  // appariement par dés + portée quand possible, sinon dans l'ordre
  const remaining = [...site]
  for (const w of app) {
    weaponsCompared++
    let index = remaining.findIndex((s) => s.dice === w.dice && s.range === w.range)
    if (index < 0) index = remaining.findIndex((s) => s.dice === w.dice)
    if (index < 0) index = remaining.findIndex((s) => s.range === w.range)
    if (index < 0) index = 0
    const s = remaining.splice(index, 1)[0]
    const diffs = []
    if (s.dice !== w.dice) diffs.push(`dés : site ${s.dice || '—'} / appli ${w.dice || '—'}`)
    const openEnded = /^\d+-#$/.test(s.range) && w.range === s.range.split('-')[0]
    if (s.range !== w.range && !openEnded) diffs.push(`portée : site ${rangeText(s.range)} / appli ${rangeText(w.range)}`)
    if (checkKeywords) {
      const missing = s.keywords.filter((id) => !w.keywords.includes(id)), extra = w.keywords.filter((id) => !s.keywords.includes(id) && Object.values(keywordMap).some((v) => v[0] === id))
      if (missing.length) diffs.push('mots-clés sur le site, absents de l’arme : ' + missing.map((id) => kwName[id] || id).join(', '))
    }
    if (diffs.length) list.push(`arme « ${w.name} » — ` + diffs.join(' ; '))
  }
}

// Score = nombre d'écarts (dés, portées, figurines, PV, défense) : la fiche du site la plus proche l'emporte.
const best = (pool, score) => [...pool].sort((a, b) => score(a) - score(b))[0]
function weaponScore(appWeapons, siteWeapons) {
  const site = (siteWeapons || []).filter((w) => w.dice).map((w) => diceKey(w.dice) + '@' + siteRange(w)), app = (appWeapons || []).map((w) => appDiceKey(w.dice) + '@' + (w.range || ''))
  return Math.abs(site.length - app.length) * 3 + app.filter((item) => !site.includes(item)).length
}
const scoreUnit = (key, profile, u) => { const p = u.printData, s = profile.unitStats || {}; return weaponScore(profile.weapons, p.weapons) + (p.miniatures === s.baseModels ? 0 : 2) + (p.health === s.woundsPerModel ? 0 : 1) + (COLOR[p.defenseDice] === profile.defenseColor ? 0 : 1) + (RANK[p.class] === rankOf[key] ? 0 : 1) }
const scoreUpgrade = (key, profile, u) => weaponScore(profile.weapons, u.weapons)

for (const key of Object.keys(ref.weapons)) {
  const profile = ref.weapons[key]
  const isUnit = Boolean(profile.unitStats) || profile.fullCardCertification?.cardType === 'unit' || key in rankOf
  const candidates = (isUnit ? unitsByName : upgradesByName).get(norm(key))
  const alias = Object.entries(ref.aliases || {}).find(([, value]) => value === key)?.[0]
  const pool = candidates || (alias ? (isUnit ? unitsByName : upgradesByName).get(norm(alias)) : null) || (ref.names?.[key] ? (isUnit ? unitsByName : upgradesByName).get(norm(ref.names[key])) : null)
  if (!pool) continue
  const list = []
  if (isUnit) {
    // plusieurs fiches de même nom (versions) : on retient celle dont le nombre d'armes correspond
    const entry = best(pool, (u) => scoreUnit(key, profile, u))
    const print = entry.printData, stats = profile.unitStats, cert = profile.fullCardCertification, c = combat[key] || {}
    comparedUnits++
    const siteRank = RANK[print.class]
    if (siteRank && rankOf[key] && siteRank !== rankOf[key]) list.push(`rang : site ${siteRank} / appli ${rankOf[key]}`)
    const speed = Number(cert?.speed)
    if (Number.isFinite(speed) && print.speed && print.speed !== speed) list.push(`vitesse : site ${print.speed} / appli ${speed}`)
    else if (!Number.isFinite(speed) && print.speed) list.push(`vitesse non renseignée dans l’appli (site : ${print.speed})`)
    if (stats) {
      if (Number.isInteger(print.miniatures) && print.miniatures !== stats.baseModels) list.push(`figurines : site ${print.miniatures} / appli ${stats.baseModels}`)
      if (Number.isFinite(print.health) && print.health !== stats.woundsPerModel) list.push(`PV par figurine : site ${print.health} / appli ${stats.woundsPerModel}`)
      const siteCourage = print.isCourage && Number.isFinite(print.resilience) ? print.resilience : null
      if (print.isCourage && siteCourage !== null && stats.courage !== null && siteCourage !== stats.courage) list.push(`courage : site ${siteCourage} / appli ${stats.courage}`)
    }
    const defense = COLOR[print.defenseDice]
    if (defense && profile.defenseColor && defense !== profile.defenseColor) list.push(`dé de défense : site ${defense} / appli ${profile.defenseColor}`)
    const appAttack = cert?.attackSurge !== undefined ? cert.attackSurge : (c.attackSurge ?? 'none'), appDefense = cert?.defenseSurge !== undefined ? cert.defenseSurge : (c.defenseSurge ?? 'none')
    const siteAttack = SURGE[print.surgeHit] || print.surgeHit || 'none', siteDefense = print.surgeBlock ? 'block' : 'none'
    if (profile.fullCardCertification || key in combat) {
      if (siteAttack !== (appAttack || 'none')) list.push(`adrénaline d’attaque : site ${siteAttack} / appli ${appAttack || 'none'}`)
      if (siteDefense !== (appDefense || 'none')) list.push(`adrénaline de défense : site ${siteDefense} / appli ${appDefense || 'none'}`)
    }
    compareWeapons(list, profile.weapons, print.weapons, true, (ref.tags[key] || []).map((tag) => tag.keywordId))
    problem('unité', key, entry.name, list)
  } else {
    const entry = best(pool, (u) => scoreUpgrade(key, profile, u))
    comparedUpgrades++
    if ((entry.weapons || []).length || (profile.weapons || []).length) compareWeapons(list, profile.weapons, entry.weapons, true, (ref.tags[key] || []).map((tag) => tag.keywordId))
    problem('amélioration', key, entry.name[0], list)
  }
}

/* ---------- Rapport ---------- */
const lines = [
  '# Recoupement des caractéristiques avec Legion Helper',
  '',
  `> Deuxième avis automatique (${new Date().toISOString().slice(0, 10)}), **pas une vérité** : le site peut se tromper. Chaque écart se tranche sur le visuel de la carte. Aucune donnée du site n’est recopiée ici, seulement les écarts.`,
  '',
  `Cartes comparées : ${comparedUnits} unités, ${comparedUpgrades} améliorations, ${weaponsCompared} armes. **${problems.length} carte(s) avec au moins un écart.**`,
  '',
]
for (const kind of ['unité', 'amélioration']) {
  const list = problems.filter((p) => p.kind === kind)
  lines.push(`## ${kind === 'unité' ? 'Unités' : 'Améliorations'} (${list.length})`, '')
  for (const p of list) lines.push(`### ${ref.names[p.key] || p.name} — \`${p.key}\``, ...p.list.map((item) => '- ' + item), '')
}
fs.writeFileSync(path.join(root, 'docs/audit/recoupement-caracteristiques-legion-helper.md'), lines.join('\n'))
console.log(`Recoupement : ${comparedUnits} unités, ${comparedUpgrades} améliorations, ${weaponsCompared} armes comparées ; ${problems.length} carte(s) avec écart.`)
const kinds = {}
for (const p of problems) for (const item of p.list) { const k = item.split(' : ')[0].replace(/ « .*$/, '').replace(/^arme.*— /, 'arme — ').slice(0, 40); kinds[k] = (kinds[k] || 0) + 1 }
console.log(kinds)
