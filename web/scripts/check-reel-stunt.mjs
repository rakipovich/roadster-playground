import assert from 'node:assert/strict';
import {Scene,Quaternion,Vector3} from 'three';
import {initPhysics,createDrivingWorld} from '../src/driving-physics.js';
import {stuntPark} from '../src/stunt-park.js';
import {parkDemoInput} from '../src/park-demo.js';
import {stuntScore} from '../src/stunt-score.js';
await initPhysics();
const sim=createDrivingWorld({spawn:{x:-85,y:.05,z:90}}),score=stuntScore();stuntPark(new Scene(),sim.world,sim.RAPIER);
let rotations=new Vector3(),previous=new Quaternion(),inverted=0,roofFrames=0,result,landing=null,landingEnd=null;
for(let i=0;i<2400;i++){
 const t=i/120,s=sim.step(parkDemoInput('tower',t,sim.body)),q=new Quaternion().copy(sim.body.rotation()),p=sim.body.translation();
 const d=previous.clone().invert().multiply(q);if(d.w<0)d.set(-d.x,-d.y,-d.z,-d.w);
 if(t>=7.4&&t<13.9)rotations.add(new Vector3(d.x,d.y,d.z).multiplyScalar(2));previous=q;
 if(t>=7.8&&t<12&&s.upY<-.6)inverted++;
 if(t>13.9&&s.grounded&&p.y>59&&s.upY>.9){roofFrames++;landing??={...p};landingEnd={...p};}
 result=score.update(1/120,{...s,position:p},q);
 assert.ok(Number.isFinite(p.x+p.y+p.z));
}
assert.ok(rotations.x>Math.PI*2&&Math.abs(rotations.z)>Math.PI*2,'Both axes complete a full turn');
assert.ok(inverted>60,'Cabin shot contains an inverted interval');
assert.ok(Math.hypot(landing.x-85,landing.z-90)<1,'Land directly in the platform centre');
assert.ok(Math.hypot(landingEnd.x-landing.x,landingEnd.z-landing.z)<2,'No drive after landing');
assert.ok(roofFrames>480,'Stable roof landing for at least four seconds');
console.log(result);assert.ok(result.total>=800,'Real scoring awards both rotations after landing');
console.log(JSON.stringify({rollDegrees:rotations.x*180/Math.PI,flipDegrees:rotations.z*180/Math.PI,invertedCabinSeconds:inverted/120,roofSeconds:roofFrames/120,score:result.total,landing,landingEnd}));sim.world.free();
