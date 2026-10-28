import * as T from 'three';
import {solidSurface} from './solid-surface.js';
// Banked ribbon: smooth roll-in, long vertical wall, then roll-out.
export function wallRides(scene,world,RAPIER,accents){
 const vertices=[],indices=[],steps=160;
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 for(let i=0;i<=steps;i++){
  const x=-115+i*195/steps,bank=smooth((x+100)/65)*(1-smooth((x-30)/50)),a=bank*Math.PI/2;
  for(const w of [-6,6])vertices.push(x,10*bank-w*Math.sin(a),-90+w*Math.cos(a));
  if(i<steps){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const mat=new T.MeshStandardMaterial({color:'#69737c',roughness:.86,side:T.DoubleSide});const wallSolid=solidSurface(geo,.32);geo.dispose();const mesh=new T.Mesh(wallSolid.geometry,mat);mesh.name='VerticalWallRide';scene.add(mesh);
 if(accents)for(const edge of [0,1]){const line=[];for(let i=0;i<=steps;i+=4){const k=(i*2+edge)*3;line.push(new T.Vector3(vertices[k],vertices[k+1]+.04,vertices[k+2]-.04));}accents.strip(line,.24,new T.Vector3(0,.707,.707));}
 world.createCollider(RAPIER.ColliderDesc.trimesh(Float32Array.from(vertices),Uint32Array.from(indices),RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES_TWO_SIDED).setFriction(1.2).setCollisionGroups((8<<16)|3));
 // A broad concrete quarter-bowl: enter across the floor, climb the curve,
 // then steer along its upright rim. Far from the original jump lanes.
 const v=[],ix=[],around=40,cross=32;
 for(let i=0;i<=around;i++){const yaw=-Math.PI*.75+i/around*Math.PI*1.5;for(let j=0;j<=cross;j++){const a=Math.min(j,24)/24*Math.PI/2,r=14+10*Math.sin(a);v.push(-95+r*Math.cos(yaw),10*(1-Math.cos(a))+Math.max(0,j-24),55+r*Math.sin(yaw));}}
 for(let i=0;i<around;i++)for(let j=0;j<cross;j++){const k=i*(cross+1)+j;ix.push(k,k+cross+1,k+1,k+1,k+cross+1,k+cross+2);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();const bowlSolid=solidSurface(g,.32);g.dispose();const bowl=new T.Mesh(bowlSolid.geometry,mat);bowl.name='ConcreteWallBowl';scene.add(bowl);world.createCollider(RAPIER.ColliderDesc.trimesh(Float32Array.from(v),Uint32Array.from(ix),RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES_TWO_SIDED).setFriction(1.2).setCollisionGroups((8<<16)|3));
 if(accents){const rim=[];for(let i=0;i<=around;i+=2){const k=(i*(cross+1)+cross)*3;rim.push(new T.Vector3(v[k],v[k+1]+.025,v[k+2]));if(i%8===0)accents.lamp(v[k],v[k+1]+.08,v[k+2]);}accents.strip(rim,.32,p=>new T.Vector3(p.x+95,0,p.z-55).normalize());}
 return {triangles:wallSolid.indices.length/3+bowlSolid.indices.length/3,drawCalls:2};
}
