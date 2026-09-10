import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildConcentrator, placeConcentrator, buildPitSurface} from '../src/lib/deck/mine-scene';
import {rectangle, inside, CONCEPT} from '../src/lib/deck/site-planning';
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
  assert.ok(p.getY(i)>=40.59 && p.getY(i)<=100.61);
}
for(let i=0;i<index.count;i+=3){
  const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
  area+=Math.abs((p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a))-(p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a)))/2;
}
assert.ok(Math.abs(area-400*320)<1,'Contour bands and floor cover the crest without projected gaps/overlap');
const plant=buildConcentrator();
const bounds=new THREE.Box3().setFromObject(plant);
assert.ok(bounds.min.x>=-CONCEPT.plantWidth/2 && bounds.max.x<=CONCEPT.plantWidth/2 && bounds.min.z>=-CONCEPT.plantDepth/2 && bounds.max.z<=CONCEPT.plantDepth/2,'All plant meshes stay inside the enlarged admitted pad');
assert.ok(plant.getObjectByName('Electrical kiosk'));
assert.ok(plant.getObjectByName('Flotation access stair'));
assert.ok(plant.getObjectByName('Covered blending and feed hall'));
assert.ok(plant.getObjectByName('Product storage and loadout'));
assert.ok(plant.getObjectByName('Secondary flotation train'));
assert.ok(plant.getObjectByName('Reclaim thickener bridge'));
assert.ok(plant.children.filter(object=>object.userData.plantRoof).length>=12,'Roof cutaway tags cover the industrial halls');
const level=placeConcentrator(plant,0,0,(x,z)=>x*.1+z*.05);
assert.ok(level>=CONCEPT.plantWidth*.05+CONCEPT.plantDepth*.025,'Platform clears the sampled ground');
const placedBounds=new THREE.Box3().setFromObject(plant);
assert.ok(placedBounds.min.x>=-CONCEPT.plantWidth/2 && placedBounds.max.x<=CONCEPT.plantWidth/2 && placedBounds.min.z>=-CONCEPT.plantDepth/2 && placedBounds.max.z<=CONCEPT.plantDepth/2);
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
console.log('PASS: contour coverage, elevation, crest containment and complete plant bounds');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
