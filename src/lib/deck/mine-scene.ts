import * as THREE from 'three';
import {CONCEPT, inside, insetCrest, type CandidatePit, type Point2} from './site-planning';
import {addPlantDetail, batchPlantMeshes} from './mine-plant-detail';

/** Illustrative industrial campus: 400 × 280 local units, scaled to CONCEPT. */
export function buildConcentrator() {
  const root=new THREE.Group(); root.name='conceptual-concentrator';
  // The pad is a neutral reference surface, not a mapped material. Keep its
  // color steady as the camera moves; the buildings, equipment and terrain
  // retain physically shaded materials for depth.
  const materials={steel:new THREE.MeshStandardMaterial({color:0x77817e,metalness:0.34,roughness:0.65}),roof:new THREE.MeshStandardMaterial({color:0x3e4a49,roughness:0.82}),copper:new THREE.MeshStandardMaterial({color:0x987653,metalness:.16,roughness:0.68}),concrete:new THREE.MeshBasicMaterial({color:0x858278}),water:new THREE.MeshStandardMaterial({color:0x4d7478,metalness:0.04,roughness:0.44}),rock:new THREE.MeshLambertMaterial({color:0x756b5d})};
  const cladding=new THREE.MeshStandardMaterial({color:0x697572,roughness:.84,metalness:.08});
  cladding.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRoofPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRoofPoint=transformed;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vRoofPoint;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=0.94+0.06*smoothstep(-0.5,0.5,sin(vRoofPoint.x*4.0));');
  };
  cladding.customProgramCacheKey=()=> 'tanga-corrugated-roof-v1';
  function mesh(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,name=''){const a=new THREE.Mesh(g,m);a.position.set(x,y,z);a.name=name;a.castShadow=true;a.receiveShadow=true;root.add(a);return a;}
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material=materials.steel,name='')=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,name);
  const cylinder=(r:number,h:number,x:number,y:number,z:number,m:THREE.Material=materials.steel)=>mesh(new THREE.CylinderGeometry(r,r,h,24),m,x,y,z);
  // The pad and graded transition are placed against the existing terrain by
  // placeConcentrator. Avoid a second oversized slab beneath the whole campus:
  // it reads as a floating platform and hides the surrounding ground texture.
  box(400,3,280,0,0,0,materials.concrete,'Plant pad');
  // A perimeter service lane and drainage edge make the pad read as a site.
  box(392,.15,7,0,1.6,135,materials.roof,'Conceptual service lane');
  box(392,.15,5,0,1.6,-135,materials.roof,'Service lane');
  for(const x of [-195,195])box(4,.15,268,x,1.6,0,materials.roof);
  for(let x=-185;x<=185;x+=14)box(5,.08,.25,x,1.72,135,materials.concrete);
  // Roof panels, portal frames and side openings give each building a legible silhouette.
  function shed(name:string,x:number,z:number,w:number,d:number,h:number,stage?:string){
    const rise=d*.12,roofLength=Math.hypot(d/2,rise);
    for(const sign of [-1,1]){
      const roof=box(w,1.2,roofLength,x,h+rise/2,z+sign*d/4,cladding,name);
      roof.rotation.x=sign*Math.atan2(rise,d/2);
      roof.userData.plantRoof=true;
      if(stage)roof.userData.plantStage=stage;
    }
    for(let i=-w/2;i<=w/2;i+=w/4)for(const k of [-d/2,d/2])box(1.2,h,1.2,x+i,h/2,z+k,materials.copper);
    const frontPortal=stage==='feed'&&x===-88?{x:-104,width:12,height:23}:stage==='dewatering'?{x:104,width:12,height:20}:null;
    if(frontPortal){
      const left=frontPortal.x-frontPortal.width/2-(x-w/2),right=x+w/2-(frontPortal.x+frontPortal.width/2);
      box(left,h,d*.04,x-w/2+left/2,h/2,z+d/2,materials.steel);
      box(right,h,d*.04,x+w/2-right/2,h/2,z+d/2,materials.steel);
      box(frontPortal.width,h-frontPortal.height,d*.04,frontPortal.x,(h+frontPortal.height)/2,z+d/2,materials.steel);
    }else box(w,h,d*.04,x,h/2,z+d/2,materials.steel);
    // Clerestory glazing and end walls give industrial buildings volume.
    for(const sign of [-1,1]){
      if(stage){
        const portal=Math.min(24,d*.55),height=Math.min(h-4,22),side=(d-portal)/2;
        for(const edge of [-1,1])box(1,h,side,x+sign*w/2,h/2,z+edge*(portal+side)/2,materials.steel);
        box(1,h-height,portal,x+sign*w/2,(h+height)/2,z,materials.steel);
      }else box(1,h,d,x+sign*w/2,h/2,z,materials.steel);
    }
    for(let i=0;i<6;i++)box(w/9,3,.3,x-w*.4+i*w*.16,h-5,z+d/2+.5,materials.water,'High-level glazing');
  }
  // ROM / receiving and primary crushing.
  mesh(new THREE.ConeGeometry(22,14,32),materials.rock,-106,8,44,'ROM stockpile');
  box(22,12,18,-104,10,-16,materials.steel,'Feed bin');
  mesh(new THREE.CylinderGeometry(12,5,12,4),materials.copper,-104,21,-16,'Receiving hopper').rotation.y=Math.PI/4;
  shed('ROM & crushing',-88,-16,72,58,30,'feed');
  shed('Milling',-30,-18,48,45,27,'milling');
  const mill=cylinder(8,23,-30,12,-18);mill.rotation.z=Math.PI/2;mill.name='Milling process drum';mill.userData.preserveAnimation=true;root.userData.processMill=mill;
  // Longitudinal shell ribs provide scale and make rotation legible. Instances
  // stay attached to the drum and share its local cylinder axis.
  const millRibs=new THREE.InstancedMesh(new THREE.BoxGeometry(.55,23,.55),materials.roof,12);
  const ribTransform=new THREE.Matrix4();
  for(let i=0;i<12;i++){const angle=i*Math.PI/6;ribTransform.makeTranslation(Math.cos(angle)*8.1,0,Math.sin(angle)*8.1);millRibs.setMatrixAt(i,ribTransform);}
  millRibs.name='Mill shell stiffeners';millRibs.castShadow=true;mill.add(millRibs);
  // Flotation banks with agitator drives and a maintenance deck.
  for(let row=0;row<2;row++)for(let i=0;i<5;i++){
    const x=8+i*15,z=-36+row*24;
    box(12,10,16,x,7,z,materials.steel,'Flotation cell');
    box(10,0.4,14,x,12.2,z,materials.water);
    cylinder(1.1,9,x,14,z,materials.copper);box(4,3,4,x,20,z,materials.roof);
  }
  box(78,1,5,38,15,0,materials.steel);
  for(let x=0;x<80;x+=6)box(0.5,4,0.5,x,17,2,materials.copper);
  box(80,0.4,0.4,38,19,2,materials.copper);
  shed('Flotation',40,-36,88,60,24,'flotation');
  cylinder(17,9,103,6,-31);cylinder(16,0.4,103,10.7,-31,materials.water);
  box(34,1,2,103,12,-31,materials.copper); // thickener bridge
  shed('Dewatering / product handling',83,44,75,45,25,'dewatering');
  for(let i=0;i<9;i++)box(1,7,12,58+i*2.4,6,44,materials.steel,'Filter plates');
  for(let i=0;i<5;i++)box(7,6,7,92+i*8,5,51,materials.concrete,'Packaged product');
  shed('Workshop',-37,57,48,28,16);
  for(let i=0;i<3;i++)cylinder(7,15,-5+i*17,9,58,materials.water);
  // Secondary detail stays inside the approved pad: access stairs, tank
  // platforms and equipment supports, without suggesting an engineered layout.
  for(let step=0;step<15;step++)box(5,1,1.2,-1,2+step,20-step*1.2,materials.steel,'Flotation access stair');
  for(const x of [-4,2])for(let step=0;step<15;step+=3)box(.35,3,.35,x,4+step,20-step*1.2,materials.copper);
  for(let i=0;i<3;i++){
    const x=-5+i*17;
    cylinder(7.8,1,x,1.8,58,materials.concrete);
    cylinder(7.4,.4,x,16.7,58,materials.steel);
    for(let rung=0;rung<12;rung++)box(2,.25,.3,x,2+rung*1.2,65.4,materials.copper,'Tank access ladder');
    for(const side of [-1,1])box(.25,15,.25,x+side,9,65.4,materials.steel);
  }
  // Electrical kiosk and transformer bank in the clear north-west corner.
  shed('Electrical kiosk',-106,-58,24,16,11);
  for(let i=0;i<3;i++){
    box(5,5,7,-82+i*9,4,-58,materials.steel,'Transformer');
    for(let j=0;j<3;j++)cylinder(.45,2,-83+i*9+j,7.5,-58,materials.copper);
  }
  // Added operating areas expand the campus rather than stretching equipment.
  shed('Covered blending and feed hall',-85,-109,116,40,32,'feed');
  for(let i=0;i<3;i++)mesh(new THREE.ConeGeometry(13,12,16),materials.rock,-122+i*36,8,-108,'Covered feed stockpile');
  shed('Product storage and loadout',100,110,166,40,29,'product');
  shed('Maintenance and spares hall',-157,102,58,48,22);
  for(const z of [-32,30])mesh(new THREE.ConeGeometry(24,18,24),materials.rock,-163,10,z,'ROM receiving yard');
  // Second flotation train and reclaim-water thickener.
  for(let i=0;i<5;i++){
    box(12,10,18,5+i*17,7,-103,materials.steel,'Secondary flotation train');
    box(10,.4,16,5+i*17,12.3,-103,materials.water);
    cylinder(1,8,5+i*17,16,-103,materials.copper);
  }
  box(88,1,4,39,15,-88,materials.steel,'Flotation maintenance walkway');
  cylinder(23,11,164,7,-84);cylinder(22,.4,164,12.7,-84,materials.water);
  box(46,1.2,3,164,14,-84,materials.copper,'Reclaim thickener bridge');
  for(let i=0;i<4;i++)box(8,5,18,144+i*12,4,47,materials.roof,'Product shipping container');
  // Pipe-rack corridors and covered conveyors link the new operating areas.
  const campusLinks=[[-85,22,-89,-30,22,-40],[80,15,-103,142,15,-84],[164,15,-61,103,15,-31],[100,19,67,100,19,90]];
  for(const [ax,ay,az,bx,by,bz] of campusLinks){
    const a=new THREE.Vector3(ax,ay,az),b=new THREE.Vector3(bx,by,bz),v=b.clone().sub(a);
    const belt=box(4,v.length(),2,0,0,0,materials.copper,'Campus conveyor / pipe rack');
    belt.position.copy(a).add(b).multiplyScalar(.5);belt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
    for(let t=.2;t<1;t+=.3){const p=a.clone().lerp(b,t);box(1,p.y,1,p.x,p.y/2,p.z,materials.steel);}
  }
  // Connected conveyors and pipe racks. Flow points are exposed for animation.
  const flow=[new THREE.Vector3(-106,10,44),new THREE.Vector3(-104,21,-16),new THREE.Vector3(-73,16,-16),new THREE.Vector3(-30,16,-18),new THREE.Vector3(8,16,-36),new THREE.Vector3(68,16,-36),new THREE.Vector3(103,14,-31),new THREE.Vector3(104,14,44),new THREE.Vector3(104,14,78),new THREE.Vector3(100,14,78),new THREE.Vector3(100,14,110)];
  for(let i=0;i<flow.length-1;i++){
    const a=flow[i],b=flow[i+1],v=b.clone().sub(a);
    const dryTransfer=i<3||i>=7;
    const belt=box(dryTransfer?5:1.4,v.length(),dryTransfer?2:1.4,0,0,0,dryTransfer?materials.roof:materials.copper);
    belt.position.copy(a).add(b).multiplyScalar(.5);belt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
    if(dryTransfer)for(let t=.2;t<1;t+=.3){const p=a.clone().lerp(b,t);box(1,p.y,1,p.x,p.y/2,p.z,materials.steel);}
  }
  root.userData.flow=flow;
  root.userData.labels=[['ROM / feed',-106,32,20],['Crushing & milling',-50,37,-20],['Flotation',40,30,-24],['Dewatering & product',95,35,45]];
  addPlantDetail(root, materials);
  // Supporting facilities occupy the southern service yard, clear of the process.
  shed('Administration and laboratory',-20,194,75,44,18);
  shed('Heavy vehicle workshop and spares',-155,194,115,58,24);
  for(const x of [-192,-155,-118])box(25,18,.4,x,9,223.3,materials.roof,'Workshop roller shutter bay');
  for(let i=0;i<6;i++)box(9,5,.4,-51+i*12,12,216.3,materials.water,'Administration glazing');
  for(const x of [50,100,150])box(23,21,.4,x,10.5,130.3,materials.steel,'Product warehouse loading door');
  for(let i=0;i<5;i++)box(4,.2,32,-190+i*15,1.5,194,materials.concrete,'Workshop service bay markings');
  box(90,2,65,144,1,193,materials.roof,'Lined site-water provision · illustrative');
  box(80,.4,55,144,2.2,193,materials.water,'Site water / reclaim allowance · not a TSF design');
  for(const x of [-246,246]){
    for(let z=-246;z<=246;z+=24)box(.7,5,.7,x,2.5,z,materials.steel,'Perimeter fence post');
    for(const y of [2,4.5])box(.4,.4,492,x,y,0,materials.steel,'Perimeter fence rail');
  }
  for(const z of [-246,246]){
    for(let x=-246;x<=246;x+=24)if(z<0||Math.abs(x)>40)box(.7,5,.7,x,2.5,z,materials.steel,'Perimeter fence post');
    for(const y of [2,4.5])for(const sign of [-1,1])box(206,.4,.4,sign*143,y,z,materials.steel,'Perimeter fence rail and gate opening');
  }
  for(let i=0;i<7;i++)box(18,.1,.6,-90+i*29,1,238,materials.roof,'Service yard centre markings');
  root.userData.siteServices=[-20,25,194];
  batchPlantMeshes(root);
  root.scale.set(CONCEPT.plantWidth/400,CONCEPT.plantWidth/400,CONCEPT.plantDepth/280);
  return root;
}

