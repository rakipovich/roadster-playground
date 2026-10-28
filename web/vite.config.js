import {defineConfig} from 'vite';
import {writeFile,readFile} from 'node:fs/promises';
// Local development only: save the canvas recording as a review artifact.
const previewFiles={
 'roadster-slow-flight-passenger.mp4':'video/mp4',
 'roadster-slow-flight-passenger.webm':'video/webm',
 'roadster-slow-flight-cockpit.mp4':'video/mp4',
 'roadster-slow-flight-cockpit.webm':'video/webm',
 'roadster-slow-flight-outside.mp4':'video/mp4',
 'roadster-slow-flight-outside.webm':'video/webm',
 'roadster-half-roll-passenger.mp4':'video/mp4',
 'roadster-half-roll-passenger.webm':'video/webm',
 'roadster-half-roll-outside.mp4':'video/mp4',
 'roadster-half-roll-cockpit.mp4':'video/mp4',
 'roadster-half-roll-outside.webm':'video/webm',
 'roadster-half-roll-cockpit.webm':'video/webm'
};
for(const kind of ['bowl','grip','tower','wall-off','wall-on'])for(const ext of ['mp4','webm'])previewFiles[`roadster-reel-${kind}.${ext}`]=`video/${ext}`;
const previewCapture={name:'local-preview-capture',configureServer(server){
 server.middlewares.use('/__preview',async(req,res)=>{
  const name=req.url?.slice(1);
  if(!Object.hasOwn(previewFiles,name)){res.writeHead(404).end();return;}
  const file=new URL(`../checks/${name}`,import.meta.url);
  try{
   if(req.method==='POST'){
    if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403).end();return;}
    const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>64*1024*1024){res.writeHead(413).end();return;}chunks.push(chunk);}
    await writeFile(file,Buffer.concat(chunks));res.writeHead(201).end('Saved');
   }else if(req.method==='GET'){res.setHeader('Content-Type',previewFiles[name]);res.end(await readFile(file));}
   else res.writeHead(405).end();
  }catch{res.writeHead(500).end('Preview unavailable');}
 });
}};
// Development-only aggregate bandwidth limit for the three large scene assets.
// Parallel requests share one budget, rather than each receiving the full rate.
const slowNetwork={name:'local-scene-network-test',configureServer(server){
 const sessions=new Map(),allowed=new Set(['streaming/environment.glb','streaming/game.glb','models/ride.glb','assets/environment.glb','assets/sky/qwantani_dusk_1_puresky_1k.hdr','assets/sky/qwantani_dusk_1_puresky_2k.hdr']);
 server.middlewares.use('/__network-test',async(req,res)=>{
  const match=req.url?.match(/^\/(1|5|20)\/(.+)$/);if(!match||!allowed.has(match[2])){res.writeHead(404).end();return;}
  const mbps=Number(match[1]),data=await readFile(new URL(`public/${match[2]}`,import.meta.url));
  let session=sessions.get(mbps);
  if(!session){session={streams:new Set(),timer:null};sessions.set(mbps,session);}
  res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':data.length,'Cache-Control':'no-store','X-Network-Simulation-Mbps':String(mbps)});
  const stream={data,offset:0,res};session.streams.add(stream);
  res.on('close',()=>session.streams.delete(stream));
  if(!session.timer)session.timer=setInterval(()=>{
   if(!session.streams.size){clearInterval(session.timer);session.timer=null;return;}
   const budget=Math.max(1,Math.floor(mbps*1e6/8*.05/session.streams.size));
   for(const item of session.streams){const end=Math.min(item.data.length,item.offset+budget);item.res.write(item.data.subarray(item.offset,end));item.offset=end;if(end===item.data.length){item.res.end();session.streams.delete(item);}}
  },50);
 });
}};
export default defineConfig({base:'./',plugins:[previewCapture,slowNetwork],server:{port:5173,strictPort:true},build:{chunkSizeWarningLimit:1000}});
