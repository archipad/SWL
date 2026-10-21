// Outils communs de la certification automatique β : extraction carte par carte des PDF, OCR local des titres,
// identification stricte et enregistrement traçable des visuels (SHA-256, format, dimensions, source).
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const cacheDir = path.join(root, 'node_modules/.cache/swl-auto-certification')
const run = (command, args, options = {}) => new Promise((resolve, reject) => execFile(command, args, { maxBuffer: 64 * 1024 * 1024, ...options }, (error, stdout, stderr) => (error ? reject(new Error(`${command} ${args.join(' ')}\n${stderr || error.message}`)) : resolve(stdout))))

/** Données de l'Assistant chargées comme dans la page (référentiel, commandements, métadonnées, inventaire, glossaire, résolveur). */
/** Données de la bêta comme les voit la page. `personal` : ajoute les visuels AMG « usage personnel » présents sur ce poste
    (comme la page en local) ; `false` reproduit le site publié, qui ne les contient jamais. */
export function loadAssistantData({ personal = true } = {}) {
  const sandbox = { window: {} }
  vm.createContext(sandbox)
  const personalFile = path.join(root, 'public/assistant/auto-certification-personal.js')
  for (const file of ['reference-data.js', 'command-cards.js', 'translation-glossary.js', 'auto-certification-source.js', 'auto-certification-assets.js', 'auto-certification-resolver.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'public/assistant', file), 'utf8'), sandbox)
  }
  if (personal && fs.existsSync(personalFile)) vm.runInContext(fs.readFileSync(personalFile, 'utf8'), sandbox)
  const w = sandbox.window
  const main = w.SWL_AUTO_CERTIFICATION_ASSETS, extra = w.SWL_AUTO_CERTIFICATION_PERSONAL
  const inventory = extra ? { ...main, assets: { ...main.assets, ...extra.assets } } : main
  const resolver = w.SWL_AUTO_CERT_RESOLVER.create({ reference: w.SWL_REFERENCE, commandCards: w.SWL_COMMAND_CARDS, catalog: w.SWL_AUTO_CERTIFICATION_SOURCE.cards, inventory, glossary: w.SWL_TRANSLATION_GLOSSARY })
  return { window: w, resolver, catalog: w.SWL_AUTO_CERTIFICATION_SOURCE.cards, personalLoaded: !!extra }
}

/** Cartes d'une liste Tabletop Admiral (unités, améliorations, commandements, contingences), sans doublon. */
export function listCards(list) {
  const cards = [
    ...(list.units || []).flatMap((unit) => [{ name: unit.name, kind: 'unit' }, ...(unit.upgrades || []).map((upgrade) => ({ name: typeof upgrade === 'string' ? upgrade : upgrade.name, kind: 'upgrade' }))]),
    ...(list.commandCards || []).map((name) => ({ name, kind: 'command' })),
    ...(list.contingencies || []).map((name) => ({ name, kind: 'contingency' })),
  ]
  return cards.filter((card, index) => cards.findIndex((other) => other.kind === card.kind && other.name === card.name) === index)
}

export async function extractCards(pdfPath, outDir, kind, { rotateUnits = 0 } = {}) {
  const output = await run('python', ['-I', path.join(root, 'scripts/tools/extract_pdf_cards.py'), pdfPath, outDir, '--kind', kind, ...(rotateUnits ? ['--rotate-units', String(rotateUnits)] : [])])
  return JSON.parse(output)
}

/** OCR Windows (local) d'une série d'images : renvoie Map(fichier → texte). */
export async function ocr(files, language = 'fr-FR') {
  if (!files.length) return new Map()
  const list = path.join(os.tmpdir(), `swl-ocr-${process.pid}-${Date.now()}.txt`)
  fs.writeFileSync(list, files.join('\n'))
  try {
    const output = await run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts/tools/windows-ocr.ps1'), '-Language', language, '-ListFile', list])
    const result = new Map()
    for (const line of output.split(/\r?\n/).filter(Boolean)) { const { file, text } = JSON.parse(line.replace(/^﻿/, '')); result.set(path.resolve(file), text) }
    return result
  } finally { fs.rmSync(list, { force: true }) }
}

const STOPWORDS = new Set(['of', 'the', 'a', 'an', 'and', 'le', 'la', 'les', 'de', 'du', 'des', 'l', 'd', 'et', 'un', 'une'])
// Les précisions entre parenthèses du manifeste (« (déblocage) », « (Le Bad Batch) ») ne sont pas imprimées sur la carte.
export const compact = (value) => String(value || '').replace(/\([^)]*\)/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((word) => word && !STOPWORDS.has(word)).join('')
function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]; row[0] = i
    for (let j = 1; j <= b.length; j += 1) { const temp = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = temp }
  }
  return row[b.length]
}
export const similarity = (a, b) => { const x = compact(a), y = compact(b); if (!x || !y) return 0; return 1 - levenshtein(x, y) / Math.max(x.length, y.length) }

/**
 * Identification stricte d'un titre lu par OCR parmi des noms candidats (toutes les cartes du même type, pas seulement
 * celles recherchées) : « identifie » si le meilleur score ≥ 0,90 avec 0,10 d'avance sur le nom suivant (ou lecture exacte
 * sans autre nom exact), « a-controler »
 * entre 0,75 et 0,90 (jamais utilisé automatiquement), sinon « inconnu ».
 */
export function identify(text, names) {
  // Noms identiques une fois comparés (doublons du manifeste) : un seul candidat, le premier.
  const byCompact = new Map()
  for (const name of names) if (!byCompact.has(compact(name))) byCompact.set(compact(name), name)
  const distinct = [...byCompact.values()]
  const scored = distinct.map((name) => ({ name, score: similarity(text, name) })).sort((a, b) => b.score - a.score)
  const [best, second] = scored
  if (!best) return { status: 'inconnu', text, score: 0 }
  const margin = best.score - (second?.score ?? 0)
  // Lecture exacte et unique (score 1, aucun autre nom exact) : identifiée même face à un voisin d'une lettre (Stormtrooper/Stormtroopers).
  const exactAndUnique = best.score === 1 && (second?.score ?? 0) < 1
  const status = (best.score >= 0.9 && margin >= 0.1) || exactAndUnique ? 'identifie' : best.score >= 0.75 ? 'a-controler' : 'inconnu'
  return { status, name: best.name, score: Number(best.score.toFixed(3)), runnerUp: second ? { name: second.name, score: Number(second.score.toFixed(3)) } : null, text }
}

export const slug = (value) => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')

/** Copie un visuel extrait dans public/cards/auto-certification/<lang>/ en JPEG RGB et renvoie sa fiche (format, dimensions, SHA-256). */
export async function storeVisual(sourcePng, lang, fileStem) {
  const relative = `auto-certification/${lang}/${fileStem}.jpg`
  const target = path.join(root, 'public/cards', relative)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const info = JSON.parse(await run('python', ['-I', path.join(root, 'scripts/tools/to_jpeg.py'), sourcePng, target, '90']))
  const bytes = fs.statSync(target).size
  return { file: relative, sha256: sha256(target), format: info.format, width: info.width, height: info.height, bytes }
}

export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
export const writeJson = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
