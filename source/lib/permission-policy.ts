// This is a rule for the employee's own leave, independent of administrative access.
export const PERMISSION_EXEMPT_ROLES=['Director de seguridad','Jefe de seguridad','Supervisor'] as const;
type Profile={role?:string;status?:string};
export const tracksPermissions=(person?:Profile)=>!PERMISSION_EXEMPT_ROLES.some(role=>role===person?.role);
export const isPermissionStatus=(status?:string)=>status==='De permiso'||status==='Permiso extraordinario por calamidad';
export const effectiveBaseStatus=(person:Profile)=>!tracksPermissions(person)&&isPermissionStatus(person.status)?'Disponible':person.status;
export const controlsEvent=(person:Profile,event:{kind:string})=>event.kind!=='Permiso'||tracksPermissions(person);
export const PERMISSION_EXEMPT_MESSAGE='Este cargo no lleva control de permisos en la app.';
const rolesSql=PERMISSION_EXEMPT_ROLES.map(role=>"'"+role+"'").join(',');
// Aliases are fixed by the callers; never derived from request input.
export const tracksPermissionsSql=(person='people')=>`${person}.role NOT IN (${rolesSql})`;
export const effectiveStatusSql=(person='people')=>`CASE WHEN NOT (${tracksPermissionsSql(person)}) AND ${person}.status IN ('De permiso','Permiso extraordinario por calamidad') THEN 'Disponible' ELSE ${person}.status END`;
export const controlsEventSql=(person='p',event='e')=>`(${event}.kind<>'Permiso' OR (${tracksPermissionsSql(person)}))`;
