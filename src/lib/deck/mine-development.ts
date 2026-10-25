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
  const wall=new THREE.MeshStandardMaterial({color:0x9da59d,metalness:.04,roughness:.9});
  const glazing=new THREE.MeshStandardMaterial({color:0x8da4a1,metalness:.08,roughness:.48});
  const copper=new THREE.MeshStandardMaterial({color:0xc57b43,metalness:.3,roughness:.5});
  // A hardstand is a mapped reference colour, not a reflective surface. Use
  // an unlit palette material so its tone cannot shift while the site is orbited.
  const concrete=new THREE.MeshBasicMaterial({color:0xa69b83,toneMapped:false});
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
  const shedX=fx-45,shedLength=50,shedWidth=30,eaveHeight=8,ridgeRise=3;
  // PaulSam Table 5.9 gives a 30 × 50 m FIP built-up allowance. Keep that
  // envelope exact and build a quiet steel-framed service shed inside it;
  // the report does not provide an architectural plan or internal layout.
  box(shedWidth,.5,shedLength,shedX,level+.25,fz,concrete,'FIP operatives shed · concrete floor');
  for(const side of [-1,1]){
    const z=fz+side*(shedLength/2-.32);
    box(shedWidth,.4,.64,shedX,level+.45,z,concrete,'FIP operatives shed · perimeter plinth');
    for(let bay=0;bay<6;bay++){
      const x=shedX-shedWidth/2+bay*shedWidth/5;
      box(.45,eaveHeight-.5,.45,x,level+eaveHeight/2,z,steel,'FIP operatives shed · portal column');
      if(bay<5){
        const panelX=x+shedWidth/10;
        box(shedWidth/5-.35,4.2,.28,panelX,level+2.7,z,wall,'FIP operatives shed · wall panel');
        box(shedWidth/5-.35,1.2,.3,panelX,level+6.05,z,glazing,'FIP operatives shed · clerestory glazing');
      }
    }
    box(shedWidth,.3,.55,shedX,level+eaveHeight-.15,z,steel,'FIP operatives shed · eave beam');
  }
  for(const end of [-1,1]){
    const z=fz+end*(shedLength/2-.5);
    for(const side of [-1,1]){
      const x=shedX+side*(shedWidth/2-.28);
      box(.55,eaveHeight,.55,x,level+eaveHeight/2,z,steel,'FIP operatives shed · end frame');
    }
    if(end===1){
      // Keep a single generous receiving opening on the yard-facing end.
      // It is a visual service bay, not evidence of a specified plant layout.
      for(const side of [-1,1])box(7,eaveHeight-.6,.3,shedX+side*11.5,level+(eaveHeight-.6)/2,z,wall,'FIP operatives shed · gable end panel');
      box(16,1.4,.35,shedX,level+eaveHeight-.7,z,steel,'FIP operatives shed · receiving-bay lintel');
      box(15.2,6.2,.18,shedX,level+3.5,z+.2,roof,'FIP operatives shed · receiving-bay door');
    }else{
      box(shedWidth-1,eaveHeight-.7,.3,shedX,level+(eaveHeight-.7)/2,z,wall,'FIP operatives shed · gable end panel');
      // High-level windows and personnel doors suggest an operations/amenity
      // building without inventing its room plan or process equipment.
      box(9,1.1,.34,shedX,level+6.25,z,glazing,'FIP operatives shed · end clerestory');
      for(const side of [-1,1]){
        const door=box(1.7,3.4,.4,shedX+side*4.4,level+2.2,z-.22,roof,'FIP operatives shed · personnel door');
        door.userData.fipShedDoor=true;
      }
    }
  }
  for(const side of [-1,1]){
    const panel=box(Math.hypot(shedWidth/2,ridgeRise),.45,shedLength,shedX+side*shedWidth/4,level+eaveHeight+ridgeRise/2,fz,roof,'FIP operatives shed · pitched roof');
    panel.rotation.z=-side*Math.atan2(ridgeRise,shedWidth/2);
  }
  box(.8,.6,shedLength,shedX,level+eaveHeight+ridgeRise+.12,fz,steel,'FIP operatives shed · ridge cap');
  for(const side of [-1,1])box(.35,.55,shedLength,shedX+side*(shedWidth/2-.3),level+eaveHeight+.12,fz,steel,'FIP operatives shed · roof gutter');
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
  const conveyorSupports:{x:number;z:number;groundY:number;topY:number;height:number}[]=[];
  for(let i=0;i<=count;i++){
    const p=start.clone().lerp(end,i/count);
    const lateralGround=Math.max(padGround(p.x-3,p.z),padGround(p.x,p.z),padGround(p.x+3,p.z));
    p.y=i===0?start.y:i===count?end.y:lateralGround+10;
    points.push(p);
    if(i%2===0){
      for(const side of [-1,1]){
        // Sample each footing at its own terrain coordinate. The two feet can
        // sit on different elevations across a slope; reusing the belt centre
        // height left one side slightly buried or floating.
        const supportX=p.x+side*3,ground=padGround(supportX,p.z),top=p.y-.7,h=top-ground;
        if(!Number.isFinite(ground)||!Number.isFinite(top)||h<=0)continue;
        box(.8,h,.8,supportX,ground+h/2,p.z,steel,'Conveyor support · conceptual');
        conveyorSupports.push({x:supportX,z:p.z,groundY:ground,topY:top,height:h});
      }
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
  root.userData.fipShedAudit={
    basis:'PaulSam June 2023 · Table 5.9',
    footprintM:{width:shedWidth,length:shedLength,area:shedWidth*shedLength},
    conflictingTable5_1AreaM2:1200,
    modeledTable5_9AreaM2:1500,
    location:'approximate map registration; not a surveyed building location',
    arrangement:'illustrative exterior; report supplies no building plan or room layout',
    baseY:level,
  };
  root.userData.feedAnchor=[fx,level+20,fz];root.userData.flow=points;root.userData.conveyorSupports=conveyorSupports;
  root.userData.tooltipItems=[{title:'PaulSam development concept',rows:['Feed point and discharge approximate the Figure 3.3 map. Equipment, support heights and corridor geometry are illustrative.'],tone:'#c99460'}];
  return root;
}
