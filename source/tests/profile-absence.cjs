const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,crypto,Date,Intl,require:id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):require(id)});return mod.exports;}
const {prepareProfileAbsence,profileAbsenceDraft}=load('lib/profile-absence.ts');
const {personStatus,mealBlocked}=load('lib/personnel.ts');
const {mergePersonnelData}=load('lib/personnel-cache.ts');
const person={id:'person-test-123',document:'123',name:'Test Persona',firstName:'Test',firstSurname:'Persona',company:'SK',role:'Escolta',status:'Disponible',phone:'',notes:''};
for(const [status,kind] of [['De permiso','Permiso'],['De vacaciones','Vacaciones'],['Incapacitado','Incapacidad']]){
 const draft={...person,...profileAbsenceDraft(person,[]),status,absenceStart:'2026-10-21',absenceEnd:'2026-10-21',absenceReason:'Detalle de prueba'};
 const result=prepareProfileAbsence(draft,person,[]),e=result.event;
 assert.equal(e.kind,kind);assert.equal(e.start,'2026-10-21T05:00:00.000Z');assert.equal(e.end,'2026-10-22T05:00:00.000Z');
 assert.equal(personStatus(result.person,[e],Date.parse('2026-10-20T12:00:00-05:00')),'Disponible');
 assert.equal(personStatus(result.person,[e],Date.parse(e.start)),status);assert.equal(personStatus(result.person,[e],Date.parse(e.end)),'Disponible');
 assert.equal(mealBlocked(result.person,[e],'2026-10-21'),true);assert.equal(mealBlocked(result.person,[e],'2026-10-22'),false);
 for(const patch of [{absenceStart:''},{absenceEnd:''},{absenceEnd:'2026-10-20'},{absenceReason:''}])assert.throws(()=>prepareProfileAbsence({...draft,...patch},person,[]));
 assert.throws(()=>prepareProfileAbsence(draft,person,[{...e,id:'other-event',kind:'Servicio'}]));
 const current=profileAbsenceDraft(person,[e],Date.parse(e.start));assert.equal(current.absenceId,e.id);assert.equal(current.absenceEnd,'2026-10-21');
 const edited=prepareProfileAbsence({...person,...current,absenceEnd:'2026-10-22'},person,[e]);assert.equal(edited.event.id,e.id);
 const ops=[{type:'person',record:result.person},{type:'event',record:e}],merged=mergePersonnelData({people:[person],events:[]},ops);
 assert.equal(merged.events.length,1);assert.equal(mergePersonnelData(merged,ops).events.length,1);
 assert.equal(prepareProfileAbsence(draft,{...person,status},[]).person.status,'Disponible');
}
const long={...person,...profileAbsenceDraft(person,[]),status:'De permiso',absenceStart:'2026-10-01',absenceEnd:'2026-10-11',absenceReason:'Permiso'};
assert.throws(()=>prepareProfileAbsence(long,person,[]),/autoriz/);assert.equal(prepareProfileAbsence({...long,absenceAuthorizedBy:'Administrador'},person,[]).event.extraDays,1);
assert.equal(prepareProfileAbsence(person,person,[]).event,null);
console.log('PASS: dates, inclusive periods, future/current/ended absences, three kinds, overlap rejection, editing IDs, offline replay and extended permissions');
