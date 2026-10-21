// Empreintes des certifications historiques, partagées par l'index versionné (scripts/index-auto-certification-historical.mjs)
// et par l'inventaire publié (scripts/generate-auto-certification-assets.mjs). Une certification historique n'est « valide et
// inchangée » que si ses données moteur, son visuel français et les définitions de ses mots-clés ont gardé l'empreinte relevée
// dans l'index.
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
// JSON canonique : clés triées, valeurs absentes omises, pour une empreinte indépendante de l'ordre d'écriture.
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).filter((key) => value[key] !== undefined && value[key] !== null).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}
const pick = (object, keys) => (object ? Object.fromEntries(keys.filter((key) => object[key] !== undefined).map((key) => [key, object[key]])) : undefined)

/** Données moteur certifiées d'une carte (sans les champs de traçabilité : date, empreinte du visuel, provenance). */
export function certifiedData(reference, key) {
  const entry = reference.weapons?.[key]
  const certification = entry?.fullCardCertification
  if (!certification) return null
  return {
    frenchName: reference.names?.[key] ?? null,
    weapons: (entry.weapons || []).map((weapon) => ({ name: weapon.name, dice: weapon.dice, range: weapon.range, keywordIds: weapon.keywordIds || [], keywordValues: weapon.keywordValues || {} })),
    defenseColor: entry.defenseColor, defenseColorOverride: entry.defenseColorOverride, defenseSurgeOverride: entry.defenseSurgeOverride,
    unitStats: pick(entry.unitStats, ['woundsPerModel', 'courage', 'baseModels', 'suppressionImmune']),
    addedModels: entry.addedModels, addedModelWounds: entry.addedModelWounds,
    certification: pick(certification, ['cardType', 'rank', 'unitType', 'speed', 'attackSurge', 'defenseSurge', 'keywords', 'cardUse', 'noKeywordsConfirmed', 'rulesVersion']),
  }
}

/** Mots-clés de la carte (certification et armes) avec leur définition actuelle dans le glossaire SWL. */
export function keywordDefinitions(reference, key) {
  const entry = reference.weapons?.[key]
  const ids = new Set([...(entry?.fullCardCertification?.keywords || []).map((tag) => tag.keywordId), ...(entry?.weapons || []).flatMap((weapon) => weapon.keywordIds || [])])
  const byId = new Map((reference.keywords || []).map((keyword) => [keyword.id, keyword]))
  return [...ids].sort().map((id) => ({ id, name: byId.get(id)?.name ?? null, definition: byId.get(id)?.definition ?? null }))
}

/** Empreintes actuelles d'une certification historique (données, définitions, visuel français réellement publié). */
export function fingerprints(reference, key, root) {
  const data = certifiedData(reference, key)
  if (!data) return null
  const certification = reference.weapons[key].fullCardCertification
  const visualPath = String(certification.visualPath || '').replace(/^\/SWL\//, '')
  const file = visualPath ? path.join(root, 'public', visualPath) : null
  return {
    cardType: certification.cardType,
    frenchName: data.frenchName,
    frenchVisual: visualPath || null,
    frenchVisualSha256: file && fs.existsSync(file) ? sha256(fs.readFileSync(file)) : null,
    certifiedVisualSha256: certification.visualHash ?? null,
    dataSha256: sha256(canonical(data)),
    definitionsSha256: sha256(canonical(keywordDefinitions(reference, key))),
    rulesVersion: certification.rulesVersion ?? null,
    verifiedAt: certification.verifiedAt ?? null,
  }
}

/** Compare une certification à son entrée d'index : liste des raisons d'obsolescence (vide = valide et inchangée). */
export function changes(indexed, current) {
  if (!current) return ['certification historique retirée']
  if (!indexed) return ['certification absente de l’index (modifiée ou ajoutée depuis la dernière indexation)']
  const reasons = []
  if (current.dataSha256 !== indexed.dataSha256) reasons.push('données moteur modifiées')
  if (!current.frenchVisualSha256) reasons.push('visuel français introuvable')
  else if (current.frenchVisualSha256 !== indexed.frenchVisualSha256 || (current.certifiedVisualSha256 && current.certifiedVisualSha256 !== current.frenchVisualSha256)) reasons.push('visuel français modifié')
  if (current.definitionsSha256 !== indexed.definitionsSha256) reasons.push('définition de mot-clé modifiée')
  return reasons
}
