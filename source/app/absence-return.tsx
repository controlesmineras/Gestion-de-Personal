'use client';
import type {Person,PersonnelEvent} from '@/lib/personnel';
import {absenceDates,absenceReturn,hasAbsenceStatus,personReturnEvent} from '@/lib/absence-return';

export function AbsenceDates({end,kind}:{end:string;kind?:string}){
 const dates=absenceDates(end);if(!dates)return null;
 const label=kind==='Incapacidad'?'Último día de incapacidad':kind==='Permiso'?'Último día de permiso':kind==='Vacaciones'?'Último día de vacaciones':'Último día de ausencia';
 return <div className="absence-dates">
   <span>{label}: <strong><time dateTime={dates.lastIncludedAt}>{dates.lastIncludedDateTime}</time></strong></span>
   <small>Regreso previsto: <time dateTime={end}>{dates.returnDateTime}</time></small>
 </div>;
}
export function AbsenceReturn({event,combined=false}:{event:PersonnelEvent;combined?:boolean}){
 const info=absenceReturn(event);if(!info)return null;
 return <div className="absence-return">
   <AbsenceDates end={event.end} kind={combined?undefined:event.kind}/>
   <small className={info.phase==='finished'?'return-finished':''}>{info.detail}</small>
 </div>;
}
export function PersonReturn({person,events}:{person:Person;events:PersonnelEvent[]}){
 const event=personReturnEvent(person,events);
 return event?<AbsenceReturn event={event} combined/>:hasAbsenceStatus(person)?<small className="record-note">Finalización y regreso: por registrar.</small>:null;
}
