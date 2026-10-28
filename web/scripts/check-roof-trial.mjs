import assert from 'node:assert/strict';
import {Scene} from 'three';
import {roofTrial} from '../src/roof-trial.js';
import {runSession} from '../src/run-session.js';
import {initPhysics,createDrivingWorld} from '../src/driving-physics.js';
import {stuntPark} from '../src/stunt-park.js';
const roof={x:85,y:60,z:90};
for(const [impact,points]of [[3,1000],[20,500]]){
 const trial=roofTrial();trial.update(.1,{grounded:false},{x:40,y:80,z:90});let result;
 for(let i=0;i<100;i++)result=trial.update(.01,{grounded:true,upY:1,angularSpeed:0,speed:0,lastImpact:impact},roof);
 assert.equal(result.points,points);
 assert.equal(trial.update(1,{grounded:false},roof),result,'Result cannot double award');
 trial.reset();assert.equal(trial.update(2,{grounded:true,upY:1},roof),null,'Must fly, not spawn on roof');
}
const missed=roofTrial();missed.update(.1,{grounded:false},{x:30,y:70,z:90});assert.equal(missed.update(1,{grounded:true,upY:1},{x:60,y:0,z:90}).reason,'missed');
const run=runSession();run.start('roof');assert.equal(run.state.mode,'roof');run.step(90);assert.ok(run.state.finished);run.start('roof');run.finish({success:true});assert.ok(run.state.outcome.success);
await initPhysics();
for(const at of [3.3,3.6,3.9,4.2,4.5]){
 const sim=createDrivingWorld({spawn:{x:-85,y:.05,z:90}}),trial=roofTrial();stuntPark(new Scene(),sim.world,sim.RAPIER);let result;
 for(let i=0;i<3000&&!result;i++){const t=i/120,s=sim.step({throttle:t<4.8?1:0,boost:t>=at&&t<at+2.6,brake:t>at+2.6});result=trial.update(1/120,s,sim.body.translation());}
 assert.ok(result,'Attempt must resolve');assert.equal(result.success,at>=3.9);console.log({boostAt:at,result});sim.world.free();
}
console.log('Roof landing grades, no spawn award, miss, deadline and real physics success/failure: PASS');
