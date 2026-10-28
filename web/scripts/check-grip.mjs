import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';import {Scene} from 'three';
import {initPhysics,createDrivingWorld} from '../src/driving-physics.js';import {parkDemoInput} from '../src/park-demo.js';import {stuntPark} from '../src/stunt-park.js';
await initPhysics();const data=JSON.parse(await readFile(new URL('../../checks/v28/ramp-collider.json',import.meta.url)));const ramp={vertices:Float32Array.from(data.vertices),indices:Uint32Array.from(data.indices)};
const sim=createDrivingWorld({ramp});let inverted=0,released=false,landed=false;
for(let i=0;i<1800;i++){const t=i/120,s=sim.step(parkDemoInput('grip',t,sim.body));if(s.adhering&&s.upY<-.9)inverted++;if(t>7&&t<8&&!s.adhering&&!s.grounded)released=true;if(t>10&&s.grounded&&s.upY>.9)landed=true;}
assert.ok(inverted>180,'Hold inverted for at least 1.5 seconds');assert.ok(released,'Jets release the suction');assert.ok(landed,'Recover onto wheels');sim.world.free();
const air=createDrivingWorld({spawn:{x:0,y:30,z:0}});let s;for(let i=0;i<120;i++)s=air.step({adhesion:true});assert.equal(s.adhering,false);assert.ok(air.body.translation().y<27,'No suction without a nearby surface');air.world.free();
const tower=createDrivingWorld({spawn:{x:-85,y:.05,z:90}});stuntPark(new Scene(),tower.world,tower.RAPIER);let roof=false,max=0;
for(let i=0;i<1920;i++){s=tower.step(parkDemoInput('tower',i/120,tower.body));const p=tower.body.translation();max=Math.max(max,p.y);if(i>1500&&s.grounded&&p.y>59&&s.upY>.8)roof=true;}
assert.ok(roof,'Land on the skyscraper roof on wheels');tower.world.free();console.log({invertedSeconds:inverted/120,released,landed,towerApex:max,roof});
const standing=createDrivingWorld();let standingApex=0;for(let i=0;i<1200;i++){standing.step({boost:true});standingApex=Math.max(standingApex,standing.body.translation().y);}assert.ok(standingApex<59,'Original jet reserve cannot lift to the tower from standstill');standing.world.free();
const early=createDrivingWorld({spawn:{x:-85,y:.05,z:90}});stuntPark(new Scene(),early.world,early.RAPIER);let earlyRoof=false;for(let i=0;i<1920;i++){const t=i/120,s=early.step({throttle:t<4.8?1:0,boost:t>=3.3&&t<5.9,brake:t>5.9});if(s.grounded&&early.body.translation().y>59)earlyRoof=true;}assert.equal(earlyRoof,false,'Early boost should miss the roof');early.world.free();console.log({standingApex,earlyBoostMisses:true});
