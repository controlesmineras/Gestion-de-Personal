import {useState} from 'react';
import {ArrowLeftRight, Users, UserPlus, Utensils} from 'lucide-react';
import {personnelOverview} from '@/lib/dashboard';
import type {Data} from '@/lib/personnel';

type CardValue = {label: string; count: number};

function OverviewCard({title, detail, values, loading}: {
 title: string;
 detail: string;
 values: CardValue[];
 loading: boolean;
}) {
 const [index, setIndex] = useState(0);
 const current = values[index];
 const next = values[(index + 1) % values.length];
 return (
  <button type="button" className="overview-card" data-view={current.label}
   aria-label={title + ', ' + current.label + ', ' + (loading ? 'cargando' : current.count) + '. ' + detail + '. Mostrar ' + next.label}
   onClick={() => setIndex(previous => (previous + 1) % values.length)}>
   <span className="overview-card-heading">{title}<ArrowLeftRight size={17} aria-hidden="true"/></span>
   <span className="overview-card-value"><strong>{loading ? '…' : current.count}</strong><span>{current.label}</span></span>
   <span className="overview-card-detail">{detail}</span>
  </button>
 );
}

function companyValues(counts: {SK: number; 'E-SECURITY': number}): CardValue[] {
 return [
  {label: 'Todos', count: counts.SK + counts['E-SECURITY']},
  {label: 'E-SECURITY', count: counts['E-SECURITY']},
  {label: 'SK', count: counts.SK},
 ];
}

export default function PersonnelOverview({data, loading, onRegister, onManage, onMeals}: {
 data: Data;
 loading: boolean;
 onRegister: () => void;
 onManage: () => void;
 onMeals: () => void;
}) {
 const {personnel, available, external} = personnelOverview(data);
 return (
  <section aria-label="Inicio de administración">
   <div className="overview-cards">
    <OverviewCard title="PERSONAL" detail="SK y E-SECURITY" values={companyValues(personnel)} loading={loading}/>
    <OverviewCard title="PERSONAL DISPONIBLE" detail="En servicio, disponibles y en descanso" values={companyValues(available)} loading={loading}/>
    <OverviewCard title="SERVICIOS EXTERNOS" detail="Cocina y conducción" loading={loading} values={[
     {label: 'Total', count: external.cooks + external.drivers},
     {label: 'Cocineras', count: external.cooks},
     {label: 'Conductor', count: external.drivers},
    ]}/>
   </div>
   <div className="overview-actions">
    <button type="button" className="secondary" onClick={onRegister}><UserPlus size={18} aria-hidden="true"/>REGISTRAR FUNCIONARIO</button>
    <button type="button" id="open-personnel-management" className="primary" onClick={onManage}><Users size={18} aria-hidden="true"/>GESTIONAR PERSONAL</button>
    <button type="button" id="open-meal-reports" className="secondary overview-meals" onClick={onMeals}><Utensils size={18} aria-hidden="true"/>ALIMENTOS</button>
   </div>
  </section>
 );
}
