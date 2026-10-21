// Récupération contrôlée des visuels ANGLAIS de la certification automatique β, limitée aux cartes des listes
// (par défaut : scripts/fixtures/*.json ; sinon les listes Tabletop Admiral passées en argument).
//
// Sources : uniquement la liste blanche scripts/data/auto-certification-sources.json (ressources officielles AMG/Asmodee
// sur cdn.svc.asmodee.net). Chaque PDF officiel est téléchargé dans le cache local (jamais publié), chaque carte est
// extraite telle quelle (image intégrée, résolution native), son titre est lu par l'OCR local de Windows et comparé à
// TOUTES les cartes du même type : seul un titre identifié sans ambiguïté donne un visuel. Le fichier est copié dans
// public/cards/auto-certification/en/ et inscrit dans src/data/autoCertificationAssets.json avec l'URL source exacte, le
// domaine, la date, le type de source, le nom canonique, le SHA-256, le format et les dimensions.
// Refusés : HTTP, domaines non autorisés, hôtes Tabletop Admiral, fichiers invalides ou trop petits. Une carte sans source
// connue reste « Visuel anglais à rechercher » ; aucune image approximative n'est jamais associée.
//
// Usage : npm run fetch:auto-certification-assets [-- liste.json …] [--dry-run]
// Variables (tests) : SWL_AUTO_CERT_SOURCES, SWL_AUTO_CERT_MANIFEST.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cacheDir, extractCards, identify, listCards, loadAssistantData, ocr, readJson, root, sha256, slug, storeVisual, writeJson } from './lib/auto-certification-pdf.mjs'

const sourcesPath = process.env.SWL_AUTO_CERT_SOURCES ?? path.join(root, 'scripts/data/auto-certification-sources.json')
const manifestPath = process.env.SWL_AUTO_CERT_MANIFEST ?? path.join(root, 'src/data/autoCertificationAssets.json')
const dryRun = process.argv.includes('--dry-run')

export const BLOCKED_HOSTS = ['tabletopadmiral.com', 'res.cloudinary.com', 'd26oqf9i6fvic.cloudfront.net']
const SOURCE_TYPES = new Set(['amg-official', 'authorized-external'])
const KINDS = new Set(['unit', 'upgrade', 'command'])
const LANGS = new Set(['en', 'fr'])
const MIN_PDF_BYTES = 100 * 1024
const MIN_IMAGE = { long: 600, short: 400 }

const isBlockedHost = (host) => BLOCKED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))

function checkSource(source) {
  const errors = []
  if (!SOURCE_TYPES.has(source.sourceType)) errors.push(`type de source invalide (${source.sourceType})`)
  if (!source.authorizedBy || !source.authorizedAt) errors.push('source non autorisée explicitement (authorizedBy/authorizedAt)')
  if (!source.testedAt) errors.push('source non testée (testedAt)')
  return errors
}
function checkUrl(source, value) {
  const errors = []
  let url
  try { url = new URL(value) } catch { return [`URL illisible : ${value}`] }
  if (url.protocol !== 'https:') errors.push(`URL non HTTPS : ${value}`)
  if (isBlockedHost(url.hostname)) errors.push(`hôte refusé (Tabletop Admiral, métadonnées uniquement) : ${url.hostname}`)
  if (!(source.hosts ?? []).includes(url.hostname)) errors.push(`hôte absent de la liste autorisée de la source : ${url.hostname}`)
  return errors
}
/** Contrôle d'un visuel isolé de la liste blanche (renvoie la liste des refus, vide si acceptable). */
export function checkEntry(source, card) {
  const errors = checkSource(source)
  if (!KINDS.has(card.kind) || !LANGS.has(card.lang) || !/^\d+$/.test(String(card.sourceId ?? ''))) errors.push('carte mal décrite (kind, sourceId, lang)')
  return [...errors, ...checkUrl(source, card.url)]
}
/** Contrôle d'un PDF officiel de la liste blanche. */
const pdfKinds = (pdf) => pdf.cardKinds ?? [pdf.cardKind]
export function checkPdf(source, pdf) {
  const errors = checkSource(source)
  if (!pdfKinds(pdf).length || !pdfKinds(pdf).every((kind) => KINDS.has(kind)) || pdf.lang !== 'en') errors.push('PDF mal décrit (cardKind(s), lang « en »)')
  if (pdf.rotateUnits !== undefined && ![90, -90].includes(pdf.rotateUnits)) errors.push('rotateUnits invalide (90 ou -90)')
  if (!/\.pdf$/i.test(new URL(pdf.url, 'https://invalid.example').pathname)) errors.push(`le fichier n'est pas un PDF : ${pdf.url}`)
  return [...errors, ...checkUrl(source, pdf.url)]
}

