// Service worker: keeps the game's files on the player's device, so a second visit does not download ~45 MB again
// (GitHub Pages lets browsers keep files for only 10 minutes, and the route to github.io can be slow).
//  - models, pictures, sound: from the device cache if there; otherwise downloaded once and stored. A stored copy
//    is refreshed quietly in the background, so a changed file shows up on the next visit.
//  - the page, scripts and track data: from the network first so updates show at once, but if the network has not
//    answered within NET_WAIT_MS the stored copy is used.
const CACHE='grand-prix-v1';
const NET_WAIT_MS=3000;
const BINARY=/\.(glb|jpg|jpeg|png|webp|mp3|txt)$/i;

self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys()) if(k!==CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

function store(req,res){ if(res&&res.ok&&res.type==='basic'){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{}); } return res; }

// ask the server whether a stored file changed (a few bytes when it has not), and store the new one if it did
function refresh(req,hit){
  const h={}, tag=hit.headers.get('ETag'), mod=hit.headers.get('Last-Modified');
  if(tag)h['If-None-Match']=tag; else if(mod)h['If-Modified-Since']=mod; else return;
  fetch(req.url,{headers:h,cache:'no-store'}).then(r=>{ if(r.status===200)store(req,r); }).catch(()=>{});
}
async function cacheFirst(req){
  const hit=await caches.match(req,{ignoreSearch:true});
  if(hit){ refresh(req,hit); return hit; }
  return store(req,await fetch(req));
}
async function networkFirst(req){
  const net=fetch(req).then(r=>store(req,r));
  const hit=await caches.match(req,{ignoreSearch:true});
  if(!hit) return net;
  return Promise.race([net.catch(()=>hit),new Promise(r=>setTimeout(()=>r(hit),NET_WAIT_MS))]);
}

self.addEventListener('fetch',e=>{
  const req=e.request, url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin)return; // three.js and fonts come from CDNs; leave them alone
  if(url.pathname.endsWith('/music.mp3'))return; // optional file, usually missing: do not cache the 404
  e.respondWith(BINARY.test(url.pathname)?cacheFirst(req):networkFirst(req));
});
