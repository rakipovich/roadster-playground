import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

let initialized;
export async function initPhysics(){initialized??=RAPIER.init();await initialized;}
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
export const PRACTICE_JUMP={vertices:new Float32Array([-60,0,12,-74,2.8,12,-74,2.8,18,-60,0,18,-74,0,12,-74,0,18]),indices:new Uint32Array([0,2,1,0,3,2,0,1,4,3,5,2,1,2,5,1,5,4])};
export const WHEELS=[[-1.475,.52,.91],[-1.475,.52,-.91],[1.484,.52,.91],[1.484,.52,-.91]];
export function createDrivingWorld({ramp,spawn={x:-45,y:.05,z:0}}={}){
 const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/120;
 world.createCollider(RAPIER.ColliderDesc.cuboid(180,.25,180).setTranslation(0,-.25,0).setFriction(1).setCollisionGroups((8<<16)|3));
 if(ramp) world.createCollider(RAPIER.ColliderDesc.trimesh(ramp.vertices,ramp.indices).setFriction(1).setCollisionGroups((8<<16)|3));
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(spawn.x,spawn.y,spawn.z).setCcdEnabled(true).setLinearDamping(.1).setAngularDamping(.55));
 // A cheap compound shell: outer chassis, cabin floor, glazing and roof.
 const shell=[{size:[1.35,.16,.78],at:[-.15,.55,0],mass:1200},
  {size:[.52,.12,.84],at:[1.65,.72,0],mass:50},
  {size:[1.03,.035,.69],at:[-.35,1.30,0],mass:25},
  {size:[1.05,.36,.035],at:[-.35,.96,.75],mass:5},
  {size:[1.05,.36,.035],at:[-.35,.96,-.75],mass:5},
  {size:[.035,.36,.7],at:[.75,.96,0],mass:5},
  {size:[.035,.36,.7],at:[-1.42,.96,0],mass:5}];
 for(const [i,s] of shell.entries())world.createCollider(RAPIER.ColliderDesc.cuboid(...s.size).setTranslation(...s.at).setMass(s.mass).setFriction(.6).setRestitution(.05).setCollisionGroups((1<<16)|8),body);
 // Overlapping interior walls prevent thin phones/keys escaping through seams.
 const cabin=[{size:[1.25,.06,.86],at:[-.35,.56,0]}, {size:[1.25,.06,.86],at:[-.35,1.38,0]},
  {size:[1.25,.47,.06],at:[-.35,.97,.80]}, {size:[1.25,.47,.06],at:[-.35,.97,-.80]},
  {size:[.06,.47,.86],at:[.84,.97,0]}, {size:[.06,.47,.86],at:[-1.54,.97,0]}];
 for(const s of cabin)world.createCollider(RAPIER.ColliderDesc.cuboid(...s.size).setTranslation(...s.at).setMass(0).setFriction(.7).setRestitution(.05).setCollisionGroups((4<<16)|2),body);
 const vehicle=world.createVehicleController(body);vehicle.indexUpAxis=1;vehicle.setIndexForwardAxis=0;
 for(let i=0;i<4;i++){
  const [x,y,z]=WHEELS[i];vehicle.addWheel({x,y,z},{x:0,y:-1,z:0},{x:0,y:0,z:1},.18,.37);
  vehicle.setWheelSuspensionStiffness(i,120);vehicle.setWheelSuspensionCompression(i,10);vehicle.setWheelSuspensionRelaxation(i,12);
  vehicle.setWheelMaxSuspensionTravel(i,.16);vehicle.setWheelMaxSuspensionForce(i,80000);vehicle.setWheelFrictionSlip(i,2.2);
 }
 let edgeReleased=false,gripFuel=1,gripLocked=false,fuel=1,elapsed=0,airtime=0,bestAir=0,wasAir=false,lastImpact=0,impactTime=-100,boosting=false,steering=0,releaseUntil=0,wasBoost=false;
 let boostCooldown=0,gripCooldown=0,boostBase=0,gripBase=0,boostNeedsRelease=false;
 const q=new THREE.Quaternion(),up=V(),forward=V();
 function step(input,dt=1/120){
  world.timestep=dt;elapsed+=dt;body.resetForces(true);body.resetTorques(true);
  q.copy(body.rotation());up.set(0,1,0).applyQuaternion(q);forward.set(1,0,0).applyQuaternion(q);
  const velocity=body.linvel(),speed=V(velocity.x,velocity.y,velocity.z).dot(forward);
  steering=THREE.MathUtils.damp(steering,input.steer||0,9,dt);
  const steerAngle=steering*.52/(1+Math.abs(speed)*.035);
  for(let i=0;i<4;i++){
   vehicle.setWheelSteering(i,i>=2?-steerAngle:0);
   vehicle.setWheelEngineForce(i,(input.throttle||0)*3400*((speed>38&&input.throttle>0)||(speed<-9&&input.throttle<0)?0:1));
   vehicle.setWheelBrake(i,input.brake?70:input.throttle?0:1.8);
  }
  const contacts=Array.from({length:4},(_,i)=>vehicle.wheelIsInContact(i)).filter(Boolean).length;
  if(input.freeRoam){
   if(boostCooldown>0){boostCooldown=Math.max(0,boostCooldown-dt);fuel=boostBase+(1-boostBase)*(1-boostCooldown/8);}
   if(gripCooldown>0){gripCooldown=Math.max(0,gripCooldown-dt);gripFuel=gripBase+(1-gripBase)*(1-gripCooldown/10);}
  }
  if(!input.boost)boostNeedsRelease=false;
  boosting=Boolean(input.boost&&fuel>0&&boostCooldown===0&&!boostNeedsRelease);
  if(!input.adhesion&&gripFuel>.15&&gripCooldown===0)gripLocked=false;
  if(!input.adhesion||boosting||(contacts>=3&&up.y>.8))edgeReleased=false;
  let adhering=false;
  const normal=V();let nearby=0;
  if(input.adhesion&&!edgeReleased&&!gripLocked&&gripFuel>0&&!boosting&&elapsed>releaseUntil){
   for(const [x,y,z] of WHEELS){
    const origin=V(x,y,z).applyQuaternion(q).add(body.translation());
    const hit=world.castRayAndGetNormal(new RAPIER.Ray(origin,up.clone().negate()),.85,true,RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    if(hit&&V().copy(hit.normal).dot(up)>.45){normal.add(hit.normal);nearby++;}
   }
   // A two-wheel strip cannot seal the suction skirt at a rim. Release it
   // briefly so it cannot recapture every step. No artificial launch impulse.
   if(nearby>0&&nearby<3){
    releaseUntil=elapsed+.65;edgeReleased=true;

   }
   if(nearby>=3){
    adhering=true;normal.normalize();
    gripFuel=Math.max(0,gripFuel-dt/8);
    if(gripFuel===0)gripLocked=true;
    // Lateral tyre grip on banked surfaces: resist sliding down the wall,
    // while leaving longitudinal gravity and steering to the vehicle solver.
    const lateral=forward.clone().cross(normal).normalize();
    const sideAcceleration=THREE.MathUtils.clamp(9.81*lateral.y-V().copy(velocity).dot(lateral)*6,-25,25);
    body.addForce(lateral.multiplyScalar(body.mass()*sideAcceleration),true);
    body.addForce(normal.clone().multiplyScalar(-body.mass()*22),true);
    const av=V().copy(body.angvel());
    body.addTorque(up.clone().cross(normal).multiplyScalar(body.mass()*35).addScaledVector(av.clone().sub(normal.clone().multiplyScalar(av.dot(normal))),-body.mass()*3),true);
    // Propulsion comes only from the wheel engine, never from adhesion.
    if(input.brake&&Math.abs(speed)<1){const gravity=V(0,-9.81,0);body.addForce(gravity.addScaledVector(normal,-gravity.dot(normal)).multiplyScalar(-body.mass()),true);}

   }
  }
  if(boosting&&!wasBoost)releaseUntil=elapsed+.8;
  wasBoost=boosting;
  if(boosting){
   fuel=Math.max(0,fuel-dt/2.6);
   // Main jets push along chassis-up; auto-level assists only while held.
   body.addForce(up.clone().multiplyScalar(body.mass()*17),true);
   const angular=body.angvel(),axis=up.clone().cross(V(0,1,0));if(axis.lengthSq()<.0001&&up.y<0)axis.copy(forward);
   const correction=axis.normalize().multiplyScalar(Math.acos(THREE.MathUtils.clamp(up.y,-1,1))*body.mass()*15);
   correction.addScaledVector(V(angular.x,angular.y*.2,angular.z),-body.mass()*5);
   body.addTorque(correction,true);
  }else if(!input.freeRoam&&contacts>=3&&up.y>.8&&!input.boost&&!input.adhesion)fuel=Math.min(1,fuel+dt*.18);
  if(!input.freeRoam&&contacts>=3&&up.y>.8&&!input.adhesion&&!boosting)gripFuel=Math.min(1,gripFuel+dt/10);
  if(input.freeRoam){
   if(boostCooldown===0&&fuel<1-1e-6&&(!input.boost||fuel===0)){boostBase=fuel;boostCooldown=8;boostNeedsRelease=true;}
   if(gripCooldown===0&&gripFuel<1-1e-6&&(!input.adhesion||gripFuel===0)){gripBase=gripFuel;gripCooldown=10;gripLocked=true;}
  }
  if(!contacts&&input.steer)body.addTorque(forward.clone().multiplyScalar(input.steer*body.mass()*1.1),true);
  if(!contacts&&!boosting){
   if(input.airPitch)body.addTorque(V(0,0,1).applyQuaternion(q).multiplyScalar(THREE.MathUtils.clamp(input.airPitch,-1,1)*body.mass()*3),true);
   if(input.airYaw)body.addTorque(up.clone().multiplyScalar(THREE.MathUtils.clamp(input.airYaw,-1,1)*body.mass()*3),true);
  }
  const fallSpeed=velocity.y;
  vehicle.updateVehicle(dt,RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);world.step();
  const grounded=Array.from({length:4},(_,i)=>vehicle.wheelIsInContact(i)).filter(Boolean).length>=2;
  if(!grounded){airtime+=dt;bestAir=Math.max(bestAir,airtime);}else{if(wasAir&&airtime>.2){lastImpact=Math.abs(fallSpeed);impactTime=elapsed;}airtime=0;}
  wasAir=!grounded;
  q.copy(body.rotation());up.set(0,1,0).applyQuaternion(q);
  let chassisContact=false;for(let i=0;i<7;i++)world.contactPairsWith(body.collider(i),()=>{chassisContact=true;});
  const av=body.angvel(),angularSpeed=Math.hypot(av.x,av.y,av.z);
  return {boostCooldown,gripCooldown,gripFuel,gripLocked,gripContacts:nearby,gripReleasing:edgeReleased||elapsed<releaseUntil,braking:!!input.brake,jetRoll:!contacts?(input.steer||0):0,verticalSpeed:velocity.y,adhering,adhesionEnabled:!!input.adhesion&&!gripLocked,chassisContact,angularSpeed,speed:speed*3.6,grounded,fuel,boosting,airtime,bestAir,lastImpact,impactTime,elapsed,steer:steerAngle,upY:up.y};
 }
 function reset(position=spawn,{preserveResources=false}={}){body.setTranslation(position,true);body.setRotation({x:0,y:0,z:0,w:1},true);body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);body.resetForces(true);body.resetTorques(true);if(!preserveResources){fuel=1;gripFuel=1;boostCooldown=gripCooldown=0;boostNeedsRelease=false;}gripLocked=gripCooldown>0;edgeReleased=false;elapsed=0;airtime=0;lastImpact=0;impactTime=-100;wasAir=false;steering=0;releaseUntil=0;wasBoost=false;}
 return {world,body,vehicle,step,reset,RAPIER};
}
