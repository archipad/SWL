// Index VERSIONNÉ des certifications historiques valides (src/data/autoCertificationHistoricalIndex.json).
// À relancer volontairement (`npm run index:auto-certification-historical`) après une certification validée : le build ne le
// réécrit jamais. Il fige les empreintes des données moteur, du visuel français et des définitions de mots-clés ; toute
// différence ultérieure rend la certification « obsolète » dans la bêta, qui exige alors une nouvelle comparaison.
// Identité : une carte Tabletop Admiral n'est rattachée à une certification que si elle est du même type et seule à y mener,
// ou retenue par une décision certifiée (src/data/autoCertificationDecisions.json) -- jamais l'AT-RT de la République à la
// certification de l'AT-RT rebelle, ni l'ancienne Strike Team à la nouvelle.
import fs from 'node:fs'
import path from 'node:path'
import { loadAssistantData, root } from './lib/auto-certification-pdf.mjs'
import { fingerprints } from './lib/auto-certification-historical.mjs'

const out = path.join(root, 'src/data/autoCertificationHistoricalIndex.json')
const { window: w, resolver, catalog } = loadAssistantData({ personal: false })
const reference = w.SWL_REFERENCE
const decided = new Set(Object.values(JSON.parse(fs.readFileSync(path.join(root, 'src/data/autoCertificationDecisions.json'), 'utf8')).variants || {}).map((decision) => decision.sourceId))

const candidates = new Map()
for (const card of catalog) {
  if (card.kind === 'command') continue
  const found = resolver.swlKey(card)
  const certification = found?.key && found.certain ? reference.weapons?.[found.key]?.fullCardCertification : null
  if (!certification || certification.cardType !== card.kind) continue
  if (!candidates.has(found.key)) candidates.set(found.key, [])
  candidates.get(found.key).push(card)
}

const certifications = {}
const uncertain = []
for (const key of Object.keys(reference.weapons || {}).sort()) {
  const current = fingerprints(reference, key, root)
  if (!current) continue
  const cards = candidates.get(key) || []
  const retained = cards.length > 1 ? cards.filter((card) => decided.has(card.sourceId)) : cards
  if (cards.length > 1 && retained.length !== 1) uncertain.push(`${key} (${cards.map((card) => `${card.kind}:${card.sourceId}`).join(', ')})`)
  const tta = retained.length === 1 ? { [`${retained[0].kind}:${retained[0].sourceId}`]: (retained[0].keywords || []).map((keyword) => keyword.name).sort() } : {}
  const { certifiedVisualSha256, ...stored } = current
  certifications[key] = { ...stored, tta }
}

const index = {
  _meta: {
    description: 'Certifications historiques valides au moment de l’indexation : empreintes SHA-256 des données moteur, du visuel français et des définitions de mots-clés, et identités Tabletop Admiral rattachées sans ambiguïté. Toute différence rend la certification obsolète dans la Certification automatique β.',
    indexedOn: new Date().toISOString().slice(0, 10),
    uncertainIdentities: uncertain,
  },
  certifications,
}
const text = `${JSON.stringify(index, null, 2)}\n`
const previous = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''
// Réécriture seulement si le contenu (hors date) change : relancer l'indexation sans changement ne crée aucun diff.
const strip = (value) => value.replace(/"indexedOn": "[^"]*"/, '')
if (strip(previous) !== strip(text)) fs.writeFileSync(out, text)
console.log(`Index des certifications historiques : ${Object.keys(certifications).length} certification(s), ${Object.values(certifications).filter((entry) => Object.keys(entry.tta).length).length} rattachée(s) à une carte Tabletop Admiral, ${uncertain.length} identité(s) laissée(s) incertaine(s).`)
