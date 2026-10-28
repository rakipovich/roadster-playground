import {Scene,Vector3,Quaternion} from 'three';
import {initPhysics,createDrivingWorld} from '../src/driving-physics.js';import {stuntPark} from '../src/stunt-park.js';import {parkDemoInput} from '../src/park-demo.js';import {stuntPilot} from '../src/stunt-pilot.js';
await initPhysics();const sim=createDrivingWorld({spawn:{x:-85,y:.05,z:90}});stuntPark(new Scene(),sim.world,sim.RAPIER);let arc=[0,0,0],last=new Quaternion(),landed=false;
for(let i=0;i<2280;i++){const t=i/120,p=sim.body.translation();let input=parkDemoInput('tower',t,sim.body);if(t>=6.5&&t<13)input={...input,...stuntPilot(t,sim.body)};const s=sim.step(input),q=new Quaternion().copy(sim.body.rotation());if(t>=6.5&&t<13){const d=last.clone().invert().multiply(q);arc[0]+=d.x*2;arc[1]+=d.y*2;arc[2]+=d.z*2;}last=q;if(s.grounded&&t>10&&p.y>59&&s.upY>.9)landed=true;if(i%120===0)console.log(t,JSON.stringify({p:[p.x,p.y,p.z],up:s.upY,angular:s.angularSpeed}));}
console.log({arc,landed});sim.world.free();
