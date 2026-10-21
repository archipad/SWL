// Extraction des cartes FRANÇAISES manquantes depuis les PDF français présents sur le disque (certification automatique β).
// Cibles : les cartes du manifeste PDF (src/data/pdfCardManifest.json) qui n'ont encore aucun visuel local.
// Chaque carte est l'image intégrée de son emplacement (texte superposé compris pour les traductions communautaires), à la
// résolution native : jamais une page entière. Le titre est lu par l'OCR Windows et comparé à toutes les cartes du même PDF ;
// une carte identifiée sans ambiguïté est « identifiée », sinon elle est copiée mais classée « À contrôler » (jamais certifiée).
// Doublons repérés par SHA-256 et par empreinte perceptuelle face aux visuels déjà présents.
// Sortie : public/cards/auto-certification/fr/ + src/data/autoCertificationAssets.json (PDF source, page, emplacement, nom,
// type, SHA-256, format, dimensions, identification, doublon éventuel).
//
// Usage : npm run extract:auto-certification-fr [-- --pdf-dir "C:/…/App Web SWL V2"] [--dry-run]
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { cacheDir, compact, extractCards, identify, loadAssistantData, ocr, readJson, root, slug, storeVisual, writeJson } from './lib/auto-certification-pdf.mjs'

const argument = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null)
const pdfDir = argument('--pdf-dir') ?? process.env.SWL_FR_PDF_DIR ?? 'C:/Users/antoi/Desktop/App Web SWL V2'
const dryRun = process.argv.includes('--dry-run')
const manifestPath = path.join(root, 'src/data/autoCertificationAssets.json')
const KIND = { unite: 'unit', amelioration: 'upgrade', commandement: 'command' }
const DUPLICATE_DISTANCE = 12 // bits différents sur 256 (dHash 16 × 16)

const python = (args) => new Promise((resolve, reject) => execFile('python', ['-I', ...args], { maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => (error ? reject(new Error(stderr || error.message)) : resolve(stdout))))
async function dhashes(files) {
  const list = path.join(os.tmpdir(), `swl-dhash-${process.pid}.txt`)
  fs.writeFileSync(list, files.join('\n'), 'utf8')
  try { return JSON.parse(await python([path.join(root, 'scripts/tools/dhash.py'), list])) } finally { fs.rmSync(list, { force: true }) }
}
const distance = (a, b) => { let bits = 0; for (let i = 0; i < a.length; i += 1) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { bits += x & 1; x >>= 1 } } return bits }
function findPdf(name) {
  const fileName = name.replace(/\s*\(.*\)\s*$/, '') // « Generic Upgrades FR.pdf (= …) »
  for (const dir of ['aGENTS', 'Nouveau dossier', '.']) { const candidate = path.join(pdfDir, dir, fileName); if (fs.existsSync(candidate)) return candidate }
  return null
}

const { window: data, resolver, catalog } = loadAssistantData()
const manifest = readJson(manifestPath)
const pdfEntries = Object.entries(readJson(path.join(root, 'src/data/pdfCardManifest.json'))).filter(([key, entry]) => key !== '_meta' && KIND[entry.type] && Number.isInteger(entry.page))

// 1. Cartes du manifeste PDF sans visuel local (même règle que l'audit).
const names = data.SWL_REFERENCE.names || {}
const frenchIndex = new Map(Object.entries(names).map(([key, name]) => [resolver.normalize(name), key]))
const hasLocal = ([, entry]) => {
  const key = frenchIndex.get(resolver.normalize(entry.nameFr)) ?? (entry.nameEn ? resolver.keyOf(entry.nameEn) : null)
  if (key && data.SWL_REFERENCE.images?.[key]) return true
  if (entry.type === 'commandement') return data.SWL_COMMAND_CARDS.some((card) => resolver.normalize(card.name) === resolver.normalize(entry.nameFr) && data.SWL_AUTO_CERTIFICATION_ASSETS.localCommandFiles.includes(`${card.id}.jpg`))
  return Object.values(manifest.assets).some((asset) => asset.lang === 'fr' && asset.nameFr === entry.nameFr)
}
const targets = pdfEntries.filter((entry) => !hasLocal(entry))
const byPdf = new Map()
for (const [key, entry] of targets) { if (!byPdf.has(entry.pdfSource)) byPdf.set(entry.pdfSource, []); byPdf.get(entry.pdfSource).push({ key, ...entry }) }

// 2. Empreintes des visuels déjà présents (doublons).
const existingFiles = [
  ...data.SWL_AUTO_CERTIFICATION_ASSETS.localCardFiles.map((file) => path.join(root, 'public/cards', file)),
  ...data.SWL_AUTO_CERTIFICATION_ASSETS.localCommandFiles.map((file) => path.join(root, 'public/commandcards', file)),
]
const existingHashes = dryRun ? {} : await dhashes(existingFiles)

