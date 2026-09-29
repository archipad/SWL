const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800)}
function showView(id){$$('.view').forEach(view=>view.classList.toggle('active',view.id===id));$$('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'})}
$$('[data-view]').forEach(button=>button.onclick=()=>showView(button.dataset.view));
$$('[data-demo]').forEach(button=>button.onclick=()=>showView(button.dataset.demo));

const tokenState={aim:0,dodge:1,surge:0,suppression:0};
$$('[data-token]').forEach(button=>button.onclick=()=>{const key=button.dataset.token;tokenState[key]=(tokenState[key]+1)%4;$(`#${key}Value`).textContent=tokenState[key];toast(`${button.querySelector('small').textContent} : ${tokenState[key]}`)});
$('#inspectExpected').onclick=()=>showView('physical');
$('#dockAttack').onclick=()=>toast('La résolution d’attaque s’ouvrirait sans perdre l’état de la fiche.');
$('#dockFinish').onclick=()=>toast('Le contrôle de fin d’activation s’ouvrirait avant de quitter la fiche.');

const units={rebel:[
  {id:'luke',name:'LUKE SKYWALKER',rank:'COMMANDANT',img:'../codex/portraits/catalog-luke-heros-de-la-rebellion.webp',hp:'6/6 PV',supp:'0 Suppression',ready:true},
  {id:'wookies',name:'GUERRIERS WOOKIES',rank:'FORCES SPÉCIALES',img:'../codex/portraits/catalog-guerriers-wookies-combattants.webp',hp:'3/4 figurines',supp:'1 Suppression',ready:true},
  {id:'troopers',name:'SOLDATS REBELLES',rank:'TROUPIERS',img:'../codex/portraits/rebel-troopers-hd.webp',hp:'6/6 figurines',supp:'0 Suppression',ready:true},
  {id:'tauntaun',name:'TAUNTAUNS',rank:'SOUTIEN',img:'../codex/portraits/tauntaun-riders.webp',hp:'2/2 figurines',supp:'0 Suppression',ready:false}
],imperial:[
  {id:'vader',name:'DARK VADOR',rank:'COMMANDANT',img:'../codex/portraits/darth-vader-maquette.webp',hp:'8/8 PV',supp:'0 Suppression',ready:true},
  {id:'storm',name:'STORMTROOPERS',rank:'TROUPIERS',img:'../codex/portraits/stormtroopers-maquette.webp',hp:'5/6 figurines',supp:'1 Suppression',ready:true},
  {id:'scout',name:'SCOUT TROOPERS',rank:'FORCES SPÉCIALES',img:'../codex/portraits/scout-troopers-hd.webp',hp:'4/4 figurines',supp:'0 Suppression',ready:true},
  {id:'speeder',name:'SPEEDERBIKES 74-Z',rank:'SOUTIEN',img:'../codex/portraits/speeder-bikes-maquette.webp',hp:'2/2 figurines',supp:'0 Suppression',ready:false}
]};
function row(unit,faction){const accent=faction==='rebel'?'#4bcfff':'#ff5861';return `<article class="unit-row ${unit.id==='luke'?'selected':''} ${unit.ready?'':'played'}" data-unit="${unit.id}" style="--unit-accent:${accent}"><img src="${unit.img}" alt=""><div><small>${unit.rank}</small><strong>${unit.name}</strong><span>${unit.ready?'PRÊTE À JOUER':'ACTIVÉE'}</span></div><div class="hp"><b>${unit.hp.split(' ')[0]}</b><span>${unit.hp.substring(unit.hp.indexOf(' ')+1)}</span></div><div class="supp">${unit.supp}</div><button>${unit.ready?'OUVRIR':'VOIR'}</button></article>`}
$('#rebelRows').innerHTML=units.rebel.map(unit=>row(unit,'rebel')).join('');
$('#imperialRows').innerHTML=units.imperial.map(unit=>row(unit,'imperial')).join('');
$$('[data-unit]').forEach(element=>element.onclick=()=>{const unit=[...units.rebel,...units.imperial].find(item=>item.id===element.dataset.unit);$$('[data-unit]').forEach(row=>row.classList.remove('selected'));element.classList.add('selected');$('#tableSelection').innerHTML=`<small>UNITÉ SÉLECTIONNÉE</small><strong>${unit.name}</strong><span>${unit.hp} · ${unit.supp} · ${unit.ready?'prête à jouer':'déjà activée'}</span>`});

$$('[data-physical-answer]').forEach(button=>button.onclick=()=>{const value=button.dataset.physicalAnswer,result=$('#physicalResult'),content={yes:['✓','CONDITION CONFIRMÉE','Les Wookies peuvent être sélectionnés pour Inspiration 2.'],no:['×','CIBLE NON ÉLIGIBLE','Les Wookies sont masqués pour cette résolution uniquement.'],unknown:['?','MESURE À EFFECTUER','Mesurez la portée 2 depuis Luke, puis confirmez Oui ou Non.']}[value];result.className=`physical-result ${value}`;result.innerHTML=`<span>${content[0]}</span><p><b>${content[1]}</b> ${content[2]}</p>`});
