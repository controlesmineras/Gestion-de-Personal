const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
function setup({next='new.js',online=true,assetStatus=200,fail=false}={}){
 const window=new EventTarget(),document=new EventTarget();document.visibilityState='visible';
 document.querySelector=()=>({src:'https://example.test/Personal/assets/current.js'});
 const element=(kind,value)=>({getAttribute:key=>key===kind?value:null});
 const node=element('src','./assets/'+next),css=element('href','./assets/app.css');
 const requests=[],reloads=[];let updates=0;
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync('lib/app-update.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,window,document,Event,URL,AbortSignal,Date,setInterval:()=>1,clearInterval:()=>{},
  navigator:{onLine:online,serviceWorker:{getRegistration:async()=>({update:async()=>updates++})}},
  location:{origin:'https://example.test',href:'https://example.test/Personal/?x=keep#activate=preserved',replace:url=>reloads.push(url)},
  DOMParser:class{parseFromString(){return{querySelector:()=>node,querySelectorAll:()=>[node,css]}}},
  fetch:async(url,options)=>{requests.push({url:String(url),options});if(fail)throw Error('offline');return new Response('content',{status:String(url).includes('/assets/')?assetStatus:200});}});
 return {api:module.exports,requests,reloads,window,document,updates:()=>updates};
}
(async()=>{
 const latest=setup({next:'current.js'});assert.equal(await latest.api.checkAppUpdate(true),false);assert.equal(latest.reloads.length,0);
 const next=setup();assert.equal(await next.api.checkAppUpdate(true),true);assert.equal(next.reloads.length,1);assert.equal(next.requests.length,3);
 const target=new URL(next.reloads[0]);assert.equal(target.searchParams.get('x'),'keep');assert.equal(target.hash,'#activate=preserved');assert(target.searchParams.has('actualizar'));
 await next.api.checkAppUpdate(true);assert.equal(next.reloads.length,1,'no reload loop');
 const dirty=setup();let editing=true;const remove=dirty.api.preventUpdateWhile(()=>editing);
 assert.equal(await dirty.api.checkAppUpdate(true),false);assert.equal(dirty.reloads.length,0);editing=false;
 assert.equal(await dirty.api.checkAppUpdate(true),true);remove();
 for(const options of [{online:false},{assetStatus:404},{fail:true}]){const h=setup(options);assert.equal(await h.api.checkAppUpdate(true),false);assert.equal(h.reloads.length,0);}
 const resume=setup({next:'current.js'});const cleanup=resume.api.startAppUpdates();await new Promise(r=>setImmediate(r));resume.window.dispatchEvent(new Event('pageshow'));resume.window.dispatchEvent(new Event('online'));await new Promise(r=>setImmediate(r));assert(resume.updates()>=2);cleanup();
 console.log('PASS app updates: latest check, complete assets, active drafts, offline, failed deployment, no loops and resume listeners');
})().catch(e=>{console.error(e);process.exitCode=1});
