const BEFORE_UPDATE='personal:before-update';
let checking:Promise<boolean>|null=null,lastCheck=0,reloading=false;
export function preventUpdateWhile(unsafe:()=>boolean) {
  const guard=(event:Event)=>{if(unsafe())event.preventDefault();};
  window.addEventListener(BEFORE_UPDATE,guard);
  return ()=>window.removeEventListener(BEFORE_UPDATE,guard);
}
export async function checkAppUpdate(force=false):Promise<boolean> {
  if(checking)return checking;
  if(!navigator.onLine||reloading||(!force&&Date.now()-lastCheck<30000))return false;
  const entry=document.querySelector<HTMLScriptElement>('script[type="module"][src]');
  // Only the separately built GitHub Pages interface has a hashed entry point.
  if(!entry?.src.includes('/assets/'))return false;
  lastCheck=Date.now();
  checking=(async()=>{
    try {
      const page=new URL('./index.html',location.href);
      page.searchParams.set('version',Date.now().toString());
      const response=await fetch(page,{cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!response.ok)return false;
      const html=new DOMParser().parseFromString(await response.text(),'text/html');
      const script=html.querySelector<HTMLScriptElement>('script[type="module"][src]');
      const next=script?.getAttribute('src');
      if(!next||new URL(next,page).href===entry.src)return false;
      const urls=[...html.querySelectorAll('script[type="module"][src],link[rel="stylesheet"][href]')]
        .map(node=>new URL(node.getAttribute('src')||node.getAttribute('href')!,page));
      if(urls.some(url=>url.origin!==location.origin))return false;
      // Do not replace the working app with an HTML shell whose assets are not published yet.
      await Promise.all(urls.map(async url=>{
        const asset=await fetch(url,{cache:'reload',signal:AbortSignal.timeout(10000)});
        if(!asset.ok)throw Error('Actualización incompleta');
        await asset.arrayBuffer();
      }));
      if(!window.dispatchEvent(new Event(BEFORE_UPDATE,{cancelable:true})))return false;
      const target=new URL(location.href);
      target.searchParams.set('actualizar',Date.now().toString());
      reloading=true;
      location.replace(target.href);
      return true;
    }catch{return false;}
  })();
  try{return await checking;}finally{checking=null;}
}
export function startAppUpdates() {
  const check=()=>{
    if(document.visibilityState==='hidden'||!navigator.onLine)return;
    void checkAppUpdate();
    void navigator.serviceWorker?.getRegistration().then(reg=>reg?.update()).catch(()=>{});
  };
  const visible=()=>{if(document.visibilityState==='visible')check();};
  check();
  for(const name of ['focus','pageshow','online'])window.addEventListener(name,check);
  document.addEventListener('visibilitychange',visible);
  const timer=setInterval(check,60000);
  return ()=>{
    clearInterval(timer);
    for(const name of ['focus','pageshow','online'])window.removeEventListener(name,check);
    document.removeEventListener('visibilitychange',visible);
  };
}
