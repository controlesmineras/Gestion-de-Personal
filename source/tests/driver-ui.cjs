const {chromium}=require('playwright'),assert=require('node:assert/strict');
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
await page.evaluate(()=>{localStorage.removeItem('gestion-personal-self-session');localStorage.setItem('gestion-personal-v1-access','test-admin');localStorage.setItem('gestion-personal-login-mode-v1','admin')});await page.reload();await page.getByRole('button',{name:'ALIMENTOS',exact:true}).click();await page.getByRole('heading',{name:'Conductor',exact:true}).waitFor();assert.equal(await page.locator('tbody tr').filter({hasText:'Conductor Prueba'}).count(),0);await page.getByRole('button',{name:'Administrar acceso a alimentos'}).click();await page.getByText('ALIMENTOS · CONDUCTOR',{exact:true}).waitFor();assert.equal(await page.locator('legend').filter({hasText:'ADMINISTRADOR'}).count(),0);assert.deepEqual(errors,[]);
await page.setViewportSize({width:390,height:844});assert.equal(await page.getByRole('dialog').isVisible(),true);await browser.close();console.log('PASS conductor: own meals save, no novelties/activities/profile, final separate card and food-only invitation on desktop/mobile');
})().catch(e=>{console.error(e);process.exit(1)});
