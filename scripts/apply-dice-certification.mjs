import fs from 'node:fs'
import { execSync } from 'node:child_process'

const payloadPath=process.argv[2]
const issueBodyPath=process.argv[3]
if(!payloadPath)throw new Error('Fichier de certification manquant')
const payload=JSON.parse(fs.readFileSync(payloadPath,'utf8'))
if(![1,2,3,4].includes(payload.version))throw new Error('Certification invalide')
if(payload.branch!=='claude/star-wars-legion-app-49rc3z')throw new Error('Branche de certification invalide')
const validColors=new Set(['rouge','noir','blanc'])
const keyPattern=/^[a-z0-9]+( [a-z0-9]+)*$/
const cards=payload.version===1?[{card:payload.card,weapons:payload.weapons||[],...(payload.defenseColor?{defenseColor:payload.defenseColor}:{})}]:payload.cards||[]
const aliases=payload.aliases||[]
const newCards=payload.newCards||[]
if(!cards.length&&!aliases.length&&!newCards.length)throw new Error('Lot de certification vide')

// Référentiel actuel (DICE_PROFILES/CARD_IMAGES déjà fusionnés avec
// customCards.json) chargé via Vite SSR, comme generate-assistant-reference.mjs
// -- sert à valider les alias et les nouvelles cartes contre le vrai catalogue,
// pas seulement contre les fichiers JSON pris isolément.
const { createServer } = await import('vite')
const server = await createServer({ root: process.cwd(), configFile: false, appType: 'custom', logLevel: 'error', server: { middlewareMode: true } })
let diceModule, imageModule, keywordModule
try {
  ;[diceModule, imageModule, keywordModule] = await Promise.all([
    server.ssrLoadModule('/src/data/diceProfiles.ts'),
    server.ssrLoadModule('/src/data/cardImages.ts'),
    server.ssrLoadModule('/src/data/keywords.ts'),
  ])
} finally {
  await server.close()
}
const knownCard = (key) => Boolean(diceModule.DICE_PROFILES[key] || imageModule.CARD_IMAGES[key])
const knownKeywordIds = new Set(keywordModule.SEED_KEYWORDS.map((k) => k.id))

for(const card of cards){
  if(typeof card.card!=='string'||!card.card)throw new Error('Carte invalide')
  for(const weapon of card.weapons||[]){
    if(!Number.isInteger(weapon.index)||weapon.index<0||typeof weapon.name!=='string')throw new Error('Arme invalide')
    if(weapon.dice!=='variable')for(const die of weapon.dice||[]){if(!validColors.has(die.color)||!Number.isInteger(die.count)||die.count<1||die.count>20)throw new Error('Dé invalide')}
  }
  if(card.defenseColor&&!['rouge','blanc'].includes(card.defenseColor))throw new Error('Défense invalide')
  if(card.unitStats){
    const {woundsPerModel,courage,baseModels,suppressionImmune}=card.unitStats
    if(!Number.isInteger(woundsPerModel)||woundsPerModel<1||woundsPerModel>20)throw new Error('Points de vie invalides')
    if(courage!==null&&(!Number.isInteger(courage)||courage<1||courage>20))throw new Error('Courage invalide')
    if(!Number.isInteger(baseModels)||baseModels<1||baseModels>30)throw new Error('Nombre de figurines invalide')
    if(suppressionImmune!==undefined&&typeof suppressionImmune!=='boolean')throw new Error('Immunité à la suppression invalide')
  }
  if(card.addedModels!==undefined&&(!Number.isInteger(card.addedModels)||card.addedModels<0||card.addedModels>30))throw new Error('Figurines ajoutées invalides')
  if(card.addedModelWounds!==undefined&&(!Number.isInteger(card.addedModelWounds)||card.addedModelWounds<1||card.addedModelWounds>20))throw new Error('PV des figurines ajoutées invalides')
}

