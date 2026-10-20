export const SERVICE_GROUPS=['Gerencia','Seguridad','Administrativo','Alimentos'] as const;
export type ServiceGroup=typeof SERVICE_GROUPS[number];
type AssignedPerson={role?:string;serviceGroup?:string};
export function serviceGroup(person:AssignedPerson):ServiceGroup{
 if(person.role==='Conductor')return 'Alimentos';
 if(SERVICE_GROUPS.includes(person.serviceGroup as ServiceGroup))return person.serviceGroup as ServiceGroup;
 return person.role==='Preparación de alimentos'?'Alimentos':'Seguridad';
}
export function validateServiceGroup(value:unknown,optional=false){
 if(optional&&(value===undefined||value===''))return '';
 if(typeof value!=='string'||!SERVICE_GROUPS.includes(value as ServiceGroup))throw Error('Selecciona Seguridad, Gerencia, Administrativo o Alimentos.');
 return value as ServiceGroup;
}
export function assignmentError(person:AssignedPerson,scope=''){
 if(person.role==='Conductor')return 'Asignado a conducción. No está disponible para servicios; registra sus permisos desde la ficha del funcionario.';
 const current=serviceGroup(person);
 if(current==='Gerencia'&&scope!=='Gerencia')return 'Asignado a Gerencia. Registra el traslado de grupo antes de asignar servicios habituales de mina.';
 if(current==='Administrativo'&&scope!=='Administrativo')return 'Asignado a Administrativo. Registra el traslado de grupo antes de asignar servicios habituales de mina.';
 if(scope==='Gerencia'&&current!=='Gerencia')return 'Este servicio es de Gerencia. Revisa el grupo asignado al funcionario.';
 if(scope&&current!==scope)return 'El funcionario está asignado a '+current+'. Revisa el grupo del servicio.';
 return '';
}
// A personnel view never changes the assigned group used by availability and services.
export const SECURITY_ROLE_ORDER:readonly string[]=['Director de seguridad','Jefe de seguridad','Supervisor','SST','Escolta','Operador de seguridad'];
export function personnelForGroup<T extends AssignedPerson & {name:string}>(people:readonly T[],group:ServiceGroup):T[]{
 const rank=(role?:string)=>{const index=SECURITY_ROLE_ORDER.indexOf(role||'');return index<0?SECURITY_ROLE_ORDER.length:index;};
 return people.filter(person=>group==='Seguridad'
  ?person.role!=='Conductor'&&person.role!=='Preparación de alimentos'
  :serviceGroup(person)===group
 ).sort((a,b)=>(group==='Seguridad'?rank(a.role)-rank(b.role):0)||a.name.localeCompare(b.name,'es'));
}
// Shared with atomic server-side checks; legacy clients cannot assign reserved groups.
export const SERVICE_GROUP_SQL="CASE WHEN role='Conductor' THEN 'Alimentos' WHEN service_group IN ('Seguridad','Gerencia','Administrativo','Alimentos') THEN service_group WHEN role='Preparación de alimentos' THEN 'Alimentos' ELSE 'Seguridad' END";
