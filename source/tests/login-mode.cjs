const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const moduleValue={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/login-mode.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:moduleValue,exports:moduleValue.exports});
const {initialLoginMode,readLoginMode,rememberLoginMode,LOGIN_MODE_KEY}=moduleValue.exports;
const entries=new Map(),storage={getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,value)};
assert.equal(initialLoginMode({saved:null}),null);
for(const mode of ['admin','seguridad']){
 rememberLoginMode(storage,mode);assert.equal(readLoginMode(storage),mode);
 assert.equal(initialLoginMode({saved:mode,adminSession:true,securitySession:true}),mode);
}
entries.set(LOGIN_MODE_KEY,'Administrador');assert.equal(readLoginMode(storage),null);
assert.equal(initialLoginMode({saved:null,adminSession:true}),'admin');
assert.equal(initialLoginMode({saved:null,securitySession:true}),'seguridad');
assert.equal(initialLoginMode({saved:'admin',activation:true}),'seguridad');
assert.equal(initialLoginMode({saved:'seguridad',setup:true}),'admin');
assert.equal(initialLoginMode({saved:'seguridad',accessLink:true}),'admin');
const unavailable={getItem(){throw Error('disabled')},setItem(){throw Error('disabled')}};
assert.equal(readLoginMode(unavailable),null);assert.doesNotThrow(()=>rememberLoginMode(unavailable,'admin'));
assert.equal(entries.size,1);assert.equal(entries.has('gestion-personal-v1-access'),false);
console.log('PASS entry choice: first visit, persistence, session priority, activation/setup and unavailable preference storage');
