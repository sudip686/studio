import * as THREE from 'three';
import {CONCEPT, inside, insetCrest, type CandidatePit, type Point2, type SourcePitSurface} from './site-planning';
import {addPlantDetail, batchPlantMeshes, PLANT_PROCESS_STAGES} from './mine-plant-detail';
import {SITE_EARTHWORK_OPACITY} from './stable-materials';

/** Illustrative industrial campus: 400 × 280 local units, scaled to CONCEPT. */
export function buildConcentrator(options: {deferPlantDetail?: boolean} = {}) {
  const root=new THREE.Group(); root.name='conceptual-concentrator';
  root.userData.processStages=PLANT_PROCESS_STAGES;
  root.userData.plantDetailLoaded=false;
  // The pad is a neutral reference surface, not a mapped material. Keep its
  // color steady as the camera moves; the buildings, equipment and terrain
  // retain physically shaded materials for depth.
  const materials={steel:new THREE.MeshStandardMaterial({color:0x808b86,metalness:0.18,roughness:0.78}),roof:new THREE.MeshStandardMaterial({color:0x56625e,roughness:0.88}),copper:new THREE.MeshStandardMaterial({color:0x9e7856,metalness:.08,roughness:0.76}),concrete:new THREE.MeshBasicMaterial({color:0x92928a}),serviceRoad:new THREE.MeshBasicMaterial({color:0x4a5551,toneMapped:false}),roadMarking:new THREE.MeshBasicMaterial({color:0xc8b58e,toneMapped:false}),water:new THREE.MeshStandardMaterial({color:0x759593,metalness:0.02,roughness:0.76}),stockpile:new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.98,metalness:0}),interior:new THREE.MeshBasicMaterial({color:0x202b2d,toneMapped:false})};
  // Separate the light, ribbed wall sheets from the darker standing-seam
  // roof panels. One all-over cladding tone made the process halls read as
  // solid toy boxes from the executive overview camera.
  const cladding=new THREE.MeshStandardMaterial({color:0x74817b,roughness:.9,metalness:.02});
  cladding.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRoofPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRoofPoint=transformed;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vRoofPoint;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=0.94+0.06*smoothstep(-0.5,0.5,sin(vRoofPoint.x*4.0));');
  };
  cladding.customProgramCacheKey=()=> 'tanga-corrugated-roof-v1';
  const wallCladding=new THREE.MeshStandardMaterial({color:0xa2aca5,roughness:.92,metalness:.01});
  const wallRib=new THREE.MeshStandardMaterial({color:0x818d86,roughness:.82,metalness:.05});
  const roofSeam=new THREE.MeshStandardMaterial({color:0x929d96,roughness:.86,metalness:.03});
  function mesh(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,name=''){const a=new THREE.Mesh(g,m);a.position.set(x,y,z);a.name=name;a.castShadow=true;a.receiveShadow=true;root.add(a);return a;}
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material=materials.steel,name='')=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,name);
  const cylinder=(r:number,h:number,x:number,y:number,z:number,m:THREE.Material=materials.steel)=>mesh(new THREE.CylinderGeometry(r,r,h,24),m,x,y,z);
  // Naturalistic, elongated stockpile geometry replaces the pointed primitive
  // cones. The broad, slightly irregular crest and rounded ends read as
  // conceptual material storage without implying surveyed volume or capacity.
  const buildStockpile=(length:number,width:number,height:number,seed:number)=>{
    const segments=64,rings=16,positions:number[]=[],colors:number[]=[],indices:number[]=[];
    const baseTone=new THREE.Color(0x756b5d);
    positions.push(0,height*.96,0);colors.push(baseTone.r*.94,baseTone.g*.94,baseTone.b*.94);
    for(let ring=1;ring<=rings;ring++){
      const q=ring/rings,crest=q<.22?.96:.96*Math.pow((1-q)/.78,.82);
      for(let segment=0;segment<segments;segment++){
        const angle=segment/segments*Math.PI*2;
        const irregularity=1+.018*Math.sin(angle*3+seed)+.009*Math.sin(angle*7-seed*.7);
        const x=Math.cos(angle)*q*length*.5*irregularity;
        const z=Math.sin(angle)*q*width*.5*irregularity;
        const surfaceTone=.96+.035*Math.sin(angle*2+seed)*Math.sin(q*8+seed*.4);
        positions.push(x,height*crest*surfaceTone,z);
        const footShade=.92+.08*Math.min(1,q*1.4),grainTone=footShade*(.985+.02*Math.sin(segment*1.7+ring*.6+seed));
        colors.push(baseTone.r*grainTone,baseTone.g*grainTone,baseTone.b*grainTone);
      }
    }
    for(let segment=0;segment<segments;segment++)indices.push(0,1+(segment+1)%segments,1+segment);
    for(let ring=0;ring<rings-1;ring++){
      const inner=1+ring*segments,outer=inner+segments;
      for(let segment=0;segment<segments;segment++){
        const next=(segment+1)%segments,a=inner+segment,b=inner+next,c=outer+next,d=outer+segment;
        indices.push(a,b,c,a,c,d);
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const pile=new THREE.Mesh(geometry,materials.stockpile);
    pile.position.y=1;pile.name='Illustrative ROM material stockpile';pile.castShadow=true;pile.receiveShadow=true;
    root.add(pile);return pile;
  };
  // The pad and graded transition are placed against the existing terrain by
  // placeConcentrator. Avoid a second oversized slab beneath the whole campus:
  // it reads as a floating platform and hides the surrounding ground texture.
  // Keep the equipment bases on the graded site datum. The former slab centre
  // at y=0 buried every wall base by 1.5 m.
  // Lift the pad top a few decimetres above its concept-graded terrain datum.
  // The terrain is flattened to exactly `pad.level` inside the footprint; a
  // coplanar slab top caused depth-buffer z-fighting (color shimmer) while the
  // camera orbited. Footings still begin at y=0 and overlap the slab cleanly.
  box(400,3,280,0,-1.15,0,materials.concrete,'Plant pad');
  // Break up the broad hardstand with a subtle, site-fixed aggregate finish.
  // The low-amplitude vertex pattern is anchored in plant-local coordinates
  // (never screen space), so camera orbit cannot make the pad shimmer.
  const hardstandGeometry=new THREE.PlaneGeometry(400,280,80,56);
  const hardstandColor=hardstandGeometry.getAttribute('position');
  const hardstandTones=new Float32Array(hardstandColor.count*3);
  for(let vertex=0;vertex<hardstandColor.count;vertex++){
    const x=hardstandColor.getX(vertex),z=-hardstandColor.getY(vertex);
    const tone=.972+.012*Math.sin(x*.17+Math.sin(z*.09))*Math.sin(z*.13)+.009*Math.sin((x+z)*.37)+.006*Math.cos(z*.31-x*.23);
    hardstandTones[vertex*3]=tone;hardstandTones[vertex*3+1]=tone;hardstandTones[vertex*3+2]=tone;
  }
  hardstandGeometry.setAttribute('color',new THREE.BufferAttribute(hardstandTones,3));
  const hardstand=new THREE.Mesh(hardstandGeometry,new THREE.MeshStandardMaterial({color:0x757c77,vertexColors:true,roughness:.96,metalness:0}));
  hardstand.name='Plant yard hardstand finish';hardstand.rotation.x=-Math.PI/2;hardstand.position.y=.357;hardstand.receiveShadow=true;
  hardstand.userData.surfaceLighting='fixed plant-local aggregate pattern and site shadows; camera independent';root.add(hardstand);
  // Set the service deck onto the shared pad datum and lift only the thin
  // paint bands by 1 mm above the road top to keep them crisp without floating.
  const serviceRoadY=.425;
  box(392,.15,7,0,serviceRoadY,135,materials.serviceRoad,'Conceptual perimeter service lane');
  box(392,.15,5,0,serviceRoadY,-135,materials.serviceRoad,'Conceptual service lane');
  for(const x of [-195,195])box(4,.15,268,x,serviceRoadY,0,materials.serviceRoad,'Conceptual perimeter service lane');
  const serviceRoadTopY=serviceRoadY+.075;
  const serviceRoadMarkY=serviceRoadTopY+.011;
  for(let x=-185;x<=185;x+=14)box(5,.02,.5,x,serviceRoadMarkY,135,materials.roadMarking,'Illustrative service-lane marking');
  // Roof panels, portal frames and side openings give each building a legible silhouette.
  function shed(name:string,x:number,z:number,w:number,d:number,h:number,stage?:string){
    const rise=d*.12,roofLength=Math.hypot(d/2,rise);
    const bayCount=Math.max(3,Math.min(7,Math.round(w/16)));
    const bayWidth=w/bayCount;
    // A narrow, raised concrete footing gives the wall line a readable base
    // while staying flush with the shared site pad.
    box(w+1.5,.45,d+1.5,x,.225,z,materials.concrete,`${name} concrete footing`);
    for(const sign of [-1,1]){
      const slope=sign*Math.atan2(rise,d/2);
      const roof=box(w+1,.55,roofLength+.9,x,h+rise/2,z+sign*d/4,cladding,name);
      roof.rotation.x=slope;
      roof.userData.plantRoof=true;
      roof.userData.roofSlideSign=sign;
      if(stage)roof.userData.plantStage=stage;
      // Long standing seams give the broad roof planes a scaled industrial
      // sheet profile from the overview camera; one instanced strip per hall
      // side keeps the added detail light and opens with its selected roof.
      const seamCount=Math.max(4,Math.floor(w/10));
      const seams=new THREE.InstancedMesh(new THREE.BoxGeometry(.28,.18,roofLength*.94),roofSeam,seamCount);
      const seamDummy=new THREE.Object3D();
      for(let seam=0;seam<seamCount;seam++){
        const seamX=x-w/2+(seam+.5)*w/seamCount;
        seamDummy.position.set(seamX,h+rise/2+.36,z+sign*d/4);
        seamDummy.rotation.set(slope,0,0);seamDummy.updateMatrix();seams.setMatrixAt(seam,seamDummy.matrix);
      }
      seams.instanceMatrix.needsUpdate=true;seams.name=`${name} standing-seam roof ribs`;seams.castShadow=true;seams.userData.plantRoof=true;seams.userData.roofSlideSign=sign;
      if(stage)seams.userData.plantStage=stage;
      root.add(seams);
      // Repeated portal rafters and eave members make the process halls read
      // as steel-framed buildings at whole-campus scale, not smooth toy boxes.
      for(let bay=0;bay<=bayCount;bay++){
        const bayX=x-w/2+bay*bayWidth;
        const rafter=box(.75,.8,roofLength,bayX,h+rise/2-.55,z+sign*d/4,materials.steel,`${name} portal rafter`);
        rafter.rotation.x=slope;
        rafter.userData.plantRoof=true;rafter.userData.roofSlideSign=sign;if(stage)rafter.userData.plantStage=stage;
        if(sign===1){
          const tie=box(.65,.7,d-.8,bayX,h-.45,z,materials.copper,`${name} portal tie beam`);
          tie.userData.plantRoof=true;tie.userData.roofSlideSign=0;if(stage)tie.userData.plantStage=stage;
        }
      }
      const eave=box(w+1,.8,.8,x,h-.35,z+sign*d/2,materials.steel,`${name} eave girder`);
      eave.userData.plantRoof=true;eave.userData.roofSlideSign=sign;if(stage)eave.userData.plantStage=stage;
      const gutter=box(w+1,.4,.55,x,h+.05,z+sign*d/2,materials.roof,`${name} rain gutter`);
      gutter.userData.plantRoof=true;gutter.userData.roofSlideSign=sign;if(stage)gutter.userData.plantStage=stage;
      // Close the lower wall bays with restrained corrugated cladding, leaving
      // a clerestory strip and the main process portals readable. The steel
      // frame and roof cutaway still expose the equipment during inspection.
      for(let bay=0;bay<bayCount;bay++){
        const bayX=x-w/2+(bay+.5)*bayWidth;
        const panelWidth=bayWidth-.8;
        box(panelWidth,h*.56,.32,bayX,h*.31,z+sign*(d/2-.22),wallCladding,`${name} corrugated wall panel`);
        // Add shallow, repeated sheet ribs to the broad lower cladding. These
        // are real geometry, batched with the plant, so daylight gives the
        // elevations scale without a camera-dependent shading shader.
        const ribCount=Math.max(2,Math.floor(panelWidth/.9));
        for(let rib=1;rib<ribCount;rib++){
          const ribX=bayX-panelWidth/2+(rib/ribCount)*panelWidth;
          box(.16,h*.56,.12,ribX,h*.31,z+sign*(d/2-.06),wallRib,`${name} exterior wall rib`);
        }
        box(bayWidth-.8,h*.12,.36,bayX,h*.79,z+sign*(d/2-.18),materials.water,`${name} clerestory glazing`);
      }
    }
    for(let i=0;i<=bayCount;i++)for(const k of [-d/2,d/2])box(.8,h,.8,x-w/2+i*bayWidth,h/2,z+k,materials.copper,`${name} portal column`);
    const frontPortal=stage
      ?{x:stage==='feed'&&x===-88?-104:stage==='dewatering'?104:x+(stage==='product'?18:0),width:stage==='feed'?12:stage==='product'?28:18,height:stage==='feed'?23:stage==='product'?21:Math.min(h-3,18)}
      :null;
    if(frontPortal){
      const left=frontPortal.x-frontPortal.width/2-(x-w/2),right=x+w/2-(frontPortal.x+frontPortal.width/2);
      box(left,h,d*.04,x-w/2+left/2,h/2,z+d/2,materials.steel);
      box(right,h,d*.04,x+w/2-right/2,h/2,z+d/2,materials.steel);
      box(frontPortal.width,h-frontPortal.height,d*.04,frontPortal.x,(h+frontPortal.height)/2,z+d/2,materials.steel);
      // A recessed, shadowed loading bay gives each process building a clear
      // working face while keeping the roof cutaway as the primary interior view.
      box(frontPortal.width,frontPortal.height,.15,frontPortal.x,frontPortal.height/2,z+d/2-.12,materials.interior,`${name} loading-bay recess`);
      for(const side of [-1,1])box(.8,frontPortal.height+1,.9,frontPortal.x+side*(frontPortal.width/2+.45),frontPortal.height/2,z+d/2,materials.copper,`${name} portal jamb`);
      box(frontPortal.width+1,.9,.9,frontPortal.x,frontPortal.height+.45,z+d/2,materials.copper,`${name} portal lintel`);
    }else box(w,h,d*.04,x,h/2,z+d/2,materials.steel);
    // Clerestory glazing and end walls give industrial buildings volume.
    for(const sign of [-1,1]){
      if(stage){
        const portal=Math.min(24,d*.55),height=Math.min(h-4,22),side=(d-portal)/2;
        for(const edge of [-1,1])box(1,h,side,x+sign*w/2,h/2,z+edge*(portal+side)/2,materials.steel);
        box(1,h-height,portal,x+sign*w/2,(h+height)/2,z,materials.steel);
      }else box(1,h,d,x+sign*w/2,h/2,z,materials.steel);
    }
    for(let i=0;i<6;i++)box(w/9,3,.3,x-w*.4+i*w*.16,h-5,z+d/2+.5,materials.water,'High-level glazing');
    // A continuous ridge cover and inset rooflights give each otherwise plain
    // hall a factory roof silhouette at the investor-view camera distance.
    const ridge=box(w+1,.75,1.5,x,h+rise+.2,z,materials.roof,`${name} roof ridge cap`);
    ridge.userData.plantRoof=true;ridge.userData.roofSlideSign=0;if(stage)ridge.userData.plantStage=stage;
    for(const sign of [-1,1]){
      const rooflight=box(w*.68,.18,d*.075,x,h+rise*.6,sign*d*.2,materials.water,`${name} rooflight`);
      rooflight.rotation.x=sign*Math.atan2(rise,d/2);
      rooflight.userData.plantRoof=true;rooflight.userData.roofSlideSign=sign;if(stage)rooflight.userData.plantStage=stage;
    }
    if(w>=60){
      for(const sign of [-1,1]){
        const ventBase=box(5,1.2,5,x+w*.28,h+rise+1.1,sign*3,materials.roof,`${name} roof ventilator base`);
        const vent=mesh(new THREE.CylinderGeometry(1.7,2.5,3.2,12),materials.steel,x+w*.28,h+rise+3.3,sign*3,`${name} roof ventilator`);
        for(const feature of [ventBase,vent]){feature.userData.plantRoof=true;feature.userData.roofSlideSign=sign;if(stage)feature.userData.plantStage=stage;}
      }
    }
  }
  // ROM / receiving and primary crushing.
  const primaryRomPile=buildStockpile(44,34,13,7);
  primaryRomPile.position.set(-106,1,44);primaryRomPile.name='Illustrative primary ROM stockpile';
  box(22,12,18,-104,10,-16,materials.steel,'Feed bin');
  mesh(new THREE.CylinderGeometry(12,5,12,4),materials.copper,-104,21,-16,'Receiving hopper').rotation.y=Math.PI/4;
  shed('ROM & crushing',-88,-16,72,58,30,'feed');
  shed('Milling',-30,-18,48,45,27,'milling');
  const mill=cylinder(8,23,-30,12,-18);mill.rotation.z=Math.PI/2;mill.name='Milling process drum';mill.userData.preserveAnimation=true;root.userData.processMill=mill;
  // Longitudinal shell ribs provide scale and make rotation legible. Instances
  // stay attached to the drum and share its local cylinder axis.
  const millRibs=new THREE.InstancedMesh(new THREE.BoxGeometry(.55,23,.55),materials.roof,12);
  const ribTransform=new THREE.Matrix4();
  for(let i=0;i<12;i++){const angle=i*Math.PI/6;ribTransform.makeTranslation(Math.cos(angle)*8.1,0,Math.sin(angle)*8.1);millRibs.setMatrixAt(i,ribTransform);}
  millRibs.name='Mill shell stiffeners';millRibs.castShadow=true;mill.add(millRibs);
  // Open-top flotation vessels replace solid box placeholders with visible
  // liquor surfaces, tapered underflow hoppers, support legs and a continuous
  // drive train. This is an illustrative industrial form; the lab report does
  // not define production cell dimensions or a plant flowsheet.
  let flotationVesselCount=0,flotationHopperCount=0,flotationWallPanelCount=0,flotationLiquorSurfaceCount=0;
  for(let row=0;row<2;row++)for(let i=0;i<5;i++){
    const x=8+i*15,z=-36+row*24;
    const hopperGeometry=new THREE.BufferGeometry();
    hopperGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
      -5.7,4.4,-7.6, 5.7,4.4,-7.6, 5.7,4.4,7.6, -5.7,4.4,7.6,
      -2.4,.75,-3.3, 2.4,.75,-3.3, 2.4,.75,3.3, -2.4,.75,3.3,
    ],3));
    hopperGeometry.setAttribute('uv',new THREE.Float32BufferAttribute([
      0,0, 1,0, 1,1, 0,1, .3,.3, .7,.3, .7,.7, .3,.7,
    ],2));
    hopperGeometry.setIndex([0,1,5, 0,5,4, 1,2,6, 1,6,5, 2,3,7, 2,7,6, 3,0,4, 3,4,7, 4,5,6, 4,6,7]);
    hopperGeometry.computeVertexNormals();
    mesh(hopperGeometry,materials.steel,x,0,z,'Flotation cell tapered underflow hopper');
    flotationHopperCount++;

    // Four heavy legs carry the tapered vessel into the shared plant pad.
    for(const sideX of [-1,1])for(const sideZ of [-1,1])box(.85,3.6,.85,x+sideX*4.65,1.85,z+sideZ*6.35,materials.steel,'Flotation cell support leg');
    // Open access sides make the contents visible from the roof cutaway.
    box(.55,7.7,15.6,x-5.7,8.25,z,materials.steel,'Flotation cell long wall');
    box(.55,7.7,15.6,x+5.7,8.25,z,materials.steel,'Flotation cell long wall');
    box(11.8,7.7,.55,x,8.25,z-7.7,materials.steel,'Flotation cell end wall');
    box(11.8,7.7,.55,x,8.25,z+7.7,materials.steel,'Flotation cell end wall');
    flotationWallPanelCount+=4;
    box(5.2,.75,6.8,x,.4,z,materials.roof,'Flotation cell underflow outlet');
    const liquor=mesh(new THREE.PlaneGeometry(10.7,14.7),materials.water,x,11.55,z,'Flotation cell liquor surface');
    liquor.rotation.x=-Math.PI/2;liquor.castShadow=false;liquor.receiveShadow=true;
    flotationLiquorSurfaceCount++;
    cylinder(1.1,9,x,14,z,materials.copper);
    box(4,3,4,x,20,z,materials.roof);
    flotationVesselCount++;
  }
  root.userData.flotationVesselAudit={vessels:flotationVesselCount,hoppers:flotationHopperCount,wallPanels:flotationWallPanelCount,liquorSurfaces:flotationLiquorSurfaceCount,designBasis:'concept visualization only; dimensions and flowsheet are not defined by laboratory testwork'};
  box(78,1,5,38,15,0,materials.steel);
  for(let x=0;x<80;x+=6)box(0.5,4,0.5,x,17,2,materials.copper);
  box(80,0.4,0.4,38,19,2,materials.copper);
  shed('Flotation',40,-36,88,60,24,'flotation');
  cylinder(17,9,103,6,-31);cylinder(16,0.4,103,10.7,-31,materials.water);
  box(34,1,2,103,12,-31,materials.copper); // thickener bridge
  shed('Dewatering / product handling',83,44,75,45,25,'dewatering');
  for(let i=0;i<9;i++)box(1,7,12,58+i*2.4,6,44,materials.steel,'Filter plates');
  for(let i=0;i<5;i++)box(7,6,7,92+i*8,5,51,materials.concrete,'Packaged product');
  shed('Workshop',-37,57,48,28,16);
  for(let i=0;i<3;i++)cylinder(7,15,-5+i*17,9,58,materials.water);
  // Secondary detail stays inside the approved pad: access stairs, tank
  // platforms and equipment supports, without suggesting an engineered layout.
  for(let step=0;step<15;step++)box(5,1,1.2,-1,2+step,20-step*1.2,materials.steel,'Flotation access stair');
  for(const x of [-4,2])for(let step=0;step<15;step+=3)box(.35,3,.35,x,4+step,20-step*1.2,materials.copper);
  for(let i=0;i<3;i++){
    const x=-5+i*17;
    cylinder(7.8,1,x,1.8,58,materials.concrete);
    cylinder(7.4,.4,x,16.7,58,materials.steel);
    for(let rung=0;rung<12;rung++)box(2,.25,.3,x,2+rung*1.2,65.4,materials.copper,'Tank access ladder');
    for(const side of [-1,1])box(.25,15,.25,x+side,9,65.4,materials.steel);
  }
  // Electrical kiosk and transformer bank in the clear north-west corner.
  shed('Electrical kiosk',-106,-58,24,16,11);
  for(let i=0;i<3;i++){
    box(5,5,7,-82+i*9,4,-58,materials.steel,'Transformer');
    for(let j=0;j<3;j++)cylinder(.45,2,-83+i*9+j,7.5,-58,materials.copper);
  }
  // Added operating areas expand the campus rather than stretching equipment.
  shed('Covered blending and feed hall',-85,-109,116,40,32,'feed');
  for(let i=0;i<3;i++){
    const pile=buildStockpile(26,19,11,11+i);
    pile.position.set(-122+i*36,1,-108);pile.name='Illustrative covered-feed stockpile';
  }
  shed('Product storage and loadout',100,110,166,40,29,'product');
  shed('Maintenance and spares hall',-157,102,58,48,22);
  for(const [index,z] of [-32,30].entries()){
    const pile=buildStockpile(48,37,17,21+index);
    pile.position.set(-163,1,z);pile.name='Illustrative ROM receiving stockpile';
  }
  // Second flotation train and reclaim-water thickener.
  for(let i=0;i<5;i++){
    box(12,10,18,5+i*17,7,-103,materials.steel,'Secondary flotation train');
    box(10,.4,16,5+i*17,12.3,-103,materials.water);
    cylinder(1,8,5+i*17,16,-103,materials.copper);
  }
  box(88,1,4,39,15,-88,materials.steel,'Flotation maintenance walkway');
  cylinder(23,11,164,7,-84);cylinder(22,.4,164,12.7,-84,materials.water);
  box(46,1.2,3,164,14,-84,materials.copper,'Reclaim thickener bridge');
  for(let i=0;i<4;i++)box(8,5,18,144+i*12,4,47,materials.roof,'Product shipping container');
  // Pipe-rack corridors and covered conveyors link the new operating areas.
  const campusLinks=[[-85,22,-89,-30,22,-40],[80,15,-103,142,15,-84],[164,15,-61,103,15,-31],[100,19,67,100,19,90]];
  for(const [ax,ay,az,bx,by,bz] of campusLinks){
    const a=new THREE.Vector3(ax,ay,az),b=new THREE.Vector3(bx,by,bz),v=b.clone().sub(a);
    const belt=box(4,v.length(),2,0,0,0,materials.copper,'Campus conveyor / pipe rack');
    belt.position.copy(a).add(b).multiplyScalar(.5);belt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
    for(let t=.2;t<1;t+=.3){const p=a.clone().lerp(b,t);box(1,p.y,1,p.x,p.y/2,p.z,materials.steel);}
  }
  // Connected conveyors and pipe racks. Flow points are exposed for animation.
  const flow=[new THREE.Vector3(-106,10,44),new THREE.Vector3(-104,21,-16),new THREE.Vector3(-73,16,-16),new THREE.Vector3(-30,16,-18),new THREE.Vector3(8,16,-36),new THREE.Vector3(68,16,-36),new THREE.Vector3(103,14,-31),new THREE.Vector3(104,14,44),new THREE.Vector3(104,14,78),new THREE.Vector3(100,14,78),new THREE.Vector3(100,14,110)];
  for(let i=0;i<flow.length-1;i++){
    const a=flow[i],b=flow[i+1],v=b.clone().sub(a);
    const dryTransfer=i<3||i>=7;
    const belt=box(dryTransfer?5:1.4,v.length(),dryTransfer?2:1.4,0,0,0,dryTransfer?materials.roof:materials.copper);
    belt.position.copy(a).add(b).multiplyScalar(.5);belt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
    if(dryTransfer)for(let t=.2;t<1;t+=.3){const p=a.clone().lerp(b,t);box(1,p.y,1,p.x,p.y/2,p.z,materials.steel);}
  }
  root.userData.flow=flow;
  root.userData.labels=[['ROM / feed',-106,32,20],['Crushing & milling',-50,37,-20],['Flotation',40,30,-24],['Dewatering & product',95,35,45]];
  // Supporting facilities occupy the southern service yard, clear of the process.
  shed('Administration and laboratory',-20,194,75,44,18);
  shed('Heavy vehicle workshop and spares',-155,194,115,58,24);
  for(const x of [-192,-155,-118])box(25,18,.4,x,9,223.3,materials.roof,'Workshop roller shutter bay');
  for(let i=0;i<6;i++)box(9,5,.4,-51+i*12,12,216.3,materials.water,'Administration glazing');
  for(const x of [50,100,150])box(23,21,.4,x,10.5,130.3,materials.steel,'Product warehouse loading door');
  for(let i=0;i<5;i++)box(4,.2,32,-190+i*15,1.5,194,materials.concrete,'Workshop service bay markings');
  box(90,2,65,144,1,193,materials.roof,'Lined site-water provision · illustrative');
  box(80,.4,55,144,2.2,193,materials.water,'Site water / reclaim allowance · not a TSF design');
  for(const x of [-246,246]){
    for(let z=-246;z<=246;z+=24)box(.7,5,.7,x,2.5,z,materials.steel,'Perimeter fence post');
    for(const y of [2,4.5])box(.4,.4,492,x,y,0,materials.steel,'Perimeter fence rail');
  }
  for(const z of [-246,246]){
    for(let x=-246;x<=246;x+=24)if(z<0||Math.abs(x)>40)box(.7,5,.7,x,2.5,z,materials.steel,'Perimeter fence post');
    for(const y of [2,4.5])for(const sign of [-1,1])box(206,.4,.4,sign*143,y,z,materials.steel,'Perimeter fence rail and gate opening');
  }
  for(let i=0;i<7;i++)box(18,.1,.6,-90+i*29,1,238,materials.roof,'Service yard centre markings');
  // Measure structural bases against the pad before batching removes their
  // individual source names. The pad top intentionally overlaps each footing
  // so buildings meet the graded platform without a visible gap.
  const padMesh=root.getObjectByName('Plant pad') as THREE.Mesh<THREE.BufferGeometry>|undefined;
  padMesh?.geometry.computeBoundingBox();
  const footingBases:number[]=[],columnBases:number[]=[];
  for(const child of root.children){
    if(!(child instanceof THREE.Mesh))continue;
    if(!child.geometry.boundingBox)child.geometry.computeBoundingBox();
    const baseY=child.position.y+(child.geometry.boundingBox?.min.y??0);
    if(child.name.endsWith('concrete footing'))footingBases.push(baseY);
    if(child.name.endsWith('portal column'))columnBases.push(baseY);
  }
  root.userData.plantStructuralBaseAudit={
    footingCount:footingBases.length,
    columnCount:columnBases.length,
    padTopLocalY:padMesh?padMesh.position.y+(padMesh.geometry.boundingBox?.max.y??0):null,
    footingBottomLocalMinY:footingBases.length?Math.min(...footingBases):null,
    footingBottomLocalMaxY:footingBases.length?Math.max(...footingBases):null,
    columnBottomLocalMinY:columnBases.length?Math.min(...columnBases):null,
    columnBottomLocalMaxY:columnBases.length?Math.max(...columnBases):null,
  };
  const serviceDecks=root.children.filter((child):child is THREE.Mesh<THREE.BufferGeometry,THREE.Material>=>child instanceof THREE.Mesh&&child.name.includes('Conceptual')&&child.name.includes('service lane'));
  const serviceMarkings=root.children.filter((child):child is THREE.Mesh<THREE.BufferGeometry,THREE.Material>=>child instanceof THREE.Mesh&&child.name==='Illustrative service-lane marking');
  const localBounds=(object:THREE.Mesh<THREE.BufferGeometry,THREE.Material>)=>{if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();const bounds=object.geometry.boundingBox!;return {bottom:object.position.y+bounds.min.y,top:object.position.y+bounds.max.y};};
  const deckBounds=serviceDecks.map(localBounds),markingBounds=serviceMarkings.map(localBounds);
  const padTopLocalY=padMesh?padMesh.position.y+(padMesh.geometry.boundingBox?.max.y??0):null;
  root.userData.plantServiceRoadContactAudit={
    deckCount:serviceDecks.length,markingCount:serviceMarkings.length,padTopLocalY,
    deckBottomLocalMinY:deckBounds.length?Math.min(...deckBounds.map(item=>item.bottom)):null,
    deckBottomLocalMaxY:deckBounds.length?Math.max(...deckBounds.map(item=>item.bottom)):null,
    deckTopLocalMinY:deckBounds.length?Math.min(...deckBounds.map(item=>item.top)):null,
    deckTopLocalMaxY:deckBounds.length?Math.max(...deckBounds.map(item=>item.top)):null,
    markingBottomLocalMinY:markingBounds.length?Math.min(...markingBounds.map(item=>item.bottom)):null,
    markingBottomLocalMaxY:markingBounds.length?Math.max(...markingBounds.map(item=>item.bottom)):null,
  };
  root.userData.siteServices=[-20,25,194];
  batchPlantMeshes(root);
  root.userData.ensurePlantDetail=()=>{
    if(root.userData.plantDetailLoaded)return false;
    const firstDetailIndex=root.children.length;
    addPlantDetail(root,materials);
    batchPlantMeshes(root,firstDetailIndex);
    root.userData.plantDetailLoaded=true;
    return true;
  };
  if(!options.deferPlantDetail)(root.userData.ensurePlantDetail as ()=>boolean)();
  root.scale.set(CONCEPT.plantWidth/400,CONCEPT.plantWidth/400,CONCEPT.plantDepth/280);
  return root;
}

