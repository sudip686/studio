/** Bounded, best-effort persistent cache for public geology assets only. */
export const DECK_ASSET_CACHE='tanga-public-3d-v1';
const TTL=24*60*60*1000;
const ALLOWED=/\/(geologicalModel\.glb|height_hires\.bin|height_preview_1024\.bin|assay_data\.geojson|lithology_data\.geojson|BlockModel\.geojson|api\/block-model|terrain_(hires|preview)_meta\.json|terrain_texture_hires\.jpg)$/;
const pending=new Map<string,Promise<Response>>();
export async function cachedDeckAsset(url:string,init?:RequestInit):Promise<Response>{
  if(typeof window==='undefined'||!('caches' in window)||!ALLOWED.test(new URL(url,window.location.href).pathname)||init?.signal)return fetch(url,init);
  const key=new URL(url,window.location.href).href;
  const active=pending.get(key);if(active)return (await active).clone();
  const load=async()=>{
    let cache:Cache|undefined;
    try{cache=await caches.open(DECK_ASSET_CACHE);const hit=await cache.match(key);if(hit&&Date.now()-Number(hit.headers.get('x-tanga-stored-at'))<TTL)return hit;}catch{/* Private browsing/quota restrictions must not block viewing. */}
    const response=await fetch(url,{...init,cache:'no-cache'});
    const type=response.headers.get('content-type')||'',length=Number(response.headers.get('content-length'));
    const invalid=type.includes('text/html')||(key.endsWith('.glb')&&length>0&&length<1024);
    if(response.ok&&response.status===200&&!invalid&&cache){
      const copy=response.clone(),headers=new Headers(copy.headers);headers.set('x-tanga-stored-at',String(Date.now()));
      // Fixed deck allowlist (~119 MB from R2); never cache failed responses.
      // Keep the shared request alive through the entire download/cache write,
      // so entering geology mid-preload does not start a second transfer.
      await cache.put(key,new Response(copy.body,{status:200,headers})).catch(()=>{});
    }
    return response;
  };
  const task=load();pending.set(key,task);
  try{return (await task).clone();}finally{pending.delete(key);}
}
