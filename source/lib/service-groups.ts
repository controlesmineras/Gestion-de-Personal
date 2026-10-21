export const SERVICE_GROUPS=['Escoltas','Personal','Administrativo','Alimentos'] as const;
export type ServiceGroup=typeof SERVICE_GROUPS[number];
type AssignedPerson={company?:string;role?:string;serviceGroup?:string;escortPrincipal?:string};
// Keep historical records readable without rewriting their stored group.
export function groupName(value?:string):string{
 return value==='Gerencia'?'Escoltas':value==='Seguridad'?'Personal':value||'';
}
export function serviceGroup(person:AssignedPerson):ServiceGroup{
 if(person.role==='Conductor'||person.role==='Preparación de alimentos')return 'Alimentos';
 if(SERVICE_GROUPS.includes(person.serviceGroup as ServiceGroup))return person.serviceGroup as ServiceGroup;
 if(person.serviceGroup==='Gerencia'||person.role==='Escolta')return 'Escoltas';
 return 'Personal';
}
export function validateServiceGroup(value:unknown,optional=false){
 if(optional&&(value===undefined||value===''))return '';
 const group=typeof value==='string'?groupName(value):'';
 if(!SERVICE_GROUPS.includes(group as ServiceGroup))throw Error('Selecciona Personal, Escoltas, Administrativo o Alimentos.');
 return group as ServiceGroup;
}
export function validatePersonGroup(value:unknown,role:string){
 if(value!==undefined)validateServiceGroup(value,true);
 if(role==='Conductor'||role==='Preparación de alimentos')return 'Alimentos';
 // An omitted field from an old client must not erase an existing assignment.
 return value===undefined?undefined:serviceGroup({role,serviceGroup:String(value)});
}
export function assignmentError(person:AssignedPerson,scope=''){
 if(person.role==='Conductor')return 'Asignado a conducción. No está disponible para servicios; registra sus permisos desde la ficha del funcionario.';
 const current=serviceGroup(person),selected=groupName(scope);
 if(current==='Escoltas'&&selected!=='Escoltas')return 'Reservado para Escoltas (Gerencia o director de Seguridad). No disponible para servicios de Personal; registra un traslado si cambia su asignación.';
 if(current==='Administrativo'&&selected!=='Administrativo')return 'Asignado a Administrativo. Registra el traslado de grupo antes de asignar servicios de Personal.';
 if(selected&&current!==selected)return 'El funcionario está asignado a '+current+'. Revisa el grupo del servicio.';
 return '';
}
// A personnel view never changes the assigned group used by availability and services.
export const SECURITY_ROLE_ORDER:readonly string[]=['Director de seguridad','Jefe de seguridad','Encargado','Supervisor','SST','Escolta','Operador de seguridad'];
export function personnelForGroup<T extends AssignedPerson & {name:string}>(people:readonly T[],group:string):T[]{
 const selected=groupName(group),rank=(role?:string)=>{const index=SECURITY_ROLE_ORDER.indexOf(role||'');return index<0?SECURITY_ROLE_ORDER.length:index;};
 return people.filter(person=>selected==='Personal'
  ?person.role!=='Conductor'&&person.role!=='Preparación de alimentos'
  :selected==='Escoltas'?hasEscortLabor(person):serviceGroup(person)===selected
 ).sort((a,b)=>(selected==='Personal'?rank(a.role)-rank(b.role):0)||a.name.localeCompare(b.name,'es'));
}
// Match serviceGroup exactly inside atomic writes, including legacy assignments.
export const SERVICE_GROUP_SQL="CASE WHEN role IN ('Conductor','Preparación de alimentos') THEN 'Alimentos' WHEN service_group IN ('Personal','Escoltas','Administrativo','Alimentos') THEN service_group WHEN service_group='Gerencia' OR role='Escolta' THEN 'Escoltas' ELSE 'Personal' END";

export const ESCORT_PRINCIPALS=['Gerencia','Director de Seguridad'] as const;
export const GROUP_ASSIGNMENT_LABELS:Record<string,string>={Personal:'Personal para servicios generales',Escoltas:'Escolta',Administrativo:'Administrativo',Alimentos:'Alimentos'};
export function validateEscortPrincipal(value:unknown,optional=false):string|undefined{
 if(value===undefined&&optional)return undefined;
 if(value===''&&optional)return '';
 if(typeof value!=='string'||!ESCORT_PRINCIPALS.includes(value as typeof ESCORT_PRINCIPALS[number]))throw Error('Selecciona Gerencia o Director de Seguridad.');
 return value;
}
export function assignmentLabel(person:AssignedPerson){
 const group=serviceGroup(person);
 return group==='Escoltas'?(person.escortPrincipal==='Gerencia'?'Escolta de Gerencia':person.escortPrincipal==='Director de Seguridad'?'Escolta del director de Seguridad':'Escolta · asignado a por definir'):GROUP_ASSIGNMENT_LABELS[group];
}
export function validateAssignment(input:any){
 const serviceGroup=validateServiceGroup(input.serviceGroup);
 return {id:input.id,serviceGroup,escortPrincipal:serviceGroup==='Escoltas'?validateEscortPrincipal(input.escortPrincipal):''};
}

export const LABOR_OPTIONS=['Escolta de Gerencia','Escolta del director de Seguridad','Servicios generales','Administrativo','Alimentos'];
export function laborValue(person:AssignedPerson){
 if(serviceGroup(person)==='Escoltas')return person.escortPrincipal?assignmentLabel(person):'';
 return serviceGroup(person)==='Personal'?'Servicios generales':serviceGroup(person);
}
export function laborFields(value:string){
 if(value==='Escolta de Gerencia')return {serviceGroup:'Escoltas',escortPrincipal:'Gerencia'};
 if(value==='Escolta del director de Seguridad')return {serviceGroup:'Escoltas',escortPrincipal:'Director de Seguridad'};
 if(value==='Servicios generales')return {serviceGroup:'Personal',escortPrincipal:''};
 if(value==='Administrativo'||value==='Alimentos')return {serviceGroup:value,escortPrincipal:''};
 throw Error('Selecciona una labor válida.');
}

// The Escoltas tab follows the current duty, never the job title alone.
export function hasEscortLabor(person:AssignedPerson){
 return serviceGroup(person)==='Escoltas'&&(person.escortPrincipal==='Gerencia'||person.escortPrincipal==='Director de Seguridad');
}

// The profile separates the service group from the current duty. Keep the existing
// storage encoding so older clients and availability calculations remain compatible.
export const PROFILE_SERVICE_GROUPS=['Personal','Administrativo','Alimentos'];
export const PERSON_LABORS=['Disponible','Escolta'];
export function profileServiceGroup(person:AssignedPerson){
 const group=serviceGroup(person);return group==='Escoltas'?'Personal':group;
}
export function personLabor(person:AssignedPerson){
 return profileServiceGroup(person)!=='Personal'?'':serviceGroup(person)==='Escoltas'?'Escolta':'Disponible';
}
export function escortPrincipalOptions(company?:string):string[]{
 return company==='SK'?['Director de Seguridad']:[...ESCORT_PRINCIPALS];
}
export function validateCompanyAssignment(person:AssignedPerson){
 if(person.company==='SK'&&serviceGroup(person)==='Escoltas'&&person.escortPrincipal==='Gerencia')throw Error('El personal de SK puede ser escolta del Director de Seguridad, pero no de Gerencia.');
}
