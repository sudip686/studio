import * as THREE from 'three';
import {CONCEPT, inside, insetCrest, type CandidatePit, type Point2} from './site-planning';

/** Illustrative industrial campus: 400 × 280 local units, scaled to CONCEPT. */
export function buildConcentrator() {
  const root=new THREE.Group(); root.name='conceptual-concentrator';
  const materials={steel:new THREE.MeshStandardMaterial({color:0x708590,metalness:0.55,roughness:0.45}),roof:new THREE.MeshStandardMaterial({color:0x243743,roughness:0.7}),copper:new THREE.MeshStandardMaterial({color:0xc7551b,roughness:0.5}),concrete:new THREE.MeshStandardMaterial({color:0x998b76,roughness:1}),water:new THREE.MeshStandardMaterial({color:0x267f88,metalness:0.2,roughness:0.2}),rock:new THREE.MeshStandardMaterial({color:0x544639,roughness:1})};
  function mesh(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,name=''){const a=new THREE.Mesh(g,m);a.position.set(x,y,z);a.name=name;a.castShadow=true;a.receiveShadow=true;root.add(a);return a;}
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m=materials.steel,name='')=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,name);
  const cylinder=(r:number,h:number,x:number,y:number,z:number,m=materials.steel)=>mesh(new THREE.CylinderGeometry(r,r,h,24),m,x,y,z);
  box(400,3,280,0,0,0,materials.concrete,'Plant pad');
  // A perimeter service lane and drainage edge make the pad read as a site.
  box(392,.15,7,0,1.6,135,materials.roof,'Conceptual service lane');
  box(392,.15,5,0,1.6,-135,materials.roof,'Service lane');
  for(const x of [-195,195])box(4,.15,268,x,1.6,0,materials.roof);
  for(let x=-185;x<=185;x+=14)box(5,.08,.25,x,1.72,135,materials.concrete);
  // Roof panels, portal frames and side openings give each building a legible silhouette.
  function shed(name:string,x:number,z:number,w:number,d:number,h:number){
    const rise=d*.12,roofLength=Math.hypot(d/2,rise);
    for(const sign of [-1,1]){
      const roof=box(w,1.2,roofLength,x,h+rise/2,z+sign*d/4,materials.roof,name);
      roof.rotation.x=sign*Math.atan2(rise,d/2);
      roof.userData.plantRoof=true;
    }
    for(let i=-w/2;i<=w/2;i+=w/4)for(const k of [-d/2,d/2])box(1.2,h,1.2,x+i,h/2,z+k,materials.copper);
    box(w,h,d*0.04,x,h/2,z+d/2,materials.steel);
    // Clerestory glazing and end walls give industrial buildings volume.
    for(const sign of [-1,1])box(1,h,d,x+sign*w/2,h/2,z,materials.steel);
    for(let i=0;i<6;i++)box(w/9,3,.3,x-w*.4+i*w*.16,h-5,z+d/2+.5,materials.water,'High-level glazing');
  }
  // ROM / receiving and primary crushing.
  mesh(new THREE.ConeGeometry(22,14,32),materials.rock,-106,8,44,'ROM stockpile');
  box(22,12,18,-104,10,-16,materials.steel,'Feed bin');
  mesh(new THREE.CylinderGeometry(12,5,12,4),materials.copper,-104,21,-16,'Receiving hopper').rotation.y=Math.PI/4;
  box(18,14,17,-73,10,-16,materials.roof,'Crushing');
  shed('Milling',-30,-18,48,45,27);
  const mill=cylinder(8,23,-30,12,-18);mill.rotation.z=Math.PI/2;
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
  cylinder(17,9,103,6,-31);cylinder(16,0.4,103,10.7,-31,materials.water);
  box(34,1,2,103,12,-31,materials.copper); // thickener bridge
  shed('Dewatering / product handling',83,44,75,45,25);
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
  shed('Covered blending and feed hall',-85,-109,116,40,32);
  for(let i=0;i<3;i++)mesh(new THREE.ConeGeometry(13,12,16),materials.rock,-122+i*36,8,-108,'Covered feed stockpile');
  shed('Product storage and loadout',100,110,166,40,29);
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
  const flow=[new THREE.Vector3(-106,10,44),new THREE.Vector3(-104,21,-16),new THREE.Vector3(-73,16,-16),new THREE.Vector3(-30,16,-18),new THREE.Vector3(8,16,-36),new THREE.Vector3(68,16,-36),new THREE.Vector3(103,14,-31),new THREE.Vector3(104,14,44)];
  for(let i=0;i<flow.length-1;i++){
    const a=flow[i],b=flow[i+1],v=b.clone().sub(a);
    const belt=box(i<3?5:1.4,v.length(),i<3?2:1.4,0,0,0,i<3?materials.roof:materials.copper);
    belt.position.copy(a).add(b).multiplyScalar(.5);belt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
    if(i<3)for(let t=.2;t<1;t+=.3){const p=a.clone().lerp(b,t);box(1,p.y,1,p.x,p.y/2,p.z,materials.steel);}
  }
  root.userData.flow=flow;
  root.userData.labels=[['ROM / feed',-106,32,20],['Crushing & milling',-50,37,-20],['Flotation',40,30,-24],['Dewatering & product',95,35,45]];
  root.scale.set(CONCEPT.plantWidth/400,CONCEPT.plantWidth/400,CONCEPT.plantDepth/280);
  return root;
}

/** Presentation-only level platform; not an earthworks or retaining-wall design. */
export function placeConcentrator(root:THREE.Group,x:number,z:number,height:(x:number,z:number)=>number) {
  let low=Infinity,high=-Infinity;
  for(let dx=-CONCEPT.plantWidth/2;dx<=CONCEPT.plantWidth/2;dx+=5)for(let dz=-CONCEPT.plantDepth/2;dz<=CONCEPT.plantDepth/2;dz+=5){
    const y=height(x+dx,z+dz);low=Math.min(low,y);high=Math.max(high,y);
  }
  const level=high+1.5;
  // Follow the actual sampled perimeter rather than extending a deep box beneath
  // every edge. This remains a retaining-platform illustration, not earthworks.
  const vertices:number[]=[];
  const corners:Point2[]=[[-CONCEPT.plantWidth/2,-CONCEPT.plantDepth/2],[CONCEPT.plantWidth/2,-CONCEPT.plantDepth/2],[CONCEPT.plantWidth/2,CONCEPT.plantDepth/2],[-CONCEPT.plantWidth/2,CONCEPT.plantDepth/2]];
  for(let edge=0;edge<4;edge++){
    const a=corners[edge],b=corners[(edge+1)%4],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/5);
    for(let i=0;i<n;i++){
      const points=[i/n,(i+1)/n].map(t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
      const [u,v]=points;
      const top=(p:number[])=>[p[0]/root.scale.x,0,p[1]/root.scale.z];
      const base=(p:number[])=>[p[0]/root.scale.x,(height(x+p[0],z+p[1])-level-2)/root.scale.y,p[1]/root.scale.z];
      vertices.push(...top(u),...base(u),...top(v),...top(v),...base(u),...base(v));
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const foundation=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x625647,roughness:1,side:THREE.DoubleSide}));
  foundation.name='Conceptual level platform foundation';
  foundation.receiveShadow=true;root.add(foundation);
  root.position.set(x,level,z);
  return level;
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
  for(let i=0;i<position.count;i++){const p:Point2=[position.getX(i),position.getZ(i)];for(const pit of pits){const y=pitHeight(p,pit);if(y!==null)position.setY(i,Math.min(position.getY(i),y));}}
  position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
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
