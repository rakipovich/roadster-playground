import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Painted strips and small signal lenses. Two static batches, no lights or bloom.
export function venueAccents(scene){
 const paint=[],lamps=[];
 function strip(points,width=.22,direction=new T.Vector3(0,0,1)){
  const vertices=[],indices=[];
  points.forEach((p,i)=>{const side=typeof direction==='function'?direction(p):direction;for(const sign of [-1,1])vertices.push(p.x+side.x*width*.5*sign,p.y+side.y*width*.5*sign,p.z+side.z*width*.5*sign);if(i){const k=(i-1)*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}});
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();paint.push(g.toNonIndexed());
 }
 function lamp(x,y,z){const g=new T.BoxGeometry(.26,.10,.26);g.translate(x,y,z);lamps.push(g.toNonIndexed());}
 function finish(){let triangles=0,drawCalls=0;for(const [parts,material,name]of [[paint,new T.MeshStandardMaterial({color:'#b82c38',roughness:.88,metalness:0,emissive:'#8a1520',emissiveIntensity:.12,side:T.DoubleSide}),'Matte red venue trim'],[lamps,new T.MeshBasicMaterial({color:'#ec514b',toneMapped:false}),'Red signal lenses']]){if(!parts.length){material.dispose();continue;}const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.matrixAutoUpdate=false;scene.add(mesh);triangles+=geometry.attributes.position.count/3;drawCalls++;}return {triangles,drawCalls};}
 return {strip,lamp,finish};
}
