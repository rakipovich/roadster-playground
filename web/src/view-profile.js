export function cockpitFov(aspect,wide){
 const radians=degrees=>degrees*Math.PI/180;
 const vertical=wide?90:68,horizontal=wide?130:94;
 return Math.min(vertical,2*Math.atan(Math.tan(radians(horizontal)/2)/aspect)*180/Math.PI);
}
export function adaptiveRatio(ratio,fps){
 if(fps<45)return Math.max(.85,Math.round((ratio-.15)*100)/100);
 return ratio;
}

export function cockpitHome(aspect,wide){return {yaw:wide&&aspect>1.2?-.65:0,pitch:wide&&aspect>1.2?-.015:-.04};}
