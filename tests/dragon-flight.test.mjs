import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../lib/dragon-flight.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { sampleFlight } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('takeoff starts at rest, crouches before lifting, and unfolds wings progressively', () => {
  for (const i of [0,1]) {
    const start=sampleFlight(0,i);
    assert.equal(start.y,0);assert.equal(start.flight,0);assert.equal(start.wings,0);
    assert.equal(sampleFlight(0.5,i).y,0);
    assert.ok(sampleFlight(0.5,i).crouch>0.15);
    assert.ok(sampleFlight(1.8,i).y>0);
    assert.ok(sampleFlight(1.8,i).flight>0);
    assert.equal(sampleFlight(4,i).flight,1);
  }
});
test('takeoff stays bounded, separated and free from position jumps', () => {
  let minSeparation=Infinity,maxSpeed=0,maxAcceleration=0;
  const dt=0.02;
  for(let t=0;t<4;t+=dt){
    const a=sampleFlight(t,0),b=sampleFlight(t,1);
    minSeparation=Math.min(minSeparation,distance(a,b));
    for(const [i,p] of [[0,a],[1,b]]){
      const before=sampleFlight(Math.max(0,t-dt),i),after=sampleFlight(t+dt,i);
      maxSpeed=Math.max(maxSpeed,distance(p,after)/dt);
      if(t>dt)maxAcceleration=Math.max(maxAcceleration,Math.hypot(after.x-2*p.x+before.x,after.y-2*p.y+before.y,after.z-2*p.z+before.z)/(dt*dt));
      assert.ok(Math.abs(p.x)<3.2 && Math.abs(p.z)<2.7 && p.y>=0 && p.y<2.5);
      assert.ok(p.attack>=0 && p.attack<=1);
    }
  }
  assert.ok(minSeparation>4.2,`body separation ${minSeparation}`);
  assert.ok(maxSpeed<3,`speed ${maxSpeed}`);
  assert.ok(maxAcceleration<6,`acceleration ${maxAcceleration}`);
});
test('takeoff ends facing the opponent without an attack',()=>{
  for(const i of [0,1]){
    assert.equal(sampleFlight(3.6,i).yaw,sampleFlight(0,i).yaw);
    assert.equal(sampleFlight(3.6,i).attack,0);
  }
});
