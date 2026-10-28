import {clearWallEntry} from './clear-wall-entry.js';
import {towerShot,placeTowerCamera} from './reel-camera.js';
import {nightVenue} from './night-venue.js';
import {authorPanel} from './author-panel.js';
import {upgradeTextures} from './progressive-textures.js';
import {downloadRideParts} from './ride-download.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import './style.css';
import './mobile-proposal.css';
import {lookStick} from './look-stick.js';
import {sceneLoadingUI} from './loading.js';
import {coldGasPlumes} from './thrust.js';
import {thrustSoundLevel} from './thrust-clock.js';
import {rearViewMirror} from './mirror.js';
import {cabinDisplays} from './cabin-displays.js';
import {t,setupLanguage,language,passengerCredit} from './i18n.js';
setupLanguage();
import bakedTiming from '../../config/timing.json';
import {realtimeTiming,retimeClip} from './realtime-timing.js';
import {controlHelp} from './control-help.js';
import {icon} from './control-icons.js';
import {sessionUI} from './session-ui.js';
import {gameMusic} from './game-music.js';
import {drivingControls} from './driving-controls.js';
import {cabinFeed} from './cabin-feed.js';
import {batchStaticCity,simplifyMobileCity} from './static-city.js';
import {cockpitFov,adaptiveRatio,cockpitHome} from './view-profile.js';
const timing=realtimeTiming(bakedTiming),isGame=(import.meta.env.VITE_DRIVE_MODE==='true'||new URLSearchParams(location.search).get('mode')==='drive'||/^\/roadster-play(?:\/|$)/.test(location.pathname));
if(isGame){document.body.classList.add('drive-mode');
 for(const event of ['selectstart','dragstart','contextmenu'])document.addEventListener(event,e=>{if(!e.target.closest?.('input,textarea,[contenteditable="true"]'))e.preventDefault();});
}
const drivingModule=isGame?import('./driving-game.js').then(async m=>{await m.preloadDriving();return m;}):null;
let game=null,gameControls=null,feed=null,runUI=null,music=null,help=null,author=null;const chaseForward=new THREE.Vector3(1,0,0),chaseDesired=new THREE.Vector3(),chaseTarget=new THREE.Vector3();let chaseReady=false;
const mobileProfile=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>1||new URLSearchParams(location.search).has('mobile');
const reelHQ=import.meta.env.DEV&&new URLSearchParams(location.search).has('reels');
let wideView=isGame,pixelRatio=reelHQ?1.5:Math.min(devicePixelRatio,mobileProfile?.9:1.6);

const $=s=>document.querySelector(s), duration=timing.duration_s;
const loadingUI=sceneLoadingUI(),networkProfile=new URLSearchParams(location.search).get('network');
const sceneBase=import.meta.env.VITE_SCENE_BASE||import.meta.env.BASE_URL;
const assetUrl=path=>import.meta.env.DEV&&['1','5','20'].includes(networkProfile)?`/__network-test/${networkProfile}/${path}`:`${sceneBase}${path}`;
const renderer=new THREE.WebGLRenderer({antialias:reelHQ||!mobileProfile,powerPreference:'high-performance',logarithmicDepthBuffer:true});
renderer.setPixelRatio(pixelRatio);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
renderer.shadowMap.enabled=false; // HDR + ambient fill avoid crawling moving shadow-map edges.
$('#experience').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#354255');
const updatePlumes=coldGasPlumes(scene,timing);
const hemisphere=new THREE.HemisphereLight('#a9bcda','#383238',.8);scene.add(hemisphere);
const sun=new THREE.DirectionalLight('#d8e5ff',.25),sunOffset=new THREE.Vector3(35,55,-25);scene.add(sun,sun.target);
sun.castShadow=false;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:120});sun.shadow.normalBias=.018;sun.shadow.bias=-.0001;
const camera=new THREE.PerspectiveCamera(50,1,.045,10000), look=new THREE.Group();look.name='LookPivot';look.add(camera);
const outsideCamera=new THREE.PerspectiveCamera(50,1,.05,10000);
const orbit=new OrbitControls(outsideCamera,renderer.domElement);orbit.enabled=false;orbit.enableDamping=true;orbit.minDistance=1.6;orbit.maxDistance=120;
let externalView=false,previousCarPosition=null,previewRecorder=null,previewEnd=0,previewCompose=null,previewShot=null,previewBeforeFeed=null;
const cabinSkinnedMeshes=[],driverHeadMeshes=[],interiorCeilings=[],canopyMaterials=new Set(),downNozzles=[];
const carPosition=new THREE.Vector3();
let updateMirror=()=>{},updateDisplays=()=>{};
let mixer,action,car,seat,loaded=false,running=false,time=0,last=0,yaw=0,pitch=-.04,targetYaw=0,targetPitch=-.04;
if(document.body.classList.contains('mobile-proposal')){yaw=targetYaw=-.82;pitch=targetPitch=-.10;}
let stickEnabled=true;
let gyroActive=false,neutral=null,orientationListener=null,drag=null,finished=false;
const clamp=THREE.MathUtils.clamp, radians=THREE.MathUtils.degToRad;
const yawLimit=radians(115),pitchMin=radians(-55),pitchMax=radians(60);
look.rotation.order='YXZ';
const stick=lookStick($('#look-stick'),(dx,dy)=>{if(isGame||externalView||!loaded)return;dismissLookHint();gyroActive=false;targetYaw=clamp(targetYaw-dx*1.05,-yawLimit,yawLimit);targetPitch=clamp(targetPitch-dy*.85,pitchMin,pitchMax);},{keyboard:!isGame});
function dismissLookHint(){$('#boarding').classList.add('looked');}
function syncStick(){const boarding=isGame&&!document.body.classList.contains('playing');$('#view-control').hidden=!$('#welcome').hidden||boarding;const show=!boarding&&document.body.classList.contains('mobile-proposal')&&$('#welcome').hidden&&(!externalView||isGame)&&stickEnabled;$('#look-stick-wrap').hidden=!show;stick.reset();}

