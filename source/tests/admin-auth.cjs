const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');const{DatabaseSync}=require('node:sqlite');
let clock=Date.parse('2026-10-04T23:59:59-05:00');class TestDate extends Date{constructor(...a){super(...(a.length?a:[clock]));}static now(){return clock;}}
const sql=new DatabaseSync(':memory:');const migrated=fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort();for(const file of migrated.slice(0,2))sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));sql.exec("INSERT INTO people (id,document,name,role,status,phone,notes,updated_at,titles,strengths) VALUES ('legacy-person','123','Nombre Antiguo','Escolta','Disponible','','','now','Bachiller','Trabajo en equipo')");for(const file of migrated.slice(2))sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));assert.equal(sql.prepare("SELECT name FROM people WHERE id='legacy-person'").get().name,'Nombre Antiguo');assert.equal(sql.prepare("SELECT titles FROM people WHERE id='legacy-person'").get().titles,'Bachiller');
const DB={prepare(query){let values=[];return{bind(...args){values=args;return this;},async first(){return sql.prepare(query).get(...values)||null},async all(){return{results:sql.prepare(query).all(...values)}},async run(){const r=sql.prepare(query).run(...values);return{meta:{changes:Number(r.changes)}}}}}};
const env={DB,GP_ACCESS_HASH:''},cache={};function load(path){if(cache[path])return cache[path];const module={exports:{}};const ctx={module,exports:module.exports,require:id=>{if(id==='cloudflare:workers')return{env};if(id==='@/lib/personnel'||id==='./personnel')return load('lib/personnel.ts');if(id==='@/lib/personnel-server')return load('lib/personnel-server.ts');throw Error(id)},crypto:globalThis.crypto,Date:TestDate,TextEncoder,Uint8Array,Request,Response,URL,btoa,atob,console,Intl};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);return cache[path]=module.exports;}
const rules=load('lib/personnel.ts'),server=load('lib/personnel-server.ts'),admin=load('app/api/data/route.ts'),self=load('app/api/self/route.ts');
const req=(body,token='admin-secret')=>new Request('https://backend.test/api/data',{method:body?'POST':'GET',headers:{Origin:'https://controlesmineras.github.io',Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
async function call(route,body,token){const response=await route[body?'POST':'GET'](req(body,token));return{status:response.status,data:await response.json()};}
const auth=load('app/api/admin-auth/route.ts');
(async()=>{
env.GP_ACCESS_HASH=await server.hash('admin-secret');env.GP_ADMIN_SETUP_HASH=await server.hash('one-time-setup');
assert.equal((await call(auth,null)).data.configured,false);
assert.equal((await call(auth,{action:'login',username:'admin',password:'chosen-password'})).status,403);
assert.equal((await call(auth,{action:'setup',username:'admin',password:'chosen-password',setupToken:'wrong'})).status,403);
assert.equal((await call(auth,{action:'setup',username:'admin',password:'short',setupToken:'one-time-setup'})).status,400);
const setup=await call(auth,{action:'setup',username:'admin',password:'chosen-password',setupToken:'one-time-setup'});assert.equal(setup.status,200);assert.equal((await call(auth,null)).data.configured,true);
const saved=sql.prepare("SELECT * FROM admin_credentials").get();assert.notEqual(saved.password_hash,'chosen-password');assert.equal(saved.username,'admin');assert.equal(saved.password_hash.length,64);
assert.equal((await call(admin,null,setup.data.token)).status,200);
assert.equal((await call(admin,null,'admin-secret')).status,401);
assert.equal((await call(admin,null,setup.data.token+'bad')).status,401);
assert.equal((await call(auth,{action:'setup',username:'admin',password:'replace-password',setupToken:'one-time-setup'})).status,409);
assert.equal((await call(auth,{action:'login',username:'admin',password:'wrong'})).status,401);
const login=await call(auth,{action:'login',username:'admin',password:'chosen-password'});assert.equal(login.status,200);assert.equal((await call(admin,null,login.data.token)).status,200);
clock+=86400001;assert.equal((await call(admin,null,login.data.token)).status,401);
console.log('PASS private first setup, chosen password, hashed storage, immutable admin, signed sessions, legacy key revoked, expiry');
})().catch(e=>{console.error(e);process.exit(1)});
