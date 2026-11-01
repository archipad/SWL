// Génère public/fiches/upgrade-texts.js : texte français et utilisation de chaque amélioration, pour la catégorie
// « Améliorations » des fiches d'unité. Source unique : upgradeTextFor (transcription relue, fiche communautaire, puis cardNotes).
// À lancer après scripts/generate-assistant-reference.mjs, dont il relit les clés de cartes.
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const server = await createServer({
  root: projectRoot,
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
})

try {
  const { upgradeTextFor, upgradeUseFor } = await server.ssrLoadModule('/src/data/upgradeTexts.ts')
  const source = await readFile(resolve(projectRoot, 'public/assistant/reference-data.js'), 'utf8')
  const reference = new Function('window', `${source};return window.SWL_REFERENCE`)({})
  const cards = new Set([...Object.keys(reference.names), ...Object.keys(reference.weapons), ...Object.keys(reference.legionhq)])
  const entries = {}
  for (const card of [...cards].sort()) {
    if (reference.legionhq[card]?.kind === 'unit') continue
    const text = upgradeTextFor(card)
    if (text) entries[card] = { text, use: upgradeUseFor(card) ?? null }
  }
  const output = `// Généré depuis src/data/upgradeTexts.ts (node scripts/generate-fiches-upgrades.mjs).\nwindow.SWL_UPGRADE_TEXTS=${JSON.stringify(entries)};\n`
  await writeFile(resolve(projectRoot, 'public/fiches/upgrade-texts.js'), output)
  console.log(`Fiches d'unité : ${Object.keys(entries).length} textes d'amélioration générés.`)
} finally {
  await server.close()
}
