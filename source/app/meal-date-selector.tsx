import {CalendarDays} from 'lucide-react';
import {addDays, validDate} from '@/lib/personnel';

export default function MealDateSelector({today, date, onChange}: {
 today: string;
 date: string;
 onChange: (date: string | null) => void;
}) {
 const tomorrow = addDays(today, 1);
 return <div className="meal-date-controls" role="group" aria-label="Fecha de consulta de alimentos">
  <button type="button" aria-pressed={date === today} onClick={() => onChange(null)}>HOY</button>
  <button type="button" aria-pressed={date === tomorrow} onClick={() => onChange(tomorrow)}>MAÑANA</button>
  <label className="meal-date-picker">
   <CalendarDays size={17} aria-hidden="true"/>
   <span aria-hidden="true">{date.split('-').reverse().join('/')}</span>
   <input type="date" lang="es-CO" aria-label="Fecha de alimentos" value={date}
    onChange={event => {if (validDate(event.target.value)) onChange(event.target.value);}}/>
  </label>
 </div>;
}
