import assert from 'node:assert/strict';
import {Scene,Quaternion,Vector3} from 'three';
import {wallRides} from '../src/wall-rides.js';
import {initPhysics,createDrivingWorld} from '../src/driving-physics.js';
await initPhysics();
// Ballistic drop with the configured mild linear drag, at both update rates.
for(const dt of [1/120,1/60]){
 const sim=createDrivingWorld({spawn:{x:0,y:100,z:0}});
 for(let t=0;t<1-dt/2;t+=dt)sim.step({},dt);
 const drop=100-sim.body.translation().y;
 assert.ok(Math.abs(drop-4.745)<.12,`Gravity drop ${drop}`);
 assert.ok(Math.abs(sim.body.linvel().y+9.335)<.06);
 console.log({dt,drop,fallSpeed:sim.body.linvel().y});sim.world.free();
}
const sim=createDrivingWorld();let s;
for(let i=0;i<120;i++)sim.step({brake:true});
for(let i=0;i<1080;i++)s=sim.step({adhesion:true,brake:true});
assert.equal(s.gripFuel,0);assert.equal(s.gripLocked,true);assert.equal(s.adhering,false);
for(let i=0;i<240;i++)s=sim.step({adhesion:true,brake:true});
assert.equal(s.gripFuel,0,'Cannot recharge while grip switch remains on');
for(let i=0;i<600;i++)s=sim.step({brake:true});
assert.ok(s.gripFuel>.49&&s.gripFuel<.51);assert.equal(s.gripLocked,false);
sim.reset();s=sim.step({});assert.equal(s.gripFuel,1);
sim.world.free();
const air=createDrivingWorld({spawn:{x:0,y:100,z:0}});
for(let i=0;i<120;i++)s=air.step({boost:true});
assert.ok(air.body.linvel().y>6&&air.body.linvel().y<7,'Jet acceleration is thrust minus gravity, no launch kick');
for(let i=0;i<360;i++)s=air.step({boost:true});
assert.equal(s.fuel,0);assert.equal(s.boosting,false);
const v=air.body.linvel().y;
for(let i=0;i<120;i++)s=air.step({boost:i%2===0,adhesion:true});
assert.ok(air.body.linvel().y<v-7,'Empty jets and grip cannot sustain flight');assert.equal(s.fuel,0);
air.world.free();console.log('Finite grip, grounded recharge, thrust budget and free fall: PASS');

const wall=createDrivingWorld({spawn:{x:-20,y:10,z:-90}});
wallRides(new Scene(),wall.world,wall.RAPIER);
wall.body.setRotation(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),Math.PI/2),true);
let held=0;
for(let i=0;i<1440;i++){s=wall.step({adhesion:true,brake:true});if(s.adhering)held++;}
assert.ok(held>900&&held<965,'About eight seconds of actual wall grip');
assert.equal(s.gripFuel,0);assert.equal(s.adhering,false);
assert.ok(wall.body.translation().y<1,'After exhaustion the car falls off the wall');
console.log({wallGripSeconds:held/120,afterExhaustionY:wall.body.translation().y});wall.world.free();
