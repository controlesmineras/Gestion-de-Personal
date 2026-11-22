import {serviceGroup,groupName,SERVICE_GROUPS,type ServiceGroup} from './service-groups';
import {companies,type Data} from './personnel';
import {workload} from './workload';
export function dashboardSummary(data:Data,tab='personal',now=Date.now()){
 const selected=SERVICE_GROUPS.includes(groupName(tab) as ServiceGroup)?groupName(tab):tab==='cocina'?'Alimentos':['personal','actividades'].includes(tab)?'Personal':'';
 const people=data.people.filter(p=>!selected||serviceGroup(p)===selected);
 const rows=people.map(person=>({person,...workload(person,data.events,data.workSettings,now)}));
 const available=rows.filter(r=>r.status==='Disponible'),ready=rows.filter(r=>r.canAssign);
 const byCompany=companies.map(company=>({
  company,
  count:available.filter(row=>row.person.company===company).length,
  ready:ready.filter(row=>row.person.company===company).length,
 }));
 return {people,available,ready,inService:rows.filter(r=>r.status==='En servicio'),byCompany};
}

/** Administrative headcounts cover both companies and all service groups. */
export function personnelOverview(data: Data, now = Date.now()) {
 const personnel = {SK: 0, 'E-SECURITY': 0};
 const available = {SK: 0, 'E-SECURITY': 0};
 const external = {cooks: 0, drivers: 0};
 const eventsByPerson = new Map<string, Data['events']>();
 for (const event of data.events) {
  const events = eventsByPerson.get(event.personId);
  if (events) events.push(event);
  else eventsByPerson.set(event.personId, [event]);
 }
 for (const person of data.people) {
  if (person.role === 'Preparación de alimentos') {
   external.cooks++;
   continue;
  }
  if (person.role === 'Conductor') {
   external.drivers++;
   continue;
  }
  const company = person.company;
  if (company !== 'SK' && company !== 'E-SECURITY') continue;
  personnel[company]++;
  const {status} = workload(person, eventsByPerson.get(person.id) ?? [], data.workSettings, now);
  if (status === 'En servicio' || status === 'Disponible' || status === 'En descanso') {
   available[company]++;
  }
 }
 return {personnel, available, external};
}