async function download(url, target) {
  const response = await fetch(url, { headers: { 'User-Agent': 'SWL-Assistant-Certification-Beta/1.0' }, redirect: 'follow' })
  const finalHost = new URL(response.url || url).hostname
  const bytes = Buffer.from(await response.arrayBuffer())
  const problems = [
    response.ok ? null : `HTTP ${response.status}`,
    isBlockedHost(finalHost) ? `redirigé vers un hôte refusé (${finalHost})` : null,
    /application\/pdf/.test(response.headers.get('content-type') ?? '') ? null : `type ${response.headers.get('content-type') || 'inconnu'}`,
    bytes.subarray(0, 4).toString('latin1') === '%PDF' ? null : 'signature PDF invalide',
    bytes.length >= MIN_PDF_BYTES ? null : `PDF trop petit (${bytes.length} octets)`,
  ].filter(Boolean)
  if (problems.length) throw new Error(`${url} → ${problems.join(' ; ')}`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, bytes)
}

async function main() {
  const listFiles = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
  const lists = (listFiles.length ? listFiles : fs.readdirSync(path.join(root, 'scripts/fixtures')).filter((file) => file.endsWith('.json')).map((file) => path.join(root, 'scripts/fixtures', file))).map((file) => readJson(file))
  const { resolver, catalog } = loadAssistantData()
  const manifest = readJson(manifestPath)
  const allowlist = readJson(sourcesPath)
  const printedTitles = readJson(path.join(root, 'src/data/autoCertificationAliases.json')).printedTitles ?? {}

  // 1. Cartes des listes à préparer (métadonnées trouvées, visuel anglais absent).
  const report = []
  const targets = new Map()
  // Faction de la liste : certaines décisions de variante n'existent que pour une faction (AT-RT rebelle).
  for (const card of lists.flatMap((list) => listCards(list).map((card) => ({ ...card, factions: [list.armyFaction, list.faction].filter(Boolean) })))) {
    const match = resolver.findMeta(card.name, card.kind, { factions: card.factions })
    if (!match.meta) { report.push({ ...card, result: match.certainty === 'ambiguous' ? `Métadonnées ambiguës (${match.options.length} cartes Tabletop Admiral)` : 'Métadonnées introuvables' }); continue }
    const key = `${match.meta.kind}:${match.meta.sourceId}`
    // Visuel déjà inscrit au manifeste (même si l'inventaire publié n'a pas encore été régénéré) : rien à refaire.
    const recorded = manifest.assets[`${key}:en`]
    if (resolver.status(match.meta).en || (recorded && fs.existsSync(path.join(root, 'public/cards', recorded.file)))) { report.push({ ...card, result: 'Visuel anglais déjà local' }); continue }
    targets.set(key, { ...card, meta: match.meta })
  }

  // 2. PDF officiels autorisés, pour les seuls types de cartes recherchés.
  const refused = []
  const found = new Map()
  const review = new Map()
  const neededKinds = new Set([...targets.values()].map((target) => target.meta.kind))
  for (const source of allowlist.sources ?? []) {
    for (const pdf of source.pdfs ?? []) {
      const errors = checkPdf(source, pdf)
      if (errors.length) { refused.push(`${pdf.url} → ${errors.join(' ; ')}`); continue }
      const kinds = pdfKinds(pdf).filter((kind) => neededKinds.has(kind))
      if (!kinds.length) continue
      const pdfName = path.basename(new URL(pdf.url).pathname)
      const local = path.join(cacheDir, 'pdf', pdfName)
      if (dryRun) { console.log(`(essai) ${pdf.url}`); continue }
      if (!fs.existsSync(local)) await download(pdf.url, local)
      for (const cardKind of kinds) {
      const extraction = await extractCards(local, path.join(cacheDir, 'out', `${path.parse(pdfName).name}${pdfKinds(pdf).length > 1 ? `-${cardKind}` : ''}`), cardKind, { rotateUnits: pdf.rotateUnits })
      const cards = extraction.cards.filter((card) => cardKind !== 'unit' || card.face === 'stats') // face « caractéristiques », comme les visuels français
      const texts = await ocr(cards.map((card) => card.titleFile))
      // Candidats : toutes les cartes de ce type, plus les titres imprimés vérifiés quand ils diffèrent du nom Tabletop Admiral.
      const printed = new Map(Object.entries(printedTitles).filter(([key]) => key.startsWith(`${cardKind}:`)).map(([key, entry]) => [entry.title, catalog.find((card) => `${card.kind}:${card.sourceId}` === key)]).filter(([, card]) => card))
      // Noms distincts : deux variantes homonymes (Strike Team n° 14 / n° 25979) ont le même titre imprimé ; la variante est choisie ensuite par la cible de la liste.
      const names = [...new Set([...catalog.filter((card) => card.kind === cardKind).map((card) => resolver.fullEnglish(card)), ...printed.keys()])]
      // Seconde lecture (bandeau 3×, binarisé) seulement pour les titres que la première ne départage pas ; la meilleure est gardée.
      const firstPass = new Map(cards.map((card) => [card, identify(texts.get(path.resolve(card.titleFile)) ?? '', names)]))
      const retry = cards.filter((card) => firstPass.get(card).status !== 'identifie' && card.titleFileAlt)
      const altTexts = await ocr(retry.map((card) => card.titleFileAlt))
      for (const card of retry) {
        const second = { ...identify(altTexts.get(path.resolve(card.titleFileAlt)) ?? '', names), pass: 'seconde lecture' }
        const first = firstPass.get(card)
        if ((second.status === 'identifie' && first.status !== 'identifie') || second.score > first.score) firstPass.set(card, second)
      }
      for (const card of cards) {
        const identification = firstPass.get(card)
        if (identification.status === 'inconnu') continue
        let match = printed.has(identification.name) ? { meta: printed.get(identification.name) } : resolver.findMeta(identification.name, cardKind)
        // Titre homonyme de plusieurs variantes : seule la variante visée par la liste (décision certifiée) est retenue.
        if (!match.meta && match.options?.length) { const wanted = match.options.filter((option) => targets.has(`${option.kind}:${option.sourceId}`)); if (wanted.length === 1) match = { meta: wanted[0] } }
        if (!match.meta) continue
        const key = `${match.meta.kind}:${match.meta.sourceId}`
        if (!targets.has(key)) continue
        const candidate = { pdf, pdfName, pdfSha256: sha256(local), source, card, identification, meta: match.meta }
        if (identification.status === 'identifie') { if (!found.has(key)) found.set(key, candidate) } else if (!review.has(key)) review.set(key, candidate)
      }
      }
    }
  }

  // 3. Copie dans le dépôt et inscription traçable.
  let saved = 0
  for (const [key, candidate] of found) {
    const { card, meta, pdf, pdfName, source, identification } = candidate
    const long = Math.max(card.width, card.height), short = Math.min(card.width, card.height)
    if (long < MIN_IMAGE.long || short < MIN_IMAGE.short) { refused.push(`${key} → image trop petite (${card.width} × ${card.height})`); continue }
    const stored = await storeVisual(card.file, 'en', `${meta.kind}-${meta.sourceId}-${slug(resolver.fullEnglish(meta))}`)
    if (Object.values(manifest.assets).some((asset) => asset.sha256 === stored.sha256)) { refused.push(`${key} → doublon d’un visuel déjà inscrit`); continue }
    manifest.assets[`${key}:en`] = {
      kind: meta.kind,
      sourceId: meta.sourceId,
      lang: 'en',
      canonicalName: resolver.fullEnglish(meta),
      ...stored,
      sourceType: source.sourceType,
      sourceUrl: `${pdf.url}#page=${card.page}`,
      sourceDomain: new URL(pdf.url).hostname,
      pdfName,
      pdfPage: card.page,
      pdfSlot: card.slot,
      pdfSha256: candidate.pdfSha256,
      allowlistSource: source.id ?? null,
      // Mention des PDF AMG : visuel conservé localement (dossier ignoré par Git) tant que sa publication n'est pas autorisée.
      publication: 'usage-personnel',
      licenseNotice: source.notice?.replace(/^[^«]*« ?|» ?$/g, '').trim() || null,
      retrievedAt: new Date().toISOString(),
      identification: { method: 'ocr-windows-titre', status: identification.status, text: identification.text, score: identification.score, runnerUp: identification.runnerUp, pass: identification.pass ?? 'première lecture' },
    }
    saved += 1
  }
  if (!dryRun && saved) {
    writeJson(manifestPath, manifest)
    // Inventaire publié à jour (même contrôle d'empreintes que npm run generate:assistant-data).
    if (!process.env.SWL_AUTO_CERT_MANIFEST) execFileSync(process.execPath, [path.join(root, 'scripts/generate-auto-certification-assets.mjs')], { cwd: root, stdio: 'inherit' })
  }

  for (const [key, target] of targets) {
    const result = found.has(key) && manifest.assets[`${key}:en`] ? `Visuel anglais récupéré (${manifest.assets[`${key}:en`].pdfName}, page ${manifest.assets[`${key}:en`].pdfPage})`
      : review.has(key) ? `À contrôler : titre lu « ${review.get(key).identification.text} » (${review.get(key).identification.score}), non utilisé`
        : 'Visuel anglais à rechercher'
    report.push({ name: target.name, kind: target.kind, sourceId: target.meta.sourceId, result })
  }
  fs.mkdirSync(cacheDir, { recursive: true })
  writeJson(path.join(cacheDir, 'fetch-report.json'), { generatedAt: new Date().toISOString(), report, refused })
  for (const line of report) console.log(`${line.kind.padEnd(11)} ${line.name} → ${line.result}`)
  for (const line of refused) console.error(`Refusé : ${line}`)
  console.log(`Visuels anglais : ${saved} récupéré(s), ${targets.size - saved} sans visuel, ${refused.length} refus${dryRun ? ' (essai, rien n’est écrit)' : ''}.`)
  if (refused.length) process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