export type ConceptPad={x:number;z:number;width:number;depth:number;level:number;transition:number};

function padBlend(pad:ConceptPad,x:number,z:number){
  // Measure the transition from the rectangular pad edge with a rounded
  // Euclidean corner. A max-axis distance produced a square, orthogonal berm
  // around the whole facility that looked like a second platform in overview.
  const dx=Math.max(0,Math.abs(x-pad.x)-pad.width/2),dz=Math.max(0,Math.abs(z-pad.z)-pad.depth/2);
  const distance=Math.hypot(dx,dz);
  const t=Math.min(1,distance/pad.transition);return 1-t*t*(3-2*t);
}

export function conceptPadHeight(pad:ConceptPad,x:number,z:number,sourceHeight:number){
  const blend=padBlend(pad,x,z);return sourceHeight*(1-blend)+pad.level*blend;
}

/** Build a display-only, terrain-conforming facility pad at a stable median datum. */
export function createConceptPad(x:number,z:number,width:number,depth:number,height:(x:number,z:number)=>number,transition=30):ConceptPad {
  const levels:number[]=[];
  for(let dx=-width/2;dx<=width/2;dx+=5)for(let dz=-depth/2;dz<=depth/2;dz+=5)levels.push(height(x+dx,z+dz));
  levels.sort((a,b)=>a-b);
  return {x,z,width,depth,level:levels[Math.floor(levels.length/2)]+1.5,transition};
}

