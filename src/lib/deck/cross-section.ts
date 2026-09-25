import * as THREE from 'three';
import {inside, type CandidatePit, type Point2} from './site-planning';
import {pitHeight} from './mine-scene';

export type SectionDefinition={id:string;title:string;ends:[string,string];origin:Point2;along:Point2;min:number;max:number;azimuth:number};
export type SectionUnit={name:string;color:string;geometry:THREE.BufferGeometry};
export type SectionDrill={holeId:string;from:[number,number,number];to:[number,number,number];carbon:number;depthFrom:number;depthTo:number};
export type SectionBlock={x:number;y:number;z:number;dx:number;dy:number;dz:number;carbon:number};
export type SectionSource={units:SectionUnit[];drills:SectionDrill[];blocks:SectionBlock[];pits:CandidatePit[];boundary:Point2[];height:(x:number,z:number)=>number};
export type SectionPoint=[number,number]; // distance along plane, absolute elevation
export type SectionSegment=[SectionPoint,SectionPoint];
const EPS=.01;
function simpleRing(ring:SectionPoint[]){
  const cross=(a:SectionPoint,b:SectionPoint,c:SectionPoint)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  for(let i=0;i<ring.length;i++)for(let j=i+2;j<ring.length;j++){
    if(i===0&&j===ring.length-1)continue;
    const a=ring[i],b=ring[(i+1)%ring.length],c=ring[j],d=ring[(j+1)%ring.length];
    if(Math.max(a[0],b[0])<Math.min(c[0],d[0])||Math.max(c[0],d[0])<Math.min(a[0],b[0])||Math.max(a[1],b[1])<Math.min(c[1],d[1])||Math.max(c[1],d[1])<Math.min(a[1],b[1]))continue;
    if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0)return false;
  }
  return true;
}
export const sectionDistance=(p:Point2,s:SectionDefinition)=>(p[0]-s.origin[0])*s.along[0]+(p[1]-s.origin[1])*s.along[1];
export const planeDistance=(p:Point2,s:SectionDefinition)=>-(p[0]-s.origin[0])*s.along[1]+(p[1]-s.origin[1])*s.along[0];
export const sectionWorld=(s:SectionDefinition,u:number):Point2=>[s.origin[0]+u*s.along[0],s.origin[1]+u*s.along[1]];

/** Translate a viewing plane, keeping its connected trace inside the unchanged boundary. */
export function offsetSection(base:SectionDefinition,offset:number,boundary:Point2[]):SectionDefinition|null{
  if(!Number.isFinite(offset))return null;
  const section={...base,origin:[base.origin[0]-base.along[1]*offset,base.origin[1]+base.along[0]*offset] as Point2};
  const cuts:number[]=[];
  for(let i=0;i<boundary.length;i++){
    const a=boundary[i],b=boundary[(i+1)%boundary.length],da=planeDistance(a,section),db=planeDistance(b,section);
    if(Math.abs(da)<EPS)cuts.push(sectionDistance(a,section));
    if(da*db<0){const t=da/(da-db);cuts.push(sectionDistance([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])],section));}
  }
  const sorted=[...new Set(cuts.map(v=>Math.round(v/EPS)*EPS))].sort((a,b)=>a-b);
  const ranges=sorted.slice(1).map((end,i)=>[Math.max(base.min,sorted[i]),Math.min(base.max,end)] as Point2)
    .filter(([a,b])=>b>a&&inside(sectionWorld(section,(a+b)/2),boundary));
  ranges.sort((a,b)=>Math.max(a[0],-a[1],0)-Math.max(b[0],-b[1],0));
  return ranges[0]?{...section,min:ranges[0][0],max:ranges[0][1]}:null;
}