export type ConceptPad={x:number;z:number;width:number;depth:number;level:number;transition:number};

function padBlend(pad:ConceptPad,x:number,z:number){
  const distance=Math.max(0,Math.abs(x-pad.x)-pad.width/2,Math.abs(z-pad.z)-pad.depth/2);
  const t=Math.min(1,distance/pad.transition);return 1-t*t*(3-2*t);
}

export function conceptPadHeight(pad:ConceptPad,x:number,z:number,sourceHeight:number){
  const blend=padBlend(pad,x,z);return sourceHeight*(1-blend)+pad.level*blend;
}

/** An illustrative cut/fill display, never an engineered earthworks design.
 * Median ground level avoids a tall plinth perched above the entire hillside. */
export function placeConcentrator(root:THREE.Group,x:number,z:number,height:(x:number,z:number)=>number,footprint?:{width:number;depth:number}) {
  const width=footprint?.width??CONCEPT.plantWidth,depth=footprint?.depth??CONCEPT.plantDepth;
  const levels:number[]=[];
  for(let dx=-width/2;dx<=width/2;dx+=5)for(let dz=-depth/2;dz<=depth/2;dz+=5)levels.push(height(x+dx,z+dz));
  levels.sort((a,b)=>a-b);
  const level=levels[Math.floor(levels.length/2)]+1.5;
  const pad:ConceptPad={x,z,width,depth,level,transition:30};
  root.userData.conceptPad=pad;
  const vertices:number[]=[],earthworkColors:number[]=[];
  const ring=(distance:number)=>[[-width/2-distance,-depth/2-distance],[width/2+distance,-depth/2-distance],[width/2+distance,depth/2+distance],[-width/2-distance,depth/2+distance]];
  const vertex=(p:number[])=>[p[0]/root.scale.x,((height(x+p[0],z+p[1])*(1-padBlend(pad,x+p[0],z+p[1]))+level*padBlend(pad,x+p[0],z+p[1]))-level+.3)/root.scale.y,p[1]/root.scale.z];
  for(let strip=0;strip<6;strip++){
    const inner=ring(strip*5),outer=ring((strip+1)*5);
    for(let edge=0;edge<4;edge++){
      const next=(edge+1)%4,n=Math.ceil(Math.hypot(outer[next][0]-outer[edge][0],outer[next][1]-outer[edge][1])/5);
      const point=(r:number[][],t:number)=>[r[edge][0]+(r[next][0]-r[edge][0])*t,r[edge][1]+(r[next][1]-r[edge][1])*t];
      for(let i=0;i<n;i++){
        const innerA=point(inner,i/n),innerB=point(inner,(i+1)/n),outerA=point(outer,i/n),outerB=point(outer,(i+1)/n);
        const a=vertex(innerA),b=vertex(innerB),c=vertex(outerA),d=vertex(outerB);
        vertices.push(...a,...c,...b,...b,...c,...d);
        // Quiet, broad colour variation keeps this display-only cut/fill apron
        // from reading as a single plastic slab. It is a material treatment,
        // not mapped soil or a claim about local ground composition.
        for(const p of [innerA,outerA,innerB,innerB,outerA,outerB]){
          const mottling=.965+Math.sin(p[0]*.041+Math.sin(p[1]*.019))*Math.cos(p[1]*.037)*.026+Math.sin((p[0]+p[1])*.19)*.008;
          const color=new THREE.Color(0x766d5e).multiplyScalar(mottling);
          earthworkColors.push(color.r,color.g,color.b);
        }
      }
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(earthworkColors,3));geometry.computeVertexNormals();
  const earthworks=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true,side:THREE.DoubleSide}));
  earthworks.name='Illustrative cut and fill transition · not engineered';earthworks.receiveShadow=true;root.add(earthworks);
  root.position.set(x,level,z);return level;
}

