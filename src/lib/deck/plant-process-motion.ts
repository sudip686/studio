import * as THREE from 'three';
import {createSignalGlow} from './signal-glow';

export type PlantProcessArea = 'feed' | 'milling' | 'flotation' | 'dewatering' | 'product';

/** Display motion for the conceptual campus. Speeds and particle counts have
 * no engineering meaning. Detailed equipment is created only for metallurgy. */
export function createPlantProcessMotion(plant: THREE.Group, glowEnabled = false) {
  const root = new THREE.Group(); root.name = 'Illustrative process activity'; plant.add(root);
  const rock = new THREE.MeshStandardMaterial({color: 0x353c3b, roughness: .95});
  const concentrate = new THREE.MeshStandardMaterial({color: 0x67685b, roughness: .85});
  const froth = new THREE.MeshStandardMaterial({color: 0xe5e4cd, roughness: .88});
  const steel = new THREE.MeshStandardMaterial({color: 0x8c9798, metalness: .5, roughness: .45});
  const graphiteFlake = new THREE.MeshStandardMaterial({color: 0x66d9d2, emissive: 0x125b59, emissiveIntensity: .55, roughness: .28, metalness: .12, side: THREE.DoubleSide});
  const gangue = new THREE.MeshStandardMaterial({color: 0xb98455, emissive: 0x50301b, roughness: .94});
  const fineGraphite = new THREE.MeshStandardMaterial({color: 0x638eaf, emissive: 0x18304c, roughness: .7});
  steel.color.set(0x697b81);
  steel.userData.studioFinish = true;
  const flow = plant.userData.flow as THREE.Vector3[];
  const mill = plant.userData.processMill as THREE.Mesh | undefined;
  const dryer = plant.userData.processDryer as THREE.Mesh | undefined;
  const millMount = mill?.quaternion.clone(), dryerMount = dryer?.quaternion.clone();
  const yAxis = new THREE.Vector3(0, 1, 0), rotation = new THREE.Quaternion();
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
  const position = new THREE.Vector3(), direction = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const clocks: Record<PlantProcessArea, number> = {feed: 0, milling: 0, flotation: 0, dewatering: 0, product: 0};
  let lastCoarseFraction = Number.NaN;
  let lastActivity: {area: PlantProcessArea | 'overview'; clocks: Record<PlantProcessArea, number>; visibleTransfers: number} | null = null;

  function transfer(points: THREE.Vector3[], material: THREE.Material, count: number, radius: number) {
    const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(radius, 0), material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.castShadow = true;
    // Bounds include every segment from the start, even before all instances
    // have been positioned. Camera movement must not cull the active stream.
    const bounds = new THREE.Box3().setFromPoints(points).expandByScalar(radius * 2);
    mesh.boundingBox = bounds; mesh.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
    root.add(mesh);
    const lengths = points.slice(1).map((point, index) => point.distanceTo(points[index]));
    const length = lengths.reduce((sum, value) => sum + value, 0);
    return {mesh, points, lengths, length};
  }
  // Follow the same vertices used to construct the actual conveyor/rack. A
  // length-based phase avoids a speed jump at every segment junction.
  const feed = transfer(flow.slice(0, 4).map(point => point.clone().add(new THREE.Vector3(0, 3, 0))), rock, 24, .85);
  const product = transfer(flow.slice(7).map(point => point.clone().add(new THREE.Vector3(0, 3, 0))), concentrate, 16, .65);
  feed.mesh.name = 'Feed on receiving conveyor'; product.mesh.name = 'Concentrate transfer to storage';

  // Concentrate leaving the visible launder follows the existing process pipe.
  const slurry = transfer([[8, 12.8, -27], [78, 12.8, -27], [92, 12.8, -27], [103, 13.8, -31]].map(point => new THREE.Vector3(...point)), froth, 18, .45);
  slurry.mesh.name = 'Flotation concentrate direction';
  const residuePoints = [[68, 1, -12], [68, 1, 3], [78, 1, 8]].map(point => new THREE.Vector3(...point));
  const residue = transfer(residuePoints, gangue, 10, .55);
  const residueLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(residuePoints), new THREE.LineBasicMaterial({color: 0xd6a174}));
  residueLine.name = 'Conceptual tailings transfer from the cell underflow';
  root.add(residueLine);

  const cells = Array.from({length: 10}, (_, index) => ({x: 8 + index % 5 * 15, z: -36 + Math.floor(index / 5) * 24}));
  // The cutaway sits beside the operating campus so neighbouring roofs cannot
  // cover the pulp, froth or discharge path in the presentation camera.
  const inspection = new THREE.Group();
  inspection.name = 'Illustrative flotation cell section';
  inspection.position.set(200, 0, -160);
  root.add(inspection);
  function sectionBox(size: [number, number, number], center: [number, number, number], material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...center);
    inspection.add(mesh);
  }
  const windowMaterial = new THREE.MeshStandardMaterial({color: 0x94d9d7, transparent: true, opacity: .16, depthWrite: false});
  windowMaterial.userData.studioFinish = true;
  const pulp = new THREE.MeshStandardMaterial({color: 0x467e7a, transparent: true, opacity: .24, depthWrite: false});
  sectionBox([28, 1.3, 20], [0, 2, 0], steel);
  sectionBox([28, 15, .7], [0, 10, 10], steel);
  sectionBox([28, 15, .45], [0, 10, -10], windowMaterial);
  sectionBox([.55, 15, 20], [-14, 10, 0], windowMaterial);
  sectionBox([.55, 15, 20], [14, 10, 0], windowMaterial);
  sectionBox([27, 12, 19], [0, 8.5, 0], pulp);
  sectionBox([26, .6, 18], [0, 14.7, 0], windowMaterial);
  sectionBox([12, 1.4, 6], [18, 14.2, -5], graphiteFlake);
  sectionBox([13, 1.4, 5], [-18, 2.8, -5], gangue);
  sectionBox([2, 8, 2], [0, 17, 0], steel);
  const rising = new THREE.InstancedMesh(new THREE.CylinderGeometry(.68, .68, .15, 6), graphiteFlake, 32);
  const flakeGlow = glowEnabled ? createSignalGlow(rising.count, 0x69f5e5, 22) : null;
  if (flakeGlow) inspection.add(flakeGlow.points);
  const air = new THREE.InstancedMesh(new THREE.SphereGeometry(.7, 8, 6), windowMaterial, 32);
  const sinking = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.62, 0), gangue, 32);
  for (const stream of [rising, air, sinking]) {
    stream.frustumCulled = false;
    stream.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    inspection.add(stream);
  }
  const foam = new THREE.InstancedMesh(new THREE.SphereGeometry(.42, 6, 4), froth, cells.length * 8);
  foam.name = 'Illustrative flotation surface activity'; foam.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  foam.boundingBox = new THREE.Box3(new THREE.Vector3(0, 11, -46), new THREE.Vector3(78, 17, -2));
  foam.boundingSphere = foam.boundingBox.getBoundingSphere(new THREE.Sphere()); root.add(foam);
  const blades = new THREE.InstancedMesh(new THREE.BoxGeometry(7, .35, .75), steel, cells.length);
  blades.name = 'Flotation agitator paddles'; blades.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  blades.boundingBox = foam.boundingBox.clone(); blades.boundingSphere = foam.boundingSphere.clone(); root.add(blades);

  // Conceptual flotation split: teal graphite flakes rise with the froth while
  // muted gangue particles descend to the underflow. Counts and timing are
  // solely visual cues; they do not encode a plant mass balance.
  const splitCount = cells.length * 5;
  const flakes = new THREE.InstancedMesh(new THREE.CylinderGeometry(.58, .58, .14, 6), graphiteFlake, splitCount);
  flakes.name = 'Illustrative graphite flakes carried to froth'; flakes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flakes.boundingBox = new THREE.Box3(new THREE.Vector3(-2, .5, -48), new THREE.Vector3(82, 16, 4));
  flakes.boundingSphere = flakes.boundingBox.getBoundingSphere(new THREE.Sphere()); root.add(flakes);
  const waste = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.4, 0), gangue, splitCount);
  waste.name = 'Illustrative gangue sinking to flotation underflow'; waste.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  waste.boundingBox = flakes.boundingBox.clone(); waste.boundingSphere = flakes.boundingSphere.clone(); root.add(waste);

  // A small conceptual sizing screen and two bins make the reported +150 μm
  // mass fraction tangible. The complement is arithmetic only; no plant yield
  // or commercial product stream is implied.
  const sizing = new THREE.Group(); sizing.name = 'Illustrative 150 micrometre sizing display'; root.add(sizing);
  sizing.position.set(66, 0, 20);
  const binSteel = new THREE.MeshStandardMaterial({color: 0x69736f, metalness: .18, roughness: .76});
  const screen = new THREE.Mesh(new THREE.BoxGeometry(20, .7, 11), steel); screen.position.set(119, 10, 45); screen.rotation.z = -.1; screen.castShadow = true; sizing.add(screen);
  const shakerMotor = new THREE.Mesh(new THREE.BoxGeometry(4, 2.2, 3), binSteel); shakerMotor.position.set(119, 7.6, 45); sizing.add(shakerMotor);
  const coarseBin = new THREE.Group(), fineBin = new THREE.Group();
  const makeBin = (group: THREE.Group, x: number) => {
    group.position.set(x, 0, 58); sizing.add(group);
    const wall = new THREE.MeshStandardMaterial({color: 0x737e78, roughness: .82, side: THREE.DoubleSide});
    for (const [px, py, pz, sx, sy, sz] of [[0, 3, -4, 13, 6, .6], [0, 3, 4, 13, 6, .6], [-6.2, 3, 0, .6, 6, 8], [6.2, 3, 0, .6, 6, 8]] as const) {
      const part = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wall); part.position.set(px, py, pz); part.castShadow = true; group.add(part);
    }
  };
  makeBin(coarseBin, 111); makeBin(fineBin, 128);
  const coarseFill = new THREE.Mesh(new THREE.BoxGeometry(11.8, 1, 7.6), graphiteFlake); coarseFill.position.set(111, .5, 58); sizing.add(coarseFill);
  const fineFill = new THREE.Mesh(new THREE.BoxGeometry(11.8, 1, 7.6), fineGraphite); fineFill.position.set(128, .5, 58); sizing.add(fineFill);
  const sizeParticles = (material: THREE.Material, count: number, x: number) => {
    const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.46, 0), material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; sizing.add(mesh); return {mesh, x};
  };
  const coarseParticles = sizeParticles(graphiteFlake, 40, 111), fineParticles = sizeParticles(fineGraphite, 40, 128);
  for (const outlet of [coarseParticles, fineParticles]) {
    const start = new THREE.Vector3(119, 9.8, 48);
    const end = new THREE.Vector3(outlet.x, 6.4, 55);
    const chute = new THREE.Mesh(new THREE.BoxGeometry(3, .45, start.distanceTo(end)), steel);
    chute.position.copy(start).lerp(end, .5);
    chute.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), end.clone().sub(start).normalize());
    sizing.add(chute);
  }

  function placeTransfer(item: ReturnType<typeof transfer>, time: number, speed: number) {
    for (let index = 0; index < item.mesh.count; index++) {
      let distance = (time * speed + index / item.mesh.count * item.length) % item.length;
      let segment = 0;
      while (segment < item.lengths.length - 1 && distance > item.lengths[segment]) distance -= item.lengths[segment++];
      position.copy(item.points[segment]).lerp(item.points[segment + 1], distance / Math.max(.001, item.lengths[segment]));
      direction.copy(item.points[segment + 1]).sub(item.points[segment]).normalize();
      quaternion.setFromUnitVectors(up, direction);
      scale.setScalar(.8 + index % 3 * .12);
      matrix.compose(position, quaternion, scale); item.mesh.setMatrixAt(index, matrix);
    }
    item.mesh.instanceMatrix.needsUpdate = true;
  }

  function update(delta: number, area: PlantProcessArea | 'overview', running: boolean, coarseFraction = .5) {
    const dt = running && Number.isFinite(delta) ? THREE.MathUtils.clamp(delta, 0, .08) : 0;
    const normalizedCoarseFraction = THREE.MathUtils.clamp(Number.isFinite(coarseFraction) ? coarseFraction : .5, 0, 1);
    if (!dt && lastActivity?.area === area && (area !== 'product' || normalizedCoarseFraction === lastCoarseFraction)) return lastActivity;
    if (area === 'overview') { clocks.feed += dt; clocks.product += dt; }
    else clocks[area] += dt;
    feed.mesh.visible = area === 'feed' || area === 'overview';
    product.mesh.visible = area === 'product' || area === 'overview';
    foam.visible = blades.visible = slurry.mesh.visible = flakes.visible = waste.visible = area === 'flotation';
    residue.mesh.visible = residueLine.visible = area === 'flotation';
    inspection.visible = area === 'flotation';
    sizing.visible = area === 'product';
    if (feed.mesh.visible) placeTransfer(feed, clocks.feed, 7);
    if (product.mesh.visible) placeTransfer(product, clocks.product, 5);
    if (mill && millMount) mill.quaternion.copy(millMount).multiply(rotation.setFromAxisAngle(yAxis, clocks.milling * .42));
    if (dryer && dryerMount) dryer.quaternion.copy(dryerMount).multiply(rotation.setFromAxisAngle(yAxis, clocks.dewatering * .2));
    if (area === 'flotation') {
      placeTransfer(slurry, clocks.flotation, 5);
      placeTransfer(residue, clocks.flotation, 4);
      for (let index = 0; index < rising.count; index++) {
        const phase = (clocks.flotation * .23 + index / rising.count) % 1;
        const lane = Math.sin(index * 2.4) * 8;
        const outlet = THREE.MathUtils.smoothstep(phase, .58, 1);
        quaternion.setFromAxisAngle(yAxis, index + phase);
        scale.setScalar(1);
        position.set(THREE.MathUtils.lerp(lane, 24, outlet), Math.min(15.4, 7 + phase * 14), THREE.MathUtils.lerp(Math.cos(index * 4) * 8, -5, outlet));
        matrix.compose(position, quaternion, scale);
        rising.setMatrixAt(index, matrix);
        flakeGlow?.positions.setXYZ(index, position.x, position.y + .05, position.z);
        position.y -= .63;
        scale.setScalar(Math.max(.001, 1 - outlet));
        matrix.compose(position, quaternion, scale);
        air.setMatrixAt(index, matrix);
        scale.setScalar(1);
        position.set(THREE.MathUtils.lerp(lane, -24, outlet), Math.max(3.5, 9 - phase * 10), THREE.MathUtils.lerp(Math.sin(index * 3) * 8, -5, outlet));
        matrix.compose(position, quaternion, scale);
        sinking.setMatrixAt(index, matrix);
      }
      rising.instanceMatrix.needsUpdate = air.instanceMatrix.needsUpdate = sinking.instanceMatrix.needsUpdate = true;
      if (flakeGlow) flakeGlow.positions.needsUpdate = true;
      cells.forEach((cell, index) => {
        const angle = clocks.flotation * .8 + index * .25;
        position.set(cell.x, 12.65, cell.z); quaternion.setFromAxisAngle(yAxis, angle); scale.set(1, 1, 1);
        matrix.compose(position, quaternion, scale); blades.setMatrixAt(index, matrix);
        for (let bubble = 0; bubble < 8; bubble++) {
          const phase = (clocks.flotation * .3 + bubble / 8 + index * .07) % 1;
          const azimuth = bubble * 2.4 + index;
          position.set(cell.x + Math.cos(azimuth) * 3.7, 12.5 + phase * 1.6, cell.z + Math.sin(azimuth) * 5.3);
          scale.setScalar(Math.sin(phase * Math.PI) * .85 + .15);
          matrix.compose(position, quaternion, scale); foam.setMatrixAt(index * 8 + bubble, matrix);
        }
      });
      for (let index = 0; index < splitCount; index++) {
        const cell = cells[Math.floor(index / 5)], within = index % 5;
        const phase = (clocks.flotation * .22 + within / 5 + Math.floor(index / 5) * .037) % 1;
        const angle = within * 2.38 + Math.floor(index / 5);
        const radiusX = 2.6 + (within % 2) * .7, radiusZ = 3.6 + (within % 3) * .45;
        position.set(cell.x + Math.cos(angle) * radiusX + phase * 1.9, 5.1 + phase * 7.1, cell.z + Math.sin(angle) * radiusZ);
        quaternion.setFromAxisAngle(yAxis, angle + phase * .7); scale.set(1, 1, 1);
        matrix.compose(position, quaternion, scale); flakes.setMatrixAt(index, matrix);
        position.set(cell.x + Math.sin(angle * 1.7) * 3.2, 5.4 - phase * 4.1, cell.z + Math.cos(angle * 1.3) * 4.3);
        quaternion.setFromAxisAngle(yAxis, phase * 2); scale.setScalar(.72 + (within % 3) * .12);
        matrix.compose(position, quaternion, scale); waste.setMatrixAt(index, matrix);
      }
      flakes.instanceMatrix.needsUpdate = waste.instanceMatrix.needsUpdate = true;
      blades.instanceMatrix.needsUpdate = foam.instanceMatrix.needsUpdate = true;
    }
    if (area === 'product') {
      const fraction = normalizedCoarseFraction;
      lastCoarseFraction = fraction;
      const coarseCount = Math.round(40 * fraction);
      coarseParticles.mesh.visible = coarseCount > 0; coarseParticles.mesh.count = coarseCount;
      fineParticles.mesh.visible = coarseCount < 40; fineParticles.mesh.count = 40 - coarseCount;
      for (const [item, count] of [[coarseParticles, coarseCount], [fineParticles, 40 - coarseCount]] as const) {
        for (let index = 0; index < count; index++) {
          const phase = (clocks.product * .38 + index / Math.max(1, count)) % 1;
          const x = THREE.MathUtils.lerp(119, item.x, Math.min(1, phase * 1.35)) + Math.sin(index * 7.1) * 1.1;
          position.set(x, 10.5 - phase * 8, 48 + phase * 10);
          quaternion.setFromAxisAngle(yAxis, index * .7 + clocks.product); scale.setScalar(.65 + (index % 4) * .1);
          matrix.compose(position, quaternion, scale); item.mesh.setMatrixAt(index, matrix);
        }
        item.mesh.instanceMatrix.needsUpdate = true;
      }
      coarseFill.scale.y = Math.max(.04, fraction * 4.2); coarseFill.position.y = coarseFill.scale.y / 2;
      fineFill.scale.y = Math.max(.04, (1 - fraction) * 4.2); fineFill.position.y = fineFill.scale.y / 2;
      screen.position.y = 10 + Math.sin(clocks.product * 18) * .11;
    }
    lastActivity = {area, clocks: {...clocks}, visibleTransfers: [feed.mesh, slurry.mesh, residue.mesh, product.mesh].filter(mesh => mesh.visible).length};
    return lastActivity;
  }
  update(0, 'overview', false);
  return {root, update};
}
