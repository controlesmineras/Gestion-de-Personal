const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const URL_BASE=process.env.LOGIN_TEST_URL||'http://127.0.0.1:4173/';
async function checkAdminShortcut(browser) {
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},hasTouch:true});
 const page=await context.newPage();
 let accessRole='Administrador';
 const person={id:'employee',document:'12345',name:'Funcionario de prueba',role:'Vigilante',company:'SK'};
 const token=Buffer.from(JSON.stringify({id:person.id,exp:Date.now()+3600000})).toString('base64')+'.test';
 const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota'}).format(new Date(Date.now()+86400000));
 const rootToken=Buffer.from(JSON.stringify({kind:'admin',username:'admin',exp:Date.now()+3600000})).toString('base64')+'.signed';
 const requests=[];
 await context.route('**/api/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  requests.push({path,method:request.method(),authorization:request.headers().authorization});
  if(path==='/api/admin-auth'){
   const {username,password}=request.postDataJSON();
   return route.fulfill(username==='admin'&&password==='password-correcta'?{json:{token:rootToken,username}}:{status:401,json:{error:'Credenciales incorrectas.'}});
  }
  const body=path==='/api/self'
   ? {person:{...person,accessRole},date,events:[],activities:[],meal:null}
   : {people:[person],events:[],discipline:[],meals:[]};
  await route.fulfill({json:body});
 });
 await context.addInitScript(session=>{if(!localStorage.getItem('gestion-personal-self-session'))localStorage.setItem('gestion-personal-self-session',session)},token);
 await page.goto(URL_BASE);
 const logo=page.getByRole('button',{name:'Ir a Administración',exact:true});
 const homeAdmin=page.getByRole('main').getByRole('button',{name:'Entrar a Administración',exact:true});
 await homeAdmin.tap();
 await page.getByRole('button',{name:'GESTIONAR PERSONAL',exact:true}).waitFor();
 await page.waitForFunction(()=>localStorage.getItem('gestion-personal-v1-cache')!==null);
 assert(requests.some(r=>r.path==='/api/data'&&r.authorization==='Bearer '+token));
 assert(requests.every(r=>r.method==='GET'));
 await page.reload();
 await page.getByRole('button',{name:'Ir a Seguridad',exact:true}).click();
 await homeAdmin.waitFor();
 await logo.tap();
 await page.getByRole('button',{name:'GESTIONAR PERSONAL',exact:true}).waitFor();
 await page.getByRole('button',{name:'Ir a Seguridad',exact:true}).click();
 await homeAdmin.waitFor();
 accessRole='Laboral';
 await page.reload();
 await page.getByRole('heading',{name:'Alimentos de mañana',exact:true}).waitFor();
 await homeAdmin.waitFor();
 assert.equal(await logo.count(),0);
 await page.locator('header .brand img').tap();
 await page.getByRole('heading',{name:'Alimentos de mañana',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'GESTIONAR PERSONAL',exact:true}).count(),0);
 // A separate root account proves its own credentials once, without logging the employee out.
 const manage=page.getByRole('button',{name:'GESTIONAR PERSONAL',exact:true});
 const back=page.getByRole('button',{name:'Ir a Seguridad',exact:true});
 await homeAdmin.tap();
 assert.equal(await page.getByLabel('Usuario',{exact:true}).inputValue(),'admin');
 assert(await page.getByLabel('Usuario',{exact:true}).getAttribute('readonly')!==null);
 await page.getByLabel('Contraseña',{exact:true}).fill('incorrecta');
 await page.getByRole('button',{name:'Entrar',exact:true}).tap();
 await page.getByRole('alert').filter({hasText:'Credenciales incorrectas.'}).waitFor();
 assert.equal(await manage.count(),0);
 await page.getByRole('button',{name:'Volver a Seguridad',exact:true}).tap();
 await homeAdmin.tap();
 await page.getByLabel('Contraseña',{exact:true}).fill('password-correcta');
 await page.getByRole('button',{name:'Entrar',exact:true}).tap();
 await manage.waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('gestion-personal-self-session')),token);
 await back.tap();
 await page.reload();
 await homeAdmin.tap();
 await manage.waitFor();
 assert.equal(requests.filter(r=>r.path==='/api/admin-auth').length,2);
 assert(requests.some(r=>r.path==='/api/data'&&r.authorization==='Bearer '+rootToken));
 await back.tap();
 await homeAdmin.waitFor();
 // A different employee session on the same device cannot reuse the previous pairing.
 const other=Buffer.from(JSON.stringify({id:'other',exp:Date.now()+3600000})).toString('base64')+'.other';
 await page.evaluate(session=>localStorage.setItem('gestion-personal-self-session',session),other);
 await page.reload();
 await homeAdmin.tap();
 await page.getByLabel('Contraseña',{exact:true}).waitFor();
 assert.equal(await manage.count(),0);
 await context.close();
 console.log('PASS personal/admin navigation: linked role, separate root sign-in, return, reload, rejected credentials and changed employee');
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const requests=[];
 await context.route('https://gestion-de-personal.nelsoncaste86.chatgpt.site/api/**',async route=>{
  const request=route.request();requests.push({url:request.url(),method:request.method(),body:request.postData()});
  await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'Credenciales incorrectas.'})});
 });
 await page.goto(URL_BASE);
 await page.getByRole('heading',{name:'SEGURIDAD',exact:true}).waitFor();
 await page.getByLabel('Número de documento').waitFor();
 await page.reload();await page.getByLabel('Número de documento').waitFor();
 const logo=page.getByRole('button',{name:'Logo de Gestión de Personal',exact:true});
 await logo.click();
 assert.equal(await page.getByLabel('Usuario',{exact:true}).count(),0);
 await page.waitForTimeout(1250);
 await page.getByLabel('Contraseña',{exact:true}).fill('temporary-value');
 await page.getByRole('button',{name:'Logo de Gestión de Personal',exact:true}).click({clickCount:3});
 await page.getByLabel('Usuario',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Contraseña',{exact:true}).inputValue(),'');
 await page.getByLabel('Usuario',{exact:true}).fill('123456');
 await page.getByLabel('Contraseña',{exact:true}).fill('wrong-password');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Credenciales incorrectas.'}).waitFor();
 assert(requests.some(request=>request.url.endsWith('/admin-auth')));
 assert.equal(await page.locator('.module-tabs').count(),0);
 await page.reload();await page.getByLabel('Número de documento').waitFor();
 await page.getByLabel('Número de documento').fill('123456');
 await page.getByLabel('Contraseña',{exact:true}).fill('wrong-password');
 await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Credenciales incorrectas.'}).waitFor();
 assert(requests.some(request=>request.url.endsWith('/self')&&request.method==='POST'));
 await page.goto(URL_BASE+'#setup=test-setup');await page.reload();
 await page.getByLabel('Confirmar contraseña').waitFor();
 assert.equal(await page.getByLabel('Usuario',{exact:true}).inputValue(),'admin');
 await page.goto(URL_BASE+'#activate=test-activation');await page.reload();
 await page.getByLabel('Número de documento').waitFor();
 await page.getByLabel('Confirmar contraseña').waitFor();
 await page.getByRole('button',{name:'Logo de Gestión de Personal',exact:true}).click({clickCount:3});
 assert.equal(await page.getByLabel('Confirmar contraseña').count(),0);
 await page.getByLabel('Usuario',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Volver a Seguridad',exact:true}).click();
 fs.mkdirSync('test-results/login',{recursive:true});
 for(const width of [360,390,1280]){
  await page.setViewportSize({width,height:850});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow at '+width);
  for(const name of ['Logo de Gestión de Personal']){
   const box=await page.getByRole('button',{name,exact:true}).boundingBox();
   assert(box&&box.width>=44&&box.height>=44&&box.x>=0&&box.x+box.width<=width,'Selector outside viewport');
  }
  await page.screenshot({path:'test-results/login/seguridad-'+width+'.png',fullPage:true});
 }
 await page.getByRole('button',{name:'Logo de Gestión de Personal',exact:true}).click({clickCount:3});
 await page.screenshot({path:'test-results/login/administrador.png',fullPage:true});
 await page.evaluate(()=>localStorage.clear());await page.reload();
 await page.getByRole('heading',{name:'SEGURIDAD',exact:true}).waitFor();
 await page.screenshot({path:'test-results/login/selector.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS browser: Security by default, administrator via logo, independent endpoints, rejected credentials, setup/activation, cleared passwords and mobile layout');
 await checkAdminShortcut(browser);
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
