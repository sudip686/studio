import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Mechanical detail for the illustrative 400 × 280 local-unit plant campus. */
export const PLANT_PROCESS_STAGES = [
  {id: 'feed', label: '01 · ROM & crushing', detail: 'Feed hopper, crusher and screened transfer', point: [-104, 25, -16] as [number,number,number]},
  {id: 'milling', label: '02 · Milling & classification', detail: 'Mill, trunnion drives and cyclone cluster', point: [-30, 17, -18] as [number,number,number]},
  {id: 'flotation', label: '03 · Flotation', detail: 'Cell banks, launders and slurry pumps', point: [38, 16, -36] as [number,number,number]},
  {id: 'thickening', label: '04 · Thickening', detail: 'Thickener rake, drive and reclaim-water circuit', point: [103, 14, -31] as [number,number,number]},
  {id: 'dewatering', label: '05 · Dewatering', detail: 'Filter press and product dryer', point: [69, 12, 44] as [number,number,number]},
  {id: 'product', label: '06 · Product handling', detail: 'Surge silos and covered loadout', point: [156, 24, 92] as [number,number,number]},
] as const;

export function addPlantDetail(root: THREE.Group, materials: Record<string, THREE.Material>) {
  const steel = materials.steel, accent = materials.copper, dark = materials.roof;
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, name: string) => {
    const object = new THREE.Mesh(geometry, material);
    object.name = name; object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true;
    root.add(object); return object;
  };
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, name: string, material: THREE.Material = steel) => mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, name);
  const cylinder = (r: number, h: number, x: number, y: number, z: number, name: string, material: THREE.Material = steel) => mesh(new THREE.CylinderGeometry(r, r, h, 16), material, x, y, z, name);
  const pipe = (a: number[], b: number[], radius: number, name: string, material: THREE.Material = accent) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const object = mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 8), material, 0, 0, 0, name);
    object.position.copy(start).add(end).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return object;
  };
  const ring = (radius: number, x: number, y: number, z: number, name: string) => {
    const object = mesh(new THREE.TorusGeometry(radius, .35, 6, 32), accent, x, y, z, name);
    object.rotation.x = Math.PI / 2; return object;
  };

  // Crusher support frame, access platform and a grizzly receiving screen.
  for (const x of [-112, -96]) for (const z of [-23, -9]) box(.9, 20, .9, x, 11, z, 'Crushing structural frame');
  for (let i = 0; i < 9; i++) box(18, .4, .35, -104, 26, -22 + i * 1.5, 'ROM grizzly bars', dark);
  box(29, 1, 25, -104, 18, -16, 'Feed service platform');
  for (let i = 0; i < 10; i++) box(.4, 4, .4, -118 + i * 3, 20, -29, 'Feed platform handrail', accent);
  box(30, .4, .4, -104, 22, -29, 'Feed platform handrail', accent);
  mesh(new THREE.ConeGeometry(7, 13, 20), accent, -73, 20, -16, 'Secondary cone crusher');
  const screen = box(16, 3, 10, -58, 20, -16, 'Crushing vibrating screen', dark); screen.rotation.z = -.13;
  for (const z of [-20, -12]) pipe([-66, 11, z], [-51, 17, z], .6, 'Crushing screen supports');

  // Mill girth gear, trunnion bearings, motor and a compact cyclone cluster.
  const gear = mesh(new THREE.TorusGeometry(8.7, .7, 8, 32), accent, -30, 12, -18, 'Milling girth gear'); gear.rotation.y = Math.PI / 2;
  for (const x of [-43, -17]) { box(4, 7, 16, x, 5, -18, 'Milling trunnion pedestal', materials.concrete); cylinder(4, 6, x, 10, -18, 'Milling trunnion bearing').rotation.z = Math.PI / 2; }
  box(9, 5, 6, -31, 5, -4, 'Milling drive motor', accent);
  pipe([-31, 8, -4], [-31, 10, -11], 1, 'Milling drive shaft', steel);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3, x = -1 + Math.cos(angle) * 5, z = -58 + Math.sin(angle) * 5;
    cylinder(1.6, 5, x, 18, z, 'Milling classification cyclone');
    mesh(new THREE.ConeGeometry(1.6, 6, 12), accent, x, 12.5, z, 'Milling cyclone cone').rotation.z = Math.PI;
    pipe([x, 21, z], [-1, 24, -58], .4, 'Milling cyclone manifold');
  }
  for (const x of [-9, 7]) for (const z of [-65, -51]) box(.7, 22, .7, x, 12, z, 'Milling cyclone support frame');

  // Flotation launders, pump boxes and protected operator walkways.
  for (const z of [-36, -12, -103]) {
    box(82, 1.5, 2, 39, 11.5, z + 9, 'Flotation concentrate launder', accent);
    box(84, .8, 3, 39, 15, z - 10, 'Flotation operator walkway');
    for (let x = 0; x < 84; x += 7) box(.35, 3.5, .35, x, 17, z - 11.5, 'Flotation walkway stanchion', accent);
    box(85, .35, .35, 39, 18.8, z - 11.5, 'Flotation handrail', accent);
  }
  for (const [x, z] of [[82, -12], [86, -70], [125, 10]]) {
    box(8, 5, 6, x, 4, z, 'Flotation slurry pump skid', accent);
    cylinder(1.8, 7, x, 6, z, 'Flotation slurry pump').rotation.z = Math.PI / 2;
  }

  // Thickener rim, rake arms, bridge supports and reclaim-water lines.
  for (const [x, z, radius, waterY] of [[103, -31, 17, 10.7], [164, -84, 23, 12.7]]) {
    ring(radius, x, waterY + .8, z, 'Thickener rim');
    ring(radius + .5, x, waterY + 4, z, 'Thickener perimeter handrail');
    cylinder(.8, waterY + 4, x, waterY / 2 + 2, z, 'Thickener centre drive', accent);
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      box(.35, 3.2, .35, x + Math.cos(angle) * radius, waterY + 2.4, z + Math.sin(angle) * radius, 'Thickener guardrail post', accent);
    }
    for (const sign of [-1, 1]) pipe([x, waterY - 1, z], [x + sign * radius * .8, waterY - 2, z], .35, 'Thickener rake arm');
  }
  const connections = [
    [[-1, 24, -58], [8, 24, -58], [8, 15, -36]],
    [[78, 12, -27], [92, 12, -27], [103, 13, -31]],
    [[103, 8, -31], [125, 8, -31], [125, 8, 24], [69, 8, 24], [69, 8, 44]],
    [[164, 11, -62], [177, 11, -62], [177, 9, 70], [17, 9, 70], [17, 17, -12]],
  ];
  for (const route of connections) for (let i = 1; i < route.length; i++) pipe(route[i - 1], route[i], .65, 'Connected process water / slurry line');

  // Filter-press rails, hydraulic pack and drying/product-handling equipment.
  for (const z of [38, 50]) box(37, .8, 1, 69, 10, z, 'Dewatering filter-press rail', accent);
  box(7, 7, 14, 48, 6, 44, 'Dewatering hydraulic power pack', dark);
  const dryer = cylinder(4, 27, 106, 11, 28, 'Dewatering rotary dryer'); dryer.rotation.z = Math.PI / 2;
  dryer.userData.preserveAnimation=true;root.userData.processDryer=dryer;
  const dryerRibs=new THREE.InstancedMesh(new THREE.BoxGeometry(.3,27,.3),dark,8);
  const ribMatrix=new THREE.Matrix4();
  for(let i=0;i<8;i++){const angle=i*Math.PI/4;ribMatrix.makeTranslation(Math.cos(angle)*4.05,0,Math.sin(angle)*4.05);dryerRibs.setMatrixAt(i,ribMatrix);}
  dryerRibs.name='Dryer shell stiffeners';dryerRibs.castShadow=true;dryer.add(dryerRibs);
  for (const x of [96, 116]) box(3, 6, 9, x, 5, 28, 'Dewatering dryer support', materials.concrete);
  for (const x of [139, 156, 173]) {
    cylinder(5, 20, x, 16, 92, 'Product surge silo');
    mesh(new THREE.ConeGeometry(5, 8, 16), accent, x, 4, 92, 'Product silo discharge cone').rotation.z = Math.PI;
    for (const z of [87, 97]) box(.6, 9, .6, x, 5, z, 'Product silo support');
  }
  // Palletised bag forms give the covered store a readable purpose and scale.
  // These are illustrative stock, without product tonnage or capacity meaning.
  const bagMaterial=new THREE.MeshStandardMaterial({color:0xbec3b2,roughness:.98});
  for(const x of [34,58,82,116])for(const z of [105,120]){
    box(17,1,11,x,2,z,'Product storage pallet',dark);
    for(let layer=0;layer<2;layer++)for(const offset of [-4,4]){
      const bag=mesh(new THREE.SphereGeometry(1,10,6),bagMaterial,x+offset,4+layer*4.5,z,'Bagged concentrate · illustrative');
      bag.scale.set(3.8,2.4,4.2);
      box(.25,4.4,8,x+offset,4+layer*4.5,z,'Bag lifting strap',dark);
    }
  }
  // Reagent bund with distinguishable tanks and service lines.
  box(48, 1.5, 27, -40, 2.2, 104, 'Reagent containment slab', materials.concrete);
  for (const x of [-55, -40, -25]) {
    cylinder(5, 11, x, 8, 104, 'Reagent preparation tank', materials.water);
    cylinder(.6, 4, x, 15.5, 104, 'Reagent agitator drive', accent);
    pipe([x, 5, 104], [x, 5, 86], .4, 'Reagent service pipe');
  }
  // Truck scale, road markings and yard lights complete the industrial scale.
  box(38, .5, 9, -100, 2, 134, 'ROM weighbridge', dark);
  for (let i = 0; i < 4; i++) box(6, 3, 2.5, -101 + i * 9, 2, 122, 'Yard safety barrier', accent);
  for (const [x, z] of [[-186, -122], [-186, 75], [180, 123], [185, -28]]) {
    cylinder(.45, 20, x, 12, z, 'Plant yard light mast');
    box(5, .7, 2, x + 1.8, 22, z, 'Plant yard light fitting', materials.concrete);
  }
  root.userData.processStages = PLANT_PROCESS_STAGES;
}

