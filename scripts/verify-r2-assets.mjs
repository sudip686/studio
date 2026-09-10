// Read-only by default. --repair-missing uploads only absent, referenced objects.
// Never overwrite a different remote object or expose credentials.
import {S3Client,HeadObjectCommand,PutObjectCommand} from '@aws-sdk/client-s3';
import {createReadStream,existsSync,statSync,openSync,readSync,closeSync} from 'node:fs';
import dotenv from 'dotenv';
dotenv.config({path:'.env.local',quiet:true});dotenv.config({quiet:true});
const keys=['geologicalModel.glb','earth.glb','height.bin','height_hires.bin','height_preview_1024.bin','terrain_meta.json','terrain_hires_meta.json','terrain_preview_meta.json','terrain_texture_hires.jpg','terrain_texture_8k.jpg','texture_rgb_8192.png','resource_model.bin','assay_data.geojson','lithology_data.geojson','BlockModel.geojson','generated/boundaries.geojson','generated/roads.geojson','generated/orewaste-reference.json','media/tanga-google-earth-intro-corrected-preview.mp4','media/tanga-first-slide-story-poster.jpg'];
const base=(process.env.NEXT_PUBLIC_ASSET_BASE_URL||'').replace(/\/$/,'');
if(!base||!process.env.R2_ACCOUNT_ID||!process.env.R2_ACCESS_KEY_ID||!process.env.R2_SECRET_ACCESS_KEY)throw Error('R2 configuration is incomplete');
const client=new S3Client({region:'auto',endpoint:`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}});
const Bucket='my-geo-assets',repair=process.argv.includes('--repair-missing');let failed=0;
const type=k=>k.endsWith('.glb')?'model/gltf-binary':k.endsWith('.json')||k.endsWith('.geojson')?'application/json':k.endsWith('.jpg')?'image/jpeg':k.endsWith('.png')?'image/png':k.endsWith('.mp4')?'video/mp4':'application/octet-stream';
for(const key of keys){try{
  const file=`public/${key}`,local=existsSync(file)?statSync(file).size:null;let remote;
  if(local!==null){const fd=openSync(file,'r'),prefix=Buffer.alloc(64);try{readSync(fd,prefix,0,64,0);}finally{closeSync(fd);}if(prefix.toString().startsWith('version https://git-lfs'))throw Error('Local file is an LFS pointer; repair refused');}
  try{remote=await client.send(new HeadObjectCommand({Bucket,Key:key}));}catch(e){if(e.$metadata?.httpStatusCode!==404)throw e;if(!repair||local===null)throw Error('Missing R2 object');
    await client.send(new PutObjectCommand({Bucket,Key:key,Body:createReadStream(file),ContentLength:local,ContentType:type(key),CacheControl:'public, max-age=3600'}));remote=await client.send(new HeadObjectCommand({Bucket,Key:key}));console.log(`UPLOADED ${key}`);
  }
  if(local!==null&&remote.ContentLength!==local)throw Error(`Size mismatch: local ${local}, R2 ${remote.ContentLength}; no overwrite performed`);
  const response=await fetch(`${base}/${key}`,{headers:{Range:'bytes=0-63',Origin:'https://studio-nine-rosy-71.vercel.app'},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error(`Public URL returned ${response.status}`);
  const reader=response.body.getReader(),prefix=await reader.read();await reader.cancel();
  const text=Buffer.from(prefix.value??[]).toString('utf8');
  if(text.startsWith('version https://git-lfs')||text.startsWith('<!DOCTYPE'))throw Error('Public response is a pointer or HTML, not asset data');
  const cors=response.headers.get('access-control-allow-origin');if(cors!=='*'&&cors!=='https://studio-nine-rosy-71.vercel.app')throw Error('Production browser CORS not allowed');
  if(key.endsWith('.glb')&&!text.startsWith('glTF'))throw Error('Invalid public GLB magic');
  console.log(`PASS ${key} · ${remote.ContentLength} bytes · public ${response.status} · CORS OK${local===null?' · remote-only (no local comparison)':''}`);
}catch(e){failed++;console.log(`FAIL ${key}: ${e.message}`);}}
console.log(`${keys.length-failed}/${keys.length} referenced R2 assets verified`);process.exitCode=failed?1:0;
