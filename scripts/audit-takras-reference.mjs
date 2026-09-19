#!/usr/bin/env node
/* Recoupement du référentiel de l'appli avec une SECONDE SOURCE indépendante :
   Legion Helper (https://legion.takras.net/), dont les données (cartes Unité,
   cartes Amélioration, définitions de mots-clés) sont embarquées dans les
   fichiers JavaScript du site. Outil manuel (pas dans `npm run build`, car il
   interroge le réseau) : `npm run audit:takras`, éventuellement avec
   `-- --cache <dossier>` pour rejouer sur des fichiers déjà téléchargés.

   IMPORTANT — ce que ce rapport est et n'est pas :
   - C'est un deuxième avis. Un écart peut venir de l'appli, du site, ou d'une
     traduction de mot-clé mal appariée. La vérité reste la carte physique /
     le visuel, vérifiés par le joueur (voir docs/PROCESSUS-VERIFICATION.md).
   - Les mots-clés sont appariés (anglais du site ↔ français de l'appli) par
     co-occurrence sur les cartes communes ; seuls les appariements « sûrs »
     servent à comparer les cartes. Les autres sont listés « à confirmer ».
   - Aucune donnée du site n'est copiée dans le dépôt : seul le rapport
     (écarts et comptages) est écrit dans docs/audit/. */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const SITE = 'https://legion.takras.net'
const args = process.argv.slice(2)
const cacheDir = args.includes('--cache') ? args[args.indexOf('--cache') + 1] : null

/* ---------- Extraction depuis les fichiers du site ---------- */
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
  if (!urls.length) throw new Error('aucun fichier JavaScript trouvé sur la page d’accueil')
  const chunks = []
  for (const url of urls) { try { chunks.push(await (await fetch(url)).text()) } catch { /* fichier optionnel */ } }
  return chunks
}
async function loadTakras() {
  const chunks = await loadChunks()
  const unitChunk = chunks.find((c) => c.includes('filename:"stormtroopers"'))
  const keywordChunk = chunks.find((c) => c.includes('{keyword:"latent_power"'))
  if (!unitChunk || !keywordChunk) throw new Error('données introuvables : le site a changé de structure, adapter l’extraction')
  const units = objectsAt(unitChunk, '{faction:').filter((o) => o.filename && o.printData)
  const upgrades = objectsAt(unitChunk, '{name:["').filter((o) => Array.isArray(o.name) && o.type)
  const keywordDefs = []
  for (let i = -1; (i = keywordChunk.indexOf('[{keyword:"', i + 1)) >= 0;) {
    try { const literal = balanced(keywordChunk, i); const list = evalLiteral(literal); if (list.some((k) => k.tag)) keywordDefs.push(...list); i += literal.length } catch { /* tableau suivant */ }
  }
  return { units, upgrades, keywordDefs }
}

/* ---------- Référentiel de l'appli ---------- */
const sandbox = { window: {} }
vm.createContext(sandbox)
for (const file of ['reference-data.js', 'reference-corrections.js']) vm.runInContext(fs.readFileSync(path.join(root, 'public/assistant', file), 'utf8'), sandbox)
const ref = sandbox.window.SWL_REFERENCE
const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const appKeywordById = Object.fromEntries(ref.keywords.map((k) => [k.id, k]))

