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
assert.equal(lab.pickables.filter(m=>m.userData.bin).length,7);
assert.equal(MET_GROUPS[0].coarse,'>57%');
assert.equal(MET_GROUPS[1].coarse,'Not supplied for the whole group');
assert.equal(MET_GROUPS[5].recovery,'75.8%');
assert.equal(MET_GROUPS[5].carbon,'Not supplied');
assert.ok(MET_GROUPS.every(g=>g.fine==='Not separately reported'));
console.log('PASS: lab stage coverage, sample jars, finite negative/nonfinite animation times, and no invented fine fraction');
