// Thumb-controlled angular velocity, using the same look limits as swipe.
export function lookStick(element,onMove,{keyboard=true}={}){
 const knob=element.querySelector('.stick-knob'),keys=new Set();
 let pointer=null,x=0,y=0;
 const paint=()=>{knob.style.transform=`translate(${x*Math.min(29,(element.clientWidth-36)/2-3)}px,${y*Math.min(29,(element.clientWidth-36)/2-3)}px)`;element.classList.toggle('held',pointer!==null||keys.size>0);};
 const reset=()=>{pointer=null;keys.clear();x=y=0;paint();};
 const update=e=>{const r=element.getBoundingClientRect();x=(e.clientX-r.left-r.width/2)/(r.width*.327);y=(e.clientY-r.top-r.height/2)/(r.width*.327);const n=Math.hypot(x,y);if(n>1){x/=n;y/=n;}paint();};
 element.addEventListener('pointerdown',e=>{if(pointer!==null||e.button!==0)return;e.preventDefault();pointer=e.pointerId;element.setPointerCapture(pointer);update(e);});
 element.addEventListener('pointermove',e=>{if(e.pointerId===pointer)update(e);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,e=>{if(e.pointerId===pointer)reset();});
 element.addEventListener('keydown',e=>{if(!keyboard||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();keys.add(e.key);x=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));y=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));paint();});
 element.addEventListener('keyup',e=>{if(!keys.has(e.key))return;e.preventDefault();keys.delete(e.key);x=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));y=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));paint();});
 element.addEventListener('blur',()=>{keys.clear();if(pointer===null)reset();});window.addEventListener('blur',reset);document.addEventListener('visibilitychange',reset);
 return {reset,value:()=>({x,y}),step(dt){const magnitude=Math.hypot(x,y);if(magnitude<.12||element.hidden)return;const gain=(Math.min(1,magnitude)-.12)/.88;onMove(x/magnitude*gain*dt,y/magnitude*gain*dt);}};
}
