import * as THREE from 'three';

export type InspectionMode = 'flake'|'sieve'|'compare';

/** Fit the whole animated envelope, including plinths, to the available viewport. */
export function inspectionCameraPose(mode:InspectionMode,aspect:number){
  const half=mode==='compare'?new THREE.Vector3(18,11,18):new THREE.Vector3(11,mode==='flake'?7:12,11);
  half.multiplyScalar(1.6);
  const target=new THREE.Vector3(0,mode==='sieve'?-2:0,0);
  const camera=new THREE.PerspectiveCamera(36,Math.max(.2,aspect),.1,1000);
  const direction=new THREE.Vector3(.3,.25,1).normalize();
  let distance=120;
  for(let iteration=0;iteration<8;iteration++){
    camera.position.copy(target).addScaledVector(direction,distance);
    camera.lookAt(target);camera.updateMatrixWorld();
    let extent=0;
    for(const x of [-half.x,half.x])for(const y of [-half.y,half.y])for(const z of [-half.z,half.z]){
      const point=new THREE.Vector3(x,y,z).add(target).project(camera);
      extent=Math.max(extent,Math.abs(point.x),Math.abs(point.y));
    }
    // Keep a little breathing room; include the near side of the object.
    distance=Math.max(half.length()+1,distance*extent/.88);
  }
  return {target,position:target.clone().addScaledVector(direction,distance)};
}

/** Stylised inspection illustrations: no measured particle sizes or mass balance. */
export function createMetallurgyInspection() {
  const root = new THREE.Group();
  const flake = new THREE.Group(), sieve = new THREE.Group(), comparison = new THREE.Group();
  root.add(flake, sieve, comparison);
  root.scale.setScalar(1.6);
  const graphite = new THREE.MeshStandardMaterial({color:0x51616a, emissive:0x173342, emissiveIntensity:.35, metalness:.25, roughness:.42});
  const copper = new THREE.MeshStandardMaterial({color:0xcc854b, metalness:.7, roughness:.3});
  const steel = new THREE.MeshStandardMaterial({color:0x8aaeb9, metalness:.7, roughness:.32});
  const glass = new THREE.MeshStandardMaterial({color:0x70cfc6, transparent:true, opacity:.24, depthWrite:false, side:THREE.DoubleSide});
  const add = (parent:THREE.Group, geometry:THREE.BufferGeometry, material:THREE.Material, x:number,y:number,z:number) => {
    const mesh = new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  };
  // Static display plinths anchor the inspection objects without another render pass.
  // Rings are decorative; they are not measurement scales or analytical results.
  const plinth = new THREE.MeshStandardMaterial({color:0x10272e,metalness:.35,roughness:.65});
  const accent = new THREE.MeshBasicMaterial({color:0x57c9bf});
  for(const [parent,radius,y] of [[flake,10,-5],[sieve,10,-10],[comparison,17,-5]] as const){
    add(parent,new THREE.CylinderGeometry(radius,radius,.35,48),plinth,0,y,0);
    for(let arc=0;arc<3;arc++){
      const ring=add(parent,new THREE.TorusGeometry(radius+.4,.055,4,24,Math.PI*.48),accent,0,y+.2,0);
      ring.rotation.set(Math.PI/2,0,arc*Math.PI*2/3);
    }
  }
  const flakeSheets=new THREE.Group();flake.add(flakeSheets);
  const sheets:THREE.Mesh[]=[];
  for(let i=0;i<7;i++) {
    const sheet=add(flakeSheets,new THREE.CylinderGeometry(8,8,.12,6),graphite,0,i*.24-1,0);
    sheet.scale.z=.68;sheet.rotation.y=i*.035;
    sheets.push(sheet);
  }
  const sieveLayers:THREE.Group[]=[];
  for(let i=0;i<4;i++) {
    const layer=new THREE.Group();layer.position.y=6-i*4;sieve.add(layer);sieveLayers.push(layer);
    add(layer,new THREE.CylinderGeometry(7,7,2,40,1,true),steel,0,0,0);
    const rim=add(layer,new THREE.TorusGeometry(7,.18,8,40),copper,0,1,0);rim.rotation.x=Math.PI/2;
    const spacing=1.6-i*.3;
    for(let p=-6;p<=6;p+=spacing){
      const length=2*Math.sqrt(49-p*p);
      add(layer,new THREE.BoxGeometry(length,.06,.06),steel,0,-.8,p);
      add(layer,new THREE.BoxGeometry(.06,.06,length),steel,p,-.8,0);
    }
    for(let j=0;j<8;j++) {
      const particle=add(layer,new THREE.CylinderGeometry(.5-i*.08,.5-i*.08,.1,6),graphite,Math.sin(j*2.4)*4,.1,Math.cos(j*2.4)*4);
      particle.rotation.z=j*.07;
    }
  }
  const jars=[-9,9].map(x=>{
    const jar=new THREE.Group();jar.position.set(x,0,0);comparison.add(jar);
    add(jar,new THREE.CylinderGeometry(4,4,9,32,1,true),glass,0,0,0);
    add(jar,new THREE.CylinderGeometry(3.8,3.8,3,32),graphite,0,-2.8,0);
    const rim=add(jar,new THREE.TorusGeometry(4,.2,8,40),copper,0,4.5,0);rim.rotation.x=Math.PI/2;
    return jar;
  });
  function show(mode:InspectionMode|null){root.visible=mode!==null;flake.visible=mode==='flake';sieve.visible=mode==='sieve';comparison.visible=mode==='compare';}
  function update(seconds:number){
    const t=Number.isFinite(seconds)?Math.max(0,seconds):0;
    // A slow, repeatable separation makes the layered illustration legible.
    // This is not a physical simulation of graphite delamination.
    const spread=.24+.85*(.5-.5*Math.cos(t*Math.PI/6));
    sheets.forEach((sheet,i)=>{sheet.position.y=(i-3)*spread+1;});
    flakeSheets.rotation.set(.18,t*.12,.08);
    sieveLayers.forEach((layer,i)=>{layer.position.x=Math.sin(t*18+i*.2)*.1;});
    jars.forEach((jar,i)=>{jar.position.y=(1-Math.min(1,t/1.2))*5*(i?1:-1);});
  }
  show(null);update(0);
  return {root,show,update};
}