/** Deduplicated vertex PCA is a model-envelope direction, not measured strike. */
export function sectionDefinitions(source:SectionSource):SectionDefinition[]{
  const points:Point2[]=[],seen=new Set<string>();
  for(const unit of source.units.filter(u=>/GRSC/i.test(u.name))){const p=unit.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),k=`${x.toFixed(2)},${z.toFixed(2)}`;if(!seen.has(k)&&Number.isFinite(x+z)){seen.add(k);points.push([x,z]);}}}
  if(points.length<3)return [];
  const centre:Point2=[points.reduce((a,p)=>a+p[0],0)/points.length,points.reduce((a,p)=>a+p[1],0)/points.length];
  let xx=0,zz=0,xz=0;for(const p of points){const x=p[0]-centre[0],z=p[1]-centre[1];xx+=x*x;zz+=z*z;xz+=x*z;}
  const theta=.5*Math.atan2(2*xz,xx-zz);let along:Point2=[Math.cos(theta),Math.sin(theta)];
  if(along[1]<0)along=[-along[0],-along[1]]; // longitudinal reads north to south
  let across:Point2=[along[1],-along[0]];if(across[0]<0)across=[-across[0],-across[1]];
  const sorted=[...source.pits].sort((a,b)=>a.centre[1]-b.centre[1]);
  const configs:{id:string;title:string;ends:[string,string];origin:Point2;along:Point2}[]=[];
  if(sorted[0])configs.push({id:'north',title:'North pit transverse',ends:['A','A′'],origin:sorted[0].centre,along:across});
  if(sorted[1])configs.push({id:'south',title:'South pit transverse',ends:['B','B′'],origin:sorted[1].centre,along:across});
  configs.push({id:'long',title:'Deposit longitudinal',ends:['L','L′'],origin:centre,along});
  return configs.flatMap(c=>{
    // Intersect the section line with the unchanged polygon. Choose the connected
    // inside interval containing the origin, or the nearest interval if necessary.
    const cuts:number[]=[];
    for(let i=0;i<source.boundary.length;i++){
      const a=source.boundary[i],b=source.boundary[(i+1)%source.boundary.length];
      const normal=(p:Point2)=>-(p[0]-c.origin[0])*c.along[1]+(p[1]-c.origin[1])*c.along[0];
      const da=normal(a),db=normal(b);if(Math.abs(da)<EPS)cuts.push((a[0]-c.origin[0])*c.along[0]+(a[1]-c.origin[1])*c.along[1]);
      if(da*db<0){const t=da/(da-db),p:Point2=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];cuts.push((p[0]-c.origin[0])*c.along[0]+(p[1]-c.origin[1])*c.along[1]);}
    }
    const unique=[...new Set(cuts.map(v=>Math.round(v/EPS)*EPS))].sort((a,b)=>a-b);
    const intervals=unique.slice(1).map((b,i)=>[unique[i],b] as Point2).filter(([a,b])=>b-a>1&&inside([c.origin[0]+(a+b)/2*c.along[0],c.origin[1]+(a+b)/2*c.along[1]],source.boundary));
    intervals.sort((a,b)=>Math.max(a[0],-a[1],0)-Math.max(b[0],-b[1],0));const range=intervals[0];if(!range)return [];
    // Frame the model, not kilometres of empty licence. Add 10% visual context,
    // then clip to the connected boundary interval; the locator uses these limits.
    const extents:number[]=[];
    for(const unit of source.units){unit.geometry.computeBoundingBox();const box=unit.geometry.boundingBox;if(!box)continue;for(const x of [box.min.x,box.max.x])for(const z of [box.min.z,box.max.z])extents.push((x-c.origin[0])*c.along[0]+(z-c.origin[1])*c.along[1]);}
    const modelMin=Math.min(...extents),modelMax=Math.max(...extents),padding=(modelMax-modelMin)*.1;
    const min=Math.max(range[0],modelMin-padding),max=Math.min(range[1],modelMax+padding);if(max<=min)return [];
    return [{...c,min,max,azimuth:(Math.atan2(c.along[0],-c.along[1])*180/Math.PI+360)%360}];
  });
}

/** Exact triangle/vertical-plane crossings; coplanar and zero-length edges omitted. */
export function intersectUnit(geometry:THREE.BufferGeometry,s:SectionDefinition){
  const p=geometry.getAttribute('position'),index=geometry.index,segments:SectionSegment[]=[];
  const count=index?.count??p.count;
  for(let i=0;i+2<count;i+=3){
    const vertices=[0,1,2].map(j=>{const n=index?index.getX(i+j):i+j;return [p.getX(n),p.getY(n),p.getZ(n)] as [number,number,number];});
    if(vertices.some(v=>!v.every(Number.isFinite)))continue;
    const distances=vertices.map(v=>planeDistance([v[0],v[2]],s));if(distances.every(d=>Math.abs(d)<1e-7))continue;
    const hits:SectionPoint[]=[];
    for(let j=0;j<3;j++){
      const a=vertices[j],b=vertices[(j+1)%3],da=distances[j],db=distances[(j+1)%3];
      if(Math.abs(da)<1e-7)hits.push([sectionDistance([a[0],a[2]],s),a[1]+700]);
      if(da*db<0){const t=da/(da-db);hits.push([sectionDistance([a[0]+t*(b[0]-a[0]),a[2]+t*(b[2]-a[2])],s),a[1]+t*(b[1]-a[1])+700]);}
    }
    const unique=hits.filter((a,j)=>!hits.slice(0,j).some(b=>Math.hypot(a[0]-b[0],a[1]-b[1])<EPS));
    if(unique.length===2&&Math.hypot(unique[0][0]-unique[1][0],unique[0][1]-unique[1][1])>EPS)segments.push([unique[0],unique[1]]);
  }
  return stitchSectionSegments(segments);
}

