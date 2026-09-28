const buttons=[...document.querySelectorAll('[data-scene]')];
const scenes=[...document.querySelectorAll('.scene')];
buttons.forEach(button=>button.addEventListener('click',()=>{
  buttons.forEach(item=>item.classList.toggle('active',item===button));
  scenes.forEach(scene=>scene.classList.toggle('active',scene.id===button.dataset.scene));
  const ending=button.dataset.scene==='ending';
  const clear=button.dataset.scene==='clear';
  document.querySelector('.activation-head ol').innerHTML=clear?'<li class="done">Début</li><li class="done">Actions</li><li class="done">Attaque</li><li class="active">Fin</li>':ending?'<li class="done">Début</li><li class="done">Actions</li><li class="done">Attaque</li><li class="active">Fin</li>':'<li class="done">Début</li><li class="active">Actions</li><li>Attaque</li><li>Fin</li>';
}));
