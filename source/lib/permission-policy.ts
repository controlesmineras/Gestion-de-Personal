// This is a rule for the employee's own leave, independent of administrative access.
export const PERMISSION_EXEMPT_ROLES=['Director de seguridad','Jefe de seguridad'] as const;
type Profile={role?:string;status?:string};
export const tracksPermissions=(person?:Profile)=>!PERMISSION_EXEMPT_ROLES.some(role=>role===person?.role);
export const isPermissionStatus=(status?:string)=>status==='De permiso'||status==='Permiso extraordinario por calamidad';
export const effectiveBaseStatus=(person:Profile)=>!tracksPermissions(person)&&isPermissionStatus(person.status)?'Disponible':person.status;
export const controlsEvent=(person:Profile,event:{kind:string})=>!['Permiso','Permiso especial'].includes(event.kind)||tracksPermissions(person);
export const PERMISSION_EXEMPT_MESSAGE='Este cargo no lleva control de permisos en la app.';
const rolesSql=PERMISSION_EXEMPT_ROLES.map(role=>"'"+role+"'").join(',');
// Aliases are fixed by the callers; never derived from request input.
export const tracksPermissionsSql=(person='people')=>`${person}.role NOT IN (${rolesSql})`;
export const effectiveStatusSql=(person='people')=>`CASE WHEN NOT (${tracksPermissionsSql(person)}) AND ${person}.status IN ('De permiso','Permiso extraordinario por calamidad') THEN 'Disponible' ELSE ${person}.status END`;
export const controlsEventSql=(person='p',event='e')=>`(${event}.kind NOT IN ('Permiso','Permiso especial') OR (${tracksPermissionsSql(person)}))`;

// date is a validated ISO date; meal is a fixed application key.
export function mealAllowedSql(date:string,meal:string,person='p'){
 const first=`e.kind='Permiso' AND date(e.start,'-5 hours')='${date}'`;
 const exception=meal==='breakfast'?` AND NOT (${first})`:'';
 const status=meal==='breakfast'?`((${effectiveStatusSql(person)}) NOT IN ('Inactivo','De permiso','De vacaciones','Incapacitado','Permiso extraordinario por calamidad') OR ((${effectiveStatusSql(person)})='De permiso' AND EXISTS (SELECT 1 FROM events e WHERE e.person_id=${person}.id AND ${first} AND e.end>'${date}T05:00:00.000Z')))`:`(${effectiveStatusSql(person)}) NOT IN ('Inactivo','De permiso','De vacaciones','Incapacitado','Permiso extraordinario por calamidad')`;
 return `${status} AND NOT EXISTS (SELECT 1 FROM events e WHERE e.person_id=${person}.id AND e.kind IN ('Permiso','Permiso especial','Vacaciones','Incapacidad') AND e.start<date('${date}','+1 day')||'T05:00:00.000Z' AND e.end>'${date}T05:00:00.000Z' AND ${controlsEventSql(person)}${exception})`;
}