/** Only unambiguous degree-two components are filled. Nested rings use even-odd. */
export function stitchSectionSegments(segments:SectionSegment[]){
  const edges=new Map<string,[string,string]>(),points=new Map<string,SectionPoint>(),adj=new Map<string,string[]>();
  const buckets=new Map<string,string[]>();
  const key=(p:SectionPoint)=>{
    const x=Math.floor(p[0]/EPS),y=Math.floor(p[1]/EPS);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const id of buckets.get(`${x+dx},${y+dy}`)??[]){const q=points.get(id)!;if(Math.hypot(p[0]-q[0],p[1]-q[1])<=EPS)return id;}
    const id=String(points.size),bucket=`${x},${y}`;points.set(id,p);buckets.set(bucket,[...(buckets.get(bucket)??[]),id]);return id;
  };
  for(const [a,b] of segments){const ka=key(a),kb=key(b);if(ka===kb)continue;const k=[ka,kb].sort().join('|');edges.set(k,[ka,kb]);}
  for(const [a,b] of edges.values()){adj.set(a,[...(adj.get(a)??[]),b]);adj.set(b,[...(adj.get(b)??[]),a]);}
  const seen=new Set<string>(),loops:SectionPoint[][]=[],open:SectionSegment[]=[];
  for(const start of adj.keys()){
    if(seen.has(start))continue;const component=[start];seen.add(start);
    for(let i=0;i<component.length;i++)for(const n of adj.get(component[i])!){if(!seen.has(n)){seen.add(n);component.push(n);}}
    if(component.length>=3&&component.every(k=>adj.get(k)!.length===2)){
      const loop:SectionPoint[]=[];let current=start,previous='';
      do{loop.push(points.get(current)!);const next=adj.get(current)!.find(n=>n!==previous)!;previous=current;current=next;}while(current!==start&&loop.length<=component.length);
      const area=loop.reduce((a,p,i)=>{const q=loop[(i+1)%loop.length];return a+p[0]*q[1]-q[0]*p[1];},0)/2;
      if(current===start&&Math.abs(area)>EPS*EPS&&simpleRing(loop)){loops.push(loop);continue;}
    }
    const members=new Set(component);for(const [a,b] of edges.values())if(members.has(a))open.push([points.get(a)!,points.get(b)!]);
  }
  return {loops,open,segments:edges.size};
}

/** Slab clips each interval, including intervals with both endpoints outside. */
export function projectDrills(drills:SectionDrill[],s:SectionDefinition,halfWidth:number){
  return drills.flatMap(d=>{
    if(![...d.from,...d.to,d.carbon,d.depthFrom,d.depthTo,halfWidth].every(Number.isFinite)||halfWidth<0)return [];
    const a=planeDistance([d.from[0],d.from[2]],s),b=planeDistance([d.to[0],d.to[2]],s),delta=b-a;
    let lo=0,hi=1;
    if(Math.abs(delta)<1e-9){if(Math.abs(a)>halfWidth)return [];}else{const t1=(-halfWidth-a)/delta,t2=(halfWidth-a)/delta;lo=Math.max(0,Math.min(t1,t2));hi=Math.min(1,Math.max(t1,t2));if(lo>hi)return [];}
    const start=sectionDistance([d.from[0],d.from[2]],s),end=sectionDistance([d.to[0],d.to[2]],s),span=end-start;
    if(Math.abs(span)<1e-9){if(start<s.min||start>s.max)return [];}else{const t1=(s.min-start)/span,t2=(s.max-start)/span;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return [];}
    const at=(t:number):SectionPoint=>[sectionDistance([d.from[0]+(d.to[0]-d.from[0])*t,d.from[2]+(d.to[2]-d.from[2])*t],s),d.from[1]+(d.to[1]-d.from[1])*t+700];
    return [{...d,line:[at(lo),at(hi)] as SectionSegment}];
  });
}

/** Vertical plane intersects the actual XY footprint; z thickness is block dz. */
export function intersectBlocks(blocks:SectionBlock[],s:SectionDefinition){
  return blocks.flatMap(b=>{
    if(![b.x,b.y,b.z,b.dx,b.dy,b.dz,b.carbon].every(Number.isFinite)||b.dx<=0||b.dy<=0||b.dz<=0)return [];
    let lo=s.min,hi=s.max;
    for(const [origin,direction,centre,size] of [[s.origin[0],s.along[0],b.x,b.dx],[s.origin[1],s.along[1],b.z,b.dy]]){
      if(Math.abs(direction)<1e-9){if(origin<centre-size/2||origin>centre+size/2)return [];}
      else{const a=(centre-size/2-origin)/direction,c=(centre+size/2-origin)/direction;lo=Math.max(lo,Math.min(a,c));hi=Math.min(hi,Math.max(a,c));}
    }
    if(hi-lo<EPS)return [];
    return [{min:lo,max:hi,low:b.y-b.dz/2+700,high:b.y+b.dz/2+700,carbon:b.carbon}];
  });
}

export function sampleSectionTerrain(source:SectionSource,s:SectionDefinition,spacing=5){
  const n=Math.max(2,Math.ceil((s.max-s.min)/Math.max(.1,spacing)));
  return Array.from({length:n+1},(_,i)=>{const u=s.min+(s.max-s.min)*i/n,p=sectionWorld(s,u);return [u,source.height(...p)+700] as SectionPoint;});
}
export function sampleSectionPits(source:SectionSource,s:SectionDefinition){
  return source.pits.map(pit=>sampleSectionTerrain(source,s,1).flatMap(([u,elev])=>{
    const world=sectionWorld(s,u),y=pitHeight(world,pit);return y===null?[]:[[u,Math.min(elev,y+700)] as SectionPoint];
  })).filter(line=>line.length>1);
}
