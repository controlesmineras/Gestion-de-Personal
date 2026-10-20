import type {Person,PersonnelEvent} from './personnel';
const DAY=86400000,MINUTE=60000;
export const isAbsence=(event:PersonnelEvent)=>['Permiso','Vacaciones','Incapacidad'].includes(event.kind);
export const hasAbsenceStatus=(person:Person)=>['De permiso','De vacaciones','Incapacitado','Permiso extraordinario por calamidad'].includes(person.status);
export function returnDateTime(iso:string,clock24=false):string{
 const time=Date.parse(iso);if(!Number.isFinite(time))return 'Por registrar';
 const parts=new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:clock24?'h23':'h12'}).formatToParts(new Date(time));
 const value=(type:string)=>parts.find(part=>part.type===type)?.value||'';
 const formatted=value('day')+'/'+value('month')+'/'+value('year')+', '+value('hour')+':'+value('minute');
 if(clock24)return formatted+(value('hour')==='00'&&value('minute')==='00'?' (inicio del día)':'');
 const hour24=new Intl.DateTimeFormat('en-US',{timeZone:'America/Bogota',hour:'numeric',hourCycle:'h23'}).format(new Date(time));
 return formatted+(Number(hour24)<12?' a. m.':' p. m.');
}
// Stored end is exclusive. Display the last included minute without changing the period.
export function absenceDates(endIso:string){
 const end=Date.parse(endIso);if(!Number.isFinite(end))return null;
 const lastIncludedAt=new Date(end-1).toISOString();
 return{lastIncludedAt,lastIncludedDateTime:returnDateTime(lastIncludedAt),returnDateTime:returnDateTime(endIso,true)};
}
export function absenceReturn(event:PersonnelEvent,now=Date.now()){
 const start=Date.parse(event.start),end=Date.parse(event.end);
 if(!isAbsence(event)||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return null;
 const phase=now>=end?'finished':now<start?'scheduled':'active';
 const minutes=Math.max(0,Math.ceil((end-now)/MINUTE)),days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),rest=minutes%60;
 const pieces=[days?days+(days===1?' día':' días'):'',hours?hours+(hours===1?' hora':' horas'):'',!days&&rest?rest+(rest===1?' minuto':' minutos'):''].filter(Boolean);
 const detail=phase==='finished'?'Periodo finalizado':phase==='scheduled'?'Ausencia programada':'Faltan '+pieces.join(' y ');
 return{phase,dateTime:returnDateTime(event.end),detail,returnAt:end,daysUntilReturn:Math.max(0,Math.ceil((end-now)/DAY))};
}
// Connected absences postpone the expected return; the original records stay intact.
export function personReturnEvent(person:Person,events:PersonnelEvent[],now=Date.now()):PersonnelEvent|null{
 const own=events.filter(event=>event.personId===person.id&&absenceReturn(event,now)).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
 const active=own.find(event=>Date.parse(event.start)<=now&&Date.parse(event.end)>now);
 if(active){
  let end=Date.parse(active.end);
  for(const event of own)if(Date.parse(event.start)<=end&&Date.parse(event.end)>end)end=Date.parse(event.end);
  return{...active,end:new Date(end).toISOString()};
 }
 if(!hasAbsenceStatus(person))return null;
 const kind=person.status==='De vacaciones'?'Vacaciones':person.status==='Incapacitado'?'Incapacidad':'Permiso';
 const matching=own.filter(event=>event.kind===kind);
 return matching.filter(event=>Date.parse(event.start)<=now).at(-1)||matching[0]||null;
}
