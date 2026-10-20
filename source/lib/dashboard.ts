import {serviceGroup,SERVICE_GROUPS,type ServiceGroup} from './service-groups';
import type {Data} from './personnel';
import {workload} from './workload';
export function dashboardSummary(data:Data,tab='personal',now=Date.now()){
 const selected=SERVICE_GROUPS.includes(tab as ServiceGroup)?tab:tab==='cocina'?'Alimentos':['personal','actividades'].includes(tab)?'Seguridad':'';
 const people=data.people.filter(p=>!selected||serviceGroup(p)===selected);
 const rows=people.map(person=>({person,...workload(person,data.events,data.workSettings,now)}));
 const available=rows.filter(r=>r.status==='Disponible'),ready=rows.filter(r=>r.canAssign);
 return {people,available,ready,inService:rows.filter(r=>r.status==='En servicio'),byCompany:(selected==='Gerencia'?['E-SECURITY']:['SK','E-SECURITY']).map(company=>({company,count:available.filter(r=>r.person.company===company).length}))};
}
