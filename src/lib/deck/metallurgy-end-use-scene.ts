import * as THREE from 'three';

export type MetallurgyEndUseRoute = 'anode' | 'refractory';

const ROUTE_STEP_SECONDS = 6;
const ROUTE_STEPS: Record<MetallurgyEndUseRoute, readonly string[]> = {
  anode: ['Shape', 'Purify', 'Coat & heat', 'Electrode coating', 'Cell + EV'],
  refractory: ['Blend', 'Press', 'MgO–C brick', 'Furnace lining'],
};

function makeFlakeGeometry(radius: number, seed: number) {
  const shape = new THREE.Shape();
  const points = 9;
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const irregularity = .76 + ((i * 13 + seed * 7) % 5) * .055;
    const x = Math.cos(angle) * radius * irregularity;
    const y = Math.sin(angle) * radius * irregularity * .68;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {depth: 1.35, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .35, bevelThickness: .25});
}

function addBox(parent: THREE.Object3D, name: string, size: [number, number, number], position: [number, number, number], material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent: THREE.Group, name: string, radiusTop: number, radiusBottom: number, height: number, position: [number, number, number], material: THREE.Material, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addStageRing(parent: THREE.Group, x: number, material: THREE.MeshStandardMaterial, index: number) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(9.8, .28, 6, 48), material.clone());
  ring.name = `Downstream process stage ${index + 1} focus ring`;
  ring.position.set(x, 2.3, 0);
  ring.rotation.x = -Math.PI / 2;
  parent.add(ring);
  return ring;
}

function addFlakeCluster(parent: THREE.Group, center: [number, number, number], count: number, baseRadius: number, material: THREE.Material) {
  for (let i = 0; i < count; i++) {
    const geometry = makeFlakeGeometry(baseRadius * (.56 + (i % 5) * .12), i + count);
    const flake = new THREE.Mesh(geometry, material);
    flake.name = `Graphite flake ${i + 1}`;
    const angle = i * 2.399;
    flake.position.set(center[0] + Math.cos(angle) * (i % 4) * 2.3, center[1] + (i % 3) * 1.1, center[2] + Math.sin(angle) * (i % 4) * 2.3);
    flake.rotation.set(.2 + i * .09, angle * .4, .18 + angle * .2);
    flake.castShadow = true;
    parent.add(flake);
  }
}

