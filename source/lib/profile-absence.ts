import {addDays,bogotaDate,validDate,validateRecord,type Person,type PersonnelEvent} from './personnel';

export const absenceKind=(status:string)=>({'De permiso':'Permiso','De vacaciones':'Vacaciones',Incapacitado:'Incapacidad'} as Record<string,string>)[status]||'';

export function profileAbsenceDraft(person:Person|undefined,events:PersonnelEvent[],now=Date.now()){
 const active=person&&person.status!=='Inactivo'?events.find(e=>e.personId===person.id&&absenceKindForEvent(e.kind)&&Date.parse(e.start)<=now&&Date.parse(e.end)>now):undefined;
 return {
  status:active?absenceKindForEvent(active.kind):person?.status||'Disponible',
  absenceId:active?.id||crypto.randomUUID(),
  absenceStart:active?bogotaDate(new Date(active.start)):'',
  absenceEnd:active?bogotaDate(new Date(Date.parse(active.end)-1)):'',
  absenceReason:active?.place||person?.statusDetail||'',
  absenceAuthorizedBy:active?.authorizedBy||'',
  absenceNotes:active?.notes||'',
 };
}
function absenceKindForEvent(kind:string){return ({Permiso:'De permiso',Vacaciones:'De vacaciones',Incapacidad:'Incapacitado'} as Record<string,string>)[kind]||'';}

export function prepareProfileAbsence(draft:any,existing:Person|undefined,events:PersonnelEvent[]){
 const kind=absenceKind(draft.status);
 if(!kind)return {person:draft,event:null};
 if(!validDate(draft.absenceStart||'')||!validDate(draft.absenceEnd||''))throw Error('Completa la fecha de inicio y la fecha final de la novedad.');
 if(draft.absenceEnd<draft.absenceStart)throw Error('La fecha final no puede ser anterior a la fecha de inicio.');
 const event=validateRecord('event',{
  id:draft.absenceId,personId:draft.id,kind,
  start:draft.absenceStart+'T00:00:00-05:00',end:addDays(draft.absenceEnd,1)+'T00:00:00-05:00',
  place:draft.absenceReason,authorizedBy:kind==='Permiso'?draft.absenceAuthorizedBy:'',notes:draft.absenceNotes||'',
 });
 if(events.some(e=>e.id!==event.id&&e.personId===event.personId&&e.start<event.end&&e.end>event.start))throw Error('El período se cruza con otro servicio, permiso, vacaciones o incapacidad.');
 // La ausencia se calcula por fechas; no dejar un estado manual permanente.
 const status=existing&&!absenceKind(existing.status)&&existing.status!=='Inactivo'?existing.status:'Disponible';
 return {person:{...draft,status},event};
}
