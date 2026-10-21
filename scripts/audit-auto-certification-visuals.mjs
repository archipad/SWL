// Audit des visuels LOCAUX de la certification automatique β (aucun accès réseau), avec le résolveur partagé de la page
// (public/assistant/auto-certification-resolver.js) : mêmes règles que ce que le validateur verra à l'écran.
// Usage : node scripts/audit-auto-certification-visuals.mjs [liste-tabletop-admiral.json ...]
// Sans argument, les listes de scripts/fixtures/ sont auditées. Le rapport est écrit dans docs/audit/certification-auto-visuels.md.
import fs from 'node:fs'
import path from 'node:path'
import { listCards, loadAssistantData, readJson, root } from './lib/auto-certification-pdf.mjs'

const { window: data, resolver, catalog } = loadAssistantData()
const inventory = data.SWL_AUTO_CERTIFICATION_ASSETS
const kindLabel = { unit: 'unité', upgrade: 'amélioration', command: 'commandement', contingency: 'contingence' }
const assets = Object.values(inventory.assets)
const lines = ['# Audit des visuels locaux — certification automatique β', '', `Généré le ${new Date().toISOString().slice(0, 10)} depuis les fichiers du dépôt (aucun accès réseau). Tabletop Admiral ne fournit que des métadonnées ; seuls les fichiers du dépôt sont des visuels.`, '']

// --- 1. Inventaire ---
const en = assets.filter((asset) => asset.lang === 'en')
const frAll = [...assets.filter((asset) => asset.lang === 'fr'), ...inventory.unlinked]
const toCheck = frAll.filter((asset) => asset.identification?.status === 'a-controler')
const aliasCounts = (table) => Object.values(table).reduce((counts, alias) => ({ ...counts, [alias.status]: (counts[alias.status] || 0) + 1 }), {})
const commandAliases = aliasCounts(inventory.aliases.commands)
lines.push('## 1. Visuels locaux', '',
  `- \`public/cards/\` : **${inventory.localCardFiles.length} visuels français** (recadrés des PDF FR).`,
  `- \`public/commandcards/\` : **${inventory.localCommandFiles.length} cartes de Commandement françaises**.`,
  `- \`public/cards/auto-certification/en/\` : **${en.length} visuels anglais** extraits des PDF officiels AMG (cdn.svc.asmodee.net), identifiés par OCR du titre.`,
  `- \`public/cards/auto-certification/fr/\` : **${frAll.length} cartes françaises** extraites des PDF du disque (${frAll.length - toCheck.length} identifiées, ${toCheck.length} à contrôler), dont ${frAll.length - inventory.unlinked.length} reliées aux métadonnées.`,
  `- Table explicite d’alias : ${Object.keys(inventory.aliases.commands).length} commandements (${commandAliases.confirmed || 0} confirmés, ${commandAliases.proposed || 0} proposés) et ${Object.keys(inventory.aliases.cards).length} carte(s).`, '')
