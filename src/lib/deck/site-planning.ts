/** Metre-space conceptual layout. Geometry checks are independent of rendering. */
export type Point2 = [number, number];
export type PlanningBlock = {x: number; y: number; z: number; dx: number; dy: number; dz: number; carbon: number};
export type CandidatePit = {ring: Point2[]; centre: Point2; surface: number; floor: number; depth: number; support: number};
export type SitePlan = {pits: CandidatePit[]; plant: Point2 | null; rejected: number; audit: string[]};
export const CONCEPT = {threshold: 3, cell: 25, bench: 10, berm: 6.36, batterDegrees: 70, plantWidth: 200, plantDepth: 140};
const cross = (a: Point2, b: Point2, c: Point2) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function inside(p: Point2, ring: Point2[]) {
  let hit = false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[j], b=ring[i];
    if (Math.abs(cross(a,b,p))<1e-6 && p[0]>=Math.min(a[0],b[0])-1e-6 && p[0]<=Math.max(a[0],b[0])+1e-6 && p[1]>=Math.min(a[1],b[1])-1e-6 && p[1]<=Math.max(a[1],b[1])+1e-6) return true;
    if ((a[1]>p[1])!==(b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) hit=!hit;
  }
  return hit;
}
function crosses(a: Point2,b: Point2,c: Point2,d: Point2) {return cross(a,b,c)*cross(a,b,d)<-1e-7 && cross(c,d,a)*cross(c,d,b)<-1e-7;}
export function contained(footprint: Point2[], boundary: Point2[]) {
  return boundary.length>=3 && footprint.length>=3 && footprint.every((p,i)=>{
    const q=footprint[(i+1)%footprint.length];
    return inside(p,boundary) && inside([(p[0]+q[0])/2,(p[1]+q[1])/2],boundary) && !boundary.some((a,j)=>crosses(p,q,a,boundary[(j+1)%boundary.length]));
  });
}
/** Exact axis-aligned cell containment with a boundary-edge broad phase.
 * The generic check is useful for arbitrary footprints; block-model cutaways
 * contain tens of thousands of rectangles, so testing every pit edge against
 * every rectangle edge is unnecessarily expensive. Point and midpoint tests
 * preserve the same acceptance rule while disjoint edge bounds skip most
 * segment intersections for interior cells. */
