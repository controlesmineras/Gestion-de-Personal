export const basicFields=['document','name','firstName','secondName','firstSurname','secondSurname','company','role','phone'] as const;
export function basicDataChanged(before:any,after:any){return !!before&&basicFields.some(key=>String(before[key]??'')!==String(after[key]??''));}
