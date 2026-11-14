
(()=>{'use strict';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const VALID_SCENES=['fortress','crypt','letter'];
const themes={fortress:'TWIERDZA NA WZGÓRZU',crypt:'KRYPTA POD KAPLICĄ',letter:'LIST Z PIECZĘCIĄ'};
const uid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():'local-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(n,low,high,otherwise=0)=>{const v=Number(n);return Number.isFinite(v)?Math.max(low,Math.min(high,Math.trunc(v))):otherwise};
let room=null,session=null,snapshot=null,selectedToken=null,selectedHeroId=null,tab='map',layout=params.get('layout')==='tactical'?'tactical':'classic',die=20,lastFeed='',refreshing=false,needsRefresh=false,refreshTimer=null,lastRoster='',lastHeroes='',off=null,tick=null,pulse=null,working=false;
let timeoutToast;
function textNode(tag,text,className){const el=document.createElement(tag);if(className)el.className=className;el.textContent=String(text??'');return el}
function clear(el){el.replaceChildren()}
function notice(message){const el=$('room-alert');el.textContent=String(message||'');el.hidden=false;clearTimeout(timeoutToast);timeoutToast=setTimeout(()=>el.hidden=true,4700)}
function error(message){$('workspace').hidden=true;const box=$('room-error');box.hidden=false;clear(box);box.append(textNode('h1','Nie udało się wejść do pokoju.'),textNode('p',message||'Sprawdź konfigurację połączenia.'));const a=textNode('a','Wróć do portalu');a.href='../StreamHouse-Portal.html';box.append(a);$('connection-status').textContent='BRAK POŁĄCZENIA'}
function titleFromPortal(id){try{const v=JSON.parse(localStorage.getItem('streamhouse:portal:v1'));const c=v?.campaigns?.find(x=>x.id===id);return c?.name||'Pokój demonstracyjny'}catch{return'Pokój demonstracyjny'}}
function setConnection(str){$('connection-status').textContent=str;$('connection-status').className='status '+(session?.mode==='online'?'online':'demo')}
async function start(){
 try{
   if(params.has('campaign')){
     const id=params.get('campaign');if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('Nieprawidłowy identyfikator kampanii.');
     const cloud=window.StreamHouseCloud;
     await cloud.init();const user=cloud.user();if(!user)throw Error('Najpierw zaloguj się do portalu przez Discord. Z konta uzyskasz dostęp do swoich kampanii.');
     const displayName=String(user.user_metadata?.full_name||user.user_metadata?.name||user.user_metadata?.preferred_username||'Awanturnik').slice(0,50);
     room=await window.StreamHouseRoom.online(id,{id:user.id,displayName});
     session={mode:'online',isGM:room.isGM,userId:user.id,displayName,name:room.campaign.title,campaignId:id};
   }else{throw Error('Otwórz pokój z listy swoich kampanii online w portalu StreamHouse.');}
   $('room-title').textContent=session.name;
   setLayout(layout);
   $('legacy-room-link').href='../rozgrywka/StreamHouse-v21-'+(session.isGM?'MG':'Gracz')+'.html';
   $('room-kind').textContent='ONLINE / DISCORD';
   $('role-badge').textContent=session.isGM?'MISTRZ GRY':'GRACZ';
   $('initiative-controls').hidden=!session.isGM;
   $('edit-scene').hidden=!session.isGM;
   $('shared-notes-form').hidden=!session.isGM;
   $('classic-notes-form').hidden=!session.isGM;
   $('gm-notes-panel').hidden=!session.isGM;
   $('handout-panel').hidden=!session.isGM;
   $('token-control').hidden=!session.isGM;
   $('roll-hint').textContent='Rzuty online są generowane i zapisywane na serwerze.';
   if(session.mode==='demo'){
     const link=document.createElement('a');link.className='mini-link';link.id='preview-player';const u=new URL(location.href);u.searchParams.set('role',session.isGM?'player':'gm');link.href=u.href;link.target='_blank';link.rel='noopener';link.textContent=session.isGM?'Otwórz widok gracza ↗':'Otwórz widok MG ↗';$('role-badge').after(link);
   }
   $('workspace').hidden=false;
   await room.heartbeat();await refresh(true);
   off=room.subscribe(()=>scheduleRefresh());
   tick=setInterval(()=>{if(!document.hidden)scheduleRefresh()},18000);
   pulse=setInterval(()=>{if(!document.hidden)room.heartbeat().catch(e=>notice('Brak odświeżenia obecności: '+e.message))},25000);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleRefresh()});
   window.addEventListener('pagehide',()=>{off?.();clearTimeout(refreshTimer);clearInterval(tick);clearInterval(pulse)},{once:true});
   setConnection(session.mode==='online'?'POŁĄCZONO':'TRYB LOKALNY');
 }catch(e){error(e.message||String(e));}
}
function scheduleRefresh(){if(document.hidden||refreshTimer)return;refreshTimer=setTimeout(()=>{refreshTimer=null;if(refreshing){needsRefresh=true;return}refresh().catch(e=>{setConnection('PROBLEM Z SIECIĄ');notice(e.message)})},200)}
async function refresh(initial=false){
 if(refreshing){needsRefresh=true;return}
 refreshing=true;
 try{
   const next=await room.read();
   const changed=!snapshot||snapshot.state?.revision!==next.state?.revision;
   const eventChanged=!snapshot||snapshot.events?.at(-1)?.id!==next.events?.at(-1)?.id||snapshot.events.length!==next.events.length;
   const rosterState=JSON.stringify(next.presence),heroState=JSON.stringify(next.characters);
   const rosterChanged=!snapshot||rosterState!==lastRoster;
   const heroChanged=!snapshot||heroState!==lastHeroes;
   lastRoster=rosterState;lastHeroes=heroState;
   snapshot=next;
   if(changed)renderScene();
   if(rosterChanged)renderRoster();
   if(heroChanged){renderHeroes();if(selectedHeroId&&document.activeElement?.closest('#hero-sheet-form')===null)renderHeroSheet();}
   if(eventChanged)renderFeed();
   if(initial&&session.isGM)$('gm-notes').value=next.notes||'';
   if(session.mode==='online')setConnection('POŁĄCZONO');
 }finally{refreshing=false;if(needsRefresh){needsRefresh=false;queueMicrotask(scheduleRefresh)}}
}
function state(){return snapshot?.state?.payload||window.StreamHouseRoom.DEFAULT}
async function doAction(fn){if(working)return;working=true;try{await fn()}catch(e){notice(e.message||String(e))}finally{working=false}}
async function commit(edit){if(!session?.isGM)throw Error('Tylko MG może zmienić przebieg sesji.');if(!snapshot)throw Error('Trwa wczytywanie sceny.');const previous=snapshot.state;const payload=clone(previous.payload);edit(payload);await room.update(previous.revision,payload);await refresh();}
function renderScene(){
 const data=state();
 $('scene-chapter').textContent=data.chapter||'ROZDZIAŁ I';
 $('scene-title').textContent=data.scene||'Nieznana kraina';
 $('scene-narration').textContent=data.narration||'';
 const theme=VALID_SCENES.includes(data.theme)?data.theme:'fortress';
 $('scene-art').dataset.theme=theme;$('scene-art').setAttribute('aria-label',themes[theme]);$('scene-stamp').textContent='LOKACJA / '+themes[theme];
 $('public-notes').textContent=data.sharedNote||'Drużyna nie zapisała jeszcze żadnych ustaleń.';
 $('classic-public-notes').textContent=data.sharedNote||'Kronika czeka na pierwsze ustalenia drużyny.';
 if(document.activeElement!==$('classic-notes-input'))$('classic-notes-input').value=data.sharedNote||'';
 renderInitiative();renderMap();
}
function renderRoster(){
 const root=$('roster');clear(root);const now=Date.now();let active=0;
 const list=(snapshot?.presence||[]).filter(p=>p.user_id!==room?.campaign?.owner_id).slice().sort((a,b)=>(b.user_id===session.userId)-(a.user_id===session.userId));
 if(!list.length){root.append(textNode('p','Brak aktywnych graczy.','faint'))}
 for(const member of list){const isActive=now-new Date(member.last_seen).getTime()<60000;if(isActive)active++;
 const row=textNode('div','','member');const avatar=textNode('span',(member.display_name||'?').slice(0,1).toUpperCase(),'letter');const who=textNode('div','','who');who.append(textNode('strong',member.display_name||'Awanturnik'),textNode('small',member.user_id===session.userId?'Ty':isActive?'W pokoju':'Nieaktywny'));const dot=textNode('i','','on-dot'+(isActive?' active':''));row.append(avatar,who,dot);root.append(row)}
 $('player-count').textContent=active+(active===1?' aktywny':' aktywnych');
}
function initialHero(h){
 const char=h?.character||{};const derived=char.sheet?.derived||{};
 const max=clamp(derived.hitPoints??char.maxHp??char.hp??10,1,999,10);
 const inventory=Array.isArray(derived.startingEquipment)?derived.startingEquipment.map(v=>typeof v==='string'?v:typeof v?.name==='string'?v.name:JSON.stringify(v)).slice(0,100):[];
 return {hp:clamp(char.hp??max,0,max,max),max_hp:max,inventory,revision:-1};
}
function renderHeroes(){const root=$('shared-heroes');clear(root);const heroes=snapshot?.characters||[];
 if(!heroes.length){root.append(textNode('p',session?.mode==='demo'?'Stwórz bohatera w portalu, a jego karta pojawi się tutaj.':'Brak udostępnionych kart. Udostępnij je w portalu.','faint'));$('hero-sheet').hidden=true;return;}
 for(const h of heroes){const status=h.session||initialHero(h);const row=textNode('button','','member hero-entry-session'+(selectedHeroId===h.id?' selected':''));row.type='button';
 const avatar=textNode('span',String(h.name||'?').slice(0,1),'letter'),who=textNode('div','','who');who.append(textNode('strong',h.name||'Bohater'),textNode('small',[(h.character?.kind||h.character?.speciesId||''),(h.character?.className||h.character?.classId||''),'HP '+status.hp+'/'+status.max_hp].filter(Boolean).join(' · ')));
 row.append(avatar,who);row.onclick=()=>{selectedHeroId=h.id;renderHeroes();renderHeroSheet()};root.append(row)}
}
function renderHeroSheet(){const entry=(snapshot?.characters||[]).find(h=>h.id===selectedHeroId);const panel=$('hero-sheet');if(!entry){panel.hidden=true;return}
 const info=entry.character||{},derived=info.sheet?.derived||{},st=entry.session||initialHero(entry);
 panel.hidden=false;$('hero-sheet-name').textContent=entry.name;$('hero-sheet-type').textContent=[info.kind||info.speciesId||'',info.className||info.classId||'',info.background||info.backgroundId||''].filter(Boolean).join(' · ')||'Karta bohatera';
 $('hero-hp').value=st.hp;$('hero-maxhp').value=st.max_hp;$('hero-inventory').value=(Array.isArray(st.inventory)?st.inventory:[]).join('\n');
 const canEdit=session?.isGM||entry.owner_id===session?.userId;
 $('hero-hp').disabled=!canEdit;$('hero-maxhp').disabled=!canEdit;$('hero-inventory').disabled=!canEdit;$('hero-save').disabled=!canEdit;
 $('hero-edit-hint').textContent=canEdit?'Zmieniasz stan postaci w tej kampanii, nie oryginalną kartę w kreatorze.':'Podgląd. Stan zmienia właściciel postaci lub MG.';
 const labels={str:'SIŁ',dex:'ZRE',con:'KON',int:'INT',wis:'MĄD',cha:'CHA'};const box=$('hero-attributes');clear(box);
 for(const [key,label] of Object.entries(labels)){const d=textNode('div','');const val=derived.attributes?.[key];d.append(textNode('span',label),textNode('strong',Number.isFinite(Number(val))&&val!==undefined?val:'–'));box.append(d)}
}
function setLayout(next){layout=next==='tactical'?'tactical':'classic';document.body.dataset.layout=layout;
 $('room-mode-switch').textContent=layout==='classic'?'Włącz planszę':'Pokój fabularny';
 $('room-mode-switch').title=layout==='classic'?'Przejdź do opcjonalnej planszy taktycznej':'Wróć do opowieści bez pionków';
 $('room-mode-switch').setAttribute('aria-label',$('room-mode-switch').title);
 const url=new URL(location.href);url.searchParams.set('layout',layout);history.replaceState(null,'',url);
 try{localStorage.setItem('streamhouse:room:layout:'+ (session?.campaignId||'default'),layout)}catch{}
}

