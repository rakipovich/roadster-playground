import * as THREE from 'three';
const clamp=THREE.MathUtils.clamp,V=()=>new THREE.Vector3();
// Restrained, damped motion in car coordinates; bounded offsets rather than a free ragdoll.
export function restrainedSpring(){
 const offset=V(),velocity=V(),tilt=V(),tiltVelocity=V();
 return {offset,tilt,reset(){offset.set(0,0,0);velocity.set(0,0,0);tilt.set(0,0,0);tiltVelocity.set(0,0,0);},step(dt,g,gain=1){
  const target=new THREE.Vector3(clamp(g.x*.008,-.11,.11),clamp((g.y+9.81)*.010,0,.16),clamp(g.z*.011,-.13,.13)).multiplyScalar(gain);
  const turn=new THREE.Vector3(clamp(-g.z*.030,-.44,.44),0,clamp(g.x*.030,-.42,.42)).multiplyScalar(gain);
  for(let left=Math.min(dt,.1);left>0;){const h=Math.min(left,1/120);left-=h;
   velocity.addScaledVector(target.clone().sub(offset),90*h).multiplyScalar(Math.exp(-9*h));offset.addScaledVector(velocity,h);
   tiltVelocity.addScaledVector(turn.clone().sub(tilt),65*h).multiplyScalar(Math.exp(-8*h));tilt.addScaledVector(tiltVelocity,h);
  }
  offset.x=clamp(offset.x,-.12,.12);offset.y=clamp(offset.y,0,.17);offset.z=clamp(offset.z,-.14,.14);
 }};
}
export function occupantMotion(root,car,stats){
 const actors=[];
 for(const [nodeName,prefix,gain]of [['PassengerRoot','CC_Base_',1],['DriverRig','mixamorig:',.8]]){
  const node=root.getObjectByName(nodeName);if(!node)continue;
  const joints=[];node.traverse(b=>{if(!b.isBone)return;const n=b.name.replace(/^mixamorig(?=[A-Z])/,'mixamorig:');let strength=0;
   if(n===prefix+'Spine02'||n===prefix+'Spine2')strength=.6;
   if(n===prefix+'NeckTwist01'||n===prefix+'Neck')strength=.75;
   if(n===prefix+'Head')strength=.85;
   if(/(L_Upperarm|R_Upperarm|LeftArm|RightArm)$/.test(n))strength=nodeName==='DriverRig'?.12:1.25;
   if(/(L_Forearm|R_Forearm|LeftForeArm|RightForeArm)$/.test(n))strength=nodeName==='DriverRig'?.08:.65;
   if(strength)joints.push({bone:b,rest:b.quaternion.clone(),bend:V(),strength});
  });
  actors.push({node,rest:node.position.clone(),spring:restrainedSpring(),joints,gain});
 }
 // Grip targets are fixed in chassis coordinates; elbows solve around the moving torso.
 const driver=actors.find(a=>a.node.name==='DriverRig'),grips=[];
 const driverBone=suffix=>{let found;driver.node.traverse(b=>{if(b.isBone&&b.name.endsWith(suffix))found=b;});return found;};
 car.updateWorldMatrix(true,true);
 if(driver)for(const side of ['Left','Right']){
  const upper=driverBone(side+'Arm'),fore=driverBone(side+'ForeArm'),hand=driverBone(side+'Hand');
  if(upper&&fore&&hand)grips.push({upper,fore,hand,target:car.worldToLocal(hand.getWorldPosition(V())),rotation:car.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(hand.getWorldQuaternion(new THREE.Quaternion()))});
 }
 const driverWebbing=[];let gripMax=0;
 if(driver){
  for(const name of ['Driver_shoulder_belt','Driver_lap_belt']){const old=root.getObjectByName(name);if(old)old.visible=false;}
  const mat=new THREE.MeshStandardMaterial({color:0x8d939b,roughness:.95,side:THREE.DoubleSide});
  const cloth=[root.getObjectByName('Driver_Tops'),root.getObjectByName('Driver_Bottoms')].filter(Boolean),ray=new THREE.Raycaster();
  const point=(name,offset)=>{const bone=driverBone(name);return bone?car.worldToLocal(bone.getWorldPosition(V())).add(new THREE.Vector3(...offset)):null;};
  const hip=point('Hips',[.12,0,0]),shoulder=point('Neck',[.06,-.04,-.10]);
  if(hip&&shoulder){
   const buckle=hip.clone().add(new THREE.Vector3(0,-.015,.19)),anchor=shoulder.clone().add(new THREE.Vector3(-.12,.07,-.06));
   for(const lap of [false,true]){
    const geometry=new THREE.BufferGeometry(),position=new Float32Array(17*2*3),indices=[];
    for(let i=0;i<16;i++)indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
    geometry.setAttribute('position',new THREE.BufferAttribute(position,3));geometry.setIndex(indices);
    const mesh=new THREE.Mesh(geometry,mat);mesh.name=lap?'Driver_dynamic_lap_belt':'Driver_dynamic_shoulder_belt';mesh.frustumCulled=false;car.add(mesh);
    const clearance=new Float32Array(34);let fitted=false;driverWebbing.push((dt)=>{
     const h=point('Hips',[.15,.015,0]),chest=point('Spine2',[.16,.025,0]),sh=point('Neck',[.10,-.04,-.10]);
     const pts=lap?[hip.clone().add(new THREE.Vector3(-.05,0,-.20)),h.clone().add(new THREE.Vector3(0,0,-.10)),h,h.clone().add(new THREE.Vector3(0,0,.10)),buckle]:[anchor,sh,sh.clone().lerp(buckle,.35).setX(chest.x),sh.clone().lerp(buckle,.72).setX(h.x),buckle];
     const samples=Array.from({length:17},(_,i)=>{const t=i/4,k=Math.min(3,Math.floor(t));return pts[k].clone().lerp(pts[k+1],t-k);});
     // Fit the webbing over the posed clothing surface, not through its bone centres.
     if(!fitted)for(const mesh of cloth){mesh.skeleton?.update();mesh.computeBoundingSphere?.();}
     for(let i=0;i<17;i++){
      const tangent=samples[Math.min(i+1,16)].clone().sub(samples[Math.max(i-1,0)]),width=tangent.cross(new THREE.Vector3(1,0,0)).normalize().multiplyScalar(.025);
      for(let edge=0;edge<2;edge++){
       const p=samples[i].clone().addScaledVector(width,edge?-1:1);
       if(!fitted&&i>0&&i<16){ray.set(car.localToWorld(new THREE.Vector3(1.5,p.y,p.z)),new THREE.Vector3(-1,0,0).transformDirection(car.matrixWorld));const hit=ray.intersectObjects(cloth,false)[0];if(hit)clearance[i*2+edge]=Math.max(0,car.worldToLocal(hit.point).x+.022-p.x);}p.x+=clearance[i*2+edge];
       p.toArray(position,i*6+edge*3);
      }
     }
     fitted=true;geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();
    });
   }
  }
 }
 const belts=[];const beltRig=root.getObjectByName('Passenger_BeltRig');
 if(beltRig)for(const prefix of ['Shoulder_','Lap_']){
  const bones=[];beltRig.traverse(b=>{if(b.isBone&&b.name.startsWith(prefix))bones.push(b);});bones.sort((a,b)=>Number(a.name.split('_')[1])-Number(b.name.split('_')[1]));belts.push(bones.map(b=>({bone:b,rest:b.position.clone(),q:b.quaternion.clone(),scale:b.scale.clone()})));
 }
 const carQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion(),rotation=new THREE.Matrix4(),delta=new THREE.Quaternion(),axis=V();
 function reset(){for(const a of actors){gripMax=0;a.spring.reset();a.node.position.copy(a.rest);for(const j of a.joints){j.bend.set(0,0,0);j.bone.quaternion.copy(j.rest);}}for(const list of belts)for(const b of list){b.bone.position.copy(b.rest);b.bone.quaternion.copy(b.q);b.bone.scale.copy(b.scale);}}
 function update(dt,g,omega=V(),alpha=V()){
  car.getWorldQuaternion(carQ);
  for(const a of actors){
   // Inertial load at the seat: angular acceleration and centrifugal force.
   const seat=new THREE.Vector3(-.1,.65,a.gain<1?-.33:.38);
   const load=g.clone().sub(alpha.clone().cross(seat)).sub(omega.clone().cross(omega.clone().cross(seat))).clampLength(0,32);
   a.spring.step(dt,load,a.gain);a.node.position.copy(a.rest).addScaledVector(a.spring.offset,a===driver?.6:1);
   for(const j of a.joints)j.bone.quaternion.copy(j.rest);a.node.updateWorldMatrix(true,true);
   for(const j of a.joints){
    const bend=a.spring.tilt.clone().multiplyScalar(j.strength);if(/(Upperarm|Forearm|LeftArm|RightArm|LeftForeArm|RightForeArm)$/.test(j.bone.name))bend.z+=clamp((load.y+9.81)*.022,0,a.gain<1?.09:.42);if(j.bone.name.includes('Head'))bend.z+=clamp((load.y+9.81)*.010,-.09,.20)*a.gain;
    // Separate response times keep limbs from snapping in unison with the torso.
    const arm=/(Upperarm|Forearm|LeftArm|RightArm|LeftForeArm|RightForeArm)$/.test(j.bone.name);
    const rate=a.gain<1?9:arm?5:j.bone.name.includes('Head')?7:12;
    j.bend.lerp(bend,1-Math.exp(-Math.min(dt,.1)*rate));
    const angle=j.bend.length();if(angle<1e-6)continue;
    parentQ.setFromRotationMatrix(rotation.extractRotation(j.bone.parent.matrixWorld)).invert().multiply(carQ);
    axis.copy(j.bend).normalize().applyQuaternion(parentQ);delta.setFromAxisAngle(axis,angle);
    j.bone.quaternion.copy(delta).multiply(j.rest);j.bone.updateWorldMatrix(false,true);
   }
  }
  for(const grip of grips){
   const target=car.localToWorld(grip.target.clone());
   for(let pass=0;pass<10;pass++)for(const bone of [grip.fore,grip.upper]){
    const origin=bone.getWorldPosition(V()),from=grip.hand.getWorldPosition(V()).sub(origin),to=target.clone().sub(origin);
    if(from.lengthSq()<1e-10||to.lengthSq()<1e-10)continue;
    const correction=new THREE.Quaternion().setFromUnitVectors(from.normalize(),to.normalize());
    const world=bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(correction);
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));bone.updateWorldMatrix(false,true);
   }
   grip.hand.quaternion.copy(grip.hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(carQ).multiply(grip.rotation));grip.hand.updateWorldMatrix(false,true);
  }
  for(const updateBelt of driverWebbing)updateBelt(dt);
  if(stats.diagnostics){stats.driverGripError=grips.map(g=>g.hand.getWorldPosition(V()).distanceTo(car.localToWorld(g.target.clone())));gripMax=Math.max(gripMax,...stats.driverGripError);stats.driverGripMax=gripMax;}
  const passenger=actors[0];if(passenger?.node.name==='PassengerRoot'){
   const offset=passenger.spring.offset,tiltQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(...passenger.spring.tilt.toArray())),pivot=new THREE.Vector3(-.1,.59,.38);
   for(const list of belts){for(let i=0;i<list.length;i++){
    const b=list[i],weight=Math.sin(Math.PI*i/(list.length-1)),lever=b.rest.clone().sub(pivot),bend=lever.clone().applyQuaternion(tiltQ).sub(lever).multiplyScalar(clamp((b.rest.y-.55)*2,0,1));
    b.bone.position.copy(b.rest).addScaledVector(offset,weight).addScaledVector(bend,weight);
   }
   for(let i=0;i<list.length-1;i++){const b=list[i],restDir=list[i+1].rest.clone().sub(b.rest),direction=list[i+1].bone.position.clone().sub(b.bone.position);b.bone.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(restDir.clone().normalize(),direction.clone().normalize())).multiply(b.q);b.bone.scale.copy(b.scale);b.bone.scale.y*=direction.length()/restDir.length();}}
  }
  if(stats.diagnostics)stats.occupants=actors.map(a=>({name:a.node.name,offset:a.spring.offset.toArray(),tilt:a.spring.tilt.toArray()}));
 }
 return {reset,update};
}
