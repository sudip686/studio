import * as THREE from 'three';
import {CONCEPT} from './site-planning';
export type RevealAction='none'|'resource'|'pitcut'|'benches';

/** Display-only reveal. Matrices, vertices, grades and source counts are never edited. */
export function createSceneReveal(stage:THREE.Object3D,blocks:THREE.InstancedMesh[],pits:THREE.Mesh[]){
  let action:RevealAction='none',age=0;
  const counts=new Map<THREE.InstancedMesh,number>();
  const savedPlanes=new Map<THREE.Material,THREE.Plane[]|null>();
  const plane=new THREE.Plane(),bounds=new THREE.Box3();
  function reset(){
    counts.forEach((count,mesh)=>mesh.count=count);counts.clear();
    savedPlanes.forEach((planes,material)=>{material.clippingPlanes=planes;material.needsUpdate=true;});savedPlanes.clear();
    action='none';age=0;
  }
  function start(next:RevealAction){
    reset();action=next;
    if(next==='resource')blocks.forEach(mesh=>counts.set(mesh,mesh.count));
    if(next==='pitcut'||next==='benches'){
      stage.updateMatrixWorld(true);bounds.makeEmpty();
      pits.forEach(mesh=>{bounds.union(new THREE.Box3().setFromObject(mesh));for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){if(!savedPlanes.has(material))savedPlanes.set(material,material.clippingPlanes);material.clippingPlanes=[plane];material.needsUpdate=true;}});
      bounds.applyMatrix4(stage.matrixWorld.clone().invert());
    }
  }
  function update(delta:number,reduced=false){
    age+=Number.isFinite(delta)?Math.max(0,Math.min(.1,delta)):0;
    const progress=reduced?1:Math.min(1,age/5);
    if(action==='resource')counts.forEach((count,mesh)=>mesh.count=Math.round(count*progress));
    if(!bounds.isEmpty()&&(action==='pitcut'||action==='benches')){
      stage.updateMatrixWorld(true);
      if(action==='pitcut')plane.set(new THREE.Vector3(0,0,1),-THREE.MathUtils.lerp(bounds.min.z-1,(bounds.min.z+bounds.max.z)/2,progress));
      else {const steps=Math.max(1,Math.ceil((bounds.max.y-bounds.min.y+2)/CONCEPT.bench));plane.set(new THREE.Vector3(0,1,0),-THREE.MathUtils.lerp(bounds.max.y+1,bounds.min.y-1,Math.floor(progress*steps)/steps));}
      plane.applyMatrix4(stage.matrixWorld);
    }
    if(progress===1&&(action==='resource'||action==='benches'))reset();
    return progress;
  }
  return {start,update,reset};
}
