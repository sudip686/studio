import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildConcentrator, placeConcentrator, buildPitSurface, conceptPadHeight, type ConceptPad} from '../src/lib/deck/mine-scene';
import {buildMineSiteCampus} from '../src/lib/deck/mine-site-campus';
import {rectangle, inside} from '../src/lib/deck/site-planning';
import {planHaulRoute, routePosition, buildHaulTruck} from '../src/lib/deck/mine-haulage';
import {buildDevelopmentInfrastructure} from '../src/lib/deck/mine-development';
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
const stockpileMeshes:THREE.Mesh[]=[];
plant.traverse(object=>{if(object instanceof THREE.Mesh&&object.name.includes('ROM stockpiles'))stockpileMeshes.push(object);});
const detailedStockpileGroups=stockpileMeshes.filter(object=>object.geometry.getAttribute('position').count>6000);
assert.equal(detailedStockpileGroups.length,1,'The six conceptual ROM/covered-feed piles are grouped as a distinct scene layer');
const stockpileGeometry=detailedStockpileGroups[0].geometry;stockpileGeometry.computeBoundingBox();
const stockpilePositions=stockpileGeometry.getAttribute('position');
assert.ok(stockpileGeometry.getAttribute('color')&&stockpilePositions.count>6000,'Elongated piles use a detailed shaded mesh, not primitive cones');
assert.ok(stockpileGeometry.boundingBox!.getSize(new THREE.Vector3()).y>10,'Stockpile forms retain credible vertical relief');
assert.ok(Array.from(stockpilePositions.array).every(Number.isFinite),'Stockpile vertices remain finite after batching');
const stockpileMin=stockpileGeometry.boundingBox!.min.y,stockpileMax=stockpileGeometry.boundingBox!.max.y;
let crestVertices=0;
for(let i=0;i<stockpilePositions.count;i++)if(stockpilePositions.getY(i)>=stockpileMin+(stockpileMax-stockpileMin)*.9)crestVertices++;
assert.ok(crestVertices>80,'Stockpiles retain broad crests rather than pointed apices');
const processStages=plant.userData.processStages as {id:string;label:string;point:number[]}[];
assert.deepEqual(processStages.map(stage=>stage.id),['feed','milling','flotation','thickening','dewatering','product'],'The process plant exposes each current inspection stage');
for(const name of ['Flotation banks and walkways','Crushing and milling equipment','Dewatering and product handling','Thickener, water and reagent circuits'])
  assert.ok(plant.getObjectByName(name),`Batched plant detail retains its ${name} group`);