/** An illustrative cut/fill display, never an engineered earthworks design.
 * Median ground level avoids a tall plinth perched above the entire hillside. */
export function placeConcentrator(root:THREE.Group,x:number,z:number,height:(x:number,z:number)=>number,footprint?:{width:number;depth:number}) {
  const width=footprint?.width??CONCEPT.plantWidth,depth=footprint?.depth??CONCEPT.plantDepth;
  const pad=createConceptPad(x,z,width,depth,height);
  const {level}=pad;
  root.userData.conceptPad=pad;
  const baseAudit=root.userData.plantStructuralBaseAudit as {footingCount:number;columnCount:number;padTopLocalY:number|null;footingBottomLocalMinY:number|null;footingBottomLocalMaxY:number|null;columnBottomLocalMinY:number|null;columnBottomLocalMaxY:number|null}|undefined;
  if(baseAudit&&baseAudit.padTopLocalY!==null&&baseAudit.footingBottomLocalMinY!==null&&baseAudit.footingBottomLocalMaxY!==null&&baseAudit.columnBottomLocalMinY!==null&&baseAudit.columnBottomLocalMaxY!==null){
    const scaleY=root.scale.y,padTopAboveDatumM=baseAudit.padTopLocalY*scaleY;
    const footingBottomMinM=(baseAudit.footingBottomLocalMinY??0)*scaleY,footingBottomMaxM=(baseAudit.footingBottomLocalMaxY??0)*scaleY;
    const columnBottomMinM=(baseAudit.columnBottomLocalMinY??0)*scaleY,columnBottomMaxM=(baseAudit.columnBottomLocalMaxY??0)*scaleY;
    root.userData.plantFoundationContactAudit={
      footingCount:baseAudit.footingCount,columnCount:baseAudit.columnCount,
      padTopAboveGradedDatumM:Number(padTopAboveDatumM.toFixed(3)),
      footingBottomRangeAboveGradedDatumM:[Number(footingBottomMinM.toFixed(3)),Number(footingBottomMaxM.toFixed(3))],
      columnBottomRangeAboveGradedDatumM:[Number(columnBottomMinM.toFixed(3)),Number(columnBottomMaxM.toFixed(3))],
      maximumFootingGapM:Number(Math.max(0,footingBottomMaxM-padTopAboveDatumM).toFixed(3)),
      minimumFootingOverlapM:Number(Math.max(0,padTopAboveDatumM-footingBottomMaxM).toFixed(3)),
      maximumColumnGapM:Number(Math.max(0,columnBottomMaxM-padTopAboveDatumM).toFixed(3)),
      minimumColumnOverlapM:Number(Math.max(0,padTopAboveDatumM-columnBottomMaxM).toFixed(3)),
      source:'modeled building footings and portal columns against illustrative graded pad; not a foundation design',
    };
  }
  const roadAudit=root.userData.plantServiceRoadContactAudit as {deckCount:number;markingCount:number;padTopLocalY:number|null;deckBottomLocalMinY:number|null;deckBottomLocalMaxY:number|null;deckTopLocalMinY:number|null;deckTopLocalMaxY:number|null;markingBottomLocalMinY:number|null;markingBottomLocalMaxY:number|null}|undefined;
  if(roadAudit&&roadAudit.padTopLocalY!==null&&roadAudit.deckBottomLocalMaxY!==null&&roadAudit.deckTopLocalMaxY!==null&&roadAudit.markingBottomLocalMinY!==null){
    const scaleY=root.scale.y,padTop=roadAudit.padTopLocalY,deckBottom=roadAudit.deckBottomLocalMaxY,deckTop=roadAudit.deckTopLocalMaxY,markingBottom=roadAudit.markingBottomLocalMinY;
    root.userData.plantServiceRoadContactRuntimeAudit={
      deckCount:roadAudit.deckCount,markingCount:roadAudit.markingCount,
      maximumRoadToPadGapM:Number(Math.max(0,(deckBottom-padTop)*scaleY).toFixed(4)),
      minimumRoadToPadOverlapM:Number(Math.max(0,(padTop-deckBottom)*scaleY).toFixed(4)),
      minimumMarkingClearanceM:Number(Math.max(0,(markingBottom-deckTop)*scaleY).toFixed(4)),
      maximumMarkingClearanceM:Number(Math.max(0,((roadAudit.markingBottomLocalMaxY??markingBottom)-(roadAudit.deckTopLocalMinY??deckTop))*scaleY).toFixed(4)),
      source:'conceptual internal lane and paint bands against display pad; not a civil road design',
    };
  }
  const vertices:number[]=[];
  // Parallel rounded-rectangle contours keep the engineering pad square while
  // allowing its unsourced cut/fill transition to blend into the natural
  // terrain instead of ending in a second hard-edged rectangle.
  const ring=(distance:number)=>{
    const halfWidth=width/2,halfDepth=depth/2,segmentsPerCorner=12,segmentsPerSide=Math.ceil(Math.max(width,depth)/5),points:number[][]=[];
    const arc=(cx:number,cz:number,start:number)=>{
      for(let i=0;i<segmentsPerCorner;i++){
        const angle=start+i/segmentsPerCorner*Math.PI/2;
        points.push([cx+Math.cos(angle)*distance,cz+Math.sin(angle)*distance]);
      }
    };
    const line=(from:number[],to:number[])=>{
      for(let i=0;i<segmentsPerSide;i++){
        const t=i/segmentsPerSide;points.push([THREE.MathUtils.lerp(from[0],to[0],t),THREE.MathUtils.lerp(from[1],to[1],t)]);
      }
    };
    const topRight:[number,number]=[halfWidth,halfDepth],topLeft:[number,number]=[-halfWidth,halfDepth],bottomLeft:[number,number]=[-halfWidth,-halfDepth],bottomRight:[number,number]=[halfWidth,-halfDepth];
    arc(...topRight,0);line([halfWidth,halfDepth+distance],[-halfWidth,halfDepth+distance]);
    arc(...topLeft,Math.PI/2);line([-halfWidth-distance,halfDepth],[-halfWidth-distance,-halfDepth]);
    arc(...bottomLeft,Math.PI);line([-halfWidth,-halfDepth-distance],[halfWidth,-halfDepth-distance]);
    arc(...bottomRight,Math.PI*1.5);line([halfWidth+distance,-halfDepth],[halfWidth+distance,halfDepth]);
    return points;
  };
  const vertex=(p:number[])=>[p[0]/root.scale.x,((height(x+p[0],z+p[1])*(1-padBlend(pad,x+p[0],z+p[1]))+level*padBlend(pad,x+p[0],z+p[1]))-level+.3)/root.scale.y,p[1]/root.scale.z];
  for(let strip=0;strip<6;strip++){
    const inner=ring(strip*5),outer=ring((strip+1)*5);
    for(let i=0;i<inner.length;i++){
      const next=(i+1)%inner.length,a=vertex(inner[i]),b=vertex(inner[next]),c=vertex(outer[i]),d=vertex(outer[next]);
      vertices.push(...a,...c,...b,...b,...c,...d);
    }
  }
  // Keep the plant apron on one fixed earth palette, but let the registered
  // terrain imagery carry the close view beneath its conceptual grading tint.
  // Fixed site-light shading restores relief/contact shadows; no camera-driven
  // color variation is introduced.
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const earthworkMaterial=new THREE.MeshStandardMaterial({color:0x918574,roughness:.96,metalness:0,transparent:true,opacity:SITE_EARTHWORK_OPACITY,depthWrite:false,side:THREE.DoubleSide});
  const earthworks=new THREE.Mesh(geometry,earthworkMaterial);
  earthworks.name='Illustrative cut and fill transition · not engineered';earthworks.receiveShadow=true;root.add(earthworks);
  earthworks.userData.surfaceLighting='fixed site lighting; rough earth material; camera independent';
  root.position.set(x,level,z);return level;
}

