const $=s=>document.querySelector(s);const root=$('#app'),engine=window.SWL_ATTACK_ENGINE;const playerSideKey='swl.assistant.player-side.v1';let stage=1,attacker=null,defender=null,selectedArmy=localStorage.getItem(playerSideKey)||'p1',stageWipe=false,centerWipe=false;
const demo1={listName:'Patrouille impériale · démonstration',faction:'Empire',units:[{name:'Stormtroopers',upgrades:[{name:'HH-12 Stormtrooper'},{name:'Stormtrooper Specialist'},{name:'Targeting Scopes'}]},{name:'Snowtroopers',upgrades:[{name:'T-7 Ion Snowtrooper'}]},{name:'AT-ST',upgrades:[{name:'88i Twin Light Blaster'},{name:'DW-3 Concussion Grenade Launcher'}]}]};
const demo2={listName:'Patrouille rebelle · démonstration',faction:'Rebelles',units:[{name:'Rebel Troopers',upgrades:[{name:'Z-6 Trooper'}]},{name:'Rebel Veterans',upgrades:[{name:'CM-O/93 Trooper'}]},{name:'T-47 Airspeeder',upgrades:[{name:'Ax-108 "Ground Buzzer"'}]}]};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};const upgradeCollisions=window.SWL_REFERENCE?.upgradeNameCollisions||{},collisionKey=name=>String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),fixUpgradeCollisions=list=>list&&Array.isArray(list.units)?{...list,units:list.units.map(unit=>({...unit,upgrades:(unit.upgrades||[]).map(up=>typeof up==='string'?(upgradeCollisions[collisionKey(up)]||up):{...up,name:upgradeCollisions[collisionKey(up.name)]||up.name})}))}:list;const list1=fixUpgradeCollisions(read('swl.list.p1.v1',demo1)),list2=fixUpgradeCollisions(read('swl.list.p2.v1',demo2));const usingDemo=!localStorage.getItem('swl.list.p1.v1')||!localStorage.getItem('swl.list.p2.v1');
const historyKey='swl.assistant.attack-history.v1';let attackHistory=read(historyKey,[]),quickMode=read('swl.assistant.quick-mode.v1',true);
// Référentiel EFFECTIF (19/09/2026). Avant, la copie enregistrée dans le navigateur REMPLAÇAIT entièrement le référentiel livré avec l'appli : une carte ou un mot-clé ajouté/corrigé plus tard n'arrivait jamais sur un appareil qui avait déjà une copie (cause d'un mot-clé ignoré par le moteur). Désormais : le référentiel livré (vérifié) fait foi ; le stockage local n'ajoute que ses propres mots-clés/étiquettes et ses définitions retouchées ; les étiquettes retirées volontairement sont enregistrées à part (swl.card-tags-removed.v1).
const seedKeywords=window.SWL_REFERENCE?.keywords||[],localKeywords=read('swl.keywords.v1',[]),localKeywordById=new Map(localKeywords.map(item=>[item.id,item])),seedKeywordIds=new Set(seedKeywords.map(item=>item.id)),
keywords=[...seedKeywords.map(seed=>{const mine=localKeywordById.get(seed.id);return mine?{...seed,definition:mine.definition??seed.definition,shortDefinition:mine.shortDefinition??seed.shortDefinition}:seed}),...localKeywords.filter(item=>!seedKeywordIds.has(item.id))],
seedTags=window.SWL_REFERENCE?.tags||{},localTags=read('swl.card-tags.v1',{}),removedTags=read('swl.card-tags-removed.v1',{}),
tags=(()=>{const merged={};for(const key of new Set([...Object.keys(seedTags),...Object.keys(localTags)])){const retired=window.SWL_REFERENCE?.retiredKeywords?.[key]||[],removed=new Set([...(removedTags[key]||[]),...retired]),list=(localTags[key]||[]).filter(tag=>!removed.has(tag.keywordId));for(const tag of seedTags[key]||[])if(!removed.has(tag.keywordId)&&!list.some(item=>item.keywordId===tag.keywordId))list.push(tag);merged[key]=list}return merged})(),
cardNotes=window.SWL_CARD_NOTES||{},weaponProfiles=window.SWL_REFERENCE?.weapons||{};const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const cardAliases=window.SWL_REFERENCE?.aliases||{},cardKey=name=>{let key=norm(name);const visited=new Set;while(cardAliases[key]&&!visited.has(key)){visited.add(key);key=cardAliases[key]}return key};
for(const list of [list1,list2])for(const unit of list.units||[])for(const upgrade of unit.upgrades||[])if(norm(upgrade.name)==='cassian andor')upgrade.name='Cassian Andor Operative';
const displayName=name=>window.SWL_REFERENCE?.names?.[norm(name)]||window.SWL_REFERENCE?.names?.[cardKey(name)]||name;
const specialImages={'at st':'tr-tt.jpg','at rt':'tl-tt.jpg','at rt flamethrower':'tl-tt-flame-projector.jpg','at st mortar launcher':'tr-tt-mortar-launcher.jpg','cm o 93 trooper':'cm-o93-trooper.jpg','mo dk power harpoon':'mo-dk-power-harpoon.jpg','darth vader the emperor s apprentice':'darth-vader-the-emperors-apprentice.jpg','iden s id10 seeker droid':'idens-id10-seeker-droid.jpg','jyn s se 14 blaster':'jyns-se-14-blaster.jpg','sabine s combat shield':'sabines-combat-shield.jpg','sabine s grapple line':'sabines-grapple-line.jpg','snowtrooper':'snowtrooper-upgrade.jpg','rebel veterans':'rebel-veterans.jpg','rebel troopers':'rebel-troopers.jpg','t 47 airspeeder':'t-47-airspeeder.jpg'};const imageFor=name=>{const key=cardKey(name),catalog=window.SWL_REFERENCE?.images||{};return catalog[key]||`../cards/${specialImages[key]||key.replace(/ /g,'-')+'.jpg'}`};
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
  'rebel commandos strike team':profile('crit','block','Commandos rebelles, Équipe de tireurs d’élite'),
  'rebel commandos':profile('hit','block','Commandos rebelles'),
  'rebel sleeper cell':profile('hit','block','Cellule dormante rebelle'),
  'rebel troopers':profile(null,'block','Soldats rebelles'),
  'rebel veterans':profile('hit','block','Vétérans rebelles'),
  'sabine wren':profile('crit','block','Sabine Wren'),
  'scout troopers strike team':profile('crit','block','Scout Troopers, Équipe de tireurs d’élite'),
  'scout troopers':profile(null,'block','Scout Troopers'),
  'shoretroopers':profile(null,null,'Shoretroopers'),
  'snowtroopers':profile('hit',null,'Snowtroopers'),
  'stormtrooper heavy gunner squad':profile('hit',null,'Stormtroopers, Escouade d’artilleurs lourds'),
  'stormtrooper riot squad':profile(null,null,'Stormtroopers, Escouade antiémeute'),
  'stormtroopers':profile('hit',null,'Stormtroopers'),
  'din djarin':profile('crit','block','Din Djarin'),
  'cad bane':profile('crit','block','Cad Bane'),
  'boba fett infamous bounty hunter':profile('crit','block','Boba Fett, Infâme Chasseur de Primes'),
  'boba fett daimyo of mos espa':profile('crit','block','Boba Fett, Daimyo de Mos Espa'),
  'gar saxon militant commando':profile('crit','block','Gar Saxon'),
  'bossk terror of trandosha':profile('crit',null,'Bossk'),
  'ig 11':profile('hit',null,'IG-11'),
  'ig 88':profile('crit',null,'IG-88'),
  'swoop bike riders':profile('hit','block','Pilotes de Swoop'),
  'mandalorian super commandos':profile(null,'block','Super Commandos Mandaloriens'),
  'pyke syndicate capo':profile(null,'block','Capo du Syndicat Pyke'),
  'pyke syndicate foot soldiers':profile(null,'block','Fantassins du Syndicat Pyke'),
  'black sun vigo':profile(null,null,'Vigo du Soleil Noir'),
  'black sun enforcers':profile(null,null,'Hommes de Main du Soleil Noir'),
  'maul a rival':profile(null,null,'Maul, Un Rival'),
  'the bad batch':profile(null,null,'Le Bad Batch'),
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
const rankCatalog={commandant:['darth vader dark lord of the sith','director orson krennic','general veers','iden versio','moff gideon','leia organa','luke skywalker hero of the rebellion','han solo','lando calrissian','pyke syndicate capo','black sun vigo','gar saxon militant commando'],operative:['darth vader the emperors apprentice','ahsoka tano','chewbacca','k 2so','luke skywalker jedi knight','sabine wren','r2 d2','the fifth brother','the seventh sister','rebel agent defender of democracy','boba fett infamous bounty hunter','boba fett daimyo of mos espa','agent kallus','cassian andor','jyn erso','maul a rival','bossk terror of trandosha','cad bane','ig 88','ig 11','din djarin','the bad batch'],corps:['stormtroopers','stormtrooper riot squad','snowtroopers','shoretroopers','rebel troopers','rebel veterans','fleet troopers','stormtrooper heavy gunner squad','mark ii medium blaster trooper','df 90 mortar trooper','pyke syndicate foot soldiers','black sun enforcers'],special:['imperial death troopers','imperial special forces','imperial special forces inferno squad','scout troopers','rebel commandos','rebel sleeper cell','mandalorian resistance','mandalorian resistance clan wren','wookiee warriors freedom fighters','wookiee warriors kashyyyk resistance','mandalorian super commandos'],support:['74 z speeder bikes','dewback rider','e web heavy blaster team','at rt','tl tt','tauntaun riders','1 4 fd laser cannon team','range troopers','rebel commandos strike team','scout troopers strike team','swoop bike riders'],heavy:['at st','tr tt','t 47 airspeeder','tx 225 occupier tank','laat le patrol transport','a a5 speeder truck','x 34 landspeeder','dark trooper squad','major marquand']};
const rankLabels={commandant:'Commandant',operative:'Agent',corps:'Troupiers',special:'Forces spéciales',support:'Soutien',heavy:'Lourd',unknown:'Rang à vérifier'},rankIcons={commandant:'commandant.png',operative:'agent.png',corps:'troupiers.png',special:'forces-speciales.png',support:'soutien.png',heavy:'lourd.png'};
function unitRank(unit){const explicit=norm(unit.rank||unit.section);if(/command/.test(explicit))return'commandant';if(/operat|agent/.test(explicit))return'operative';if(/corps|troup/.test(explicit))return'corps';if(/special/.test(explicit))return'special';if(/soutien|support/.test(explicit))return'support';if(/lourd|heavy/.test(explicit))return'heavy';const key=cardKey(unit.name);return Object.keys(rankCatalog).find(rank=>rankCatalog[rank].includes(key))||'unknown'}
const armies=[{id:'p1',list:list1},{id:'p2',list:list2}];const entries=armies.flatMap(a=>{const totals={};(a.list.units||[]).forEach(u=>totals[norm(u.name)]=(totals[norm(u.name)]||0)+1);const seen={};return(a.list.units||[]).map((unit,index)=>{const key=norm(unit.name),occurrence=(seen[key]||0)+1;seen[key]=occurrence;return{id:`${a.id}:${unit.key||index}`,legacyId:`${a.id}:${index}`,army:a.id,label:a.list.listName||a.list.faction||a.id,unit,rank:unitRank(unit),occurrence,totalOccurrences:totals[key]}})});
const rankMask=rank=>`--rank-mask:url('./rank-icons/${rankIcons[rank]}')`;
const rankMark=e=>e.rank==='unknown'?'<span class="rank-icon rank-unknown">?</span>':`<span class="rank-icon" style="${rankMask(e.rank)}" role="img" aria-label="${rankLabels[e.rank]}" title="${rankLabels[e.rank]}"></span>`;
const unitStateKey='swl.assistant.unit-state.v1';let unitStates=read(unitStateKey,{}),lastOverviewEntryId=null,unitStateSyncTimer=null;for(const entry of entries)if(!unitStates[entry.id]&&unitStates[entry.legacyId])unitStates[entry.id]=unitStates[entry.legacyId];const stateFor=e=>({suppression:0,ion:0,immobilize:0,poison:0,shield:0,aim:0,dodge:0,surge:0,standby:0,outOfAction:false,enrageActive:false,exhaustedCards:[],activationActions:[],activationSource:null,mandatoryMoveDone:false,...((unitStates[e?.id]||unitStates[e?.legacyId])||{})});
const syncTokenKey='swl.sync.token.v1',syncGistKey='swl.sync.gistId.v1',syncFilename='legion-compagnon-lists.json',unitStateClockKey='swl.assistant.unit-state-clock.v1';let unitStateClock=read(unitStateClockKey,{}),lastPersistedUnitStates=structuredClone(unitStates);
function mergeSyncedUnitStates(remoteStates={},remoteClock={}){const merged={...remoteStates},clock={...remoteClock};for(const [id,state] of Object.entries(unitStates)){const localAt=Number(unitStateClock[id])||0,remoteAt=Number(remoteClock[id])||0;if(!(id in merged)||localAt>remoteAt){merged[id]=state;clock[id]=localAt}}return{states:merged,clock}}
function mergeSyncedHistory(remote=[]){const byId=new Map;for(const entry of [...remote,...attackHistory])if(entry&&typeof entry==='object')byId.set(entry.id||JSON.stringify(entry),entry);return[...byId.values()].sort((a,b)=>String(b.at||'').localeCompare(String(a.at||''))).slice(0,50)}
// Numéro de partie (même clé que l'appli principale, voir src/lib/gistSync.ts) : « Nouvelle partie » ne doit jamais être défaite par la synchro.
const gameEpochKey='swl.game-epoch.v1';
const readGameEpoch=()=>{const value=Number(localStorage.getItem(gameEpochKey));return Number.isFinite(value)&&value>0?value:0};
function adoptRemoteGame(remote){
  // Une nouvelle partie a été démarrée ailleurs (autre appareil ou appli principale) : on la reprend telle quelle, sans rien de l'ancienne.
  unitStates=remote.assistantUnitStates||{};unitStateClock=remote.assistantUnitStateUpdatedAt||{};attackHistory=remote.assistantAttackHistory||[];lastPersistedUnitStates=structuredClone(unitStates);
  localStorage.setItem(unitStateKey,JSON.stringify(unitStates));localStorage.setItem(unitStateClockKey,JSON.stringify(unitStateClock));localStorage.setItem(historyKey,JSON.stringify(attackHistory));
  if(remote.gameTracker)localStorage.setItem('swl.game-tracker.v1',JSON.stringify(remote.gameTracker));
  localStorage.setItem(gameEpochKey,String(remote.gameEpoch));
  try{localStorage.removeItem('swl.kw-undo.v1');if(typeof kwUndoLog!=='undefined')kwUndoLog.length=0}catch{}
}
async function syncUnitStates(mode='push'){
  const token=localStorage.getItem(syncTokenKey),gistId=localStorage.getItem(syncGistKey);
  if(!token||!gistId)return false;
  try{
    const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},response=await fetch(`https://api.github.com/gists/${gistId}`,{headers});
    if(!response.ok)throw new Error(String(response.status));
    const gist=await response.json(),remote=JSON.parse(gist.files?.[syncFilename]?.content||'{}'),localEpoch=readGameEpoch(),remoteEpoch=Number(remote.gameEpoch)||0;
    if(remoteEpoch>localEpoch){adoptRemoteGame(remote);return true}
    if(mode==='pull'){
      if(remoteEpoch<localEpoch)return false; // notre nouvelle partie est plus récente que le gist : rien à reprendre de l'ancienne
      const merged=mergeSyncedUnitStates(remote.assistantUnitStates,remote.assistantUnitStateUpdatedAt),mergedHistory=mergeSyncedHistory(remote.assistantAttackHistory);
      unitStates=merged.states;unitStateClock=merged.clock;attackHistory=mergedHistory;lastPersistedUnitStates=structuredClone(unitStates);
      localStorage.setItem(unitStateKey,JSON.stringify(unitStates));localStorage.setItem(unitStateClockKey,JSON.stringify(unitStateClock));localStorage.setItem(historyKey,JSON.stringify(attackHistory));
      if(remote.gameTracker)localStorage.setItem('swl.game-tracker.v1',JSON.stringify(remote.gameTracker));
      return true
    }
    // envoi : si notre numéro de partie est plus récent, l'état distant est l'ancienne partie → on ne fusionne pas avec lui
    const newer=localEpoch>remoteEpoch,merged=newer?{states:unitStates,clock:unitStateClock}:mergeSyncedUnitStates(remote.assistantUnitStates,remote.assistantUnitStateUpdatedAt),mergedHistory=newer?attackHistory.slice(0,50):mergeSyncedHistory(remote.assistantAttackHistory);
    const payload={...remote,schemaVersion:3,assistantUnitStates:merged.states,assistantUnitStateUpdatedAt:merged.clock,assistantAttackHistory:mergedHistory,updatedAt:Date.now()};
    // Le suivi de partie n'est envoyé que pour propager une NOUVELLE partie (numéro de partie plus récent) ; sinon l'Assistant n'y touche pas.
    if(newer){payload.gameEpoch=localEpoch;payload.gameTracker=read('swl.game-tracker.v1',remote.gameTracker)}
    const saved=await fetch(`https://api.github.com/gists/${gistId}`,{method:'PATCH',headers,body:JSON.stringify({files:{[syncFilename]:{content:JSON.stringify(payload)}}})});
    if(!saved.ok)throw new Error(String(saved.status));
    return true
  }catch(error){console.warn('Synchronisation de l’état des unités indisponible',error);return false}
}
function persistUnitStates(){const now=Date.now();for(const [id,state] of Object.entries(unitStates))if(JSON.stringify(state)!==JSON.stringify(lastPersistedUnitStates[id]))unitStateClock[id]=now;lastPersistedUnitStates=structuredClone(unitStates);localStorage.setItem(unitStateKey,JSON.stringify(unitStates));localStorage.setItem(unitStateClockKey,JSON.stringify(unitStateClock));clearTimeout(unitStateSyncTimer);unitStateSyncTimer=setTimeout(()=>syncUnitStates('push'),450)}
// L'appli ne suit plus les PV ni l'effectif d'une unité (choix produit) :
// seuls courage/suppressionImmune (utiles au moral) restent exposés ici.
function certifiedUnitStats(entry){const profile=weaponProfiles[cardKey(entry?.unit?.name)],stats=profile?.unitStats;if(!stats?.verifiedAgainstCard)return null;return {...stats}}
function unitStatusHud(entry,side=false){const state=stateFor(entry),immune=moraleImmune(entry),isLiveDefender=side&&entry===defender&&attackState;let suppression=immune?0:(isLiveDefender?attackState.currentSuppression:state.suppression);if(isLiveDefender&&attackStep>=5){const ranged=attackType()==='ranged',hadResult=attackResults().hit+attackResults().crit>0,suppressive=activeAttackTags().some(x=>x.def.id==='suppressif'),overwhelm=activeAttackTags().some(x=>x.def.id==='debordement');suppression=engine.moraleState({currentSuppression:attackState.currentSuppression,gainedSuppression:engine.suppressionTokens({ranged,hadAttackResult:hadResult,suppressive,overwhelm,aimSpent:attackState.aims>0,vehicle:isVehicle(defender)}),courage:attackState.defenderCourage,commanderCourage:attackState.commanderCourage,nullCourage:attackState.nullCourage,vehicle:isVehicle(defender)}).total}const icon=name=>`<img class="card-stat-icon" src="./stat-icons/${name}.svg" alt="" aria-hidden="true">`;return `<div class="unit-hud ${side?'compact':''}" aria-label="État de ${entryName(entry)}"><div class="hud-vitals"><span class="${immune?'suppression-immune':''}"><small>SUPPRESSION</small><b>${icon('suppression')}${immune?'IMMUNISÉE':suppression}</b></span></div></div>`}
// Suppression/ralliement (16/09/2026, décision produit utilisateur) : plus de
// mini-jeu de saisie des résultats de dés dans l'appli — la manipulation
// physique se fait à la table. L'appli se contente de rappeler la règle et
// le calcul (dés à lancer, seuils) via un pop-up à l'ouverture de l'unité ;
// le compteur de Suppression reste la seule source de vérité, mise à jour
// à la main par le joueur une fois le ralliement résolu physiquement.
function showRulePopup(innerHtml,className){const dialog=document.createElement('dialog');dialog.className=`rule-popup dialog-wipe ${className||''}`.trim();dialog.innerHTML=innerHtml;document.body.append(dialog);const dismiss=()=>{dialog.close();dialog.remove()};dialog.querySelectorAll('[data-close-popup]').forEach(button=>button.onclick=dismiss);dialog.onclick=e=>{if(e.target===dialog)dismiss()};dialog.onclose=()=>dialog.remove();dialog.showModal();return dialog}
function moralPopupContent(entry){const state=stateFor(entry),stats=certifiedUnitStats(entry);if(!stats||moraleImmune(entry)||!state.suppression)return null;const morale=engine.moraleState({currentSuppression:state.suppression,courage:stats.courage});if(!morale.suppressed)return null;const rules=allResolved(entry),indomitable=rules.some(x=>x.def.id==='indomptable'),retentionLimit=rules.some(x=>x.def.id==='discret')?state.suppression:keywordValue(entry,'intuition-du-danger-x'),retentionNote=retentionLimit?`<p>${rules.some(x=>x.def.id==='discret')?'Discret autorise à conserver tout ou partie des suppressions retirées.':`Intuition du Danger ${retentionLimit} autorise à conserver jusqu’à ${retentionLimit} suppression(s) retirée(s).`}</p>`:'';return `<strong>${morale.panicRisk?'⚠ RISQUE DE PANIQUE':'⚠ UNITÉ DÉMORALISÉE'} — RALLIEMENT</strong><p>Au début de cette activation, lancez ${state.suppression} dé(s) de défense ${indomitable?'rouges (Indomptable)':'blancs'} et retirez 1 pion Suppression par résultat Blocage ou Adrénaline.</p>${retentionNote}${morale.panicRisk?`<p>Si au moins ${morale.courage*2} suppression(s) restent après ce jet, l’unité est <b>paniquée</b> : aucune action ni action gratuite ce tour-ci, puis retirez un nombre de pions Suppression égal à son Courage (${morale.courage}) en fin d’activation.</p>`:''}<p><small>Mettez à jour le compteur Suppression ci-dessous une fois le ralliement résolu à la table.</small></p><button type="button" class="primary" data-close-popup>Compris</button>`}
// Pop-up de fin d'attaque (17/09/2026, demande utilisateur) : regroupe en
// un seul pop-up, filtré sur les mots-clés réellement présents chez
// l'attaquant et le défenseur de cette attaque précise, tous les effets
// purement informatifs (sans saisie associée) qui se déclenchent à la fin
// d'une attaque — au lieu de plusieurs encarts dispersés sur les écrans
// Défense/Suppression. Les effets qui dépendent d'une case à cocher
// (Immobilisation/Poison/Câble de remorquage/Dispersion) restent aussi
// affichés en ligne juste à côté de leur case, pour rester corrigibles.
function attackConclusionPopupContent(){if(attackStep!==5||!attacker||!defender||!attackState)return null;const {result,deflexionEligible,deflexionWounds,shienActive}=defenseResult(),ranged=attackType()==='ranged',hadResult=attackResults().hit+attackResults().crit>0,suppressive=activeAttackTags().some(x=>x.def.id==='suppressif'),overwhelm=activeAttackTags().some(x=>x.def.id==='debordement'),shienDeniesSuppression=shienActive&&ranged&&result.wounds===0,suppression=shienDeniesSuppression?0:engine.suppressionTokens({ranged,hadAttackResult:hadResult,suppressive,overwhelm,aimSpent:attackState.aims>0,vehicle:isVehicle(defender)}),ionX=attackKeywordValue('ion-x'),ion=result.wounds>0&&attackState.ionEligible?ionX:0,immune=moraleImmune(defender),dodgesUsed=afterCover().dodgesUsed,agile=keywordValue(defender,'agile')>0&&dodgesUsed>0,immobilizeX=attackKeywordValue('immobiliser-x'),poisonX=attackKeywordValue('poison-x'),towCable=activeAttackTags().some(x=>x.def.id==='cable-de-remorquage'),scatter=activeAttackTags().some(x=>x.def.id==='dispersion'),effects=engine.resolveStatusEffects({wounds:result.wounds,immobilizeX,poisonX,towCable,scatter,targetVehicle:attackState.targetVehicle,targetNonDroidTrooper:attackState.targetNonDroidTrooper,targetSmallTrooper:attackState.targetSmallTrooper}),attackerRules=allResolved(attacker),defenderRules=allResolved(defender),ataruAttack=attackerRules.some(x=>x.def.id==='maitrise-de-lataru'),ataruDefense=defenderRules.some(x=>x.def.id==='maitrise-de-lataru'),matamore=attackerRules.some(x=>x.def.id==='matamore')&&(attackState.rerolled>0||attackState.lethalAims>0),djemSo=defenderRules.some(x=>x.def.id==='maitrise-du-djem-so')&&attackType()==='melee'&&attackState.roll.blank>0;const rows=[];if(!immune&&suppression)rows.push(`<p><b>Suppression</b> — placez ${suppression} pion(s) sur ${entryName(defender)}${shienDeniesSuppression?' (Maîtrise du Shien : aucune blessure subie)':''}.</p>`);if(ion)rows.push(`<p><b>Ionique</b> — placez ${ion} pion(s)${attackState.ionEligible?'':' (cible non confirmée véhicule/droïde)'}.</p>`);if(effects.immobilize)rows.push(`<p><b>Immobilisation</b> — placez ${effects.immobilize} pion(s).</p>`);if(effects.poison)rows.push(`<p><b>Poison</b> — placez ${effects.poison} pion(s).</p>`);if(effects.towCablePivot)rows.push('<p><b>Câble de remorquage</b> — effectuez aussi un pivot avec le véhicule.</p>');if(effects.scatter)rows.push('<p><b>Dispersion</b> — vous pouvez replacer les figurines non-chef en cohésion.</p>');if(deflexionEligible&&deflexionWounds>0)rows.push(`<p><b>Déflexion${shienActive?' (Maîtrise du Shien)':''}</b> — ${entryName(attacker)} subit ${deflexionWounds} blessure(s).</p>`);if(agile)rows.push(`<p><b>Agile</b> — ${entryName(defender)} gagne 1 pion Esquive (au moins 1 esquive dépensée en défense).</p>`);if(ataruAttack)rows.push(`<p><b>Maîtrise de l’Ataru</b> — ${entryName(attacker)} gagne 1 pion Esquive.</p>`);if(ataruDefense)rows.push(`<p><b>Maîtrise de l’Ataru</b> — ${entryName(defender)} gagne 1 pion Viser.</p>`);if(matamore)rows.push(`<p><b>Matamore</b> — ${entryName(attacker)} gagne 1 pion Esquive (pion Viser dépensé pendant les relances).</p>`);if(attacker&&hasCard(attacker,'point blank')&&ranged&&String(attackState.range)==='2')rows.push(`<p><b>À Bout Portant</b> — ${entryName(attacker)} gagne 1 pion Esquive (attaque à distance contre une unité à portée 2). Ajouté automatiquement au suivi en terminant l’attaque.</p>`);if(djemSo)rows.push(`<p><b>Maîtrise du Djem So</b> — ${entryName(attacker)} subit 1 blessure (attaque au corps-à-corps, au moins un résultat vierge).</p>`);rows.push(...crossEndRows(result,dodgesUsed));if(!rows.length)return null;return `<strong>⚠ FIN D’ATTAQUE — ACTIONS À LA TABLE</strong>${rows.join('')}<p><small>Corrigez les cases à cocher ci-dessous (véhicule/soldat non-droïde/petits socles) si besoin : les pions Immobilisation/Poison/Câble/Dispersion seront recalculés.</small></p><button type="button" class="primary" data-close-popup>Compris</button>`}
function defeated(entry){return !!stateFor(entry).outOfAction}
function moraleImmune(entry){const stats=certifiedUnitStats(entry),state=stateFor(entry),enrage=keywordValue(entry,'enrage-x');return stats?.courage===null||stats?.suppressionImmune===true||isVehicle(entry)||(enrage>0&&state.enrageActive)}
function unitStatePanel(entry){const state=stateFor(entry),immune=moraleImmune(entry),enrageX=keywordValue(entry,'enrage-x');return `<section class="unit-state-editor ${defeated(entry)?'defeated':''}"><header><strong>ÉTAT ACTUEL DE L’UNITÉ</strong>${defeated(entry)?'<b>UNITÉ VAINCUE</b>':'<small>À SAISIR · pions et compteurs du suivi de partie</small>'}</header><div class="unit-tokens">${tokenMini(entry,'aim','Viser',state.aim,tokenIcons.aim)}${tokenMini(entry,'dodge','Esquive',state.dodge,tokenIcons.dodge)}${tokenMini(entry,'surge','Adrénaline',state.surge,tokenIcons.surge)}</div><div>${stateToggle(entry,'outOfAction','Hors combat',state.outOfAction)}${enrageX?stateToggle(entry,'enrageActive',`Enragé ${enrageX} atteint`,state.enrageActive):''}${immune?'<div class="state-immune">Suppression : immunisée</div>':stateCounter(entry,'suppression','Suppressions',state.suppression,30)}</div><details class="persistent-tokens"><summary>Autres pions persistants</summary><div>${stateCounter(entry,'ion','Ionique',state.ion,12)}${stateCounter(entry,'immobilize','Immobilisation',state.immobilize,12)}${stateCounter(entry,'poison','Poison',state.poison,12)}${stateCounter(entry,'shield','Boucliers actifs',state.shield,12)}</div></details>${immune&&state.suppression?'<div class="automation-card rule-highlight"><strong>SUPPRESSION ANNULÉE</strong><small>Le courage « — », le type véhicule, une immunité certifiée ou Enragé impose de retirer tous les pions Suppression.</small></div>':''}<button type="button" class="secondary state-reset" data-reset-state="${entry.id}" ${Object.values(state).some(Boolean)?'':'disabled'}>Remettre l’état à zéro</button></section>`}
function tokenMini(entry,field,label,value,icon){const n=Number(value)||0;return `<div class="token-mini ${n?'has':'none'}"><span class="token-icon" aria-hidden="true">${icon}</span><small>${label}</small><div class="touch-counter"><button type="button" data-unit-state="${entry.id}" data-state-field="${field}" data-delta="-1" aria-label="${label} : retirer un pion" ${n?'':'disabled'}>−</button><strong class="token-value">${n}</strong><button type="button" data-unit-state="${entry.id}" data-state-field="${field}" data-delta="1" aria-label="${label} : ajouter un pion" ${n>=30?'disabled':''}>+</button></div></div>`}
function stateCounter(entry,field,label,value,max){return `<div class="state-counter"><span>${label}</span><button type="button" data-unit-state="${entry.id}" data-state-field="${field}" data-delta="-1" ${value?'':'disabled'}>−</button><strong>${value}</strong><button type="button" data-unit-state="${entry.id}" data-state-field="${field}" data-delta="1" ${value>=max?'disabled':''}>+</button></div>`}
function stateToggle(entry,field,label,value){return `<div class="state-toggle"><span>${label}</span><button type="button" class="${value?'primary':'secondary'}" data-unit-toggle="${entry.id}" data-toggle-field="${field}">${value?'Oui':'Non'}</button></div>`}
function bindUnitState(entry,role){root.querySelectorAll('[data-unit-state]').forEach(button=>button.onclick=()=>{const state=stateFor(entry),field=button.dataset.stateField,max=30,next={...state,[field]:Math.max(0,Math.min(max,(Number(state[field])||0)+Number(button.dataset.delta)))};if(field==='suppression'&&Number(button.dataset.delta)>0)next.standby=0;unitStates[entry.id]=next;if(moraleImmune(entry))unitStates[entry.id].suppression=0;persistUnitStates();overview(entry,role)});root.querySelectorAll('[data-unit-toggle]').forEach(button=>button.onclick=()=>{const state=stateFor(entry),field=button.dataset.toggleField;unitStates[entry.id]={...state,[field]:!state[field]};persistUnitStates();overview(entry,role)});const reset=root.querySelector(`[data-reset-state="${entry.id}"]`);if(reset)reset.onclick=()=>{unitStates[entry.id]={suppression:0,ion:0,immobilize:0,poison:0,shield:0,outOfAction:false,enrageActive:false};persistUnitStates();overview(entry,role)}}
// Effectif d'une unité = figurines de base certifiées + figurines ajoutées par ses améliorations certifiées (escouade +5, spécialiste +1, arme lourde +1…). Absent si la carte n'est pas certifiée.
// Vitesse imprimée sur la carte Unité (certification : obligatoire pour toute unité).
function printedSpeed(entry){const value=Number(profileFor(entry?.unit?.name)?.fullCardCertification?.speed);return Number.isInteger(value)&&value>0?value:null}
function mobilityReadout(entry,state,immobilize){
  const base=printedSpeed(entry),delta=(Number(state.speedDelta)||0)+cardBonus(entry,CARD_SPEED_BONUS)+flipSpeedBonus(entry,state),override=state.maxSpeedOverride?Number(state.maxSpeedOverride):null,raw=override??(base+delta),current=Math.max(0,raw-immobilize),parts=['imprimée '+base];
  if(override)parts.push('vitesse maximale '+override+' ce round');else if(delta)parts.push((delta>0?'+':'')+delta+' (effets)');
  if(immobilize)parts.push('−'+immobilize+' Immobilisation');
  return '<div class="movement-readout '+(current!==base?'active':'')+'"><small>MOBILITÉ</small><b>VITESSE '+current+'</b><span>'+parts.join(' · ')+'</span></div>'
}
function speedChip(entry){
  const speed=printedSpeed(entry);
  if(!certifiedUnitStats(entry))return '';
  return speed!=null?'<span class="speed-chip" title="Vitesse imprimée sur la carte Unité">Vitesse <b>'+speed+'</b></span>':'<span class="speed-chip missing" title="Vitesse non certifiée : lisez-la sur la carte puis certifiez-la">Vitesse <b>?</b></span>'
}
function unitModelsChip(entry){const base=certifiedUnitStats(entry)?.baseModels;if(!Number.isInteger(base))return'';const added=(entry.unit.upgrades||[]).map(card=>({card:card.name,models:Number(profileFor(card.name)?.addedModels)||0})).filter(item=>item.models>0),total=base+added.reduce((sum,item)=>sum+item.models,0),detail=[`${base} de base`,...added.map(item=>`+${item.models} ${displayName(item.card)}`)].join(' · ');return `<span class="models-chip" title="${detail}"><b>${total}</b> figurines${added.length?` <small>(${[base,...added.map(item=>item.models)].join(' + ')})</small>`:''}</span>`}
function unitIdentityPanel(entry,side=false){return `<div class="unit-identity-panel"><header>${rankMark(entry)}<div><h1>${entryName(entry)}</h1></div>${unitModelsChip(entry)}<small class="identity-rank">${rankLabels[entry.rank]}</small></header>${unitStatusHud(entry,side)}</div>`}
function cardTags(name){return tags[cardKey(name)]||[]}function allResolved(entry){if(!entry)return[];const cards=[entry.unit.name,...(entry.unit.upgrades||[]).map(u=>u.name)];return cards.flatMap(source=>cardTags(source).map(t=>({tag:t,source,def:keywords.find(k=>k.id===t.keywordId)}))).filter(x=>x.def)}function resolved(entry){const seen=new Set;return allResolved(entry).filter(x=>!seen.has(x.def.id)&&seen.add(x.def.id))}
function definitionsFor(cardName){return cardTags(cardName).map(tag=>({tag,def:keywords.find(k=>k.id===tag.keywordId)})).filter(x=>x.def)}
function noteFor(cardName){return cardNotes[cardKey(cardName)]}
const diceIcons={attackSurge:['asurge.png','Adrénaline d’attaque'],defenseSurge:['dsurge.png','Adrénaline de défense'],hit:['hit.png','Touche'],block:['block.png','Blocage'],crit:['crit.png','Critique']};
function diceIcon(type,extra=''){const [file,label]=diceIcons[type];return `<img class="dice-symbol ${extra}" src="../icons/dice/${file}" alt="${label}" title="${label}">`}
function renderDiceText(text){return text
  .replace(/\[ADR-ATQ\]|adrénalines? d['’]attaque/gi,()=>diceIcon('attackSurge'))
  .replace(/\[ADR-DEF\]|adrénalines? de défense/gi,()=>diceIcon('defenseSurge'))
  .replace(/\[CRITIQUE\]|critiques?/gi,()=>diceIcon('crit'))
  .replace(/\[TOUCHE\]|touches?/gi,()=>diceIcon('hit'))
  .replace(/\[BLOC\]|blocages?|blocs?/gi,()=>diceIcon('block'))}
function definitionText(item){return renderDiceText((item.def.shortDefinition||item.def.definition||'').replace(/\bX\b/g,item.tag.value??'X'))}
/**
 * Une seule galerie pour la carte Unité et ses améliorations : chaque
 * mot-clé n'est plus affiché qu'une fois, au même endroit que la carte qui
 * le porte (au lieu d'être répété une seconde fois plus bas, groupé par
 * phase — voir l'ancien `group()` retiré du même mouvement).
 */
function cardStripEntry(name,label,isUnit){
  const fr=displayName(name);
  return `<button class="${isUnit?'unit-card-visual':'upgrade-card-visual'}" data-card-name="${fr.replace(/"/g,'&quot;')}" data-card-image="${imageFor(name)}" aria-label="Voir la carte ${fr}"><img src="${imageFor(name)}" alt="Carte ${fr}" onerror="this.classList.add('missing')"><small>${label}</small><span class="zoom" aria-hidden="true">+</span></button>`
}
function upgradeGallery(entry){
  const upgrades=entry.unit.upgrades||[];
  const unitCard=cardStripEntry(entry.unit.name,entryName(entry),true);
  const upgradeCards=upgrades.map(up=>cardStripEntry(up.name,displayName(up.name),false)).join('')||'<p class="empty-upgrades">Sans amélioration</p>';
  return `<section class="card-strip">${unitCard}<div class="upgrade-row">${upgradeCards}</div></section>`
}
function bindCardViewer(){root.querySelectorAll('.upgrade-visual,.unit-card-zoom,.unit-card-visual,.upgrade-card-visual').forEach(button=>button.onclick=()=>{const dialog=document.createElement('dialog');dialog.className='card-dialog dialog-wipe';dialog.innerHTML=`<button class="dialog-close" aria-label="Fermer">×</button><img src="${button.dataset.cardImage}" alt="${button.dataset.cardName}"><strong>${button.dataset.cardName}</strong>`;document.body.append(dialog);const dismiss=()=>{dialog.close();dialog.remove()};dialog.querySelector('button').onclick=dismiss;dialog.onclick=e=>{if(e.target===dialog)dismiss()};dialog.onclose=()=>dialog.remove();dialog.showModal()})}
function progress(){const current=attackState?Math.min(8,attackStep+3):stage<=2?1:2;document.querySelectorAll('#progress i').forEach((i,n)=>{i.className=n+1===current?'active':n+1<current?'done':''})}function name(e){return e?.unit?.name?displayName(e.unit.name):'Unité'}
function entryName(e){const base=displayName(e.unit.name);return e.totalOccurrences>1?`${base} ${e.occurrence}`:base}
// Grille de sélection (19/09/2026, demande utilisateur) : la carte Unité en grand sert de bouton ; le nombre de colonnes suit le nombre d'unités pour que la liste tienne sur un iPad Air sans défilement (voir unit-picker.css).
function pickerGrid(units){const n=units.length,cols=n<=3?3:n<=8?4:n<=10?5:n<=12?6:7;return `<div class="unit-grid unit-picker-grid" style="--cols:${cols};--rows:${Math.ceil(n/cols)}">${units.map(tile).join('')}</div>`}
function tile(e){const state=stateFor(e),stats=certifiedUnitStats(e),morale=stats?.courage?engine.moraleState({currentSuppression:state.suppression,courage:stats.courage}):null,lost=defeated(e);return `<button data-faction="${factionThemeForArmy(e.army)}" class="unit-tile ${lost?'unit-defeated':''} ${state.standby?'has-standby':''}" data-id="${e.id}"><span class="tile-visual"><img src="${imageFor(e.unit.name)}" alt="" onerror="this.style.visibility='hidden'">${rankMark(e)}</span><span><strong>${entryName(e)}</strong><small class="rank-label">${rankLabels[e.rank]}</small><small>${(e.unit.upgrades||[]).map(u=>displayName(u.name)).join(' · ')||'Sans amélioration'}</small>${state.suppression||state.standby?`<span class="unit-status"><b>${stats?.courage===null?'Suppression : immunisée':`${state.suppression} suppression`}</b>${state.standby?'<b class="standby-ready">● ATTENTE DISPONIBLE</b>':''}${lost?'<b class="danger">UNITÉ VAINCUE</b>':morale?.panicRisk?'<b class="danger">Ralliement · risque de panique</b>':morale?.suppressed?'<b class="warning">Démoralisée · ralliement</b>':''}</span>`:''}</span>${lost?'<span class="defeated-overlay" aria-hidden="true"><b>☠</b></span>':''}</button>`}
function armyLabel(army,index){return army.list.listName||army.list.faction||`Joueur ${index+1}`}
function factionClass(army){const faction=norm(army?.list?.faction||army?.list?.listName);return faction.includes('empire')||faction.includes('imperial')?'imperial':'rebel'}
function armySelector(){return `<div class="player-side-choice"><small>CAMP UTILISÉ SUR CETTE TABLETTE</small><strong>${armyLabel(armies.find(army=>army.id===selectedArmy)||armies[0],Math.max(0,armies.findIndex(army=>army.id===selectedArmy)))}</strong><span>Le choix reste mémorisé uniquement sur cet appareil.</span></div><div class="army-switch" role="tablist" aria-label="Choisir mon camp">${armies.map((army,index)=>`<button type="button" role="tab" aria-selected="${selectedArmy===army.id}" class="${selectedArmy===army.id?'active':''}" data-army="${army.id}"><i class="faction-emblem ${factionClass(army)}" aria-label="${factionClass(army)==='imperial'?'Empire':'Alliance Rebelle'}"></i><small>${selectedArmy===army.id?'✓ MON CAMP':`JOUEUR ${index+1}`}</small><strong>${armyLabel(army,index)}</strong><span>${(army.list.units||[]).length} unité(s)</span></button>`).join('')}</div>`}

function pick(role){lastOverviewEntryId=null;const wipe=stageWipe;stageWipe=false;const isDefense=role==='defender',allAvailable=isDefense?entries.filter(e=>e.army!==attacker.army):entries.filter(e=>e.army===selectedArmy),available=allAvailable,rankOrder=[...Object.keys(rankIcons),'unknown'];const grouped=label=>rankOrder.map(rank=>({rank,units:available.filter(e=>e.label===label&&e.rank===rank)})).filter(group=>group.units.length);root.innerHTML=`<section class="intro"><span class="kicker">ÉTAPE ${stage} SUR 4</span><h1>${isDefense?'Quelle unité est attaquée ?':'Quelle unité jouez-vous ?'}</h1><p>${isDefense?'Seules les unités de l’armée adverse sont proposées.':'Choisissez d’abord votre camp sur cette tablette, puis touchez la troupe jouée.'}</p>${!isDefense?armySelector():''}${usingDemo?'<p class="notice">Mode démonstration : importez deux listes depuis la page principale pour retrouver vos propres unités ici.</p>':''}</section><div class="${wipe?`page-wipe`:``}">${available.length?[...new Set(available.map(e=>e.label))].map(label=>`<section class="army-units">${pickerGrid(grouped(label).flatMap(group=>group.units))}</section>`).join(''):'<p class="empty-selection">Aucune unité disponible.</p>'}</div>`;root.querySelectorAll('.army-switch button').forEach(b=>b.onclick=()=>{if(b.dataset.army===selectedArmy)return;selectedArmy=b.dataset.army;localStorage.setItem(playerSideKey,selectedArmy);stageWipe=true;pick('attacker')});root.querySelectorAll('.unit-tile').forEach(b=>b.onclick=()=>{const e=entries.find(x=>x.id===b.dataset.id);stageWipe=true;if(isDefense){defender=e;if(defeated(e)){stage=4;overview(defender,'defense')}else initAttack()}else{attacker=e;defender=null;stage=2;overview(attacker,'attack')}});progress()}
function arrangeRankColumns(){document.querySelectorAll('.army-units:not(.rank-arranged)').forEach(section=>{const groups=[...section.children].filter(child=>child.classList.contains('rank-group'));if(!groups.length)return;const order={commandant:0,agent:1,troupiers:2,'forces speciales':3,soutien:4,lourd:5,'rang a verifier':6};const sized=groups.map(group=>({group,label:norm(group.querySelector('header strong')?.textContent||''),weight:(Number(group.querySelector('header small')?.textContent)||0)+1})).sort((a,b)=>(order[a.label]??9)-(order[b.label]??9));const columns=[document.createElement('div'),document.createElement('div'),document.createElement('div')];columns.forEach(column=>column.className='rank-column');const totals=[0,0,0];sized.forEach(({group,label,weight})=>{group.style.order=order[label]??9;const target=totals.indexOf(Math.min(...totals));columns[target].append(group);totals[target]+=weight});const wrapper=document.createElement('div');wrapper.className='rank-columns';columns.forEach(column=>wrapper.append(column));section.append(wrapper);section.classList.add('rank-arranged')})}
new MutationObserver(arrangeRankColumns).observe(root,{childList:true,subtree:true});
function displayImpacts(item){return item.def.displaySections?.length?item.def.displaySections:[item.def.impact]}
function surgeResult(type,value){const source=type==='attack'?diceIcon('attackSurge','large'):diceIcon('defenseSurge','large');const result=value==='hit'?diceIcon('hit','large'):value==='crit'?diceIcon('crit','large'):value==='block'?diceIcon('block','large'):'<i class="no-surge" title="Aucune conversion">—</i>';return `<strong class="surge-line">${source}<b>→</b>${result}</strong>`}
function surgePanel(entry){const profile={...profileFor(entry.unit.name),...combatProfiles[cardKey(entry.unit.name)]};if(!profile||(!profile.attackSurge&&!profile.defenseSurge&&!profile.source))return `<div class="surge-panel unknown"><span>CONVERSIONS D’ADRÉNALINE</span><strong>À vérifier sur la carte</strong><small>Aucune valeur n’est inventée tant que le visuel n’a pas été contrôlé.</small></div>`;if(profile.applicable===false)return `<div class="surge-panel unknown"><span>CONVERSIONS D’ADRÉNALINE</span><strong>Profil de l’unité principale</strong><small>${profile.source} · aucune fenêtre de conversion propre n’est imprimée.</small></div>`;return `<div class="surge-panel"><span>CONVERSIONS D’ADRÉNALINE</span>${surgeResult('attack',profile.attackSurge)}${surgeResult('defense',profile.defenseSurge)}<small>Vérifié visuellement · ${profile.source||profile.verificationSource||'catalogue central'}</small></div>`}
function unitVisual(entry,side=''){const fr=name(entry),img=imageFor(entry.unit.name);return `<button class="unit-card-zoom ${side}" data-card-name="${fr.replace(/"/g,'&quot;')}" data-card-image="${img}" aria-label="Voir la carte ${fr}"><img src="${img}" alt="Carte ${fr}" onerror="this.hidden=true"><span aria-hidden="true">+</span></button>`}
function overview(entry,role){const wipe=stageWipe;stageWipe=false;const lost=defeated(entry),freshOpen=entry.id!==lastOverviewEntryId;lastOverviewEntryId=entry.id;root.innerHTML=`<div class="${wipe?`page-wipe`:``}">${role==='defense'?`<div class="duel"><strong>${name(attacker)}</strong><span>ATTAQUE</span><strong>${name(defender)}</strong></div>`:''}<section class="overview ${role}"><div class="hero">${unitIdentityPanel(entry)}</div>${upgradeGallery(entry)}${unitStatePanel(entry)}</section><div class="actions"><button class="secondary" id="back">${role==='attack'?'Changer d’unité':'Changer de cible'}</button><button class="primary" id="next" ${lost?'disabled':''}>${lost?'Unité vaincue':role==='attack'?'Choisir la cible →':'Résoudre l’attaque →'}</button></div></div>`;bindCardViewer();bindUnitState(entry,role);$('#back').onclick=()=>{stage=role==='attack'?1:3;stageWipe=true;pick(role==='attack'?'attacker':'defender')};$('#next').onclick=()=>{if(lost)return;stageWipe=true;if(role==='attack'){stage=3;pick('defender')}else initAttack()};if(freshOpen&&role==='attack'&&!lost){const popup=moralPopupContent(entry);if(popup)showRulePopup(popup,'moral-popup')}progress()}
let attackStep=0,attackState=null;
const attackSteps=['Armes & portée','Jet & relances','Couvert & esquive','Modifications','Défense','Suppression'];
const vehicleUnits=new Set(['74 z speeder bikes','a a5 speeder truck','at rt','tl tt','at st','tr tt','laat le patrol transport','t 47 airspeeder','tx 225 occupier tank','x 34 landspeeder']);
function isVehicle(entry){return vehicleUnits.has(norm(entry?.unit?.name))}
function profileFor(card){return weaponProfiles[cardKey(card)]}
function upgradeProfiles(entry){return (entry?.unit?.upgrades||[]).map(upgrade=>profileFor(upgrade.name)).filter(Boolean)}
function effectiveDefenseProfile(entry){const base=profileFor(entry?.unit?.name)||{},overrides=upgradeProfiles(entry),color=overrides.find(profile=>profile.defenseColorOverride)?.defenseColorOverride||base.defenseColor;let surge=combatProfiles[cardKey(entry?.unit?.name)]?.defenseSurge??base.defenseSurge;const surgeOverride=overrides.find(profile=>Object.prototype.hasOwnProperty.call(profile,'defenseSurgeOverride'));if(surgeOverride)surge=surgeOverride.defenseSurgeOverride;return {...base,defenseColor:color,defenseSurge:surge}}
function fireControlSources(){return fireControlCandidates().map(entry=>({entry,card:(entry.unit.upgrades||[]).find(upgrade=>profileFor(upgrade.name)?.fireControl)?.name})).filter(item=>item.card)}
function fireControlCandidates(){if(attackState?.range==='melee')return[];return entries.filter(entry=>entry.army===attacker?.army&&entry.id!==attacker?.id&&!defeated(entry)&&upgradeProfiles(entry).some(profile=>profile.fireControl))}
function upgradePoolDice(pool,count){const result={...pool},white=Math.min(result.blanc,Math.max(0,count)),remaining=Math.max(0,count-white),black=Math.min(result.noir,remaining);result.blanc-=white;result.noir+=white-black;result.rouge+=black;return result}
function hasCard(entry,key){return [entry?.unit?.name,...(entry?.unit?.upgrades||[]).map(upgrade=>upgrade.name)].some(card=>cardKey(card)===key)}
// Pilotage de Véhicule X : une unité alliée à portée 3 compte comme Commandement de valeur X pour le test de panique (à confirmer : portée 3 et même affiliation).
function pilotCommanderCourage(entry){return entries.filter(candidate=>candidate.army===entry.army&&candidate.id!==entry.id&&!defeated(candidate)).reduce((best,candidate)=>Math.max(best,keywordValue(candidate,'pilotage-de-vehicule-x')),0)}
function initAttack(){attackStep=0;const vehicle=isVehicle(defender),saved=stateFor(defender),stats=certifiedUnitStats(defender);attackState={range:null,selected:{},counts:{},moved:false,engaged:null,ramEligible:null,tenacityUsed:null,makashiUsed:null,weakPointExposed:null,fireControlUsed:null,visibleTargetModels:1,attackerWounds:0,fixedArcConfirmed:false,smallOnlyVisible:false,priorityMissionAttack:null,priorityMissionDefense:null,targetForceUpgrade:null,longShotAim:false,ionEligible:false,deathFromAbove:false,targetVehicle:vehicle,targetNonDroidTrooper:false,targetSmallTrooper:false,activeShields:saved.shield,shieldHit:0,shieldCrit:0,guardianId:'',guardianEligible:false,guardianHits:0,guardianDefense:{block:0,surge:0,blank:0},aims:0,lethalAims:0,rerolled:0,roll:{hit:0,crit:0,surge:0,blank:0},cover:'none',coverBlock:0,coverSurge:0,dodges:0,dodgeCrits:0,impact:null,armor:null,defenseRerolled:0,defense:{block:0,surge:0,blank:0},currentSuppression:saved.suppression,defenderCourage:stats?.courage??(Number(defender.unit.courage)||1),commanderCourage:pilotCommanderCourage(defender),nullCourage:moraleImmune(defender),mixedWarningDismissed:false};resolveScreen()}
function selectedWeaponRows(){const cards=[attacker.unit.name,...(attacker.unit.upgrades||[]).map(u=>u.name)];return cards.flatMap(card=>(profileFor(card)?.weapons||[]).map((weapon,index)=>({card,weapon,index,key:`${norm(card)}:${index}`}))).filter(x=>attackState.selected[x.key])}
function weaponHasKeyword(row,id){const profile=profileFor(row.card),ids=definitionsFor(row.card).filter(x=>x.def.category==='arme').map(x=>x.def.id);return engine.weaponKeywordActive(profile,row.weapon,ids,id)}
function weaponKeywordValue(row,id){if(!weaponHasKeyword(row,id))return 0;const own=row.weapon.keywordValues?.[id],card=definitionsFor(row.card).find(item=>item.def.id===id)?.tag.value;return Math.max(0,Number(own??card)||0)}
function pool(){const rows=selectedWeaponRows(),downgraded=new Set(attackState.moved?rows.filter(row=>weaponHasKeyword(row,'encombrant')).map(row=>row.key):[]),counts={...attackState.counts},upgrades={};rows.filter(row=>weaponHasKeyword(row,'souffle')).forEach(row=>{counts[row.key]=(counts[row.key]??1)*Math.max(1,attackState.visibleTargetModels||1)});rows.forEach(row=>{upgrades[row.key]=isVehicle(defender)?weaponKeywordValue(row,'anti-materiel-x'):weaponKeywordValue(row,'anti-personnel-x')});let result=engine.buildPool(rows,counts,downgraded,upgrades);if(attackType()==='ranged'&&attackState.fireControlUsed===true)result=upgradePoolDice(result,2);const vaapad=allResolved(attacker).some(x=>x.def.id==='maitrise-du-vaapad')?Math.min(3,Math.max(0,attackState.attackerWounds||0)):0,tenacity=attackState.range==='melee'&&attackState.tenacityUsed===true&&hasCard(attacker,'tenacity')?1:0;return {...result,rouge:result.rouge+tenacity,blanc:result.blanc+vaapad}}
function dieBadge(color,count){return count?`<span class="dice-badge dice-badge-${color}" title="${count} dé(s) ${color}"><span>${count}</span></span>`:''}
function defenseDieBadge(color,count){return `<span class="defense-die-badge defense-die-${color||'blanc'}" title="${count} dé(s) de défense ${color||'blanc'}"><span>${count}</span></span>`}
function defensePoolView(count){const color=effectiveDefenseProfile(defender).defenseColor||'blanc';return `<div class="defense-dice-pool"><span>DÉS DE DÉFENSE À LANCER</span>${defenseDieBadge(color,count)}</div>`}
function weaponDiceView(dice,count=1){return dice==='variable'?'<span class="variable-dice">Réserve variable</span>':`<span class="dice-row">${dice.map(d=>dieBadge(d.color,d.count*count)).join('')}</span>`}
function poolView(){const p=pool();return `<div class="dice-pool"><span>DÉS À LANCER</span><div class="dice-row dice-row-big">${dieBadge('rouge',p.rouge)}${dieBadge('noir',p.noir)}${dieBadge('blanc',p.blanc)}${p.variable?'<strong>+ réserve variable : voir la carte</strong>':''}</div></div>`}
function liveResultStrip(label,results){return `<div class="result-strip live-result-strip" aria-live="polite"><b>${label}</b><b>${diceIcon('hit','large')} <span data-live-hit>${results.hit}</span></b><b>${diceIcon('crit','large')} <span data-live-crit>${results.crit}</span></b></div>`}
function diceJourney(){const p=pool(),steps=[`<article class="journey-stage active"><small>RÉSERVE</small><strong>${dieBadge('rouge',p.rouge)}${dieBadge('noir',p.noir)}${dieBadge('blanc',p.blanc)}</strong><em>${selectedWeaponRows().length} arme(s)</em></article>`];if(attackStep>=1){const raw=attackState.roll,converted=attackResults(),conversionNotes=[];if(converted.printedToHit)conversionNotes.push(`+${converted.printedToHit} touche(s) par adrénaline`);if(converted.printedToCrit||converted.criticalUsed)conversionNotes.push(`+${converted.printedToCrit+converted.criticalUsed} critique(s) par adrénaline/Critique`);if(converted.ramUsed)conversionNotes.push(`${converted.ramUsed} résultat(s) → critique par Bélier`);steps.push(`<article class="journey-stage ${attackStep===1?'active':''}"><small>JET ET CONVERSION</small><strong>${diceIcon('hit')} ${converted.hit} ${diceIcon('crit')} ${converted.crit}</strong><em>${conversionNotes.join(' · ')||`${raw.surge||0} adrénaline(s), aucune conversion active`}</em></article>`)}if(attackStep>=2){const before=attackResults(),after=afterCover(),lostHit=before.hit-after.hit,lostCrit=before.crit-after.crit;steps.push(`<article class="journey-stage ${attackStep===2?'active':''}"><small>COUVERT ET ESQUIVES</small><strong>${diceIcon('hit')} ${after.hit} ${diceIcon('crit')} ${after.crit}</strong><em>−${lostHit} touche(s) · −${lostCrit} critique(s)</em></article>`)}if(attackStep>=3){const before=afterCover(),after=modifiedResults();steps.push(`<article class="journey-stage ${attackStep===3?'active':''}"><small>IMPACT ET ARMURE</small><strong>${diceIcon('hit')} ${after.hit} ${diceIcon('crit')} ${after.crit}</strong><em>Impact ${after.impactUsed||0} · Armure annule ${after.armorCancelled||0}</em></article>`)}if(attackStep>=4){const defense=defenseResult().result;steps.push(`<article class="journey-stage active"><small>DÉFENSE</small><strong>${diceIcon('block')} ${defense.blocks} · ${defense.wounds} blessure(s)</strong><em>Perforant annule ${defense.pierceUsed} blocage(s)</em></article>`)}return `<section class="dice-journey" aria-label="Évolution de la réserve de dés"><header><b>SUIVI DES DÉS</b><span>Chaque modification reste visible pendant toute la résolution</span></header><div>${steps.join('<span class="journey-arrow">›</span>')}</div></section>`}
function defenseResult(){const a=modifiedResults(),d=attackState.defense,p=effectiveDefenseProfile(defender),duelistAttack=allResolved(attacker).some(x=>x.def.id==='duelliste')?engine.duelistModifiers({melee:attackType()==='melee',aimSpent:attackState.aims}):{pierceBonus:0},makashiUsed=makashiEligible()&&attackState.makashiUsed===true,lethal=engine.applyLethal(Math.max(0,attackKeywordValue('perforant-x')+duelistAttack.pierceBonus-(makashiUsed?1:0)),attackKeywordValue('letal-x'),attackState.lethalAims),guardian=guardianContext(),pierceX=guardian.result.pierceRemaining,pierceImmunePrinted=allResolved(defender).some(x=>x.def.id==='immunite-perforant'||(x.def.id==='immunite-perforant-corps-a-corps'&&attackType()==='melee'&&!makashiUsed)),dodgesUsed=afterCover().dodgesUsed,duelistDefense=allResolved(defender).some(x=>x.def.id==='duelliste')?engine.duelistModifiers({melee:attackType()==='melee',dodgeSpent:dodgesUsed}):{pierceImmune:false},pierceImmune=pierceImmunePrinted||duelistDefense.pierceImmune,blockActive=keywordValue(defender,'blocage')>0&&dodgesUsed>0,holdFast=attackState.engaged&&allResolved(defender).some(x=>x.def.id==='tenir-bon'),missionDefense=attackState.priorityMissionDefense&&allResolved(defender).some(x=>x.def.id==='accomplir-la-mission'),deflexionEligible=attackType()==='ranged'&&allResolved(defender).some(x=>x.def.id==='deflexion')&&selectedWeaponRows().length>0&&!selectedWeaponRows().every(row=>weaponHasKeyword(row,'haute-velocite')),deflexionImmune=selectedWeaponRows().some(row=>weaponHasKeyword(row,'immunite-deflexion')),shienActive=deflexionEligible&&allResolved(defender).some(x=>x.def.id==='maitrise-du-shien'),deflexionWounds=deflexionEligible&&!deflexionImmune&&Number(d.surge)>0?(shienActive?Number(d.surge):1):0,defenseSurge=holdFast||missionDefense||deflexionEligible?'block':engine.effectiveDefenseSurge(p?.defenseSurge,blockActive,dodgesUsed);return {a,d,p,lethal,guardian,pierceX,pierceImmune,dodgesUsed,blockActive,holdFast,missionDefense,deflexionEligible,deflexionImmune,shienActive,deflexionWounds,defenseSurge,duelistAttack,duelistDefense,result:engine.applyDefense(a,d,{defenseSurge,pierceX,pierceImmune})}}
function liveDefenseStrip(result){return `<div class="result-strip live-defense-strip" aria-live="polite"><b>APRÈS DÉFENSE</b><b><span data-live-blocks>${result.blocks}</span> blocage(s)</b><b class="final-wounds"><i class="blood-drop" aria-hidden="true"></i><span data-live-wounds>${result.wounds}</span> blessure(s)</b></div>`}
function inputWarning(){const issue=stepIssue();return `<div class="strict-warning input-warning" role="alert" ${issue?'':'hidden'}>⚠ <span>${issue||''}</span></div>`}
function updateInputWarning(){const warning=root.querySelector('.input-warning');if(!warning)return;const issue=stepIssue();warning.hidden=!issue;warning.querySelector('span').textContent=issue||''}
/* Rejoue une brève animation d'éclat (sw-effects.css) sur un élément dont le
   texte vient d'être patché sans que le nœud lui-même soit recréé — une
   simple classe CSS ne se rejouerait pas d'elle-même : on la retire puis la
   repose après un reflow forcé (void el.offsetWidth) pour forcer le
   redémarrage. cls par défaut 'wound-pulse' pour ne rien changer aux appels
   existants ; réutilisé aussi pour les éclats « refusé » ci-dessous. */
function pulseEl(el,cls='wound-pulse'){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls)}
function effectiveAttackProfile(){const certified=profileFor(attacker.unit.name),printed=combatProfiles[cardKey(attacker.unit.name)]||certified,weaponConversions=selectedWeaponRows().map(row=>row.weapon.attackSurge).filter(Boolean),upgradeSurge=upgradeProfiles(attacker).map(profile=>profile.attackSurgeOverride).find(Boolean),attackSurge=weaponConversions.includes('crit')?'crit':weaponConversions.includes('hit')?'hit':(upgradeSurge&&(!printed?.attackSurge||upgradeSurge==='crit'))?upgradeSurge:printed?.attackSurge,source=weaponConversions.length?'Conversion accordée par une arme de la réserve':printed?.source||printed?.verificationSource;return {...printed,attackSurge,source,verified:printed?.verified!==false}}
function updateLiveCounters(){const progress=root.querySelector('[data-entry-progress]');if(progress){const kind=progress.dataset.entryProgress,wasComplete=progress.classList.contains('complete'),holder=document.createElement('div');holder.innerHTML=entryProgress(kind);const fresh=holder.firstElementChild;if(fresh.classList.contains('complete')&&!wasComplete)fresh.classList.add('progress-complete-pop');progress.replaceWith(fresh)}const strip=root.querySelector('.live-result-strip');if(strip){const results=attackStep===1?attackResults():attackStep===2?afterCover():attackStep===3?modifiedResults():null;if(results){strip.querySelector('[data-live-hit]').textContent=results.hit;strip.querySelector('[data-live-crit]').textContent=results.crit}}const defenseStrip=root.querySelector('.live-defense-strip');if(defenseStrip){const {result}=defenseResult();defenseStrip.querySelector('[data-live-blocks]').textContent=result.blocks;defenseStrip.querySelector('[data-live-wounds]').textContent=result.wounds;if(result.wounds>0)pulseEl(defenseStrip.querySelector('.final-wounds'));const total=root.querySelector('[data-live-total-wounds]');if(total){total.textContent=result.wounds;if(result.wounds>0)pulseEl(total.closest('.total,.recap-card'))}}const journey=root.querySelector('.dice-journey');if(journey){const holder=document.createElement('div');holder.innerHTML=diceJourney();journey.replaceWith(holder.firstElementChild)}if(attackStep===1){const p=effectiveAttackProfile(),precise=attackKeywordValue('precis-x'),capacity=engine.rerollCapacity(attackState.aims,precise),lethalX=attackKeywordValue('letal-x'),lethal=engine.applyLethal(attackKeywordValue('perforant-x'),lethalX,attackState.lethalAims),critical=attackKeywordValue('critique-x'),converted=engine.convertAttack(attackState.roll,p?.attackSurge,critical),conversion=root.querySelector('.roll-conversion-panel'),rerolls=root.querySelector('.roll-reroll-panel');if(conversion)conversion.outerHTML=rollConversionPanel(p,converted,critical);if(rerolls)rerolls.outerHTML=rollRerollPanel(capacity,precise,lethalX,lethal,converted)}updateInputWarning()}
function bindLiveCounters(){root.querySelectorAll('#aims,#lethalAims,#rerolled,#rollHit,#rollCrit,#rollSurge,#rollBlank,#activeShields,#shieldHit,#shieldCrit,#guardianHits,#guardianBlock,#guardianSurge,#guardianBlank,#impact,#armor,#coverBlock,#coverSurge,#dodges,#defBlock,#defSurge,#defBlank').forEach(input=>input.addEventListener('input',()=>{pulseEl(input.closest('.quick-field'),'field-touched');updateLiveCounters()}))}
function activeAttackTags(){const resolved=allResolved(attacker),unitRules=resolved.filter(x=>displayImpacts(x).includes('attaque')&&x.def.category!=='arme'),weaponRules=selectedWeaponRows().flatMap(row=>definitionsFor(row.card).filter(x=>displayImpacts(x).includes('attaque')&&x.def.category==='arme'&&weaponHasKeyword(row,x.def.id)).map(x=>({...x,source:x.source||row.weapon.name,tag:{...x.tag,value:row.weapon.keywordValues?.[x.def.id]??x.tag.value}}))),reluctant=(attacker?.unit?.upgrades||[]).find(upgrade=>profileFor(upgrade.name)?.criticalPerSuppression),criticalDef=keywords.find(def=>def.id==='critique-x'),conditional=reluctant&&criticalDef?[{source:reluctant.name,def:criticalDef,tag:{keywordId:'critique-x',value:stateFor(attacker).suppression}}]:[];return [...unitRules,...weaponRules,...conditional]}
function ambiguousWeaponRules(){return selectedWeaponRows().flatMap(row=>{const profile=profileFor(row.card),weaponRules=definitionsFor(row.card).filter(x=>x.def.category==='arme'&&displayImpacts(x).includes('attaque'));if((profile?.weapons?.length||0)<2||!weaponRules.length||Array.isArray(row.weapon.keywordIds))return[];return [{card:displayName(row.card),weapon:row.weapon.name,rules:weaponRules.map(x=>x.def.name).join(', ')}]})}
function relevantKeywords(){const seen=new Set;return [...activeAttackTags(),...allResolved(defender).filter(x=>displayImpacts(x).includes('défense'))].filter(x=>!seen.has(`${x.def.id}:${x.source}`)&&seen.add(`${x.def.id}:${x.source}`))}
function rulesPanel(){const rows=relevantKeywords(),ambiguous=ambiguousWeaponRules();return `${ambiguous.length?`<div class="strict-warning" role="alert">⚠ Association arme/règle à vérifier : ${ambiguous.map(x=>`${x.weapon} (${x.card}) — ${x.rules}`).join(' ; ')}. Ces effets ne sont pas calculés tant qu’ils ne sont pas rattachés à cette arme dans le référentiel.</div>`:''}<details class="rules-panel" ${quickMode?'':'open'}><summary>Règles qui interviennent (${rows.length})${quickMode?' · toucher pour le détail':''}</summary>${rows.length?rows.map(x=>`<article><b>${x.def.name}${x.tag.value!=null?' '+x.tag.value:''}</b><small>${definitionText(x)} · ${displayName(x.source)}</small></article>`).join(''):'<p>Aucun mot-clé d’attaque ou de défense rattaché.</p>'}</details>`}
function sideSurge(entry,side){const p=side==='defense'?effectiveDefenseProfile(entry):{...profileFor(entry.unit.name),...combatProfiles[cardKey(entry.unit.name)]},type=side==='attack'?'attack':'defense',value=type==='attack'?p?.attackSurge:p?.defenseSurge,label=type==='attack'?'ADRÉNALINE D’ATTAQUE':'ADRÉNALINE DE DÉFENSE';return `<div class="side-surge"><small>${label}</small>${surgeResult(type,value)}<em>${value==='hit'?'vers Touche':value==='crit'?'vers Critique':value==='block'?'vers Blocage':'aucune conversion'}</em></div>`}
function defenseVerification(entry){const profile=profileFor(entry.unit.name);if(!profile?.defenseColor)return'';const verified=profile.defenseVerifiedAgainstCard;return `<div class="defense-verification ${verified?'verified':'unverified'}" title="${(profile.defenseVerificationSource||'Couleur de défense à comparer à la carte source.').replace(/"/g,'&quot;')}">${verified?'✓ Dé de défense vérifié':'⚠ Dé de défense non certifié'}</div>`}
function sideStatusHud(entry){const state=stateFor(entry),immune=moraleImmune(entry),isLiveDefender=entry===defender&&attackState;let suppression=immune?0:(isLiveDefender?attackState.currentSuppression:state.suppression);if(isLiveDefender&&attackStep>=5){const ranged=attackType()==='ranged',hadResult=attackResults().hit+attackResults().crit>0,suppressive=activeAttackTags().some(x=>x.def.id==='suppressif'),overwhelm=activeAttackTags().some(x=>x.def.id==='debordement');suppression=engine.moraleState({currentSuppression:attackState.currentSuppression,gainedSuppression:engine.suppressionTokens({ranged,hadAttackResult:hadResult,suppressive,overwhelm,aimSpent:attackState.aims>0,vehicle:isVehicle(defender)}),courage:attackState.defenderCourage,commanderCourage:attackState.commanderCourage,nullCourage:attackState.nullCourage,vehicle:isVehicle(defender)}).total}return `<div class="side-status" aria-label="État de l’unité"><span class="${immune?'suppression-immune':''}"><small>SUPPRESSION</small><b>${immune?'—':suppression}</b></span></div>`}
const collapsedSides={attack:false,defense:false};
function combatAside(entry,side){return `<aside class="combat-side ${side} ${collapsedSides[side]?'collapsed':''}"><button class="side-collapse" data-collapse-side="${side}" aria-label="${collapsedSides[side]?'Déplier':'Replier'} la colonne">${collapsedSides[side]?'›':'‹'}</button><div class="side-detail">${unitVisual(entry,side)}${sideStatusHud(entry)}<div class="mini-upgrades">${(entry.unit.upgrades||[]).map(u=>`<button class="upgrade-visual" data-card-name="${displayName(u.name).replace(/"/g,'&quot;')}" data-card-image="${imageFor(u.name)}" aria-label="Voir la carte ${displayName(u.name).replace(/"/g,'&quot;')}"><img src="${imageFor(u.name)}" alt=""><span aria-hidden="true">+</span></button>`).join('')||'<small>Sans amélioration</small>'}</div>${sideSurge(entry,side)}</div></aside>`}
function resultMarker(id){const icons={rollHit:'hit',rollCrit:'crit',rollSurge:'attackSurge',defBlock:'block',defSurge:'defenseSurge',coverBlock:'block',coverSurge:'defenseSurge'};return icons[id]?diceIcon(icons[id],'large'):/Blank$/.test(id)?'<span class="blank-die" aria-label="Face vierge"></span>':''}
function numberField(id,label,value,max='99'){const current=Math.max(0,Number(value)||0),limit=Math.max(0,Number(max)||0);return `<div class="quick-field">${resultMarker(id)}<span class="quick-label">${label}</span><div class="touch-counter"><button type="button" data-adjust="${id}" data-delta="-1" aria-label="Diminuer" ${current<=0?'disabled':''}>−</button><input id="${id}" aria-label="${id}" type="number" inputmode="numeric" min="0" max="${limit}" value="${current}"><button type="button" data-adjust="${id}" data-delta="1" aria-label="Augmenter" ${current>=limit?'disabled':''}>+</button></div></div>`}
function entryProgress(kind){const values=kind==='attack'?attackState.roll:attackState.defense,total=Object.values(values).reduce((sum,value)=>sum+(Number(value)||0),0),expected=kind==='attack'?(()=>{const p=pool();return p.rouge+p.noir+p.blanc})():(modifiedResults().hit+modifiedResults().crit),complete=total===expected;return `<div class="entry-progress ${complete?'complete':total>expected?'over':'pending'}" data-entry-progress="${kind}"><span>${complete?'✓':'↻'}</span><strong>${total} / ${expected} dés saisis</strong><small>${complete?'Saisie complète':total>expected?'Trop de résultats saisis':'Continuez la saisie des faces obtenues'}</small></div>`}
function attackType(){return attackState.range==='melee'?'melee':'ranged'}
function rangeLabel(range){if(range==='melee')return'corps-à-corps';const meleeMatch=String(range||'').match(/^melee-(\d+)$/);if(meleeMatch)return`corps-à-corps à ${meleeMatch[1]}`;return String(range||'à vérifier').replace('-#',' à ∞')}
function rangeChoiceLabel(range,rows){if(range==='melee')return'CORPS-À-CORPS';const isOpen=range===4&&rows.some(row=>{const bounds=engine.rangeBounds(row.weapon.range);return bounds?.max===Infinity&&bounds.min<=4});return `PORTÉE ${range}${isOpen?' ET +':''}`}
function defenderImmunities(){const ids=new Set(allResolved(defender).map(x=>x.def.id));return {immuneMelee:ids.has('immunite-corps-a-corps'),immuneRange1:ids.has('immunite-armes-portee-1')}}
function weaponScreen(){const cards=[attacker.unit.name,...(attacker.unit.upgrades||[]).map(u=>u.name)],rows=cards.flatMap(card=>(profileFor(card)?.weapons||[]).map((weapon,index)=>({card,weapon,index,key:`${norm(card)}:${index}`}))),longShotAvailable=rows.some(r=>weaponHasKeyword(r,'longue-distance')),ranges=engine.rangeOptions(rows.map(r=>({...r.weapon,rangeBonus:attackState.longShotAim&&weaponHasKeyword(r,'longue-distance')?1:0}))),mixed=attackType()==='mixed',cumbersome=selectedWeaponRows().some(row=>weaponHasKeyword(row,'encombrant')),immunities=defenderImmunities(),hasImmunity=immunities.immuneMelee||immunities.immuneRange1;return `${poolView()}<h2>1. Portée et réserve d’attaque</h2><p class="step-help">Indiquez la portée mesurée, puis choisissez uniquement les armes et figurines qui contribuent à cette réserve.</p>${longShotAvailable?`<label class="situation-check"><input id="longShotAim" type="checkbox" ${attackState.longShotAim?'checked':''}> Dépenser 1 pion Viser pour Longue Distance <small>Augmente de 1 uniquement la portée maximale des armes Longue Distance ; ce pion ne permet aucune relance.</small></label>`:''}${hasImmunity?`<div class="automation-card rule-highlight"><strong>IMMUNITÉ DU DÉFENSEUR APPLIQUÉE</strong><small>${immunities.immuneMelee?'Les armes de corps-à-corps sont interdites. ':''}${immunities.immuneRange1?'Les armes dont la portée maximale est 1 sont interdites.':''}</small></div>`:''}<div class="range-picker">${ranges.map(range=>`<button data-range="${range}" class="${String(attackState.range)===String(range)?'on':''}">${rangeChoiceLabel(range,rows)}</button>`).join('')}</div>${cumbersome?`<label class="situation-check"><input id="moved" type="checkbox" ${attackState.moved?'checked':''}> L’unité s’est déplacée pendant cette activation <small>Encombrant : les dés de cette arme seront automatiquement dégradés.</small></label>`:''}${mixed?'<div class="combat-warning" role="alert"><span aria-hidden="true">⚠</span><div><strong>RÉSERVE D’ATTAQUE INVALIDE</strong><p>Séparez les armes de corps-à-corps et les armes à distance.</p></div></div>':''}<div class="weapon-picker">${rows.map(r=>{const blocked=engine.weaponBlockedByImmunity(r.weapon,immunities),longShot=attackState.longShotAim&&weaponHasKeyword(r,'longue-distance'),inRange=engine.weaponEligible(r.weapon.range,attackState.range,longShot?1:0),eligible=inRange&&!blocked,on=!!attackState.selected[r.key]&&eligible,count=attackState.counts[r.key]??1,reason=blocked?' · interdite par l’immunité':inRange?longShot?' · Longue Distance active':'':' · hors portée';return `<article class="weapon-choice ${on?'on':''} ${eligible?'':'disabled'}"><button class="weapon-toggle" data-key="${r.key}" ${eligible?'':'disabled'}><span class="weapon-check">${on?'✓':''}</span><span class="weapon-copy"><b>${r.weapon.name}</b><small>${displayName(r.card)} · <em class="range-tag">portée ${rangeLabel(r.weapon.range)}</em>${reason}</small></span><span class="weapon-printed-dice">${weaponDiceView(r.weapon.dice)}</span></button><div class="count-control"><button data-minus="${r.key}" ${eligible?'':'disabled'}>−</button><label>Figurines <input data-count="${r.key}" type="number" min="1" max="20" value="${count}" ${eligible?'':'disabled'}></label><button data-plus="${r.key}" ${eligible?'':'disabled'}>+</button></div></article>`}).join('')}</div>${rulesPanel()}`}
function rollConversionPanel(p,converted,critical){return `<div class="automation-card rule-highlight roll-conversion-panel"><strong>FENÊTRE IMPRIMÉE : ${surgeResult('attack',p?.attackSurge)}</strong><small>${p?.source||'Source non vérifiée'}.</small><strong>Conversion de la carte : ${converted.printedToHit} en touche · ${converted.printedToCrit} en critique</strong>${critical?`<strong>CRITIQUE ${critical} : ${converted.criticalUsed} adrénaline(s) convertie(s) séparément en critique</strong>`:'<small>Aucun mot-clé Critique X actif dans cette réserve.</small>'}${converted.unusedSurge?`<strong>${converted.unusedSurge} adrénaline(s) non convertie(s) deviennent vierges</strong>`:''}</div>`}
function rollRerollPanel(capacity,precise,lethalX,lethal,converted){if(!lethalX)return'';return `<div class="automation-card roll-reroll-panel">${lethalX?`<strong>Létal ${lethalX} : Perforant total ${lethal.pierce}</strong><small>${lethal.lethalUsed} pion(s) Viser converti(s) en Perforant ; ils ne donnent aucune relance.</small>`:''}<strong>Résultat automatique : ${converted.hit} touches · ${converted.crit} critiques</strong></div>`}
function rollScreen(){const r=attackState.roll,p=effectiveAttackProfile(),precise=attackKeywordValue('precis-x'),capacity=engine.rerollCapacity(attackState.aims,precise),lethalX=attackKeywordValue('letal-x'),lethal=engine.applyLethal(attackKeywordValue('perforant-x'),lethalX,attackState.lethalAims),critical=attackKeywordValue('critique-x'),converted=engine.convertAttack(r,p?.attackSurge,critical),profileWarning=p?.verified?'':`<div class="strict-warning" role="alert">⚠ Profil d’adrénaline non vérifié pour cette carte : aucune conversion imprimée n’est appliquée.</div>`;return `${poolView()}${attackState.longShotAim?`<div class="automation-card rule-highlight"><strong>LONGUE DISTANCE : 1 PION VISER DÉJÀ DÉPENSÉ</strong><small>Ce pion a étendu la portée et ne donne aucune relance. Ne l’incluez pas dans le compteur ci-dessous.</small></div>`:''}${profileWarning}${inputWarning()}<div class="result-entry">${numberField('aims','Pions Viser dépensés pour relancer',attackState.aims,20)}${lethalX?numberField('lethalAims','Pions Viser dépensés pour Létal',attackState.lethalAims,lethalX):''}${numberField('rerolled','Dés effectivement relancés',attackState.rerolled,capacity)}${numberField('rollHit',`${diceIcon('hit')} Touches`,r.hit)}${numberField('rollCrit',`${diceIcon('crit')} Critiques`,r.crit)}${numberField('rollSurge',`${diceIcon('attackSurge')} Adrénalines`,r.surge)}${numberField('rollBlank','Vierges',r.blank)}</div>${liveResultStrip('APRÈS CONVERSION',converted)}${rollConversionPanel(p,converted,critical)}${rollRerollPanel(capacity,precise,lethalX,lethal,converted)}${rulesPanel()}`}
function attackResults(){const p=effectiveAttackProfile(),rules=allResolved(attacker),holdFast=attackState.engaged&&rules.some(x=>x.def.id==='tenir-bon'),jediHunter=attackState.targetForceUpgrade&&rules.some(x=>x.def.id==='chasseur-de-jedi'),missionCritical=attackState.priorityMissionAttack&&rules.some(x=>x.def.id==='accomplir-la-mission')?2:0,converted=engine.convertAttack(attackState.roll,holdFast||jediHunter?'hit':p?.attackSurge,Math.max(attackKeywordValue('critique-x'),missionCritical));return engine.applyRam(converted,attackKeywordValue('belier-x'),attackState.ramEligible)}
// Un mot-clé SANS valeur (Insensible, Profil bas, Blocage, Agile…) compte pour 1 : sans cela, keywordValue(...)>0 restait faux et l'effet n'était jamais appliqué.
// Mots-clés dont la valeur X est facultative sur la carte (Autonome : « Viser 1 ou Esquive 1 », Sustentation : « terrestre ») : la présence compte pour 1.
const VALUE_OPTIONAL_KEYWORDS=new Set(['autonome','sustentation']);
function keywordValue(entry,id){return allResolved(entry).filter(x=>x.def.id===id).reduce((n,x)=>n+(Number(x.tag.value)||(x.def.hasValue&&!VALUE_OPTIONAL_KEYWORDS.has(x.def.id)?0:1)),0)}
function attackKeywordValue(id){return activeAttackTags().filter(x=>x.def.id===id).reduce((n,x)=>n+(Number(x.tag.value)||(x.def.hasValue?0:1)),0)}
function armorContext(){const tag=allResolved(defender).find(x=>x.def.id==='armure-x');return {tag,hasArmor:!!tag,unlimited:!!tag&&tag.tag.value==null,value:Number(tag?.tag.value)||0}}
function shieldResults(){const a=afterCover();return engine.applyShields(a,{activeShields:attackState.activeShields,ionEligible:attackState.ionEligible,ionX:attackKeywordValue('ion-x'),ranged:attackType()==='ranged',shieldHit:attackState.shieldHit,shieldCrit:attackState.shieldCrit})}
function guardianCandidates(){return entries.filter(e=>e.army===defender.army&&e.id!==defender.id&&keywordValue(e,'gardien-x')>0)}
function guardianContext(){const candidate=guardianCandidates().find(e=>e.id===attackState.guardianId),guardianX=candidate?keywordValue(candidate,'gardien-x'):0,defenderHasGuardian=keywordValue(defender,'gardien-x')>0,eligible=!!candidate&&attackState.guardianEligible&&attackType()==='ranged'&&!defenderHasGuardian,p=combatProfiles[cardKey(candidate?.unit.name)],duelistBonus=allResolved(attacker).some(x=>x.def.id==='duelliste')?engine.duelistModifiers({melee:attackType()==='melee',aimSpent:attackState.aims}).pierceBonus:0,printedPierce=engine.applyLethal(attackKeywordValue('perforant-x')+duelistBonus,attackKeywordValue('letal-x'),attackState.lethalAims).pierce,impervious=keywordValue(defender,'insensible')>0,pierceTotal=engine.effectivePierce(printedPierce,impervious),pierceImmune=candidate?allResolved(candidate).some(x=>x.def.id==='immunite-perforant'):false,result=engine.applyGuardian(shieldResults(),attackState.guardianDefense,{eligible,guardianX,hitsCancelled:attackState.guardianHits,defenseSurge:p?.defenseSurge,pierceAvailable:pierceTotal,pierceImmune});return {candidate,guardianX,defenderHasGuardian,eligible,p,printedPierce,impervious,pierceTotal,pierceImmune,result}}
function effectiveImpactX(){return engine.weakPointImpact(attackKeywordValue('impact-x'),keywordValue(defender,'point-faible-x'),attackState.weakPointExposed===true)}
function modifiedResults(){const a=guardianContext().result,armor=armorContext(),impactX=effectiveImpactX(),primitive=activeAttackTags().some(x=>x.def.id==='primitif');if(attackState.impact==null)attackState.impact=armor.hasArmor?Math.min(a.hit,impactX):0;const impactUsed=Math.min(a.hit,attackState.impact||0),hitsAfterPrimitive=a.hit-impactUsed+(primitive&&armor.hasArmor?a.crit+impactUsed:0);if(attackState.armor==null)attackState.armor=armor.hasArmor?Math.min(hitsAfterPrimitive,armor.unlimited?hitsAfterPrimitive:armor.value):0;return engine.applyImpactArmor(a,{hasArmor:armor.hasArmor,impactX,impactUsed:attackState.impact,primitive,armorUnlimited:armor.unlimited,armorX:armor.value,armorCancelled:attackState.armor})}
function guardianPanel(){const candidates=guardianCandidates(),g=guardianContext(),base=shieldResults();if(!candidates.length)return '';if(g.defenderHasGuardian)return '<div class="guardian-panel blocked"><strong>GARDIEN INDISPONIBLE</strong><small>Une unité ne peut pas utiliser Gardien si le défenseur possède lui-même Gardien.</small></div>';return `<div class="guardian-panel"><strong>GARDIEN X — UNITÉ ALLIÉE INTERVENANTE</strong><div class="guardian-picker"><button type="button" data-guardian-id="" class="${!attackState.guardianId?'on':''}">Aucun</button>${candidates.map(e=>`<button type="button" data-guardian-id="${e.id}" class="${attackState.guardianId===e.id?'on':''}">${name(e)} · Gardien ${keywordValue(e,'gardien-x')}</button>`).join('')}</div>${g.candidate?`<label class="situation-check"><input id="guardianEligible" type="checkbox" ${attackState.guardianEligible?'checked':''}> Conditions vérifiées <small>Unité soldat alliée à portée 1 et en ligne de vue ; Gardien non neutralisé par la suppression.</small></label>${inputWarning()}<div class="result-entry">${numberField('guardianHits',`${diceIcon('hit')} transférées au Gardien`,attackState.guardianHits,Math.min(base.hit,g.guardianX))}${numberField('guardianBlock',`${diceIcon('block')} du Gardien`,attackState.guardianDefense.block,attackState.guardianHits)}${numberField('guardianSurge',`${diceIcon('defenseSurge')} du Gardien`,attackState.guardianDefense.surge,attackState.guardianHits)}${numberField('guardianBlank','Vierges du Gardien',attackState.guardianDefense.blank,attackState.guardianHits)}</div><div class="automation-card rule-highlight"><strong>${g.result.hitsCancelled} touche(s) transférée(s) au Gardien</strong><strong>PERFORANT AUTOMATIQUE : ${g.result.pierceUsed} blocage(s) du Gardien annulé(s)</strong><small>${g.pierceImmune?'Immunité : Perforant protège le Gardien.':'Perforant s’applique d’abord aux dés lancés pour Gardien ; le reliquat est conservé contre le défenseur.'}</small><small>Gardien : ${g.result.wounds} blessure(s) · Perforant restant : ${g.result.pierceRemaining}.</small></div>`:''}</div>`}
function modifierScreen(){const a=afterCover(),s=shieldResults(),g=guardianContext(),m=modifiedResults(),armor=armorContext(),impactX=effectiveImpactX(),primitive=activeAttackTags().some(x=>x.def.id==='primitif')&&armor.hasArmor,ionX=attackKeywordValue('ion-x'),shieldX=keywordValue(defender,'bouclier-x'),showShields=shieldX>0||ionX>0,shieldMax=Math.max(shieldX,attackState.activeShields);return `<div class="result-strip"><b>${diceIcon('hit','large')} ${a.hit}</b><b>${diceIcon('crit','large')} ${a.crit}</b></div><h2>4. Modifier les dés d’attaque</h2><p class="step-help">Après le couvert et les esquives, Ion retourne les boucliers obligatoires, puis Bouclier et Gardien annulent les résultats autorisés avant Impact et Armure.</p><div class="automation-card rule-highlight"><strong>Impact disponible : ${impactX}</strong><small>Défenseur : ${armor.hasArmor?(armor.unlimited?'Armure':'Armure '+armor.value):'sans Armure'}${attackState.weakPointExposed===true?` · Point faible +${keywordValue(defender,'point-faible-x')}`:''}</small>${primitive?`<strong>PRIMITIF : ${m.primitiveConverted} ${diceIcon('crit')} → ${diceIcon('hit')}</strong><small>Tous les critiques, y compris ceux créés par Impact, deviennent automatiquement des touches avant l’application d’Armure.</small>`:''}${showShields?`<strong>BOUCLIERS : ${s.ionFlipped} retourné(s) par Ion · ${s.shieldsSpent} dépensé(s)</strong><small>${s.shieldsRemaining} bouclier(s) actif(s) restant(s) après cette attaque.</small>`:''}</div>${ionX?`<label class="situation-check"><input id="ionEligible" type="checkbox" ${attackState.ionEligible?'checked':''}> La cible est un véhicule ou un soldat droïde</label>`:''}${showShields?`<div class="result-entry">${numberField('activeShields','Boucliers actifs actuellement',attackState.activeShields,shieldMax||20)}${numberField('shieldHit',`${diceIcon('hit')} annulées par Bouclier`,attackState.shieldHit,Math.min(a.hit,Math.max(0,attackState.activeShields-s.ionFlipped)))}${numberField('shieldCrit',`${diceIcon('crit')} annulés par Bouclier`,attackState.shieldCrit,Math.min(a.crit,Math.max(0,attackState.activeShields-s.ionFlipped-attackState.shieldHit)))}</div>`:''}${guardianPanel()}<div class="result-entry">${numberField('impact','Impact utilisé',attackState.impact,Math.min(g.result.hit,impactX))}${numberField('armor','Touches annulées par Armure',attackState.armor,g.result.hit+(primitive?g.result.crit:0))}</div>${liveResultStrip('APRÈS MODIFICATIONS',m)}${rulesPanel()}`}
function coverContext(){const blast=activeAttackTags().some(x=>x.def.id==='deflagration'),immuneBlast=allResolved(defender).some(x=>x.def.id==='immunite-deflagration'),sharpshooter=attackKeywordValue('tireur-delite-x'),highVelocity=selectedWeaponRows().length>0&&selectedWeaponRows().every(row=>weaponHasKeyword(row,'haute-velocite')),indifferent=allResolved(defender).some(x=>x.def.id==='indifferent'),deathFromAboveAvailable=activeAttackTags().some(x=>x.def.id==='la-mort-venue-du-ciel'),deathFromAbove=deathFromAboveAvailable&&attackState.deathFromAbove,ordinaryCover=engine.effectiveCover(attackState.cover,sharpshooter,blast,immuneBlast),melee=attackType()==='melee',effective=melee||indifferent||deathFromAbove?'none':ordinaryCover,profileLow=keywordValue(defender,'profil-bas')>0&&attackType()==='ranged'&&effective!=='none'&&attackResults().hit>0,
// Raison affichée dans « Couvert effectif » : pourquoi le couvert choisi n'agit pas (ou pas entièrement). Ordre = celui du moteur (voir applyCover/effectiveCover).
reason=melee?'Attaque au corps à corps : le couvert ne s’applique pas, même si un couvert est sélectionné.':attackState.cover==='none'?'Aucun couvert sélectionné : aucun dé de couvert à lancer.':indifferent?'Indifférent interdit à cette unité de bénéficier d’un couvert.':deathFromAbove?'La Mort venue du ciel ignore le couvert dans cette situation.':blast&&!immuneBlast?'Déflagration ignore le couvert.':sharpshooter?`Tireur d’élite ${sharpshooter} réduit le couvert de ${sharpshooter}.`:'Aucune réduction automatique.',
noHit=effective!=='none'&&attackResults().hit===0?' Aucune touche à annuler : le couvert n’agit que sur les touches, jamais sur les critiques.':'';return {blast,immuneBlast,sharpshooter,highVelocity,indifferent,deathFromAboveAvailable,deathFromAbove,effective,profileLow,melee,reason:reason+noHit}}
function afterCover(){const a=attackResults(),ctx=coverContext(),dodgeCritsAllowed=allResolved(defender).some(x=>x.def.id==='manoeuvre-improbable');return engine.applyCover(a,{melee:attackType()==='melee',cover:ctx.effective,coverBlock:attackState.coverBlock,coverSurge:attackState.coverSurge,automaticBlock:ctx.profileLow?1:0,dodges:ctx.highVelocity?0:attackState.dodges,dodgeCrits:ctx.highVelocity?0:attackState.dodgeCrits,dodgeCritsAllowed})}
function coverScreen(){const a=attackResults(),c=afterCover(),ctx=coverContext(),dodgeCritsAllowed=allResolved(defender).some(x=>x.def.id==='manoeuvre-improbable'),diceToRoll=Math.max(0,a.hit-(ctx.profileLow?1:0)),coverReason=ctx.reason,coverDice=ctx.effective==='none'?'<div class="no-cover-notice">Aucun dé de couvert à lancer : aucune touche ne peut être annulée par le couvert.</div>':`${ctx.profileLow?`<div class="automation-card rule-highlight"><strong>PROFIL BAS : ${diceIcon('block')} 1 AUTOMATIQUE</strong><small>Lancez ${diceToRoll} dé(s) de couvert au lieu de ${a.hit}. Un dé a été remplacé par ce blocage.</small></div>`:`<div class="automation-card"><strong>LANCEZ ${diceToRoll} DÉ(S) DE COUVERT</strong></div>`}${numberField('coverBlock',`${diceIcon('block')} obtenus sur les dés lancés`,attackState.coverBlock,diceToRoll)}${ctx.effective==='heavy'?numberField('coverSurge',`${diceIcon('defenseSurge')} obtenues sur les dés lancés`,attackState.coverSurge,diceToRoll):''}`;return `<div class="result-strip"><b>${diceIcon('hit','large')} ${a.hit}</b><b>${diceIcon('crit','large')} ${a.crit}</b></div><h2>3. Appliquer couvert et esquives</h2><p class="step-help">Sélectionnez le couvert observé sur la table. L’assistant applique les règles de couvert, puis les esquives avant toute modification ultérieure des dés d’attaque.</p>${ctx.deathFromAboveAvailable?`<label class="situation-check"><input id="deathFromAbove" type="checkbox" ${attackState.deathFromAbove?'checked':''}> Le chef attaquant est sur un terrain hors zone plus élevé que le chef défenseur</label>`:''}<div class="cover-options"><button data-cover="none" class="${attackState.cover==='none'?'on':''}">Aucun</button><button data-cover="light" class="${attackState.cover==='light'?'on':''}">Léger</button><button data-cover="heavy" class="${attackState.cover==='heavy'?'on':''}">Lourd</button></div><div class="automation-card rule-highlight cover-${ctx.effective}"><strong>COUVERT EFFECTIF : ${ctx.effective==='heavy'?'LOURD':ctx.effective==='light'?'LÉGER':'AUCUN'}</strong><small>${coverReason}</small>${ctx.highVelocity?'<strong>HAUTE VÉLOCITÉ : ESQUIVES INTERDITES</strong>':''}</div>${dodgeCritsAllowed&&!ctx.highVelocity?`<div class="automation-card rule-highlight"><strong>MANŒUVRE IMPROBABLE ACTIVE</strong><small>Les pions Esquive peuvent également annuler les critiques.</small></div>`:''}<div class="result-entry">${coverDice}${numberField('dodges','Esquives dépensées contre les touches',ctx.highVelocity?0:attackState.dodges,ctx.highVelocity?0:a.hit)}${dodgeCritsAllowed?numberField('dodgeCrits','Esquives dépensées contre les critiques',ctx.highVelocity?0:attackState.dodgeCrits,ctx.highVelocity?0:a.crit):''}</div>${liveResultStrip('APRÈS COUVERT ET ESQUIVES',c)}${rulesPanel()}`}
function defenseScreen(){const {a,d,p,lethal,guardian,pierceX,pierceImmune,dodgesUsed,blockActive,defenseSurge,result}=defenseResult(),covered=afterCover(),ranged=attackType()==='ranged',hadResult=attackResults().hit+attackResults().crit>0,suppressive=activeAttackTags().some(x=>x.def.id==='suppressif'),overwhelm=activeAttackTags().some(x=>x.def.id==='debordement'),overwhelmActive=overwhelm&&attackState.aims>0,suppression=engine.suppressionTokens({ranged,hadAttackResult:hadResult,suppressive,overwhelm,aimSpent:attackState.aims>0,vehicle:isVehicle(defender)}),ionX=attackKeywordValue('ion-x'),ion=result.wounds>0&&attackState.ionEligible?ionX:0,agile=keywordValue(defender,'agile')>0&&dodgesUsed>0,lucky=Math.max(engine.defenseRerollCapacity(keywordValue(defender,'coup-de-chance-x')),ranged&&allResolved(defender).some(x=>x.def.id==='maitrise-du-soresu')?a.hit+a.crit:0);return `<div class="result-strip"><b>À DÉFENDRE</b><b>${diceIcon('hit','large')} ${a.hit}</b><b>${diceIcon('crit','large')} ${a.crit}</b></div><h2>5. Défense et bilan</h2>${defensePoolView(a.hit+a.crit)}<p class="step-help">Lancez ${a.hit+a.crit} dé(s) de défense. La conversion et Perforant sont appliqués automatiquement, avec respect d’Immunité : Perforant.</p>${blockActive?`<div class="automation-card rule-highlight"><strong>BLOCAGE ACTIF</strong><small>${dodgesUsed} pion(s) Esquive effectivement dépensé(s) : ${diceIcon('defenseSurge')} devient ${diceIcon('block')} pour cette défense.</small></div>`:''}${guardian.impervious?`<div class="automation-card rule-highlight"><strong>INSENSIBLE : PERFORANT ${guardian.printedPierce} → ${guardian.pierceTotal}</strong><small>La valeur totale de Perforant de cette réserve est automatiquement réduite de 1, avant son utilisation contre Gardien puis contre le défenseur.</small></div>`:''}${lucky?`<div class="automation-card rule-highlight"><strong>RELANCE DE DÉFENSE : JUSQU’À ${lucky} DÉ(S)</strong><small>Saisissez ci-dessous le résultat final après l’unique relance simultanée autorisée.</small></div>`:''}${overwhelmActive?`<div class="automation-card rule-highlight"><strong>DÉBORDEMENT : +1 SUPPRESSION</strong><small>Un pion Viser a été dépensé pendant les relances ; cette suppression s’ajoute à la suppression normale et à Suppressif.</small></div>`:''}${inputWarning()}<div class="result-entry">${lucky?numberField('defenseRerolled','Dés de défense effectivement relancés',attackState.defenseRerolled,lucky):''}${numberField('defBlock',`${diceIcon('block')} Blocages`,d.block,a.hit+a.crit)}${numberField('defSurge',`${diceIcon('defenseSurge')} Adrénalines`,d.surge,a.hit+a.crit)}${numberField('defBlank','Vierges',d.blank,a.hit+a.crit)}</div>${liveDefenseStrip(result)}<div class="conversion-note">Conversion effective : ${surgeResult('defense',defenseSurge)}<small>${pierceImmune?'Immunité : Perforant active.':`Perforant disponible : ${pierceX}${lethal.lethalUsed?` (dont ${lethal.lethalUsed} obtenu par Létal)`:''}.`}</small></div><div class="automation-card rule-highlight"><strong>PERFORANT APPLIQUÉ AUTOMATIQUEMENT : ${result.pierceUsed}</strong><small>${pierceImmune?'Aucun blocage annulé grâce à Immunité : Perforant.':`${result.pierceUsed} blocage(s) obtenu(s) sont annulé(s). Ils ne protègent donc plus contre les résultats d’attaque et ${result.wounds} blessure(s) traversent la défense.`}</small></div><div class="resolution-log"><strong>JOURNAL DE RÉSOLUTION</strong><ol><li>Après conversion : ${attackResults().hit} touches · ${attackResults().crit} critiques</li><li>Couvert ${covered.coverCancelled}, Esquive ${covered.dodgesUsed} : ${covered.hit} touches · ${covered.crit} critiques</li><li>Impact ${modifiedResults().impactUsed}, Armure ${modifiedResults().armorCancelled} : ${a.hit} touches · ${a.crit} critiques</li><li>${result.converted} blocages obtenus ; Perforant annule automatiquement ${result.pierceUsed} blocage(s) : ${result.blocks} blocage(s) conservé(s)</li></ol></div><div class="total"><span>BLESSURES À APPLIQUER</span><strong data-live-total-wounds>${result.wounds}</strong><small>Suppression à attribuer : ${suppression}. Le défenseur vaincu n’en reçoit pas.</small>${ionX?`<small>Pions Ionique à attribuer : ${ion}${attackState.ionEligible?'':' (cible non confirmée véhicule/droïde)'}</small>`:''}</div>${rulesPanel()}`}
function showMixedWarning(){if(attackType()!=='mixed'||attackState.mixedWarningDismissed)return;const dialog=document.createElement('dialog');dialog.className='warning-dialog dialog-wipe';dialog.innerHTML='<div class="warning-icon" aria-hidden="true">⚠</div><strong>Réserve d’attaque invalide</strong><p>Une arme de corps-à-corps ne peut pas être ajoutée à la même réserve qu’une arme à distance.</p><button type="button">J’ai compris</button>';document.body.append(dialog);const dismiss=()=>{attackState.mixedWarningDismissed=true;dialog.close();dialog.remove()};dialog.oncancel=e=>e.preventDefault();dialog.querySelector('button').onclick=dismiss;dialog.onclose=()=>dialog.remove();dialog.showModal()}
function stepIssue(){
  if(attackStep===0){if(attackState.range==null)return 'Sélectionnez la portée mesurée.';if(!selectedWeaponRows().length)return 'Sélectionnez au moins une arme éligible.';if(attackType()==='mixed')return 'Séparez les armes de corps-à-corps et les armes à distance.'}
  if(attackStep===1){const p=pool(),rolled=Object.values(attackState.roll).reduce((n,v)=>n+(Number(v)||0),0),expected=p.rouge+p.noir+p.blanc;if(!p.variable&&rolled!==expected)return `Le jet saisi contient ${rolled} dés, mais la réserve en contient ${expected}.`;const max=engine.rerollCapacity(attackState.aims,attackKeywordValue('precis-x'));if(attackState.rerolled>max)return `Précis et les pions Viser autorisent au maximum ${max} relances.`}
  if(attackStep===3&&attackState.guardianEligible&&attackState.guardianHits>0){const rolled=Object.values(attackState.guardianDefense).reduce((n,v)=>n+(Number(v)||0),0);if(rolled!==attackState.guardianHits)return `Le Gardien doit saisir exactement ${attackState.guardianHits} résultat(s) de défense.`}
  // Dés de défense à lancer = touches + critiques APRÈS Impact et Armure (l'Armure annule des touches avant le jet) — même valeur que « À DÉFENDRE » à l'écran.
  if(attackStep===4){const a=modifiedResults(),rolled=Object.values(attackState.defense).reduce((n,v)=>n+(Number(v)||0),0),expected=a.hit+a.crit,lucky=engine.defenseRerollCapacity(keywordValue(defender,'coup-de-chance-x'));if(attackState.defenseRerolled>lucky)return `Coup de Chance ${lucky} autorise au maximum ${lucky} relance(s).`;if(rolled!==expected)return `Le jet de défense saisi contient ${rolled} dé(s), mais ${expected} doivent être lancés.`}
  return null
}
function preDefenseSummary(){return''}
function decorateWeaponVerification(){if(attackStep!==0)return;const cards=[attacker.unit.name,...(attacker.unit.upgrades||[]).map(upgrade=>upgrade.name)],rows=cards.flatMap(card=>(profileFor(card)?.weapons||[]).map((weapon,index)=>({weapon,key:`${norm(card)}:${index}`})));root.querySelectorAll('.weapon-toggle[data-key]').forEach(button=>{const row=rows.find(candidate=>candidate.key===button.dataset.key),copy=button.querySelector('.weapon-copy');if(!row||!copy)return;const badge=document.createElement('em');badge.className=`data-verification ${row.weapon.verifiedAgainstCard?'verified':'unverified'}`;badge.textContent=row.weapon.verifiedAgainstCard?'✓ Dés vérifiés sur la carte':'⚠ Couleur non encore certifiée';badge.title=row.weapon.verificationSource||'Ce profil doit encore être comparé visuellement à sa carte source.';copy.append(badge)})}
function decorateResolveScreen(){decorateWeaponVerification();root.querySelectorAll('[data-collapse-side]').forEach(button=>button.onclick=()=>{collapsedSides[button.dataset.collapseSide]=!collapsedSides[button.dataset.collapseSide];resolveScreen()});const target=root.querySelector('.resolve-center .result-entry');if(target&&(attackStep===1||attackStep===4)){const progress=document.createElement('div');progress.innerHTML=entryProgress(attackStep===1?'attack':'defense');target.before(progress.firstElementChild)}}
function compactStepContent(html){return html.replace(/<h2>\d+\.[\s\S]*?<\/h2>/,'').replace(/<p class="step-help">[\s\S]*?<\/p>/,'')}
// Le détail suppression/moral (démoralisée, risque de panique, dés à
// lancer) est affiché une seule fois, par moralePanel() ci-dessous (via
// rulesPanel), pour éviter deux blocs redondants sur le même écran.
function suppressionScreen(){const {result,deflexionEligible,deflexionWounds,shienActive}=defenseResult(),ranged=attackType()==='ranged',hadResult=attackResults().hit+attackResults().crit>0,suppressive=activeAttackTags().some(x=>x.def.id==='suppressif'),overwhelm=activeAttackTags().some(x=>x.def.id==='debordement'),shienDeniesSuppression=shienActive&&ranged&&result.wounds===0,suppression=shienDeniesSuppression?0:engine.suppressionTokens({ranged,hadAttackResult:hadResult,suppressive,overwhelm,aimSpent:attackState.aims>0,vehicle:isVehicle(defender)}),ionX=attackKeywordValue('ion-x'),ion=result.wounds>0&&attackState.ionEligible?ionX:0,immune=moraleImmune(defender);return `<div class="total wound-total"><span>BLESSURES À APPLIQUER</span><strong><i class="blood-drop" aria-hidden="true"></i><span data-live-total-wounds>${result.wounds}</span></strong><small>Suppression à attribuer : ${immune?0:suppression}${shienDeniesSuppression?' (Maîtrise du Shien : aucune blessure subie)':''}. Retirez vous-même les figurines et blessures à la table.</small>${ionX?`<small>Pions Ionique à attribuer : ${ion}${attackState.ionEligible?'':' (cible non confirmée véhicule/droïde)'}</small>`:''}</div>${rulesPanel()}`}
function resolveScreen(){stage=4+attackStep;const wipeStage=stageWipe;stageWipe=false;const wipeCenter=centerWipe;centerWipe=false;const bodies=[weaponScreen,rollScreen,coverScreen,modifierScreen,defenseScreen,suppressionScreen],issue=stepIssue();root.innerHTML=`<div class="${wipeStage?`page-wipe`:``}"><div class="duel"><strong>${entryName(attacker)}</strong><span>${attackSteps[attackStep]}</span><strong>${entryName(defender)}</strong></div><section class="attack-workspace">${combatAside(attacker,'attack')}<section class="resolve-center ${wipeCenter?`step-wipe`:``}"><div class="attack-stepper">${attackSteps.map((s,i)=>`<button data-go="${i}" class="${i===attackStep?'active':i<attackStep?'done':''}"><b>${i+1}</b><span>${s}</span></button>`).join('')}</div>${issue&&attackStep!==1&&attackStep!==4?`<div class="strict-warning" role="alert">⚠ ${issue}</div>`:''}${compactStepContent(bodies[attackStep]())}</section>${combatAside(defender,'defense')}</section><div class="actions"><button class="secondary" id="prev">${attackStep?'← Étape précédente':'← Revoir la cible'}</button><button class="primary" id="nextAttack">${attackStep===5?'Nouvelle attaque':'Étape suivante →'}</button></div></div>`;bindCardViewer();bindAttackInputs();decorateResolveScreen();if(attackStep===0)showMixedWarning();$('#prev').onclick=()=>{if(attackStep){attackStep--;centerWipe=true;resolveScreen()}else{attackState=null;attackStep=0;stage=3;stageWipe=true;pick('defender')}};$('#nextAttack').onclick=()=>{if(stepIssue()){resolveScreen();return}if(attackStep<5){attackStep++;centerWipe=true;resolveScreen()}else{attackState=null;attackStep=0;attacker=null;defender=null;stage=1;stageWipe=true;pick('attacker')}};root.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{if(+b.dataset.go<=attackStep||!stepIssue()){attackStep=+b.dataset.go;centerWipe=true;resolveScreen()}});progress()}
function bindAttackInputs(){root.querySelectorAll('[data-range]').forEach(b=>b.onclick=()=>{attackState.range=b.dataset.range==='melee'?'melee':+b.dataset.range;attackState.selected={};attackState.impact=null;attackState.armor=null;resolveScreen()});root.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{attackState.selected[b.dataset.key]=!attackState.selected[b.dataset.key];attackState.impact=null;attackState.armor=null;if(attackType()!=='mixed')attackState.mixedWarningDismissed=false;resolveScreen()});root.querySelectorAll('[data-count]').forEach(i=>i.oninput=()=>{attackState.counts[i.dataset.count]=Math.max(1,+i.value||1)});root.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>{const k=b.dataset.minus;attackState.counts[k]=Math.max(1,(attackState.counts[k]??1)-1);resolveScreen()});root.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>{const k=b.dataset.plus;attackState.counts[k]=(attackState.counts[k]??1)+1;resolveScreen()});root.querySelectorAll('[data-cover]').forEach(b=>b.onclick=()=>{attackState.cover=b.dataset.cover;resolveScreen()});['moved','longShotAim','ionEligible'].forEach(id=>{const el=$('#'+id);if(el)el.onchange=()=>{attackState[id]=el.checked;if(id==='longShotAim')attackState.selected={};resolveScreen()}});const map={rollHit:['roll','hit'],rollCrit:['roll','crit'],rollSurge:['roll','surge'],rollBlank:['roll','blank'],defBlock:['defense','block'],defSurge:['defense','surge'],defBlank:['defense','blank']};Object.entries(map).forEach(([id,[group,key]])=>{const el=$('#'+id);if(el){el.oninput=()=>{attackState[group][key]=+el.value||0};if(group==='defense')el.onchange=resolveScreen}});['aims','rerolled','coverBlock','coverSurge','dodges','impact','armor','pierce','activeShields'].forEach(id=>{const el=$('#'+id);if(el){el.oninput=()=>{attackState[id]=+el.value||0};if(id==='pierce'||id==='activeShields')el.onchange=resolveScreen}});root.querySelectorAll('[data-adjust]').forEach(button=>button.onclick=()=>{const input=$('#'+button.dataset.adjust),min=Number(input.min)||0,max=Number(input.max)||99,next=Math.max(min,Math.min(max,(Number(input.value)||0)+Number(button.dataset.delta)));input.value=next;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));if(document.body.contains(button)){const counter=button.closest('.touch-counter');counter.querySelector('[data-delta="-1"]').disabled=next<=min;counter.querySelector('[data-delta="1"]').disabled=next>=max}})}
const bindAttackInputsBase=bindAttackInputs;
bindAttackInputs=function(){bindAttackInputsBase();const lethal=$('#lethalAims');if(lethal){lethal.oninput=()=>{attackState.lethalAims=+lethal.value||0};lethal.onchange=resolveScreen}bindLiveCounters()}

/* Cartes de l'extension Officier/Agent rebelle : effets dépendant d'une
   amélioration équipée, conservés dans le référentiel généré. */
const stepIssueOfficerCardsBase=stepIssue;
stepIssue=function(){
  // Le Contrôle de Tir dépend de la portée : une fois la portée saisie, il passe avant le choix des armes.
  if(attackStep===0&&attackState.range!=null&&fireControlCandidates().length&&attackState.fireControlUsed===null)return 'Contrôle de Tir disponible : indiquez Oui ou Non avant de poursuivre.';
  return stepIssueOfficerCardsBase();
};
function decorateFireControl(){
  if(attackStep!==0)return;
  const candidates=fireControlCandidates();
  if(!candidates.length)return;
  const panel=document.createElement('section');
  panel.className=`fire-control-card conditional-card manual-focus ${attackState.fireControlUsed===null?'':'answered'}`;
  const sources=fireControlSources(),who=sources.map(item=>`<b>${entryName(item.entry)}</b>`).join(', '),cardName=displayName(sources[0]?.card||'Fire Control');panel.innerHTML=`<strong>CONTRÔLE DE TIR DISPONIBLE</strong><p class="fc-source">Fourni par ${who} · carte ${cardName}${sources.length>1?' (une seule de ces unités suffit)':''}</p><ul class="fc-conditions"><li>${sources.length>1?'L’une de ces unités':who} est à <b>portée 1</b> de <b>${entryName(attacker)}</b> (l’unité qui attaque)</li><li>${sources.length>1?'Cette même unité':who} a <b>également</b> la <b>cible en ligne de vue</b></li></ul><p class="fc-effect">Si les deux conditions sont remplies : <b>2 dés d’attaque améliorés</b> automatiquement.</p><div class="yes-no"><button type="button" data-fire-control="true" class="${attackState.fireControlUsed===true?'on':''}">OUI · conditions remplies</button><button type="button" data-fire-control="false" class="${attackState.fireControlUsed===false?'on':''}">NON</button></div>`;
  const picker=root.querySelector('.weapon-picker');
  picker?.before(panel);
  if(attackState.fireControlUsed===true)root.querySelector('.dice-pool')?.insertAdjacentHTML('afterend',`<p class="pool-note">↑ Contrôle de Tir (${who}) : 2 dés d’attaque améliorés automatiquement.</p>`);
  panel.querySelectorAll('[data-fire-control]').forEach(button=>button.onclick=()=>{attackState.fireControlUsed=button.dataset.fireControl==='true';resolveScreen()});
}
// Arsenal X : information (bleu), pas une saisie -- rappelle qu'une figurine peut employer plusieurs armes.
function decorateArsenal(){
  if(attackStep!==0||!attacker)return;
  const arsenal=keywordValue(attacker,'arsenal-x');
  if(!arsenal)return;
  const panel=document.createElement('section');
  panel.className='arsenal-card info-card';
  panel.innerHTML=`<strong>ARSENAL ${arsenal} · PLUSIEURS ARMES</strong><p class="ar-source">Mot-clé de <b>${entryName(attacker)}</b></p><ul class="ar-rules"><li>Chaque figurine peut employer <b>jusqu’à ${arsenal} armes</b> pendant cette attaque</li><li>Sélectionnez ci-dessous <b>${arsenal>1?'jusqu’à '+arsenal+' armes':'l’arme'}</b> pour chaque figurine</li><li>Chaque arme ne rejoint qu’<b>une seule</b> réserve d’attaque</li></ul>`;
  root.querySelector('.weapon-picker')?.before(panel);
}
const decorateResolveOfficerCardsBase=decorateResolveScreen;
decorateResolveScreen=function(){decorateResolveOfficerCardsBase();decorateFireControl();decorateArsenal();decorateDistracted()};
const bindShieldInputsBase=bindAttackInputs;
bindAttackInputs=function(){bindShieldInputsBase();['activeShields','shieldHit','shieldCrit'].forEach(id=>{const input=$('#'+id);if(input){input.oninput=()=>{attackState[id]=+input.value||0;attackState.impact=null;attackState.armor=null};input.onchange=resolveScreen}})}
const bindLuckyInputsBase=bindAttackInputs;
bindAttackInputs=function(){bindLuckyInputsBase();const input=$('#defenseRerolled');if(input)input.oninput=()=>{attackState.defenseRerolled=+input.value||0;updateInputWarning()}}
const bindGuardianInputsBase=bindAttackInputs;
bindAttackInputs=function(){bindGuardianInputsBase();root.querySelectorAll('[data-guardian-id]').forEach(button=>button.onclick=()=>{attackState.guardianId=button.dataset.guardianId;attackState.guardianEligible=false;attackState.guardianHits=0;attackState.guardianDefense={block:0,surge:0,blank:0};attackState.impact=null;attackState.armor=null;resolveScreen()});const eligible=$('#guardianEligible');if(eligible)eligible.onchange=()=>{attackState.guardianEligible=eligible.checked;attackState.impact=null;attackState.armor=null;resolveScreen()};const simple={guardianHits:'guardianHits'},defense={guardianBlock:'block',guardianSurge:'surge',guardianBlank:'blank'};Object.entries(simple).forEach(([id,key])=>{const input=$('#'+id);if(input){input.oninput=()=>{attackState[key]=+input.value||0;attackState.impact=null;attackState.armor=null};input.onchange=resolveScreen}});Object.entries(defense).forEach(([id,key])=>{const input=$('#'+id);if(input){input.oninput=()=>{attackState.guardianDefense[key]=+input.value||0};input.onchange=resolveScreen}});if([1,3,4].includes(attackStep)){const warning=root.querySelector('.resolve-center > .strict-warning');if(warning)warning.remove()}}
function statusEffectsPanel(result){const immobilizeX=attackKeywordValue('immobiliser-x'),poisonX=attackKeywordValue('poison-x'),towCable=activeAttackTags().some(x=>x.def.id==='cable-de-remorquage'),scatter=activeAttackTags().some(x=>x.def.id==='dispersion');if(!immobilizeX&&!poisonX&&!towCable&&!scatter)return'';const effects=engine.resolveStatusEffects({wounds:result.wounds,immobilizeX,poisonX,towCable,scatter,targetVehicle:attackState.targetVehicle,targetNonDroidTrooper:attackState.targetNonDroidTrooper,targetSmallTrooper:attackState.targetSmallTrooper});return `<div class="automation-card rule-highlight"><strong>EFFETS DE FIN D’ATTAQUE</strong>${towCable?`<label class="situation-check"><input id="targetVehicle" type="checkbox" ${attackState.targetVehicle?'checked':''}> La cible est un véhicule</label>`:''}${poisonX?`<label class="situation-check"><input id="targetNonDroidTrooper" type="checkbox" ${attackState.targetNonDroidTrooper?'checked':''}> La cible est un soldat non-droïde</label>`:''}${scatter?`<label class="situation-check"><input id="targetSmallTrooper" type="checkbox" ${attackState.targetSmallTrooper?'checked':''}> La cible est une unité de soldats à petits socles</label>`:''}<strong>Immobilisation : ${effects.immobilize} pion(s)</strong><strong>Poison : ${effects.poison} pion(s)</strong>${effects.towCablePivot?'<strong>CÂBLE DE REMORQUAGE : effectuez aussi un pivot avec le véhicule.</strong>':''}${effects.scatter?'<strong>DISPERSION : vous pouvez replacer les figurines non-chef en cohésion.</strong>':''}<small>Les effets exigeant une blessure restent à zéro si aucune blessure n’a traversé la défense.</small></div>`}
const rulesPanelBase=rulesPanel;
rulesPanel=function(){return `${attackStep===5?statusEffectsPanel(defenseResult().result):''}${rulesPanelBase()}`}
const bindStatusInputsBase=bindAttackInputs;
bindAttackInputs=function(){bindStatusInputsBase();const dodgeCrits=$('#dodgeCrits');if(dodgeCrits)dodgeCrits.oninput=()=>{attackState.dodgeCrits=+dodgeCrits.value||0;updateLiveCounters()};['targetVehicle','targetNonDroidTrooper','targetSmallTrooper'].forEach(id=>{const input=$('#'+id);if(input)input.onchange=()=>{attackState[id]=input.checked;resolveScreen()}})}
// Maîtrise de l'Ataru / Matamore / Maîtrise du Djem So (17/09/2026) :
// l'encart dédié en fin d'attaque est retiré, ces effets sont maintenant
// couverts par le pop-up attackConclusionPopupContent() ci-dessus, qui
// évite d'afficher deux fois la même information sans case à corriger.
const bindConditionalInputsBase=bindAttackInputs;
bindAttackInputs=function(){bindConditionalInputsBase();const deathFromAbove=$('#deathFromAbove');if(deathFromAbove)deathFromAbove.onchange=()=>{attackState.deathFromAbove=deathFromAbove.checked;resolveScreen()}}
function poolModifierPanel(){const flame=selectedWeaponRows().some(row=>weaponHasKeyword(row,'souffle')),ramX=attackKeywordValue('belier-x'),attackerRules=allResolved(attacker),defenderRules=allResolved(defender),holdFastAttacker=attackerRules.some(x=>x.def.id==='tenir-bon'),holdFastDefender=defenderRules.some(x=>x.def.id==='tenir-bon'),missionAttack=attackerRules.some(x=>x.def.id==='accomplir-la-mission'),missionDefense=defenderRules.some(x=>x.def.id==='accomplir-la-mission'),jediHunter=attackerRules.some(x=>x.def.id==='chasseur-de-jedi');if(attackStep===0&&flame)return `<div class="automation-card rule-highlight"><strong>SOUFFLE</strong>${numberField('visibleTargetModels','Figurines du défenseur en ligne de vue',attackState.visibleTargetModels,30)}<small>Les dés de chaque arme Souffle sont multipliés automatiquement par ce nombre.</small></div>`;if(attackStep===1&&(ramX||holdFastAttacker||missionAttack||jediHunter))return `<div class="automation-card rule-highlight"><strong>MODIFICATEURS CONDITIONNELS</strong>${ramX?`<label class="situation-check"><input id="ramEligible" type="checkbox" ${attackState.ramEligible?'checked':''}> Condition de Bélier ${ramX} remplie <small>Déplacement requis effectué pendant cette activation ; jusqu’à ${ramX} résultats deviennent des critiques.</small></label>`:''}${holdFastAttacker?`<label class="situation-check"><input id="engaged" type="checkbox" ${attackState.engaged?'checked':''}> L’unité est engagée <small>Tenir Bon convertit ses adrénalines d’attaque en touches.</small></label>`:''}${jediHunter?`<label class="situation-check"><input id="targetForceUpgrade" type="checkbox" ${attackState.targetForceUpgrade?'checked':''}> La barre d’amélioration du défenseur affiche Force <small>Chasseur de Jedi convertit les adrénalines d’attaque en touches.</small></label>`:''}${missionAttack?`<label class="situation-check"><input id="priorityMissionAttack" type="checkbox" ${attackState.priorityMissionAttack?'checked':''}> La cible est à portée 1 d’un pion Mission prioritaire allié <small>La réserve gagne automatiquement Critique 2.</small></label>`:''}</div>`;if(attackStep===4&&(holdFastDefender||missionDefense))return `<div class="automation-card rule-highlight"><strong>CONVERSIONS CONDITIONNELLES</strong>${holdFastDefender?`<label class="situation-check"><input id="engaged" type="checkbox" ${attackState.engaged?'checked':''}> Le défenseur est engagé <small>Tenir Bon convertit ses adrénalines de défense en blocages.</small></label>`:''}${missionDefense?`<label class="situation-check"><input id="priorityMissionDefense" type="checkbox" ${attackState.priorityMissionDefense?'checked':''}> Le défenseur est à portée 1 d’un pion Mission prioritaire allié <small>Ses adrénalines de défense deviennent des blocages.</small></label>`:''}</div>`;return''}
const rulesPanelPoolModifierBase=rulesPanel;
rulesPanel=function(){return `${poolModifierPanel()}${rulesPanelPoolModifierBase()}`}
const bindPoolModifierBase=bindAttackInputs;
bindAttackInputs=function(){bindPoolModifierBase();['ramEligible','engaged','targetForceUpgrade','priorityMissionAttack','priorityMissionDefense'].forEach(id=>{const input=$('#'+id);if(input)input.onchange=()=>{attackState[id]=input.checked;resolveScreen()}});const visible=$('#visibleTargetModels');if(visible){visible.oninput=()=>{attackState.visibleTargetModels=Math.max(1,+visible.value||1);updateLiveCounters()};visible.onchange=resolveScreen}}
function legalityPanel(){if(attackStep!==0)return'';const rows=selectedWeaponRows(),fixed=rows.some(row=>weaponHasKeyword(row,'fixe')),area=rows.some(row=>weaponHasKeyword(row,'arme-a-effet-de-zone')),vaapad=allResolved(attacker).some(x=>x.def.id==='maitrise-du-vaapad'),small=allResolved(defender).some(x=>x.def.id==='petit');if(!fixed&&!area&&!vaapad&&!small)return'';return `<div class="automation-card rule-highlight"><strong>CONTRÔLES DE LÉGALITÉ</strong>${vaapad?`${numberField('attackerWounds','Pions Blessure de l’attaquant (Vaapad)',attackState.attackerWounds,99)}<small>La réserve reçoit automatiquement jusqu’à 3 dés blancs supplémentaires.</small>`:''}${fixed?`<label class="situation-check mandatory-check"><input id="fixedArcConfirmed" type="checkbox" ${attackState.fixedArcConfirmed?'checked':''}> Une figurine du défenseur est dans l’arc de tir indiqué <small>Obligatoire pour utiliser cette arme Fixe.</small></label>`:''}${area?'<strong>ARME À EFFET DE ZONE : cette arme doit rester seule dans la réserve et chaque unité éligible reçoit une attaque distincte.</strong>':''}${small?`<label class="situation-check"><input id="smallOnlyVisible" type="checkbox" ${attackState.smallOnlyVisible?'checked':''}> La seule figurine visible est l’Alter Ego Petit <small>Dans ce cas, cette unité ne peut pas être ciblée.</small></label>`:''}</div>`}
const rulesPanelLegalityBase=rulesPanel;
rulesPanel=function(){return `${legalityPanel()}${rulesPanelLegalityBase()}`}
const stepIssueLegalityBase=stepIssue;
stepIssue=function(){const base=stepIssueLegalityBase();if(base)return base;if(attackStep===0){const rows=selectedWeaponRows();if(rows.some(row=>weaponHasKeyword(row,'arme-a-effet-de-zone'))&&rows.length!==1)return 'Une arme à effet de zone doit être la seule arme de la réserve.';if(rows.some(row=>weaponHasKeyword(row,'fixe'))&&!attackState.fixedArcConfirmed)return 'Confirmez que le défenseur se trouve dans l’arc de tir de l’arme Fixe.';if(allResolved(defender).some(x=>x.def.id==='petit')&&attackState.smallOnlyVisible)return 'Cible interdite : la seule figurine visible est l’Alter Ego doté de Petit.';}return''}
const bindLegalityBase=bindAttackInputs;
bindAttackInputs=function(){bindLegalityBase();['fixedArcConfirmed','smallOnlyVisible'].forEach(id=>{const input=$('#'+id);if(input)input.onchange=()=>{attackState[id]=input.checked;resolveScreen()}});const wounds=$('#attackerWounds');if(wounds){wounds.oninput=()=>{attackState.attackerWounds=Math.max(0,+wounds.value||0)};wounds.onchange=resolveScreen}}
function moralePanel(){if(attackStep!==5)return'';const ranged=attackType()==='ranged',hadResult=attackResults().hit+attackResults().crit>0,suppressive=activeAttackTags().some(x=>x.def.id==='suppressif'),overwhelm=activeAttackTags().some(x=>x.def.id==='debordement'),vehicle=isVehicle(defender),gained=engine.suppressionTokens({ranged,hadAttackResult:hadResult,suppressive,overwhelm,aimSpent:attackState.aims>0,vehicle}),morale=engine.moraleState({currentSuppression:attackState.currentSuppression,gainedSuppression:gained,courage:attackState.defenderCourage,commanderCourage:attackState.commanderCourage,nullCourage:attackState.nullCourage,vehicle});if(vehicle)return `<section class="morale-panel automatic"><strong>SUPPRESSION ET MORAL</strong><b>VÉHICULE : AUCUNE SUPPRESSION</b><small>Les véhicules ne subissent pas la suppression. Aucun contrôle de moral ou de panique n’est requis.</small></section>`;return `<section class="morale-panel ${morale.panicRisk?'danger':morale.suppressed?'conditional':'automatic'}"><strong>SUPPRESSION ET MORAL APRÈS L’ATTAQUE</strong><div class="result-entry">${numberField('currentSuppression','Suppression avant cette attaque',attackState.currentSuppression,30)}${numberField('defenderCourage','Courage de la troupe',attackState.defenderCourage,10)}${numberField('commanderCourage','Courage d’un Commandant allié à portée 3',attackState.commanderCourage,10)}</div><label class="situation-check"><input id="nullCourage" type="checkbox" ${attackState.nullCourage?'checked':''}> Courage « — » <small>L’unité ne peut pas recevoir de pions Suppression et ne peut être ni démoralisée ni paniquée.</small></label><div class="morale-result"><span>Avant<b>${morale.current}</b></span><span>Gagnée<b>+${morale.gained}</b></span><span>Total<b>${morale.total}</b></span><span>Courage utilisé<b>${morale.courage??'—'}</b></span></div><b>${morale.panicRisk?'RISQUE DE PANIQUE À LA PROCHAINE ÉTAPE « SE RALLIER »':morale.suppressed?'UNITÉ DÉMORALISÉE : 1 ACTION EN MOINS':'MORAL STABLE'}</b><small>${morale.panicRisk?`Après son jet de ralliement, si elle possède encore au moins ${morale.panicThreshold} pions Suppression, elle sera paniquée. La panique n’est pas appliquée immédiatement à la fin de cette attaque.`:morale.suppressed?'Cet état est déterminé par le nombre actuel de pions Suppression. La panique sera vérifiée après le ralliement.':'Aucun seuil de moral atteint.'}</small></section>`}
const rulesPanelMoraleBase=rulesPanel;
rulesPanel=function(){return `${moralePanel()}${rulesPanelMoraleBase()}`}
const bindMoraleInputsBase=bindAttackInputs;
bindAttackInputs=function(){bindMoraleInputsBase();['currentSuppression','defenderCourage','commanderCourage'].forEach(id=>{const input=$('#'+id);if(input){input.oninput=()=>{attackState[id]=Math.max(0,+input.value||0)};input.onchange=resolveScreen}});const nullCourage=$('#nullCourage');if(nullCourage)nullCourage.onchange=()=>{attackState.nullCourage=nullCourage.checked;resolveScreen()}}
function saveAttackHistory(){if(!attacker||!defender||!attackState)return;const result=defenseResult().result,covered=afterCover(),weapons=selectedWeaponRows().map(row=>row.weapon.name),ranged=attackType()==='ranged',hadResult=attackResults().hit+attackResults().crit>0,suppressive=activeAttackTags().some(x=>x.def.id==='suppressif'),overwhelm=activeAttackTags().some(x=>x.def.id==='debordement'),gained=engine.suppressionTokens({ranged,hadAttackResult:hadResult,suppressive,overwhelm,aimSpent:attackState.aims>0,vehicle:isVehicle(defender)}),morale=engine.moraleState({currentSuppression:attackState.currentSuppression,gainedSuppression:gained,courage:attackState.defenderCourage,commanderCourage:attackState.commanderCourage,nullCourage:attackState.nullCourage,vehicle:isVehicle(defender)}),effects=engine.resolveStatusEffects({wounds:result.wounds,immobilizeX:attackKeywordValue('immobiliser-x'),poisonX:attackKeywordValue('poison-x'),targetVehicle:attackState.targetVehicle,targetNonDroidTrooper:attackState.targetNonDroidTrooper});const previous=stateFor(defender);unitStates[defender.id]={...previous,suppression:morale.total,ion:previous.ion+(result.wounds>0&&attackState.ionEligible?attackKeywordValue('ion-x'):0),immobilize:previous.immobilize+(effects.immobilize||0),poison:previous.poison+(effects.poison||0),shield:shieldResults().shieldsRemaining};persistUnitStates();attackHistory.unshift({id:`${Date.now()}-${attacker.id}-${defender.id}`,at:new Date().toISOString(),attacker:name(attacker),defender:name(defender),weapons,wounds:result.wounds,blocks:result.blocks,finalHit:modifiedResults().hit,finalCrit:modifiedResults().crit,coverCancelled:covered.coverCancelled,dodgesUsed:covered.dodgesUsed});attackHistory=attackHistory.slice(0,50);localStorage.setItem(historyKey,JSON.stringify(attackHistory))}
function showAttackHistory(){stage=1;root.innerHTML=`<section class="attack-history"><header><div><span class="kicker">JOURNAL DE PARTIE</span><h1>Historique des attaques</h1><p>Les 50 dernières résolutions sont synchronisées entre appareils lorsque la synchronisation GitHub est active.</p></div><button class="secondary" id="closeHistory">Retour aux unités</button></header><div class="attack-history-list">${attackHistory.length?attackHistory.map(entry=>`<article class="history-entry"><div><small>${new Date(entry.at).toLocaleString('fr-FR')}${entry.origin?` · ${entry.origin}`:''}</small><h3>${entry.attacker} → ${entry.defender}</h3><p>${entry.event||entry.weapons.join(' · ')||'Arme non renseignée'}</p><p>Avant défense : ${diceIcon('hit')} ${entry.finalHit} · ${diceIcon('crit')} ${entry.finalCrit} · Couvert ${entry.coverCancelled} · Esquives ${entry.dodgesUsed}</p></div><div class="history-score">${entry.wounds} blessure(s)<small>${entry.blocks} blocage(s)</small></div></article>`).join(''):'<p class="notice">Aucune attaque enregistrée. Une résolution terminée apparaîtra automatiquement ici.</p>'}</div></section>`;$('#closeHistory').onclick=()=>pick('attacker');progress()}
const resolveScreenHistoryBase=resolveScreen;
resolveScreen=function(){resolveScreenHistoryBase();const next=$('#nextAttack');if(next&&attackStep===5)next.addEventListener('click',()=>{if(!stepIssue())saveAttackHistory()},{capture:true,once:true})}
function placeBlockingWarning(){const center=root.querySelector('.resolve-center'),issue=stepIssue();if(!center)return;center.querySelectorAll(':scope > .strict-warning').forEach(warning=>warning.remove());let warning=center.querySelector('.input-warning');const entries=[...center.querySelectorAll('.result-entry')],target=attackStep===0?center.querySelector('.weapon-picker'):attackStep===3?(center.querySelector('.guardian-panel .result-entry')||entries.at(-1)):entries.at(-1);if(!issue){if(warning)warning.hidden=true;return}if(!warning){warning=document.createElement('div');warning.className='strict-warning input-warning';warning.setAttribute('role','alert');warning.innerHTML='⚠ <span></span>'}warning.hidden=false;warning.querySelector('span').textContent=issue;if(target)target.before(warning);else center.append(warning)}
const resolveScreenWarningBase=resolveScreen;
resolveScreen=function(){resolveScreenWarningBase();placeBlockingWarning()}
$('#history').onclick=showAttackHistory;
function applyQuickMode(){document.body.classList.toggle('quick-mode',quickMode);const button=$('#quickMode');if(button){button.setAttribute('aria-pressed',String(quickMode));button.textContent=quickMode?'Mode rapide':'Mode détaillé'}}
$('#quickMode').onclick=()=>{quickMode=!quickMode;localStorage.setItem('swl.assistant.quick-mode.v1',JSON.stringify(quickMode));applyQuickMode();if(attackState)resolveScreen()};applyQuickMode();
function factionThemeForArmy(armyId){const army=armies.find(candidate=>candidate.id===armyId),identity=norm(`${army?.list?.faction||''} ${army?.list?.listName||''} ${(army?.list?.units||[]).map(unit=>unit.name).join(' ')}`);return /empire|imperial|stormtrooper|snowtrooper|dark vader|at st/.test(identity)?'imperial':'rebel'}
function applyFactionTheme(theme){document.body.dataset.factionTheme=theme;document.documentElement.style.colorScheme='dark';const color=theme==='imperial'?'#c8232c':'#ff8c1a';document.querySelector('meta[name="theme-color"]')?.setAttribute('content',color)}
const weaponScreenCumbersomeBase=weaponScreen;
weaponScreen=function(){return weaponScreenCumbersomeBase().replace(`<label class="situation-check"><input id="moved" type="checkbox" ${attackState.moved?'checked':''}> L’unité s’est déplacée pendant cette activation <small>Encombrant : les dés de cette arme seront automatiquement dégradés.</small></label>`,`<div class="cumbersome-checks"><label class="situation-check"><input id="moved" type="checkbox" ${attackState.moved?'checked':''}> L’unité s’est déplacée pendant cette activation <small>Si oui, les dés de cette arme Encombrant sont automatiquement dégradés.</small></label><label class="situation-check mandatory-check"><input id="cumbersomeConfirmed" type="checkbox" ${attackState.cumbersomeConfirmed?'checked':''}> J’ai vérifié la règle Encombrant <small>Confirmation obligatoire pour continuer, avec ou sans déplacement.</small></label></div>`)};
const bindCumbersomeConfirmationBase=bindAttackInputs;
bindAttackInputs=function(){bindCumbersomeConfirmationBase();root.querySelectorAll('[data-key]').forEach(button=>button.addEventListener('click',()=>{attackState.cumbersomeConfirmed=false},{capture:true}));const confirmation=$('#cumbersomeConfirmed');if(confirmation)confirmation.onchange=()=>{attackState.cumbersomeConfirmed=confirmation.checked;resolveScreen()}};
const stepIssueCumbersomeBase=stepIssue;
stepIssue=function(){const base=stepIssueCumbersomeBase();if(base)return base;if(attackStep===0&&selectedWeaponRows().some(row=>weaponHasKeyword(row,'encombrant'))&&!attackState.cumbersomeConfirmed)return 'Confirmez que la règle Encombrant a été vérifiée avant de poursuivre.';return null};
const decorateResolveCompactBase=decorateResolveScreen;
decorateResolveScreen=function(){decorateResolveCompactBase();root.querySelector(':scope > .duel')?.remove()};
const numberFieldSingleIconBase=numberField;
numberField=function(id,label,value,max='99'){const cleanLabel=resultMarker(id)?String(label).replace(/<[^>]*>/g,'').trim():label;return numberFieldSingleIconBase(id,cleanLabel,value,max)};
const rollConversionTitleBase=rollConversionPanel;
rollConversionPanel=function(p,converted,critical){return rollConversionTitleBase(p,converted,critical).replace('FENÊTRE IMPRIMÉE :','CONVERSION ADRÉNALINE')};
const defenseScreenCompactBase=defenseScreen;
defenseScreen=function(){let html=defenseScreenCompactBase();html=html.replace(/<div class="total">[\s\S]*?<\/div>/,'');if(defenseResult().pierceX<=0)html=html.replace(/<div class="automation-card rule-highlight"><strong>PERFORANT APPLIQUÉ AUTOMATIQUEMENT[\s\S]*?<\/div>/,'');return html};
const placeBlockingWarningCompactBase=placeBlockingWarning;
placeBlockingWarning=function(){const issue=stepIssue();if(issue&&/^Le jet (saisi|de défense saisi) contient/.test(issue)){const warning=root.querySelector('.resolve-center .input-warning');if(warning)warning.remove();return}placeBlockingWarningCompactBase()};
function conditionalChoice(id,title,help){const value=attackState[id];return `<div class="conditional-question"><div><strong>${title}</strong><small>${help}</small></div><div class="yes-no" role="group" aria-label="${title}"><button type="button" data-condition="${id}" data-value="true" class="${value===true?'on':''}">OUI</button><button type="button" data-condition="${id}" data-value="false" class="${value===false?'on':''}">NON</button></div></div>`}
poolModifierPanel=function(){const flame=selectedWeaponRows().some(row=>weaponHasKeyword(row,'souffle')),ramX=attackKeywordValue('belier-x'),attackerRules=allResolved(attacker),defenderRules=allResolved(defender),holdFastAttacker=attackerRules.some(x=>x.def.id==='tenir-bon'),holdFastDefender=defenderRules.some(x=>x.def.id==='tenir-bon'),missionAttack=attackerRules.some(x=>x.def.id==='accomplir-la-mission'),missionDefense=defenderRules.some(x=>x.def.id==='accomplir-la-mission'),jediHunter=attackerRules.some(x=>x.def.id==='chasseur-de-jedi');if(attackStep===0&&flame)return `<div class="automation-card rule-highlight"><strong>SOUFFLE</strong>${numberField('visibleTargetModels','Figurines du défenseur en ligne de vue',attackState.visibleTargetModels,30)}<small>Les dés de chaque arme Souffle sont multipliés automatiquement par ce nombre.</small></div>`;if(attackStep===1&&(ramX||holdFastAttacker||missionAttack||jediHunter))return `<div class="automation-card rule-highlight conditional-modifiers"><strong>MODIFICATEURS CONDITIONNELS</strong>${ramX?conditionalChoice('ramEligible',`Condition de Bélier ${ramX} remplie`,`Déplacement requis effectué pendant cette activation ; jusqu’à ${ramX} résultats deviennent des critiques.`):''}${holdFastAttacker?conditionalChoice('engaged',`L’unité est engagée`,`Tenir Bon convertit ses adrénalines d’attaque en touches.`):''}${jediHunter?conditionalChoice('targetForceUpgrade',`Le défenseur possède une amélioration Force`,`Chasseur de Jedi convertit les adrénalines d’attaque en touches.`):''}${missionAttack?conditionalChoice('priorityMissionAttack',`La cible est à portée 1 d’un pion Mission prioritaire allié`,`La réserve gagne automatiquement Critique 2.`):''}</div>`;if(attackStep===4&&(holdFastDefender||missionDefense))return `<div class="automation-card rule-highlight conditional-modifiers"><strong>CONVERSIONS CONDITIONNELLES</strong>${holdFastDefender?conditionalChoice('engaged',`Le défenseur est engagé`,`Tenir Bon convertit ses adrénalines de défense en blocages.`):''}${missionDefense?conditionalChoice('priorityMissionDefense',`Le défenseur est à portée 1 d’un pion Mission prioritaire allié`,`Ses adrénalines de défense deviennent des blocages.`):''}</div>`;return''};
function tenacityEligible(){return attackStep===0&&attackState.range==='melee'&&hasCard(attacker,'tenacity')&&selectedWeaponRows().length>0}
function makashiEligible(){return attackStep===0&&attackType()==='melee'&&allResolved(attacker).some(x=>x.def.id==='maitrise-du-makashi')&&attackKeywordValue('perforant-x')>0}
const poolModifierPanelTenacityBase=poolModifierPanel;
poolModifierPanel=function(){const base=poolModifierPanelTenacityBase();if(!tenacityEligible())return base;return `${base}<div class="automation-card rule-highlight conditional-modifiers"><strong>TÉNACITÉ</strong>${conditionalChoice('tenacityUsed',`Ajouter 1 dé d’attaque rouge`,`L’unité est blessée ou a perdu au moins une figurine et effectue une attaque au corps-à-corps.`)}</div>`};
const poolModifierPanelMakashiBase=poolModifierPanel;
poolModifierPanel=function(){const base=poolModifierPanelMakashiBase();if(!makashiEligible())return base;return `${base}<div class="automation-card rule-highlight conditional-modifiers"><strong>MAÎTRISE DU MAKASHI</strong>${conditionalChoice('makashiUsed','Réduire de 1 le Perforant de la réserve',"Si utilisé, le défenseur ne peut pas utiliser Immunité : perforant (corps-à-corps) contre cette attaque.")}</div>`};
const poolModifierPanelAntiBase=poolModifierPanel;
poolModifierPanel=function(){const base=poolModifierPanelAntiBase();if(attackStep!==0)return base;const keyword=isVehicle(defender)?'anti-materiel-x':'anti-personnel-x',label=isVehicle(defender)?'ANTI-MATÉRIEL':'ANTI-PERSONNEL',upgrades=selectedWeaponRows().reduce((sum,row)=>sum+weaponKeywordValue(row,keyword),0);return upgrades?`${base}<div class="automation-card rule-highlight"><strong>${label} : ${upgrades} DÉ(S) AMÉLIORÉ(S)</strong><small>Type de cible reconnu automatiquement. Les dés les plus faibles de chaque arme concernée sont améliorés dans la réserve affichée.</small></div>`:base};
function moveConditionalModifiers(html){return html}
const rollScreenConditionalBase=rollScreen;
rollScreen=function(){return moveConditionalModifiers(rollScreenConditionalBase())};
const defenseScreenConditionalBase=defenseScreen;
defenseScreen=function(){return moveConditionalModifiers(defenseScreenConditionalBase())};
const bindMandatoryConditionalsBase=bindAttackInputs;
bindAttackInputs=function(){bindMandatoryConditionalsBase();root.querySelectorAll('[data-condition]').forEach(button=>button.onclick=()=>{attackState[button.dataset.condition]=button.dataset.value==='true';resolveScreen()})};
function unansweredConditional(){const attackerRules=allResolved(attacker),defenderRules=allResolved(defender);if(tenacityEligible()&&attackState.tenacityUsed===null)return 'Répondez Oui ou Non : souhaitez-vous appliquer Ténacité ?';if(makashiEligible()&&attackState.makashiUsed===null)return 'Répondez Oui ou Non : souhaitez-vous appliquer Maîtrise du Makashi ?';if(attackStep===1){if(attackKeywordValue('belier-x')&&attackState.ramEligible===null)return 'Répondez Oui ou Non pour la condition de Bélier.';if(attackerRules.some(x=>x.def.id==='tenir-bon')&&attackState.engaged===null)return 'Répondez Oui ou Non : l’unité est-elle engagée ?';if(attackerRules.some(x=>x.def.id==='chasseur-de-jedi')&&attackState.targetForceUpgrade===null)return 'Répondez Oui ou Non : le défenseur possède-t-il une amélioration Force ?';if(attackerRules.some(x=>x.def.id==='accomplir-la-mission')&&attackState.priorityMissionAttack===null)return 'Répondez Oui ou Non pour Mission prioritaire.'}if(attackStep===4){if(defenderRules.some(x=>x.def.id==='tenir-bon')&&attackState.engaged===null)return 'Répondez Oui ou Non : le défenseur est-il engagé ?';if(defenderRules.some(x=>x.def.id==='accomplir-la-mission')&&attackState.priorityMissionDefense===null)return 'Répondez Oui ou Non pour Mission prioritaire.'}return''}
const stepIssueMandatoryConditionalsBase=stepIssue;
stepIssue=function(){const conditional=unansweredConditional();if(conditional)return conditional;return stepIssueMandatoryConditionalsBase()||null};
const decorateMandatoryConditionalsBase=decorateResolveScreen;
decorateResolveScreen=function(){decorateMandatoryConditionalsBase();const panel=root.querySelector('.resolve-center .conditional-modifiers'),entry=root.querySelector('.resolve-center .result-entry');if(panel&&entry)entry.before(panel)};
const saveAttackHistoryCompleteBase=saveAttackHistory;
saveAttackHistory=function(){saveAttackHistoryCompleteBase();persistUnitStates()};
const resolveScreenCompletionBase=resolveScreen;
resolveScreen=function(){resolveScreenCompletionBase();const next=$('#nextAttack');if(next&&attackStep===5)next.textContent=defenseResult().result.wounds?'Appliquer les blessures et terminer':'Terminer l’attaque'};

function hasResolvedKeyword(entry,id){return allResolved(entry).some(item=>item.def.id===id)}
const legalityPanelWeakPointBase=legalityPanel;
legalityPanel=function(){const base=legalityPanelWeakPointBase(),weakPointX=keywordValue(defender,'point-faible-x');if(attackStep!==0||!weakPointX||!selectedWeaponRows().length)return base;return `${base}<div class="automation-card rule-highlight conditional-modifiers"><strong>POINT FAIBLE ${weakPointX}</strong>${conditionalChoice('weakPointExposed',`Chef attaquant dans l’arc indiqué ?`,`Oui ajoute automatiquement Impact ${weakPointX} à cette réserve. Pour une arme à effet de zone, utilisez la position du pion Charge ou Avantage.`)}</div>`};
const poolModifierPanelDuelistBase=poolModifierPanel;
poolModifierPanel=function(){const base=poolModifierPanelDuelistBase();if(attackType()!=='melee')return base;const attackerDuelist=hasResolvedKeyword(attacker,'duelliste'),defenderDuelist=hasResolvedKeyword(defender,'duelliste');if(attackStep===1&&attackerDuelist)return `${base}<div class="automation-card rule-highlight"><strong>DUELLISTE — ATTAQUE</strong><small>Dépensez au moins 1 pion Viser dans « relancer » : Perforant 1 sera ajouté automatiquement.</small></div>`;if(attackStep===2&&defenderDuelist)return `${base}<div class="automation-card rule-highlight"><strong>DUELLISTE — DÉFENSE</strong><small>Si au moins 1 pion Esquive est dépensé, Immunité : Perforant s’appliquera automatiquement.</small></div>`;return base};
const stepIssueWeakPointBase=stepIssue;
stepIssue=function(){const base=stepIssueWeakPointBase();if(base)return base;if(attackStep===0&&keywordValue(defender,'point-faible-x')>0&&selectedWeaponRows().length&&attackState.weakPointExposed===null)return 'Répondez Oui ou Non : le chef attaquant se trouve-t-il dans l’arc de Point faible ?';return null};
const bindWeakPointBase=bindAttackInputs;
bindAttackInputs=function(){bindWeakPointBase();root.querySelectorAll('[data-condition="weakPointExposed"]').forEach(button=>button.onclick=()=>{attackState.weakPointExposed=button.dataset.value==='true';attackState.impact=null;resolveScreen()})};
const decorateDiceJourneyBase=decorateResolveScreen;
decorateResolveScreen=function(){decorateDiceJourneyBase();const journey=root.querySelector('.resolve-center .dice-journey'),journal=root.querySelector('.resolve-center .resolution-log'),rules=root.querySelector('.resolve-center .rules-panel');if(journey){if(journal)journal.before(journey);else if(rules)rules.before(journey);else root.querySelector('.resolve-center')?.append(journey)}};
// Intrépide/Contrainte/Démoraliser (16/09/2026) : plus besoin d'un
// « ralliement complété » suivi par l'appli — ces options s'affichent dès
// que le compteur Suppression (mis à jour à la main après le jet physique)
// indique une unité démoralisée mais pas paniquée. postRallyMoves/
// rallyDemoralizeSpent limitent chaque effet à une fois par activation.
let postRallyMoves=new Set,rallyDemoralizeSpent={};
function postRallyPanel(entry){const state=stateFor(entry),stats=certifiedUnitStats(entry),morale=stats&&!moraleImmune(entry)?engine.moraleState({currentSuppression:state.suppression,courage:stats.courage}):null;if(!morale?.suppressed||morale.panicRisk)return'';const eligible=!postRallyMoves.has(entry.id),intrepid=allResolved(entry).some(x=>x.def.id==='intrepide'),constrainers=entries.filter(candidate=>candidate.army===entry.army&&candidate.id!==entry.id&&allResolved(candidate).some(x=>x.def.id==='contrainte')),demoralize=keywordValue(entry,'demoraliser-x'),spent=rallyDemoralizeSpent[entry.id]||0,targets=entries.filter(candidate=>candidate.army!==entry.army&&!defeated(candidate));if(!intrepid&&!constrainers.length&&!demoralize)return'';return `<section class="post-rally-panel"><strong>OPTIONS UNITÉ DÉMORALISÉE</strong>${intrepid?`<div><b>INTRÉPIDE</b><small>Cette unité démoralisée (mais pas paniquée) peut gagner 1 suppression pour effectuer un déplacement gratuit.</small><button class="secondary" data-post-rally-move="${entry.id}" ${eligible?'':'disabled'}>${postRallyMoves.has(entry.id)?'Déplacement gratuit enregistré':'Gagner 1 suppression et se déplacer'}</button></div>`:''}${constrainers.length&&!intrepid?`<div><b>CONTRAINTE DISPONIBLE</b><small>Vérifiez la portée 2, le rang/type demandé et que l’unité est un soldat non-droïde. Cette unité démoralisée (mais pas paniquée) peut gagner 1 suppression pour se déplacer gratuitement.</small><button class="secondary" data-post-rally-move="${entry.id}" ${eligible?'':'disabled'}>${postRallyMoves.has(entry.id)?'Déplacement gratuit enregistré':'Conditions vérifiées : appliquer'}</button></div>`:''}${demoralize?`<div><b>DÉMORALISER ${demoralize}</b><small>Cette unité étant démoralisée (mais pas paniquée), attribuez jusqu’à ${demoralize} suppression(s) à des unités ennemies à portée 2. ${spent}/${demoralize} attribuée(s).</small><div class="demoralize-targets">${targets.map(target=>`<button class="secondary" data-demoralize-target="${target.id}" data-source="${entry.id}" ${spent>=demoralize?'disabled':''}>+1 ${entryName(target)}</button>`).join('')||'<em>Aucune cible disponible</em>'}</div></div>`:''}</section>`}
function bindPostRally(entry,role){const move=root.querySelector(`[data-post-rally-move="${entry.id}"]`);if(move)move.onclick=()=>{const state=stateFor(entry);unitStates[entry.id]={...state,suppression:state.suppression+1};postRallyMoves.add(entry.id);persistUnitStates();overview(entry,role)};root.querySelectorAll(`[data-demoralize-target][data-source="${entry.id}"]`).forEach(button=>button.onclick=()=>{const max=keywordValue(entry,'demoraliser-x'),spent=rallyDemoralizeSpent[entry.id]||0;if(spent>=max)return;const target=entries.find(candidate=>candidate.id===button.dataset.demoralizeTarget);if(!target||moraleImmune(target))return;const state=stateFor(target);unitStates[target.id]={...state,suppression:state.suppression+1};rallyDemoralizeSpent[entry.id]=spent+1;persistUnitStates();overview(entry,role)})}
const overviewPostRallyBase=overview;
overview=function(entry,role){overviewPostRallyBase(entry,role);if(role==='attack'&&!defeated(entry)){const panel=document.createElement('div');panel.innerHTML=postRallyPanel(entry);const content=panel.firstElementChild;if(content){const anchor=root.querySelector('.overview .card-strip');anchor?.before(content);bindPostRally(entry,role)}}};
function markUnitActivated(entry){if(!entry)return;const key='swl.game-tracker.v1',tracker=read(key,{round:1,activatedUnitIds:[]}),activated=Array.isArray(tracker.activatedUnitIds)?tracker.activatedUnitIds:[];if(!activated.includes(entry.id))localStorage.setItem(key,JSON.stringify({...tracker,activatedUnitIds:[...activated,entry.id]}))}
const saveAttackHistoryModelWoundsBase=saveAttackHistory;
saveAttackHistory=function(){saveAttackHistoryModelWoundsBase();markUnitActivated(attacker);persistUnitStates()};
document.addEventListener('click',event=>{const armyButton=event.target.closest?.('[data-army]');if(armyButton&&stage===1)applyFactionTheme(factionThemeForArmy(armyButton.dataset.army));const unitButton=event.target.closest?.('.unit-tile[data-id]');if(unitButton&&stage===1){const entry=entries.find(candidate=>candidate.id===unitButton.dataset.id);if(entry)applyFactionTheme(factionThemeForArmy(entry.army));requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}))}},true);
/* Éclat « refusé » sur le bouton Étape suivante quand une règle bloque
   encore l'avancée (stepIssue()) : le clic déclenche toujours un
   resolveScreen() qui recrée #nextAttack de zéro (root.innerHTML), donc on
   ne peut pas animer l'ancien bouton (détruit avant d'être peint) — on pose
   un drapeau en phase de capture, avant que le onclick natif ne re-rende
   l'écran, puis on l'applique juste après au bouton fraîchement recréé. */
let nextAttackDenied=false,nextAttackDeniedIssue='';
document.addEventListener('click',event=>{if(event.target.closest?.('#nextAttack')&&typeof stepIssue==='function'){const issue=stepIssue();if(issue){nextAttackDenied=true;nextAttackDeniedIssue=issue}}},true);
const resolveScreenDeniedShakeBase=resolveScreen;
resolveScreen=function(){resolveScreenDeniedShakeBase();if(nextAttackDenied){pulseEl($('#nextAttack'),'next-denied');const warning=root.querySelector('.resolve-center .strict-warning:not([hidden])');if(warning)warning.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
/* Nombre de dés saisis invalide (trop ou pas assez par rapport à la
   réserve) : en plus de l'éclat générique ci-dessus, on cible en plus
   l'encadré qui contient les compteurs de dés lui-même. */
if(/^Le jet (saisi|de défense saisi) contient/.test(nextAttackDeniedIssue)){const entry=root.querySelector('.resolve-center .result-entry:has(#rollHit),.resolve-center .result-entry:has(#defBlock)')||root.querySelector('.resolve-center .result-entry');if(entry)pulseEl(entry,'dice-entry-invalid')}
nextAttackDenied=false;nextAttackDeniedIssue=''}};
/* Éclat « refusé » sur une arme grisée (hors portée / interdite par une
   immunité) au tap/clic : le <button> porte l'attribut disabled (aucun
   événement ne s'y déclenche), mais sw-effects.css neutralise son
   pointer-events pour laisser le clic remonter jusqu'à l'article
   .weapon-choice.disabled, qui reste un élément normal et cliquable. */
document.addEventListener('click',event=>{const denied=event.target.closest?.('.weapon-choice.disabled');if(denied)pulseEl(denied,'denied-shake')},true);

/* Cockpit tactique v75 : l'action requise domine visuellement la télémétrie,
   et les effectifs proposés proviennent du roster certifié encore en vie. */
// Figurines ajoutées à l'escouade par les améliorations certifiées (addedModels) SANS arme propre : escouade « Stormtrooper Squad », « Fleet Trooper Squad », spécialiste… Ces figurines tirent avec les armes de la carte Unité, donc elles s'ajoutent à l'effectif de cette carte. Une amélioration avec arme propre (arme lourde) ajoute des figurines qui n'utilisent que sa propre arme : elle est comptée sur sa propre ligne, pas ici.
function squadAddedModels(entry){return (entry?.unit?.upgrades||[]).reduce((sum,card)=>{const profile=profileFor(card.name),added=Number(profile?.addedModels)||0;return added>0&&!(profile?.weapons||[]).length?sum+added:sum},0)}
function squadModelsNote(entry){const parts=(entry?.unit?.upgrades||[]).map(card=>({card:card.name,profile:profileFor(card.name)})).filter(item=>Number(item.profile?.addedModels)>0&&!(item.profile?.weapons||[]).length);if(!parts.length)return'';return `<small class="models-note">Effectif : ${certifiedUnitStats(entry)?.baseModels??1} + ${parts.map(item=>`${item.profile.addedModels} (${displayName(item.card)})`).join(' + ')} figurines</small>`}
function unitWeaponModels(entry){return Math.max(1,(certifiedUnitStats(entry)?.baseModels??1)+squadAddedModels(entry))}
function suggestedWeaponCount(row){
  const stats=certifiedUnitStats(attacker),profile=profileFor(row.card);
  if(cardKey(row.card)===cardKey(attacker.unit.name))return unitWeaponModels(attacker);
  if(Number.isInteger(profile?.addedModels)&&profile.addedModels>0)return Math.max(1,profile.addedModels);
  return Math.max(1,stats?.baseModels??1);
}
function prefillWeaponCounts(){
  const cards=[attacker.unit.name,...(attacker.unit.upgrades||[]).map(upgrade=>upgrade.name)];
  cards.flatMap(card=>(profileFor(card)?.weapons||[]).map((weapon,index)=>({card,weapon,index,key:`${norm(card)}:${index}`}))).forEach(row=>{
    if(!attackState.manualCounts?.[row.key])attackState.counts[row.key]=suggestedWeaponCount(row);
  });
}
function tacticalStateBadge(suppression,courage,immune){
  if(immune)return '<span class="tactical-state immune">IMMUNITÉ MENTALE</span>';
  const value=Math.max(1,Number(courage)||1);
  if(suppression>=value*2)return '<span class="tactical-state danger">⚠ PANIQUÉE</span>';
  if(suppression>=value)return '<span class="tactical-state warning">⚠ DÉMORALISÉE</span>';
  return '<span class="tactical-state stable">✓ MORAL STABLE</span>';
}
unitStatusHud=function(entry,side=false){
  const state=stateFor(entry),stats=certifiedUnitStats(entry),immune=moraleImmune(entry),isLive=side&&entry===defender&&attackState;
  const suppression=immune?0:(isLive?attackState.currentSuppression:state.suppression);
  return `<div class="unit-hud tactical-hud ${side?'compact':''}" aria-label="État de ${entryName(entry)}"><div class="hud-vitals"><span><small>SUPPRESSION</small><b><img class="card-stat-icon" src="./stat-icons/suppression.svg" alt="">${immune?'—':suppression}</b></span>${tacticalStateBadge(suppression,stats?.courage,immune)}</div></div>`
};
const bindTacticalCountsBase=bindAttackInputs;
bindAttackInputs=function(){
  bindTacticalCountsBase();
  root.querySelectorAll('[data-range]').forEach(button=>button.addEventListener('click',()=>{attackState.manualCounts=attackState.manualCounts||{};prefillWeaponCounts()},{capture:true}));
  root.querySelectorAll('[data-key]').forEach(button=>button.addEventListener('click',()=>{attackState.manualCounts=attackState.manualCounts||{};const key=button.dataset.key;if(!attackState.manualCounts[key]){const cards=[attacker.unit.name,...(attacker.unit.upgrades||[]).map(upgrade=>upgrade.name)],row=cards.flatMap(card=>(profileFor(card)?.weapons||[]).map((weapon,index)=>({card,weapon,key:`${norm(card)}:${index}`}))).find(candidate=>candidate.key===key);if(row)attackState.counts[key]=suggestedWeaponCount(row)}},{capture:true}));
  root.querySelectorAll('[data-count],[data-minus],[data-plus]').forEach(control=>control.addEventListener(control.matches('[data-count]')?'input':'click',()=>{attackState.manualCounts=attackState.manualCounts||{};const key=control.dataset.count||control.dataset.minus||control.dataset.plus;if(key)attackState.manualCounts[key]=true},{capture:true}));
};
function decorateTacticalResolution(){
  const center=root.querySelector('.resolve-center');if(!center)return;
  // Ordre de lecture (19/09/2026, demande utilisateur) : les encadrés qui demandent une vérification (cases à cocher de situation, règles applicables, pions en réserve, avertissements) passent juste sous les étapes, dans l'ordre où on les vérifie en partie ; les encadrés-résultats calculés (couvert effectif, conversion, relances) restent à côté de leur saisie.
  const stepper=center.querySelector('.attack-stepper');
  if(stepper){
    const checks=[...center.children].filter(element=>element.matches('.situation-check,.automation-card,.token-budget,.combat-warning,.cumbersome-checks,.token-card')&&!element.matches('[class*="cover-"],.roll-conversion-panel,.roll-reroll-panel'));
    let anchor=stepper;
    // Les dés à lancer (ou à défendre) sont toujours tout en haut, sous les étapes, puis le résumé des touches/critiques en cours ; les vérifications viennent ensuite. Étape 1 : la portée reste juste au-dessus des dés (voir plus bas).
    if(attackStep!==0){const bar=center.querySelector(':scope > .dice-pool,:scope > .defense-dice-pool'),summary=center.querySelector(':scope > .result-strip:not(.live-result-strip):not(.live-defense-strip)');[bar,summary].filter(Boolean).forEach(element=>{anchor.after(element);anchor=element})}
    checks.forEach(element=>{anchor.after(element);anchor=element});
    if(attackStep===0){const warning=center.querySelector(':scope > .strict-warning'),range=center.querySelector(':scope > .range-picker'),fire=center.querySelector(':scope > .fire-control-card'),targeting=center.querySelector(':scope > .target-check-card'),arsenal=center.querySelector(':scope > .arsenal-card'),distract=center.querySelector(':scope > .distract-card'),weapons=center.querySelector(':scope > .weapon-picker'),pool=center.querySelector(':scope > .dice-pool'),poolNote=center.querySelector(':scope > .pool-note');[warning,range,fire,targeting,arsenal,distract,weapons,pool,poolNote].filter(Boolean).forEach(element=>{anchor.after(element);anchor=element})}
  }
  // Écran Couvert : barre « dés de couvert à lancer » (même design que Jet et Défense) avec l'état de validation du jet, et libellés des résultats avant/après.
  if(attackStep===2&&stepper){
    const ctx=coverContext(),n=attackType()==='ranged'&&ctx.effective!=='none'?Math.max(0,attackResults().hit-(ctx.profileLow?1:0)):0,bar=document.createElement('div');
    bar.className='dice-pool cover-pool';bar.innerHTML=`<span>DÉS DE COUVERT À LANCER${fxUsed('entrenched')?' (ROUGES · Retranchement)':''}</span><div class="dice-row dice-row-big">${n?dieBadge(fxUsed('entrenched')?'rouge':'blanc',n):'<em class="no-dice">aucun</em>'}</div>`;
    if(n){const done=!!attackState.coverRolled;bar.insertAdjacentHTML('beforeend',`<div class="entry-progress ${done?'complete':'pending'}"><span>${done?'✓':'↻'}</span><strong>${done?'Jet validé':'Jet à valider'}</strong></div>`)}
    stepper.after(bar);
  }
  // Couvert et Modifications : le résultat « avant » devient une petite mention dans la barre « après » (une ligne de moins à l'écran).
  {const before=center.querySelector(':scope > .result-strip:not(.live-result-strip)'),after=center.querySelector(':scope > .live-result-strip'),label=after?.querySelector('b:first-child:not(:has(img))');if(before&&label&&(attackStep===2||attackStep===3)){const counts=[...before.querySelectorAll('b')].map(element=>element.textContent.trim());label.insertAdjacentHTML('beforeend',`<small class="was">avant : ${counts[0]||0} touche(s) · ${counts[1]||0} critique(s)</small>`);before.remove()}}
  // Barre collante (19/09/2026, demande utilisateur) : dés à lancer + progression de saisie + RÉSULTAT en cours restent visibles pendant qu'on défile dans les saisies. Les décalages sticky suivent la hauteur réelle du bandeau du haut et des étapes.
  if(stepper){const header=document.querySelector('.app-header-sticky');center.style.setProperty('--hdr',(header&&getComputedStyle(header).position==='sticky'?header.offsetHeight:0)+'px');center.style.setProperty('--stepper-h',stepper.offsetHeight+'px');
    const bar=attackStep!==0?center.querySelector(':scope > .dice-pool,:scope > .defense-dice-pool'):null,live=center.querySelector(':scope > .live-result-strip,:scope > .live-defense-strip');
    if(bar||live){const sticky=document.createElement('div');sticky.className='sticky-summary';stepper.after(sticky);if(bar)sticky.append(bar);if(live)sticky.append(live)}}
  // Étape Couvert & esquive (19/09/2026) : déroulé forcé — couvert observé (choix explicite) → jet de couvert (validé) → esquives. Les esquives sortent du bloc du jet de couvert pour former leur propre section, sous leur carte de pions.
  if(attackStep===2){
    const coverOptions=center.querySelector(':scope > .cover-options'),coverCard=center.querySelector(':scope > .automation-card[class*="cover-"]'),coverEntry=center.querySelector(':scope > .result-entry'),dodgeCard=center.querySelector(':scope > .token-card.dodge');
    if(coverOptions&&coverEntry){
      const ranged=attackType()==='ranged',dodgeFields=[...coverEntry.querySelectorAll('.quick-field')].filter(field=>field.querySelector('#dodges,#dodgeCrits'));
      let dodgeEntry=null;if(dodgeFields.length){dodgeEntry=document.createElement('div');dodgeEntry.className='result-entry dodge-entry';dodgeEntry.append(...dodgeFields)}
      if(ranged){coverOptions.classList.add('manual-focus');coverOptions.classList.toggle('unset',!attackState.coverChosen)}
      if(coverEntry.querySelector('#coverBlock')){const done=!!attackState.coverRolled,confirm=document.createElement('button');confirm.type='button';confirm.className='phase-confirm '+(done?'done':'todo');confirm.textContent=done?'✓ Jet de couvert validé · modifier':'Valider le jet de couvert';confirm.onclick=()=>{attackState.coverRolled=!attackState.coverRolled;resolveScreen()};coverEntry.append(confirm)}
      let last=[...center.children].filter(element=>element.matches('.attack-stepper,.sticky-summary,.result-strip:not(.live-result-strip),.situation-check')).pop();
      [coverOptions,coverCard,coverEntry,dodgeCard,dodgeEntry].filter(Boolean).forEach(element=>{last.after(element);last=element});
    }
  }
  // Plateau de dés : les faces de dés (touches, critiques, adrénalines, vierges ; blocages…) forment une rangée de tuiles carrées au lieu d'une pile de lignes.
  center.querySelectorAll('.result-entry').forEach(entry=>{const faces=[...entry.children].filter(field=>field.classList.contains('quick-field')&&field.firstElementChild&&!field.firstElementChild.matches('.quick-label')&&field.querySelector('.touch-counter'));if(faces.length<(entry.querySelector('#coverBlock')?1:2))return;entry.querySelector(':scope > .automation-card:not(.rule-highlight)')?.remove();const tray=document.createElement('div');tray.className='dice-tray';faces[0].before(tray);tray.append(...faces);faces.forEach(field=>{const face=field.firstElementChild,medal=document.createElement('span');medal.className='face-medal';face.replaceWith(medal);medal.append(face);const label=field.querySelector('.quick-label'),input=field.querySelector('input'),short={coverBlock:'Blocages obtenus',coverSurge:'Adrénalines obtenues'};if(label&&input&&short[input.id])label.textContent=short[input.id];if(label&&input&&(input.id==='rollBlank'||input.id==='defBlank')){const step=input.id==='rollBlank'?'roll':'def',manual=attackState.blankManual?.[step],touched=attackState.blankTouched?.[step];label.textContent=manual?'Vierges (manuel)':touched?'Vierges (auto)':'Vierges';field.classList.toggle('auto-blank',!manual&&!!touched)}});if(entry.querySelector('#rollBlank,#defBlank')){const step=entry.querySelector('#rollBlank')?'roll':'def',manual=!!attackState.blankManual?.[step],actions=document.createElement('div');actions.className='tray-actions';actions.innerHTML=`<button type="button" class="auto-chip" data-all-blank="${step}">Tout vierge</button>${manual?`<button type="button" class="auto-chip" data-auto-blank="${step}">↺ Vierges automatiques</button>`:''}`;tray.after(actions);actions.querySelectorAll('[data-all-blank]').forEach(button=>button.onclick=()=>{attackState.blankTouched=attackState.blankTouched||{};attackState.blankManual=attackState.blankManual||{};attackState.blankTouched[step]=true;attackState.blankManual[step]=false;if(step==='roll'){attackState.roll.hit=0;attackState.roll.crit=0;attackState.roll.surge=0}else{attackState.defense.block=0;attackState.defense.surge=0}resolveScreen()});actions.querySelectorAll('[data-auto-blank]').forEach(button=>button.onclick=()=>{attackState.blankManual[step]=false;resolveScreen()})}});
  center.querySelectorAll('.range-picker,.weapon-picker,.result-entry,.cover-picker,.conditional-modifiers,.cumbersome-checks,.wound-allocator').forEach(element=>element.classList.add('manual-focus'));
  center.querySelectorAll('.weapon-choice').forEach(choice=>{const key=choice.querySelector('[data-key]')?.dataset.key,input=choice.querySelector('[data-count]');if(!key||!input)return;const modelsNote=key.startsWith(norm(attacker.unit.name)+':')?squadModelsNote(attacker):'';if(modelsNote)choice.querySelector('.weapon-copy')?.insertAdjacentHTML('beforeend',modelsNote);const note=document.createElement('small');note.className='autofill-note';note.textContent=attackState.manualCounts?.[key]?'AJUSTÉ MANUELLEMENT':'PRÉREMPLI · MODIFIABLE';choice.querySelector('.count-control')?.prepend(note)});
  if(attackStep===2){const ctx=coverContext(),hits=attackResults().hit,dice=Math.max(0,hits-(ctx.profileLow?1:0)),panel=document.createElement('section');panel.className=`cover-command ${ctx.effective}`;panel.innerHTML=ctx.effective==='none'?'<small>ACTION COUVERT</small><strong>AUCUN DÉ À LANCER</strong><p>Poursuivez directement vers les esquives.</p>':`<small>ACTION COUVERT · ${ctx.effective==='heavy'?'LOURD':'LÉGER'}</small><strong>${dice} DÉ${dice>1?'S':''} BLANC${dice>1?'S':''} À LANCER</strong><p>${ctx.effective==='heavy'?'Blocages et adrénalines annulent les touches.':'Seuls les blocages annulent les touches.'}${ctx.profileLow?' Profil Bas ajoute déjà 1 blocage.':''}</p>`;center.querySelector('.cover-picker')?.before(panel)}
  // La progression « n / N dés saisis » concerne la saisie des dés, pas les pions en réserve qui la contenaient : elle passe sur la même ligne que la barre « Dés à lancer ».
  const entryProgress=center.querySelector('.entry-progress'),poolBar=center.querySelector('.dice-pool,.defense-dice-pool');if(entryProgress&&poolBar)poolBar.append(entryProgress);
  // Étape Modifications sans effet (ni Impact, ni Armure, ni bouclier, ni case à cocher) : bandeau « Passer », saisie manuelle repliée.
  if(attackStep===3){const cards=[...center.querySelectorAll(':scope > .automation-card')],idle=cards.length===1&&/NE S’APPLIQUE PAS ICI/.test(cards[0].textContent)&&!/PRIMITIF|BOUCLIERS/.test(cards[0].textContent)&&!center.querySelector(':scope > .situation-check,:scope > .cumbersome-checks,:scope > .token-budget,:scope > .result-entry,:scope > .guardian-panel');
    attackState.modsIdle=idle;
    if(!idle){const done=!!attackState.modsConfirmed,row=document.createElement('div');row.className='phase-confirm-row';row.innerHTML=`<button type="button" class="phase-confirm ${done?'done':'todo'}" data-phase-confirm="mods">${done?'✓ Modifications appliquées · modifier':'Valider les modifications'}</button>`;row.querySelector('button').onclick=()=>{attackState.modsConfirmed=!attackState.modsConfirmed;resolveScreen()};(center.querySelector(':scope > .rules-panel')||center.lastElementChild)?.before(row)}
    if(idle){const banner=document.createElement('section');banner.className='idle-step';banner.innerHTML=`<div><strong>${cards[0].querySelector('strong')?.textContent||'AUCUNE MODIFICATION À APPLIQUER'}</strong><small>${cards[0].querySelector('small')?.textContent||''}</small></div><button type="button" class="primary" data-skip-step>Passer à la défense →</button>`;cards[0].remove();(center.querySelector('.sticky-summary')||center.querySelector('.attack-stepper'))?.after(banner);banner.querySelector('[data-skip-step]').onclick=()=>$('#nextAttack')?.click()}}
  // Journal de résolution : replié par défaut (demande utilisateur du 19/09/2026).
  const journal=center.querySelector('.resolution-log');if(journal&&journal.tagName!=='DETAILS'){const folded=document.createElement('details');folded.className=journal.className;const title=journal.querySelector('strong')?.textContent||'JOURNAL DE RÉSOLUTION';journal.querySelector('strong')?.remove();folded.innerHTML=`<summary>${title}</summary>${journal.innerHTML}`;journal.replaceWith(folded)}
  // Informations seules (rappels de règle sans saisie, notes) : repliées en une ligne « ℹ n rappels de règle ». Les encadrés qui portent un résultat ou une action (couvert effectif, conversion, relances, Impact, fin d'attaque…) restent visibles.
  const infoBlocks=[...center.children].filter(element=>(element.matches('.automation-card')&&!element.matches('[class*="cover-"],.roll-conversion-panel,.roll-reroll-panel')&&!element.querySelector('input,button,select,textarea')&&!/Impact disponible|EFFETS DE FIN|ATTAQUE GRATUITE|BLOCAGE ACTIF|SUPPRESSION ANNULÉE|IMMUNITÉ DU DÉFENSEUR|GARDIEN/i.test(element.textContent))||element.matches('.conversion-note'));
  if(infoBlocks.length){const fold=document.createElement('details');fold.className='info-fold';fold.innerHTML=`<summary>ℹ ${infoBlocks.length} rappel${infoBlocks.length>1?'s':''} de règle</summary>`;infoBlocks[0].before(fold);fold.append(...infoBlocks)}
  // Pions en réserve : une fois la saisie des dés complète, le bloc se réduit à une ligne récapitulative, rouvrable.
  center.querySelectorAll('.token-budget').forEach(budget=>{if(budget.querySelector('.budget-summary'))return;const title=(budget.querySelector(':scope > strong')?.textContent||'Pions en réserve').toLowerCase(),summary=document.createElement('button');summary.type='button';summary.className='budget-summary';summary.innerHTML=`<b>✓ ${title.charAt(0).toUpperCase()+title.slice(1)}</b><span></span><i>modifier</i>`;summary.onclick=()=>{attackState.budgetOpen=attackStep;refreshResolveUi()};budget.append(summary)});
  if(attackStep===5){const morale=center.querySelector(':scope > .morale-panel');if(morale&&!morale.querySelector('.strict-warning')){const fold=document.createElement('details'),current=document.getElementById('currentSuppression')?.value??0,courage=document.getElementById('defenderCourage')?.value??1,state=/UNITÉ PANIQUÉE|PANIQUÉE/i.test(morale.textContent)?'paniquée':/DÉMORALISÉE/i.test(morale.textContent)?'démoralisée':'moral stable';fold.className='morale-fold';fold.open=!!attackState.moraleOpen;fold.innerHTML=`<summary><b>SUPPRESSION ET MORAL</b><span>avant : ${current} · courage : ${courage} · ${state}</span><i>toucher pour corriger</i></summary>`;morale.replaceWith(fold);fold.append(morale)}}
  // Colonnes latérales : les vignettes d'améliorations se replient (elles allongeaient la page de ~300 px pour un simple rappel).
  root.querySelectorAll('.combat-side .mini-upgrades').forEach(list=>{if(list.closest('details'))return;const fold=document.createElement('details');fold.className='side-upgrades';fold.innerHTML=`<summary>Améliorations (${list.children.length})</summary>`;list.replaceWith(fold);fold.append(list)});
  refreshResolveUi();
  if(attackState&&attackState.uiStep!==attackStep){attackState.uiStep=attackStep;requestAnimationFrame(focusFirstTodo)}
}
/* Lisibilité « bloquant / à saisir / information » (19/09/2026, demande utilisateur).
   stepIssue() est la seule source de vérité du blocage : la pastille d'état, le bouton verrouillé et les champs à saisir en dérivent tous. Fonctions idempotentes, rappelées après chaque rendu et après chaque saisie (voir l'écouteur en bas). */
function refreshGate(){
  const actions=root.querySelector('.actions'),next=$('#nextAttack');if(!actions||!next||!attackState)return;
  let gate=actions.querySelector('.gate-status');
  if(!gate){gate=document.createElement('div');gate.setAttribute('role','status');gate.setAttribute('aria-live','polite');actions.prepend(gate)}
  const issue=stepIssue();
  gate.className='gate-status '+(issue?'blocked':'ready');
  gate.innerHTML=issue?`<b>⛔ BLOQUÉ</b><span>${issue}</span>`:'<b>✓ PRÊT</b><span>Vous pouvez passer à l’étape suivante.</span>';
  next.classList.toggle('locked',!!issue);next.setAttribute('aria-disabled',issue?'true':'false');
}
function refreshFieldStates(){
  const center=root.querySelector('.resolve-center');if(!center||!attackState)return;
  const progress=center.querySelector('.entry-progress'),state=progress?(progress.classList.contains('complete')?'complete':progress.classList.contains('over')?'over':'pending'):'';
  if(state)center.dataset.entryState=state;else delete center.dataset.entryState;
  center.querySelectorAll('.dice-tray > .quick-field').forEach(field=>{const input=field.querySelector('input');field.classList.toggle('is-empty',!input||!(Number(input.value)>0))});
  const issue=stepIssue()||'';
  center.querySelector('.range-picker')?.classList.toggle('todo',/portée/i.test(issue));center.querySelector('.fire-control-card')?.classList.toggle('todo',attackState.range!=null&&attackState.fireControlUsed===null);
  center.querySelector('.weapon-picker')?.classList.toggle('todo',/arme/i.test(issue)&&!/portée/i.test(issue));
  center.querySelectorAll('.token-budget').forEach(budget=>{
    const summary=budget.querySelector('.budget-summary');if(!summary)return;
    const parts=[...budget.querySelectorAll('.quick-field')].map(field=>`${(field.querySelector('.quick-label')?.textContent||'').replace(/ en réserve/i,'').replace(/^Pions /i,'')} ${field.querySelector('input')?.value||0}`);
    summary.querySelector('span').textContent=parts.join(' · ');
    budget.classList.toggle('is-done',state==='complete'&&attackState.budgetOpen!==attackStep);
  });
}
// Fil du processus (19/09/2026, demande utilisateur) : tant qu'un résultat ou une information obligatoire manque (stepIssue()), tout ce qui suit est grisé ; dès qu'il est saisi, la suite se dégrise et l'écran défile jusqu'à elle.
function gateBlocker(center,issue){
  if(!issue)return null;
  if(attackStep===2&&attackType()==='ranged'){if(!attackState.coverChosen)return center.querySelector(':scope > .cover-options');if(/jet de couvert/i.test(issue))return center.querySelector(':scope > .result-entry:has(#coverBlock)')}
  if(attackStep===3&&/^Validez les modifications/.test(issue))return center.querySelector(':scope > .phase-confirm-row');
  if(attackStep===0){const fire=center.querySelector(':scope > .fire-control-card');if(attackState.range==null)return center.querySelector('.range-picker');if(fire&&attackState.fireControlUsed===null)return fire}
  if(/Contrôle de Tir/i.test(issue))return center.querySelector(':scope > .fire-control-card');
  if(/portée/i.test(issue))return center.querySelector('.range-picker');
  if(/^Le jet (saisi|de défense saisi) contient/.test(issue))return center.querySelector('.result-entry:has(#rollHit),.result-entry:has(#defBlock)');
  if(/arme/i.test(issue))return center.querySelector('.weapon-picker');
  const mandatory=center.querySelector(':scope > .cumbersome-checks,:scope > .situation-check.mandatory-check');
  if(mandatory&&/Confirmez|vérifi/i.test(issue))return mandatory;
  const warning=center.querySelector(':scope > .input-warning:not([hidden])');
  if(warning&&warning.nextElementSibling)return warning.nextElementSibling;
  return center.querySelector(':scope > .fire-control-card.conditional-card,:scope > .situation-check.mandatory-check');
}
function applyProcessGate(){
  const center=root.querySelector('.resolve-center');if(!center||!attackState)return;
  const kids=[...center.children],neutral='.sticky-summary,.attack-stepper,.strict-warning,.input-warning',blocker=gateBlocker(center,stepIssue()||'');
  kids.forEach(element=>{element.classList.remove('is-dimmed');element.classList.remove('blocker-current')});
  if(blocker){
    let top=blocker;while(top&&top.parentElement!==center)top=top.parentElement;
    const from=kids.indexOf(top);if(from<0)return;top.classList.add('blocker-current');
    kids.forEach((element,index)=>{if(index>from&&!element.matches(neutral))element.classList.add('is-dimmed')});
    // Le blocage avance (ex. portée saisie, il reste les armes) : l'écran suit jusqu'au nouvel élément à faire.
    if(attackState.gateStep===attackStep&&Number.isInteger(attackState.gateIndex)&&from>attackState.gateIndex){const rect=top.getBoundingClientRect();if(rect.top<150||rect.bottom>window.innerHeight-110)top.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'})}
    attackState.gateStep=attackStep;attackState.gateIndex=from;attackState.gateKey=['range-picker','fire-control-card','weapon-picker','cover-options','phase-confirm-row','result-entry','situation-check'].find(name=>top.classList.contains(name))||null;
  }else if(attackState.gateStep===attackStep&&Number.isInteger(attackState.gateIndex)){
    // Débloqué : la section suivante s'illumine un instant et l'écran défile jusqu'à elle si elle n'est pas déjà bien visible.
    // Le point d'ancrage est retrouvé par sa classe (les index bougent quand l'avertissement disparaît).
    const anchorEl=attackState.gateKey?(attackState.gateKey==='result-entry'?center.querySelector(':scope > .result-entry:has(#rollHit),:scope > .result-entry:has(#defBlock),:scope > .result-entry:has(#coverBlock)'):center.querySelector(':scope > .'+attackState.gateKey)):null,following=anchorEl?kids.slice(kids.indexOf(anchorEl)+1):kids.slice(attackState.gateIndex+1),next=following.find(element=>!element.matches(neutral)&&!element.hidden);
    attackState.gateStep=null;attackState.gateIndex=null;
    if(next){next.classList.add('just-unlocked');setTimeout(()=>next.classList.remove('just-unlocked'),1400);const rect=next.getBoundingClientRect();if(rect.top<150||rect.top>window.innerHeight*0.6)next.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
  }
}
// Vierges automatiques (19/09/2026) : une fois qu'un autre résultat a été saisi, « vierges » = dés de la réserve - autres résultats ; une saisie manuelle des vierges reprend la main.
function applyAutoBlank(){
  if(!attackState||(attackStep!==1&&attackStep!==4))return;
  const center=root.querySelector('.resolve-center');if(!center)return;
  const step=attackStep===1?'roll':'def',group=attackStep===1?attackState.roll:attackState.defense,blankId=attackStep===1?'rollBlank':'defBlank',otherIds=attackStep===1?['rollHit','rollCrit','rollSurge']:['defBlock','defSurge'];
  if(attackState.blankManual?.[step]){
    // Saisie manuelle des vierges : le bouton « Vierges automatiques » apparaît tout de suite (sans attendre un nouveau rendu).
    const actions=center.querySelector('.tray-actions'),field=document.getElementById(blankId)?.closest('.quick-field');
    if(field){field.classList.remove('auto-blank');const label=field.querySelector('.quick-label');if(label)label.textContent='Vierges (manuel)'}
    if(actions&&!actions.querySelector('[data-auto-blank]')){const chip=document.createElement('button');chip.type='button';chip.className='auto-chip';chip.dataset.autoBlank=step;chip.textContent='↺ Vierges automatiques';chip.onclick=()=>{attackState.blankManual[step]=false;resolveScreen()};actions.append(chip)}
    return;
  }
  if(!attackState.blankTouched?.[step])return;
  const match=center.querySelector('.entry-progress strong')?.textContent.match(/(\d+)\s*\/\s*(\d+)/);if(!match)return;
  const expected=Number(match[2]),others=otherIds.reduce((sum,id)=>sum+(Number(document.getElementById(id)?.value)||0),0),blank=Math.max(0,expected-others);
  const blankField=document.getElementById(blankId)?.closest('.quick-field');if(blankField){blankField.classList.add('auto-blank');const blankLabel=blankField.querySelector('.quick-label');if(blankLabel)blankLabel.textContent='Vierges (auto)'}
  if(Number(group.blank)===blank&&Number(document.getElementById(blankId)?.value)===blank)return;
  group.blank=blank;const input=document.getElementById(blankId);if(input)input.value=blank;updateLiveCounters();
}
function refreshResolveUi(){if(!attackState||!root.querySelector('.resolve-center'))return;applyAutoBlank();refreshFieldStates();refreshGate();applyProcessGate()}
// À l'arrivée sur une étape : défilement jusqu'au premier élément à faire, s'il n'est pas déjà bien visible (sans donner le focus : pas de clavier qui s'ouvre sur iPad).
function focusFirstTodo(){
  const center=root.querySelector('.resolve-center');if(!center)return;
  const target=center.querySelector('.range-picker.todo,.fire-control-card.todo,.weapon-picker.todo,.cover-options.unset,.phase-confirm.todo')||(center.dataset.entryState==='pending'?center.querySelector('.dice-tray > .quick-field.is-empty'):null);
  if(!target)return;
  const rect=target.getBoundingClientRect();
  if(rect.top>140&&rect.bottom<window.innerHeight-110)return;
  target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
}
// Toucher une section grisée : l'écran revient au point bloquant, qui « refuse » (secousse) et la pastille du bas se met en évidence.
document.addEventListener('click',event=>{const dimmed=event.target.closest?.('.resolve-center > .is-dimmed');if(!dimmed)return;const blocker=root.querySelector('.resolve-center > .blocker-current');if(blocker){blocker.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});pulseEl(blocker,'denied-shake')}pulseEl(root.querySelector('.gate-status'),'denied-shake')},true);
new MutationObserver(()=>document.body.classList.toggle('resolving',!!root.querySelector('.resolve-center'))).observe(root,{childList:true});
// Choisir un couvert est une décision explicite (même « Aucun ») ; la changer invalide le jet de couvert déjà validé.
document.addEventListener('click',event=>{if(attackState&&event.target.closest?.('[data-cover]')){attackState.coverChosen=true;attackState.coverRolled=false}},true);
// Ces blocages sont signalés par la pastille du bas et par le grisage : pas d'avertissement rouge déplacé en fin d'écran.
const placeBlockingWarningProcessBase=placeBlockingWarning;
placeBlockingWarning=function(){const issue=stepIssue();if(issue&&/^(Choisissez le couvert|Saisissez le jet de couvert|Validez les modifications)/.test(issue)){root.querySelectorAll('.resolve-center > .strict-warning').forEach(warning=>warning.remove());return}placeBlockingWarningProcessBase()};
const stepIssueProcessBase=stepIssue;
stepIssue=function(){
  const base=stepIssueProcessBase();if(base)return base;
  if(attackStep===2&&attackType()==='ranged'){
    if(!attackState.coverChosen)return 'Choisissez le couvert observé (Aucun, Léger ou Lourd).';
    const ctx=coverContext(),dice=Math.max(0,attackResults().hit-(ctx.profileLow?1:0));
    if(ctx.effective!=='none'&&dice>0&&!attackState.coverRolled)return `Saisissez le jet de couvert (${dice} dé(s)) puis validez-le.`;
  }
  if(attackStep===3&&attackState.modsIdle===false&&!attackState.modsConfirmed)return 'Validez les modifications (Impact, Armure, boucliers…) avant de poursuivre.';
  return null;
};
// Saisie d'un résultat de dé : active les vierges automatiques ; saisie manuelle des vierges : on les laisse tels quels.
['input','click'].forEach(type=>document.addEventListener(type,event=>{if(!attackState)return;const target=event.target,id=target?.id||target?.closest?.('[data-adjust]')?.dataset.adjust||'',map={rollHit:'roll',rollCrit:'roll',rollSurge:'roll',rollBlank:'roll',defBlock:'def',defSurge:'def',defBlank:'def'},step=map[id];if(!step)return;attackState.blankTouched=attackState.blankTouched||{};attackState.blankManual=attackState.blankManual||{};attackState.blankTouched[step]=true;if(id==='rollBlank'||id==='defBlank')attackState.blankManual[step]=true},true));
['input','click'].forEach(type=>document.addEventListener(type,event=>{if(event.target.closest?.('.resolve-center, .actions'))requestAnimationFrame(refreshResolveUi)},true));
// Encadré « Conversion Adrénaline » : replié en mode rapide, déplié sinon (comme « Règles qui interviennent »). L'état ouvert/fermé choisi par l'utilisateur est mémorisé pour la durée de l'attaque, car l'encadré est régénéré à chaque saisie.
const rollConversionFoldBase=rollConversionPanel;
rollConversionPanel=function(p,converted,critical){
  const html=rollConversionFoldBase(p,converted,critical),match=html.match(/^<div class="(automation-card rule-highlight roll-conversion-panel)">(<strong>[\s\S]*?<\/strong>)([\s\S]*)<\/div>$/);
  if(!match)return html;
  const open=attackState&&attackState.convOpen!==undefined?attackState.convOpen:!quickMode;
  return `<details class="${match[1]}" ${open?'open':''}><summary>${match[2]}${quickMode&&!open?'<em> · toucher pour le détail</em>':''}</summary>${match[3]}</details>`;
};
document.addEventListener('toggle',event=>{if(attackState&&event.target.matches?.('details.roll-conversion-panel'))attackState.convOpen=event.target.open;if(attackState&&event.target.matches?.('details.morale-fold'))attackState.moraleOpen=event.target.open},true);
const resolveTacticalBase=resolveScreen;
resolveScreen=function(){if(attackStep===0)prefillWeaponCounts();resolveTacticalBase();decorateTacticalResolution()};
const overviewActivationBase=overview;
overview=function(entry,role){overviewActivationBase(entry,role);if(role!=='attack'||defeated(entry))return;const actions=root.querySelector('.actions'),next=$('#next');if(!actions||!next||root.querySelector('[data-end-activation]'))return;const button=document.createElement('button');button.type='button';button.className='secondary';button.dataset.endActivation=entry.id;button.textContent='Terminer sans attaquer';button.onclick=()=>{markUnitActivated(entry);persistUnitStates();postRallyMoves.delete(entry.id);delete rallyDemoralizeSpent[entry.id];stage=1;stageWipe=true;pick('attacker')};actions.insertBefore(button,next)};

// Cartes d'activation présentes dans les listes de la partie : leurs effets
// modifient désormais le même état persistant que la résolution d'attaque.
const currentRound=()=>Math.max(1,Number(read('swl.game-tracker.v1',{round:1}).round)||1);
const exhausted=(state,card)=>Array.isArray(state.exhaustedCards)&&state.exhaustedCards.includes(card);
function updateUnitState(entry,patch){const state=stateFor(entry);unitStates[entry.id]={...state,...patch};persistUnitStates()}
function exhaustCard(entry,card,patch={}){const state=stateFor(entry);updateUnitState(entry,{...patch,exhaustedCards:[...new Set([...(state.exhaustedCards||[]),card])],roundSeen:currentRound()})}
function reconcileRoundEffects(){let changed=false;const round=currentRound();for(const entry of entries){const state=stateFor(entry);if((state.roundSeen||round)>=round)continue;const immobilize=Math.max(0,Number(state.immobilize)||0)+(state.burstOfSpeedRound&&state.burstOfSpeedRound<round?1:0);unitStates[entry.id]={...state,immobilize,aim:0,dodge:0,surge:0,standby:0,exhaustedCards:[],activationActions:[],activationSource:null,mandatoryMoveDone:false,burstOfSpeedRound:null,maxSpeedOverride:null,freeActionOffers:[],distractedBy:null,surveillance:0,effectLog:[],forceReadied:0,speedDelta:0,extraAction:false,roundSeen:round};unitStates[entry.id].dodge=Math.min(Number(state.dodge)||0,Number(state.keepDodge)||0);unitStates[entry.id].keepDodge=0;changed=true}if(changed)persistUnitStates()}
function activationAutomationPanel(entry){
  const state=stateFor(entry),buttons=[];
  if(hasCard(entry,'force reflexes'))buttons.push(`<button data-effect-kind="free" data-unit-effect="force-reflexes" ${exhausted(state,'force-reflexes')?'disabled':''}><b>RÉFLEXES DE LA FORCE</b><small>Action gratuite · +1 pion Esquive</small></button>`);
  if(hasCard(entry,'burst of speed'))buttons.push(`<button data-effect-kind="free" data-unit-effect="burst-of-speed" ${exhausted(state,'burst-of-speed')||discarded(state,'burst-of-speed')?'disabled':''}><b>POINTE DE VITESSE</b><small>Début d’activation · ${discarded(state,'burst-of-speed')?'CARTE SUPPRIMÉE de la partie (usage unique)':'✖ supprime la carte (une seule fois par partie)'} · Vitesse maximale 3 ce round · Immobilisation en phase finale</small></button>`);
  if(hasCard(entry,'offensive push')&&(state.activationActions||[]).includes('move'))buttons.push(`<button data-effect-kind="trigger" data-unit-effect="offensive-push" ${exhausted(state,'offensive-push')?'disabled':''}><b>POUSSÉE OFFENSIVE</b><small>Après le déplacement · inclinez pour gagner 1 pion Viser.</small></button>`);
  if(hasCard(entry,'linked targeting array'))buttons.push(`<button data-unit-effect="linked-targeting-array" ${exhausted(state,'linked-targeting-array')?'disabled':''}><b>SYSTÈME DE VISÉE JUMELÉ</b><small>Une fois par activation en ordre face visible : +1 pion Viser.</small></button>`);
  if(hasCard(entry,'emergency transponder')&&state.activationSource==='pool'&&!discarded(state,'emergency-transponder'))buttons.push(`<div class="effect-choice"><b>TRANSPONDEUR D’URGENCE</b><small>Début d’activation depuis la réserve d’ordres · ✖ supprime la carte (une seule fois par partie) :</small><button data-unit-effect="transponder-aim">+1 Viser</button><button data-unit-effect="transponder-dodge">+1 Esquive</button><button data-unit-effect="transponder-suppression" ${state.suppression?'':'disabled'}>−1 Suppression</button></div>`);
  if(hasCard(entry,'in the fray'))buttons.push(`<button data-effect-kind="reaction" data-unit-effect="in-the-fray"><b>DANS LA MÊLÉE</b><small>Réaction · Une unité ennemie commence son activation à portée 1 : +1 Adrénaline</small></button>`);
  if(hasCard(entry,'force choke')&&exhausted(state,'force-choke'))buttons.push(`<button data-effect-kind="free" data-unit-effect="force-choke-used" disabled><b>STRANGULATION DE LA FORCE</b><small>Déjà utilisée : carte inclinée (elle se redresse à la Phase Finale, ou par un effet qui redresse une amélioration). Utilisez « Réactiver » si elle a été redressée.</small></button>`);
  if(hasCard(entry,'force choke')&&!exhausted(state,'force-choke'))buttons.push(`<div class="effect-choice force-choke" data-effect-kind="free"><b>STRANGULATION DE LA FORCE</b><small>Action gratuite · choisissez une unité ennemie de soldats non Massive/Énorme à portée 1.</small>${entries.filter(target=>target.army!==entry.army&&!isVehicle(target)&&!defeated(target)).map(target=>`<button data-force-choke="${target.id}">1 blessure · ${entryName(target)}</button>`).join('')}</div>`);
  const actions=state.activationActions||[],actionFull=actions.length>=activationActionLimit(entry);
  if(hasCard(entry,'proton charge saboteur'))buttons.push(`<div class="effect-choice" data-effect-kind="action"><b>CHARGES À PROTONS</b><small>${state.protonCharges||0} pion(s) Charge placé(s) · Armer consomme une action.</small><button data-unit-effect="place-proton" ${actionFull||actions.includes('arm-proton')?'disabled':''}>Armer 1 charge</button><button data-unit-effect="detonate-proton" ${state.protonCharges?'':'disabled'}>Détoner une charge</button></div>`);
  if(hasCard(entry,'sonic charge saboteur'))buttons.push(`<div class="effect-choice" data-effect-kind="action"><b>CHARGES SONIQUES</b><small>${state.sonicCharges||0} pion(s) Charge placé(s) · Armer consomme une action.</small><button data-unit-effect="place-sonic" ${actionFull||actions.includes('arm-sonic')?'disabled':''}>Armer 1 charge</button><button data-unit-effect="detonate-sonic" ${state.sonicCharges?'':'disabled'}>Détoner une charge</button></div>`);
  const posture=postureMode(entry);
  if(posture==='offensive')buttons.push(`<button data-effect-kind="action" data-unit-effect="posture-aim" ${actionFull?'disabled':''}><b>POSTURE OFFENSIVE · ACTION VISER</b><small>Action Viser : +2 pions Viser au lieu de 1 · ne peut pas dépenser de pions Esquive</small></button>`);
  if(posture==='defensive')buttons.push(`<button data-effect-kind="action" data-unit-effect="posture-dodge" ${actionFull?'disabled':''}><b>POSTURE DÉFENSIVE · ACTION ESQUIVER</b><small>Action Esquiver : +2 pions Esquive au lieu de 1 · ne peut pas dépenser de pions Viser</small></button>`);
  return buttons.length?`<section class="activation-automation"><header><strong>AUTOMATISMES D’ACTIVATION</strong><small>Les effets appliqués mettent immédiatement à jour le suivi partagé.</small></header><div>${buttons.join('')}</div><footer><span>Viser <b>${state.aim||0}</b></span><span>Esquive <b>${state.dodge||0}</b></span><span>Adrénaline <b>${state.surge||0}</b></span>${state.maxSpeedOverride?`<span>Vitesse max. <b>${state.maxSpeedOverride}</b></span>`:''}</footer></section>`:''
}
function bindActivationAutomation(entry,role){
  root.querySelectorAll('[data-unit-effect]').forEach(button=>button.onclick=()=>{const state=stateFor(entry),actions=state.activationActions||[];switch(button.dataset.unitEffect){case'force-reflexes':exhaustCard(entry,'force-reflexes',{dodge:(state.dodge||0)+1});break;case'burst-of-speed':discardCard(entry,'burst-of-speed',{maxSpeedOverride:3,burstOfSpeedRound:currentRound()});break;case'offensive-push':exhaustCard(entry,'offensive-push',{aim:(state.aim||0)+1});break;case'linked-targeting-array':exhaustCard(entry,'linked-targeting-array',{aim:(state.aim||0)+1});break;case'transponder-aim':discardCard(entry,'emergency-transponder',{aim:(state.aim||0)+1});break;case'transponder-dodge':discardCard(entry,'emergency-transponder',{dodge:(state.dodge||0)+1});break;case'transponder-suppression':discardCard(entry,'emergency-transponder',{suppression:Math.max(0,state.suppression-1)});break;case'posture-aim':if(actions.length>=activationActionLimit(entry))return;updateUnitState(entry,{aim:(state.aim||0)+2,activationActions:[...actions,'aim'],roundSeen:currentRound()});break;case'posture-dodge':if(actions.length>=activationActionLimit(entry))return;updateUnitState(entry,{dodge:(state.dodge||0)+2,activationActions:[...actions,'dodge'],roundSeen:currentRound()});break;case'in-the-fray':updateUnitState(entry,{surge:(state.surge||0)+1,roundSeen:currentRound()});break;case'place-proton':if(actions.length>=activationActionLimit(entry)||actions.includes('arm-proton'))return;updateUnitState(entry,{protonCharges:(state.protonCharges||0)+1,activationActions:[...actions,'arm-proton'],roundSeen:currentRound()});break;case'detonate-proton':updateUnitState(entry,{protonCharges:Math.max(0,(state.protonCharges||0)-1)});break;case'place-sonic':if(actions.length>=activationActionLimit(entry)||actions.includes('arm-sonic'))return;updateUnitState(entry,{sonicCharges:(state.sonicCharges||0)+1,activationActions:[...actions,'arm-sonic'],roundSeen:currentRound()});break;case'detonate-sonic':updateUnitState(entry,{sonicCharges:Math.max(0,(state.sonicCharges||0)-1)});break}overview(entry,role)});
  root.querySelectorAll('[data-force-choke]').forEach(button=>button.onclick=()=>{const target=entries.find(candidate=>candidate.id===button.dataset.forceChoke);if(!target)return;exhaustCard(entry,'force-choke');persistUnitStates();overview(entry,role)})
}
// Mots-clés d'unité qui donnent ou retirent des pions : boutons d'application (une fois par round, ou à chaque déclenchement).
const KEYWORD_TOKEN_EFFECTS={
  'cible-x':{title:'CIBLE',when:'Après avoir reçu un ordre',effect:x=>`+${x} pion(s) Viser`,patch:(s,x)=>({aim:(s.aim||0)+x}),once:true},
  'defense-x':{title:'DÉFENSE',when:'Après avoir reçu un ordre',effect:x=>`+${x} pion(s) Esquive`,patch:(s,x)=>({dodge:(s.dodge||0)+x}),once:true},
  'fiable-x':{title:'FIABLE',when:'Début de la Phase d’Activation',effect:x=>`+${x} pion(s) Adrénaline`,patch:(s,x)=>({surge:(s.surge||0)+x}),once:true},
  'discipline-x':{title:'DISCIPLINÉ',when:'Après avoir reçu un ordre',effect:(x,s)=>`retire jusqu’à ${x} Suppression (actuellement ${s.suppression||0})`,patch:(s,x)=>({suppression:Math.max(0,(s.suppression||0)-x)}),once:true},
  'preste-x':{title:'PRESTE',when:'À chaque déplacement normal (action ou action gratuite)',effect:x=>`+${x} pion(s) Esquive`,patch:(s,x)=>({dodge:(s.dodge||0)+x}),once:false},
  'tacticien-x':{title:'TACTICIEN',when:'À chaque déplacement normal (action ou action gratuite)',effect:x=>`+${x} pion(s) Viser`,patch:(s,x)=>({aim:(s.aim||0)+x}),once:false},
  'operationnel-x':{title:'OPÉRATIONNEL',when:'Après une action Attendre',effect:x=>`+${x} pion(s) Viser`,patch:(s,x)=>({aim:(s.aim||0)+x}),once:false},
};
// ---- Lot 1 : actions de carte et effets qui donnent / retirent des pions à des unités alliées ----
// kind 'action' : consomme une action de l'activation ; 'end' : fin d'activation ; 'round' : une fois par round.
// pick : choix de cibles alliées (max, includeSelf, filtre) ; effect : pions gagnés (+) ou retirés (−) par cible ; self : effet sur l'unité qui agit.
const CARD_KEYWORD_ACTIONS={
  'vivacite-desprit':{title:'VIVACITÉ D’ESPRIT',kind:'action',text:'Action de carte : cette unité gagne 1 Viser et 1 Esquive.',self:{aim:1,dodge:1}},
  'observateur-x':{title:'OBSERVATEUR',kind:'action',text:x=>`Action de carte : jusqu’à ${x} unité(s) alliée(s) à portée 1 gagnent 1 Viser.`,pick:{max:x=>x,self:true,effect:{aim:1}}},
  'mettre-a-couvert-x':{title:'METTRE À COUVERT',kind:'action',text:x=>`Action de carte : jusqu’à ${x} unité(s) alliée(s) à portée 1 gagnent 1 Esquive.`,pick:{max:x=>x,self:true,effect:{dodge:1}}},
  'assistance-x':{title:'ASSISTANCE',kind:'action',text:x=>`Action de carte : jusqu’à ${x} unité(s) alliée(s) à portée 1 gagnent 1 Adrénaline.`,pick:{max:x=>x,self:true,effect:{surge:1}}},
  'stratege-x':{title:'STRATÈGE',kind:'action',text:x=>`Action de carte : cette unité gagne 1 Suppression, puis ${x} unité(s) alliée(s) à portée 1 gagnent 1 Viser et 1 Esquive.`,self:{suppression:1},pick:{max:x=>x,self:true,effect:{aim:1,dodge:1}}},
  'calcul-de-probabilites':{title:'CALCUL DE PROBABILITÉS',kind:'action',text:'Action de carte : 1 unité de soldats alliée à portée 1 et en LdV gagne 1 Viser, 1 Esquive et 1 Suppression.',pick:{max:()=>1,self:false,soldiersOnly:true,effect:{aim:1,dodge:1,suppression:1}}},
  'maitre-conteur':{title:'MAÎTRE CONTEUR',kind:'action',text:()=>`Action de carte : jusqu’à ${currentRound()} unité(s) alliée(s) à portée 1 (numéro du round) gagnent 2 Adrénaline.`,pick:{max:()=>currentRound(),self:true,effect:{surge:2}}},
  'inspiration-x':{title:'INSPIRATION',kind:'end',text:x=>`Fin d’activation : retirez au total jusqu’à ${x} Suppression à d’autres unités alliées à portée 2.`,pick:{max:x=>x,self:false,onlyWith:'suppression',effect:{suppression:-1}}},
  'escorte':{title:'ESCORTE',kind:'round',text:'Début de la Phase d’Activation, si l’unité/type indiqué par Escorte est à portée 2 : gagne 1 Viser OU 1 Esquive.',choices:[{label:'+1 Viser',effect:{aim:1}},{label:'+1 Esquive',effect:{dodge:1}}]},
  'infanterie-mecanisee':{title:'INFANTERIE MÉCANISÉE',kind:'round',text:'Début de la Phase d’Activation : avec un véhicule allié à portée 2, les deux unités gagnent 1 Viser OU 1 Esquive.',pick:{max:()=>1,self:false,vehiclesOnly:true,effect:null},choices:[{label:'Viser pour les deux',effect:{aim:1}},{label:'Esquive pour les deux',effect:{dodge:1}}]},
};
let kwActionPick=null;
const bumpTokens=(target,effect)=>{const state=stateFor(target),patch={};for(const [field,delta] of Object.entries(effect))patch[field]=Math.max(0,(state[field]||0)+delta);updateUnitState(target,patch)};
let kwPickCandidates=(entry,def)=>entries.filter(candidate=>!defeated(candidate)&&candidate.army===entry.army&&(def.pick.self||candidate.id!==entry.id)&&(!def.pick.soldiersOnly||!isVehicle(candidate))&&(!def.pick.vehiclesOnly||isVehicle(candidate))&&(!def.pick.onlyWith||(stateFor(candidate)[def.pick.onlyWith]||0)>0));
function cardActionButtons(entry,state,only){
  choiceEntry=entry;
  const actions=state.activationActions||[],actionFull=actions.length>=activationActionLimit(entry);
  return Object.entries(CARD_KEYWORD_ACTIONS).filter(([id])=>!only||only(id)).map(([id,def])=>{
    const x=keywordValue(entry,id);if(!x)return'';
    if(id==='armer-x'&&(hasCard(entry,'proton charge saboteur')||hasCard(entry,'sonic charge saboteur')))return'';
    if(def.kind==='setup'&&currentRound()>1)return'';
    const used=(!!def.card&&cardSpent(entry,def,state))||((def.kind==='setup'||def.once==='game')?(state.setupDone||[]).includes(id):(def.kind==='round'||def.kind==='roundfree')?exhausted(state,'kw-'+id):def.kind==='free'?false:(!def.repeatable&&actions.includes('card:'+id))||(def.kind==='end'&&exhausted(state,'kw-'+id))),blocked=(def.kind==='action'&&(actions.length+(def.cost||1)>activationActionLimit(entry))&&!used)||(!!def.needsTilted&&!tiltedChoices(entry).length&&!used)||(!!def.needs&&!(state[def.needs]>0)&&!used),label=typeof def.text==='function'?def.text(x):def.text;
    const open=kwActionPick&&kwActionPick.entryId===entry.id&&kwActionPick.id===id;
    let inner='';
    if(open){
      const candidates=def.pick?kwPickCandidates(entry,def):[],max=def.pick?def.pick.max(x):0,selected=kwActionPick.selected;
      if(def.pick)inner+=`<div class="kw-targets"><small>Choisissez jusqu’à ${max} unité(s) alliée(s) :</small>${candidates.length?candidates.map(candidate=>`<button type="button" class="${selected.includes(candidate.id)?'on':''}" data-kw-target="${candidate.id}">${entryName(candidate)}</button>`).join(''):'<em>Aucune unité éligible.</em>'}</div>`;
      if(def.choices)inner+=`<div class="kw-choices">${def.choices.map((choice,index)=>`<button type="button" class="primary" data-kw-choice="${index}" ${def.pick&&!selected.length?'disabled':''}>${choice.label}</button>`).join('')}</div>`;
      else inner+=`<div class="kw-choices"><button type="button" class="primary" data-kw-apply-action="${id}" ${def.pick&&!selected.length?'disabled':''}>Appliquer</button></div>`;
      inner+='<button type="button" class="secondary" data-kw-cancel-action>Annuler</button>';
    }
    return `<div class="kw-action ${open?'open':''}"><button type="button" data-card-action="${id}" ${used||blocked?'disabled':''}><b>${def.title}${keywords.find(item=>item.id===id)?.hasValue&&!VALUE_OPTIONAL_KEYWORDS.has(id)?' '+x:''}</b><small>${label}${used?(def.kind==='setup'?' · fait':' · déjà appliqué'):blocked?(def.needsTilted?' · aucune amélioration inclinée à redresser':def.needs&&!(state[def.needs]>0)?' · nécessite au moins 1 pion '+def.needsLabel:' · plus d’action disponible'):def.kind==='setup'?' · touchez quand c’est fait (mise en place, round 1)':''}</small></button>${inner}</div>`;
  }).filter(Boolean);
}
function applyCardKeywordAction(entry,id,choiceIndex){
  const def=CARD_KEYWORD_ACTIONS[id],x=keywordValue(entry,id),pick=kwActionPick&&kwActionPick.id===id?kwActionPick.selected:[];
  if(!def||!x)return;
  const choice=def.choices?def.choices[choiceIndex]:null,effect=choice?choice.effect:def.pick?.effect;
  if(def.self)bumpTokens(entry,def.self);
  const targets=pick.map(targetId=>entries.find(candidate=>candidate.id===targetId)).filter(Boolean).slice(0,def.pick?def.pick.max(x):0);
  for(const target of targets)if(effect)bumpTokens(target,effect);
  if(id==='infanterie-mecanisee'&&choice)bumpTokens(entry,choice.effect);
  if((id==='escorte'||!def.pick)&&choice&&choice.effect)bumpTokens(entry,choice.effect);
  const state=stateFor(entry);
  if(def.kind==='action')updateUnitState(entry,{activationActions:[...(state.activationActions||[]),def.recordAs||'card:'+id]});
  else exhaustCard(entry,'kw-'+id);
  kwActionPick=null;
}
// ---- Lot 2 : fin d'activation, boucliers, blessures, actions gratuites offertes, Distraire ----
Object.assign(CARD_KEYWORD_ACTIONS,{
  'surcharge':{title:'SURCHARGE',kind:'free',text:x=>`Début d’activation d’une unité alliée à portée ${x} : cette unité gagne 1 Suppression, l’unité alliée peut ignorer IA pendant son activation.`,self:{suppression:1},pick:{max:()=>1,self:false,effect:null,note:'ignore IA'}},
  'telle-est-la-voie':{title:'TELLE EST LA VOIE',kind:'free',text:x=>`Cette unité reçoit un ordre : jusqu’à ${x} autre(s) unité(s) alliée(s) à portée 2 effectuent gratuitement l’action indiquée par le mot-clé.`,pick:{max:x=>x,self:false,effect:null,offer:'l’action indiquée par Telle est la Voie'}},
  'conseils':{title:'CONSEILS',kind:'action',text:'Action de carte : 1 autre unité alliée du type indiqué, à portée 2, effectue une action gratuite autre qu’Attaquer.',pick:{max:()=>1,self:false,effect:null,offer:'une action gratuite (sauf Attaquer)'}},
  'tirer-les-ficelles':{title:'TIRER LES FICELLES',kind:'action',text:'Action de carte : 1 autre unité de soldats alliée à portée 2 effectue une action de carte gratuite ou un déplacement gratuit.',pick:{max:()=>1,self:false,soldiersOnly:true,effect:null,offer:'une action de carte gratuite ou un déplacement gratuit'}},
  'distraire':{title:'DISTRAIRE',kind:'roundfree',text:'Action de carte gratuite : 1 unité de soldats ennemie à portée 2 et en LdV doit, jusqu’à la fin du round, attaquer cette unité si possible.',pick:{max:()=>1,enemy:true,soldiersOnly:true,effect:null,distract:true}},
});
// candidats : alliés par défaut, ennemis pour Distraire
kwPickCandidates=function(entry,def){return entries.filter(candidate=>!defeated(candidate)&&(def.pick.enemy?candidate.army!==entry.army:candidate.army===entry.army)&&(def.pick.self||def.pick.enemy||candidate.id!==entry.id)&&(!def.pick.soldiersOnly||!isVehicle(candidate))&&(!def.pick.vehiclesOnly||isVehicle(candidate))&&(!def.pick.onlyWith||(stateFor(candidate)[def.pick.onlyWith]||0)>0))};
const applyCardActionBase=applyCardKeywordAction;
applyCardKeywordAction=function(entry,id,choiceIndex){
  const def=CARD_KEYWORD_ACTIONS[id];
  if(def?.pick&&(def.pick.offer||def.pick.distract)){
    const picked=(kwActionPick&&kwActionPick.id===id?kwActionPick.selected:[]).map(targetId=>entries.find(candidate=>candidate.id===targetId)).filter(Boolean);
    for(const target of picked){
      if(def.pick.offer){const state=stateFor(target);updateUnitState(target,{freeActionOffers:[...(state.freeActionOffers||[]),{id,label:def.pick.offer,from:entry.id}]})}
      if(def.pick.distract)updateUnitState(target,{distractedBy:entry.id})
    }
  }
  applyCardActionBase(entry,id,choiceIndex);
  // Actions gratuites : ne consomment pas l'action (surcharge, telle est la voie) ; Distraire : une fois par round.
  if(def&&(def.kind==='free')){const state=stateFor(entry);updateUnitState(entry,{exhaustedCards:(state.exhaustedCards||[]).filter(card=>card!=='kw-'+id)})}
};
// « roundfree » : une fois par round, sans consommer d'action

// Compteurs Blessure / Boucliers inactifs, formulaires de résolution de fin d'activation
let kw2Open=null;
const slugOf=name=>norm(name).replace(/ /g,'-');
function kw2Buttons(entry,state){
  const out=[],regen=keywordValue(entry,'regenerer-x'),recharge=keywordValue(entry,'recharger-x'),generator=keywordValue(entry,'generateur-x'),latent=keywordValue(entry,'pouvoir-latent'),forceX=keywordValue(entry,'maitre-de-la-force-x');
  const open=id=>kw2Open&&kw2Open.entryId===entry.id&&kw2Open.id===id?kw2Open:null;
  if(regen){const wounds=state.wound||0,dice=Math.min(wounds,regen),o=open('regen'),used=exhausted(state,'kw-regenerer-x');out.push(`<div class="kw-action ${o?'open':''}"><button type="button" data-kw2-open="regen" ${used?'disabled':''}><b>RÉGÉNÉRER ${regen}</b><small>Fin d’activation : lancez ${dice} dé(s) de défense blanc(s) (1 par pion Blessure, max ${regen}) ; chaque [BLOC] ou [ADR-DEF] retire 1 Blessure${used?' · déjà résolu ce round':''}</small></button>${o?(dice?`<label class="kw-input">Résultats BLOC ou ADR-DEF obtenus (0 à ${dice})<input type="number" min="0" max="${dice}" value="${o.value||0}" data-kw2-input></label><button type="button" class="primary" data-kw2-apply="regen">Retirer les Blessures</button>`:'<em>Aucun pion Blessure : rien à régénérer (renseignez les Blessures ci-dessous).</em>')+'<button type="button" class="secondary" data-kw2-cancel>Annuler</button>':''}</div>`)}
  for(const [id,x,when] of [['recharger-x',recharge,'Quand cette unité récupère'],['generateur-x',generator,'Phase Finale']]){if(!x)continue;const inactive=state.shieldOff||0,used=exhausted(state,'kw-'+id);out.push(`<div class="kw-action"><button type="button" data-kw2-flip="${id}" ${used||!inactive?'disabled':''}><b>${id==='recharger-x'?'RECHARGER':'GÉNÉRATEUR'} ${x}</b><small>${when} : retournez jusqu’à ${x} Bouclier(s) inactif(s) côté actif (${inactive} inactif(s), ${state.shield||0} actif(s))${used?' · déjà résolu ce round':''}</small></button></div>`)}
  if(latent){const o=open('latent'),used=exhausted(state,'kw-pouvoir-latent'),stage=o?.stage||0;out.push(`<div class="kw-action ${o?'open':''}"><button type="button" data-kw2-open="latent" ${used?'disabled':''}><b>POUVOIR LATENT</b><small>Fin d’activation : gagnez 1 Suppression pour lancer 1 dé de défense rouge${used?' · déjà utilisé ce round':''}</small></button>${o?(stage===0?'<button type="button" class="primary" data-kw2-latent="start">Gagner 1 Suppression et lancer le dé</button>':stage===1?'<div class="kw-choices"><small>Résultat du dé rouge :</small><button type="button" class="primary" data-kw2-latent="surge">[ADR-DEF] : ennemi à portée 1</button><button type="button" class="primary" data-kw2-latent="blank">Vierge : soigner un allié</button><button type="button" class="secondary" data-kw2-latent="other">Autre résultat</button></div>':stage==='surge'?'<div class="kw-targets"><small>Unité ennemie à portée 1 : +2 Suppression et +2 Immobilisation</small>'+entries.filter(candidate=>candidate.army!==entry.army&&!defeated(candidate)).map(candidate=>`<button type="button" data-kw2-latent-target="${candidate.id}">${entryName(candidate)}</button>`).join('')+'</div>':'<div class="kw-targets"><small>Soldat non-droïde allié à portée 1 : retire 1 Blessure ou 1 Poison</small>'+entries.filter(candidate=>candidate.army===entry.army&&!defeated(candidate)&&!isVehicle(candidate)).map(candidate=>`<button type="button" data-kw2-latent-heal="${candidate.id}:wound">${entryName(candidate)} · −1 Blessure</button><button type="button" data-kw2-latent-heal="${candidate.id}:poison">${entryName(candidate)} · −1 Poison</button>`).join('')+'</div>')+'<button type="button" class="secondary" data-kw2-cancel>Annuler</button>':''}</div>`)}
  if(forceX){const readied=state.forceReadied||0,cards=(state.exhaustedCards||[]).filter(card=>!card.startsWith('kw-')&&(entry.unit.upgrades||[]).some(up=>slugOf(up.name)===card));out.push(`<div class="kw-action ${cards.length?'open':''}"><button type="button" disabled><b>MAÎTRE DE LA FORCE ${forceX}</b><small>Fin d’activation : redressez jusqu’à ${forceX} carte(s) Force inclinée(s) (${readied}/${forceX} déjà redressée(s))</small></button>${cards.length?`<div class="kw-choices">${cards.map(card=>{const up=(entry.unit.upgrades||[]).find(item=>slugOf(item.name)===card);return `<button type="button" class="primary" data-kw2-ready="${card}" ${readied>=forceX?'disabled':''}>Redresser ${displayName(up.name)}</button>`}).join('')}</div>`:'<em>Aucune carte Force inclinée.</em>'}</div>`)}
  return out;
}
function kw2Counters(entry,state){
  if(!['regenerer-x','recharger-x','generateur-x','blessure-x'].some(id=>keywordValue(entry,id)))return'';
  const counter=(field,label)=>`<span class="kw-counter">${label}<button type="button" data-kw-counter="${field}:-1" aria-label="Retirer">−</button><b>${state[field]||0}</b><button type="button" data-kw-counter="${field}:1" aria-label="Ajouter">+</button></span>`;
  return `<div class="kw-counters">${counter('wound','Blessures')}<span class="kw-counter">Boucliers actifs<b>${state.shield||0}</b></span>${counter('shieldOff','Boucliers inactifs')}</div>`;
}
function bindKeywordLot2(entry,role){
  const refresh=()=>overview(entry,role);
  root.querySelectorAll('[data-kw-counter]').forEach(button=>button.onclick=()=>{const [field,delta]=button.dataset.kwCounter.split(':'),state=stateFor(entry);updateUnitState(entry,{[field]:Math.max(0,(state[field]||0)+Number(delta))});refresh()});
  root.querySelectorAll('[data-kw2-cycle]').forEach(button=>button.onclick=()=>{const state=stateFor(entry),cycleSlugs=(entry.unit.upgrades||[]).filter(up=>cardTags(up.name).some(tag=>tag.keywordId==='cycle')).map(up=>slugOf(up.name));updateUnitState(entry,{exhaustedCards:(state.exhaustedCards||[]).filter(card=>!cycleSlugs.includes(card))});refresh()});
  root.querySelectorAll('[data-kw2-open]').forEach(button=>button.onclick=()=>{kw2Open={entryId:entry.id,id:button.dataset.kw2Open,stage:0,value:0};refresh()});
  root.querySelectorAll('[data-kw2-input]').forEach(input=>input.oninput=()=>{if(kw2Open)kw2Open.value=Number(input.value)||0});
  root.querySelectorAll('[data-kw2-cancel]').forEach(button=>button.onclick=()=>{kw2Open=null;refresh()});
  root.querySelectorAll('[data-kw2-apply="regen"]').forEach(button=>button.onclick=()=>{const state=stateFor(entry),dice=Math.min(state.wound||0,keywordValue(entry,'regenerer-x')),removed=Math.max(0,Math.min(dice,Number(kw2Open?.value)||0));exhaustCard(entry,'kw-regenerer-x',{wound:Math.max(0,(state.wound||0)-removed)});kw2Open=null;refresh()});
  root.querySelectorAll('[data-kw2-flip]').forEach(button=>button.onclick=()=>{const id=button.dataset.kw2Flip,state=stateFor(entry),n=Math.min(keywordValue(entry,id),state.shieldOff||0);exhaustCard(entry,'kw-'+id,{shield:(state.shield||0)+n,shieldOff:(state.shieldOff||0)-n});refresh()});
  root.querySelectorAll('[data-kw2-latent]').forEach(button=>button.onclick=()=>{const step=button.dataset.kw2Latent;if(step==='start'){bumpTokens(entry,{suppression:1});kw2Open.stage=1}else if(step==='other'){exhaustCard(entry,'kw-pouvoir-latent');kw2Open=null}else kw2Open.stage=step;refresh()});
  root.querySelectorAll('[data-kw2-latent-target]').forEach(button=>button.onclick=()=>{const target=entries.find(candidate=>candidate.id===button.dataset.kw2LatentTarget);if(target)bumpTokens(target,{suppression:2,immobilize:2});exhaustCard(entry,'kw-pouvoir-latent');kw2Open=null;refresh()});
  root.querySelectorAll('[data-kw2-latent-heal]').forEach(button=>button.onclick=()=>{const [targetId,field]=button.dataset.kw2LatentHeal.split(':'),target=entries.find(candidate=>candidate.id===targetId);if(target)bumpTokens(target,{[field]:-1});exhaustCard(entry,'kw-pouvoir-latent');kw2Open=null;refresh()});
  root.querySelectorAll('[data-kw2-ready]').forEach(button=>button.onclick=()=>{const state=stateFor(entry);updateUnitState(entry,{exhaustedCards:(state.exhaustedCards||[]).filter(card=>card!==button.dataset.kw2Ready),forceReadied:(state.forceReadied||0)+1});refresh()});
  root.querySelectorAll('[data-offer-done]').forEach(button=>button.onclick=()=>{const state=stateFor(entry),offers=[...(state.freeActionOffers||[])];offers.splice(Number(button.dataset.offerDone),1);updateUnitState(entry,{freeActionOffers:offers});refresh()});
  root.querySelectorAll('[data-distract-clear]').forEach(button=>button.onclick=()=>{updateUnitState(entry,{distractedBy:null});refresh()});
}
// Actions gratuites offertes par d'autres unités, et Distraire subi : rappel + bouton « effectuée »
function offersPanelHtml(entry){
  const state=stateFor(entry),offers=state.freeActionOffers||[],source=state.distractedBy?entries.find(candidate=>candidate.id===state.distractedBy):null;
  const loot=state.lootFrom&&entries.find(candidate=>candidate.id===state.lootFrom),scout=state.scoutFrom&&entries.find(candidate=>candidate.id===state.scoutFrom);
  if(!offers.length&&!source&&!loot&&!scout)return'';
  return `<section class="activation-automation keyword-offers"><header><strong>ACTIONS OFFERTES · CONTRAINTES</strong><small>Effets d’autres unités qui concernent celle-ci ce round.</small></header><div>${offers.map((offer,index)=>{const from=entries.find(candidate=>candidate.id===offer.from);return `<button type="button" data-offer-done="${index}"><b>ACTION GRATUITE OFFERTE</b><small>${from?entryName(from):'Une unité alliée'} vous permet d’effectuer ${offer.label}. Touchez quand c’est fait.</small></button>`}).join('')}${loot?`<div class="distract-note loot"><b>PION BUTIN</b><small>Prime de ${entryName(loot)} : vaincre une unité qui porte un pion Prime rapporte 1 PV.</small></div>`:''}${scout?`<div class="distract-note scout"><b>ÉCLAIREUR ACCORDÉ</b><small>Par ${entryName(scout)} (Équipe d’éclaireurs) : peut se déployer avec un déplacement gratuit au début de l’étape Effectuer des actions.</small></div>`:''}${source?`<div class="distract-note"><b>DISTRAITE</b><small>Jusqu’à la fin du round, cette unité doit attaquer ${entryName(source)} si possible.</small><button type="button" class="secondary" data-distract-clear>Fin de l’effet</button></div>`:''}</div></section>`;
}
// ---- Lot 3 : mise en place (round 1) : effets appliqués une seule fois, avec suivi « fait » ----
const setupText=id=>()=>keywords.find(item=>item.id===id)?.shortDefinition||'';
Object.assign(CARD_KEYWORD_ACTIONS,{
  'blessure-x':{title:'BLESSURE',kind:'setup',text:x=>`Première entrée en jeu : cette unité subit ${x} Blessure(s) (compteur Blessures).`,selfX:'wound'},
  'position-preparee':{title:'POSITION PRÉPARÉE',kind:'setup',text:'Mise en place : Chef puis unité en cohésion en territoire allié ; gagne ensuite 1 pion Esquive.',self:{dodge:1}},
  'prime':{title:'PRIME',kind:'setup',text:'Mise en place : une unité Commandement/Opérative ennemie gagne un pion Butin (vaincre une unité Prime rapporte 1 PV).',pick:{max:()=>1,enemy:true,effect:null,mark:'lootFrom'}},
  'equipe-declaireurs-x':{title:'ÉQUIPE D’ÉCLAIREURS',kind:'setup',text:x=>`Mise en place : jusqu’à ${x} unité(s) de soldats alliée(s) sans Éclaireur gagnent Éclaireur ${x} pour la partie.`,pick:{max:x=>x,self:false,soldiersOnly:true,effect:null,mark:'scoutFrom'}},
  'eclaireur-x':{title:'ÉCLAIREUR',kind:'setup',text:x=>`Non déployée : au début de l’étape Effectuer des actions, se déploie avec un déplacement gratuit à vitesse ${x} (ignore le terrain difficile).`},
  'alter-ego':{title:'ALTER EGO',kind:'setup',text:setupText('alter-ego')},
  'cache':{title:'CACHE',kind:'setup',text:setupText('cache')},
  'infiltration':{title:'INFILTRATION',kind:'setup',text:setupText('infiltration')},
  'operations-secretes':{title:'OPÉRATIONS SECRÈTES',kind:'setup',text:setupText('operations-secretes')},
  'transport':{title:'TRANSPORT',kind:'setup',text:setupText('transport')},
  'transport-leger-x':{title:'TRANSPORT LÉGER',kind:'setup',text:x=>`Transporte jusqu’à ${x} unité(s) alliée(s) d’une seule figurine sur petit socle.`},
  'traque':{title:'TRAQUE',kind:'setup',text:setupText('traque')},
});
const applyCardActionLot2=applyCardKeywordAction;
applyCardKeywordAction=function(entry,id,choiceIndex){
  const def=CARD_KEYWORD_ACTIONS[id];
  if(!def||def.kind!=='setup')return applyCardActionLot2(entry,id,choiceIndex);
  const x=keywordValue(entry,id),picked=(kwActionPick&&kwActionPick.id===id?kwActionPick.selected:[]).map(targetId=>entries.find(candidate=>candidate.id===targetId)).filter(Boolean);
  if(def.self)bumpTokens(entry,def.self);
  if(def.selfX)bumpTokens(entry,{[def.selfX]:x});
  if(def.pick?.mark)for(const target of picked)updateUnitState(target,{[def.pick.mark]:entry.id});
  const state=stateFor(entry);
  updateUnitState(entry,{setupDone:[...(state.setupDone||[]),id]});
  kwActionPick=null;
};
// ---- Lots 4 et 5 : Phase de Commandement, vitesse et déplacements obligatoires ----
const glossaryText=id=>()=>keywords.find(item=>item.id===id)?.shortDefinition||'';
Object.assign(CARD_KEYWORD_ACTIONS,{
  // Lot 4 : Phase de Commandement (une fois par round, suivi « résolu »)
  'autoritaire':{title:'AUTORITAIRE',kind:'round',text:'Phase de Commandement : au lieu de recevoir un ordre, cette unité le donne à une autre unité alliée à portée 1-2.',pick:{max:()=>1,self:false,effect:null,offer:'un ordre reçu par Autoritaire'}},
  'coordination':{title:'COORDINATION',kind:'round',text:'Après avoir reçu un ordre : donne un ordre à une unité alliée à portée 1 du nom/type indiqué (un seul ordre).',pick:{max:()=>1,self:false,effect:null,offer:'un ordre reçu par Coordination'}},
  'ordre-direct':{title:'ORDRE DIRECT',kind:'round',text:'Phase de Commandement : donne un ordre à une unité alliée à portée 2 du nom/type indiqué.',pick:{max:()=>1,self:false,effect:null,offer:'un ordre reçu par Ordre direct'}},
  'entourage':{title:'ENTOURAGE',kind:'round',text:'Phase de Commandement : donne un ordre à l’unité indiquée à portée 2 (elle ignore le prérequis de rang Commandement pour lui prêter main-forte).',pick:{max:()=>1,self:false,effect:null,offer:'un ordre reçu par Entourage'}},
  'inarretable':{title:'INARRÊTABLE',kind:'round',text:glossaryText('inarretable')},
  'interrogatoire':{title:'INTERROGATOIRE',kind:'round',text:glossaryText('interrogatoire')},
  'malin':{title:'MALIN',kind:'round',text:glossaryText('malin')},
  'longueur-davance':{title:'LONGUEUR D’AVANCE',kind:'round',text:glossaryText('longueur-davance')},
  'divulgation':{title:'DIVULGATION',kind:'round',text:glossaryText('divulgation')},
  'mission-secrete':{title:'MISSION SECRÈTE',kind:'round',text:'Début de la Phase de Commandement, entièrement en territoire ennemi : gagne 1 pion Mission secrète (une seule fois par partie).',selfX:'secretMission',once:'game'},
  // Lot 5 : vitesse, action supplémentaire, déplacement obligatoire
  'attaque-impetueuse':{title:'ATTAQUE IMPÉTUEUSE',kind:'roundfree',text:'Début d’activation : vitesse maximale +1 ou −1 jusqu’à la fin de l’activation.',choices:[{label:'Vitesse +1',speedDelta:1},{label:'Vitesse −1',speedDelta:-1}]},
  'marche-forcee':{title:'MARCHE FORCÉE',kind:'roundfree',text:'En se déplaçant : 1 Suppression pour +1 vitesse maximale (max 3). Les bonus s’appliquent avant les malus (Immobilisation).',self:{suppression:1},speedDelta:1},
  'mode-roue':{title:'MODE ROUE',kind:'roundfree',text:'Début d’activation : vitesse 3 jusqu’à la fin de l’activation ; jusqu’à la fin du round perd Indifférent, gagne IA : Déplacement et Couvert 2, ne retourne plus ses Boucliers actifs.',speedSet:3},
  'maitrise-du-juyo':{title:'MAÎTRISE DU JUYO',kind:'roundfree',text:'Avec au moins 1 pion Blessure : 1 action supplémentaire par activation (jamais plus de deux déplacements, gratuits inclus).',extraAction:true,needs:'wound',needsLabel:'Blessure'},
  'saut-x':{title:'SAUT',kind:'action',recordAs:'move',repeatable:true,text:x=>`Action de carte (chaque fois qu’un déplacement est possible) : déplacement normal ignorant le terrain difficile et les figurines de hauteur ≤ ${x}.`},
  'mobile':{title:'MOBILE',kind:'roundfree',text:'Déplacement obligatoire gratuit (début ou fin de l’étape Effectuer des actions) : déplacement normal complet, jamais en arrière.',flag:'mandatoryMoveDone'},
  'speeder-x':{title:'SPEEDER',kind:'roundfree',text:x=>`Déplacement obligatoire gratuit (début ou fin de l’étape Effectuer des actions) ; terrain de hauteur ≤ ${x} franchissable.`,flag:'mandatoryMoveDone'},
  'deplacement-obligatoire':{title:'DÉPLACEMENT OBLIGATOIRE',kind:'roundfree',text:'Action Se déplacer gratuite imposée : déplacement normal complet à vitesse maximale (ou le plus loin possible).',flag:'mandatoryMoveDone'},
});
const applyCardActionLot3=applyCardKeywordAction;
applyCardKeywordAction=function(entry,id,choiceIndex){
  const def=CARD_KEYWORD_ACTIONS[id];
  if(def&&(def.speedDelta||def.speedSet||def.choices?.[choiceIndex]?.speedDelta||def.extraAction||def.flag)){
    const state=stateFor(entry),delta=def.speedDelta||def.choices?.[choiceIndex]?.speedDelta||0,patch={};
    if(delta)patch.speedDelta=(state.speedDelta||0)+delta;
    if(def.speedSet)patch.maxSpeedOverride=def.speedSet;
    if(def.extraAction)patch.extraAction=true;
    if(def.flag)patch[def.flag]=true;
    updateUnitState(entry,patch);
  }
  if(def&&def.once==='game'){
    const state=stateFor(entry),x=keywordValue(entry,id);
    if(def.selfX)bumpTokens(entry,{[def.selfX]:x});
    updateUnitState(entry,{setupDone:[...(state.setupDone||[]),id]});
    return;
  }
  return applyCardActionLot3(entry,id,choiceIndex);
};
const MOVE_RULES={'mobilite-difficile':'Une seule action Se déplacer par activation','stationnaire':'Ne peut pas se déplacer (pivot seulement)','cloue-au-sol':'Ne peut pas escalader','alourdissement':'Saut interdit avec un pion Objectif','ascension':'Escalade : hauteur verticale 2','grimpeur-experimente':'Franchit une hauteur de 2 en grimpant','vehicule-grimpant':'Compté comme soldat pour grimper','pivot-complet':'Pivote jusqu’à 360°','redeploiement':'Pivote avant ou après le déplacement','sans-entrave':'Ignore la réduction de vitesse du terrain difficile','sustentation':'Peut Attendre et reculer','retrait':'Engagée avec un seul ennemi : peut se déplacer'};
function movementRulesHtml(entry){
  const state=stateFor(entry),chips=Object.entries(MOVE_RULES).filter(([id])=>keywordValue(entry,id)).map(([id,text])=>`<span class="move-chip"><b>${keywords.find(item=>item.id===id)?.name.replace(/ :.*$/,'')||id}</b> ${text}</span>`);
  const speed=state.speedDelta?`<span class="move-chip active"><b>Vitesse maximale</b> ${state.speedDelta>0?'+':''}${state.speedDelta} jusqu’à la fin de l’activation</span>`:'';
  const mandatory=['mobile','speeder-x','deplacement-obligatoire'].some(id=>keywordValue(entry,id))&&!state.mandatoryMoveDone?'<span class="move-chip warn"><b>Déplacement obligatoire</b> à effectuer ce round (début ou fin de l’étape Effectuer des actions)</span>':'';
  return chips.length||speed||mandatory?`<div class="move-rules">${speed}${mandatory}${chips.join('')}</div>`:'';
}
// ---- Lot 6 : réactions, actions de carte de soin, Cycle, Autonome, Renforts ----
Object.assign(CARD_KEYWORD_ACTIONS,{
  'autonome':{title:'AUTONOME',kind:'round',text:'Début de la Phase d’Activation, sans pion Ordre : gagne les pions indiqués sur la carte (ex. Viser 1 ou Esquive 1) ou effectue l’action indiquée en action gratuite.',choices:[{label:'+1 Viser',effect:{aim:1}},{label:'+1 Esquive',effect:{dodge:1}},{label:'Action gratuite indiquée (rien à appliquer)',effect:{}}]},
  'renforts':{title:'RENFORTS',kind:'setup',text:'Début de la Phase Finale du round 1 : déplacement gratuit à vitesse 1.'},
  'sentinelle':{title:'SENTINELLE',kind:'free',text:'Réaction : dépense 1 pion En attente après une attaque, un déplacement ou une action ennemie à portée 3 (au lieu de 2).',self:{standby:-1},needs:'standby',needsLabel:'En attente'},
  'traiter-x':{title:'TRAITER',kind:'action',text:x=>`Action de carte : 1 soldat non-droïde allié à portée 1 et en LdV perd jusqu’à ${x} Blessure(s) et/ou Poison ; placez 1 pion Blessure sur la carte (Capacité Y).`,cardWound:true,pick:{max:()=>1,self:true,effect:null},choices:[{label:'Retirer des Blessures',effectFn:x=>({wound:-x})},{label:'Retirer du Poison',effectFn:x=>({poison:-x})}]},
  'reparation-x':{title:'RÉPARATION',kind:'action',text:x=>`Action de carte : 1 droïde ou véhicule allié à portée 1 et en LdV perd jusqu’à ${x} Blessure(s) / Ionique ; placez 1 pion Blessure sur la carte (Capacité Y).`,cardWound:true,pick:{max:()=>1,self:true,effect:null},choices:[{label:'Retirer des Blessures',effectFn:x=>({wound:-x})},{label:'Retirer de l’Ionique',effectFn:x=>({ion:-x})}]},
  'armer-x':{title:'ARMER',kind:'action',text:x=>`Action : placez ${x} pion(s) Charge à portée 1 et en LdV de votre Chef (compteur Charges placées).`,selfX:'charge'},
  'aide':{title:'AIDE',kind:'free',text:'Quand cette unité devrait gagner Viser/Esquive/Adrénaline, une autre unité alliée à portée 1 et en LdV peut le gagner à la place ; cette unité gagne 1 Suppression.',self:{suppression:1},pick:{max:()=>1,self:false,effect:null},choices:[{label:'Viser à l’allié',effect:{aim:1}},{label:'Esquive à l’allié',effect:{dodge:1}},{label:'Adrénaline à l’allié',effect:{surge:1}}]},
  'impitoyable':{title:'IMPITOYABLE',kind:'free',text:'Une autre unité de soldats alliée à portée 2 et en LdV, avec un pion Ordre face visible, s’active : elle subit 1 Blessure pour effectuer 1 action gratuite.',pick:{max:()=>1,self:false,soldiersOnly:true,effect:{wound:1},offer:'1 action gratuite (Impitoyable)'}},
  'travail-dequipe':{title:'TRAVAIL D’ÉQUIPE',kind:'free',text:'À portée 2 de l’unité indiquée : si l’une gagne Viser ou Esquive, l’autre gagne le même pion.',pick:{max:()=>1,self:false,effect:null},choices:[{label:'Viser au partenaire',effect:{aim:1}},{label:'Esquive au partenaire',effect:{dodge:1}}]},
});
Object.assign(CARD_KEYWORD_ACTIONS,{
  'ia':{title:'IA',kind:'round',text:glossaryText('ia')},
  'je-fais-aussi-partie-de-lequipe':{title:'JE FAIS AUSSI PARTIE DE L’ÉQUIPE',kind:'action',text:glossaryText('je-fais-aussi-partie-de-lequipe')},
  'reconfiguration':{title:'RECONFIGURATION',kind:'roundfree',text:'En récupérant : retournez la carte sur son autre face (en plus de l’effet de Récupérer).',self:{reconfig:1}},
  'pions-bane':{title:'PIONS BANE',kind:'action',text:'Cad Bane pose jusqu’à 3 pions Bane (compteur des pions posés).',selfX:'bane'},
});
const applyCardActionLot45=applyCardKeywordAction;
applyCardKeywordAction=function(entry,id,choiceIndex){
  const def=CARD_KEYWORD_ACTIONS[id],x=keywordValue(entry,id);
  if(def&&def.choices&&def.choices[choiceIndex]?.effectFn){const choice=def.choices[choiceIndex];def.choices[choiceIndex]={...choice,effect:choice.effectFn(x)}}
  if(def&&def.selfX&&def.kind==='action'){bumpTokens(entry,{[def.selfX]:x})}
  if(def&&def.cardWound){bumpTokens(entry,{cardWound:1})}
  const result=applyCardActionLot45(entry,id,choiceIndex);
  return result;
};
// Cycle : fin d'activation, redresse les cartes Amélioration à mot-clé Cycle inclinées
function cycleButton(entry,state){
  const cycleCards=(entry.unit.upgrades||[]).filter(up=>cardTags(up.name).some(tag=>tag.keywordId==='cycle')&&(state.exhaustedCards||[]).includes(slugOf(up.name)));
  if(!(entry.unit.upgrades||[]).some(up=>cardTags(up.name).some(tag=>tag.keywordId==='cycle')))return'';
  return `<div class="kw-action"><button type="button" data-kw2-cycle ${cycleCards.length?'':'disabled'}><b>CYCLE</b><small>Fin d’activation : redressez les cartes Cycle inclinées non utilisées pendant cette activation${cycleCards.length?' · '+cycleCards.map(up=>displayName(up.name)).join(', '):' · aucune carte inclinée'}</small></button></div>`;
}
function keywordAutomationPanel(entry){
  const state=stateFor(entry),buttons=Object.entries(KEYWORD_TOKEN_EFFECTS).map(([id,fx])=>{const x=keywordValue(entry,id);if(!x)return'';const used=fx.once&&exhausted(state,'kw-'+id);return `<button data-kw-apply="${id}" ${used?'disabled':''}><b>${fx.title} ${x}</b><small>${fx.when} · ${fx.effect(x,state)}${used?' · déjà appliqué ce round':fx.once?' · une fois par round':''}</small></button>`}).filter(Boolean);
  const cardActions=[...cardActionButtons(entry,state),...kw2Buttons(entry,state),cycleButton(entry,state)].filter(Boolean);
  return buttons.length||cardActions.length?`<section class="activation-automation keyword-automation"><header><strong>AUTOMATISMES DES MOTS-CLÉS</strong><small>Appliquez l’effet au bon moment : le suivi des pions est mis à jour.</small></header><div>${buttons.join('')}${cardActions.join('')}</div>${kw2Counters(entry,state)}<footer><span>Viser <b>${state.aim||0}</b></span><span>Esquive <b>${state.dodge||0}</b></span><span>Adrénaline <b>${state.surge||0}</b></span><span>Suppression <b>${state.suppression||0}</b></span></footer></section>`:''
}
function bindKeywordAutomation(entry,role){
  bindKeywordLot2(entry,role);
  root.querySelectorAll('[data-card-action]').forEach(button=>button.onclick=()=>{const id=button.dataset.cardAction,def=CARD_KEYWORD_ACTIONS[id];if(!def)return;if(!def.pick&&!def.choices){applyCardKeywordAction(entry,id,0);overview(entry,role);return}kwActionPick={entryId:entry.id,id,selected:[]};overview(entry,role)});
  root.querySelectorAll('[data-kw-target]').forEach(button=>button.onclick=()=>{if(!kwActionPick)return;const def=CARD_KEYWORD_ACTIONS[kwActionPick.id],max=def.pick.max(keywordValue(entry,kwActionPick.id)),list=kwActionPick.selected,targetId=button.dataset.kwTarget;kwActionPick.selected=list.includes(targetId)?list.filter(item=>item!==targetId):list.length<max?[...list,targetId]:list;overview(entry,role)});
  root.querySelectorAll('[data-kw-apply-action]').forEach(button=>button.onclick=()=>{applyCardKeywordAction(entry,button.dataset.kwApplyAction,0);overview(entry,role)});
  root.querySelectorAll('[data-kw-choice]').forEach(button=>button.onclick=()=>{if(!kwActionPick)return;applyCardKeywordAction(entry,kwActionPick.id,Number(button.dataset.kwChoice));overview(entry,role)});
  root.querySelectorAll('[data-kw-cancel-action]').forEach(button=>button.onclick=()=>{kwActionPick=null;overview(entry,role)});
  root.querySelectorAll('[data-kw-apply]').forEach(button=>button.onclick=()=>{const id=button.dataset.kwApply,fx=KEYWORD_TOKEN_EFFECTS[id],x=keywordValue(entry,id),state=stateFor(entry);if(!fx||!x)return;const patch=fx.patch(state,x);if(fx.once)exhaustCard(entry,'kw-'+id,patch);else updateUnitState(entry,patch);overview(entry,role)})
}
// Annuler une application faite par erreur (ex. Autonome : le bouton passe en « déjà appliqué » et n'est plus cliquable).
// Chaque bouton d'automatisme mémorise ce qu'il a modifié (pions, cartes utilisées, actions) ; « ANNULER » le défait et rend le bouton de nouveau disponible.
const kwUndoKey='swl.kw-undo.v1';
const kwUndoLog=(()=>{try{const list=JSON.parse(localStorage.getItem(kwUndoKey)||'[]');return Array.isArray(list)?list:[]}catch{return[]}})();
const kwUndoSave=()=>{try{localStorage.setItem(kwUndoKey,JSON.stringify(kwUndoLog))}catch{}};
const kwSame=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function kwDiff(before,after){
  const diffs=[];
  for(const id of new Set([...Object.keys(before),...Object.keys(after)])){
    const b=before[id]||{},a=after[id]||{},fields={};
    for(const key of new Set([...Object.keys(b),...Object.keys(a)])){
      if(key==='roundSeen')continue;
      const x=b[key],y=a[key];
      if(kwSame(x,y))continue;
      if(typeof y==='number'&&(typeof x==='number'||x===undefined))fields[key]={delta:y-(x||0),was:x||0};
      else if(Array.isArray(y)&&(Array.isArray(x)||x===undefined)){const rest=[...(x||[])],added=[];for(const item of y){const at=rest.findIndex(other=>kwSame(other,item));if(at>=0)rest.splice(at,1);else added.push(item)}fields[key]={added,removed:rest}}
      else fields[key]={from:x===undefined?null:x,to:y}
    }
    if(Object.keys(fields).length)diffs.push({id,fields})
  }
  return diffs
}
function kwUndoLast(entryId){
  const round=currentRound(),at=kwUndoLog.map(item=>item.entryId===entryId&&item.round===round).lastIndexOf(true);
  if(at<0)return;
  const [item]=kwUndoLog.splice(at,1);
  for(const {id,fields} of item.diffs){
    const state=unitStates[id]||{},patch={};
    for(const [key,change] of Object.entries(fields)){
      const current=state[key];
      if('delta' in change){const value=(current||0)-change.delta;patch[key]=change.was>=0?Math.max(0,value):value}
      else if('added' in change){const list=[...(Array.isArray(current)?current:[])];for(const value of change.added){const index=list.findIndex(other=>kwSame(other,value));if(index>=0)list.splice(index,1)}patch[key]=[...list,...change.removed]}
      else if(kwSame(current,change.to))patch[key]=change.from
    }
    unitStates[id]={...state,...patch}
  }
  persistUnitStates();kwUndoSave()
}
// ---- Déclencheurs qui dépendent d'AUTRES unités (audit « où remonte chaque mot-clé », 20/09/2026) ----
// Un mot-clé porté par une unité alliée ou ennemie qui n'attaque pas et ne défend pas ne s'affichait nulle part
// (Exemplaire, Tir de Soutien, La Victoire ou la Mort, Nous nous Battons pour notre Famille…). Ils sont maintenant rappelés
// à l'étape où ils agissent : « start » = étape Armes (encadré), « end » = pop-up de fin d'attaque.
const CROSS_UNIT_TRIGGERS=[
  {id:'exemplaire',side:'bothAllies',step:'start',text:'peut donner l’un de ses pions Viser, Esquive ou Adrénaline à l’unité qui attaque ou défend si celle-ci est une unité alliée de même faction à portée 2 et en LdV (elle le dépense comme si elle le possédait).'},
  {id:'tirs-de-soutien',side:'attackerAllies',step:'start',ranged:true,text:'attaque à distance d’un allié : si elle n’est pas engagée et a un pion Ordre face cachée, elle peut ajouter ses armes éligibles (1 par figurine en LdV du défenseur) à la réserve d’attaque, puis retourne son pion Ordre face cachée (une seule unité par attaque).'},
  {id:'influence-divine',side:'defenderAllies',step:'start',ranged:true,text:'C-3PO à portée 1 et en LdV : les autres soldats alliés ont Gardien 2 : C-3PO et peuvent annuler des Critiques comme des Touches.'},
  {id:'explosion-x',side:'all',step:'end',text:'après cette attaque, chaque unité possédant une arme Explosion X peut faire exploser jusqu’à X pions Charge alliés du type indiqué (le joueur qui n’a pas attaqué décide en premier).'},
];
function crossHolders(id,side){
  if(!attacker||!defender)return[];
  const has=e=>!defeated(e)&&keywordValue(e,id)>0,att=attacker.army,def=defender.army;
  return entries.filter(e=>has(e)&&(side==='attackerAllies'?e.army===att&&e.id!==attacker.id:side==='defenderAllies'?e.army===def&&e.id!==defender.id:side==='bothAllies'?(e.army===att||e.army===def)&&e.id!==attacker.id&&e.id!==defender.id:true));
}
function crossStartPanel(){
  if(attackStep!==0||!attacker||!defender)return'';
  const melee=attackType()==='melee',rows=CROSS_UNIT_TRIGGERS.filter(item=>item.step==='start'&&!(item.ranged&&melee)).map(item=>({item,def:keywords.find(k=>k.id===item.id),holders:crossHolders(item.id,item.side)})).filter(row=>row.def&&row.holders.length);
  if(!rows.length)return'';
  return `<div class="automation-card rule-highlight cross-triggers"><strong>MOTS-CLÉS D’AUTRES UNITÉS QUI PEUVENT INTERVENIR</strong>${rows.map(row=>`<p><b>${row.def.name}</b> — ${row.holders.map(entryName).join(', ')} : ${row.item.text}</p>`).join('')}</div>`;
}
function crossEndRows(result,dodgesUsed){
  if(!attacker||!defender||!attackState)return[];
  const rows=[],name=id=>keywords.find(k=>k.id===id)?.name||id,others=(id,unit)=>entries.filter(e=>e.army===unit.army&&e.id!==unit.id&&!defeated(e)&&keywordValue(e,id)>0).map(entryName);
  if(keywordValue(defender,'la-victoire-ou-la-mort')>0&&result.wounds>0)rows.push(`<p><b>${name('la-victoire-ou-la-mort')}</b> — ${entryName(defender)} a subi au moins 1 blessure : elle peut gagner 1 pion Suppression, puis 1 pion Viser ou 1 pion Esquive.</p>`);
  if(keywordValue(attacker,'nous-nous-battons-pour-notre-famille')>0){const list=others('nous-nous-battons-pour-notre-famille',attacker);if(list.length)rows.push(`<p><b>${name('nous-nous-battons-pour-notre-famille')}</b> — une autre unité alliée à portée 2 (${list.join(', ')}) gagne 1 pion Esquive.</p>`)}
  if(keywordValue(attacker,'les-mandaloriens-sont-plus-forts-ensemble')>0&&attackState.aims>0){const list=others('les-mandaloriens-sont-plus-forts-ensemble',attacker);if(list.length)rows.push(`<p><b>${name('les-mandaloriens-sont-plus-forts-ensemble')}</b> — ${entryName(attacker)} a dépensé un pion Viser : si elle est à portée 2 de ${list.join(', ')}, elle gagne 1 pion Esquive.</p>`)}
  if(keywordValue(defender,'les-mandaloriens-sont-plus-forts-ensemble')>0&&dodgesUsed>0){const list=others('les-mandaloriens-sont-plus-forts-ensemble',defender);if(list.length)rows.push(`<p><b>${name('les-mandaloriens-sont-plus-forts-ensemble')}</b> — ${entryName(defender)} a dépensé un pion Esquive : si elle est à portée 2 de ${list.join(', ')}, elle gagne 1 pion Viser.</p>`)}
  for(const item of CROSS_UNIT_TRIGGERS.filter(trigger=>trigger.step==='end')){const holders=crossHolders(item.id,item.side);if(holders.length)rows.push(`<p><b>${name(item.id)}</b> — ${holders.map(entryName).join(', ')} : ${item.text}</p>`)}
  return rows;
}
const rulesPanelCrossBase=rulesPanel;
rulesPanel=function(){return `${crossStartPanel()}${rulesPanelCrossBase()}`};
// Ciblage restreint : rappel sur la tuile de l'unité qu'on s'apprête à attaquer.
const TARGET_FLAGS={
  'incognito':()=>'Incognito : ne peut pas être attaquée depuis plus de portée 1',
  'petit':()=>'Petit : ciblable seulement si le chef voit une autre figurine de l’unité',
  'immunite-corps-a-corps':()=>'Immunité corps-à-corps : pas d’attaque au corps-à-corps',
  'discret':entry=>(stateFor(entry).suppression||0)>0?'Discret + Suppression : les attaquants doivent cibler une autre unité si possible':null,
};
const pickTargetFlagsBase=pick;
pick=function(role){
  pickTargetFlagsBase(role);
  if(role!=='defender')return;
  root.querySelectorAll('.unit-tile').forEach(tileButton=>{
    const entry=entries.find(candidate=>candidate.id===tileButton.dataset.id);if(!entry)return;
    const flags=Object.entries(TARGET_FLAGS).filter(([id])=>keywordValue(entry,id)>0).map(([id,fn])=>fn(entry)).filter(Boolean);
    if(flags.length)tileButton.insertAdjacentHTML('beforeend',`<small class="target-flag">⚠ ${flags.join(' · ')}</small>`)
  })
};
// Surveillance X : pions posés sur une unité ennemie, dépensés par les alliés de la source à l'étape « Relancer les dés d'attaque ».
Object.assign(CARD_KEYWORD_ACTIONS,{
  'surveillance-x':{title:'SURVEILLANCE',kind:'action',repeatable:true,text:x=>`Action de carte (ou gratuite) : une unité ennemie à portée 3 et en LdV gagne ${x} pion(s) Surveillance, retirés en Phase Finale. Vos unités qui attaquent la dépensent à l’étape Relancer : 1 dé relancé par pion.`,pick:{max:()=>1,enemy:true,effect:null},choices:[{label:'Placer les pions Surveillance',effectFn:x=>({surveillance:x})}]},
});
function surveillancePanel(){
  if(attackStep!==1||!defender)return'';
  const n=stateFor(defender).surveillance||0;
  if(!n)return'';
  return `<div class="automation-card rule-highlight"><strong>SURVEILLANCE : ${n} pion(s) sur ${entryName(defender)}</strong><small>Chaque pion dépensé permet de relancer 1 dé d’attaque (étape Relancer, avant ou après les pions Viser, dans l’ordre voulu). Touchez pour retirer un pion dépensé.</small><button type="button" data-surveillance-spend>Dépenser 1 pion Surveillance</button></div>`;
}
const rulesPanelSurveillanceBase=rulesPanel;
rulesPanel=function(){return `${surveillancePanel()}${rulesPanelSurveillanceBase()}`};
const bindSurveillanceBase=bindAttackInputs;
bindAttackInputs=function(){bindSurveillanceBase();root.querySelectorAll('[data-surveillance-spend]').forEach(button=>button.onclick=()=>{if(!defender)return;bumpTokens(defender,{surveillance:-1});resolveScreen()})};
const overviewKeywordAutomationBase=overview;
overview=function(entry,role){overviewKeywordAutomationBase(entry,role);if(role!=='attack'||defeated(entry))return;const anchor=root.querySelector('.overview .card-strip');const html=keywordAutomationPanel(entry),offers=offersPanelHtml(entry);if(!html&&!offers)return;anchor?.insertAdjacentHTML('beforebegin',offers+html);bindKeywordAutomation(entry,role)};
// Distraire subi : rappel dans l'étape des armes de l'attaque
function decorateDistracted(){
  if(attackStep!==0||!attacker)return;
  const sourceId=stateFor(attacker).distractedBy,source=sourceId&&entries.find(candidate=>candidate.id===sourceId);
  if(!source)return;
  const respected=defender&&defender.id===source.id,panel=document.createElement('section');
  panel.className='distract-card '+(respected?'info-card':'alert-card');
  panel.innerHTML='<strong>DISTRAIRE · CIBLE IMPOSÉE</strong><p>'+(respected?'Cible conforme : '+entryName(source)+' est bien attaquée.':'Jusqu’à la fin du round, <b>'+entryName(attacker)+'</b> doit attaquer <b>'+entryName(source)+'</b> si possible.')+'</p><p class="ar-source">Chaque figurine doit choisir une arme éligible pour cette réserve d’attaque.</p>';
  root.querySelector('.weapon-picker')?.before(panel);
}

const overviewCardAutomationBase=overview;
overview=function(entry,role){reconcileRoundEffects();overviewCardAutomationBase(entry,role);if(role!=='attack'||defeated(entry))return;const html=activationAutomationPanel(entry);if(!html)return;const anchor=root.querySelector('.overview .card-strip');anchor?.insertAdjacentHTML('beforebegin',html);bindActivationAutomation(entry,role)};

// À Bout Portant est résolu après l'attaque, comme imprimé sur la carte.
const saveAttackHistoryPointBlankBase=saveAttackHistory;
saveAttackHistory=function(){const grantDodge=attacker&&hasCard(attacker,'point blank')&&attackType()==='ranged'&&String(attackState.range)==='2';saveAttackHistoryPointBlankBase();if(grantDodge){const state=stateFor(attacker);unitStates[attacker.id]={...state,dodge:(state.dodge||0)+1};persistUnitStates();if(attackHistory[0]){attackHistory[0].effects=[...(attackHistory[0].effects||[]),'À Bout Portant : +1 Esquive'];localStorage.setItem(historyKey,JSON.stringify(attackHistory))}}};

/**
 * Briefing tactique : deux sections dans l'ordre où elles servent pendant
 * une activation — d'abord tout ce qui touche l'activation/le déplacement,
 * puis les mots-clés d'attaque. La défense de cette unité n'a pas sa place
 * ici (elle s'affiche quand l'unité est ciblée par une attaque, pas quand
 * on décide comment la jouer) — voir docs/ROADMAP.md, décision du
 * 16/09/2026.
 */
function activationBriefing(entry){
  const state=stateFor(entry),rules=resolved(entry),immobilize=Math.max(0,Number(state.immobilize)||0),arsenal=keywordValue(entry,'arsenal-x');
  const keywordTitle=item=>{const value=item.tag.value;if(value===undefined||value===null||value==='')return item.def.name;return item.def.name.includes('X')?item.def.name.replace('X',String(value)):`${item.def.name} ${value}`};
  const rows=list=>list.map(item=>`<li><b>${keywordTitle(item)}</b><small>${definitionText(item)}</small></li>`).join('');
  // Chaque mot-clé hors combat est rangé à l'étape où il agit (scripts/data/keyword-timing.json) : pastille d'étape + tri chronologique.
  const timing=window.SWL_REFERENCE?.keywordTiming||{phases:{},keywords:{}},phaseOrder=['ordre','deplacement','action','finactivation','ralliement','reaction','passif','miseenplace','commandement','phasefinale'],phaseOf=item=>timing.keywords?.[item.def.id]?.[0]||null,treatmentOf=item=>timing.keywords?.[item.def.id]?.[1]||null;
  const phaseRows=list=>[...list].sort((a,b)=>{const ia=phaseOrder.indexOf(phaseOf(a)),ib=phaseOrder.indexOf(phaseOf(b));return(ia<0?99:ia)-(ib<0?99:ib)}).map(item=>{const phase=phaseOf(item);return`<li><b>${phase?`<i class="phase-tag phase-${phase}">${timing.phases[phase]||phase}</i>`:''}${keywordTitle(item)}</b><small>${definitionText(item)}</small>${treatmentOf(item)==='auto'?'<em class="auto-hint">Bouton d’application dans « Automatismes des mots-clés » ou dans l’écran concerné</em>':''}</li>`}).join('');
  const allActivationRules=rules.filter(item=>displayImpacts(item).includes('autre')),armyRules=allActivationRules.filter(item=>phaseOf(item)==='armee'),activationRules=allActivationRules.filter(item=>phaseOf(item)!=='armee');
  const attackRules=rules.filter(item=>displayImpacts(item).includes('attaque'));
  // Mots-clés qui jouent quand cette unité est ciblée (Incognito, Profil Bas, Discret, Armure…) : rappelés aussi sur sa propre fiche.
  const defenseRules=rules.filter(item=>displayImpacts(item).includes('défense')&&!displayImpacts(item).includes('autre')&&!displayImpacts(item).includes('attaque'));
  const noteSources=[{label:'Carte unité',name:entry.unit.name},...(entry.unit.upgrades||[]).map(up=>({label:displayName(up.name),name:up.name}))];
  const cardNotes=noteSources.map(src=>{const note=noteFor(src.name);return note?{label:src.label,note}:null}).filter(Boolean).concat(crossCardNotes(entry));
  const noteRows=cardNotes.map(n=>`<li><b>${n.label}</b><small>${renderDiceText(n.note)}</small></li>`).join('');
  const mobility=printedSpeed(entry)!=null?mobilityReadout(entry,state,immobilize):state.maxSpeedOverride?`<div class="movement-readout active"><small>MOBILITÉ ACTUELLE</small><b>VITESSE MAXIMALE ${state.maxSpeedOverride}</b><span>${immobilize?`Réduite de ${immobilize} par Immobilisation`:'Bonus actif pour ce round'}</span></div>`:immobilize?`<div class="movement-readout warning"><small>MOBILITÉ RÉDUITE</small><b>−${immobilize} EN VITESSE</b><span>Appliquez ce malus à la vitesse imprimée sur la carte.</span></div>`:`<div class="movement-readout"><small>MOBILITÉ</small><b>AUCUN MODIFICATEUR ACTIF</b><span>Utilisez la vitesse imprimée sur la carte Unité.</span></div>`;
  return `<section class="activation-briefing"><i class="brief-corner top" aria-hidden="true"></i><i class="brief-corner bottom" aria-hidden="true"></i><header><div><small>INFO · BRIEFING TACTIQUE · ROUND ${currentRound()}</small><strong>CE QUE CETTE UNITÉ PEUT FAIRE MAINTENANT</strong></div>${mobility}</header>${movementRulesHtml(entry)}${arsenal?`<div class="brief-alert"><b>ARSENAL ${arsenal}</b><span>Chaque figurine peut employer jusqu’à ${arsenal} armes pendant l’action Attaquer ; chaque arme ne rejoint qu’une seule réserve.</span></div>`:''}<div class="brief-section"><small>ACTIVATION &amp; DÉPLACEMENT</small><ul>${activationRules.length?phaseRows(activationRules):'<li class="brief-empty">Aucun effet spécial d’activation identifié : utilisez les deux actions normales de l’unité.</li>'}</ul></div><div class="brief-section"><small>ATTAQUE</small><ul>${attackRules.length?rows(attackRules):'<li class="brief-empty">Aucun mot-clé d’attaque propre à cette unité ou ses améliorations.</li>'}</ul></div>${defenseRules.length?`<div class="brief-section"><small>QUAND CETTE UNITÉ EST CIBLÉE (DÉFENSE)</small><ul>${rows(defenseRules)}</ul></div>`:''}${noteRows?`<div class="brief-section"><small>EFFETS DE CARTE</small><ul>${noteRows}</ul></div>`:''}${armyRules.length?`<div class="brief-section"><small>COMPOSITION D’ARMÉE (rappel)</small><ul>${rows(armyRules)}</ul></div>`:''}</section>`
}
const overviewBriefingBase=overview;
overview=function(entry,role){overviewBriefingBase(entry,role);if(role!=='attack'||defeated(entry))return;const anchor=root.querySelector('.overview .card-strip');anchor?.insertAdjacentHTML('afterend',activationBriefing(entry))};
// Écran d'unité (19/09/2026) : regroupe les blocs de .overview en deux colonnes réelles (.ov-left = identité + cartes ; .ov-right = automatismes, Briefing, état de l'unité) pour que les deux colonnes partent du même bord haut. En dessous de 1000px, les colonnes disparaissent (display:contents) et l'ordre d'origine est rétabli en CSS.
const overviewBriefingFoldBase=overview;
overview=function(entry,role){overviewBriefingFoldBase(entry,role);root.querySelectorAll('.activation-briefing > .brief-section').forEach(section=>{const title=section.querySelector(':scope > small');if(!title)return;const details=document.createElement('details');details.className=section.className;details.open=!/EFFETS DE CARTE|COMPOSITION D/i.test(title.textContent);const summary=document.createElement('summary'),count=section.querySelectorAll('li').length;summary.append(title);if(count)summary.insertAdjacentHTML('beforeend','<em>'+count+'</em>');details.append(summary,...section.childNodes);section.replaceWith(details)})};
const overviewColumnsBase=overview;
overview=function(entry,role){overviewColumnsBase(entry,role);const ov=root.querySelector('.overview');if(!ov)return;const left=document.createElement('div'),right=document.createElement('div');left.className='ov-col ov-left';right.className='ov-col ov-right';[...ov.children].forEach(child=>(child.matches('.activation-automation,.post-rally-panel,.activation-briefing,.unit-state-editor')?right:left).append(child));ov.append(left,right)};

function activationActionLimit(entry){const state=stateFor(entry),stats=certifiedUnitStats(entry),morale=stats&&!moraleImmune(entry)?engine.moraleState({currentSuppression:state.suppression,courage:stats.courage}):null;return Math.min(3,(morale?.suppressed?1:2)+(state.extraAction&&(state.wound||0)>0?1:0))}

const weaponScreenSaberBase=weaponScreen;
function saberMeleeRows(){return[attacker.unit.name,...(attacker.unit.upgrades||[]).map(upgrade=>upgrade.name)].flatMap(card=>(profileFor(card)?.weapons||[]).filter(weapon=>engine.rangeBounds(weapon.range)?.melee&&weapon.dice!=='variable').map((weapon,index)=>({card,weapon,key:`${norm(card)}:${index}`})))}
function saberThrowSelected(){return selectedWeaponRows().some(row=>cardKey(row.card)==='saber throw')}
function saberSourceRow(){return saberMeleeRows().find(row=>row.key===attackState.saberSource)}
function saberExpectedDice(){const source=saberSourceRow();return source?Math.ceil(source.weapon.dice.reduce((sum,die)=>sum+die.count,0)/2):0}
weaponScreen=function(){let html=weaponScreenSaberBase();if(!hasCard(attacker,'saber throw')||attackStep!==0||!saberThrowSelected())return html;const melee=saberMeleeRows(),chosen=attackState.saberDice||{rouge:0,noir:0,blanc:0},expected=saberExpectedDice(),entered=chosen.rouge+chosen.noir+chosen.blanc;const help=`<div class="automation-card rule-highlight saber-throw-helper manual-focus"><strong>SABRE LANCÉ · CONFIGURATION OBLIGATOIRE</strong><small>Choisissez l’arme de corps-à-corps utilisée comme référence. Ses mots-clés sont recopiés automatiquement ; composez ensuite exactement la moitié de ses dés, arrondie au supérieur.</small><div class="saber-sources">${melee.map(row=>`<button type="button" data-saber-source="${row.key}" class="${attackState.saberSource===row.key?'on':''}">${row.weapon.name} · ${row.weapon.dice.reduce((sum,die)=>sum+die.count,0)} dés</button>`).join('')||'<em>Aucune arme de corps-à-corps certifiée.</em>'}</div>${attackState.saberSource?`<div class="saber-dice-entry"><b>${entered} / ${expected} DÉS</b>${numberField('saberRed','Rouges',chosen.rouge,expected)}${numberField('saberBlack','Noirs',chosen.noir,expected)}${numberField('saberWhite','Blancs',chosen.blanc,expected)}</div>`:''}</div>`;return html.replace('<div class="weapon-picker">',help+'<div class="weapon-picker">')};
const poolSaberBase=pool;
pool=function(){const result=poolSaberBase();if(!saberThrowSelected()||!saberSourceRow())return result;const dice=attackState.saberDice||{rouge:0,noir:0,blanc:0};return{...result,rouge:result.rouge+dice.rouge,noir:result.noir+dice.noir,blanc:result.blanc+dice.blanc,variable:false}};
const activeAttackTagsSaberBase=activeAttackTags;
activeAttackTags=function(){const result=activeAttackTagsSaberBase(),source=saberThrowSelected()?saberSourceRow():null;if(!source)return result;const ids=source.weapon.keywordIds||[];return[...result,...ids.map(id=>{const def=keywords.find(keyword=>keyword.id===id);return def?{source:'Sabre Lancé',def,tag:{keywordId:id,value:source.weapon.keywordValues?.[id]}}:null}).filter(Boolean)]};
const stepIssueSaberBase=stepIssue;
stepIssue=function(){const base=stepIssueSaberBase();if(base)return base;if(attackStep===0&&saberThrowSelected()){if(!saberSourceRow())return 'Sabre Lancé : choisissez l’arme de corps-à-corps utilisée comme référence.';const dice=attackState.saberDice||{rouge:0,noir:0,blanc:0},entered=dice.rouge+dice.noir+dice.blanc,expected=saberExpectedDice();if(entered!==expected)return `Sabre Lancé : saisissez exactement ${expected} dé(s) issus de l’arme choisie (${entered}/${expected}).`}return null};
const bindSaberBase=bindAttackInputs;
bindAttackInputs=function(){bindSaberBase();root.querySelectorAll('[data-saber-source]').forEach(button=>button.onclick=()=>{attackState.saberSource=button.dataset.saberSource;attackState.saberDice={rouge:0,noir:0,blanc:0};resolveScreen()});[['saberRed','rouge'],['saberBlack','noir'],['saberWhite','blanc']].forEach(([id,color])=>{const input=$('#'+id);if(input)input.oninput=()=>{attackState.saberDice=attackState.saberDice||{rouge:0,noir:0,blanc:0};attackState.saberDice[color]=Math.max(0,Number(input.value)||0)}})};
const saveAttackHistoryActivationBase=saveAttackHistory;
saveAttackHistory=function(){saveAttackHistoryActivationBase();if(attacker){const state=stateFor(attacker);unitStates[attacker.id]={...state,immobilize:0,maxSpeedOverride:null};persistUnitStates()}};

// Les pions gagnés pendant l'activation alimentent directement la résolution.
const initAttackTokensBase=initAttack;
initAttack=function(){initAttackTokensBase();if(!attackState)return;const attackTokens=stateFor(attacker),defenseTokens=stateFor(defender);Object.assign(attackState,{availableAims:attackTokens.aim||0,availableAttackSurges:attackTokens.surge||0,availableDodges:defenseTokens.dodge||0,availableDefenseSurges:defenseTokens.surge||0,attackSurgesSpent:0,defenseSurgesSpent:0})};
const attackResultsTokensBase=attackResults;
attackResults=function(){const result=attackResultsTokensBase(),spent=Math.min(Number(attackState.attackSurgesSpent)||0,Number(attackState.availableAttackSurges)||0,Number(result.unusedSurge)||0);return spent?{...result,hit:result.hit+spent,unusedSurge:result.unusedSurge-spent,tokenSurgesUsed:spent}:result};
function marksmanEligible(){return allResolved(attacker).some(x=>x.def.id==='tireur-embusque')}
function jarkaiEligible(){return attackType()==='melee'&&allResolved(attacker).some(x=>x.def.id==='maitrise-du-jarkai')}
const attackResultsMarksmanBase=attackResults;
attackResults=function(){const result=attackResultsMarksmanBase();if(!marksmanEligible()&&!jarkaiEligible())return result;const blankToHit=(Number(attackState.marksmanBlankToHit)||0)+(Number(attackState.jarkaiBlankToHit)||0),hitToCrit=(Number(attackState.marksmanHitToCrit)||0)+(Number(attackState.jarkaiHitToCrit)||0);if(!blankToHit&&!hitToCrit)return result;const upgraded=engine.applyBlankUpgrade(result.hit,result.crit,attackState.roll.blank,blankToHit,hitToCrit);return{...result,hit:upgraded.hit,crit:upgraded.crit,blankUpgraded:blankToHit+hitToCrit}};
const defenseResultTokensBase=defenseResult;
defenseResult=function(){const context=defenseResultTokensBase(),available=Math.min(Number(attackState.defenseSurgesSpent)||0,Number(attackState.availableDefenseSurges)||0),printedConversion=context.defenseSurge==='block',spent=printedConversion?0:Math.min(available,Number(context.d.surge)||0),result=spent?{...context.result,blocks:context.result.blocks+spent,converted:(context.result.converted||0)+spent,wounds:Math.max(0,context.result.wounds-spent),tokenSurgesUsed:spent}:context.result;return{...context,result}};
function dropNumberField(html,id){const at=html.indexOf(`id="${id}"`);if(at<0)return html;const start=html.lastIndexOf('<div class="quick-field">',at),end=html.indexOf('</div></div>',at);return start<0||end<0?html:html.slice(0,start)+html.slice(end+12)}
const tokenIcons={aim:'<img src="./stat-icons/aim.svg" alt="">',dodge:'<img src="./stat-icons/dodge.svg" alt="">',surge:'<img class="dice-symbol" src="../icons/dice/asurge.png" alt="">',dsurge:'<img class="dice-symbol" src="../icons/dice/dsurge.png" alt="">'};
function counterHtml(id,value,max=20){const n=Math.max(0,Number(value)||0);return `<div class="touch-counter"><button type="button" data-adjust="${id}" data-delta="-1" aria-label="Diminuer" ${n<=0?'disabled':''}>−</button><input id="${id}" aria-label="${id}" type="number" inputmode="numeric" min="0" max="${max}" value="${n}"><button type="button" data-adjust="${id}" data-delta="1" aria-label="Augmenter" ${n>=max?'disabled':''}>+</button></div>`}
function tokenCard(kind,id,value,title,text,icon,max=20){const n=Math.max(0,Number(value)||0);return `<div class="token-card ${kind} ${n?'has':'none'}"><span class="token-icon" aria-hidden="true">${icon}</span><div class="token-text"><b>${title} : ${n}</b><span>${text}</span></div>${counterHtml(id,n,max)}</div>`}
// Le stock de pions corrigé à l'écran est aussi écrit dans le suivi de l'unité, pour que l'information reste juste à l'attaque suivante.
// Quand le stock d'un pion baisse sous ce qui était déjà « dépensé », la dépense est ramenée au stock (sinon le champ « dépensés », masqué à 0 pion, ne pourrait plus être corrigé).
function clampSpentTokens(key){const stock=Number(attackState[key])||0;if(key==='availableAims'){attackState.aims=Math.min(Number(attackState.aims)||0,stock);attackState.rerolled=attackState.aims>0?1:0}else if(key==='availableAttackSurges')attackState.attackSurgesSpent=Math.min(Number(attackState.attackSurgesSpent)||0,stock);else if(key==='availableDefenseSurges')attackState.defenseSurgesSpent=Math.min(Number(attackState.defenseSurgesSpent)||0,stock);else if(key==='availableDodges'){attackState.dodges=Math.min(Number(attackState.dodges)||0,stock);attackState.dodgeCrits=Math.min(Number(attackState.dodgeCrits)||0,Math.max(0,stock-attackState.dodges))}}
function syncTokenStock(key){const map={availableAims:['aim',attacker],availableAttackSurges:['surge',attacker],availableDodges:['dodge',defender],availableDefenseSurges:['surge',defender]},target=map[key];if(!target||!target[1])return;unitStates[target[1].id]={...stateFor(target[1]),[target[0]]:attackState[key]};persistUnitStates()}
// Écran Modifications : la saisie Impact/Armure n'est proposée que si l'attaquant a Impact ET le défenseur Armure ; sinon, information « ne s'applique pas ici » (l'Armure seule s'applique automatiquement, valeurs par défaut de modifiedResults).
const modifierScreenApplicabilityBase=modifierScreen;
modifierScreen=function(){
  let html=modifierScreenApplicabilityBase();const armor=armorContext(),impactX=effectiveImpactX();
  if(impactX>0&&armor.hasArmor)return html;
  html=dropNumberField(dropNumberField(html,'impact'),'armor').replace('<div class="result-entry"></div>','');
  const reason=armor.hasArmor?`Armure ${armor.unlimited?'':armor.value+' '}du défenseur : elle annule automatiquement ses touches (l’attaquant n’a pas Impact).`:impactX>0?'Le défenseur n’a pas d’Armure : Impact est sans effet.':'Ni Impact chez l’attaquant, ni Armure chez le défenseur.';
  return html.replace(/<strong>Impact disponible : \d+<\/strong><small>[\s\S]*?<\/small>/,`<strong>IMPACT / ARMURE : NE S’APPLIQUE PAS ICI</strong><small>${reason}</small>`);
};
// Écran Suppression = résumé de l'attaque (19/09/2026, demande utilisateur) : blessures et suppression à appliquer (résultats, en rouge), pions dépensés (information, en bleu), avec les icônes des pions.
function attackRecapHtml(){
  const {result,shienActive}=defenseResult(),ranged=attackType()==='ranged',hadResult=attackResults().hit+attackResults().crit>0,suppressive=activeAttackTags().some(x=>x.def.id==='suppressif'),overwhelm=activeAttackTags().some(x=>x.def.id==='debordement'),
    shienDenies=shienActive&&ranged&&result.wounds===0,immune=moraleImmune(defender),
    suppression=immune||shienDenies?0:engine.suppressionTokens({ranged,hadAttackResult:hadResult,suppressive,overwhelm,aimSpent:attackState.aims>0,vehicle:isVehicle(defender)}),
    ionX=attackKeywordValue('ion-x'),ion=result.wounds>0&&attackState.ionEligible?ionX:0,
    pointBlank=!!attacker&&hasCard(attacker,'point blank')&&ranged&&String(attackState.range)==='2',
    dodgesSpent=coverContext().highVelocity?0:(Number(attackState.dodges)||0)+(Number(attackState.dodgeCrits)||0),
    aimsSpent=Math.min(Number(attackState.availableAims)||0,(Number(attackState.aims)||0)+(Number(attackState.lethalAims)||0)+(attackState.longShotAim?1:0)+(Number(attackState.marksmanBlankToHit)||0)+(Number(attackState.marksmanHitToCrit)||0)),
    attackSurges=Math.min(Number(attackState.attackSurgesSpent)||0,Number(attackState.availableAttackSurges)||0),
    defenseSurges=Math.min(Number(attackState.defenseSurgesSpent)||0,Number(attackState.availableDefenseSurges)||0),
    spent=(icon,n,label)=>`<div class="spent-item ${n?'has':'none'}"><span class="token-icon" aria-hidden="true">${icon}</span><div><b>${n}</b><small>${label}</small></div></div>`;
  return `<section class="attack-recap">
    <div class="recap-card wounds ${result.wounds?'has':'none'}"><span class="recap-icon" aria-hidden="true"><i class="blood-drop"></i></span><div class="recap-text"><b>BLESSURES À APPLIQUER</b><span>Retirez vous-même les figurines et les blessures à la table.</span></div><strong class="recap-num" data-live-total-wounds>${result.wounds}</strong></div>
    <div class="recap-card suppression ${suppression?'has':'none'}"><span class="recap-icon" aria-hidden="true"><img src="./stat-icons/suppression.svg" alt=""></span><div class="recap-text"><b>SUPPRESSION À ATTRIBUER</b><span>${immune?'Cette unité est immunisée à la suppression.':shienDenies?'Maîtrise du Shien : aucune blessure subie, donc aucune suppression.':suppression?`Placez ${suppression} pion(s) sur ${entryName(defender)}.`:'Aucun pion Suppression à placer.'}</span></div><strong class="recap-num">${suppression}</strong></div>
    ${pointBlank?`<div class="recap-card ion has point-blank"><span class="recap-icon" aria-hidden="true">${tokenIcons.dodge}</span><div class="recap-text"><b>À BOUT PORTANT : ESQUIVE À GAGNER</b><span>Attaque à distance contre une unité ennemie à portée 2 : ${entryName(attacker)} gagne 1 pion Esquive après l’attaque (ajouté automatiquement au suivi en terminant).</span></div><strong class="recap-num">+1</strong></div>`:''}
    ${ionX?`<div class="recap-card ion ${ion?'has':'none'}"><span class="recap-icon" aria-hidden="true">⚡</span><div class="recap-text"><b>PIONS IONIQUE À ATTRIBUER</b><span>${attackState.ionEligible?'Cible confirmée véhicule ou droïde.':'Cible non confirmée véhicule/droïde.'}</span></div><strong class="recap-num">${ion}</strong></div>`:''}
    ${activationEffectsHtml()}
    <div class="recap-spent"><span class="recap-title">PIONS DÉPENSÉS PENDANT L’ATTAQUE</span><div class="recap-spent-grid">${spent(tokenIcons.dodge,dodgesSpent,'Esquive(s)')}${spent(tokenIcons.aim,aimsSpent,'Viser')}${spent(tokenIcons.surge,attackSurges,'Adrénaline (attaque)')}${spent(tokenIcons.dsurge,defenseSurges,'Adrénaline (défense)')}</div></div>
  </section>`;
}
const suppressionScreenRecapBase=suppressionScreen;
suppressionScreen=function(){return suppressionScreenRecapBase().replace(/<div class="total wound-total">[\s\S]*?<\/div>/,attackRecapHtml())};
const rollScreenTokensBase=rollScreen;
rollScreen=function(){let html=rollScreenTokensBase(),available=Number(attackState.availableAims)||0,surges=Number(attackState.availableAttackSurges)||0,panel=tokenCard('surge','availableAttackSurges',surges,'PIONS ADRÉNALINE DISPONIBLES',surges?'Chaque pion dépensé convertit un résultat Adrénaline non converti par la carte en touche (à saisir plus bas).':'Aucun pion Adrénaline : pas de conversion supplémentaire.',tokenIcons.surge),control=surges?numberField('attackSurgesSpent','Pions Adrénaline dépensés',attackState.attackSurgesSpent,surges):'';// Les relances de Viser se font à la table (demande utilisateur du 19/09/2026) : plus de saisie des pions Viser ni des dés relancés ; seul l'affichage informe s'il reste des pions Viser (suivi de l'activation). Débordement / Duelliste / Matamore ont encore besoin de savoir si un Viser a été dépensé : une seule case, affichée seulement pour eux.
  const aimsLeft=Math.max(0,available-(attackState.longShotAim?1:0)),preciseX=attackKeywordValue('precis-x'),
    aimInfo=tokenCard('aim','availableAims',available,'PIONS VISER DISPONIBLES',aimsLeft?`Relances à la table : jusqu’à ${engine.rerollCapacity(aimsLeft,preciseX)} dés (${aimsLeft} × (2 + Précis ${preciseX}))${attackState.longShotAim?' · 1 Viser déjà dépensé pour Longue Distance':''}.`:(attackState.longShotAim?'Le seul Viser a servi à Longue Distance : pas de relance.':'Aucun pion Viser : pas de relance.'),tokenIcons.aim),
    aimNeeded=activeAttackTags().some(x=>x.def.id==='debordement')||allResolved(attacker).some(x=>x.def.id==='duelliste'||x.def.id==='matamore'),
    aimCheck=aimNeeded&&!available?`<label class="situation-check"><input id="aimSpentFlag" type="checkbox" ${attackState.aims>0?'checked':''}> Un pion Viser a été dépensé pendant cette attaque <small>Nécessaire pour Débordement, Duelliste ou Matamore.</small></label>`:'';
  const aimSpendMax=Math.max(0,available-(attackState.longShotAim?1:0)-(Number(attackState.lethalAims)||0)),aimControl=available?numberField('aims','Pions Viser dépensés (relances à la table)',attackState.aims,aimSpendMax):'';
  html=dropNumberField(dropNumberField(html,'aims'),'rerolled');return html.replace('<div class="result-entry">',aimInfo+panel+aimCheck+'<div class="result-entry">'+aimControl+control)};
const rollScreenBlankUpgradeBase=rollScreen;
rollScreen=function(){
  let html=rollScreenBlankUpgradeBase();
  const marksman=marksmanEligible(),jarkai=jarkaiEligible();
  if(!marksman&&!jarkai)return html;
  const blank=Math.max(0,Number(attackState.roll.blank)||0),label=marksman&&jarkai?'TIREUR EMBUSQUÉ / MAÎTRISE DU JAR’KAI':marksman?'TIREUR EMBUSQUÉ':'MAÎTRISE DU JAR’KAI',token=marksman?'Viser':'Esquive',blankToHitId=marksman?'marksmanBlankToHit':'jarkaiBlankToHit',hitToCritId=marksman?'marksmanHitToCrit':'jarkaiHitToCrit',blankToHit=Number(attackState[blankToHitId])||0;
  const panel=`<div class="automation-card rule-highlight"><strong>${label}</strong><small>Après conversion, sans relance : 1 pion ${token} transforme un vierge en touche ou une touche en critique ; 2 pions transforment un vierge en critique (via les deux compteurs).</small><div class="result-entry">${numberField(blankToHitId,`Vierges convertis en touches (pion ${token})`,blankToHit,blank)}${numberField(hitToCritId,`Touches converties en critiques (pion ${token})`,attackState[hitToCritId],attackResultsMarksmanBase().hit+blankToHit)}</div></div>`;
  return html.replace('<div class="result-entry">',panel+'<div class="result-entry">');
};
const coverScreenTokensBase=coverScreen;
// Écran Couvert : la carte Esquive tient sur une ligne (stock en lecture seule, suivi de l'activation du défenseur) ; seule la dépense d'esquives se saisit, à droite.
coverScreen=function(){
  let html=coverScreenTokensBase();if(fxUsed('entrenched'))html=html.replace('DÉ(S) DE COUVERT</strong>','DÉ(S) DE COUVERT ROUGES</strong><small>Retranchement : dés de défense rouges à la place des blancs.</small>');const stock=Number(attackState.availableDodges)||0,ctx=coverContext(),hv=ctx.highVelocity,crits=allResolved(defender).some(x=>x.def.id==='manoeuvre-improbable')&&!hv,spendable=stock>0&&!hv,
    text=hv?'Haute vélocité : les esquives sont interdites contre cette attaque.':stock?'Chaque pion Esquive dépensé annule une touche. Stock issu du suivi de l’activation du défenseur.':'Aucun pion Esquive : pas d’esquive possible.',
    spend=spendable?`<div class="spend-group"><label><small>Dépensées</small>${counterHtml('dodges',attackState.dodges,stock)}</label>${crits?`<label><small>Contre critiques</small>${counterHtml('dodgeCrits',attackState.dodgeCrits,stock)}</label>`:''}</div>`:'',
    card=`<div class="token-card dodge ${spendable?'has':'none'}"><span class="token-icon" aria-hidden="true">${tokenIcons.dodge}</span><div class="token-text"><b>PIONS ESQUIVE DISPONIBLES : ${stock}</b><span>${text}</span></div>${spend}</div>`;
  html=dropNumberField(dropNumberField(html,'dodges'),'dodgeCrits');
  return html.replace('<div class="result-entry">',card+'<div class="result-entry">')};
const defenseScreenTokensBase=defenseScreen;
defenseScreen=function(){let html=defenseScreenTokensBase(),surges=Number(attackState.availableDefenseSurges)||0;const panel=tokenCard('surge','availableDefenseSurges',surges,'PIONS ADRÉNALINE DISPONIBLES',surges?'À dépenser uniquement sur des résultats Adrénaline non convertis par la carte : chaque pion donne un blocage (à saisir plus bas).':'Aucun pion Adrénaline : pas de conversion supplémentaire.',tokenIcons.dsurge),control=surges?numberField('defenseSurgesSpent','Pions Adrénaline dépensés',attackState.defenseSurgesSpent,surges):'';return html.replace('<div class="result-entry">',panel+'<div class="result-entry">'+control)};
const bindCombatTokensBase=bindAttackInputs;
bindAttackInputs=function(){bindCombatTokensBase();[['aims','aims'],['attackSurgesSpent','attackSurgesSpent'],['defenseSurgesSpent','defenseSurgesSpent'],['availableAims','availableAims'],['availableAttackSurges','availableAttackSurges'],['availableDodges','availableDodges'],['availableDefenseSurges','availableDefenseSurges'],['marksmanBlankToHit','marksmanBlankToHit'],['marksmanHitToCrit','marksmanHitToCrit'],['jarkaiBlankToHit','jarkaiBlankToHit'],['jarkaiHitToCrit','jarkaiHitToCrit']].forEach(([id,key])=>{const input=$('#'+id);if(input){input.oninput=()=>{attackState[key]=Math.max(0,Number(input.value)||0);if(key==='aims'){attackState.aims=Math.min(attackState.aims,Math.max(0,(Number(attackState.availableAims)||0)-(attackState.longShotAim?1:0)-(Number(attackState.lethalAims)||0)));attackState.rerolled=attackState.aims>0?1:0}clampSpentTokens(key);syncTokenStock(key);updateLiveCounters()};input.onchange=resolveScreen}});const aimFlag=$('#aimSpentFlag');if(aimFlag)aimFlag.onchange=()=>{attackState.aims=aimFlag.checked?1:0;attackState.rerolled=aimFlag.checked?1:0;resolveScreen()}};
const stepIssueTokensBase=stepIssue;
stepIssue=function(){const base=stepIssueTokensBase();if(base)return base;if(attackStep===2&&(Number(attackState.dodges)||0)+(Number(attackState.dodgeCrits)||0)>(Number(attackState.availableDodges)||0))return `Le défenseur ne possède que ${attackState.availableDodges||0} pion(s) Esquive.`;return null};
const saveAttackHistoryTokensBase=saveAttackHistory;
saveAttackHistory=function(){const aims=Math.min(Number(attackState.availableAims)||0,(Number(attackState.aims)||0)+(Number(attackState.lethalAims)||0)+(attackState.longShotAim?1:0)+(Number(attackState.marksmanBlankToHit)||0)+(Number(attackState.marksmanHitToCrit)||0)),attackSurges=Math.min(Number(attackState.availableAttackSurges)||0,Number(attackState.attackSurgesSpent)||0),dodges=Math.min(Number(attackState.availableDodges)||0,(Number(attackState.dodges)||0)+(Number(attackState.dodgeCrits)||0)),defenseSurges=Math.min(Number(attackState.availableDefenseSurges)||0,Number(attackState.defenseSurgesSpent)||0);saveAttackHistoryTokensBase();const attackerState=stateFor(attacker),defenderState=stateFor(defender);unitStates[attacker.id]={...attackerState,aim:Math.max(0,(attackerState.aim||0)-aims),surge:Math.max(0,(attackerState.surge||0)-attackSurges)};unitStates[defender.id]={...defenderState,dodge:Math.max(0,(defenderState.dodge||0)-dodges),surge:Math.max(0,(defenderState.surge||0)-defenseSurges)};if(attackHistory[0]){attackHistory[0].tokens={aims,attackSurges,dodges,defenseSurges};localStorage.setItem(historyKey,JSON.stringify(attackHistory))}persistUnitStates()};

// L'ordre visuel suit désormais strictement le déroulé d'une activation :
// briefing, origine/effets obligatoires, effets de carte, puis actions normales.

// Réaction Attente : la portée du déclencheur reste une confirmation de table,
// puis le pion est consommé au lancement d'un déplacement ou d'une attaque gratuite.
let standbyReaction=null;
const standbyRange=entry=>hasResolvedKeyword(entry,'sentinelle')?3:2;
function recordStandbyEvent(entry,type){attackHistory.unshift({id:`${Date.now()}-${entry.id}-standby-${type}`,at:new Date().toISOString(),attacker:name(entry),defender:'—',weapons:[],wounds:0,blocks:0,finalHit:0,finalCrit:0,coverCancelled:0,dodgesUsed:0,origin:'Attente',event:type==='move'?'Déplacement gratuit':'Attaque gratuite'});attackHistory=attackHistory.slice(0,50);localStorage.setItem(historyKey,JSON.stringify(attackHistory))}
const initAttackStandbyBase=initAttack;
initAttack=function(){const pending=standbyReaction?.attackerId===attacker?.id;if(pending){const state=stateFor(attacker);if(!state.standby){standbyReaction=null;stage=1;pick('attacker');return}unitStates[attacker.id]={...state,standby:Math.max(0,(state.standby||0)-1)};persistUnitStates()}initAttackStandbyBase();if(pending&&attackState)attackState.standbyReaction=true};
const saveAttackHistoryStandbyBase=saveAttackHistory;
saveAttackHistory=function(){const reaction=!!attackState?.standbyReaction,trackerKey='swl.game-tracker.v1',before=read(trackerKey,{round:1,activatedUnitIds:[]}),wasActivated=(before.activatedUnitIds||[]).includes(attacker?.id);saveAttackHistoryStandbyBase();if(!reaction)return;const tracker=read(trackerKey,before);if(!wasActivated)localStorage.setItem(trackerKey,JSON.stringify({...tracker,activatedUnitIds:(tracker.activatedUnitIds||[]).filter(id=>id!==attacker.id)}));if(attackHistory[0]){attackHistory[0].origin='Attente';attackHistory[0].event='Attaque gratuite';localStorage.setItem(historyKey,JSON.stringify(attackHistory))}standbyReaction=null;persistUnitStates()};
const saveAttackHistoryDropStandbyBase=saveAttackHistory;
saveAttackHistory=function(){const previousSuppression=defender?stateFor(defender).suppression:0;saveAttackHistoryDropStandbyBase();if(defender){const state=stateFor(defender);if(state.suppression>previousSuppression&&state.standby){unitStates[defender.id]={...state,standby:0};persistUnitStates()}}};

// Audit autonome des listes réellement chargées dans ce navigateur. Le rapport
// ne lit volontairement aucun token, identifiant Gist ou autre secret local.
function buildLiveGameReport(){
  const blocking=[],warnings=[],units=[];let simulatedAttacks=0;
  for(const entry of entries){
    const stats=certifiedUnitStats(entry),profile=profileFor(entry.unit.name),defense=effectiveDefenseProfile(entry),cards=[entry.unit.name,...(entry.unit.upgrades||[]).map(upgrade=>upgrade.name)],weapons=cards.flatMap(card=>(profileFor(card)?.weapons||[]).filter(weapon=>weapon.dice!=='variable'));
    if(!stats)blocking.push({unit:entryName(entry),card:entry.unit.name,message:'Courage non certifié'});
    if(!defense.defenseColor)blocking.push({unit:entryName(entry),card:entry.unit.name,message:'Couleur du dé de défense absente'});
    if(!weapons.length)blocking.push({unit:entryName(entry),card:entry.unit.name,message:'Aucune arme exploitable raccordée au moteur'});
    for(const card of cards){const key=cardKey(card);if(!window.SWL_REFERENCE?.images?.[key])warnings.push({unit:entryName(entry),card,message:'Visuel non raccordé au catalogue'});if(!window.SWL_REFERENCE?.names?.[key])warnings.push({unit:entryName(entry),card,message:'Nom français non raccordé au catalogue'})}
    const assisted=resolved(entry).filter(item=>item.def.impact==='autre').map(item=>item.def.name);
    units.push({id:entry.id,army:entry.army,name:entryName(entry),sourceName:entry.unit.name,upgrades:(entry.unit.upgrades||[]).map(upgrade=>upgrade.name),courage:stats?.courage??null,defenseColor:defense.defenseColor||null,weapons:weapons.map(weapon=>({name:weapon.name,range:weapon.range||null,dice:weapon.dice})),assistedRules:[...new Set(assisted)]});
    for(const target of entries.filter(candidate=>candidate.army!==entry.army)){for(const weapon of weapons){const dice=weapon.dice.reduce((sum,die)=>sum+Number(die.count||0),0);if(dice>0&&effectiveDefenseProfile(target).defenseColor)simulatedAttacks++}}
  }
  return{schemaVersion:1,generatedAt:new Date().toISOString(),source:'Listes réellement chargées dans le navigateur',safeForEngine:blocking.length===0,summary:{armies:armies.length,units:entries.length,cards:entries.reduce((sum,entry)=>sum+1+(entry.unit.upgrades||[]).length,0),simulatedAttacks,blocking:blocking.length,warnings:warnings.length},armies:armies.map(army=>({id:army.id,listName:army.list.listName||army.list.listname||null,faction:army.list.faction||null,units:units.filter(unit=>unit.army===army.id)})),blocking,warnings};
}
function downloadLiveGameReport(report){const clean=JSON.stringify(report,null,2),blob=new Blob([clean],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`swl-test-partie-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function showLiveGameReport(){const report=buildLiveGameReport(),status=report.safeForEngine?'ready':'blocked';stage=1;root.innerHTML=`<section class="live-game-report ${status}"><header><div><small>CONTRÔLE DES DONNÉES RÉELLEMENT IMPORTÉES</small><h1>${report.safeForEngine?'✓ LISTES PRÊTES POUR LE MOTEUR':'⚠ BLOCAGE MOTEUR DÉTECTÉ'}</h1><p>Test exécuté sur les listes actuellement stockées dans ce navigateur, et non sur une liste de démonstration.</p></div><b>${report.summary.simulatedAttacks}<small>couples arme/cible</small></b></header><div class="report-counters"><span><b>${report.summary.units}</b> unités</span><span><b>${report.summary.cards}</b> cartes</span><span class="danger"><b>${report.summary.blocking}</b> blocage(s)</span><span class="warning"><b>${report.summary.warnings}</b> avertissement(s)</span></div>${report.blocking.length?`<section><h2>BLOCAGES À CORRIGER</h2>${report.blocking.map(issue=>`<article class="report-issue danger"><b>${issue.unit}</b><span>${issue.card} · ${issue.message}</span></article>`).join('')}</section>`:''}${report.warnings.length?`<section><h2>CONTRÔLES DE CATALOGUE</h2>${report.warnings.map(issue=>`<article class="report-issue warning"><b>${issue.unit}</b><span>${issue.card} · ${issue.message}</span></article>`).join('')}</section>`:'<section class="report-clear"><b>✓ Tous les visuels et noms français sont raccordés.</b></section>'}<section><h2>UNITÉS TESTÉES</h2><div class="report-units">${report.armies.flatMap(army=>army.units).map(unit=>`<article><b>${unit.name}</b><span>Courage ${unit.courage??'?'} · défense ${unit.defenseColor||'?'}</span><small>${unit.weapons.length} arme(s) · ${unit.assistedRules.length} règle(s) assistée(s)</small></article>`).join('')}</div></section><footer><button class="secondary" id="closeLiveReport">Retour aux unités</button><button class="primary" id="downloadLiveReport">Télécharger le rapport JSON</button></footer><small class="privacy-note">Aucun jeton GitHub, identifiant Gist ou secret de synchronisation n’est inclus.</small></section>`;$('#closeLiveReport').onclick=()=>pick('attacker');$('#downloadLiveReport').onclick=()=>downloadLiveGameReport(report);progress()}

// Attaques gratuites accordées par un déplacement. Elles empruntent le moteur
// normal, mais ne consomment pas d'action et ne terminent pas l'activation.
let freeAttackContext=null;
function movementFreeAttack(entry){
  const state=stateFor(entry),actions=state.activationActions||[],moved=actions.includes('move'),used=state.freeAttackRound===currentRound()||actions.includes('attack');
  if(!moved||used)return null;
  if(hasResolvedKeyword(entry,'charge'))return{kind:'charge',label:'CHARGE',range:'melee',help:'Après le déplacement : attaque gratuite au corps-à-corps contre l’unité contactée.'};
  if(hasResolvedKeyword(entry,'aguerri'))return{kind:'aguerri',label:'AGUERRI',range:'ranged',help:'Après l’action Se déplacer : attaque gratuite avec des armes à distance uniquement.'};
  if(hasResolvedKeyword(entry,'implacable'))return{kind:'implacable',label:'IMPLACABLE',range:'any',help:'Après l’action Se déplacer : attaque gratuite.'};
  return null;
}
const activationAutomationFreeAttackBase=activationAutomationPanel;
activationAutomationPanel=function(entry){
  const base=activationAutomationFreeAttackBase(entry),free=movementFreeAttack(entry);
  if(!free)return base;
  const card=`<section class="activation-automation free-attack"><header><strong>ATTAQUE GRATUITE DISPONIBLE</strong><small>Cette attaque ne consomme aucune des actions normales.</small></header><div><button data-free-attack="${free.kind}"><b>${free.label}</b><small>${free.help}</small></button></div></section>`;
  return base+card;
};
const bindActivationAutomationFreeAttackBase=bindActivationAutomation;
bindActivationAutomation=function(entry,role){
  bindActivationAutomationFreeAttackBase(entry,role);
  root.querySelectorAll('[data-free-attack]').forEach(button=>button.onclick=()=>{const free=movementFreeAttack(entry);if(!free)return;freeAttackContext={attackerId:entry.id,kind:free.kind,range:free.range};attacker=entry;defender=null;stage=3;stageWipe=true;pick('defender')});
};
const initAttackFreeBase=initAttack;
initAttack=function(){initAttackFreeBase();if(freeAttackContext?.attackerId===attacker?.id&&attackState){attackState.freeAttack=freeAttackContext.kind;attackState.freeAttackRange=freeAttackContext.range}};
const stepIssueFreeBase=stepIssue;
stepIssue=function(){const base=stepIssueFreeBase();if(base)return base;if(attackStep===0&&attackState?.freeAttackRange==='melee'&&attackType()!=='melee')return 'Charge autorise uniquement une attaque au corps-à-corps.';if(attackStep===0&&attackState?.freeAttackRange==='ranged'&&attackType()!=='ranged')return 'Aguerri autorise uniquement une attaque à distance.';return null};
const markUnitActivatedFreeBase=markUnitActivated;
markUnitActivated=function(entry){if(attackState?.freeAttack)return;markUnitActivatedFreeBase(entry)};
const saveAttackHistoryFreeBase=saveAttackHistory;
saveAttackHistory=function(){const free=attackState?.freeAttack;saveAttackHistoryFreeBase();if(!free)return;const state=stateFor(attacker);unitStates[attacker.id]={...state,freeAttackRound:currentRound(),freeAttackKind:free};persistUnitStates();if(attackHistory[0]){attackHistory[0].origin=free==='charge'?'Charge':free==='aguerri'?'Aguerri':'Implacable';attackHistory[0].event='Attaque gratuite après déplacement';localStorage.setItem(historyKey,JSON.stringify(attackHistory))}};
const resolveScreenFreeBase=resolveScreen;
resolveScreen=function(){resolveScreenFreeBase();if(!attackState?.freeAttack||attackStep!==5)return;const old=$('#nextAttack');if(!old)return;const next=old.cloneNode(true);old.replaceWith(next);next.textContent=defenseResult().result.wounds?'Appliquer et reprendre l’activation':'Terminer et reprendre l’activation';next.onclick=()=>{if(stepIssue()){resolveScreen();return}const active=attacker;saveAttackHistory();freeAttackContext=null;attackState=null;attackStep=0;attacker=active;defender=null;stage=2;stageWipe=true;overview(active,'attack')};};
let lastConclusionAttackState=null;
const resolveScreenConclusionBase=resolveScreen;
resolveScreen=function(){resolveScreenConclusionBase();if(attackStep===5&&attackState&&attackState!==lastConclusionAttackState){lastConclusionAttackState=attackState;const popup=attackConclusionPopupContent();if(popup)showRulePopup(popup,'attack-conclusion-popup')}};

// Rapport de préparation enrichi : empreinte de liste, couverture des règles et
// points qui nécessitent encore une décision humaine pendant la partie.
const buildLiveGameReportBase=buildLiveGameReport;
function reportFingerprint(value){let hash=2166136261;for(const char of JSON.stringify(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return`SWL-${(hash>>>0).toString(16).padStart(8,'0').toUpperCase()}`}
buildLiveGameReport=function(){const report=buildLiveGameReportBase();for(const army of report.armies){army.fingerprint=reportFingerprint({name:army.listName,faction:army.faction,units:army.units.map(unit=>[unit.sourceName,unit.upgrades])});for(const unit of army.units){const entry=entries.find(candidate=>candidate.id===unit.id),rules=entry?resolved(entry):[];unit.automaticRules=[...new Set(rules.filter(item=>item.def.impact==='attaque'||item.def.impact==='défense').map(item=>item.def.name))];unit.humanChecks=[...new Set(rules.filter(item=>item.def.impact==='autre').map(item=>item.def.name))];unit.addedModels=(entry?.unit?.upgrades||[]).map(card=>({card:card.name,models:Number(profileFor(card.name)?.addedModels)||0})).filter(item=>item.models>0)}}report.summary.automaticRules=report.armies.flatMap(army=>army.units).reduce((sum,unit)=>sum+unit.automaticRules.length,0);report.summary.humanChecks=report.armies.flatMap(army=>army.units).reduce((sum,unit)=>sum+unit.humanChecks.length,0);report.schemaVersion=2;return report};
const showLiveGameReportBase=showLiveGameReport;
showLiveGameReport=function(){showLiveGameReportBase();const counters=root.querySelector('.report-counters');if(counters){counters.insertAdjacentHTML('beforeend',`<span><b>${buildLiveGameReport().summary.automaticRules}</b> automatismes</span><span><b>${buildLiveGameReport().summary.humanChecks}</b> contrôles de table</span>`)}root.querySelectorAll('.report-units article').forEach((article,index)=>{const unit=buildLiveGameReport().armies.flatMap(army=>army.units)[index];if(unit)article.insertAdjacentHTML('beforeend',`<small>Empreinte ${buildLiveGameReport().armies.find(army=>army.units.includes(unit))?.fingerprint} · ${unit.automaticRules.length} auto · ${unit.humanChecks.length} assisté(s)</small>`)})};

// Autonome est piloté par les données certifiées de la carte. Cela couvre les
// choix multiples (Boba : Viser ou Esquive) sans déduction fragile sur le nom.
function certifiedAutonomousTokens(entry){return Array.isArray(profileFor(entry?.unit?.name)?.autonomousTokens)?profileFor(entry.unit.name).autonomousTokens:[]}

const buildLiveGameReportClassificationBase=buildLiveGameReport;
buildLiveGameReport=function(){const report=buildLiveGameReportClassificationBase(),guidedIds=new Set(['agile','aguerri','charge','implacable','indomptable','speeder-x']),strictPending=[];for(const army of report.armies)for(const unit of army.units){const entry=entries.find(candidate=>candidate.id===unit.id),guided=(entry?resolved(entry):[]).filter(item=>guidedIds.has(item.def.id)||(item.def.id==='autonome'&&certifiedAutonomousTokens(entry).length)).map(item=>item.def.name);unit.automaticRules=[...new Set([...unit.automaticRules,...guided])];unit.humanChecks=unit.humanChecks.filter(name=>!guided.includes(name));for(const card of [unit.sourceName,...unit.upgrades])if(!profileFor(card)?.fullCardCertification)strictPending.push({unit:unit.name,card:displayName(card)})}report.certificationV2Pending=[...new Map(strictPending.map(item=>[cardKey(item.card),item])).values()];report.summary.strictPending=report.certificationV2Pending.length;report.strictReady=report.safeForEngine&&report.summary.strictPending===0;report.summary.automaticRules=report.armies.flatMap(army=>army.units).reduce((sum,unit)=>sum+unit.automaticRules.length,0);report.summary.humanChecks=report.armies.flatMap(army=>army.units).reduce((sum,unit)=>sum+unit.humanChecks.length,0);return report};
const showLiveGameReportStrictBase=showLiveGameReport;
showLiveGameReport=function(){showLiveGameReportStrictBase();const report=buildLiveGameReport(),counter=root.querySelector('.report-counters');counter?.insertAdjacentHTML('beforeend',`<span class="${report.strictReady?'':'warning'}"><b>${report.summary.strictPending}</b> certification(s) V2</span>`);if(!report.strictReady){const title=root.querySelector('.live-game-report h1');if(title)title.textContent='⚠ DONNÉES JOUABLES · CERTIFICATION V2 INCOMPLÈTE';const firstSection=root.querySelector('.live-game-report>section');firstSection?.insertAdjacentHTML('beforebegin',`<section><h2>CERTIFICATION EXHAUSTIVE À TERMINER</h2><p>${report.summary.strictPending} carte(s) utilisées par ces listes doivent encore être validées intégralement dans l’écran Certification des cartes.</p></section>`)}};

// ---- Cycle de vie des cartes d'amélioration : prête / inclinée / supprimée de la partie (21/09/2026) ----
// Icône flèche « ↱ » : action de carte, la carte s'incline et se redresse à la Phase Finale (réutilisable chaque round).
// Icône ✖ sur fond noir : la carte est SUPPRIMÉE de la partie pour appliquer l'effet (usage unique, ne revient jamais).
// Certaines cartes proposent les deux effets : incliner pour l'un, supprimer pour l'autre.
function discarded(state,card){return Array.isArray(state.discardedCards)&&state.discardedCards.includes(card)}
function discardCard(entry,card,patch={}){const state=stateFor(entry);updateUnitState(entry,{...patch,discardedCards:[...new Set([...(state.discardedCards||[]),card])],roundSeen:currentRound()})}
const cardUseFor=name=>window.SWL_REFERENCE?.cardUse?.[cardKey(name)]||'unknown';
const USE_HINT={passive:'carte permanente : aucun symbole ↱ ni ✖',exhaust:'symbole ↱ : la carte s’incline pour agir, redressée à la Phase Finale',discard:'symbole ✖ : usage unique, la carte est supprimée de la partie',both:'symboles ↱ et ✖ : s’incline pour un effet, ou se supprime pour l’autre',unknown:'utilisation non classée : cochez à la main'};
const unitStatePanelLifecycleBase=unitStatePanel;
unitStatePanel=function(entry){
  const html=unitStatePanelLifecycleBase(entry),ups=entry.unit.upgrades||[];
  if(!ups.length)return html;
  const state=stateFor(entry),rows=ups.map(up=>{
    const slug=slugOf(up.name),tilted=exhausted(state,slug),gone=discarded(state,slug),use=cardUseFor(up.name),canTilt=use==='exhaust'||use==='both'||use==='unknown',canDiscard=use==='discard'||use==='both'||use==='unknown';
    return `<div class="card-life ${use} ${gone?'gone':tilted?'tilted':''}"><span>${displayName(up.name)}<small>${USE_HINT[use]}</small></span>${canTilt?`<button type="button" data-card-life="tilt:${slug}" aria-pressed="${tilted}" ${gone?'disabled':''}>${tilted?'Inclinée · redresser':'Prête · incliner'}</button>`:''}${canDiscard?`<button type="button" data-card-life="gone:${slug}" aria-pressed="${gone}">${gone?'Supprimée · restaurer':'Supprimer de la partie'}</button>`:''}${FLIP_CARDS.has(cardKey(up.name))?`<button type="button" class="card-flip ${isFlipped(state,slug)?'flipped':''}" data-card-life="flip:${slug}" aria-pressed="${isFlipped(state,slug)}">${isFlipped(state,slug)?'Carte retournée · remettre':'Retourner la carte'}</button>`:''}</div>`
  }).join('');
  const block=`<details class="card-lifecycle" open><summary>Cartes d’amélioration : prête · inclinée · supprimée</summary><small>Une carte inclinée se redresse à la Phase Finale. Une carte à icône ✖ est supprimée de la partie une fois utilisée : elle ne revient pas.</small>${rows}</details>`;
  const at=html.lastIndexOf('<button type="button" class="secondary state-reset"');
  return at<0?html:html.slice(0,at)+block+html.slice(at)
};
const bindUnitStateLifecycleBase=bindUnitState;
bindUnitState=function(entry,role){
  bindUnitStateLifecycleBase(entry,role);
  root.querySelectorAll('[data-card-life]').forEach(button=>button.onclick=()=>{
    const [kind,slug]=button.dataset.cardLife.split(':'),state=stateFor(entry);
    if(kind==='tilt'){const list=state.exhaustedCards||[];updateUnitState(entry,{exhaustedCards:list.includes(slug)?list.filter(card=>card!==slug):[...list,slug],roundSeen:currentRound()})}
    else if(kind==='flip'){const list=state.flippedCards||[];updateUnitState(entry,{flippedCards:list.includes(slug)?list.filter(card=>card!==slug):[...list,slug]})}
    else{const list=state.discardedCards||[];updateUnitState(entry,{discardedCards:list.includes(slug)?list.filter(card=>card!==slug):[...list,slug]})}
    overview(entry,role)
  })
};
// Actions de carte propres à une CARTE d'amélioration (et non à un mot-clé) : gabarit CARD_KEYWORD_ACTIONS avec le champ « card ».
Object.assign(CARD_KEYWORD_ACTIONS,{
  'carte-grappin-de-sabine':{card:'sabine s grapple line',title:'GRAPPIN DE SABINE',kind:'action',text:'Action de carte (↱→, la carte s’incline) : une unité de soldats ennemie à portée 1 et en LdV gagne 2 pions Immobilisation et 2 pions Suppression.',pick:{max:()=>1,enemy:true,soldiersOnly:true,effect:{immobilize:2,suppression:2}}},
  'carte-cables-ascensionnels':{card:'ascension cables',title:'CÂBLES ASCENSIONNELS',kind:'roundfree',text:'Action de carte gratuite (↱», la carte s’incline) : cette unité gagne Ascension jusqu’à la fin de son activation.',self:{}},
});
const keywordValueCardBase=keywordValue;
keywordValue=function(entry,id){const def=CARD_KEYWORD_ACTIONS[id];if(def&&def.card)return hasCard(entry,def.card)?1:0;return keywordValueCardBase(entry,id)};
// ---- Effets propres aux cartes d'amélioration (audit visuel du 20/09/2026) ----
// Chaque action / réaction imprimée sur une amélioration a un bouton au moment où elle agit :
//  - fiche d'unité : actions de carte (→ action, » action gratuite, ↱ la carte s'incline, ✖ la carte est supprimée) ;
//  - étapes d'attaque : réactions (Protecteur, Stimulants, Barrière de Force…) et cartes qui ajoutent des dés ou des mots-clés ;
//  - bonus permanents : vitesse et courage des cartes qui les modifient.
let choiceEntry=null,cardJournalNote='';
function cardSlugs(entry,def){const keys=[].concat(def.card),slugs=new Set();for(const up of entry?.unit?.upgrades||[])if(keys.includes(cardKey(up.name))){slugs.add(slugOf(up.name));slugs.add(slugOf(cardKey(up.name)))}return[...slugs]}
function cardSpent(entry,def,state){const slugs=cardSlugs(entry,def),tilted=slugs.some(slug=>exhausted(state,slug)),gone=slugs.some(slug=>discarded(state,slug));return def.use==='tilt'?tilted||gone:def.use==='discard'?gone:def.use==='both'?tilted||gone:false}
function spendCard(entry,def,mode){const slugs=cardSlugs(entry,def);if(!slugs.length)return;const state=stateFor(entry),use=mode||def.use;if(use==='tilt')updateUnitState(entry,{exhaustedCards:[...new Set([...(state.exhaustedCards||[]),...slugs])],roundSeen:currentRound()});else if(use==='discard')updateUnitState(entry,{discardedCards:[...new Set([...(state.discardedCards||[]),...slugs])],roundSeen:currentRound()})}
function unspendCard(entry,def){const slugs=cardSlugs(entry,def),state=stateFor(entry);updateUnitState(entry,{exhaustedCards:(state.exhaustedCards||[]).filter(card=>!slugs.includes(card)),discardedCards:(state.discardedCards||[]).filter(card=>!slugs.includes(card))})}
const tiltedChoices=entry=>{const state=entry?stateFor(entry):{};return(entry?.unit?.upgrades||[]).filter(up=>exhausted(state,slugOf(up.name))&&cardUseFor(up.name)!=='passive').map(up=>({label:'Redresser '+displayName(up.name),redress:slugOf(up.name)}))};
const names=list=>list.map(entryName).join(', ')||'l’unité choisie';
const CARD_ACTION_DEFS={
  // Actions de la Force
  'force-guidance':{card:'force guidance',title:'GUIDÉ PAR LA FORCE',kind:'roundfree',use:'tilt',text:'Action de carte gratuite (↱») : jusqu’à 2 unités alliées à portée 2 gagnent 1 pion Adrénaline.',pick:{max:()=>2,self:false,effect:{surge:1}}},
  'force-push':{card:'force push',title:'POUSSÉ PAR LA FORCE',kind:'roundfree',use:'tilt',text:'Action de carte gratuite (↱») : une unité de soldats ennemie à portée 1 effectue un déplacement à vitesse 1, même engagée. Vous résolvez ce déplacement.',pick:{max:()=>1,enemy:true,soldiersOnly:true,effect:null},journal:picked=>names(picked)+' effectue un déplacement à vitesse 1 (même engagée) que vous résolvez'},
  'old-jedi-trick':{card:'old jedi trick',title:'VIEILLE RUSE JEDI',kind:'roundfree',use:'tilt',text:'Côté Lumineux · action de carte gratuite (↱») : une unité de soldats ennemie non-Massive, non-Énorme à portée 2 gagne 2 pions Suppression.',pick:{max:()=>1,enemy:true,soldiersOnly:true,effect:{suppression:2}}},
  // Actions de commandement et de soutien (»  = action gratuite)
  'governor-pryce':{card:'governor pryce',title:'GOUVERNEUR PRYCE',kind:'roundfree',text:'Action de carte gratuite (») : une unité de soldats alliée à portée 2 gagne 1 pion Viser et 1 pion Suppression.',pick:{max:()=>1,self:false,soldiersOnly:true,effect:{aim:1,suppression:1}}},
  'shriv-suurgav':{card:'shriv suurgav',title:'SHRIV SUURGAV',kind:'roundfree',text:'Action de carte gratuite (») : une unité de soldats alliée à portée 2 gagne 1 pion Esquive et peut gagner 1 pion Suppression.',pick:{max:()=>1,self:false,soldiersOnly:true,effect:null},choices:[{label:'+1 Esquive',effect:{dodge:1}},{label:'+1 Esquive et +1 Suppression',effect:{dodge:1,suppression:1}}]},
  'mounted-gunners':{card:'mounted gunners',title:'ARTILLEURS EMBARQUÉS',kind:'roundfree',text:'Après une action Attaquer où cette arme n’a pas été ajoutée à une réserve : action Attaquer gratuite en n’utilisant que cette arme (même si l’unité a déjà attaqué ce tour).',self:{},journal:()=>'action Attaquer gratuite avec l’arme Blaster Monté uniquement'},
  'hunter':{card:'hunter',title:'HUNTER',kind:'roundfree',text:'Action de carte gratuite (») : une unité de soldats ennemie non-Massive, non-Énorme à portée 1 et en LdV. Lancez 1 dé d’attaque noir : Touche ou Critique = 1 blessure.',pick:{max:()=>1,enemy:true,soldiersOnly:true,effect:null},choices:[{label:'Touche ou Critique : 1 blessure',hit:true},{label:'Blanc ou Échec : aucun effet'}],journal:(picked,choice)=>names(picked)+' : 1 dé d’attaque noir — '+(choice?.hit?'Touche/Critique : 1 blessure à appliquer à la table':'aucun effet')},
  'kallus-the-operative':{card:'kallus the operative',title:'AGENT KALLUS',kind:'roundfree',use:'tilt',text:'Action de carte gratuite (↱») : une unité ennemie engagée avec cette unité gagne 2 pions Immobilisation.',pick:{max:()=>1,enemy:true,effect:{immobilize:2}}},
  'wedge-antilles':{card:'wedge antilles',title:'WEDGE ANTILLES',kind:'roundfree',use:'tilt',text:'Action de carte gratuite (↱») : cette unité effectue un pivot.',self:{},journal:()=>'pivot gratuit à effectuer sur la table'},
  'stormtrooper-captain':{card:'stormtrooper captain',title:'CAPITAINE STORMTROOPER',kind:'roundfree',use:'tilt',text:'Début d’activation (↱) : cette unité ne peut ni retirer de pions Suppression ni être démoralisée pendant cette activation.',self:{},journal:()=>'ne peut ni retirer de Suppression ni être démoralisée pendant cette activation'},
  'rebel-trooper-captain':{card:'rebel trooper captain',title:'CAPITAINE SOLDAT REBELLE',kind:'roundfree',use:'tilt',text:'Début d’activation (↱) : cette unité ne peut ni retirer de pions Suppression ni être démoralisée pendant cette activation.',self:{},journal:()=>'ne peut ni retirer de Suppression ni être démoralisée pendant cette activation'},
  'din-djarin-amban-rifle':{card:'din djarin amban rifle',title:'FUSIL AMBAN',kind:'action',cost:2,text:'Action de carte (→→, consomme 2 actions) : si non engagée, déplacement à vitesse 1 ; puis une unité ennemie en LdV subit 1 blessure et gagne 1 Suppression sur Touche/Critique d’un dé rouge.',pick:{max:()=>1,enemy:true,effect:null},choices:[{label:'Touche ou Critique : 1 blessure + 1 Suppression',effect:{suppression:1},hit:true},{label:'Blanc ou Échec : aucun effet'}],journal:(picked,choice)=>'déplacement à vitesse 1 (si non engagée) puis '+names(picked)+' : 1 dé d’attaque rouge — '+(choice?.hit?'Touche/Critique : 1 Suppression appliquée, 1 blessure à appliquer à la table':'aucun effet')},
  'stormtrooper-sharpshooter':{card:'stormtrooper sharpshooter',title:'TIREUR EMBUSQUÉ STORMTROOPER',kind:'action',text:'Action de carte (→) : si non engagée, une unité de soldats ennemie non engagée en LdV. 1 dé d’attaque rouge : Touche/Critique = 1 blessure et 1 Suppression.',pick:{max:()=>1,enemy:true,soldiersOnly:true,effect:null},choices:[{label:'Touche ou Critique : 1 blessure + 1 Suppression',effect:{suppression:1},hit:true},{label:'Blanc ou Échec : aucun effet'}],journal:(picked,choice)=>names(picked)+' : 1 dé d’attaque rouge — '+(choice?.hit?'Touche/Critique : 1 Suppression appliquée, 1 blessure à appliquer à la table':'aucun effet')},
  'rebel-ambusher':{card:'rebel ambusher',title:'TIREUR EMBUSQUÉ REBELLE',kind:'action',text:'Action de carte (→) : si non engagée, une unité de soldats ennemie non engagée en LdV. 1 dé d’attaque rouge : Touche/Critique = 1 blessure et 1 Suppression.',pick:{max:()=>1,enemy:true,soldiersOnly:true,effect:null},choices:[{label:'Touche ou Critique : 1 blessure + 1 Suppression',effect:{suppression:1},hit:true},{label:'Blanc ou Échec : aucun effet'}],journal:(picked,choice)=>names(picked)+' : 1 dé d’attaque rouge — '+(choice?.hit?'Touche/Critique : 1 Suppression appliquée, 1 blessure à appliquer à la table':'aucun effet')},
  'remote-doc':{card:'remote doc',title:'MÉDECIN D’UN MONDE RECULÉ',kind:'action',text:'Action de carte (→) : une unité alliée de soldats non-droïdes à portée 1 retire 1 Blessure/Poison ou restaure 1 figurine, puis 2 dés de défense blancs : 1 Suppression par Bloc/Adrénaline.',pick:{max:()=>1,self:false,soldiersOnly:true,effect:null},choices:[0,1,2].map(n=>({label:n+' Bloc/Adrénaline sur les 2 dés'+(n?' : +'+n+' Suppression':''),effect:n?{suppression:n}:null,count:n})),journal:(picked,choice)=>names(picked)+' : retirer 1 pion Blessure/Poison ou restaurer 1 figurine (à la table) ; 2 dés de défense blancs → '+(choice?.count||0)+' Suppression gagnée(s) par l’unité choisie'},
  'rebel-trooper-specialist':{card:'rebel trooper specialist',title:'SPÉCIALISTE SOLDAT REBELLE',kind:'roundfree',use:'tilt',text:'Action de carte gratuite (↱») : cette unité gagne 1 pion Esquive ou 1 pion Adrénaline.',choices:[{label:'+1 Esquive',effect:{dodge:1}},{label:'+1 Adrénaline',effect:{surge:1}}]},
  'stormtrooper-specialist':{card:'stormtrooper specialist',title:'SPÉCIALISTE STORMTROOPER',kind:'roundfree',use:'tilt',text:'Action de carte : cette unité gagne 1 pion Viser ou 1 pion Adrénaline.',choices:[{label:'+1 Viser',effect:{aim:1}},{label:'+1 Adrénaline',effect:{surge:1}}]},
  'unorthodox-tactician':{card:'unorthodox tactician',title:'TACTICIEN PEU ORTHODOXE',kind:'roundfree',text:'Début d’activation : lancez 3 dés de défense rouges ; pour chaque Bloc/Adrénaline, une unité alliée différente à portée 3 gagne 1 pion Viser (choisissez-les ici).',pick:{max:()=>3,self:false,effect:{aim:1}}},
  'vigilance':{card:'vigilance',title:'VIGILANCE',kind:'roundfree',text:'Début de « Retirer les pions » : 1 unité de soldats alliée à portée 2 (ou jusqu’à 2 unités ▲) ne retire pas jusqu’à 1 pion Esquive.',pick:{max:()=>2,self:true,soldiersOnly:true,effect:{keepDodge:1}}},
  'combat-group-leader':{card:'combat group leader',title:'CHEF DE GROUPE DE COMBAT',kind:'round',text:'Début de la Phase d’Activation : l’unité choisie à la mise en place (à portée 2) gagne 1 pion Viser ou 1 pion Esquive.',pick:{max:()=>1,self:false,effect:null},choices:[{label:'Viser pour l’unité choisie',effect:{aim:1}},{label:'Esquive pour l’unité choisie',effect:{dodge:1}}]},
  'endurance':{card:'endurance',title:'ENDURANCE',kind:'round',text:'Fin de la Phase d’Activation : cette unité peut retirer 1 pion Suppression.',self:{suppression:-1}},
  'baron-rudor':{card:'baron rudor',title:'BARON RUDOR',kind:'roundfree',text:'Après une action Récupérer : cette unité gagne 1 pion Viser.',self:{aim:1}},
  'sleeper-cell-astromech':{card:'sleeper cell astromech',title:'ASTROMECH · CELLULE DORMANTE',kind:'roundfree',text:'Quand cette unité termine un déplacement à portée 1 d’au moins 1 pion Objectif : +1 pion Esquive.',self:{dodge:1}},
  // Ordres (Phase de Commandement / Phase d'Activation)
  'trusted-agent':{card:'trusted agent',title:'AGENT DE CONFIANCE',kind:'roundfree',use:'discard',text:'Donner des ordres (✖ supprime la carte) : une unité ▲ alliée peut donner un ordre à l’unité choisie, quelle que soit son affiliation.',pick:{max:()=>1,self:false,effect:null},journal:picked=>names(picked)+' peut recevoir un ordre de cette unité, quelle que soit son affiliation'},
  'hq-uplink':{card:'hq uplink',title:'LIAISON HQ',kind:'roundfree',use:'tilt',text:'Donner des ordres (↱) : cette unité peut se donner un ordre à elle-même.',self:{},journal:()=>'peut se donner un ordre à elle-même'},
  'seize-the-opportunity':{card:'seize the opportunity',title:'SAISIR L’OPPORTUNITÉ',kind:'roundfree',use:'discard',text:'Donner des ordres (✖ supprime la carte) : cette unité se donne un ordre à elle-même.',self:{},journal:()=>'se donne un ordre à elle-même'},
  'comms-hacking-unit':{card:'comms hacking unit',title:'UNITÉ DE PIRATAGE COMMS',kind:'round',text:'Donner des ordres : après qu’une unité ennemie à portée 1 a reçu un ordre, cette unité peut se donner un ordre à elle-même.',self:{},journal:()=>'se donne un ordre à elle-même (après un ordre ennemi à portée 1)'},
  'improvised-orders':{card:'improvised orders',title:'ORDRES IMPROVISÉS',kind:'roundfree',use:'tilt',text:'Après avoir pioché un pion Ordre (↱) : piochez un second pion, choisissez-en un et remélangez l’autre. Redressée à la Phase Finale.',self:{},journal:()=>'second pion Ordre pioché, un des deux utilisé, l’autre remélangé'},
  // Cartes de fin d'activation et à usage unique
  'additional-supplies':{card:'additional supplies',title:'RAVITAILLEMENT SUPPLÉMENTAIRE',kind:'end',use:'discard',needsTilted:true,text:'Fin d’activation (✖ supprime la carte) : redressez 1 des améliorations inclinées de cette unité.',get choices(){return tiltedChoices(choiceEntry)}},
  'unstable-astromech':{card:'unstable astromech',title:'ASTROMECH INSTABLE',kind:'end',use:'discard',text:'Fin d’activation (✖) : cette unité peut effectuer une attaque ou se déplacer, puis lancez 3 dés d’attaque noirs : 1 blessure par Touche/Critique.',self:{},choices:[0,1,2,3].map(n=>({label:n+' Touche/Critique sur les 3 dés'+(n?' : '+n+' blessure(s)':''),count:n})),journal:(picked,choice)=>'attaque ou déplacement, puis 3 dés d’attaque noirs : '+(choice?.count||0)+' blessure(s) subie(s) par l’unité — à appliquer à la table'},
  'smoke-grenades':{card:'smoke grenades',title:'GRENADES FUMIGÈNES',kind:'roundfree',use:'discard',text:'Pendant l’activation (✖) : cette unité effectue une action gratuite Fumée 1.',self:{},journal:()=>'action gratuite Fumée 1 à effectuer (pion Fumée à poser)'},
  'imperial-march':{card:'imperial march',title:'MARCHE IMPÉRIALE',kind:'roundfree',use:'discard',text:'Pendant un déplacement (✖) : cette unité gagne Charge jusqu’à la fin de son activation. (Seconde action Se déplacer : vitesse +1 sans supprimer la carte.)',self:{},journal:()=>'gagne Charge jusqu’à la fin de son activation'},
  'hit-and-run':{card:'hit and run',title:'FRAPPE ET REPLI',kind:'roundfree',use:'tilt',text:'Après une action Attaquer (↱) : cette unité effectue une action Se déplacer.',self:{},journal:()=>'action Se déplacer gratuite après l’attaque'},
  'ryder-azadi':{card:'ryder azadi',title:'RYDER AZADI',kind:'roundfree',use:'tilt',text:'Pendant un déplacement (↱) : augmentez ou réduisez de 1 la vitesse maximale de cette unité.',choices:[{label:'Vitesse maximale +1',selfPatch:state=>({speedDelta:(Number(state.speedDelta)||0)+1})},{label:'Vitesse maximale −1',selfPatch:state=>({speedDelta:(Number(state.speedDelta)||0)-1})}]},
  'serenity':{card:'serenity',title:'TRANQUILLITÉ',kind:'roundfree',use:'both',text:'Après le ralliement d’une unité alliée à portée 2 (↱ ou ✖) : lancez un nombre de dés de défense égal au courage ; 1 Suppression retirée par Bloc/Adrénaline pour les deux unités. ✖ : dés rouges à la place des blancs.',pick:{max:()=>1,self:false,effect:null},get choices(){const courage=Number(certifiedUnitStats(choiceEntry)?.courage),dice=Number.isFinite(courage)&&courage>0?courage:3,list=[];for(const [spend,label] of [['tilt','Incliner (↱) : dés blancs'],['discard','Supprimer (✖) : dés rouges']])for(let n=0;n<=dice;n++)list.push({label:label+' — '+n+' Bloc/Adrénaline sur '+dice+' dé(s)'+(n?' : −'+n+' Suppression':''),spend,count:n,effect:n?{suppression:-n}:null,selfPatch:n?state=>({suppression:Math.max(0,(Number(state.suppression)||0)-n)}):undefined});return list},journal:(picked,choice)=>names(picked)+' et cette unité : '+(choice?.spend==='discard'?'dés de défense ROUGES':'dés de défense blancs')+' en nombre égal au courage → '+(choice?.count||0)+' Suppression retirée(s) pour chacune'},
  'inquisitorius-training':{card:'inquisitorius training',title:'ENTRAÎNEMENT DE L’INQUISITORIUS',kind:'free',text:'Quand une unité ennemie à portée 1 incline une amélioration : 1 dé de défense rouge ; Bloc/Adrénaline = l’effet est annulé (l’amélioration reste inclinée).',self:{},choices:[{label:'Bloc ou Adrénaline : effet annulé',cancel:true},{label:'Échec : l’effet s’applique'}],journal:(picked,choice)=>'dé de défense rouge contre l’amélioration inclinée par l’ennemi : '+(choice?.cancel?'l’effet est ANNULÉ (l’amélioration reste inclinée)':'l’effet de l’amélioration s’applique')},
};
// Cartes existantes : l'incliner / la supprimer est désormais suivi (mêmes règles que les nouvelles).
CARD_KEYWORD_ACTIONS['carte-grappin-de-sabine'].use='tilt';
CARD_KEYWORD_ACTIONS['carte-cables-ascensionnels'].use='tilt';
CARD_KEYWORD_ACTIONS['carte-cables-ascensionnels'].card=['ascension cables','climbing cables'];
for(const [id,def] of Object.entries(CARD_ACTION_DEFS))CARD_KEYWORD_ACTIONS[id]=def;
keywordValue=function(entry,id){const def=CARD_KEYWORD_ACTIONS[id];if(def&&def.card)return[].concat(def.card).some(key=>hasCard(entry,key))?1:0;return keywordValueCardBase(entry,id)};
const applyCardActionCards=applyCardKeywordAction;
applyCardKeywordAction=function(entry,id,choiceIndex){
  const def=CARD_KEYWORD_ACTIONS[id];
  if(!def||!def.card)return applyCardActionCards(entry,id,choiceIndex);
  choiceEntry=entry;
  const picked=(kwActionPick&&kwActionPick.id===id?kwActionPick.selected:[]).map(targetId=>entries.find(candidate=>candidate.id===targetId)).filter(Boolean),choice=def.choices?def.choices[choiceIndex]:null;
  applyCardActionCards(entry,id,choiceIndex);
  if(def.kind==='action'&&(def.cost||1)>1){const state=stateFor(entry);updateUnitState(entry,{activationActions:[...(state.activationActions||[]),...Array((def.cost||1)-1).fill('card:'+id)]})}
  if(choice&&choice.selfPatch)updateUnitState(entry,choice.selfPatch(stateFor(entry)));
  if(choice&&choice.redress){const state=stateFor(entry);updateUnitState(entry,{exhaustedCards:(state.exhaustedCards||[]).filter(card=>card!==choice.redress)})}
  spendCard(entry,def,choice&&choice.spend);
  const note=typeof def.journal==='function'?def.journal(picked,choice):def.journal;
  cardJournalNote=[note,choice&&choice.redress?'redresse '+choice.label.replace(/^Redresser /,''):''].filter(Boolean).join(' · ')
};
// Bonus permanents portés par des cartes : vitesse (Pilote de TIE, Jetpack de Din, Blaster à Répétition) et courage (Officiers, Gideon, Kallus, Rex, Cassian).
const CARD_SPEED_BONUS={'imperial tie pilot':1,'din djarin jetpack':1,'repeating blaster':-1};
const CARD_COURAGE_BONUS={'gideon hask':1,'imperial officer':1,'rebel officer':1,'kallus the operative':1,'captain rex':1,'cassian andor operative':1};
const cardBonus=(entry,table)=>(entry?.unit?.upgrades||[]).reduce((sum,up)=>sum+(table[cardKey(up.name)]||0),0);
// Cartes à deux faces / retournables : la face visible décide des mots-clés actifs (Bouclier de Combat, Cassian Andor, Postures).
const FLIP_CARDS=new Set(['battle shield wookiee','cassian andor operative','defensive posture','offensive posture']);
const FLIP_GATED={'battle shield wookiee':{flipped:['armure-x']},'cassian andor operative':{front:['profil-bas','mission-secrete'],flipped:['coup-de-chance-x']}};
const FLIP_SPEED={'battle shield wookiee':-1};
const isFlipped=(state,slug)=>Array.isArray(state.flippedCards)&&state.flippedCards.includes(slug);
const flipSpeedBonus=(entry,state)=>(entry?.unit?.upgrades||[]).reduce((sum,up)=>sum+(isFlipped(state,slugOf(up.name))?(FLIP_SPEED[cardKey(up.name)]||0):0),0);
const allResolvedFlipBase=allResolved;
allResolved=function(entry){
  const list=allResolvedFlipBase(entry);
  if(!entry)return list;
  const state=stateFor(entry);
  return list.filter(item=>{const gate=FLIP_GATED[cardKey(item.source)];if(!gate)return true;const on=isFlipped(state,slugOf(item.source));if(gate.flipped?.includes(item.def.id))return on;if(gate.front?.includes(item.def.id))return !on;return true})
};
const certifiedUnitStatsCardsBase=certifiedUnitStats;
certifiedUnitStats=function(entry){
  const stats=certifiedUnitStatsCardsBase(entry);
  if(!stats||!Number.isFinite(Number(stats.courage)))return stats;
  const state=stateFor(entry);let courage=Number(stats.courage);
  for(const up of entry.unit.upgrades||[]){const key=cardKey(up.name);if(key==='cassian andor operative'&&isFlipped(state,slugOf(up.name)))return{...stats,courage:null};courage+=CARD_COURAGE_BONUS[key]||0}
  return{...stats,courage}
};
// ---- Cartes qui interviennent pendant une attaque ----
// side : attacker | defender | attackerAllies | defenderAllies ; steps : 0 armes, 1 jet, 2 couvert, 3 modifications, 4 défense, 5 résumé.
// Cartes portées par UNE AUTRE unité mais qui agissent sur celle qui est affichée (alliée ou ennemie, selon la carte).
const SHEET_CROSS_CARDS=[
  {card:'strict orders',side:'allies',title:'ORDRES STRICTS',text:'Quand cette unité alliée qui a un pion Ordre face visible commence son étape « Se rallier », elle peut retirer 1 pion Suppression au lieu de lancer les dés.'},
  {card:'comms jammer',side:'enemies',title:'BROUILLEUR COMMS',text:'Si cette unité ennemie est à portée 1 de l’unité porteuse, elle ne peut pas recevoir d’ordres (sauf si elle se donne un ordre à elle-même).'},
  {card:'inspiring presence',side:'allies',title:'PRÉSENCE INSPIRANTE',text:'À portée 4 de l’unité porteuse, cette unité peut utiliser le courage de la porteuse pour vérifier si elle est paniquée.'},
  {card:'comms hacking unit',side:'enemies',title:'UNITÉ DE PIRATAGE COMMS',text:'Quand cette unité ennemie à portée 1 de l’unité porteuse reçoit un ordre, la porteuse peut se donner un ordre à elle-même.'},
  {card:'vigilance',side:'allies',title:'VIGILANCE',text:'Au début de « Retirer les pions », cette unité alliée à portée 2 peut ne pas retirer jusqu’à 1 pion Esquive (bouton dans la fiche de l’unité porteuse).'},
];
function crossCardNotes(entry){
  if(!entry)return[];
  return SHEET_CROSS_CARDS.flatMap(item=>entries.filter(other=>other.id!==entry.id&&!defeated(other)&&(item.side==='allies'?other.army===entry.army:other.army!==entry.army)&&hasCard(other,item.card)).map(other=>({label:item.title+' — '+entryName(other),note:item.text})))
}
const ATTACK_CARD_FX=[
  {id:'barrage-generator',card:'barrage generator',side:'attacker',steps:[0],ranged:true,needsFixed:true,use:'tilt',title:'GÉNÉRATEUR DE BARRAGE',text:'Arme à distance Fixe : incliner la carte ajoute 2 dés blancs et Suppressif à la réserve d’attaque.',done:'+2 dés blancs et Suppressif ajoutés à la réserve d’attaque'},
  {id:'generator-overcharge',card:'generator overcharge',side:'attacker',steps:[0],ranged:true,needsFixed:true,use:'tilt',title:'SURCHARGE DU GÉNÉRATEUR',text:'Arme à distance Fixe : incliner la carte ajoute 1 dé noir et Impact 1 à la réserve d’attaque.',done:'+1 dé noir et Impact 1 ajoutés à la réserve d’attaque'},
  {id:'spotter-link',card:'spotter link',side:'attackerAllies',steps:[0],ranged:true,title:'LIAISON AVEC UN OBSERVATEUR',text:'Si la cible est à portée 1 de cette unité, en LdV, et n’est pas au corps-à-corps : l’attaquant gagne Tireur d’Élite 1.'},
  {id:'mission-objective',card:'mission objective',side:'attacker',steps:[1],use:'tilt',title:'OBJECTIF DE MISSION',text:'Si la cible détient ou conteste un pion Objectif : incliner la carte pour relancer 1 dé d’attaque (étape « Relancer les dés »).',done:'relance de 1 dé d’attaque (à effectuer à la table)'},
  {id:'clairvoyance-attack',card:'clairvoyance',side:'attacker',steps:[1],use:'discard',title:'CLAIRVOYANCE · ATTAQUE',text:'✖ supprime la carte : relancez TOUS vos dés d’attaque, puis convertissez normalement l’Adrénaline ; ce jet ne peut plus être modifié.',done:'tous les dés d’attaque relancés (jet non modifiable ensuite)'},
  {id:'on-the-hunt',card:'on the hunt',side:'attacker',steps:[1],title:'EN CHASSE',text:'La cible est une unité de soldats avec au moins 1 pion Blessure : +1 pion Viser pendant « Lancer les dés d’attaque ».',apply:()=>{bumpTokens(attacker,{aim:1});attackState.availableAims=(Number(attackState.availableAims)||0)+1},undo:()=>{bumpTokens(attacker,{aim:-1});attackState.availableAims=Math.max(0,(Number(attackState.availableAims)||0)-1)},done:'+1 pion Viser gagné'},
  {id:'duck-and-cover',card:'duck and cover',side:'defender',steps:[2],ranged:true,title:'ÉVITEMENT ET COUVERT',text:'Au début de « Appliquer les esquives et couverts » : la défense peut gagner 1 pion Suppression.',apply:()=>{attackState.currentSuppression=(Number(attackState.currentSuppression)||0)+1},undo:()=>{attackState.currentSuppression=Math.max(0,(Number(attackState.currentSuppression)||0)-1)},done:'+1 pion Suppression pour la défense (compté dans le moral)'},
  {id:'entrenched',card:'entrenched',side:'defender',steps:[2],ranged:true,btn:'Conditions remplies : couvert en dés rouges',title:'RETRANCHEMENT',text:'Intégralement en territoire allié et sans pion Ordre face cachée : lancez des dés de défense ROUGES à la place des blancs pour la réserve de couvert.',done:'dés de couvert ROUGES à lancer à la place des blancs'},
  {id:'force-barrier',card:'force barrier',side:'defenderAllies',steps:[3],ranged:true,use:'tilt',title:'BARRIÈRE DE FORCE',text:'Une unité de soldats alliée à portée 1 défend : incliner la carte annule 1 résultat Critique OU jusqu’à 2 résultats Touche.',done:'annule 1 Critique ou jusqu’à 2 Touches (à retirer de la réserve)'},
  {id:'protector',card:'protector',side:'defenderAllies',steps:[3],ranged:true,use:'tilt',needsGuardian:true,title:'PROTECTEUR',text:'Quand cette unité utilise Gardien X : incliner la carte annule les Touches obtenues grâce à Gardien X comme des Blocs.',done:'les résultats annulés par Gardien X comptent comme des Blocs'},
  {id:'clairvoyance-defense',card:'clairvoyance',side:'defender',steps:[4],use:'discard',title:'CLAIRVOYANCE · DÉFENSE',text:'✖ supprime la carte, à l’étape « Relancer les dés » : relancez TOUS vos dés de défense, puis convertissez normalement l’Adrénaline ; ce jet ne peut plus être modifié.',done:'tous les dés de défense relancés'},
  {id:'emergency-stims',card:'emergency stims',side:'defender',steps:[4,5],use:'tilt',title:'STIMULANTS D’URGENCE',text:'Quand cette unité devrait subir des blessures : incliner la carte en prévient jusqu’à 2 et les place en pions Blessure sur la carte (subis à la fin de sa prochaine activation).',apply:()=>{const n=Math.min(2,Math.max(1,defenseResult().result.wounds||0));attackState.stimsN=n;bumpTokens(defender,{cardWound:n})},undo:()=>bumpTokens(defender,{cardWound:-(attackState.stimsN||1)}),done:'jusqu’à 2 blessures prévenues et placées sur la carte (à déduire des blessures subies)'},
  {id:'anger',card:'anger',side:'defender',steps:[5],needsWounds:true,title:'COLÈRE',text:'Cette unité a subi au moins 1 blessure : après résolution, elle gagne 1 pion Viser.',apply:()=>bumpTokens(defender,{aim:1}),undo:()=>bumpTokens(defender,{aim:-1}),done:'+1 pion Viser gagné'},
  {id:'dread',card:'dread',side:'defenderAllies',steps:[5],ranged:true,title:'TERREUR',text:'Si cette unité n’est pas engagée et que l’attaquant est à portée 2 et en LdV d’elle : l’attaquant gagne 1 pion Suppression après l’attaque.',apply:()=>bumpTokens(attacker,{suppression:1}),undo:()=>bumpTokens(attacker,{suppression:-1}),done:'l’attaquant gagne 1 pion Suppression'},
  {id:'crosshair',card:'crosshair',side:'attacker',steps:[0],info:true,title:'CROSSHAIR',text:'Tant que le Fusil Firepuncher est la seule arme de la réserve d’attaque : Critique 1 (appliqué automatiquement).'},
  {id:'kraken',card:'kraken',side:'attacker',steps:[0,1],btn:'Améliorer des dés d’attaque',input:{key:'krakenDefeated',label:'Figurines de cette unité précédemment vaincues',max:12},title:'KRAKEN',text:'Quand cette unité attaque, elle peut améliorer 1 dé d’attaque pour chaque figurine de cette unité précédemment vaincue.',done:'1 dé d’attaque amélioré par figurine vaincue (réserve d’attaque mise à jour)'},
  {id:'captain-rex',card:'captain rex',side:'attacker',steps:[5],needsWounds:true,btn:'L’unité ennemie est vaincue : action gratuite',title:'CAPITAINE CLONE REX',text:'Si cette unité vainc une unité ennemie grâce à cette attaque : après que l’action d’attaque a été résolue, elle peut effectuer 1 action gratuite.',apply:holder=>{const state=stateFor(holder);updateUnitState(holder,{freeActionOffers:[...(state.freeActionOffers||[]),{id:'captain-rex',label:'1 action gratuite (Capitaine Clone Rex : unité ennemie vaincue)',from:holder.id}]})},undo:holder=>{const offers=[...(stateFor(holder).freeActionOffers||[])],at=offers.map(offer=>offer.id).lastIndexOf('captain-rex');if(at>=0){offers.splice(at,1);updateUnitState(holder,{freeActionOffers:offers})}},done:'1 action gratuite offerte à l’unité (visible dans sa fiche)'},
  {id:'inspiring-presence',card:'inspiring presence',side:'defenderAllies',steps:[5],btn:'Utiliser le courage de cette unité',title:'PRÉSENCE INSPIRANTE',text:'Une unité alliée à portée 4 de cette unité peut utiliser son courage pour vérifier si elle est paniquée.',apply:holder=>{const courage=Number(certifiedUnitStats(holder)?.courage);attackState.fxPrev={...(attackState.fxPrev||{}),inspiring:attackState.commanderCourage};if(Number.isFinite(courage))attackState.commanderCourage=Math.max(Number(attackState.commanderCourage)||0,courage)},undo:()=>{attackState.commanderCourage=attackState.fxPrev?.inspiring;},done:'le courage de l’unité porteuse est repris dans le contrôle de panique (champ « Courage d’un Commandant »)'},
  {id:'posture-offensive',card:['offensive posture','defensive posture'],when:holder=>postureMode(holder)==='offensive',side:'defender',steps:[2],info:true,title:'POSTURE OFFENSIVE',text:'Cette unité ne peut pas dépenser de pions Esquive : le stock est ramené à 0 pour cette attaque (les pions restent sur l’unité).'},
  {id:'posture-defensive',card:['offensive posture','defensive posture'],when:holder=>postureMode(holder)==='defensive',side:'attacker',steps:[0,1],info:true,title:'POSTURE DÉFENSIVE',text:'Cette unité ne peut pas dépenser de pions Viser : le stock est ramené à 0 pour cette attaque (les pions restent sur l’unité).'},
];
const fxUsed=id=>!!attackState&&Object.keys(attackState.cardFx||{}).some(key=>key.startsWith(id+'|'));
const fxHolders=fx=>{
  if(!attacker||!defender)return[];
  const has=entry=>!defeated(entry)&&[].concat(fx.card).some(key=>hasCard(entry,key))&&(!fx.when||fx.when(entry));
  if(fx.side==='attacker')return has(attacker)?[attacker]:[];
  if(fx.side==='defender')return has(defender)?[defender]:[];
  const army=fx.side==='attackerAllies'?attacker.army:defender.army,skip=fx.side==='attackerAllies'?attacker.id:defender.id;
  return entries.filter(entry=>entry.army===army&&entry.id!==skip&&has(entry));
};
function fxAvailable(fx){
  if(!fx.steps.includes(attackStep))return false;
  if(fx.ranged&&attackType()!=='ranged')return false;
  if(fx.needsFixed&&!selectedWeaponRows().some(row=>weaponHasKeyword(row,'fixe')))return false;
  if(fx.needsGuardian&&!allResolved(defender).concat(entries.filter(entry=>entry.army===defender.army).flatMap(entry=>allResolved(entry))).some(item=>item.def.id==='gardien-x'))return false;
  if(fx.needsWounds&&!(defenseResult().result.wounds>0))return false;
  return true;
}
function cardFxRows(){
  if(!attacker||!defender||!attackState)return[];
  return ATTACK_CARD_FX.filter(fxAvailable).flatMap(fx=>fxHolders(fx).map(holder=>({fx,holder})));
}
function cardFxPanel(rows){
  const cards=rows.map(({fx,holder})=>{
    const key=fx.id+'|'+holder.id,used=!!attackState.cardFx?.[key],def={card:fx.card,use:fx.use||null},spent=fx.use&&cardSpent(holder,def,stateFor(holder))&&!used;
    const button=fx.info?'':used?`<button type="button" class="secondary" data-card-fx-undo="${key}">↩ Annuler</button>`:spent?'<button type="button" disabled>Carte déjà inclinée/supprimée</button>':`<button type="button" class="primary" data-card-fx="${key}">${fx.btn||(fx.use==='tilt'?'Utiliser (incline la carte)':fx.use==='discard'?'Utiliser (supprime la carte ✖)':'Appliquer')}</button>`,
      input=fx.input&&!fx.info?`<label class="card-fx-input"><small>${fx.input.label}</small><input type="number" min="0" max="${fx.input.max}" inputmode="numeric" data-card-fx-input="${fx.input.key}" value="${Number(attackState.fxInputs?.[fx.input.key])||0}"></label>`:'';
    return `<div class="card-fx ${used?'used':''}"><b>${fx.title}</b><span> — ${entryName(holder)}</span><small>${used&&fx.done?'✔ '+fx.done:fx.text}</small>${input}${button}</div>`;
  }).join('');
  return `<section class="automation-card rule-highlight card-fx-panel"><strong>CARTES D’AMÉLIORATION QUI PEUVENT INTERVENIR MAINTENANT</strong>${cards}</section>`;
}
function decorateCardFx(){
  const rows=cardFxRows();
  if(!rows.length)return;
  const host=root.querySelector('.resolve-center')||root;
  host.insertAdjacentHTML('afterbegin',cardFxPanel(rows));
  const find=key=>{const [id,holderId]=key.split('|');return{fx:ATTACK_CARD_FX.find(item=>item.id===id),holder:entries.find(entry=>entry.id===holderId)}};
  root.querySelectorAll('[data-card-fx]').forEach(button=>button.onclick=()=>{
    const {fx,holder}=find(button.dataset.cardFx);if(!fx||!holder)return;
    attackState.cardFx={...(attackState.cardFx||{}),[button.dataset.cardFx]:true};
    if(fx.use)spendCard(holder,{card:fx.card,use:fx.use});
    if(fx.apply)fx.apply(holder);
    logActivationEffect(attacker,fx.title+(holder.id!==attacker.id?' · '+entryName(holder):''),fx.done||fx.text);
    resolveScreen()
  });
  root.querySelectorAll('[data-card-fx-input]').forEach(input=>{input.oninput=()=>{attackState.fxInputs={...(attackState.fxInputs||{}),[input.dataset.cardFxInput]:Math.max(0,Math.min(Number(input.max)||99,Math.floor(Number(input.value))||0))}};input.onchange=resolveScreen});
  root.querySelectorAll('[data-card-fx-undo]').forEach(button=>button.onclick=()=>{
    const {fx,holder}=find(button.dataset.cardFxUndo);if(!fx||!holder)return;
    const next={...(attackState.cardFx||{})};delete next[button.dataset.cardFxUndo];attackState.cardFx=next;
    if(fx.use)unspendCard(holder,{card:fx.card});
    if(fx.undo)fx.undo(holder);
    const label=fx.title+(holder.id!==attacker.id?' · '+entryName(holder):''),state=stateFor(attacker);
    updateUnitState(attacker,{effectLog:(state.effectLog||[]).filter(item=>item.label!==label)});
    resolveScreen()
  });
}
const decorateResolveScreenCardsBase=decorateResolveScreen;
decorateResolveScreen=function(){decorateResolveScreenCardsBase();decorateCardFx()};
// Dés et mots-clés ajoutés par les cartes utilisées pendant l'attaque.
const poolCardsBase=pool;
pool=function(){const result=poolCardsBase();if(!attackState)return result;const base={...result,blanc:result.blanc+(fxUsed('barrage-generator')?2:0),noir:result.noir+(fxUsed('generator-overcharge')?1:0)},kraken=fxUsed('kraken')?Number(attackState.fxInputs?.krakenDefeated)||0:0;return kraken>0?upgradePoolDice(base,kraken):base};
const activeAttackTagsCardsBase=activeAttackTags;
activeAttackTags=function(){
  const result=activeAttackTagsCardsBase(),extra=[],add=(id,source,value)=>{const def=keywords.find(item=>item.id===id);if(def)extra.push({source,def,tag:{keywordId:id,...(value?{value}:{})}})};
  if(fxUsed('barrage-generator'))add('suppressif','Générateur de Barrage');
  if(fxUsed('generator-overcharge'))add('impact-x','Surcharge du Générateur',1);
  const rows=attacker?selectedWeaponRows():[];
  if(attacker&&hasCard(attacker,'crosshair')&&rows.length===1&&cardKey(rows[0].card)==='crosshair')add('critique-x','Crosshair',1);
  return extra.length?[...result,...extra]:result
};
// ---- Postures, Charges à Protons/Soniques : effets hors mots-clés d'unité (22/09/2026) ----
// Posture Offensive/Défensive : carte à deux faces ; la face visible décide de l'action Viser/Esquiver (2 pions) et du pion interdit.
function postureMode(entry){
  const state=entry?stateFor(entry):{};
  for(const up of entry?.unit?.upgrades||[]){
    const key=cardKey(up.name);if(key!=='offensive posture'&&key!=='defensive posture')continue;
    return (key==='offensive posture')!==isFlipped(state,slugOf(up.name))?'offensive':'defensive'
  }
  return null
}
const initAttackPostureBase=initAttack;
initAttack=function(){
  initAttackPostureBase();if(!attackState)return;
  attackState.aimBlocked=postureMode(attacker)==='defensive';attackState.dodgeBlocked=postureMode(defender)==='offensive';
  if(attackState.aimBlocked)attackState.availableAims=0;
  if(attackState.dodgeBlocked)attackState.availableDodges=0
};
const syncTokenStockPostureBase=syncTokenStock;
syncTokenStock=function(key){if(attackState&&((key==='availableAims'&&attackState.aimBlocked)||(key==='availableDodges'&&attackState.dodgeBlocked)))return;return syncTokenStockPostureBase(key)};
// Incognito : perdu pour le reste de la partie dès que l'unité attaque ou défend, ou si son joueur le choisit au début de l'activation.
CARD_KEYWORD_ACTIONS['incognito']={title:'INCOGNITO',kind:'roundfree',text:'Début d’activation : cette unité peut choisir de perdre les règles spéciales d’Incognito jusqu’à la fin de la partie (elles sont aussi perdues dès qu’elle attaque ou défend).',flag:'incognitoLost'};
const allResolvedIncognitoBase=allResolved;
allResolved=function(entry){const list=allResolvedIncognitoBase(entry);return entry&&stateFor(entry).incognitoLost?list.filter(item=>item.def.id!=='incognito'):list};
const saveAttackHistoryIncognitoBase=saveAttackHistory;
saveAttackHistory=function(){
  const holders=[attacker,defender].filter(entry=>entry&&allResolvedIncognitoBase(entry).some(item=>item.def.id==='incognito')&&!stateFor(entry).incognitoLost);
  saveAttackHistoryIncognitoBase();
  for(const entry of holders)updateUnitState(entry,{incognitoLost:true})
};
// ---- Contrôles de ciblage : règles des mots-clés qui limitent QUI peut être attaqué (22/09/2026) ----
// Même emplacement que le Contrôle de Tir (avant le choix des armes, une fois la portée saisie) ; le panneau n'existe que si un mot-clé de l'attaquant ou du défenseur est concerné.
// blocage = interdit d'après les données saisies (portée, type d'attaque) ; question = à répondre à la table (Oui interdit l'attaque) ; info = règle rappelée.
function targetingChecks(){
  if(!attacker||!defender||!attackState||attackState.range==null)return[];
  const checks=[],has=(entry,id)=>allResolved(entry).some(item=>item.def.id===id),melee=attackState.range==='melee',distance=Number(attackState.range),override=attackState.targetOverride||{};
  if(stateFor(defender).incognitoLost&&allResolvedIncognitoBase(defender).some(item=>item.def.id==='incognito'))checks.push({id:'incognito',level:'info',restore:true,title:'INCOGNITO',text:`${entryName(defender)} a perdu Incognito (attaque, défense ou choix précédent) : la restriction de portée ne s’applique plus.`});
  if(has(defender,'incognito')){
    if(!melee&&distance>1)checks.push({id:'incognito',level:'block',unlock:'Incognito déjà perdu : débloquer l’attaque',title:'INCOGNITO',text:`${entryName(defender)} ne peut pas être attaquée par une unité ennemie à plus de portée 1 (portée saisie : ${attackState.range}). Choisissez une autre cible ou une portée 1.`});
    else checks.push({id:'incognito',level:'info',title:'INCOGNITO',text:`${entryName(defender)} peut être attaquée : le Chef attaquant est à portée 1 ou moins. Elle perdra Incognito pour le reste de la partie après cette attaque.`})
  }
  if(has(attacker,'incognito'))checks.push({id:'incognito-attacker',level:'info',title:'INCOGNITO · ATTAQUANT',text:`${entryName(attacker)} perd les règles d’Incognito pour le reste de la partie en attaquant (fin de l’attaque enregistrée automatiquement).`});
  if(has(defender,'immunite-corps-a-corps')){
    if(melee&&override['immunite-cac'])checks.push({id:'immunite-cac',level:'info',restore:true,title:'IMMUNITÉ : CORPS-À-CORPS',text:'Contrôle débloqué manuellement pour cette attaque.'});
    else if(melee)checks.push({id:'immunite-cac',level:'block',unlock:'La règle ne s’applique pas ici : débloquer l’attaque',title:'IMMUNITÉ : CORPS-À-CORPS',text:`${entryName(defender)} ne peut pas être ciblée par une attaque au corps-à-corps.`});
    else checks.push({id:'immunite-cac',level:'info',title:'IMMUNITÉ : CORPS-À-CORPS',text:'Attaque à distance autorisée : l’attaquant peut aussi ajouter des armes à distance même s’il est engagé avec la cible.'})
  }
  if(has(defender,'discret')&&(stateFor(defender).suppression||0)>0)checks.push({id:'discret',level:'ask',title:'DISCRET',text:`${entryName(defender)} a ${stateFor(defender).suppression} pion(s) Suppression : l’attaquant doit cibler une autre unité si possible.`,question:'Une autre unité ennemie pouvait-elle être ciblée (portée, LdV) ?',blockOnYes:'Discret : ciblez une autre unité, elle est possible.'});
  const distractorId=stateFor(attacker).distractedBy;
  if(distractorId&&distractorId!==defender.id){const distractor=entries.find(entry=>entry.id===distractorId);if(distractor&&!defeated(distractor))checks.push({id:'distraire',level:'ask',title:'DISTRAIRE',text:`${entryName(attacker)} doit attaquer ${entryName(distractor)} jusqu’à la fin du round, si possible.`,question:`${entryName(distractor)} pouvait-elle être attaquée (portée, LdV) ?`,blockOnYes:`Distraire : vous devez attaquer ${entryName(distractor)}.`})}
  return checks
}
function targetingIssue(){
  if(attackStep!==0)return'';
  const answers=attackState.targetAsk||{};
  for(const check of targetingChecks()){
    if(check.level==='block')return 'Cible interdite — '+check.title+' : '+check.text;
    if(check.level==='ask'){
      if(answers[check.id]==null)return 'Contrôle de ciblage : répondez à la question « '+check.title+' » avant de poursuivre.';
      if(answers[check.id]===true)return 'Cible interdite — '+check.blockOnYes
    }
  }
  return''
}
function decorateTargetChecks(){
  if(attackStep!==0)return;
  const checks=targetingChecks();
  if(!checks.length)return;
  const answers=attackState.targetAsk||{},blocked=!!targetingIssue(),panel=document.createElement('section');
  panel.className=`fire-control-card target-check-card conditional-card manual-focus ${blocked?'blocked':'answered'}`;
  panel.innerHTML=`<strong>CONTRÔLES DE CIBLAGE</strong><p class="fc-source">Règles des mots-clés qui concernent cette attaque (${entryName(attacker)} → ${entryName(defender)}).</p><ul class="fc-conditions">${checks.map(check=>`<li class="tc-${check.level}"><b>${check.title}</b> — ${check.text}${check.level==='ask'?`<div class="tc-ask"><span>${check.question}</span><button type="button" class="${answers[check.id]===true?'primary':'secondary'}" data-target-ask="${check.id}:yes">Oui</button><button type="button" class="${answers[check.id]===false?'primary':'secondary'}" data-target-ask="${check.id}:no">Non</button></div>`:''}${check.level==='block'?`<em class="tc-stop">⛔ ATTAQUE INTERDITE</em><div class="tc-ask"><button type="button" class="secondary" data-target-unlock="${check.id}">${check.unlock}</button></div>`:''}${check.restore?`<div class="tc-ask"><button type="button" class="secondary" data-target-restore="${check.id}">↩ Rétablir la restriction</button></div>`:''}</li>`).join('')}</ul>`;
  root.querySelector('.weapon-picker')?.before(panel);
  const setLost=(value)=>updateUnitState(defender,{incognitoLost:value});
  panel.querySelectorAll('[data-target-unlock]').forEach(button=>button.onclick=()=>{const id=button.dataset.targetUnlock;if(id==='incognito')setLost(true);else attackState.targetOverride={...(attackState.targetOverride||{}),[id]:true};logActivationEffect(attacker,'Contrôle de ciblage débloqué',id==='incognito'?'Incognito considéré comme déjà perdu par '+entryName(defender):'Restriction '+id+' ignorée pour cette attaque');resolveScreen()});
  panel.querySelectorAll('[data-target-restore]').forEach(button=>button.onclick=()=>{const id=button.dataset.targetRestore;if(id==='incognito')setLost(false);else{const next={...(attackState.targetOverride||{})};delete next[id];attackState.targetOverride=next}resolveScreen()});
  panel.querySelectorAll('[data-target-ask]').forEach(button=>button.onclick=()=>{const [id,answer]=button.dataset.targetAsk.split(':');attackState.targetAsk={...(attackState.targetAsk||{}),[id]:answer==='yes'};resolveScreen()})
}
const stepIssueTargetingBase=stepIssue;
stepIssue=function(){const issue=targetingIssue();return issue||stepIssueTargetingBase()};
const decorateResolveScreenTargetingBase=decorateResolveScreen;
decorateResolveScreen=function(){decorateResolveScreenTargetingBase();decorateTargetChecks()};
// Sélection automatique de l'arme quand une seule est éligible à la portée choisie (24/09/2026) :
// aucun choix réel à faire, donc pas de clic supplémentaire par rapport à la partie physique.
// Ne s'applique qu'une fois la portée choisie par le joueur, jamais avant (portée non devinée).
const decorateResolveScreenSoleWeaponBase=decorateResolveScreen;
decorateResolveScreen=function(){
  decorateResolveScreenSoleWeaponBase();
  if(attackStep!==0||attackState.range==null||Object.values(attackState.selected).some(Boolean))return;
  const eligible=root.querySelectorAll('.weapon-toggle:not([disabled])');
  if(eligible.length===1){attackState.selected[eligible[0].dataset.key]=true;resolveScreen()}
};
// Couvert « Aucun » (24/09/2026) : déjà mis en avant visuellement (classe .on) puisque c'est la
// valeur par défaut, mais la validation reste exigée -- sans indication, le bouton semble déjà
// sélectionné et on ne comprend pas pourquoi l'étape reste bloquée. Un rappel discret le précise,
// sans dispenser de la confirmation (le couvert oublié est une vraie erreur de règle à éviter).
const decorateResolveScreenCoverHintBase=decorateResolveScreen;
decorateResolveScreen=function(){
  decorateResolveScreenCoverHintBase();
  if(attackStep!==2||attackState.coverChosen)return;
  const options=root.querySelector('.cover-options');
  if(!options)return;
  const hint=document.createElement('small');
  hint.className='cover-confirm-hint';
  hint.textContent='Touchez le couvert observé pour confirmer, même si « Aucun » est déjà correct.';
  options.after(hint);
};
// Table holographique (25/09/2026, refonte « Codex Legion ») : bandeau PUREMENT décoratif et en lecture
// seule, inséré au-dessus de la zone de résolution -- hologramme de la faction de l'attaquant à gauche,
// de celle du défenseur à droite, portée et couvert lus dans attackState. Il ne modifie ni ne lit
// aucun champ de saisie, ne change aucun état, et tout échec est avalé : la résolution ne peut pas
// être bloquée par ce décor.
const decorateResolveScreenHoloBase=decorateResolveScreen;
decorateResolveScreen=function(){
  decorateResolveScreenHoloBase();
  try{
    const workspace=root.querySelector('.attack-workspace');
    if(!workspace||!attacker||!defender||!attackState)return;
    root.querySelector('.holo-table')?.remove();
    const empire=entry=>factionThemeForArmy(entry.army)==='imperial';
    const sprite=(entry,facing)=>{
      const imperial=empire(entry),file=imperial?'stormtrooper-cyan':'rebel-coral',facesRight=imperial;
      return `<img class="holo-unit holo-${facing}${facesRight===(facing==='attacker')?'':' flip'}" src="../codex/holograms/${file}.png" alt="">`;
    };
    const melee=attackState.range==='melee';
    const rangeText=attackState.range==null?'—':melee?'Corps à corps':String(attackState.range);
    const coverLabels={none:'Aucun',light:'Léger',heavy:'Lourd'};
    const coverText=melee?'Sans effet':attackState.coverChosen?(coverLabels[attackState.cover]||'—'):'—';
    const chip=(icon,label,value)=>`<span class="holo-chip"><i class="cx-icon" style="--cx-icon:url(../codex/icons/${icon}.png)"></i><small>${label}</small><b>${value}</b></span>`;
    const holo=document.createElement('div');
    holo.className='holo-table';
    holo.setAttribute('aria-hidden','true');
    holo.innerHTML=`${sprite(attacker,'attacker')}<img class="holo-cover" src="../codex/holograms/cover-crates-cyan.png" alt=""><span class="holo-line"></span>${sprite(defender,'defender')}<div class="holo-readout">${chip('range','Portée',rangeText)}${chip('cover','Couvert',coverText)}</div>`;
    workspace.before(holo);
  }catch(error){/* décor uniquement : ne jamais gêner la résolution */}
};
// Charges à Protons / Soniques : les autres armes à distance de la réserve gagnent Assaut 1.
const activeAttackTagsChargesBase=activeAttackTags;
activeAttackTags=function(){
  let result=activeAttackTagsChargesBase();
  if(!attacker||!attackState)return result;
  // Programmation Prime (IG-11) : Perforant 1 contre une cible Prime Commandant, Suppressif contre une cible Prime Agent.
  if(hasCard(attacker,'ig11 prime programming')){
    const target=entries.find(entry=>stateFor(entry).lootFrom===attacker.id&&!defeated(entry)),id=target?.rank==='commandant'?'perforant-x':target?.rank==='operative'?'suppressif':null,primeDef=id&&keywords.find(item=>item.id===id);
    if(primeDef)result=[...result,{source:'Programmation Prime',def:primeDef,tag:{keywordId:id,...(id==='perforant-x'?{value:1}:{})}}]
  }
  if(attackType()!=='ranged')return result;
  const rows=selectedWeaponRows(),charge=rows.find(row=>['proton charge saboteur','sonic charge saboteur'].includes(cardKey(row.card)));
  const def=keywords.find(item=>item.id==='assaut-x');
  if(!charge||!def||!rows.some(row=>row!==charge))return result;
  return [...result,{source:displayName(charge.card),def,tag:{keywordId:'assaut-x',value:1}}]
};
// ---- ANNULER / Réactiver sur tous les automatismes (mots-clés et cartes) ----
const UNIT_EFFECT_CARD={'force-choke-used':'force-choke','force-reflexes':'force-reflexes','burst-of-speed':'burst-of-speed','offensive-push':'offensive-push','linked-targeting-array':'linked-targeting-array'};
// ---- Journal des effets appliqués pendant l'activation, rappelé dans le résumé de l'attaque (21/09/2026) ----
const EFFECT_FIELD_LABEL={aim:'Viser',dodge:'Esquive',surge:'Adrénaline',suppression:'Suppression',immobilize:'Immobilisation',ion:'Ionique',poison:'Poison',shield:'Bouclier',surveillance:'Surveillance',wound:'Blessure sur la carte'};
function describeEffectDiffs(diffs){
  const nameOf=id=>{const e=entries.find(candidate=>candidate.id===id);return e?entryName(e):id};
  return diffs.map(({id,fields})=>{
    const parts=[];
    for(const [key,change] of Object.entries(fields)){
      if(key==='effectLog'||key==='roundSeen')continue;
      if('delta' in change&&EFFECT_FIELD_LABEL[key])parts.push((change.delta>0?'+':'')+change.delta+' '+EFFECT_FIELD_LABEL[key]);
      else if(key==='maxSpeedOverride'&&change.to)parts.push('vitesse maximale '+change.to+' jusqu’à la fin du round');
      else if(key==='speedDelta'&&'delta' in change)parts.push('vitesse '+(change.delta>0?'+':'')+change.delta);
      else if(key==='extraAction'&&change.to)parts.push('action supplémentaire');
      else if(key==='exhaustedCards'&&change.added?.length)parts.push('carte inclinée ('+change.added.join(', ')+')');
      else if(key==='discardedCards'&&change.added?.length)parts.push('carte supprimée de la partie ('+change.added.join(', ')+')');
      else if(key==='freeActionOffers'&&change.added?.length)parts.push(change.added.map(offer=>'action gratuite offerte : '+offer.label).join(' ; '));
      else if(key==='distractedBy'&&change.to)parts.push('doit attaquer l’unité qui l’a distraite');
    }
    return parts.length?nameOf(id)+' : '+parts.join(', '):'';
  }).filter(Boolean).join(' · ');
}
function logActivationEffect(entry,label,text){
  const state=stateFor(entry);
  updateUnitState(entry,{effectLog:[...(state.effectLog||[]).filter(item=>item.round===currentRound()),{round:currentRound(),label,text}]});
}
function activationEffectsHtml(){
  const rows=[];
  if(attacker)for(const item of (stateFor(attacker).effectLog||[]).filter(entry=>entry.round===currentRound()))rows.push(`<li><b>${item.label}</b> — ${item.text}</li>`);
  const conclusion=(typeof attackConclusionPopupContent==='function'?attackConclusionPopupContent():null)||'';
  const tableRows=[...conclusion.matchAll(/<p><b>[\s\S]*?<\/p>/g)].map(match=>match[0].replace(/^<p>/,'<li>').replace(/<\/p>$/,'</li>'));
  if(!rows.length&&!tableRows.length)return'';
  return `<div class="recap-effects"><span class="recap-title">EFFETS À NE PAS OUBLIER (appliqués ou à appliquer à la table)</span>${tableRows.length?`<small>Fin d’attaque — à appliquer à la table :</small><ul>${tableRows.join('')}</ul>`:''}${rows.length?`<small>Appliqués par vous pendant cette activation :</small><ul>${rows.join('')}</ul>`:''}</div>`;
}
function wireUndo(entry,role){
  const sections=[...root.querySelectorAll('.activation-automation')];
  if(!sections.length)return;
  sections.flatMap(section=>[...section.querySelectorAll('button')]).forEach(button=>{
    const original=button.onclick;if(!original)return;
    button.onclick=event=>{
      const before=JSON.parse(JSON.stringify(unitStates));
      original.call(button,event);
      const changes=kwDiff(before,unitStates);if(!changes.length)return;
      const title=(button.closest('.kw-action')?.querySelector('[data-card-action] b')||button.closest('.effect-choice')?.querySelector('b')||button.querySelector('b'))?.textContent||button.textContent.trim();
      const described=describeEffectDiffs(changes),tableNote=button.hasAttribute('data-force-choke')?button.textContent.replace(/^1 blessure · /,'')+' subit 1 blessure (à appliquer à la table)':'';
      const summary=[tableNote,cardJournalNote,described].filter(Boolean).join(' · ');cardJournalNote='';
      if(summary)logActivationEffect(entry,title,summary);
      const diffs=kwDiff(before,unitStates);
      kwUndoLog.push({entryId:entry.id,round:currentRound(),label:title+(button.hasAttribute('data-kw-choice')?' — '+button.textContent.trim():''),diffs});
      if(kwUndoLog.length>30)kwUndoLog.shift();
      kwUndoSave();overview(entry,role)
    }
  });
  // Application déjà faite sans historique (avant ANNULER, ou après rechargement) : « Réactiver » rend le bouton cliquable sans toucher aux pions.
  const resettable=[];
  root.querySelectorAll('.activation-automation [data-card-action][disabled]').forEach(button=>{if(/déjà appliqué|fait/.test(button.textContent)&&!/plus d’action|nécessite/.test(button.textContent))resettable.push({id:button.dataset.cardAction,host:button.closest('.kw-action')||button.parentElement})});
  root.querySelectorAll('.activation-automation [data-kw-apply][disabled]').forEach(button=>resettable.push({id:button.dataset.kwApply,host:button}));
  root.querySelectorAll('.activation-automation [data-unit-effect][disabled]').forEach(button=>{const card=UNIT_EFFECT_CARD[button.dataset.unitEffect];if(card)resettable.push({id:card,host:button,unit:true})});
  for(const item of resettable){
    const reset=document.createElement('button');reset.type='button';reset.className='secondary kw-reset';reset.dataset.kwReset=item.id;
    reset.innerHTML='<b>↩ Réactiver</b><small>Rend le bouton de nouveau cliquable. Les pions déjà gagnés ne sont pas retirés : corrigez-les dans « État actuel » si besoin.</small>';
    item.host.insertAdjacentElement('afterend',reset)
  }
  root.querySelectorAll('[data-kw-reset]').forEach(button=>button.onclick=()=>{
    const id=button.dataset.kwReset,def=CARD_KEYWORD_ACTIONS[id],state=stateFor(entry),patch={};
    const ownSlugs=def&&def.card?cardSlugs(entry,def):[];
    patch.exhaustedCards=(state.exhaustedCards||[]).filter(card=>card!=='kw-'+id&&card!==id&&!ownSlugs.includes(card));
    patch.discardedCards=(state.discardedCards||[]).filter(card=>card!==id&&!ownSlugs.includes(card));
    patch.setupDone=(state.setupDone||[]).filter(done=>done!==id);
    if(def&&def.kind==='action'){const record=def.recordAs||'card:'+id,list=[...(state.activationActions||[])],at=list.indexOf(record);if(at>=0){list.splice(at,1);patch.activationActions=list}}
    updateUnitState(entry,patch);
    for(let i=kwUndoLog.length-1;i>=0;i--)if(kwUndoLog[i].entryId===entry.id&&kwUndoLog[i].round===currentRound()&&JSON.stringify(kwUndoLog[i].diffs).includes(id))kwUndoLog.splice(i,1);
    kwUndoSave();overview(entry,role)
  });
  const last=[...kwUndoLog].reverse().find(item=>item.entryId===entry.id&&item.round===currentRound());
  if(last){
    const recent=[...kwUndoLog].reverse().filter(item=>item.entryId===entry.id&&item.round===currentRound()).slice(0,5);
    sections[sections.length-1].insertAdjacentHTML('beforeend',`<div class="kw-undo"><button type="button" data-kw-undo><b>↩ ANNULER</b><small>${last.label} · rétablit les pions et rend le bouton de nouveau disponible</small></button>${recent.length>1?`<details><summary>Historique de ce round (${recent.length})</summary><ol>${recent.map(item=>`<li>${item.label}</li>`).join('')}</ol></details>`:''}</div>`)
  }
  root.querySelectorAll('[data-kw-undo]').forEach(button=>button.onclick=()=>{kwUndoLast(entry.id);overview(entry,role)})
}
const overviewLifecycleBase=overview;
overview=function(entry,role){
  overviewLifecycleBase(entry,role);
  if(!entry)return;
  const state=stateFor(entry);
  root.querySelectorAll('.upgrade-visual,.upgrade-card-visual').forEach(button=>{
    const up=(entry.unit.upgrades||[]).find(item=>displayName(item.name)===button.dataset.cardName);if(!up)return;
    const slug=slugOf(up.name);
    if(discarded(state,slug)){button.classList.add('card-gone');button.insertAdjacentHTML('beforeend','<b class="card-flag">SUPPRIMÉE</b>')}
    else if(exhausted(state,slug)){button.classList.add('card-tilted');button.insertAdjacentHTML('beforeend','<b class="card-flag">INCLINÉE</b>')}
  });
  if(role==='attack'&&!defeated(entry))wireUndo(entry,role);
  syncHelpButton()
};
// ---- Aide contextuelle (bouton « ? ») : ce qu'il faut faire à l'écran affiché, pourquoi c'est bloqué, quelles règles interviennent ----
const STEP_HELP=[
  {title:'1 · Armes & portée',todo:'Touchez la portée mesurée, puis les armes utilisées. Une réserve d’attaque ne mélange pas corps-à-corps et distance. Une unité engagée n’utilise que ses armes de corps-à-corps, sauf armes Polyvalent. Arsenal X : X armes par figurine.',auto:'Les armes non éligibles à cette portée sont grisées. Fixe, Encombrant, Longue Distance et les autres mots-clés d’armes demandent une confirmation quand ils s’appliquent.'},
  {title:'2 · Jet & relances',todo:'Lancez la réserve affichée et saisissez les faces obtenues (touches, critiques, adrénalines). Les vierges se calculent seules. Un pion Viser permet de relancer jusqu’à 2 dés (Précis X en ajoute X par pion).',auto:'Le total saisi doit égaler le nombre de dés de la réserve. Les pions Adrénaline convertissent les faces Adrénaline selon la carte de l’unité.'},
  {title:'3 · Couvert & esquive',todo:'Choisissez le couvert de la cible (aucun, léger, lourd), puis saisissez les dés de couvert et les esquives dépensées par le défenseur.',auto:'Déflagration, La Mort venue du ciel, Tireur d’élite X, Indifférent… modifient le couvert : l’Assistant applique et annonce l’effet sur cet écran.'},
  {title:'4 · Modifications',todo:'Saisissez Impact X (touches changées en critiques contre une cible blindée) et Armure X, ainsi que les effets de cartes qui modifient les dés avant la défense.',auto:'Bouclier X, Gardien X, Point Faible X et Bélier X sont proposés quand ils s’appliquent. Le journal de résolution garde chaque modification.'},
  {title:'5 · Défense',todo:'Lancez le nombre de dés annoncé « À DÉFENDRE » (après Impact et Armure) et saisissez blocages, adrénalines et vierges.',auto:'Perforant X annule des blocages ; Insensible, Immunité : perforant, Agile, Profil Bas, Blocage, Déflexion sont appliqués automatiquement.'},
  {title:'6 · Résumé',todo:'Appliquez à la table les blessures et la Suppression annoncées, puis les effets listés dans le pop-up (Ionique, Immobilisation, Poison, À Bout Portant…).',auto:'Terminer enregistre l’attaque dans l’historique, met à jour les pions des deux unités et marque l’unité comme activée.'},
];
const GATE_HELP=[
  [/portée/i,'La portée mesurée détermine quelles armes sont éligibles. Touchez la valeur lue sur la règle.'],
  [/arme éligible|au moins une arme/i,'Sélectionnez au moins une arme éligible pour constituer la réserve d’attaque.'],
  [/arc de tir/i,'Fixe : confirmez que le défenseur est au moins en partie dans l’arc indiqué sur la carte.'],
  [/jet saisi contient/i,'Le nombre de dés saisis doit être égal au nombre de dés de la réserve affichée en haut.'],
  [/couvert/i,'Choisissez le couvert de la cible avant de continuer (Aucun si elle n’en a pas).'],
  [/doivent être lancés|dés? de défense/i,'Le nombre de dés de défense à lancer est celui de « À DÉFENDRE » : touches et critiques restants après Impact et Armure.'],
  [/Répondez Oui ou Non/i,'Une règle conditionnelle doit être tranchée (Oui/Non) : ce choix change le calcul.'],
  [/Esquive/i,'Le défenseur ne peut pas dépenser plus de pions Esquive qu’il n’en possède : corrigez sur sa fiche si le suivi est faux.'],
];
function helpContent(){
  const center=root.querySelector('.resolve-center');
  if(center&&typeof attackStep==='number'){
    const help=STEP_HELP[Math.min(attackStep,5)],gate=(root.querySelector('.gate-status')?.textContent||'').replace(/\s+/g,' ').trim(),blocked=/BLOQUÉ/.test(gate),why=blocked?(GATE_HELP.find(([re])=>re.test(gate))||[null,'Complétez la saisie demandée au-dessus : le bouton se débloque tout seul.'])[1]:'',rules=(typeof relevantKeywords==='function'&&attacker&&defender?relevantKeywords():[]);
    return `<strong>AIDE · ${help.title}</strong><p><b>À faire :</b> ${help.todo}</p><p><b>L’Assistant s’en charge :</b> ${help.auto}</p>${blocked?`<p class="help-why"><b>Pourquoi c’est bloqué :</b> ${gate.replace(/^⛔\s*BLOQUÉ/,'').trim()}<br><small>${why}</small></p>`:'<p><b>Bouton :</b> prêt, vous pouvez passer à l’étape suivante.</p>'}${rules.length?`<details open><summary>Règles qui interviennent ici (${rules.length})</summary>${rules.map(row=>`<p><b>${row.def.name}${row.tag.value!=null?' '+row.tag.value:''}</b> — ${definitionText(row)}</p>`).join('')}</details>`:''}<button type="button" class="primary" data-close-popup>Compris</button>`
  }
  if(root.querySelector('.overview'))return `<strong>AIDE · Fiche d’unité</strong><p><b>Bloc bleu « Ce que peut faire l’unité » :</b> rappels d’activation, d’attaque et de mots-clés, classés par étape du round.</p><p><b>Bloc orange « État actuel » :</b> pions Viser, Esquive, Adrénaline, Suppression et cartes d’amélioration (prête, inclinée, supprimée). Saisissez ici ce qui change à la table.</p><p><b>Automatismes des mots-clés :</b> chaque bouton applique l’effet et met à jour les pions. Une erreur ? « ↩ ANNULER » défait la dernière application, « ↩ Réactiver » rend un bouton grisé de nouveau cliquable.</p><p><b>Cartes :</b> une carte à flèche s’incline (elle se redresse à la Phase Finale) ; une carte à icône ✖ est supprimée de la partie (usage unique).</p><button type="button" class="primary" data-close-popup>Compris</button>`;
  return `<strong>AIDE · Choix de l’unité</strong><p>Touchez la troupe qui joue, puis l’unité attaquée. Les avertissements orange sur une tuile rappellent une restriction de ciblage (Incognito, Discret, Petit…).</p><button type="button" class="primary" data-close-popup>Compris</button>`
}
function syncHelpButton(){
  let button=document.getElementById('helpFab');
  if(!button){button=document.createElement('button');button.id='helpFab';button.type='button';button.className='help-fab';button.setAttribute('aria-label','Aide de l’écran');button.textContent='?';button.onclick=()=>showRulePopup(helpContent(),'help-popup');document.body.append(button)}
  button.hidden=!!document.body.classList.contains('certification-open')||!!root.querySelector('.live-game-report')
}
const resolveScreenHelpBase=resolveScreen;
resolveScreen=function(){resolveScreenHelpBase();syncHelpButton()};
const pickHelpBase=pick;
pick=function(role){pickHelpBase(role);syncHelpButton()};
// ---- Chewbacca (amélioration) : dés améliorés, carte sans mot-clé (21/09/2026) ----
// Attaque : à l'étape « Constituer la réserve d'attaque », choisissez 1 réserve : améliorez 1 dé d'attaque par figurine qui y ajoute une arme.
// Défense : pour chaque figurine de l'unité, vous pouvez améliorer 1 dé de défense (blanc → rouge).
const hasChewbaccaUpgrade=entry=>!!entry&&hasCard(entry,'chewbacca upgrade');
function chewbaccaAutoUpgrades(){return selectedWeaponRows().reduce((total,row)=>total+Math.max(1,Number(attackState.counts?.[row.key])||1),0)}
function chewbaccaUpgrades(){if(!attacker||!attackState||!hasChewbaccaUpgrade(attacker))return 0;const chosen=attackState.chewbaccaUpgrades;return Math.max(0,chosen==null?chewbaccaAutoUpgrades():Number(chosen)||0)}
function unitModelTotal(entry){const base=certifiedUnitStats(entry)?.baseModels;if(!Number.isInteger(base))return 0;return base+(entry.unit.upgrades||[]).reduce((sum,card)=>sum+(Number(profileFor(card.name)?.addedModels)||0),0)}
const poolChewbaccaBase=pool;
pool=function(){const result=poolChewbaccaBase(),upgrades=chewbaccaUpgrades();return upgrades>0?upgradePoolDice(result,upgrades):result};
function chewbaccaPanel(){
  if(!attacker||!defender||!attackState)return'';
  if(attackStep===0&&hasChewbaccaUpgrade(attacker)&&selectedWeaponRows().length)return `<div class="automation-card rule-highlight"><strong>CHEWBACCA (amélioration) : dés d’attaque améliorés</strong><small>Choisissez 1 de vos réserves d’attaque : améliorez 1 dé d’attaque par figurine qui y ajoute une arme (blanc → noir, noir → rouge). Corrigez le nombre si une figurine ajoute plusieurs armes. La réserve affichée en tient compte.</small>${numberField('chewbaccaUpgrades','Dés améliorés',chewbaccaUpgrades(),20)}</div>`;
  if(attackStep===4&&hasChewbaccaUpgrade(defender)){const models=unitModelTotal(defender);return `<div class="automation-card rule-highlight"><strong>CHEWBACCA (amélioration) : dés de défense améliorés</strong><small>Avant de lancer : pour chaque figurine de l’unité${models?` (${models} au départ)`:''}, vous pouvez améliorer 1 dé de défense (blanc → rouge).</small></div>`}
  return'';
}
const rulesPanelChewbaccaBase=rulesPanel;
rulesPanel=function(){return `${chewbaccaPanel()}${rulesPanelChewbaccaBase()}`};
const bindChewbaccaBase=bindAttackInputs;
bindAttackInputs=function(){bindChewbaccaBase();const input=$('#chewbaccaUpgrades');if(input){input.oninput=()=>{attackState.chewbaccaUpgrades=Math.max(0,+input.value||0)};input.onchange=resolveScreen}};
const unitModelsChipSpeedBase=unitModelsChip;
unitModelsChip=function(entry){return unitModelsChipSpeedBase(entry)+speedChip(entry)};
applyFactionTheme('rebel');

// ---- Écran « Phases du round » : Phase de Commandement, début / fin de la Phase d'Activation, Phase Finale (21/09/2026) ----
// Réunit, unité par unité, ce qui agit à chaque phase : mots-clés (calendrier keyword-timing.json), actions de cartes (mêmes boutons que la fiche d'unité)
// et cartes qui agissent sur d'autres unités (Brouilleur Comms, Ordres Stricts…), pour ne rien oublier en début de round.
const ROUND_PHASES=[
  {id:'commandement',tab:'Commandement',title:'PHASE DE COMMANDEMENT',steps:'Choisir et révéler les cartes de commandement · Donner des ordres · Constituer la réserve d’ordres',timing:['commandement'],buttons:['trusted-agent','hq-uplink','seize-the-opportunity','comms-hacking-unit','mission-secrete'],info:['comms jammer','command system']},
  {id:'activation',tab:'Début d’activation',title:'DÉBUT DE LA PHASE D’ACTIVATION',steps:'Pion Ordre pioché, puis activation : effets « après avoir reçu un ordre » et « début d’activation »',timing:['ordre'],buttons:['improvised-orders','combat-group-leader','unorthodox-tactician','escorte','infanterie-mecanisee'],info:['strict orders']},
  {id:'fin',tab:'Fin d’activation',title:'FIN DE LA PHASE D’ACTIVATION',steps:'Toutes les unités ont été activées',timing:[],buttons:['endurance'],info:[]},
  {id:'finale',tab:'Phase Finale',title:'PHASE FINALE',steps:'Retirer les pions · les cartes inclinées se redressent · renforts et générateurs',timing:['phasefinale'],buttons:['vigilance'],info:[]},
];
let roundPhaseTab='commandement';
function roundPhaseRows(phase,entry){
  const timing=window.SWL_REFERENCE?.keywordTiming||{keywords:{}},state=stateFor(entry);
  const keywordsRows=resolved(entry).filter(item=>phase.timing.includes(timing.keywords?.[item.def.id]?.[0])&&!phase.buttons.includes(item.def.id)).map(item=>{const value=item.tag.value,title=value===undefined||value===null||value===''?item.def.name:item.def.name.includes('X')?item.def.name.replace('X',String(value)):item.def.name+' '+value;return '<li><b>'+title+'</b><small>'+definitionText(item)+'</small></li>'});
  const infoRows=phase.info.filter(card=>hasCard(entry,card)).map(card=>{const note=noteFor(card);return '<li><b>'+displayName(card)+'</b><small>'+(note?renderDiceText(note):'')+'</small></li>'});
  const buttons=cardActionButtons(entry,state,(id)=>phase.buttons.includes(id));
  return {list:[...keywordsRows,...infoRows],buttons}
}
function roundPhaseSection(phase,army){
  const units=entries.filter(entry=>entry.army===army&&!defeated(entry)).map(entry=>({entry,...roundPhaseRows(phase,entry)})).filter(item=>item.list.length||item.buttons.length);
  if(!units.length)return '<p class="rp-empty">Aucune carte ni mot-clé de cette armée n’agit à cette phase.</p>';
  return units.map(({entry,list,buttons})=>'<article class="rp-unit" data-entry="'+entry.id+'"><h3>'+entryName(entry)+'</h3>'+(list.length?'<ul>'+list.join('')+'</ul>':'')+(buttons.length?'<div class="rp-actions activation-automation"><div>'+buttons.join('')+'</div></div>':'')+'</article>').join('')
}
function roundPhaseCrossReminders(phase){
  // Cartes portées par une unité mais qui gênent ou aident les unités de l'autre camp : rappel en tête de phase.
  const rows=[];
  for(const item of SHEET_CROSS_CARDS.filter(card=>phase.info.includes(card.card)))for(const holder of entries.filter(entry=>!defeated(entry)&&hasCard(entry,item.card)))rows.push('<li><b>'+item.title+' — '+entryName(holder)+'</b><small>'+item.text+'</small></li>');
  return rows.length?'<div class="rp-cross"><strong>ATTENTION : cartes qui agissent sur d’autres unités</strong><ul>'+rows.join('')+'</ul></div>':''
}
function showRoundPhases(){
  stage=1;const phase=ROUND_PHASES.find(item=>item.id===roundPhaseTab)||ROUND_PHASES[0],mine=armies.some(army=>army.id===selectedArmy)?selectedArmy:armies[0].id,order=[mine,...armies.map(army=>army.id).filter(id=>id!==mine)];
  root.innerHTML='<section class="round-phases"><header><div><small>ROUND '+currentRound()+'</small><h1>PHASES DU ROUND</h1><p>'+phase.steps+'</p></div><button type="button" class="secondary" id="closeRoundPhases">Retour à l’assistant</button></header>'
    +'<nav class="rp-tabs">'+ROUND_PHASES.map(item=>'<button type="button" data-rp-tab="'+item.id+'" class="'+(item.id===phase.id?'on':'')+'">'+item.tab+'</button>').join('')+'</nav>'
    +'<h2 class="rp-title">'+phase.title+'</h2>'+roundPhaseCrossReminders(phase)
    +order.map((id,index)=>{const army=armies.find(item=>item.id===id);return '<details class="rp-army" '+(index===0?'open':'')+'><summary>'+(index===0?'MON CAMP · ':'ADVERSAIRE · ')+(army.list.listName||id)+'</summary>'+roundPhaseSection(phase,id)+'</details>'}).join('')
    +'</section>';
  const entryOf=element=>entries.find(candidate=>candidate.id===element.closest('[data-entry]')?.dataset.entry);
  $('#closeRoundPhases').onclick=()=>pick('attacker');
  root.querySelectorAll('[data-rp-tab]').forEach(button=>button.onclick=()=>{roundPhaseTab=button.dataset.rpTab;showRoundPhases()});
  root.querySelectorAll('[data-card-action]').forEach(button=>button.onclick=()=>{const entry=entryOf(button),id=button.dataset.cardAction,def=CARD_KEYWORD_ACTIONS[id];if(!entry||!def)return;if(!def.pick&&!def.choices){applyCardKeywordAction(entry,id,0);cardJournalNote='';showRoundPhases();return}kwActionPick={entryId:entry.id,id,selected:[]};showRoundPhases()});
  root.querySelectorAll('[data-kw-target]').forEach(button=>button.onclick=()=>{const entry=entryOf(button);if(!entry||!kwActionPick)return;const def=CARD_KEYWORD_ACTIONS[kwActionPick.id],max=def.pick.max(keywordValue(entry,kwActionPick.id)),list=kwActionPick.selected,targetId=button.dataset.kwTarget;kwActionPick.selected=list.includes(targetId)?list.filter(item=>item!==targetId):list.length<max?[...list,targetId]:list;showRoundPhases()});
  root.querySelectorAll('[data-kw-apply-action]').forEach(button=>button.onclick=()=>{const entry=entryOf(button);if(!entry)return;applyCardKeywordAction(entry,button.dataset.kwApplyAction,0);cardJournalNote='';showRoundPhases()});
  root.querySelectorAll('[data-kw-choice]').forEach(button=>button.onclick=()=>{const entry=entryOf(button);if(!entry||!kwActionPick)return;applyCardKeywordAction(entry,kwActionPick.id,Number(button.dataset.kwChoice));cardJournalNote='';showRoundPhases()});
  root.querySelectorAll('[data-kw-cancel-action]').forEach(button=>button.onclick=()=>{kwActionPick=null;showRoundPhases()})
}
$('#roundPhases').onclick=()=>{kwActionPick=null;showRoundPhases()};
// Cartes retirées du jeu (Errata Reference FR 17/06/2026) : bandeau sur la fiche d'unité et avertissement dans « Tester mes listes ».
const REMOVED_CARDS=window.SWL_REFERENCE?.removedCards||{};
const removedInEntry=entry=>[entry.unit.name,...(entry.unit.upgrades||[]).map(up=>up.name)].filter(name=>REMOVED_CARDS[cardKey(name)]).map(name=>displayName(name));
const overviewRemovedBase=overview;
overview=function(entry,role){overviewRemovedBase(entry,role);const removed=removedInEntry(entry);if(!removed.length)return;root.querySelector('.overview')?.insertAdjacentHTML('afterbegin','<div class="removed-card-banner" role="alert"><strong>⚠ Carte retirée du jeu</strong><span>'+removed.join(', ')+' : retirée par l’Errata Reference du 17/06/2026, elle ne peut plus être incluse dans une armée.</span></div>')};
const buildLiveGameReportRemovedBase=buildLiveGameReport;
buildLiveGameReport=function(){const report=buildLiveGameReportRemovedBase();for(const army of report.armies)for(const unit of army.units){const entry=entries.find(candidate=>candidate.id===unit.id);if(!entry)continue;for(const name of removedInEntry(entry))report.warnings.push({unit:unit.name,card:name,message:'carte retirée du jeu (Errata Reference 17/06/2026)'})}report.summary.warnings=report.warnings.length;return report};

$('#gameReadiness').onclick=showLiveGameReport;
$('#restart').onclick=()=>{attacker=null;defender=null;stage=1;applyFactionTheme(factionClass(armies.find(army=>army.id===selectedArmy)));pick('attacker')};reconcileRoundEffects();applyFactionTheme(factionClass(armies.find(army=>army.id===selectedArmy)));pick('attacker');
const secondaryScreenOpen=()=>document.body.classList.contains('certification-open')||!!root.querySelector('.live-game-report,.round-phases');
syncUnitStates('pull').then(changed=>{if(changed&&stage===1&&!secondaryScreenOpen())pick('attacker')});
setInterval(()=>{if(document.visibilityState!=='visible'||secondaryScreenOpen())return;syncUnitStates('pull').then(changed=>{if(!changed||secondaryScreenOpen())return;if(stage===1)pick('attacker');else if(!attackState&&stage===2&&attacker)overview(attacker,'attack');else if(!attackState&&stage===4&&defender)overview(defender,'defense')})},5000);
window.addEventListener('storage',event=>{if(event.key==='swl.list.p1.v1'||event.key==='swl.list.p2.v1'){if(!secondaryScreenOpen())location.reload();return}if(event.key===unitStateKey&&event.newValue){unitStates=read(unitStateKey,{});if(stage===1&&!secondaryScreenOpen())pick('attacker')}});
