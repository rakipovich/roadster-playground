// Judge actual touchdown and sustained wheel support, never award points at the apex.
export function roofTrial(){
 let launched=false,stable=0,settling=0,touchdown=null,previousAir=false,result=null;
 return {reset(){launched=false;stable=settling=0;touchdown=result=null;previousAir=false;},update(dt,s,p){
  if(result)return result;
  if(!s.grounded&&p.y>22)launched=true;
  if(!launched)return null;
  if(s.score?.event==='crash')return result={success:false,reason:'overturned',points:0};
  if(s.grounded&&previousAir&&!touchdown)touchdown={impact:s.lastImpact??0,up:s.upY,spin:s.angularSpeed??0};
  previousAir=!s.grounded;
  const roof=Math.abs(p.x-85)<10.5&&Math.abs(p.z-90)<10.5&&p.y>59&&p.y<62;
  const safe=s.grounded&&s.upY>.9&&(s.angularSpeed??0)<1.5&&Math.abs(s.speed??0)<12;
  stable=roof&&safe?stable+dt:0;
  settling=s.grounded&&!roof?settling+dt:0;
  if(stable>=.8){const t=touchdown||{impact:99,up:0,spin:99};const clean=t.impact<7&&t.up>.95&&t.spin<1;return result={success:true,reason:clean?'clean':'hard',points:clean?1000:500,impact:Math.round(t.impact*10)/10};}
  if(settling>.8)return result={success:false,reason:'missed',points:0};
  return null;
 }};
}
