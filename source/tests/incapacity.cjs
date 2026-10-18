const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');const{DatabaseSync}=require('node:sqlite');
let clock=Date.parse('2026-10-04T23:59:59-05:00');class TestDate extends Date{constructor(...a){super(...(a.length?a:[clock]));}static now(){return clock;}}
const sql=new DatabaseSync(':memory:');const migrated=fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort();for(const file of migrated.slice(0,2))sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));sql.exec("INSERT INTO people (id,document,name,role,status,phone,notes,updated_at,titles,strengths) VALUES ('legacy-person','123','Nombre Antiguo','Escolta','Disponible','','','now','Bachiller','Trabajo en equipo')");for(const file of migrated.slice(2))sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));assert.equal(sql.prepare("SELECT name FROM people WHERE id='legacy-person'").get().name,'Nombre Antiguo');assert.equal(sql.prepare("SELECT titles FROM people WHERE id='legacy-person'").get().titles,'Bachiller');
const DB={prepare(query){let values=[];return{bind(...args){assert.ok(args.length<=100,'D1 allows at most 100 bind parameters');values=args;return this;},async first(){return sql.prepare(query).get(...values)||null},async all(){return{results:sql.prepare(query).all(...values)}},async run(){const r=sql.prepare(query).run(...values);return{meta:{changes:Number(r.changes)}}}}}};
DB.batch=async statements=>{sql.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}};
const env={DB,GP_ACCESS_HASH:''},cache={};function load(path){if(cache[path])return cache[path];const module={exports:{}};const ctx={module,exports:module.exports,require:id=>{if(id==='./activities'||id==='@/lib/activities')return load('lib/activities.ts');if(id==='cloudflare:workers')return{env};if(id==='@/lib/personnel'||id==='./personnel')return load('lib/personnel.ts');if(id==='./workload'||id==='@/lib/workload')return load('lib/workload.ts');if(id==='./qualifications'||id==='@/lib/qualifications')return load('lib/qualifications.ts');if(id==='@/lib/personnel-server')return load('lib/personnel-server.ts');throw Error(id)},crypto:globalThis.crypto,Date:TestDate,TextEncoder,Uint8Array,Request,Response,URL,btoa,atob,console,Intl};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);return cache[path]=module.exports;}
const rules=load('lib/personnel.ts'),server=load('lib/personnel-server.ts'),admin=load('app/api/data/route.ts'),self=load('app/api/self/route.ts');
const req=(body,token='admin-secret')=>new Request('https://backend.test/api/data',{method:body?'POST':'GET',headers:{Origin:'https://controlesmineras.github.io',Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
async function call(route,body,token){const response=await route[body?'POST':'GET'](req(body,token));return{status:response.status,data:await response.json()};}
(async()=>{
 env.GP_ACCESS_HASH=await server.hash('admin-secret');
 const p={id:'incapacity-person-123',document:'900',firstName:'Prueba',firstSurname:'Ausencia',company:'SK',role:'Operador de seguridad',status:'Disponible'};
 assert.equal((await call(admin,{type:'person',record:p})).status,200);
 const person=rules.validateRecord('person',p),event={id:'incapacity-event-123',personId:p.id,kind:'Incapacidad',start:'2026-10-04T00:00:00-05:00',end:'2026-10-23T00:00:00-05:00',place:'Incapacidad'};
 assert.equal(rules.validateRecord('event',event).extraDays,0);
 const op={type:'event',record:event,operationId:'incapacity-op-123'};
 assert.equal((await call(admin,op)).status,200);
 assert.equal((await call(admin,op)).status,200);
 assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM events WHERE id=?").get(event.id).n,1);
 assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE target_id=?").get(event.id).n,1);
 assert.equal((await call(admin,{type:'event',record:{...event,id:'overlap-illness-123',kind:'Servicio'}})).status,400);
 const events=(await call(admin,null)).data.events;
 assert.equal(rules.personStatus(person,events,Date.parse('2026-10-18T12:00:00-05:00')),'Incapacitado');
 assert.equal(rules.personStatus(person,events,Date.parse(event.end)),'Disponible');
 assert.equal(rules.monthHours(p.id,events,'2026-10'),0);
 assert.equal(rules.mealBlocked(person,events,'2026-10-22'),true);
 assert.equal(rules.mealBlocked(person,events,'2026-10-23'),false);
 assert.equal(rules.mealBlocked({...person,status:'Incapacitado'},[],'2026-10-23'),true);
 assert.throws(()=>rules.validateRecord('event',{...event,end:event.start}));
 const invite=await call(admin,{type:'invite',personId:p.id});
 const activated=await call(self,{action:'activate',document:p.document,password:'test-password',invitation:invite.data.url.split('#activate=')[1]},'');
 assert.equal(activated.status,200);
 const token=activated.data.token;
 assert.equal((await call(self,null,token)).data.events[0].kind,'Incapacidad');
 assert.equal((await call(self,{action:'incapacity',record:event},token)).status,400);
 assert.equal((await call(admin,{type:'event',record:event},token)).status,401);
 assert.equal((await call(self,{action:'meals',date:'2026-10-05',breakfast:true,lunch:false,dinner:false},token)).status,409);
 sql.prepare('INSERT INTO meals (id,person_id,date,breakfast,lunch,dinner,updated_at) VALUES (?,?,?,?,?,?,?)').run('old-meal',p.id,'2026-10-05',1,1,1,'now');
 const kitchen=load('app/api/kitchen/route.ts');
 assert.equal((await call(kitchen,null)).data.rows.length,0);
 assert.equal(events[0].end,'2026-10-23T05:00:00.000Z');
 console.log('PASS incapacity: administrator registration, audit, retries, overlap, status expiry, own history, no self-registration, meal exclusion and no work hours');
})().catch(e=>{console.error(e);process.exit(1)});
