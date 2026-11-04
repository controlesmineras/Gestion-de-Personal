'use client';
import {createDeviceAccess} from '@/lib/device-access';
import {useEffect,useState,useRef} from 'react';
import {ShieldCheck,LogOut} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {addDays,bogotaDate,dateTime} from '@/lib/personnel';
import {MEAL_OPTIONS,isMealLocation,mealLocationKey,type MealKey,type MealLocation} from '@/lib/meals';
import {MealReportTimes} from './meal-report-times';
const API='https://gestion-de-personal.nelsoncaste86.chatgpt.site/api/kitchen';
type KitchenRow = {id:string;name:string} & MealReportTimes & Record<MealKey,number>
 & Partial<Record<ReturnType<typeof mealLocationKey>,MealLocation|null>>;

function destination(row:KitchenRow,key:MealKey){
 const value=row[mealLocationKey(key)];
 return isMealLocation(value)?value:'Sin destino';
}
export function KitchenPortal({token,onLogout}:{token:string;onLogout:()=>void}){return <div className="app"><header className="top"><div className="brand"><ShieldCheck/><div><h1>GESTIÓN DE PERSONAL</h1><span>COCINA</span></div></div><button className="secondary" onClick={onLogout}><LogOut size={16}/>Salir</button></header><main><KitchenPanel token={token}/></main></div>}
export default function KitchenPanel({token}:{token:string}){
 const identity=createDeviceAccess('gestion-personal-self').byToken(token)?.document||createDeviceAccess('gestion-personal-self').byToken(token)?.info?.person?.document||createDeviceAccess('gestion-personal-admin').byToken(token)?.username||token;
 const pendingKey='gestion-personal-kitchen-pending:'+identity;
 const readPending=():any[]=>{try{return JSON.parse(localStorage.getItem(pendingKey)||'[]')}catch{return []}};
 const cachedKey=(day:string)=>'gestion-personal-kitchen-cache:'+identity+':'+day;
 function overlay(value:any){if(!value)return value;let attendance=[...(value.attendance||[])];for(const op of readPending().filter(op=>op.date===value.date)){attendance=[...attendance.filter(a=>a.personId!==op.personId||a.meal!==op.meal),{...op,received:Number(op.received)}];}return {...value,attendance};}
 async function flush(){for(const op of readPending()){const r=await fetch(API,{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(op)});const j:any=await r.json();if(!r.ok)throw Error(j.error||'Entrega pendiente de sincronizar.');localStorage.setItem(pendingKey,JSON.stringify(readPending().filter(row=>row.id!==op.id)));}}
 const[view,setView]=useState('tomorrow'),[date,setDate]=useState(addDays(bogotaDate(),1)),[result,setResult]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState<MealKey|''>(''),[filter,setFilter]=useState('Todos'),[saving,setSaving]=useState('');const pending=useRef(false),version=useRef(0),refresh=useRef<()=>Promise<void>>(async()=>{});
 useEffect(()=>{let cancelled=false;async function load(){if(pending.current)return;const next=view==='today'?bogotaDate():addDays(bogotaDate(),1);if(next!==date){setDate(next);setSelected('');return;}const requestVersion=++version.current;const cached=JSON.parse(localStorage.getItem(cachedKey(date))||'null');if(cached)setResult(overlay(cached));if(!navigator.onLine){setError('Sin conexión · se muestra la última copia disponible.');return;}setBusy(true);try{await flush();const r=await fetch(API+'?date='+date,{cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+token}}),j:any=await r.json();if(!r.ok)throw Error(j.error||'No se pudo cargar la preparación.');if(!cancelled&&requestVersion===version.current){localStorage.setItem(cachedKey(date),JSON.stringify(j));setResult(overlay(j));setError('');}}catch(e){if(!cancelled&&requestVersion===version.current){setError((e as Error).message);}}finally{if(!cancelled&&requestVersion===version.current)setBusy(false)}}refresh.current=load;setResult(null);setError('');void load();const online=()=>void load();window.addEventListener('online',online);const timer=setInterval(()=>void load(),60000);return()=>{cancelled=true;clearInterval(timer);window.removeEventListener('online',online)}},[view,date,token]);
 async function mark(personId:string,received:boolean){if(pending.current)return;if(date!==bogotaDate()||view!=='today'){setError('Solo se pueden marcar entregas de hoy.');return;}pending.current=true;version.current++;setSaving(personId);setError('');try{const op={id:crypto.randomUUID(),action:'attendance',date,personId,meal:selected,received};const ops=readPending().filter(row=>!(row.date===date&&row.personId===personId&&row.meal===selected));localStorage.setItem(pendingKey,JSON.stringify([...ops,op]));setResult((old:any)=>overlay(old));if(navigator.onLine)await flush();else setError('Entrega guardada en este dispositivo · pendiente de sincronizar.');}catch(e){setError((e as Error).message);}finally{pending.current=false;setSaving('');setBusy(false);}}

 const current=result?.date===date?result:null,isToday=view==='today'&&date===bogotaDate(),received=(id:string,meal:string)=>!!current?.attendance?.find((a:any)=>a.personId===id&&a.meal===meal)?.received;
 const rows:KitchenRow[]=current?.rows||[];
 const names=selected?rows.filter(p=>!!p[selected]):[],done=names.filter(p=>received(p.id,selected)).length,shown=names.filter(p=>filter==='Todos'||(filter==='Pendientes'?!received(p.id,selected):received(p.id,selected)));
 return <section className="employee-card"><div className="kitchen-view"><button className={view==='today'?'primary':'secondary'} disabled={!!saving} onClick={()=>{setView('today');setDate(bogotaDate());setSelected('');setFilter('Todos')}}>Hoy · Entregas</button><button className={view==='tomorrow'?'primary':'secondary'} disabled={!!saving} onClick={()=>{setView('tomorrow');setDate(addDays(bogotaDate(),1));setSelected('');setFilter('Todos')}}>Mañana · Preparación</button></div><h2>{view==='today'?'Entrega de alimentos de hoy':'Alimentos para mañana'}</h2><p className="meal-date">{date.split('-').reverse().join('/')}</p><p>{view==='today'?'Marca a quienes ya recibieron cada alimento. Las marcas se comparten entre las cocineras.':'Los reportes pueden cambiar hasta las 11:59 p. m. de hoy.'} Actualización automática cada minuto.</p>{readPending().length>0&&<p className="notice">{readPending().length} entregas pendientes de sincronizar.</p>}{error&&<p className="notice" role="alert">{error}</p>}{busy&&!current&&<p>Cargando reportes…</p>}<div className="meal-totals kitchen-totals">{MEAL_OPTIONS.map(([key,label])=>{
 const requested=rows.filter(p=>!!p[key]);
 const served=requested.filter(p=>received(p.id,key)).length;
 const house=requested.filter(p=>destination(p,key)==='Casa').length;
 const mine=requested.filter(p=>destination(p,key)==='Mina').length;
 const unknown=requested.length-house-mine;
 const breakdown=`Casa: ${house} · Mina: ${mine}${unknown?` · Sin destino: ${unknown}`:''}`;
 return <button className="kitchen-meal" key={key} disabled={!current} onClick={()=>{setSelected(key);setFilter('Todos')}} aria-label={current?`${label}: ${requested.length} · ${breakdown} · Ver nombres`:`${label}: cargando`}>
  <span>{label.toUpperCase()}</span><b>{current?requested.length:'—'}</b>
  <small>{isToday?'Solicitados':'Por preparar'}</small>
  {current&&<small>{breakdown}</small>}
  {isToday&&current&&<small>{served} recibidos · {requested.length-served} pendientes</small>}
 </button>;
})}</div>{current&&<small>Actualizado: {dateTime(current.updatedAt)}</small>}<Dialog open={!!selected} onOpenChange={open=>{if(!open&&!saving)setSelected('')}}><DialogContent><DialogTitle>{MEAL_OPTIONS.find(([key])=>key===selected)?.[1]}</DialogTitle><DialogDescription>{date.split('-').reverse().join('/')}</DialogDescription>{isToday&&<><p className="delivery-totals">{done} recibidos · {names.length-done} pendientes</p><label>Mostrar<select disabled={!!saving} value={filter} onChange={e=>setFilter(e.target.value)}>{['Todos','Pendientes','Recibidos'].map(f=><option key={f}>{f}</option>)}</select></label></>}{error&&<p className="notice" role="alert">{error}</p>}{selected&&shown.length?<ul className="kitchen-names">{shown.map(p=>{
 const place=destination(p,selected);
 const diner=<span>{p.name}<small className="meal-destination">{place==='Mina'?'Mina · Enviar':place}</small><MealReportTimes {...p}/></span>;
 return <li key={p.id}>{isToday?<label className={'delivery-check '+(received(p.id,selected)?'delivered':'')}>
  <input type="checkbox" checked={received(p.id,selected)} disabled={!!saving} aria-label={'Recibió el alimento: '+p.name+' · '+place} onChange={e=>void mark(p.id,e.target.checked)}/>
  {diner}{saving===p.id&&<small>Guardando…</small>}
 </label>:diner}</li>;
})}</ul>:<p>{names.length?'No hay funcionarios para este filtro.':'No hay solicitudes para este alimento.'}</p>}</DialogContent></Dialog></section>;
}
