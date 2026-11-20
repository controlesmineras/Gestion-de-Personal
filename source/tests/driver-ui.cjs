const {chromium}=require('playwright'),assert=require('node:assert/strict');
async function checkMealRecovery(browser){
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const now=new Date();
  const day=offset=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota'}).format(new Date(now.getTime()+offset*86400000));
  const tomorrow=day(1),old=day(-1),key='gestion-personal-self-pending:12345';
  const base={action:'meals',breakfast:true,breakfastLocation:'Mina',lunch:false,lunchLocation:'',dinner:false,dinnerLocation:''};
  const current={id:'valid',input:{...base,date:tomorrow}},expired={id:'expired',input:{...base,date:old}};
  await context.addInitScript(({key,current,expired})=>{
   if(!localStorage.getItem('qa-seeded')){localStorage.setItem('qa-seeded','1');localStorage.setItem('gestion-personal-self-session','synthetic');localStorage.setItem(key,JSON.stringify([expired,current]));}
  },{key,current,expired});
  let fail=true,saved=null;
  const submitted=[];
  await context.route('**/api/self',async route=>{
   const req=route.request();
   if(req.method()==='POST'){
    const op=req.postDataJSON();submitted.push(op.date);
    if(fail){await route.fulfill({status:503,json:{error:'Servicio temporalmente no disponible'}});return;}
    assert.equal(op.date,tomorrow);saved=op;
    await route.fulfill({json:{ok:true}});return;
   }
   await route.fulfill({json:{person:{id:'synthetic',name:'Prueba',role:'Conductor',company:'SK',status:'Disponible',document:'12345'},events:[],activities:[],date:tomorrow,meal:saved}});
  });
  await page.goto(process.env.LOGIN_TEST_URL||'http://127.0.0.1:4173');
  const retry=page.getByRole('button',{name:'Sincronizar pendientes'});
  await retry.waitFor();
  await page.getByRole('alert').filter({hasText:'Servicio temporalmente'}).waitFor();
  const history=page.locator('summary').filter({hasText:'plazo cerrado'});
  await history.click();
  await page.getByText(old.split('-').reverse().join('/')+' · Desayuno · Mina',{exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).map(x=>x.id),key),['expired','valid']);
  fail=false;await retry.click();
  await page.getByText('Reportes sincronizados: 1.',{exact:true}).waitFor();
  assert.equal(await retry.count(),0);
  assert.equal(saved.breakfastLocation,'Mina');assert(submitted.every(d=>d===tomorrow));
  await page.reload();await history.waitFor();
  await page.getByText(/Ya hiciste un reporte de alimentos/).waitFor();
  const remaining=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.deepEqual(remaining,[{...expired,closedForDate:tomorrow}]);assert.deepEqual(errors,[]);
  console.log('PASS mobile: archived overdue order, kept current order on 503, delivered it by manual retry, persisted history after reload');

  await context.close();
}
(async()=>{
const browser=await chromium.launch({headless:true});const context=await browser.newContext({serviceWorkers:'block'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const driver={id:'driver-one',name:'Conductor Prueba',document:'12345',role:'Conductor',company:'SK',status:'Disponible',serviceGroup:'Alimentos',accessRole:'Laboral'};
const cook={id:'cook-one',name:'Cocina Prueba',document:'54321',role:'Preparación de alimentos',company:'SK',status:'Disponible',serviceGroup:'Alimentos'};
let saved;
await context.route('**/api/**',async route=>{const req=route.request(),url=req.url();let body;
if(url.endsWith('/self')){if(req.method()==='POST'){saved=req.postDataJSON();body={ok:true};}else body={person:driver,events:[],date:new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota'}).format(new Date(Date.now()+86400000)),meal:saved,activities:[]};}
else body={people:[driver,cook],events:[],meals:[],discipline:[]};
await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
await page.addInitScript(()=>localStorage.setItem('gestion-personal-self-session','test-driver-token'));
await page.goto(process.env.LOGIN_TEST_URL||'http://127.0.0.1:4173');await page.getByRole('heading',{name:'Alimentos de mañana'}).waitFor();assert.equal(await page.getByRole('button',{name:'MIS NOVEDADES',exact:true}).count(),0);assert.equal(await page.getByRole('heading',{name:'Mis actividades y labores'}).count(),0);assert.equal(await page.getByRole('button',{name:'Conductor Prueba · 12345'}).count(),0);
await page.getByRole('checkbox',{name:'Desayuno',exact:true}).check();await page.getByRole('radio',{name:'Casa',exact:true}).check();await page.getByRole('button',{name:'Guardar alimentos',exact:true}).click();await page.getByText('Reporte sincronizado.',{exact:true}).waitFor();assert.equal(saved.action,'meals');assert.equal(saved.breakfast,true);assert.equal(saved.breakfastLocation,'Casa');assert.equal(saved.personId,undefined);
await page.getByRole('button',{name:'Actualizar reporte',exact:true}).waitFor();
await page.reload();
await page.getByText('Ya hiciste un reporte de alimentos para esta fecha. ¿Deseas actualizarlo?',{exact:true}).waitFor();
await page.getByRole('button',{name:'Continuar',exact:true}).click();
assert.equal(await page.getByRole('checkbox',{name:'Desayuno',exact:true}).isChecked(),true);
const mine=page.getByRole('radio',{name:/mina/i});
await mine.check();
const refresh=page.waitForResponse(response=>response.url().endsWith('/api/self')&&response.request().method()==='GET');
await page.evaluate(()=>window.dispatchEvent(new Event('online')));
await refresh;
assert.equal(await mine.isChecked(),true);
await page.getByRole('button',{name:'Actualizar reporte',exact:true}).click();
await page.getByText('Reporte sincronizado.',{exact:true}).waitFor();
assert.equal(saved.breakfastLocation,await mine.getAttribute('value'));
await page.evaluate(()=>{localStorage.removeItem('gestion-personal-self-session');localStorage.setItem('gestion-personal-v1-access','test-admin');localStorage.setItem('gestion-personal-login-mode-v1','admin')});await page.reload();await page.getByRole('button',{name:'ALIMENTOS',exact:true}).click();await page.getByRole('heading',{name:'Conductor',exact:true}).waitFor();assert.equal(await page.locator('tbody tr').filter({hasText:'Conductor Prueba'}).count(),0);await page.getByRole('button',{name:'Administrar acceso a alimentos'}).click();await page.getByText('ALIMENTOS · CONDUCTOR',{exact:true}).waitFor();assert.equal(await page.locator('legend').filter({hasText:'ADMINISTRADOR'}).count(),0);assert.deepEqual(errors,[]);
await page.setViewportSize({width:390,height:844});assert.equal(await page.getByRole('dialog').isVisible(),true);await checkMealRecovery(browser);await browser.close();console.log('PASS conductor: own meals save, no novelties/activities/profile, final separate card and food-only invitation on desktop/mobile');
})().catch(e=>{console.error(e);process.exit(1)});