function retainSourceTerrain(geometry:THREE.BufferGeometry){
  const position=geometry.getAttribute('position');
  if(position&&!geometry.userData.sourcePositions){
    const sourcePositions=new Float32Array(position.array);
    const sourcePositionAttribute=new THREE.BufferAttribute(sourcePositions,position.itemSize,position.normalized);
    geometry.userData.sourcePositions=sourcePositions;
    geometry.userData.sourcePositionAttribute=sourcePositionAttribute;
    geometry.userData.sourceBoundingSphere=geometry.boundingSphere?.clone()??null;
    const normal=geometry.getAttribute('normal');
    if(normal){
      const sourceNormalAttribute=new THREE.BufferAttribute(new Float32Array(normal.array),normal.itemSize,normal.normalized);
      geometry.userData.sourceNormalAttribute=sourceNormalAttribute;
    }
  }
}
function retainConceptTerrain(geometry:THREE.BufferGeometry){
  const position=geometry.getAttribute('position');
  const conceptPositions=new Float32Array(position.array);
  const conceptPositionAttribute=new THREE.BufferAttribute(conceptPositions,position.itemSize,position.normalized);
  geometry.userData.conceptPositions=conceptPositions;
  geometry.userData.conceptPositionAttribute=conceptPositionAttribute;
  geometry.userData.conceptBoundingSphere=geometry.boundingSphere?.clone()??null;
  const normal=geometry.getAttribute('normal');
  if(normal){
    const conceptNormalAttribute=new THREE.BufferAttribute(new Float32Array(normal.array),normal.itemSize,normal.normalized);
    geometry.userData.conceptNormalAttribute=conceptNormalAttribute;
  }
  geometry.userData.conceptVisible=undefined;
}
export function gradeConceptPad(geometry:THREE.BufferGeometry,pad:ConceptPad){
  const position=geometry.getAttribute('position');if(!position)return;
  retainSourceTerrain(geometry);
  for(let i=0;i<position.count;i++){
    const blend=padBlend(pad,position.getX(i),position.getZ(i));
    if(blend>0)position.setY(i,position.getY(i)*(1-blend)+pad.level*blend);
  }
  position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();retainConceptTerrain(geometry);
}
export function showConceptTerrain(geometry:THREE.BufferGeometry,show:boolean){
  if(!geometry.userData.sourcePositions||!geometry.userData.conceptPositions||geometry.userData.conceptVisible===show)return;
  const position=show?geometry.userData.conceptPositionAttribute:geometry.userData.sourcePositionAttribute;
  const normal=show?geometry.userData.conceptNormalAttribute:geometry.userData.sourceNormalAttribute;
  if(position)geometry.setAttribute('position',position);
  if(normal)geometry.setAttribute('normal',normal);
  geometry.boundingSphere=show?geometry.userData.conceptBoundingSphere:geometry.userData.sourceBoundingSphere;
  geometry.userData.conceptVisible=show;
}