/** Batch static detail by material/process; keep roof cutaways separately addressable. */
export function batchPlantMeshes(root: THREE.Group, startIndex = 0) {
  const buckets = new Map<string, {material: THREE.Material; name: string; roof: boolean; stage?:string; geometries: THREE.BufferGeometry[]}>();
  const children = root.children.slice(startIndex).filter((child): child is THREE.Mesh<THREE.BufferGeometry, THREE.Material> => child instanceof THREE.Mesh && !Array.isArray(child.material) && !child.userData.preserveAnimation);
  for (const object of children) {
    object.updateMatrix();
    const roof = Boolean(object.userData.plantRoof);
    const stage=typeof object.userData.plantStage==='string'?object.userData.plantStage:undefined;
    const name = roof ? `${object.name} roof` : /Conceptual access|Illustrative gravel shoulders/i.test(object.name) ? 'Illustrative campus access roads · unsurveyed'
      : /Flotation/i.test(object.name) ? 'Flotation banks and walkways'
      : /Milling|Crushing|ROM|Feed|hopper/i.test(object.name) ? 'Crushing and milling equipment'
      : /Dewatering|Product|Filter|Packaged/i.test(object.name) ? 'Dewatering and product handling'
      : /Thickener|water|Reagent/i.test(object.name) ? 'Thickener, water and reagent circuits' : 'Plant structures and services';
    const key = `${object.material.uuid}:${name}:${roof}:${stage??''}`;
    const bucket = buckets.get(key) ?? {material: object.material, name, roof, stage, geometries: []};
    bucket.geometries.push(object.geometry.clone().applyMatrix4(object.matrix)); buckets.set(key, bucket);
    root.remove(object); object.geometry.dispose();
  }
  for (const bucket of buckets.values()) {
    const geometry = mergeGeometries(bucket.geometries, false);
    for (const source of bucket.geometries) source.dispose();
    if (!geometry) throw new Error(`Unable to batch plant detail: ${bucket.name}`);
    const object = new THREE.Mesh(geometry, bucket.material); object.name = bucket.name;
    object.userData.plantRoof = bucket.roof; if(bucket.stage)object.userData.plantStage=bucket.stage; object.castShadow = true; object.receiveShadow = true;
    root.add(object);
  }
  root.userData.detailMeshCount = children.length;
  root.userData.batchedMeshCount = buckets.size;
}
