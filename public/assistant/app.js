const $=s=>document.querySelector(s);const root=$('#app');let stage=1,attacker=null,defender=null,selectedArmy='p1';
const demo1={listName:'Patrouille impériale · démonstration',faction:'Empire',units:[{name:'Stormtroopers',upgrades:[{name:'HH-12 Stormtrooper'},{name:'Stormtrooper Specialist'},{name:'Targeting Scopes'}]},{name:'Snowtroopers',upgrades:[{name:'T-7 Ion Snowtrooper'}]},{name:'AT-ST',upgrades:[{name:'88i Twin Light Blaster'},{name:'DW-3 Concussion Grenade Launcher'}]}]};
const demo2={listName:'Patrouille rebelle · démonstration',faction:'Rebelles',units:[{name:'Rebel Troopers',upgrades:[{name:'Z-6 Trooper'}]},{name:'Rebel Veterans',upgrades:[{name:'CM-O/93 Trooper'}]},{name:'T-47 Airspeeder',upgrades:[{name:'Ax-108 "Ground Buzzer"'}]}]};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};const list1=read('swl.list.p1.v1',demo1),list2=read('swl.list.p2.v1',demo2);const usingDemo=!localStorage.getItem('swl.list.p1.v1')||!localStorage.getItem('swl.list.p2.v1');
const keywords=read('swl.keywords.v1',window.SWL_REFERENCE?.keywords||[]),tags=read('swl.card-tags.v1',window.SWL_REFERENCE?.tags||{}),cardNotes=window.SWL_CARD_NOTES||{};const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const displayName=name=>window.SWL_REFERENCE?.names?.[norm(name)]||name;
const specialImages={'at st':'tr-tt.jpg','at rt':'tl-tt.jpg','at rt flamethrower':'tl-tt-flame-projector.jpg','at st mortar launcher':'tr-tt-mortar-launcher.jpg','cm o 93 trooper':'cm-o93-trooper.jpg','mo dk power harpoon':'mo-dk-power-harpoon.jpg','darth vader the emperor s apprentice':'darth-vader-the-emperors-apprentice.jpg','iden s id10 seeker droid':'idens-id10-seeker-droid.jpg','jyn s se 14 blaster':'jyns-se-14-blaster.jpg','sabine s combat shield':'sabines-combat-shield.jpg','sabine s grapple line':'sabines-grapple-line.jpg','snowtrooper':'snowtrooper-upgrade.jpg','rebel veterans':'rebel-veterans.jpg','rebel troopers':'rebel-troopers.jpg','t 47 airspeeder':'t-47-airspeeder.jpg'};const imageFor=name=>`../cards/${specialImages[norm(name)]||norm(name).replace(/ /g,'-')+'.jpg'}`;
// Valeurs lues sur les fenêtres de conversion imprimées des cartes Unité françaises.
// null = tiret imprimé, donc aucune conversion. applicable:false = carte Compagnon sans fenêtre propre.
// Une absence de clé signifie que la carte n'a pas encore été auditée visuellement.
const profile=(attackSurge,defenseSurge,source)=>({attackSurge,defenseSurge,verified:true,source:`Carte Unité ${source}`});
const combatProfiles={
  '1 4 fd laser cannon team':profile('hit','block','Canon laser 1.4 FD'),
  '74 z speeder bikes':profile('hit','block','Motojets 74-Z'),
  'a a5 speeder truck':profile(null,'block','Camion speeder A-A5'),
  'agent kallus':profile(null,null,'Agent Kallus'),
  'ahsoka tano':profile('crit',null,'Ahsoka Tano'),
  'c 3po':{applicable:false,verified:true,source:'Carte Compagnon C-3PO'},
  'cassian andor':profile('hit','block','Cassian Andor'),
  'chewbacca':profile('crit',null,'Chewbacca'),
  'dark trooper squad':profile(null,null,'Escouade de Dark Troopers'),
  'darth vader dark lord of the sith':profile(null,null,'Dark Vador, Sombre Seigneur des Sith'),
  'darth vader the emperors apprentice':profile(null,null,'Dark Vador, Apprenti de l’Empereur'),
  'dewback rider':profile('hit',null,'Chevaucheur de Dewback'),
  'df 90 mortar trooper':profile(null,null,'Soldat au mortier DF-90'),
  'director orson krennic':profile('hit','block','Directeur Orson Krennic'),
  'e web heavy blaster team':profile('crit',null,'Équipe de blaster lourd E-Web'),
  'fleet troopers':profile('hit','block','Soldats de la flotte'),
  'general veers':profile('crit',null,'Général Veers'),
  'han solo':profile('crit','block','Han Solo'),
  'iden versio':profile('hit',null,'Iden Versio'),
  'idens id10 seeker droid':{applicable:false,verified:true,source:'Carte Compagnon Droïde chercheur ID10 d’Iden'},
  'imperial death troopers':profile('hit','block','Death Troopers impériaux'),
  'imperial special forces inferno squad':profile('hit',null,'Forces spéciales impériales, Escouade Inferno'),
  'imperial special forces':profile('hit',null,'Forces spéciales impériales'),
  'jyn erso':profile('crit','block','Jyn Erso'),
  'k 2so':profile('crit',null,'K-2SO'),
  'laat le patrol transport':profile(null,'block','Transport de patrouille LAAT/le'),
  'lando calrissian':profile('crit','block','Lando Calrissian'),
  'leia organa':profile('crit','block','Leia Organa'),
  'luke skywalker hero of the rebellion':profile('crit',null,'Luke Skywalker, Héros de la Rébellion'),
  'luke skywalker jedi knight':profile('crit',null,'Luke Skywalker, Chevalier Jedi'),
  'major marquand':profile('hit','block','Major Marquand'),
  'mandalorian resistance clan wren':profile('hit','block','Résistance mandalorienne, Clan Wren'),
  'mandalorian resistance':profile('hit','block','Résistance mandalorienne'),
  'mark ii medium blaster trooper':profile('hit','block','Soldat au blaster moyen Mark II'),
  'moff gideon':profile('crit','block','Moff Gideon'),
  'r2 d2':profile('hit','block','R2-D2'),
  'range troopers':profile(null,null,'Range Troopers'),
  'rebel commandos strike team':profile('hit','block','Commandos rebelles, Équipe de tireurs d’élite'),
  'rebel commandos':profile('hit','block','Commandos rebelles'),
  'rebel sleeper cell':profile('hit','block','Cellule dormante rebelle'),
  'rebel troopers':profile(null,'block','Soldats rebelles'),
  'rebel veterans':profile('hit','block','Vétérans rebelles'),
  'sabine wren':profile('crit','block','Sabine Wren'),
  'scout troopers strike team':profile(null,'block','Scout Troopers, Équipe de tireurs d’élite'),
  'scout troopers':profile(null,'block','Scout Troopers'),
  'shoretroopers':profile(null,null,'Shoretroopers'),
  'snowtroopers':profile('hit',null,'Snowtroopers'),
  'stormtrooper heavy gunner squad':profile('hit',null,'Stormtroopers, Escouade d’artilleurs lourds'),
  'stormtrooper riot squad':profile(null,null,'Stormtroopers, Escouade antiémeute'),
  'stormtroopers':profile('hit',null,'Stormtroopers'),
  't 47 airspeeder':profile('crit','block','Airspeeder T-47'),
  'tauntaun riders':profile('crit','block','Cavaliers Tauntaun'),
  'the fifth brother':profile('hit',null,'Cinquième Frère'),
  'the seventh sister':profile('hit',null,'Septième Sœur'),
  'at rt':profile('crit','block','TL-TT'),
  'tl tt':profile('crit','block','TL-TT'),
  'at st':profile(null,'block','TR-TT'),
  'tr tt':profile(null,'block','TR-TT'),
  'tx 225 occupier tank':profile(null,null,'Char d’assaut TX-225 Occupier'),
  'wookiee warriors freedom fighters':profile('hit',null,'Guerriers Wookiees, Combattants de la liberté'),
  'wookiee warriors kashyyyk resistance':profile('hit',null,'Guerriers Wookiees, Résistance de Kashyyyk'),
  'x 34 landspeeder':profile('hit','block','Landspeeder X-34')
};
const armies=[{id:'p1',list:list1},{id:'p2',list:list2}];const entries=armies.flatMap(a=>(a.list.units||[]).map((unit,index)=>({id:`${a.id}:${index}`,army:a.id,label:a.list.listName||a.list.faction||a.id,unit})));
function cardTags(name){return tags[norm(name)]||[]}function resolved(entry){if(!entry)return[];const cards=[entry.unit.name,...(entry.unit.upgrades||[]).map(u=>u.name)];const seen=new Set;return cards.flatMap(source=>cardTags(source).map(t=>({tag:t,source,def:keywords.find(k=>k.id===t.keywordId)}))).filter(x=>x.def&&!seen.has(x.def.id)&&seen.add(x.def.id))}
function definitionsFor(cardName){return cardTags(cardName).map(tag=>({tag,def:keywords.find(k=>k.id===tag.keywordId)})).filter(x=>x.def)}
function noteFor(cardName){return cardNotes[norm(cardName)]}
const diceIcons={attackSurge:['asurge.png','Adrénaline d’attaque'],defenseSurge:['dsurge.png','Adrénaline de défense'],hit:['hit.png','Touche'],block:['block.png','Blocage'],crit:['crit.png','Critique']};
function diceIcon(type,extra=''){const [file,label]=diceIcons[type];return `<img class="dice-symbol ${extra}" src="../icons/dice/${file}" alt="${label}" title="${label}">`}
function renderDiceText(text){return text
  .replace(/\[ADR-ATQ\]|adrénalines? d['’]attaque/gi,()=>diceIcon('attackSurge'))
  .replace(/\[ADR-DEF\]|adrénalines? de défense/gi,()=>diceIcon('defenseSurge'))
  .replace(/\[CRITIQUE\]|critiques?/gi,()=>diceIcon('crit'))
  .replace(/\[TOUCHE\]|touches?/gi,()=>diceIcon('hit'))
  .replace(/\[BLOC\]|blocages?|blocs?/gi,()=>diceIcon('block'))}
function definitionText(item){return renderDiceText((item.def.shortDefinition||item.def.definition||'').replace(/\bX\b/g,item.tag.value??'X'))}
function upgradeGallery(entry){
  const upgrades=entry.unit.upgrades||[];
  if(!upgrades.length)return `<section class="upgrades"><div class="section-heading"><span>AMÉLIORATIONS ÉQUIPÉES</span><b>0</b></div><p class="empty-upgrades">Cette unité n’a aucune amélioration dans la liste importée.</p></section>`;
  return `<section class="upgrades"><div class="section-heading"><span>AMÉLIORATIONS ÉQUIPÉES</span><b>${upgrades.length}</b></div><div class="upgrade-grid">${upgrades.map((up,index)=>{
    const defs=definitionsFor(up.name),note=noteFor(up.name),fr=displayName(up.name);
    const definitions=defs.map(item=>`<div class="upgrade-definition"><strong>${item.def.name}${item.tag.value!=null?' '+item.tag.value:''}</strong><p>${definitionText(item)}</p></div>`).join('');
    const ownEffect=note?`<div class="upgrade-definition card-note"><strong>EFFET DE LA CARTE</strong><p>${renderDiceText(note)}</p></div>`:'';
    const unavailable=!definitions&&!ownEffect?`<p class="unavailable">Aucune définition rattachée dans le référentiel. Consultez le texte de la carte.</p>`:'';
    return `<article class="upgrade-card"><button class="upgrade-visual" data-card-name="${fr.replace(/"/g,'&quot;')}" data-card-image="${imageFor(up.name)}" aria-label="Agrandir la carte ${fr}"><img src="${imageFor(up.name)}" alt="Carte ${fr}" onerror="this.closest('.upgrade-visual').classList.add('missing')"><span>Agrandir</span></button><div class="upgrade-copy"><small>AMÉLIORATION ${index+1}</small><h3>${fr}</h3>${definitions}${ownEffect}${unavailable}</div></article>`
  }).join('')}</div></section>`
}
function bindCardViewer(){root.querySelectorAll('.upgrade-visual').forEach(button=>button.onclick=()=>{const dialog=document.createElement('dialog');dialog.className='card-dialog';dialog.innerHTML=`<button class="dialog-close" aria-label="Fermer">×</button><img src="${button.dataset.cardImage}" alt="${button.dataset.cardName}"><strong>${button.dataset.cardName}</strong>`;document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close()};dialog.onclose=()=>dialog.remove();dialog.showModal()})}
function progress(){document.querySelectorAll('#progress i').forEach((i,n)=>{i.className=n+1===stage?'active':n+1<stage?'done':''})}function name(e){return e?.unit?.name?displayName(e.unit.name):'Unité'}
function tile(e){return `<button class="unit-tile" data-id="${e.id}"><img src="${imageFor(e.unit.name)}" alt="" onerror="this.style.visibility='hidden'"><span><strong>${displayName(e.unit.name)}</strong><small>${(e.unit.upgrades||[]).map(u=>displayName(u.name)).join(' · ')||'Sans amélioration'}</small></span></button>`}
function armyLabel(army,index){return army.list.listName||army.list.faction||`Joueur ${index+1}`}
function armySelector(){return `<div class="army-switch" role="tablist" aria-label="Choisir une liste">${armies.map((army,index)=>`<button type="button" role="tab" aria-selected="${selectedArmy===army.id}" class="${selectedArmy===army.id?'active':''}" data-army="${army.id}"><small>JOUEUR ${index+1}</small><strong>${armyLabel(army,index)}</strong><span>${(army.list.units||[]).length} unité(s)</span></button>`).join('')}</div>`}
function pick(role){const isDefense=role==='defender',available=isDefense?entries.filter(e=>e.army!==attacker.army):entries.filter(e=>e.army===selectedArmy);root.innerHTML=`<section class="intro"><span class="kicker">ÉTAPE ${stage} SUR 4</span><h1>${isDefense?'Quelle unité est attaquée ?':'Quelle unité jouez-vous ?'}</h1><p>${isDefense?'Seules les unités de l’armée adverse sont proposées.':'Choisissez d’abord la liste, puis touchez la troupe jouée.'}</p>${!isDefense?armySelector():''}${usingDemo?'<p class="notice">Mode démonstration : importez deux listes depuis la page principale pour retrouver vos propres unités ici.</p>':''}</section>${[...new Set(available.map(e=>e.label))].map(label=>`<section><div class="army-title"><b>${label}</b></div><div class="unit-grid">${available.filter(e=>e.label===label).map(tile).join('')}</div></section>`).join('')}`;root.querySelectorAll('.army-switch button').forEach(b=>b.onclick=()=>{selectedArmy=b.dataset.army;pick('attacker')});root.querySelectorAll('.unit-tile').forEach(b=>b.onclick=()=>{const e=entries.find(x=>x.id===b.dataset.id);if(isDefense){defender=e;stage=4;overview(defender,'defense')}else{attacker=e;defender=null;stage=2;overview(attacker,'attack')}});progress()}
function effectiveImpact(item){return item.def.id==='aguerri'?'autre':item.def.impact}
function group(items,impact,title){const found=items.filter(x=>effectiveImpact(x)===impact);return `<section><h2>${title}</h2>${found.length?found.map(x=>`<article class="tag"><strong>${x.def.name}${x.tag.value!=null?' '+x.tag.value:''}</strong><small>${definitionText(x)}</small></article>`).join(''):'<p class="notice">Aucun mot-clé renseigné pour cette rubrique. La carte reste visible pour contrôle.</p>'}</section>`}
function surgeResult(type,value){const source=type==='attack'?diceIcon('attackSurge','large'):diceIcon('defenseSurge','large');const result=value==='hit'?diceIcon('hit','large'):value==='crit'?diceIcon('crit','large'):value==='block'?diceIcon('block','large'):'<i class="no-surge" title="Aucune conversion">—</i>';return `<strong class="surge-line">${source}<b>→</b>${result}</strong>`}
function surgePanel(entry){const profile=combatProfiles[norm(entry.unit.name)];if(!profile)return `<div class="surge-panel unknown"><span>CONVERSIONS D’ADRÉNALINE</span><strong>À vérifier sur la carte</strong><small>Aucune valeur n’est inventée tant que le visuel n’a pas été contrôlé.</small></div>`;if(profile.applicable===false)return `<div class="surge-panel unknown"><span>CONVERSIONS D’ADRÉNALINE</span><strong>Profil de l’unité principale</strong><small>${profile.source} · aucune fenêtre de conversion propre n’est imprimée.</small></div>`;return `<div class="surge-panel"><span>CONVERSIONS D’ADRÉNALINE</span>${surgeResult('attack',profile.attackSurge)}${surgeResult('defense',profile.defenseSurge)}<small>Vérifié visuellement · ${profile.source}</small></div>`}
function overview(entry,role){const items=resolved(entry),img=imageFor(entry.unit.name),fr=displayName(entry.unit.name);root.innerHTML=`${role==='defense'?`<div class="duel"><strong>${name(attacker)}</strong><span>ATTAQUE</span><strong>${name(defender)}</strong></div>`:''}<section class="overview ${role}"><div class="hero"><div><span>${role==='attack'?'UNITÉ JOUÉE':'UNITÉ CIBLÉE'}</span><h1>${fr}</h1><p>${entry.label}</p><p>${(entry.unit.upgrades||[]).map(u=>displayName(u.name)).join(' · ')||'Sans amélioration'}</p>${surgePanel(entry)}</div><img src="${img}" alt="Carte ${fr}" onerror="this.hidden=true"></div>${upgradeGallery(entry)}<div class="columns">${group(items,'autre','Déplacement & activation')}${group(items,'attaque','Attaque')}${group(items,'défense','Défense')}</div></section><div class="actions"><button class="secondary" id="back">${role==='attack'?'Changer d’unité':'Changer de cible'}</button><button class="primary" id="next">${role==='attack'?'Choisir la cible →':'Résoudre l’attaque →'}</button></div>`;bindCardViewer();$('#back').onclick=()=>{stage=role==='attack'?1:3;pick(role==='attack'?'attacker':'defender')};$('#next').onclick=()=>{if(role==='attack'){stage=3;pick('defender')}else{resolveScreen()}};progress()}
function resolveScreen(){stage=4;root.innerHTML=`<div class="duel"><strong>${name(attacker)}</strong><span>ATTAQUE</span><strong>${name(defender)}</strong></div><section class="resolver"><aside class="side"><img src="${imageFor(attacker.unit.name)}" alt=""><div><span class="kicker">ATTAQUANT</span><h2>${name(attacker)}</h2></div></aside><section class="resolve-center"><div class="result-strip"><b class="hit">${diceIcon('hit','large')} <span id="hshow">0</span></b><b class="crit">${diceIcon('crit','large')} <span id="cshow">0</span></b></div><div class="form-grid"><label class="field"><span>${diceIcon('hit')} après conversion</span><input id="hits" type="number" min="0" value="0"></label><label class="field"><span>${diceIcon('crit')} après conversion</span><input id="crits" type="number" min="0" value="0"></label><label class="field">Couvert<select id="cover"><option value="0">Aucun</option><option value="1">Léger</option><option value="2">Lourd</option></select></label><label class="field"><span>${diceIcon('hit')} annulées par couvert</span><input id="coverBlocks" type="number" min="0" value="0"></label><label class="field">Esquives dépensées<input id="dodges" type="number" min="0" value="0"></label><label class="field"><span>${diceIcon('block')} de défense</span><input id="blocks" type="number" min="0" value="0"></label></div><div class="total"><span>Blessures à appliquer</span><strong id="wounds">0</strong><small>Pour les Snowtroopers, convertissez ${diceIcon('attackSurge')} en ${diceIcon('hit')} avant la saisie. Le futur écran de lancer automatisera cette étape selon l’arme choisie.</small></div></section><aside class="side"><img src="${imageFor(defender.unit.name)}" alt=""><div><span class="kicker">DÉFENSEUR</span><h2>${name(defender)}</h2></div></aside></section><div class="actions"><button class="secondary" id="back">← Revoir le défenseur</button><button class="primary" id="finish">Nouvelle attaque</button></div>`;const calculate=()=>{const h=+$('#hits').value||0,c=+$('#crits').value||0,cover=+$('#cover').value||0,cb=cover?Math.min(h,+$('#coverBlocks').value||0):0,d=Math.min(h-cb,+$('#dodges').value||0),remaining=Math.max(0,h-cb-d)+c,b=Math.min(remaining,+$('#blocks').value||0);$('#hshow').textContent=h;$('#cshow').textContent=c;$('#wounds').textContent=Math.max(0,remaining-b)};root.querySelectorAll('input,select').forEach(x=>x.oninput=calculate);$('#back').onclick=()=>overview(defender,'defense');$('#finish').onclick=()=>{attacker=null;defender=null;stage=1;pick('attacker')};progress()}
$('#restart').onclick=()=>{attacker=null;defender=null;selectedArmy='p1';stage=1;pick('attacker')};pick('attacker');