export function pitHeight(p:Point2,pit:CandidatePit) {
  if(!inside(p,pit.ring))return null;
  // Minimum distance to crest segments: stable for concave boundaries too.
  let distance=Infinity;
  pit.ring.forEach((a,i)=>{const b=pit.ring[(i+1)%pit.ring.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));distance=Math.min(distance,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz));});
  const bench=CONCEPT.bench,run=bench/Math.tan(CONCEPT.batterDegrees*Math.PI/180)+CONCEPT.berm;
  const level=Math.floor(distance/run),within=distance-level*run;
  return Math.max(pit.floor,pit.surface-level*bench-Math.min(bench,within*Math.tan(CONCEPT.batterDegrees*Math.PI/180)));
}
export function carvePit(geometry:THREE.BufferGeometry,pits:CandidatePit[]) {
  const position=geometry.getAttribute('position');if(!position)return;
  retainSourceTerrain(geometry);
  for(let i=0;i<position.count;i++){const p:Point2=[position.getX(i),position.getZ(i)];for(const pit of pits){const y=pitHeight(p,pit);if(y!==null)position.setY(i,Math.min(position.getY(i),y));}}
  position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();retainConceptTerrain(geometry);
}

export function sourcePitElevationAt(surface:SourcePitSurface,x:number,z:number):number|null{
  const i=Math.round((x-surface.x0)/surface.dx),j=Math.round((z-surface.z0)/surface.dz);
  if(i<0||i>=surface.width||j<0||j>=surface.height||!surface.mask[i]?.[j])return null;
  const elevation=surface.pitElevation[i]?.[j];return Number.isFinite(elevation)?elevation!:null;
}

