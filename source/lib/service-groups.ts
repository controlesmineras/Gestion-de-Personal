export const SERVICE_GROUPS=['Gerencia','Seguridad','Alimentos'] as const;
export type ServiceGroup=typeof SERVICE_GROUPS[number];
type AssignedPerson={role?:string;serviceGroup?:string};
export function serviceGroup(person:AssignedPerson):ServiceGroup{
 if(person.role==='Conductor')return 'Alimentos';
 if(SERVICE_GROUPS.includes(person.serviceGroup as ServiceGroup))return person.serviceGroup as ServiceGroup;
 return person.role==='Preparación de alimentos'?'Alimentos':'Seguridad';
}
export function validateServiceGroup(value:unknown,optional=false){
 if(optional&&(value===undefined||value===''))return '';
 if(typeof value!=='string'||!SERVICE_GROUPS.includes(value as ServiceGroup))throw Error('Selecciona Seguridad, Gerencia o Alimentos.');
 return value as ServiceGroup;
}
export function assignmentError(person:AssignedPerson,scope=''){
 if(person.role==='Conductor')return 'Asignado a conducción. No está disponible para servicios; registra sus permisos desde la ficha del funcionario.';
 const current=serviceGroup(person);
 if(current==='Gerencia'&&scope!=='Gerencia')return 'Asignado a Gerencia. Registra el traslado de grupo antes de asignar servicios habituales de mina.';
 if(scope==='Gerencia'&&current!=='Gerencia')return 'Este servicio es de Gerencia. Revisa el grupo asignado al funcionario.';
 if(scope&&current!==scope)return 'El funcionario está asignado a '+current+'. Revisa el grupo del servicio.';
 return '';
}
// Shared with atomic server-side checks; old clients may assign non-management staff only.
export const SERVICE_GROUP_SQL="CASE WHEN role='Conductor' THEN 'Alimentos' WHEN service_group IN ('Seguridad','Gerencia','Alimentos') THEN service_group WHEN role='Preparación de alimentos' THEN 'Alimentos' ELSE 'Seguridad' END";