if(isGame){$('#boarding p').textContent=language==='en'?'Left: steer. Right: gas and thrusters.':'Слева — руль. Справа — газ и ускорители.';document.title='Roadster — Playground';$('#stick-toggle').hidden=true;$('#stick-label').textContent=language==='en'?'Steering':'Руль';document.querySelector('.settings-help').textContent=language==='en'?'WASD / arrows: drive · Space: thrusters · P: pause · R: restart. Drag the scene to look.':'WASD / стрелки — езда · Пробел — ускорители · P — пауза · R — на старт. Свайп — осмотр.';yaw=targetYaw=0;pitch=targetPitch=-.04;$('#look-stick').setAttribute('aria-label',language==='en'?'Steer left or right':'Руль влево или вправо');gameControls=drivingControls({en:language==='en',onPause:togglePlayback,onReset:()=>{if(game?.state.session?.finished)return;game?.recover();chaseReady=false;feed?.invalidate();running=true;gameControls.resetInput();}});}
if(isGame){music=gameMusic({base:sceneBase,en:language==='en'});runUI=sessionUI({en:language==='en',onStart:()=>play(),onPause:()=>{running=false;gameControls.resetInput();music.pause();}});}
if(isGame)author=authorPanel({en:language==='en',onOpen:()=>{const wasRunning=running;running=false;gameControls.resetInput();music.pause();return wasRunning;},onClose:resume=>{if(resume&&!game?.state.session?.finished){running=true;last=performance.now();music.start();}}});
if(isGame){help=controlHelp({en:language==='en',onOpen:()=>{const resume=running;running=false;gameControls.resetInput();stick.reset();music.pause();syncTransport();return resume;},onClose:resume=>{if(resume&&!document.hidden&&!game?.state.session?.finished){running=true;last=performance.now();music.start();syncTransport();}}});}
const stats={diagnostics:new URLSearchParams(location.search).has('check'),mobileProfile,mode:isGame?'drive':'ride',duration,language,loadMs:0,glbBytes:0,frames:0,renderedTriangles:0,drawCalls:0,passenger:false,skinnedMeshes:0,clips:0};

