import * as THREE from 'three';
import {contained, overlaps, rectangle, type CandidatePit, type Point2} from './site-planning';
import {batchPlantMeshes} from './mine-plant-detail';
import {buildHaulTruck} from './mine-haulage';

type Bounds = {minX:number;maxX:number;minZ:number;maxZ:number};
type Height = (x:number,z:number)=>number;
export type CampusFacility = {
  id:'tailings'|'water'|'raw-water'|'waste'; title:string; width:number;depth:number;
  point:Point2; level:number; relief:number; surveyFraction:number;
  footprint:Point2[]; anchor:[number,number,number];
};
type Options = {plant:Point2;plantLevel:number;feed:Point2;pits:CandidatePit[];boundary:Point2[];bounds:Bounds;height:Height;surveyed:(x:number,z:number)=>boolean};

/** Deterministic display-conflict screening only. No hydrology, stability,
 * capacity, ownership or permitting assessment is implied by these placements. */
export function buildMineSiteCampus(options:Options) {
  const {plant,feed,pits,boundary,bounds,height,surveyed}=options;
  const root=new THREE.Group();root.name='Illustrative waste and water facilities';
  const facilities:CampusFacility[]=[],omissions:string[]=[];
  const excluded=[rectangle(plant,310,310),rectangle(feed,210,160),...pits.map(p=>p.ring)];
  const materials={
    // Earthworks and pad surfaces use an unlit fixed palette: their mapped
    // colors must not shift with camera angle as the viewer rotates the site.
    // These hues identify conceptual pads and facilities in the mine-plan
    // legend. Render them without view-dependent lighting/specular response;
    // Their relief comes from geometry and deterministic procedural grain.
    earth:new THREE.MeshBasicMaterial({color:0x8b775e,side:THREE.DoubleSide,toneMapped:false}),
    bench:new THREE.MeshBasicMaterial({color:0xa28b6c,side:THREE.DoubleSide,toneMapped:false}),
    rock:new THREE.MeshBasicMaterial({color:0x857e71,side:THREE.DoubleSide,toneMapped:false}),
    beach:new THREE.MeshBasicMaterial({color:0xa5a397,side:THREE.DoubleSide,toneMapped:false}),
    liner:new THREE.MeshBasicMaterial({color:0x3e4e50,side:THREE.DoubleSide,toneMapped:false}),
    water:new THREE.MeshBasicMaterial({color:0x4a8b8b,side:THREE.DoubleSide,toneMapped:false}),
    fresh:new THREE.MeshBasicMaterial({color:0x579aa4,side:THREE.DoubleSide,toneMapped:false}),
    steel:new THREE.MeshStandardMaterial({color:0x53636a,roughness:.6,metalness:.35}),
    concrete:new THREE.MeshBasicMaterial({color:0xb1aa96,toneMapped:false}),
  };
  for(const material of [materials.earth,materials.bench,materials.rock,materials.beach]){
    material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSiteGround;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSiteGround=transformed;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        varying vec3 vSiteGround;
        float siteHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float siteNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(siteHash(i),siteHash(i+vec2(1.,0.)),f.x),mix(siteHash(i+vec2(0.,1.)),siteHash(i+vec2(1.)),f.x),f.y);}
      `).replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=0.84+0.18*siteNoise(vSiteGround.xz*0.035)+0.08*siteNoise(vSiteGround.xz*0.6+vec2(vSiteGround.y*0.83,vSiteGround.y*0.37));');
    };
    material.customProgramCacheKey=()=> 'tanga-site-earth-grain-v1';
  }
  function batch(group:THREE.Group){
    // Survey-conforming ribbons are non-indexed and have no UVs. Match the
    // static equipment before merging; these materials use no texture maps.
    for(const child of group.children){if(!(child instanceof THREE.Mesh))continue;
      if(child.geometry.index){const original=child.geometry;child.geometry=original.toNonIndexed();original.dispose();}
      child.geometry.deleteAttribute('uv');
      if(!child.geometry.getAttribute('normal'))child.geometry.computeVertexNormals();
    }
    batchPlantMeshes(group);
  }
  function mesh(group:THREE.Group,geometry:THREE.BufferGeometry,material:THREE.Material,name:string){
    const object=new THREE.Mesh(geometry,material);object.name=name;object.castShadow=true;object.receiveShadow=true;group.add(object);return object;
  }
  function box(group:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material,name:string){
    const object=mesh(group,new THREE.BoxGeometry(w,h,d),material,name);object.position.set(x,y,z);return object;
  }
  function ring(point:Point2,w:number,d:number,level:number|Height,chamfer=.12){
    const cut=Math.min(w,d)*chamfer;
    const local:Point2[]=[[-w/2+cut,-d/2],[w/2-cut,-d/2],[w/2,-d/2+cut],[w/2,d/2-cut],[w/2-cut,d/2],[-w/2+cut,d/2],[-w/2,d/2-cut],[-w/2,-d/2+cut]];
    return local.map(([x,z])=>new THREE.Vector3(point[0]+x,typeof level==='number'?level:level(point[0]+x,point[1]+z),point[1]+z));
  }
  function join(group:THREE.Group,a:THREE.Vector3[],b:THREE.Vector3[],material:THREE.Material,name:string){
    const positions:number[]=[];
    for(let i=0;i<a.length;i++){const j=(i+1)%a.length;for(const p of [a[i],b[i],a[j],a[j],b[i],b[j]])positions.push(p.x,p.y,p.z);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();return mesh(group,geometry,material,name);
  }
  function poolRadius(angle:number){return 1+.08*Math.sin(angle*3)+.04*Math.cos(angle*5);}
  function poolOutline(pool:{x:number;z:number;rx:number;rz:number},y:number){return Array.from({length:64},(_,i)=>{const a=i*Math.PI/32,r=poolRadius(a);return new THREE.Vector3(pool.x+pool.rx*r*Math.cos(a),y,pool.z+pool.rz*r*Math.sin(a));});}
  function cap(group:THREE.Group,points:THREE.Vector3[],material:THREE.Material,name:string,pool?:{x:number;z:number;rx:number;rz:number}){
    const shape=new THREE.Shape();points.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();
    if(pool){const hole=new THREE.Path();poolOutline(pool,0).forEach((p,i)=>i?hole.lineTo(p.x,-p.z):hole.moveTo(p.x,-p.z));hole.closePath();shape.holes.push(hole);}
    const geometry=new THREE.ShapeGeometry(shape,32);geometry.rotateX(-Math.PI/2);geometry.translate(0,points[0].y,0);
    if(pool){const p=geometry.getAttribute('position');for(let i=0;i<p.count;i++){const dx=(p.getX(i)-pool.x)/pool.rx,dz=(p.getZ(i)-pool.z)/pool.rz,signed=Math.hypot(dx,dz)-poolRadius(Math.atan2(dz,dx));p.setY(i,points[0].y-.4*(1-THREE.MathUtils.clamp(signed*2,0,1)));}geometry.computeVertexNormals();}
    return mesh(group,geometry,material,name);
  }
  function patch(group:THREE.Group,f:CampusFacility){
    const positions:number[]=[],nx=Math.ceil((f.width+30)/12),nz=Math.ceil((f.depth+30)/12);
    const p=(i:number,j:number)=>{const x=f.point[0]-(f.width+30)/2+i*(f.width+30)/nx,z=f.point[1]-(f.depth+30)/2+j*(f.depth+30)/nz;return [x,height(x,z)+.18,z];};
    for(let i=0;i<nx;i++)for(let j=0;j<nz;j++)positions.push(...p(i,j),...p(i,j+1),...p(i+1,j),...p(i+1,j),...p(i,j+1),...p(i+1,j+1));
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();mesh(group,geometry,materials.earth,'Illustrative cleared apron · terrain conforming');
  }
  function place(id:CampusFacility['id'],title:string,preferred:Point2,w:number,d:number,limit:number,mineOnly=false){
    const candidates:{point:Point2;score:number}[]=[];
    for(let dx=-720;dx<=720;dx+=60)for(let dz=-720;dz<=720;dz+=60){
      const point:Point2=[preferred[0]+dx,preferred[1]+dz],foot=rectangle(point,w+50,d+50);
      if(foot.some(([x,z])=>x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)||excluded.some(area=>overlaps(foot,area))||(mineOnly&&!contained(foot,boundary)))continue;
      const values:number[]=[];for(let i=0;i<=4;i++)for(let j=0;j<=4;j++)values.push(height(point[0]-w/2+w*i/4,point[1]-d/2+d*j/4));
      const relief=Math.max(...values)-Math.min(...values);if(!values.every(Number.isFinite)||relief>limit)continue;
      candidates.push({point,score:relief*45+Math.hypot(dx,dz)});
    }
    for(const candidate of candidates.sort((a,b)=>a.score-b.score).slice(0,12)){
      const values:number[]=[];let coverage=0;
      for(let x=-w/2;x<=w/2;x+=5)for(let z=-d/2;z<=d/2;z+=5){values.push(height(candidate.point[0]+x,candidate.point[1]+z));if(surveyed(candidate.point[0]+x,candidate.point[1]+z))coverage++;}
      const low=Math.min(...values),high=Math.max(...values),relief=high-low;if(!Number.isFinite(high)||relief>limit)continue;
      const level=high+1,point=candidate.point;
      // Keep projected leaders above the highest embankment/pump geometry so
      // the label survives its own facility's occlusion test in close views.
      const anchorLift=id==='tailings'?25:id==='waste'?24:18;
      const f:CampusFacility={id,title,width:w,depth:d,level,relief,surveyFraction:coverage/values.length,footprint:rectangle(point,w,d),point,anchor:[point[0]+(id==='water'||id==='raw-water'?w/2-18:0),level+anchorLift,point[1]+(id==='tailings'?-d/2+38:id==='waste'?-15:0)]};
      excluded.push(rectangle(point,w+50,d+50));facilities.push(f);return f;
    }
    return null;
  }
  const tailings=place('tailings','Tailings impoundment · illustrative',[plant[0]+500,plant[1]+280],340,260,22);
  const water=place('water','Settling / reclaim pond · illustrative',[plant[0]-240,plant[1]+240],130,95,16);
  const rawWater=place('raw-water','Raw-water pond · illustrative',[plant[0]+230,plant[1]-230],100,80,16);
  const mine=pits[pits.length-1]?.centre;
  let waste:CampusFacility|null=null;
  if(mine)for(const [w,d] of [[240,180],[180,140],[140,110]]){waste=place('waste','Waste-rock landform · illustrative',[mine[0]+350,mine[1]],w,d,32,true);if(waste)break;}
  for(const [id,f] of [['tailings',tailings],['water',water],['raw-water',rawWater],['waste',waste]] as const)if(!f)omissions.push(`${id}: no display footprint passed terrain / overlap checks; facility withheld`);

  const grading=new THREE.Group();grading.name='Illustrative plant grading';
  join(grading,ring(plant,310,310,(x,z)=>height(x,z)+.2),ring(plant,250,250,options.plantLevel-.26,0),materials.earth,'Conceptual plant earthwork batters');
  batch(grading);root.add(grading);
  for(const f of facilities){
    const group=new THREE.Group();group.name=f.title;root.add(group);patch(group,f);
    const [x,z]=f.point,y=f.level;
    if(f.id==='waste'){
      let outer=ring(f.point,f.width,f.depth,(px,pz)=>height(px,pz)+.3),inset=0;
      for(let lift=1;lift<=3;lift++){
        inset+=Math.min(12,f.depth/15);
        const crest=ring(f.point,f.width-2*inset,f.depth-2*inset,y+lift*5);
        join(group,outer,crest,materials.rock,'Waste-rock batter · illustrative');
        inset+=4;const bench=ring(f.point,f.width-2*inset,f.depth-2*inset,y+lift*5);
        join(group,crest,bench,materials.bench,'Waste-rock bench · illustrative');outer=bench;
      }
      cap(group,outer,materials.bench,'Waste-rock upper working surface');
      const topWidth=f.width-2*inset,topDepth=f.depth-2*inset,moundX=x-Math.min(30,topWidth*.2),moundZ=z-Math.min(15,topDepth*.2);
      const mound=mesh(group,new THREE.ConeGeometry(8,4,12),materials.rock,'Illustrative active waste-rock tip');mound.scale.set(Math.min(3.5,topWidth/40),1,Math.min(1.3,topDepth/40));mound.position.set(moundX,y+17,moundZ);f.anchor=[moundX,y+23,moundZ];
      for(let i=0;i<46;i++){
        const dx=Math.sin(i*17.37)*topWidth*.4,dz=Math.cos(i*11.1)*topDepth*.38;
        if(Math.hypot(dx,dz)<9||Math.hypot(dx-16,dz)<7)continue;
        const radius=.8+(Math.sin(i*7.1)+1)*.7,rock=mesh(group,new THREE.IcosahedronGeometry(radius,0),materials.rock,'Illustrative coarse waste-rock surface');
        rock.scale.set(1.4,.65,1);rock.position.set(x+dx,y+15+radius*.5,z+dz);rock.rotation.y=i*1.7;
      }

      const truck=buildHaulTruck();truck.position.set(x,y+15,z);truck.rotation.y=.35;
      truck.updateMatrix();for(const child of [...truck.children]){child.applyMatrix4(truck.matrix);group.add(child);} // static, batched below
      // Dozer silhouette on the level top; no operating route or schedule claimed.
      box(group,5,1.6,8,x+16,y+16,z,materials.steel,'Parked dozer tracks');
      box(group,3,2.6,3,x+16,y+18,z,materials.bench,'Parked dozer cab');
      box(group,7,2,.7,x+16,y+16,z+5,materials.steel,'Parked dozer blade');
    }else{
      const tsf=f.id==='tailings',rise=tsf?12:4,crestInset=tsf?32:12,beachInset=tsf?68:25;
      const toe=ring(f.point,f.width,f.depth,(px,pz)=>height(px,pz)+.3);
      const crest=ring(f.point,f.width-2*crestInset,f.depth-2*crestInset,y+rise);
      const innerCrest=ring(f.point,f.width-2*(crestInset+6),f.depth-2*(crestInset+6),y+rise);
      const beach=ring(f.point,f.width-2*beachInset,f.depth-2*beachInset,y+(tsf?2.4:1));
      join(group,toe,crest,materials.earth,'Illustrative containment embankment');
      join(group,crest,innerCrest,materials.bench,'Embankment crest access');
      join(group,innerCrest,beach,tsf?materials.beach:materials.liner,'Contained inner slope');
      if(tsf){
        const pool={x:x+30,z:z-15,rx:36,rz:22};cap(group,beach,materials.beach,'Illustrative deposited-tailings beach',pool);
        const ellipse=poolOutline(pool,y+2.02);
        cap(group,ellipse,materials.water,'Illustrative decant pool');
        box(group,5,.6,3,pool.x,y+2.15,pool.z,materials.steel,'Floating decant pontoon');
        box(group,.25,4,.25,pool.x,y+4.3,pool.z,materials.concrete,'Decant marker mast');
        for(let i=-3;i<=3;i++)box(group,1,.5,12,x+i*25,y+rise+.4,z-f.depth/2+crestInset+6,materials.steel,'Illustrative distribution pipe / spigot');
      }else{
        cap(group,beach,f.id==='raw-water'?materials.fresh:materials.water,'Lined site-water basin');
        if(f.id==='water')box(group,5,1.6,f.depth-2*beachInset,x,y+1.6,z,materials.bench,'Settling / reclaim divider');
        const pumpX=x+f.width/2-crestInset-6;
        box(group,8,5,6,pumpX,y+6.5,z,materials.steel,'Conceptual pump kiosk');
        for(const sign of [-1,1])box(group,8.8,.35,Math.hypot(3.3,1.5),pumpX,y+9.75,z+sign*1.65,materials.liner,'Pump kiosk pitched roof').rotation.x=sign*Math.atan2(1.5,3.3);
        box(group,1.5,3.5,.15,pumpX,y+5.75,z+3.1,materials.liner,'Pump kiosk service door');
      }
    }
    batch(group);
    group.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=object.material!==materials.water&&object.material!==materials.fresh;object.userData.tooltipItems=[{title:f.title,rows:['Illustrative geometry and placement; no design, storage capacity or approved location supplied.',`Terrain footprint ${f.width} × ${f.depth} m; relief ${f.relief.toFixed(1)} m.`,f.surveyFraction>.99?'Ground uses the supplied survey grid.':'Ground includes regional terrain context; local survey reconciliation required.'],tone:'#c9ad7d'}];}});
  }

  // Service connections are illustrative pipes; each complete path must be
  // clear of pit and other facility footprints. Never leave a truncated route.
  for(const f of facilities.filter(f=>f.id!=='waste')){
    const dx=f.point[0]-plant[0],dz=f.point[1]-plant[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
    const edge=Math.min(132/Math.max(.0001,Math.abs(ux)),132/Math.max(.0001,Math.abs(uz)));
    const a=new THREE.Vector3(plant[0]+ux*edge,options.plantLevel+2,plant[1]+uz*edge);
    const inset=f.id==='tailings'?38:18;
    const approach=Math.min((f.width/2-inset)/Math.max(.0001,Math.abs(ux)),(f.depth/2-inset)/Math.max(.0001,Math.abs(uz)));
    const b=new THREE.Vector3(f.point[0]-ux*approach,f.level+(f.id==='tailings'?13:5),f.point[1]-uz*approach);
    const n=Math.ceil(a.distanceTo(b)/5),points:THREE.Vector3[]=[];
    let conflict=false;
    for(let i=0;i<=n;i++){
      const p=a.clone().lerp(b,i/n);p.y=Math.max(p.y,height(p.x,p.z)+1.5);
      const corridor=rectangle([p.x,p.z],8,8);
      if(pits.some(pit=>overlaps(corridor,pit.ring))||facilities.some(other=>other!==f&&overlaps(corridor,other.footprint)))conflict=true;
      points.push(p);
    }
    if(conflict){omissions.push(`Service line to ${f.id} withheld: display footprint conflict`);continue;}
    for(let i=1;i<points.length;i++){
      const previous=points[i-1],p=points[i],direction=p.clone().sub(previous);
      const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,direction.length(),6),materials.steel);
      pipe.position.copy(previous).add(p).multiplyScalar(.5);pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());pipe.name='Illustrative water service line';root.add(pipe);
    }
  }
  for(const dx of [-25,15]){
    const truck=buildHaulTruck();truck.position.set(plant[0]+dx,options.plantLevel-.2,plant[1]+117);truck.rotation.y=Math.PI/2;truck.updateMatrix();
    for(const child of [...truck.children]){child.applyMatrix4(truck.matrix);root.add(child);}
  }
  // Merge line detail separately, retaining each facility's picking metadata.
  batch(root);
  root.userData.facilities=facilities;root.userData.omissions=omissions;
  return {root,facilities,omissions};
}
