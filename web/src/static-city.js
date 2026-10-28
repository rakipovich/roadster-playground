import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Batch only opaque distant buildings, keeping spatial cells for view culling.
export function batchStaticCity(root){
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),groups=new Map(),position=new THREE.Vector3();
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isSkinnedMesh||Array.isArray(mesh.material)||mesh.material.transparent||!mesh.material.name.startsWith('City '))return;
  position.setFromMatrixPosition(mesh.matrixWorld).applyMatrix4(inverse);
  const layout=Object.keys(mesh.geometry.attributes).sort().join(',')+Boolean(mesh.geometry.index);
  const key=[mesh.material.uuid,Math.floor(position.x/1200),Math.floor(position.z/1200),layout].join(':');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
 });
 let before=0,after=0;
 for(const meshes of groups.values()){
  before+=meshes.length;if(meshes.length<2){after+=meshes.length;continue;}
  const geometries=meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld)));
  const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
  if(!geometry){after+=meshes.length;continue;}
  geometry.computeBoundingSphere();geometry.computeBoundingBox();
  const batch=new THREE.Mesh(geometry,meshes[0].material);batch.name='CityBatch';batch.matrixAutoUpdate=false;root.add(batch);batch.updateWorldMatrix(false,false,true);batch.matrixWorldAutoUpdate=false;
  for(const mesh of meshes)mesh.removeFromParent();after++;
 }
 return {before,after};
}

// The mobile skyline keeps each building's extent, but drops facade relief and dark window panes.
// This runs only on the static environment, never on the car or its occupants.
export function simplifyMobileCity(root){
 const boxes=new Map(),materials=new Map(),remove=[];let before=0,after=0,buildings=0;
 root.traverse(mesh=>{
  if(!mesh.isMesh||Array.isArray(mesh.material)||mesh.isSkinnedMesh)return;
  const original=mesh.material,name=original.name;
  if(!name.startsWith('City '))return;
  before+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
  if(name==='City dark windows'||name.includes('lit windows')){remove.push(mesh);return;}
  if(name.startsWith('City wall')){
   if(!boxes.has(mesh.geometry)){
    mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox,size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    boxes.set(mesh.geometry,new THREE.BoxGeometry(size.x,size.y,size.z).translate(center.x,center.y,center.z));
   }
   mesh.geometry=boxes.get(mesh.geometry);buildings++;
  }
  if(!materials.has(original)){
   const material=name.includes('lit windows')
    ?new THREE.MeshBasicMaterial({color:original.emissive.clone().multiplyScalar(original.emissiveIntensity).add(original.color.clone().multiplyScalar(.2)),side:original.side,fog:original.fog})
    :new THREE.MeshLambertMaterial({color:original.color,side:original.side,fog:original.fog});
   material.name=name;materials.set(original,material);
  }
  mesh.material=materials.get(original);after+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
 });
 for(const mesh of remove)mesh.removeFromParent();
 return {beforeTriangles:before,afterTriangles:after,buildings,removedWindowMeshes:remove.length};
}

