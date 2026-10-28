import assert from 'node:assert/strict';
import {initPhysics,createDrivingWorld} from '../src/driving-physics.js';
import {stuntScore} from '../src/stunt-score.js';
await initPhysics();
for(const c of [{lift:1.4,turn:1.8,rescue:.6,expected:300},{lift:.7,turn:1,rescue:0,expected:0}]){
 const sim=createDrivingWorld(),score=stuntScore();let result;
 for(let i=0;i<1200;i++){const t=i/120,s=sim.step({steer:t>=c.lift&&t<c.lift+c.turn?1:0,boost:t<c.lift||(c.rescue&&t>=c.lift+c.turn&&t<c.lift+c.turn+c.rescue)});result=score.update(1/120,{...s,position:sim.body.translation()},sim.body.rotation());}
 assert.equal(result.total,c.expected);console.log('Physics replay:',result.total);sim.world.free();
}
