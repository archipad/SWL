import fs from 'node:fs'

const payloadPath=process.argv[2]
if(!payloadPath)throw new Error('Fichier de certification manquant')
const payload=JSON.parse(fs.readFileSync(payloadPath,'utf8'))
if(![1,2].includes(payload.version))throw new Error('Certification invalide')
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
  const previous=database[card.card]||{}
  const byIndex=new Map((previous.weapons||[]).map(weapon=>[weapon.index,weapon]))
  for(const weapon of card.weapons||[])byIndex.set(weapon.index,weapon)
  database[card.card]={weapons:[...byIndex.values()].sort((a,b)=>a.index-b.index),...(card.defenseColor?{defenseColor:card.defenseColor}:previous.defenseColor?{defenseColor:previous.defenseColor}:{})}
}
fs.writeFileSync(databasePath,JSON.stringify(database,null,2)+'\n')

const assistantIndexPath=new URL('../public/assistant/index.html',import.meta.url)
const assistantIndex=fs.readFileSync(assistantIndexPath,'utf8')
const versionedIndex=assistantIndex.replace(
  /(reference-data\.js\?v=)(\d+)/,
  (_match,prefix,version)=>prefix+(Number(version)+1),
)
if(versionedIndex===assistantIndex)throw new Error('Version du référentiel Assistant introuvable')
fs.writeFileSync(assistantIndexPath,versionedIndex)
console.log('Certifications appliquées : '+cards.length+' carte(s)')
