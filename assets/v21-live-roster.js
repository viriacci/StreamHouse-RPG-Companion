(function rosterRuntime(){
'use strict';
const params=new URLSearchParams(location.search),campaignId=params.get('campaign'),cloud=window.StreamHouseCloud;
if(!campaignId||!/^[0-9a-f-]{36}$/i.test(campaignId)||!cloud?.configured)return;
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const value=n=>Number.isFinite(Number(n))?String(n):'–';
let active=true,loading=false;
const returnToPortal=()=>location.replace(new URL('../StreamHouse-Portal.html#campaigns',location.href).href);
function miniCard(card){
 const ch=card.character||{},sheet=ch.sheet||{},derived=sheet.derived||{},attributes=derived.attributes||{};
 const modal=document.createElement('div');modal.className='sh-online-card-backdrop';
 modal.innerHTML=`<section class="sh-online-card" role="dialog" aria-modal="true" aria-label="Karta postaci"><button class="sh-online-close" type="button" aria-label="Zamknij">×</button><p class="sh-online-eyebrow">KARTA BOHATERA</p><h2>${escape(card.name)}</h2><p>${escape(ch.kind||'')} · ${escape(ch.className||'')} · poziom ${value(ch.level||1)}</p><div class="sh-online-stats"><div>HP <b>${value(derived.hitPoints)}</b></div><div>KP <b>${value(derived.armorClassUnarmored)}</b></div><div>INI <b>${value(derived.initiative)}</b></div></div><div class="sh-online-stats">${Object.entries({str:'SIŁ',dex:'ZRĘ',con:'KON',int:'INT',wis:'MĄD',cha:'CHA'}).map(([key,label])=>`<div>${label} <b>${value(attributes[key])}</b></div>`).join('')}</div><p>${escape(ch.background||'')}</p></section>`;
 const close=()=>modal.remove();modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('.sh-online-close'))close()});
 document.body.append(modal);modal.querySelector('.sh-online-close').focus();
}
function heroCard(card,me,kind){
 const ch=card.character||{},sheet=ch.sheet||{},d=sheet.derived||{},name=card.name||ch.name||'Bezimienny';
 const row=document.createElement('div');row.className='sh-online-roster-row';
 row.innerHTML=`<div><strong>${escape(name)}${card.owner_id===me?' · Ty':''}</strong><small>${escape(ch.kind||'')} · ${escape(ch.className||'')} · poz. ${value(ch.level||1)}</small><small>HP ${value(d.hitPoints)} · KP ${value(d.armorClassUnarmored)} · INI ${value(d.initiative)}</small></div>`;
 const button=document.createElement('button');button.type='button';button.className='sh-online-card-btn';button.textContent='Karta postaci';button.onclick=()=>miniCard(card);row.append(button);
 if(kind==='gm'){const preview=document.createElement('button');preview.type='button';preview.className='sh-online-card-btn';preview.textContent='Widok gracza';preview.onclick=()=>{
   const u=new URL('StreamHouse-v21-Gracz.html',location.href);u.searchParams.set('campaign',campaignId);u.searchParams.set('player',card.id);
   const w=window.open(u.href,'streamhouse-preview-'+card.id,'width=1280,height=850,resizable=yes,scrollbars=yes');if(!w)location.href=u.href;
  };row.append(preview)}
 return row;
}
async function load(){
 const auth=await cloud.init();if(!auth.user?.id){returnToPortal();return}
 const campaigns=await cloud.listCampaigns();
 const found=campaigns.find(c=>c.id===campaignId);
 if(!found||found.archived_at){returnToPortal();return}
 const kind=document.body.dataset.role==='gm'?'gm':'player';
 if(kind==='gm'&&found.role!=='gm'){const u=new URL('StreamHouse-v21-Gracz.html',location.href);u.searchParams.set('campaign',campaignId);location.replace(u.href);return}
 const container=$(kind==='gm'?'party-list':'player-party');if(!container)return;
 const title=document.querySelector('.location .eyebrow');if(title)title.textContent=found.title||'Kampania online';
 const cards=await cloud.listShared(campaignId,found.owner_id);
 if(!active)return;
 container.replaceChildren();
 if(!cards.length){const info=document.createElement('div');info.className='sh-online-empty';info.textContent='Brak udostępnionych kart bohaterów. Dodaj kartę w panelu kampanii.';container.append(info)}
 else for(const card of cards)container.append(heroCard(card,auth.user.id,kind));
 const status=document.querySelector('.top-status');if(status)status.textContent=`Kampania online · ${cards.length} ${cards.length===1?'postać':'postaci'}`;
 const count=document.querySelector('#team-player .eyebrow');if(count)count.textContent=cards.length+' kart';
 if(kind==='player'){
   const requested=params.get('player');const selected=cards.find(c=>c.id===requested&&(c.owner_id===auth.user.id||found.role==='gm'))||cards.find(c=>c.owner_id===auth.user.id);
   const p=$('player-name'),klass=$('player-class'),hp=$('player-hp'),ac=$('player-ac'),ini=$('player-init');
   if(p)p.textContent=selected?.name||'Brak wybranej postaci';
   const c=selected?.character||{},d=c.sheet?.derived||{};
   if(klass)klass.textContent=selected?`${c.kind||''} · ${c.className||''} · poziom ${c.level||1}`:'Udostępnij kartę w panelu kampanii';
   if(hp)hp.textContent=selected?value(d.hitPoints):'–';
   if(ac)ac.textContent=selected?value(d.armorClassUnarmored):'–';
   if(ini)ini.textContent=selected?value(d.initiative):'–';
   const portrait=document.querySelector('.character-large');
   if(portrait){const src=String(c.image||'');const allowed=/^data:image\/(png|jpeg|webp);base64,/i.test(src)||/^https:\/\//.test(src);portrait.style.background=allowed?`center / cover no-repeat url(${JSON.stringify(src)})`:'linear-gradient(135deg,#354a39,#15201b)';const svg=portrait.querySelector('svg');if(svg)svg.hidden=true}
 }
 document.documentElement.classList.remove('sh-online-loading');
}
async function startup(){
 if(!active||loading)return;
 loading=true;
 try{await load()}
 catch(err){const kind=document.body.dataset.role==='gm'?'party-list':'player-party',el=$(kind);if(el){el.textContent='Nie udało się pobrać drużyny online: '+(err.message||err)}document.documentElement.classList.remove('sh-online-loading')}
 finally{loading=false}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startup,{once:true});else startup();
const tick=setInterval(()=>{if(document.visibilityState==='visible'&&cloud.user())startup()},30000);
window.addEventListener('beforeunload',()=>{active=false;clearInterval(tick)});
})();