// Intègre une fiche FR communautaire validée : visuel publié, nom français et raccordement de la carte.
// Usage : node scripts/fr-cards/integrate.mjs <fiche.json | issue.txt> [--issue N] [--image visuel.jpg] [--root dossier] [--no-generate]
//
// - Unité / amélioration : visuel public/cards/<nom-anglais>-fr-community.jpg, entrée dans cardImages.ts et cardNamesFr.ts.
//   Les données moteur (dés, PV, courage, mots-clés) ne sont PAS écrites ici : elles se certifient ensuite dans l'écran
//   de certification, qui affiche le visuel FR et la référence Legion HQ.
// - Commandement : visuel public/commandcards/<id>.jpg et entrée dans commandCards.ts (+ alias Tabletop Admiral).
// - Traçabilité : src/data/frCommunityCards.json (texte français, source Legion HQ, ticket).
// Une carte qui possède déjà un visuel n'est jamais écrasée.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { slug, targetFiles } from './payload.mjs'
import { loadPayload, renderPayload } from './preview.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function editText(file, edit) {
  const raw = fs.readFileSync(file, 'utf8')
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  const next = edit(raw.replace(/\r\n/g, '\n'))
  fs.writeFileSync(file, eol === '\n' ? next : next.replace(/\n/g, '\r\n'))
}

