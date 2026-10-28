import * as THREE from 'three';
import {physicalFrame,presentationTime,nozzleStrength} from './thrust-clock.js';

// Fixed-budget, deterministic particles born at the historical nozzle pose.
// Emitted gas stays in the world instead of rotating with the current car pose.
export function coldGasPlumes(scene,timing){
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
 const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);
 g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.27,'rgba(255,255,255,.72)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 const perNozzle=240,count=4*perNozzle,positions=new Float32Array(count*3),alphas=new Float32Array(count),sizes=new Float32Array(count),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('puffOpacity',new THREE.BufferAttribute(alphas,1));geometry.setAttribute('puffSize',new THREE.BufferAttribute(sizes,1));
 const material=new THREE.ShaderMaterial({uniforms:{puffMap:{value:new THREE.CanvasTexture(canvas)},viewportScale:{value:500}},transparent:true,depthWrite:false,vertexShader:`
 #include <common>
 #include <logdepthbuf_pars_vertex>
 attribute float puffOpacity; attribute float puffSize; varying float vAlpha; uniform float viewportScale;
 void main(){vAlpha=puffOpacity;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;gl_PointSize=clamp(viewportScale*puffSize/max(.1,-mvPosition.z),1.,240.);
 #include <logdepthbuf_vertex>
 }`,fragmentShader:`
 #include <logdepthbuf_pars_fragment>
 uniform sampler2D puffMap; varying float vAlpha;
 void main(){float a=texture2D(puffMap,gl_PointCoord).a*vAlpha;if(a<.003)discard;gl_FragColor=vec4(.88,.93,.99,a);
 #include <logdepthbuf_fragment>
 }`});
 const points=new THREE.Points(geometry,material);points.name='World_space_cold_gas';points.frustumCulled=false;points.visible=false;scene.add(points);
 const origin=new THREE.Vector3(),direction=new THREE.Vector3(),velocity=new THREE.Vector3(),u=new THREE.Vector3(),v=new THREE.Vector3(),p=new THREE.Vector3();
 let tracks=[];
 function prepare(mixer,car,nozzles){
  const saved=mixer.time,last=timing.physical_end_frame;
  tracks=nozzles.map(nozzle=>({name:nozzle.name,positions:[],directions:[]}));
  for(let frame=0;frame<=last;frame++){
   mixer.setTime(presentationTime(frame,timing));car.updateWorldMatrix(true,true);
   nozzles.forEach((nozzle,i)=>{tracks[i].positions.push(nozzle.getWorldPosition(new THREE.Vector3()));tracks[i].directions.push(new THREE.Vector3(0,-1,0).transformDirection(nozzle.matrixWorld));});
  }
  mixer.setTime(saved);car.updateWorldMatrix(true,true);
 }
 function sample(track,frame){
  const lo=Math.max(0,Math.min(track.positions.length-2,Math.floor(frame))),fraction=Math.max(0,Math.min(1,frame-lo));
  origin.lerpVectors(track.positions[lo],track.positions[lo+1],fraction);
  direction.lerpVectors(track.directions[lo],track.directions[lo+1],fraction).normalize();
  velocity.subVectors(track.positions[lo+1],track.positions[lo]).multiplyScalar(timing.fps);
  u.set(1,0,0);if(Math.abs(direction.dot(u))>.9)u.set(0,0,1);u.cross(direction).normalize();v.crossVectors(direction,u).normalize();
 }
 function update(time,enabled){
  if(!enabled||tracks.length===0){points.visible=false;return false;}
  const frame=physicalFrame(time,timing),life=.66,rate=perNozzle/life;let alive=0,n=0;
  material.uniforms.viewportScale.value=innerHeight*Math.min(devicePixelRatio,1.6);
  for(const track of tracks){
   for(let i=0;i<perNozzle;i++,n++){
    // Anchor emission to fixed physical birth times, even when scrubbing/replaying.
    const birthIndex=Math.floor(frame/timing.fps*rate)-i,birth=birthIndex/rate,age=frame/timing.fps-birth;
    const power=nozzleStrength(birth*timing.fps,track.name,timing);
    alphas[n]=0;if(birth<0||power<=0||age>life)continue;
    sample(track,birth*timing.fps);
    const seed=birthIndex*2.399963+tracks.indexOf(track)*.71,spread=.010+age*.42,gasSpeed=11.0;
    p.copy(origin).addScaledVector(velocity,age).addScaledVector(direction,age*gasSpeed);
    p.addScaledVector(u,Math.sin(seed+age*11)*spread).addScaledVector(v,Math.cos(seed+age*7)*spread);
    let mist=false;
    if(direction.y<-.2&&p.y<.045){
     const hitTime=Math.max(0,(origin.y-.045)/Math.max(.01,-(direction.y*gasSpeed+velocity.y))),after=Math.max(0,age-hitTime);
     p.copy(origin).addScaledVector(velocity,hitTime).addScaledVector(direction,gasSpeed*hitTime);p.y=.045+after*.10;
     p.x+=Math.cos(seed)*after*2.2;p.z+=Math.sin(seed)*after*2.2;mist=true;
    }
    positions.set(p.toArray(),n*3);sizes[n]=(mist?.28:.055)+age*(mist?1.5:.72);
    alphas[n]=power*(mist?.24:.48)*Math.pow(1-age/life,1.25);alive++;
   }
  }
  points.visible=alive>0;geometry.attributes.position.needsUpdate=true;geometry.attributes.puffOpacity.needsUpdate=true;geometry.attributes.puffSize.needsUpdate=true;
  update.stats={activeParticles:alive,capacity:count,physicalFrame:frame,nozzles:Object.fromEntries(tracks.map(t=>[t.name,nozzleStrength(frame,t.name,timing)])),worldSpace:true};return points.visible;
 }
 update.prepare=prepare;return update;
}
