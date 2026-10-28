import {icon} from './control-icons.js';
export function sessionUI({en,onStart,onPause}){
 let mode='roof',shown=false;const choices=document.createElement('div');choices.className='run-choices';
 choices.innerHTML=`<button type="button" data-mode="roof" aria-pressed="true">${en?'ROOFTOP':'НА КРЫШУ'}</button><button type="button" data-mode="challenge" aria-pressed="false">90 ${en?'SEC':'СЕК'}</button><button type="button" data-mode="training" aria-pressed="false">${en?'FREE DRIVE':'СВОБОДНО'}</button>`;
 document.querySelector('#boarding').insertBefore(choices,document.querySelector('#drive'));
 const hint=document.createElement('p');hint.className='run-objective';choices.after(hint);
 const menu=document.createElement('button');menu.id='run-new';menu.textContent=en?'New 90-second run':'Новый заезд · 90 сек';document.querySelector('.settings-grid').appendChild(menu);
 menu.onclick=()=>{document.querySelector('#settings').close();select('challenge');onStart(mode);};
 const roofButton=document.createElement('button');roofButton.textContent=en?'Rooftop · 60 m':'На крышу · 60 м';document.querySelector('.settings-grid').appendChild(roofButton);roofButton.onclick=()=>{document.querySelector('#settings').close();select('roof');onStart(mode);};
 const practice=document.createElement('button');practice.innerHTML=icon('free')+'<span>'+(en?'Free drive':'Свободная езда')+'</span>';document.querySelector('.settings-grid').appendChild(practice);
 practice.onclick=()=>{document.querySelector('#settings').close();select('training');onStart(mode);};
 function select(value){mode=value;hint.textContent=mode==='roof'?(en?'Launch from the ramp. Land and stop on the tower.':'Разгонись с трамплина. Приземлись и остановись на башне.'):mode==='training'?(en?'Explore the park. Find 5 metal badges.':'Исследуй полигон. Найди 5 металлических меток.'):'';for(const b of choices.children)b.setAttribute('aria-pressed',String(b.dataset.mode===mode));}
 select(mode);
 for(const b of choices.children)b.onclick=()=>select(b.dataset.mode);
 const result=document.createElement('dialog');result.id='run-result';result.setAttribute('aria-labelledby','run-result-title');
 result.innerHTML=`<p class="run-eyebrow">90 ${en?'SECONDS':'СЕКУНД'}</p><h2 id="run-result-title">${en?'Run complete':'Заезд завершён'}</h2><output id="run-final-score"></output><p id="run-record"></p><button id="run-again">${en?'Try again':'Ещё заезд'} ↗</button><button id="run-practice">${en?'Free drive':'Свободная езда'}</button>`;
 document.body.appendChild(result);result.addEventListener('cancel',e=>e.preventDefault());
 result.querySelector('#run-again').onclick=()=>{onStart(mode);};result.querySelector('#run-practice').onclick=()=>{select('training');onStart(mode);};
 return {get mode(){return mode;},start(){shown=false;result.close();},update(s){if(!s.session?.finished||shown)return;shown=true;onPause();const score=s.score?.total||0;let best=0;try{best=Number(localStorage.getItem('roadster-best-v1-'+mode))||0;localStorage.setItem('roadster-best-v1-'+mode,String(Math.max(best,score)));}catch{}result.querySelector('#run-final-score').textContent=`★ ${score}`;result.querySelector('#run-record').textContent=(en?'Your best: ':'Твой рекорд: ')+Math.max(best,score);const r=s.session.outcome;result.querySelector('.run-eyebrow').textContent=mode==='roof'?(en?'ROOFTOP · 60 M':'НА КРЫШУ · 60 М'):'90 '+(en?'SECONDS':'СЕКУНД');result.querySelector('h2').textContent=mode==='roof'?(r?.success?(en?'Rooftop reached':'Ты на крыше'):(en?'Try another approach':'Попробуй ещё')):(en?'Run complete':'Заезд завершён');if(mode==='roof')result.querySelector('#run-record').textContent=({clean:en?'Clean landing · +1000':'Чистая посадка · +1000',hard:en?'Hard landing · +500':'Жёсткая посадка · +500',missed:en?'Landed outside the roof':'Приземление мимо крыши',overturned:en?'Car overturned':'Машина перевернулась'})[r?.reason]||(en?'Time is up':'Время вышло');result.showModal();}};
}