/** Carve the displayed terrain to the supplied RF1 optimized-shell raster. */
export function carvePitSurfaces(geometry:THREE.BufferGeometry,surfaces:SourcePitSurface[]){
  const position=geometry.getAttribute('position'),sourceIndex=geometry.index;if(!position||!sourceIndex||!surfaces.length)return;
  retainSourceTerrain(geometry);
  // Remove whole terrain triangles where their centre falls inside the
  // optimized-shell raster. Lowering shared terrain vertices created long,
  // sloping wedges across the pit instead of an open excavation.
  const kept:number[]=[];
  for(let triangle=0;triangle<sourceIndex.count;triangle+=3){
    const a=sourceIndex.getX(triangle),b=sourceIndex.getX(triangle+1),c=sourceIndex.getX(triangle+2);
    const points=[a,b,c].map(vertex=>[position.getX(vertex),position.getZ(vertex)] as const);
    const x=(points[0][0]+points[1][0]+points[2][0])/3;
    const z=(points[0][1]+points[1][1]+points[2][1])/3;
    const intersectsPit=surfaces.some(surface=>{
      const insideCount=points.filter(([px,pz])=>sourcePitElevationAt(surface,px,pz)!==null).length;
      return insideCount>=2||sourcePitElevationAt(surface,x,z)!==null;
    });
    if(intersectsPit)continue;
    kept.push(a,b,c);
  }
  if(kept.length!==sourceIndex.count){
    geometry.userData.sourceTerrainIndex??=sourceIndex.clone();
    geometry.setIndex(kept);
    geometry.computeBoundingSphere();
  }
  geometry.userData.pitCarvedTriangleCount=(sourceIndex.count-kept.length)/3;
  retainConceptTerrain(geometry);
}

