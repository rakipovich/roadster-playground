import {t} from './i18n.js';
export function sceneLoadingUI(){
 const bar=document.querySelector('#load-progress'),status=document.querySelector('#load-status'),detail=document.querySelector('#load-detail');
 const received={},expected={},started=performance.now();let done=false,failed=false,downloadFinishedAt=null;
 const mb=v=>(v/1e6).toFixed(1);
 function update(){
  if(done||failed)return;
  const total=Object.values(expected).reduce((a,b)=>a+b,0),bytes=Object.entries(expected).reduce((n,[name,size])=>n+Math.min(size,received[name]||0),0);
  const percent=total?Math.min(99,Math.floor(bytes/total*100)):0;bar.value=percent;bar.setAttribute('aria-valuetext',`${percent}%`);
  if(total&&bytes>=total){downloadFinishedAt??=performance.now();status.textContent=t('preparing');detail.textContent=t('preparedetail');return;}
  status.textContent=total?t('loadbytes',{percent,loaded:mb(bytes),total:mb(total)}):t('connecting');
  const elapsed=(performance.now()-started)/1000,rate=bytes/Math.max(elapsed,.01);
  if(elapsed>4&&rate>1000){const remaining=Math.ceil((total-bytes)/rate);detail.textContent=remaining>60?t('loadminutes',{time:Math.ceil(remaining/60)}):t('loadseconds',{time:remaining});}
  else detail.textContent=t('loadhint');
 }
 const timer=setInterval(update,500);
 fetch(`${import.meta.env.BASE_URL}${document.body.classList.contains('drive-mode')?'streaming':'assets'}/loading-manifest.json`).then(r=>{if(!r.ok)throw Error('manifest');return r.json();}).then(m=>{for(const file of m.files)expected[file.role]=file.bytes;update();}).catch(()=>{detail.textContent=t('loadmodels');});
 return {
  progress:(name,event)=>{received[name]=event.loaded;if(event.lengthComputable)expected[name]=event.total;update();},
  complete:name=>{if(expected[name])received[name]=expected[name];update();},
  ready:()=>{done=true;clearInterval(timer);bar.value=100;bar.setAttribute('aria-valuetext','100%');status.textContent=t('ready');detail.textContent=t('cached');return {loadSeconds:(performance.now()-started)/1000,downloadSeconds:downloadFinishedAt?(downloadFinishedAt-started)/1000:null,bytes:Object.values(expected).reduce((a,b)=>a+b,0)};},
  fail:()=>{failed=true;clearInterval(timer);status.textContent=t('loadfailed');detail.textContent=t('loadretry');}
 };
}
