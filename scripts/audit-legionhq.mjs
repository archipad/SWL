#!/usr/bin/env node
/* Recoupement des CARACTÉRISTIQUES avec Legion HQ (https://legionhq2.com/), base de cartes structurée du site :
   rang, vitesse, figurines, PV, courage, dé de défense, adrénalines d'attaque et de défense, et pour chaque arme : dés et portée.
   Deuxième avis automatique, pas une vérité : le site reflète les errata récents (2024-2025), le visuel de la carte peut être une
   version plus ancienne, et le site peut se tromper. Chaque écart se tranche sur le visuel de la carte.
   Aucune donnée du site n'est recopiée dans le dépôt : seuls les écarts et les valeurs à confirmer sont écrits dans le rapport.

   Usage : node scripts/audit-legionhq.mjs [--cache <fichier main.*.js déjà téléchargé>]
   Sortie : docs/audit/recoupement-legionhq.md */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const SITE = 'https://legionhq2.com'
const args = process.argv.slice(2)
const cacheFile = args.includes('--cache') ? args[args.indexOf('--cache') + 1] : null

/* ---------- Extraction ---------- */
async function loadBundle() {
  if (cacheFile) return fs.readFileSync(cacheFile, 'utf8')
  const html = await (await fetch(SITE + '/')).text()
  const url = [...html.matchAll(/(?:src)="([^"]*static\/js\/main[^"]+\.js)"/g)].map((m) => new URL(m[1], SITE + '/').href)[0]
  if (!url) throw new Error('fichier principal introuvable : le site a changé de structure')
  return await (await fetch(url)).text()
}
function jsonBlobs(text) {
  const marker = "JSON.parse('", blobs = []
  for (let from = 0; ;) {
    const i = text.indexOf(marker, from)
    if (i < 0) break
    let j = i + marker.length, raw = ''
    while (j < text.length) { const c = text[j]; if (c === '\\') { raw += c + text[j + 1]; j += 2; continue } if (c === "'") break; raw += c; j++ }
    from = j
    try { blobs.push(JSON.parse(new Function("return '" + raw + "'")())) } catch { /* bloc non JSON */ }
  }
  return blobs
}
const bundle = await loadBundle()
const database = jsonBlobs(bundle).find((b) => b && Object.values(b).some((c) => c && c.cardType === 'unit' && c.stats))
if (!database) throw new Error('base de cartes introuvable : le site a changé de structure')
const hqCards = Object.values(database)

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
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const aliasTable = JSON.parse(fs.readFileSync(path.join(here, 'data/legionhq-aliases.json'), 'utf8')).aliases

/* ---------- Conversions ---------- */
const RANK = { commander: 'commandant', operative: 'operative', corps: 'corps', specialforces: 'special', support: 'support', heavy: 'heavy' }
const COLOR = { r: 'rouge', w: 'blanc', b: 'noir' }
const diceKey = (dice) => Object.entries(dice || {}).filter(([, n]) => n).map(([c, n]) => n + COLOR[c][0]).sort().join('+')
const appDiceKey = (dice) => Array.isArray(dice) ? dice.map((d) => d.count + d.color[0]).sort().join('+') : ''
function hqRange(range) {
  const [min, max] = range || []
  if (min === 0 && (max === undefined || max === null || max === 0)) return 'melee'
  if (min === 0) return 'melee-' + max
  if (typeof min !== 'number') return '?'
  if (max === undefined) return String(min)
  if (max === null || max === 0) return min + '-#'
  return min === max ? String(min) : min + '-' + max
}
const rangeText = (r) => r === 'melee' ? 'corps-à-corps' : r.startsWith('melee-') ? 'corps-à-corps ET distance 1-' + r.slice(6) : r
const printedSpeedOf = (key) => { const speed = Number(ref.weapons[key]?.fullCardCertification?.speed); return Number.isFinite(speed) ? speed : null }

