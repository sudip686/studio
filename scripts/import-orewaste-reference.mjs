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
const terrain=shell.terrain;
if(!terrain?.is_pit?.length||!terrain.z_topo?.length||!terrain.z_pit?.length)throw new Error('RF 1 optimized pit surface is unavailable');
const benches=shell.bench_plan;
if(!benches?.is_pit?.length||!benches.bench_index?.length)throw new Error('RF 1 continuous bench layout is unavailable');
const ni=benches.is_pit.length,nj=benches.is_pit[0]?.length??0,seen=new Set(),components=[];
for(let i=0;i<ni;i++)for(let j=0;j<nj;j++){
  const start=`${i},${j}`;
  if(!benches.is_pit[i][j]||seen.has(start))continue;
  const queue=[[i,j]],cells=[];seen.add(start);
  for(let cursor=0;cursor<queue.length;cursor++){
    const [x,y]=queue[cursor];cells.push([x,y]);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;
      if(nx>=0&&nx<ni&&ny>=0&&ny<nj&&benches.is_pit[nx][ny]&&!seen.has(key)){seen.add(key);queue.push([nx,ny]);}
    }
  }
  components.push(cells);
}
function nearestGrid(grid,x,y){
  const i=Math.max(0,Math.min(grid.ni-1,Math.round((x-grid.x0)/grid.dx-.5)));
  const j=Math.max(0,Math.min(grid.nj-1,Math.round((y-grid.y0)/grid.dy-.5)));
  return [i,j];
}
const sourcePits=components.sort((a,b)=>b.length-a.length).slice(0,2).map(cells=>{
  const xs=cells.map(([i])=>i),ys=cells.map(([,j])=>j),i0=Math.min(...xs),i1=Math.max(...xs),j0=Math.min(...ys),j1=Math.max(...ys);
  const active=new Set(cells.map(([i,j])=>`${i-i0},${j-j0}`));
  const width=i1-i0+1,height=j1-j0+1;
  const elevations=Array.from({length:width},(_,i)=>Array.from({length:height},(_,j)=>{
    const [ti,tj]=nearestGrid(terrain,benches.x0+(i0+i+.5)*benches.dx,benches.y0+(j0+j+.5)*benches.dy);
    return {topography:terrain.z_topo[ti][tj],pitElevation:terrain.z_pit[ti][tj]};
  }));
  return {
    x0:benches.x0+i0*benches.dx,y0:benches.y0+j0*benches.dy,dx:benches.dx,dy:benches.dy,width,height,support:cells.length,
    benchIndex:Array.from({length:width},(_,i)=>Array.from({length:height},(_,j)=>benches.bench_index[i0+i][j0+j])),
    topography:elevations.map(column=>column.map(cell=>cell.topography)),
    pitElevation:elevations.map(column=>column.map(cell=>cell.pitElevation)),
    mask:Array.from({length:width},(_,i)=>Array.from({length:height},(_,j)=>active.has(`${i},${j}`)?1:0)),
  };
}).sort((a,b)=>(b.y0+(b.height-1)*b.dy/2)-(a.y0+(a.height-1)*a.dy/2));
if(sourcePits.length!==2)throw new Error(`Expected two RF 1 pit shells; found ${sourcePits.length}`);
const output={
  provenance:{sourceFile:path.basename(source),sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),sourceTimestamp:data.meta.timestamp,scenarioRF:1,sourceCRS:'EPSG:32737 (inferred from Tanga UTM coordinates; regional sanity checked)',coordinates:'WGS84 lon,lat,elevation,dx,dy,dz,TGC',limitation:'RF 1 optimized shell surface and source block cells from the mine-to-market planning model. Conceptual planning output; not a reserve or approved engineering design.',benchDesign:shell.bench_plan?.design},
  blocks,
  pitSurfaces:{crs:'EPSG:32737',coordinates:'UTM easting/northing/elevation metres',x0:benches.x0,y0:benches.y0,dx:benches.dx,dy:benches.dy,design:benches.design,components:sourcePits},
};
fs.mkdirSync('public/generated',{recursive:true});
fs.writeFileSync('public/generated/orewaste-reference.json',JSON.stringify(output));
console.log(JSON.stringify({referenceBlocks:blocks.length,pitCells:sourcePits.map(p=>p.support),pitBounds:sourcePits.map(p=>({x0:p.x0,y0:p.y0,width:p.width,height:p.height})),source:output.provenance,bytes:fs.statSync('public/generated/orewaste-reference.json').size}));
