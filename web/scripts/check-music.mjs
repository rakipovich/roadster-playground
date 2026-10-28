import assert from 'node:assert/strict';
import {gameMusic} from '../src/game-music.js';
const audios=[],store=new Map([['roadster-music','on']]),elements=[],gainValues=[];let button;
globalThis.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
globalThis.document={body:{appendChild(){}},querySelector(){return {appendChild(b){if(b.id==='music-toggle')button=b;}};},createElement(){const e={dataset:{},setAttribute(k,v){this[k]=v;},getAttribute(k){return this[k];},appendChild(){}};elements.push(e);return e;}};
globalThis.Audio=class{constructor(){Object.assign(this,{src:'',dataset:{},paused:true,currentTime:0,duration:62,readyState:0,ended:false});audios.push(this);}addEventListener(name,fn){(this.listeners??={})[name]=fn;}load(){this.readyState=4;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};
globalThis.AudioContext=class{constructor(){this.currentTime=0;this.destination={};}resume(){return Promise.resolve();}createGain(){return {gain:{value:0,setTargetAtTime(v){gainValues.push(v);}},connect(){}};}createMediaElementSource(){return {connect(node){return node;}};}};
const m=gameMusic({base:'/',en:false});assert.equal(audios.length,0,'No audio requests before user starts');
m.start();m.update(.1,true);assert.equal(audios.length,0,'Start silently even with old enabled preference');button.onclick();assert.equal(audios.length,2);assert.ok(audios[0].src.endsWith('a.mp3'));assert.equal(audios[1].src,'');const quick=elements.find(e=>e.id==='music-quick');assert.equal(quick['aria-busy'],'true');assert.equal(quick['aria-pressed'],'false');audios[0].listeners.playing();assert.equal(quick['aria-busy'],'false');assert.equal(quick['aria-pressed'],'true');audios[0].listeners.waiting();assert.equal(quick['aria-busy'],'true');audios[0].listeners.playing();
audios[0].currentTime=9;m.update(.1,true);assert.ok(audios[1].src.endsWith('b.mp3'));assert.equal(audios[1].paused,true);
audios[0].currentTime=60;for(let i=0;i<30;i++)m.update(.1,true);assert.equal(audios[0].paused,true);assert.equal(audios[1].paused,false,'Crossfade changes the active player');
m.update(.1,false);assert.ok(audios.every(a=>a.paused));m.start();assert.equal(audios[1].paused,false);
button.onclick();assert.ok(audios.every(a=>a.paused));
m.update(.1,true);button.onclick();assert.equal(audios[1].paused,false,'Unmute during play resumes audio');
const slider=elements.find(e=>e.id==='music-volume');slider.value='0';slider.oninput();m.update(.1,true);assert.equal(gainValues.at(-2),0);assert.equal(store.get('roadster-music-volume'),'0');slider.value='70';slider.oninput();m.update(.1,true);assert.equal(gainValues.at(-2),.7);
console.log('Silent default, volume control, saved volume. Music: deferred requests, next-track preload, crossfade, pause, resume and independent mute PASS');

// A cold page warms one track silently, including on browsers that ignore preload.
const previousCount=audios.length;let requests=0;
globalThis.fetch=async()=>{requests++;return {ok:true,blob:async()=>new Blob(['audio'])};};
const warm=gameMusic({base:'/',en:false});warm.prepare();warm.prepare();
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(requests,1);assert.equal(audios.length,previousCount+2);
assert.ok(audios.at(-2).src.startsWith('blob:'));assert.equal(audios.at(-1).src,'');
assert.ok(audios.slice(-2).every(a=>a.paused),'Warm-up must remain silent');
console.log('First-track warm cache is idempotent and silent; second track stays deferred PASS');
