import assert from 'node:assert/strict';import {Scene,Quaternion,Vector3,Matrix4} from 'three';import {initPhysics,createDrivingWorld} from '../src/driving-physics.js';import {wallRides} from '../src/wall-rides.js';await initPhysics();
for(const [name,forward,y,boost] of [['side',new Vector3(0,0,1),17.5,false],['up',new Vector3(0,1,0),17.5,false],['jet',new Vector3(0,0,1),17.5,true]]){const sim=createDrivingWorld({spawn:{x:-71,y,z:55}});wallRides(new Scene(),sim.world,sim.RAPIER);const up=new Vector3(-1,0,0);sim.body.setRotation(new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(forward,up,forward.clone().cross(up))),true);let grip=0;for(let i=0;i<600;i++){const s=sim.step({adhesion:true,throttle:name==='up'?1:0,boost:boost&&i>120&&i<240});if(s.adhering)grip++;}const p=sim.body.translation();assert.ok(p.y<16||p.y>20||p.x<-73,'Must escape the top edge: '+name);console.log(name,{grip:grip/120,p});sim.world.free();}

// The straight wall's upper edge and the bowl's open end must release too.
for(const name of ['straight-top','open-end']){
 const a=Math.PI*.75-.015,p=name==='straight-top'?{x:-10,y:15.5,z:-90}:{x:-95+24*Math.cos(a),y:14,z:55+24*Math.sin(a)};
 const forward=name==='straight-top'?new Vector3(1,0,0):new Vector3(-Math.sin(a),0,Math.cos(a));
 const up=name==='straight-top'?new Vector3(0,0,1):new Vector3(-Math.cos(a),0,-Math.sin(a));
 const sim=createDrivingWorld({spawn:p});wallRides(new Scene(),sim.world,sim.RAPIER);sim.body.setRotation(new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(forward,up,forward.clone().cross(up))),true);
 let released=false;for(let i=0;i<600;i++){const s=sim.step({adhesion:true,throttle:name==='open-end'?.4:0});if(s.gripReleasing&&!s.adhering)released=true;}
 assert.ok(released,name+' should release incomplete contact');assert.ok(sim.body.translation().y<10||Math.hypot(sim.body.translation().x-p.x,sim.body.translation().z-p.z)>5,'Edge must not hold the car');console.log(name,{released,p:sim.body.translation()});sim.world.free();
}
