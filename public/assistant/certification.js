(()=>{
  const repository='archipad/SWL',branch='claude/star-wars-legion-app-49rc3z',storageKey='swl-dice-certification-batch-v1';
  let selectedCard=null,drafts={};
  try{drafts=JSON.parse(localStorage.getItem(storageKey)||'{}')||{}}catch{drafts={}}
  // --- Cartes totalement inconnues du catalogue (ni visuel ni profil de dés) ---
  // pendingFor() ci-dessous certifie des cartes déjà connues ; ceci détecte au
  // contraire les cartes importées qu'aucun fichier de données ne référence du
  // tout (signalement Chewbacca Walking Carpet, 13/09/2026).
  const unknownStorageKey='swl-unknown-card-aliases-v1'
  let aliasDrafts={}
  try{aliasDrafts=JSON.parse(localStorage.getItem(unknownStorageKey)||'{}')||{}}catch{aliasDrafts={}}
  const saveAliasDrafts=()=>localStorage.setItem(unknownStorageKey,JSON.stringify(aliasDrafts))
  // Contient un objet File (photo) : ne peut pas être conservé en JSON, donc
  // perdu si l'onglet est rechargé avant l'envoi du lot -- volontaire.
  let newCardDrafts={},unknownScreen=null
  const catalogKeys=()=>new Set([...Object.keys(weaponProfiles),...Object.keys(window.SWL_REFERENCE?.images||{})])
  function unknownCardEntries(){
    const known=catalogKeys(),seen=new Set(),list=[]
    const consider=name=>{const key=cardKey(name);if(!key||known.has(key)||seen.has(key))return;seen.add(key);list.push({key,label:name})}
    for(const entry of entries){consider(entry.unit.name);(entry.unit.upgrades||[]).forEach(u=>consider(u.name))}
    return list
  }
  const unknownStatus=key=>aliasDrafts[key]?`= ${displayName(aliasDrafts[key])}`:newCardDrafts[key]?.ready?'Nouvelle carte prête':newCardDrafts[key]?'Brouillon en cours':null
  const unknownBatchCount=()=>Object.keys(aliasDrafts).length+Object.values(newCardDrafts).filter(d=>d.ready).length
  // Cartes retirées du jeu (erratum 17/06/2026) : plus à certifier.
  const removedCards=window.SWL_REFERENCE?.removedCards||{};
  const profiles=()=>Object.entries(weaponProfiles).filter(([card])=>!removedCards[card]);
  const usedCardKeys=()=>new Set(entries.flatMap(entry=>[cardKey(entry.unit.name),...(entry.unit.upgrades||[]).map(upgrade=>cardKey(upgrade.name))]));
  // Usage réel (22/09/2026) : « dans vos listes » ne doit pas se limiter aux deux listes actuellement
  // chargées sur cette tablette (elles sont remplacées à chaque nouvelle partie importée) mais retenir
  // tout ce qui a vraiment servi ici, partie après partie -- sinon une carte jouée la semaine dernière
  // retombe en bas de la file dès qu'on charge une autre liste pour la partie du jour.
  const usageHistoryKey='swl-cert-usage-history-v1'
  const loadUsageHistory=()=>{try{const raw=JSON.parse(localStorage.getItem(usageHistoryKey)||'{}');return raw&&typeof raw==='object'?raw:{}}catch{return{}}}
  function recordUsage(){
    const history=loadUsageHistory()
    if(typeof usingDemo!=='undefined'&&usingDemo)return history // liste de démonstration : ne compte pas comme un usage réel
    const today=new Date().toISOString().slice(0,10);let changed=false
    for(const key of usedCardKeys()){if(history[key]!==today){history[key]=today;changed=true}}
    if(changed)try{localStorage.setItem(usageHistoryKey,JSON.stringify(history))}catch{}
    return history
  }
  let usageHistory=recordUsage()
  const everUsed=card=>Object.prototype.hasOwnProperty.call(usageHistory,card)
  const isUnitCard=card=>!!weaponProfiles[card]?.unitStats||entries.some(entry=>norm(entry.unit.name)===card)||Object.values(rankCatalog).some(cards=>cards.includes(card));
  // --- Deuxième avis et désaccords de mots-clés (voir docs/PROCESSUS-VERIFICATION.md) ---
  // crosscheck : écarts détectés avec Legion Helper (instantané src/data/crosscheckTakras.json) ;
  // keywordConflicts : base de l'appli <-> certification. Tant qu'ils ne sont pas relus, la carte reste « à contrôler ».
  const crosscheckFor=card=>window.SWL_REFERENCE?.crosscheck?.[card]||null
  const conflictFor=card=>{const c=window.SWL_REFERENCE?.keywordConflicts?.[card];return c&&!c.reviewed?c:null}
  const secondOpinionOpen=(card,profile)=>{const full=profile.fullCardCertification,cc=crosscheckFor(card);return !!full&&((!!cc&&full.crosscheckSignature!==cc.signature)||!!conflictFor(card))}
  const mergeKeywords=(base,cert)=>{const list=(base||[]).map(tag=>({...tag}));for(const tag of cert||[])if(!list.some(item=>item.keywordId===tag.keywordId))list.push({...tag});return list}
  const keywordName=id=>keywords.find(item=>item.id===id)?.name||id
  const keywordList=list=>(list||[]).map(tag=>keywordName(tag.keywordId)+(tag.value?' '+tag.value:'')).join(', ')||'aucun'
  // Périmètre par défaut : les cartes de VOS listes (celles qui servent en partie). Le dernier filtre choisi est mémorisé.
  const CERT_FILTER_KEY='swl.cert-filter.v1',readCertFilter=()=>{try{const value=JSON.parse(localStorage.getItem(CERT_FILTER_KEY));if(['all','army','gaps','todo','ai'].includes(value))return value}catch{}return null}
  let certFilter=readCertFilter()||(entries.length?'army':'all'),reviewFlaggedOnly=false
  // Relecture par l'IA (src/data/aiReview.json) : « corrigee » et « illisible » sont à confirmer en priorité, « relue » = aucun écart trouvé.
  const aiOf=card=>(window.SWL_REFERENCE?.aiReview||{})[card]||null
  // Legion HQ (src/data/legionhqReference.json) = référence : la vitesse imprimée est préremplie, les écarts (rang, PV, courage, défense, adrénalines, dés, portées) sont signalés.
  const hqOf=card=>(window.SWL_REFERENCE?.legionhq||{})[card]||null
  const hqDice=dice=>Array.isArray(dice)?dice.map(die=>die.count+die.color[0]).sort().join('+'):''
  const hqRangeText=range=>range==='melee'?'corps-à-corps':String(range).startsWith('melee-')?'corps-à-corps ET distance 1-'+String(range).slice(6):String(range)
  const HQ_COLOR={r:'rouge',b:'blanc',n:'noir'};
  const hqDiceList=text=>String(text||'').split('+').filter(Boolean).map(part=>({color:HQ_COLOR[part.slice(-1)],count:Number(part.slice(0,-1))||1}));
  // Écarts avec Legion HQ, calculés sur le brouillon en cours quand il existe (sinon sur les données publiées) ; « apply » = correction en un clic.
  function hqDiffItems(card){
    const hq=hqOf(card),p=weaponProfiles[card];if(!hq||!p)return [];
    const d=drafts[card],f=d?.fullCard,items=[],push=(text,apply)=>items.push({text,apply});
    if(hq.kind==='unit'){
      const stats=d?.unitStats||p.unitStats,cert=p.fullCardCertification,rank=f?.rank||(isUnitCard(card)?unitRank({name:card}):null);
      if(hq.rank&&rank&&hq.rank!==rank)push('rang : Legion HQ '+hq.rank+' / appli '+rank,{t:'rank',value:hq.rank});
      const speed=Number(f?.speed||cert?.speed);if(hq.speed&&Number.isFinite(speed)&&speed!==hq.speed)push('vitesse : Legion HQ '+hq.speed+' / appli '+speed,{t:'speed',value:hq.speed});
      if(stats){
        if(Number.isInteger(hq.minis)&&hq.minis!==stats.baseModels)push('figurines : Legion HQ '+hq.minis+' / appli '+stats.baseModels,{t:'stat',field:'baseModels',value:hq.minis});
        if(Number.isFinite(hq.hp)&&hq.hp!==stats.woundsPerModel)push('PV par figurine : Legion HQ '+hq.hp+' / appli '+stats.woundsPerModel,{t:'stat',field:'woundsPerModel',value:hq.hp});
        if(hq.courage&&stats.courage!==null&&hq.courage!==stats.courage)push('courage : Legion HQ '+hq.courage+' / appli '+stats.courage,{t:'stat',field:'courage',value:hq.courage});
      }
      const defenseColor=d?.defenseColor||p.defenseColor;
      if(hq.defense&&defenseColor&&hq.defense!==defenseColor)push('dé de défense : Legion HQ '+hq.defense+' / appli '+defenseColor,{t:'defense',value:hq.defense});
      const printed=typeof combatProfiles!=='undefined'?combatProfiles[card]:null;
      if(cert||printed){
        const attack=(f?.attackSurge??(cert?.attackSurge!==undefined?cert.attackSurge:printed?.attackSurge))||'none',defense=(f?.defenseSurge??(cert?.defenseSurge!==undefined?cert.defenseSurge:printed?.defenseSurge))||'none';
        if(hq.attackSurge!==attack)push('adrénaline d’attaque : Legion HQ '+hq.attackSurge+' / appli '+attack,{t:'surge',which:'attackSurge',value:hq.attackSurge});
        if(hq.defenseSurge!==defense)push('adrénaline de défense : Legion HQ '+hq.defenseSurge+' / appli '+defense,{t:'surge',which:'defenseSurge',value:hq.defenseSurge});
      }
    }
    // Mots-clés : union carte + armes, par identifiant (valeurs numériques comparées quand les deux côtés en ont).
    if(hq.kw){
      const mappable=new Set(window.SWL_REFERENCE?.legionhqKeywordIds||[]),appKw={};
      const addKw=(id,value)=>{appKw[id]=appKw[id]||[];const n=Number(value);if(value!==undefined&&value!==null&&value!==''&&Number.isFinite(n)&&!appKw[id].includes(n))appKw[id].push(n)};
      for(const tag of tags[card]||[])addKw(tag.keywordId,tag.value);
      for(const w of p.weapons||[])for(const id of w.keywordIds||[])addKw(id,w.keywordValues?.[id]);
      for(const tag of f?.keywords||[])addKw(tag.keywordId,tag.value);
      for(const w of d?.weapons||[])for(const tag of w.keywords||[])addKw(tag.keywordId,tag.value);
      const missing=Object.keys(hq.kw).filter(id=>!(id in appKw)),extra=Object.keys(appKw).filter(id=>mappable.has(id)&&id!=='mercenaire'&&!(id in hq.kw)),values=Object.keys(hq.kw).filter(id=>id in appKw&&hq.kw[id].length&&appKw[id].length&&hq.kw[id].some(v=>!appKw[id].includes(v)));
      if(missing.length)push('mots-clés : Legion HQ indique '+missing.map(keywordName).join(', ')+', absent(s) de l’appli',{t:'keywords',ids:missing.map(id=>({keywordId:id,...(hq.kw[id]?.length?{value:hq.kw[id][0]}:{})}))});
      if(extra.length)push('mots-clés : dans l’appli, pas sur Legion HQ : '+extra.map(keywordName).join(', '),null);
      for(const id of values)push('mots-clés : valeur de « '+keywordName(id)+' » : Legion HQ '+hq.kw[id].join('/')+' / appli '+appKw[id].join('/'),{t:'keywordValue',id,value:hq.kw[id][0]})
    }
    const site=hq.weapons||[],app=(d?.weapons||p.weapons||[]).map(w=>({name:w.name,dice:hqDice(w.dice),range:w.range||''}));
    if(site.length!==app.length){push('nombre d’armes : Legion HQ '+site.length+' / appli '+app.length,null);return items}
    const remaining=[...site];
    for(const w of app){
      let index=remaining.findIndex(item=>item.dice===w.dice&&item.range===w.range);if(index<0)index=remaining.findIndex(item=>item.dice===w.dice);if(index<0)index=remaining.findIndex(item=>item.range===w.range);if(index<0)index=0;
      const s=remaining.splice(index,1)[0],diffs=[],openEnded=/^\d+-#$/.test(s.range)&&w.range===s.range.split('-')[0],apply={t:'weapon',name:w.name};
      if(s.dice!==w.dice){diffs.push('dés : Legion HQ '+(s.dice||'—')+' / appli '+(w.dice||'—'));apply.dice=hqDiceList(s.dice)}
      if(s.range!==w.range&&!openEnded&&s.range!=='?'){diffs.push('portée : Legion HQ '+hqRangeText(s.range)+' / appli '+hqRangeText(w.range));apply.range=s.range}
      if(diffs.length)push('arme « '+w.name+' » — '+diffs.join(' ; '),apply)
    }
    return items
  }
  // Écarts déjà tranchés sur le visuel (src/data/legionhqTriage.json) : non signalés.
  const hqDiffItemsFiltered=card=>{const ignore=(window.SWL_REFERENCE?.legionhqIgnore||{})[card]||[];return hqDiffItems(card).filter(item=>!ignore.some(prefix=>item.text.startsWith(prefix)))};
  const hqDiffs=card=>hqDiffItemsFiltered(card).map(item=>item.text);
  function applyHqItem(card,apply){
    const d=draftFor(card),f=d.fullCard;
    if(apply.t==='stat'){d.unitStats[apply.field]=apply.value;d.unitStatsVerified=false;d.unitStatsQueued=false}
    else if(apply.t==='defense'){d.defenseColor=apply.value;d.defenseVerified=false;d.defenseQueued=false}
    else if(apply.t==='rank')f.rank=apply.value;
    else if(apply.t==='speed'){f.speed=String(apply.value);f.speedFromHq=true}
    else if(apply.t==='surge')f[apply.which]=apply.value;
    else if(apply.t==='weapon'){const w=d.weapons.find(item=>item.name===apply.name);if(w){if(apply.dice)w.dice=apply.dice;if(apply.range)w.range=apply.range;w.verified=false;w.queued=false}}
    else if(apply.t==='keywords'){for(const tag of apply.ids)if(!f.keywords.some(item=>item.keywordId===tag.keywordId))f.keywords.push({...tag});f.noKeywords=false}
    else if(apply.t==='keywordValue'){for(const tag of f.keywords)if(tag.keywordId===apply.id)tag.value=apply.value;for(const w of d.weapons)for(const tag of w.keywords||[])if(tag.keywordId===apply.id)tag.value=apply.value}
    d.fullCardQueued=false;save()
  }
  window.swlCertification={hqDiffs:card=>hqDiffs(card),hqDiffItems:card=>hqDiffItemsFiltered(card),isConcordant:card=>isConcordant(card),isInArmy:card=>isInArmy(card),pendingFor:card=>pendingFor(card,weaponProfiles[card]),cards:()=>profiles().map(([card])=>card),batchCount:()=>batchCount()};
  const hqSpeedFor=card=>{const hq=hqOf(card);return hq&&hq.kind==='unit'&&[1,2,3].includes(hq.speed)?String(hq.speed):''}
  const hqPanel=(card,d)=>{const hq=hqOf(card);if(!hq)return '';const items=hqDiffItemsFiltered(card),f=d?.fullCard,prefilled=!!f&&f.speedFromHq&&String(f.speed)===hqSpeedFor(card);return '<div class="cert-ai '+(items.length?'ai-flag':'ai-ok')+'"><strong>'+(items.length?'⚠ Legion HQ (référence) : '+items.length+' écart(s) avec l’appli':'Legion HQ (référence) : concordant')+'</strong>'+items.map((item,index)=>'<div class="hq-diff"><small>'+escapeHtml(item.text)+'</small>'+(item.apply?'<button type="button" class="secondary" data-hq-apply="'+index+'">Utiliser la valeur Legion HQ</button>':'')+'</div>').join('')+(items.length&&(hq.history||[]).length?'<small>Historique des errata (Legion HQ) : '+hq.history.map(item=>escapeHtml(item.date+' : '+item.text)).join(' · ')+'</small>':'')+(prefilled?'<small>Vitesse '+escapeHtml(hqSpeedFor(card))+' préremplie d’après Legion HQ : à confirmer sur la carte.</small>':'')+'</div>'}
  const aiFlagged=card=>{const review=aiOf(card);return (!!review&&review.status!=='relue')||hqDiffs(card).length>0}
  const aiBadge=card=>{const review=aiOf(card),hq=hqDiffs(card).length?' · ⚠ Legion HQ : '+hqDiffs(card).length+' écart(s)':'';if(!review)return hq;return hq+(review.status==='corrigee'?' · ⚠ IA : corrigée, à confirmer':review.status==='illisible'?' · ⚠ IA : illisible, à lire sur la carte':' · IA : relue, aucun écart')}
  const aiPanel=card=>{const review=aiOf(card);if(!review)return '';const cls=review.status==='relue'?'ai-ok':'ai-flag';return '<div class="cert-ai '+cls+'"><strong>'+(review.status==='corrigee'?'⚠ Corrigée par la relecture IA : à confirmer sur le visuel':review.status==='illisible'?'⚠ Relecture IA : partie illisible, à lire sur la carte':'Relecture IA : aucun écart trouvé')+'</strong><small>'+escapeHtml(review.note)+'</small></div>'}
  const isInArmy=card=>everUsed(card)||usedCardKeys().has(card)
  const flagText=(card,p)=>[isInArmy(card)?'Dans vos listes':'',crosscheckFor(card)?'Écart Legion Helper':'',conflictFor(card)?'Base ≠ certification':'',!p.fullCardCertification?'Non certifiée':''].filter(Boolean).map(text=>' · <span class="cert-flag">'+text+'</span>').join('')
  const priority=([card,p])=>(aiFlagged(card)?-8:0)+(isInArmy(card)?0:4)+(crosscheckFor(card)||conflictFor(card)?0:2)+(p.fullCardCertification?0:1)+(isUnitCard(card)?0:.5)
  const passesFilter=([card,p])=>certFilter==='army'?isInArmy(card):certFilter==='gaps'?!!(crosscheckFor(card)||conflictFor(card)):certFilter==='todo'?!p.fullCardCertification:certFilter==='ai'?aiFlagged(card):true
  const weaponKeywordLine=(card,index)=>{const weapon=weaponProfiles[card]?.weapons?.[index],ids=weapon?.keywordIds||[];return ids.length?'<small class="cert-weapon-keywords">Mots-clés de cette arme (moteur) : '+ids.map(id=>keywordName(id)+(weapon.keywordValues?.[id]?' '+weapon.keywordValues[id]:'')).join(', ')+'</small>':'<small class="cert-weapon-keywords">Aucun mot-clé d’arme enregistré : vérifiez sur la carte.</small>'}
  // --- Sélecteur de mots-clés avec recherche (orthographe et syntaxe garanties par le glossaire) ---
  let kwPicker={scope:null,query:'',pendingId:null,pendingValue:'',pendingDetail:''}
  let exportPart=0
  // Mot-clé d'ARME saisi au niveau de la carte mais rattaché à aucune arme : le moteur ne l'appliquerait à aucune attaque
  // (les armes certifiées portent leur propre liste). Une seule arme : rattaché automatiquement ; plusieurs : à choisir.
  const weaponKeywordGaps=(card,d)=>{const f=d.fullCard,weapons=d.weapons||[];if(!f||!weapons.length)return [];return f.keywords.filter(tag=>keywords.find(item=>item.id===tag.keywordId)?.category==='arme'&&!weapons.some(w=>(w.keywords||[]).some(item=>item.keywordId===tag.keywordId)))}
  const weaponGapsBlocking=(card,d)=>(d.weapons||[]).length>=2&&weaponKeywordGaps(card,d).length>0
  const autoAssignWeaponKeywords=(card,d)=>syncWeaponKeywords(d)
  const kwIsWeapon=id=>keywords.find(item=>item.id===id)?.category==='arme'
  // Tous les mots-clés se saisissent UNE fois, au niveau de la carte. Les armes n'ont plus de liste à saisir : elles portent les mots-clés
  // d'arme que vous leur rattachez (automatique s'il n'y a qu'une arme). Cette synchronisation garde la liste des armes cohérente avec celle de la carte.
  function syncWeaponKeywords(d){
    const f=d.fullCard,weapons=d.weapons||[];if(!f)return;
    for(const w of weapons){if(!Array.isArray(w.keywords))continue;w.keywords=w.keywords.filter(tag=>f.keywords.some(item=>item.keywordId===tag.keywordId)).map(tag=>{const cardTag=f.keywords.find(item=>item.keywordId===tag.keywordId),value=tag.value??cardTag.value,detail=tag.detail??cardTag.detail;return{keywordId:tag.keywordId,...(value?{value}:{}),...(detail?{detail}:{})}})}
    if(weapons.length===1){const w=weapons[0];for(const tag of f.keywords)if(kwIsWeapon(tag.keywordId)&&!(w.keywords||[]).some(item=>item.keywordId===tag.keywordId)){w.keywords=[...(w.keywords||[]),{...tag}];w.kwEdited=true}}
  }
  function weaponGapPanel(card,d){
    const weapons=d.weapons||[],list=(d.fullCard?.keywords||[]).filter(tag=>kwIsWeapon(tag.keywordId));
    if(!weapons.length||!list.length)return '';
    if(weapons.length===1)return '<div class="cert-weapon-gap"><strong>Mots-clés d’arme rattachés automatiquement à « '+escapeHtml(weapons[0].name)+' »</strong><small>'+escapeHtml(keywordList(list))+' : ils seront appliqués à cette arme (la seule de la carte).</small></div>';
    const gaps=weaponKeywordGaps(card,d);
    return '<div class="cert-weapon-gap" '+(gaps.length?'role="alert"':'')+'><strong>'+(gaps.length?'⚠ ':'')+'Sur quelle arme s’applique chaque mot-clé d’arme ?</strong><small>Saisissez tous les mots-clés dans la liste ci-dessus, puis indiquez ici la ou les armes qui les portent (un mot-clé peut viser plusieurs armes).'+(gaps.length?' Il en reste '+gaps.length+' à attribuer : sans arme, il ne serait appliqué à aucune attaque.':'')+'</small>'+list.map(tag=>{const owners=weapons.filter(w=>(w.keywords||[]).some(item=>item.keywordId===tag.keywordId)),def=keywords.find(item=>item.id===tag.keywordId);return '<div class="kw-assign-row '+(owners.length?'':'unassigned')+'"><b>'+escapeHtml(keywordName(tag.keywordId))+(tag.value?' '+tag.value:'')+'</b><span class="kw-assign-buttons">'+weapons.map((w,index)=>{const own=(w.keywords||[]).find(item=>item.keywordId===tag.keywordId);return '<span class="kw-assign-cell"><button type="button" class="kw-toggle '+(own?'on':'')+'" data-kw-assign="'+tag.keywordId+'|'+index+'" aria-pressed="'+(own?'true':'false')+'">'+(own?'✓ ':'')+escapeHtml(w.name)+'</button>'+(own&&def?.hasValue&&weapons.length>1?'<label class="kw-assign-value">valeur<input type="number" min="1" max="20" data-kw-weapon-value="'+tag.keywordId+'|'+index+'" value="'+escapeHtml(own.value??'')+'"></label>':'')+'</span>'}).join('')+'</span></div>'}).join('')+'</div>'
  }
  // Défilé rapide : une carte à la fois (visuel + récapitulatif), « Conforme » ou « À corriger ». Même ordre que la liste.
  let reviewMode=false,reviewCurrent=null
  // Carte concordante : dans vos listes, relue sans écart, Legion HQ et Legion Helper ne signalent rien, rien ne bloque.
  const quickConfirmable=card=>{const d=draftFor(card),f=d.fullCard;return !((!f.keywords.length&&!f.noKeywords)||pendingRemovals(card,f).length||weaponGapsBlocking(card,d)||(f.cardType==='unit'&&!['1','2','3'].includes(String(f.speed))))}
  const isConcordant=card=>{const p=weaponProfiles[card];return !!p&&isInArmy(card)&&pendingFor(card,p)>0&&!hasQueuedCard(card)&&aiOf(card)?.status==='relue'&&!!hqOf(card)&&!hqDiffs(card).length&&!crosscheckFor(card)&&!conflictFor(card)&&quickConfirmable(card)}
  function quickConfirm(card){const d=draftFor(card),f=d.fullCard;if(!quickConfirmable(card))return false;autoAssignWeaponKeywords(card,d);for(const check of Object.keys(f.checks))f.checks[check]=true;if(crosscheckFor(card)||conflictFor(card))f.ack=true;d.fullCardQueued=true;save();return true}
  const reviewCards=()=>profiles().filter(([card,p])=>pendingFor(card,p)>0&&!hasQueuedCard(card)&&(!reviewFlaggedOnly||aiFlagged(card))).sort((a,b)=>priority(a)-priority(b)).map(([card])=>card)
  function reviewScreen(){
    const cards=reviewCards();
    if(!cards.length){reviewMode=false;return list()}
    const card=cards.includes(reviewCurrent)?reviewCurrent:cards[0];reviewCurrent=card;
    const d=draftFor(card),f=d.fullCard,position=cards.indexOf(card)+1,removals=pendingRemovals(card,f),kwBlocked=!f.keywords.length&&!f.noKeywords,speedMissing=f.cardType==='unit'&&!['1','2','3'].includes(String(f.speed)),gapBlock=weaponGapsBlocking(card,d),ok=!removals.length&&!kwBlocked&&!speedMissing&&!gapBlock;
    const use=f.cardUse||(window.SWL_REFERENCE?.cardUse||{})[card]||'passive';
    const extra=[f.cardType==='unit'?`<label class="${speedMissing?'cert-missing':''}">Vitesse imprimée (obligatoire)<select data-review-speed><option value="">— à choisir —</option>${['1','2','3'].map(value=>`<option value="${value}" ${String(f.speed)===value?'selected':''}>Vitesse ${value}</option>`).join('')}</select></label>`:`<label>Utilisation de la carte<select data-review-use><option value="passive" ${use==='passive'?'selected':''}>Permanente (aucun symbole)</option><option value="exhaust" ${use==='exhaust'?'selected':''}>↱ s’incline pour agir</option><option value="discard" ${use==='discard'?'selected':''}>✖ supprimée de la partie</option><option value="both" ${use==='both'?'selected':''}>↱ et ✖</option></select></label>`].join('');
    const why=[kwBlocked?'liste de mots-clés vide (utilisez « À corriger » pour la compléter)':'',removals.length?'mots-clés de la base absents de la liste (utilisez « À corriger »)':'',speedMissing?'choisissez la vitesse':'',gapBlock?'attribuez les mots-clés d’arme à leur arme':''].filter(Boolean);
    return `<section class="cert-review"><header><div><span class="kicker">DÉFILÉ RAPIDE · ${position} / ${cards.length}</span><h2>${displayName(card)}</h2></div><button class="secondary" id="reviewExit">Retour à la liste · ${batchCount()} dans le lot</button></header><div class="cert-review-body"><div class="cert-card-visual"><img src="${imageFor(card)}" alt="Carte ${displayName(card)}"><small>Touchez l’image pour l’agrandir. Comparez chaque ligne du récapitulatif au visuel.</small></div><div class="cert-review-side">${aiPanel(card)}${hqPanel(card,d)}${sourcesPanel(card,d)}${weaponGapPanel(card,d)}${extra}${why.length?'<p class="notice">Avant de valider : '+why.join(' ; ')+'.</p>':''}<div class="cert-review-actions"><button class="primary big-confirm" id="reviewOk" ${ok?'':'disabled'}>✓ CONFORME · carte suivante</button><button class="secondary" id="reviewEdit">✎ À corriger…</button><button class="secondary" id="reviewSkip">Passer →</button></div></div></div></section>`
  }
  const hasQueuedCard=card=>{const d=drafts[card];return !!((d?.weapons||[]).some(w=>w.queued)||d?.defenseQueued||d?.unitStatsQueued||d?.addedModelsQueued||d?.fullCardQueued)}
  const nextPending=current=>profiles().filter(([card,p])=>card!==current&&pendingFor(card,p)>0&&!hasQueuedCard(card)).sort((a,b)=>priority(a)-priority(b))[0]?.[0]||null
  const keywordDefFor=id=>keywords.find(item=>item.id===id)
  const needsDetail=def=>!!def&&/:/.test(def.name)
  function keywordSearchHtml(scope,list){
    const st=kwPicker.scope===scope?kwPicker:{query:'',pendingId:null,pendingValue:'',pendingDetail:''},taken=new Set(list.map(tag=>tag.keywordId)),q=norm(st.query||'')
    const matches=q?keywords.filter(item=>!taken.has(item.id)&&(norm(item.name).includes(q)||norm(item.id.replace(/-/g,' ')).includes(q))).slice(0,8):[]
    const pending=st.pendingId?keywordDefFor(st.pendingId):null
    const chips=list.length?list.map(tag=>'<span class="kw-chip"><b>'+escapeHtml(keywordName(tag.keywordId))+(tag.value?' '+tag.value:'')+'</b>'+(tag.detail?'<i>'+escapeHtml(tag.detail)+'</i>':'')+'<button type="button" data-kw-remove="'+scope+'|'+tag.keywordId+'" aria-label="Retirer '+escapeHtml(keywordName(tag.keywordId))+'">×</button></span>').join(''):'<span class="kw-empty">Aucun mot-clé</span>'
    const form=pending?'<div class="kw-pending"><b>'+escapeHtml(pending.name)+'</b>'+(pending.hasValue?'<label>Valeur X<input type="number" min="1" max="20" data-kw-value value="'+escapeHtml(st.pendingValue)+'"></label>':'')+(needsDetail(pending)?'<label>Précision imprimée<input type="text" data-kw-detail value="'+escapeHtml(st.pendingDetail)+'" placeholder="ex. Viser 1 ou Esquive 1"></label>':'')+'<button type="button" class="primary" data-kw-confirm="'+scope+'">Ajouter</button><button type="button" class="secondary" data-kw-cancel>Annuler</button></div>':''
    return '<div class="kw-picker" data-kw-scope="'+scope+'"><div class="kw-chips">'+chips+'</div><label class="kw-search">Ajouter un mot-clé<input type="search" data-kw-search="'+scope+'" value="'+escapeHtml(st.query||'')+'" placeholder="Tapez : préc, arsenal, perfo…" autocomplete="off"></label>'+(matches.length?'<ul class="kw-results">'+matches.map(item=>'<li><button type="button" data-kw-add="'+scope+'|'+item.id+'">'+escapeHtml(item.name)+(item.hasValue?' <small>(valeur X)</small>':'')+'</button></li>').join('')+'</ul>':(q&&!pending?'<p class="kw-none">'+(keywords.some(item=>taken.has(item.id)&&(norm(item.name).includes(q)||norm(item.id.replace(/-/g,' ')).includes(q)))?'Ce mot-clé est déjà dans la liste.':'Aucun mot-clé du glossaire ne correspond : vérifiez l’orthographe ou ajoutez-le d’abord au glossaire.')+'</p>':''))+form+'</div>'
  }
  function kwListFor(d,scope){return scope==='card'?d.fullCard.keywords:d.weapons[+scope.slice(1)].keywords}
  function kwSet(d,scope,list){if(scope==='card')d.fullCard.keywords=list;else{const w=d.weapons[+scope.slice(1)];w.keywords=list;w.kwEdited=true;w.queued=false}d.fullCardQueued=false}
  function kwAdd(d,scope,tag){
    const list=kwListFor(d,scope);if(list.some(item=>item.keywordId===tag.keywordId))return
    kwSet(d,scope,[...list,tag]);d.fullCard.noKeywords=false
    if(scope!=='card'&&!d.fullCard.keywords.some(item=>item.keywordId===tag.keywordId))d.fullCard.keywords=[...d.fullCard.keywords,{...tag}]
  }
  const weaponPayload=weapon=>{const hasKeywords=Array.isArray(weapon.keywords),keywordsList=weapon.keywords||[],values=Object.fromEntries(keywordsList.filter(tag=>tag.value).map(tag=>[tag.keywordId,tag.value]));return {index:weapon.index,name:weapon.name,dice:weapon.dice,range:weapon.range,...(hasKeywords?{keywordIds:keywordsList.map(tag=>tag.keywordId),...(Object.keys(values).length?{keywordValues:values}:{})}:{})}}
  // Panneau d'explication en langage courant : ce qui a été prérempli, ce qui est à vérifier, et un récapitulatif à comparer au visuel.
  const surgeLabel={none:'aucune',hit:'touche',crit:'critique',block:'blocage'}
  const diceText=dice=>dice==='variable'?'réserve variable':((dice||[]).filter(d=>d.count>0).map(d=>d.count+' '+d.color).join(' + ')||'aucun dé')
  function sourcesPanel(card,d){
    const p=weaponProfiles[card],cc=crosscheckFor(card),conflict=conflictFor(card),f=d.fullCard
    const notes=[]
    if(conflict){
      for(const id of conflict.certifiedOnly)notes.push('« '+keywordName(id)+' » est imprimé sur la carte ou sur une arme mais manquait dans nos données du moteur : il est déjà ajouté à la liste ci-dessous.')
      for(const id of conflict.tagsOnly)notes.push('« '+keywordName(id)+' » était dans nos données du moteur mais avait été oublié à la dernière validation : il est déjà ajouté à la liste ci-dessous.')
      for(const id of conflict.valueDiffs)notes.push('« '+keywordName(id)+' » : la valeur X n’était pas la même dans nos deux enregistrements. Vérifiez la valeur imprimée sur la carte.')
    }
    const lines=cc?[...cc.keywords,...cc.stats]:[]
    const weaponRows=(d.weapons||[]).map(w=>'<li><b>'+escapeHtml(w.name)+'</b> — '+escapeHtml(diceText(w.dice))+' — portée '+escapeHtml(String(w.range||'?'))+' — '+((w.keywords||[]).length?escapeHtml(keywordList(w.keywords)):'aucun mot-clé')+'</li>').join('')
    const stats=f.cardType==='unit'?'PV par figurine <b>'+d.unitStats.woundsPerModel+'</b> · Courage <b>'+(d.unitStats.courage??'—')+'</b> · Figurines de base <b>'+d.unitStats.baseModels+'</b> · Défense <b>'+escapeHtml(d.defenseColor||'?')+'</b>':'Figurines ajoutées <b>'+d.addedModels+'</b> (PV de chacune <b>'+d.addedModelWounds+'</b>)'
    return `<section class="cert-sources"><header><strong>À COMPARER AVEC LE VISUEL</strong></header><p class="cert-help">Voici ce que le moteur utilisera si vous validez. Chaque ligne doit être identique à la carte.</p><ul class="cert-recap"><li><b>Carte</b> : ${escapeHtml(displayName(card))} — ${f.cardType==='unit'?'unité':'amélioration'}</li><li><b>Caractéristiques</b> : ${stats}</li><li><b>Armes</b> (dés, portée, mots-clés imprimés sous chaque arme) :<ul>${weaponRows||'<li>Aucune arme</li>'}</ul></li><li><b>Adrénaline</b> : attaque ${escapeHtml(surgeLabel[f.attackSurge]||f.attackSurge)} · défense ${escapeHtml(surgeLabel[f.defenseSurge]||f.defenseSurge)}</li><li><b>Tous les mots-clés de la carte</b> (armes comprises) : ${escapeHtml(keywordList(f.keywords))}</li></ul>${notes.length?`<div class="cert-gap"><b>⚠ Ajustements déjà faits pour vous — à confirmer</b><ul>${notes.map(line=>'<li>'+escapeHtml(line)+'</li>').join('')}</ul></div>`:''}${lines.length?`<div class="cert-gap"><b>⚠ Le site Legion Helper indique autre chose (avis externe, il peut se tromper)</b><ul>${lines.map(line=>'<li>'+escapeHtml(line)+'</li>').join('')}</ul></div>`:'<p class="cert-help">Legion Helper n’a rien de différent à signaler pour cette carte (ou n’a pas cette carte) : seul le visuel fait foi.</p>'}</section>`
  }
  const pendingFor=(card,profile)=>(profile.weapons||[]).filter(w=>!w.verifiedAgainstCard).length+(isUnitCard(card)&&!profile.defenseVerifiedAgainstCard?1:0)+(isUnitCard(card)&&!profile.unitStats?.verifiedAgainstCard?1:0)+(!isUnitCard(card)&&Number.isInteger(profile.addedModels)&&!profile.addedModelsVerifiedAgainstCard?1:0)+(!profile.fullCardCertification?1:0)+(isUnitCard(card)&&profile.fullCardCertification&&!['1','2','3'].includes(String(profile.fullCardCertification.speed))?1:0)+(secondOpinionOpen(card,profile)?1:0);
  const pendingTotal=()=>profiles().reduce((n,[card,p])=>n+pendingFor(card,p),0);
  const batchCount=()=>Object.values(drafts).reduce((n,d)=>n+(d.weapons||[]).filter(w=>w.queued).length+(d.defenseQueued?1:0)+(d.unitStatsQueued?1:0)+(d.addedModelsQueued?1:0)+(d.fullCardQueued?1:0),0)+unknownBatchCount();
  const save=()=>localStorage.setItem(storageKey,JSON.stringify(drafts));
  const canonicalDice=dice=>dice==='variable'?'variable':(dice||[]).map(d=>({color:norm(d.color),count:Number(d.count)})).filter(d=>d.count>0).sort((a,b)=>a.color.localeCompare(b.color)||a.count-b.count),sameDice=(a,b)=>JSON.stringify(canonicalDice(a))===JSON.stringify(canonicalDice(b)),sameRange=(a,b)=>norm(String(a||'').replace(/∞/g,'#'))===norm(String(b||'').replace(/∞/g,'#')),publishedWeapon=(profile,draft)=>profile.weapons?.[draft.index]?.name===draft.name?profile.weapons[draft.index]:profile.weapons?.find(weapon=>norm(weapon.name)===norm(draft.name));
  function reconcilePublished(){let changed=false;for(const [card,d] of Object.entries(drafts)){const p=weaponProfiles[card];if(!p)continue;(d.weapons||[]).forEach(w=>{const published=publishedWeapon(p,w);if(w.queued&&published?.verifiedAgainstCard&&sameDice(published.dice,w.dice)&&sameRange(published.range,w.range)){w.queued=false;changed=true}});if(d.defenseQueued&&p.defenseVerifiedAgainstCard&&norm(p.defenseColor)===norm(d.defenseColor)){d.defenseQueued=false;changed=true}if(d.unitStatsQueued&&p.unitStats?.verifiedAgainstCard&&Number(p.unitStats.woundsPerModel)===Number(d.unitStats?.woundsPerModel)&&(p.unitStats.courage===null?d.unitStats?.courage===null:Number(p.unitStats.courage)===Number(d.unitStats?.courage))&&Number(p.unitStats.baseModels)===Number(d.unitStats?.baseModels)&&!!p.unitStats.suppressionImmune===!!d.unitStats?.suppressionImmune){d.unitStatsQueued=false;changed=true}if(d.addedModelsQueued&&p.addedModelsVerifiedAgainstCard&&Number(p.addedModels)===Number(d.addedModels)&&(d.addedModels===0||Number(p.addedModelWounds||1)===Number(d.addedModelWounds||1))){d.addedModelsQueued=false;changed=true}if(d.fullCardQueued&&p.fullCardCertification){d.fullCardQueued=false;changed=true}}if(changed)save()}
  function reconcileUnknownDrafts(){
    let aliasChanged=false
    for(const key of Object.keys(aliasDrafts)){if((window.SWL_REFERENCE?.aliases||{})[key]===aliasDrafts[key]){delete aliasDrafts[key];aliasChanged=true}}
    if(aliasChanged)saveAliasDrafts()
    for(const key of Object.keys(newCardDrafts)){if(weaponProfiles[key])delete newCardDrafts[key]}
  }
  reconcilePublished();
  reconcileUnknownDrafts();
  // Le bandeau ne compte que les cartes de vos listes : ce sont les seules qui servent pendant une partie.
  const pendingCardsInLists=()=>profiles().filter(([card,p])=>isInArmy(card)&&pendingFor(card,p)>0).length
  function updateBadge(){const button=$('#certification'),count=$('#certificationCount'),pending=pendingCardsInLists();if(!button||!count)return;button.classList.toggle('all-certified',pending===0);button.firstChild.textContent=pending?'⚠ Certification de vos listes ':'✓ Cartes de vos listes certifiées ';count.textContent=pending?String(pending):'✓'}
  function draftFor(card){
    const p=weaponProfiles[card];
    // Carte mise à jour par l'erratum FR du 17/06/2026 : un brouillon créé avant (anciens dés, portée, mots-clés) est reconstruit une seule fois.
    if(drafts[card]&&(window.SWL_REFERENCE?.errataResetCards||[]).includes(card)&&drafts[card].errataVersion!=='2026-06-17')delete drafts[card];
    const saved=drafts[card];
    if(!saved||!Array.isArray(saved.weapons))drafts[card]={card,weapons:(p.weapons||[]).map((w,index)=>({index,name:w.name,dice:w.dice==='variable'?'variable':w.dice.map(d=>({...d})),range:w.range,verified:!!w.verifiedAgainstCard,queued:false})),defenseColor:p.defenseColor||null,defenseVerified:!!p.defenseVerifiedAgainstCard,defenseQueued:false,unitStats:p.unitStats?{woundsPerModel:p.unitStats.woundsPerModel,courage:p.unitStats.courage,baseModels:p.unitStats.baseModels,suppressionImmune:!!p.unitStats.suppressionImmune}:{woundsPerModel:1,courage:1,baseModels:1,suppressionImmune:false},unitStatsVerified:!!p.unitStats?.verifiedAgainstCard,unitStatsQueued:false,addedModels:Number.isInteger(p.addedModels)?p.addedModels:0,addedModelWounds:Number.isInteger(p.addedModelWounds)?p.addedModelWounds:1,addedModelsVerified:!!p.addedModelsVerifiedAgainstCard,addedModelsQueued:false};
    const d=drafts[card],defaultStats=p.unitStats?{woundsPerModel:p.unitStats.woundsPerModel,courage:p.unitStats.courage,baseModels:p.unitStats.baseModels,suppressionImmune:!!p.unitStats.suppressionImmune}:{woundsPerModel:1,courage:1,baseModels:1,suppressionImmune:false};
    if(!d.unitStats||typeof d.unitStats!=='object')d.unitStats={...defaultStats};
    if(!Number.isFinite(d.unitStats.woundsPerModel))d.unitStats.woundsPerModel=defaultStats.woundsPerModel;
    if(d.unitStats.courage===undefined)d.unitStats.courage=defaultStats.courage;
    if(!Number.isFinite(d.unitStats.baseModels))d.unitStats.baseModels=defaultStats.baseModels;
    if(typeof d.unitStats.suppressionImmune!=='boolean')d.unitStats.suppressionImmune=defaultStats.suppressionImmune;
    if(typeof d.unitStatsVerified!=='boolean')d.unitStatsVerified=!!p.unitStats?.verifiedAgainstCard;
    if(typeof d.unitStatsQueued!=='boolean')d.unitStatsQueued=false;
    if(d.defenseColor===undefined)d.defenseColor=p.defenseColor||null;
    if(typeof d.defenseVerified!=='boolean')d.defenseVerified=!!p.defenseVerifiedAgainstCard;
    if(typeof d.defenseQueued!=='boolean')d.defenseQueued=false;
    if(!Number.isInteger(d.addedModels))d.addedModels=Number.isInteger(p.addedModels)?p.addedModels:0;
    if(!Number.isInteger(d.addedModelWounds))d.addedModelWounds=Number.isInteger(p.addedModelWounds)?p.addedModelWounds:1;
    if(typeof d.addedModelsVerified!=='boolean')d.addedModelsVerified=!!p.addedModelsVerifiedAgainstCard;
    if(typeof d.addedModelsQueued!=='boolean')d.addedModelsQueued=false;
    // Armes ajoutées à la base APRÈS la création du brouillon (ex. Soldat avec Mortier DF-90, dont le brouillon local était vide) :
    // elles doivent apparaître dans l'écran, sinon la carte se certifie sans ses armes. La carte doit alors être revalidée.
    if(Array.isArray(d.weapons)){let added=false;(p.weapons||[]).forEach((w,index)=>{if(!d.weapons.some(item=>item.index===index)){d.weapons.push({index,name:w.name,dice:w.dice==='variable'?'variable':w.dice.map(die=>({...die})),range:w.range,verified:!!w.verifiedAgainstCard,queued:false});added=true}});if(added){d.weapons.sort((a,b)=>a.index-b.index);d.fullCardQueued=false}}
    if(!d.fullCard){const existing=p.fullCardCertification,tagsForCard=tags[card]||[];d.fullCard={cardType:isUnitCard(card)?'unit':'upgrade',rank:isUnitCard(card)?unitRank({name:card}):'',unitType:existing?.unitType||'',speed:existing?.speed||hqSpeedFor(card),speedFromHq:!existing?.speed&&!!hqSpeedFor(card),attackSurge:existing?.attackSurge||p.attackSurge||(typeof combatProfiles!=='undefined'?combatProfiles[card]?.attackSurge:null)||(hqOf(card)?.kind==='unit'?hqOf(card).attackSurge:null)||'none',defenseSurge:existing?.defenseSurge||p.defenseSurge||(typeof combatProfiles!=='undefined'?combatProfiles[card]?.defenseSurge:null)||(hqOf(card)?.kind==='unit'?hqOf(card).defenseSurge:null)||'none',keywords:mergeKeywords(tagsForCard,existing?.keywords),noKeywords:!!existing?.noKeywordsConfirmed,...(isUnitCard(card)?{}:{cardUse:existing?.cardUse||(window.SWL_REFERENCE?.cardUse||{})[card]||'passive'}),ack:false,checks:Object.fromEntries(['identity','visual','stats','weapons','conversions','keywords'].map(check=>[check,!!existing&&!(check==='keywords'&&secondOpinionOpen(card,p))])),rulesVersion:existing?.rulesVersion||'AMG 2026-06-17'};d.fullCardQueued=false}
    if(d.fullCard&&d.fullCard.cardType==='unit'&&!['1','2','3'].includes(String(d.fullCard.speed))&&hqSpeedFor(card)){d.fullCard.speed=hqSpeedFor(card);d.fullCard.speedFromHq=true;d.fullCardQueued=false}
    if(d.fullCard){if(d.fullCard.noKeywords===undefined)d.fullCard.noKeywords=false;if(d.fullCard.ack===undefined)d.fullCard.ack=false}
    // Mots-clés d'une arme non modifiée à la main et pas encore dans le lot : toujours relus depuis la base (valeurs corrigées depuis la création du brouillon).
    for(const w of d.weapons||[]){if(!Array.isArray(w.keywords)||(!w.kwEdited&&!w.queued)){const published=p.weapons?.[w.index];w.keywords=(published?.keywordIds||[]).map(id=>{const value=published.keywordValues?.[id]??(tags[card]||[]).find(tag=>tag.keywordId===id)?.value;return{keywordId:id,...(value?{value}:{})}})}}
    d.weaponKwVersion=2;if((window.SWL_REFERENCE?.errataResetCards||[]).includes(card))d.errataVersion='2026-06-17'
    save();return d;
  }
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  // Portée imprimée : « melee » = icône de corps-à-corps seule ; « melee-N » = arme à DEUX icônes (corps-à-corps ET distance 1 à N, ex. lance-flammes, pistolet DH-17) ; « a-b » = distance seule.
  const RANGE_PRESETS=[['melee','Corps-à-corps seul'],['melee-1','Corps-à-corps + distance 1'],['melee-2','Corps-à-corps + distance 1-2'],['melee-3','Corps-à-corps + distance 1-3'],['1','Distance 1'],['1-2','Distance 1-2'],['1-3','Distance 1-3'],['1-4','Distance 1-4'],['1-#','Distance 1 à illimitée']];
  function rangeReading(value){const v=String(value||'').trim();if(!v)return 'Portée non renseignée : l’arme serait proposée à toutes les portées.';if(v==='melee')return 'Lu par le moteur : corps-à-corps uniquement.';let m=v.match(/^melee-(\d+)$/);if(m)return 'Lu par le moteur : corps-à-corps ET tir à distance de 1 à '+m[1]+' (arme à deux icônes de portée).';m=v.match(/^(\d+)-(\d+|#)$/);if(m)return 'Lu par le moteur : à distance, de '+m[1]+' à '+(m[2]==='#'?'la portée maximale':m[2])+' (pas de corps-à-corps).';if(/^\d+$/.test(v))return 'Lu par le moteur : à distance, portée '+v+' seulement (pas de corps-à-corps).';return '⚠ Format non reconnu (« '+escapeHtml(v)+' ») : utilisez melee, melee-2, 1, 1-3 ou 1-#.'}
  function rangeHelper(index,value){return '<div class="range-helper"><small class="range-read">'+rangeReading(value)+'</small><div class="range-presets">'+RANGE_PRESETS.map(([preset,label])=>'<button type="button" class="secondary" data-range-preset="'+index+':'+preset+'">'+label+'</button>').join('')+'</div></div>'}
  // Mots-clés présents dans la base mais absents de la liste saisie : à rajouter, ou à confirmer comme retirés (sinon la carte perdrait ce mot-clé par oubli).
  function pendingRemovals(card,f){const weaponIds=new Set(((drafts[card]?.weapons)||[]).flatMap(w=>(w.keywords||[]).map(k=>k.keywordId)));return (tags[card]||[]).filter(tag=>!f.keywords.some(item=>item.keywordId===tag.keywordId)&&!weaponIds.has(tag.keywordId)&&!(f.confirmedRemovals||[]).includes(tag.keywordId))}
  function removalPanel(card,f){
    const list=pendingRemovals(card,f);if(!list.length)return '';
    return '<div class="cert-removals" role="alert"><strong>⚠ Mots-clés de la base absents de votre liste</strong><small>La base connaît déjà ces mots-clés sur cette carte. S’ils sont imprimés, rajoutez-les ; sinon confirmez qu’ils n’y sont pas.</small>'+list.map(tag=>{const def=keywords.find(item=>item.id===tag.keywordId);return '<div class="cert-removal"><b>'+escapeHtml(def?def.name:tag.keywordId)+(tag.value?' '+tag.value:'')+'</b><button type="button" class="secondary" data-kw-readd="'+tag.keywordId+'">Rajouter à la carte</button><button type="button" class="secondary" data-kw-confirm-removal="'+tag.keywordId+'">Non, la carte n’en a pas</button></div>'}).join('')+'</div>'
  }
  const dieCount=(weapon,color)=>weapon.dice==='variable'?0:(weapon.dice.find(d=>d.color===color)?.count||0);
  function setDie(weapon,color,value){if(weapon.dice==='variable')weapon.dice=[];weapon.dice=weapon.dice.filter(d=>d.color!==color);if(value>0)weapon.dice.push({color,count:value});weapon.dice.sort((a,b)=>['rouge','noir','blanc'].indexOf(a.color)-['rouge','noir','blanc'].indexOf(b.color));weapon.queued=false;for(const draft of Object.values(drafts))if(draft.weapons?.includes(weapon))draft.fullCardQueued=false;save()}
  function unknownSection(){
    const items=unknownCardEntries()
    if(!items.length)return ''
    return `<section class="cert-status-section unknown"><header><h2>Cartes inconnues du catalogue</h2><b>${items.length} carte(s)</b></header><p class="cert-help">Ni visuel ni dés enregistrés pour ces cartes importées -- le contrôle ci-dessus ne peut rien vous proposer tant qu'elles ne sont pas raccordées.</p><div class="cert-list">${items.map(({key,label})=>{const status=unknownStatus(key);return `<button type="button" data-unknown-card="${encodeURIComponent(key)}" data-unknown-label="${encodeURIComponent(label)}" class="${status?'controlled-card':''}"><span><strong>${displayName(label)}</strong><small>${status||'Non traité'}</small></span><b>›</b></button>`}).join('')}</div></section>`
  }
  function unknownChooser(card,label){
    const staged=aliasDrafts[card]?`Alias vers « ${displayName(aliasDrafts[card])} »`:newCardDrafts[card]?.ready?'Nouvelle carte prête à envoyer':newCardDrafts[card]?'Brouillon de nouvelle carte en cours':null
    return `<section class="cert-detail"><header><div><small>CARTE INCONNUE</small><h2>${displayName(label)}</h2></div><button class="secondary" id="backUnknown">Retour à la liste</button></header><div class="cert-card-layout"><div class="cert-fields">${staged?`<p class="notice">${staged}</p>`:''}<button class="primary" data-unknown-action="pick">C'est la même carte que…</button><button class="primary" data-unknown-action="new">C'est une nouvelle carte</button>${staged?'<button class="secondary" data-unknown-action="clear">Retirer du lot</button>':''}<p class="cert-help">« Même carte » : cette carte a déjà ses dés/PV certifiés sous un autre nom (ex. le titre complet exporté par Tabletop Admiral). « Nouvelle carte » : elle n'a encore jamais été saisie, y compris son visuel.</p></div></div></section>`
  }
  function aliasPicker(card,label,query){
    const q=norm(query||''),matches=Object.keys(weaponProfiles).filter(key=>!q||norm(displayName(key)).includes(q)||key.includes(q)).slice(0,40)
    return `<section class="cert-detail"><header><div><small>MÊME CARTE QUE…</small><h2>${displayName(label)}</h2></div><button class="secondary" id="backUnknownChoose">Retour</button></header><div class="cert-card-layout"><div class="cert-fields"><input id="aliasSearch" type="search" placeholder="Rechercher une carte déjà connue…" value="${(query||'').replace(/"/g,'&quot;')}"><div class="cert-list">${matches.map(key=>`<button type="button" data-alias-pick="${encodeURIComponent(key)}"><img src="${imageFor(key)}" alt=""><span><strong>${displayName(key)}</strong></span></button>`).join('')||'<p class="notice">Aucune carte ne correspond.</p>'}</div></div></div></section>`
  }
  function ensureNewCardDraft(card,label){
    if(!newCardDrafts[card])newCardDrafts[card]={nameFr:label,kind:'unit',weapons:[],defenseColor:null,unitStats:{woundsPerModel:1,courage:1,baseModels:1},addedModels:0,addedModelWounds:1,keywords:[],keywordQuery:'',keywordPendingId:null,keywordPendingValue:'',imageFile:null,imagePreviewUrl:null,ready:false}
    return newCardDrafts[card]
  }
  const setNewCardDie=(weapon,color,value)=>{weapon.dice=(weapon.dice||[]).filter(d=>d.color!==color);if(value>0)weapon.dice.push({color,count:value});weapon.dice.sort((a,b)=>['rouge','noir','blanc'].indexOf(a.color)-['rouge','noir','blanc'].indexOf(b.color))}
  function newCardForm(card,label){
    const d=ensureNewCardDraft(card,label)
    const weaponsHtml=d.weapons.map((w,index)=>`<article class="cert-weapon"><header><strong>Arme ${index+1}</strong><button class="secondary" data-remove-weapon="${index}">Retirer</button></header><label>Nom<input data-weapon-field="${index}:name" value="${(w.name||'').replace(/"/g,'&quot;')}"></label><label>Portée (ex. 1-3, melee, melee-2)<input data-weapon-field="${index}:range" value="${(w.range||'').replace(/"/g,'&quot;')}"></label><small class="range-read">${rangeReading(w.range)}</small><div class="cert-dice-row">${['rouge','noir','blanc'].map(color=>`<div class="cert-die-control"><span class="dice-badge dice-badge-${color}"><span>${dieCount(w,color)}</span></span><div><button data-newcard-die="${index}:${color}" data-delta="-1">−</button><b>${dieCount(w,color)}</b><button data-newcard-die="${index}:${color}" data-delta="1">+</button></div></div>`).join('')}</div></article>`).join('')
    const statsHtml=d.kind==='unit'?`<article class="cert-stats"><header><strong>PV, courage et figurines</strong></header><div class="cert-stat-grid"><label>PV par figurine<input data-newcard-stat="woundsPerModel" type="number" min="1" max="20" value="${d.unitStats.woundsPerModel}"></label><label>Courage<input data-newcard-stat="courage" type="number" min="1" max="20" value="${d.unitStats.courage??''}" placeholder="—"></label><label>Figurines de base<input data-newcard-stat="baseModels" type="number" min="1" max="30" value="${d.unitStats.baseModels}"></label></div><label class="no-courage-choice"><input id="newCardNoCourage" type="checkbox" ${d.unitStats.courage===null?'checked':''}> Courage « — »</label><div class="defense-choice"><button data-newcard-defense="blanc" class="${d.defenseColor==='blanc'?'on':''}">□ BLANC</button><button data-newcard-defense="rouge" class="${d.defenseColor==='rouge'?'on':''}">■ ROUGE</button></div></article>`:d.kind==='upgrade-models'?`<article class="cert-stats"><header><strong>Figurines ajoutées</strong></header><div class="cert-stat-grid"><label>Nombre ajouté<input data-newcard-added-models type="number" min="0" max="30" value="${d.addedModels}"></label><label>PV de chaque figurine<input data-newcard-added-model-wounds type="number" min="1" max="20" value="${d.addedModelWounds}"></label></div></article>`:''
    const allKeywords=window.SWL_REFERENCE?.keywords||[]
    const keywordById=id=>allKeywords.find(k=>k.id===id)
    const kwQuery=norm(d.keywordQuery||'')
    const kwResults=allKeywords.filter(k=>!d.keywords.some(t=>t.keywordId===k.id)).filter(k=>!kwQuery||norm(k.name).includes(kwQuery)).slice(0,8)
    const kwPending=d.keywordPendingId?keywordById(d.keywordPendingId):null
    const keywordsHtml=`<article class="cert-stats"><header><strong>Mots-clés de la carte</strong></header><p class="cert-help">Optionnel : permet de retrouver ses mots-clés sur l'onglet Armées sans avoir à les re-taguer à la main.</p><div class="cert-list">${d.keywords.map(t=>{const def=keywordById(t.keywordId);return `<button type="button" data-remove-keyword="${t.keywordId}" aria-label="Retirer ${def?def.name:t.keywordId}"><span><strong>${def?def.name:t.keywordId}${def?.hasValue&&t.value?` ${t.value}`:''}</strong></span><b>×</b></button>`}).join('')||'<p class="notice">Aucun mot-clé ajouté pour l\'instant.</p>'}</div><input id="newCardKeywordSearch" type="search" placeholder="Chercher un mot-clé…" value="${(d.keywordQuery||'').replace(/"/g,'&quot;')}"><div class="cert-list">${kwResults.map(k=>`<button type="button" data-add-keyword="${k.id}">${k.name}</button>`).join('')}</div>${kwPending?`<label>Valeur sur cette carte (X)<input id="newCardKeywordValue" type="number" min="1" max="20" value="${d.keywordPendingValue||''}"></label><button class="secondary" id="confirmKeyword">Ajouter ${kwPending.name}</button>`:''}</article>`
    return `<section class="cert-detail"><header><div><small>NOUVELLE CARTE</small><h2>${displayName(label)}</h2></div><button class="secondary" id="backUnknownChoose">Retour</button></header><div class="cert-card-layout"><div class="cert-fields"><label>Nom français<input id="newCardNameFr" value="${(d.nameFr||'').replace(/"/g,'&quot;')}"></label><label>Type de carte<select id="newCardKind"><option value="unit" ${d.kind==='unit'?'selected':''}>Carte Unité (PV/courage/figurines)</option><option value="upgrade-models" ${d.kind==='upgrade-models'?'selected':''}>Amélioration qui ajoute des figurines</option><option value="upgrade-plain" ${d.kind==='upgrade-plain'?'selected':''}>Autre amélioration / carte Commandement</option></select></label>${statsHtml}<div class="cert-weapons">${weaponsHtml}</div><button class="secondary" id="addWeaponRow">+ Ajouter une arme</button>${keywordsHtml}<label>Visuel de la carte (photo prise à plat, bien éclairée)<input id="newCardImage" type="file" accept="image/*"></label>${d.imagePreviewUrl?`<img class="cert-newcard-preview" src="${d.imagePreviewUrl}" alt="Aperçu">`:''}<button class="primary" id="confirmNewCard">${d.ready?'✓ Prêt -- revalider':'Ajouter au lot'}</button><p class="cert-help">Le brouillon (sauf la photo) reste sur cet appareil jusqu'à l'envoi du lot ; la photo, elle, est perdue si l'onglet est rechargé avant l'envoi.</p></div></div></section>`
  }
  // ---- Fiche de contrôle (refonte 22/09/2026) : chaque champ affiche « Appli » (donnée publiée) et « Legion HQ » (référence) au-dessus,
  //      et le contrôle qui permet de le changer en dessous, avec un bouton « Utiliser HQ » quand ils diffèrent. Une seule validation par carte.
  const cfTriaged=(card,prefix)=>((window.SWL_REFERENCE?.legionhqIgnore||{})[card]||[]).some(item=>prefix.startsWith(item)||item.startsWith(prefix))
  const hqIdx=(card,pred)=>hqDiffItemsFiltered(card).findIndex(item=>item.apply&&pred(item.apply))
  function cfRow(card,label,appText,hqText,control,options={}){
    const hasHq=hqText!==undefined&&hqText!==null,fill=hasHq&&(appText===undefined||appText===null||appText==='—'||appText==='inconnu'),same=hasHq?String(appText)===String(hqText):null,triaged=hasHq&&same===false&&options.triage&&cfTriaged(card,options.triage),idx=options.apply?hqIdx(card,options.apply):-1;
    const state=!hasHq?'none':fill?'fill':same?'ok':triaged?'triaged':'ko';
    return '<div class="cf-row '+(state==='ko'?'diff':state==='fill'?'fill':'')+(options.missing?' cert-missing':'')+'"><div class="cf-head"><span class="cf-label">'+label+'</span><span class="cf-chips"><span class="cf-chip app"><i>Appli</i>'+escapeHtml(appText??'—')+'</span><span class="cf-chip hq '+state+'" '+(triaged?'title="Écart déjà tranché sur le visuel : la carte fait foi"':'')+'><i>Legion HQ</i>'+(hasHq?escapeHtml(hqText):'—')+(triaged?' · carte fait foi':'')+'</span></span>'+(idx>=0?'<button type="button" class="secondary cf-use" data-hq-apply="'+idx+'">Utiliser HQ</button>':'')+'</div><div class="cf-control">'+control+'</div>'+(options.hint?'<small class="cf-hint">'+options.hint+'</small>':'')+'</div>'
  }
  const RANK_TEXT=rank=>rank?(rankLabels[rank]||rank):'—'
  const surgeText=value=>surgeLabel[value]||'aucune'
  function pairHqWeapons(card,d){
    const hq=hqOf(card),published=weaponProfiles[card]?.weapons||[],out={};if(!hq)return out;
    const remaining=[...(hq.weapons||[])];
    published.forEach((w,index)=>{const key=hqDice(w.dice);let at=remaining.findIndex(item=>item.dice===key&&item.range===(w.range||''));if(at<0)at=remaining.findIndex(item=>item.dice===key);if(at<0)at=remaining.findIndex(item=>item.range===(w.range||''));if(at<0)at=0;if(remaining.length&&published.length===(hq.weapons||[]).length)out[index]=remaining.splice(at,1)[0]});
    return out
  }
  function keywordsRow(card,d){
    const f=d.fullCard,hq=hqOf(card),published=(tags[card]||[]),pubText=published.length?published.map(tag=>keywordName(tag.keywordId)+(tag.value?' '+tag.value:'')).join(', '):'aucun',hqIds=hq?.kw?Object.keys(hq.kw):null,hqText=hqIds?(hqIds.length?hqIds.map(id=>keywordName(id)+(hq.kw[id]?.length?' '+hq.kw[id][0]:'')).join(', '):'aucun'):null;
    const idx=hqIdx(card,apply=>apply.t==='keywords'),kwEmpty=!f.keywords.length,triaged=hqText!==null&&hqDiffs(card).every(line=>!/^mots-clés/.test(line));
    const state=hqText===null?'none':triaged?'ok':'ko';
    return '<div class="cf-row cf-keywords '+(state==='ko'?'diff':'')+'"><div class="cf-head"><span class="cf-label">Mots-clés de la carte <small>(unité, améliorations et armes : une seule liste)</small></span><span class="cf-chips"><span class="cf-chip app"><i>Appli</i>'+escapeHtml(pubText)+'</span><span class="cf-chip hq '+state+'"><i>Legion HQ</i>'+(hqText===null?'—':escapeHtml(hqText))+'</span></span>'+(idx>=0?'<button type="button" class="secondary cf-use" data-hq-apply="'+idx+'">Ajouter ceux de HQ</button>':'')+'</div><div class="cf-control cert-kw">'+keywordSearchHtml('card',f.keywords)+removalPanel(card,f)+weaponGapPanel(card,d)+(kwEmpty?'<label class="cert-confirm"><input type="checkbox" data-full-nokw '+(f.noKeywords?'checked':'')+'> Cette carte n’a <b>aucun</b> mot-clé (ni sur la carte, ni sur ses armes)</label>':'')+'</div></div>'
  }
  function weaponRows(card,d){
    const published=weaponProfiles[card]?.weapons||[],pairs=pairHqWeapons(card,d);
    return (d.weapons||[]).map(w=>{
      const pub=published[w.index],hqw=pairs[w.index],own=(w.keywords||[]);
      const pubRange=pub?hqRangeText(pub.range||''):'—',hqRange=hqw?hqRangeText(hqw.range):null,pubDice=pub?diceText(pub.dice):'—',hqDiceTxt=hqw?diceText(hqDiceList(hqw.dice)):null;
      const dice=w.dice==='variable'?'<p>Réserve variable : contrôlez la règle imprimée.</p>':'<div class="cert-dice-row">'+['rouge','noir','blanc'].map(color=>'<div class="cert-die-control"><span class="dice-badge dice-badge-'+color+'"><span>'+dieCount(w,color)+'</span></span><div><button data-cert-die="'+w.index+':'+color+'" data-delta="-1">−</button><b>'+dieCount(w,color)+'</b><button data-cert-die="'+w.index+':'+color+'" data-delta="1">+</button></div></div>').join('')+'</div>';
      const applyPred=apply=>apply.t==='weapon'&&apply.name===w.name;
      return '<article class="cert-weapon cf-weapon '+(w.queued?'certified':'')+'"><header><strong>'+escapeHtml(w.name)+'</strong><span>'+(w.verified?'✓ déjà certifiée':'⚠ à vérifier')+'</span></header>'
        +cfRow(card,'Portée imprimée',pubRange,hqRange,'<label class="cert-range"><input data-weapon-range="'+w.index+'" value="'+escapeHtml(w.range)+'" placeholder="1-3, 1-#, melee, melee-2"></label>'+rangeHelper(w.index,w.range),{apply:applyPred,triage:'arme'})
        +cfRow(card,'Dés d’attaque',pubDice,hqDiceTxt,dice,{apply:applyPred,triage:'arme'})
        +'<p class="cf-weapon-kw"><small>Mots-clés portés par cette arme (rattachés dans la section Mots-clés) :</small> '+(own.length?own.map(tag=>'<span class="kw-chip"><b>'+escapeHtml(keywordName(tag.keywordId))+(tag.value?' '+tag.value:'')+'</b></span>').join(''):'<span class="kw-empty">aucun</span>')+'</p></article>'
    }).join('')
  }
  function editor(card){
    const source=weaponProfiles[card],d=draftFor(card);syncWeaponKeywords(d);
    const f=d.fullCard,hq=hqOf(card),isUnit=isUnitCard(card),count=batchCount(),cert=source.fullCardCertification,stats=source.unitStats||{},printed=typeof combatProfiles!=='undefined'?combatProfiles[card]:null;
    const kwEmpty=!f.keywords.length,removals=pendingRemovals(card,f),needsAck=!!(crosscheckFor(card)||conflictFor(card)),speedOk=['1','2','3'].includes(String(f.speed)),complete=(!kwEmpty||f.noKeywords)&&!removals.length&&!weaponGapsBlocking(card,d)&&(!isUnit||speedOk),use=f.cardUse||(window.SWL_REFERENCE?.cardUse||{})[card]||'passive';
    if(f.cardType==='upgrade'&&!f.cardUse)f.cardUse=use;
    const pubRank=isUnit?unitRank({name:card}):null,hqCourage=hq?.kind==='unit'&&stats.courage===null?null:(hq?.courage??null);
    let rows='';
    if(isUnit){
      rows+=cfRow(card,'Rang',RANK_TEXT(pubRank),hq?.rank?RANK_TEXT(hq.rank):null,'<select data-full-field="rank">'+['commandant','operative','corps','special','support','heavy','unknown'].map(rank=>'<option value="'+rank+'" '+(f.rank===rank?'selected':'')+'>'+(rankLabels[rank]||rank)+'</option>').join('')+'</select>',{apply:apply=>apply.t==='rank',triage:'rang'});
      rows+=cfRow(card,'Type d’unité',cert?.unitType||'—',null,'<input data-full-field="unitType" list="cf-unit-types" value="'+escapeHtml(f.unitType)+'" placeholder="Soldat, Soldat Mandalorien, véhicule à répulseurs…"><datalist id="cf-unit-types">'+['Soldat','Soldat Mandalorien','Soldat Clone','Soldat Droïde','Droïde','Véhicule terrestre','Véhicule à répulseurs','Créature'].map(item=>'<option value="'+item+'">').join('')+'</datalist>',{hint:'Imprimé sous le nom de l’unité (ex. « Soldat »). L’erratum du 17/06/2026 fait de Boba Fett, Gar Saxon, Sabine et des Super Commandos des Soldats Mandaloriens.'});
      rows+=cfRow(card,'Vitesse',cert?.speed?'Vitesse '+cert.speed:'—',hq?.speed?'Vitesse '+hq.speed:null,'<select data-full-field="speed"><option value="" '+(speedOk?'':'selected')+'>— à choisir —</option>'+['1','2','3'].map(value=>'<option value="'+value+'" '+(String(f.speed)===value?'selected':'')+'>Vitesse '+value+'</option>').join('')+'</select>',{apply:apply=>apply.t==='speed',missing:!speedOk,triage:'vitesse',hint:f.speedFromHq&&String(f.speed)===hqSpeedFor(card)?'Préremplie d’après Legion HQ : à confirmer sur la carte.':'Obligatoire.'});
      rows+=cfRow(card,'Figurines de base',stats.baseModels??'—',hq?.minis??null,'<input data-cert-stat="baseModels" type="number" min="1" max="30" value="'+d.unitStats.baseModels+'">',{apply:apply=>apply.t==='stat'&&apply.field==='baseModels',triage:'figurines'});
      rows+=cfRow(card,'PV par figurine',stats.woundsPerModel??'—',hq?.hp??null,'<input data-cert-stat="woundsPerModel" type="number" min="1" max="20" value="'+d.unitStats.woundsPerModel+'">',{apply:apply=>apply.t==='stat'&&apply.field==='woundsPerModel',triage:'PV par figurine'});
      rows+=cfRow(card,'Courage',stats.courage===null?'—':(stats.courage??'—'),hqCourage===null&&hq?.kind==='unit'&&stats.courage===null?null:(hq?.courage??null),'<input data-cert-stat="courage" type="number" min="1" max="20" value="'+(d.unitStats.courage??'')+'" placeholder="—"><label class="no-courage-choice"><input id="noCourage" type="checkbox" '+(d.unitStats.courage===null?'checked':'')+'> Courage « — » : aucun moral, aucune suppression</label><label class="no-courage-choice"><input id="suppressionImmune" type="checkbox" '+(d.unitStats.suppressionImmune?'checked':'')+'> Immunisée à la suppression malgré un courage imprimé</label>',{apply:apply=>apply.t==='stat'&&apply.field==='courage',triage:'courage'});
      rows+=cfRow(card,'Dé de défense',source.defenseColor||'—',hq?.defense??null,'<div class="defense-choice"><button data-defense="blanc" class="'+(d.defenseColor==='blanc'?'on':'')+'">□ BLANC</button><button data-defense="rouge" class="'+(d.defenseColor==='rouge'?'on':'')+'">■ ROUGE</button></div>',{apply:apply=>apply.t==='defense',triage:'dé de défense'});
    }
    const pubAttack=cert?.attackSurge??printed?.attackSurge??'none',pubDefense=cert?.defenseSurge??printed?.defenseSurge??'none';
    rows+=cfRow(card,'Adrénaline d’attaque',surgeText(pubAttack),isUnit&&hq?surgeText(hq.attackSurge):null,'<select data-full-field="attackSurge">'+[['none','Aucune'],['hit','Touche'],['crit','Critique']].map(([value,label])=>'<option value="'+value+'" '+(f.attackSurge===value?'selected':'')+'>'+label+'</option>').join('')+'</select>',{apply:apply=>apply.t==='surge'&&apply.which==='attackSurge',triage:'adrénaline d’attaque'});
    rows+=cfRow(card,'Adrénaline de défense',surgeText(pubDefense),isUnit&&hq?surgeText(hq.defenseSurge):null,'<select data-full-field="defenseSurge">'+[['none','Aucune'],['block','Blocage']].map(([value,label])=>'<option value="'+value+'" '+(f.defenseSurge===value?'selected':'')+'>'+label+'</option>').join('')+'</select>',{apply:apply=>apply.t==='surge'&&apply.which==='defenseSurge',triage:'adrénaline de défense'});
    if(!isUnit){
      rows+=cfRow(card,'Utilisation de la carte',USE_LABELS[(window.SWL_REFERENCE?.cardUse||{})[card]||'passive'],null,'<select data-full-field="cardUse">'+Object.entries(USE_LABELS).map(([value,label])=>'<option value="'+value+'" '+(use===value?'selected':'')+'>'+label+'</option>').join('')+'</select>',{hint:'Cherchez sur la carte le petit carré noir avec une flèche ↱ (s’incline) ou une croix ✖ (supprimée). Aucun des deux : permanente.'});
      rows+=cfRow(card,'Figurines ajoutées',Number.isInteger(source.addedModels)?source.addedModels:'—',null,'<input data-added-models type="number" min="0" max="30" value="'+d.addedModels+'">');
      rows+=cfRow(card,'PV de chaque figurine ajoutée',Number.isInteger(source.addedModelWounds)?source.addedModelWounds:'—',null,'<input data-added-model-wounds type="number" min="1" max="20" value="'+d.addedModelWounds+'">');
    }
    rows+=keywordsRow(card,d);
    const state=d.fullCardQueued?'✓ CARTE ENTIÈRE AJOUTÉE AU LOT':cert?'✓ CARTE ENTIÈRE CERTIFIÉE':'⚠ VALIDATION REQUISE',history=hq?.history?.length&&hqDiffs(card).length?'<details class="cf-history"><summary>Historique des errata (Legion HQ)</summary>'+hq.history.map(item=>'<p><b>'+escapeHtml(item.date)+'</b> : '+escapeHtml(item.text)+'</p>').join('')+'</details>':'';
    return '<section class="cert-detail cf-detail"><header><div><small>CARTE À CONTRÔLER</small><h2>'+displayName(card)+'</h2></div><button class="secondary" id="backCertification">Retour à la liste · lot '+count+'</button></header><div class="cert-card-layout"><div class="cert-card-visual"><img src="'+imageFor(card)+'" alt="Carte '+displayName(card)+'"><small>Touchez l’image pour l’agrandir. Comparez chaque champ au visuel. Au-dessus de chaque champ : la donnée de l’appli et celle de Legion HQ ; en dessous : de quoi la changer.</small></div><div class="cert-fields"><article class="cert-full-card cf-card '+(d.fullCardQueued?'certified':'')+'"><header><div><strong>CONTRÔLE DE LA CARTE</strong><small>'+state+'</small></div></header>'+aiPanel(card)+(hqDiffs(card).length?'<div class="cert-ai ai-flag cf-hq-summary"><strong>⚠ Legion HQ (référence) : '+hqDiffs(card).length+' écart(s) avec l’appli</strong><small>'+hqDiffs(card).map(escapeHtml).join('<br>')+'</small></div>':'<div class="cert-ai ai-ok cf-hq-summary"><strong>Legion HQ (référence) : concordant</strong></div>')+'<details class="cf-sources" '+(needsAck?'open':'')+'><summary>Récapitulatif à comparer au visuel'+(needsAck?' · avis à lire':'')+'</summary>'+sourcesPanel(card,d)+'</details>'+history+rows+(f.cardType==='upgrade'&&!isUnit?'':'')+weaponRows(card,d)+'<details class="cf-advanced"><summary>Avancé</summary><label>Type de carte<select data-full-field="cardType"><option value="unit" '+(f.cardType==='unit'?'selected':'')+'>Unité</option><option value="upgrade" '+(f.cardType==='upgrade'?'selected':'')+'>Amélioration</option></select></label><label>Version des règles contrôlée<input data-full-field="rulesVersion" value="'+escapeHtml(f.rulesVersion)+'"></label></details>'+(needsAck?'<p class="cert-help">En cliquant sur « Tout est conforme », vous confirmez avoir lu les avis ci-dessus.</p>':'')+'<button class="primary big-confirm" id="certifyAndNext" '+(complete?'':'disabled')+'>✓ TOUT EST CONFORME À LA CARTE'+(needsAck?' (écarts lus)':'')+' · certifier et passer à la suivante</button><button class="primary" id="queueFullCard" '+(complete?'':'disabled')+'>'+(d.fullCardQueued?'Retirer la carte complète du lot':'CERTIFIER TOUTE LA CARTE EN UNE FOIS')+'</button>'+(complete?'':'<p class="notice">À compléter avant de certifier :'+(kwEmpty&&!f.noKeywords?' cochez « aucun mot-clé » (liste vide) ;':'')+(removals.length?' mots-clés de la base à rajouter ou à confirmer comme absents ;':'')+(weaponGapsBlocking(card,d)?' mots-clés d’arme à attribuer à une arme ;':'')+(isUnit&&!speedOk?' vitesse ;':'')+'</p>')+'</article><button class="primary" id="nextCertification">Contrôle suivant →</button><button class="secondary" id="backToBatch">Retour à la liste · '+batchCount()+' dans le lot</button><p class="cert-help">Les choix sont conservés sur cet appareil jusqu’à l’envoi unique du lot.</p></div></div></section>'
  }
  const USE_LABELS={passive:'Permanente : aucun symbole ↱ ni ✖',exhaust:'↱ Elle s’incline pour agir (redressée à la Phase Finale)',discard:'✖ Elle est supprimée de la partie (usage unique)',both:'↱ et ✖ : s’incline pour un effet, se supprime pour l’autre'}
  // Ordre de contrôle : 1) vos listes (unités puis améliorations de partie), 2) cartes avec écart à relire, 3) le reste.
  function listSummary(){
    const inLists=profiles().filter(([card])=>isInArmy(card));
    if(!inLists.length)return '<p class="notice cert-scope">Aucune liste importée : la certification porte sur toutes les cartes du catalogue. Importez une liste pour ne certifier que ce qui sert en partie.</p>';
    const done=inLists.filter(([card,p])=>pendingFor(card,p)===0||hasQueuedCard(card)).length,easy=inLists.filter(([card])=>isConcordant(card)).length;
    return '<p class="notice cert-scope"><strong>Vos listes : '+inLists.length+' carte(s)</strong> · '+done+' certifiée(s) ou prête(s) · '+easy+' concordante(s) (relue sans écart, Legion HQ et Legion Helper d’accord) · '+(inLists.length-done-easy)+' à examiner. Cumulé sur toutes les listes déjà chargées sur cette tablette, pas seulement la partie du jour. Les autres cartes du catalogue ne servent pas dans vos listes : elles sont sous le filtre « Toutes ».</p>'
  }
  function concordantButton(){const n=profiles().filter(([card])=>isConcordant(card)).length;return '<button type="button" class="primary" id="confirmConcordant" '+(n?'':'disabled')+'>✓ Confirmer les '+n+' carte(s) concordante(s) de mes listes</button>'}
  function groupedPending(pending,cardButton){
    if(!pending.length)return '<p class="notice">Toutes les cartes sont contrôlées ou prêtes à envoyer.</p>';
    const groupOf=item=>isInArmy(item[0])?'army':(crosscheckFor(item[0])||conflictFor(item[0]))?'gaps':'rest',labels={army:'Dans vos listes · unités puis améliorations de partie',gaps:'Écarts à relire',rest:'Autres cartes'};
    return ['army','gaps','rest'].map(group=>{const items=pending.filter(item=>groupOf(item)===group);return items.length?'<h3 class="cert-group">'+labels[group]+' · '+items.length+'</h3>'+items.map(item=>cardButton(item)).join(''):''}).join('')
  }
  function list(){
    const all=profiles(),hasQueued=([card])=>{const d=drafts[card];return !!((d?.weapons||[]).some(w=>w.queued)||d?.defenseQueued||d?.unitStatsQueued||d?.addedModelsQueued||d?.fullCardQueued)},ready=all.filter(hasQueued),allPending=all.filter(item=>pendingFor(item[0],item[1])>0&&!hasQueued(item)),pending=allPending.filter(passesFilter).sort((a,b)=>priority(a)-priority(b)),controlled=all.filter(item=>pendingFor(item[0],item[1])===0&&!hasQueued(item)),count=batchCount();
    const cardButton=([card,p],done=false)=>{const draft=drafts[card],queued=(draft?.weapons||[]).filter(w=>w.queued).length+(draft?.defenseQueued?1:0)+(draft?.unitStatsQueued?1:0)+(draft?.addedModelsQueued?1:0);return `<button type="button" data-cert-card="${encodeURIComponent(card)}" class="${done?'controlled-card':''}"><img src="${imageFor(card)}" alt=""><span><strong>${displayName(card)}</strong><small>${done?'✓ Carte contrôlée':`${pendingFor(card,p)} contrôle(s) restant(s)${queued?` · ${queued} dans le lot`:''}${flagText(card,p)}${aiBadge(card)}`}</small></span><b>${done?'✓':'›'}</b></button>`};
    return `<section class="cert-page"><header><div><span class="kicker">CONTRÔLE CENTRALISÉ</span><h1>Certification des cartes</h1><p>${pendingTotal()} élément(s) restent à comparer aux cartes.</p></div><button class="secondary" id="closeCertification">Retour à l’assistant</button></header><div class="cert-batch-bar"><strong>${count} correction(s) dans le lot</strong><span>Les corrections déjà présentes dans la base publiée sont retirées automatiquement.</span><button class="primary" id="sendBatch" ${count?'':'disabled'}>Envoyer toutes les corrections (${count})</button></div>${unknownSection()}<section class="cert-status-section todo"><header><h2>À contrôler</h2><b>${pending.length} carte(s)</b></header>${listSummary()}<div class="cert-review-launch">${concordantButton()}<button type="button" class="primary" id="startReviewFlagged" ${allPending.filter(item=>aiFlagged(item[0])).length?'':'disabled'}>▶ Défilé : ${allPending.filter(item=>aiFlagged(item[0])).length} carte(s) à confirmer (écart Legion HQ, corrigées ou illisibles)</button><button type="button" class="secondary" id="startReview" ${allPending.length?'':'disabled'}>▶ Défilé rapide : ${allPending.length} carte(s), un clic par carte conforme</button></div><div class="cert-filters">${[['all','Toutes ('+allPending.length+')'],['army','Dans mes listes ('+allPending.filter(item=>isInArmy(item[0])).length+')'],['gaps','Écarts à relire ('+allPending.filter(item=>crosscheckFor(item[0])||conflictFor(item[0])).length+')'],['todo','Jamais certifiées ('+allPending.filter(item=>!item[1].fullCardCertification).length+')'],['ai','À confirmer : Legion HQ et relecture IA ('+allPending.filter(item=>aiFlagged(item[0])).length+')']].map(([id,label])=>`<button type="button" data-cert-filter="${id}" class="${certFilter===id?'on':''}">${label}</button>`).join('')}</div><div class="cert-list">${certFilter==='all'?groupedPending(pending,cardButton):pending.map(item=>cardButton(item)).join('')||'<p class="notice">Toutes les cartes sont contrôlées ou prêtes à envoyer.</p>'}</div></section><section class="cert-status-section ready"><header><h2>Correction prête, à envoyer</h2><b>${ready.length} carte(s)</b></header><div class="cert-list">${ready.map(item=>cardButton(item)).join('')||'<p class="notice">Aucune correction en attente d’envoi.</p>'}</div></section><details class="cert-status-section controlled"><summary><span>Cartes contrôlées et publiées</span><b>${controlled.length} carte(s)</b></summary><div class="cert-list">${controlled.map(item=>cardButton(item,true)).join('')||'<p class="notice">Aucune carte entièrement contrôlée.</p>'}</div></details></section>`;
  }
  // Zoom plein écran de la carte comparée (22/09/2026) : sur tablette l'image reste petite (épinglée en haut
  // pendant que le récapitulatif défile en dessous), un tap l'agrandit pour lire les petits caractères.
  let zoomOverlay=null
  function closeCardZoom(){if(zoomOverlay){zoomOverlay.remove();zoomOverlay=null}}
  function openCardZoom(src,alt){
    closeCardZoom()
    zoomOverlay=document.createElement('div')
    zoomOverlay.className='cert-zoom-overlay'
    zoomOverlay.innerHTML='<img src="'+src+'" alt="'+escapeHtml(alt||'')+'"><small>Touchez l’image pour fermer</small>'
    zoomOverlay.onclick=closeCardZoom
    document.body.appendChild(zoomOverlay)
  }
  function render(){
    stage=1;document.body.classList.add('certification-open');
    root.innerHTML=unknownScreen?(unknownScreen.mode==='choose'?unknownChooser(unknownScreen.card,unknownScreen.label):unknownScreen.mode==='pick'?aliasPicker(unknownScreen.card,unknownScreen.label,unknownScreen.query):newCardForm(unknownScreen.card,unknownScreen.label)):selectedCard?editor(selectedCard):reviewMode?reviewScreen():list();
    root.querySelectorAll('.cert-card-visual img').forEach(img=>img.onclick=()=>openCardZoom(img.currentSrc||img.src,img.alt));
    root.querySelectorAll('#closeCertification').forEach(b=>b.onclick=close);
    root.querySelectorAll('#backCertification,#backToBatch').forEach(b=>b.onclick=()=>{selectedCard=null;render()});
    const next=$('#nextCertification');if(next)next.onclick=()=>{const current=selectedCard;selectedCard=nextPending(current);render()};
    root.querySelectorAll('[data-cert-card]').forEach(b=>b.onclick=()=>{selectedCard=decodeURIComponent(b.dataset.certCard);render()});
    root.querySelectorAll('[data-cert-die]').forEach(b=>b.onclick=()=>{const [index,color]=b.dataset.certDie.split(':'),w=draftFor(selectedCard).weapons[+index];setDie(w,color,Math.max(0,Math.min(20,dieCount(w,color)+Number(b.dataset.delta))));render()});
    root.querySelectorAll('[data-queue-weapon]').forEach(b=>b.onclick=()=>{const w=draftFor(selectedCard).weapons[+b.dataset.queueWeapon];w.queued=!w.queued;save();render()});
    root.querySelectorAll('[data-defense]').forEach(b=>b.onclick=()=>{const d=draftFor(selectedCard);d.defenseColor=b.dataset.defense;d.defenseQueued=false;d.fullCardQueued=false;save();render()});
    root.querySelectorAll('[data-cert-stat]').forEach(input=>input.onchange=()=>{const d=draftFor(selectedCard),key=input.dataset.certStat;d.unitStats[key]=key==='courage'&&!input.value?null:Math.max(1,Number(input.value)||1);d.unitStatsQueued=false;d.fullCardQueued=false;save();render()});
    const noCourage=$('#noCourage');if(noCourage)noCourage.onchange=()=>{const d=draftFor(selectedCard);d.unitStats.courage=noCourage.checked?null:1;d.unitStatsQueued=false;save();render()};
    const suppressionImmune=$('#suppressionImmune');if(suppressionImmune)suppressionImmune.onchange=()=>{const d=draftFor(selectedCard);d.unitStats.suppressionImmune=suppressionImmune.checked;d.unitStatsQueued=false;save();render()};
    const addedModels=$('[data-added-models]');if(addedModels)addedModels.onchange=()=>{const d=draftFor(selectedCard);d.addedModels=Math.max(0,Number(addedModels.value)||0);d.addedModelsQueued=false;save();render()};
    const addedModelWounds=$('[data-added-model-wounds]');if(addedModelWounds)addedModelWounds.onchange=()=>{const d=draftFor(selectedCard);d.addedModelWounds=Math.max(1,Number(addedModelWounds.value)||1);d.addedModelsQueued=false;save();render()};
    const defense=$('#queueDefense');if(defense)defense.onclick=()=>{const d=draftFor(selectedCard);d.defenseQueued=!d.defenseQueued;save();render()};
    const unitStats=$('#queueUnitStats');if(unitStats)unitStats.onclick=()=>{const d=draftFor(selectedCard);d.unitStatsQueued=!d.unitStatsQueued;save();render()};
    const added=$('#queueAddedModels');if(added)added.onclick=()=>{const d=draftFor(selectedCard);d.addedModelsQueued=!d.addedModelsQueued;save();render()};
    root.querySelectorAll('[data-full-field]').forEach(input=>input.onchange=()=>{const d=draftFor(selectedCard);d.fullCard[input.dataset.fullField]=input.value;d.fullCardQueued=false;save();render()});
    const fullKeywords=$('[data-full-keywords]');if(fullKeywords)fullKeywords.onchange=()=>{const d=draftFor(selectedCard);d.fullCard.noKeywords=false;d.fullCard.keywords=fullKeywords.value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const [left,detail]=line.split('|').map(part=>part.trim()),[keywordId,value]=left.split('=').map(part=>part.trim());return{keywordId,...(value?{value:Number(value)}:{}),...(detail?{detail}:{})}});d.fullCardQueued=false;save();render()};
    root.querySelectorAll('[data-full-check]').forEach(input=>input.onchange=()=>{const d=draftFor(selectedCard);d.fullCard.checks[input.dataset.fullCheck]=input.checked;d.fullCardQueued=false;save();render()});
    const queueFull=$('#queueFullCard');if(queueFull)queueFull.onclick=()=>{const d=draftFor(selectedCard),f=d.fullCard;if(!d.fullCardQueued){if((!f.keywords.length&&!f.noKeywords)||pendingRemovals(selectedCard,f).length||weaponGapsBlocking(selectedCard,d)||(f.cardType==='unit'&&!['1','2','3'].includes(String(f.speed))))return;autoAssignWeaponKeywords(selectedCard,d);for(const check of Object.keys(f.checks))f.checks[check]=true;if(crosscheckFor(selectedCard)||conflictFor(selectedCard))f.ack=true}d.fullCardQueued=!d.fullCardQueued;save();render()};
    root.querySelectorAll('[data-kw-readd]').forEach(button=>button.onclick=()=>{const d=draftFor(selectedCard),f=d.fullCard,base=(tags[selectedCard]||[]).find(tag=>tag.keywordId===button.dataset.kwReadd);if(base&&!f.keywords.some(item=>item.keywordId===base.keywordId))f.keywords.push({...base});f.confirmedRemovals=(f.confirmedRemovals||[]).filter(id=>id!==button.dataset.kwReadd);d.fullCardQueued=false;save();render()});
    root.querySelectorAll('[data-kw-confirm-removal]').forEach(button=>button.onclick=()=>{const d=draftFor(selectedCard),f=d.fullCard;f.confirmedRemovals=[...new Set([...(f.confirmedRemovals||[]),button.dataset.kwConfirmRemoval])];d.fullCardQueued=false;save();render()});
    root.querySelectorAll('[data-kw-assign]').forEach(button=>button.onclick=()=>{const card=reviewMode?reviewCurrent:selectedCard,d=draftFor(card),[id,index]=button.dataset.kwAssign.split('|'),w=d.weapons[+index],tag=d.fullCard.keywords.find(item=>item.keywordId===id);if(!w||!tag)return;const has=(w.keywords||[]).some(item=>item.keywordId===id);w.keywords=has?(w.keywords||[]).filter(item=>item.keywordId!==id):[...(w.keywords||[]),{...tag}];w.kwEdited=true;w.queued=false;d.fullCardQueued=false;save();render()});
    root.querySelectorAll('[data-kw-weapon-value]').forEach(input=>input.onchange=()=>{const d=draftFor(selectedCard),[id,index]=input.dataset.kwWeaponValue.split('|'),w=d.weapons[+index],own=(w?.keywords||[]).find(item=>item.keywordId===id);if(!own)return;const value=Math.max(1,Math.min(20,Number(input.value)||1));own.value=value;w.kwEdited=true;d.fullCardQueued=false;save();render()});
    root.querySelectorAll('[data-hq-apply]').forEach(button=>button.onclick=()=>{const card=reviewMode?reviewCurrent:selectedCard,item=hqDiffItemsFiltered(card)[+button.dataset.hqApply];if(!item||!item.apply)return;applyHqItem(card,item.apply);render()});
    root.querySelectorAll('[data-range-preset]').forEach(button=>button.onclick=()=>{const [index,preset]=button.dataset.rangePreset.split(':'),d=draftFor(selectedCard),w=d.weapons[+index];if(!w)return;w.range=preset;w.queued=false;d.fullCardQueued=false;save();render()});
    root.querySelectorAll('[data-weapon-range]').forEach(input=>input.onchange=()=>{const d=draftFor(selectedCard),w=d.weapons[+input.dataset.weaponRange];w.range=input.value.trim();w.queued=false;d.fullCardQueued=false;save();render()});
    root.querySelectorAll('[data-full-nokw]').forEach(input=>input.onchange=()=>{const d=draftFor(selectedCard);d.fullCard.noKeywords=input.checked;d.fullCardQueued=false;save();render()});
    root.querySelectorAll('[data-full-ack]').forEach(input=>input.onchange=()=>{const d=draftFor(selectedCard);d.fullCard.ack=input.checked;d.fullCardQueued=false;save();render()});
    root.querySelectorAll('[data-cert-filter]').forEach(b=>b.onclick=()=>{certFilter=b.dataset.certFilter;try{localStorage.setItem(CERT_FILTER_KEY,JSON.stringify(certFilter))}catch{}render()});
    const confirmConcordant=$('#confirmConcordant');if(confirmConcordant)confirmConcordant.onclick=()=>{
      const cards=profiles().map(([card])=>card).filter(isConcordant);if(!cards.length)return;
      if(!window.confirm('Confirmer '+cards.length+' carte(s) sans les ouvrir une à une ?\n\nChacune est dans vos listes, relue sans écart, sans désaccord avec Legion HQ ni Legion Helper.\n\n'+cards.map(displayName).join(', ')+'\n\nLes vitesses préremplies d’après Legion HQ sont reprises telles quelles.'))return;
      let count=0;for(const card of cards)if(quickConfirm(card))count++;render();window.scrollTo(0,0)
    };
    const startReview=$('#startReview');if(startReview)startReview.onclick=()=>{reviewMode=true;reviewFlaggedOnly=false;reviewCurrent=null;render();window.scrollTo(0,0)};
    const startReviewFlagged=$('#startReviewFlagged');if(startReviewFlagged)startReviewFlagged.onclick=()=>{reviewMode=true;reviewFlaggedOnly=true;reviewCurrent=null;render();window.scrollTo(0,0)};
    const reviewExit=$('#reviewExit');if(reviewExit)reviewExit.onclick=()=>{reviewMode=false;render()};
    const reviewSkip=$('#reviewSkip');if(reviewSkip)reviewSkip.onclick=()=>{const cards=reviewCards(),index=cards.indexOf(reviewCurrent);reviewCurrent=cards[(index+1)%cards.length];render();window.scrollTo(0,0)};
    const reviewEdit=$('#reviewEdit');if(reviewEdit)reviewEdit.onclick=()=>{reviewMode=false;selectedCard=reviewCurrent;render()};
    const reviewSpeed=$('[data-review-speed]');if(reviewSpeed)reviewSpeed.onchange=()=>{const d=draftFor(reviewCurrent);d.fullCard.speed=reviewSpeed.value;d.fullCardQueued=false;save();render()};
    const reviewUse=$('[data-review-use]');if(reviewUse)reviewUse.onchange=()=>{const d=draftFor(reviewCurrent);d.fullCard.cardUse=reviewUse.value;d.fullCardQueued=false;save();render()};
    const reviewOk=$('#reviewOk');if(reviewOk)reviewOk.onclick=()=>{
      const card=reviewCurrent,d=draftFor(card),f=d.fullCard;
      if((!f.keywords.length&&!f.noKeywords)||pendingRemovals(card,f).length||weaponGapsBlocking(card,d)||(f.cardType==='unit'&&!['1','2','3'].includes(String(f.speed))))return;
      autoAssignWeaponKeywords(card,d);
      const cards=reviewCards(),index=cards.indexOf(card);
      quickConfirm(card);
      reviewCurrent=cards[index+1]||null;render();window.scrollTo(0,0)
    };
    root.querySelectorAll('[data-kw-search]').forEach(input=>input.oninput=()=>{kwPicker={scope:input.dataset.kwSearch,query:input.value,pendingId:null,pendingValue:'',pendingDetail:''};render();const again=root.querySelector('[data-kw-search="'+kwPicker.scope+'"]');if(again){again.focus();again.setSelectionRange(again.value.length,again.value.length)}})
    root.querySelectorAll('[data-kw-add]').forEach(b=>b.onclick=()=>{const [scope,id]=b.dataset.kwAdd.split('|'),def=keywordDefFor(id),d=draftFor(selectedCard);if(def&&(def.hasValue||needsDetail(def))){kwPicker={scope,query:kwPicker.query,pendingId:id,pendingValue:'',pendingDetail:''}}else{kwAdd(d,scope,{keywordId:id});kwPicker={scope:null,query:'',pendingId:null,pendingValue:'',pendingDetail:''}}save();render()})
    const kwValue=$('[data-kw-value]');if(kwValue)kwValue.oninput=()=>{kwPicker.pendingValue=kwValue.value}
    const kwDetail=$('[data-kw-detail]');if(kwDetail)kwDetail.oninput=()=>{kwPicker.pendingDetail=kwDetail.value}
    root.querySelectorAll('[data-kw-confirm]').forEach(b=>b.onclick=()=>{const def=keywordDefFor(kwPicker.pendingId),value=Number(kwPicker.pendingValue);if(!def)return;if(def.hasValue&&!(Number.isInteger(value)&&value>=1&&value<=20)){alert('Indiquez la valeur X imprimée (entier de 1 à 20).');return}kwAdd(draftFor(selectedCard),b.dataset.kwConfirm,{keywordId:def.id,...(def.hasValue?{value}:{}),...(kwPicker.pendingDetail.trim()?{detail:kwPicker.pendingDetail.trim()}:{})});kwPicker={scope:null,query:'',pendingId:null,pendingValue:'',pendingDetail:''};save();render()})
    root.querySelectorAll('[data-kw-cancel]').forEach(b=>b.onclick=()=>{kwPicker={scope:null,query:'',pendingId:null,pendingValue:'',pendingDetail:''};render()})
    root.querySelectorAll('[data-kw-remove]').forEach(b=>b.onclick=()=>{const [scope,id]=b.dataset.kwRemove.split('|'),d=draftFor(selectedCard);kwSet(d,scope,kwListFor(d,scope).filter(item=>item.keywordId!==id));save();render()})
    const certifyAndNext=$('#certifyAndNext');if(certifyAndNext)certifyAndNext.onclick=()=>{const d=draftFor(selectedCard),f=d.fullCard;if(!f.keywords.length&&!f.noKeywords)return;if(pendingRemovals(selectedCard,f).length||weaponGapsBlocking(selectedCard,d))return;if(f.cardType==='unit'&&!['1','2','3'].includes(String(f.speed)))return;autoAssignWeaponKeywords(selectedCard,d);for(const check of Object.keys(f.checks))f.checks[check]=true;if(crosscheckFor(selectedCard)||conflictFor(selectedCard))f.ack=true;d.fullCardQueued=true;save();const current=selectedCard;selectedCard=nextPending(current);render();if(!selectedCard)window.scrollTo(0,0)}
    const send=$('#sendBatch');if(send)send.onclick=()=>{exportPart=0;proposeBatch()};
    root.querySelectorAll('[data-unknown-card]').forEach(b=>b.onclick=()=>{unknownScreen={mode:'choose',card:decodeURIComponent(b.dataset.unknownCard),label:decodeURIComponent(b.dataset.unknownLabel)};render()});
    const backUnknown=$('#backUnknown');if(backUnknown)backUnknown.onclick=()=>{unknownScreen=null;render()};
    const backUnknownChoose=$('#backUnknownChoose');if(backUnknownChoose)backUnknownChoose.onclick=()=>{unknownScreen={mode:'choose',card:unknownScreen.card,label:unknownScreen.label};render()};
    root.querySelectorAll('[data-unknown-action]').forEach(b=>b.onclick=()=>{const {card,label}=unknownScreen,action=b.dataset.unknownAction;if(action==='pick')unknownScreen={mode:'pick',card,label,query:''};else if(action==='new')unknownScreen={mode:'new',card,label};else if(action==='clear'){delete aliasDrafts[card];saveAliasDrafts();delete newCardDrafts[card];unknownScreen=null}render()});
    const aliasSearch=$('#aliasSearch');if(aliasSearch)aliasSearch.oninput=()=>{unknownScreen={...unknownScreen,query:aliasSearch.value};render();const input=$('#aliasSearch');if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length)}};
    root.querySelectorAll('[data-alias-pick]').forEach(b=>b.onclick=()=>{aliasDrafts[unknownScreen.card]=decodeURIComponent(b.dataset.aliasPick);saveAliasDrafts();unknownScreen=null;render()});
    const newCardNameFr=$('#newCardNameFr');if(newCardNameFr)newCardNameFr.onchange=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);d.nameFr=newCardNameFr.value;d.ready=false};
    const newCardKind=$('#newCardKind');if(newCardKind)newCardKind.onchange=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);d.kind=newCardKind.value;d.ready=false;render()};
    const newCardNoCourage=$('#newCardNoCourage');if(newCardNoCourage)newCardNoCourage.onchange=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);d.unitStats.courage=newCardNoCourage.checked?null:1;d.ready=false;render()};
    root.querySelectorAll('[data-newcard-stat]').forEach(input=>input.onchange=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label),key=input.dataset.newcardStat;d.unitStats[key]=key==='courage'&&!input.value?null:Math.max(1,Number(input.value)||1);d.ready=false});
    root.querySelectorAll('[data-newcard-defense]').forEach(b=>b.onclick=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);d.defenseColor=b.dataset.newcardDefense;d.ready=false;render()});
    const newCardAddedModels=$('[data-newcard-added-models]');if(newCardAddedModels)newCardAddedModels.onchange=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);d.addedModels=Math.max(0,Number(newCardAddedModels.value)||0);d.ready=false};
    const newCardAddedModelWounds=$('[data-newcard-added-model-wounds]');if(newCardAddedModelWounds)newCardAddedModelWounds.onchange=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);d.addedModelWounds=Math.max(1,Number(newCardAddedModelWounds.value)||1);d.ready=false};
    root.querySelectorAll('[data-newcard-die]').forEach(b=>b.onclick=()=>{const [index,color]=b.dataset.newcardDie.split(':'),d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label),w=d.weapons[+index];setNewCardDie(w,color,Math.max(0,Math.min(20,dieCount(w,color)+Number(b.dataset.delta))));d.ready=false;render()});
    root.querySelectorAll('[data-weapon-field]').forEach(input=>input.onchange=()=>{const [index,field]=input.dataset.weaponField.split(':'),d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);d.weapons[+index][field]=input.value;d.ready=false});
    root.querySelectorAll('[data-remove-weapon]').forEach(b=>b.onclick=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);d.weapons.splice(+b.dataset.removeWeapon,1);d.ready=false;render()});
    const addWeaponRow=$('#addWeaponRow');if(addWeaponRow)addWeaponRow.onclick=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);d.weapons.push({name:'',range:'',dice:[]});d.ready=false;render()};
    const newCardKeywordSearch=$('#newCardKeywordSearch');if(newCardKeywordSearch)newCardKeywordSearch.oninput=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);d.keywordQuery=newCardKeywordSearch.value;render();const input=$('#newCardKeywordSearch');if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length)}};
    root.querySelectorAll('[data-add-keyword]').forEach(b=>b.onclick=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label),id=b.dataset.addKeyword,def=(window.SWL_REFERENCE?.keywords||[]).find(k=>k.id===id);if(def?.hasValue){d.keywordPendingId=id;d.keywordPendingValue=''}else{d.keywords.push({keywordId:id});d.keywordQuery='';d.ready=false}render()});
    const newCardKeywordValue=$('#newCardKeywordValue');if(newCardKeywordValue)newCardKeywordValue.onchange=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);d.keywordPendingValue=newCardKeywordValue.value};
    const confirmKeyword=$('#confirmKeyword');if(confirmKeyword)confirmKeyword.onclick=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);d.keywords.push({keywordId:d.keywordPendingId,value:Number(d.keywordPendingValue)||undefined});d.keywordPendingId=null;d.keywordPendingValue='';d.keywordQuery='';d.ready=false;render()};
    root.querySelectorAll('[data-remove-keyword]').forEach(b=>b.onclick=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);d.keywords=d.keywords.filter(t=>t.keywordId!==b.dataset.removeKeyword);d.ready=false;render()});
    const newCardImage=$('#newCardImage');if(newCardImage)newCardImage.onchange=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label),file=newCardImage.files?.[0];if(!file)return;d.imageFile=file;if(d.imagePreviewUrl)URL.revokeObjectURL(d.imagePreviewUrl);d.imagePreviewUrl=URL.createObjectURL(file);d.ready=false;render()};
    const confirmNewCard=$('#confirmNewCard');if(confirmNewCard)confirmNewCard.onclick=()=>{const d=ensureNewCardDraft(unknownScreen.card,unknownScreen.label);if(!d.nameFr?.trim()){alert('Le nom français est obligatoire.');return}if(!d.imageFile){alert('Une photo de la carte est obligatoire.');return}if(d.kind==='unit'&&!d.defenseColor){alert('Choisissez la couleur du dé de défense.');return}if(d.weapons.some(w=>!w.name?.trim())){alert('Chaque arme doit avoir un nom (ou retirez-la).');return}d.ready=true;unknownScreen=null;render()};
    updateBadge();
  }
  function proposeBatch(){
    const allCards=Object.values(drafts).map(d=>{const complete=d.fullCardQueued;return{card:d.card,weapons:(complete?d.weapons:(d.weapons||[]).filter(w=>w.queued)).map(weaponPayload),...((complete||d.defenseQueued)&&d.defenseColor?{defenseColor:d.defenseColor}:{}),...((complete||d.unitStatsQueued)&&isUnitCard(d.card)?{unitStats:d.unitStats}:{}),...((complete||d.addedModelsQueued)&&!isUnitCard(d.card)?{addedModels:d.addedModels,addedModelWounds:d.addedModelWounds}:{}),...(complete?{fullCardCertification:(({noKeywords,ack,cardUse,...rest})=>({schemaVersion:2,...rest,...(rest.cardType==='upgrade'&&cardUse?{cardUse}:{}),checks:Object.keys(d.fullCard.checks).filter(check=>d.fullCard.checks[check]),keywordsReviewed:true,...(noKeywords&&!d.fullCard.keywords.length?{noKeywordsConfirmed:true}:{}),...(crosscheckFor(d.card)?{crosscheckSignature:crosscheckFor(d.card).signature}:{}),visualPath:imageFor(d.card),verifiedAt:new Date().toISOString()}))(d.fullCard)}:{})}}).filter(d=>d.weapons.length||d.defenseColor||d.unitStats||d.addedModels!==undefined||d.fullCardCertification);
    const CHUNK=40,partCount=Math.max(1,Math.ceil(allCards.length/CHUNK));if(exportPart>=partCount)exportPart=0;const cards=allCards.slice(exportPart*CHUNK,(exportPart+1)*CHUNK);
    const aliasList=exportPart===0?Object.entries(aliasDrafts).map(([from,to])=>({from,to})):[];
    const newCardList=(exportPart===0?Object.entries(newCardDrafts).filter(([,d])=>d.ready):[]).map(([key,d],index)=>({
      key,nameFr:d.nameFr,
      weapons:d.weapons.map(w=>({name:w.name,...(w.range?{range:w.range}:{}),dice:w.dice})),
      ...(d.kind==='unit'&&d.defenseColor?{defenseColor:d.defenseColor}:{}),
      ...(d.kind==='unit'?{unitStats:d.unitStats}:{}),
      ...(d.kind==='upgrade-models'?{addedModels:d.addedModels,addedModelWounds:d.addedModelWounds}:{}),
      ...(d.keywords.length?{keywords:d.keywords}:{}),
      imageMarker:`IMG-${index+1}`,imageFile:d.imageFile,
    }));
    if(!cards.length&&!aliasList.length&&!newCardList.length){alert('Ajoutez au moins une correction, un alias ou une nouvelle carte au lot.');return}
    const payload={version:5,branch,cards,...(aliasList.length?{aliases:aliasList}:{}),...(newCardList.length?{newCards:newCardList.map(({imageFile,...rest})=>rest)}:{})};
    const totalCount=batchCount();
    const lines=[
      ...cards.map(d=>`- **${displayName(d.card)}** : ${d.weapons.length} arme(s)${d.defenseColor?' + défense':''}${d.unitStats?' + caractéristiques':''}${d.addedModels!==undefined?' + figurines ajoutées':''}`),
      ...aliasList.map(a=>`- **${displayName(a.from)}** = alias vers **${displayName(a.to)}**`),
      ...newCardList.map(c=>`- **${c.nameFr}** : nouvelle carte (photo repérée ${c.imageMarker})`),
    ].join('\n');
    const imageInstructions=newCardList.length?`\n\n### Visuels à coller ci-dessous\n\nPour chaque nouvelle carte, laissez son repère sur sa propre ligne puis collez la photo juste après (Ctrl+V / Cmd+V, ou le bouton « Copier la photo » de l'écran précédent) :\n\n${newCardList.map(c=>`${c.imageMarker}\n(collez ici la photo de ${c.nameFr})`).join('\n\n')}`:'';
    const body=`## Lot de certifications visuelles des cartes\n\n${cards.length} carte(s) corrigée(s), ${aliasList.length} alias, ${newCardList.length} nouvelle(s) carte(s) :\n\n${lines}${imageInstructions}\n\nAprès vérification (et collage des photos ci-dessus), commenter exactement \`/appliquer-certification\`.\n\n<!-- SWL_DICE_CERTIFICATION\n${JSON.stringify(payload)}\n-->`;
    const title=`[Certification cartes] Lot de ${cards.length} cartes${partCount>1?` (${exportPart+1}/${partCount})`:''}`;
    const imageButtons=newCardList.map((c,i)=>`<button class="secondary" data-copy-image="${i}">📋 Copier la photo de ${c.nameFr} (${c.imageMarker})</button>`).join('');
    root.innerHTML=`<section class="cert-export"><span class="kicker">LOT PRÊT</span><h1>${totalCount} correction(s) à envoyer${partCount>1?` · lot ${exportPart+1}/${partCount}`:''}</h1>${partCount>1?`<div class="notice"><strong>Envoi en ${partCount} lots de ${CHUNK} cartes au plus</strong><p>GitHub limite la taille d’une issue. Envoyez le lot ${exportPart+1}, commentez <code>/appliquer-certification</code>, attendez son application, puis passez au lot suivant.</p></div><div class="cert-parts"><button class="secondary" id="exportPrev" ${exportPart?'':'disabled'}>← Lot précédent</button><button class="secondary" id="exportNext" ${exportPart<partCount-1?'':'disabled'}>Lot suivant →</button></div>`:''}<div class="notice"><strong>Pourquoi cette étape ?</strong><p>Le lot est trop volumineux pour être placé dans une adresse web. Le premier bouton le copie intégralement, puis ouvre une issue GitHub sans limite de longueur.</p></div><textarea id="batchIssueBody" readonly aria-label="Contenu du lot de certifications"></textarea><button class="primary" id="copyAndOpenIssue">Copier le lot et ouvrir GitHub</button>${imageButtons}<button class="secondary" id="cancelBatchExport">Retour aux cartes</button><p class="cert-help">Dans GitHub : collez le texte, puis pour chaque nouvelle carte copiez sa photo et collez-la juste après le repère correspondant (ex. IMG-1), avant de créer l’issue. Ajoutez ensuite le commentaire <code>/appliquer-certification</code>.</p></section>`;
    const textarea=$('#batchIssueBody');textarea.value=body;
    $('#cancelBatchExport').onclick=render;
    const exportPrev=$('#exportPrev');if(exportPrev)exportPrev.onclick=()=>{exportPart=Math.max(0,exportPart-1);proposeBatch()};
    const exportNext=$('#exportNext');if(exportNext)exportNext.onclick=()=>{exportPart+=1;proposeBatch()};
    $('#copyAndOpenIssue').onclick=()=>{
      textarea.focus();textarea.select();
      try{document.execCommand('copy')}catch{}
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(body).catch(()=>{});
      window.open(`https://github.com/${repository}/issues/new?title=${encodeURIComponent(title)}`,'_blank','noopener');
    };
    newCardList.forEach((c,i)=>{
      const btn=$(`[data-copy-image="${i}"]`);
      if(!btn)return;
      btn.onclick=async()=>{
        if(!c.imageFile){alert('Photo introuvable -- rechargez et refaites la carte '+c.nameFr+'.');return}
        try{
          await navigator.clipboard.write([new ClipboardItem({[c.imageFile.type]:c.imageFile})]);
          btn.textContent=`✓ Photo de ${c.nameFr} copiée -- collez-la sous ${c.imageMarker} dans GitHub`;
        }catch{
          alert(`Copie impossible sur ce navigateur -- dans GitHub, utilisez le trombone pour joindre la photo de ${c.nameFr} juste après la ligne ${c.imageMarker}.`);
        }
      };
    });
  }
  function close(){closeCardZoom();document.body.classList.remove('certification-open');selectedCard=null;if(attackState)resolveScreen();else pick('attacker')}
  function openCard(card){if(!weaponProfiles[card])return;selectedCard=card;render()}
  document.addEventListener('click',event=>{const dice=event.target.closest?.('.weapon-printed-dice');if(dice){event.preventDefault();event.stopPropagation();const key=dice.closest('[data-key]')?.dataset.key||'',separator=key.lastIndexOf(':');if(separator>0)openCard(key.slice(0,separator));return}if(event.target.closest?.('.defense-die-badge')&&defender){event.preventDefault();event.stopPropagation();openCard(norm(defender.unit.name))}},true);
  $('#certification').onclick=()=>{selectedCard=null;render()};updateBadge();
  if(location.hash==='#certification'){selectedCard=null;certFilter=entries.length?'army':'all';render();history.replaceState(null,'',location.pathname+location.search)}
})();
