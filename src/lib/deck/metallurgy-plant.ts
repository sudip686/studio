import * as THREE from 'three';
import {MET_SAMPLES} from './metallurgy-samples';

export const PROCESS_STAGES=[
  {id:'feed',title:'Rock sample',brief:'A graphite-bearing test sample on the preparation bench. Sample mass and head assay are not connected; transfers are illustrative.',x:-44},
  {id:'liberate',title:'Lab milling',brief:'A laboratory crusher and rotating test mill prepare material for characterisation. This is not production-plant equipment.',x:-24},
  {id:'float',title:'Flotation test',brief:'Bench flotation cells illustrate a separation test. Air bubbles are animated; reported recovery comes from deck test summaries, not a simulation.',x:0},
  {id:'dewater',title:'Filter & dry',brief:'A laboratory filter flask and drying oven illustrate sample preparation for measurement. The actual laboratory protocol is not supplied.',x:25},
  {id:'product',title:'Sample baskets',brief:'Select a basket or result button to inspect its reported group. Groups can overlap; these are not additive production outputs.',x:59},
] as const;
export const MET_GROUPS=MET_SAMPLES.map(s=>({...s,coarse:s.flake,fine:'Not separately reported'}));
export const BASKET_POSITIONS=MET_SAMPLES.map((_,i)=>[45+(i%3)*11, -9+Math.floor(i/3)*12] as const);

