import * as T from 'three';
// Extrude away from the riding face; keep its vertices and triangles unchanged.
// Closing the underside and boundary removes backface holes without raised rails.
export function solidSurface(surface,thickness=.3){
 surface.computeVertexNormals();const p=surface.attributes.position,n=surface.attributes.normal,count=p.count;
 const vertices=new Float32Array(count*6),top=Array.from(surface.index.array),indices=[...top],edges=new Map();
 for(let i=0;i<count;i++){vertices.set([p.getX(i),p.getY(i),p.getZ(i)],i*3);vertices.set([p.getX(i)-n.getX(i)*thickness,p.getY(i)-n.getY(i)*thickness,p.getZ(i)-n.getZ(i)*thickness],(i+count)*3);}
 for(let i=0;i<top.length;i+=3){const [a,b,c]=top.slice(i,i+3);indices.push(c+count,b+count,a+count);for(const [u,v]of [[a,b],[b,c],[c,a]]){const key=[Math.min(u,v),Math.max(u,v)].join(':');if(edges.has(key))edges.delete(key);else edges.set(key,[u,v]);}}
 for(const [a,b]of edges.values())indices.push(a,a+count,b,b,a+count,b+count);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(vertices,3));g.setIndex(indices);const flat=g.toNonIndexed();flat.computeVertexNormals();g.dispose();
 return {geometry:flat,vertices,indices:Uint32Array.from(indices)};
}
