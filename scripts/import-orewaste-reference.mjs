import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import proj4 from 'proj4';

const source=process.argv[2];
if(!source)throw new Error('Pass the source block_model.json path');
const raw=fs.readFileSync(source),data=JSON.parse(raw);
const shell=data.shells.find(s=>s.rf===1);
if(!shell?.blocks?.length)throw new Error('RF 1 block sample is unavailable');
const crs='+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs';
const blocks=shell.blocks.filter(b=>b.is_ore&&b.tgc>=3).map(b=>{
  const [lon,lat]=proj4(crs,'EPSG:4326',[b.x,b.y]);
  if(lon<38||lon>40||lat< -6||lat> -4)throw new Error('Source registration outside Tanga region');
  return [lon,lat,b.z,b.dx,b.dy,b.dz,b.tgc];
});
const output={
  provenance:{sourceFile:path.basename(source),sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),sourceTimestamp:data.meta.timestamp,scenarioRF:1,sourceCRS:'EPSG:32737 (inferred from Tanga UTM coordinates; regional sanity checked)',coordinates:'WGS84 lon,lat,elevation,dx,dy,dz,TGC',limitation:'Source shell block sample; footprint reference only. No tonnage, reserve or full-extraction claim.',benchDesign:shell.bench_plan?.design},
  blocks,
};
fs.mkdirSync('public/generated',{recursive:true});
fs.writeFileSync('public/generated/orewaste-reference.json',JSON.stringify(output));
console.log(JSON.stringify({referenceBlocks:blocks.length,source:output.provenance,bytes:fs.statSync('public/generated/orewaste-reference.json').size}));
