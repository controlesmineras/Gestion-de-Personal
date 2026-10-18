'use client';
import type {Person,PersonnelEvent} from '@/lib/personnel';
import {absenceReturn,hasAbsenceStatus,personReturnEvent} from '@/lib/absence-return';

export function AbsenceReturn({event}:{event:PersonnelEvent}){
 const info=absenceReturn(event);if(!info)return null;
 return <div className="absence-return">
   <span>Regreso previsto: <strong><time dateTime={event.end}>{info.dateTime}</time></strong></span>
   <small className={info.phase==='finished'?'return-finished':''}>{info.detail}</small>
 </div>;
}
export function PersonReturn({person,events}:{person:Person;events:PersonnelEvent[]}){
 const event=personReturnEvent(person,events);
 return event?<AbsenceReturn event={event}/>:hasAbsenceStatus(person)?<small className="record-note">Regreso previsto: por registrar.</small>:null;
}
