import * as THREE from 'three';

// One renderer, cached low-resolution feed: no second WebGL context or full-scene mirror pass.
export function cabinFeed({renderer,scene,car,driverHeadMeshes,interiorCeilings,canopyMaterials,stats,mobile,en,onOpen}){
 const reelHQ=import.meta.env.DEV&&new URLSearchParams(location.search).has('reels');
 const panel=document.createElement('div');panel.id='cabin-feed';panel.hidden=true;
 panel.innerHTML=`<button id="cabin-open" aria-label="${en?'Open cabin view':'Открыть вид из салона'}"><span>${en?'CABIN':'САЛОН'}</span></button><button id="cabin-collapse" aria-label="${en?'Hide cabin feed':'Свернуть окно салона'}">−</button>`;document.body.appendChild(panel);
 const open=panel.querySelector('#cabin-open'),toggle=panel.querySelector('#cabin-collapse');open.onclick=onOpen;
 let collapsed=false;toggle.onclick=()=>{collapsed=!collapsed;panel.classList.toggle('collapsed',collapsed);toggle.textContent=collapsed?'▣':'−';toggle.setAttribute('aria-label',en?(collapsed?'Show cabin feed':'Hide cabin feed'):(collapsed?'Показать окно салона':'Свернуть окно салона'));measure();};
 const inspect=new URLSearchParams(location.search).has('cabincheck');if(inspect)panel.style.cssText='width:480px;max-width:48vw;top:100px;right:12px';
 const width=inspect?960:reelHQ?480:mobile?256:480,height=width*9/16,target=new THREE.WebGLRenderTarget(width,height,{depthBuffer:true});
 const camera=new THREE.PerspectiveCamera(inspect?68:52,16/9,.035,3.5);car.add(camera);camera.position.set(.65,1.16,0);camera.lookAt(car.localToWorld(new THREE.Vector3(-.45,inspect?.80:.97,0)));
 const overlay=new THREE.Scene(),ortho=new THREE.OrthographicCamera(-1,1,1,-1,0,1),material=new THREE.ShaderMaterial({uniforms:{feed:{value:target.texture},panelSize:{value:new THREE.Vector2(168,94.5)}},transparent:true,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D feed;uniform vec2 panelSize;varying vec2 vUv;void main(){float radius=14.;vec2 q=abs((vUv-.5)*panelSize)-(panelSize*.5-vec2(radius));float d=length(max(q,0.))+min(max(q.x,q.y),0.)-radius;float alpha=1.-smoothstep(-1.,0.,d);if(alpha<.01)discard;gl_FragColor=vec4(texture2D(feed,vUv).rgb,alpha);
#include <colorspace_fragment>
}`});overlay.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
 let last=-Infinity,frames=0,rect=null;const viewport=new THREE.Vector4(),scissor=new THREE.Vector4();
 const measure=()=>{rect=panel.getBoundingClientRect();material.uniforms.panelSize.value.set(rect.width,rect.height);};addEventListener('resize',measure);
 function draw(now,visible,running){
  if(panel.hidden===visible){panel.hidden=!visible;measure();}if(!visible||collapsed)return;
  if(!rect?.width)measure();
  if(now-last>1000/(reelHQ?30:mobile?10:20)&&(running||frames===0)){
   const hidden=[];for(const node of driverHeadMeshes.concat(interiorCeilings)){hidden.push([node,node.visible]);node.visible=true;}
   const glazing=[...canopyMaterials].filter(m=>m.name!=='Authored canopy smoke roof').map(m=>[m,m.opacity]);for(const [m]of glazing)m.opacity=.1;
   const oldAutoUpdate=scene.matrixWorldAutoUpdate;scene.matrixWorldAutoUpdate=false;
   const oldTarget=renderer.getRenderTarget();renderer.getViewport(viewport);renderer.getScissor(scissor);const oldScissor=renderer.getScissorTest();
   try{renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.clear();renderer.render(scene,camera);frames++;last=now;}
   finally{scene.matrixWorldAutoUpdate=oldAutoUpdate;for(const [m,opacity]of glazing)m.opacity=opacity;for(const [node,value]of hidden)node.visible=value;renderer.setRenderTarget(oldTarget);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(oldScissor);}
  }
  const auto=renderer.autoClear;renderer.autoClear=false;renderer.setViewport(rect.x,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissor(rect.x,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissorTest(true);renderer.render(overlay,ortho);renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.autoClear=auto;
  stats.cabinFeed={width,height,maxHz:reelHQ?30:mobile?10:20,frames,collapsed};
 }
 return {draw,invalidate(){last=-Infinity;frames=0;measure();}};
}
