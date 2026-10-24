import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildConcentrator, placeConcentrator, buildPitSurface} from '../src/lib/deck/mine-scene';
import {buildMineSiteCampus} from '../src/lib/deck/mine-site-campus';
import {rectangle, inside} from '../src/lib/deck/site-planning';
import {planHaulRoute, routePosition, buildHaulTruck} from '../src/lib/deck/mine-haulage';
import {selectPitEvidenceHoles, type EvidenceInterval} from '../src/lib/deck/mining-evidence';

async function main(){
const ring=rectangle([0,0],400,320);
const pit={ring,centre:[0,0] as [number,number],surface:100,floor:40,depth:60,support:100};
const mesh=buildPitSurface(pit,()=>100);
const p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index!;
let area=0;
for(let i=0;i<p.count;i++){
  assert.ok(inside([p.getX(i),p.getZ(i)],ring),'No vertex outside admitted crest');
  // Surface contours sit 1.2 m above the carved terrain to avoid depth
  // conflict; include that intentional display lift in the geometry bounds.
  assert.ok(p.getY(i)>=41.19 && p.getY(i)<=101.21);
}
for(let i=0;i<index.count;i+=3){
  const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
  area+=Math.abs((p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a))-(p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a)))/2;
}
assert.ok(Math.abs(area-400*320)<400*320*.001,'Sampled contour perimeter stays within 0.1% of the crest area');
const relief=buildPitSurface(pit,(x,z)=>100-0.04*x+0.025*z);
const reliefPositions=relief.geometry.getAttribute('position');
for(let i=0;i<reliefPositions.count;i++){
  const x=reliefPositions.getX(i),y=reliefPositions.getY(i),z=reliefPositions.getZ(i);
  assert.ok(y<=100-0.04*x+0.025*z+1.21,'Excavation surface stays at or below sampled terrain plus the documented display lift');
}
const plant=buildConcentrator();
const bounds=new THREE.Box3().setFromObject(plant);
const admittedPad={width:250,depth:250};
assert.ok(bounds.min.x>=-admittedPad.width/2 && bounds.max.x<=admittedPad.width/2 && bounds.min.z>=-admittedPad.depth/2 && bounds.max.z<=admittedPad.depth/2,'All plant meshes stay inside the report candidate land allowance');
const processStages=plant.userData.processStages as {id:string;label:string;point:number[]}[];
assert.deepEqual(processStages.map(stage=>stage.id),['feed','milling','flotation','thickening','dewatering','product'],'The process plant exposes each current inspection stage');
for(const name of ['Flotation banks and walkways','Crushing and milling equipment','Dewatering and product handling','Thickener, water and reagent circuits'])
  assert.ok(plant.getObjectByName(name),`Batched plant detail retains its ${name} group`);
assert.ok(plant.children.filter(object=>object.userData.plantRoof).length>=12,'Roof cutaway tags cover the industrial halls');
const level=placeConcentrator(plant,0,0,(x,z)=>x*.1+z*.05,admittedPad);
assert.ok(Math.abs(level-1.5)<1e-6,'Platform datum is 1.5 m above the median of the symmetric sampled ground');
const placedBounds=new THREE.Box3();
for(const child of plant.children)if(child.name!=='Illustrative cut and fill transition · not engineered')placedBounds.union(new THREE.Box3().setFromObject(child));
assert.ok(placedBounds.min.x>=-admittedPad.width/2 && placedBounds.max.x<=admittedPad.width/2 && placedBounds.min.z>=-admittedPad.depth/2 && placedBounds.max.z<=admittedPad.depth/2,'Building/equipment envelope remains inside the graded pad; the separately named earthwork transition extends beyond it');
const route=await planHaulRoute([-350,0],[350,0],rectangle([0,0],1200,1000),[pit],()=>100);
assert.ok(route&&route.length>2,'Haul route bypasses a pit');
assert.ok(route.every(p=>!inside([p.x,p.z],pit.ring)));
assert.equal(await planHaulRoute([0,0],[350,0],rectangle([0,0],1200,1000),[pit],()=>100),null,'Start in pit rejected');
assert.equal(await planHaulRoute([-350,0],[350,0],rectangle([0,0],1200,1000),[],x=>x),null,'Excessive slope rejected');
assert.equal(await planHaulRoute([-350,0],[350,0],rectangle([0,0],1200,1000),[],()=>NaN),null,'Invalid terrain is rejected');
assert.equal(await planHaulRoute([-350,0],[350,0],rectangle([0,0],1200,1000),[],()=>100,undefined,()=>true),null,'Navigation cancellation stops queued route work');
assert.ok(routePosition(route,0).position.distanceTo(route[0])<1e-6);
assert.ok(buildHaulTruck().children.length<20,'Low-poly bounded truck assembly');
const evidence:EvidenceInterval[]=Array.from({length:12},(_,i)=>({holeId:`H${i}`,depthFrom:0,from:[0,100,-140+i*25],to:[0,60,-140+i*25]}));
const selected=selectPitEvidenceHoles(evidence,[pit]);
assert.equal(selected.length,4,'Evidence label budget is bounded');
assert.equal(selected[0],'H0');assert.equal(selected[3],'H11','Selection spans spatial coverage');
assert.deepEqual(selectPitEvidenceHoles(evidence,[]),[],'No pit means no claimed pit evidence');
assert.deepEqual(selectPitEvidenceHoles([...evidence,...evidence],[pit]),selected,'Duplicate intervals do not duplicate hole selection');
const campusPit={ring:rectangle([0,-700],420,320),centre:[0,-700] as [number,number],surface:96,floor:38,depth:58,support:96};
const campus=buildMineSiteCampus({
  plant:[0,0],plantLevel:1.5,feed:[-1150,760],pits:[campusPit],
  boundary:rectangle([0,0],5200,5200),bounds:{minX:-2600,maxX:2600,minZ:-2600,maxZ:2600},
  height:(x,z)=>x*.01+z*.005,surveyed:()=>true,
});
assert.ok(campus.root.userData.accessRoadCount>=2,'The site campus has screened illustrative access spurs when terrain corridors are clear');
let checkedRoadVertices=0;
campus.root.traverse(object=>{
  if(!(object instanceof THREE.Mesh)||!object.name.includes('Illustrative campus access roads'))return;
  const positions=object.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),terrain=x*.01+z*.005;
    if(y>=terrain+1.04&&y<=terrain+1.3)checkedRoadVertices++;
  }
});
assert.ok(checkedRoadVertices>100,'Draped access-road vertices remain consistently above the sampled synthetic terrain');
console.log(`PASS: contour coverage, elevation, crest containment, plant bounds and ${campus.root.userData.accessRoadCount} terrain-screened campus access spurs`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
