import { keywordOnlyRules, type SheetItem, type WorkshopCard, type WorkshopOrientation, type WorkshopRule } from './cardWorkshop';
import { workshopRulesForMode, type WorkshopTextMode } from './cardWorkshopText';
export type WorkshopPrintFormat = 'auto' | 'standard' | 'binder' | 'collection' | 'large' | 'full';
export type ResolvedWorkshopFormat = Exclude<WorkshopPrintFormat, 'auto'>;
export const WORKSHOP_FORMAT_LABELS: Record<ResolvedWorkshopFormat,string> = {
  standard:'Classique · 62 × 88 mm · 9 cartes/A4', binder:'Classeur conseillé · 68 × 98 mm · 8 cartes/A4',
  collection:'Confort · 90 × 128 mm · 4 cartes/A4', large:'Intégral agrandi · 138 × 195 mm', full:'Intégral grand A4 · 195 × 282 mm',
};
export interface WorkshopPageLayout { width:number; height:number; slotWidth:number; slotHeight:number; columns:number; rows:number; gap:number; x:number; y:number }
export interface WorkshopPrintItem extends SheetItem { orientation:WorkshopOrientation }
export interface WorkshopPagePair { layout:WorkshopPageLayout; front:(WorkshopPrintItem|null)[]; back:(WorkshopPrintItem|null)[] }
export function workshopCardSize(format:ResolvedWorkshopFormat, orientation:WorkshopOrientation):[number,number] {
  const size:Record<ResolvedWorkshopFormat,[number,number]>={standard:[62,88],binder:[68,98],collection:[90,128],large:[138,195],full:[195,282]};
  const [short,long]=size[format]; return orientation==='landscape'?[long,short]:[short,long];
}
export function workshopPageLayout(format:ResolvedWorkshopFormat, orientation:WorkshopOrientation='portrait'):WorkshopPageLayout {
  let width=210,height=297,slotWidth=62,slotHeight=88,columns=3,rows=3,gap=3;
  if(format==='binder') {slotWidth=98;slotHeight=68;columns=2;rows=4;gap=4;}
  if(format==='collection') {slotWidth=90;slotHeight=128;columns=2;rows=2;gap=4;}
  if(format==='large'||format==='full') {
    [slotWidth,slotHeight]=workshopCardSize(format,orientation);columns=rows=1;gap=0;
    if(format==='full'&&orientation==='landscape'){width=297;height=210;}
  }
  return {width,height,slotWidth,slotHeight,columns,rows,gap,x:(width-columns*slotWidth-(columns-1)*gap)/2,y:(height-rows*slotHeight-(rows-1)*gap)/2};
}
/** Multi-card layouts use portrait A4 and mirror columns for long-edge duplex, including empty slots. */
export function planWorkshopPages(items:WorkshopPrintItem[],format:ResolvedWorkshopFormat):WorkshopPagePair[] {
  const pages:WorkshopPagePair[]=[];
  for(let from=0;from<items.length;) {
    const layout=workshopPageLayout(format,items[from].orientation),capacity=layout.columns*layout.rows;
    const front=Array.from({length:capacity},(_,i)=>items[from+i]??null);
    const back=front.map((_,i)=>front[Math.floor(i/layout.columns)*layout.columns+layout.columns-1-i%layout.columns]);
    pages.push({layout,front,back});from+=capacity;
  }
  return pages;
}
export const WORKSHOP_PRINT_CSS=String.raw`
@page{size:A4 portrait;margin:0}@page wide{size:A4 landscape;margin:0}
*{box-sizing:border-box}body{margin:0;background:#e6e7e9;color:#14232b;font-family:Arial,sans-serif}
.sheet{background:white;position:relative;break-after:page;page-break-after:always;margin:0 auto 8mm}.sheet.wide{page:wide}.sheet:last-child{break-after:auto;page-break-after:auto}
.sheet-grid{position:absolute;display:grid}.physical-card{position:relative;outline:.18mm dashed #999;background:#fff}
.card-face{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:white}
.card-face.turn-front{transform:translate(-50%,-50%) rotate(90deg)}.card-face.turn-back{transform:translate(-50%,-50%) rotate(-90deg)}
.card-face.front img{width:100%;height:100%;object-fit:contain;display:block}
.workshop-back{padding:2.5mm;display:flex;flex-direction:column;font-size:9pt;line-height:1.2}.back-body{flex:1;min-height:0}
.rule-block{margin:0 0 1.5mm;overflow-wrap:anywhere;white-space:pre-wrap}.rule-block strong{display:block}.rule-block p{margin:0}
[data-text-mode=compact] .workshop-back{padding:2mm;line-height:1.16}[data-text-mode=compact] .rule-block{display:inline;margin:0}[data-text-mode=compact] .rule-block:not(:last-child)::after{content:" • ";white-space:normal}[data-text-mode=compact] .rule-block strong{display:inline}[data-text-mode=compact] .rule-block p{display:inline;margin-left:.28em}
.sheet-label{position:absolute;bottom:2mm;left:5mm;right:5mm;font-size:6pt;text-align:center;color:#555}
.measurement{position:fixed;left:-20000px;top:0;visibility:hidden}.measurement .card-face{position:relative;left:auto;top:auto;transform:none!important}
.instructions{max-width:800px;margin:20px auto;padding:16px;background:white;font-size:14px;line-height:1.5}.calibration{display:flex;align-items:center;justify-content:center;text-align:center;font-size:18pt}.calibration small{display:block;font-size:9pt}
@media print{body{background:white}.sheet{margin:0}.instructions{display:none}}
`;
export const escapeWorkshopHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const e=escapeWorkshopHtml;
export const keywordBackHtml=(rules:WorkshopRule[],mode:WorkshopTextMode='compact')=>workshopRulesForMode(keywordOnlyRules(rules),mode).map(rule=>'<section class="rule-block"><strong>'+e(rule.title)+'</strong><p>'+e(rule.text)+'</p></section>').join('');
const backHtml=(item:SheetItem,mode:WorkshopTextMode)=>'<div class="back-body" style="font-size:'+(item.fontSizePt??9)+'pt">'+keywordBackHtml(item.rules,mode)+'</div>';
export function fitSingleBack(doc:Document,card:WorkshopCard,orientation:WorkshopOrientation,format:ResolvedWorkshopFormat='standard',mode:WorkshopTextMode='compact'):number {
  const host=doc.createElement('div');host.className='measurement';host.dataset.textMode=mode;
  const box=doc.createElement('article');box.className='card-face workshop-back';const [w,h]=workshopCardSize(format,orientation);box.style.width=w+'mm';box.style.height=h+'mm';
  box.innerHTML=backHtml({cardId:card.id,copy:0,name:card.name,rules:card.rules,provenance:card.provenance,warnings:card.warnings},mode);host.append(box);doc.body.append(host);
  const body=box.querySelector<HTMLElement>('.back-body')!;
  try {for(const size of [9.5,9,8.5,8,7.5]){body.style.fontSize=size+'pt';if(body.clientHeight>10&&body.scrollHeight<=body.clientHeight+1&&body.scrollWidth<=body.clientWidth+1&&box.scrollHeight<=box.clientHeight+1)return size;}
    throw new Error('« '+card.name+' » : texte trop long pour un seul verso dans ce format. Choisissez un format plus grand. Aucun texte coupé, aucune carte supplémentaire.');
  } finally {host.remove();}
}
async function loadPrintImage(src:string,win:Window):Promise<HTMLImageElement>{return await new Promise((resolve,reject)=>{const image=new Image();const timer=win.setTimeout(()=>reject(new Error('Chargement du recto trop long. Réessayez après avoir ouvert la carte.')),12000);image.onload=()=>{win.clearTimeout(timer);image.naturalWidth?resolve(image):reject(new Error('Recto illisible.'));};image.onerror=()=>{win.clearTimeout(timer);reject(new Error('Recto introuvable : impression annulée.'));};image.src=src;});}
function renderItem(item:WorkshopPrintItem,side:'front'|'back',layout:WorkshopPageLayout,format:ResolvedWorkshopFormat,mode:WorkshopTextMode):string {
  const [w,h]=workshopCardSize(format,item.orientation),turned=(w>h)!==(layout.slotWidth>layout.slotHeight);
  // Opposite front/back rotations keep the reading direction when a cut card is turned like a book.
  return '<article class="physical-card" data-card-id="'+e(item.cardId)+'" data-copy="'+item.copy+'" style="width:'+layout.slotWidth+'mm;height:'+layout.slotHeight+'mm"><div class="card-face '+(side==='front'?'front':'workshop-back')+(turned?' turn-'+side:'')+'" style="width:'+w+'mm;height:'+h+'mm">'+(side==='front'?'<img src="'+e(item.front!)+'" alt="'+e(item.name)+'">':backHtml(item,mode))+'</div></article>';
}
export interface WorkshopPrintResult {physicalCards:number;pages:number;sheets:number;capacity:number;format:ResolvedWorkshopFormat;minFontSizePt:number}
export async function prepareWorkshopPrint(win:Window,cards:WorkshopCard[],quantities:Record<string,number>,format:WorkshopPrintFormat='auto',mode:WorkshopTextMode='compact'):Promise<WorkshopPrintResult>{
  const doc=win.document;doc.open();doc.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Cartes Legion FR · recto verso</title><style>'+WORKSHOP_PRINT_CSS+'</style></head><body><div class="instructions">Préparation des cartes…</div></body></html>');doc.close();
  const originals:{card:WorkshopCard;orientation:WorkshopOrientation;front:string;qty:number}[]=[];let count=0;
  for(const card of cards){const qty=quantities[card.id]??0;if(!qty)continue;if(!Number.isInteger(qty)||qty<1||qty>99)throw new Error('Quantité attendue : de 1 à 99.');if(!card.image)throw new Error('Recto manquant : '+card.name+'.');if(count+qty>600)throw new Error('Maximum 600 cartes physiques par lot.');const image=await loadPrintImage(new URL(card.image,window.location.href).href,win);originals.push({card,orientation:image.naturalWidth>image.naturalHeight?'landscape':'portrait',front:image.src,qty});count+=qty;}
  if(!count)throw new Error('Sélectionnez au moins une carte.');
  let chosen:ResolvedWorkshopFormat|undefined;let sizes=new Map<string,number>();
  const candidates:ResolvedWorkshopFormat[]=format==='auto'?(mode==='compact'?['standard','binder','collection']:['standard','binder','collection','large','full']):[format];
  for(const candidate of candidates){const trial=new Map<string,number>();let fits=true;for(const {card,orientation}of originals){try{trial.set(card.id,fitSingleBack(doc,card,orientation,candidate,mode));}catch(err){fits=false;if(format!=='auto')throw err;break;}}if(fits){chosen=candidate;sizes=trial;break;}}
  if(!chosen)throw new Error('Les définitions ne tiennent pas toutes dans un format multi-cartes. Impression bloquée : aucun texte coupé. Vérifiez les cartes personnelles ou utilisez le règlement intégral dans un format adapté.');
  const items:WorkshopPrintItem[]=originals.flatMap(({card,orientation,front,qty})=>Array.from({length:qty},(_,copy)=>({cardId:card.id,name:card.name,copy,orientation,front,rules:card.rules,provenance:card.provenance,warnings:card.warnings,fontSizePt:sizes.get(card.id)})));
  const pairs=planWorkshopPages(items,chosen);let html='<div class="instructions"><strong>'+count+' cartes · '+pairs.length+' feuilles A4 recto verso ('+(pairs.length*2)+' pages PDF)</strong><br>'+WORKSHOP_FORMAT_LABELS[chosen]+' · '+(mode==='compact'?'Aides de jeu condensées':'Définitions intégrales')+'. Taille réelle 100 %, sans en-têtes ni pieds de page, recto verso bord long. Ne pas ajuster à la page. Les rectos et versos tournés sont appariés ; une carte a exactement un recto et un verso, uniquement les définitions au dos. Faites la calibration avant le lot.</div>';
  pairs.forEach((pair,index)=>{for(const side of ['front','back']as const){const l=pair.layout;html+='<section class="sheet'+(l.width>l.height?' wide':'')+'" data-text-mode="'+mode+'" style="width:'+l.width+'mm;height:'+l.height+'mm"><div class="sheet-grid" style="left:'+l.x+'mm;top:'+l.y+'mm;grid-template-columns:repeat('+l.columns+','+l.slotWidth+'mm);grid-template-rows:repeat('+l.rows+','+l.slotHeight+'mm);gap:'+l.gap+'mm">'+pair[side].map(item=>item?renderItem(item,side,l,chosen!,mode):'<div></div>').join('')+'</div><div class="sheet-label">Feuille '+(index+1)+' · '+(side==='front'?'RECTOS':'VERSOS')+' · A4 · 100 % · bord long</div></section>';}});
  doc.body.innerHTML=html;await Promise.all([...doc.images].map(img=>img.decode()));for(const body of doc.querySelectorAll<HTMLElement>('.back-body'))if(body.scrollHeight>body.clientHeight+1||body.scrollWidth>body.clientWidth+1)throw new Error('Un verso déborde : impression annulée.');
  return {physicalCards:count,pages:pairs.length*2,sheets:pairs.length,capacity:pairs[0].layout.columns*pairs[0].layout.rows,format:chosen,minFontSizePt:Math.min(...sizes.values())};
}
export function prepareWorkshopCalibration(win:Window,format:ResolvedWorkshopFormat='standard'):void {
  const l=workshopPageLayout(format),n=l.columns*l.rows;let html='';
  for(const side of ['RECTO','VERSO']){html+='<section class="sheet" style="width:'+l.width+'mm;height:'+l.height+'mm"><div class="sheet-grid" style="left:'+l.x+'mm;top:'+l.y+'mm;grid-template-columns:repeat('+l.columns+','+l.slotWidth+'mm);grid-template-rows:repeat('+l.rows+','+l.slotHeight+'mm);gap:'+l.gap+'mm">';for(let i=0;i<n;i++){const number=side==='RECTO'?i+1:Math.floor(i/l.columns)*l.columns+l.columns-i%l.columns;html+='<article class="physical-card calibration" style="width:'+l.slotWidth+'mm;height:'+l.slotHeight+'mm"><div>↑<br>'+side+' '+number+'<small>'+l.slotWidth+' × '+l.slotHeight+' mm<br>Numéros superposés par transparence</small></div></article>';}html+='</div><div class="sheet-label">Calibration · A4 · 100 % · recto verso bord long · sans en-têtes</div></section>';}
  win.document.open();win.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Calibration Legion</title><style>'+WORKSHOP_PRINT_CSS+'</style></head><body>'+html+'</body></html>');win.document.close();
}