const pendingAliasMap=Object.fromEntries(aliases.map(entry=>[entry.from,entry.to]))
const resolvePendingAlias=key=>{const visited=new Set;let current=key;while(pendingAliasMap[current]){if(visited.has(current))throw new Error(`Cycle d'alias détecté autour de « ${current} »`);visited.add(current);current=pendingAliasMap[current]}return current}
for(const entry of aliases){
  if(typeof entry.from!=='string'||!keyPattern.test(entry.from))throw new Error(`Alias invalide : ${entry.from}`)
  if(typeof entry.to!=='string'||!keyPattern.test(entry.to))throw new Error(`Cible d'alias invalide : ${entry.to}`)
  if(knownCard(entry.from))throw new Error(`« ${entry.from} » a déjà sa propre entrée dans le catalogue — un alias l'écraserait silencieusement`)
  const target=resolvePendingAlias(entry.to)
  if(!knownCard(target))throw new Error(`« ${entry.to} » est introuvable dans le catalogue, impossible d'aliaser vers cette carte`)
}

const weaponFields=({name,range,dice,keywordIds,keywordValues,attackSurge})=>({name,...(range?{range}:{}),dice,...(keywordIds?{keywordIds}:{}),...(keywordValues?{keywordValues}:{}),...(attackSurge?{attackSurge}:{})})
const issueBody=issueBodyPath&&fs.existsSync(issueBodyPath)?fs.readFileSync(issueBodyPath,'utf8'):''
for(const card of newCards){
  if(typeof card.key!=='string'||!keyPattern.test(card.key))throw new Error(`Clé de nouvelle carte invalide : ${card.key}`)
  if(knownCard(card.key))throw new Error(`« ${card.key} » existe déjà dans le catalogue — utilisez un alias plutôt qu'une nouvelle carte`)
  if(typeof card.nameFr!=='string'||!card.nameFr.trim())throw new Error(`Nom français manquant pour ${card.key}`)
  for(const weapon of card.weapons||[]){
    if(typeof weapon.name!=='string'||!weapon.name.trim())throw new Error(`Nom d'arme manquant pour ${card.key}`)
    if(weapon.dice!=='variable')for(const die of weapon.dice||[]){if(!validColors.has(die.color)||!Number.isInteger(die.count)||die.count<1||die.count>20)throw new Error(`Dé invalide pour ${card.key}/${weapon.name}`)}
  }
  if(card.defenseColor&&!['rouge','blanc'].includes(card.defenseColor))throw new Error(`Défense invalide pour ${card.key}`)
  for(const tag of card.keywords||[]){
    if(typeof tag.keywordId!=='string'||!knownKeywordIds.has(tag.keywordId))throw new Error(`Mot-clé inconnu pour ${card.key} : ${tag.keywordId}`)
    if(tag.value!==undefined&&(!Number.isInteger(tag.value)||tag.value<1||tag.value>20))throw new Error(`Valeur de mot-clé invalide pour ${card.key}/${tag.keywordId}`)
  }
  if(card.unitStats){
    const {woundsPerModel,courage,baseModels}=card.unitStats
    if(!Number.isInteger(woundsPerModel)||woundsPerModel<1||woundsPerModel>20)throw new Error(`Points de vie invalides pour ${card.key}`)
    if(courage!==null&&(!Number.isInteger(courage)||courage<1||courage>20))throw new Error(`Courage invalide pour ${card.key}`)
    if(!Number.isInteger(baseModels)||baseModels<1||baseModels>30)throw new Error(`Nombre de figurines invalide pour ${card.key}`)
  }
  if(card.addedModels!==undefined&&(!Number.isInteger(card.addedModels)||card.addedModels<0||card.addedModels>30))throw new Error(`Figurines ajoutées invalides pour ${card.key}`)
  if(!card.imageMarker||!/^IMG-\d+$/.test(card.imageMarker))throw new Error(`Repère d'image manquant ou invalide pour ${card.key}`)
  // Le visuel est collé dans le corps de l'issue juste après une ligne
  // contenant son repère (ex. « IMG-1 ») -- voir la marche à suivre
  // affichée par l'écran « Nouvelle carte » (public/assistant/certification.js).
  const markerLine=new RegExp(`^${card.imageMarker}\\s*$[\\s\\S]{0,400}?!\\[[^\\]]*\\]\\((https://github\\.com/[^)\\s]+)\\)`,'m')
  const match=issueBody.match(markerLine)
  if(!match)throw new Error(`Visuel introuvable dans l'issue pour ${card.key} (repère ${card.imageMarker}) -- collez la photo juste après la ligne ${card.imageMarker}`)
  card._imageUrl=match[1]
}