export function rectangleContained(center:Point2,width:number,depth:number,boundary:Point2[]) {
  if(boundary.length<3||!Number.isFinite(width)||!Number.isFinite(depth)||width<=0||depth<=0)return false;
  const footprint=rectangle(center,width,depth);
  if(!footprint.every((point,index)=>{
    const next=footprint[(index+1)%footprint.length];
    return inside(point,boundary)&&inside([(point[0]+next[0])/2,(point[1]+next[1])/2],boundary);
  }))return false;
  const minX=center[0]-width/2,maxX=center[0]+width/2,minZ=center[1]-depth/2,maxZ=center[1]+depth/2;
  for(let index=0;index<boundary.length;index++){
    const a=boundary[index],b=boundary[(index+1)%boundary.length];
    if(Math.max(a[0],b[0])<minX||Math.min(a[0],b[0])>maxX||Math.max(a[1],b[1])<minZ||Math.min(a[1],b[1])>maxZ)continue;
    for(let edge=0;edge<footprint.length;edge++)if(crosses(footprint[edge],footprint[(edge+1)%footprint.length],a,b))return false;
  }
  return true;
}
export function overlaps(a: Point2[], b: Point2[]) {
  return a.some(p=>inside(p,b)) || b.some(p=>inside(p,a)) || a.some((p,i)=>b.some((q,j)=>crosses(p,a[(i+1)%a.length],q,b[(j+1)%b.length])));
}
export function rectangle(p: Point2,w: number,d: number): Point2[] {return [[p[0]-w/2,p[1]-d/2],[p[0]+w/2,p[1]-d/2],[p[0]+w/2,p[1]+d/2],[p[0]-w/2,p[1]+d/2]];}
/** Offset a convex CCW crest inward by intersecting its inward half-planes. */
export function insetCrest(ring: Point2[], distance: number): Point2[] {
  if (ring.length < 3 || !Number.isFinite(distance) || distance < 0) return [];
  let result = ring.map(p => [...p] as Point2);
  for (let i = 0; i < ring.length && result.length >= 3; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 1e-8) continue;
    const signed = (p: Point2) => cross(a, b, p) / length - distance;
    const output: Point2[] = [];
    for (let j = 0; j < result.length; j++) {
      const p = result[j], q = result[(j + 1) % result.length];
      const dp = signed(p), dq = signed(q);
      if (dp >= -1e-8) output.push(p);
      if ((dp >= 0) !== (dq >= 0)) {
        const t = dp / (dp - dq);
        output.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
    result = output.filter((p, j) => j === 0 || Math.hypot(p[0] - output[j-1][0], p[1] - output[j-1][1]) > 1e-7);
  }
  return result.length >= 3 ? result : [];
}
export function hull(points: Point2[]): Point2[] {
  const sorted=[...new Map(points.map(p=>[p.join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(sorted.length<3) return sorted;
  const half=(ps: Point2[])=>{const h: Point2[]=[];for(const p of ps){while(h.length>1&&cross(h[h.length-2],h[h.length-1],p)<=0)h.pop();h.push(p);}return h.slice(0,-1);};
  return [...half(sorted),...half([...sorted].reverse())];
}
const CELL_NEIGHBORS:Point2[]=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
function connectedCellGroups(cells:Map<string,PlanningBlock[]>){
  const groups:PlanningBlock[][]=[];const seen=new Set<string>();
  for(const key of cells.keys()){
    if(seen.has(key))continue;
    const queue=[key],group:PlanningBlock[]=[];seen.add(key);
    for(let i=0;i<queue.length;i++){
      const current=queue[i];group.push(...cells.get(current)!);
      const [x,z]=current.split(',').map(Number);
      for(const [dx,dz] of CELL_NEIGHBORS){const next=`${x+dx},${z+dz}`;if(cells.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}}
    }
    if(group.length>=8)groups.push(group);
  }
  return groups;
}
export function planSite(blocks: PlanningBlock[], boundary: Point2[], height: (x:number,z:number)=>number, layout: 'clusters' | 'north-south' = 'clusters'): SitePlan {
  const cells=new Map<string,PlanningBlock[]>();
  for(const b of blocks) if(b.carbon>=CONCEPT.threshold && inside([b.x,b.z],boundary) && (layout!=='north-south'||rectangleContained([b.x,b.z],b.dx,b.dy,boundary))) {
    const key=`${Math.round(b.x/CONCEPT.cell)},${Math.round(b.z/CONCEPT.cell)}`;
    const list=cells.get(key)??[];list.push(b);cells.set(key,list);
  }
  let groups=connectedCellGroups(cells);
  if(layout==='north-south') {
    // One connected shell cluster can wrap around a concave boundary and its
    // convex hull then extends outside the project outline. Re-cluster into
    // 500 m source-coordinate windows, retaining only whole source cells inside
    // the boundary. This yields compact, separated presentation envelopes;
    // the window is a display grouping, not a pit-design parameter.
    const windows=new Map<string,Map<string,PlanningBlock[]>>();
    for(const [cellKey,cellBlocks] of cells){
      const b=cellBlocks[0],windowKey=`${Math.floor(b.x/500)},${Math.floor(b.z/500)}`;
      const window=windows.get(windowKey)??new Map<string,PlanningBlock[]>();window.set(cellKey,cellBlocks);windows.set(windowKey,window);
    }
    groups=[...windows.values()].flatMap(connectedCellGroups)
      .filter(group=>contained(hull(group.flatMap(b=>rectangle([b.x,b.z],b.dx,b.dy))),boundary))
      .sort((a,b)=>b.length-a.length);
  }
  const pits:CandidatePit[]=[];let rejected=0;
  for(const group of groups.sort((a,b)=>b.length-a.length)) {
    if(layout==='north-south'&&pits.length>=2)break;
    if(group.length<8)continue;
    let footprint=hull(group.flatMap(b=>rectangle([b.x,b.z],b.dx,b.dy)));
    if(footprint.length<3)continue;
    const centre:Point2=[footprint.reduce((s,p)=>s+p[0],0)/footprint.length,footprint.reduce((s,p)=>s+p[1],0)/footprint.length];
    if(layout==='north-south'&&pits.some(p=>Math.hypot(p.centre[0]-centre[0],p.centre[1]-centre[1])<900))continue;
    const surface=height(...centre);
    let floor=group.reduce((lowest,b)=>Math.min(lowest,b.y-b.dz/2),Infinity);
    let depth=Math.max(CONCEPT.bench,Math.min(layout==='north-south'?160:Infinity,surface-floor));
    // A Minkowski expansion of the actual footprint gives a geometric crest;
    // Include bench berms as well as batter run; this is not a geotechnical result.
    const reach=depth/Math.tan(CONCEPT.batterDegrees*Math.PI/180)+Math.ceil(depth/CONCEPT.bench)*CONCEPT.berm;
    const expand=(r:number)=>hull(footprint.flatMap(p=>Array.from({length:16},(_,i)=>[p[0]+r*Math.cos(i*Math.PI/8),p[1]+r*Math.sin(i*Math.PI/8)] as Point2)));
    let ring=expand(reach);
    if(layout==='north-south') {
      // Presentation envelopes, not full-extraction shells. Preserve a gap
      // between north/south footprints and fit within the unchanged boundary.
      footprint=footprint.map(p=>[centre[0]+(p[0]-centre[0])*.88,centre[1]+(p[1]-centre[1])*.88]);
      for(let attempt=0;attempt<12&&!contained(footprint,boundary);attempt++)
        footprint=footprint.map(p=>[centre[0]+(p[0]-centre[0])*.95,centre[1]+(p[1]-centre[1])*.95]);
      let lo=0,hi=Math.min(reach,250);
      for(let i=0;i<24;i++){
        const mid=(lo+hi)/2,candidate=expand(mid);
        if(contained(candidate,boundary)&&!pits.some(p=>overlaps(p.ring,candidate)))lo=mid;else hi=mid;
      }
      ring=expand(lo*.95);
      depth=Math.max(CONCEPT.bench,Math.min(depth,lo/(1/Math.tan(CONCEPT.batterDegrees*Math.PI/180)+CONCEPT.berm/CONCEPT.bench)));
      floor=surface-depth;
    }
    if(!contained(ring,boundary)||pits.some(p=>overlaps(p.ring,ring))){rejected++;continue;}
    pits.push({ring,centre,surface,floor,depth,support:group.length});
  }
  if(layout==='north-south')pits.sort((a,b)=>a.centre[1]-b.centre[1]);
  const xs=boundary.map(p=>p[0]),zs=boundary.map(p=>p[1]);
  let plant:Point2|null=null,best=Infinity;
  const anchor=pits[0]?.centre??[0,0];
  for(let x=Math.min(...xs);x<=Math.max(...xs);x+=50) for(let z=Math.min(...zs);z<=Math.max(...zs);z+=50){
    const p:Point2=[x,z],f=rectangle(p,CONCEPT.plantWidth+40,CONCEPT.plantDepth+40);
    if(!contained(f,boundary)||pits.some(pit=>overlaps(f,pit.ring)))continue;
    const ys=f.map(q=>height(...q));const relief=Math.max(...ys)-Math.min(...ys);
    const score=relief*40+Math.hypot(x-anchor[0],z-anchor[1]);
    if(score<best){best=score;plant=p;}
  }
  return {pits,plant,rejected,audit:[`${pits.length} candidate excavations contained`,`${rejected} conflicting/outside candidates omitted`,plant?'Plant footprint + 20 m planning margin contained':'No admissible plant site found','Provisional project boundary; legal licence unconfirmed','RF 1-inspired concept: 10 m benches, 70° batter, 6.36 m berm; no economic optimisation']};
}