/** Laboratory testwork exhibit: illustrative instruments, not a production plant or lab protocol. */
export function createMetallurgyPlant(){
  const root=new THREE.Group(),pickables:THREE.Mesh[]=[],rotors:THREE.Object3D[]=[],bubbles:THREE.Mesh[]=[],flows:{mesh:THREE.Mesh;path:THREE.Vector3[];offset:number}[]=[],bins:THREE.Mesh[]=[];
  const steel=new THREE.MeshStandardMaterial({color:0x748d99,metalness:.65,roughness:.35});
  const dark=new THREE.MeshStandardMaterial({color:0x233742,metalness:.6,roughness:.42});
  const copper=new THREE.MeshStandardMaterial({color:0xc86d32,metalness:.55,roughness:.38});
  const teal=new THREE.MeshStandardMaterial({color:0x4aafaa,metalness:.4,roughness:.25});
  const rock=new THREE.MeshStandardMaterial({color:0x343c42,metalness:.6,roughness:.6});
  const glass=new THREE.MeshStandardMaterial({color:0xb6e4e8,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide,roughness:.12});
  const white=new THREE.MeshStandardMaterial({color:0xe0e4df,roughness:.45,metalness:.1});
  function add(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,stage:number){const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.stage=stage;root.add(mesh);pickables.push(mesh);return mesh;}
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material,s:number)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,s);
  const cyl=(x:number,y:number,z:number,r:number,h:number,m:THREE.Material,s:number)=>add(new THREE.CylinderGeometry(r,r,h,32),m,x,y,z,s);
  function pipe(points:number[][],material:THREE.Material,stage:number,r=.3){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'catmullrom',0),32,r,6,false),material,0,0,0,stage);}
  function stream(points:number[][],material:THREE.Material,stage:number,count=14){const path=points.map(p=>new THREE.Vector3(...p));for(let i=0;i<count;i++){const mesh=add(new THREE.IcosahedronGeometry(.42,0),material,0,0,0,stage);flows.push({mesh,path,offset:i/count});}}
  // Laboratory workbench, drawers and a shallow rock-sample tray.
  const base=box(6,-1,0,134,2,42,white,0);base.userData.stage=-1;
  for(const x of [-47,-23,1,25,49]){box(x,-7,0,19,10,26,dark,0).userData.stage=-1;for(const y of [-4,-7,-10]){box(x,y,13.1,17,2.4,.25,white,0).userData.stage=-1;box(x,y,13.4,5,.2,.2,steel,0).userData.stage=-1;}}
  box(-44,.6,0,15,1,12,steel,0);for(const z of [-6,6])box(-44,1.7,z,15,2,.3,steel,0);
  for(let i=0;i<18;i++)add(new THREE.IcosahedronGeometry(.7+i%3*.2,0),rock,-47+i%6,2+(i%3)*.5,-2+Math.floor(i/6)*2,0);
  box(-28,4,0,7,8,9,white,1);add(new THREE.CylinderGeometry(3,1,3,4),copper,-28,9,0,1);
  const mill=cyl(-16,5,0,3.6,8,steel,1);mill.rotation.z=Math.PI/2;rotors.push(mill);
  for(const x of [-19,-13]){const ring=add(new THREE.TorusGeometry(3.7,.28,8,36),copper,x,5,0,1);ring.rotation.y=Math.PI/2;}
  for(let i=0;i<8;i++){const rib=new THREE.Mesh(new THREE.BoxGeometry(.3,8,.3),dark);const a=i*Math.PI/4;rib.position.set(Math.cos(a)*3.65,0,Math.sin(a)*3.65);mill.add(rib);}
  stream([[-44,3,0],[-36,12,0],[-28,11,0],[-16,5,0]],rock,1,8);
  // Bench flotation cells with transparent walls, stands and overhead motors.
  for(const x of [-5,2,9]){
    box(x,.5,0,6,1,8,white,2);cyl(x,3.5,0,3.1,6,glass,2);cyl(x,5.8,0,2.85,.16,teal,2);
    box(x,6,-3.7,.5,12,.5,steel,2);box(x,12,-1,1,1,6,steel,2);box(x,10.5,0,2,3,2,white,2);
    box(x,8,0,.35,5,.35,steel,2);const blade=box(x,6.5,0,4,.2,.45,copper,2);rotors.push(blade);
    for(let i=0;i<10;i++){const b=add(new THREE.SphereGeometry(.16+i%3*.06,8,6),teal,x+Math.sin(i*2.4)*2,6,Math.cos(i*2.4)*2,2);b.userData.baseX=x;b.userData.phase=i/10;bubbles.push(b);}
  }
  stream([[-12,6,0],[-5,7,0],[2,7,0],[9,7,0],[19,7,0]],teal,2);
  // Filter flask / funnel, vacuum line and a small bench drying oven.
  add(new THREE.CylinderGeometry(1.2,3.5,6,24),glass,20,3.5,0,3);
  cyl(20,7,0,.7,2,glass,3);add(new THREE.CylinderGeometry(3.5,.7,3,24,1,true),white,20,9.5,0,3);
  pipe([[20,5,0],[23,5,0],[24,1,3],[27,1,3]],teal,3,.18);
  box(31,5,0,10,10,10,white,3);box(31,5,5.2,8,7,.3,dark,3);box(33,5,5.5,.3,3,.3,steel,3);
  box(31,9,5.4,4,1,.1,teal,3);
  stream([[9,7,0],[20,12,0],[20,5,0],[31,6,0],[41,10,0]],copper,3,8);
  // Sieve shaker and carbon-analysis instrument; no claimed model or protocol.
  box(41,1,-8,8,2,8,white,4);for(let i=0;i<4;i++){cyl(41,3+i*1.2,-8,3.5,1,steel,4);const rim=add(new THREE.TorusGeometry(3.5,.12,6,32),copper,41,3.5+i*1.2,-8,4);rim.rotation.x=Math.PI/2;}
  box(33,5,-12,8,10,7,white,4);box(33,7,-8.3,5,3,.2,dark,4);box(33,7,-8.1,4,2,.1,teal,4);
  // Equal illustrative fill: distinct Oxide/Fresh test groups, never a process split.
  for(let index=0;index<BASKET_POSITIONS.length;index++){
    const [x,z]=BASKET_POSITIONS[index];
    const bin=add(new THREE.CylinderGeometry(3,3,6,24,1,true),glass,x,3.5,z,4);bin.userData.bin=MET_GROUPS[index].id;bin.userData.testGroup=index;
    const charge=cyl(x,2.5,z,2.8,3,rock,4);charge.userData.testGroup=index;bins.push(charge);
    const rim=add(new THREE.TorusGeometry(3,.18,6,32),copper,x,6.5,z,4);rim.rotation.x=Math.PI/2;rim.userData.testGroup=index;
    box(x,3,z+3.05,4,2.5,.15,white,4).userData.testGroup=index;
    stream([[41,10,-8],[x,10,z],[x,4,z]],rock,4,3);
  }
  // Clearly separated illustrative residue/water branch; no invented waste yield.
  cyl(7,2.5,-11,2.5,5,glass,2);pipe([[2,4,0],[2,3,-11],[7,3,-11]],teal,2,.15);
  function update(t:number){
    t=Number.isFinite(t)?Math.max(0,t):0;
    rotors.forEach((r,i)=>{if(i===0)r.rotation.y=t*.6;else r.rotation.y=t*(i===4?.18:.7);});
    bubbles.forEach((b,i)=>{b.position.y=5.8+((t*.24+b.userData.phase)%1)*3;b.scale.setScalar(.6+((t*.24+i/10)%1)*.7);});
    for(const f of flows){if(f.path.length<2)continue;const v=((t*.12+f.offset)%1)*(f.path.length-1),i=Math.min(f.path.length-2,Math.max(0,Math.floor(v)));f.mesh.position.copy(f.path[i]).lerp(f.path[i+1],v-i);f.mesh.rotation.set(t,f.offset*6,t*.4);}
    bins.forEach(b=>{b.position.y=2.5+.06*Math.sin(t);});
  }
  update(0);
  return {root,pickables,update};
}