assert.ok(plant.children.filter(object=>object.userData.plantRoof).length>=12,'Roof cutaway tags cover the industrial halls');
const level=placeConcentrator(plant,0,0,(x,z)=>x*.1+z*.05,admittedPad);
assert.ok(Math.abs(level-1.5)<1e-6,'Platform datum is 1.5 m above the median of the symmetric sampled ground');
const transitionPad:ConceptPad={x:0,z:0,width:100,depth:100,level:10,transition:20};
const sideBlend=conceptPadHeight(transitionPad,55,50,0),cornerBlend=conceptPadHeight(transitionPad,55,55,0);
assert.ok(cornerBlend<sideBlend,'The earthwork transition follows a rounded distance around pad corners instead of square-axis blending');
assert.equal(conceptPadHeight(transitionPad,50,50,0),10,'The facility footprint remains level inside its rectangular land allowance');
const earthworks=plant.getObjectByName('Illustrative cut and fill transition · not engineered') as THREE.Mesh|undefined;
assert.ok(earthworks,'The site-conforming cut/fill transition remains separately identified');
assert.ok(earthworks.material instanceof THREE.MeshStandardMaterial,'The plant earthwork relief uses stable site-light shading rather than a flat unlit plate');
assert.equal(earthworks.material.roughness,.96,'The plant earthwork surface stays matte at presentation scale');
assert.equal(earthworks.material.transparent,true,'The conceptual apron allows registered terrain imagery to remain visible beneath it');
assert.equal(earthworks.material.opacity,.36,'The conceptual earth tint remains a restrained overlay');
assert.equal(earthworks.userData.surfaceLighting,'fixed site lighting; rough earth material; camera independent','Earthwork shading is camera-independent');
assert.equal(earthworks.receiveShadow,true,'The plant grading transition receives fixed site shadows for ground contact');
const earthworkPositions=earthworks.geometry.getAttribute('position');
assert.ok(Array.from(earthworkPositions.array).every(Number.isFinite),'Rounded terrain contours produce finite earthwork vertices');
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
const haulTruck=buildHaulTruck();
assert.ok(haulTruck.children.length<=6,'Detailed truck assembly is batched by material');
assert.ok(haulTruck.userData.components.includes('Haul truck windshield')&&haulTruck.userData.components.includes('Haul truck dump-bed tailgate'),'Truck has an enclosed cab and dump-body form');
assert.equal(haulTruck.userData.componentCounts['Haul truck tire'],6,'Haul truck has three axles');
haulTruck.updateMatrixWorld(true);
const truckBounds=new THREE.Box3().setFromObject(haulTruck),truckSize=truckBounds.getSize(new THREE.Vector3());
assert.ok(truckSize.x<=6.1&&truckSize.z<11&&truckSize.y<7,'Truck proportions remain within the screened concept envelope');
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
  height:(x,z)=>5*Math.sin(x/350)+4*Math.cos(z/420),surveyed:()=>true,
});
const campusGradingGroup=campus.root.getObjectByName('Illustrative plant grading') as THREE.Group|undefined;
const campusPlantGrading=campusGradingGroup?.children.find(object=>object instanceof THREE.Mesh) as THREE.Mesh|undefined;
assert.ok(campusPlantGrading?.material instanceof THREE.MeshStandardMaterial,'The campus grading band reveals the underlying registered terrain');
assert.equal((campusPlantGrading!.material as THREE.MeshStandardMaterial).opacity,.36,'The second plant grading layer does not restore an opaque terrain plate');
assert.equal(campusPlantGrading!.receiveShadow,true,'Campus grading follows the fixed site lighting');
assert.ok(campus.root.userData.accessRoadCount>=2,'The site campus has screened illustrative access spurs when terrain corridors are clear');
const swaleAudit=campus.root.userData.swaleDrapeAudit as {maximumSampleSpacingM:number;swales:{facilityId:string;sampleCount:number;maximumSegmentM:number}[]};
assert.equal(swaleAudit.swales.length,campus.root.userData.swaleCount,'Each rendered roadside swale has an exposed drape audit');
assert.ok(swaleAudit.swales.length>0&&swaleAudit.swales.every(item=>item.sampleCount>10&&item.maximumSegmentM<=swaleAudit.maximumSampleSpacingM),'Conceptual swale sections follow their screened road corridors at no more than 6 m spacing');
const swaleMeshes:THREE.Mesh[]=[];campus.root.traverse(object=>{if(object instanceof THREE.Mesh&&object.name==='Illustrative roadside swales · no drainage design')swaleMeshes.push(object);});
assert.ok(swaleMeshes.length>=2,'Conceptual swales retain separately inspectable earth banks and bed');
assert.ok(swaleMeshes.every(mesh=>Array.isArray(mesh.userData.tooltipItems)&&JSON.stringify(mesh.userData.tooltipItems).includes('No stormwater alignment')),'Swale inspection states that no stormwater design is sourced');
const facilityApronAudit=campus.root.userData.facilityApronDrapeAudit as {facilityId:string;nx:number;nz:number;triangleCount:number;maximumSampleSpacingM:number;maximumTriangleCentreErrorM:number}[];
assert.equal(facilityApronAudit.length,campus.facilities.length,'Every illustrative water, tailings and waste facility exposes a cleared-apron drape audit');
assert.ok(facilityApronAudit.every(item=>item.nx>2&&item.nz>2&&item.maximumSampleSpacingM<=2.01),'Rounded facility aprons follow sampled terrain on a maximum 2 m grid');
assert.ok(facilityApronAudit.every(item=>item.triangleCount>0&&item.triangleCount<2*item.nx*item.nz),'Facility aprons follow rounded landform footprints instead of forming full rectangular pads');
assert.ok(facilityApronAudit.every(item=>item.maximumTriangleCentreErrorM<.02),'Facility apron triangles stay within 0.02 m of synthetic rolling terrain at their centres');
const landformContourAudit=campus.root.userData.landformContourAudit as {pointsPerRing:number;maximumSegmentM:number};
assert.equal(landformContourAudit.pointsPerRing,304,'Rounded site landforms use a dense, matched perimeter for smooth berms and benches');
assert.ok(landformContourAudit.maximumSegmentM<=6,`Rounded landform contours stay within the 6 m terrain-drape spacing (${landformContourAudit.maximumSegmentM.toFixed(2)} m)`);
const tailingsProfileAudit=campus.root.userData.tailingsProfileAudit as {tierCount:number;intermediateBenchWidthM:number;totalRiseM:number;conceptual:boolean};
assert.deepEqual(tailingsProfileAudit,{tierCount:2,intermediateBenchWidthM:12,totalRiseM:12,conceptual:true},'Tailings concept retains its added terrace as explicitly illustrative geometry');
const fixedTerrainColorAudit=campus.root.userData.fixedTerrainColorAudit as {vertexCount:number;min:number;max:number;source:string};
assert.ok(fixedTerrainColorAudit.vertexCount>0&&fixedTerrainColorAudit.min<1&&fixedTerrainColorAudit.max>1,'Facility earthworks have restrained fixed-coordinate surface variation');
assert.ok(fixedTerrainColorAudit.min>=.91&&fixedTerrainColorAudit.max<=1.09,'Fixed-coordinate earthwork variation remains within an 18% total luminance range');
assert.equal(fixedTerrainColorAudit.source,'site-coordinate geometry; camera independent','Landform colors are baked from site geometry, not recalculated from the camera');
const variedSurfaces:THREE.Mesh[]=[];
campus.root.traverse(object=>{if(object instanceof THREE.Mesh&&object.material instanceof THREE.MeshBasicMaterial&&object.material.vertexColors)variedSurfaces.push(object);});
assert.ok(variedSurfaces.length>0&&variedSurfaces.every(object=>object.geometry.getAttribute('color')?.count===object.geometry.getAttribute('position').count),'Every vertex-colored landform retains a complete per-vertex color attribute after batching');
for(const object of variedSurfaces){const colors=object.geometry.getAttribute('color');assert.ok(Array.from(colors.array).every(Number.isFinite),'Batched landform color factors remain finite');}
const roadDrapeAudit=campus.root.userData.accessRoadDrapeAudit as {maximumSampleSpacingM:number;roads:{facilityId:string;sampleCount:number;maximumSegmentM:number}[]};
assert.equal(roadDrapeAudit.maximumSampleSpacingM,6,'Campus access roads use a dense terrain drape interval');
assert.equal(roadDrapeAudit.roads.length,campus.root.userData.accessRoadCount,'Every visible campus access spur has a drape audit');
assert.ok(roadDrapeAudit.roads.every(road=>road.sampleCount>2&&road.maximumSegmentM<=6),'Road centerline samples stay within the terrain drape spacing');
let checkedRoadVertices=0;
let maximumTriangleDrapeError=0;
campus.root.traverse(object=>{
  if(!(object instanceof THREE.Mesh)||!object.name.includes('Illustrative campus access roads'))return;
  const positions=object.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),terrain=5*Math.sin(x/350)+4*Math.cos(z/420);
    if(y>=terrain+1.04&&y<=terrain+1.3)checkedRoadVertices++;
  }
  if(!object.name.includes('Conceptual access surface'))return;
  for(let i=0;i+2<positions.count;i+=3){
    const x=(positions.getX(i)+positions.getX(i+1)+positions.getX(i+2))/3;
    const y=(positions.getY(i)+positions.getY(i+1)+positions.getY(i+2))/3;
    const z=(positions.getZ(i)+positions.getZ(i+1)+positions.getZ(i+2))/3;
    const terrain=5*Math.sin(x/350)+4*Math.cos(z/420);
    maximumTriangleDrapeError=Math.max(maximumTriangleDrapeError,Math.abs(y-terrain-1.15));
  }
});
assert.ok(checkedRoadVertices>100,'Draped access-road vertices remain consistently above the sampled synthetic terrain');
assert.ok(maximumTriangleDrapeError<0.02,`Road triangle interpolation follows rolling terrain (max error ${maximumTriangleDrapeError.toFixed(3)} m)`);
const development=buildDevelopmentInfrastructure([-500,300],[200,-100],(x,z)=>x*.01+z*.005,25);
const conveyorSupports=development.userData.conveyorSupports as {x:number;z:number;groundY:number;topY:number;height:number}[];
assert.equal(conveyorSupports.length,62,'Both sides of all 31 conceptual conveyor support stations have individual footings');
for(const support of conveyorSupports){
  const terrain=conceptPadHeight(development.userData.conceptPad as ConceptPad,support.x,support.z,support.x*.01+support.z*.005);
  assert.ok(Math.abs(support.groundY-terrain)<1e-9,'Each support footing uses terrain sampled at its own x/z coordinate');
  assert.ok(Math.abs(support.height-(support.topY-support.groundY))<1e-9,'Support height joins its own terrain footing to the conveyor crossbeam');
  assert.ok(support.height>=9.29,'Intermediate support maintains at least 9.3 m of conceptual conveyor clearance across the sampled cross-section');
}
console.log(`PASS: contour coverage, elevation, crest containment, plant bounds, ${roadDrapeAudit.roads.length} access spurs draped at ≤6 m with ${maximumTriangleDrapeError.toFixed(3)} m synthetic-terrain error and ${conveyorSupports.length} individually sampled conveyor footings`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
