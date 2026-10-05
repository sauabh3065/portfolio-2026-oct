import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTS, asset, createRiggedDragon, THREE } from './dragon-fixture.mjs';
const {DragonRound}=await loadTS('../lib/dragon-combat.ts');
const {poseCombat}=await loadTS('../lib/dragon-combat-rig.ts');

test('out-of-range attacks cannot damage or end a round',()=>{
  const round=new DragonRound(0);
  for(let i=0;i<3000;i++){
    round.advance(1/60);
    round.registerContact({point:{x:0,y:0,z:0},target:{x:5,y:0,z:0},distance:5,radius:0.3});
  }
  assert.deepEqual(round.health,[100,100]);assert.equal(round.winner,null);
});
for(const seed of [0,1,2,3])test(`real skinned contacts resolve a full round with ${(seed&1)===0?'fire':'ice'} winning`,()=>{
  const dragons=[createRiggedDragon(asset,0),createRiggedDragon(asset,1)];
  const round=new DragonRound(seed);
  let minimumBodySeparation=Infinity;
  for(let i=0;i<45*60&&!round.finished;i++){
    round.advance(1/60);poseCombat(round,dragons);
    if(round.winner===null){const a=dragons[0].bones.Body.getWorldPosition(new THREE.Vector3()),b=dragons[1].bones.Body.getWorldPosition(new THREE.Vector3());minimumBodySeparation=Math.min(minimumBodySeparation,a.distanceTo(b));}
  }

  assert.equal(round.finished,true);
  assert.equal(round.winner,seed&1);
  assert.ok(round.time>=30&&round.time<=45);
  assert.equal(round.health[1-(seed&1)],0);
  assert.ok(round.health[seed&1]>0 && round.health[seed&1]<70,'winner should show fatigue');
  assert.ok(minimumBodySeparation>=0.799,'bodies must not overlap');
  assert.ok(round.impacts.some(e=>e.kind==='tail'&&e.damage>0),'tail must connect');
  assert.ok(round.impacts.some(e=>e.kind==='bite'&&e.damage>0),'bite must connect');
  assert.ok(round.impacts.some(e=>e.kind==='grapple'&&e.damage>0),'grapple must connect');
  const finalHealth=[...round.health], finalTime=round.time;
  for(let i=0;i<60;i++){round.advance(1/60);poseCombat(round,dragons)}
  assert.deepEqual(round.health,finalHealth);assert.equal(round.time,finalTime);
  const fresh=new DragonRound(seed);assert.deepEqual(fresh.health,[100,100]);assert.equal(fresh.winner,null);assert.equal(fresh.time,0);
});
