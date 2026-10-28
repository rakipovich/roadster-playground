import * as THREE from 'three';
export function stuntScore(){
 const repeats=new Map();let wallTime=0,wallAge=99,wallCombo=false,usedJets=false,multiplier=1,landings=0;
 let total=0,best=0,pending=0,last=0,air=0,settled=0,active=false,failed=false,crashLatched=false,event='',eventAge=0,crashTime=0;
 const previous=new THREE.Quaternion(),delta=new THREE.Quaternion(),turns=new THREE.Vector3(),start=new THREE.Vector3();
 let hasPrevious=false,names=[];
 function reset(all=false){if(all){total=best=landings=0;repeats.clear();}wallTime=0;wallAge=99;wallCombo=usedJets=false;multiplier=1;pending=last=air=settled=0;active=failed=crashLatched=hasPrevious=false;turns.set(0,0,0);names=[];event='';crashTime=0;}
 function update(dt,s,rotation){
  eventAge+=dt;if(eventAge>3)event='';
  const current=new THREE.Quaternion().copy(rotation),pos=new THREE.Vector3().copy(s.position);
  // A transient body scrape during a recoverable landing is not a wreck.
  const overturned=s.chassisContact&&!s.grounded&&!s.adhering&&s.upY<.35;
  crashTime=overturned?crashTime+dt:0;
  const crashed=crashTime>=.85&&(s.angularSpeed??0)<2.5;
  if(crashed&&!crashLatched){last=0;pending=0;failed=true;crashLatched=true;event='crash';eventAge=0;}
  if(s.adhering&&Math.abs(s.upY)<.5){wallTime+=dt;if(wallTime>.35)wallAge=0;}else {wallAge+=dt;wallTime=0;}
  if(!s.grounded&&!s.adhering){
   if(!active){active=true;air=settled=0;pending=0;failed=crashLatched;start.copy(pos);turns.set(0,0,0);names=[];wallCombo=wallAge<2;usedJets=false;}
   usedJets ||= !!s.boosting;
   air+=dt;settled=0;
   if(hasPrevious){delta.copy(previous).invert().multiply(current);if(delta.w<0)delta.set(-delta.x,-delta.y,-delta.z,-delta.w);const n=Math.hypot(delta.x,delta.y,delta.z);if(n>1e-8)turns.addScaledVector(new THREE.Vector3(delta.x,delta.y,delta.z),2*Math.atan2(n,delta.w)/n);}
   const counts=[turns.x,turns.y,turns.z].map(a=>Math.floor((Math.abs(a)+.03)/(2*Math.PI)));
   names=['roll','spin','flip'].filter((_,i)=>counts[i]>0);
   const distance=Math.hypot(pos.x-start.x,pos.z-start.z),jump=air>.55&&distance>8;
   if(!names.length&&jump)names=['jump'];
   const rotations=counts.reduce((a,b)=>a+b,0),types=counts.filter(Boolean).length;
   multiplier=wallCombo&&usedJets?(rotations?1.5:1.25):1;
   const key=[Math.round(start.x/15),Math.round(start.z/15),...counts,wallCombo].join(':');
   const freshness=Math.max(.35,1-(repeats.get(key)||0)*.25);
   pending=failed?0:Math.round((rotations?rotations*300+(types>1?200:0):jump?100:0)*multiplier*freshness);
  }else{
   if(active){
    // Judge the recovered landing, not a single suspension/compression frame.
    const stable=s.upY>.8&&(s.angularSpeed??0)<2.5;
    settled=stable?settled+dt:0;
    if(settled>.65){const earned=failed?0:pending;last=earned+(event==='quest'&&eventAge<1?last:0);if(earned){total+=earned;best=Math.max(best,earned);landings++;
      const counts=[turns.x,turns.y,turns.z].map(a=>Math.floor((Math.abs(a)+.03)/(2*Math.PI)));
      const key=[Math.round(start.x/15),Math.round(start.z/15),...counts,wallCombo].join(':');repeats.set(key,(repeats.get(key)||0)+1);event='landed';eventAge=0;}else if(failed&&!crashLatched){event='failed';eventAge=0;}pending=0;active=false;crashLatched=false;}
   }else if(s.upY>.85&&!s.chassisContact)crashLatched=false;
  }
  previous.copy(current);hasPrevious=true;
  return {total,best,pending,last,names,event,multiplier,landings,counts:[turns.x,turns.y,turns.z].map(a=>Math.floor((Math.abs(a)+.03)/(2*Math.PI)))};
 }
 return {update,reset,snapshot(){return {total,best,pending,last,names,event,multiplier,landings};},award(points){total+=points;last=points+(event==='landed'&&eventAge<1?last:0);event='quest';eventAge=0;return {total,last};}};
}