/* ---------- Appariement ---------- */
const candidatesFor = (type) => hqCards.filter((c) => (type === 'unit' ? c.cardType === 'unit' : c.cardType === 'upgrade'))
const nameKeys = (c) => [norm(c.cardName), norm(c.cardName + ' ' + (c.title || '')), norm(c.displayName), norm(String(c.imageName || '').replace(/\.\w+$/, ''))].filter(Boolean)
const tokens = (s) => new Set(norm(s).split(' ').filter(Boolean))
const jaccard = (a, b) => { const A = tokens(a), B = tokens(b); const inter = [...A].filter((t) => B.has(t)).length; return inter / (A.size + B.size - inter || 1) }
function matchCards(key, type) {
  const pool = candidatesFor(type), wanted = [key, aliasTable[key]].filter(Boolean).map(norm)
  const exact = pool.filter((c) => nameKeys(c).some((n) => wanted.includes(n)))
  if (exact.length) return exact
  const scored = pool.map((c) => ({ c, s: Math.max(...nameKeys(c).map((n) => jaccard(n, key))) })).filter((x) => x.s >= 0.8)
  return scored.map((x) => x.c)
}
const weaponScore = (appWeapons, hqWeapons) => {
  const hq = (hqWeapons || []).map((w) => diceKey(w.dice) + '@' + hqRange(w.range)), app = (appWeapons || []).map((w) => appDiceKey(w.dice) + '@' + (w.range || ''))
  return Math.abs(hq.length - app.length) * 3 + app.filter((item) => !hq.includes(item)).length
}
const best = (list, score) => [...list].sort((a, b) => score(a) - score(b))[0]

/* ---------- Comparaison ---------- */
const problems = [], unmatched = { unit: [], upgrade: [] }, speedSuggestions = []
let comparedUnits = 0, comparedUpgrades = 0, comparedWeapons = 0
function compareWeapons(list, appWeapons, hqWeapons) {
  const hq = (hqWeapons || []).filter((w) => w.dice).map((w) => ({ name: w.name, dice: diceKey(w.dice), range: hqRange(w.range) }))
  const app = (appWeapons || []).map((w) => ({ name: w.name, dice: appDiceKey(w.dice), range: w.range || '' }))
  if (hq.length !== app.length) { list.push(`nombre d’armes : site ${hq.length} / appli ${app.length}`); return }
  const remaining = [...hq]
  for (const w of app) {
    comparedWeapons++
    let index = remaining.findIndex((s) => s.dice === w.dice && s.range === w.range)
    if (index < 0) index = remaining.findIndex((s) => s.dice === w.dice)
    if (index < 0) index = remaining.findIndex((s) => s.range === w.range)
    if (index < 0) index = 0
    const s = remaining.splice(index, 1)[0], diffs = []
    if (s.dice !== w.dice) diffs.push(`dés : site ${s.dice || '—'} / appli ${w.dice || '—'}`)
    const openEnded = /^\d+-#$/.test(s.range) && w.range === s.range.split('-')[0]
    if (s.range !== w.range && !openEnded && s.range !== '?') diffs.push(`portée : site ${rangeText(s.range)} / appli ${rangeText(w.range)}`)
    if (diffs.length) list.push(`arme « ${w.name} » — ` + diffs.join(' ; '))
  }
}
for (const key of Object.keys(ref.weapons)) {
  const profile = ref.weapons[key]
  const isUnit = Boolean(profile.unitStats) || profile.fullCardCertification?.cardType === 'unit' || key in rankOf
  const pool = matchCards(key, isUnit ? 'unit' : 'upgrade')
  if (!pool.length) { unmatched[isUnit ? 'unit' : 'upgrade'].push(key); continue }
  const list = []
  if (isUnit) {
    const score = (c) => weaponScore(profile.weapons, c.weapons) + (c.stats.minicount === profile.unitStats?.baseModels ? 0 : 2) + (c.stats.hp === profile.unitStats?.woundsPerModel ? 0 : 1) + (RANK[c.rank] === rankOf[key] ? 0 : 1)
    const c = best(pool, score), st = c.stats, ustats = profile.unitStats, cert = profile.fullCardCertification, comb = combat[key] || {}
    comparedUnits++
    if (RANK[c.rank] && rankOf[key] && RANK[c.rank] !== rankOf[key]) list.push(`rang : site ${RANK[c.rank]} / appli ${rankOf[key]}`)
    const appSpeed = printedSpeedOf(key)
    if (appSpeed !== null && st.speed && st.speed !== appSpeed) list.push(`vitesse : site ${st.speed} / appli ${appSpeed}`)
    if (appSpeed === null && st.speed) speedSuggestions.push({ key, name: ref.names[key] || key, speed: st.speed })
    if (ustats) {
      if (Number.isInteger(st.minicount) && st.minicount !== ustats.baseModels) list.push(`figurines : site ${st.minicount} / appli ${ustats.baseModels}`)
      if (Number.isFinite(st.hp) && st.hp !== ustats.woundsPerModel) list.push(`PV par figurine : site ${st.hp} / appli ${ustats.woundsPerModel}`)
      if (Number.isFinite(st.courage) && ustats.courage !== null && st.courage !== ustats.courage) list.push(`courage : site ${st.courage} / appli ${ustats.courage}`)
      if (!st.courage && ustats.courage !== null) list.push(`courage : site « — » / appli ${ustats.courage}`)
    }
    const defense = { r: 'rouge', w: 'blanc' }[st.defense]
    if (defense && profile.defenseColor && defense !== profile.defenseColor) list.push(`dé de défense : site ${defense} / appli ${profile.defenseColor}`)
    if (cert || key in combat) {
      const appAttack = (cert?.attackSurge !== undefined ? cert.attackSurge : comb.attackSurge) || 'none', appDefense = (cert?.defenseSurge !== undefined ? cert.defenseSurge : comb.defenseSurge) || 'none'
      const hqAttack = { h: 'hit', c: 'crit' }[st.hitsurge] || 'none', hqDefense = st.defsurge === 'b' ? 'block' : 'none'
      if (hqAttack !== appAttack) list.push(`adrénaline d’attaque : site ${hqAttack} / appli ${appAttack}`)
      if (hqDefense !== appDefense) list.push(`adrénaline de défense : site ${hqDefense} / appli ${appDefense}`)
    }
    compareWeapons(list, profile.weapons, c.weapons)
    if (list.length) problems.push({ kind: 'unité', key, name: c.cardName + (c.title ? ', ' + c.title : ''), list })
  } else {
    const c = best(pool, (card) => weaponScore(profile.weapons, card.weapons))
    comparedUpgrades++
    if ((c.weapons || []).length || (profile.weapons || []).length) compareWeapons(list, profile.weapons, c.weapons)
    if (list.length) problems.push({ kind: 'amélioration', key, name: c.cardName, list })
  }
}