const report = []
let saved = 0
for (const [pdfSource, entries] of byPdf) {
  const pdfPath = findPdf(pdfSource)
  if (!pdfPath) { for (const entry of entries) report.push({ nameFr: entry.nameFr, result: `PDF introuvable : ${pdfSource}` }); continue }
  if (dryRun) { for (const entry of entries) report.push({ nameFr: entry.nameFr, result: `(essai) ${path.basename(pdfPath)} p. ${entry.page}` }); continue }
  const kind = KIND[entries[0].type]
  const extraction = await extractCards(pdfPath, path.join(cacheDir, 'out-fr', slug(path.parse(pdfPath).name)), kind)
  const cards = extraction.cards.filter((card) => entries.some((entry) => entry.page === card.page) && (kind !== 'unit' || card.face === 'stats'))
  const texts = await ocr(cards.map((card) => card.titleFile), 'fr-FR')
  const candidates = pdfEntries.filter(([, entry]) => entry.pdfSource === pdfSource).map(([, entry]) => entry.nameFr)
  const cardHashes = await dhashes(cards.map((card) => card.file))
  const used = new Set()
  async function save(entry, card, identification, method) {
    used.add(card.file)
    const ratio = Math.max(card.width, card.height) / Math.min(card.width, card.height)
    const framingOk = ratio >= 1.38 && ratio <= 1.48
    const hash = cardHashes[card.file]
    const duplicate = Object.entries(existingHashes).find(([, other]) => distance(hash, other) <= DUPLICATE_DISTANCE)
    const status = method === 'ocr' && identification.status === 'identifie' && framingOk && !duplicate ? 'identifie' : 'a-controler'
    const stored = await storeVisual(card.file, 'fr', `${kind}-${slug(entry.nameFr)}`)
    // Rattachement aux métadonnées Tabletop Admiral par le nom français (unique), sinon carte française « non reliée ».
    const metas = catalog.filter((meta) => meta.kind === kind && resolver.fullFrench(meta) && resolver.normalize(resolver.fullFrench(meta)) === resolver.normalize(entry.nameFr))
    const id = metas.length === 1 ? `${kind}:${metas[0].sourceId}:fr` : `pdf-fr:${kind}-${slug(entry.nameFr)}`
    const framing = [framingOk ? 'proportions de carte' : `proportions inattendues (${ratio.toFixed(2)})`, card.rescaled ? 'proportions rétablies (carte étirée dans le PDF)' : null].filter(Boolean).join(' ; ')
    manifest.assets[id] = {
      kind,
      sourceId: metas.length === 1 ? metas[0].sourceId : null,
      lang: 'fr',
      canonicalName: entry.nameFr,
      nameFr: entry.nameFr,
      type: entry.type,
      ...stored,
      sourceType: 'pdf-fr-local',
      pdfName: path.basename(pdfPath),
      pdfPage: card.page,
      pdfSlot: card.slot,
      pdfManifestKey: entry.key,
      retrievedAt: new Date().toISOString(),
      identification: { method: method === 'ocr' ? 'ocr-windows-titre' : 'elimination-sur-la-page', status, text: identification.text, score: identification.score, runnerUp: identification.runnerUp ?? null, framing, ...(duplicate ? { duplicateOf: path.relative(root, duplicate[0]).replace(/\\/g, '/') } : {}) },
    }
    saved += 1
    report.push({ nameFr: entry.nameFr, result: `${status === 'identifie' ? 'Extraite' : 'Extraite — À contrôler'} (${path.basename(pdfPath)} p. ${card.page}, emplacement ${card.slot}, titre lu « ${identification.text} », ${identification.score}${method === 'elimination' ? ', identifiée par élimination sur la page' : ''})${card.rescaled ? ' — proportions rétablies' : ''}${duplicate ? ` — doublon possible de ${path.basename(duplicate[0])}` : ''}${metas.length === 1 ? ` — reliée à ${kind}:${metas[0].sourceId}` : ' — non reliée aux métadonnées'}` })
  }
  const ocrOf = (card) => identify(texts.get(path.resolve(card.titleFile)) ?? '', candidates)
  const unresolved = []
  for (const entry of entries) {
    const identified = cards.filter((card) => card.page === entry.page && !used.has(card.file)).map((card) => ({ card, identification: ocrOf(card) })).filter(({ identification }) => identification.name === entry.nameFr && identification.status !== 'inconnu').sort((a, b) => b.identification.score - a.identification.score)[0]
    if (identified) await save(entry, identified.card, identified.identification, 'ocr')
    else unresolved.push(entry)
  }
  for (const entry of unresolved) {
    // Entrée en double dans le manifeste (même carte, précision entre parenthèses) : jamais extraite deux fois.
    const twin = entries.find((other) => other !== entry && compact(other.nameFr) === compact(entry.nameFr))
    if (twin) { report.push({ nameFr: entry.nameFr, result: `Même carte que « ${twin.nameFr} » (entrée en double dans le manifeste PDF) : non extraite une seconde fois` }); continue }
    // Élimination : seule carte non identifiée de la page et seule cible restante de cette page → « À contrôler », jamais certifiée.
    const leftCards = cards.filter((card) => card.page === entry.page && !used.has(card.file) && ocrOf(card).status !== 'identifie')
    const leftTargets = unresolved.filter((other) => other.page === entry.page && !entries.some((e) => e !== other && compact(e.nameFr) === compact(other.nameFr) && !unresolved.includes(e)))
    if (leftCards.length === 1 && leftTargets.length === 1) { await save(entry, leftCards[0], ocrOf(leftCards[0]), 'elimination'); continue }
    report.push({ nameFr: entry.nameFr, result: `Non trouvée en page ${entry.page} de ${path.basename(pdfPath)} (titre illisible ou carte absente)` })
  }
}
if (!dryRun && saved) writeJson(manifestPath, manifest)
fs.mkdirSync(cacheDir, { recursive: true })
writeJson(path.join(cacheDir, 'extract-fr-report.json'), { generatedAt: new Date().toISOString(), targets: targets.length, report })
for (const line of report) console.log(`${line.nameFr} → ${line.result}`)
console.log(`Cartes françaises : ${targets.length} cible(s), ${saved} extraite(s)${dryRun ? ' (essai)' : ''}.`)
