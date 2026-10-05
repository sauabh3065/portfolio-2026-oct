import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asset, createRiggedDragon, sampleFlight, THREE } from './dragon-fixture.mjs';
const box=dragon=>{dragon.root.updateMatrixWorld(true);dragon.mesh.skeleton.update();return new THREE.Box3().setFromObject(dragon.root,true)};

test('idle wings are folded, feet are grounded, and idle offsets never accumulate',()=>{
  const dragon=createRiggedDragon(asset,0);
  dragon.pose(0,0,null,false);
  const before=box(dragon);
  const feet=['LeftFoot','RightFoot','LeftHand','RightHand'].map(n=>dragon.bones[n].getWorldPosition(new THREE.Vector3()));
  for(let i=0;i<900;i++)dragon.pose(0,i/60,null,false);
  const after=box(dragon);
  assert.ok(Math.abs(before.min.y)<0.015,`initial ground contact ${before.min.y}`);
  assert.ok(Math.abs(after.min.y)<0.02,`idle ground contact ${after.min.y}`);
  assert.ok(dragon.bones.UpperBack.scale.x<1.02,'breathing scale accumulated');
  ['LeftFoot','RightFoot','LeftHand','RightHand'].forEach((n,i)=>assert.ok(dragon.bones[n].getWorldPosition(new THREE.Vector3()).distanceTo(feet[i])<0.025));
  const idleWidth=after.max.x-after.min.x;
  dragon.pose(2.6,0,sampleFlight(2.6,0),false);
  const flying=box(dragon);
  assert.ok(flying.max.x-flying.min.x>idleWidth*1.5,'wings should unfold');
});
test('crouch keeps the feet on the ground and takeoff clears the platform',()=>{
  const dragon=createRiggedDragon(asset,0);
  for(const t of [0.1,0.3,0.5,0.7,0.85,1,1.4,2,3.6]){
    const sample=sampleFlight(t,0);
    dragon.root.position.set(sample.x,sample.y,sample.z);
    dragon.root.rotation.set(sample.pitch,sample.yaw,sample.bank,'YXZ');
    dragon.pose(t,0,sample,false);
    const bounds=box(dragon);
    assert.ok(bounds.min.y>-0.075,`ground penetration at ${t}: ${bounds.min.y}`);
    if(t<0.85)assert.ok(bounds.min.y<0.075,`floating feet at ${t}: ${bounds.min.y}`);
    if(t>2)assert.ok(bounds.min.y>0.5,'takeoff should leave platform');
  }
});
