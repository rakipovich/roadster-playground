import assert from 'node:assert/strict';
import * as THREE from 'three';
import {restrainedSpring} from '../src/occupant-motion.js';
for(const hz of [30,60,120]){
 const s=restrainedSpring();for(let i=0;i<hz;i++)s.step(1/hz,new THREE.Vector3(0,-9.81,0));assert.ok(s.offset.length()<1e-9);
 for(let i=0;i<hz*2;i++)s.step(1/hz,new THREE.Vector3(0,9.81,0));assert.ok(s.offset.y>.10&&s.offset.y<=.17);
 for(let i=0;i<hz*2;i++)s.step(1/hz,new THREE.Vector3(25,0,-25));assert.ok(s.offset.length()<.26&&s.tilt.length()<.65);assert.ok(s.offset.z<-.07);
 for(let i=0;i<hz*3;i++)s.step(1/hz,new THREE.Vector3(0,-9.81,0));assert.ok(s.offset.length()<.001);s.reset();assert.equal(s.tilt.length(),0);
}
console.log('Restrained spring: rest, inverted lift, lateral load, settling and reset pass at 30/60/120Hz.');
const {occupantMotion}=await import('../src/occupant-motion.js');
const root=new THREE.Group(),car=new THREE.Group();root.add(car);const passenger=new THREE.Group();passenger.name='PassengerRoot';car.add(passenger);const driver=new THREE.Group();driver.name='DriverRig';car.add(driver);const rig=new THREE.Group();rig.name='Passenger_BeltRig';car.add(rig);
for(let i=0;i<3;i++){const bone=new THREE.Bone();bone.name='Shoulder_'+i;bone.position.set(i*.1,1-i*.2,.3);rig.add(bone);}
const first=rig.children[0].position.clone(),last=rig.children[2].position.clone(),stats={diagnostics:true},motion=occupantMotion(root,car,stats);
for(let i=0;i<120;i++)motion.update(1/60,new THREE.Vector3(15,9.81,10));
assert.ok(rig.children[0].position.distanceTo(first)<1e-8&&rig.children[2].position.distanceTo(last)<1e-8);assert.ok(passenger.position.y>.1);assert.ok(driver.position.y>0&&driver.position.y<passenger.position.y);motion.reset();assert.equal(passenger.position.length(),0);assert.equal(driver.position.length(),0);
console.log('Occupants: fixed belt anchors, restrained driver gain and reset pass.');

motion.reset();
for(let i=0;i<60;i++)motion.update(1/60,new THREE.Vector3(0,-9.81,0),new THREE.Vector3(4,0,0),new THREE.Vector3(-8,0,0));
assert.ok(Math.abs(passenger.position.z)>.02,'rotation must load the seat even without linear acceleration');
assert.ok(passenger.position.length()<.26,'belt travel stays bounded');
motion.reset();assert.equal(passenger.position.length(),0);
console.log('Angular seat loads and reset pass.');
