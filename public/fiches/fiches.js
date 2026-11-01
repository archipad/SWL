/* Fiches d'unité : interface de consultation autonome (01/11/2026). Ni moteur d'attaque, ni app.js, ni état
   de partie : elle lit seulement les listes importées et le référentiel, et n'écrit que le choix du camp.
   Le sélecteur reprend le balisage de l'Assistant pour hériter de ses feuilles de style ; les tables recopiées
   d'app.js (rangs, visuels spéciaux) sont comparées à l'original par scripts/test-fiches.mjs. */
const $=s=>document.querySelector(s);const root=$('#app');const playerSideKey='swl.assistant.player-side.v1';let selectedArmy=localStorage.getItem(playerSideKey)||'p1';
const demo1={listName:'Patrouille impériale · démonstration',faction:'Empire',units:[{name:'Stormtroopers',upgrades:[{name:'HH-12 Stormtrooper'},{name:'Stormtrooper Specialist'},{name:'Targeting Scopes'}]},{name:'Snowtroopers',upgrades:[{name:'T-7 Ion Snowtrooper'}]},{name:'AT-ST',upgrades:[{name:'88i Twin Light Blaster'},{name:'DW-3 Concussion Grenade Launcher'}]}]};
const demo2={listName:'Patrouille rebelle · démonstration',faction:'Rebelles',units:[{name:'Rebel Troopers',upgrades:[{name:'Z-6 Trooper'}]},{name:'Rebel Veterans',upgrades:[{name:'CM-O/93 Trooper'}]},{name:'T-47 Airspeeder',upgrades:[{name:'Ax-108 "Ground Buzzer"'}]}]};
const read=(key,fallback)=>{const raw=localStorage.getItem(key);if(raw===null)return fallback;try{const parsed=JSON.parse(raw);return parsed===null||parsed===undefined?fallback:parsed}catch{return fallback}};
const reference=window.SWL_REFERENCE||{};
const upgradeCollisions=reference.upgradeNameCollisions||{};
const norm=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const fixUpgradeCollisions=list=>list&&Array.isArray(list.units)?{...list,units:list.units.map(unit=>({...unit,upgrades:(unit.upgrades||[]).map(up=>typeof up==='string'?{name:upgradeCollisions[norm(up)]||up}:{...up,name:upgradeCollisions[norm(up.name)]||up.name})}))}:list;
const list1=fixUpgradeCollisions(read('swl.list.p1.v1',demo1)),list2=fixUpgradeCollisions(read('swl.list.p2.v1',demo2));
const usingDemo=!localStorage.getItem('swl.list.p1.v1')||!localStorage.getItem('swl.list.p2.v1');
for(const list of [list1,list2])for(const unit of list.units||[])for(const upgrade of unit.upgrades||[])if(norm(upgrade.name)==='cassian andor')upgrade.name='Cassian Andor Operative';

// Le référentiel livré fait foi : le stockage local n'ajoute que ses propres mots-clés, étiquettes et définitions retouchées.
// Une étiquette présente des deux côtés garde la valeur certifiée, comme dans app.js : swl.card-tags.v1 contient aussi une copie de l'ancienne amorce.
const seedKeywords=reference.keywords||[],localKeywords=read('swl.keywords.v1',[]),localKeywordById=new Map(localKeywords.map(item=>[item.id,item])),seedKeywordIds=new Set(seedKeywords.map(item=>item.id));
const keywords=[...seedKeywords.map(seed=>{const mine=localKeywordById.get(seed.id);return mine?{...seed,definition:mine.definition??seed.definition,shortDefinition:mine.shortDefinition??seed.shortDefinition}:seed}),...localKeywords.filter(item=>!seedKeywordIds.has(item.id))];
const seedTags=reference.tags||{},localTags=read('swl.card-tags.v1',{}),removedTags=read('swl.card-tags-removed.v1',{});
const tags=(()=>{const merged={};for(const key of new Set([...Object.keys(seedTags),...Object.keys(localTags)])){const retired=reference.retiredKeywords?.[key]||[],removed=new Set([...(removedTags[key]||[]),...retired]),certified=(seedTags[key]||[]).filter(tag=>!removed.has(tag.keywordId)),certifiedIds=new Set(certified.map(tag=>tag.keywordId));merged[key]=[...certified,...(localTags[key]||[]).filter(tag=>!removed.has(tag.keywordId)&&!certifiedIds.has(tag.keywordId))]}return merged})();
const weaponProfiles=reference.weapons||{},cardAliases=reference.aliases||{};
const cardKey=name=>{let key=norm(name);const visited=new Set;while(cardAliases[key]&&!visited.has(key)){visited.add(key);key=cardAliases[key]}return key};
const displayName=name=>reference.names?.[norm(name)]||reference.names?.[cardKey(name)]||name;
const unitDisplayName=name=>displayName(name).split(/\s*(?:,|\s[–—-]\s)\s*/)[0].trim();
const esc=value=>String(value??'').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));

