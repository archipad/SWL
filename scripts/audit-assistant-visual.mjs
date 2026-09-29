import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),assistant=path.join(root,'public/assistant'),sandbox={window:{}}
vm.createContext(sandbox)
vm.runInContext(fs.readFileSync(path.join(assistant,'reference-data.js'),'utf8'),sandbox)
vm.runInContext(fs.readFileSync(path.join(assistant,'portrait-assets.js'),'utf8'),sandbox)
const ref=sandbox.window.SWL_REFERENCE,portraits=sandbox.window.SWL_CODEX_PORTRAITS
const units=Object.entries(ref.weapons).filter(([,value])=>value.unitStats?.verifiedAgainstCard||value.fullCardCertification?.cardType==='unit')
const missing=[],missingFiles=[],longNames=[]
for(const [key] of units){const asset=portraits[key],file=asset?.startsWith('../')?path.resolve(assistant,asset):path.join(root,'public','codex','portraits',asset||'');if(!asset)missing.push(key);else if(!fs.existsSync(file))missingFiles.push(`${key} → ${asset}`);if(key.length>34)longNames.push(key)}
const css=fs.readFileSync(path.join(assistant,'game-tools.css'),'utf8')+fs.readFileSync(path.join(assistant,'unit-screen.css'),'utf8')+fs.readFileSync(path.join(assistant,'tablet-landscape-polish.css'),'utf8')
const checks={landscape:/orientation\s*:\s*landscape/.test(css),ellipsis:/text-overflow\s*:\s*ellipsis/.test(css),objectFit:/object-fit\s*:\s*cover/.test(css),fixedDock:/activation-quick-dock[\s\S]*position\s*:\s*fixed/.test(css)}
const lines=['# Audit visuel des fiches d’unité','',`- Unités certifiées contrôlées : **${units.length}**`,`- Portraits associés : **${units.length-missing.length}/${units.length}**`,`- Fichiers de portrait présents : **${units.length-missingFiles.length}/${units.length}**`,`- Noms longs couverts par une règle de troncature : **${checks.ellipsis?'oui':'non'}**`,`- Cadrage sans flou latéral (\`object-fit: cover\`) : **${checks.objectFit?'oui':'non'}**`,`- Règles iPad paysage : **${checks.landscape?'oui':'non'}**`,`- Barre persistante : **${checks.fixedDock?'oui':'non'}**`,'',missing.length?'## Portraits manquants\n\n'+missing.map(x=>'- '+x).join('\n'):'Aucun portrait manquant.',missingFiles.length?'\n## Fichiers manquants\n\n'+missingFiles.map(x=>'- '+x).join('\n'):'','',`Noms de plus de 34 caractères à vérifier dans la galerie : ${longNames.length}.`]
fs.mkdirSync(path.join(root,'docs','audit'),{recursive:true});fs.writeFileSync(path.join(root,'docs','audit','assistant-fiches-visuelles.md'),lines.join('\n'))
if(missing.length||missingFiles.length||Object.values(checks).some(value=>!value)){console.error(lines.join('\n'));process.exit(1)}
console.log(`Audit visuel : ${units.length} fiches, portraits et contrats tablette OK`)
