import assert from 'node:assert/strict';
import * as THREE from 'three';
import proj4 from 'proj4';
import {createSceneReveal} from '../src/lib/deck/scene-reveal';
import {createMetallurgyInspection} from '../src/lib/deck/metallurgy-inspection';
const stage=new THREE.Group();
const blocks=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),100);
const pit=new THREE.Mesh(new THREE.BoxGeometry(100,60,100),new THREE.MeshStandardMaterial());stage.add(blocks,pit);
const vertices=Array.from(pit.geometry.attributes.position.array);
const original=new THREE.Plane(new THREE.Vector3(1,0,0),5);pit.material.clippingPlanes=[original];
const controller=createSceneReveal(stage,[blocks],[pit]);
controller.start('resource');for(let i=0;i<20;i++)controller.update(.1);
assert.ok(blocks.count>0&&blocks.count<100);
const count=blocks.count;controller.update(0);assert.equal(blocks.count,count);
controller.reset();assert.equal(blocks.count,100);
controller.start('resource');controller.update(0,true);assert.equal(blocks.count,100);
for(const action of ['pitcut','benches'] as const){controller.start(action);controller.update(.1);assert.notEqual(pit.material.clippingPlanes?.[0],original);controller.reset();assert.equal(pit.material.clippingPlanes?.[0],original);}
assert.deepEqual(Array.from(pit.geometry.attributes.position.array),vertices);
const inspection=createMetallurgyInspection();
for(const mode of ['flake','sieve','compare'] as const){inspection.show(mode);assert.equal(inspection.root.children.filter(o=>o.visible).length,1);for(const t of [-1,NaN,Infinity,0,2,100]){inspection.update(t);inspection.root.traverse(o=>assert.ok([...o.position.toArray(),...o.rotation.toArray().slice(0,3)].every(Number.isFinite)));}}
inspection.show(null);assert.equal(inspection.root.visible,false);
proj4.defs('EPSG:32737','+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs');
const inputs=Array.from({length:20000},(_,i)=>[475000+i%200,9465000+i%400]);
const before=performance.now();const reference=inputs.map(p=>proj4('EPSG:32737','WGS84',p));const oldMs=performance.now()-before;
const converter=proj4('EPSG:32737','WGS84'),after=performance.now();const optimised=inputs.map(p=>converter.forward(p));const newMs=performance.now()-after;
assert.deepEqual(optimised,reference,'reused converter preserves exact coordinates');
console.log(`Coordinate conversion microbenchmark (20k points): ${oldMs.toFixed(1)} ms → ${newMs.toFixed(1)} ms; exact output equality`);
console.log('PASS: resource replay/pause/reset, reduced motion, pit clipping restoration, unchanged vertices, finite inspection animation and exclusive views');
