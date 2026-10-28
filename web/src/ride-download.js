// Reassemble the unchanged GLB from hosting-sized parts into one allocation.
export async function downloadRideParts(manifestUrl, onProgress, fetchFile=fetch) {
 const response=await fetchFile(manifestUrl);
 if(!response.ok)throw new Error('Ride manifest unavailable');
 const manifest=await response.json();
 if(!Number.isSafeInteger(manifest.bytes)||manifest.bytes<=0||!Array.isArray(manifest.parts)||manifest.parts.reduce((n,p)=>n+p.bytes,0)!==manifest.bytes)throw new Error('Invalid ride manifest');
 const data=new Uint8Array(manifest.bytes);let loaded=0;
 for(const part of manifest.parts){
  const response=await fetchFile(new URL(part.file,new URL(manifestUrl,location.href)));
  if(!response.ok)throw new Error('Ride download failed');
  const start=loaded,reader=response.body.getReader();
  while(true){
   const {done,value}=await reader.read();if(done)break;
   if(loaded+value.length>start+part.bytes){await reader.cancel();throw new Error('Ride part exceeds declared length');}
   data.set(value,loaded);loaded+=value.length;
   onProgress({loaded,total:manifest.bytes,lengthComputable:true});
  }
  if(loaded-start!==part.bytes)throw new Error('Incomplete ride part');
 }
 return data.buffer;
}
