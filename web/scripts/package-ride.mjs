import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../dist/models/',import.meta.url),file=new URL('ride.glb',root);
const data=await readFile(file),hash=createHash('sha256').update(data).digest('hex'),parts=[];
const size=16*1024*1024;
for(let offset=0;offset<data.length;offset+=size){
 const chunk=data.subarray(offset,offset+size),name=`ride-${hash.slice(0,12)}-${parts.length}.bin`;
 await writeFile(new URL(name,root),chunk);parts.push({file:name,bytes:chunk.length});
}
await writeFile(new URL('ride-parts.json',root),JSON.stringify({bytes:data.length,sha256:hash,parts}));
await unlink(file);
// The active scene uses the 2K sky; do not ship the unused older 1K copy.
await unlink(new URL('../assets/sky/qwantani_dusk_1_puresky_1k.hdr',root)).catch(e=>{if(e.code!=='ENOENT')throw e;});
console.log(`Packaged identical GLB into ${parts.length} parts (${data.length} bytes)`);
// The mini-game streams its own frozen-pose asset, not the old recorded ride.
if(process.env.VITE_DRIVE_MODE==='true'){
 for(const part of parts)await unlink(new URL(part.file,root));
 await unlink(new URL('ride-parts.json',root));
 await unlink(new URL('../assets/environment.glb',root));
}

if(process.env.VITE_DRIVE_MODE==='true'){
 const remove=async path=>unlink(new URL(path,root)).catch(e=>{if(e.code!=='ENOENT')throw e;});
 // The night venue is procedural; neither HDR nor old asphalt detail is requested.
 await remove('../assets/sky/qwantani_dusk_1_puresky_2k.hdr');
 const env=JSON.parse(await readFile(new URL('../streaming/environment.json',root)));
 const game=JSON.parse(await readFile(new URL('../streaming/game.json',root)));
 const used=new Set(game.textures.map(t=>t.file));
 for(const t of env.textures)if(!used.has(t.file))await remove('../streaming/'+t.file);
 await remove('../streaming/environment.json');
}
