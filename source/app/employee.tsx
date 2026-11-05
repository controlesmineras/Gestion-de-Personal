'use client';
import {tracksPermissions,controlsEvent,PERMISSION_EXEMPT_MESSAGE} from '@/lib/permission-policy';
import SpecialPermissionFields from './special-permission-fields';
import {AbsenceDates,AbsenceReturn} from './absence-return';
import {createDeviceAccess} from '@/lib/device-access';
const localSelfAccess=createDeviceAccess('gestion-personal-self');
import{useEffect,useState,useRef}from'react';import{ShieldCheck,LogOut,CalendarDays,Utensils}from'lucide-react';import{bogotaDate,addDays,validDate,mealBlocked,type PersonnelEvent}from'@/lib/personnel';
import {MEAL_OPTIONS,MEAL_LOCATIONS,isMealLocation,mealLocationKey,type MealLocation} from '@/lib/meals';
import KitchenPanel,{KitchenPortal} from './kitchen-panel';
import {ActivitySummary} from './activity-panel';
import {ProfileCard} from './personnel-cards';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
const API='https://gestion-de-personal.nelsoncaste86.chatgpt.site/api/self',KEY='gestion-personal-self-session';
function mealSelections(meal?:any){
 const location=(value:unknown):MealLocation|''=>isMealLocation(value)?value:'';
 return {
  breakfast:!!meal?.breakfast,breakfastLocation:location(meal?.breakfastLocation),
  lunch:!!meal?.lunch,lunchLocation:location(meal?.lunchLocation),
  dinner:!!meal?.dinner,dinnerLocation:location(meal?.dinnerLocation),
 };
}
export default function Employee({onAdmin,onAdminLogin,onSignOut,invitation='',initialSession=''}:{onAdmin:()=>void;onAdminLogin:(token:string)=>void;onSignOut:()=>void;invitation?:string;initialSession?:string}){
 const[,clockTick]=useState(0),[profile,setProfile]=useState(false),[token,setToken]=useState(''),[document,setDocument]=useState(''),[code,setCode]=useState(''),[confirm,setConfirm]=useState(''),[activation,setActivation]=useState(''),[info,setInfo]=useState<any>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[meals,setMeals]=useState(mealSelections),[start,setStart]=useState(''),[end,setEnd]=useState(''),[reason,setReason]=useState(''),[authorizedBy,setAuthorizedBy]=useState(''),[reportKind,setReportKind]=useState('Permiso');
 const [tab,setTab]=useState<'alimentos'|'novedades'>('alimentos');
 const [updating,setUpdating]=useState(false);
 const [sessionExpired,setSessionExpired]=useState(false);
 const flushing=useRef(false);
 const logoTaps=useRef({count:0,startedAt:0});

 function tapLoginLogo(){
  const now=performance.now();
  const previous=logoTaps.current;
  const next=previous.count>0&&now-previous.startedAt<=1200
   ? {count:previous.count+1,startedAt:previous.startedAt}
   : {count:1,startedAt:now};
  if(next.count===3){
   logoTaps.current={count:0,startedAt:0};
   onAdmin();
  }else{
   logoTaps.current=next;
  }
 }


 function signOut(){
  localStorage.removeItem(KEY);
  onSignOut();
  setToken('');setInfo(null);setMessage('');setError('');setSessionExpired(false);
 }

 async function updateApp(){
  setError('');
  if(!navigator.onLine){setError('Conéctate a internet para actualizar la app.');return;}
  setUpdating(true);
  const url=new URL(location.href);
  url.searchParams.set('actualizar',Date.now().toString());
  try{
   // The versioned URL also refreshes clients controlled by an older worker.
   const response=await fetch(url,{cache:'reload',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error();
   const registration=await navigator.serviceWorker?.getRegistration();
   if(registration)void registration.update().catch(()=>{});
   location.replace(url.href);
  }catch{
   setError('No se pudo actualizar la app. Revisa la conexión e intenta de nuevo.');
   setUpdating(false);
  }
 }
 useEffect(()=>{if(info?.person&&!tracksPermissions(info.person)&&['Permiso','Permiso especial'].includes(reportKind))setReportKind('Vacaciones');},[info?.person?.role,reportKind]);
 const days=validDate(start)&&validDate(end)&&end>=start?(Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000+1:0,extra=Math.max(0,days-10);
 const queueKey=(document:string)=>'gestion-personal-self-pending:'+document;
 function queued(document:string):any[]{try{return JSON.parse(localStorage.getItem(queueKey(document))||'[]')}catch{return []}}
 function applyPending(value:any){if(!value?.person)return value;const next={...value,events:[...(value.events||[])]};next.date=addDays(bogotaDate(),1);if(value.date!==next.date)next.meal=null;for(const op of queued(value.person.document)){if(op.input.action==='meals'&&op.input.date===next.date)next.meal=op.input;else if(['permission','specialPermission','vacation','incapacity'].includes(op.input.action)){const record={...op.input.record,kind:op.input.action==='vacation'?'Vacaciones':op.input.action==='incapacity'?'Incapacidad':op.input.action==='specialPermission'?'Permiso especial':'Permiso',personId:value.person.id,pending:true};next.events=[...next.events.filter((e:any)=>e.id!==record.id),record];}}next.blocked=mealBlocked(value.person,next.events,next.date);return next;}
 async function request(input?:any,session=token){const r=await fetch(API,{method:input?'POST':'GET',signal:AbortSignal.timeout(15000),cache:'no-store',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session}:{})},...(input?{body:JSON.stringify(input)}:{})});const j:any=await r.json();if(!r.ok)throw Object.assign(Error(j.error||'No se pudo completar el reporte.'),{central:true,status:r.status});return j;}
 async function flush(session:string,document:string){if(flushing.current||!navigator.onLine)return;flushing.current=true;try{while(queued(document).length){const op=queued(document)[0];await request(op.input,session);localStorage.setItem(queueKey(document),JSON.stringify(queued(document).filter(row=>row.id!==op.id)));}}catch(e){setError('Reporte pendiente: '+(e as Error).message);}finally{flushing.current=false;}}
 async function load(session=token){const saved=localSelfAccess.byToken(session);if(saved?.info){const cached=applyPending(saved.info);setInfo(cached);setMeals(mealSelections(cached.meal));}if(!navigator.onLine)return;try{const j=await request(undefined,session);if(!j.person.document&&saved?.document)j.person.document=saved.document;localSelfAccess.refresh(session,{token:session,info:j,document:j.person.document});await flush(session,j.person.document);const updated=await request(undefined,session);if(!updated.person.document)updated.person.document=j.person.document;localSelfAccess.refresh(session,{token:session,info:updated,document:updated.person.document});const next=applyPending(updated);setSessionExpired(false);setInfo(next);setMeals(mealSelections(next.meal));}catch(e){if((e as any).status===401){setSessionExpired(true);}else setError((e as Error).message)}}
 useEffect(()=>{const link=invitation||new URLSearchParams(location.hash.slice(1)).get('activate')||'';if(link){setActivation(link);setToken('');setInfo(null);setCode('');setConfirm('');return;}const saved=initialSession||localStorage.getItem(KEY)||'';if(saved){localStorage.setItem(KEY,saved);setToken(saved);void load(saved);}},[invitation,initialSession]);
 useEffect(()=>{if(!token)return;const online=()=>void load(token);window.addEventListener('online',online);const t=setInterval(()=>{clockTick(n=>n+1);void load(token);},60000);return()=>{clearInterval(t);window.removeEventListener('online',online)}},[token]);
 async function renewSelf(document:string,password:string,previousToken:string){try{const j=await request({action:'login',document,password},'');if(localStorage.getItem(KEY)!==previousToken)return;const snapshot=await request(undefined,j.token);await localSelfAccess.remember(document,password,{token:j.token,info:{...snapshot,person:{...snapshot.person,document}},document});localStorage.setItem(KEY,j.token);setToken(j.token);setInfo(applyPending({...snapshot,person:{...snapshot.person,document}}));void load(j.token);}catch(e){if((e as any).central&&/contraseña|credenciales|desactiv|no tiene acceso|no autorizado|documento.*incorrect/i.test((e as Error).message)&&localStorage.getItem(KEY)===previousToken){localSelfAccess.remove(document);localStorage.removeItem(KEY);setToken('');setInfo(null);setError((e as Error).message);}}}
 async function login(e:React.FormEvent){e.preventDefault();setError('');if(activation&&code!==confirm){setError('Las contraseñas no coinciden.');return;}setBusy(true);try{const password=code,cached=activation?null:await localSelfAccess.verify(document,password);if(cached){localStorage.setItem(KEY,cached.token);setToken(cached.token);const next=applyPending(cached.info);setInfo(next);setMeals(mealSelections(next.meal));setCode('');if(navigator.onLine)void renewSelf(document,password,cached.token);}else{if(!navigator.onLine)throw Error('El primer acceso de esta cuenta en este dispositivo requiere conexión.');const j=await request({action:activation?'activate':'login',document,password,invitation:activation},'');const snapshot=await request(undefined,j.token);await localSelfAccess.remember(document,password,{token:j.token,info:{...snapshot,person:{...snapshot.person,document}},document});localStorage.setItem(KEY,j.token);setToken(j.token);setCode('');setConfirm('');setActivation('');setInfo(applyPending({...snapshot,person:{...snapshot.person,document}}));await load(j.token);}}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function save(input:any){setBusy(true);setError('');setMessage('');try{if(['permission','specialPermission'].includes(input.action)&&!tracksPermissions(info.person))throw Error(PERMISSION_EXEMPT_MESSAGE);const document=info.person.document;if(input.action==='meals'&&(input.date!==addDays(bogotaDate(),1)||mealBlocked(info.person,info.events,input.date)))throw Error('No se pueden reportar alimentos para esta fecha.');let ops=queued(document);if(input.action==='meals')ops=ops.filter(op=>!(op.input.action==='meals'&&op.input.date===input.date));ops.push({id:crypto.randomUUID(),input,createdAt:new Date().toISOString()});localStorage.setItem(queueKey(document),JSON.stringify(ops));setInfo(applyPending(info));setMessage('Reporte guardado en este dispositivo. Pendiente de sincronizar.');if(['permission','specialPermission','vacation','incapacity'].includes(input.action)){setStart('');setEnd('');setReason('');setAuthorizedBy('');}if(navigator.onLine){await flush(token,document);await load(token);if(!queued(document).length)setMessage('Reporte sincronizado.');}}catch(e){setError((e as Error).message);}finally{setBusy(false)}}
 if(!token||!info)return <div className="access-page"><div className="access-card"><button type="button" className="access-logo-button" aria-label="Logo de Gestión de Personal" onClick={tapLoginLogo} disabled={busy}><img src="./favicon.svg?v=20261006-personal" alt="" width={64} height={64}/></button><h1>SEGURIDAD</h1>{activation&&<p>Confirma tu documento y elige tu contraseña.</p>}<form onSubmit={login}><label>Número de documento<input required value={document} onChange={e=>setDocument(e.target.value)} autoComplete="username"/></label><label>{activation?'Elige tu contraseña':'Contraseña'}<input required type="password" minLength={activation?8:undefined} maxLength={128} value={code} onChange={e=>setCode(e.target.value)} autoComplete={activation?'new-password':'current-password'}/></label>{activation&&<label>Confirmar contraseña<input required type="password" minLength={8} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password"/></label>}<button className="primary" disabled={busy}>{busy?'Espera…':activation?'Crear contraseña y entrar':'Ingresar'}</button></form>{error&&<p className="notice" role="alert">{error}</p>}<small>{activation?'El enlace es válido por 24 horas y para un solo uso.':'Si olvidaste tu contraseña, solicita al administrador un nuevo enlace para restablecerla.'}</small></div></div>;
 if(info.person.role==='Preparación de alimentos'&&info.person.accessRole!=='Administrador')return <KitchenPortal token={token} onLogout={signOut}/>;
 return <div className="app"><header className="top"><div className="brand"><img src="./favicon.svg?v=20261006-personal" alt="" width={49} height={49}/><div><h1>GESTIÓN DE PERSONAL</h1><button className="profile-open" onClick={()=>setProfile(true)}>{info.person.name} · {info.person.document}</button></div></div><div className="header-actions"><button className="secondary" disabled={busy||updating} onClick={()=>void updateApp()}>{updating?'Actualizando…':'Actualizar app'}</button>{info.person.accessRole==='Administrador'&&<button className="secondary" onClick={()=>onAdminLogin(token)}>Administración</button>}<button className="secondary" onClick={signOut}><LogOut size={16}/>Salir</button></div></header><main>{sessionExpired&&<div className="notice" role="status"><p>Vuelve a ingresar con tu contraseña para renovar la sincronización.</p><button className="secondary" onClick={signOut}>Volver a ingresar</button></div>}{queued(info.person.document).length>0&&<p className="notice">{queued(info.person.document).length} reportes pendientes de sincronizar.</p>}{error&&<p className="notice" role="alert">{error}</p>}{message&&<p className="success-notice" role="status">{message}</p>}{info.person.role==='Preparación de alimentos'&&<KitchenPanel token={token}/>}<section className="employee-card"><h2>Mis actividades y labores</h2><div className="activities-list">{(info.activities||[]).map((a:any)=><ActivitySummary key={a.id} activity={a} personId={info.person.id}/>)}{!info.activities?.length&&<p>Sin actividades asignadas.</p>}</div></section><nav className="module-tabs employee-module-tabs" aria-label="Reportes laborales"><button className={tab==='alimentos'?'active':''} aria-pressed={tab==='alimentos'} onClick={()=>setTab('alimentos')}>ALIMENTOS</button><button className={tab==='novedades'?'active':''} aria-pressed={tab==='novedades'} onClick={()=>setTab('novedades')}>MIS NOVEDADES</button></nav>{tab==='alimentos'?<section className="employee-card"><h2><Utensils/>Alimentos de mañana</h2><p className="meal-date">{info.date.split('-').reverse().join('/')}</p><p>Plazo: hoy hasta las 11:59 p. m. · Hora de Colombia.</p>{info.blocked?<p className="notice">No puedes consumir alimentos durante permisos, vacaciones o incapacidades. El reporte está bloqueado para esta fecha.</p>:<form onSubmit={e=>{e.preventDefault();void save({action:'meals',date:info.date,...meals})}}>{MEAL_OPTIONS.map(([key,label])=>{
 const locationKey=mealLocationKey(key);
 return <div className="meal-choice" key={key}>
  <label className="meal-check"><input type="checkbox" checked={meals[key]} onChange={e=>{
   const checked=e.target.checked;
   setMeals(current=>({...current,[key]:checked,[locationKey]:checked?current[locationKey]:''}));
  }}/>{label}</label>
  {meals[key]&&<fieldset className="meal-locations">
   <legend>Destino · {label}</legend>
   <div>{MEAL_LOCATIONS.map(place=><label key={place}>
    <input type="radio" name={locationKey} value={place} required checked={meals[locationKey]===place}
     onChange={()=>setMeals(current=>({...current,[locationKey]:place}))}/>
    {place}
   </label>)}</div>
  </fieldset>}
 </div>;
})}<button className="primary" disabled={busy}>{busy?'Guardando…':'Guardar alimentos'}</button></form>}</section>:<><section className="employee-card"><h2><CalendarDays/>Programar / registrar novedad</h2>{!tracksPermissions(info.person)&&<p>{PERMISSION_EXEMPT_MESSAGE}</p>}<form onSubmit={e=>{e.preventDefault();void save({action:reportKind==='Vacaciones'?'vacation':reportKind==='Incapacidad'?'incapacity':reportKind==='Permiso especial'?'specialPermission':'permission',record:{id:crypto.randomUUID(),start:start+'T00:00:00-05:00',end:addDays(end,1)+'T00:00:00-05:00',place:reportKind==='Permiso especial'||reportKind==='Incapacidad'?reason:reportKind,authorizedBy:reportKind==='Permiso'||reportKind==='Permiso especial'?authorizedBy:'',notes:''}})}}><fieldset className="meal-locations">
 <legend>Tipo de reporte</legend>
 <div>{(['Permiso','Permiso especial','Vacaciones','Incapacidad'] as const).map(kind=><label key={kind}>
  <input type="radio" name="reportKind" value={kind} checked={reportKind===kind}
   disabled={['Permiso','Permiso especial'].includes(kind)&&!tracksPermissions(info.person)} onChange={()=>{setReportKind(kind);setReason('');setAuthorizedBy('')}}/>
  {kind}
 </label>)}</div>
</fieldset><p>Puedes elegir una fecha futura. La ausencia afecta la disponibilidad solo durante las fechas registradas.</p><label>Fecha de inicio<span className="employee-date-field"><input type="date" required value={start} onChange={e=>{setStart(e.target.value);if(end&&end<e.target.value)setEnd('')}}/>{!start&&<span aria-hidden="true">dd/mm/aaaa</span>}</span></label><label>Fecha final (incluida)<span className="employee-date-field"><input type="date" required min={start||undefined} value={end} onChange={e=>setEnd(e.target.value)}/>{!end&&<span aria-hidden="true">dd/mm/aaaa</span>}</span></label>{reportKind==='Permiso especial'?<SpecialPermissionFields reason={reason} authorizedBy={authorizedBy} onReason={setReason} onAuthorizer={setAuthorizedBy}/>:reportKind==='Incapacidad'&&<label>DETALLE<input required maxLength={150} placeholder="Ej.: esguince de tobillo" value={reason} onChange={e=>setReason(e.target.value)}/></label>}{days>0&&<AbsenceDates end={addDays(end,1)+'T00:00:00-05:00'} kind={reportKind}/>}{days>0&&<p>{days} días{reportKind==='Permiso'?' de permiso · 10 días autorizados':reportKind==='Vacaciones'?' de vacaciones':reportKind==='Permiso especial'?' de permiso especial':' de incapacidad'}{reportKind==='Permiso'&&extra>0?' · '+extra+' días adicionales':''}</p>}{reportKind==='Permiso'&&<label>Autorizado por<input required={extra>0} maxLength={150} value={authorizedBy} onChange={e=>setAuthorizedBy(e.target.value)}/></label>}<button className="primary" disabled={busy||days<=0}>{busy?'Guardando…':start>bogotaDate()?'Guardar novedad programada':'Registrar novedad'}</button></form></section><section className="employee-card"><h2>Mis novedades</h2><div className="history">{info.events.filter((e:PersonnelEvent)=>e.kind!=='Servicio').map((e:PersonnelEvent)=><article key={e.id}><b>{e.kind}{e.place&&e.place!==e.kind?' · '+e.place:''}</b><span>Desde {bogotaDate(new Date(e.start))} hasta {bogotaDate(new Date(Date.parse(e.end)-1))}</span>{controlsEvent(info.person,e)?<AbsenceReturn event={e}/>:<small>Registro histórico · sin control de permisos por cargo.</small>}{controlsEvent(info.person,e)&&e.authorizedBy&&<small>{e.extraDays?e.extraDays+' días adicionales · ':''}Autorizado por {e.authorizedBy}</small>}</article>)}{!info.events.some((e:PersonnelEvent)=>e.kind!=='Servicio')&&<p>Sin novedades registradas.</p>}</div></section></>}</main><Dialog open={profile} onOpenChange={setProfile}><DialogContent className="record-dialog"><DialogTitle>Mi ficha</DialogTitle><DialogDescription>{info.person.name}</DialogDescription><ProfileCard accessToken={token} person={info.person} data={{people:[info.person],events:info.events,trainingRequirements:info.trainingRequirements,workSettings:info.workSettings,activities:info.activities}}/></DialogContent></Dialog></div>;
}
