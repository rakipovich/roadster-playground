import {initPhysics,createDrivingWorld} from '../src/driving-physics.js';
import {stuntScore} from '../src/stunt-score.js';
await initPhysics();
for(const lift of [0.7,1,1.4,1.8])for(const turn of [.6,1,1.4,1.8,2.2])for(const rescue of [0,.3,.6]){
 const sim=createDrivingWorld(),score=stuntScore();let final,trace=[];
 for(let i=0;i<1200;i++){const t=i/120,input={boost:t<lift||(rescue>0&&t>lift+turn&&t<lift+turn+rescue),steer:t>=lift&&t<lift+turn?1:0};const s=sim.step(input);final=score.update(1/120,{...s,position:sim.body.translation()},sim.body.rotation());if(final.event&&trace.at(-1)!==final.event)trace.push(final.event);}
 if(final.total!==0)console.log(JSON.stringify({lift,turn,rescue,total:final.total,trace}));sim.world.free();
}
