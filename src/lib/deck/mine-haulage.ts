import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {inside, contained, overlaps, rectangle, type Point2, type CandidatePit} from './site-planning';

/** Terrain-screened display corridor only; not an approved road alignment. */
export async function planHaulRoute(start:Point2,end:Point2,boundary:Point2[],pits:CandidatePit[],height:(x:number,z:number)=>number,audit?:(reason:string)=>void,cancelled:()=>boolean=()=>false) {
  // Only reject discontinuous terrain samples; this loose visual continuity
  // guard is not a road-gradient recommendation or design check.
  const step=30,width=18,maxLocalReliefRatio=.45;
  const validity=new Map<string,boolean>(),elevations=new Map<string,number>();
  const pointKey=(p:Point2)=>`${p[0].toFixed(4)},${p[1].toFixed(4)}`;
  const valid=(p:Point2)=>{const k=pointKey(p);if(validity.has(k))return validity.get(k)!;const result=(!boundary.length||contained(rectangle(p,width,width),boundary))&&!pits.some(pit=>overlaps(rectangle(p,width,width),pit.ring));validity.set(k,result);return result;};
  const elevation=(p:Point2)=>{const k=pointKey(p);if(!elevations.has(k))elevations.set(k,height(...p));return elevations.get(k)!;};
  const clear=(a:Point2,b:Point2)=>{
    const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/5));
    let prev=a;
    for(let i=0;i<=n;i++){
      const p:Point2=[a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n];
      if(!valid(p))return false;
      if(!Number.isFinite(elevation(p)))return false;
      if(i&&Math.abs(elevation(p)-elevation(prev))>maxLocalReliefRatio*Math.hypot(p[0]-prev[0],p[1]-prev[1])+1e-6)return false;
      prev=p;
    }
    return true;
  };
  if(!valid(start)||!valid(end)){audit?.(`Start valid: ${valid(start)}; end valid: ${valid(end)}`);return null;}
  const key=(x:number,z:number)=>`${x},${z}`;
  const point=(x:number,z:number):Point2=>[start[0]+x*step,start[1]+z*step];
  const open=[{x:0,z:0,g:0,f:0}],cost=new Map([['0,0',0]]),parent=new Map<string,string>();
  let finish:string|null=null;
  for(let count=0;open.length&&count<6000;count++){
    // Deterministic bounded search, yielding to navigation/rendering between batches.
    // A slow device must not silently produce a different site design.
    if(count%32===0){await new Promise<void>(resolve=>setTimeout(resolve,0));if(cancelled())return null;}
    open.sort((a,b)=>b.f-a.f);const cur=open.pop()!,k=key(cur.x,cur.z),p=point(cur.x,cur.z);
    if(cur.g!==cost.get(k))continue;
    if(Math.hypot(p[0]-end[0],p[1]-end[1])<step*1.5&&clear(p,end)){finish=k;break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const x=cur.x+dx,z=cur.z+dz,q=point(x,z),nk=key(x,z),g=cur.g+step*Math.hypot(dx,dz);
      if(g>=(cost.get(nk)??Infinity)||!clear(p,q))continue;
      cost.set(nk,g);parent.set(nk,k);open.push({x,z,g,f:g+Math.hypot(q[0]-end[0],q[1]-end[1])});
    }
  }
  if(!finish){audit?.(`No screened route; ${cost.size} reachable nodes`);return null;}
  const points:Point2[]=[end];let k:string|undefined=finish;
  while(k){const [x,z]=k.split(',').map(Number);points.push(point(x,z));k=parent.get(k);}
  points.reverse();
  const sampled=points.slice(1).flatMap((b,i)=>{const a=points[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/5));return Array.from({length:n},(_,j)=>[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n] as Point2);});
  sampled.push(end);
  audit?.(`Screened ${sampled.length} display samples with an 18 m corridor and a terrain-continuity guard (neither is an engineering design criterion)`);
  return sampled.map(p=>new THREE.Vector3(p[0],elevation(p)+1,p[1]));
}

export function buildHaulRoad(points:THREE.Vector3[]) {
  const group=new THREE.Group();group.name='Illustrative 18 m terrain-following haul corridor';
  const material=new THREE.MeshBasicMaterial({color:0x8a7b68,side:THREE.DoubleSide,toneMapped:false});
  const positions:number[]=[],indices:number[]=[];
  // Segment ribbons preserve the sampled polyline without smoothing it away.
  // One indexed mesh avoids a draw call for every terrain sample.
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],d=b.clone().sub(a),normal=new THREE.Vector3(-d.z,0,d.x).normalize().multiplyScalar(9);
    const base=positions.length/3;
    for(const vertex of [a.clone().add(normal),a.clone().sub(normal),b.clone().add(normal),b.clone().sub(normal)])positions.push(vertex.x,vertex.y,vertex.z);
    indices.push(base,base+1,base+2,base+2,base+1,base+3);
  }
  if(positions.length){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const road=new THREE.Mesh(geometry,material);road.name='Sampled terrain-following gravel road · illustrative';road.receiveShadow=false;road.castShadow=false;group.add(road);}
  return group;
}

