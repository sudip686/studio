import * as THREE from 'three';

export type PlantProcessArea = 'feed' | 'milling' | 'flotation' | 'dewatering' | 'product';

/** Display motion for the conceptual campus. Speeds and particle counts have
 * no engineering meaning. Detailed equipment is created only for metallurgy. */
export function createPlantProcessMotion(plant: THREE.Group) {
  const root = new THREE.Group(); root.name = 'Illustrative process activity'; plant.add(root);
  const rock = new THREE.MeshStandardMaterial({color: 0x353c3b, roughness: .95});
  const concentrate = new THREE.MeshStandardMaterial({color: 0x67685b, roughness: .85});
  const froth = new THREE.MeshStandardMaterial({color: 0xe5e4cd, roughness: .88});
  const steel = new THREE.MeshStandardMaterial({color: 0x8c9798, metalness: .5, roughness: .45});
  const flow = plant.userData.flow as THREE.Vector3[];
  const mill = plant.userData.processMill as THREE.Mesh | undefined;
  const dryer = plant.userData.processDryer as THREE.Mesh | undefined;
  const millMount = mill?.quaternion.clone(), dryerMount = dryer?.quaternion.clone();
  const yAxis = new THREE.Vector3(0, 1, 0), rotation = new THREE.Quaternion();
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
  const position = new THREE.Vector3(), direction = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const clocks: Record<PlantProcessArea, number> = {feed: 0, milling: 0, flotation: 0, dewatering: 0, product: 0};
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

  const cells = Array.from({length: 10}, (_, index) => ({x: 8 + index % 5 * 15, z: -36 + Math.floor(index / 5) * 24}));
  const foam = new THREE.InstancedMesh(new THREE.SphereGeometry(.42, 6, 4), froth, cells.length * 8);
  foam.name = 'Illustrative flotation surface activity'; foam.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  foam.boundingBox = new THREE.Box3(new THREE.Vector3(0, 11, -46), new THREE.Vector3(78, 17, -2));
  foam.boundingSphere = foam.boundingBox.getBoundingSphere(new THREE.Sphere()); root.add(foam);
  const blades = new THREE.InstancedMesh(new THREE.BoxGeometry(7, .35, .75), steel, cells.length);
  blades.name = 'Flotation agitator paddles'; blades.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  blades.boundingBox = foam.boundingBox.clone(); blades.boundingSphere = foam.boundingSphere.clone(); root.add(blades);

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

  function update(delta: number, area: PlantProcessArea | 'overview', running: boolean) {
    const dt = running && Number.isFinite(delta) ? THREE.MathUtils.clamp(delta, 0, .08) : 0;
    if (!dt && lastActivity?.area === area) return lastActivity;
    if (area === 'overview') { clocks.feed += dt; clocks.product += dt; }
    else clocks[area] += dt;
    feed.mesh.visible = area === 'feed' || area === 'overview';
    product.mesh.visible = area === 'product' || area === 'overview';
    foam.visible = blades.visible = slurry.mesh.visible = area === 'flotation';
    if (feed.mesh.visible) placeTransfer(feed, clocks.feed, 7);
    if (product.mesh.visible) placeTransfer(product, clocks.product, 5);
    if (mill && millMount) mill.quaternion.copy(millMount).multiply(rotation.setFromAxisAngle(yAxis, clocks.milling * .42));
    if (dryer && dryerMount) dryer.quaternion.copy(dryerMount).multiply(rotation.setFromAxisAngle(yAxis, clocks.dewatering * .2));
    if (area === 'flotation') {
      placeTransfer(slurry, clocks.flotation, 5);
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
      blades.instanceMatrix.needsUpdate = foam.instanceMatrix.needsUpdate = true;
    }
    lastActivity = {area, clocks: {...clocks}, visibleTransfers: [feed.mesh, slurry.mesh, product.mesh].filter(mesh => mesh.visible).length};
    return lastActivity;
  }
  update(0, 'overview', false);
  return {root, update};
}
