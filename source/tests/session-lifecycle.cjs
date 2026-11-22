const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
function harness(){
 const entries=new Map(),notices=new Map(),timers=new Map();let now=1000,sequence=0,requests=0,response=new Response('{}');
 const storage=map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)});
 const window=new EventTarget(),document=new EventTarget();document.visibilityState='visible';
 const modules={},context=vm.createContext({console,window,document,Event,CustomEvent,Headers,Response,atob,crypto:globalThis.crypto,TextEncoder,Uint8Array,
  localStorage:storage(entries),sessionStorage:storage(notices),Date:class extends Date{static now(){return now;}},
  setTimeout:(fn,delay)=>{timers.set(++sequence,{fn,at:now+delay});return sequence;},clearTimeout:id=>timers.delete(id),
  fetch:async()=>{requests++;if(response instanceof Error)throw response;return response;}});
 function load(file){if(modules[file])return modules[file].exports;const module={exports:{}};modules[file]=module;
  const code=ts.transpileModule(fs.readFileSync('lib/'+file+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const run=vm.runInContext('(function(module,exports,require){'+code+'\n})',context);run(module,module.exports,name=>load(name.replace('./','')));return module.exports;}
 return {api:load('session-lifecycle'),entries,notices,window,document,timers,context,
  advance(value){now=value;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}},
  response(value){response=value;},requests:()=>requests};
}
const token=exp=>btoa(JSON.stringify({id:'employee',exp}))+'.signature';
(async()=>{
 const h=harness(),key='gestion-personal-self-session',admin='gestion-personal-v1-access';
 const old=token(2000);h.entries.set(key,old);h.entries.set(admin,old);
 const pending='[{"id":"report","input":{"action":"meals"}}]';h.entries.set('gestion-personal-self-pending:123',pending);h.entries.set('gestion-personal-self-draft:123','draft');
 let expired=0;const stop=h.api.watchSession(old,()=>expired++);
 h.advance(1999);assert.equal(expired,0);h.advance(2000);assert.equal(expired,1);
 assert.equal(h.entries.has(key),false);assert.equal(h.entries.has(admin),false);
 assert.equal(h.entries.get('gestion-personal-self-pending:123'),pending);assert.equal(h.entries.get('gestion-personal-self-draft:123'),'draft');
 h.window.dispatchEvent(new Event('focus'));assert.equal(expired,1);stop();assert.equal(h.timers.size,0);
 assert.match(h.api.takeSessionNotice(key),/pendientes se conservan/);
 assert.equal(h.api.takeSessionNotice(key),'');
 await assert.rejects(h.api.sessionFetch('https://example.test',{headers:{Authorization:'Bearer '+old}}),/sesión/);assert.equal(h.requests(),0);
 const fresh=token(9000);h.entries.set(key,fresh);h.response(new Response('{"error":"Sesión inválida"}',{status:401}));
 let rejected=0;const stopFresh=h.api.watchSession(fresh,()=>rejected++);
 await assert.rejects(h.api.sessionFetch('https://example.test',{headers:{Authorization:'Bearer '+fresh}}),/sesión/);assert.equal(rejected,1);assert.equal(h.entries.has(key),false);stopFresh();
 h.entries.set(key,fresh);h.api.expireSession(old);assert.equal(h.entries.get(key),fresh,'a late old response must not close a renewed session');
 h.response(new Error('offline'));await assert.rejects(h.api.sessionFetch('https://example.test',{headers:{Authorization:'Bearer '+fresh}}),/offline/);assert.equal(h.entries.get(key),fresh);
 h.response(new Response('{}',{status:403}));await h.api.sessionFetch('https://example.test',{headers:{Authorization:'Bearer '+fresh}});assert.equal(h.entries.get(key),fresh,'a permission failure does not revoke every session');
 const resumed=harness();resumed.entries.set(key,token(1000));let closed=0;resumed.api.watchSession(token(1000),()=>closed++);assert.equal(closed,1,'expired restored session closes before offline access');
 console.log('PASS session lifecycle: exact expiry, restored expiry, 401, offline preservation, notices, stale responses, pending reports and drafts');
})().catch(e=>{console.error(e);process.exitCode=1});
