import * as THREE from 'three';

const clamp=THREE.MathUtils.clamp;
const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a),0,1);return u*u*(3-2*u);};
// All display state comes from ride time, so pause, replay and reverse scrubbing
// never leave an old notification or a wall-clock timer running in the cabin.
export function displayState(time,timing){
 const phase=time<.12?'READY':time<timing.takeoff_s?'DRIVE':time<timing.landing_thrust_start_s?'AIR':time<timing.touchdown_s+.7?'LANDING':time<(timing.display_events?.park??23.6)?'DRIVE':'PARK';
 const launch=smooth(.65,1.05,time)*(1-smooth(timing.display_events?.phone_dim_start??13.5,timing.display_events?.phone_dim_end??16,time));
 const landing=smooth(timing.touchdown_s,timing.touchdown_s+.18,time)*(1-smooth(timing.display_events?.phone_off??23.1,timing.duration_s,time));
 return {phase,phoneBrightness:Math.max(launch,landing)};
}

function surface(width,height){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 // glTF UVs have already been flipped by the exporter.
 texture.flipY=false;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.anisotropy=4;
 return {canvas,ctx:canvas.getContext('2d'),texture};
}
function text(c,label,x,y,size,color='#d9dddd',align='left'){
 c.font=`${size>=50?'300':'500'} ${size}px Arial, sans-serif`;c.textAlign=align;c.fillStyle=color;c.fillText(label,x,y);
}
function line(c,points,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function dashboard(s,state,telemetry){
 const c=s.ctx;c.fillStyle='#080b0d';c.fillRect(0,0,960,600);
 text(c,'ROADSTER',40,49,24);text(c,'VEHICLE / DYNAMICS',40,79,13,'#b75648');
 text(c,state.phase,918,49,18,'#e3654f','right');line(c,[[40,99],[920,99]],'#552b25',1);
 text(c,String(Math.round(telemetry.speed)),42,209,91,'#f0efec');text(c,'KM/H',47,242,15,'#8d9699');
 text(c,'ATTITUDE',420,142,13,'#929a9b');
 c.save();c.beginPath();c.rect(409,160,260,170);c.clip();c.translate(539,245);c.rotate(telemetry.roll);
 const horizon=clamp(telemetry.pitch*70,-65,65);c.fillStyle='#182631';c.fillRect(-250,-250,500,250+horizon);c.fillStyle='#292621';c.fillRect(-250,horizon,500,300);line(c,[[-250,horizon],[250,horizon]],'#a8adac',2);
 for(const y of [-45,-22,22,45])line(c,[[-28,horizon+y],[28,horizon+y]],'#77888f',1);c.restore();line(c,[[480,245],[520,245],[539,257],[558,245],[598,245]],'#e36a50',3);
 text(c,'HEIGHT',740,142,13,'#929a9b');text(c,`${telemetry.height.toFixed(1)} m`,740,202,33);
 text(c,'PITCH',740,255,13,'#929a9b');text(c,`${Math.round(telemetry.pitch*180/Math.PI)}°`,740,290,25);
 // Restrained red vehicle/track diagram adapted to the saved reference layout.
 line(c,[[56,422],[88,392],[80,366],[111,344],[156,347],[159,372],[203,374],[222,408],[200,439],[143,456],[98,448],[56,422]],'#c75440',3);
 text(c,'DRIVE PROFILE',40,302,13,'#929a9b');text(c,'TRACK',230,302,17,'#db7056');
 text(c,'AERO LOAD',304,390,13,'#929a9b');text(c,state.phase==='AIR'?'FLIGHT':state.phase==='LANDING'?'STABILIZING':'HIGH DOWNFORCE',304,420,18,'#cf6a51');
 text(c,'THRUST',702,390,13,'#929a9b');text(c,telemetry.thrust>.03?'ACTIVE':'STANDBY',702,420,18,telemetry.thrust>.03?'#ee9374':'#7d898a');
 c.fillStyle='#282b2d';c.fillRect(702,445,216,5);c.fillStyle='#c96d53';c.fillRect(702,445,216*telemetry.thrust,5);
 line(c,[[40,515],[920,515]],'#343737',1);text(c,'21°',42,557,19);text(c,'ROADSTER',480,557,16,'#858e8e','center');text(c,'86%',918,557,18,'#98a6a0','right');s.texture.needsUpdate=true;
}
function phone(s){
 const c=s.ctx,g=c.createLinearGradient(0,0,512,1024);g.addColorStop(0,'#172536');g.addColorStop(.55,'#334d62');g.addColorStop(1,'#151d2c');c.fillStyle=g;c.fillRect(0,0,512,1024);
 // Quiet lock screen: no fabricated personal messages or app notifications.
 c.fillStyle='#b7c6ce';c.globalAlpha=.12;c.beginPath();c.ellipse(180,880,330,470,-.5,0,Math.PI*2);c.fill();c.globalAlpha=1;
 c.strokeStyle='#d1dbe0';c.lineWidth=5;c.beginPath();c.arc(256,115,13,Math.PI,0);c.stroke();c.fillStyle='#d1dbe0';c.beginPath();c.roundRect(237,115,38,30,5);c.fill();
 text(c,'18:42',256,288,108,'#edf2f3','center');text(c,'ROADSTER',256,333,19,'#bdcdd4','center');
 for(const x of [73,439]){c.fillStyle='#ffffff18';c.beginPath();c.arc(x,910,29,0,Math.PI*2);c.fill();}
 line(c,[[65,899],[81,899],[76,911],[76,922],[70,922],[70,911],[65,899]],'#d0d9dd',2);
 c.strokeStyle='#d0d9dd';c.lineWidth=2;c.strokeRect(426,903,26,18);c.beginPath();c.arc(439,912,5,0,Math.PI*2);c.stroke();
 c.fillStyle='#d4dee2';c.beginPath();c.roundRect(168,985,176,6,3);c.fill();s.texture.needsUpdate=true;
}
export function cabinDisplays(root,car,mixer,action,timing,stats){
 const panel=root.getObjectByName('ScreenDisplay'),handset=root.getObjectByName('Phone_Lock_Display');
 if(!panel||!handset){stats.displays={error:'Missing fitted display surface'};return ()=>{};}
 const dash=surface(960,600),lock=surface(512,1024);phone(lock);
 // Handset lies with its top toward the front of the console.
 lock.texture.center.set(.5,.5);lock.texture.rotation=Math.PI;
 const panelMaterial=new THREE.MeshStandardMaterial({map:dash.texture,emissiveMap:dash.texture,emissive:'#ffffff',emissiveIntensity:.7,roughness:.38,metalness:0,fog:false});panel.material=panelMaterial;
 const phoneMaterial=new THREE.MeshStandardMaterial({map:lock.texture,emissiveMap:lock.texture,emissive:'#ffffff',emissiveIntensity:0,color:'#000000',roughness:.22,metalness:0,fog:false});handset.material=phoneMaterial;
 // Derive speed in physical time, avoiding the false speed drop from slow-mo.
 const positions=[],heights=[],physical=[],p=new THREE.Vector3(),N=Math.round(timing.duration_s*30);
 const physicalAt=t=>{for(let i=1;i<timing.clock_knots.length;i++){const [ta,fa]=timing.clock_knots[i-1],[tb,fb]=timing.clock_knots[i];if(t<=tb)return THREE.MathUtils.lerp(fa,fb,clamp((t-ta)/(tb-ta),0,1))/30;}return timing.physical_end_frame/30;};
 if(mixer&&action){const previousTime=mixer.time;
 action.paused=false;action.enabled=true;
 for(let i=0;i<=N;i++){const t=i/30;mixer.setTime(t);car.updateWorldMatrix(true,false);positions.push(car.getWorldPosition(p).clone());heights.push(p.y);physical.push(physicalAt(t));}
 action.paused=false;action.enabled=true;mixer.setTime(previousTime);car.updateWorldMatrix(true,true);}
 const speed=positions.map((p,i)=>{const a=Math.max(0,i-1),b=Math.min(N,i+1);return positions[b].distanceTo(positions[a])/Math.max(.001,physical[b]-physical[a])*3.6;});
 const q=new THREE.Quaternion(),gravity=new THREE.Vector3();let lastKey='',draws=0;
 return (time,thrust=0,live=null)=>{
  const index=clamp(Math.round(time*30),0,N),state=displayState(time,timing);
  car.getWorldQuaternion(q);gravity.set(0,-1,0).applyQuaternion(q.invert());
  const telemetry={speed:time<.12?0:(speed[index]??0),height:Math.max(0,(heights[index]??0)-(heights[0]??0)),roll:Math.atan2(-gravity.z,-gravity.y),pitch:Math.asin(clamp(gravity.x,-1,1)),thrust:clamp(thrust,0,1)};
  if(live){telemetry.speed=live.speed;telemetry.height=live.height;state.phase=live.boosting?'THRUST':live.grounded?'DRIVE':'AIR';state.phoneBrightness=live.grounded?.1:1;}
  const key=`${Math.floor(time*12)}:${state.phase}`;
  if(key!==lastKey){dashboard(dash,state,telemetry);draws++;lastKey=key;}
  const brightness=state.phoneBrightness;phoneMaterial.color.setScalar(.004+brightness*.22);phoneMaterial.emissiveIntensity=brightness*.65;
  stats.displays={dashboard:state.phase,speedKmh:Math.round(telemetry.speed),heightM:+telemetry.height.toFixed(2),phoneAwake:brightness>.05,phoneBrightness:+brightness.toFixed(3),phoneParent:handset.parent.name,textureDraws:draws,maxDashboardHz:12};
 };
}
