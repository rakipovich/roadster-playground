import {Vector3} from 'three';

// The original environment predates the wall ride. Its merged fixture mesh
// contains a 22 x 18 x 16 m decorative block over the new entry lane.
// Move that complete block, not the whole merged mesh or the riding surface.
export function clearWallEntry(root){
 root.updateWorldMatrix(true,true);
 let moved=0;
 root.traverse(o=>{
  if(!o.isMesh||!o.name.replaceAll('_',' ').includes('Midground Track fixtures'))return;
  const g=o.geometry.clone(),p=g.attributes.position,v=new Vector3();
  for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
   // All eight corners of the legacy block, including duplicated face vertices.
   const cornerX=Math.abs(v.x+111.02)<.15||Math.abs(v.x+88.95)<.15;
   const cornerZ=Math.abs(v.z+93.83)<.15||Math.abs(v.z+76.19)<.15;
   if(cornerX&&cornerZ&&v.y>=-.05&&v.y<=16.05){v.z-=45;o.worldToLocal(v);p.setXYZ(i,v.x,v.y,v.z);moved++;}
  }
  if(moved){p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();o.geometry=g;}
 });
 return moved;
}
