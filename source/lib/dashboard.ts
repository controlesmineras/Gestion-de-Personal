import {serviceGroup,hasEscortLabor,groupName,SERVICE_GROUPS,type ServiceGroup} from './service-groups';
import type {Data} from './personnel';
import {workload} from './workload';
export function dashboardSummary(data:Data,tab='personal',now=Date.now()){
 const selected=SERVICE_GROUPS.includes(groupName(tab) as ServiceGroup)?groupName(tab):tab==='cocina'?'Alimentos':['personal','actividades'].includes(tab)?'Personal':'';
 const people=data.people.filter(p=>!selected||(selected==='Escoltas'?hasEscortLabor(p):serviceGroup(p)===selected));
 const rows=people.map(person=>({person,...workload(person,data.events,data.workSettings,now)}));
 const available=rows.filter(r=>r.status==='Disponible'&&serviceGroup(r.person)!=='Escoltas'),ready=rows.filter(r=>r.canAssign&&serviceGroup(r.person)!=='Escoltas');
 return {people,available,ready,inService:rows.filter(r=>r.status==='En servicio'),byCompany:(selected==='Escoltas'?['E-SECURITY']:['SK','E-SECURITY']).map(company=>({company,count:available.filter(r=>r.person.company===company).length}))};
}
