import * as THREE from 'three';
import {inside, contained, overlaps, rectangle, type Point2, type CandidatePit} from './site-planning';

/** Illustrative rim-to-receiving haulage, not an engineered pit ramp. */
export async function planHaulRoute(start:Point2,end:Point2,boundary:Point2[],pits:CandidatePit[],height:(x:number,z:number)=>number,audit?:(reason:string)=>void,cancelled:()=>boolean=()=>false) {
  const step=30,width=18,maxGrade=.2;
  const validity=new Map<string,boolean>(),elevations=new Map<string,number>();
  const pointKey=(p:Point2)=>`${p[0].toFixed(4)},${p[1].toFixed(4)}`;
  const valid=(p:Point2)=>{const k=pointKey(p);if(validity.has(k))return validity.get(k)!;const result=contained(rectangle(p,width,width),boundary)&&!pits.some(pit=>overlaps(rectangle(p,width,width),pit.ring));validity.set(k,result);return result;};
  const elevation=(p:Point2)=>{const k=pointKey(p);if(!elevations.has(k))elevations.set(k,height(...p));return elevations.get(k)!;};
  const clear=(a:Point2,b:Point2)=>{
    const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/5));
    let prev=a;
    for(let i=0;i<=n;i++){
      const p:Point2=[a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n];
      if(!valid(p))return false;
      if(!Number.isFinite(elevation(p)))return false;
      if(i&&Math.abs(elevation(p)-elevation(prev))>maxGrade*Math.hypot(p[0]-prev[0],p[1]-prev[1])+1e-6)return false;
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
  audit?.(`Screened ${sampled.length} route samples; 18 m corridor, ≤20% grade`);
  return sampled.map(p=>new THREE.Vector3(p[0],elevation(p)+1,p[1]));
}

export function buildHaulRoad(points:THREE.Vector3[]) {
  const group=new THREE.Group();group.name='Illustrative 18 m rim haul corridor';
  const material=new THREE.MeshStandardMaterial({color:0x776958,roughness:1,side:THREE.DoubleSide});
  // Segment ribbons preserve the validated polyline rather than smoothing outside it.
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],d=b.clone().sub(a),normal=new THREE.Vector3(-d.z,0,d.x).normalize().multiplyScalar(9);
    const vertices=[a.clone().add(normal),a.clone().sub(normal),b.clone().add(normal),b.clone().sub(normal)];
    const geometry=new THREE.BufferGeometry().setFromPoints(vertices);geometry.setIndex([0,1,2,2,1,3]);geometry.computeVertexNormals();
    group.add(new THREE.Mesh(geometry,material));
  }
  return group;
}

export function buildHaulTruck() {
  const truck=new THREE.Group();truck.name='Illustrative haul truck';
  const copper=new THREE.MeshStandardMaterial({color:0xd98539,roughness:.75});
  const dark=new THREE.MeshStandardMaterial({color:0x182128,roughness:.9});
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material)=>{const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);a.position.set(x,y,z);truck.add(a);};
  box(5,1,10,0,2,0,dark);box(4.5,3,3,0,4,3,copper);box(4,1.2,.15,0,4.7,4.6,dark);
  box(5.5,1,6,0,3,-1.5,copper);
  for(const x of [-2.6,2.6])box(.4,2,6,x,4,-1.5,copper);
  box(5.5,2,.4,0,4,-4.5,copper);
  for(const x of [-2.8,2.8])for(const z of [-3,2.5]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,1,8),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(x,1.5,z);truck.add(wheel);}
  return truck;
}

export function routePosition(points:THREE.Vector3[],distance:number) {
  for(let i=1;i<points.length;i++){const length=points[i].distanceTo(points[i-1]);if(distance<=length)return {position:points[i-1].clone().lerp(points[i],distance/(length||1)),direction:points[i].clone().sub(points[i-1]).normalize()};distance-=length;}
  return {position:points[points.length-1].clone(),direction:points[points.length-1].clone().sub(points[points.length-2]).normalize()};
}