/** Restore terrain indices if a caller temporarily resets the optimized pit cutaway. */
export function restorePitTerrain(geometry:THREE.BufferGeometry){
  const index=geometry.userData.sourceTerrainIndex as THREE.BufferAttribute|undefined;
  if(index){geometry.setIndex(index);geometry.computeBoundingSphere();geometry.userData.sourceTerrainIndex=undefined;}
}

/** Render the source optimized shell as flat floor cells and explicit bench risers. */
export function buildPitSurfaceFromRaster(surface:SourcePitSurface,height:(x:number,z:number)=>number){
  const positions:number[]=[],colors:number[]=[],indices:number[]=[],dark=new THREE.Color(0x675344),floor=new THREE.Color(0xb29a7d);
  // Reuse vertices across adjacent cells on the same material surface. The
  // previous per-quad duplicates made each 10 m source cell shade as a separate
  // block even when it belonged to one continuous bench tread or riser.
  const vertexByPosition=new Map<string,number>();
  const addVertex=(x:number,y:number,z:number,color:THREE.Color)=>{
    const key=`${Math.round(x*100)}:${Math.round(y*100)}:${Math.round(z*100)}:${color.getHex()}`;
    const existing=vertexByPosition.get(key);if(existing!==undefined)return existing;
    const index=positions.length/3;positions.push(x,y,z);colors.push(color.r,color.g,color.b);vertexByPosition.set(key,index);return index;
  };
  const addQuad=(a:[number,number,number],b:[number,number,number],c:[number,number,number],d:[number,number,number],color:THREE.Color)=>{
    const v=[a,b,c,d].map(p=>addVertex(p[0],p[1],p[2],color));indices.push(v[0],v[1],v[2],v[0],v[2],v[3]);
  };
  const floorCache=new Map<string,number|null>();
  const cellFloor=(i:number,j:number)=>{
    if(!surface.mask[i]?.[j])return null;
    const key=`${i}:${j}`,cached=floorCache.get(key);if(cached!==undefined)return cached;
    const x=surface.x0+i*surface.dx,z=surface.z0+j*surface.dz,elevation=surface.pitElevation[i]?.[j];
    if(!Number.isFinite(elevation)){floorCache.set(key,null);return null;}
    // The source shell and viewer terrain are registered from separate grids.
    // Keep the whole bench cell below the displayed ground so a local
    // interpolation mismatch cannot lift a tread above the terrain.
    const halfX=surface.dx/2,halfZ=Math.abs(surface.dz)/2;
    const result=Math.min(elevation!,height(x,z)-.7,height(x-halfX,z-halfZ)-.7,height(x+halfX,z-halfZ)-.7,height(x+halfX,z+halfZ)-.7,height(x-halfX,z+halfZ)-.7);
    floorCache.set(key,result);return result;
  };
  const halfX=surface.dx/2,halfZ=Math.abs(surface.dz)/2;
  for(let i=0;i<surface.width;i++)for(let j=0;j<surface.height;j++){
    const baseFloor=cellFloor(i,j);if(baseFloor===null)continue;
    const x=surface.x0+i*surface.dx,z=surface.z0+j*surface.dz,y=baseFloor+.7;
    const west=x-halfX,east=x+halfX,south=z+halfZ,north=z-halfZ;
    addQuad([west,y,south],[east,y,south],[east,y,north],[west,y,north],floor);
    const edges:[number,number,[number,number],[number,number]][]=[
      [-1,0,[west,south],[west,north]],[1,0,[east,north],[east,south]],
      [0,-1,[east,south],[west,south]],[0,1,[west,north],[east,north]],
    ];
    for(const [di,dj,a,b] of edges){
      const other=cellFloor(i+di,j+dj),ax=a[0],az=a[1],bx=b[0],bz=b[1];
      if(other!==null){
        if(baseFloor>=other)continue;
        const high=other+.7;
        addQuad([ax,baseFloor+.7,az],[bx,baseFloor+.7,bz],[bx,high,bz],[ax,high,az],dark);
        continue;
      }
      const topA=Math.max(baseFloor+.7,height(ax,az)),topB=Math.max(baseFloor+.7,height(bx,bz));
      if(topA<=baseFloor+.75&&topB<=baseFloor+.75)continue;
      addQuad([ax,baseFloor+.7,az],[bx,baseFloor+.7,bz],[bx,topB,bz],[ax,topA,az],dark);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.96,metalness:0,toneMapped:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  mesh.name=`${surface.id==='north'?'North':'South'} RF1 optimized pit surface`;mesh.receiveShadow=true;mesh.castShadow=true;mesh.userData.sourcePitSupport=surface.support;return mesh;
}
/** Exact contour bands eliminate the staircase aliasing of a clipped XY grid. */
export function buildPitSurface(pit:CandidatePit,height:(x:number,z:number)=>number) {
  const positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const perimeter=(ring:Point2[])=>ring.reduce((sum,a,i)=>sum+Math.hypot(ring[(i+1)%ring.length][0]-a[0],ring[(i+1)%ring.length][1]-a[1]),0);
  const sample = (ring:Point2[],count:number) => {
    const lengths=ring.map((a,i)=>Math.hypot(ring[(i+1)%ring.length][0]-a[0],ring[(i+1)%ring.length][1]-a[1]));
    const total=lengths.reduce((sum,length)=>sum+length,0);
    return Array.from({length:count},(_,index)=>{
      let distance=total*index/count,edge=0;
      while(edge<lengths.length-1&&distance>lengths[edge]){distance-=lengths[edge];edge++;}
      const a=ring[edge],b=ring[(edge+1)%ring.length],t=distance/(lengths[edge]||1);
      return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t] as Point2;
    });
  };
  function band(outer:Point2[],inner:Point2[],upper:number,lower:number,tone:number) {
    const count=Math.max(24,Math.ceil(Math.max(perimeter(outer),inner.length?perimeter(inner):0)/12));
    const a=sample(outer,count),b=inner.length?sample(inner,count):[],base=positions.length/3,color=new THREE.Color(tone),lift=1.2;
    for(const [ring,level] of [[a,upper],[b,lower]] as const){
      for(const [x,z] of ring){
        const y=Math.min(height(x,z),level)+lift;
        positions.push(x,y,z);
        // Fixed, low-amplitude tonal variation adds rough-rock material depth
        // without inventing mapped geology or changing with the camera.
        const striation=Math.sin(x*.031+z*.017+y*.23)*Math.sin(z*.026-x*.012);
        const value=.98+striation*.035;
        colors.push(color.r*value,color.g*value,color.b*value);
      }
    }
    if(b.length){
      for(let i=0;i<count;i++){
        const next=(i+1)%count,outerHere=base+i,outerNext=base+next,innerHere=base+count+i,innerNext=base+count+next;
        indices.push(outerHere,outerNext,innerNext,outerHere,innerNext,innerHere);
      }
    }else{
      const x=a.reduce((sum,p)=>sum+p[0],0)/count,z=a.reduce((sum,p)=>sum+p[1],0)/count;
      const centre=positions.length/3;positions.push(x,Math.min(height(x,z),upper)+lift,z);colors.push(color.r,color.g,color.b);
      for(let i=0;i<count;i++)indices.push(centre,base+(i+1)%count,base+i);
    }
  }
  let outer=pit.ring,distance=0,y=pit.surface;
  const slope=Math.tan(CONCEPT.batterDegrees*Math.PI/180);
  while(y>pit.floor+1e-6){
    const drop=Math.min(CONCEPT.bench,y-pit.floor);
    distance+=drop/slope;
    const toe=insetCrest(pit.ring,distance);
    if(toe.length<3)break;
    band(outer,toe,y,y-drop,0x997b59);y-=drop;outer=toe;
    if(y<=pit.floor+1e-6)break;
    distance+=CONCEPT.berm;
    const berm=insetCrest(pit.ring,distance);
    if(berm.length<3)break;
    band(outer,berm,y,y,0xc1a17a);outer=berm;
  }
  band(outer,[],y,y,0xa88b66);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  // The mine-plan sun is fixed in site coordinates, so diffuse shading adds
  // readable bench walls and contact shadows without changing with the camera.
  const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.94,metalness:0,toneMapped:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));mesh.name='Terraced conceptual excavation';mesh.receiveShadow=true;mesh.castShadow=true;return mesh;
}

