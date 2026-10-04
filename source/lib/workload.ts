import type {Person,PersonnelEvent} from './personnel';
export type WorkSettings={id:string;minRestHours:number;maxWorkHours24:number};
export const DEFAULT_WORK_SETTINGS:WorkSettings={id:'workload-settings',minRestHours:8,maxWorkHours24:12};
export function validateWorkSettings(input:any):WorkSettings{const minRestHours=Number(input.minRestHours),maxWorkHours24=Number(input.maxWorkHours24);if(!Number.isFinite(minRestHours)||minRestHours<0||minRestHours>24||!Number.isFinite(maxWorkHours24)||maxWorkHours24<=0||maxWorkHours24>24)throw Error('Descanso: entre 0 y 24 horas. Alerta de carga: mayor que 0 y hasta 24 horas.');return{id:'workload-settings',minRestHours,maxWorkHours24}}
export function workload(person:Person,events:PersonnelEvent[],settings:WorkSettings=DEFAULT_WORK_SETTINGS,now=Date.now()){
 const service=events.filter(e=>e.personId===person.id&&e.kind==='Servicio'),windowStart=now-86400000;
 const ranges=service.map(e=>[Math.max(Date.parse(e.start),windowStart),Math.min(Date.parse(e.end),now)]).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)&&b>a).sort((a,b)=>a[0]-b[0]);let worked=0,start=0,end=0;for(const [a,b] of ranges){if(a>end){worked+=Math.max(0,end-start);start=a;end=b;}else end=Math.max(end,b);}worked+=Math.max(0,end-start);
 const active=events.find(e=>e.personId===person.id&&Date.parse(e.start)<=now&&Date.parse(e.end)>now),lastEnd=service.map(e=>Date.parse(e.end)).filter(end=>Number.isFinite(end)&&end<=now).sort((a,b)=>b-a)[0],inService=active?.kind==='Servicio',restHours=inService?0:lastEnd===undefined?null:Math.max(0,(now-lastEnd)/3600000),restRemaining=restHours===null?0:Math.max(0,settings.minRestHours-restHours),hours24=worked/3600000;
 let status=person.status==='Descanso'?'En descanso':person.status;if(status!=='Inactivo'){if(active)status=active.kind==='Servicio'?'En servicio':active.kind==='Vacaciones'?'De vacaciones':'De permiso';else if(['Disponible','En descanso'].includes(status)&&lastEnd!==undefined)status=restRemaining>0?'En descanso':'Disponible';}
 const overloaded=hours24>=settings.maxWorkHours24,needsRest=!inService&&restRemaining>0,alert=overloaded?'Sobrecarga':needsRest?'Descanso pendiente':'Sin alerta',canAssign=status==='Disponible'&&!overloaded&&!needsRest;
 return{status,hours24,restHours,restRemaining,lastEnd,lastEndLabel:lastEnd===undefined?'Sin servicios anteriores':new Date(lastEnd).toISOString(),overloaded,needsRest,alert,canAssign};
}
export const formatHours=(value:number)=>value.toLocaleString('es-CO',{maximumFractionDigits:1})+' h';
