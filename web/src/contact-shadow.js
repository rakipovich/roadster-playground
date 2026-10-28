import * as T from 'three';
// A single soft decal and one static-world ray, rather than a shadow-map pass.
export function contactShadow(scene,world,body,RAPIER){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,3,32,32,32);g.addColorStop(0,'rgba(0,0,0,.85)');g.addColorStop(.45,'rgba(0,0,0,.6)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 const material=new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,opacity:.38,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:false});
 const mesh=new T.Mesh(new T.PlaneGeometry(1,1),material);mesh.name='Vehicle_soft_contact_shadow';mesh.renderOrder=1;scene.add(mesh);
 const normal=new T.Vector3(),forward=new T.Vector3(),side=new T.Vector3(),matrix=new T.Matrix4();
 function update(){
  const p=body.translation(),origin={x:p.x,y:p.y+.15,z:p.z};const hit=world.castRayAndGetNormal(new RAPIER.Ray(origin,{x:0,y:-1,z:0}),160,true,RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
  mesh.visible=!!hit&&hit.normal.y>.3;if(!mesh.visible)return;
  const height=Math.max(0,hit.timeOfImpact-.15);normal.copy(hit.normal).normalize();forward.set(1,0,0).applyQuaternion(body.rotation());forward.addScaledVector(normal,-forward.dot(normal));if(forward.lengthSq()<.01)forward.set(1,0,0).addScaledVector(normal,-normal.x);forward.normalize();side.crossVectors(normal,forward).normalize();
  mesh.quaternion.setFromRotationMatrix(matrix.makeBasis(forward,side,normal));mesh.position.set(p.x,origin.y-hit.timeOfImpact,p.z).addScaledVector(normal,.025);
  const spread=1+Math.min(height,20)*.025;mesh.scale.set(5.2*spread,2.5*spread,1);material.opacity=.58/(1+height*.28);
 }
 return {update};
}
