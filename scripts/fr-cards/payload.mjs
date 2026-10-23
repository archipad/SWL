// Fiche FR communautaire envoyée par l'atelier de la certification (bloc <!-- SWL_FR_CARD … --> d'une issue GitHub).
// Validation stricte : le workflow ne traite que des champs connus, des textes bornés et des visuels du CDN public de Legion HQ.
import fs from 'node:fs'

export const HQ_PREFIX = /^https:\/\/d2maxvwz12z6fm\.cloudfront\.net\/(unitCards|upgradeCards|commandCards)\/[A-Za-z0-9%._\-()'!,&]+\.(webp|png|jpg|jpeg)$/
const FOLDER = { unit: 'unitCards', upgrade: 'upgradeCards', command: 'commandCards' }
const ZONES = {
  upgrade: ['title', 'body', 'weapons'],
  command: ['title', 'units', 'body', 'footer'],
  unit: ['name', 'subtitle', 'type', 'keywords', 'weapons'],
}
const MARKER = /<!--\s*SWL_FR_CARD\s*([\s\S]*?)\s*-->/

export const slug = (text) => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function extractPayload(issueBody) {
  const match = String(issueBody || '').match(MARKER)
  if (!match) throw new Error('Bloc SWL_FR_CARD absent du ticket')
  return validatePayload(JSON.parse(match[1]))
}

const text = (value, field, max = 1500) => {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.length > max) throw new Error(`${field} : texte attendu (${max} caractères au plus)`)
  return value
}

export function validatePayload(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Fiche illisible')
  if (raw.schemaVersion !== 1) throw new Error('schemaVersion 1 attendu')
  if (!ZONES[raw.kind]) throw new Error(`Type de carte inconnu : ${raw.kind}`)
  const englishName = text(raw.englishName, 'englishName', 160)
  if (!englishName?.trim()) throw new Error('Nom anglais (nom de liste Tabletop Admiral) obligatoire')
  const nameFr = text(raw.nameFr, 'nameFr', 160)
  if (!nameFr?.trim()) throw new Error('Nom français obligatoire')
  if (!HQ_PREFIX.test(raw.hqImage || '') || !raw.hqImage.includes(`/${FOLDER[raw.kind]}/`)) throw new Error('Visuel attendu sur le CDN public de Legion HQ, dans le dossier du bon type de carte')
  const fr = {}
  for (const [key, value] of Object.entries(raw.fr || {})) {
    if (!ZONES[raw.kind].includes(key)) throw new Error(`Zone « ${key} » inconnue pour une carte ${raw.kind}`)
    if (key === 'weapons') {
      if (!Array.isArray(value) || value.length > 4) throw new Error('weapons : 4 armes au plus')
      fr.weapons = value.map((w, i) => ({ name: text(w?.name, `arme ${i + 1}`, 120) || '', keywords: text(w?.keywords, `mots-clés de l'arme ${i + 1}`, 200) ?? '' }))
    } else if (key === 'keywords') {
      if (!Array.isArray(value) || value.length > 12) throw new Error('keywords : 12 lignes au plus')
      fr.keywords = value.map((line, i) => text(line, `mot-clé ${i + 1}`, 200))
    } else fr[key] = text(value, key)
  }
  const payload = { schemaVersion: 1, kind: raw.kind, englishName: englishName.trim(), nameFr: nameFr.trim(), hqImage: raw.hqImage, fr }
  if (raw.ttaId !== undefined) {
    if (!/^(unit|upgrade|command):\d+$/.test(String(raw.ttaId))) throw new Error('ttaId attendu sous la forme « type:identifiant »')
    payload.ttaId = String(raw.ttaId)
  }
  if (raw.kind === 'upgrade') payload.use = ['passive', 'exhaust', 'discard', 'both'].includes(raw.use) ? raw.use : 'passive'
  if (raw.kind === 'command') {
    const c = raw.command || {}
    if (![1, 2, 3, 4].includes(c.pip)) throw new Error('command.pip : 1 à 4')
    if (!['rebelles', 'empire', 'generique'].includes(c.faction)) throw new Error('command.faction : rebelles, empire ou generique')
    payload.command = { pip: c.pip, faction: c.faction, requirement: text(c.requirement, 'command.requirement', 120) || '' }
  }
  if (raw.translationProof && typeof raw.translationProof === 'object') {
    payload.translationProof = {
      englishText: text(raw.translationProof.englishText, 'translationProof.englishText', 3000) || '',
      concordance: text(raw.translationProof.concordance, 'translationProof.concordance', 1500) || '',
      glossaryVersion: text(raw.translationProof.glossaryVersion, 'translationProof.glossaryVersion', 40) || '',
    }
  }
  return payload
}

export const readPayload = (file) => validatePayload(JSON.parse(fs.readFileSync(file, 'utf8')))

// Fichiers publiés : fiche d'unité/amélioration dans public/cards, commandement dans public/commandcards.
export function targetFiles(payload) {
  if (payload.kind === 'command') {
    const id = slug(payload.nameFr)
    return { id, publicPath: `public/commandcards/${id}.jpg`, file: `${id}.jpg` }
  }
  const file = `${slug(payload.englishName)}-fr-community.jpg`
  return { id: slug(payload.englishName), publicPath: `public/cards/${file}`, file }
}
