'use client';
import type {LoginMode} from '@/lib/login-mode';

export default function AccessModeSelector({value,onChange,disabled=false}:{
  value:LoginMode|null;onChange:(mode:LoginMode)=>void;disabled?:boolean
}) {
  return <fieldset className="access-mode-selector" disabled={disabled}>
    <legend>Tipo de ingreso</legend>
    <div className="access-mode-options">
      <button type="button" aria-pressed={value==='admin'} onClick={()=>onChange('admin')}>ADMINISTRADOR</button>
      <button type="button" aria-pressed={value==='seguridad'} onClick={()=>onChange('seguridad')}>SEGURIDAD</button>
    </div>
    <small>Recordaremos tu elección en este dispositivo. Puedes cambiarla aquí.</small>
  </fieldset>;
}
