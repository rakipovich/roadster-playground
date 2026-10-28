import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';

// A planar mirror, using the actual driver's eye camera. It is not a fixed
// rear-facing video feed: parallax and the reflected horizon follow the car.
export function rearViewMirror(car, driverHeadMeshes, stats, {mobile=false}={}) {
 const old=car.getObjectByName('Cabin_mirror_face');
 if(!old)return ()=>{};
 // Dimensions and orientation come from the reference-fitted Blender face.
 // The saved head angle is adjusted once for the driving eye and rear window.
 // It never tracks the user’s look direction.
 const width=old.userData.mirror_width_m,height=old.userData.mirror_height_m;
 if(!(width>0&&height>0))return ()=>{};
 const corner=old.userData.mirror_corner_m??.0015;
 car.updateWorldMatrix(true,true);
 const local=new THREE.Matrix4().copy(car.matrixWorld).invert().multiply(old.matrixWorld);
 const resolution=mobile?192:1024,heightResolution=mobile?64:1024,maxHz=mobile?6:24;
 const mirror=new Reflector(new THREE.PlaneGeometry(width,height),{
  color:new THREE.Color(.49,.49,.49),textureWidth:resolution,textureHeight:heightResolution,multisample:0,clipBias:.0001,
 });
 mirror.name='Live_rear_view_mirror';
 local.decompose(mirror.position,mirror.quaternion,mirror.scale);
 // Blender's XY face becomes an XZ mesh in glTF (local normal +Y).
 // Reflector expects an XY plane (normal +Z): include that basis conversion.
 mirror.rotateX(-Math.PI/2);
 mirror.translateZ(.0005);
 car.add(mirror);old.visible=false;
 // Clip the mirror's rounded corners while retaining the housing/bevel.
 mirror.material.vertexShader=mirror.material.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 mirrorUv;').replace('vUv = textureMatrix','mirrorUv = uv; vUv = textureMatrix');
 mirror.material.fragmentShader=mirror.material.fragmentShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 mirrorUv;').replace('#include <logdepthbuf_fragment>',`vec2 p=abs((mirrorUv-.5)*vec2(${width},${height}))-vec2(${width/2-corner},${height/2-corner});
   if(length(max(p,0.0))+min(max(p.x,p.y),0.0)>${corner})discard;
   #include <logdepthbuf_fragment>`);
 const previousEye=new THREE.Matrix4(),previousCar=new THREE.Matrix4();let reflectionReady=false;
 const draw=mirror.onBeforeRender;let external=false,active=true,last=-Infinity,updates=0;
 mirror.onBeforeRender=function(renderer,scene,camera){
  // onBeforeRender already culls mirrors outside the current view.
  const now=performance.now();if(external||now-last<1000/maxHz)return;
  if(!active&&reflectionReady&&previousEye.equals(camera.matrixWorld)&&previousCar.equals(car.matrixWorld))return;
  const visibility=driverHeadMeshes.map(o=>o.visible);
  try{driverHeadMeshes.forEach(o=>o.visible=true);draw.call(this,renderer,scene,camera);last=now;updates++;previousEye.copy(camera.matrixWorld);previousCar.copy(car.matrixWorld);reflectionReady=true;}
  finally{driverHeadMeshes.forEach((o,i)=>o.visible=visibility[i]);}
  stats.mirror={type:'eye-position planar reflection',placement:'central mount, fixed driver optical adjustment',width,height,resolution,heightResolution,maxHz,updates,normal:new THREE.Vector3(0,0,1).applyQuaternion(mirror.quaternion).toArray()};
 };
 return (outside,running=true)=>{external=outside;active=running;mirror.visible=!outside;old.visible=outside;};
}