/**
 * A display-only access ribbon inside a candidate pit envelope. This is not a
 * sourced alignment, engineered haul road, or geotechnically checked grade.
 */
export function buildConceptualPitRamp(pit:CandidatePit,exitBearing=-Math.PI/2) {
  const centre=pit.centre;
  const radiusAt=(angle:number)=>{
    const direction:Point2=[Math.cos(angle),Math.sin(angle)];
    let nearest=Infinity;
    for(let i=0;i<pit.ring.length;i++){
      const a=pit.ring[i],b=pit.ring[(i+1)%pit.ring.length];
      const edge:Point2=[b[0]-a[0],b[1]-a[1]],relative:Point2=[a[0]-centre[0],a[1]-centre[1]];
      const denominator=direction[0]*edge[1]-direction[1]*edge[0];
      if(Math.abs(denominator)<1e-8)continue;
      const distance=(relative[0]*edge[1]-relative[1]*edge[0])/denominator;
      const along=(relative[0]*direction[1]-relative[1]*direction[0])/denominator;
      if(distance>0&&along>=-1e-7&&along<=1+1e-7)nearest=Math.min(nearest,distance);
    }
    return nearest;
  };
  const meanRadius=pit.ring.reduce((sum,point)=>sum+Math.hypot(point[0]-centre[0],point[1]-centre[1]),0)/pit.ring.length;
  const emptyRamp=()=>{
    const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial());
    mesh.name='Illustrative internal pit access ramp · not engineered';mesh.visible=false;return mesh;
  };
  if(!Number.isFinite(meanRadius)||meanRadius<24||pit.depth<=0)return emptyRamp();
  const turns=Math.min(5,Math.max(1,pit.depth/(.095*Math.PI*2*meanRadius*.58)));
  const steps=Math.max(160,Math.ceil(turns*128)),halfWidth=Math.max(5,Math.min(7,CONCEPT.berm*1.05));
  const path:THREE.Vector3[]=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps,angle=exitBearing+t*turns*Math.PI*2,outerRadius=radiusAt(angle);
    if(!Number.isFinite(outerRadius))continue;
    const radial=outerRadius*(.92-.58*t),x=centre[0]+Math.cos(angle)*radial,z=centre[1]+Math.sin(angle)*radial;
    const ground=pitHeight([x,z],pit)??pit.floor,designY=pit.surface-t*pit.depth*.96;
    path.push(new THREE.Vector3(x,Math.max(ground+1.25,designY),z));
  }
  if(path.length<2)return emptyRamp();
  const positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const shoulder=new THREE.Color(0x48453e),runningSurface=new THREE.Color(0x625a4c);
  for(let i=0;i<path.length;i++){
    const before=path[Math.max(0,i-1)],after=path[Math.min(path.length-1,i+1)];
    const tangent=new THREE.Vector2(after.x-before.x,after.z-before.z).normalize();
    const normal=new THREE.Vector2(-tangent.y,tangent.x),point=path[i];
    for(const side of [-1,1]){
      const tone=side===-1?shoulder:runningSurface;
      positions.push(point.x+normal.x*halfWidth*side,point.y+.22,point.z+normal.y*halfWidth*side);
      colors.push(tone.r,tone.g,tone.b);
    }
    if(i<path.length-1){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const ramp=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,toneMapped:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));
  ramp.name='Illustrative internal pit access ramp · not engineered';
  ramp.renderOrder=41;ramp.castShadow=true;ramp.receiveShadow=true;
  // Keep the authored centreline with the display mesh so a single vehicle
  // cue can follow this same conceptual alignment without implying a road to
  // the receiving apron.
  ramp.userData.displayPath=path.map(point=>point.clone());
  return ramp;
}
