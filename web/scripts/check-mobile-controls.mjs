import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lookStick} from '../src/look-stick.js';
import {cockpitFov,adaptiveRatio,cockpitHome} from '../src/view-profile.js';
class Element {
 constructor(){this.events=new Map();this.style={};this.dataset={};this.hidden=false;this.nodes=new Map();this.classes=new Set();this.classList={toggle:(s,on)=>on?this.classes.add(s):this.classes.delete(s),add:s=>this.classes.add(s),remove:s=>this.classes.delete(s)};this.clientWidth=100;}
 set innerHTML(s){for(const m of s.matchAll(/id="([^"]+)"/g))this.nodes.set('#'+m[1],new Element());}
 querySelector(s){return this.nodes.get(s);}
 querySelectorAll(){return [...this.nodes.values()].filter(n=>n.classes.has('held'));}
 contains(n){return [...this.nodes.values()].includes(n);}
 closest(s){return s==='[data-pedal]'&&this.dataset.pedal?this:null;}
 appendChild(){}
 setAttribute(){} setPointerCapture(){}
 addEventListener(type,fn){if(!this.events.has(type))this.events.set(type,[]);this.events.get(type).push(fn);}
 emit(type,data={}){const e={type,target:this,button:0,pointerId:1,clientX:85,clientY:50,preventDefault(){},...data};for(const fn of this.events.get(type)||[])fn(e);}
 getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
}
let ui,hit=null;globalThis.window=new Element();globalThis.document=new Element();document.body={appendChild:e=>{ui=e;}};document.createElement=()=>new Element();document.querySelector=()=>null;document.elementFromPoint=()=>hit;
const source=(await readFile(new URL('../src/driving-controls.js',import.meta.url),'utf8')).replace("import './driving.css';",'').replace("'./control-icons.js'",JSON.stringify(new URL('../src/control-icons.js',import.meta.url).href)).replace("'./held-pointers.js'",JSON.stringify(new URL('../src/held-pointers.js',import.meta.url).href));
const {drivingControls}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const controls=drivingControls({en:false,onPause(){},onReset(){}});controls.show();
const stickElement=new Element();stickElement.nodes.set('.stick-knob',new Element());const stick=lookStick(stickElement,()=>{},{keyboard:false});
const grip=ui.querySelector('#drive-grip');
const gas=ui.querySelector('#drive-gas'),boost=ui.querySelector('#drive-boost');
const input=()=>controls.input(stick.value(),30);
stickElement.emit('pointerdown',{pointerId:1});gas.emit('pointerdown',{pointerId:2});
assert.ok(input().steer>.9);assert.equal(input().throttle,1);
// Tap with a third finger, then two-thumb slide while gas and steering stay held.
grip.onclick();assert.equal(input().adhesion,true);assert.equal(input().throttle,1);assert.ok(input().steer>.9);
hit=grip;gas.emit('pointermove',{pointerId:2});assert.equal(input().adhesion,false);assert.equal(input().throttle,1);assert.ok(input().steer>.9);
gas.emit('pointermove',{pointerId:2});assert.equal(input().adhesion,false,'Do not toggle repeatedly while staying on grip');
hit=gas;gas.emit('pointermove',{pointerId:2});hit=grip;gas.emit('pointermove',{pointerId:2});assert.equal(input().adhesion,true);hit=gas;gas.emit('pointermove',{pointerId:2});

boost.emit('pointerdown',{pointerId:3});assert.equal(input().boost,true);assert.equal(input().throttle,1);assert.ok(input().steer>.9);
boost.emit('pointerup',{pointerId:3});assert.equal(input().boost,false);assert.equal(input().throttle,1);
gas.emit('pointerdown',{pointerId:4});gas.emit('pointerup',{pointerId:2});assert.equal(input().throttle,1);
gas.emit('pointercancel',{pointerId:4});assert.equal(input().throttle,0);assert.ok(input().steer>.9);
gas.emit('pointerdown',{pointerId:5});hit=boost;gas.emit('pointermove',{pointerId:5});assert.equal(input().boost,true);assert.equal(input().throttle,1);
hit=gas;gas.emit('pointermove',{pointerId:5});assert.equal(input().boost,false);assert.equal(input().throttle,1);
stickElement.emit('blur');assert.ok(input().steer>.9,'Another control taking focus must not release the steering finger');
stickElement.emit('pointerup',{pointerId:99});assert.ok(input().steer>.9);
stickElement.emit('pointerup',{pointerId:1});assert.equal(input().steer,0);assert.equal(input().throttle,1);
gas.emit('lostpointercapture',{pointerId:99});assert.equal(input().throttle,1);gas.emit('lostpointercapture',{pointerId:5});assert.equal(input().throttle,0);
stickElement.emit('keydown',{key:'ArrowRight',code:'ArrowRight'});assert.equal(stick.value().x,0,'Game keyboard steering must not also move joystick');
window.emit('keydown',{key:'ArrowRight',code:'ArrowRight'});assert.equal(input().steer,1);window.emit('blur');assert.equal(input().steer,0);
gas.emit('pointerdown',{pointerId:6});document.emit('visibilitychange');assert.equal(input().throttle,0);
assert.equal(cockpitFov(393/852,true),90);assert.equal(cockpitHome(852/393,true).yaw,-.65);assert.equal(cockpitHome(393/852,true).yaw,0);assert.equal(cockpitHome(852/393,false).yaw,0);assert.ok(cockpitFov(852/393,true)>cockpitFov(852/393,false));assert.equal(adaptiveRatio(1,25),.85);assert.equal(adaptiveRatio(1.25,35),1.1);assert.equal(adaptiveRatio(1.25,60),1.25);
console.log(JSON.stringify({passed:true,checks:['steer + gas + grip, independent fingers','gas→grip slide preserves gas and steering','grip toggles once per entry','steer + gas + boost, 3 pointer IDs','release only owning pointer','2 fingers on same pedal','cancel/lost capture','thumb slide gas→boost retains throttle','focus change preserves touch steering','keyboard not double-counted','blur/visibility clears input','wide FOV and pixel-ratio bounds'],limitation:'Simulated event-handler tests; not physical iPhone/Safari multi-touch'},null,2));
