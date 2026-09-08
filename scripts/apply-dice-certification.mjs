import fs from 'node:fs'

const payloadPath=process.argv[2]
if(!payloadPath)throw new Error('Fichier de certification manquant')
const payload=JSON.parse(fs.readFileSync(payloadPath,'utf8'))
if(payload.version!==1||typeof payload.card!=='string')throw new Error('Certification invalide')
if(payload.branch!=='claude/star-wars-legion-app-49rc3z')throw new Error('Branche de certification invalide')
const validColors=new Set(['rouge','noir','blanc'])
for(const weapon of payload.weapons||[]){
  if(!Number.isInteger(weapon.index)||weapon.index<0||typeof weapon.name!=='string')throw new Error('Arme invalide')
  if(weapon.dice!=='variable')for(const die of weapon.dice||[]){if(!validColors.has(die.color)||!Number.isInteger(die.count)||die.count<1||die.count>20)throw new Error('Dé invalide')}
}
if(payload.defenseColor&&!['rouge','blanc'].includes(payload.defenseColor))throw new Error('Défense invalide')
const databasePath=new URL('../src/data/diceCertifications.json',import.meta.url)
const database=JSON.parse(fs.readFileSync(databasePath,'utf8'))
database[payload.card]={weapons:payload.weapons||[],...(payload.defenseColor?{defenseColor:payload.defenseColor}:{})}
fs.writeFileSync(databasePath,`${JSON.stringify(database,null,2)}\n`)
console.log(`Certification appliquée : ${payload.card}`)
