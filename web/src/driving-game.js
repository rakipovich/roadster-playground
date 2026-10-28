import {exploration} from './exploration.js';
import {venueSign,venueLogos} from './venue-sign.js';
import {roofTrial} from './roof-trial.js';
import * as THREE from 'three';
import {runSession} from './run-session.js';
import {contactShadow} from './contact-shadow.js';
import {exteriorEffects} from './exterior-effects.js';
import {parkDemoInput} from './park-demo.js';
import {stuntPark,parkChallenges} from './stunt-park.js';
import {stuntScore} from './stunt-score.js';
import {occupantMotion} from './occupant-motion.js';
import {initPhysics,createDrivingWorld,WHEELS,PRACTICE_JUMP} from './driving-physics.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function meshCollider(mesh){
 mesh.updateWorldMatrix(true,false);const a=mesh.geometry.attributes.position,vertices=new Float32Array(a.count*3),p=V();
 for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);vertices.set(p.toArray(),i*3);}
 return {vertices,indices:mesh.geometry.index?Uint32Array.from(mesh.geometry.index.array):Uint32Array.from({length:a.count},(_,i)=>i)};
}
export const preloadDriving=()=>initPhysics();
export async function drivingGame({scene,root,car,nozzles,stats}){
 await initPhysics();root.updateWorldMatrix(true,true);
 const ramp=root.getObjectByName('Ramp');if(!ramp?.isMesh)throw new Error('Driving mode needs the existing ramp mesh');
 for(const m of Array.isArray(ramp.material)?ramp.material:[ramp.material]){m.side=THREE.DoubleSide;m.transparent=false;m.opacity=1;m.depthWrite=true;}
 const sim=createDrivingWorld({ramp:meshCollider(ramp)}),{world,body,vehicle,RAPIER}=sim;
 // Second, simple practice jump faces the other way, away from the main ramp.
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(PRACTICE_JUMP.vertices,3));geo.setIndex(new THREE.BufferAttribute(PRACTICE_JUMP.indices,1));geo.computeVertexNormals();
 const practice=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#626d78',roughness:.88,side:THREE.DoubleSide}));practice.name='PracticeJump';scene.add(practice);const c=meshCollider(practice);world.createCollider(RAPIER.ColliderDesc.trimesh(c.vertices,c.indices).setFriction(1).setCollisionGroups((8<<16)|3));
 // Mark the start line and the alternate jump without downloading more assets.
 for(const [x,z,w] of [[-43,0,4],[-56,15,6]]){const m=new THREE.Mesh(new THREE.BoxGeometry(.14,.012,w),new THREE.MeshBasicMaterial({color:'#c6bb7c'}));m.position.set(x,.012,z);scene.add(m);}
 // Move the four existing outer light poles out of the new driving lanes.
 for(let i=0;i<4;i++)for(const prefix of ['Pole_','PoleHead_','Lamp_']){const lamp=root.getObjectByName(prefix+i);if(lamp)lamp.position.z=lamp.position.z<0?-60:60;}
 const park=stuntPark(scene,world,RAPIER,stats.language==='en'),challenges=parkChallenges();stats.park=park;venueSign(scene);venueLogos(scene);const exploring=exploration(scene);exploring.update({x:0,y:0,z:0},false);
 const start=car.position.clone(),startQ=car.quaternion.clone(),props=[];
 root.traverse(o=>{if(o.userData.asset_role==='coffee_droplet')o.visible=false;});
 for(const name of ['Loose_coffee','Loose_phone','Loose_keys']){
  const mesh=root.getObjectByName(name);if(!mesh)continue;
  mesh.updateWorldMatrix(true,true);const box=new THREE.Box3(),inverse=mesh.matrixWorld.clone().invert();mesh.traverse(child=>{if(child.isMesh){child.geometry.computeBoundingBox();box.union(child.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(child.matrixWorld)));}});const scale=mesh.getWorldScale(V()),half=box.getSize(V()).multiply(scale).multiplyScalar(.5),center=box.getCenter(V()).multiply(scale),p=mesh.getWorldPosition(V()),q=mesh.getWorldQuaternion(new THREE.Quaternion());
  const local=p.clone().sub(start).applyQuaternion(startQ.clone().invert());
  const rb=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCcdEnabled(true).setLinearDamping(.25).setAngularDamping(.4));
  world.createCollider(RAPIER.ColliderDesc.cuboid(Math.max(.008,half.x),Math.max(.008,half.y),Math.max(.008,half.z)).setTranslation(center.x,center.y,center.z).setMass(mesh.userData.mass_kg||.2).setFriction(.7).setRestitution(.12).setCollisionGroups((2<<16)|14),rb);
  scene.attach(mesh);props.push({mesh,rb,local,q});
 }
 const wheels=WHEELS.map((v,i)=>({carrier:root.getObjectByName(`Suspension_wheel_carrier_${i}`),roller:root.getObjectByName(`Rolling_Suspension_wheel_carrier_${i}`),v}));
 const occupants=occupantMotion(root,car,stats),scoring=stuntScore();
 const shadow=contactShadow(scene,world,body,RAPIER);const exterior=exteriorEffects(root,car,nozzles,scene,{mobile:stats.mobileProfile});stats.exteriorEffects=exterior.stats;
 let example=null,accumulator=0,state={speed:0,fuel:1,elapsed:0},previousVelocity=V(),acceleration=V(),previousAngular=V(),angularAcceleration=V();
 const session=runSession(),trial=roofTrial();let crashRecovery=0,poseTime=0;
 const q=new THREE.Quaternion(),gravity=V(),p=V();
 function reset(position,rotation,{recover=false}={}){
  example=null;trial.reset();if(!position&&session.state.mode==='roof')position={x:-85,y:.05,z:90};poseTime=0;sim.reset(position,{preserveResources:recover});crashRecovery=0;if(rotation)body.setRotation(rotation,true);car.position.copy(body.translation());car.quaternion.copy(body.rotation());car.updateWorldMatrix(true,true);accumulator=0;previousVelocity.set(0,0,0);acceleration.set(0,0,0);previousAngular.set(0,0,0);angularAcceleration.set(0,0,0);exterior.reset();
  for(const item of props){const pos=item.local.clone().applyQuaternion(car.quaternion).add(car.position);item.rb.setTranslation(pos,true);item.rb.setRotation(rotation?rotation.clone().multiply(item.q):item.q,true);item.rb.setLinvel({x:0,y:0,z:0},true);item.rb.setAngvel({x:0,y:0,z:0},true);item.mesh.position.copy(pos);item.mesh.quaternion.copy(item.rb.rotation());}
  occupants.reset();scoring.reset(!recover);if(!recover)exploring.reset();challenges.reset(!recover);if(!recover)session.start(session.state.mode);
  state={speed:0,elapsed:0,upY:1,grounded:true,score:scoring.snapshot(),session:session.state};
 }
 function update(dt,input,running){
  running=running&&!session.state.finished;let advanced=0;
  if(running){accumulator+=Math.min(dt,.1);while(accumulator>=1/120&&!session.state.finished){const t=state.elapsed||0;const controls=example?.park?parkDemoInput(example.park,t,body,example.gate):example?{throttle:0,steer:t>=example.lift&&t<example.lift+example.turn?1:0,boost:t<example.lift||(example.rescue&&t>=example.lift+example.turn&&t<example.lift+example.turn+example.rescue)}:input;state=sim.step({...controls,freeRoam:session.state.mode==='training'&&!example});state.appliedControls={...controls};session.step(1/120);advanced+=1/120;accumulator-=1/120;}}
  if(running&&(Math.abs(body.translation().x)>155||Math.abs(body.translation().z)>155||body.translation().y<-5))reset(undefined,undefined,{recover:true});
  car.position.copy(body.translation());car.quaternion.copy(body.rotation());car.updateWorldMatrix(true,true);
  for(let i=0;i<4;i++){const w=wheels[i];if(w.carrier){w.carrier.position.y=w.v[1]-(vehicle.wheelSuspensionLength(i)??.18);w.carrier.rotation.y=i>=2?-state.steer||0:0;}if(w.roller)w.roller.rotation.z=-(vehicle.wheelRotation(i)||0);}
  for(const item of props){item.mesh.position.copy(item.rb.translation());item.mesh.quaternion.copy(item.rb.rotation());}
  if(running){
   const velocity=V().copy(body.linvel());acceleration.lerp(velocity.clone().sub(previousVelocity).divideScalar(Math.max(dt,.001)),1-Math.exp(-dt*8));previousVelocity.copy(velocity);
   q.copy(car.quaternion).invert();gravity.set(0,-9.81,0).sub(acceleration).applyQuaternion(q).clampLength(0,25);
   const angular=V().copy(body.angvel());
   angularAcceleration.lerp(angular.clone().sub(previousAngular).divideScalar(Math.max(dt,.001)),1-Math.exp(-dt*10));previousAngular.copy(angular);
   poseTime+=dt;
   if(!stats.mobileProfile||poseTime>=1/30){occupants.update(poseTime,gravity,angular.applyQuaternion(q),angularAcceleration.clone().applyQuaternion(q).clampLength(0,30));poseTime=0;}

  }
  shadow.update();
  exterior.update(dt,{...state,angularLocal:V().copy(body.angvel()).applyQuaternion(car.quaternion.clone().invert())},body.linvel(),running);
  if(running)state.score=scoring.update(advanced,{...state,position:body.translation()},body.rotation());
  if(running){state.park=challenges.update(advanced,state,body.translation());if(example?.park)example.gate=state.park.gate;if(state.park.award){Object.assign(state.score,scoring.award(state.park.award.points));state.score.event='quest';}}
  if(running&&session.state.mode==='roof'){const result=trial.update(advanced,state,body.translation());if(result){if(result.success)Object.assign(state.score,scoring.award(result.points));session.finish(result);}}
  if(running){state.exploration=exploring.update(body.translation(),session.state.mode==='training');if(state.exploration?.gained){Object.assign(state.score,scoring.award(state.exploration.gained*250));state.score.event='quest';}}
  state.session=session.state;
  if(running&&state.score?.event==='crash'&&state.upY<.35)crashRecovery+=advanced;else crashRecovery=0;
  if(crashRecovery>1.2&&!state.session.finished)reset(undefined,undefined,{recover:true});
  if(state.session.finished&&state.score?.pending){scoring.reset();state.score=scoring.snapshot();}
  if(stats.diagnostics)stats.game={...state,physics:'Rapier',position:car.position.toArray(),props:props.map(v=>({name:v.mesh.name,position:v.mesh.position.toArray(),local:car.worldToLocal(v.mesh.position.clone()).toArray()})),ramps:2+park.ramps};
  return state;
 }
 reset();return {reset,update,startSession(mode){session.start(mode);reset();},recover(){if(!session.state.finished)reset(undefined,undefined,{recover:true});},previewExample(kind){session.start('training');if(kind==='bowl'){reset({x:-71,y:14,z:55},new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0,0,1),V(-1,0,0),V(0,-1,0))));example={park:kind};return;}if(['wall','wall-off','wall-on'].includes(kind)){reset({x:-113,y:.05,z:-90});example={park:kind};return;}if(kind==='grip'||kind==='tower'){reset(kind==='tower'?{x:-85,y:.05,z:90}:undefined);example={park:kind};return;}if(['pad','roof','high','cargo'].includes(kind)){reset({x:-38,y:.05,z:kind==='pad'?22:kind==='roof'?-24:kind==='high'?44:-48});example={park:kind,gate:0};return;}reset();example=kind==='success'?{lift:1.4,turn:1.8,rescue:.6}:{lift:.7,turn:1,rescue:0};},get state(){return state;},simulation:sim};
}
