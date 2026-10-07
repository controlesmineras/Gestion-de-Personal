(()=>{
  'use strict';
  let prompt=null,busy=false;
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  function update(){document.querySelectorAll('[data-personal-install]').forEach(button=>{button.hidden=standalone();button.disabled=busy;button.textContent='INSTALAR APP';});}
  function mount(){
    const target=document.querySelector('.header-actions')||document.querySelector('header.top')||document.querySelector('.access-card');
    if(!target||target.querySelector('[data-personal-install]'))return;
    const button=document.createElement('button');button.type='button';button.dataset.personalInstall='';button.className='personal-install-button';button.textContent='INSTALAR APP';button.addEventListener('click',install);target.append(button);update();
  }
  async function install(){
    if(busy)return;
    if(prompt){const offer=prompt;prompt=null;busy=true;update();try{await offer.prompt();await offer.userChoice;}catch(error){console.warn('Instalación de Personal:',error);help();}finally{busy=false;update();}return;}
    help();
  }
  function help(){
    const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    alert(ios?'Para instalar Gestión de Personal: abre esta página en Safari, toca Compartir y luego Agregar a pantalla de inicio.':'Para instalar Gestión de Personal, abre el menú de Chrome o Edge y selecciona Instalar aplicación. Si ya está instalada, ábrela desde la lista de aplicaciones.');
  }
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;update();});
  window.addEventListener('appinstalled',()=>{prompt=null;update();});
  matchMedia('(display-mode: standalone)').addEventListener?.('change',update);
  function start(){mount();new MutationObserver(mount).observe(document.querySelector('#root')||document.body,{childList:true,subtree:true});if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(error=>console.warn('Instalación de Personal:',error));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
