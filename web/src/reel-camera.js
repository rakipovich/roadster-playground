import {Vector3} from 'three';

const smooth=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);};
// These are editorial cuts. Within each shot the camera follows a continuous
// eased arc, while the vehicle and passengers keep their physical motion.
export function towerShot(t){
 const shots=[
  {end:2.3,name:'look-then-launch',inside:true},
  {end:4.5,name:'pull-away',a:1.1,b:2.7,r:5,rEnd:11,h:2,hEnd:4},
  {end:6.4,name:'ramp-side',a:2.05,b:1.1,r:10,rEnd:7,h:3},
  {end:9.6,name:'ride-the-roll',a:.6,b:-.25,r:3.15,rEnd:2.85,h:1.65,hEnd:1.55,attached:true},
  {end:10.8,name:'roll-reaction',inside:true},
  {end:12.4,name:'ride-the-flip',a:.35,b:-1.15,r:2.85,rEnd:2.6,h:1.55,hEnd:1.65,attached:true},
  {end:13.3,name:'flip-reaction',inside:true},
  {end:15.2,name:'release-orbit',a:-1.15,b:-2.2,r:2.8,rEnd:6,h:1.8,hEnd:3,attached:true},
  {end:17.3,name:'landing',a:-2.25,b:-2.85,r:10,h:4.8},
 ];
 let start=0;
 for(const shot of shots){if(t<shot.end||shot===shots.at(-1))return {...shot,u:smooth((t-start)/(shot.end-start))};start=shot.end;}
}

export function placeTowerCamera(camera,position,shot,heading,rotation){
 const angle=(shot.attached?0:heading)+shot.a+(shot.b-shot.a)*shot.u;
 const radius=shot.r+((shot.rEnd??shot.r)-shot.r)*shot.u;
 const height=shot.h+((shot.hEnd??shot.h)-shot.h)*shot.u;
 const offset=new Vector3(Math.cos(angle)*radius,height,Math.sin(angle)*radius);
 const aim=new Vector3(0,1,0);camera.up.set(0,1,0);
 if(shot.attached){offset.applyQuaternion(rotation);aim.applyQuaternion(rotation);camera.up.applyQuaternion(rotation);}
 camera.position.copy(position).add(offset);
 camera.lookAt(position.clone().add(aim));
}
