const {chromium}=require('playwright'),assert=require('node:assert/strict');
async function checkAdminMeals(browser){
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota'}).format(new Date(Date.now()+86400000));
 const meals=['breakfast','lunch','dinner'];
 const people=meals.map((meal,i)=>({id:'person-'+i,name:'Funcionario de prueba '+i,document:'1000'+i,role:'Vigilante',company:'SK',status:'Disponible',serviceGroup:'Personal'}));
 await context.addInitScript(()=>{localStorage.setItem('gestion-personal-v1-access','test-admin');localStorage.setItem('gestion-personal-login-mode-v1','admin')});
 await context.route('**/api/**',route=>route.fulfill({json:{people,events:[],discipline:[],meals:meals.map((meal,i)=>({personId:people[i].id,date,[meal]:1,[meal+'Location']:i===1?'Mina':'Casa'}))}}));
 await page.goto(process.env.LOGIN_TEST_URL||'http://127.0.0.1:4173');
 const shortcut=page.getByRole('button',{name:'ALIMENTOS',exact:true});
 await shortcut.click();
 await page.getByRole('heading',{name:'Alimentos de mañana · '+date.split('-').reverse().join('/')}).waitFor();
 await page.locator('.meal-report-count b').first().filter({hasText:'1'}).waitFor();
 assert.deepEqual(await page.locator('.meal-report-count b').allTextContents(),['1','1','1']);
 await page.getByRole('button',{name:/Almuerzo/}).click();
 assert.match(await page.locator('.meal-report-details:visible').innerText(),/Mina · Enviar/);
 await page.getByRole('button',{name:'Volver a la pantalla anterior'}).click();
 await shortcut.waitFor();
 await page.getByRole('button',{name:'GESTIONAR PERSONAL',exact:true}).click();
 await page.locator('.module-tabs').getByRole('button',{name:'Alimentos',exact:true}).click();
 const toggles=page.locator('.meal-report-toggle'),panels=page.locator('.meal-report-details');
 assert.equal(await toggles.count(),3);
 assert.deepEqual(await toggles.locator(':scope > span:first-child').allTextContents(),['Desayuno','Almuerzo','Comida']);
 for(const toggle of await toggles.all())assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 const boxes=await toggles.evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width}}));
 assert(boxes[0].y<boxes[1].y&&boxes[1].y<boxes[2].y,'Mobile reports are stacked in meal order');
 assert(boxes.every(box=>box.x===boxes[0].x&&box.width===boxes[0].width&&box.width>300),'Full-width mobile headings');
 await toggles.nth(0).click();assert(await panels.nth(0).isVisible());
 assert((await panels.nth(0).innerText()).includes(people[0].name));
 const panelBox=await panels.nth(0).boundingBox();assert(Math.abs(panelBox.width-boxes[0].width)<1,'Details use the entire meal card');
 await toggles.nth(1).click();assert.equal(await panels.nth(0).isVisible(),false);assert(await panels.nth(1).isVisible());
 assert((await panels.nth(1).innerText()).includes('Mina · Enviar'));
 await toggles.nth(1).click();assert.equal(await panels.nth(1).isVisible(),false);
 await toggles.nth(2).press('Space');assert(await panels.nth(2).isVisible());
 assert.equal(await page.locator('.meal-report-details:visible').count(),1);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);await context.close();
 console.log('PASS mobile admin meals: full-width ordered accordion, one open section, destination details and keyboard operation');
}
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
const breakfast=page.getByRole('checkbox',{name:'Desayuno',exact:true});
const breakfastDestinations=page.getByRole('group',{name:'Destino · Desayuno',exact:true});
assert.equal(await page.getByRole('radio').count(),6);
for(const radio of await page.getByRole('radio').all())assert.equal(await radio.isEnabled(),false);
for(const width of [320,360,390,1280]){
 await page.setViewportSize({width,height:844});
 const cards=await page.locator('.meal-choice').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right}}));
 assert.equal(cards.length,3);assert(cards[0].y<cards[1].y&&cards[1].y<cards[2].y,'Each meal has its own row at '+width);
 assert(cards.every(card=>card.x===cards[0].x&&card.right<=width),'Meal rows fit the viewport');
 const rows=await page.locator('.meal-choice').evaluateAll(nodes=>nodes.map(node=>[node.querySelector('.meal-check'),...node.querySelectorAll('.meal-locations label')].map(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,cy:r.y+r.height/2}})));
 for(const row of rows){
  assert.equal(row.length,3);assert(row[0].right<=row[1].x&&row[1].right<=row[2].x,'Casa and Mina stay to the right of the meal at '+width);
  assert(row.every(item=>Math.abs(item.cy-row[0].cy)<1),'Meal and destinations share one row at '+width);
 }
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow at '+width);
}
await breakfast.check();
assert.equal(await page.locator('input[type=radio]:visible').count(),6);
assert.equal(await page.locator('.meal-options-row input[type=radio]:enabled').count(),2);
await breakfastDestinations.getByRole('radio',{name:'Casa',exact:true}).check();
await breakfast.uncheck();
assert.equal(await breakfastDestinations.getByRole('radio',{name:'Casa',exact:true}).isEnabled(),false);
assert.equal(await breakfastDestinations.getByRole('radio',{name:'Casa',exact:true}).isChecked(),false);
await breakfast.check();
assert.equal(await breakfastDestinations.getByRole('radio',{name:'Casa',exact:true}).isChecked(),false);
assert.equal(await page.locator('.meal-report-card form').evaluate(form=>form.checkValidity()),false,'Selected meal requires a destination');
await breakfastDestinations.getByRole('radio',{name:'Casa',exact:true}).check();await page.getByRole('button',{name:'Guardar alimentos',exact:true}).click();await page.getByText('Reporte sincronizado.',{exact:true}).waitFor();assert.equal(saved.action,'meals');assert.equal(saved.breakfast,true);assert.equal(saved.breakfastLocation,'Casa');assert.equal(saved.personId,undefined);
await page.getByRole('button',{name:'Actualizar reporte',exact:true}).waitFor();
await page.reload();
await page.getByText('Ya hiciste un reporte de alimentos para esta fecha. ¿Deseas actualizarlo?',{exact:true}).waitFor();
await page.getByRole('button',{name:'Continuar',exact:true}).click();
assert.equal(await page.getByRole('checkbox',{name:'Desayuno',exact:true}).isChecked(),true);
const mine=breakfastDestinations.getByRole('radio',{name:'Mina',exact:true});
await mine.check();
const refresh=page.waitForResponse(response=>response.url().endsWith('/api/self')&&response.request().method()==='GET');
await page.evaluate(()=>window.dispatchEvent(new Event('online')));
await refresh;
assert.equal(await mine.isChecked(),true);
await page.getByRole('button',{name:'Actualizar reporte',exact:true}).click();
await page.getByText('Reporte sincronizado.',{exact:true}).waitFor();
assert.equal(saved.breakfastLocation,await mine.getAttribute('value'));
await page.evaluate(()=>{localStorage.removeItem('gestion-personal-self-session');localStorage.setItem('gestion-personal-v1-access','test-admin');localStorage.setItem('gestion-personal-login-mode-v1','admin')});await page.reload();await page.getByRole('button',{name:'GESTIONAR PERSONAL',exact:true}).click();await page.getByRole('button',{name:'Opciones de gestión'}).click();await page.getByRole('menuitemradio',{name:'Cocina',exact:true}).click();await page.getByRole('heading',{name:'Conductor',exact:true}).waitFor();assert.equal(await page.locator('tbody tr').filter({hasText:'Conductor Prueba'}).count(),0);await page.getByRole('button',{name:'Administrar acceso a alimentos'}).click();await page.getByText('ALIMENTOS · CONDUCTOR',{exact:true}).waitFor();assert.equal(await page.locator('legend').filter({hasText:'ADMINISTRADOR'}).count(),0);assert.deepEqual(errors,[]);
await page.setViewportSize({width:390,height:844});assert.equal(await page.getByRole('dialog').isVisible(),true);await checkMealRecovery(browser);await checkAdminMeals(browser);await browser.close();console.log('PASS conductor: own meals save, no novelties/activities/profile, final separate card and food-only invitation on desktop/mobile');
})().catch(e=>{console.error(e);process.exit(1)});