function createRouteDeck(route: MetallurgyEndUseRoute, materials: {
  graphite: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  pale: THREE.MeshStandardMaterial;
  glow: THREE.MeshStandardMaterial;
  teal: THREE.MeshStandardMaterial;
}) {
  const group = new THREE.Group();
  group.name = route === 'anode' ? 'Illustrative EV anode downstream route' : 'Illustrative graphite refractory downstream route';
  const base = new THREE.Mesh(new THREE.BoxGeometry(390, 3, 92), new THREE.MeshStandardMaterial({color: '#334249', roughness: .78, metalness: .14}));
  base.name = 'Product pathway presentation plinth';
  base.position.set(28, -1.65, 0);
  base.receiveShadow = true;
  group.add(base);

  const path = [-128, -48, 38, 132];
  const rings = path.map((x, index) => addStageRing(group, x, materials.teal, index));
  let updateMotion = (_seconds: number, _step: number) => {};
  for (let i = 0; i < path.length - 1; i++) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(path[i + 1] - path[i] - 24, .28, .75), materials.steel);
    rail.name = `Downstream material route ${i + 1}`;
    rail.position.set((path[i] + path[i + 1]) / 2, 2.1, 0);
    rail.castShadow = true;
    group.add(rail);
  }

  if (route === 'anode') {
    addFlakeCluster(group, [-128, 8, 0], 13, 5.2, materials.graphite);

    // A compact shaping and purification line. The forms communicate unit
    // operations without suggesting a designed Tanga facility.
    const mixer = new THREE.Group(); mixer.name = 'Illustrative particle shaping and purification equipment'; mixer.position.set(-48, 0, 0); group.add(mixer);
    const drum = addCylinder(mixer, 'Particle-shaping drum', 11, 11, 28, [0, 11, 0], materials.steel, 32);
    drum.rotation.z = Math.PI / 2;
    const drumMount = drum.quaternion.clone();
    addCylinder(mixer, 'Drum feed collar', 7, 7, 2, [-15, 11, 0], materials.copper, 24).rotation.z = Math.PI / 2;
    addCylinder(mixer, 'Drum discharge collar', 7, 7, 2, [15, 11, 0], materials.copper, 24).rotation.z = Math.PI / 2;
    for (const x of [-9, 9]) addBox(mixer, 'Mixer bearing support', [3, 10, 22], [x, 5, 0], materials.steel);
    addBox(mixer, 'Purification vessel', [24, 24, 22], [-5, 22, -24], materials.pale);
    const washWindow = addBox(mixer, 'Purification vessel dark glass', [17, 13, .5], [-5, 22, -12.65], materials.teal);
    const washWindowMaterial = materials.teal.clone();
    washWindow.material = washWindowMaterial;
    addCylinder(mixer, 'Wash and filtration tank', 8, 9, 20, [17, 11, -20], materials.steel, 24);
    addBox(mixer, 'Filter press frame', [4, 24, 20], [31, 12, -22], materials.copper);
    const filterPlates: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) filterPlates.push(addBox(mixer, 'Filter press plate', [1, 16, 15], [23 + i * 4, 12, -22], materials.pale));
    const filterPlateBaseX = filterPlates.map(plate => plate.position.x);

    const coat = new THREE.Group(); coat.name = 'Illustrative coating and carbonization'; coat.position.set(38, 0, 0); group.add(coat);
    addBox(coat, 'Coating enclosure', [42, 29, 35], [0, 16, -2], materials.steel);
    addBox(coat, 'Coating enclosure window', [22, 13, 1], [0, 17, 16], materials.teal);
    const furnace = addBox(coat, 'Carbonization furnace', [30, 35, 28], [31, 19, -2], materials.steel);
    const carbonWindow = addBox(coat, 'Carbonization glow window', [17, 18, 1], [31, 18, 12.5], materials.glow);
    const carbonWindowMaterial = materials.glow.clone();
    carbonWindow.material = carbonWindowMaterial;
    addBox(coat, 'Furnace belt', [70, 2, 9], [17, 3.5, 18], materials.copper);
    furnace.castShadow = true;

    const electrodeLine = new THREE.Group(); electrodeLine.name = 'Illustrative anode electrode coating and calendering line'; electrodeLine.position.set(82, 0, 24); electrodeLine.scale.setScalar(1.28); group.add(electrodeLine);
    addBox(electrodeLine, 'Electrode line foundation', [54, 3, 28], [0, 1.5, 0], materials.steel);
    addBox(electrodeLine, 'Copper anode current-collector foil', [45, .35, 12], [0, 5.2, 0], materials.copper);
    addBox(electrodeLine, 'Graphite active-material coating on copper foil', [30, .38, 9], [0, 5.55, 0], materials.graphite);
    const calenderRollers: THREE.Mesh[] = [];
    const calenderRollerBases: THREE.Quaternion[] = [];
    for (const x of [-13, 13]) {
      const roller = addCylinder(electrodeLine, 'Electrode calender roller', 4.2, 4.2, 17, [x, 10, 0], materials.steel, 32);
      roller.rotation.z = Math.PI / 2;
      addBox(roller, 'Calender roller motion marker', [.8, 11, 1.2], [3.8, 0, 0], materials.copper);
      calenderRollers.push(roller);
      calenderRollerBases.push(roller.quaternion.clone());
      for (const z of [-8, 8]) addBox(electrodeLine, 'Electrode-line roller support', [2.2, 12, 2.2], [x, 6, z], materials.copper);
    }
    const coatingHead = addBox(electrodeLine, 'Illustrative electrode coating head', [7, 8, 15], [-9, 18, 0], materials.pale);

    const cell = new THREE.Group(); cell.name = 'Illustrative battery anode cutaway'; cell.position.set(132, 0, 0); group.add(cell);
    const cellShell = new THREE.Mesh(new THREE.BoxGeometry(48, 36, 34), new THREE.MeshPhysicalMaterial({color: '#9ab1b7', roughness: .23, metalness: .28, transparent: true, opacity: .23, side: THREE.DoubleSide}));
    cellShell.name = 'Transparent battery-cell enclosure'; cellShell.position.set(0, 22, 0); cell.add(cellShell);
    const activeMaterialLayers: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i++) {
      const y = 8 + i * 4.2;
      const layer = addBox(cell, i % 2 === 0 ? 'Graphite anode active-material layer' : 'Copper current-collector layer', [40, 2.2, 26], [0, y, 0], (i % 2 === 0 ? materials.graphite : materials.copper).clone());
      activeMaterialLayers.push(layer);
    }
    const separator = new THREE.Mesh(new THREE.BoxGeometry(39, .65, 24), new THREE.MeshPhysicalMaterial({color: '#8ed7d2', roughness: .55, transparent: true, opacity: .4, side: THREE.DoubleSide}));
    separator.name = 'Illustrative porous separator between electrodes'; separator.position.set(0, 22.7, 0); cell.add(separator);
    const cathode = addBox(cell, 'Illustrative cathode active-material layer', [38, 2.2, 24], [0, 34.2, 0], materials.glow.clone());
    const cathodeCurrentCollector = addBox(cell, 'Illustrative cathode current collector', [38, 1, 24], [0, 37.2, 0], materials.steel.clone());
    const lithiumIons: THREE.Mesh[] = [];
    const lithiumIonMaterial = new THREE.MeshStandardMaterial({color: '#a9f1ed', emissive: '#32c7bf', emissiveIntensity: .85, roughness: .3, metalness: .04});
    for (let i = 0; i < 9; i++) {
      const ion = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), lithiumIonMaterial);
      ion.name = 'Illustrative lithium ion moving toward graphite anode during charge';
      ion.position.set(-12 + (i % 3) * 12, 31, -8 + Math.floor(i / 3) * 8);
      ion.visible = false; cell.add(ion); lithiumIons.push(ion);
    }
    for (const x of [-21, 21]) addBox(cell, 'Battery-cell terminal', [5, 5, 5], [x, 42, 0], materials.copper);
    const car = new THREE.Group(); car.name = 'EV downstream-use context illustration'; car.position.set(215, 0, 0); group.add(car);
    const bodyShape = new THREE.Shape(); bodyShape.moveTo(-28, 4); bodyShape.lineTo(-24, 14); bodyShape.lineTo(-13, 17); bodyShape.lineTo(-4, 28); bodyShape.lineTo(15, 28); bodyShape.lineTo(25, 15); bodyShape.lineTo(30, 11); bodyShape.lineTo(29, 4); bodyShape.closePath();
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(bodyShape, {depth: 15, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 1.2, bevelThickness: 1.2}), new THREE.MeshStandardMaterial({color: '#d7e0de', roughness: .42, metalness: .38}));
    body.name = 'EV silhouette for downstream use'; body.position.z = -7.5; body.castShadow = true; car.add(body);
    for (const x of [-17, 17]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 3.5, 24), materials.graphite);
      wheel.name = 'EV wheel'; wheel.rotation.x = Math.PI / 2; wheel.position.set(x, 5, 8); car.add(wheel);
    }
    const batteryPack = addBox(car, 'Illustrative battery pack under EV platform', [34, 3, 12], [0, 3.5, 0], materials.teal.clone());
    const layerBaseX = activeMaterialLayers.map(layer => layer.position.x);
    const coatingHeadBaseX = coatingHead.position.x;
    const carBaseX = car.position.x;
    const carWheelMeshes = car.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh && child.name === 'EV wheel');
    updateMotion = (seconds, step) => {
      const drumTime = Math.min(seconds, 6);
      drum.quaternion.copy(drumMount).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), drumTime * .72));
      const purificationCycle = step === 1 ? .5 + .5 * Math.sin((seconds - 6) * 1.8) : 0;
      filterPlates.forEach((plate, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        plate.position.x = filterPlateBaseX[index] + direction * purificationCycle * 1.15;
      });
      washWindowMaterial.emissiveIntensity = step === 1 ? .2 + .16 * (.5 + .5 * Math.sin((seconds - 6) * 2.4)) : .08;
      const coatingPulse = .5 + .5 * Math.sin((seconds - 12) * 2.2);
      carbonWindowMaterial.emissiveIntensity = step === 2 ? .48 + coatingPulse * .52 : .24;
      const electrodeProgress = step === 3 ? THREE.MathUtils.clamp((seconds - 18) / ROUTE_STEP_SECONDS, 0, 1) : 0;
      calenderRollers.forEach((roller, index) => {
        const spin = step === 3 ? (index === 0 ? 1 : -1) * (seconds - 18) * 2.2 : 0;
        roller.quaternion.copy(calenderRollerBases[index]).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
      });
      coatingHead.position.x = coatingHeadBaseX + (step === 3 ? Math.sin(electrodeProgress * Math.PI * 2) * 8 : 0);
      const stackReveal = step === 4 ? THREE.MathUtils.clamp((seconds - 24) * .8, 0, 1) : 0;
      activeMaterialLayers.forEach((layer, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        layer.position.x = layerBaseX[index] + side * stackReveal * 1.25;
      });
      separator.material.opacity = step === 4 ? .3 + .1 * (.5 + .5 * Math.sin(seconds * 2.2)) : .4;
      const chargeProgress = step === 4 ? THREE.MathUtils.clamp((seconds - 24) / 5.5, 0, 1) : 0;
      lithiumIons.forEach((ion, index) => {
        const stagger = index / lithiumIons.length;
        const localProgress = THREE.MathUtils.clamp(chargeProgress * 1.35 - stagger * .35, 0, 1);
        ion.visible = step === 4 && localProgress > 0;
        ion.position.y = THREE.MathUtils.lerp(31, 13.5, localProgress);
        ion.position.x = -12 + (index % 3) * 12 + Math.sin(seconds * 3 + index) * .5;
        ion.position.z = -8 + Math.floor(index / 3) * 8;
      });
      (cathode.material as THREE.MeshStandardMaterial).emissiveIntensity = step === 4 ? .14 + .1 * (.5 + .5 * Math.sin(seconds * 2)) : 0;
      (cathodeCurrentCollector.material as THREE.MeshStandardMaterial).emissiveIntensity = step === 4 ? .1 : 0;
      carWheelMeshes.forEach(wheel => { wheel.rotation.z = step === 4 ? (seconds - 24) * 1.8 : 0; });
      car.position.x = step === 4 ? carBaseX + Math.sin((seconds - 24) * .72) * 1.2 : carBaseX;
      const packMaterial = batteryPack.material as THREE.MeshStandardMaterial;
      packMaterial.emissiveIntensity = step === 4 ? .28 + .22 * (.5 + .5 * Math.sin(seconds * 2.1)) : .08;
    };
  } else {
    addFlakeCluster(group, [-128, 8, 0], 13, 5.2, materials.graphite);

    const mixer = new THREE.Group(); mixer.name = 'Illustrative MgO and graphite blending'; mixer.position.set(-48, 0, 0); group.add(mixer);
    addCylinder(mixer, 'Refractory batch mixer', 15, 18, 27, [0, 15, 0], materials.steel, 32);
    addCylinder(mixer, 'Mixer upper rim', 18, 18, 2.5, [0, 28.5, 0], materials.copper, 32);
    addBox(mixer, 'Mixer drive housing', [12, 8, 14], [16, 8, 0], materials.steel);
    const grainBed = new THREE.Group(); grainBed.name = 'Magnesia and graphite batch'; mixer.add(grainBed);
    for (let i = 0; i < 8; i++) {
      const grain = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3 + (i % 3) * .7, 1), materials.pale);
      grain.name = 'Magnesia grain in refractory mix'; grain.position.set(-5 + (i % 4) * 3.2, 24 + (i % 2) * 2.4, -4 + Math.floor(i / 4) * 4.5); grainBed.add(grain);
    }

    const press = new THREE.Group(); press.name = 'Illustrative refractory brick press'; press.position.set(38, 0, 0); group.add(press);
    addBox(press, 'Refractory press bed', [48, 6, 34], [0, 4, 0], materials.steel);
    const ram = addBox(press, 'Refractory press ram', [34, 8, 28], [0, 31, 0], materials.copper);
    const ramBaseY = ram.position.y;
    for (const x of [-18, 18]) addBox(press, 'Press guide column', [3, 37, 3], [x, 18, -14], materials.steel);
    const pressedBrick = addBox(press, 'Unfired magnesia-carbon brick', [31, 15, 22], [0, 14, 0], materials.pale.clone());
    const pressedBrickBaseY = pressedBrick.position.y;
    addFlakeCluster(press, [0, 11, 12], 5, 2.1, materials.graphite);

    const furnace = new THREE.Group(); furnace.name = 'Illustrative electric-arc furnace cutaway'; furnace.position.set(145, 0, 0); group.add(furnace);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(36, 42, 69, 40, 1, true, .55, Math.PI * 1.82), materials.steel);
    shell.name = 'Cutaway EAF steel shell'; shell.position.y = 35; shell.castShadow = true; shell.receiveShadow = true; furnace.add(shell);
    const lining = new THREE.Mesh(new THREE.CylinderGeometry(30, 35, 63, 40, 1, true, .55, Math.PI * 1.82), new THREE.MeshStandardMaterial({color: '#d39160', roughness: .94, emissive: '#482313', emissiveIntensity: .24, side: THREE.DoubleSide}));
    lining.name = 'Magnesia-carbon refractory lining'; lining.position.y = 35; furnace.add(lining);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(28, 40), new THREE.MeshStandardMaterial({color: '#ff8750', emissive: '#ff4419', emissiveIntensity: 1.25, roughness: .34}));
    pool.name = 'Illustrative hot furnace interior'; pool.rotation.x = -Math.PI / 2; pool.position.set(0, 7, 0); furnace.add(pool);
    const electrodeBases: number[] = [];
    for (const x of [-16, 0, 16]) {
      const electrode = addCylinder(furnace, 'Graphite electrode in EAF context', 3.4, 3.1, 42, [x, 64, 0], materials.graphite, 12);
      electrode.rotation.z = (x / 16) * .035;
      electrodeBases.push(electrode.position.y);
    }
    const poolMaterial = pool.material as THREE.MeshStandardMaterial;
    const refractoryBrick = new THREE.Group(); refractoryBrick.name = 'Magnesia-carbon refractory brick cutaway'; refractoryBrick.position.set(224, 4, 0); group.add(refractoryBrick);
    addBox(refractoryBrick, 'Magnesia-carbon refractory brick body', [37, 25, 27], [0, 12, 0], materials.pale);
    addBox(refractoryBrick, 'Graphite-bearing working face', [37, 3, 27], [0, 25, 0], materials.graphite);
    addFlakeCluster(refractoryBrick, [0, 15, 14], 7, 2.1, materials.graphite);
    updateMotion = (seconds, step) => {
      const blendTime = Math.min(seconds, 6);
      mixer.rotation.y = blendTime * .34;
      grainBed.rotation.y = blendTime * .62;
      const pressCycle = step === 1 ? Math.max(0, Math.sin((seconds - 6) * 1.8)) : 0;
      ram.position.y = ramBaseY - pressCycle * 4.2;
      const extraction = step === 2 ? THREE.MathUtils.clamp((seconds - 12) * .8, 0, 1) : 0;
      pressedBrick.position.y = pressedBrickBaseY + extraction * 3.2;
      (pressedBrick.material as THREE.MeshStandardMaterial).emissiveIntensity = step === 2 ? .16 : 0;
      poolMaterial.emissiveIntensity = step === 3 ? 1.05 + .3 * (.5 + .5 * Math.sin(seconds * 2.1)) : .72;
      const electrodePulse = step === 3 ? Math.sin(seconds * 2.6) * .55 : 0;
      furnace.children.filter(child => child.name === 'Graphite electrode in EAF context').forEach((electrode, index) => {
        electrode.position.y = electrodeBases[index] + electrodePulse * (index === 1 ? 1 : .65);
      });
    };
  }

  return {group, path, rings, updateMotion};
}