// Classement de prise en compte par le moteur, lu dans le script d'audit existant (ensembles « automatic » / « assisted »).
const auditSource = fs.readFileSync(path.join(here, 'audit-assistant-automation.mjs'), 'utf8')
const readSet = (name) => new Set([...(auditSource.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`))?.[1] || '').matchAll(/'([^']+)'/g)].map((m) => m[1]))
const automatic = readSet('automatic'), assisted = readSet('assisted')
const handling = (id) => (automatic.has(id) ? 'automatique' : assisted.has(id) ? 'assisté' : 'affichage / vérification humaine')

/* ---------- Comparaison ---------- */
const parseValue = (text) => { const m = String(text ?? '').match(/(\d+)\s*$/); return m ? Number(m[1]) : null }
const keywordMapRaw = JSON.parse(fs.readFileSync(path.join(here, 'data/takras-keyword-map.json'), 'utf8')).map
const keywordMap = keywordMapRaw
const takras = await loadTakras()
const cards = new Map()
const push = (key, entry) => cards.set(key, (cards.get(key) || []).concat(entry))
// Mots-clés d'une carte = mots-clés de la carte + mots-clés de ses armes (l'appli les agrège sur la carte).
const weaponKeywords = (weapons) => (weapons || []).flatMap((w) => (w.keywords || []).map((k) => ({ id: k.name, value: k.xValue != null && /^\d+$/.test(String(k.xValue)) ? Number(k.xValue) : null })))
const siteValues = (u, printed) => {
  const values = {}
  for (const text of printed || []) {
    const m = String(text).match(/^(.*?)\s*(\d+)\s*$/)
    if (!m) continue
    const name = norm(m[1].replace(/\{[^}]*\}/g, ''))
    for (const id of u.keywords || []) if (norm(id.replace(/_x$/, '')) === name || norm(id.replace(/_x$/, '')).replace(/\s/g, '') === name.replace(/\s/g, '')) values[id] = Number(m[2])
  }
  for (const w of weaponKeywords(u.printData?.weapons || u.weapons)) if (w.value != null) values[w.id] = w.value
  return values
}
const idsOf = (u) => [...new Set([...(u.keywords || []), ...weaponKeywords(u.printData?.weapons || u.weapons).map((k) => k.id)])]
for (const u of takras.units) push(norm(u.name), { kind: 'unité', name: u.name, ids: idsOf(u), values: siteValues(u, u.printData.keywords), u })
for (const u of takras.upgrades) push(norm(u.name[0]), { kind: 'amélioration', name: u.name[0], ids: idsOf(u), values: siteValues(u, []), u })

const keywordMapAppId = (id) => keywordMapRaw[id]?.[0]
const appKeywordList = (key) => {
  const list = [...(ref.tags[key] || [])]
  for (const weapon of ref.weapons[key]?.weapons || []) for (const id of weapon.keywordIds || []) if (!list.some((tag) => tag.keywordId === id)) list.push({ keywordId: id })
  return list
}
// Plusieurs fiches du site peuvent porter le même nom (unité + amélioration) : on retient celle dont le type correspond à la carte certifiée, sinon la plus proche.
const pickEntry = (key) => {
  const all = cards.get(norm(key))
  // Carte Unité de l'appli (caractéristiques certifiées) -> fiches Unité du site ; sinon fiches Amélioration.
  const wantUnit = Boolean(ref.weapons[key]?.unitStats) || ref.weapons[key]?.fullCardCertification?.cardType === 'unit'
  const sameKind = all.filter((c) => (c.kind === 'unité') === wantUnit)
  // Jamais de comparaison Unité <-> Amélioration : sans fiche du même type côté site, la carte n'est pas recoupée.
  const candidates = sameKind
  if (!candidates.length) return null
  if (candidates.length === 1) return candidates[0]
  const appIds = new Set(appKeywordList(key).map((tag) => tag.keywordId))
  const score = (c) => c.ids.filter((id) => appIds.has(keywordMapAppId(id))).length - c.ids.filter((id) => keywordMapAppId(id) && !appIds.has(keywordMapAppId(id))).length * 0.5
  return [...candidates].sort((a, b) => score(b) - score(a))[0]
}
const matched = Object.keys(ref.tags).filter((key) => cards.has(norm(key)) && pickEntry(key))

// Appariement anglais ↔ français par co-occurrence sur les cartes communes.
const co = new Map(), tCount = new Map(), aCount = new Map()
for (const key of matched) {
  const entry = pickEntry(key)
  const tset = new Set(entry.ids), aset = new Set(appKeywordList(key).map((tag) => tag.keywordId))
  for (const t of tset) tCount.set(t, (tCount.get(t) || 0) + 1)
  for (const a of aset) aCount.set(a, (aCount.get(a) || 0) + 1)
  for (const t of tset) for (const a of aset) co.set(`${t}|${a}`, (co.get(`${t}|${a}`) || 0) + 1)
}
const bestMatch = new Map()
for (const [pair, n] of co) {
  const [t, a] = pair.split('|'), j = n / (tCount.get(t) + aCount.get(a) - n)
  if (!bestMatch.has(t) || j > bestMatch.get(t).j) bestMatch.set(t, { a, n, j })
}
const sure = new Map(Object.entries(keywordMap).filter(([, [appId]]) => appKeywordById[appId]).map(([siteId, [appId]]) => [siteId, appId]))
const confidence = (siteId) => keywordMap[siteId]?.[1]
const unknownAppIds = Object.entries(keywordMap).filter(([, [appId]]) => !appKeywordById[appId]).map(([siteId, [appId]]) => `${siteId} → ${appId}`)
// Contre-vérification : un appariement contredit par les cartes communes est signalé.
const contradicted = []
for (const [siteId, appId] of sure) {
  const together = co.get(`${siteId}|${appId}`) || 0
  const siteOnly = (tCount.get(siteId) || 0) - together, appOnlyCount = (aCount.get(appId) || 0) - together
  if (siteOnly + appOnlyCount >= 1 && together < siteOnly + appOnlyCount) contradicted.push({ siteId, appId, together, siteOnly, appOnlyCount })
}

const mismatches = [], comparedCards = []
for (const key of matched) {
  const entry = pickEntry(key)
  const appTags = appKeywordList(key)
  const tIds = entry.ids.filter((id) => sure.has(id)), unsure = entry.ids.filter((id) => !sure.has(id))
  const appIds = new Set(appTags.map((tag) => tag.keywordId))
  const missingInApp = tIds.filter((id) => !appIds.has(sure.get(id))).map((id) => `${id} → ${sure.get(id)}`)
  const extraInApp = [...appIds].filter((id) => ![...sure.values()].includes(id) ? false : !tIds.some((t) => sure.get(t) === id))
  const values = entry.values
  const valueDiffs = tIds.filter((id) => appIds.has(sure.get(id)) && values[id] != null && (appTags.find((tag) => tag.keywordId === sure.get(id))?.value ?? null) !== values[id])
    .map((id) => `${sure.get(id)} : site ${values[id]} / appli ${appTags.find((tag) => tag.keywordId === sure.get(id))?.value ?? '—'}`)
  comparedCards.push(key)
  if (missingInApp.length || extraInApp.length || valueDiffs.length) mismatches.push({ key, name: entry.name, kind: entry.kind, missingInApp, extraInApp, valueDiffs, unsure })
}

// Statistiques d'unité (cartes Unité appariées et certifiées).
const statMismatches = []
for (const key of matched) {
  const entry = pickEntry(key)
  const profile = ref.weapons[key]
  if (!entry || entry.kind !== 'unité' || !profile?.unitStats) continue
  const print = entry.u.printData, stats = profile.unitStats, problems = []
  if (Number.isInteger(print.miniatures) && print.miniatures !== stats.baseModels) problems.push(`figurines : site ${print.miniatures} / appli ${stats.baseModels}`)
  if (Number.isFinite(print.health) && print.health !== stats.woundsPerModel && print.miniatures > 1) problems.push(`PV par figurine : site ${print.health} / appli ${stats.woundsPerModel}`)
  const defense = { red: 'rouge', white: 'blanc' }[print.defenseDice]
  if (defense && profile.defenseColor && defense !== profile.defenseColor) problems.push(`dés de défense : site ${defense} / appli ${profile.defenseColor}`)
  const appWeapons = (profile.weapons || []).map((w) => `${(w.dice || []).map((d) => `${d.count}${d.color[0]}`).sort().join('+')}@${w.range}`).sort()
  const siteWeapons = (print.weapons || []).filter((w) => w.dice).map((w) => `${['red:r', 'white:b', 'black:n'].map((s) => { const [c, l] = s.split(':'); return w.dice[c] ? `${w.dice[c]}${l}` : '' }).filter(Boolean).sort().join('+')}@${w.minRange === 0 ? 'melee' : `${w.minRange}-${w.maxRange}`}`).sort()
  if (JSON.stringify(appWeapons) !== JSON.stringify(siteWeapons)) problems.push(`armes (dés@portée) : site [${siteWeapons.join(' ; ')}] / appli [${appWeapons.join(' ; ')}]`)
  if (problems.length) statMismatches.push({ key, name: entry.name, problems })
}

/* ---------- Mots-clés : couverture ---------- */
// Mots-clés réellement imprimés sur des cartes du site (le reste des définitions décrit des règles générales : terrain, phases…).
const usedOnCards = new Map()
for (const list of cards.values()) for (const entry of list) for (const id of entry.ids) usedOnCards.set(id, (usedOnCards.get(id) || 0) + 1)
const definitionById = new Map(takras.keywordDefs.map((k) => [k.keyword, k]))
const defIds = new Set([...usedOnCards.keys(), ...takras.keywordDefs.filter((k) => ['Unit Keyword', 'Weapon Keyword', 'Upgrade and Command Keyword'].includes(k.tag)).map((k) => k.keyword)])
const defs = [...defIds].map((id) => definitionById.get(id) || { keyword: id, name: id, tag: 'Keyword' })
const defRows = defs.map((def) => {
  const appId = sure.get(def.keyword) || null
  const guess = bestMatch.get(def.keyword)
  return { id: def.keyword, name: def.name, tag: def.tag || 'Keyword', cards: usedOnCards.get(def.keyword) || 0, appId, confidence: confidence(def.keyword), guess: appId ? null : guess && guess.n >= 1 ? guess : null }
})
const appIdsCovered = new Set(defRows.map((r) => r.appId).filter(Boolean))
const appOnly = ref.keywords.filter((k) => !appIdsCovered.has(k.id))

/* ---------- Données pour l'écran « Certification des cartes » ---------- */
// Instantané des écarts (texte français, sans donnée recopiée du site) embarqué dans l'Assistant :
// chaque carte à écart reste « à contrôler » tant que sa certification ne porte pas la signature de ces écarts.
const frName = (id) => appKeywordById[id]?.name || id
const crosscheckData = {}
for (const m of mismatches) {
  const keywords = [
    ...m.missingInApp.map((item) => 'Legion Helper indique « ' + frName(item.split(' → ')[1]) + ' » : absent de la base de l’appli'),
    ...m.extraInApp.map((id) => 'La base de l’appli a « ' + frName(id) + ' » : absent chez Legion Helper'),
    ...m.valueDiffs,
  ]
  crosscheckData[m.key] = { keywords, stats: [] }
}
for (const s of statMismatches) (crosscheckData[s.key] ||= { keywords: [], stats: [] }).stats = s.problems
for (const [key, entry] of Object.entries(crosscheckData)) {
  entry.signature = createHash('sha1').update(JSON.stringify([entry.keywords, entry.stats])).digest('hex').slice(0, 10)
}
fs.writeFileSync(path.join(root, 'src/data/crosscheckTakras.json'), JSON.stringify(Object.fromEntries(Object.entries(crosscheckData).sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n')

/* ---------- Rapport ---------- */
const today = new Date().toISOString().slice(0, 10)
const lines = []
lines.push(`# Recoupement du référentiel avec Legion Helper — ${today}`, '')
lines.push('> Deuxième avis automatique, **pas une vérité** : un écart peut venir de l’appli, du site ou d’un appariement de mots-clés. Chaque écart se tranche sur la carte physique / le visuel (docs/PROCESSUS-VERIFICATION.md). Aucune donnée du site n’est copiée dans le dépôt.', '')
lines.push('## Résumé', '')
lines.push(`- Site : ${takras.units.length} cartes Unité, ${takras.upgrades.length} cartes Amélioration, ${defs.length} mots-clés d’unité / d’arme / d’amélioration.`)
lines.push(`- Appli : ${Object.keys(ref.tags).length} cartes avec étiquettes, ${ref.keywords.length} mots-clés, ${Object.keys(ref.weapons).length} profils d’armes.`)
lines.push(`- Cartes appariées par le nom : **${matched.length}** (les autres portent un nom différent des deux côtés : à apparier à la main).`)
lines.push(`- Mots-clés du site : ${defRows.length}, dont ${defRows.filter((r) => r.appId).length} appariés à l’appli via scripts/data/takras-keyword-map.json (${defRows.filter((r) => r.appId && r.confidence === 'probable').length} « probables », à confirmer). **Non appariés : ${defRows.filter((r) => !r.appId).length}.**`)
lines.push(`- Appariements contredits par les cartes communes : **${contradicted.length}** ; ids de la table inconnus de l’appli : **${unknownAppIds.length}**.`)
lines.push(`- **Écarts de mots-clés** sur les cartes appariées (mots-clés à appariement sûr) : **${mismatches.length}**.`)
lines.push(`- **Écarts de caractéristiques** (figurines, PV, dés de défense, armes) : **${statMismatches.length}**.`, '')
lines.push('## Écarts de mots-clés par carte', '')
if (!mismatches.length) lines.push('_Aucun._', '')
for (const m of mismatches) {
  lines.push(`### ${m.name} (${m.kind}) — clé appli \`${m.key}\``)
  if (m.missingInApp.length) lines.push(`- Sur le site mais **absent de l’appli** : ${m.missingInApp.join(', ')}`)
  if (m.extraInApp.length) lines.push(`- Dans l’appli mais **absent du site** : ${m.extraInApp.join(', ')}`)
  if (m.valueDiffs.length) lines.push(`- Valeur différente : ${m.valueDiffs.join(' ; ')}`)
  if (m.unsure.length) lines.push(`- Non comparés (appariement à confirmer) : ${m.unsure.join(', ')}`)
  lines.push('')
}
lines.push('## Écarts de caractéristiques', '')
if (!statMismatches.length) lines.push('_Aucun._', '')
for (const s of statMismatches) { lines.push(`### ${s.name} — \`${s.key}\``); for (const p of s.problems) lines.push(`- ${p}`); lines.push('') }
lines.push('## Contrôle de la table d’appariement', '')
if (unknownAppIds.length) lines.push(`- Ids inconnus de l’appli dans la table : ${unknownAppIds.join(', ')}`)
for (const c of contradicted) lines.push(`- \`${c.siteId}\` → \`${c.appId}\` : ${c.together} carte(s) en commun, ${c.siteOnly} avec le mot-clé du site seul, ${c.appOnlyCount} avec celui de l’appli seul`)
if (!unknownAppIds.length && !contradicted.length) lines.push('_Aucune incohérence._')
lines.push('', '## Mots-clés du site et leur prise en compte dans l’appli', '', '| Mot-clé (site) | Cartes | Mot-clé appli | Confiance | Prise en compte par le moteur |', '|---|---|---|---|---|')
for (const r of defRows.sort((a, b) => a.name.localeCompare(b.name))) {
  const app = r.appId ? `${appKeywordById[r.appId].name} (\`${r.appId}\`)` : r.guess ? `à confirmer : \`${r.guess.a}\` (${appKeywordById[r.guess.a]?.name})` : '**non apparié**'
  lines.push(`| ${r.name} | ${r.cards} | ${app} | ${r.confidence || '—'} | ${r.appId ? handling(r.appId) : '—'} |`)
}
lines.push('', `## Mots-clés de l’appli sans équivalent apparié côté site (${appOnly.length})`, '')
lines.push(appOnly.map((k) => `\`${k.id}\` (${k.name})`).join(' · ') || '_Aucun._', '')
const outDir = path.join(root, 'docs/audit')
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, `recoupement-legion-helper-${today}.md`)
fs.writeFileSync(outFile, lines.join('\n'))
console.log(`Rapport : ${path.relative(root, outFile)}`)
console.log(`cartes appariées ${matched.length} | écarts mots-clés ${mismatches.length} | écarts caractéristiques ${statMismatches.length} | mots-clés appariés ${sure.size}/${defRows.length}`)
