import assert from 'node:assert/strict';
import * as T from 'three';
import {exteriorEffects} from '../src/exterior-effects.js';
globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),fillRect(){}})})};
for(const mobile of [false,true]){
 const scene=new T.Scene(),car=new T.Group();scene.add(car);const nozzles=Array.from({length:4},()=>{const n=new T.Group();car.add(n);return n;});
 const fx=exteriorEffects(car,car,nozzles,scene,{mobile});fx.reset();
 const cloud=scene.children.find(o=>o.isPoints);assert.equal(cloud.visible,false);
 for(let i=0;i<120;i++)fx.update(1/60,{boosting:true,upY:-1,jetRoll:.6,angularLocal:{x:2,y:0,z:0}},new T.Vector3(),true);
 assert.ok(cloud.visible);assert.ok(nozzles.some(n=>n.children[0].visible));assert.ok([...cloud.geometry.attributes.position.array].every(Number.isFinite));
 for(let i=0;i<120;i++)fx.update(1/60,{boosting:false,upY:1,jetRoll:0},new T.Vector3(),true);
 assert.equal(cloud.visible,false);assert.ok(nozzles.every(n=>!n.children[0].visible));assert.equal(fx.stats.particles,mobile?128:480);
}
console.log('Desktop/mobile jets: bounded pool, visible roll thrust, finite positions, idle culling PASS');
