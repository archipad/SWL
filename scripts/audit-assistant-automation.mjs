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
  'insensible',
  'immunite-deflagration',
  'immunite-armes-portee-1',
  'immunite-corps-a-corps',
  'immunite-perforant',
  'immunite-perforant-corps-a-corps',
  'ion-x',
  'letal-x',
  'perforant-x',
  'precis-x',
  'profil-bas',
  'suppressif',
  'tireur-delite-x',
])

const assisted = new Set([
  'arsenal-x',
  'couvert-x',
  'duelliste',
  'gardien-x',
  'point-faible-x',
  'tirs-de-soutien',
  'transport-x',
])

const keywords = sandbox.window.SWL_REFERENCE.keywords
const reference = sandbox.window.SWL_REFERENCE
const keywordById = Object.fromEntries(keywords.map((keyword) => [keyword.id, keyword]))
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
console.log('\nMots-clés non traités :')
console.log(rows.filter((row) => row.status === 'non traité').map((row) => `- ${row.name} [${row.id}]`).join('\n'))
