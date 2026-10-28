import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
// One decode/upload at a time. Each material retains its UV transform and color space.
export async function upgradeTextures({gltf,manifestUrl,base,renderer,mobile=false,onProgress=()=>{}}){
 const response=await fetch(manifestUrl);if(!response.ok)throw Error('Texture manifest unavailable');
 const manifest=await response.json(),targets=new Map(),seen=new Set();
 gltf.scene.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material]){
  if(seen.has(material))continue;seen.add(material);
  for(const [slot,texture]of Object.entries(material)){
   if(!texture?.isTexture)continue;
   // In the small mobile cabin feed, base normal/roughness maps are sufficient.
   if(mobile&&!['map','emissiveMap'].includes(slot))continue;
   const index=gltf.parser.associations.get(texture)?.textures;if(index===undefined)continue;
   const source=manifest.sources[index];if(!targets.has(source))targets.set(source,[]);targets.get(source).push({material,slot,texture});
  }
 }});
 const loader=new KTX2Loader().setTranscoderPath(base+'basis/').setWorkerLimit(1).detectSupport(renderer);
 let complete=0,failed=0;
 try{for(const entry of manifest.textures){
  const uses=targets.get(entry.image);if(!uses?.length)continue;
  // Let input/rendering run between uploads; background failure keeps the usable preview.
  await new Promise(resolve=>setTimeout(resolve,mobile?350:80));
  try{
   const detail=await loader.loadAsync(base+'streaming/'+entry.file),variants=new Map();
   for(const {material,slot,texture:old}of uses){
    if(material[slot]!==old)continue;
    let texture=variants.get(old);
    if(!texture){texture=detail.clone();for(const key of ['wrapS','wrapT','magFilter','minFilter','anisotropy','colorSpace','channel','rotation','matrixAutoUpdate'])texture[key]=old[key];texture.offset.copy(old.offset);texture.repeat.copy(old.repeat);texture.center.copy(old.center);texture.matrix.copy(old.matrix);texture.flipY=false;texture.needsUpdate=true;renderer.initTexture(texture);variants.set(old,texture);}
    material[slot]=texture;material.needsUpdate=true;
   }
   // Dispose only low textures actually replaced; shared texture variants stay live.
   for(const old of variants.keys())old.dispose();detail.dispose();complete++;
  }catch(error){failed++;console.warn('Detail texture deferred',entry.name,error);}
  onProgress({complete,failed});
 }}finally{loader.dispose();}
 return {complete,failed};
}
