import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildConcentrator} from '../src/lib/deck/mine-scene';
import {createPlantProcessMotion, type PlantProcessArea} from '../src/lib/deck/plant-process-motion';
import {createMetallurgyEndUseScene} from '../src/lib/deck/metallurgy-end-use-scene';

const deferredPlant = buildConcentrator({deferPlantDetail: true});
assert.equal(deferredPlant.userData.plantDetailLoaded, false, 'The mine-plan overview must start with the shared plant exterior only');
assert.equal((deferredPlant.userData.processStages as unknown[]).length, 6, 'Stage camera metadata must be ready before interior meshes load');
const initialShellMeshes = deferredPlant.children.length;
const ensurePlantDetail = deferredPlant.userData.ensurePlantDetail as () => boolean;
assert.equal(ensurePlantDetail(), true, 'First plant inspection must build the process equipment');
assert.equal(deferredPlant.userData.plantDetailLoaded, true);
assert(deferredPlant.children.length > initialShellMeshes, 'Detailed process meshes must be attached on inspection');
const loadedDetailMeshes = deferredPlant.children.length;
assert.equal(ensurePlantDetail(), false, 'Repeated plant inspections must reuse the attached detail');
assert.equal(deferredPlant.children.length, loadedDetailMeshes, 'Repeated inspection must not duplicate plant detail meshes');

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

const endUse = createMetallurgyEndUseScene();
assert.equal(endUse.root.visible, false, 'Downstream product scenes must stay off the initial plant view');
const anodeRoute = endUse.root.children.find((child) => child.name.includes('EV anode')) as THREE.Group;
const refractoryRoute = endUse.root.children.find((child) => child.name.includes('refractory downstream')) as THREE.Group;
assert(anodeRoute && refractoryRoute, 'Both downstream routes must be present in the deferred end-use group');
endUse.setRoute('anode');
assert.equal(endUse.duration, 30, 'The five-step anode route must provide six seconds for each guided stage');
assert.equal(anodeRoute.visible, true);
assert.equal(refractoryRoute.visible, false, 'The alternate pathway must not overlap the active route');
assert.deepEqual(endUse.update(0, false), {route: 'anode', step: 0, stepLabel: 'Shape', progress: 0, complete: false});
const shapingDrum = endUse.root.getObjectByName('Particle-shaping drum') as THREE.Mesh;
const drumAtRest = shapingDrum.quaternion.clone();
endUse.update(3, true);
assert(shapingDrum.quaternion.angleTo(drumAtRest) > .1, 'The anode shaping drum must rotate during the shaping stage');
const filterPlate = endUse.root.getObjectByName('Filter press plate') as THREE.Mesh;
const filterPlateAtRest = filterPlate.position.x;
endUse.update(7.2, true);
assert.notEqual(filterPlate.position.x, filterPlateAtRest, 'The purification/filter stage must cycle the press plates');
assert.equal(endUse.update(12, true).stepLabel, 'Coat & heat');
const carbonWindow = endUse.root.getObjectByName('Carbonization glow window') as THREE.Mesh;
assert((carbonWindow.material as THREE.MeshStandardMaterial).emissiveIntensity > .24, 'The coating and carbonization stage must show an active furnace glow');
assert.equal(endUse.update(18, true).stepLabel, 'Electrode coating');
const calenderRoller = endUse.root.getObjectByName('Electrode calender roller') as THREE.Mesh;
const rollerAtRest = calenderRoller.quaternion.clone();
endUse.update(20, true);
assert(calenderRoller.quaternion.angleTo(rollerAtRest) > .1, 'The electrode calender must rotate on the copper-foil coating stage');
assert.equal(endUse.update(24, true).stepLabel, 'Cell + EV');
const activeLayers: THREE.Mesh[] = [];
endUse.root.traverse(object => { if (object instanceof THREE.Mesh && object.name === 'Graphite anode active-material layer') activeLayers.push(object); });
const anodeLayerAtRest = activeLayers[0].position.x;
assert.equal(endUse.update(30, false).complete, true, 'The user-started route reaches a stable final product frame');
assert.equal(activeLayers[0].position.x, anodeLayerAtRest - 1.25, 'The final battery-cell stage must reveal its layered anode stack');
const batteryPack = endUse.root.getObjectByName('Illustrative battery pack under EV platform') as THREE.Mesh;
assert((batteryPack.material as THREE.MeshStandardMaterial).emissiveIntensity > .25, 'The completed EV route must emphasize the battery pack');
const lithiumIon = endUse.root.getObjectByName('Illustrative lithium ion moving toward graphite anode during charge') as THREE.Mesh;
assert(lithiumIon.visible && lithiumIon.position.y < 14, 'The cell cutaway must show lithium ions entering the graphite anode during charging');
endUse.setRoute('refractory');
assert.equal(endUse.duration, 24, 'The four-step refractory route must retain its original duration');
assert.equal(anodeRoute.visible, false);
assert.equal(refractoryRoute.visible, true);
assert.equal(endUse.update(6, false).stepLabel, 'Press');
const pressRam = endUse.root.getObjectByName('Refractory press ram') as THREE.Mesh;
const ramAtRest = pressRam.position.y;
endUse.update(7.2, true);
assert(pressRam.position.y < ramAtRest, 'The refractory press ram must cycle during the pressing stage');
const pressedBrick = endUse.root.getObjectByName('Unfired magnesia-carbon brick') as THREE.Mesh;
const brickAtPress = pressedBrick.position.y;
endUse.update(14, true);
assert(pressedBrick.position.y > brickAtPress, 'The MgO–C brick must lift into view after pressing');
const refractoryMixer = endUse.root.getObjectByName('Illustrative MgO and graphite blending') as THREE.Group;
endUse.update(3, true);
assert(Math.abs(refractoryMixer.rotation.y) > .1, 'The refractory batch mixer must turn during blending');
const furnaceElectrode = endUse.root.getObjectByName('Graphite electrode in EAF context') as THREE.Mesh;
const electrodeAtRest = furnaceElectrode.position.y;
endUse.update(21, true);
assert.notEqual(furnaceElectrode.position.y, electrodeAtRest, 'The furnace-lining stage must animate its furnace context');
const productFlow = endUse.root.children.find((child) => child.name.includes('Animated graphite feed')) as THREE.InstancedMesh;
assert(productFlow && productFlow.instanceMatrix.array.every(Number.isFinite), 'The downstream particle stream must have finite transforms');
console.log('Plant and downstream processes verified: mounted rotation axes, selected-area isolation, pause, anode and refractory machine animation, staged end-use progress, finite particle transforms and connected storage destination.');
