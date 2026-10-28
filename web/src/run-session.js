// Simulation time: pauses and background tabs do not consume a run.
export function runSession(duration=90){
 let mode='challenge',elapsed=0,finished=false,outcome=null;
 const snapshot=()=>({mode,elapsed,outcome,remaining:mode==='training'?null:Math.max(0,duration-elapsed),finished});
 return {start(next='challenge'){mode=['training','roof'].includes(next)?next:'challenge';elapsed=0;finished=false;outcome=null;return snapshot();},step(dt){if(!finished){elapsed+=Math.max(0,dt);if(mode!=='training'&&elapsed>=duration-1e-8){elapsed=duration;finished=true;}}return snapshot();},finish(value){outcome=value;finished=true;return snapshot();},get state(){return snapshot();}};
}
