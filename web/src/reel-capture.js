import {icon} from './control-icons.js';
// Local recording layout. Input indicators come from the controls applied by Rapier.
export async function createReelCapture(){
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;
 const ctx=canvas.getContext('2d'),main=document.createElement('canvas'),mainCtx=main.getContext('2d');
 const icons={};await Promise.all(['wheel','gas','brake','jets','grip','view'].map(async name=>{const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(icon(name).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" ').replaceAll('currentColor','#ffffff'));await img.decode();icons[name]=img;}));
 function rounded(x,y,w,h,r=20){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
 function cover(img,x,y,w,h){const k=Math.max(w/img.width,h/img.height),sw=w/k,sh=h/k;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,w,h);ctx.restore();}
 function button(name,x,y,r,active,value,rotation=0){ctx.save();ctx.translate(x,y);ctx.fillStyle=active?'#a73d34':'#111820dd';ctx.strokeStyle=active?'#fff3df':'#ffffff88';ctx.lineWidth=active?4:2;rounded(-r,-r,r*2,r*2,r);ctx.fill();ctx.stroke();ctx.rotate(rotation);ctx.drawImage(icons[name],-r*.53,-r*.53,r*1.06,r*1.06);ctx.restore();if(value){ctx.fillStyle='#f4f2ed';ctx.font='500 28px Arial';ctx.textAlign='center';ctx.fillText(value,x,y+r+35);}}
 return {canvas,beforeFeed(source){if(main.width!==source.width||main.height!==source.height){main.width=source.width;main.height=source.height;}mainCtx.drawImage(source,0,0);},draw(source,s,inside,panel,kind){
  const input=s.appliedControls||{};ctx.fillStyle='#0d1218';ctx.fillRect(0,0,1080,1920);
  // Full-width game image, with soft top/bottom transitions instead of a card.
  cover(main,0,180,1080,1485);
  const top=ctx.createLinearGradient(0,180,0,430);top.addColorStop(0,'#0d1218');top.addColorStop(1,'#0d121800');ctx.fillStyle=top;ctx.fillRect(0,180,1080,250);
  const shade=ctx.createLinearGradient(0,1200,0,1665);shade.addColorStop(0,'#0d121800');shade.addColorStop(.65,'#0d1218b0');shade.addColorStop(1,'#0d1218');ctx.fillStyle=shade;ctx.fillRect(0,1200,1080,465);
  if(!inside&&panel?.width){const sx=source.width/innerWidth,sy=source.height/innerHeight;ctx.save();rounded(120,296,350,197);ctx.clip();ctx.drawImage(source,panel.x*sx,panel.y*sy,panel.width*sx,panel.height*sy,120,296,350,197);ctx.restore();}
  ctx.textAlign='left';ctx.fillStyle='#f4f2ed';ctx.font='500 24px Arial';if(!inside)ctx.fillText('● САЛОН',136,324);
  ctx.textAlign='right';ctx.font='500 58px Arial';ctx.fillText('★ '+(s.score?.total||0),840,350);ctx.font='28px Arial';ctx.fillText('◇ '+(s.exploration?.count||0)+' / 5',840,398);

  button('view',805,460,37,inside);
  button('wheel',265,1360,64,Math.max(Math.abs(input.steer||0),Math.abs(input.airPitch||0))>.05,null,(input.steer||0)*1.3);
  button('gas',415,1360,46,(input.throttle||0)>0);
  button('brake',540,1360,46,!!input.brake);
  button('grip',665,1360,46,!!input.adhesion,(Math.max(0,s.gripFuel??1)*8).toFixed(1)+' с');
  button('jets',790,1360,46,!!input.boost,(Math.max(0,s.fuel??1)*2.6).toFixed(1)+' с');
  ctx.textAlign='center';ctx.font='22px Arial';ctx.fillStyle='#e9e9e9';ctx.fillText(Math.round(Math.abs(s.speed||0))+' км/ч',265,1460);
 }};
}
