import {SPECIAL_PERMISSION_REASONS,SPECIAL_PERMISSION_AUTHORIZERS} from '@/lib/personnel';

export default function SpecialPermissionFields({reason,authorizedBy,onReason,onAuthorizer}:{
 reason:string;
 authorizedBy:string;
 onReason:(value:string)=>void;
 onAuthorizer:(value:string)=>void;
}){
 return <>
  <fieldset className="wide meal-locations">
   <legend>Motivo</legend>
   <div style={{display:'grid',gap:8}}>
    {SPECIAL_PERMISSION_REASONS.map(value=><label key={value}>
     <input type="radio" name="specialPermissionReason" required value={value}
      checked={reason===value} onChange={()=>onReason(value)}/>
     {value}
    </label>)}
   </div>
  </fieldset>
  <label className="wide">Quién autoriza
   <select required value={SPECIAL_PERMISSION_AUTHORIZERS.includes(authorizedBy)?authorizedBy:''}
    onChange={e=>onAuthorizer(e.target.value)}>
    <option value="" disabled>Seleccionar…</option>
    {SPECIAL_PERMISSION_AUTHORIZERS.map(value=><option key={value}>{value}</option>)}
   </select>
  </label>
 </>;
}
