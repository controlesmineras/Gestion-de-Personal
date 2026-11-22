import {useState, useSyncExternalStore} from 'react';
import {ChevronDown} from 'lucide-react';
import type {MealKey} from '@/lib/meals';
import type {Data} from '@/lib/personnel';
import {mealReportSummary} from '@/lib/meal-report-summary';
import {MealReportTimes} from './meal-report-times';

// Matches the breakpoint at which the three report columns become a single stack.
const stackedReportsQuery = '(max-width: 800px)';

function subscribeToLayout(onChange: () => void) {
 const query = window.matchMedia(stackedReportsQuery);
 query.addEventListener('change', onChange);
 return () => query.removeEventListener('change', onChange);
}

const isStacked = () => window.matchMedia(stackedReportsQuery).matches;

export default function AdminMealReports({data, date}: {data: Data; date: string}) {
 const stacked = useSyncExternalStore(subscribeToLayout, isStacked, () => true);
 const [expandedMeal, setExpandedMeal] = useState<MealKey | null>(null);
 const [collapsedColumns, setCollapsedColumns] = useState<MealKey[]>([]);

 function toggleMeal(key: MealKey) {
  if (stacked) {
   setExpandedMeal(current => current === key ? null : key);
  } else {
   setCollapsedColumns(current => current.includes(key)
    ? current.filter(column => column !== key)
    : [...current, key]);
  }
 }

 const {meals} = mealReportSummary(data, date);
 return <div className="meal-totals admin-meal-totals">{meals.map(({key, label, locationKey, diners, house, mine, unknown}) => {
 const expanded = stacked ? expandedMeal === key : !collapsedColumns.includes(key);
 return <article className="admin-meal-report" key={key}>
  <h3><button type="button" className="meal-report-toggle" id={'meal-toggle-'+key}
   aria-expanded={expanded} aria-controls={'meal-report-'+key}
   onClick={()=>toggleMeal(key)}>
   <span>{label}</span>
   <span className="meal-report-count"><small>Total</small><b>{diners.length}</b></span>
   <ChevronDown size={20} aria-hidden="true"/>
  </button></h3>
  <div className="meal-report-details" id={'meal-report-'+key} role="region"
   aria-labelledby={'meal-toggle-'+key} hidden={!expanded}>
   <div className="kitchen-destinations">
    {house>0&&<div><strong>{house}</strong> en casa</div>}
    {mine>0&&<div><strong>{mine}</strong> para enviar a mina</div>}
    {unknown>0&&<div><strong>{unknown}</strong> sin destino</div>}
   </div>
   {diners.length?<ol>{diners.map(({meal,person})=><li key={person.id}>
    {person.name}
    <small className="record-note">{meal[locationKey]==='Mina'?'Mina · Enviar':meal[locationKey]||'Sin destino'}</small>
    <MealReportTimes {...meal}/>
   </li>)}</ol>:<p>Nadie ha reportado este alimento.</p>}
  </div>
 </article>;
})}</div>;
}
