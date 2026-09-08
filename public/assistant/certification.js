(()=>{
  const repository='archipad/SWL',branch='claude/star-wars-legion-app-49rc3z',storageKey='swl-dice-certification-batch-v1';
  let selectedCard=null,drafts={};
  try{drafts=JSON.parse(localStorage.getItem(storageKey)||'{}')||{}}catch{drafts={}}
  const profiles=()=>Object.entries(weaponProfiles).filter(([,p])=>(p.weapons||[]).length||p.defenseColor);
  const pendingFor=profile=>(profile.weapons||[]).filter(w=>!w.verifiedAgainstCard).length+(profile.defenseColor&&!profile.defenseVerifiedAgainstCard?1:0);
  const pendingTotal=()=>profiles().reduce((n,[,p])=>n+pendingFor(p),0);
  const batchCount=()=>Object.values(drafts).reduce((n,d)=>n+(d.weapons||[]).filter(w=>w.queued).length+(d.defenseQueued?1:0),0);
  const save=()=>localStorage.setItem(storageKey,JSON.stringify(drafts));
  function updateBadge(){const button=$('#certification'),count=$('#certificationCount'),pending=pendingTotal();if(!button||!count)return;button.classList.toggle('all-certified',pending===0);button.firstChild.textContent=pending?'⚠ Certification des dés ':'✓ Dés certifiés ';count.textContent=pending?String(pending):'✓'}
  function draftFor(card){
    const p=weaponProfiles[card],saved=drafts[card];
    if(!saved||!Array.isArray(saved.weapons))drafts[card]={card,weapons:(p.weapons||[]).map((w,index)=>({index,name:w.name,dice:w.dice==='variable'?'variable':w.dice.map(d=>({...d})),range:w.range,verified:!!w.verifiedAgainstCard,queued:false})),defenseColor:p.defenseColor||null,defenseVerified:!!p.defenseVerifiedAgainstCard,defenseQueued:false};
    return drafts[card];
  }
  const dieCount=(weapon,color)=>weapon.dice==='variable'?0:(weapon.dice.find(d=>d.color===color)?.count||0);
  function setDie(weapon,color,value){if(weapon.dice==='variable')weapon.dice=[];weapon.dice=weapon.dice.filter(d=>d.color!==color);if(value>0)weapon.dice.push({color,count:value});weapon.dice.sort((a,b)=>['rouge','noir','blanc'].indexOf(a.color)-['rouge','noir','blanc'].indexOf(b.color));weapon.queued=false;save()}
  function editor(card){
    const p=weaponProfiles[card],d=draftFor(card),count=batchCount();
    return `<section class="cert-detail"><header><div><small>CARTE À CONTRÔLER</small><h2>${displayName(card)}</h2></div><button class="secondary" id="backCertification">Retour à la liste · lot ${count}</button></header><div class="cert-card-layout"><div class="cert-card-visual"><img src="${imageFor(card)}" alt="Carte ${displayName(card)}"><small>Agrandissez visuellement la carte avant de certifier.</small></div><div class="cert-fields">${d.weapons.map(w=>`<article class="cert-weapon ${w.queued?'certified':''}"><header><strong>${w.name}</strong><span>${w.queued?'✓ AJOUTÉ AU LOT':w.verified?'✓ DÉJÀ CERTIFIÉ':'⚠ À VÉRIFIER'}</span></header><small>Portée ${w.range}</small>${w.dice==='variable'?'<p>Réserve variable : contrôlez la règle imprimée.</p>':`<div class="cert-dice-row">${['rouge','noir','blanc'].map(color=>`<div class="cert-die-control"><span class="dice-badge dice-badge-${color}"><span>${dieCount(w,color)}</span></span><div><button data-cert-die="${w.index}:${color}" data-delta="-1">−</button><b>${dieCount(w,color)}</b><button data-cert-die="${w.index}:${color}" data-delta="1">+</button></div></div>`).join('')}</div>`}<button class="certify-line" data-queue-weapon="${w.index}">${w.queued?'Retirer du lot':'Ajouter cette arme au lot'}</button></article>`).join('')}${p.defenseColor?`<article class="cert-defense ${d.defenseQueued?'certified':''}"><header><strong>Dés de défense</strong><span>${d.defenseQueued?'✓ AJOUTÉ AU LOT':d.defenseVerified?'✓ DÉJÀ CERTIFIÉ':'⚠ À VÉRIFIER'}</span></header><div class="defense-choice"><button data-defense="blanc" class="${d.defenseColor==='blanc'?'on':''}">□ BLANC</button><button data-defense="rouge" class="${d.defenseColor==='rouge'?'on':''}">■ ROUGE</button></div><button class="certify-line" id="queueDefense">${d.defenseQueued?'Retirer du lot':'Ajouter la défense au lot'}</button></article>`:''}<button class="secondary" id="backToBatch">Continuer la vérification · ${batchCount()} dans le lot</button><p class="cert-help">Les choix sont conservés sur cet appareil jusqu’à l’envoi unique du lot.</p></div></div></section>`;
  }
  function list(){
    const all=profiles(),pending=all.filter(([,p])=>pendingFor(p)>0),controlled=all.filter(([,p])=>pendingFor(p)===0),count=batchCount();
    const cardButton=([card,p],done=false)=>{const queued=(drafts[card]?.weapons||[]).filter(w=>w.queued).length+(drafts[card]?.defenseQueued?1:0);return `<button data-cert-card="${card}" class="${done?'controlled-card':''}"><img src="${imageFor(card)}" alt=""><span><strong>${displayName(card)}</strong><small>${done?'✓ Carte contrôlée':`${pendingFor(p)} contrôle(s) restant(s)${queued?` · ${queued} dans le lot`:''}`}</small></span><b>${done?'✓':'›'}</b></button>`};
    return `<section class="cert-page"><header><div><span class="kicker">CONTRÔLE CENTRALISÉ</span><h1>Certification des dés</h1><p>${pendingTotal()} élément(s) restent à comparer aux cartes.</p></div><button class="secondary" id="closeCertification">Retour à l’assistant</button></header><div class="cert-batch-bar"><strong>${count} correction(s) dans le lot</strong><span>Vous pouvez contrôler toutes les cartes avant l’envoi.</span><button class="primary" id="sendBatch" ${count?'':'disabled'}>Envoyer toutes les corrections (${count})</button></div><section class="cert-status-section todo"><header><h2>À contrôler</h2><b>${pending.length} carte(s)</b></header><div class="cert-list">${pending.map(item=>cardButton(item)).join('')||'<p class="notice">Toutes les cartes sont contrôlées.</p>'}</div></section><details class="cert-status-section controlled"><summary><span>Cartes contrôlées</span><b>${controlled.length} carte(s)</b></summary><div class="cert-list">${controlled.map(item=>cardButton(item,true)).join('')||'<p class="notice">Aucune carte entièrement contrôlée.</p>'}</div></details></section>`;
  }
  function render(){
    stage=1;document.body.classList.add('certification-open');root.innerHTML=selectedCard?editor(selectedCard):list();
    root.querySelectorAll('#closeCertification').forEach(b=>b.onclick=close);
    root.querySelectorAll('#backCertification,#backToBatch').forEach(b=>b.onclick=()=>{selectedCard=null;render()});
    root.querySelectorAll('[data-cert-card]').forEach(b=>b.onclick=()=>{selectedCard=b.dataset.certCard;render()});
    root.querySelectorAll('[data-cert-die]').forEach(b=>b.onclick=()=>{const [index,color]=b.dataset.certDie.split(':'),w=draftFor(selectedCard).weapons[+index];setDie(w,color,Math.max(0,Math.min(20,dieCount(w,color)+Number(b.dataset.delta))));render()});
    root.querySelectorAll('[data-queue-weapon]').forEach(b=>b.onclick=()=>{const w=draftFor(selectedCard).weapons[+b.dataset.queueWeapon];w.queued=!w.queued;save();render()});
    root.querySelectorAll('[data-defense]').forEach(b=>b.onclick=()=>{const d=draftFor(selectedCard);d.defenseColor=b.dataset.defense;d.defenseQueued=false;save();render()});
    const defense=$('#queueDefense');if(defense)defense.onclick=()=>{const d=draftFor(selectedCard);d.defenseQueued=!d.defenseQueued;save();render()};
    const send=$('#sendBatch');if(send)send.onclick=proposeBatch;
    updateBadge();
  }
  function proposeBatch(){
    const cards=Object.values(drafts).map(d=>({card:d.card,weapons:(d.weapons||[]).filter(w=>w.queued).map(({index,name,dice,range})=>({index,name,dice,range})),...(d.defenseQueued?{defenseColor:d.defenseColor}:{})})).filter(d=>d.weapons.length||d.defenseColor);
    if(!cards.length){alert('Ajoutez au moins une correction au lot.');return}
    const payload={version:2,branch,cards};
    const lines=cards.map(d=>`- **${displayName(d.card)}** : ${d.weapons.length} arme(s)${d.defenseColor?' + défense':''}`).join('\n');
    const body=`## Lot de certifications visuelles des dés\n\n${cards.length} carte(s), ${batchCount()} correction(s) :\n\n${lines}\n\nAprès vérification, commenter exactement \`/appliquer-certification\`.\n\n<!-- SWL_DICE_CERTIFICATION\n${JSON.stringify(payload,null,2)}\n-->`;
    const title=`[Certification dés] Lot de ${batchCount()} corrections`;
    root.innerHTML=`<section class="cert-export"><span class="kicker">LOT PRÊT</span><h1>${batchCount()} correction(s) à envoyer</h1><div class="notice"><strong>Pourquoi cette étape ?</strong><p>Le lot est trop volumineux pour être placé dans une adresse web. Le bouton ci-dessous le copie intégralement, puis ouvre une issue GitHub sans limite de longueur.</p></div><textarea id="batchIssueBody" readonly aria-label="Contenu du lot de certifications"></textarea><button class="primary" id="copyAndOpenIssue">Copier le lot et ouvrir GitHub</button><button class="secondary" id="cancelBatchExport">Retour aux cartes</button><p class="cert-help">Dans GitHub, touchez le champ de description, collez le contenu puis créez l’issue. Ajoutez ensuite le commentaire <code>/appliquer-certification</code>.</p></section>`;
    const textarea=$('#batchIssueBody');textarea.value=body;
    $('#cancelBatchExport').onclick=render;
    $('#copyAndOpenIssue').onclick=()=>{
      textarea.focus();textarea.select();
      try{document.execCommand('copy')}catch{}
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(body).catch(()=>{});
      window.open(`https://github.com/${repository}/issues/new?title=${encodeURIComponent(title)}`,'_blank','noopener');
    };
  }
  function close(){document.body.classList.remove('certification-open');selectedCard=null;if(attackState)resolveScreen();else pick('attacker')}
  function openCard(card){if(!weaponProfiles[card])return;selectedCard=card;render()}
  document.addEventListener('click',event=>{const dice=event.target.closest?.('.weapon-printed-dice');if(dice){event.preventDefault();event.stopPropagation();const key=dice.closest('[data-key]')?.dataset.key||'',separator=key.lastIndexOf(':');if(separator>0)openCard(key.slice(0,separator));return}if(event.target.closest?.('.defense-die-badge')&&defender){event.preventDefault();event.stopPropagation();openCard(norm(defender.unit.name))}},true);
  $('#certification').onclick=()=>{selectedCard=null;render()};updateBadge();
})();