let previousWideLayout=null;
function resize(){
 const w=innerWidth,h=innerHeight,aspect=w/h;
 camera.aspect=aspect;
 const wideLayout=isGame&&wideView&&aspect>1.2;
 if(previousWideLayout!==wideLayout){if(isGame){const home=cockpitHome(aspect,wideView);yaw=targetYaw=home.yaw;pitch=targetPitch=home.pitch;}previousWideLayout=wideLayout;}
 document.body.classList.toggle('wide-cockpit',wideLayout);
 // Limit both vertical and horizontal field of view on wide and tall screens.
 camera.fov=cockpitFov(aspect,wideView);
 camera.updateProjectionMatrix();renderer.setSize(w,h);
 outsideCamera.aspect=aspect;outsideCamera.fov=isGame?(aspect<1?68:58):camera.fov;outsideCamera.updateProjectionMatrix();
}
if(isGame){
 const lens=document.createElement('button');lens.id='drive-lens';lens.type='button';
 const syncLens=()=>{lens.textContent=wideView?'0.7×':'1×';lens.setAttribute('aria-label',language==='en'?'Toggle wide angle':'Переключить широкий угол');lens.setAttribute('aria-pressed',String(wideView));};
 lens.onclick=()=>{wideView=!wideView;syncLens();resize();resetLook();};syncLens();document.body.appendChild(lens);
 const rotate=document.createElement('div');rotate.id='rotate-hint';rotate.setAttribute('role','status');rotate.innerHTML=`<svg aria-hidden="true" viewBox="0 0 32 32"><rect x="10" y="7" width="12" height="19" rx="2" transform="rotate(-28 16 16)"/><path d="M25 12a11 11 0 0 0-19-4M6 3v5h5"/></svg> ${language==='en'?'Turn your phone for a wider cabin view':'Поверни телефон — видно дорогу и пассажирку'}`;document.body.appendChild(rotate);
}
addEventListener('resize',resize);resize();
const started=performance.now();
let rideReady=false,environmentReady=false,loadingFailed=false,environmentConfig,cabinFill,environmentGltf,gameGltf,night;
function ready(){
 if(loaded||!rideReady||!environmentReady||loadingFailed)return;
 loaded=true;stats.loadMs=Math.round(performance.now()-started);
 stats.loading=loadingUI.ready();stats.networkSimulationMbps=networkProfile||null;
 if(isGame)improveGameAssets().catch(e=>console.warn('Background detail unavailable',e));
 $('#ride-timeline').disabled=false;$('#start').disabled=false;$('#view').disabled=false;$('#start').textContent=t('start');$('#load-status').textContent=t('ready');$('#stage').textContent=t('stagestart');
}
const draco=new DRACOLoader();draco.setDecoderPath(`${sceneBase}draco/`);
const loader=new GLTFLoader().setDRACOLoader(draco);
async function loadEnvironment(){
 const response=await fetch(`${sceneBase}assets/environment.json`);
 if(!response.ok)throw new Error('Environment configuration unavailable');
 const config=(await response.json()).runtime;environmentConfig=config;
 if(cabinFill){cabinFill.intensity=config.screen_light_intensity;cabinFill.color.set(config.screen_light_color??'#dedbd3');}
 const env=await loader.loadAsync(assetUrl(isGame?'streaming/environment.glb':config.geometry_file),p=>loadingUI.progress('environment',p));loadingUI.complete('environment');environmentGltf=env;
 if(!isGame){const hdr=await new HDRLoader().loadAsync(assetUrl(config.sky_file),p=>loadingUI.progress('sky',p));applySky(hdr,config);loadingUI.complete('sky');}
 env.scene.name='StaticEnvironment';scene.add(env.scene);if(isGame)stats.wallEntryMovedVertices=clearWallEntry(env.scene);
 // The environment is static: cache local/world transforms instead of rebuilding them every frame.
 env.scene.updateWorldMatrix(true,true);env.scene.traverse(o=>{o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;});
 env.scene.traverse(o=>{if(o.isMesh){o.receiveShadow=false;o.castShadow=false;for(const m of (Array.isArray(o.material)?o.material:[o.material])){m.roughness=Math.max(m.roughness??1,.7);if(m.normalScale)m.normalScale.set(.22,.22);for(const tex of [m.map,m.normalMap,m.roughnessMap])if(tex){tex.anisotropy=Math.min(mobileProfile?2:8,renderer.capabilities.getMaxAnisotropy());tex.minFilter=THREE.LinearMipmapLinearFilter;}}}});
 scene.fog=new THREE.Fog(config.fog_color,config.fog_near_m,config.fog_far_m);
 hemisphere.intensity=isGame?.65:config.hemisphere_intensity;sun.intensity=isGame?1.1:config.sun_intensity;
 if(isGame)night=nightVenue(scene,env.scene,renderer,{mobile:mobileProfile});
 const position=v=>new THREE.Vector3(v[0],v[2],-v[1]);
 for(const item of (isGame&&mobileProfile?[]:config.spotlights)){const light=new THREE.SpotLight(item.color,item.intensity,35,Math.PI/4,.65,2);light.position.copy(position(item.position));light.target.position.copy(position(item.target));scene.add(light,light.target);}
 stats.environmentTriangles=0;stats.environmentBuildings=0;env.scene.traverse(o=>{if(o.isMesh)stats.environmentTriangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;if(o.name.startsWith('city-'))stats.environmentBuildings++;});if(mobileProfile)stats.citySimplification=simplifyMobileCity(env.scene);stats.cityBatching=batchStaticCity(env.scene);environmentReady=true;ready();
}
function applySky(hdr,config){
 hdr.mapping=THREE.EquirectangularReflectionMapping;scene.background=hdr;
 const generator=new THREE.PMREMGenerator(renderer);const baked=generator.fromEquirectangular(hdr);scene.environment=baked.texture;generator.dispose();
 scene.backgroundRotation.y=config.sky_yaw_rad;scene.environmentRotation.copy(scene.backgroundRotation);
 scene.backgroundIntensity=config.background_intensity;scene.environmentIntensity=config.environment_intensity;renderer.toneMappingExposure=config.exposure;
}
async function improveGameAssets(){
 night?.improve();
 await music?.prepare();
 for(const [gltf,name]of [[gameGltf,'game']]){
  try{await upgradeTextures({gltf,manifestUrl:sceneBase+'streaming/'+name+'.json',base:sceneBase,renderer,mobile:mobileProfile,onProgress:value=>{stats[name+'Detail']=value;feed?.invalidate();}});}catch(e){console.warn('Keeping base textures',name,e);}
 }
}
const environmentLoad=loadEnvironment();environmentLoad.catch(fail);
function loadRide(onLoad,onProgress,onError){
 if(isGame){environmentLoad.then(()=>loader.loadAsync(assetUrl('streaming/game.glb'),onProgress)).then(onLoad).catch(onError);return;}
 if(import.meta.env.DEV){loader.load(assetUrl('models/ride.glb'),onLoad,onProgress,onError);return;}
 downloadRideParts(`${sceneBase}models/ride-parts.json`,onProgress).then(data=>loader.parse(data,`${sceneBase}models/`,onLoad,onError)).catch(onError);
}
loadRide(gltf=>{
 loadingUI.complete('ride');gameGltf=gltf;
 scene.add(gltf.scene);car=gltf.scene.getObjectByName('CarRoot');seat=gltf.scene.getObjectByName('SeatView');
 if(!car||!seat||(!isGame&&!gltf.animations.length)){fail(new Error('В сцене отсутствуют камера или анимация'));return;}
 // Empty-node axes are converted by glTF; a camera needs its -Z/Y basis restored.
 const cameraBasis=new THREE.Group();cameraBasis.rotation.x=-Math.PI/2;seat.add(cameraBasis);cameraBasis.add(look);
 stats.povOrigin=seat.userData.pov_origin||'legacy seat anchor';
 // Reuse the prepared PBR values; transparent glazing never hides the road.
 gltf.scene.traverse(o=>{if(o.isMesh){if(o.isSkinnedMesh){o.frustumCulled=false;cabinSkinnedMeshes.push(o);}o.castShadow=o.name!=='Ground';o.receiveShadow=o.name!=='Ramp';const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){
  if(m.name.startsWith('Authored canopy smoke')){const roof=m.name==='Authored canopy smoke roof';m.transparent=!roof;m.opacity=roof?1:.10;m.depthWrite=roof;m.side=THREE.DoubleSide;canopyMaterials.add(m);}
  if(m.name.startsWith('Driver_Hair')||m.name.startsWith('Driver_Eyelash')){m.alphaTest=.25;m.transparent=false;m.depthWrite=true;m.side=THREE.DoubleSide;}
  if(m.name.toLowerCase().includes('glass')&&!m.name.toLowerCase().includes('mirror')){m.transparent=true;m.opacity=Math.min(m.opacity,.12);m.depthWrite=false;m.transmission=0;o.castShadow=false;}
  if(m.name==='Hair_Transparency'||m.name==='Scalp_Transparency'){m.alphaTest=.25;m.transparent=false;m.depthWrite=true;o.castShadow=false;}
  if(m.name.includes('Eye_Occlusion')||m.name.includes('Tearline')){m.depthWrite=false;o.castShadow=false;}
  let interior=o.isSkinnedMesh||o.userData.asset_role==='loose_item';for(let parent=o;parent;parent=parent.parent)if(parent===car)interior=true;
  if(interior)m.fog=false;
  if(m.name==='Hair_Transparency'||m.name==='Scalp_Transparency'||o.userData.asset_role==='safety_restraint')m.side=THREE.DoubleSide;
 }}});
 gltf.scene.traverse(o=>{if(o.userData.driver_head_mesh){driverHeadMeshes.push(o);o.visible=false;}if(o.userData.donor_roof)interiorCeilings.push(o);if(o.userData.asset_role==='thruster_nozzle')downNozzles.push(o);});
 stats.driver=Boolean(gltf.scene.getObjectByName('DriverRig'));stats.authoredExterior=false;gltf.scene.traverse(o=>{if(o.userData.authored_exterior)stats.authoredExterior=true;});stats.downwardNozzles=downNozzles.length;
 if(!isGame){for(const clip of gltf.animations)retimeClip(clip,bakedTiming);
 mixer=new THREE.AnimationMixer(gltf.scene);action=mixer.clipAction(gltf.animations[0]);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(0);}
 updateMirror=rearViewMirror(car,driverHeadMeshes,stats,{mobile:mobileProfile});
 if(!isGame)updatePlumes.prepare(mixer,car,downNozzles);
 updateDisplays=cabinDisplays(gltf.scene,car,mixer,action,timing,stats);
 cabinFill=new THREE.PointLight(environmentConfig?.screen_light_color??'#dedbd3',environmentConfig?.screen_light_intensity??.16,3,2);cabinFill.position.set(.15,1.05,.05);car.add(cabinFill);
 rideReady=!isGame;stats.passenger=Boolean(gltf.scene.getObjectByName('PassengerRoot'));stats.looseItems=0;gltf.scene.traverse(o=>{if(o.userData.asset_role==='loose_item')stats.looseItems++;});stats.coffeeDroplets=0;gltf.scene.traverse(o=>{if(o.userData.asset_role==='coffee_droplet')stats.coffeeDroplets++;});stats.depthMode='logarithmic';stats.dynamicShadows=false;stats.clips=gltf.animations.length;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)stats.skinnedMeshes++;});
 if(isGame)drivingModule.then(({drivingGame})=>drivingGame({scene,root:gltf.scene,car,nozzles:downNozzles,stats})).then(value=>{game=value;feed=cabinFeed({renderer,scene,car,driverHeadMeshes,interiorCeilings,canopyMaterials,stats,mobile:mobileProfile,en:language==='en',onOpen:()=>setExternalView(false)});setExternalView(true);rideReady=true;ready();}).catch(fail);
 ready();
 if(stats.passenger)$('#passenger-credit').innerHTML=`<p>${passengerCredit()} <a href="https://sketchfab.com/3d-models/hight-quality-realistic-girl-character-a2fce1ee0c694542866724d6e47116ba" target="_blank" rel="noopener">Sketchfab</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. </p>`;
 if(stats.looseItems)$('#loose-items-credit').innerHTML=`<p>${language==='en'?'Props:':'Предметы:'} <a href="https://sketchfab.com/3d-models/a178cea47a9c471e9a62b0ef6ba9f53c" target="_blank" rel="noopener">Coffee cup — Dokazvo</a>, <a href="https://sketchfab.com/3d-models/fd9e7fe5889f4c50ab326a962f48aefb" target="_blank" rel="noopener">Black Generic Smartphone — Ottto3d</a>, <a href="https://sketchfab.com/3d-models/aaccd2b9848d4e9d938cdc9d5293c7b3" target="_blank" rel="noopener">Keys — imparity</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. ${language==='en'?'Scale, placement and movement adapted.':'Масштаб, размещение и движение адаптированы.'}</p>`;
},p=>{if(p.total)stats.glbBytes=p.total;loadingUI.progress('ride',p);},fail);
function fail(e){loadingFailed=true;loaded=false;$('#start').disabled=true;console.error(e);loadingUI.fail();$('#start').textContent=t('loadincomplete');}

