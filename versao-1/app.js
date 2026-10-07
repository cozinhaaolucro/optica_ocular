const whatsapp = message => `https://wa.me/5541997502091?text=${encodeURIComponent(message)}`;
document.querySelectorAll('[data-whatsapp]').forEach(link => { link.href = whatsapp(link.dataset.message || 'Olá, Óptica Ocular! Vim pelo site e gostaria de conversar com a equipe.'); });
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#nav');
function closeMenu(){ toggle.setAttribute('aria-expanded','false'); nav.classList.remove('open'); }
toggle.addEventListener('click',()=> { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); });
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {if(event.key === 'Escape' && nav.classList.contains('open')){closeMenu();toggle.focus();}});
document.querySelectorAll('[data-interest]').forEach(link => link.addEventListener('click',()=> { document.querySelectorAll('[name="interesse"]').forEach(input => input.checked = input.value === link.dataset.interest); }));
document.querySelector('#interest-form').addEventListener('submit',event => {
  event.preventDefault();
  const interest = new FormData(event.currentTarget).get('interesse');
  const url = whatsapp(`Olá, Óptica Ocular! Vim pelo site e tenho interesse em: ${interest}. Podem me ajudar?`);
  window.open(url, '_blank', 'noopener,noreferrer');
  const status = document.querySelector('#form-status');
  status.replaceChildren(document.createTextNode('Se o WhatsApp não abriu, '));
  const fallback = document.createElement('a'); fallback.href = url; fallback.target = '_blank'; fallback.rel = 'noopener'; fallback.textContent = 'clique aqui para continuar.'; fallback.style.textDecoration = 'underline'; status.append(fallback);
});
const lenses = {
  dia: ['01','Seu ritmo. Suas lentes.','Ler, trabalhar, estudar. Conte como é o seu dia e conheça as opções de lentes e tratamentos para os seus óculos de grau.','Uma escolha orientada pela sua receita e pela sua rotina.'],
  multi: ['02','Um olhar para cada distância.','Quer conhecer as opções de multifocais? Converse com nossa equipe sobre sua receita, as atividades do seu dia e as marcas disponíveis.','Escolha e adaptação merecem uma conversa com a equipe.'],
  foto: ['03','Conheça as fotocromáticas.','Tem interesse em lentes fotocromáticas? Trabalhamos com Transitions. Nossa equipe explica as opções disponíveis e ajuda você a avaliar sua escolha.','Consulte características, compatibilidade e disponibilidade.']
};
const tabs = [...document.querySelectorAll('[data-lens]')];
function selectLens(tab){
  tabs.forEach(item => {const selected = item === tab; item.setAttribute('aria-selected',String(selected)); item.tabIndex = selected ? 0 : -1;});
  const panel = document.querySelector('#lens-panel'); panel.setAttribute('aria-labelledby',tab.id);
  const data = lenses[tab.dataset.lens];
  ['.lens-number','h3','p','.lens-note'].forEach((selector,index)=>panel.querySelector(selector).textContent=data[index]);
}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectLens(tab)); tab.addEventListener('keydown',event=> {let next; if(event.key==='ArrowRight')next=(index+1)%tabs.length; if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length; if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();selectLens(tabs[next]);tabs[next].focus();}});});
const privacy = document.querySelector('#privacy');
document.querySelector('#privacy-open').addEventListener('click',()=>privacy.showModal());
privacy.querySelector('.dialog-close').addEventListener('click',()=>privacy.close());
privacy.addEventListener('click',event=>{if(event.target===privacy){const rect=privacy.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)privacy.close();}});
document.querySelector('#year').textContent = new Date().getFullYear();
