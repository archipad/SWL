import fs from 'node:fs'

const payloadPath=process.argv[2]
if(!payloadPath)throw new Error('Fichier de certification manquant')
const payload=JSON.parse(fs.readFileSync(payloadPath,'utf8'))
if(![1,2,3].includes(payload.version))throw new Error('Certification invalide')
if(payload.branch!=='claude/star-wars-legion-app-49rc3z')throw new Error('Branche de certification invalide')
const validColors=new Set(['rouge','noir','blanc'])
const cards=payload.version===1?[{card:payload.card,weapons:payload.weapons||[],...(payload.defenseColor?{defenseColor:payload.defenseColor}:{})}]:payload.cards
if(!Array.isArray(cards)||!cards.length)throw new Error('Lot de certification vide')
const databasePath=new URL('../src/data/diceCertifications.json',import.meta.url)
const database=JSON.parse(fs.readFileSync(databasePath,'utf8'))
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
  const previous=database[card.card]||{}
  const byIndex=new Map((previous.weapons||[]).map(weapon=>[weapon.index,weapon]))
  for(const weapon of card.weapons||[])byIndex.set(weapon.index,weapon)
  database[card.card]={weapons:[...byIndex.values()].sort((a,b)=>a.index-b.index),...(card.defenseColor?{defenseColor:card.defenseColor}:previous.defenseColor?{defenseColor:previous.defenseColor}:{}),...(card.unitStats?{unitStats:card.unitStats}:previous.unitStats?{unitStats:previous.unitStats}:{}),...(card.addedModels!==undefined?{addedModels:card.addedModels}:previous.addedModels!==undefined?{addedModels:previous.addedModels}:{}),...(card.addedModelWounds!==undefined?{addedModelWounds:card.addedModelWounds}:previous.addedModelWounds!==undefined?{addedModelWounds:previous.addedModelWounds}:{})}
}
fs.writeFileSync(databasePath,`${JSON.stringify(database,null,2)}\n`)

// GitHub Pages et le mode PWA peuvent conserver longtemps le référentiel.
// Chaque lot change donc automatiquement sa version dans la page afin que
// tous les appareils téléchargent immédiatement les dés nouvellement certifiés.
const assistantIndexPath=new URL('../public/assistant/index.html',import.meta.url)
const assistantIndex=fs.readFileSync(assistantIndexPath,'utf8')
const versionedIndex=assistantIndex.replace(
  /(reference-data\.js\?v=)(\d+)/,
  (_match,prefix,version)=>`${prefix}${Number(version)+1}`,
)
if(versionedIndex===assistantIndex)throw new Error('Version du référentiel Assistant introuvable')
fs.writeFileSync(assistantIndexPath,versionedIndex)
console.log(`Certifications appliquées : ${cards.length} carte(s)`)
