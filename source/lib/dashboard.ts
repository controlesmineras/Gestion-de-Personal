import type {Data} from './personnel';
import {workload} from './workload';
export function dashboardSummary(data:Data,tab='personal',now=Date.now()){
 const people=data.people.filter(p=>tab==='cocina'?p.role==='Preparación de alimentos':['personal','actividades'].includes(tab)?p.role!=='Preparación de alimentos':true);
 const rows=people.map(person=>({person,...workload(person,data.events,data.workSettings,now)}));
 const available=rows.filter(r=>r.status==='Disponible'),ready=rows.filter(r=>r.canAssign);
 return {people,available,ready,inService:rows.filter(r=>r.status==='En servicio'),byCompany:['SK','E-SECURITY'].map(company=>({company,count:available.filter(r=>r.person.company===company).length}))};
}
