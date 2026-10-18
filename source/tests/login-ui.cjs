const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const URL_BASE=process.env.LOGIN_TEST_URL||'http://127.0.0.1:4173/';
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
 await page.getByText('Elige cómo deseas ingresar.').waitFor();
 assert.equal(await page.locator('input').count(),0);
 await page.getByRole('button',{name:'SEGURIDAD',exact:true}).click();
 await page.getByLabel('Número de documento').waitFor();
 assert.equal(await page.getByRole('button',{name:'SEGURIDAD',exact:true}).getAttribute('aria-pressed'),'true');
 await page.reload();await page.getByLabel('Número de documento').waitFor();
 await page.getByLabel('Contraseña',{exact:true}).fill('temporary-value');
 await page.getByRole('button',{name:'ADMINISTRADOR',exact:true}).click();
 await page.getByLabel('Usuario',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Contraseña',{exact:true}).inputValue(),'');
 await page.getByLabel('Usuario',{exact:true}).fill('123456');
 await page.getByLabel('Contraseña',{exact:true}).fill('wrong-password');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Credenciales incorrectas.'}).waitFor();
 assert(requests.some(request=>request.url.endsWith('/admin-auth')));
 assert.equal(await page.locator('.module-tabs').count(),0);
 await page.reload();await page.getByLabel('Usuario',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('gestion-personal-login-mode-v1')),'admin');
 await page.getByRole('button',{name:'SEGURIDAD',exact:true}).click();
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
 await page.getByRole('button',{name:'ADMINISTRADOR',exact:true}).click();
 assert.equal(await page.getByLabel('Confirmar contraseña').count(),0);
 await page.getByLabel('Usuario',{exact:true}).waitFor();
 await page.getByRole('button',{name:'SEGURIDAD',exact:true}).click();
 fs.mkdirSync('test-results/login',{recursive:true});
 for(const width of [360,390,1280]){
  await page.setViewportSize({width,height:850});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow at '+width);
  for(const name of ['ADMINISTRADOR','SEGURIDAD']){
   const box=await page.getByRole('button',{name,exact:true}).boundingBox();
   assert(box&&box.width>100&&box.height>=44&&box.x>=0&&box.x+box.width<=width,'Selector outside viewport');
  }
  await page.screenshot({path:'test-results/login/seguridad-'+width+'.png',fullPage:true});
 }
 await page.getByRole('button',{name:'ADMINISTRADOR',exact:true}).click();
 await page.screenshot({path:'test-results/login/administrador.png',fullPage:true});
 await page.evaluate(()=>localStorage.clear());await page.reload();
 await page.getByText('Elige cómo deseas ingresar.').waitFor();
 await page.screenshot({path:'test-results/login/selector.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS browser: selector before fields, both saved modes, independent endpoints, rejected credentials, setup/activation, cleared passwords and mobile layout');
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
