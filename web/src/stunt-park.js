import * as T from 'three';
import {solidSurface} from './solid-surface.js';
import {venueAccents} from './venue-accents.js';
import {wallRides} from './wall-rides.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const PARK={pad:{x:28,z:22,y:2},roof:{x:27,z:-24,y:8}};
export function parkChallenges(){
 const done=new Set();let air=false,failed=false,stable=0,apex=0,start=null;
 return {reset(all=false){if(all)done.clear();air=failed=false;stable=apex=0;start=null;},update(dt,s,p){
  let award=null;
  if(s.score?.event==='crash')failed=true;
  if(!s.grounded){stable=0;if(!air&&s.airtime>.25){air=true;start={...p};apex=p.y;}if(air)apex=Math.max(apex,p.y);}
  else if(s.upY>.8){stable+=dt;if(air&&stable>.7){
   let id=null,points=0;
   if(!failed){
    if(Math.abs(p.x-28)<7&&Math.abs(p.z-22)<4&&p.y>1.5&&p.y<3){id='pad';points=250;}
    else if(Math.abs(p.x-27)<10&&Math.abs(p.z+24)<5&&p.y>7.5){id='roof';points=500;}
    else if(apex>10&&Math.abs(start.z-44)<7){id='high';points=400;}
    else if(start.x<10&&p.x>18&&Math.abs(start.z+48)<6&&Math.abs(p.z+48)<6){id='cargo';points=300;}
   }
   if(id&&!done.has(id)){done.add(id);award={id,points};}air=failed=false;start=null;apex=0;
  }}else stable=0;
  return {award,completed:done.size};
 }};
}
export function stuntPark(scene,world,RAPIER,en=false){
 const accents=venueAccents(scene),v=(x,y,z)=>new T.Vector3(x,y,z);
 // Original 9 m curl: paint follows the existing inner riding surface.
 for(const z of [-1.72,1.72]){const line=[];for(let i=0;i<=40;i++){const a=i/40*203*Math.PI/180,r=8.97;line.push(v(r*Math.sin(a),9-r*Math.cos(a),z));}accents.strip(line,.14);}
 for(const z of [12.15,17.85])accents.strip([v(-60,.035,z),v(-74,2.835,z)],.24);
 const batches=new Map(),materials=new Map();
 function add(geometry,color){geometry.deleteAttribute('uv');if(!batches.has(color)){batches.set(color,[]);materials.set(color,new T.MeshLambertMaterial({color,side:T.DoubleSide}));}batches.get(color).push(geometry.toNonIndexed?geometry.index?geometry.toNonIndexed():geometry:geometry);}
 function box(x,y,z,w,h,d,color,solid=false){const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);add(g,color);if(solid)world.createCollider(RAPIER.ColliderDesc.cuboid(w/2,h/2,d/2).setTranslation(x,y,z).setFriction(.9).setCollisionGroups((8<<16)|3));}
 function ramp(x,z,length,height,width,color){const vertices=new Float32Array([x,0,z-width/2,x+length,0,z-width/2,x+length,height,z-width/2,x,0,z+width/2,x+length,0,z+width/2,x+length,height,z+width/2]);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(vertices,3));geo.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);geo.computeVertexNormals();add(geo,'#576471');world.createCollider(RAPIER.ColliderDesc.convexHull(vertices).setFriction(1).setCollisionGroups((8<<16)|3));
  for(const side of [-1,1]){const rail=new T.BoxGeometry(Math.hypot(length,height),.06,.12);rail.rotateZ(Math.atan2(height,length));rail.translate(x+length/2,height/2+.04,z+side*(width/2-.15));add(rail,color);}box(x-3,.025,z,.25,.05,width,color);
 }
 for(const z of [-48,44])box(5,-.025,z,110,.04,22,'#596570');
 // Long run-up and a curved launch face convert speed into height.
 const launch=[];const launchIndex=[];const steps=36,radius=32,angle=Math.PI/3;
 for(let i=0;i<=steps;i++){const a=angle*i/steps,x=-22+radius*Math.sin(a),y=radius*(1-Math.cos(a));for(const z of [84,96])launch.push(x,y,z);if(i<steps){const k=i*2;launchIndex.push(k,k+1,k+2,k+1,k+3,k+2);}}
 const launchGeo=new T.BufferGeometry();launchGeo.setAttribute('position',new T.Float32BufferAttribute(launch,3));launchGeo.setIndex(launchIndex);launchGeo.computeVertexNormals();const launchSolid=solidSurface(launchGeo,.35);launchGeo.dispose();add(launchSolid.geometry,'#576471');world.createCollider(RAPIER.ColliderDesc.trimesh(Float32Array.from(launch),Uint32Array.from(launchIndex),RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES_TWO_SIDED).setFriction(1).setCollisionGroups((8<<16)|3));
 for(const z of [84.15,95.85]){const points=[];for(let i=0;i<=steps;i+=2){const a=angle*i/steps;points.push(v(-22+radius*Math.sin(a),radius*(1-Math.cos(a))+.045,z));}accents.strip(points,.28);}
 for(const z of [84,96])for(const x of [-82,-62,-42,-23]){accents.strip([v(x,.018,z),v(x+3,.018,z)],.3);accents.lamp(x,.08,z);}
 // Lightweight 60 m tower: solid facade, flat landing roof, no downloaded assets.
 box(85,30,90,24,60,24,'#45515d',true);
 for(let y=3;y<60;y+=3){box(85,y,77.98,24,.12,.06,'#78828a');box(72.98,y,90,.06,.12,24,'#78828a');box(97.02,y,90,.06,.12,24,'#78828a');}
 box(85,60.04,90,24,.08,24,'#676c73');
 for(const z of [78.03,101.97]){accents.strip([v(73,59.7,z),v(97,59.7,z)],.36,v(0,1,0));for(const x of [73.2,96.8])accents.lamp(x,60.15,z);}
 for(const x of [73.03,96.97])accents.strip([v(x,59.7,78),v(x,59.7,102)],.36,v(0,1,0));
 // Painted landing perimeter: no glow, text or extra downloads.
 for(const x of [76,94])box(x,60.09,90,.18,.02,18,'#d9dadc');
 for(const z of [81,99])box(85,60.09,z,18,.02,.18,'#d9dadc');
 for(let x=-82;x<-22;x+=10)box(x,.012,90,4,.02,.15,'#d9dadc');
 const concrete='#72777b',steel='#42494f',edge='#b82c38';
 ramp(-12,22,16,3,8,edge);box(28,1,22,20,2,10,concrete,true);
 // Roof landing: a solid raised deck supported by concrete piers.
 ramp(-14,-24,18,5,9,edge);box(27,7.6,-24,24,.8,12,concrete,true);
 for(const x of [17,37])for(const z of [-28,-20])box(x,3.6,z,1.5,7.2,1.5,concrete,true);
 // High launch and a broad lower landing terrace.
 ramp(-16,44,24,7,10,edge);box(40,1.5,44,28,3,15,concrete,true);
 // Cargo jump: real boxes between the lip and the clear run-out.
 ramp(-15,-48,16,3,9,edge);
 for(const z of [-50,-46]){box(12,1.4,z,6,2.8,3.8,steel,true);for(let x=9.5;x<15;x+=1)box(x,1.4,z+1.92,.08,2.6,.06,edge);}
 let triangles=0;for(const [color,geometries]of batches){const geo=mergeGeometries(geometries);triangles+=geo.attributes.position.count/3;scene.add(new T.Mesh(geo,materials.get(color)));}
 const walls=wallRides(scene,world,RAPIER,accents),trim=accents.finish();return {triangles:triangles+walls.triangles+trim.triangles,drawCalls:batches.size+walls.drawCalls+trim.drawCalls,ramps:5,walls:2};
}
