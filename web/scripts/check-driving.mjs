import {readFile,writeFile,mkdtemp,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {realTime,realtimeTiming,retimeClip} from '../src/realtime-timing.js';
import {createRequire} from 'node:module';
import {initPhysics,createDrivingWorld,PRACTICE_JUMP} from '../src/driving-physics.js';
const require=createRequire(import.meta.url),temp=await mkdtemp(join(tmpdir(),'roadster-draco-'));
await copyFile(new URL('../public/draco/draco_decoder.js',import.meta.url),join(temp,'decoder.cjs'));
const Draco=await require(join(temp,'decoder.cjs'))({});await rm(temp,{recursive:true});
const b=await readFile(new URL('../public/models/ride.glb',import.meta.url)),len=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+len)),bin=b.subarray(28+len),node=g.nodes.find(n=>n.name==='Ramp'),ext=g.meshes[node.mesh].primitives[0].extensions.KHR_draco_mesh_compression,view=g.bufferViews[ext.bufferView],raw=bin.subarray(view.byteOffset,view.byteOffset+view.byteLength);
const decoder=new Draco.Decoder(),buffer=new Draco.DecoderBuffer();buffer.Init(raw,raw.length);const mesh=new Draco.Mesh(),status=decoder.DecodeBufferToMesh(buffer,mesh);if(!status.ok())throw Error(status.error_msg());
const attribute=decoder.GetAttributeByUniqueId(mesh,ext.attributes.POSITION),values=new Draco.DracoFloat32Array();decoder.GetAttributeFloatForAllPoints(mesh,attribute,values);const vertices=Float32Array.from({length:values.size()},(_,i)=>values.GetValue(i)),indices=new Uint32Array(mesh.num_faces()*3),face=new Draco.DracoInt32Array();for(let i=0;i<mesh.num_faces();i++){decoder.GetFaceFromMesh(mesh,i,face);for(let j=0;j<3;j++)indices[i*3+j]=face.GetValue(j);}const ramp={vertices,indices};await writeFile(new URL("../../checks/v28/ramp-collider.json",import.meta.url),JSON.stringify({vertices:[...vertices],indices:[...indices]}));
await initPhysics();const results=[];
for(const scenario of ['ramp','boost','miss','steer','reverse']){
 const sim=createDrivingWorld({ramp,spawn:{x:-45,y:.05,z:scenario==='miss'?7:0}});let maxY=0,maxSpeed=0,state;const samples=[];
 for(let i=0;i<1200;i++){state=sim.step({throttle:scenario==='reverse'?-.55:1,steer:scenario==='steer'?.5:0,boost:scenario==='boost'&&i>500&&i<800});const p=sim.body.translation();maxY=Math.max(maxY,p.y);maxSpeed=Math.max(maxSpeed,Math.abs(state.speed));if(i%120===0)samples.push([i/120,+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2),+state.speed.toFixed(1)]);if(!Number.isFinite(p.x))throw Error('Non-finite physics');}
 results.push({scenario,maxY,maxSpeed,final:sim.body.translation(),state,samples});sim.world.free();
}
const byName=Object.fromEntries(results.map(r=>[r.scenario,r]));
assert.ok(byName.ramp.maxY>15,'Actual ramp must produce a high jump');
assert.ok(byName.miss.maxY<.2,'Missing the ramp must not trigger a scripted flight');
assert.ok(Math.abs(byName.steer.final.z)>10,'Steering must change the trajectory');
assert.ok(byName.reverse.final.x<-80,'Reverse must move behind the start');
const sim=createDrivingWorld(),{world,body,RAPIER}=sim;
let state;for(let i=0;i<180;i++)state=sim.step({boost:true});
assert.ok(body.translation().y>2,'Manual thrusters must lift the car without a ramp');
assert.ok(state.fuel<.5,'Thrusters must consume charge');
sim.reset();assert.equal(body.translation().x,-45);assert.equal(body.linvel().y,0);
for(let i=0;i<240;i++)state=sim.step({throttle:1});const beforeBrake=Math.abs(state.speed);
for(let i=0;i<180;i++)state=sim.step({brake:true});assert.ok(Math.abs(state.speed)<beforeBrake*.2,'Brake must stop the car');
world.free();
const practice=createDrivingWorld({spawn:{x:-48,y:.05,z:15}});
practice.world.createCollider(RAPIER.ColliderDesc.trimesh(PRACTICE_JUMP.vertices,PRACTICE_JUMP.indices).setFriction(1).setCollisionGroups((8<<16)|3));
practice.body.setRotation({x:0,y:1,z:0,w:0},true);let practiceHeight=0;
for(let i=0;i<600;i++){practice.step({throttle:1});practiceHeight=Math.max(practiceHeight,practice.body.translation().y);}
assert.ok(practiceHeight>3,'The second jump must launch the car');practice.world.free();
const cabin=createDrivingWorld({ramp});
const probes=[[.04,.08,.04],[.08,.008,.04],[.025,.01,.025]].map((half,i)=>{
 const rb=cabin.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(-44.9-i*.2,.8,0).setCcdEnabled(true));
 cabin.world.createCollider(RAPIER.ColliderDesc.cuboid(...half).setMass(.2).setCollisionGroups((2<<16)|14),rb);return rb;
});
for(let i=0;i<1200;i++){
 cabin.step({throttle:1,boost:i>500&&i<680});
 const inverse=new THREE.Quaternion().copy(cabin.body.rotation()).invert();
 for(const probe of probes){const local=new THREE.Vector3().copy(probe.translation()).sub(cabin.body.translation()).applyQuaternion(inverse);assert.ok(local.x>-1.65&&local.x<1&&Math.abs(local.z)<.95&&local.y>.45&&local.y<1.55,'Loose objects must remain within the closed cabin');}
}
cabin.world.free();
const timing=JSON.parse(await readFile(new URL('../../config/timing.json',import.meta.url)));const retimed=realtimeTiming(timing);assert.equal(retimed.duration_s,7.4);assert.ok(Math.abs(retimed.touchdown_s-retimed.takeoff_s-1.5)<.001);
let checkedTracks=0;
for(const animation of g.animations)for(const sampler of animation.samplers){const a=g.accessors[sampler.input],v=g.bufferViews[a.bufferView],offset=(v.byteOffset||0)+(a.byteOffset||0),times=Float32Array.from({length:a.count},(_,i)=>bin.readFloatLE(offset+i*4));const values=new Float32Array([1,2,3]),clip={tracks:[{times,values}]};retimeClip(clip,timing);assert.strictEqual(clip.tracks[0].values,values);for(let i=1;i<times.length;i++)assert.ok(clip.tracks[0].times[i]>=clip.tracks[0].times[i-1]);assert.ok(clip.tracks[0].times.at(-1)<=7.40001);checkedTracks++;}
console.log(JSON.stringify({passed:true,checkedTracks,checks:['ramp jump','second jump','miss ramp','steering','reverse','manual thrust','fuel','reset','braking','cabin containment','no slow motion'],rampHeight:byName.ramp.maxY,practiceHeight},null,2));await writeFile(new URL('../../checks/v28/physics-scenarios.json',import.meta.url),JSON.stringify(results,null,2));
