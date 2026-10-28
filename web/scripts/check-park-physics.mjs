import assert from 'node:assert/strict';import {Scene} from 'three';
import {initPhysics,createDrivingWorld} from '../src/driving-physics.js';import {stuntPark} from '../src/stunt-park.js';
await initPhysics();
for(const z of [22,44,-48]){const sim=createDrivingWorld({spawn:{x:-38,y:.05,z}});const park=stuntPark(new Scene(),sim.world,sim.RAPIER);let maxY=0,bestAir=0;for(let i=0;i<720;i++){const s=sim.step({throttle:1,steer:0,boost:false});maxY=Math.max(maxY,sim.body.translation().y);bestAir=Math.max(bestAir,s.bestAir);}assert.ok(maxY>1&&bestAir>.3,`lane ${z} must launch the vehicle`);assert.ok(park.triangles<9500);console.log({lane:z,maxY,bestAir});sim.world.free();}
