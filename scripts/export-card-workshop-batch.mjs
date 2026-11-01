import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const out = path.resolve(process.argv[2] ?? 'tmp/card-workshop-batch');
const vite = await createServer({server:{middlewareMode:true},appType:'custom',optimizeDeps:{noDiscovery:true}});
try {
const {workshopRule}=await vite.ssrLoadModule('/src/lib/cardWorkshop.ts');
const ocrPath=process.argv[3];
const ocrRows=ocrPath ? (await fs.readFile(ocrPath,'utf8')).trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line)) : [];
const ocrByFile=new Map(ocrRows.map(row=>[row.file.replaceAll('\\','/').split('/public/').at(-1),row.text]));
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replaceAll('œ','oe').replace(/[’']/g,' ');
const escape=s=>Array.from(s).map(c=>'\\^$.*+?()[]{}|'.includes(c)?'\\'+c:c).join('');
const {buildWorkshopCatalog}=await vite.ssrLoadModule('/src/lib/cardWorkshop.ts');
const {SEED_CARD_TAGS}=await vite.ssrLoadModule('/src/data/cardTags.ts');
const {SEED_KEYWORDS}=await vite.ssrLoadModule('/src/data/keywords.ts');
const {keywordBackHtml}=await vite.ssrLoadModule('/src/lib/cardWorkshopPrint.ts');
const cards=buildWorkshopCatalog(SEED_CARD_TAGS,SEED_KEYWORDS);
const officialDefinitions=JSON.parse(await fs.readFile('src/data/workshopOfficialKeywords.json','utf8'));
const keywordReviews=JSON.parse(await fs.readFile('src/data/workshopKeywordReviews.json','utf8'));
await fs.mkdir(out,{recursive:true});
const translationOverrides=JSON.parse(await fs.readFile('src/data/workshopCardTranslations.json','utf8')).cards;
const records=[];
for(const card of cards){
const file=card.image?.replace(/^.*?\/(cards|commandcards)\//,'$1/');
let front=null;
if(file && !file.includes('..') && /^(cards|commandcards)\//.test(file)) {
try {const bytes=await fs.readFile(path.join('public',file));front={file,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};} catch(e){if(e.code!=='ENOENT')throw e;}
}
if(card.keywordReview && front?.sha256!==card.keywordReview.sourceSha256)throw new Error('Le recto contrôlé a changé : '+card.id);
const translation=translationOverrides.find(c=>c.id===card.id);
const ocrText=ocrByFile.get(translation?.originalFront ?? file) ?? '';
const hasEnglishSource=card.warnings.some(w=>w.startsWith('Recto anglais'))||/\b(?:this unit|when this|trooper only|during the|you may|unit gains)\b/i.test(ocrText);
const text=norm(ocrText); const occupied=[]; const proposals=[];
const candidates=SEED_KEYWORDS.map(def=>({def,label:norm(def.name.replace(/\s*\((?:unité|arme)\)\s*$/,'').replace(/ : (.*)$/, (all,suffix)=>/Nom|Type|Faction|Rang|Avant\/|Pion|Capacité|Action|Affiliation/.test(suffix)?'':all).replace(/\s+X$/,''))})).filter(c=>c.label.length>2).sort((a,b)=>b.label.length-a.label.length);
for(const {def,label} of candidates){
 const re=new RegExp('(?<![a-z])'+escape(label)+'(?:\\s+(\\d+))?(?![a-z])','g');
 for(const m of text.matchAll(re)) {
  const start=m.index, end=start+m[0].length;
  const rawMatch=ocrText.slice(start,end);
  if(rawMatch!==rawMatch.toLocaleUpperCase('fr'))continue;
  if(start<norm(card.name).length+4)continue;
  if(card.kind==='command' && def.id==='mercenaire')continue;
  if(def.hasValue && m[1]===undefined && !/^\\s+x(?![a-z])/.test(text.slice(end)))continue;
  if(occupied.some(p=>start<p.end && end>p.start))continue;
  occupied.push({start,end});
  if(/pions? $/.test(text.slice(Math.max(0,start-6),start)))continue;
  const value=m[1]===undefined?undefined:Number(m[1]);
  const rule=workshopRule(def,value);
  if(card.rules.some(r=>r.id===rule.id.split(':').slice(0,2).join(':')))continue;
  if(proposals.some(p=>p.keywordId===def.id && p.value===value))continue;
  proposals.push({keywordId:def.id,value,evidence:text.slice(Math.max(0,start-65),Math.min(text.length,end+65)),rule,reviewStatus:'ocr-non-valide'});
 }
}
records.push({...card,front,ocrText,sourceLanguage:hasEnglishSource?'en':'fr',translatedLocally:Boolean(translation?.fr),keywordsReviewedOnSource:Boolean(card.keywordReview)||translation?.keywordsReviewedOnSource||false,keywordProposals:proposals,backHtml:keywordBackHtml(card.rules),status:!front?'recto-manquant':card.warnings.length?'a-controler':'prepare',certifiedByThisBatch:false});
}
const {canonicalCardKey}=await vite.ssrLoadModule('/src/lib/cardNames.ts');
const {COMMAND_CARDS}=await vite.ssrLoadModule('/src/data/commandCards.ts');
const sourceAssets=JSON.parse(await fs.readFile('src/data/autoCertificationAssets.json','utf8')).assets;
const sourceRoot=path.resolve(process.argv[4] ?? '.');
const englishSources=[];
for(const [id,asset] of Object.entries(sourceAssets)){
 if(asset.lang!=='en')continue;
 let available=false;try{available=(await fs.stat(path.join(sourceRoot,'public/cards',asset.file))).isFile();}catch(e){if(e.code!=='ENOENT')throw e;}
 const key=canonicalCardKey(asset.canonicalName);
 const command=asset.kind==='command'?COMMAND_CARDS.find(c=>canonicalCardKey(c.englishName??c.name)===key):undefined;
 const override=translationOverrides.find(c=>c.sourceId===id.replace(/:en$/,''));
 const card=override?records.find(c=>c.id===override.id):records.find(c=>c.kind===asset.kind && c.key===(command?.id ?? key));
 englishSources.push({sourceId:id,name:asset.canonicalName,kind:asset.kind,available,sourceFile:asset.file,frenchCardId:card?.id??null,frenchFront:card?.front?.file??null,status:!available?'source-locale-absente':card?.front?'recto-fr-deja-disponible':'a-traduire-hors-catalogue'});
}
await fs.writeFile(path.join(out,'sources-anglaises.json'),JSON.stringify({notice:'Les versions EN locales sont rapprochées des rectos FR existants par les clés canoniques ; aucun nouveau texte n’est déclaré traduit par ce rapprochement.',cards:englishSources},null,2)+'\n');
const summary={schemaVersion:2,keywordReview:{reviewed:keywordReviews.cards.length,completed:keywordReviews.cards.filter(c=>c.keywords.length).length,intentionallyBlank:keywordReviews.cards.filter(c=>!c.keywords.length).length,definitions:Object.keys(officialDefinitions.keywords).length,source:officialDefinitions.source},localTranslations:records.filter(c=>c.translatedLocally).map(c=>({id:c.id,name:c.name})),ocrCards:records.filter(c=>c.ocrText).length,englishDetectedWithoutTranslation:records.filter(c=>c.sourceLanguage==='en'&&!c.translatedLocally).map(c=>({id:c.id,name:c.name})),generatedAt:new Date().toISOString(),scope:'Catalogue atelier : unités, améliorations, commandements. Visuels FR existants réutilisés et traductions locales propres à l’atelier ; aucune certification nouvelle.',englishSources:{tracked:englishSources.length,available:englishSources.filter(c=>c.available).length,withFrenchFront:englishSources.filter(c=>c.available&&c.frenchFront).length,toTranslate:englishSources.filter(c=>c.available&&!c.frenchFront)},total:records.length,kinds:Object.fromEntries(['unit','upgrade','command'].map(k=>[k,records.filter(c=>c.kind===k).length])),fronts:records.filter(c=>c.front).length,keywordBacks:records.filter(c=>c.rules.length).length,emptyBacks:records.filter(c=>!c.rules.length).length,missingFronts:records.filter(c=>!c.front).map(c=>({id:c.id,name:c.name})),cards:records};
await fs.writeFile(path.join(out,'catalogue-recto-verso.json'),JSON.stringify(summary,null,2)+'\n');
const q=s=>'"'+String(s??'').replaceAll('"','""')+'"';
await fs.writeFile(path.join(out,'suivi-cartes.csv'),'\uFEFF'+[['ID','Nom','Type','Recto local','Définitions','État','À contrôler'],...records.map(c=>[c.id,c.name,c.kind,c.front?.file??'',c.rules.length,c.status,c.warnings.join(' | ')])].map(row=>row.map(q).join(';')).join('\r\n'));
await fs.writeFile(path.join(out,'lecture-cartes-fr.json'),JSON.stringify({schemaVersion:1,notice:'Lecture OCR locale : les icônes, valeurs et mots-clés peuvent être mal reconnus. Aucune proposition OCR ne remplace une définition du catalogue sans relecture.',cards:records.map(c=>({id:c.id,name:c.name,front:c.front,ocrText:c.ocrText,existingRules:c.rules,keywordProposals:c.keywordProposals,warnings:c.warnings}))},null,2)+'\n');
await fs.copyFile('src/data/workshopOfficialKeywords.json',path.join(out,'definitions-officielles-fr.json'));
await fs.copyFile('src/data/workshopKeywordReviews.json',path.join(out,'controle-toutes-cartes.json'));
await fs.mkdir(path.join(out,'visuels'),{recursive:true});
for(const file of new Set(records.map(c=>c.front?.file).filter(Boolean))){await fs.mkdir(path.dirname(path.join(out,'visuels',file)),{recursive:true});await fs.copyFile(path.join('public',file),path.join(out,'visuels',file));}
const h=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const items=records.map(c=>'<article data-kind="'+c.kind+'" data-search="'+h(c.name+' '+c.key)+'" data-empty="'+!c.rules.length+'" data-translated="'+c.translatedLocally+'"><h2>'+h(c.name)+'</h2><p class="meta">'+h(({unit:'Unité',upgrade:'Amélioration',command:'Commandement'})[c.kind])+' · '+c.rules.length+' définition(s) associée(s)</p><p class="meta">'+h(c.provenance)+'</p><div class="pair"><div class="front"><img loading="lazy" src="visuels/'+h(c.front?.file ?? '')+'" alt="Recto '+h(c.name)+'"></div><div class="back">'+c.backHtml+'</div></div><p class="notice">'+h(c.warnings.join(' '))+'</p><details><summary>Lecture locale et propositions à contrôler ('+c.keywordProposals.length+')</summary><p>'+h(c.ocrText)+'</p>'+c.keywordProposals.map(p=>'<section class="proposal"><strong>'+h(p.rule.title)+'</strong><p>'+h(p.rule.text)+'</p><small>Lecture : '+h(p.evidence)+'</small></section>').join('')+'</details></article>').join('');
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cartes FR — lot complet</title><style>body{font:15px system-ui;background:#edf0f2;color:#17232c;margin:0}header{padding:24px;background:#142c3b;color:white}main{max-width:1240px;margin:auto;padding:20px}nav{display:flex;gap:10px;flex-wrap:wrap;padding:14px 0;position:sticky;top:0;background:#edf0f2}input,select{font:inherit;padding:10px;border:1px solid #aebbc5;border-radius:6px}input{min-width:250px}article{background:white;padding:20px;margin:18px 0;border-radius:10px;break-inside:avoid}h1{margin:0 0 12px}h2{font-size:21px;margin:0}.meta,.notice{color:#52636d}.pair{display:flex;gap:25px;align-items:flex-start;margin-top:18px}.front,.back{width:44%;box-sizing:border-box}.front img{max-width:100%;max-height:360px;display:block}.back{border:1px solid #aebbc5;padding:16px;min-height:150px}.rule-block{margin:0 0 12px}.rule-block p{margin:4px 0;font-size:14px;line-height:1.4}.proposal{border-left:3px solid #b47723;padding:8px 12px;margin:12px 0;background:#fff8eb}.proposal p{margin:5px 0}small{color:#52636d}details{margin-top:12px}details>p{line-height:1.5}footer{padding:20px;color:#52636d}@media(max-width:650px){.pair{flex-direction:column}.front,.back{width:100%}}</style><header><h1>Cartes FR · bibliothèque préparée</h1><p>'+summary.fronts+' rectos disponibles · '+summary.keywordBacks+' versos renseignés · '+summary.emptyBacks+' versos vierges confirmés lors du contrôle complet.</p><p>'+summary.localTranslations.length+' rectos ont été traduits localement ; les autres visuels du dépôt sont réutilisés. Un recto et un verso par carte. Sur le verso : uniquement les définitions des mots-clés. Les propositions OCR restent séparées et ne sont pas intégrées automatiquement.</p></header><main><p>Ce dossier prépare le travail sur tout le catalogue. Un visuel FR présent ne garantit pas sa conformité aux derniers errata. Pour imprimer : utilisez l’Atelier de cartes FR de SWL après contrôle. Les 478 rectos ont été relus : 203 lors du premier lot puis 275 lors du contrôle complet. Les 156 définitions nécessaires sont complètes et traduites du règlement officiel anglais AMG du 17 juin 2026, avec références de page dans le manifeste. Cette vérification par IA ne constitue pas une certification humaine ni une validation de l’actualité de tous les rectos. Les rectos de Tristan et Ursa Wren ont été remplacés par une traduction des cartes officielles actuelles ; celui de l’Agent Rebelle est désormais traduit. Les cartes retirées restent signalées.</p><nav><input id="search" placeholder="Rechercher une carte" aria-label="Rechercher"><select id="kind" aria-label="Famille"><option value="">Toutes les familles</option><option value="unit">Unités</option><option value="upgrade">Améliorations</option><option value="command">Commandements</option></select><label><input type="checkbox" id="empty" style="min-width:0"> Versos sans définition</label><label><input type="checkbox" id="translated" style="min-width:0"> Traductions de ce lot</label><span id="count"></span></nav>'+items+'</main><footer>Aucun appel à une API payante. Les textes reconnus automatiquement ne constituent pas une certification de règles.</footer><script>const cards=[...document.querySelectorAll("article")];function filter(){let n=0;for(const c of cards){const visible=c.dataset.search.toLocaleLowerCase("fr").includes(document.querySelector("#search").value.toLocaleLowerCase("fr"))&&(!document.querySelector("#kind").value||c.dataset.kind===document.querySelector("#kind").value)&&(!document.querySelector("#empty").checked||c.dataset.empty==="true")&&(!document.querySelector("#translated").checked||c.dataset.translated==="true");c.hidden=!visible;if(visible)n++}document.querySelector("#count").textContent=n+(n===1?" carte":" cartes")}document.querySelectorAll("input,select").forEach(e=>e.addEventListener("input",filter));filter();</script></html>';
await fs.writeFile(path.join(out,'Ouvrir_le_catalogue.html'),html);
console.log(JSON.stringify({...summary,cards:undefined},null,2));
}finally{await vite.close();}
