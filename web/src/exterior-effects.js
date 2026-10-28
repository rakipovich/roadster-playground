import * as T from 'three';
// Existing optical meshes stay in place; only their own materials are adjusted.
export function exteriorEffects(root,car,nozzles,scene,{mobile=false}={}){
 const rear=[],front=[];
 root.traverse(o=>{if(!o.isMesh)return;const source=Array.isArray(o.material)?o.material:[o.material];const output=source.map(m=>{const n=m.name||'';if(!/rear (red LED core|light)|rear_lightbar optical|neutral LED core|front_edge_light optical/i.test(n))return m;const copy=m.clone();copy.toneMapped=false;const back=/rear/i.test(n);(back?rear:front).push(copy);return copy;});o.material=Array.isArray(o.material)?output:output[0];});
 for(const m of front){m.emissive.set('#e4f2ff');m.emissiveIntensity=2.6;}
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(235,243,250,.75)');g.addColorStop(.3,'rgba(215,228,240,.45)');g.addColorStop(1,'rgba(210,225,240,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);const map=new T.CanvasTexture(canvas);
 const count=mobile?128:480,positions=new Float32Array(count*3),life=new Float32Array(count),vel=Array.from({length:count},()=>new T.Vector3());positions.fill(1e5);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));const material=new T.PointsMaterial({map,color:'#e0eaf2',size:mobile?.48:.72,transparent:true,opacity:.48,depthWrite:false,toneMapped:false});
 const cloud=new T.Points(geo,material);cloud.frustumCulled=false;scene.add(cloud);
 const fade=document.createElement('canvas');fade.width=8;fade.height=128;const fctx=fade.getContext('2d'),fg=fctx.createLinearGradient(0,0,0,128);fg.addColorStop(0,'rgba(225,238,248,.9)');fg.addColorStop(.3,'rgba(225,238,248,.5)');fg.addColorStop(1,'rgba(225,238,248,0)');fctx.fillStyle=fg;fctx.fillRect(0,0,8,128);const fadeMap=new T.CanvasTexture(fade);
 const coneGeo=new T.CylinderGeometry(.045,.22,1.8,8,1,true);coneGeo.translate(0,-.9,0);
 const streams=nozzles.map(n=>{const m=new T.MeshBasicMaterial({map:fadeMap,color:'#dceaf3',transparent:true,opacity:.4,depthWrite:false,side:T.DoubleSide});const cone=new T.Mesh(coneGeo,m);n.add(cone);cone.visible=false;return {n,cone,carry:0};});
 let cursor=0,elapsed=0,particleTime=0;const point=new T.Vector3(),direction=new T.Vector3(),origin=new T.Vector3(),omega=new T.Vector3();
 function reset(){particleTime=0;cloud.visible=false;life.fill(0);positions.fill(1e5);geo.attributes.position.needsUpdate=true;for(const s of streams){s.cone.visible=false;s.carry=0;}}
 function update(dt,state,velocity,running){
  for(const m of rear){m.emissive.set('#ff1908');m.emissiveIntensity=state.braking?5:1.25;}
  if(!running)return;elapsed+=dt;particleTime+=dt;
  const stepParticles=!mobile||particleTime>=1/30,particleDt=particleTime;
  if(stepParticles)particleTime=0;
  if(stepParticles)for(let i=0;i<count;i++)if(life[i]>0){life[i]-=particleDt;point.fromArray(positions,i*3).addScaledVector(vel[i],particleDt);vel[i].multiplyScalar(Math.exp(-particleDt*1.2));if(life[i]<=0)point.set(1e5,1e5,1e5);point.toArray(positions,i*3);}
  omega.copy(state.angularLocal||{x:0,y:0,z:0});
  for(let j=0;j<streams.length;j++){
   const s=streams[j],side=j%2?1:-1;
   const turning=Math.abs(state.jetRoll||0)>.05||state.boosting&&state.upY<.8;
   const pulse=.65+.35*Math.sin(elapsed*42+j*2);
   const correction=turning?(side*((state.jetRoll||0)||omega.x||1)>0?1:.2):1;
   const strength=state.boosting?correction*(turning?pulse:1):Math.abs(state.jetRoll||0)*correction*.4*pulse;
   s.cone.visible=strength>.05;s.cone.scale.set(1,strength*(state.verticalSpeed<-2?1.3:1),1);s.cone.material.opacity=.25+strength*.35;
   s.carry+=dt*strength*(mobile?32:95);const emit=Math.floor(s.carry);s.carry-=emit;
   if(!emit)continue;
   s.n.getWorldPosition(origin);direction.set(0,-1,0).transformDirection(s.n.matrixWorld);
   for(let k=0;k<emit;k++){const i=cursor++%count;point.copy(origin);point.addScaledVector(direction,Math.random()*.25);point.toArray(positions,i*3);vel[i].copy(direction).multiplyScalar(13+Math.random()*8).add(velocity);vel[i].x+=(Math.random()-.5)*2.5;vel[i].z+=(Math.random()-.5)*2.5;life[i]=.45+Math.random()*.35;}
  }
  cloud.visible=life.some(v=>v>0);geo.attributes.position.needsUpdate=cloud.visible;
 }
 return {update,reset,stats:{frontMaterials:front.length,rearMaterials:rear.length,particles:count,particleHz:mobile?30:60,emissionPerNozzle:mobile?32:95,streams:streams.length}};
}
