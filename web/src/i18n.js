const en=new URLSearchParams(location.search).get('lang')==='en';
export const language=en?'en':'ru';
const phrases={
 viewoutside:['Посмотреть снаружи','Switch to exterior'],viewinside:['Вернуться в салон','Switch to interior'],
 settings:['Управление','Controls'],menu:['Меню','Menu'],stickon:['Джойстик вкл.','Joystick on'],stickoff:['Джойстик выкл.','Joystick off'],
 concept:['НЕОФИЦИАЛЬНЫЙ КОНЦЕПТ · 7,4 СЕКУНДЫ','UNOFFICIAL CONCEPT · 7.4 SECONDS'],
 welcome:['Внутри<br><em>переворота.</em>','Inside<br><em>the flip.</em>'],
 intro:['Резкий разгон. Прыжок и переворот.<br>Сначала осмотрись в салоне.','Rapid launch. Jump and flip.<br>First, look around the cabin.'],
 start:['Осмотреть салон ↗','Look around the cabin ↗'],drive:['Поехали ↗','Let’s go ↗'],boardinghint:['Зажми и проведи мышкой или пальцем, чтобы осмотреться. В полёте можно остановиться и перемотать поездку.','Click and drag, or swipe, to look around. During the flight, you can pause and scrub through the ride.'],loading:['Загружаем поездку…','Loading the ride…'],
 ready:['Готово к старту','Ready to launch'],connecting:['Подключаем сцену…','Connecting to the scene…'],
 preparing:['Подготавливаем сцену…','Preparing the scene…'],preparedetail:['Файлы скачаны. Ещё немного — на материалы и анимацию.','Files downloaded. Preparing materials and animation.'],
 loadbytes:['Загрузка {percent}% · {loaded} из {total} МБ','Loading {percent}% · {loaded} of {total} MB'],
 loadhint:['Первый запуск может занять время на мобильном интернете.','The first visit can take a while on mobile data.'],
 loadseconds:['Примерно {time} с до скачивания. Первый запуск загружает всю сцену.','About {time}s to download. The first visit loads the complete scene.'],
 loadminutes:['Примерно {time} мин до скачивания. Можно оставить страницу открытой.','About {time} min to download. You can keep this page open.'],
 cached:['Сцена загружена. Повторная поездка — без скачивания.','Scene loaded. Replay without downloading again.'],
 loadmodels:['Скачиваем модели и окружение…','Downloading models and environment…'],
 loadfailed:['Загрузка прервалась','Loading interrupted'],loadretry:['Проверь соединение и обнови страницу, чтобы повторить.','Check your connection and refresh to try again.'],loadincomplete:['Загрузка не завершена','Loading incomplete'],
 timelinehint:['Перемотай и осмотрись','Scrub to pause and look around'],pausedlook:['Пауза · осмотрись вокруг','Paused · look around'],timelinevalue:['{time} из {duration} секунд','{time} of {duration} seconds'],
 lookhint:['Проведи по экрану, чтобы осмотреться','Drag to look around'],
 finished:['ПОЕЗДКА ЗАВЕРШЕНА','RIDE COMPLETE'],again:['Ещё<br>один <em>круг?</em>','One<br>more <em>ride?</em>'],againhint:['Осмотрись — или повтори переворот.','Look around, or take another spin.'],replay:['Повторить ↗','Ride again ↗'],
 pause:['Пауза','Pause'],resume:['Продолжить','Continue'],outside:['Обзор снаружи','Outside view'],inside:['Из салона','Inside view'],reset:['Вернуть взгляд','Reset view'],
 soundoff:['Звук выкл.','Sound off'],soundon:['Звук вкл.','Sound on'],
 stageinverted:['ВНИЗ ГОЛОВОЙ · ПАУЗА','UPSIDE DOWN · HOLD'],stagereverse:['СПУСК ЗАДНИМ ХОДОМ','REVERSING DOWN'],stagekickflip:['ВТОРОЙ ПРЫЖОК · SLOW MOTION','SECOND JUMP · SLOW MOTION'],stageprepare:['ГОТОВИМСЯ','PREPARING'],stagestart:['НА СТАРТЕ','READY'],stageaccelerate:['РАЗГОН','ACCELERATING'],stageflight:['ПОЛЁТ','FLIGHT'],stageland:['ПРИЗЕМЛЕНИЕ','TOUCHDOWN'],stagefinish:['ФИНИШ','FINISH'],
 gyro:['Осмотр телефоном','Look with your phone'],gyroactive:['Телефон: включён','Phone motion on'],gyrofallback:['Осмотр пальцем','Drag to look around'],credits:['Авторы материалов','Asset credits'],close:['Закрыть','Close']
};
// Approved mobile interface is the default. ?ui=legacy retains the prior review.
if(new URLSearchParams(location.search).get('ui')!=='legacy'){
 document.body.classList.add('mobile-proposal');
 Object.assign(phrases,{
  stick:['Удерживай · осмотр','Hold to look'],
  concept:['ROADSTER / ИНТЕРАКТИВНЫЙ КОНЦЕПТ','ROADSTER / INTERACTIVE CONCEPT'],
  welcome:['Останови<br><em>переворот.</em>','Freeze<br><em>the flip.</em>'],
  intro:['Кофе зависает. Горизонт переворачивается.<br>Останови время и оглянись внутри.','Coffee floats. The horizon turns.<br>Freeze time and look around inside.'],
  start:['Занять место ↗','Take your seat ↗'],
  boardinghint:['Проведи пальцем, чтобы осмотреться','Drag to look around'],
  drive:['Поехали →','Launch →'],pause:['Остановить время','Freeze time'],resume:['Продолжить полёт','Continue the flight'],
  pausedlook:['Время остановлено. Осмотрись свайпом или джойстиком.','Time is frozen. Look around with a swipe or the joystick.'],
  timelinehint:['Тяни ползунок, чтобы выбрать момент','Drag to choose your moment'],
  outside:['Снаружи ↗','Outside ↗'],inside:['В салон ↙','Inside ↙'],reset:['Взгляд вперёд','Look forward'],gyro:['Движением телефона','Phone motion'],
  cached:['7,4 секунды · можно остановить в любой момент','7.4 seconds · pause at any moment'],
 });
}
if((import.meta.env.VITE_DRIVE_MODE==='true'||new URLSearchParams(location.search).get('mode')==='drive'||/^\/roadster-play(?:\/|$)/.test(location.pathname)))Object.assign(phrases,{concept:['ROADSTER / EXPERIENCE','ROADSTER / EXPERIENCE'],welcome:['OFF THE<br><em>GROUND.</em>','OFF THE<br><em>GROUND.</em>'],intro:['Город для невозможных трюков.<br>Разгоняйся, летай, держись на стенах.','A playground for impossible stunts.<br>Drive, fly and ride the walls.'],start:['Играть ↗','Play ↗'],drive:['Поехали →','Drive →'],cached:['90 секунд на рекорд / Свободный заезд','90-second challenge / Free roam'],boardinghint:['Свайп — осмотр. Джойстик — руль.','Swipe to look. Joystick to steer.']});
export function t(key,values={}){let s=phrases[key]?.[en?1:0]??key;for(const [k,v]of Object.entries(values))s=s.replaceAll(`{${k}}`,String(v));return s;}
export function setupLanguage(){
 const adaptedCredit=document.createElement('p');
 adaptedCredit.innerHTML=en?'Exterior: authored photographic reconstruction with retained cabin and tyres; not factory CAD. Driver: <a href="https://www.mixamo.com/" target="_blank" rel="noopener">Adobe Mixamo — Remy</a>. Seating, hands and head motion adapted.':'Кузов: авторская реконструкция по фотографиям с готовыми салоном и шинами; не заводская CAD-модель. Водитель: <a href="https://www.mixamo.com/" target="_blank" rel="noopener">Adobe Mixamo — Remy</a>. Посадка, руки и движения головы адаптированы.';
 document.querySelector('#credits').appendChild(adaptedCredit);
 document.documentElement.lang=language;
 for(const node of document.querySelectorAll('[data-i18n]'))node.textContent=t(node.dataset.i18n);
 for(const node of document.querySelectorAll('[data-i18n-html]'))node.innerHTML=t(node.dataset.i18nHtml);
 document.querySelector('#view').setAttribute('aria-label',t('viewoutside'));
 document.querySelector('#view').title=t('viewoutside');
 document.querySelector('#settings-open').setAttribute('aria-label',t('menu'));
 document.querySelector('#settings-close').setAttribute('aria-label',t('close'));
 document.querySelector('#credits-open').setAttribute('aria-label',t('credits'));
 document.querySelector('#credits-close').setAttribute('aria-label',t('close'));
 document.querySelector('#sound').title=t('soundon');
 document.querySelector('#look-stick').setAttribute('aria-label',en?'Look joystick. Hold and move, or use arrow keys.':'Осмотр джойстиком. Удерживай и двигай; клавиши со стрелками тоже работают.');
 document.querySelector('#load-progress').setAttribute('aria-label',en?'Scene loading':'Загрузка сцены');
 document.querySelector('#experience').setAttribute('aria-label',en?'Ride inside the Roadster':'Поездка внутри Roadster');
 for(const node of document.querySelectorAll('[data-language]')){const url=new URL(location.href);url.searchParams.set('lang',node.dataset.language);node.href=url.pathname+url.search;node.setAttribute('aria-current',node.dataset.language===language?'true':'false');}
 if(en){
  const credits=document.querySelector('#credits');
  const replacements=[['ИСХОДНЫЕ МАТЕРИАЛЫ','SOURCE MATERIALS'],['Собрано из готового.','Built from existing assets.'],['Площадка, рампа и исходное движение:','Site, ramp and original motion:'],['Движение без замедления.','Motion without slow motion.'],['Автомобиль и салон:','Car and interior:'],['Масштаб, материалы, крыша и детализация адаптированы. Файл предоставлен в','Scale, materials, roof and detail adapted. File supplied by'],['проекте Steven Zhang','Steven Zhang’s project'],['Дальний город:','Distant city:'],['Небо и асфальт:','Sky and asphalt:'],['и <a','and <a'],['Расстановка, масштаб и освещение адаптированы.','Layout, scale and lighting adapted.'],['Three.js и его готовые компоненты освещения: MIT. Звук синтезируется в браузере.','Three.js and its ready lighting components: MIT. Sound synthesized in the browser.'],['Авторский концепт. Не связан с Tesla или SpaceX и не демонстрирует реальные характеристики автомобиля.','Independent concept. Not affiliated with Tesla or SpaceX and does not represent real vehicle performance.']];
  for(const [from,to]of replacements)credits.innerHTML=credits.innerHTML.replaceAll(from,to);
 }
}
export function passengerCredit(){return en?'Passenger: hammer.gamedev — Hight Quality Realistic Girl Character. Seating, hair, materials and secondary motion adapted.':'Пассажирка: hammer.gamedev — Hight Quality Realistic Girl Character. Посадка, волосы, материалы и вторичные движения адаптированы.';}
