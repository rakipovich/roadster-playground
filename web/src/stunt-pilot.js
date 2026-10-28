import {Vector3,Quaternion} from 'three';
const clamp=x=>Math.max(-1,Math.min(1,x));
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function target(t){
 const roll=(Math.PI*2+.16)*ease((t-6.5)/3.2),pitch=-(Math.PI*2+.16)*ease((t-8.7)/3.2);
 return new Quaternion().setFromAxisAngle(new Vector3(0,0,1),pitch).multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),roll));
}
export function stuntPilot(t,body){
 const q=new Quaternion().copy(body.rotation()),desired=target(t),delta=desired.clone().multiply(q.clone().invert());
 if(delta.w<0){delta.x*=-1;delta.y*=-1;delta.z*=-1;delta.w*=-1;}
 const future=target(t+.008),spin=future.multiply(desired.clone().invert());
 if(spin.w<0){spin.x*=-1;spin.y*=-1;spin.z*=-1;}
 const omega=new Vector3(spin.x,spin.y,spin.z).multiplyScalar(2/.008);
 const demand=new Vector3(delta.x,delta.y,delta.z).multiplyScalar(24).addScaledVector(omega.sub(new Vector3().copy(body.angvel())),5).applyQuaternion(q.invert());
 return {steer:clamp(demand.x/1.1),airPitch:clamp(demand.z/3),airYaw:clamp(demand.y/3)};
}