export function buildHaulTruck() {
  const truck=new THREE.Group();truck.name='Illustrative haul truck';
  truck.userData.displayOnly=true;
  const body=new THREE.MeshStandardMaterial({color:0xc8873c,roughness:.88,metalness:0});
  const frame=new THREE.MeshStandardMaterial({color:0x303838,roughness:.96,metalness:0});
  const rubber=new THREE.MeshStandardMaterial({color:0x1d2222,roughness:1,metalness:0});
  const glass=new THREE.MeshStandardMaterial({color:0x31484a,roughness:.48,metalness:0.02});
  const lamp=new THREE.MeshBasicMaterial({color:0xe5d3a4,toneMapped:false});
  const marker=new THREE.MeshBasicMaterial({color:0xe2c389,toneMapped:false});
  const geometries=new Map<THREE.Material,THREE.BufferGeometry[]>();
  const componentCounts:Record<string,number>={};
  const add=(geometry:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,rx=0,ry=0,rz=0,name='')=>{
    const part=new THREE.Mesh(geometry,m);part.position.set(x,y,z);part.rotation.set(rx,ry,rz);part.updateMatrix();
    const bucket=geometries.get(m)??[];bucket.push(geometry.clone().applyMatrix4(part.matrix));geometries.set(m,bucket);
    geometry.dispose();componentCounts[name]=(componentCounts[name]??0)+1;
  };
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,name:string)=>{
    add(new THREE.BoxGeometry(w,h,d),m,x,y,z,0,0,0,name);
  };
  const cylinder=(radius:number,height:number,x:number,y:number,z:number,m:THREE.Material,name:string)=>{
    add(new THREE.CylinderGeometry(radius,radius,height,12),m,x,y,z,0,0,0,name);
  };
  // Six-wheel, high-clearance chassis. The front of the truck points toward +Z.
  box(4.8,1.15,9.6,0,1.55,0,frame,'Haul truck ladder chassis');
  for(const axleZ of [-3.7,-1.45,2.65])box(5.35,.34,.48,0,1.15,axleZ,frame,'Haul truck axle');
  for(const side of [-1,1])for(const axleZ of [-3.7,-1.45,2.65]){
    add(new THREE.CylinderGeometry(1.18,1.18,.82,14),rubber,side*2.55,1.25,axleZ,0,0,Math.PI/2,'Haul truck tire');
    add(new THREE.CylinderGeometry(.38,.38,.9,12),frame,side*2.55,1.25,axleZ,0,0,Math.PI/2,'Haul truck wheel hub');
  }
  // Low-sided dump body with a dark wear surface and reinforced outer panels.
  box(5.15,.32,6.3,0,3.02,-1.58,frame,'Haul truck dump-bed floor');
  for(const side of [-1,1]){
    box(.34,1.5,6.45,side*2.43,3.92,-1.55,body,'Haul truck dump-bed side');
    box(.14,.16,6.38,side*2.43,4.76,-1.55,frame,'Haul truck dump-bed top rail');
  }
  box(5.12,1.3,.34,0,3.82,-4.72,body,'Haul truck dump-bed tailgate');
  box(5.12,1.55,.34,0,3.92,1.58,body,'Haul truck dump-bed headboard');
  for(const side of [-1,1])for(const z of [-3.7,-.7,1.15])box(.42,.46,.48,side*2.42,3.05,z,frame,'Haul truck dump-body hinge');
  // Enclosed operator cab, front glazing, protected steps and access mirrors.
  box(3.65,2.55,2.85,0,4.28,2.72,body,'Haul truck operator cab');
  box(3.55,.28,3.0,0,5.72,2.72,frame,'Haul truck cab roof');
  box(3.1,1.02,.12,0,5.02,4.18,glass,'Haul truck windshield');
  for(const side of [-1,1]){
    box(.12,1.1,1.36,side*1.84,5.0,2.78,glass,'Haul truck side window');
    box(.18,.2,1.15,side*2.08,5.0,3.65,frame,'Haul truck mirror arm');
    box(.2,.55,.72,side*2.18,5.0,4.05,frame,'Haul truck side mirror');
    box(.28,.32,1.25,side*2.5,2.32,1.45,frame,'Haul truck access step');
  }
  cylinder(.19,2.0,-1.45,5.25,1.52,frame,'Haul truck exhaust stack');
  // Bumper, radiator grille and visible safety-light cues.
  box(5.65,.48,.65,0,1.08,4.98,frame,'Haul truck front bumper');
  box(2.2,.92,.12,0,2.52,4.92,frame,'Haul truck radiator grille');
  for(const side of [-1,1]){
    box(.5,.4,.15,side*1.45,2.72,4.96,lamp,'Haul truck headlamp');
    box(.4,.38,.16,side*2.2,3.82,-4.91,lamp,'Haul truck rear work lamp');
    box(.5,.22,.17,side*2.17,2.72,-4.93,marker,'Haul truck rear marker lamp');
  }
  truck.userData.componentCounts=componentCounts;
  truck.userData.components=Object.keys(componentCounts);
  for(const [material,parts] of geometries){
    const geometry=mergeGeometries(parts,false);
    for(const part of parts)part.dispose();
    if(!geometry)throw new Error('Unable to batch illustrative haul-truck detail');
    const mesh=new THREE.Mesh(geometry,material);mesh.name=`Illustrative haul truck · ${material.uuid===body.uuid?'safety body':material.uuid===frame.uuid?'chassis and fittings':material.uuid===rubber.uuid?'six tires':material.uuid===glass.uuid?'cab glazing':material.uuid===lamp.uuid?'work lamps':'safety markers'}`;
    mesh.castShadow=true;mesh.receiveShadow=true;truck.add(mesh);
  }
  return truck;
}

export function routePosition(points:THREE.Vector3[],distance:number) {
  for(let i=1;i<points.length;i++){const length=points[i].distanceTo(points[i-1]);if(distance<=length)return {position:points[i-1].clone().lerp(points[i],distance/(length||1)),direction:points[i].clone().sub(points[i-1]).normalize()};distance-=length;}
  return {position:points[points.length-1].clone(),direction:points[points.length-1].clone().sub(points[points.length-2]).normalize()};
}