const sound={ctx:null,osc:null,gain:null,noise:null,noiseGain:null,enabled:false};
function audioInit(){
 if(sound.ctx)return;
 const ctx=new AudioContext();sound.ctx=ctx;
 const capture=ctx.createMediaStreamDestination();sound.capture=capture;
 const osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
 osc.type='sine';filter.type='lowpass';filter.frequency.value=600;gain.gain.value=0;osc.connect(filter).connect(gain).connect(ctx.destination);gain.connect(capture);osc.start();sound.osc=osc;sound.gain=gain;
 const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
 const noise=ctx.createBufferSource(),nf=ctx.createBiquadFilter(),ng=ctx.createGain();noise.buffer=buffer;noise.loop=true;nf.type='lowpass';nf.frequency.value=550;ng.gain.value=0;noise.connect(nf).connect(ng).connect(ctx.destination);ng.connect(capture);
 const air=ctx.createBiquadFilter(),airGain=ctx.createGain();air.type='bandpass';air.frequency.value=1400;air.Q.value=.65;airGain.gain.value=0;noise.connect(air).connect(airGain).connect(ctx.destination);airGain.connect(capture);
 noise.start();sound.noise=noise;sound.noiseGain=ng;sound.airGain=airGain;
}
function audioUpdate(){
 if(!sound.ctx)return;
 const t=sound.ctx.currentTime,active=sound.enabled&&running;
 const accel=isGame?clamp(Math.abs(game?.state.speed||0)/120,0,1):clamp(time/timing.takeoff_s,0,1),flight=isGame?!game?.state.grounded:time>=timing.takeoff_s&&time<timing.touchdown_s;
 sound.osc.frequency.setTargetAtTime(90+Math.sqrt(accel)*260-(flight?200:0),t,.035);
 sound.gain.gain.setTargetAtTime(active&&(isGame||time<timing.rollout_end_s)?(flight?.0015:.003+accel*.004):0,t,.035);
 const thump=isGame?clamp((game?.state.lastImpact||0)/12,0,1)*Math.exp(-((game?.state.elapsed||0)-(game?.state.impactTime??-100))*20):time>=timing.touchdown_s?Math.exp(-(time-timing.touchdown_s)*20):0;
 sound.noiseGain.gain.setTargetAtTime(active?(.006*accel+(flight?.004:0)+thump*.16):0,t,.025);
 const impulse=isGame?Number(game?.state.boosting||false):thrustSoundLevel(time,timing);
 sound.airGain.gain.setTargetAtTime(active?impulse*.045:0,t,.012);
}
function soundButton(){ $('#sound').innerHTML=icon('sound',{off:!sound.enabled})+'<span>'+t(sound.enabled?'soundon':'soundoff')+'</span>';$('#sound').setAttribute('aria-pressed',String(sound.enabled)); }
if(isGame){soundButton();for(const [id,name] of [['reset-look','wheel'],['run-new','reset'],['credits-open','info']]){const b=$('#'+id);if(b)b.innerHTML=icon(name)+'<span>'+b.textContent+'</span>';}}
$('#sound').addEventListener('click',async()=>{audioInit();await sound.ctx.resume();sound.enabled=!sound.enabled;soundButton();audioUpdate();});
function resetLook(){const home=cockpitHome(innerWidth/innerHeight,isGame&&wideView);targetYaw=home.yaw;targetPitch=home.pitch;neutral=null;if(externalView)setExternalView(true);}
function setExternalView(enabled){
 externalView=enabled;document.body.classList.toggle('chase-view',isGame&&enabled);orbit.enabled=enabled&&!isGame;chaseReady=false;previousCarPosition=null;syncStick();
 drag=null;
 for(const o of driverHeadMeshes)o.visible=enabled;
 for(const o of interiorCeilings)o.visible=!enabled;
 for(const m of canopyMaterials)m.opacity=m.name==='Authored canopy smoke roof'?1:enabled?.84:.10;
 if(enabled&&car){car.updateWorldMatrix(true,false);car.getWorldPosition(carPosition);orbit.target.copy(carPosition).add(new THREE.Vector3(0,.65,0));outsideCamera.position.copy(orbit.target).add(new THREE.Vector3(isGame?-6.8:5.8,isGame?2.8:2.1,-4.8));orbit.update();}
 $('#view').setAttribute('aria-label',t(enabled?'viewinside':'viewoutside'));
 $('#view').title=t(enabled?'viewinside':'viewoutside');
 $('#view').setAttribute('aria-pressed',String(enabled));
}
$('#view').addEventListener('click',()=>{if(loaded)setExternalView(!externalView);});
function syncTransport(){
 document.body.classList.toggle('ride-paused',!running);
 const label=running?t('pause'):finished?t('replay'):t('resume');
 $('#pause-label').textContent=label;$('#pause').setAttribute('aria-label',label);
 $('#pause').classList.toggle('is-paused',!running);
 $('#look-coach').hidden=running||!document.body.classList.contains('playing');
 $('#finished').hidden=!finished;
}
function showTransport(){
 $('#welcome').hidden=true;$('#boarding').hidden=true;$('#transport').hidden=false;
 document.body.classList.remove('boarding-active');document.body.classList.add('playing');syncStick();if(isGame)gameControls.show();
}
function seekRide(value){
 if(isGame||!loaded||!Number.isFinite(value))return;
 showTransport();running=false;time=value>duration-.00001?duration:clamp(value,0,duration);finished=time>=duration;
 action.reset().play();mixer.setTime(time);last=performance.now();syncTransport();audioUpdate();
}
function play(){
 if(!loaded)return;
 if(isGame){game.startSession(runUI.mode);runUI.start();gameControls.resetInput(true);chaseReady=false;feed?.invalidate();music.start();showTransport();}else seekRide(0);running=true;syncTransport();if(sound.ctx)sound.ctx.resume();
}
function togglePlayback(){
 if(!loaded||isGame&&game?.state.session?.finished)return;
 if(isGame&&!running)music.start();
 if(!isGame&&finished){play();return;}
 showTransport();gameControls?.resetInput();running=!running;last=performance.now();syncTransport();audioUpdate();
 if(running&&sound.ctx)sound.ctx.resume();
}
$('#start').addEventListener('click',()=>{if(!loaded)return;$('#welcome').hidden=true;$('#boarding').hidden=false;document.body.classList.add('boarding-active');resetLook();syncStick();help?.firstRun();});
$('#drive').addEventListener('click',play);$('#replay').addEventListener('click',play);
$('#pause').addEventListener('click',togglePlayback);
const rideTimeline=$('#ride-timeline');rideTimeline.max=duration;
rideTimeline.addEventListener('pointerdown',()=>{if(loaded){running=false;syncTransport();audioUpdate();}});
rideTimeline.addEventListener('input',()=>seekRide(Number(rideTimeline.value)));
addEventListener('keydown',e=>{
 if(!isGame&&e.code==='Space'&&!e.repeat&&document.body.classList.contains('playing')&&!$('#credits').open&&!$('#settings').open&&!e.target.closest('button,input,a,textarea,[contenteditable]')){e.preventDefault();togglePlayback();}
});
$('#reset-look').addEventListener('click',resetLook);
$('#view').hidden=false;$('#view').disabled=true;
$('#credits-open').addEventListener('click',()=>{closeSettings();$('#credits').showModal();if(running){running=false;syncTransport();audioUpdate();}});
$('#credits-close').addEventListener('click',()=>$('#credits').close());
const settings=$('#settings');
function closeSettings(){settings.close();}
$('#settings-open').addEventListener('click',()=>{
 if(running){running=false;syncTransport();audioUpdate();music?.pause();}
 drag=null;stick.reset();gameControls?.resetInput();settings.showModal();$('#settings-open').setAttribute('aria-expanded','true');
});
$('#settings-close').addEventListener('click',closeSettings);
settings.addEventListener('close',()=>{$('#settings-open').setAttribute('aria-expanded','false');stick.reset();});
settings.addEventListener('click',e=>{if(e.target!==settings)return;const r=settings.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSettings();});
$('#stick-toggle').addEventListener('click',()=>{stickEnabled=!stickEnabled;$('#stick-toggle').setAttribute('aria-pressed',String(stickEnabled));$('#stick-toggle').textContent=t(stickEnabled?'stickon':'stickoff');syncStick();});
$('#reset-look').addEventListener('click',closeSettings);