if (toCheck.length) {
  lines.push('### Cartes françaises extraites « À contrôler »', '', '| Carte | PDF | Page | Raison |', '|---|---|---|---|')
  for (const asset of toCheck) lines.push(`| ${asset.nameFr || asset.canonicalName} | ${asset.pdfName} | ${asset.pdfPage} | ${[asset.identification.method === 'elimination-sur-la-page' ? 'identifiée par élimination' : asset.identification.score < 0.9 ? `titre lu « ${asset.identification.text} » (${asset.identification.score})` : null, asset.identification.duplicateOf ? `doublon possible de \`${asset.identification.duplicateOf}\`` : null].filter(Boolean).join(' ; ')} |`)
  lines.push('')
}

// --- 2. Couverture du catalogue ---
lines.push('## 2. Couverture du catalogue de métadonnées', '', `${catalog.length} cartes Tabletop Admiral (version ${data.SWL_AUTO_CERTIFICATION_SOURCE.sourceVersion}).`, '', '| Type | Cartes | Visuel FR local | Visuel EN local | Prêtes pour validation |', '|---|---|---|---|---|')
for (const kind of ['unit', 'upgrade', 'command']) {
  const rows = catalog.filter((card) => card.kind === kind).map((card) => resolver.status(card))
  lines.push(`| ${kindLabel[kind]} | ${rows.length} | ${rows.filter((row) => row.fr).length} | ${rows.filter((row) => row.en).length} | ${rows.filter((row) => row.ready).length} |`)
}
lines.push('')

// --- 3. Listes ---
const listFiles = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(path.join(root, 'scripts/fixtures')).filter((file) => file.endsWith('.json')).map((file) => path.join(root, 'scripts/fixtures', file))
lines.push('## 3. File de préparation des listes', '')
const mark = (warn) => (warn ? '! ' : '✓ ')
for (const file of listFiles) {
  const list = readJson(file)
  const rows = listCards(list).map((card) => { const match = resolver.findMeta(card.name, card.kind); return { ...card, match, status: resolver.status(match.meta) } })
  lines.push(`### ${list.listname || path.basename(file)} (\`${path.basename(file)}\`)`, '',
    `${rows.length} cartes · métadonnées **${rows.filter((row) => row.match.meta).length}/${rows.length}** · EN local **${rows.filter((row) => row.status.en).length}/${rows.length}** · FR local **${rows.filter((row) => row.status.fr).length}/${rows.length}** · prêtes pour validation **${rows.filter((row) => row.status.ready).length}/${rows.length}**.`, '',
    '| Carte | Type | Métadonnées | EN local | FR local | Traduction | Mots-clés nouveaux | Prête |', '|---|---|---|---|---|---|---|---|')
  for (const row of rows) {
    const s = row.status
    lines.push(`| ${row.name} | ${kindLabel[row.kind]} | ${row.match.meta ? `✓ ${row.match.meta.kind}:${row.match.meta.sourceId}` : row.match.certainty === 'ambiguous' ? `! ambiguës (${row.match.options.length})` : '✗ introuvables'} | ${s.en ? `${mark(s.en.certainty !== 'certain')}\`${s.en.file || s.en.origin}\`` : '✗ à rechercher'} | ${s.fr ? `${mark(s.fr.certainty !== 'certain')}\`${s.fr.file || s.fr.origin}\`` : s.frAmbiguous ? '! ambigu' : '✗'} | ${s.translationComplete ? `✓ ${s.frenchName}` : s.frenchName ? `! ${s.frenchName}` : '✗'} | ${s.newKeywords.length ? s.newKeywords.map((keyword) => keyword.name).join(', ') : '—'} | ${s.ready ? '✓' : '✗'} |`)
  }
  const missing = rows.filter((row) => !row.status.en || !row.status.fr)
  lines.push('', `Cartes encore sans visuel anglais ou français : ${missing.length ? missing.map((row) => `${row.name} (${[!row.status.en ? 'EN' : null, !row.status.fr ? 'FR' : null].filter(Boolean).join(' + ')})`).join(', ') : 'aucune'}.`, '')
}

lines.push('## 4. Sources', '',
  '1. **Fichiers du dépôt** : `public/cards/`, `public/commandcards/` et la table explicite `src/data/autoCertificationAliases.json`.',
  '2. **PDF français du disque** (`App Web SWL V2`) : `npm run extract:auto-certification-fr`.',
  '3. **PDF officiels AMG/Asmodee** (`cdn.svc.asmodee.net`, liste blanche `scripts/data/auto-certification-sources.json`) : `npm run fetch:auto-certification-assets -- liste.json`.',
  '4. Tabletop Admiral : métadonnées uniquement ; ses images ne sont jamais utilisées.', '')

fs.mkdirSync(path.join(root, 'docs/audit'), { recursive: true })
fs.writeFileSync(path.join(root, 'docs/audit/certification-auto-visuels.md'), `${lines.join('\n').trimEnd()}\n`)
console.log(lines.filter((line) => /^(- |#|\d+ cartes|Cartes encore|\| (unité|amélioration|commandement) )/.test(line)).join('\n'))
