import fs from 'node:fs'
import vm from 'node:vm'

const sandbox = { window: {} }
vm.runInNewContext(fs.readFileSync(new URL('../public/assistant/reference-data.js', import.meta.url), 'utf8'), sandbox)

const source = [
  fs.readFileSync(new URL('../public/assistant/app.js', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../public/assistant/attack-engine.js', import.meta.url), 'utf8'),
].join('\n')

const automatic = new Set([
  'agile',
  'armure-x',
  'bouclier-x',
  'blocage',
  'critique-x',
  'coup-de-chance-x',
  'deflagration',
  'debordement',
  'encombrant',
  'haute-velocite',
  'impact-x',
  'immobiliser-x',
  'insensible',
  'immunite-deflagration',
  'immunite-armes-portee-1',
  'immunite-corps-a-corps',
  'immunite-perforant',
  'immunite-perforant-corps-a-corps',
  'ion-x',
  'letal-x',
  'longue-distance',
  'perforant-x',
  'precis-x',
  'profil-bas',
  'poison-x',
  'primitif',
  'suppressif',
  'tireur-delite-x',
  'cable-de-remorquage',
  'dispersion',
  'manoeuvre-improbable',
  'indifferent',
  'la-mort-venue-du-ciel',
  'maitrise-de-lataru',
  'maitrise-du-djem-so',
  'matamore',
  'tenir-bon',
  'belier-x',
  'souffle',
  'accomplir-la-mission',
  'chasseur-de-jedi',
])

const assisted = new Set([
  'arsenal-x',
  'couvert-x',
  'duelliste',
  'gardien-x',
  'point-faible-x',
  'tirs-de-soutien',
  'transport-x',
  'autodestruction-x-unite',
  'barrage',
  'charge',
  'ciblage-avance',
  'deflexion',
  'discret',
  'exemplaire',
  'fumee-x',
  'implacable',
  'incognito',
  'influence-divine',
  'intuition-du-danger-x',
  'la-victoire-ou-la-mort',
  'les-mandaloriens-sont-plus-forts-ensemble',
  'maitrise-du-jarkai',
  'maitrise-du-makashi',
  'maitrise-du-shien',
  'maitrise-du-soresu',
  'maitrise-du-vaapad',
  'nous-nous-battons-pour-notre-famille',
  'pistolero',
  'surveillance-x',
  'tireur-embusque',
  'anti-materiel-x',
  'anti-personnel-x',
  'arme-a-effet-de-zone',
  'assaut-x',
  'autodestruction-x-arme',
  'bordee-x',
  'equipe-sniper',
  'explosion-x',
  'fixe',
  'immunite-deflexion',
  'polyvalent',
  'rayons-x',
  'arme-de-poing',
  'non-combattant',
  'petit',
])

const keywords = sandbox.window.SWL_REFERENCE.keywords
const reference = sandbox.window.SWL_REFERENCE
const keywordById = Object.fromEntries(keywords.map((keyword) => [keyword.id, keyword]))

const weaponDataErrors = Object.entries(reference.weapons).flatMap(([card, profile]) =>
  (profile.weapons || []).flatMap((weapon) => {
    const label = `${card} · ${weapon.name || '(arme sans nom)'}`
    const errors = []
    if (!weapon.name?.trim()) errors.push(`${label}: nom manquant`)
    if (weapon.dice === 'variable') {
      if (!weapon.note?.trim()) errors.push(`${label}: réserve variable sans règle de calcul`)
    } else if (!Array.isArray(weapon.dice) || weapon.dice.length === 0) {
      errors.push(`${label}: réserve de dés absente`)
    } else {
      const colors = new Set()
      for (const die of weapon.dice) {
        if (!['rouge', 'blanc', 'noir'].includes(die.color)) errors.push(`${label}: couleur invalide « ${die.color} »`)
        if (!Number.isInteger(die.count) || die.count <= 0) errors.push(`${label}: quantité invalide pour ${die.color}`)
        if (colors.has(die.color)) errors.push(`${label}: couleur ${die.color} déclarée plusieurs fois`)
        colors.add(die.color)
      }
    }
    if (weapon.verifiedAgainstCard && !weapon.verificationSource?.trim()) {
      errors.push(`${label}: profil certifié sans source de vérification`)
    }
    if (!weapon.verifiedAgainstCard && weapon.verificationSource) {
      errors.push(`${label}: source de vérification présente sans certification`)
    }
    return errors
  }),
)

if (weaponDataErrors.length) {
  throw new Error(`Profils de dés invalides :\n${weaponDataErrors.join('\n')}`)
}

const invalidWeaponRanges = Object.entries(reference.weapons).flatMap(([card, profile]) =>
  (profile.weapons || []).flatMap((weapon) => {
    const range = String(weapon.range || '').trim()
    if (range === 'melee' || range === 'melee-1' || range === 'grenade' || /^\d+$/.test(range)) return []
    const interval = range.match(/^(\d+)-(\d+|#)$/)
    if (interval && (interval[2] === '#' || Number(interval[1]) <= Number(interval[2]))) return []
    return [`${card} · ${weapon.name}: ${range || '(absente)'}`]
  }),
)

if (invalidWeaponRanges.length) {
  throw new Error(`Portées d'arme invalides :\n${invalidWeaponRanges.join('\n')}`)
}

const invalidDefenseColors = Object.entries(reference.weapons).flatMap(([card, profile]) =>
  profile.defenseColor && !['rouge', 'blanc'].includes(profile.defenseColor) ? [`${card}: ${profile.defenseColor}`] : [],
)
if (invalidDefenseColors.length) throw new Error(`Couleurs de défense invalides :\n${invalidDefenseColors.join('\n')}`)
const invalidDefenseVerification = Object.entries(reference.weapons).flatMap(([card, profile]) => {
  if (profile.defenseVerifiedAgainstCard && !profile.defenseColor) return [`${card}: défense certifiée sans couleur`]
  if (profile.defenseVerifiedAgainstCard && !profile.defenseVerificationSource?.trim()) return [`${card}: défense certifiée sans source`]
  if (!profile.defenseVerifiedAgainstCard && profile.defenseVerificationSource) return [`${card}: source de défense sans certification`]
  return []
})
if (invalidDefenseVerification.length) {
  throw new Error(`Certifications de défense invalides :\n${invalidDefenseVerification.join('\n')}`)
}
if (reference.weapons['tauntaun riders']?.defenseColor !== 'blanc') {
  throw new Error('Les Soldats montés sur Tauntaun doivent utiliser des dés de défense blancs.')
}

const canonicalDiceChecks = [
  ['z 6 trooper', 'Blaster Rotatif Z-6', [{ color: 'blanc', count: 6 }]],
  ['imperial death troopers', 'Blaster Léger SE-14r', [{ color: 'blanc', count: 2 }]],
  ['t 7 ion snowtrooper', 'Fusil T-7 à Ions', [{ color: 'blanc', count: 1 }, { color: 'noir', count: 2 }]],
  ['dlt 19 stormtrooper', 'Fusil Blaster DLT-19', [{ color: 'rouge', count: 2 }]],
  ['dlt 19d trooper', 'Fusil Blaster DLT-19D', [{ color: 'rouge', count: 2 }, { color: 'blanc', count: 1 }]],
  ['hh 12 stormtrooper', 'Lance-roquettes HH-12', [{ color: 'noir', count: 3 }]],
  ['at st mortar launcher', 'Lance-mortier de TR-TT', [{ color: 'blanc', count: 3 }]],
  ['proton charge saboteur', 'Charge à Protons', [{ color: 'rouge', count: 1 }, { color: 'blanc', count: 1 }, { color: 'noir', count: 1 }]],
  ['tauntaun riders', 'Pistolets Blaster', [{ color: 'rouge', count: 2 }]],
]
for (const [card, weaponName, expectedDice] of canonicalDiceChecks) {
  const weapon = reference.weapons[card]?.weapons?.find((candidate) => candidate.name === weaponName)
  if (!weapon || JSON.stringify(weapon.dice) !== JSON.stringify(expectedDice)) {
    throw new Error(`Profil canonique altéré : ${card} · ${weaponName}`)
  }
}

const combatKeywords = keywords.filter((keyword) =>
  [keyword.impact, ...(keyword.displaySections || [])].some((section) => section === 'attaque' || section === 'défense'),
)

const rows = combatKeywords.map((keyword) => ({
  id: keyword.id,
  name: keyword.name,
  status: automatic.has(keyword.id) ? 'automatique' : assisted.has(keyword.id) ? 'assisté' : 'non traité',
}))

const stale = [...automatic].filter((id) => !source.includes(`'${id}'`))
if (stale.length) {
  throw new Error(`Automatismes déclarés mais absents du moteur : ${stale.join(', ')}`)
}

const ambiguousMultiweaponCards = Object.entries(reference.weapons).flatMap(([card, profile]) => {
  const weaponRules = (reference.tags[card] || []).filter((tag) =>
    keywordById[tag.keywordId]?.category === 'arme' &&
    [keywordById[tag.keywordId]?.impact, ...(keywordById[tag.keywordId]?.displaySections || [])].includes('attaque'),
  )
  if ((profile.weapons?.length || 0) < 2 || !weaponRules.length) return []
  const incomplete = profile.weapons.filter((weapon) => !Array.isArray(weapon.keywordIds)).map((weapon) => weapon.name)
  return incomplete.length ? [`${card}: ${incomplete.join(', ')}`] : []
})

if (ambiguousMultiweaponCards.length) {
  throw new Error(`Associations arme/mot-clé ambiguës :\n${ambiguousMultiweaponCards.join('\n')}`)
}

const counts = rows.reduce((result, row) => {
  result[row.status] = (result[row.status] || 0) + 1
  return result
}, {})

console.log(`Audit Assistant : ${rows.length} mots-clés de combat`)
console.log(`Automatiques : ${counts.automatique || 0}`)
console.log(`Assistés : ${counts['assisté'] || 0}`)
console.log(`Non traités : ${counts['non traité'] || 0}`)
console.log(`Portées d'arme validées : ${Object.values(reference.weapons).reduce((total, profile) => total + (profile.weapons?.length || 0), 0)}`)
console.log(`Profils certifiés sur carte : ${Object.values(reference.weapons).reduce((total, profile) => total + (profile.weapons || []).filter((weapon) => weapon.verifiedAgainstCard).length, 0)}`)
console.log(`Défenses certifiées sur carte : ${Object.values(reference.weapons).filter((profile) => profile.defenseVerifiedAgainstCard).length}`)
console.log('\nMots-clés non traités :')
console.log(rows.filter((row) => row.status === 'non traité').map((row) => `- ${row.name} [${row.id}]`).join('\n'))
