const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');const moduleObject={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/workload.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:moduleObject,exports:moduleObject.exports,Date,Error});const {workload,validateWorkSettings}=moduleObject.exports;
const now=Date.parse('2026-10-04T12:00:00-05:00'),H=3600000,p={id:'person-test',status:'Disponible'},e=(start,end,kind='Servicio',personId=p.id)=>({id:Math.random().toString(),personId,kind,start:new Date(now+start*H).toISOString(),end:new Date(now+end*H).toISOString()});
let w;
const run=(events,person=p,settings=undefined)=>workload(person,events,settings,now);
w=run([e(-12,-3)]);assert.equal(w.status,'En descanso');assert.equal(w.hours24,9);assert.equal(w.restHours,3);assert.equal(w.restRemaining,5);assert.equal(w.canAssign,false);
w=run([e(-20,-8)]);assert.equal(w.status,'Disponible');assert.equal(w.overloaded,true);assert.equal(w.canAssign,false);assert.equal(w.alert,'Sobrecarga');
w=run([e(-18,-9)]);assert.equal(w.status,'Disponible');assert.equal(w.canAssign,true);
w=run([e(-30,-20),e(-2,4)]);assert.equal(w.hours24,6);assert.equal(w.status,'En servicio');assert.equal(w.restHours,0);assert.equal(w.canAssign,false);
w=run([e(-10,-4),e(-8,-2)]);assert.equal(w.hours24,8); // overlapping legacy records are counted once
assert.equal(run([e(1,4)]).hours24,0);assert.equal(run([e(-50,-30)]).hours24,0);assert.equal(run([e(-12,-4,'Permiso')]).hours24,0);assert.equal(run([e(-12,-4,'Servicio','another-person')]).hours24,0);
assert.equal(run([e(-12,-3),e(-1,2,'Vacaciones')]).status,'De vacaciones');assert.equal(run([e(-12,-3)],{...p,status:'Inactivo'}).status,'Inactivo');assert.equal(run([e(-12,-3)],{...p,status:'No disponible'}).status,'No disponible');assert.equal(run([],{...p,status:'Descanso'}).status,'En descanso');
assert.equal(run([e(-12,-3)],p,{id:'workload-settings',minRestHours:2,maxWorkHours24:10}).canAssign,true);assert.throws(()=>validateWorkSettings({minRestHours:25,maxWorkHours24:12}));assert.throws(()=>validateWorkSettings({minRestHours:8,maxWorkHours24:0}));assert.equal(validateWorkSettings({minRestHours:7.5,maxWorkHours24:10.5}).minRestHours,7.5);
console.log('PASS rolling 24h clipping, active services, future exclusion, union of overlaps, exact rest boundary, overload threshold, absence/restricted states and configurable limits');