/** Ajoute une entrée à la table RAW d'un module TypeScript (avant son accolade fermante). */
function addRawEntry(file, line, englishName) {
  editText(file, (text) => {
    const start = text.indexOf('const RAW')
    const end = text.indexOf('\n};', start)
    if (start < 0 || end < 0) throw new Error(`Table RAW introuvable dans ${file}`)
    const keys = [...text.slice(start, end).matchAll(/^\s*(['"])(.+?)\1\s*:/gm)].map((m) => norm(m[2]))
    if (keys.includes(norm(englishName))) throw new Error(`« ${englishName} » est déjà raccordée dans ${path.basename(file)} : visuel existant conservé`)
    return text.slice(0, end) + '\n' + line + text.slice(end)
  })
}

function integrateCatalogCard(root, payload, files) {
  const custom = JSON.parse(fs.readFileSync(path.join(root, 'src/data/customCards.json'), 'utf8'))
  if (Object.keys(custom).some((key) => norm(key) === norm(payload.englishName))) throw new Error(`« ${payload.englishName} » existe déjà dans customCards.json`)
  const single = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  addRawEntry(path.join(root, 'src/data/cardImages.ts'), `  ${single(payload.englishName)}: ${single(files.file)},`, payload.englishName)
  addRawEntry(path.join(root, 'src/data/cardNamesFr.ts'), `  ${JSON.stringify(payload.englishName)}: ${JSON.stringify(payload.nameFr)},`, payload.englishName)
}

function integrateCommand(root, payload, files) {
  const file = path.join(root, 'src/data/commandCards.ts')
  editText(file, (text) => {
    const existing = [...text.matchAll(/id: '([^']+)', name: '((?:[^'\\]|\\.)*)'(?:, englishName: '((?:[^'\\]|\\.)*)')?/g)]
      .find((m) => m[1] === files.id || norm(m[2].replace(/\\'/g, "'")) === norm(payload.nameFr) || (m[3] && norm(m[3].replace(/\\'/g, "'")) === norm(payload.englishName)))
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    if (existing) {
      const blockEnd = text.indexOf('\n  },', existing.index)
      const block = text.slice(existing.index, blockEnd)
      if (/image:/.test(block)) throw new Error(`Le commandement « ${payload.nameFr} » a déjà un visuel : conservé`)
      return text.slice(0, blockEnd) + ` image: \`\${BASE}${existing[1]}.jpg\`,` + text.slice(blockEnd)
    }
    const end = text.indexOf('\n];', text.indexOf('export const COMMAND_CARDS'))
    const { pip, faction, requirement } = payload.command
    const entry = `  {\n    id: '${files.id}', name: '${esc(payload.nameFr)}', englishName: '${esc(payload.englishName)}', pip: ${pip}, faction: '${faction}', community: true,\n    requirement: '${esc(requirement || '')}', image: \`\${BASE}${files.id}.jpg\`,\n  },`
    return text.slice(0, end) + '\n' + entry + text.slice(end)
  })
  if (payload.ttaId?.startsWith('command:')) {
    const aliasFile = path.join(root, 'src/data/autoCertificationAliases.json')
    const aliases = JSON.parse(fs.readFileSync(aliasFile, 'utf8'))
    const id = payload.ttaId.split(':')[1]
    if (!aliases.commands[id]) {
      aliases.commands[id] = { localId: files.id, status: 'confirmed', englishName: payload.englishName, evidence: 'Fiche FR communautaire validée dans l’atelier (visuel Legion HQ comparé).' }
      fs.writeFileSync(aliasFile, JSON.stringify(aliases, null, 2) + '\n')
    }
  }
}

function record(root, payload, files, issue) {
  const file = path.join(root, 'src/data/frCommunityCards.json')
  const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { _meta: { description: 'Fiches FR communautaires générées depuis les visuels Legion HQ (scripts/fr-cards) et validées visuellement.' }, cards: {} }
  data.cards[`${payload.kind}:${norm(payload.englishName)}`] = {
    englishName: payload.englishName, nameFr: payload.nameFr, kind: payload.kind, image: files.file, hqImage: payload.hqImage,
    fr: payload.fr, ...(payload.use ? { use: payload.use } : {}), ...(payload.command ? { command: payload.command } : {}),
    ...(payload.ttaId ? { ttaId: payload.ttaId } : {}), ...(payload.translationProof ? { translationProof: payload.translationProof } : {}),
    ...(issue ? { issue: Number(issue) } : {}), integratedAt: new Date().toISOString().slice(0, 10),
  }
  data.cards = Object.fromEntries(Object.entries(data.cards).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(file, JSON.stringify(data, null, 1) + '\n')
}

function bumpAssistantVersions(root, command) {
  editText(path.join(root, 'public/assistant/index.html'), (text) => {
    let next = text.replace(/(reference-data\.js\?v=)(\d+)/, (_, p, v) => `${p}${Number(v) + 1}`)
    if (command) next = next.replace(/(command-cards\.js\?v=)(\d+)/, (_, p, v) => `${p}${Number(v) + 1}`)
    return next
  })
}

export async function integrate(payload, { root = repoRoot, issue = null, image = null, generate = true } = {}) {
  const files = targetFiles(payload)
  const target = path.join(root, files.publicPath)
  if (fs.existsSync(target)) throw new Error(`${files.publicPath} existe déjà : visuel conservé`)
  // Données d'abord (elles refusent une carte déjà raccordée), visuel ensuite.
  if (payload.kind === 'command') integrateCommand(root, payload, files)
  else integrateCatalogCard(root, payload, files)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  if (image) fs.copyFileSync(image, target)
  else {
    const result = await renderPayload(payload, target)
    if (result.problems.length) console.warn('Points signalés au rendu : ' + result.problems.join(' ; '))
  }
  record(root, payload, files, issue)
  bumpAssistantVersions(root, payload.kind === 'command')
  if (generate) {
    if (payload.kind === 'command') execFileSync('node', [path.join(root, 'scripts/generate-assistant-command-cards.cjs')], { stdio: 'inherit' })
    execFileSync('npm', ['run', 'generate:assistant-data'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
  }
  return { ...files, slug: slug(payload.englishName) }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
  const payload = loadPayload(args[0])
  const done = await integrate(payload, { root: option('--root') ? path.resolve(option('--root')) : repoRoot, issue: option('--issue'), image: option('--image'), generate: !args.includes('--no-generate') })
  console.log(`Fiche FR intégrée : ${payload.englishName} → ${done.publicPath}`)
}
