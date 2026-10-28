import assert from 'node:assert/strict';
import {Scene,Quaternion,Matrix4,Vector3} from 'three';
import {initPhysics,createDrivingWorld} from '../src/driving-physics.js';
import {wallRides} from '../src/wall-rides.js';
import {parkDemoInput} from '../src/park-demo.js';
await initPhysics();const sim=createDrivingWorld({spawn:{x:-71,y:14,z:55}});wallRides(new Scene(),sim.world,sim.RAPIER);
sim.body.setRotation(new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3(0,0,1),new Vector3(-1,0,0),new Vector3(0,-1,0))),true);
let held=0,released=false,landed=0;
for(let i=0;i<1440;i++){const t=i/120,s=sim.step(parkDemoInput('bowl',t,sim.body)),p=sim.body.translation();if(s.adhering&&Math.abs(s.upY)<.3)held++;if(t>3.5&&s.boosting&&!s.adhering)released=true;if(t>7&&s.grounded&&s.upY>.9)landed++;if(i%120===0)console.log(t,{p,up:s.upY,speed:s.speed,ground:s.grounded,grip:s.adhering});}
console.log({held:held/120,released,landed:landed/120});sim.world.free();
assert.ok(held>120);assert.ok(released);assert.ok(landed>120);
