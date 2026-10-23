import * as THREE from 'three';
import {batchPlantMeshes} from './mine-plant-detail';
import {createConceptPad, conceptPadHeight, type ConceptPad} from './mine-scene';
import {overlaps,rectangle,type Point2,type CandidatePit} from './site-planning';

/** Screen a nearby proposed apron and connection against current concept pits.
 * This resolves a display conflict; it is not an engineering site selection. */
export function proposeFeedApron(mapped:Point2,discharge:Point2,pits:CandidatePit[],height:(x:number,z:number)=>number){
  let result:{point:Point2;offsetM:number;reliefM:number}|null=null,best=Infinity;
  for(let dx=-150;dx<=750;dx+=25)for(let dz=0;dz<=750;dz+=25){
    const point:Point2=[mapped[0]+dx,mapped[1]+dz],offsetM=Math.hypot(dx,dz);
    if(offsetM>=best)continue;
    const footprint=rectangle(point,190,140);
    if(pits.some(pit=>overlaps(footprint,pit.ring)))continue;
    const count=Math.ceil(Math.hypot(discharge[0]-point[0],discharge[1]-point[1])/25);
    let conflict=false;
    for(let i=0;i<=count&&!conflict;i++){
      const t=i/count,p:Point2=[point[0]+(discharge[0]-point[0])*t,point[1]+(discharge[1]-point[1])*t];
      conflict=pits.some(pit=>overlaps(rectangle(p,12,12),pit.ring));
    }
    if(conflict)continue;
    const ys=footprint.map(p=>height(...p)),reliefM=Math.max(...ys)-Math.min(...ys);
    const score=offsetM+reliefM*3;
    if(score<best){best=score;result={point,offsetM,reliefM};}
  }
  return result;
}

/** Illustrative feed station and map-traced conveyor; metre-space, true terrain. */
export function buildDevelopmentInfrastructure(feed: [number,number], discharge: [number,number], height: (x:number,z:number)=>number,plantLevel:number) {
  const root=new THREE.Group();root.name='report-development-infrastructure';
  const steel=new THREE.MeshStandardMaterial({color:0x8e9aa0,metalness:.5,roughness:.55});
  const roof=new THREE.MeshStandardMaterial({color:0x273d46,roughness:.8});
  const copper=new THREE.MeshStandardMaterial({color:0xc57b43,metalness:.3,roughness:.5});
  const concrete=new THREE.MeshStandardMaterial({color:0xa69b83,roughness:1});
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material,name:string)=>{
    const object=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);object.position.set(x,y,z);object.name=name;object.castShadow=true;object.receiveShadow=true;root.add(object);return object;
  };
  const [fx,fz]=feed;
  const feedPad:ConceptPad=createConceptPad(fx,fz,150,100,height);
  const level=feedPad.level;
  root.userData.conceptPad=feedPad;
  const padGround=(x:number,z:number)=>conceptPadHeight(feedPad,x,z,height(x,z));
  // The terrain is graded to this median datum by the scene builder. Keep a
  // thin hardstand above it instead of a deep rectangular slab down to the
  // lowest sampled cell, which read as a floating concrete plinth.
  box(150,2,100,fx,level,fz,concrete,'Feed point hardstand · illustrative 15000 m²');
  box(30,10,50,fx-45,level+5,fz,roof,'Feed point operatives shed · report allowance 30 × 50 m');
  for(const sign of [-1,1]){
    const panel=box(Math.hypot(15,3),.5,52,fx-45+sign*7.5,level+11.5,fz,steel,'Feed shed pitched roof');
    panel.rotation.z=-sign*Math.atan2(3,15);
  }
  box(16,8,.4,fx-45,level+4,fz+25.3,steel,'Feed station loading door');
  box(28,2,9,fx+25,level+1,fz+33,steel,'Feed point truck scale');
  box(17,14,17,fx+20,level+7,fz-8,steel,'Feed point receiving hopper');
  for(const dx of [-8,8])for(const dz of [-8,8])box(.6,18,.6,fx+20+dx,level+9,fz-8+dz,copper,'Feed point hopper frame');
  const hopper=new THREE.Mesh(new THREE.CylinderGeometry(11,4,8,4),copper);hopper.position.set(fx+20,level+20,fz-8);hopper.rotation.y=Math.PI/4;root.add(hopper);
  for(let i=0;i<3;i++){
    const pile=new THREE.Mesh(new THREE.ConeGeometry(9,7,16),new THREE.MeshStandardMaterial({color:0x6e6250,roughness:1}));pile.position.set(fx+i*20,level+3.5,fz+12);pile.name='Feed point ore bulking';root.add(pile);
  }
  const start=new THREE.Vector3(fx+20,level+18,fz-8);
  const end=new THREE.Vector3(discharge[0]-75,plantLevel+10,discharge[1]+20);
  const count=60,points:THREE.Vector3[]=[];
  for(let i=0;i<=count;i++){
    const p=start.clone().lerp(end,i/count);
    p.y=i===0?start.y:i===count?end.y:padGround(p.x,p.z)+10;
    points.push(p);
    if(i%2===0){
      const ground=padGround(p.x,p.z),h=Math.max(0,p.y-ground);
      for(const side of [-1,1])box(.8,h,.8,p.x+side*3,ground+h/2,p.z,steel,'Conveyor support · conceptual');
      box(7,.6,1,p.x,p.y-1,p.z,copper,'Conveyor cross beam');
    }
    if(i){
      const a=points[i-1],v=p.clone().sub(a),mid=a.clone().add(p).multiplyScalar(.5);
      const belt=box(4,v.length(),1,mid.x,mid.y,mid.z,roof,'Map-derived conveyor corridor · indicative alignment');
      belt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
      for(const side of [-1,1]){
        const rail=box(.35,v.length(),.35,mid.x+side*2.6,mid.y+1,mid.z,copper,'Conveyor safety rail');rail.quaternion.copy(belt.quaternion);
      }
    }
  }
  batchPlantMeshes(root);
  root.userData.feedAnchor=[fx,level+20,fz];root.userData.flow=points;
  root.userData.tooltipItems=[{title:'PaulSam development concept',rows:['Feed point and discharge approximate the Figure 3.3 map. Equipment, support heights and corridor geometry are illustrative.'],tone:'#c99460'}];
  return root;
}
