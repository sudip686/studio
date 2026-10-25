import assert from 'node:assert/strict';
import {createMetallurgyPlant,PROCESS_STAGES,MET_GROUPS} from '../src/lib/deck/metallurgy-plant';
const lab=createMetallurgyPlant();
assert.equal(PROCESS_STAGES.length,5);
for(const t of [-1,NaN,Infinity,0,.001,1,1000]){
  lab.update(t);
  lab.root.traverse(o=>assert.ok([...o.position.toArray(),...o.rotation.toArray().slice(0,3)].every(Number.isFinite),`Finite transforms at t=${t}`));
}
assert.ok(lab.pickables.length>100);
for(let i=0;i<5;i++)assert.ok(lab.pickables.some(m=>m.userData.stage===i));
assert.equal(lab.pickables.filter(m=>m.userData.bin).length,MET_GROUPS.length);
assert.equal(MET_GROUPS[0].coarse,'34.6%');
assert.equal(MET_GROUPS[1].coarse,'42.2%');
assert.equal(MET_GROUPS[5].recovery,'93.0%');
assert.equal(MET_GROUPS[5].carbon,'98.4% TC');
assert.ok(MET_GROUPS.every(g=>g.fine==='Not separately reported'));
console.log('PASS: lab stage coverage, sample jars, finite negative/nonfinite animation times, and no invented fine fraction');
