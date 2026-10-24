// Aperçu d'une fiche FR communautaire : télécharge le visuel Legion HQ puis superpose le texte français (render.py).
// Usage : node scripts/fr-cards/preview.mjs <fiche.json | issue.txt> <sortie.png|.jpg> [--rapport rapport.json]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { HQ_PREFIX, extractPayload, readPayload } from './payload.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3')

export function loadPayload(file) {
  const raw = fs.readFileSync(file, 'utf8')
  return raw.trimStart().startsWith('{') ? readPayload(file) : extractPayload(raw)
}

export async function downloadHqImage(url) {
  if (!HQ_PREFIX.test(url)) throw new Error('Adresse de visuel refusée')
  const response = await fetch(url, { redirect: 'error', headers: { 'User-Agent': 'SWL-fiches-fr/1.0' } })
  if (!response.ok) throw new Error(`Visuel Legion HQ introuvable (${response.status})`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length > 6_000_000) throw new Error('Visuel trop volumineux')
  const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'
  const png = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8
  if (!webp && !png && !jpeg) throw new Error('Le visuel Legion HQ n’est pas une image')
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'swl-hq-')), `source.${webp ? 'webp' : png ? 'png' : 'jpg'}`)
  fs.writeFileSync(file, bytes)
  return file
}

export async function renderPayload(payload, output, reportFile) {
  const image = await downloadHqImage(payload.hqImage)
  const spec = path.join(path.dirname(image), 'fiche.json')
  fs.writeFileSync(spec, JSON.stringify(payload))
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true })
  const args = [path.join(here, 'render.py'), spec, image, output, ...(reportFile ? ['--rapport', reportFile] : [])]
  const result = JSON.parse(execFileSync(python, args, { encoding: 'utf8' }).trim().split('\n').pop())
  if (payload.kind === 'upgrade' && ['exhaust', 'discard', 'both'].includes(payload.use)) {
    result.problems.push('carte ↱ / ✖ : son suivi doit être ajouté au moteur avant l’intégration (/valider-fiche-fr sera refusé)')
    if (reportFile) fs.writeFileSync(reportFile, JSON.stringify(result, null, 1) + '\n')
  }
  return result
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, output] = process.argv.slice(2)
  const reportIndex = process.argv.indexOf('--rapport')
  if (!input || !output) throw new Error('Usage : node scripts/fr-cards/preview.mjs <fiche.json|issue.txt> <sortie.png> [--rapport rapport.json]')
  const payload = loadPayload(input)
  const result = await renderPayload(payload, output, reportIndex > 0 ? process.argv[reportIndex + 1] : null)
  console.log(`${payload.englishName} → ${output} : ${result.problems.length ? result.problems.join(' ; ') : 'aucune anomalie'}`)
}
