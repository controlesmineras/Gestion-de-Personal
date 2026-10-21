const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'..'),originalLoad=Module._load;
require.extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const sql=new DatabaseSync(':memory:');
for(const name of fs.readdirSync(path.join(root,'drizzle')).filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync(path.join(root,'drizzle',name),'utf8'));
let actor={id:'admin-test',name:'Administrador de prueba',document:'admin'};
const wrap=(query,values=[])=>({bind:(...v)=>wrap(query,v),first:async()=>sql.prepare(query).get(...values)||null,all:async()=>({results:sql.prepare(query).all(...values)}),run:async()=>({meta:sql.prepare(query).run(...values)})});
const db={prepare:wrap,batch:async statements=>{sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const serverText=fs.readFileSync(path.join(root,'lib/personnel-server.ts'),'utf8');
const personColumns=serverText.match(/export const personColumns='([^']+)'/)[1];
const eventColumns=serverText.match(/export const eventColumns='([^']+)'/)[1];
Module._load=function(id,parent,isMain){
 if(id==='@/lib/personnel-server')return {db:()=>db,adminActor:async()=>actor,admin:async()=>!!actor,response:(data,status=200)=>new Response(JSON.stringify(data),{status}),personColumns,eventColumns};
 if(id==='@/lib/document-server')return {verifyPersonFiles:async()=>{}};
 if(id.startsWith('@/'))id=path.join(root,id.slice(2));
 return originalLoad.call(this,id,parent,isMain);
};
const {POST}=require('../app/api/data/route.ts');
const {validateRecord,personStatus}=require('../lib/personnel.ts');
const {assignmentError,assignmentLabel,personnelForGroup,laborValue,laborFields}=require('../lib/service-groups.ts');
const {activityAvailability}=require('../lib/activities.ts');
const {dashboardSummary}=require('../lib/dashboard.ts');
const {mergePersonnelData}=require('../lib/personnel-cache.ts');
const now=Date.parse('2026-10-21T16:00:00Z');
const base={id:'person-0001',document:'test-001',firstName:'Prueba',firstSurname:'Escolta',name:'Prueba Escolta',company:'E-SECURITY',role:'Escolta',phone:'',status:'Disponible',notes:'',serviceGroup:'Escoltas'};
const post=async(type,record,operationId=crypto.randomUUID())=>{const r=await POST(new Request('https://example.test/api/data',{method:'POST',body:JSON.stringify({type,record,operationId})}));const body=await r.json();return {status:r.status,body};};
const current=()=>sql.prepare('SELECT '+personColumns+' FROM people WHERE id=?').get(base.id);
(async()=>{
 for(const labor of ['Escolta de Gerencia','Escolta del director de Seguridad','Servicios generales','Administrativo','Alimentos'])assert.equal(laborValue({...base,...laborFields(labor)}),labor);
 assert.equal(laborValue(base),'');
 assert.equal((await post('person',base)).status,200);
 for(const principal of ['Gerencia','Director de Seguridad']){
  const op=crypto.randomUUID();
  assert.equal((await post('assignment',{id:base.id,serviceGroup:'Escoltas',escortPrincipal:principal},op)).status,200);
  const p=current(),data={people:[p],events:[]};
  assert.equal(p.escortPrincipal,principal);assert.equal(p.role,'Escolta');assert.equal(p.status,'Disponible');
  assert.match(assignmentLabel(p),principal==='Gerencia'?/Gerencia/:/director de Seguridad/);
  assert.ok(assignmentError(p,'Personal'));assert.equal(personStatus(p,[],now),'Asignado como escolta');
  assert.equal(dashboardSummary(data,'Personal',now).available.length,0);assert.equal(dashboardSummary(data,'Escoltas',now).available.length,0);
  assert.equal(activityAvailability(p,data,'2026-10-22T14:00:00Z','2026-10-22T15:00:00Z','','Personal').available,false);
  assert.equal(activityAvailability(p,data,'2026-10-22T14:00:00Z','2026-10-22T15:00:00Z','','Escoltas').available,true);
  assert.equal((await post('assignment',{id:base.id,serviceGroup:'Escoltas',escortPrincipal:principal},op)).status,200);
  assert.equal(sql.prepare('SELECT count(*) AS n FROM audit_logs WHERE operation_id=?').get(op).n,1);
 }
 const audit=sql.prepare("SELECT * FROM audit_logs WHERE action='Cambio de asignación' ORDER BY occurred_at DESC LIMIT 1").get();
 assert.equal(audit.actor_id,actor.id);assert.ok(audit.occurred_at);assert.match(audit.changes,/escortPrincipal/);
 // Older clients omit the new field: unrelated edits retain it.
 assert.equal((await post('person',{...base,phone:'123'})).status,200);assert.equal(current().escortPrincipal,'Director de Seguridad');
 const ended={id:'event-0001',personId:base.id,kind:'Servicio',start:'2026-10-19T12:00:00Z',end:'2026-10-19T14:00:00Z',place:'Ingreso a mina',notes:''};
 assert.equal(personStatus(current(),[ended],now),'Asignado como escolta');
 // Releasing the assignment never cancels incapacity, vacation, rest or active service.
 assert.equal((await post('person',{...base,status:'Incapacitado',statusDetail:'Prueba'})).status,200);
 assert.equal((await post('assignment',{id:base.id,serviceGroup:'Personal'})).status,200);
 assert.equal(current().role,'Escolta');assert.equal(current().status,'Incapacitado');assert.equal(current().statusDetail,'Prueba');
 assert.equal(dashboardSummary({people:[current()],events:[]},'Personal',now).available.length,0);
 const released={...current(),status:'Disponible'};
 assert.equal(dashboardSummary({people:[released],events:[]},'Personal',now).ready.length,1);
 assert.equal(personnelForGroup([released],'Escoltas').length,0);assert.equal(personnelForGroup([released],'Personal').length,1);
 for(const [kind,start,end] of [['Vacaciones','2026-10-20T00:00:00Z','2026-10-23T00:00:00Z'],['Permiso','2026-10-20T00:00:00Z','2026-10-23T00:00:00Z'],['Servicio','2026-10-21T10:00:00Z','2026-10-21T15:00:00Z'],['Servicio','2026-10-21T15:00:00Z','2026-10-21T18:00:00Z']])assert.equal(dashboardSummary({people:[released],events:[{...ended,kind,start,end}]},'Personal',now).ready.length,0);
 assert.equal((await post('assignment',{id:base.id,serviceGroup:'Escoltas',escortPrincipal:'Otro'})).status,400);
 assert.equal((await post('assignment',{id:base.id,serviceGroup:'Escoltas'})).status,400);
 assert.equal((await post('assignment',{id:'missing-001',serviceGroup:'Personal'})).status,400);
 const cook={...base,id:'person-0002',document:'test-002',role:'Preparación de alimentos',serviceGroup:'Alimentos'};
 assert.equal((await post('person',cook)).status,200);assert.equal((await post('assignment',{id:cook.id,serviceGroup:'Personal'})).status,400);
 // Offline replay patches only assignment, then keeps it through an ordinary profile edit.
 const merged=mergePersonnelData({people:[base],events:[]},[{type:'assignment',record:{id:base.id,serviceGroup:'Personal',escortPrincipal:''}},{type:'person',record:{...base,serviceGroup:undefined,escortPrincipal:undefined,phone:'456'}}]);
 assert.equal(merged.people[0].serviceGroup,'Personal');assert.equal(merged.people[0].phone,'456');
 assert.equal(merged.people[0].role,'Escolta');
 actor=null;assert.equal((await post('assignment',{id:base.id,serviceGroup:'Personal'})).status,401);
 console.log('PASS: persistent escort assignments, availability, release restrictions, API persistence/audit/auth, legacy clients and offline replay.');
})().catch(e=>{console.error(e);process.exitCode=1;});