/* ---------- Rapport ---------- */
const lines = [
  '# Recoupement des caractéristiques avec Legion HQ',
  '',
  `> Deuxième avis automatique (${new Date().toISOString().slice(0, 10)}), **pas une vérité** : le site applique les errata récents, le visuel peut être plus ancien, et le site peut se tromper. Chaque écart se tranche sur le visuel. Aucune donnée du site n’est recopiée ici, seulement les écarts.`,
  '',
  `Comparé : ${comparedUnits} unités, ${comparedUpgrades} améliorations, ${comparedWeapons} armes. **${problems.length} carte(s) avec au moins un écart.** Non appariées : ${unmatched.unit.length} unités, ${unmatched.upgrade.length} améliorations (nom introuvable côté site, à apparier dans scripts/data/legionhq-aliases.json).`,
  '',
]
for (const kind of ['unité', 'amélioration']) {
  const list = problems.filter((p) => p.kind === kind)
  lines.push(`## ${kind === 'unité' ? 'Unités' : 'Améliorations'} avec écart (${list.length})`, '')
  for (const p of list) lines.push(`### ${ref.names[p.key] || p.name} — \`${p.key}\``, ...p.list.map((item) => '- ' + item), '')
}
lines.push(`## Vitesse à renseigner dans la certification (${speedSuggestions.length} unités)`, '', 'La vitesse imprimée manque dans l’appli pour ces unités ; Legion HQ indique la valeur ci-dessous. À confirmer sur la carte avant de certifier.', '')
for (const item of speedSuggestions) lines.push(`- ${item.name} (\`${item.key}\`) : vitesse ${item.speed}`)
lines.push('', '## Cartes non appariées', '', 'Unités : ' + (unmatched.unit.join(', ') || '—'), '', 'Améliorations : ' + (unmatched.upgrade.join(', ') || '—'), '')
fs.writeFileSync(path.join(root, 'docs/audit/recoupement-legionhq.md'), lines.join('\n'))
console.log(`Legion HQ : ${comparedUnits} unités, ${comparedUpgrades} améliorations, ${comparedWeapons} armes comparées ; ${problems.length} carte(s) avec écart ; ${speedSuggestions.length} vitesse(s) à renseigner ; non appariées : ${unmatched.unit.length} unités, ${unmatched.upgrade.length} améliorations.`)