function retainSourceTerrain(geometry:THREE.BufferGeometry){
  const position=geometry.getAttribute('position');
  if(position&&!geometry.userData.sourcePositions){
    const sourcePositions=new Float32Array(position.array);
    const sourcePositionAttribute=new THREE.BufferAttribute(sourcePositions,position.itemSize,position.normalized);
    geometry.userData.sourcePositions=sourcePositions;
    geometry.userData.sourcePositionAttribute=sourcePositionAttribute;
    geometry.userData.sourceBoundingSphere=geometry.boundingSphere?.clone()??null;
    const normal=geometry.getAttribute('normal');
    if(normal){
      const sourceNormalAttribute=new THREE.BufferAttribute(new Float32Array(normal.array),normal.itemSize,normal.normalized);
      geometry.userData.sourceNormalAttribute=sourceNormalAttribute;
    }
  }
}
function retainConceptTerrain(geometry:THREE.BufferGeometry){
  const position=geometry.getAttribute('position');
  const conceptPositions=new Float32Array(position.array);
  const conceptPositionAttribute=new THREE.BufferAttribute(conceptPositions,position.itemSize,position.normalized);
  geometry.userData.conceptPositions=conceptPositions;
  geometry.userData.conceptPositionAttribute=conceptPositionAttribute;
  geometry.userData.conceptBoundingSphere=geometry.boundingSphere?.clone()??null;
  const normal=geometry.getAttribute('normal');
  if(normal){
    const conceptNormalAttribute=new THREE.BufferAttribute(new Float32Array(normal.array),normal.itemSize,normal.normalized);
    geometry.userData.conceptNormalAttribute=conceptNormalAttribute;
  }
  geometry.userData.conceptVisible=undefined;
}
export function gradeConceptPad(geometry:THREE.BufferGeometry,pad:ConceptPad){
  const position=geometry.getAttribute('position');if(!position)return;
  retainSourceTerrain(geometry);
  for(let i=0;i<position.count;i++){
    const blend=padBlend(pad,position.getX(i),position.getZ(i));
    if(blend>0)position.setY(i,position.getY(i)*(1-blend)+pad.level*blend);
  }
  position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();retainConceptTerrain(geometry);
}
export function showConceptTerrain(geometry:THREE.BufferGeometry,show:boolean){
  if(!geometry.userData.sourcePositions||!geometry.userData.conceptPositions||geometry.userData.conceptVisible===show)return;
  const position=show?geometry.userData.conceptPositionAttribute:geometry.userData.sourcePositionAttribute;
  const normal=show?geometry.userData.conceptNormalAttribute:geometry.userData.sourceNormalAttribute;
  if(position)geometry.setAttribute('position',position);
  if(normal)geometry.setAttribute('normal',normal);
  geometry.boundingSphere=show?geometry.userData.conceptBoundingSphere:geometry.userData.sourceBoundingSphere;
  geometry.userData.conceptVisible=show;
}

