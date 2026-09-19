import * as THREE from 'three';

/** Stylised inspection illustrations: no measured particle sizes or mass balance. */
export function createMetallurgyInspection() {
  const root = new THREE.Group();
  const flake = new THREE.Group(), sieve = new THREE.Group(), comparison = new THREE.Group();
  root.add(flake, sieve, comparison);
  root.scale.setScalar(1.6);
  const graphite = new THREE.MeshStandardMaterial({color:0x8499a2, emissive:0x22343c, emissiveIntensity:.3, metalness:.6, roughness:.38});
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
  for(let i=0;i<7;i++) {
    const sheet=add(flakeSheets,new THREE.CylinderGeometry(8,8,.12,6),graphite,0,i*.24-1,0);
    sheet.scale.z=.68;sheet.rotation.y=i*.035;
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
  function show(mode:'flake'|'sieve'|'compare'|null){root.visible=mode!==null;flake.visible=mode==='flake';sieve.visible=mode==='sieve';comparison.visible=mode==='compare';}
  function update(seconds:number){
    const t=Number.isFinite(seconds)?Math.max(0,seconds):0;
    flakeSheets.rotation.set(.6,t*.18,.12);
    sieveLayers.forEach((layer,i)=>{layer.position.x=Math.sin(t*18+i*.2)*.1;});
    jars.forEach((jar,i)=>{jar.position.y=(1-Math.min(1,t/1.2))*5*(i?1:-1);});
  }
  show(null);update(0);
  return {root,show,update};
}