/** Build a separate product vignette so illustrative downstream scenes never
 * read as equipment inside the Tanga plant. The caller controls when it runs. */
export function createMetallurgyEndUseScene() {
  const root = new THREE.Group(); root.name = 'Illustrative downstream product pathways'; root.visible = false;
  const graphite = new THREE.MeshStandardMaterial({color: '#202729', roughness: .82, metalness: .12});
  const copper = new THREE.MeshStandardMaterial({color: '#bd7750', roughness: .48, metalness: .58});
  const steel = new THREE.MeshStandardMaterial({color: '#809096', roughness: .46, metalness: .54});
  const pale = new THREE.MeshStandardMaterial({color: '#b8aa92', roughness: .9, metalness: .02});
  const glow = new THREE.MeshStandardMaterial({color: '#d37646', roughness: .42, emissive: '#fa5824', emissiveIntensity: .72});
  const teal = new THREE.MeshStandardMaterial({color: '#50b8c1', roughness: .48, metalness: .2, emissive: '#14565d', emissiveIntensity: .25});
  const anode = createRouteDeck('anode', {graphite, copper, steel, pale, glow, teal});
  const refractory = createRouteDeck('refractory', {graphite, copper, steel, pale, glow, teal});
  root.add(anode.group, refractory.group);

  const flowMaterial = new THREE.MeshStandardMaterial({color: '#252c2d', roughness: .76, emissive: '#e39a5e', emissiveIntensity: .16});
  const flow = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.55, 1), flowMaterial, 28);
  flow.name = 'Animated graphite feed into illustrative downstream route';
  flow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(flow);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3(1, 1, 1);
  let selected: MetallurgyEndUseRoute = 'anode';
  let lastStep = -1;

  function setRoute(route: MetallurgyEndUseRoute) {
    selected = route;
    anode.group.visible = route === 'anode';
    refractory.group.visible = route === 'refractory';
    flow.visible = true;
    lastStep = -1;
  }

  function update(seconds: number, animate: boolean) {
    const duration = ROUTE_STEPS[selected].length * ROUTE_STEP_SECONDS;
    const safeSeconds = THREE.MathUtils.clamp(Number.isFinite(seconds) ? seconds : 0, 0, duration);
    const step = Math.min(ROUTE_STEPS[selected].length - 1, Math.floor(safeSeconds / ROUTE_STEP_SECONDS));
    const progress = safeSeconds / duration;
    const deck = selected === 'anode' ? anode : refractory;
    deck.updateMotion(safeSeconds, step);
    deck.rings.forEach((ring, index) => {
      const material = ring.material as THREE.MeshStandardMaterial;
      const active = index === step;
      material.color.set(active ? '#e39a5e' : '#547984');
      material.emissive.set(active ? '#9b4822' : '#0a2128');
      material.emissiveIntensity = active && animate ? .42 + Math.sin(safeSeconds * 3.4) * .14 : active ? .26 : .06;
    });
    for (let i = 0; i < flow.count; i++) {
      const stagger = i / flow.count;
      const travel = Math.max(0, Math.min(1, progress * 1.16 - stagger * .42));
      const x = -128 + travel * 260;
      const phase = animate ? safeSeconds * 2.2 + i * .72 : safeSeconds + i * .72;
      position.set(x, 5 + Math.sin(phase) * .9, Math.sin(i * 1.7) * 2.8);
      quaternion.setFromAxisAngle(new THREE.Vector3(.2, 1, .4).normalize(), phase);
      const particleScale = travel > 0 && travel < .98 ? .58 + (i % 4) * .11 : 0;
      scale.setScalar(particleScale);
      matrix.compose(position, quaternion, scale);
      flow.setMatrixAt(i, matrix);
    }
    flow.instanceMatrix.needsUpdate = true;
    return {route: selected, step, stepLabel: ROUTE_STEPS[selected][step], progress, complete: safeSeconds >= duration};
  }

  setRoute('anode');
  update(0, false);
  return {root, setRoute, update, steps: ROUTE_STEPS, get duration() { return ROUTE_STEPS[selected].length * ROUTE_STEP_SECONDS; }};
}
