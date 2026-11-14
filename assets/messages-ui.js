
(function(){
'use strict';
const host=document.getElementById('view-content');
if(!host)return;
const C=window.StreamHouseCloud;
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brief=s=>String(s||'').slice(0,8)+'…';
let instance=null;
function notify(el,text,bad=false){const n=el.querySelector('.shm-notice');if(!n)return;n.textContent=text||'';n.classList.toggle('bad',!!bad)}
function nameFor(data,id){const profile=data.profiles.find(p=>p.id===id);return profile?.display_name||('Użytkownik '+brief(id));}
function roomMarkup(){return `<section class="shm-shell" id="shm-root" aria-label="Wiadomości StreamHouse">
  <div class="shm-head"><div><span class="shm-eyebrow">POCZTA KRONIKARZY · ONLINE</span><h3>Wiadomości <em>przy ognisku.</em></h3></div><span class="shm-status">TYLKO ZNAJOMI</span></div>
  <div class="shm-own"><span>Twój identyfikator do zaproszeń</span><code id="shm-my-id"></code><button type="button" id="shm-copy" class="shm-button">Kopiuj ID</button><button type="button" id="shm-share-id" class="shm-button gold">Udostępnij</button></div>
  <form id="shm-invite" class="shm-invite"><label for="shm-target">Zaproś znajomego po jego ID</label><div><input id="shm-target" required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" maxlength="36" autocomplete="off" spellcheck="false"><button class="shm-button gold" type="submit">Wyślij zaproszenie</button></div></form>
  <div class="shm-notice" role="status" aria-live="polite"></div>
  <div class="shm-grid"><section class="shm-peers" aria-label="Kontakty online"><div id="shm-friends"><p class="shm-muted">Wczytywanie kontaktów…</p></div></section>
  <section class="shm-thread" aria-label="Prywatna rozmowa"><div id="shm-thread-title">Wybierz rozmowę</div><div id="shm-feed" class="shm-feed"><p class="shm-muted">Wiadomości są dostępne po zaakceptowaniu zaproszenia.</p></div>
    <form id="shm-send"><input id="shm-message" maxlength="1000" placeholder="Wybierz znajomego…" autocomplete="off" disabled required><button class="shm-button gold" type="submit" disabled>Wyślij</button></form></section></div>
</section>`}
function friendSection(data,selected){
  const my=data.me;
  const accepted=data.links.filter(x=>x.status==='accepted');
  const pending=data.links.filter(x=>x.status==='pending');
  let html='<div class="shm-section">ZNAJOMI ONLINE · '+accepted.length+'</div>';
  html+=accepted.length?accepted.map(l=>{
    const peer=l.low_id===my?l.high_id:l.low_id,label=nameFor(data,peer);
    return `<div class="shm-peer ${selected===peer?'current':''}"><div class="shm-peer-name"><strong>${e(label)}</strong><small>${e(brief(peer))}</small></div><button class="shm-button" data-shm-open="${peer}">Rozmowa</button><button class="shm-icon" data-shm-remove="${peer}" title="Usuń ze znajomych" aria-label="Usuń ${e(label)} ze znajomych">×</button></div>`;
  }).join(''):'<p class="shm-muted">Na razie nie masz zaakceptowanych znajomych.</p>';
  html+='<div class="shm-section">ZAPROSZENIA · '+pending.length+'</div>';
  html+=pending.length?pending.map(l=>{
    const peer=l.low_id===my?l.high_id:l.low_id;
    return `<div class="shm-request"><small>${l.requested_by===my?'Wysłane, oczekuje na odpowiedź':'Nowe zaproszenie od'} ${e(brief(peer))}</small><div>${l.requested_by===my?`<button class="shm-button" data-shm-remove="${peer}">Cofnij</button>`:`<button class="shm-button gold" data-shm-respond="${peer}" data-accept="yes">Przyjmij</button><button class="shm-button" data-shm-respond="${peer}" data-accept="no">Odrzuć</button>`}</div></div>`;
  }).join(''):'<p class="shm-muted">Brak oczekujących zaproszeń.</p>';
  return html;
}
function makeInstance(el){
  let alive=true,selected='',connections={me:'',links:[],profiles:[]},off=null,poll=null,refreshBusy=false,chatBusy=false;
  const by=id=>el.querySelector('#'+id);
  async function refreshFriends(){
    if(!alive||refreshBusy)return;
    refreshBusy=true;
    try{
      connections=await C.listFriends();if(!alive)return;
      by('shm-my-id').textContent=connections.me;
      const accepted=connections.links.filter(l=>l.status==='accepted').map(l=>l.low_id===connections.me?l.high_id:l.low_id);
      if(selected&&!accepted.includes(selected))selected='';
      by('shm-friends').innerHTML=friendSection(connections,selected);
      if(!selected){by('shm-thread-title').textContent='Wybierz rozmowę';by('shm-feed').innerHTML='<p class="shm-muted">Wybierz znajomego, aby zobaczyć wiadomości.</p>';}
      by('shm-message').disabled=!selected;by('shm-send').querySelector('button').disabled=!selected;
    }catch(err){notify(el,'Znajomi online: '+(err.message||err),true)}
    finally{refreshBusy=false}
  }
  async function refreshThread(){
    if(!alive||!selected||chatBusy)return;
    chatBusy=true;
    const peer=selected;
    try{
      const messages=await C.listDirectMessages(peer);if(!alive||peer!==selected)return;
      by('shm-thread-title').textContent=nameFor(connections,peer);
      by('shm-message').disabled=false;by('shm-message').placeholder='Napisz prywatną wiadomość…';
      by('shm-send').querySelector('button').disabled=false;
      const feed=by('shm-feed');const bottom=feed.scrollHeight-feed.scrollTop-feed.clientHeight<100;
      feed.innerHTML=messages.length?messages.reverse().map(m=>`<article class="shm-bubble ${m.sender_id===connections.me?'mine':''}"><p>${e(m.body)}</p><time>${e(new Date(m.created_at).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}))}</time></article>`).join(''):'<p class="shm-muted">Jeszcze żadnych wiadomości. Rozpocznij rozmowę.</p>';
      if(bottom)feed.scrollTop=feed.scrollHeight;
    }catch(err){notify(el,'Historia rozmowy: '+(err.message||err),true)}
    finally{chatBusy=false}
  }
  async function onChange(){await refreshFriends();await refreshThread()}
  const listener=async event=>{
    const button=event.target.closest('button');if(!button||!el.contains(button))return;
    button.disabled=true;
    try{
      if(button.id==='shm-copy'){
        await navigator.clipboard.writeText(connections.me);notify(el,'Skopiowano Twoje ID.');
      }else if(button.id==='shm-share-id'){
        await C.copyFriendLink();notify(el,'Skopiowano link zaproszenia do znajomych.');
      }else if(button.dataset.shmOpen){selected=button.dataset.shmOpen;await refreshFriends();await refreshThread();}
      else if(button.dataset.shmRemove){
        if(confirm('Usunąć tego znajomego lub cofnąć zaproszenie?')){
          await C.removeFriend(button.dataset.shmRemove);if(selected===button.dataset.shmRemove)selected='';await onChange();notify(el,'Usunięto kontakt online.');
        }
      }else if(button.dataset.shmRespond){await C.respondFriend(button.dataset.shmRespond,button.dataset.accept==='yes');await onChange();notify(el,'Zapisano odpowiedź na zaproszenie.');}
    }catch(err){notify(el,err.message||String(err),true)}finally{if(button.isConnected)button.disabled=false}
  };
  el.addEventListener('click',listener);
  by('shm-invite').addEventListener('submit',async event=>{
    event.preventDefault();const btn=event.currentTarget.querySelector('button');btn.disabled=true;
    try{await C.requestFriend(by('shm-target').value);by('shm-target').value='';notify(el,'Wysłano zaproszenie.');await refreshFriends()}catch(err){notify(el,err.message||String(err),true)}finally{btn.disabled=false}
  });
  by('shm-message').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();by('shm-send').requestSubmit();}});
  by('shm-send').addEventListener('submit',async event=>{
    event.preventDefault();if(!selected)return;const input=by('shm-message'),text=input.value.trim();if(!text)return;
    const btn=event.currentTarget.querySelector('button');btn.disabled=true;
    try{await C.sendDirectMessage(selected,text);input.value='';notify(el,'');await refreshThread()}catch(err){notify(el,err.message||String(err),true)}finally{btn.disabled=false}
  });
  (async()=>{
    await refreshFriends();if(!alive)return;
    try{off=await C.subscribeMessages(()=>{if(alive)onChange()})}catch(err){notify(el,'Realtime niedostępny. Odświeżanie okresowe działa nadal.',true)}
    if(!alive){off?.();return}
    poll=setInterval(()=>{if(document.visibilityState==='visible')onChange()},20000);
  })().catch(err=>notify(el,err.message||String(err),true));
  return {destroy(){alive=false;clearInterval(poll);off?.();el.removeEventListener('click',listener)}};
}
function check(){
 const isFriends=document.querySelector('.side-nav [data-view="friends"].active');
 const present=host.querySelector('#shm-root');
 if(!isFriends){if(instance){instance.destroy();instance=null}return}
 if(present)return;
 const loginNotice=host.querySelector('.shm-login');
 if(loginNotice && C?.user())loginNotice.remove();
 if(instance){instance.destroy();instance=null}
 const layout=host.querySelector('.friend-layout');if(!layout)return;
 if(!C?.configured){return}
 const wrapper=document.createElement('div');
 if(!C.user()){
   if(loginNotice)return;
   wrapper.className='shm-login';wrapper.textContent='Zaloguj się przez Discord, aby korzystać z zaproszeń i wiadomości.';
   layout.before(wrapper);return;
 }
 wrapper.innerHTML=roomMarkup();layout.before(wrapper);
 instance=makeInstance(wrapper.querySelector('#shm-root'));
}
const observer=new MutationObserver(check);
observer.observe(host,{childList:true});
window.addEventListener('streamhouse:cloud-change',()=>{if(!host.querySelector('#shm-root'))check()});
check();
})();
