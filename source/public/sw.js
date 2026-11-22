const CACHE='gestion-personal-shell-login-selector-index-C2wuBNjc.js';
const CORE=['./','./index.html',"./assets/index-C2wuBNjc.js","./assets/index-DQy1PlVq.css",'./favicon.svg','./manifest.webmanifest','./install-app.js'];
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(CORE.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('gestion-personal-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||request.headers.get('RSC'))return;
  // A version probe must reach the network, never report an offline shell as the latest version.
  if(url.searchParams.has('version')){event.respondWith(fetch(request,{cache:'no-store'}));return;}
  event.respondWith(fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}
    return response;
  }).catch(async()=>{
    const cached=await caches.match(request);
    if(cached)return cached;
    if(request.mode==='navigate')return await caches.match(new URL('./index.html',self.registration.scope).href)||Response.error();
    return Response.error();
  }));
});