renderer.domElement.addEventListener('pointerdown',e=>{if(externalView||drag||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);gyroActive=false;});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>2)dismissLookHint();targetYaw=clamp(targetYaw+(e.clientX-drag.x)*.004,-yawLimit,yawLimit);targetPitch=clamp(targetPitch+(e.clientY-drag.y)*.003,pitchMin,pitchMax);drag={id:e.pointerId,x:e.clientX,y:e.clientY};});
function endDrag(e){if(drag?.id===e.pointerId)drag=null;}renderer.domElement.addEventListener('pointerup',endDrag);renderer.domElement.addEventListener('pointercancel',endDrag);renderer.domElement.addEventListener('lostpointercapture',endDrag);
document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden&&running){running=false;syncTransport();audioUpdate();music?.pause();}});

if('DeviceOrientationEvent' in window&&isSecureContext&&matchMedia('(pointer:coarse)').matches){
 $('#gyro').hidden=false;
 $('#gyro').addEventListener('click',async()=>{
  try{
   if(typeof DeviceOrientationEvent.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted'){ $('#gyro').textContent=t('gyrofallback');return; }
   neutral=null;gyroActive=true;$('#gyro').textContent=t('gyroactive');
   if(orientationListener)return;
   const euler=new THREE.Euler(),deviceQ=new THREE.Quaternion(),screenQ=new THREE.Quaternion(),neutralQ=new THREE.Quaternion(),relative=new THREE.Quaternion();
   const correction=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2),zAxis=new THREE.Vector3(0,0,1);
   orientationListener=e=>{
    if(!gyroActive||e.alpha===null||e.beta===null||e.gamma===null)return;
    const angle=radians(screen.orientation?.angle??window.orientation??0);
    euler.set(radians(e.beta),radians(e.alpha),-radians(e.gamma),'YXZ');deviceQ.setFromEuler(euler).multiply(correction).multiply(screenQ.setFromAxisAngle(zAxis,-angle));
    if(!neutral){neutralQ.copy(deviceQ).invert();neutral=true;}
    relative.copy(neutralQ).multiply(deviceQ);euler.setFromQuaternion(relative,'YXZ');targetYaw=clamp(euler.y,-yawLimit,yawLimit);targetPitch=clamp(euler.x,pitchMin,pitchMax);
   };
   addEventListener('deviceorientation',orientationListener);
  }catch(e){$('#gyro').textContent=t('gyrofallback');console.warn('Orientation unavailable',e);}
 });
 addEventListener('orientationchange',()=>{neutral=null;resize();});
}
function stageLabel(){
 if(time<.15)return t('stagestart');
 if(time<timing.takeoff_s)return t('stageaccelerate');
 if(time<timing.touchdown_s)return t('stageflight');
 if(time<timing.touchdown_s+1.5)return t('stageland');
 return t('stagefinish');
}
let performanceStart=0,performanceFrames=0,performanceRunning=false;
function frame(now){
 requestAnimationFrame(frame);if(last&&now-last<1000/(running?60:30)-1)return;const dt=(last?Math.max(0,Math.min((now-last)/1000,.1)):0)*(previewRecorder&&reelHQ?.5:1);last=now;
 stick.step(dt);
 if(loaded&&isGame){const input=gameControls.input(stick.value(),game.state.speed||0);const state=game.update(dt,input,running);time=state.elapsed||0;gameControls.update(state,!running);runUI.update(state);author.update(state);music.update(dt,running,state.score);}
 if(loaded&&running&&!isGame){time=Math.min(time+dt,duration);mixer.setTime(time);if(time>=duration){running=false;finished=true;syncTransport();}}
 if(previewRecorder&&time>=previewEnd){running=false;previewRecorder.stop();previewRecorder=null;syncTransport();}
 if(previewShot){
  const window=previewShot==='wall-on'?[5.7,9.8]:previewShot==='tower'?(time<2.3?[0,2.3]:time>=9.6&&time<10.8?[9.6,10.8]:time>=12.4&&time<13.3?[12.4,13.3]:null):previewShot==='bowl'?[1.1,3.3]:null;
  const inside=!!window&&time>=window[0]&&time<window[1];
  if(externalView===inside){setExternalView(!inside);if(inside){yaw=targetYaw=previewShot==='tower'&&time>=2.3?-radians(80):0;pitch=targetPitch=-.04;}}
  if(inside){const u=clamp((time-window[0])/(previewShot==='tower'?.65:previewShot==='bowl'?1.8:2.8),0,1);targetYaw=-radians(previewShot==='tower'&&time>=2.3?80:80*(u*u*(3-2*u)));targetPitch=-.04-.07*u;}
 }

 yaw=THREE.MathUtils.damp(yaw,targetYaw,12,dt);pitch=THREE.MathUtils.damp(pitch,targetPitch,12,dt);look.rotation.set(pitch,yaw,0,'YXZ');
 // SeatView is baked at the animated eye midpoint. A second positional shake
 // would detach the viewer from the driver's eyes during landing.
 camera.position.set(0,0,0);
 // Only angular head recoil is added here. The eye position already follows
 // the baked driver neck and chassis suspension, including while paused.
 const impactTime=Math.max(0,time-timing.touchdown_s),landed=!isGame&&time>=timing.touchdown_s;
 camera.rotation.set(landed?.024*Math.exp(-impactTime*7)*Math.sin(impactTime*19):0,0,landed?.006*Math.exp(-impactTime*9)*Math.sin(impactTime*23):0);
 audioUpdate();if(!isGame){$('#time').textContent=`${Math.floor(time).toString().padStart(2,'0')} / ${duration.toFixed(1)}`;rideTimeline.value=time;rideTimeline.style.setProperty('--played',`${time/duration*100}%`);rideTimeline.setAttribute('aria-valuetext',t('timelinevalue',{time:time.toFixed(1),duration}));if(loaded)$('#stage').textContent=stageLabel();}
 if(externalView&&car){car.updateWorldMatrix(true,false);car.getWorldPosition(carPosition);
  if(isGame){
   if(game?.state.grounded||!chaseReady){const forward=new THREE.Vector3(1,0,0).applyQuaternion(car.quaternion);forward.y=0;if(forward.lengthSq()>.1)chaseForward.lerp(forward.normalize(),chaseReady?1-Math.exp(-dt*5):1).normalize();}
   const airborne=!game?.state.grounded,portrait=innerWidth<innerHeight,distance=(portrait?8.8:7.2)+(airborne?1.4:0);
   chaseDesired.copy(carPosition).addScaledVector(chaseForward,-distance);chaseDesired.y+=airborne?4:3;
   if(game?.state.adhering){const surfaceUp=new THREE.Vector3(0,1,0).applyQuaternion(car.quaternion);chaseDesired.addScaledVector(surfaceUp,4.5*(1-Math.abs(surfaceUp.y)));}
   outsideCamera.position.lerp(chaseDesired,chaseReady?1-Math.exp(-dt*8):1);chaseTarget.copy(carPosition).addScaledVector(chaseForward,2.2);chaseTarget.y+=.7;outsideCamera.lookAt(chaseTarget);chaseReady=true;
  }else{if(previousCarPosition){const delta=carPosition.clone().sub(previousCarPosition);outsideCamera.position.add(delta);orbit.target.add(delta);}previousCarPosition=carPosition.clone();orbit.update();}
 }
 // A dedicated cover composition keeps the car clear of the title block.
 outsideCamera.clearViewOffset();
 if(isGame&&!$('#welcome').hidden&&car){
  const portrait=outsideCamera.aspect<1;
  outsideCamera.position.copy(carPosition).add(new THREE.Vector3(portrait?8.5:5.5,portrait?3.6:2.4,portrait?7.2:4.5));
  outsideCamera.up.set(0,1,0);outsideCamera.lookAt(carPosition.clone().add(new THREE.Vector3(0,.65,0)));
  outsideCamera.setViewOffset(innerWidth,innerHeight,portrait?0:-innerWidth*.23,portrait?innerHeight*.22:0,innerWidth,innerHeight);
 }
 if((previewShot==='wall-off'||previewShot==='wall-on')&&externalView&&car){outsideCamera.position.copy(carPosition).add(new THREE.Vector3(-6,4,12));outsideCamera.lookAt(carPosition.clone().add(new THREE.Vector3(2,0,0)));}
 if(previewShot==='tower'&&externalView&&car){placeTowerCamera(outsideCamera,carPosition,towerShot(time),Math.atan2(chaseForward.z,chaseForward.x),car.quaternion);}
 if(previewShot==='bowl'&&externalView&&car){const u=clamp((time-3.3)/5.2,0,1);outsideCamera.up.set(0,1,0);outsideCamera.position.copy(carPosition).add(new THREE.Vector3(time<1.1?-8:-7+10*u,4.5,time<1.1?-3:-8));outsideCamera.lookAt(carPosition.clone().add(new THREE.Vector3(0,.8,0)));}
 if(previewShot==='grip'&&externalView&&car){outsideCamera.position.copy(carPosition).add(new THREE.Vector3(-7,3,19));outsideCamera.lookAt(carPosition);}
 if(car){car.getWorldPosition(carPosition);sun.target.position.copy(carPosition);sun.position.copy(carPosition).add(sunOffset);}
 if(!isGame){stats.thrustVisible=updatePlumes(time,loaded);stats.thrust=updatePlumes.stats;}
 updateDisplays(time,isGame?Number(game?.state.boosting||false):thrustSoundLevel(time,timing),isGame&&game?{speed:Math.abs(game.state.speed||0),height:Math.max(0,car.position.y),grounded:game.state.grounded,boosting:game.state.boosting}:null);
 updateMirror(externalView,running);
 // The closed-roof mobile chase view delegates character rendering to the cabin feed.
 const hideCabin=mobileProfile&&isGame&&externalView&&!previewShot;
 const reelGlass=[];if(previewShot&&externalView)for(const m of canopyMaterials){if(m.name!=='Authored canopy smoke roof'){reelGlass.push([m,m.opacity]);m.opacity=.22;}}
 if(hideCabin)for(const o of cabinSkinnedMeshes){o.userData.chaseVisible=o.visible;o.visible=false;}
 try{renderer.render(scene,externalView?outsideCamera:camera);}finally{if(hideCabin)for(const o of cabinSkinnedMeshes)o.visible=o.userData.chaseVisible;}for(const [m,opacity]of reelGlass)m.opacity=opacity;stats.frames++;stats.renderedTriangles=renderer.info.render.triangles;stats.drawCalls=renderer.info.render.calls;
 if(previewBeforeFeed)previewBeforeFeed(renderer.domElement);
 if(feed)feed.draw(now,(externalView||!!previewShot)&&document.body.classList.contains('playing'),running);
 if(previewCompose)previewCompose();
 if(loaded){if(performanceRunning!==running){performanceStart=now;performanceFrames=0;performanceRunning=running;}performanceFrames++;if(!performanceStart)performanceStart=now;
  if(now-performanceStart>2000){const fps=performanceFrames*1000/(now-performanceStart);stats.performance={fps:+fps.toFixed(1),pixelRatio,wideView,mobileProfile,frameCap:running?60:30};
   if(mobileProfile&&!reelHQ&&running&&!previewRecorder){const next=adaptiveRatio(pixelRatio,fps);if(next!==pixelRatio){pixelRatio=next;renderer.setPixelRatio(pixelRatio);resize();}}
   performanceStart=now;performanceFrames=0;
  }
 }
}
requestAnimationFrame(frame);