export function pitHeight(p:Point2,pit:CandidatePit) {
  if(!inside(p,pit.ring))return null;
  // Minimum distance to crest segments: stable for concave boundaries too.
  let distance=Infinity;
  pit.ring.forEach((a,i)=>{const b=pit.ring[(i+1)%pit.ring.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));distance=Math.min(distance,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz));});
  const bench=CONCEPT.bench,run=bench/Math.tan(CONCEPT.batterDegrees*Math.PI/180)+CONCEPT.berm;
  const level=Math.floor(distance/run),within=distance-level*run;
  return Math.max(pit.floor,pit.surface-level*bench-Math.min(bench,within*Math.tan(CONCEPT.batterDegrees*Math.PI/180)));
}
export function carvePit(geometry:THREE.BufferGeometry,pits:CandidatePit[]) {
  const position=geometry.getAttribute('position');if(!position)return;
  retainSourceTerrain(geometry);
  for(let i=0;i<position.count;i++){const p:Point2=[position.getX(i),position.getZ(i)];for(const pit of pits){const y=pitHeight(p,pit);if(y!==null)position.setY(i,Math.min(position.getY(i),y));}}
  position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();retainConceptTerrain(geometry);
}
/** Exact contour bands eliminate the staircase aliasing of a clipped XY grid. */
export function buildPitSurface(pit:CandidatePit,height:(x:number,z:number)=>number) {
  const positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const sample = (ring:Point2[]) => ring.flatMap((a,i) => {
    const b=ring[(i+1)%ring.length],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/12));
    return Array.from({length:n},(_,j)=>[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n] as Point2);
  });
  function band(outer:Point2[],inner:Point2[],upper:number,lower:number,tone:number) {
    const a=sample(outer),b=inner.length?sample(inner):[];
    const vertices=[...a,...b],base=positions.length/3,color=new THREE.Color(tone);
    for(let i=0;i<vertices.length;i++){
      const [x,z]=vertices[i];
      positions.push(x,Math.min(height(x,z),i<a.length?upper:lower)+.6,z);
      colors.push(color.r,color.g,color.b);
    }
    const faces=THREE.ShapeUtils.triangulateShape(a.map(p=>new THREE.Vector2(...p)),b.length?[b.map(p=>new THREE.Vector2(...p))]:[]);
    for(const face of faces) indices.push(...face.map(i=>base+i));
  }
  let outer=pit.ring,distance=0,y=pit.surface;
  const slope=Math.tan(CONCEPT.batterDegrees*Math.PI/180);
  while(y>pit.floor+1e-6){
    const drop=Math.min(CONCEPT.bench,y-pit.floor);
    distance+=drop/slope;
    const toe=insetCrest(pit.ring,distance);
    if(toe.length<3)break;
    band(outer,toe,y,y-drop,0x997b59);y-=drop;outer=toe;
    if(y<=pit.floor+1e-6)break;
    distance+=CONCEPT.berm;
    const berm=insetCrest(pit.ring,distance);
    if(berm.length<3)break;
    band(outer,berm,y,y,0xc1a17a);outer=berm;
  }
  band(outer,[],y,y,0xa88b66);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x70675d,vertexColors:true,envMapIntensity:0.15,roughness:1,side:THREE.DoubleSide}));mesh.name='Terraced conceptual excavation';mesh.receiveShadow=true;mesh.castShadow=true;return mesh;
}

