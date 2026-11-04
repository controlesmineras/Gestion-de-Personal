import {dateTime} from '@/lib/personnel';

export type MealReportTimes = {reportedAt?:string|null;updatedAt?:string|null};

export function MealReportTimes({reportedAt,updatedAt}:MealReportTimes){
 return <>
  <small className="record-note">Reporte inicial: {reportedAt?<time dateTime={reportedAt}>{dateTime(reportedAt)}</time>:'Sin hora registrada'}</small>
  {updatedAt&&updatedAt!==reportedAt&&<small className="record-note">{reportedAt?'Última modificación':'Último guardado'}: <time dateTime={updatedAt}>{dateTime(updatedAt)}</time></small>}
 </>;
}
