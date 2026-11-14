(function overlayRuntime(){
'use strict';
const C=window.StreamHouseCloud;if(!C?.configured)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
let mounted=null,mounting=false;
async function mount(){
 if(mounting||mounted)return;mounting=true;
 try{
  const result=await C.init();if(!result.user?.id||mounted)return;
  const toggle=document.createElement('button');toggle.type='button';toggle.className='shm-overlay-toggle';toggle.textContent='✉ Czat';toggle.setAttribute('aria-expanded','false');
  const panel=document.createElement('div');panel.className='shm-overlay';panel.hidden=true;
  panel.innerHTML=`<section class="shm-shell" aria-label="Prywatny czat StreamHouse"><div class="shm-head"><div><span class="shm-eyebrow">STREAMHOUSE · WIADOMOŚCI</span><h3>Przy <em>ognisku.</em></h3></div><button type="button" data-ov="close" class="shm-button">Zamknij</button></div>
<div class="shm-own"><span>Twoje ID</span><code data-ov-id></code><button type="button" class="shm-button" data-ov="copy">Kopiuj</button><button type="button" class="shm-button gold" data-ov="share">Udostępnij</button></div>
<form data-ov-invite class="shm-invite"><label>Dodaj znajomego po ID</label><div><input required data-ov-target maxlength="36" placeholder="ID konta StreamHouse" autocomplete="off"><button class="shm-button gold">Zaproś</button></div></form>
<div class="shm-notice" data-ov-notice role="status"></div>
<div class="shm-grid"><section class="shm-peers"><div data-ov-friends>Ładowanie kontaktów…</div></section><section class="shm-thread"><div id="shm-thread-title" data-ov-title>Wybierz rozmowę</div><div class="shm-feed" data-ov-feed><p class="shm-muted">Wybierz znajomego.</p></div><form data-ov-send><input data-ov-message maxlength="1000" autocomplete="off" placeholder="Wybierz znajomego…" disabled required><button class="shm-button gold" disabled>Wyślij</button></form></section></div></section>`;
  document.body.append(toggle,panel);
  let selected='',friends={me:result.user.id,links:[],profiles:[]},alive=true,loading=false,chatting=false,unsubscribe=null,tick=null;
  const q=k=>panel.querySelector('[data-ov-'+k+']');
  const note=(s,bad=false)=>{const n=q('notice');n.textContent=s||'';n.classList.toggle('bad',bad)};
  const nameOf=id=>friends.profiles.find(p=>p.id===id)?.display_name||('Gracz '+id.slice(0,8));
  const peer=l=>l.low_id===friends.me?l.high_id:l.low_id;
  function contacts(){
    const ok=friends.links.filter(l=>l.status==='accepted'),pending=friends.links.filter(l=>l.status==='pending');
    q('id').textContent=friends.me;
    q('friends').innerHTML=`<div class="shm-section">ZNAJOMI · ${ok.length}</div>`+
      (ok.map(l=>`<div class="shm-peer ${selected===peer(l)?'current':''}"><div class="shm-peer-name"><strong>${esc(nameOf(peer(l)))}</strong><small>${esc(peer(l).slice(0,8))}…</small></div><button type="button" class="shm-button" data-ov="open" data-peer="${esc(peer(l))}">Rozmowa</button></div>`).join('')||'<p class="shm-muted">Brak zaakceptowanych znajomych.</p>')+
      `<div class="shm-section">ZAPROSZENIA · ${pending.length}</div>`+
      (pending.map(l=>`<div class="shm-request"><small>${l.requested_by===friends.me?'Oczekuje na odpowiedź':'Nowe zaproszenie'} · ${esc(peer(l).slice(0,8))}</small><div>${l.requested_by===friends.me?`<button type="button" class="shm-button" data-ov="remove" data-peer="${esc(peer(l))}">Cofnij</button>`:`<button type="button" class="shm-button gold" data-ov="accept" data-peer="${esc(peer(l))}">Przyjmij</button><button type="button" class="shm-button" data-ov="reject" data-peer="${esc(peer(l))}">Odrzuć</button>`}</div></div>`).join('')||'<p class="shm-muted">Brak oczekujących zaproszeń.</p>');
  }
  async function loadFriends(){
   if(!alive||loading)return;loading=true;
   try{
    const latest=await C.listFriends();if(!alive)return;friends=latest;
    if(selected&&!friends.links.some(l=>l.status==='accepted'&&peer(l)===selected))selected='';
    contacts();q('message').disabled=!selected;q('send').querySelector('button').disabled=!selected;
    if(!selected){q('title').textContent='Wybierz rozmowę';q('feed').innerHTML='<p class="shm-muted">Wybierz znajomego.</p>'}
   }catch(err){note(err.message||String(err),true)}finally{loading=false}
  }
  async function loadThread(){
   if(!selected||!alive||chatting)return;chatting=true;const target=selected;
   try{
    const rows=await C.listDirectMessages(target);if(!alive||target!==selected)return;
    q('title').textContent=nameOf(target);q('message').placeholder='Napisz wiadomość…';
    const feed=q('feed');const bottom=feed.scrollHeight-feed.scrollTop-feed.clientHeight<110;
    feed.innerHTML=rows.length?rows.reverse().map(m=>`<article class="shm-bubble ${m.sender_id===friends.me?'mine':''}"><p>${esc(m.body)}</p><time>${esc(new Date(m.created_at).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}))}</time></article>`).join(''):'<p class="shm-muted">Jeszcze nic tu nie napisano.</p>';
    if(bottom)feed.scrollTop=feed.scrollHeight;
   }catch(err){note(err.message||String(err),true)}finally{chatting=false}
  }
  async function refresh(){await loadFriends();await loadThread()}
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)refresh()});
  panel.addEventListener('click',async ev=>{
   const b=ev.target.closest('button[data-ov]');if(!b)return;
   try{
    if(b.dataset.ov==='close'){panel.hidden=true;toggle.setAttribute('aria-expanded','false');return}
    if(b.dataset.ov==='copy'){await navigator.clipboard.writeText(friends.me);note('Skopiowano ID.');return}
    if(b.dataset.ov==='share'){await C.copyFriendLink();note('Skopiowano link zaproszenia do znajomych.');return}
    if(b.dataset.ov==='open'){selected=b.dataset.peer;await refresh();return}
    if(b.dataset.ov==='accept'||b.dataset.ov==='reject'){await C.respondFriend(b.dataset.peer,b.dataset.ov==='accept');await refresh();return}
    if(b.dataset.ov==='remove'){await C.removeFriend(b.dataset.peer);selected='';await refresh()}
   }catch(err){note(err.message||String(err),true)}
  });
  q('invite').addEventListener('submit',async ev=>{ev.preventDefault();const input=q('target');try{await C.requestFriend(input.value);input.value='';await loadFriends();note('Wysłano zaproszenie.')}catch(err){note(err.message||String(err),true)}});
  q('message').addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();q('send').requestSubmit()}});
  q('send').addEventListener('submit',async ev=>{ev.preventDefault();if(!selected)return;const input=q('message'),message=input.value.trim();if(!message)return;const btn=q('send').querySelector('button');btn.disabled=true;try{await C.sendDirectMessage(selected,message);input.value='';await loadThread()}catch(err){note(err.message||String(err),true)}finally{btn.disabled=false}});
  await loadFriends();
  C.subscribeMessages(()=>{if(alive&&!panel.hidden)refresh()}).then(fn=>{if(alive)unsubscribe=fn;else fn()}).catch(()=>{});
  tick=setInterval(()=>{if(alive&&!panel.hidden&&document.visibilityState==='visible')refresh()},20000);
  mounted={destroy(){alive=false;clearInterval(tick);unsubscribe?.();panel.remove();toggle.remove()}};
 }catch(err){}finally{mounting=false}
}
window.addEventListener('streamhouse:cloud-change',()=>{if(!C.user()){mounted?.destroy();mounted=null}else mount()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();