/**
 * A display-only access ribbon inside a candidate pit envelope. This is not a
 * sourced alignment, engineered haul road, or geotechnically checked grade.
 */
export function buildConceptualPitRamp(pit:CandidatePit) {
  const centre=pit.centre;
  const radiusAt=(angle:number)=>{
    const direction:Point2=[Math.cos(angle),Math.sin(angle)];
    let nearest=Infinity;
    for(let i=0;i<pit.ring.length;i++){
      const a=pit.ring[i],b=pit.ring[(i+1)%pit.ring.length];
      const edge:Point2=[b[0]-a[0],b[1]-a[1]],relative:Point2=[a[0]-centre[0],a[1]-centre[1]];
      const denominator=direction[0]*edge[1]-direction[1]*edge[0];
      if(Math.abs(denominator)<1e-8)continue;
      const distance=(relative[0]*edge[1]-relative[1]*edge[0])/denominator;
      const along=(relative[0]*direction[1]-relative[1]*direction[0])/denominator;
      if(distance>0&&along>=-1e-7&&along<=1+1e-7)nearest=Math.min(nearest,distance);
    }
    return nearest;
  };
  const meanRadius=pit.ring.reduce((sum,point)=>sum+Math.hypot(point[0]-centre[0],point[1]-centre[1]),0)/pit.ring.length;
  const emptyRamp=()=>{
    const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial());
    mesh.name='Illustrative internal pit access ramp · not engineered';mesh.visible=false;return mesh;
  };
  if(!Number.isFinite(meanRadius)||meanRadius<24||pit.depth<=0)return emptyRamp();
  const turns=Math.min(5,Math.max(1,pit.depth/(.095*Math.PI*2*meanRadius*.58)));
  const steps=Math.max(160,Math.ceil(turns*128)),halfWidth=Math.max(5,Math.min(7,CONCEPT.berm*1.05));
  const path:THREE.Vector3[]=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps,angle=-Math.PI/2+t*turns*Math.PI*2,outerRadius=radiusAt(angle);
    if(!Number.isFinite(outerRadius))continue;
    const radial=outerRadius*(.92-.58*t),x=centre[0]+Math.cos(angle)*radial,z=centre[1]+Math.sin(angle)*radial;
    const ground=pitHeight([x,z],pit)??pit.floor,designY=pit.surface-t*pit.depth*.96;
    path.push(new THREE.Vector3(x,Math.max(ground+1.25,designY),z));
  }
  if(path.length<2)return emptyRamp();
  const positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const shoulder=new THREE.Color(0x48453e),runningSurface=new THREE.Color(0x625a4c);
  for(let i=0;i<path.length;i++){
    const before=path[Math.max(0,i-1)],after=path[Math.min(path.length-1,i+1)];
    const tangent=new THREE.Vector2(after.x-before.x,after.z-before.z).normalize();
    const normal=new THREE.Vector2(-tangent.y,tangent.x),point=path[i];
    for(const side of [-1,1]){
      const tone=side===-1?shoulder:runningSurface;
      positions.push(point.x+normal.x*halfWidth*side,point.y+.22,point.z+normal.y*halfWidth*side);
      colors.push(tone.r,tone.g,tone.b);
    }
    if(i<path.length-1){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const ramp=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));
  ramp.name='Illustrative internal pit access ramp · not engineered';
  ramp.renderOrder=41;ramp.castShadow=true;ramp.receiveShadow=true;
  // Keep the authored centreline with the display mesh so a single vehicle
  // cue can follow this same conceptual alignment without implying a road to
  // the receiving apron.
  ramp.userData.displayPath=path.map(point=>point.clone());
  return ramp;
}
