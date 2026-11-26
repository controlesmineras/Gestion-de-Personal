'use client';
import {tracksPermissions,controlsEvent,PERMISSION_EXEMPT_MESSAGE} from '@/lib/permission-policy';
import {MealReceiptDialog,recordMealReceipt} from './meal-receipt-dialog';
import {syncPersonalReports} from '@/lib/personal-report-sync';
import {SESSION_EXPIRED_MESSAGE,sessionExpired,expireSession,requireSession,sessionFetch,watchSession,takeSessionNotice} from '@/lib/session-lifecycle';
import {checkAppUpdate,preventUpdateWhile} from '@/lib/app-update';
import DigitDate from './digit-date';
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
 const [continuedReport,setContinuedReport]=useState('');
 const savingRecord=useRef(false);
 const mealDraftDate=useRef('');
 const editingMeals=useRef(false);
 const reportKey=info?.person?.id&&info?.date?info.person.id+':'+info.date:'';
 const restoredDraft=useRef('');
 const draftKey=info?.person?.document?'gestion-personal-self-draft:'+info.person.document:'';
 useEffect(()=>{
  if(mealDraftDate.current!==reportKey){
   mealDraftDate.current=reportKey;
   editingMeals.current=false;
   setContinuedReport('');
  }
  if(!editingMeals.current)setMeals(mealSelections(info?.meal));
 },[reportKey,info?.meal]);
 // Drafts are separate from submitted reports and are restored only for their owner.
 useEffect(()=>{
  if(!draftKey||restoredDraft.current===reportKey)return;
  restoredDraft.current=reportKey;
  try{
   const draft=JSON.parse(localStorage.getItem(draftKey)||'null');
   if(!draft)return;
   if(draft.date===info.date&&draft.meals){editingMeals.current=true;setMeals(draft.meals);setContinuedReport(reportKey);}
   setStart(draft.start||'');setEnd(draft.end||'');setReason(draft.reason||'');setAuthorizedBy(draft.authorizedBy||'');
   if(draft.reportKind)setReportKind(draft.reportKind);
  }catch{}
 },[draftKey,reportKey]);
 useEffect(()=>{
  if(!draftKey||restoredDraft.current!==reportKey)return;
  const draft={date:info.date,meals:editingMeals.current?meals:null,start,end,reason,authorizedBy,reportKind};
  // Store on edits below; initial server data must not overwrite a saved draft before restoration.
  if(editingMeals.current||start||end||reason||authorizedBy)localStorage.setItem(draftKey,JSON.stringify(draft));
 },[meals,start,end,reason,authorizedBy,reportKind,draftKey,reportKey]);
 const syncing=useRef(new Map<string,Promise<Set<string>>>());
 const [retrying,setRetrying]=useState(false);
 const logoTaps=useRef({count:0,startedAt:0});

 function closeExpired(){
  setToken('');setInfo(null);setProfile(false);setCode('');setConfirm('');
  setMessage('');setError(takeSessionNotice(KEY)||SESSION_EXPIRED_MESSAGE);
  setStart('');setEnd('');setReason('');setAuthorizedBy('');restoredDraft.current='';
 }
 useEffect(()=>token?watchSession(token,closeExpired):undefined,[token]);
 useEffect(()=>preventUpdateWhile(()=>busy||retrying||updating||syncing.current.size>0||editingMeals.current||!!code||!!start||!!end||!!reason),[busy,retrying,updating,code,start,end,reason]);
 useEffect(()=>{if(token&&!busy)void checkAppUpdate(true);},[token,busy]);


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
  setToken('');setInfo(null);setMessage('');setError('');
  setStart('');setEnd('');setReason('');setAuthorizedBy('');restoredDraft.current='';
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
 async function request(input?:any,session=token){const r=await sessionFetch(API,{method:input?'POST':'GET',signal:AbortSignal.timeout(15000),cache:'no-store',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session}:{})},...(input?{body:JSON.stringify(input)}:{})});const j:any=await r.json();if(!r.ok)throw Object.assign(Error(j.error||'No se pudo completar el reporte.'),{central:true,status:r.status});return j;}
 async function load(session=token,force=false):Promise<Set<string>>{
  const existing=syncing.current.get(session);
  if(existing)return existing;
  const active=()=>!!session&&localStorage.getItem(KEY)===session;
  async function run(){
   const confirmed=new Set<string>();
   if(!active())return confirmed;
   if(sessionExpired(session)){expireSession(session);closeExpired();return confirmed;}
   const saved=localSelfAccess.byToken(session);
   if(saved?.info)setInfo(applyPending(saved.info));
   if(!navigator.onLine){if(force)setError('Sin conexión. Los reportes siguen en este dispositivo.');return confirmed;}
   try{
    const snapshot=await request(undefined,session);
    if(!active())return confirmed;
    const owner=snapshot.person.document||saved?.document;
    const present=(value:any)=>{
     if(!active())return;
     if(!value.person.document&&owner)value.person.document=owner;
     localSelfAccess.refresh(session,{token:session,info:value,document:owner});
     setInfo(applyPending(value));
    };
    setError('');
    present(snapshot);
    if(!owner||!queued(owner).some(item=>!item.closedForDate))return confirmed;
    const synchronize=()=>syncPersonalReports({
     serverDate:snapshot.date,active,read:()=>queued(owner),
     write:items=>localStorage.setItem(queueKey(owner),JSON.stringify(items)),
     send:async input=>{
      const reply=await request(input,session);
      if(input.action==='meals'&&reply?.ok!==true)throw Error('El servidor aún no confirmó el reporte de alimentos.');
     },
     onConfirmed:report=>{
      confirmed.add(report.id);
      if(report.input.action==='meals'&&!queued(owner).some(item=>item.input.action==='meals'&&item.input.date===report.input.date)){
       recordMealReceipt(owner,report.id);
      }
     },
    });
    const result=navigator.locks?.request
     ?await navigator.locks.request(queueKey(owner),synchronize):await synchronize();
    if(!active())return confirmed;
    if(result.problems.length)setError(result.problems.join(' · '));
    if(confirmed.size)present(await request(undefined,session));
    else present(snapshot);
   }catch(e){
    if((e as any).status===401&&(!localStorage.getItem(KEY)||localStorage.getItem(KEY)===session)){closeExpired();return confirmed;}
    if(active()){
     setError('No se completó la sincronización. '+(e as Error).message);
    }
   }
   return confirmed;
  }
  const job=run();syncing.current.set(session,job);
  try{return await job;}finally{if(syncing.current.get(session)===job)syncing.current.delete(session);}
 }
 async function retryReports(){
  setRetrying(true);setMessage('');
  const otherReports=queued(info.person.document).filter(report=>report.input.action!=='meals');
  try{
   const confirmed=await load(token,true);
   const count=otherReports.filter(report=>confirmed.has(report.id)).length;
   if(count&&localStorage.getItem(KEY)===token)setMessage('Reportes sincronizados: '+count+'.');
  }
  finally{setRetrying(false);}
 }
 useEffect(()=>{const link=invitation||new URLSearchParams(location.hash.slice(1)).get('activate')||'';if(link){setActivation(link);setToken('');setInfo(null);setCode('');setConfirm('');return;}const notice=takeSessionNotice(KEY);if(notice)setError(notice);const saved=initialSession||localStorage.getItem(KEY)||'';if(saved){localStorage.setItem(KEY,saved);setToken(saved);void load(saved);}},[invitation,initialSession]);
 useEffect(()=>{if(!token)return;const resume=()=>{if(window.document.visibilityState!=='hidden')void load(token);};for(const name of ['online','focus','pageshow'])window.addEventListener(name,resume);window.document.addEventListener('visibilitychange',resume);const t=setInterval(()=>{clockTick(n=>n+1);void load(token);},60000);return()=>{clearInterval(t);for(const name of ['online','focus','pageshow'])window.removeEventListener(name,resume);window.document.removeEventListener('visibilitychange',resume)}},[token]);
 async function login(e:React.FormEvent){
  e.preventDefault();setError('');
  if(activation&&code!==confirm){setError('Las contraseñas no coinciden.');return;}
  setBusy(true);
  try{
   const password=code;
   let next:any,session:string;
   // When connected, validate centrally before showing the reporting form.
   if(navigator.onLine){
    const j=await request({action:activation?'activate':'login',document,password,invitation:activation},'');
    const snapshot=await request(undefined,j.token);
    session=j.token;next={...snapshot,person:{...snapshot.person,document}};
    await localSelfAccess.remember(document,password,{token:session,info:next,document});
   }else{
    const cached=activation?null:await localSelfAccess.verify(document,password);
    if(!cached)throw Error('El primer acceso de esta cuenta requiere conexión, o la contraseña no coincide.');
    requireSession(cached.token);
    session=cached.token;next=cached.info;
   }
   localStorage.setItem(KEY,session);takeSessionNotice(KEY);
   setToken(session);setCode('');setConfirm('');setActivation('');
   setInfo(applyPending(next));
   await load(session);
  }catch(e){if((e as any).central&&[401,403].includes((e as any).status))localSelfAccess.remove(document);setError((e as Error).message)}finally{setBusy(false)}
 }
 async function save(input:any,withoutMeals=false){
  if(savingRecord.current||busy)return;
  const isMeal=input.action==='meals';
  if(isMeal){
   if(info.meal&&continuedReport!==reportKey)return;
   if(!withoutMeals&&!MEAL_OPTIONS.some(([key])=>input[key]))return;
  }else if(!days)return;
  savingRecord.current=true;
  setBusy(true);setError('');setMessage('');
  try{
   requireSession(token);
   if(info.person.role==='Conductor'&&!isMeal)throw Error('El acceso del conductor es solo para sus alimentos.');
   if(['permission','specialPermission'].includes(input.action)&&!tracksPermissions(info.person))throw Error(PERMISSION_EXEMPT_MESSAGE);
   if(isMeal&&(input.date!==addDays(bogotaDate(),1)||MEAL_OPTIONS.some(([key])=>
    input[key]===true&&mealBlocked(info.person,info.events,input.date,key)
   )))throw Error('No se pueden reportar alimentos para esta fecha.');

   const document=info.person.document;
   let ops=queued(document);
   if(isMeal)ops=ops.filter(op=>!(op.input.action==='meals'&&op.input.date===input.date));
   const operationId=crypto.randomUUID();
   ops.push({id:operationId,input,createdAt:new Date().toISOString()});
   localStorage.setItem(queueKey(document),JSON.stringify(ops));
   if(draftKey)try{
    const draft=JSON.parse(localStorage.getItem(draftKey)||'null');
    if(draft){
     if(isMeal)draft.meals=null;
     else{draft.start='';draft.end='';draft.reason='';draft.authorizedBy='';}
     localStorage.setItem(draftKey,JSON.stringify(draft));
    }
   }catch{ /* The report is already queued on this device. */ }
   if(isMeal){
    editingMeals.current=false;
    setContinuedReport('');
   }else{
    setMessage('Pendiente de envío: la novedad está guardada en este dispositivo y todavía no está confirmada.');
    setStart('');setEnd('');setReason('');setAuthorizedBy('');
   }
   setInfo(applyPending(info));
   if(navigator.onLine){
    const earlier=await syncing.current.get(token);
    const confirmed=earlier?.has(operationId)||(await load(token)).has(operationId);
    if(confirmed&&!isMeal&&localStorage.getItem(KEY)===token)setMessage('Reporte sincronizado.');
   }
  }catch(e){setError((e as Error).message);}
  finally{savingRecord.current=false;setBusy(false);}
 }
 const reports=info?.person?.document?queued(info.person.document):[];
 const pendingReports=reports.filter(report=>!report.closedForDate);
 const closedReports=reports.filter(report=>report.closedForDate);
 if(!token||!info)return <div className="access-page"><div className="access-card"><button type="button" className="access-logo-button" aria-label="Logo de Gestión de Personal" onClick={tapLoginLogo} disabled={busy}><img src="./favicon.svg?v=20261006-personal" alt="" width={64} height={64}/></button><h1>SEGURIDAD</h1>{activation&&<p>Confirma tu documento y elige tu contraseña.</p>}<form onSubmit={login}><label>Número de documento<input required value={document} onChange={e=>setDocument(e.target.value)} autoComplete="username"/></label><label>{activation?'Elige tu contraseña':'Contraseña'}<input required type="password" minLength={activation?8:undefined} maxLength={128} value={code} onChange={e=>setCode(e.target.value)} autoComplete={activation?'new-password':'current-password'}/></label>{activation&&<label>Confirmar contraseña<input required type="password" minLength={8} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password"/></label>}<button className="primary" disabled={busy}>{busy?'Espera…':activation?'Crear contraseña y entrar':'Ingresar'}</button></form>{error&&<p className="notice" role="alert">{error}</p>}<small>{activation?'El enlace es válido por 24 horas y para un solo uso.':'Si olvidaste tu contraseña, solicita al administrador un nuevo enlace para restablecerla.'}</small></div></div>;
 if(info.person.role==='Preparación de alimentos'&&info.person.accessRole!=='Administrador')return <KitchenPortal token={token} onLogout={signOut}/>;
 const canOpenAdmin=info.person.role!=='Conductor'&&info.person.accessRole==='Administrador';
 const logo=<img src="./favicon.svg?v=20261006-personal" alt="" width={49} height={49}/>;
 const openAdmin=()=>onAdminLogin(token);
 return <div className="app"><header className="top"><div className="brand">
  {canOpenAdmin?<button type="button" className="access-logo-button" aria-label="Ir a Administración"
    title="Ir a Administración" onClick={openAdmin}>{logo}</button>:logo}
  <div><h1>GESTIÓN DE PERSONAL</h1>{info.person.role==='Conductor'?<span>{info.person.name} · Conductor</span>:<button className="profile-open" onClick={()=>setProfile(true)}>{info.person.name} · {info.person.document}</button>}</div></div><div className="header-actions"><button className="secondary" disabled={busy||updating} onClick={()=>void updateApp()}>{updating?'Actualizando…':'Actualizar app'}</button>{canOpenAdmin&&<button className="secondary" onClick={openAdmin}>Administración</button>}<button className="secondary" onClick={signOut}><LogOut size={16}/>Salir</button></div></header><main>{pendingReports.length>0&&<div className="notice" role="status"><p>Reportes pendientes de sincronizar: {pendingReports.length}.</p>{pendingReports.some(report=>report.input.action==='meals')&&<p>El reporte de alimentos está guardado en este dispositivo y sigue pendiente de envío a cocina.</p>}<button className="secondary" type="button" disabled={retrying||busy} onClick={()=>void retryReports()}>{retrying?'Sincronizando…':'Sincronizar pendientes'}</button></div>}{closedReports.length>0&&<details className="notice"><summary>Reportes de alimentos con plazo cerrado ({closedReports.length})</summary><p>Se conservan en este dispositivo. El envío no quedó confirmado antes del cierre.</p><ul>{closedReports.map(report=><li key={report.id}>{report.input.date.split('-').reverse().join('/')} · {MEAL_OPTIONS.filter(([key])=>report.input[key]).map(([key,label])=>[label,report.input[mealLocationKey(key)]].filter(Boolean).join(' · ')).join(', ')||'Sin alimentos seleccionados'}</li>)}</ul></details>}{error&&<p className="notice" role="alert">{error}</p>}{message&&<p className={message.startsWith('Pendiente')?'notice':'success-notice'} role="status">{message}</p>}{info.person.role==='Preparación de alimentos'&&<KitchenPanel token={token}/>}{info.person.role!=='Conductor'&&<section className="employee-card"><h2>Mis actividades y labores</h2><div className="activities-list">{(info.activities||[]).map((a:any)=><ActivitySummary key={a.id} activity={a} personId={info.person.id}/>)}{!info.activities?.length&&<p>Sin actividades asignadas.</p>}</div></section>}<nav className="module-tabs employee-module-tabs" aria-label="Reportes laborales"><button className={tab==='alimentos'?'active':''} aria-pressed={tab==='alimentos'} onClick={()=>setTab('alimentos')}>ALIMENTOS</button>{info.person.role!=='Conductor'&&<button className={tab==='novedades'?'active':''} aria-pressed={tab==='novedades'} onClick={()=>{setContinuedReport('');setTab('novedades');}}>MIS NOVEDADES</button>}</nav>{tab==='alimentos'||info.person.role==='Conductor'?<section className="employee-card meal-report-card"><h2><Utensils/>Alimentos de mañana</h2><p className="meal-date">{info.date.split('-').reverse().join('/')}</p>{!info.blocked&&mealBlocked(info.person,info.events,info.date,'lunch')&&<p>El día de inicio del permiso puedes programar únicamente desayuno.</p>}<p>Plazo: hoy hasta las 11:59 p. m. · Hora de Colombia.</p>{info.blocked?<p className="notice">No puedes consumir alimentos durante permisos, vacaciones o incapacidades. El reporte está bloqueado para esta fecha.</p>:info.meal&&continuedReport!==reportKey?<div className="notice"><p>Ya hiciste un reporte de alimentos para esta fecha. ¿Deseas actualizarlo?</p><button type="button" className="secondary" onClick={()=>setContinuedReport(reportKey)}>Continuar</button></div>:<form onSubmit={e=>{e.preventDefault();void save({action:'meals',date:info.date,...Object.fromEntries(Object.entries(meals).map(([key,value])=>[key,['breakfast','lunch','dinner'].includes(key)&&mealBlocked(info.person,info.events,info.date,key)?false:value]))})}}><div className="meal-options-row">{MEAL_OPTIONS.map(([key,label])=>{
 if(mealBlocked(info.person,info.events,info.date,key))return null;
 const locationKey=mealLocationKey(key);
 return <div className="meal-choice" key={key}>
  <label className="meal-check"><input type="checkbox" checked={meals[key]} onChange={e=>{
   editingMeals.current=true;
   const checked=e.target.checked;
   setMeals(current=>({...current,[key]:checked,[locationKey]:checked?current[locationKey]:''}));
  }}/>{label}</label>
  <fieldset className="meal-locations" disabled={!meals[key]}>
   <legend>Destino · {label}</legend>
   <div>{MEAL_LOCATIONS.map(place=><label key={place}>
    <input type="radio" name={locationKey} value={place} required={meals[key]} checked={meals[locationKey]===place}
     onChange={()=>{editingMeals.current=true;setMeals(current=>({...current,[locationKey]:place}));}}/>
    {place}
   </label>)}</div>
  </fieldset>
 </div>;
})}</div>{!MEAL_OPTIONS.some(([key])=>meals[key])&&<button type="button" className="secondary" disabled={busy} onClick={()=>{if(window.confirm('¿Confirmas que no requieres alimentos para esta fecha?'))void save({action:'meals',date:info.date,...mealSelections()},true)}}>Reportar sin alimentos</button>}<button className="primary" disabled={busy||!MEAL_OPTIONS.some(([key])=>meals[key])}>{busy?'Guardando…':info.meal?'Actualizar reporte':'Guardar alimentos'}</button></form>}</section>:<><section className="employee-card"><h2><CalendarDays/>Programar / registrar novedad</h2>{!tracksPermissions(info.person)&&<p>{PERMISSION_EXEMPT_MESSAGE}</p>}<form onSubmit={e=>{e.preventDefault();void save({action:reportKind==='Vacaciones'?'vacation':reportKind==='Incapacidad'?'incapacity':reportKind==='Permiso especial'?'specialPermission':'permission',record:{id:crypto.randomUUID(),start:start+'T00:00:00-05:00',end:addDays(end,1)+'T00:00:00-05:00',place:reportKind==='Permiso especial'||reportKind==='Incapacidad'?reason:reportKind,authorizedBy:reportKind==='Permiso'||reportKind==='Permiso especial'?authorizedBy:'',notes:''}})}}><fieldset className="meal-locations">
 <legend>Tipo de reporte</legend>
 <div>{(['Permiso','Permiso especial','Vacaciones','Incapacidad'] as const).map(kind=><label key={kind}>
  <input type="radio" name="reportKind" value={kind} checked={reportKind===kind}
   disabled={['Permiso','Permiso especial'].includes(kind)&&!tracksPermissions(info.person)} onChange={()=>{setReportKind(kind);setReason('');setAuthorizedBy('')}}/>
  {kind}
 </label>)}</div>
</fieldset><p>Puedes elegir una fecha futura. La ausencia afecta la disponibilidad solo durante las fechas registradas.</p><label>Fecha de inicio<DigitDate value={start} onChange={setStart}/></label><label>Fecha final (incluida)<DigitDate value={end} min={start||undefined} onChange={setEnd}/></label>{reportKind==='Permiso especial'?<SpecialPermissionFields reason={reason} authorizedBy={authorizedBy} onReason={setReason} onAuthorizer={setAuthorizedBy}/>:reportKind==='Incapacidad'&&<label>DETALLE<input required maxLength={150} placeholder="Ej.: esguince de tobillo" value={reason} onChange={e=>setReason(e.target.value)}/></label>}{days>0&&<AbsenceDates end={addDays(end,1)+'T00:00:00-05:00'} kind={reportKind}/>}{days>0&&<p>{days} días{reportKind==='Permiso'?' de permiso · 10 días autorizados':reportKind==='Vacaciones'?' de vacaciones':reportKind==='Permiso especial'?' de permiso especial':' de incapacidad'}{reportKind==='Permiso'&&extra>0?' · '+extra+' días adicionales':''}</p>}{reportKind==='Permiso'&&<label>Autorizado por<input required={extra>0} maxLength={150} value={authorizedBy} onChange={e=>setAuthorizedBy(e.target.value)}/></label>}<button className="primary" disabled={busy||days<=0}>{busy?'Guardando…':start>bogotaDate()?'Guardar novedad programada':'Registrar novedad'}</button></form></section><section className="employee-card"><h2>Mis novedades</h2><div className="history">{info.events.filter((e:PersonnelEvent)=>e.kind!=='Servicio').map((e:PersonnelEvent)=><article key={e.id}><b>{e.kind}{e.place&&e.place!==e.kind?' · '+e.place:''}</b><span>Desde {bogotaDate(new Date(e.start))} hasta {bogotaDate(new Date(Date.parse(e.end)-1))}</span>{controlsEvent(info.person,e)?<AbsenceReturn event={e}/>:<small>Registro histórico · sin control de permisos por cargo.</small>}{controlsEvent(info.person,e)&&e.authorizedBy&&<small>{e.extraDays?e.extraDays+' días adicionales · ':''}Autorizado por {e.authorizedBy}</small>}</article>)}{!info.events.some((e:PersonnelEvent)=>e.kind!=='Servicio')&&<p>Sin novedades registradas.</p>}</div></section></>}</main>
 {info.person.document&&<MealReceiptDialog owner={info.person.document}/>}
 <Dialog open={profile} onOpenChange={setProfile}><DialogContent className="record-dialog"><DialogTitle>Mi ficha</DialogTitle><DialogDescription>{info.person.name}</DialogDescription><ProfileCard accessToken={token} person={info.person} data={{people:[info.person],events:info.events,trainingRequirements:info.trainingRequirements,workSettings:info.workSettings,activities:info.activities}}/></DialogContent></Dialog></div>;
}
