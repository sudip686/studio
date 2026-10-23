import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildConcentrator} from '../src/lib/deck/mine-scene';
import {createPlantProcessMotion, type PlantProcessArea} from '../src/lib/deck/plant-process-motion';

const plant = buildConcentrator();
const activity = createPlantProcessMotion(plant);
const mill = plant.userData.processMill as THREE.Mesh;
const dryer = plant.userData.processDryer as THREE.Mesh;
const millAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(mill.quaternion);
const dryerAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(dryer.quaternion);
const dryerBefore = dryer.quaternion.clone();

let state = activity.update(0, 'milling', false);
for (let frame = 0; frame < 60; frame++) state = activity.update(1 / 60, 'milling', true);
assert(Math.abs(state.clocks.milling - 1) < 1e-9);
assert.deepEqual(dryer.quaternion.toArray(), dryerBefore.toArray(), 'Inspecting the mill must not rotate the dryer');
assert(new THREE.Vector3(0, 1, 0).applyQuaternion(mill.quaternion).distanceTo(millAxis) < 1e-9, 'The mill must rotate on its mounted axis');
const paused = JSON.stringify(state);
for (let frame = 0; frame < 60; frame++) state = activity.update(1 / 60, 'milling', false);
assert.equal(JSON.stringify(state), paused, 'Pausing must freeze equipment and transfer clocks');

for (const area of ['feed', 'milling', 'flotation', 'dewatering', 'product'] as PlantProcessArea[]) {
  const initial = activity.update(0, area, false);
  for (let frame = 0; frame < 90; frame++) state = activity.update(1 / 60, area, true);
  for (const other of Object.keys(state.clocks) as PlantProcessArea[]) if (other !== area) {
    assert.equal(state.clocks[other], initial.clocks[other], `Selecting ${area} must not animate ${other}`);
  }
  for (const object of activity.root.children) if (object instanceof THREE.InstancedMesh && object.visible) {
    const transform = new THREE.Matrix4();
    const point = new THREE.Vector3();
    for (let index = 0; index < object.count; index++) {
      object.getMatrixAt(index, transform);
      assert(transform.elements.every(Number.isFinite), `${object.name} has an invalid instance transform`);
      point.setFromMatrixPosition(transform);
      assert(object.boundingBox?.containsPoint(point), `${object.name} leaves its declared local bounds`);
    }
  }
}
assert(new THREE.Vector3(0, 1, 0).applyQuaternion(dryer.quaternion).distanceTo(dryerAxis) < 1e-9, 'The dryer must stay on its support axis');
const route = plant.userData.flow as THREE.Vector3[];
const last = route[route.length - 1];
assert(last.x > 17 && last.x < 183 && last.z > 90 && last.z < 130, 'The transfer must end inside the covered product store');
assert.equal(activity.update(0, 'overview', false).visibleTransfers, 2, 'The overview must show the feed and product connections');
console.log('Plant process verified: mounted rotation axes, selected-area isolation, pause, finite/bounded instances and connected storage destination.');