const databasePath=new URL('../src/data/diceCertifications.json',import.meta.url)
const database=JSON.parse(fs.readFileSync(databasePath,'utf8'))
for(const card of cards){
  const previous=database[card.card]||{}
  const byIndex=new Map((previous.weapons||[]).map(weapon=>[weapon.index,weapon]))
  for(const weapon of card.weapons||[])byIndex.set(weapon.index,weapon)
  database[card.card]={weapons:[...byIndex.values()].sort((a,b)=>a.index-b.index),...(card.defenseColor?{defenseColor:card.defenseColor}:previous.defenseColor?{defenseColor:previous.defenseColor}:{}),...(card.unitStats?{unitStats:card.unitStats}:previous.unitStats?{unitStats:previous.unitStats}:{}),...(card.addedModels!==undefined?{addedModels:card.addedModels}:previous.addedModels!==undefined?{addedModels:previous.addedModels}:{}),...(card.addedModelWounds!==undefined?{addedModelWounds:card.addedModelWounds}:previous.addedModelWounds!==undefined?{addedModelWounds:previous.addedModelWounds}:{})}
}
if(cards.length)fs.writeFileSync(databasePath,`${JSON.stringify(database,null,2)}\n`)

if(aliases.length){
  const aliasesPath=new URL('../src/data/cardKeyAliases.json',import.meta.url)
  const aliasDb=JSON.parse(fs.readFileSync(aliasesPath,'utf8'))
  for(const {from,to} of aliases)aliasDb[from]=to
  fs.writeFileSync(aliasesPath,`${JSON.stringify(aliasDb,null,2)}\n`)
}

if(newCards.length){
  const customCardsPath=new URL('../src/data/customCards.json',import.meta.url)
  const customDb=JSON.parse(fs.readFileSync(customCardsPath,'utf8'))
  const cardsDir=new URL('../public/cards/',import.meta.url)
  for(const card of newCards){
    const response=await fetch(card._imageUrl)
    if(!response.ok)throw new Error(`Téléchargement du visuel impossible pour ${card.key} (${response.status})`)
    const contentType=response.headers.get('content-type')||''
    const extension=contentType.includes('png')?'png':contentType.includes('webp')?'webp':'jpg'
    const fileName=`${card.key.replace(/ /g,'-')}.${extension}`
    fs.writeFileSync(new URL(fileName,cardsDir),Buffer.from(await response.arrayBuffer()))
    customDb[card.key]={
      nameFr:card.nameFr,
      image:fileName,
      weapons:(card.weapons||[]).map(weaponFields),
      ...(card.keywords?.length?{keywords:card.keywords}:{}),
      ...(card.defenseColor?{defenseColor:card.defenseColor}:{}),
      ...(card.unitStats?{unitStats:card.unitStats}:{}),
      ...(card.addedModels!==undefined?{addedModels:card.addedModels}:{}),
      ...(card.addedModelWounds!==undefined?{addedModelWounds:card.addedModelWounds}:{}),
      verificationSource:'Certification visuelle centralisée GitHub (nouvelle carte)',
      addedAt:new Date().toISOString().slice(0,10),
    }
  }
  fs.writeFileSync(customCardsPath,`${JSON.stringify(customDb,null,2)}\n`)
}

// Le référentiel de l'assistant doit refléter ces changements avant que
// verify:assistant-dice (qui teste les contrats avant de régénérer via
// audit:assistant) ne s'exécute juste après cette étape.
execSync('node scripts/generate-assistant-reference.mjs',{stdio:'inherit'})

// GitHub Pages et le mode PWA peuvent conserver longtemps le référentiel.
// Chaque lot change donc automatiquement sa version dans la page afin que
// tous les appareils téléchargent immédiatement les données nouvellement certifiées.
const assistantIndexPath=new URL('../public/assistant/index.html',import.meta.url)
const assistantIndex=fs.readFileSync(assistantIndexPath,'utf8')
const versionedIndex=assistantIndex.replace(
  /(reference-data\.js\?v=)(\d+)/,
  (_match,prefix,version)=>`${prefix}${Number(version)+1}`,
)
if(versionedIndex===assistantIndex)throw new Error('Version du référentiel Assistant introuvable')
fs.writeFileSync(assistantIndexPath,versionedIndex)
console.log(`Certifications appliquées : ${cards.length} carte(s), ${aliases.length} alias, ${newCards.length} nouvelle(s) carte(s)`)
