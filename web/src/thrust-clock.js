// One physical clock for gas, wheel animation and the existing slow-motion bake.
export function physicalFrame(time,timing){
 const knots=timing.clock_knots;
 if(time<=knots[0][0])return knots[0][1];
 for(let i=1;i<knots.length;i++)if(time<=knots[i][0]){const[a,fa]=knots[i-1],[b,fb]=knots[i];return fa+(fb-fa)*(time-a)/(b-a);}
 return knots.at(-1)[1];
}
export function presentationTime(frame,timing){
 const knots=timing.clock_knots;
 if(frame<=knots[0][1])return knots[0][0];
 for(let i=1;i<knots.length;i++)if(frame<=knots[i][1]){const[a,fa]=knots[i-1],[b,fb]=knots[i];return a+(b-a)*(frame-fa)/(fb-fa);}
 return knots.at(-1)[0];
}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function nozzleStrength(frame,name,timing){
 let strength=0;
 for(const pulse of timing.thrust_pulses??[]){
  if(!pulse.nozzles.includes(name)||frame<pulse.start_frame||frame>pulse.end_frame)continue;
  const rise=smooth((frame-pulse.start_frame)/pulse.attack_frames),fall=smooth((pulse.end_frame-frame)/pulse.release_frames);
  strength=Math.max(strength,pulse.strength*Math.min(rise,fall));
 }
 return strength;
}
export function thrustSoundLevel(time,timing){
 const f=physicalFrame(time,timing);return Math.max(0,...(timing.thrust_pulses??[]).flatMap(p=>p.nozzles.map(n=>nozzleStrength(f,n,timing))));
}
