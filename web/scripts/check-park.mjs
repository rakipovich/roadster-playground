import assert from 'node:assert/strict';import {parkChallenges} from '../src/stunt-park.js';
const ground={grounded:true,upY:1,airtime:0},air={grounded:false,upY:1,airtime:1};
for(const [id,from,peak,to,points]of [['pad',[5,3,22],[15,4,22],[28,2,22],250],['roof',[4,6,-24],[12,10,-24],[27,8,-24],500],['high',[4,5,44],[15,12,44],[45,0,44],400],['cargo',[2,3,-48],[10,4,-48],[28,0,-48],300]]){
 const c=parkChallenges(),v=a=>({x:a[0],y:a[1],z:a[2]});let award;
 c.update(.5,air,v(from));c.update(.5,air,v(peak));for(let i=0;i<10;i++){const r=c.update(.1,ground,v(to));if(r.award)award=r.award;}assert.deepEqual(award,{id,points});
 c.reset();c.update(.5,air,v(from));c.update(.5,air,v(peak));for(let i=0;i<10;i++)assert.equal(c.update(.1,ground,v(to)).award,null);
 const crash=parkChallenges();crash.update(.5,air,v(from));crash.update(.5,{...air,score:{event:'crash'}},v(peak));for(let i=0;i<10;i++)assert.equal(crash.update(.1,ground,v(to)).award,null);
}
console.log('Four physical objectives: stable landing, no repeat reward, crash cancels reward.');
