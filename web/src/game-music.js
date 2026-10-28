import {icon} from './control-icons.js';
// Browser media streaming: no full-file fetch/decode and no dependency on scene loading.
export function gameMusic({base,en}){
 const tracks=['music/apex-circuit-a.mp3','music/apex-circuit-b.mp3'];
 const button=document.createElement('button');button.id='music-toggle';document.querySelector('.settings-grid').appendChild(button);
 // Every page visit starts silently, even if music was enabled previously.
 const quick=document.createElement('button');quick.id='music-quick';document.querySelector('.quick-actions').appendChild(quick);
 let enabled=false,volume=.25;
 try{const saved=localStorage.getItem('roadster-music-volume');if(saved!==null&&saved!==undefined&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)));}catch{}
 const volumeLabel=document.createElement('label');volumeLabel.className='music-volume';volumeLabel.htmlFor='music-volume';
 const caption=document.createElement('span'),slider=document.createElement('input');slider.id='music-volume';slider.type='range';slider.min='0';slider.max='100';slider.step='1';slider.value=String(Math.round(volume*100));
 const paintVolume=()=>{caption.textContent=(en?'Music volume':'Громкость музыки')+' · '+slider.value+'%';slider.setAttribute('aria-valuetext',slider.value+'%');};paintVolume();
 volumeLabel.appendChild(caption);volumeLabel.appendChild(slider);document.querySelector('.settings-grid').appendChild(volumeLabel);
 slider.oninput=()=>{volume=Number(slider.value)/100;paintVolume();try{localStorage.setItem('roadster-music-volume',String(volume));}catch{}};
 let ctx,players=[],gains=[],active=0,started=false,playing=false,cross=0,duck=0,lastCrash=false,runningNow=false,mediaState='off';
 const paint=()=>{const loading=enabled&&mediaState==='loading',audible=enabled&&mediaState==='playing';const label=loading?(en?'Loading music…':'Загрузка музыки…'):enabled&&mediaState==='error'?(en?'Music unavailable — retry':'Музыка недоступна — повторить'):en?`Music ${enabled?'on':'off'}`:`Музыка ${enabled?'вкл.':'выкл.'}`;button.innerHTML=icon('music',{off:!enabled})+'<span>'+label+'</span>';button.setAttribute('aria-pressed',String(enabled));quick.innerHTML=icon('music',{off:!enabled});quick.setAttribute('aria-pressed',String(audible));quick.setAttribute('aria-busy',String(loading));quick.dataset.state=mediaState;quick.setAttribute('aria-label',loading?label:enabled?(en?'Mute music':'Выключить музыку'):(en?'Enable music':'Включить музыку'));quick.title=quick.getAttribute('aria-label');};paint();
 function state(value){if(mediaState===value)return;mediaState=value;paint();}

 function preparePlayers(){if(players.length)return;players=tracks.map((_,index)=>{const a=new Audio();a.preload='none';a.hidden=true;a.id='music-audio-'+index;document.body.appendChild(a);a.crossOrigin='anonymous';a.addEventListener('error',()=>{a.dataset.failed='true';if(a===players[active]&&enabled)state('error');});a.addEventListener('playing',()=>{if(a===players[active]&&enabled&&playing)state('playing');});a.addEventListener('waiting',()=>{if(a===players[active]&&enabled&&playing)state('loading');});return a;});}
 function init(){preparePlayers();if(ctx)return;ctx=new AudioContext();players.forEach(a=>{const source=ctx.createMediaElementSource(a),gain=ctx.createGain();gain.gain.value=0;source.connect(gain).connect(ctx.destination);gains.push(gain);});}
 let warmed=false;
 function prepare(){
  if(warmed)return;warmed=true;preparePlayers();
  // Warm only the first 1.3 MB track after scene loading. iOS may ignore media
  // preload, so cache its bytes explicitly; never create/resume audio here.
  return fetch(base+tracks[0],{cache:'force-cache',priority:'low',signal:AbortSignal.timeout(15000)}).then(r=>{if(!r.ok)throw new Error('Music unavailable');return r.blob();}).then(blob=>{
   if(started||players[0].src)return;
   players[0].src=URL.createObjectURL(blob);players[0].preload='auto';players[0].load();
  }).catch(()=>{}); // A failed warm-up must not prevent normal streaming on tap.
 }
 function load(i){const a=players[i];if(!a.src){a.src=base+tracks[i];a.preload='auto';a.load();}}
 function attempt(a){if(!a.dataset.failed)a.play().catch(()=>{if(a===players[active]&&enabled&&playing)state('error');});}
 function start(){if(!enabled)return;try{init();ctx.resume().catch(()=>{});started=true;playing=true;state('loading');load(active);gains[active].gain.setTargetAtTime(volume,ctx.currentTime,.03);attempt(players[active]);}catch{playing=false;state('error');}}
 function pause(){cross=0;playing=false;players.forEach(a=>a.pause());state(enabled?'paused':'off');}
 button.onclick=quick.onclick=()=>{enabled=mediaState==='error'||!enabled;if(!enabled)pause();else{try{init();delete players[active].dataset.failed;load(active);state('paused');if(runningNow)start();}catch{state('error');}}paint();};
 return {prepare,start,pause,update(dt,running,score){
  runningNow=running;if(!started||!ctx)return;
  if(!running||!enabled){if(playing)pause();return;}
  if(!playing){playing=true;attempt(players[active]);}
  const crashed=score?.event==='crash';if(crashed&&!lastCrash)duck=1;lastCrash=crashed;duck=Math.max(0,duck-dt);
  const a=players[active],other=1-active,b=players[other];
  // Give the initial scene/audio priority; request the next track later.
  if(a.currentTime>8)load(other);
  const left=a.duration-a.currentTime;
  if(!cross&&Number.isFinite(left)&&left<2.5&&b.readyState>=3){b.currentTime=0;attempt(b);cross=.001;}
  if(cross){cross=Math.min(2.5,cross+dt);gains[active].gain.setTargetAtTime(volume*(1-cross/2.5)*(1-.65*duck),ctx.currentTime,.08);gains[other].gain.setTargetAtTime(volume*cross/2.5*(1-.65*duck),ctx.currentTime,.08);if(cross>=2.5){a.pause();active=other;cross=0;}}
  else{gains[active].gain.setTargetAtTime(volume*(1-.65*duck),ctx.currentTime,.15);gains[other].gain.setTargetAtTime(0,ctx.currentTime,.1);if(a.ended&&b.readyState>=3){b.currentTime=0;attempt(b);active=other;}}
 }};
}
