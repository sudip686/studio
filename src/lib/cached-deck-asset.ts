/** Bounded, best-effort persistent cache for public geology assets only. */
export const DECK_ASSET_CACHE='tanga-public-3d-v2';
const TTL=24*60*60*1000;
const ALLOWED=/\/(geologicalModel\.glb|height_hires\.bin|terrain_context_512\.bin|survey_(height|coverage|slope)_hires\.bin|height_preview_1024\.bin|assay_data\.geojson|lithology_data\.geojson|BlockModel\.geojson|api\/block-model|terrain_(hires|preview)_meta\.json|terrain_texture_hires\.jpg)$/;
type PendingAsset={controller:AbortController;promise:Promise<Response>;consumers:number;settled:boolean;cancelled:boolean};
const pending=new Map<string,PendingAsset>();

function abortError(){return new DOMException('The asset request was cancelled','AbortError');}

function subscribe(job:PendingAsset,key:string,signal?:AbortSignal):Promise<Response>{
  if(signal?.aborted)return Promise.reject(abortError());
  job.consumers+=1;
  return new Promise((resolve,reject)=>{
    let finished=false;
    const finish=()=>{
      if(finished)return false;
      finished=true;
      signal?.removeEventListener('abort',onAbort);
      job.consumers=Math.max(0,job.consumers-1);
      return true;
    };
    const onAbort=()=>{
      if(!finish())return;
      reject(abortError());
      if(job.consumers===0&&!job.settled){
        job.cancelled=true;
        if(pending.get(key)===job)pending.delete(key);
        job.controller.abort();
      }
    };
    signal?.addEventListener('abort',onAbort,{once:true});
    job.promise.then(response=>{if(finish())resolve(response.clone());},error=>{if(finish())reject(error);});
  });
}

export async function cachedDeckAsset(url:string,init?:RequestInit):Promise<Response>{
  if(typeof window==='undefined'||!('caches' in window)||!ALLOWED.test(new URL(url,window.location.href).pathname))return fetch(url,init);
  if(init?.signal?.aborted)throw abortError();
  const key=new URL(url,window.location.href).href;
  const active=pending.get(key);if(active&&!active.cancelled)return subscribe(active,key,init?.signal??undefined);
  const controller=new AbortController();
  const load=async()=>{
    let cache:Cache|undefined;
    try{cache=await caches.open(DECK_ASSET_CACHE);const hit=await cache.match(key);if(controller.signal.aborted)throw abortError();if(hit&&Date.now()-Number(hit.headers.get('x-tanga-stored-at'))<TTL)return hit;}catch(error){if(controller.signal.aborted)throw error;/* Private browsing/quota restrictions must not block viewing. */}
    const response=await fetch(url,{...init,cache:'no-cache',signal:controller.signal});
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
  const job:PendingAsset={controller,promise:load(),consumers:0,settled:false,cancelled:false};
  pending.set(key,job);
  void job.promise.then(()=>{job.settled=true;if(pending.get(key)===job)pending.delete(key);},()=>{job.settled=true;if(pending.get(key)===job)pending.delete(key);});
  // Attach a rejection observer even when every consumer cancels before the
  // shared fetch rejects; each live consumer still receives the same error.
  void job.promise.catch(()=>{});
  return subscribe(job,key,init?.signal??undefined);
}
