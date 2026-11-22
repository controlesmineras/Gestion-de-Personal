import {createDeviceAccess} from './device-access';

export const SESSION_EXPIRED_MESSAGE = 'Tu sesión venció o dejó de ser válida. Vuelve a ingresar con conexión para enviar tus reportes. Los pendientes se conservan en este dispositivo.';
export const SESSION_KEYS = ['gestion-personal-self-session', 'gestion-personal-v1-access'];
const REJECTED = 'personal:session-expired';

// This deadline controls the interface only. The server still verifies signatures and permissions.
export function sessionDeadline(token:string):number|null {
  try {
    const payload=JSON.parse(atob(token.split('.')[0]));
    return typeof payload.exp==='number'&&Number.isFinite(payload.exp)?payload.exp:null;
  } catch {return null;}
}
export function sessionExpired(token:string,now=Date.now()) {
  const deadline=sessionDeadline(token);
  return !token||(deadline!==null&&deadline<=now);
}
export function expireSession(token:string) {
  if(!token)return;
  let matched=false;
  for(const key of SESSION_KEYS)if(localStorage.getItem(key)===token){
    localStorage.removeItem(key);
    sessionStorage.setItem(key+':notice',SESSION_EXPIRED_MESSAGE);
    matched=true;
  }
  // A rejected token must not be reopened from the password cache while offline.
  for(const scope of ['gestion-personal-self','gestion-personal-admin'])createDeviceAccess(scope).revokeToken(token);
  if(matched)window.dispatchEvent(new CustomEvent(REJECTED,{detail:{token}}));
}
export function requireSession(token:string) {
  if(sessionExpired(token)){
    expireSession(token);
    throw Object.assign(new Error(SESSION_EXPIRED_MESSAGE),{status:401,central:true});
  }
}
export function takeSessionNotice(key:string) {
  const notice=sessionStorage.getItem(key+':notice')||'';
  sessionStorage.removeItem(key+':notice');
  return notice;
}
export async function sessionFetch(url:string,options:RequestInit={}) {
  const token=new Headers(options.headers).get('Authorization')?.replace(/^Bearer /,'')||'';
  if(token)requireSession(token);
  const response=await fetch(url,options);
  if(token&&response.status===401){
    expireSession(token);
    throw Object.assign(new Error(SESSION_EXPIRED_MESSAGE),{status:401,central:true});
  }
  return response;
}
export function watchSession(token:string,onExpired:()=>void) {
  let timer:ReturnType<typeof setTimeout>|undefined,done=false;
  function notify(){if(!done){done=true;onExpired();}}
  function check(){
    clearTimeout(timer);
    if(done)return;
    if(sessionExpired(token)){expireSession(token);notify();return;}
    const deadline=sessionDeadline(token);
    if(deadline!==null)timer=setTimeout(check,Math.min(2147483647,Math.max(1,deadline-Date.now())));
  }
  const rejected=(event:Event)=>{if((event as CustomEvent).detail?.token===token)notify();};
  const visible=()=>{if(document.visibilityState==='visible')check();};
  window.addEventListener(REJECTED,rejected);
  for(const name of ['focus','pageshow','online'])window.addEventListener(name,check);
  document.addEventListener('visibilitychange',visible);
  check();
  return ()=>{
    done=true;clearTimeout(timer);window.removeEventListener(REJECTED,rejected);
    for(const name of ['focus','pageshow','online'])window.removeEventListener(name,check);
    document.removeEventListener('visibilitychange',visible);
  };
}
