import {activityEvents} from './activities';
import type {Data,Person} from './personnel';
export type PendingRecord={type:'person'|'event'|'discipline'|'course'|'settings'|'activity';record:any;operationId?:string};
// A document identifies one employee across the downloaded snapshot and local drafts.
const documentKey=(value:string)=>String(value||'').trim();
function mergePeople(rows:Person[],incoming:Person[]=[]){const result:Person[]=[];for(const row of [...rows,...incoming]){const i=result.findIndex(p=>p.id===row.id||(documentKey(row.document)&&documentKey(p.document)===documentKey(row.document)));if(i<0)result.push({...row});else result[i]={...result[i],...row,id:result[i].id};}return result;}
function uniqueRows<T extends {id:string}>(rows:T[]){return Array.from(new Map(rows.map(row=>[row.id,{...row}])).values());}
export function mergePersonnelData(data:Data,ops:PendingRecord[]):Data{
 const result:Data={...data,people:mergePeople(data.people||[]),events:uniqueRows(data.events||[]),discipline:uniqueRows(data.discipline||[]),trainingRequirements:uniqueRows(data.trainingRequirements||[]),activities:uniqueRows(data.activities||[])};
 for(const op of ops){if(op.type==='activity'){result.activities=uniqueRows([...(result.activities||[]),op.record]);result.events=uniqueRows([...result.events.filter(e=>e.activityId!==op.record.id),...activityEvents(op.record)]);continue;}if(op.type==='settings'){result.workSettings=op.record;continue;}if(op.type==='person'){result.people=mergePeople(result.people,[op.record]);continue;}const key=op.type==='event'?'events':op.type==='course'?'trainingRequirements':'discipline';result[key]=uniqueRows([...(result[key]||[]) as any[],op.record]) as any;}
 return result;
}