const specialImages={'at st':'tr-tt.jpg','at rt':'tl-tt.jpg','at rt flamethrower':'tl-tt-flame-projector.jpg','at st mortar launcher':'tr-tt-mortar-launcher.jpg','cm o 93 trooper':'cm-o93-trooper.jpg','mo dk power harpoon':'mo-dk-power-harpoon.jpg','darth vader the emperor s apprentice':'darth-vader-the-emperors-apprentice.jpg','iden s id10 seeker droid':'idens-id10-seeker-droid.jpg','jyn s se 14 blaster':'jyns-se-14-blaster.jpg','sabine s combat shield':'sabines-combat-shield.jpg','sabine s grapple line':'sabines-grapple-line.jpg','snowtrooper':'snowtrooper-upgrade.jpg','rebel veterans':'rebel-veterans.jpg','rebel troopers':'rebel-troopers.jpg','t 47 airspeeder':'t-47-airspeeder.jpg'};
const MISSING_CARD_IMAGE='../assistant/visuel-indisponible.svg',catalogFiles=new Set(Object.values(reference.images||{}).map(path=>String(path).split('/').pop()));
const imageFor=name=>{const key=cardKey(name),catalog=reference.images||{};return catalog[key]||(specialImages[key]&&catalogFiles.has(specialImages[key])?`../cards/${specialImages[key]}`:MISSING_CARD_IMAGE)};
const isMissingImage=src=>String(src||'').endsWith('visuel-indisponible.svg');
document.addEventListener('error',event=>{const img=event.target;if(img?.tagName!=='IMG'||img.dataset.missingVisual||!/\/cards\//.test(img.getAttribute('src')||''))return;img.dataset.missingVisual='1';img.src=MISSING_CARD_IMAGE;img.alt='Visuel indisponible'},true);

const rankCatalog={commandant:['rebel officer fighting for freedom','darth vader dark lord of the sith','director orson krennic','general veers','iden versio','moff gideon','leia organa','luke skywalker hero of the rebellion','han solo','lando calrissian','pyke syndicate capo','black sun vigo','gar saxon militant commando'],operative:['mandalorian hunter','darth vader the emperors apprentice','ahsoka tano','chewbacca','k 2so','luke skywalker jedi knight','sabine wren','r2 d2','the fifth brother','the seventh sister','rebel agent defender of democracy','boba fett infamous bounty hunter','boba fett daimyo of mos espa','agent kallus','cassian andor','jyn erso','maul a rival','bossk terror of trandosha','cad bane','ig 88','ig 11','din djarin','the bad batch'],corps:['stormtroopers','stormtrooper riot squad','snowtroopers','shoretroopers','rebel troopers','rebel veterans','fleet troopers','stormtrooper heavy gunner squad','mark ii medium blaster trooper','df 90 mortar trooper','pyke syndicate foot soldiers','black sun enforcers'],special:['imperial death troopers','imperial special forces','imperial special forces inferno squad','scout troopers','rebel commandos','rebel sleeper cell','mandalorian resistance','mandalorian resistance clan wren','wookiee warriors freedom fighters','wookiee warriors kashyyyk resistance','mandalorian super commandos'],support:['74 z speeder bikes','dewback rider','e web heavy blaster team','at rt','tl tt','tauntaun riders','1 4 fd laser cannon team','range troopers','rebel commandos strike team','scout troopers strike team','swoop bike riders'],heavy:['at st','tr tt','t 47 airspeeder','tx 225 occupier tank','laat le patrol transport','a a5 speeder truck','x 34 landspeeder','dark trooper squad','major marquand']};
const rankLabels={commandant:'Commandant',operative:'Agent',corps:'Troupiers',special:'Forces spéciales',support:'Soutien',heavy:'Lourd',unknown:'Rang à vérifier'},rankIcons={commandant:'commandant.png',operative:'agent.png',corps:'troupiers.png',special:'forces-speciales.png',support:'soutien.png',heavy:'lourd.png'};
function unitRank(unit){const explicit=norm(unit.rank||unit.section);if(/command/.test(explicit))return'commandant';if(/operat|agent/.test(explicit))return'operative';if(/corps|troup/.test(explicit))return'corps';if(/special/.test(explicit))return'special';if(/soutien|support/.test(explicit))return'support';if(/lourd|heavy/.test(explicit))return'heavy';const key=cardKey(unit.name);return Object.keys(rankCatalog).find(rank=>rankCatalog[rank].includes(key))||'unknown'}
const armies=[{id:'p1',list:list1},{id:'p2',list:list2}];
const entries=armies.flatMap(a=>{const totals={};(a.list.units||[]).forEach(u=>totals[norm(u.name)]=(totals[norm(u.name)]||0)+1);const seen={};return(a.list.units||[]).map((unit,index)=>{const key=norm(unit.name),occurrence=(seen[key]||0)+1;seen[key]=occurrence;return{id:`${a.id}:${unit.key||index}:${occurrence}`,army:a.id,label:a.list.listName||a.list.faction||a.id,unit,rank:unitRank(unit),occurrence,totalOccurrences:totals[key]}})});
const rankMask=rank=>`--rank-mask:url('../assistant/rank-icons/${rankIcons[rank]}')`;
const rankMark=e=>e.rank==='unknown'?'<span class="rank-icon rank-unknown">?</span>':`<span class="rank-icon" style="${rankMask(e.rank)}" role="img" aria-label="${rankLabels[e.rank]}" title="${rankLabels[e.rank]}"></span>`;
const profileFor=card=>weaponProfiles[cardKey(card)];
function certifiedUnitStats(entry){const stats=profileFor(entry?.unit?.name)?.unitStats;return stats?.verifiedAgainstCard?stats:null}
function entryName(e){const base=unitDisplayName(e.unit.name);return e.totalOccurrences>1?`${base} ${e.occurrence}`:base}
function unitModelsTotal(entry){const base=certifiedUnitStats(entry)?.baseModels;if(!Number.isInteger(base))return 0;return base+(entry.unit.upgrades||[]).reduce((sum,card)=>sum+(Number(profileFor(card.name)?.addedModels)||0),0)}
function unitFormation(entry){
  const base=certifiedUnitStats(entry)?.baseModels;
  if(!Number.isInteger(base)||entry.rank==='commandant'||entry.rank==='operative')return null;
  const added=(entry.unit.upgrades||[]).map(card=>Number(profileFor(card.name)?.addedModels)||0).filter(Boolean),key=cardKey(entry.unit.name),formula=[base,...added].join(' + ');
  if(/strike team/.test(key))return{kind:'Équipe spécialisée',formula};
  if(/squad/.test(key))return{kind:'Escouade spécialisée',formula};
  return{kind:base<=2?'Petite unité':'Unité complète',formula};
}
function factionClass(army){const faction=norm(army?.list?.faction||army?.list?.listName);return faction.includes('empire')||faction.includes('imperial')?'imperial':'rebel'}
function factionThemeForArmy(armyId){const army=armies.find(candidate=>candidate.id===armyId),identity=norm(`${army?.list?.faction||''} ${army?.list?.listName||''} ${(army?.list?.units||[]).map(unit=>unit.name).join(' ')}`);return /empire|imperial|stormtrooper|snowtrooper|dark vader|at st/.test(identity)?'imperial':'rebel'}
function applyFactionTheme(theme){document.body.dataset.factionTheme=theme;document.documentElement.style.colorScheme='dark';document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='imperial'?'#c8232c':'#ff8c1a')}
const codexPortraits={'darth vader dark lord of the sith':'darth-vader.png','stormtroopers':'stormtroopers-banner.png','snowtroopers':'snowtroopers.webp','scout troopers':'scout-troopers-hd.webp','at st':'at-st-hd.webp','imperial officer':'imperial-officer.png','rebel troopers':'rebel-troopers-hd.webp','luke skywalker':'luke-skywalker.png','rebel commandos strike team':'rebel-commandos-hd.webp','rebel commandos':'rebel-commandos-hd.webp','at rt':'at-rt-hd.webp','rebel officer':'rebel-officer.png'};
const tilePortrait=name=>{const file=window.SWL_CODEX_PORTRAITS?.[norm(name)]||codexPortraits[norm(name)];return file?(file.startsWith('../')?file:`../codex/portraits/${file}`):''};
const tileMini='<svg class="tile-mini" viewBox="0 0 12 20" aria-hidden="true"><circle cx="6" cy="3.4" r="2.6"/><path d="M2 8.6h8l-1 6H7.2L6 19.4 4.8 14.6H3z"/></svg>';

// ---- Sélecteur : même balisage que l'Assistant, sans l'état de partie (cette interface ne suit ni blessures ni pions). ----
function armyLabel(army,index){return army.list.listName||army.list.faction||`Joueur ${index+1}`}
function armySelector(){return `<div class="army-switch" role="tablist" aria-label="Choisir mon camp">${armies.map((army,index)=>`<button type="button" role="tab" aria-selected="${selectedArmy===army.id}" class="${selectedArmy===army.id?'active':''}" data-army="${army.id}" data-faction="${factionClass(army)}"><i class="faction-emblem ${factionClass(army)}" aria-label="${factionClass(army)==='imperial'?'Empire':'Alliance Rebelle'}"></i><small>${selectedArmy===army.id?'✓ MON CAMP':`JOUEUR ${index+1}`}</small><strong><b class="army-faction-title">${factionClass(army)==='imperial'?'Empire':'Alliance Rebelle'}</b><span class="army-list-name">${esc(armyLabel(army,index))}</span></strong><span>${(army.list.units||[]).length} unité(s)</span></button>`).join('')}</div>`}
function tile(e){const stats=certifiedUnitStats(e),models=unitModelsTotal(e),formation=unitFormation(e),portrait=tilePortrait(e.unit.name),label=entryName(e),nameSize=label.length>31?'xlong':label.length>22?'long':'normal',portraitVariant=/strike team|operative/.test(cardKey(e.unit.name))?'alternate':'base',soloWounds=models===1&&Number(stats?.woundsPerModel);return `<button data-faction="${factionThemeForArmy(e.army)}" class="unit-tile ${e.totalOccurrences>1?'is-repeated':''}" data-occurrence="${e.occurrence}" data-portrait-variant="${portraitVariant}" data-name-size="${nameSize}" data-id="${esc(e.id)}"><span class="tile-head">${rankMark(e)}<b class="rank-label">${rankLabels[e.rank]}</b></span><span class="tile-visual"><img class="${portrait?'art-portrait':'art-card'}" src="${portrait||imageFor(e.unit.name)}" alt="" onerror="this.style.visibility='hidden'">${rankMark(e)}</span><span class="tile-body"><strong>${esc(label)}</strong><span class="tile-meta">${formation?`<span class="tile-formation"><b>${formation.kind}</b><small>${formation.formula}</small></span>`:''}${models?`<span class="tile-minis" aria-hidden="true">${tileMini}</span><small class="tile-count">${models} figurine${models>1?'s':''}</small>`:''}${soloWounds?`<span class="tile-health"><span aria-hidden="true">♥</span>${soloWounds} PV</span>`:''}<svg class="tile-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></span></span></button>`}
function selectBarUnit(entry){const faction=factionThemeForArmy(entry.army),models=unitModelsTotal(entry),portrait=tilePortrait(entry.unit.name);return `<div class="cx-sel-unit" data-faction="${faction}"><i class="cx-side-emblem ${faction}" aria-hidden="true"></i><span class="cx-sel-thumb"><img class="${portrait?'cx-portrait':'cx-portrait-card'}" src="${portrait||imageFor(entry.unit.name)}" alt="" onerror="this.hidden=true"></span><div class="cx-sel-id"><small>Unité sélectionnée</small><strong>${esc(entryName(entry))}</strong><div class="cx-sel-meta">${models?`<span class="cx-sel-minis" aria-hidden="true">${tileMini.repeat(Math.min(models,10))}</span><small class="cx-sel-count">${models} figurine${models>1?'s':''}</small>`:''}</div></div></div>`}
const SEE_UNIT='<button type="button" class="primary" data-cx-confirm%DISABLED%>Voir l’unité<i class="cx-arrow" aria-hidden="true"></i></button>';
// Sélection en deux temps, comme l'Assistant : un toucher sélectionne, le bouton ou un second toucher ouvre la fiche.
function bindSelection(){
  const tiles=[...root.querySelectorAll('.unit-picker-grid .unit-tile')];if(!tiles.length)return;
  const bar=document.createElement('div');bar.className='cx-select-bar';root.append(bar);
  bar.innerHTML=`<div class="cx-sel-empty"><i class="cx-side-emblem ${factionThemeForArmy(selectedArmy)}" aria-hidden="true"></i><strong>Sélectionner une unité</strong></div><div class="cx-sel-actions">${SEE_UNIT.replace('%DISABLED%',' disabled')}</div>`;
  tiles.forEach(tile=>tile.onclick=event=>{
    const entry=entries.find(candidate=>candidate.id===tile.dataset.id);if(!entry)return;
    if(!event?.detail||tile.classList.contains('is-selected')){showUnit(entry);return}
    tiles.forEach(other=>other.classList.toggle('is-selected',other===tile));
    bar.innerHTML=`${selectBarUnit(entry)}<div class="cx-sel-actions">${SEE_UNIT.replace('%DISABLED%','')}</div>`;
    bar.querySelector('[data-cx-confirm]').onclick=()=>showUnit(entry);
  });
}
function showPicker(wipe=false){
  applyFactionTheme(factionThemeForArmy(selectedArmy));
  const rankOrder=[...Object.keys(rankIcons),'unknown'],available=entries.filter(e=>e.army===selectedArmy),ordered=rankOrder.flatMap(rank=>available.filter(e=>e.rank===rank)),cols=4;
  root.innerHTML=`<section class="intro">${armySelector()}${usingDemo?'<p class="notice">Mode démonstration : importez deux listes depuis la page principale pour retrouver vos propres unités ici.</p>':''}</section><div class="${wipe?'page-wipe':''}">${ordered.length?`<section class="army-units"><div class="unit-grid unit-picker-grid" style="--cols:${cols};--rows:${Math.ceil(ordered.length/cols)}">${ordered.map(tile).join('')}</div></section>`:'<p class="empty-selection">Aucune unité disponible.</p>'}</div>`;
  root.querySelectorAll('.army-switch button').forEach(button=>button.onclick=()=>{if(button.dataset.army===selectedArmy)return;selectedArmy=button.dataset.army;localStorage.setItem(playerSideKey,selectedArmy);showPicker(true)});
  bindSelection();
  scrollTo(0,0);
}

// ---- Mots-clés rangés par type ----
const diceIcons={attackSurge:['asurge.png','Adrénaline d’attaque'],defenseSurge:['dsurge.png','Adrénaline de défense'],hit:['hit.png','Touche'],block:['block.png','Blocage'],crit:['crit.png','Critique']};
const diceIcon=type=>{const [file,label]=diceIcons[type];return `<img class="dice-symbol" src="../icons/dice/${file}" alt="${label}" title="${label}">`};
const renderDiceText=text=>text
  .replace(/\[ADR-ATQ\]|adrénalines? d['’]attaque/gi,()=>diceIcon('attackSurge'))
  .replace(/\[ADR-DEF\]|adrénalines? de défense/gi,()=>diceIcon('defenseSurge'))
  .replace(/\[CRITIQUE\]|critiques?/gi,()=>diceIcon('crit'))
  .replace(/\[TOUCHE\]|touches?/gi,()=>diceIcon('hit'))
  .replace(/\[BLOC\]|blocages?|blocs?/gi,()=>diceIcon('block'));
// Comme l'Assistant : seul le X de la valeur du mot-clé affiché est substitué ; « Nom X » qui cite un autre mot-clé reste X, sauf « gagne Nom X » qui transmet la même valeur.
function definitionHtml(text,value){const bases=name=>String(name||'').replace(/\s+X\b.*$/,'').split('/').map(n=>n.trim()).filter(Boolean),names=keywords.filter(k=>k.hasValue).flatMap(k=>bases(k.name));return renderDiceText(esc(text).replace(/\bX\b/g,(match,at,whole)=>{const before=whole.slice(0,at).replace(/[\s/]+$/,''),cited=names.find(n=>before.endsWith(n));return cited&&!/\bgagne(nt)?\s*$/.test(before.slice(0,-cited.length))?match:(value??'X')}))}
const KEYWORD_SECTIONS=[
  {id:'attaque',label:'Attaque',icon:'attack'},
  {id:'défense',label:'Défense',icon:'defense'},
  {id:'autre',label:'Autre',icon:'rules'},
];
const keywordSections=def=>def.displaySections?.length?def.displaySections:[def.impact];
function keywordLabel(def,tag){
  const label=String(def.name).replace(/\bX\b/,tag.value??'X');
  return tag.detail?`${label.split(' : ')[0]} : ${tag.detail}`:label;
}
// Une ligne par mot-clé et par valeur : deux cartes qui portent le même mot-clé partagent leur ligne, deux valeurs différentes restent séparées (jamais d'addition implicite).
function unitKeywordRows(entry){
  const cards=[{name:entry.unit.name,source:'Carte d’unité'},...(entry.unit.upgrades||[]).map(up=>({name:up.name,source:displayName(up.name)}))],rows=new Map;
  for(const card of cards)for(const tag of tags[cardKey(card.name)]||[]){
    const def=keywords.find(item=>item.id===tag.keywordId);if(!def)continue;
    const key=`${def.id}|${tag.value??''}|${tag.detail??''}`;
    if(!rows.has(key))rows.set(key,{def,tag,sources:[]});
    if(!rows.get(key).sources.includes(card.source))rows.get(key).sources.push(card.source);
  }
  return [...rows.values()].sort((a,b)=>a.def.name.localeCompare(b.def.name,'fr'));
}
function keywordRow(row){
  const short=row.def.shortDefinition||row.def.definition||'',full=row.def.definition||'';
  return `<article class="fiche-kw"><header><h4>${esc(keywordLabel(row.def,row.tag))}</h4><small>${row.sources.map(esc).join(' · ')}</small></header><p>${definitionHtml(short,row.tag.value)}</p>${full&&full!==short?`<details><summary>Règle complète</summary><p>${definitionHtml(full,row.tag.value)}</p></details>`:''}</article>`;
}
// Effets de cartes : une amélioration sans mot-clé (À Bout Portant, Munitions Antichar) n'apparaîtrait nulle part ailleurs.
const UPGRADE_USES={exhaust:'Inclinable',discard:'Usage unique',both:'Inclinable · usage unique'};
function upgradeEffectRow(upgrade){
  const effect=window.SWL_UPGRADE_TEXTS?.[cardKey(upgrade.name)],use=UPGRADE_USES[effect?.use];
  return `<article class="fiche-kw"><header><h4>${esc(displayName(upgrade.name))}</h4>${use?`<small>${use}</small>`:''}</header><p>${effect?esc(effect.text):'<em>Texte non transcrit : voir le visuel de la carte.</em>'}</p></article>`;
}
function upgradePanel(entry){
  const upgrades=entry.unit.upgrades||[];
  return `<section class="fiche-kw-section" data-kw-section="amelioration"><h3><i class="cx-icon" style="--cx-icon:url(../codex/icons/tools.png)" aria-hidden="true"></i>Améliorations<b>${upgrades.length}</b></h3>${upgrades.length?upgrades.map(upgradeEffectRow).join(''):'<p class="fiche-kw-empty">Sans amélioration.</p>'}</section>`;
}
function keywordPanel(entry){
  const rows=unitKeywordRows(entry);
  return upgradePanel(entry)+KEYWORD_SECTIONS.map(section=>{
    const inSection=rows.filter(row=>keywordSections(row.def).includes(section.id));
    return `<section class="fiche-kw-section" data-kw-section="${section.id}"><h3><i class="cx-icon" style="--cx-icon:url(../codex/icons/${section.icon}.png)" aria-hidden="true"></i>${section.label}<b>${inSection.length}</b></h3>${inSection.length?inSection.map(keywordRow).join(''):'<p class="fiche-kw-empty">Aucun mot-clé de ce type.</p>'}</section>`;
  }).join('');
}

// ---- Fiche d'unité ----
function cardButton(name,caption,kind){
  const fr=displayName(name),src=imageFor(name);
  return `<button type="button" class="fiche-card fiche-card-${kind}" data-card-name="${esc(fr)}" data-card-image="${esc(src)}" aria-label="Agrandir la carte ${esc(fr)}"><img src="${esc(src)}" alt="Carte ${esc(fr)}" loading="lazy"><small>${esc(caption)}</small></button>`;
}
// Une seule rangée jusqu'à 5 améliorations, pour garder la fiche entière à l'écran sur iPad.
const upgradeColumns=count=>count<=3?3:count<=5?count:Math.ceil(count/2);
function showCard(button){
  const src=button.dataset.cardImage,missing=isMissingImage(src),dialog=document.createElement('dialog');
  dialog.className='card-dialog dialog-wipe';
  dialog.innerHTML=`<button class="dialog-close" aria-label="Fermer">×</button><img src="${esc(src)}" alt="${missing?'Visuel indisponible':esc(button.dataset.cardName)}"><strong>${esc(button.dataset.cardName)}</strong>${missing?'<small class="missing-card-note">Visuel indisponible : remplacement local, ce n’est pas la carte.</small>':''}`;
  document.body.append(dialog);
  const dismiss=()=>dialog.close();
  dialog.querySelector('button').onclick=dismiss;
  dialog.onclick=event=>{if(event.target===dialog)dismiss()};
  dialog.onclose=()=>dialog.remove();
  dialog.showModal();
}
// Une carte sans étiquette peut simplement n'avoir aucun mot-clé : seule une carte absente du référentiel mérite l'avertissement.
const isKnownCard=name=>{const key=cardKey(name);return !!(tags[key]||reference.names?.[key]||reference.weapons?.[key]||reference.legionhq?.[key])};
function showUnit(entry){
  const faction=factionThemeForArmy(entry.army),upgrades=entry.unit.upgrades||[],models=unitModelsTotal(entry),formation=unitFormation(entry),unknownCards=[entry.unit.name,...upgrades.map(up=>up.name)].filter(name=>!isKnownCard(name)),meta=[rankLabels[entry.rank],formation?.kind,models?`${models} figurine${models>1?'s':''}`:''].filter(Boolean).join(' · ');
  root.innerHTML=`<div class="page-wipe"><section class="fiche" data-faction="${faction}"><header class="fiche-head"><button type="button" class="secondary fiche-back" id="back">← Changer d’unité</button><i class="cx-side-emblem ${faction}" aria-hidden="true"></i><div><h2>${esc(entryName(entry))}</h2><small>${esc(meta)}</small></div></header><div class="fiche-layout"><div class="fiche-cards">${cardButton(entry.unit.name,entryName(entry),'unit')}<h3>Améliorations <b>${upgrades.length}</b></h3>${upgrades.length?`<div class="fiche-upgrades" style="--upgrade-cols:${upgradeColumns(upgrades.length)}">${upgrades.map(up=>cardButton(up.name,displayName(up.name),'upgrade')).join('')}</div>`:'<p class="fiche-kw-empty">Sans amélioration.</p>'}</div><div class="fiche-keywords">${unknownCards.length?`<p class="fiche-warning">Mots-clés non référencés pour : ${unknownCards.map(name=>esc(displayName(name))).join(', ')}. Se fier au visuel de la carte.</p>`:''}${keywordPanel(entry)}</div></div></section></div>`;
  root.querySelectorAll('.fiche-card').forEach(button=>button.onclick=()=>showCard(button));
  $('#back').onclick=()=>showPicker(true);
  scrollTo(0,0);
}

window.addEventListener('storage',event=>{if(event.key==='swl.list.p1.v1'||event.key==='swl.list.p2.v1')location.reload()});
showPicker();