function renderInitiative(){
 const root=$('initiative-list');clear(root);const list=Array.isArray(state().initiative)?state().initiative:[];
 const current=state().currentTurn;
 const who=list.find(x=>x.id===current);$('turn-label').textContent=who?'Tura: '+who.name:'Brak tury';
 if(!list.length){root.append(textNode('p','Inicjatywa nie została jeszcze ustalona.','faint'));return}
 for(const item of list){const btn=textNode('button','','order-item'+(item.id===current?' active':''));btn.type='button';btn.disabled=!session.isGM;btn.title='Ustaw aktywną turę';btn.append(textNode('span',clamp(item.score,-30,99),'order-score'),textNode('span',item.name,'order-name'));if(item.id===current)btn.append(textNode('span','TERAZ','turn-mark'));
 btn.addEventListener('click',()=>doAction(async()=>{await commit(p=>p.currentTurn=item.id)}));root.append(btn)}
}
function renderMap(){
 const root=$('battlemap');clear(root);const data=state();const pieces=Array.isArray(data.tokens)?data.tokens:[];
 if(!pieces.some(t=>t.id===selectedToken))selectedToken=null;
 for(let y=0;y<8;y++)for(let x=0;x<10;x++){
 const tile=textNode('button','','tile'+(session.isGM?' usable':''));tile.type='button';tile.disabled=!session.isGM;tile.setAttribute('aria-label','Pole '+(x+1)+', '+(y+1));
 const item=pieces.find(t=>t.x===x&&t.y===y);
 if(item){tile.classList.add('has-token');if(item.id===selectedToken)tile.classList.add('selected');tile.append(textNode('span',item.name?.slice(0,2).toUpperCase()||'??','token'+(item.npc?' npc':'')));tile.title=item.name}
 tile.addEventListener('click',()=>doAction(async()=>{
  if(!session.isGM)return;
  if(item&&!selectedToken){selectedToken=item.id;renderMap();return}
  if(item&&selectedToken===item.id){selectedToken=item.id;renderMap();return}
  if(!selectedToken){notice('Wybierz pionek z listy, zanim go przesuniesz.');return}
  if(item&&item.id!==selectedToken){notice('To pole jest zajęte przez inny pionek.');return}
  await commit(s=>{const t=s.tokens.find(t=>t.id===selectedToken);if(t){t.x=x;t.y=y}});
 }));root.append(tile)
 }
 const picks=$('token-picks');clear(picks);
 for(const t of pieces){const b=textNode('button',t.name,'token-pick'+(selectedToken===t.id?' active':''));b.type='button';b.disabled=!session.isGM;b.title='Wybierz pionek '+t.name;b.onclick=()=>{selectedToken=t.id;renderMap()};picks.append(b)}
 $('remove-token').disabled=!selectedToken;
 $('map-hint').textContent=session.isGM?'Wybierz pionek, a następnie pole docelowe. Zmiany widzą wszyscy uczestnicy.':'Pozycje pionków ustawia Mistrz Gry.';
}
function feedActor(e){return (snapshot?.presence||[]).find(p=>p.user_id===e.actor_id)?.display_name||(e.actor_id===session.userId?session.displayName:'Uczestnik')}
function renderFeed(){
 const feed=$('feed-entries');const nearBottom=feed.scrollHeight-feed.scrollTop-feed.clientHeight<95;clear(feed);
 const entries=snapshot?.events||[];
 if(!entries.length){feed.append(textNode('p','Kronika jest pusta. Pierwszy rzut albo wiadomość rozpocznie opowieść.','faint'))}
 for(const e of entries){const el=textNode('article','','entry '+e.kind);const header=textNode('div','','entry-meta');header.append(textNode('strong',feedActor(e)));const when=new Date(e.created_at);header.append(textNode('time',Number.isNaN(when.getTime())?'':when.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})));el.append(header);
 if(e.kind==='roll'){el.append(textNode('p',e.body),textNode('span',`D${e.meta?.sides||'?'}: ${e.meta?.value??'?'} ${Number(e.meta?.modifier)>0?'+ ':Number(e.meta?.modifier)<0?'− ':''}${Number(e.meta?.modifier)?Math.abs(Number(e.meta.modifier)):' '} = ${e.meta?.total??'?'} `,'result'))}
 else if(e.kind==='handout'){el.append(textNode('p','UJAWNIONO WSKAZÓWKĘ'),textNode('p',e.body))}
 else el.append(textNode('p',e.body));
 feed.append(el)
 }
 if(nearBottom)feed.scrollTop=feed.scrollHeight;
}
function showTab(selected){tab=selected;document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===selected)));$('map-panel').hidden=selected!=='map';$('notes-panel').hidden=selected!=='notes';if(selected==='notes'&&session?.isGM&&document.activeElement!==$('shared-notes-edit'))$('shared-notes-edit').value=String(state().sharedNote||'');}
function install(){
 document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>showTab(btn.dataset.tab)));
 $('room-mode-switch').onclick=()=>setLayout(layout==='classic'?'tactical':'classic');
 $('hero-sheet-close').onclick=()=>{selectedHeroId=null;$('hero-sheet').hidden=true;renderHeroes()};
 $('hero-sheet-form').addEventListener('submit',e=>{e.preventDefault();doAction(async()=>{
  const entry=(snapshot?.characters||[]).find(h=>h.id===selectedHeroId);if(!entry)throw Error('Nie znaleziono postaci.');
  const hp=Number($('hero-hp').value),max=Number($('hero-maxhp').value);
  const items=$('hero-inventory').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(items.length>100||items.some(x=>x.length>160))throw Error('Maksymalnie 100 przedmiotów, do 160 znaków każdy.');
  await room.saveCharacter(entry.id,entry.session?.revision??-1,{hp,max_hp:max,inventory:items});await refresh();renderHeroSheet();notice('Zapisano stan bohatera w kampanii.');
 })});
 $('classic-notes-form').addEventListener('submit',e=>{e.preventDefault();doAction(async()=>{await commit(s=>s.sharedNote=$('classic-notes-input').value.slice(0,4000));notice('Zapisano wspólne ustalenia.');})});
 $('dice-close').onclick=()=>{$('dice-view').hidden=true};
 if($('premium-close'))$('premium-close').onclick=()=>{$('premium-dice-modal').hidden=true};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('dice-view').hidden)$('dice-view').hidden=true});
 $('edit-scene').onclick=()=>{const show=$('editing-panel').hidden;$('editing-panel').hidden=!show;if(show){const s=state();$('edit-chapter').value=s.chapter||'';$('edit-title').value=s.scene||'';$('edit-description').value=s.narration||'';$('edit-theme').value=VALID_SCENES.includes(s.theme)?s.theme:'fortress'}};
 $('cancel-edit').onclick=()=>$('editing-panel').hidden=true;
 $('scene-form').addEventListener('submit',e=>{e.preventDefault();doAction(async()=>{const chapter=$('edit-chapter').value.trim().slice(0,70),scene=$('edit-title').value.trim().slice(0,80),narration=$('edit-description').value.trim().slice(0,1400),theme=$('edit-theme').value;if(!chapter||!scene||!narration)throw Error('Uzupełnij wszystkie pola sceny.');await commit(s=>{Object.assign(s,{chapter,scene,narration,theme:VALID_SCENES.includes(theme)?theme:'fortress'})});$('editing-panel').hidden=true;notice('Opublikowano nową scenę.');})});
 $('initiative-form').addEventListener('submit',e=>{e.preventDefault();doAction(async()=>{const name=$('initiative-name').value.trim().slice(0,40),score=clamp($('initiative-score').value,-30,99);if(!name||!$('initiative-score').value)throw Error('Podaj nazwę oraz inicjatywę.');await commit(s=>{if(!Array.isArray(s.initiative))s.initiative=[];if(s.initiative.length>=40)throw Error('Limit 40 wpisów w kolejce.');s.initiative.push({id:uid(),name,score});s.initiative.sort((a,b)=>b.score-a.score);if(!s.currentTurn)s.currentTurn=s.initiative[0].id});$('initiative-name').value='';$('initiative-score').value='';})});
 $('next-turn').onclick=()=>doAction(()=>commit(s=>{const list=s.initiative||[];if(!list.length)throw Error('Dodaj uczestnika do inicjatywy.');const pos=list.findIndex(x=>x.id===s.currentTurn);s.currentTurn=list[(pos+1)%list.length].id}));
 $('reset-turns').onclick=()=>doAction(()=>commit(s=>{s.initiative=[];s.currentTurn=null}));
 $('token-form').addEventListener('submit',e=>{e.preventDefault();doAction(async()=>{const name=$('token-name').value.trim().slice(0,30);if(!name)throw Error('Podaj nazwę pionka.');await commit(s=>{if(!Array.isArray(s.tokens))s.tokens=[];if(s.tokens.length>=30)throw Error('Limit 30 pionków.');let free=null;for(let y=0;y<8&&!free;y++)for(let x=0;x<10;x++)if(!s.tokens.some(t=>t.x===x&&t.y===y)){free={x,y};break}if(!free)throw Error('Brak wolnego pola.');const id=uid();s.tokens.push({id,name,x:free.x,y:free.y,npc:false});selectedToken=id});$('token-name').value='';})});
 $('remove-token').onclick=()=>doAction(async()=>{if(!selectedToken)return;await commit(s=>s.tokens=s.tokens.filter(t=>t.id!==selectedToken));selectedToken=null});
 $('shared-notes-form').addEventListener('submit',e=>{e.preventDefault();doAction(async()=>{const note=$('shared-notes-edit').value.slice(0,4000);await commit(s=>s.sharedNote=note);notice('Zapisano wspólne ustalenia.');})});
 $('gm-notes-form').addEventListener('submit',e=>{e.preventDefault();doAction(async()=>{await room.notes($('gm-notes').value);notice('Prywatne notatki zapisane.');})});
 $('chat-form').addEventListener('submit',e=>{e.preventDefault();doAction(async()=>{const text=$('chat-input').value.trim();if(!text)return;await room.post('chat',text);$('chat-input').value='';await refresh();})});
 $('handout-form').addEventListener('submit',e=>{e.preventDefault();doAction(async()=>{const text=$('handout-text').value.trim();if(!text)throw Error('Wpisz treść wskazówki.');await room.post('handout',text);$('handout-text').value='';await refresh();notice('Wskazówka ujawniona wszystkim uczestnikom.');})});
 document.querySelectorAll('[data-die]').forEach(btn=>btn.addEventListener('click',()=>{die=Number(btn.dataset.die);document.querySelectorAll('[data-die]').forEach(x=>x.classList.toggle('active',x===btn))}));
 $('roll-form').addEventListener('submit',e=>{e.preventDefault();doAction(async()=>{const mod=clamp($('roll-modifier').value,-30,30),label=($('roll-name').value.trim()||'Rzut D'+die).slice(0,60);const result=await room.roll(die,mod,label);await refresh();
 const val=result?.value??result?.meta?.value;const total=result?.total??result?.meta?.total;
 if(Number.isFinite(Number(val))){
    const premium=$('premium-dice-modal'),iframe=$('premium-dice-frame');
    const options={sides:die,value:Number(val),modifier:mod,title:label,theme:(localStorage.getItem('streamhouse:dice:theme')||'goblin')};
    const message=()=>iframe.contentWindow?.postMessage({type:'streamhouse:display-server-roll',options},location.origin);
    if(premium&&iframe){
      premium.hidden=false;
      if(!iframe.getAttribute('src')){iframe.addEventListener('load',message,{once:true});iframe.src='../rozgrywka/StreamHouse-v21-Pracownia-Kosci.html?embed=1';}
      else if(iframe.contentDocument?.readyState==='complete')message();
      else iframe.addEventListener('load',message,{once:true});
    }else if(window.StreamHouseRitual){
      $('dice-view').hidden=false;$('dice-result-title').textContent=label;
      try{await window.StreamHouseRitual.play($('dice-canvas'),{sides:die,value:Number(val),total:Number(total),modifier:mod});}catch(err){$('dice-total').textContent='Wynik: '+total;}
    }
  }
})});
 showTab('map');
}
install();start();
})();
