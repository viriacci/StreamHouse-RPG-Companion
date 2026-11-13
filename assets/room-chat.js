/* StreamHouse v11.4: chat do oryginalnych okien v21, używa tej samej tabeli co /pokoj/. */
(function(){
'use strict';
const cloud=window.StreamHouseCloud,transport=window.StreamHouseRoom;
if(!transport)return;
const params=new URLSearchParams(location.search);
const campaign=params.get('campaign');
const isOnline=!!campaign;
const demoId=String(params.get('local')||'camp-demo').replace(/[^\w-]/g,'').slice(0,70)||'camp-demo';
const role=document.body.dataset.role==='gm'?'gm':'player';
const ownId=isOnline?'':('demo-'+role);
let room=null,db=null,me=ownId,off=null,poll=null,opened=false,busy=false,loaded=false;
const people=new Map();
const root=document.createElement('div');root.className='sh-room-chat';
root.innerHTML=`<button class="sh-chat-toggle" id="sh-chat-toggle" type="button" aria-expanded="false" aria-controls="sh-chat-panel">✉ Czat drużyny</button>
<section class="sh-chat-panel" id="sh-chat-panel" hidden aria-label="Czat drużyny"><div class="sh-chat-head"><strong>Głosy przy ognisku</strong><button id="sh-chat-close" aria-label="Zamknij czat" type="button">×</button></div>
<div class="sh-chat-status" id="sh-chat-status">Łączenie…</div><div class="sh-chat-messages" id="sh-chat-messages" role="log" aria-live="polite"></div>
<div class="sh-chat-alert" id="sh-chat-alert" role="status" aria-live="polite"></div><form class="sh-chat-form" id="sh-chat-form"><textarea id="sh-chat-text" maxlength="1200" placeholder="Wiadomość do drużyny…" required></textarea><button type="submit" disabled>Wyślij</button></form></section>`;
document.body.append(root);
const $=id=>root.querySelector('#'+id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message(text){$('sh-chat-alert').textContent=text||''}
function setStatus(t){$('sh-chat-status').textContent=t}
function open(){opened=true;$('sh-chat-panel').hidden=false;$('sh-chat-toggle').setAttribute('aria-expanded','true');if(loaded)refresh();$('sh-chat-text').focus()}
function close(){opened=false;$('sh-chat-panel').hidden=true;$('sh-chat-toggle').setAttribute('aria-expanded','false')}
$('sh-chat-toggle').addEventListener('click',()=>opened?close():open());
$('sh-chat-close').addEventListener('click',close);
async function rows(){
  if(!room)throw Error('Pokój jeszcze nie został połączony.');
  if(room.mode==='demo')return (await room.read()).events;
  const result=await db.from('sh_room_events').select('id,actor_id,kind,body,meta,created_at').eq('campaign_id',campaign)
    .order('id',{ascending:false}).limit(60);
  if(result.error)throw result.error;
  return result.data.reverse();
}
async function refresh(){
  if(!room||!opened||busy)return;
  busy=true;
  try{
    const entries=await rows();const feed=$('sh-chat-messages');const nearBottom=feed.scrollHeight-feed.scrollTop-feed.clientHeight<90;
    feed.innerHTML=entries.length?entries.map(x=>{
      const own=x.actor_id===me,kind=x.kind;
      const tag=kind==='roll'?'RZUT':kind==='handout'?'WSKAZÓWKA':own?'TY':x.actor_id==='demo-gm'?'MISTRZ GRY':x.actor_id==='demo-player'?'BOHATER':(people.get(x.actor_id)||'AWANTURNIK');
      const body=kind==='roll'?(x.body+' · '+(x.meta?.total??'')):x.body;
      return `<article class="sh-chat-msg ${own?'own':''} ${kind!=='chat'?'special':''}"><small>${esc(tag)} · ${esc(new Date(x.created_at).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}))}</small><p>${esc(body)}</p></article>`;
    }).join(''):'<p style="color:#b8aa89">Kronika rozmów jest pusta. Rozpocznij rozmowę.</p>';
    if(nearBottom)feed.scrollTop=feed.scrollHeight;
    message('');
  }catch(err){message('Czat: '+(err.message||String(err)))}finally{busy=false}
}
$('sh-chat-form').addEventListener('submit',async event=>{
  event.preventDefault();const input=$('sh-chat-text'),body=input.value.trim();if(!body||!room)return;
  const btn=event.currentTarget.querySelector('button');btn.disabled=true;
  try{await room.post('chat',body);input.value='';await refresh()}
  catch(err){message('Nie wysłano: '+(err.message||String(err)))}finally{btn.disabled=false}
});
async function init(){
  try{
    if(isOnline){
      if(!cloud?.configured)throw Error('Brak konfiguracji Supabase. Otwórz lokalny pokój z portalu lub skonfiguruj chmurę.');
      await cloud.init();if(!cloud.user())throw Error('Zaloguj się przez Discord w portalu, aby korzystać z czatu kampanii.');
      me=cloud.user().id;
      room=await transport.online(campaign,{displayName:cloud.user().user_metadata?.full_name||'Awanturnik'});
      db=await cloud.client();
      try{await room.heartbeat();const persons=await db.from('sh_room_presence').select('user_id,display_name').eq('campaign_id',campaign).limit(100);for(const person of (persons.data||[]))people.set(person.user_id,person.display_name)}catch{}
      setStatus('ONLINE · czat wspólny z pokojem sieciowym. Sceny i karty v21 pozostają lokalne.');
    }else{
      let nick='';try{nick=JSON.parse(localStorage.getItem('streamhouse:portal:v1')||'{}').nick||''}catch{}
      room=transport.local(demoId,{id:ownId,displayName:nick||'Awanturnik',isGM:role==='gm'});
      setStatus('DEMO LOKALNE · wiadomości tylko w oknach tej samej przeglądarki');
    }
    loaded=true;$('sh-chat-form').querySelector('button').disabled=false;
    off=room.subscribe(()=>{if(opened)refresh()});
    poll=setInterval(()=>{if(document.visibilityState==='visible'&&opened)refresh()},20000);
    if(opened)await refresh();
  }catch(err){setStatus('CZAT NIEDOSTĘPNY');message(err.message||String(err))}
}
window.addEventListener('pagehide',()=>{off?.();clearInterval(poll)});
init();
})();
