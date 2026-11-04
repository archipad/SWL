import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const vite=await createServer({server:{middlewareMode:true},appType:'custom',optimizeDeps:{noDiscovery:true}});
try {
 const {SEED_KEYWORDS}=await vite.ssrLoadModule('/src/data/keywords.ts');
 const {workshopRulesForMode}=await vite.ssrLoadModule('/src/lib/cardWorkshopText.ts');
 const {planWorkshopPages,workshopPageLayout,keywordBackHtml,cropMarksHtml,WORKSHOP_MAX_PRINT_CARDS}=await vite.ssrLoadModule('/src/lib/cardWorkshopPrint.ts');
 const official=JSON.parse(fs.readFileSync('src/data/workshopOfficialKeywords.json','utf8'));
 const compact=JSON.parse(fs.readFileSync('src/data/workshopCompactKeywords.json','utf8'));
 const coverage=JSON.parse(fs.readFileSync('src/data/workshopKeywordCoverage.json','utf8'));
 const topics=JSON.parse(fs.readFileSync('src/data/workshopReferenceTopics.json','utf8')).topics;
 const definitions=new Map(SEED_KEYWORDS.map(k=>[k.id,k]));
 assert.equal(coverage.entries.length,197);assert.equal(new Set(coverage.entries.map(e=>e.englishName)).size,197);
 for(const entry of coverage.entries) {
   const definition=entry.keywordId?definitions.get(entry.keywordId):topics.find(t=>t.id===entry.topicId);
   assert.ok(definition?.definition?.trim(), 'Définition FR absente : '+entry.englishName);
 }
 assert.equal(coverage.entries.find(e=>e.englishName==='Overrun').keywordId,'bordee-x');
 assert.equal(coverage.entries.find(e=>e.englishName==='Override').keywordId,'surcharge');
 assert.equal(coverage.entries.find(e=>e.englishName==='Hold the Line').keywordId,'tenir-bon');
 assert.equal(coverage.entries.find(e=>e.englishName==='Tough').keywordId,'coriace');
 assert.equal(new Set(SEED_KEYWORDS.map(k=>k.id)).size,SEED_KEYWORDS.length);
 for(const [id,full] of Object.entries(official.keywords)) {
   const short=compact.keywords[id];assert.ok(short?.text?.trim(),'Résumé absent : '+id);
   assert.equal(short.sourceDefinitionSha256,createHash('sha256').update(full.definition).digest('hex'),'La source intégrale a changé : relire '+id);
   assert.equal(short.sourcePage,full.page);
 }
 assert.ok(definitions.get('coriace').sourceUrl.includes('atomicmassgames.com'));
 assert.ok(compact.keywords.coriace.text);
 for(const id of Object.keys(compact.keywords))assert.ok(definitions.has(id),'Identifiant court inconnu : '+id);
 const impact={id:'impact-x:3',title:'Impact 3',text:'Texte intégral témoin',source:'AMG',timing:''};
 const shortImpact=workshopRulesForMode([impact],'compact')[0];
 assert.ok(shortImpact.text.includes('3 [TOUCHE]')&&shortImpact.text.includes('Armure X'),'le X du défenseur ne prend pas la valeur de l’arme');
 assert.equal(impact.text,'Texte intégral témoin');assert.equal(workshopRulesForMode([impact],'full')[0],impact);
 assert.ok(workshopRulesForMode([{...impact,title:'Impact 1 / Impact 3'}],'compact')[0].text.includes('X [TOUCHE]'),'plusieurs valeurs partagées ne deviennent pas une seule valeur');
 const impactBack=keywordBackHtml([impact],'compact','/icons/');assert.ok(impactBack.includes('<img class="die" src="/icons/hit.png" alt="touche">')&&impactBack.includes('crit.png')&&!impactBack.includes('[TOUCHE]'),'les résultats de dé du verso sont des icônes, pas du texte');
 const repair=workshopRulesForMode([{...impact,id:'reparation-x:2',title:'Réparation 2 : Capacité 3'}],'compact')[0];
 assert.ok(repair.text.includes('Capacité 3')&&repair.text.includes('1 pion')&&repair.text.includes('2 figurines'),'Réparation conserve le 1 littéral du règlement, la capacité et la restauration');
 const air=workshopRulesForMode([{...impact,id:'sustentation:2',title:'Sustentation : Aérienne 2'}],'compact')[0];
 assert.ok(!air.text.includes('Terrestre :')&&air.text.includes('hauteur ≤ 2')&&air.text.includes('Déraper'),'une variante explicite ne présente pas la branche inapplicable');
 const action=workshopRulesForMode([{...impact,id:'autonome:X',title:'Autonome : Se déplacer'}],'compact')[0];assert.ok(!action.text.includes('X')&&action.text.includes('gratuitement'));
 const reviews=JSON.parse(fs.readFileSync('src/data/workshopKeywordReviews.json','utf8'));
 assert.equal(reviews.cards.find(c=>c.id==='unit:mandalorian hunter').keywords.find(k=>k.keywordId==='saut-x').value,3);
 assert.equal(reviews.cards.find(c=>c.id==='upgrade:champion of the watch').keywords[0].value,1);
 const {buildWorkshopCatalog}=await vite.ssrLoadModule('/src/lib/cardWorkshop.ts');
 const {SEED_CARD_TAGS}=await vite.ssrLoadModule('/src/data/cardTags.ts');
 for(const card of buildWorkshopCatalog(SEED_CARD_TAGS,SEED_KEYWORDS)) if(card.keywordReview) assert.ok(!card.warnings.some(w=>w.startsWith('Mot-clé à associer')), 'un signalement ancien ne survit pas à la revue du recto');
 const unknown={...impact,id:'personal-inconnu:X'};assert.equal(workshopRulesForMode([unknown],'compact')[0],unknown,'une définition personnelle inconnue reste intégrale');
 for(const [format,capacity]of [['standard',9],['binder',8],['cut',8],['collection',4]]) {
   const layout=workshopPageLayout(format);assert.equal(layout.columns*layout.rows,capacity);
   assert.ok(layout.x>=5&&layout.y>=5);assert.ok(layout.x+layout.columns*layout.slotWidth+(layout.columns-1)*layout.gap<=layout.width-5+.001);
   assert.ok(layout.y+layout.rows*layout.slotHeight+(layout.rows-1)*layout.gap<=layout.height-5+.001);
   for(const count of [1,capacity-1,capacity,capacity+1,37,478]){
     const items=Array.from({length:count},(_,i)=>({cardId:'card:'+Math.floor(i/2),copy:i%2,orientation:i%2?'landscape':'portrait'}));
     const pages=planWorkshopPages(items,format);assert.equal(pages.length,Math.ceil(count/capacity),'aucune page gaspillée entre les deux orientations');
     assert.deepEqual(pages.flatMap(p=>p.front).filter(Boolean),items);
     for(const page of pages)for(let i=0;i<capacity;i++)assert.equal(page.front[i],page.back[Math.floor(i/layout.columns)*layout.columns+layout.columns-1-i%layout.columns],'même carte et même copie après retournement bord long');
   }
 }
 const cut=workshopPageLayout('cut');assert.deepEqual([cut.gap,cut.slotWidth,cut.slotHeight,cut.x,cut.y],[0,98,68,7,12.5],'découpe plastifiée : cartes jointives 68 × 98 mm centrées');
 const marks=[...cropMarksHtml(cut).matchAll(/left:([\d.]+)mm;top:([\d.]+)mm;width:([\d.]+)mm;height:([\d.]+)mm/g)].map(m=>m.slice(1).map(Number));
 assert.equal(marks.length,2*(cut.columns+1)+2*(cut.rows+1),'un trait de chaque côté pour chaque ligne de coupe');
 for(const [l,t,w,h]of marks){assert.ok(l>=3-.001&&t>=3-.001&&l+w<=cut.width-3+.001&&t+h<=cut.height-3+.001,'trait dans la zone imprimable');
  const inX=l+w>cut.x&&l<cut.x+cut.columns*cut.slotWidth,inY=t+h>cut.y&&t<cut.y+cut.rows*cut.slotHeight;assert.ok(!(inX&&inY),'aucun trait sur une carte');}
 // La bibliothèque entière s'imprime en un seul lot, et chaque mot-clé d'un verso a sa définition condensée.
 const library=buildWorkshopCatalog(SEED_CARD_TAGS,SEED_KEYWORDS);assert.ok(library.length<=WORKSHOP_MAX_PRINT_CARDS,'la bibliothèque entière dépasse la limite d’impression');
 for(const card of library)for(const rule of card.rules)assert.ok(compact.keywords[rule.id.split(':')[0]],'Définition condensée absente : '+rule.id.split(':')[0]+' ('+card.name+')');
 console.log('Atelier compact : 156 définitions condensées + Tough, 197 entrées HQ définies, paramètres indépendants, grilles A4 9/8/4 et duplex partiel vérifiés.');
} finally {await vite.close();}
