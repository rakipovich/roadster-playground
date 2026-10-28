import {stuntPilot} from './stunt-pilot.js';
import {Vector3,Quaternion} from 'three';
export function parkDemoInput(kind,t,body){
 const p=body.translation();
 if(kind==='wall-off'||kind==='wall-on'){const input=parkDemoInput('wall',t,body);return {...input,boost:false,adhesion:kind==='wall-on'&&p.x>-80};}
 if(kind==='bowl'){
  const a=Math.atan2(p.z-55,p.x+95)+.25,target=new Vector3(-95+24*Math.cos(a)-p.x,14-p.y,55+24*Math.sin(a)-p.z).applyQuaternion(new Quaternion().copy(body.rotation()).invert());
  return {adhesion:t<3.5,throttle:t<3.5?.18:0,steer:t<3.5?Math.max(-.7,Math.min(.7,Math.atan2(target.z,target.x)*2)):0,boost:(t>=3.5&&t<4.25)||(t>=5.3&&t<6.2),brake:t>6.5};
 }

 if(kind==='wall'){
  const ahead=p.x+8,b=Math.max(0,Math.min(1,(ahead+100)/65)),target=new Vector3(8,10*b*b*(3-2*b)-p.y,-90-p.z).applyQuaternion(new Quaternion().copy(body.rotation()).invert());
  return {adhesion:p.x>-80,throttle:t<11?1:0,steer:t<11?Math.max(-.6,Math.min(.6,Math.atan2(target.z,target.x)*2)):0,boost:t>=11&&t<12.8,brake:t>14};
 }

 if(kind==='grip'){const q=body.rotation(),up=1-2*(q.x*q.x+q.z*q.z);const stop=up<-.55||t>4.5;return {adhesion:true,throttle:stop?0:.8,brake:stop,steer:0,boost:(t>=7&&t<9.2)||(t>=10.6&&t<11)};}
 if(kind==='tower'){if(t<.9)return {throttle:0,brake:true,steer:0,boost:false};t-=.9;return {throttle:t<4.8?1:0,brake:t>6.5,steer:0,boost:t>=4.49&&t<7.09,...(t>=7.15&&t<14.5?stuntPilot(t-.65,body):{})};}
 const cfg={pad:{gas:2.6,stop:22},roof:{gas:2.2,stop:24,boost:[2,3.2]},high:{gas:2.2,stop:38,boost:[2,3.2]},cargo:{gas:2.2,stop:28}}[kind];
 return {throttle:t<cfg.gas?1:0,brake:p.x>=cfg.stop,steer:0,boost:!!cfg.boost&&t>=cfg.boost[0]&&t<cfg.boost[1]};
}
