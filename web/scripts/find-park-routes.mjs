import {Scene} from 'three';import {initPhysics,createDrivingWorld} from '../src/driving-physics.js';import {stuntPark,parkChallenges} from '../src/stunt-park.js';import {stuntScore} from '../src/stunt-score.js';
await initPhysics();
for(const route of ['pad','ring'])for(const throttle of [1.4,1.8,2.2,2.6,3,3.4])for(const stop of [15,22,28,35,50]){
 const z=route==='pad'?22:44,sim=createDrivingWorld({spawn:{x:-38,y:.05,z}});stuntPark(new Scene(),sim.world,sim.RAPIER);const tasks=parkChallenges(),sc=stuntScore();let awards=[];
 for(let i=0;i<1800;i++){const p=sim.body.translation(),s=sim.step({throttle:i/120<throttle?1:0,brake:p.x>=stop,steer:0});s.score=sc.update(1/120,{...s,position:sim.body.translation()},sim.body.rotation());const r=tasks.update(1/120,s,sim.body.translation());if(r.award)awards.push(r.award.id);}
 if(awards.includes(route))console.log({route,throttle,stop,awards});sim.world.free();
}
