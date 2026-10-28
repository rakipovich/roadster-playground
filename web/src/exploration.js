import * as T from 'three';
export const BADGES=[{id:'roof',p:[85,60.9,90]},{id:'bowl',p:[-72,13,55]},{id:'platform',p:[28,2.9,22]},{id:'cargo',p:[24,.9,-48]},{id:'air',p:[8,12,44]}];
export function explorationTracker(){const found=new Set();return {reset(){found.clear();},update(p){let gained=0;for(const b of BADGES)if(!found.has(b.id)&&Math.hypot(p.x-b.p[0],p.y-b.p[1],p.z-b.p[2])<3){found.add(b.id);gained++;}return {count:found.size,total:BADGES.length,gained,ids:[...found]};}};}
export function exploration(scene){
 const tracker=explorationTracker(),group=new T.Group();group.name='Exploration badges';scene.add(group);
 const metal=new T.MeshLambertMaterial({color:'#c2c4c7'}),red=new T.MeshLambertMaterial({color:'#8f2a34'}),shape=new T.OctahedronGeometry(.8),inset=new T.OctahedronGeometry(.34);
 const bodies=new T.InstancedMesh(shape,metal,BADGES.length),faces=new T.InstancedMesh(inset,red,BADGES.length);group.add(bodies,faces);let last=-1;
 function paint(ids=[]){const matrix=new T.Matrix4();BADGES.forEach((b,i)=>{const hidden=ids.includes(b.id);matrix.makeScale(hidden?0:1,hidden?0:1,hidden?0:1);matrix.setPosition(...b.p);bodies.setMatrixAt(i,matrix);matrix.setPosition(b.p[0],b.p[1],b.p[2]+.64);faces.setMatrixAt(i,matrix);});bodies.instanceMatrix.needsUpdate=faces.instanceMatrix.needsUpdate=true;bodies.computeBoundingSphere();faces.computeBoundingSphere();}
 paint();
 return {reset(){tracker.reset();last=-1;paint();},update(p,enabled){group.visible=enabled;if(!enabled)return null;const state=tracker.update(p);if(state.count!==last){paint(state.ids);last=state.count;}return state;}};
}