// Deterministic QA is activated only with ?check=1; UI controls remain testable.
if(new URLSearchParams(location.search).has('check')){
 const qa=document.createElement('div');qa.id='qa';qa.style.cssText='position:fixed;right:15px;top:90px;z-index:10;background:#151619;color:#fff;padding:10px;font:11px Arial;display:flex;gap:7px;flex-wrap:wrap;max-width:300px';
 const seek=seekRide;
 for(const t of (isGame?[]:[0,1,2,2.4,2.8,3.2,3.6,3.9,4.4,5.4,duration])){const b=document.createElement('button');b.textContent=`Кадр ${t}`;b.onclick=()=>seek(t);qa.appendChild(b);}
 const timeline=document.createElement('input');timeline.type='range';timeline.min=0;timeline.max=duration;timeline.step=1/30;timeline.value=0;timeline.setAttribute('aria-label','Момент поездки');timeline.oninput=()=>seek(Number(timeline.value));qa.appendChild(timeline);
 let captureKind='grip';
 const reels=import.meta.env.DEV&&new URLSearchParams(location.search).has('reels');
 const record=document.createElement('button');record.textContent='Записать превью';qa.appendChild(record);
 const previewLink=document.createElement('a');previewLink.textContent='Скачать превью';previewLink.hidden=true;qa.appendChild(previewLink);
 record.onclick=async()=>{
  if(!loaded||previewRecorder)return;
  previewShot=reels?captureKind:null;seek(0);setExternalView(externalView);previewEnd=isGame?16:duration-.15;
  const chunks=[];
  let captureCanvas=renderer.domElement;
  if(reels){
   running=false;record.disabled=true;
   const {createReelCapture}=await import('./reel-capture.js');const capture=await createReelCapture();
   captureCanvas=capture.canvas;previewBeforeFeed=capture.beforeFeed;
   previewCompose=()=>capture.draw(renderer.domElement,game.state,!externalView,document.querySelector('#cabin-feed')?.getBoundingClientRect(),captureKind);
   previewEnd=captureKind==='tower'?17.3:captureKind==='wall-off'?9:captureKind==='wall-on'?10.7:captureKind==='bowl'?10.5:16;
   audioInit();await sound.ctx.resume();sound.enabled=true;audioUpdate();
  }
  const stream=captureCanvas.captureStream(reels?60:30);
  if(sound.enabled&&sound.capture)for(const track of sound.capture.stream.getAudioTracks())stream.addTrack(track.clone());
  const mimeType=['video/mp4;codecs=avc1.42001E,mp4a.40.2','video/mp4;codecs=avc1.42001E','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(v=>MediaRecorder.isTypeSupported(v));
  previewRecorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:reels?14000000:4500000});
  previewRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  previewRecorder.onstop=async()=>{
   const blob=new Blob(chunks,{type:mimeType}),filename=reels?`roadster-reel-${captureKind}.${mimeType.startsWith('video/mp4')?'mp4':'webm'}`:`roadster-slow-flight-${externalView?'outside':Math.abs(yaw)>.5?'passenger':'cockpit'}.${mimeType.startsWith('video/mp4')?'mp4':'webm'}`;
   if(previewLink.href.startsWith('blob:'))URL.revokeObjectURL(previewLink.href);
   previewLink.href=URL.createObjectURL(blob);previewLink.download=filename;
   if(import.meta.env.DEV){try{const response=await fetch(`/__preview/${filename}`,{method:'POST',body:blob});if(response.ok)previewLink.href=`/__preview/${filename}`;}catch(error){console.warn('Preview save failed',error);}}
   previewCompose=null;previewBeforeFeed=null;previewShot=null;outsideCamera.up.set(0,1,0);previewLink.hidden=false;record.disabled=false;record.textContent='Записать превью';stream.getTracks().forEach(t=>t.stop());
  };
  previewLink.hidden=true;record.disabled=true;record.textContent='Записываю…';previewRecorder.start();running=true;last=performance.now();syncTransport();
 };
 if(isGame)for(const [kind,label]of [['wall-off','Ролик: без прижима'],['wall-on','Ролик: с прижимом'],['bowl','Пример: чаша и отрыв'],['wall','Пример: езда по стене'],['grip','Пример: прижим и отрыв'],['tower','Пример: небоскрёб'],['success','Пример: удачная бочка'],['crash','Пример: опрокидывание'],['pad','Маршрут: платформа +250'],['roof','Маршрут: крыша +500'],['high','Маршрут: высота +400'],['cargo','Маршрут: груз +300']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(!loaded||previewRecorder)return;captureKind=kind;game.previewExample(kind);feed?.invalidate();chaseReady=false;record.onclick();};qa.appendChild(b);}
 const hide=document.createElement('button');hide.textContent='Скрыть проверку';hide.onclick=()=>qa.style.display='none';qa.appendChild(hide);
 const side=document.createElement('button');side.textContent='Взгляд вправо';side.onclick=()=>{targetYaw=-radians(72);targetPitch=-.12;};qa.appendChild(side);
 const wide=document.createElement('button');wide.textContent='Общий салон';wide.onclick=()=>{targetYaw=-radians(57);targetPitch=-.08;};qa.appendChild(wide);
 for(const [label,offset] of [['Спереди',[6,-4,2.5]],['Сзади',[-6,-4,2.5]],['Слева',[0,7.2,1.8]],['Справа',[0,-7.2,1.8]],['Сверху',[.01,0,9]]]){const b=document.createElement('button');b.textContent='Кузов: '+label;b.onclick=()=>{if(!loaded)return;setExternalView(true);car.updateWorldMatrix(true,false);orbit.target.copy(car.localToWorld(new THREE.Vector3(0,.65,0)));outsideCamera.position.copy(car.localToWorld(new THREE.Vector3(offset[0],offset[2],-offset[1])));orbit.update();};qa.appendChild(b);}
 const output=document.createElement('output');output.id='qa-stats';qa.appendChild(output);document.body.appendChild(qa);
 setInterval(()=>{const props={};for(const name of ['Loose_phone','Loose_coffee']){const o=scene.getObjectByName(name);if(o){const p=o.getWorldPosition(new THREE.Vector3()).project(camera);props[name]=p.toArray();}}output.textContent=JSON.stringify({...stats,props,time,running,finished,loaded,externalView,yaw,pitch,aspect:camera.aspect,fov:camera.fov,carPosition:car?car.getWorldPosition(new THREE.Vector3()).toArray():null});},500);
}
