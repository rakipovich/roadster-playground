import assert from 'node:assert/strict';
import {Quaternion,Vector3} from 'three';
import {runSession} from '../src/run-session.js';
import {stuntScore} from '../src/stunt-score.js';
import {initPhysics,createDrivingWorld} from '../src/driving-physics.js';
const run=runSession();run.start();for(let i=0;i<10800;i++)run.step(1/120);
assert.ok(run.state.remaining<1e-8);run.step(1/120);assert.equal(run.state.finished,true);assert.equal(run.state.elapsed,90);
run.step(10);assert.equal(run.state.elapsed,90);run.start('training');run.step(500);assert.equal(run.state.finished,false);assert.equal(run.state.remaining,null);
const score=stuntScore(),axis=new Vector3(1,0,0),q=new Quaternion();let s;
function trick({wall=false,crash=false}={}){
 q.identity();for(let i=0;i<60;i++)score.update(1/60,{grounded:true,adhering:wall,upY:wall?0:1,position:{x:0,y:0,z:0}},q);
 for(let i=1;i<=120;i++)s=score.update(1/60,{grounded:false,upY:Math.cos(i*Math.PI/60),boosting:true,position:{x:i*.1,y:4,z:0}},q.setFromAxisAngle(axis,i*Math.PI/60));
 assert.ok(s.pending>0);
 for(let i=0;i<90;i++)s=score.update(1/60,{grounded:!crash,chassisContact:crash,upY:crash?-1:1,angularSpeed:0,position:{x:12,y:0,z:0}},q);
 return s;
}
s=trick();assert.equal(s.total,300);s=trick();assert.equal(s.last,225);assert.equal(s.total,525);
score.reset();s=trick({wall:true});assert.equal(s.last,450);assert.equal(s.total,975);assert.equal(s.multiplier,1.5);
score.reset();s=trick({crash:true});assert.equal(s.total,975);assert.equal(s.pending,0);
score.reset(true);assert.equal(score.snapshot().total,0);s=trick();assert.equal(s.last,300);
await initPhysics();const sim=createDrivingWorld({spawn:{x:0,y:50,z:0}});for(let i=0;i<120;i++)s=sim.step({boost:true});const fuel=s.fuel;sim.reset(undefined,{preserveResources:true});s=sim.step({});assert.ok(Math.abs(s.fuel-fuel)<.005,'Recovery must not refill jets');sim.reset();s=sim.step({});assert.equal(s.fuel,1);sim.world.free();
console.log('Session deadline, training, repetition discount, wall combo, crash, new run and resource-preserving recovery: PASS');
