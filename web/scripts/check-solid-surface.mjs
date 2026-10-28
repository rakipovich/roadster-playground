import assert from 'node:assert/strict';
import * as T from 'three';
import {solidSurface} from '../src/solid-surface.js';
const top=new T.PlaneGeometry(12,20,4,8);top.rotateX(-Math.PI/2);
const slab=solidSurface(top,.35),edges=new Map();
for(let i=0;i<slab.indices.length;i+=3){const [a,b,c]=slab.indices.slice(i,i+3);for(const [u,v]of [[a,b],[b,c],[c,a]]){const k=[Math.min(u,v),Math.max(u,v)].join(':');edges.set(k,(edges.get(k)||0)+1);}}
assert.ok([...edges.values()].every(n=>n===2),'Closed shell must have exactly two faces per edge');
assert.deepEqual(Array.from(slab.indices.slice(0,top.index.count)),Array.from(top.index.array),'Riding surface must not change');
assert.ok([...slab.vertices].every(Number.isFinite));
assert.equal(slab.vertices.length,top.attributes.position.array.length*2);
console.log('Closed ramp shell: no boundary holes, finite coordinates, riding face unchanged. PASS');
