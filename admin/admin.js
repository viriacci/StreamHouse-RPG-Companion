(() => {
'use strict';
const $=id=>document.getElementById(id);
const escaped=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const short=id=>id?String(id).slice(0,8)+'…':'—';
const date=value=>value?new Date(value).toLocaleString('pl-PL',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
const integer=value=>Number(value||0).toLocaleString('pl-PL');
const cloud=window.StreamHouseCloud;
const demo=window.STREAMHOUSE_ADMIN_DEMO===true;
const enabled=window.STREAMHOUSE_ADMIN_ENV==='staging';
const views={dashboard:'PRZEGLĄD',users:'UŻYTKOWNICY',campaigns:'KAMPANIE',audit:'AUDYT',system:'SYSTEM'};
const sampleOwner='10000000-0000-4000-8000-000000000001';
const samplePlayer='10000000-0000-4000-8000-000000000002';
const sampleMod='10000000-0000-4000-8000-000000000003';
const sampleCampaign='20000000-0000-4000-8000-000000000001';
const sampleCampaign2='20000000-0000-4000-8000-000000000002';
const sampleDate=new Date(Date.now()-86400000).toISOString();
const demoStore={
 users:[
   {user_id:sampleOwner,display_name:'Kronikarz',admin_role:'owner',characters:3,campaigns:1,registered_at:sampleDate},
   {user_id:sampleMod,display_name:'Strażnik',admin_role:'moderator',characters:1,campaigns:0,registered_at:sampleDate},
   {user_id:samplePlayer,display_name:'Awanturnik',admin_role:null,characters:2,campaigns:1,registered_at:sampleDate}
 ],
 campaigns:[
   {campaign_id:sampleCampaign,title:'Legenda Zaginionej Korony',owner_id:sampleOwner,owner_name:'Kronikarz',player_count:2,character_count:2,archived_at:null,created_at:sampleDate},
   {campaign_id:sampleCampaign2,title:'Popioły Starego Królestwa',owner_id:samplePlayer,owner_name:'Awanturnik',player_count:1,character_count:1,archived_at:sampleDate,created_at:sampleDate}
 ],
 members:{
   [sampleCampaign]:[
     {user_id:sampleOwner,display_name:'Kronikarz',member_role:'gm',joined_at:sampleDate},
     {user_id:samplePlayer,display_name:'Awanturnik',member_role:'player',joined_at:sampleDate},
     {user_id:sampleMod,display_name:'Strażnik',member_role:'player',joined_at:sampleDate}
   ],
   [sampleCampaign2]:[
     {user_id:samplePlayer,display_name:'Awanturnik',member_role:'gm',joined_at:sampleDate},
     {user_id:sampleOwner,display_name:'Kronikarz',member_role:'player',joined_at:sampleDate}
   ]
 },
 audit:[]
};
let state={
 view:'dashboard',role:null,user:null,busy:false,search:'',status:'all',
 offset:0,limit:20,metrics:null,users:[],campaigns:[],audit:[],
 selectedCampaign:null,members:[],modalAction:null,modalContext:null
};
let toastTimer=0,searchTimer=0;
function notify(message,isError=false){
 const element=$('toast');element.hidden=false;element.textContent=message;
 element.classList.toggle('error',isError);clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>element.hidden=true,4300);
}
function setHeader(){
 $('breadcrumb').textContent=views[state.view]||views.dashboard;
 $('logged-user').textContent=demo?'Właściciel · demo':state.user?.user_metadata?.name||short(state.user?.id);
 $('env-label').textContent=demo?'DEMO · STAGING':'STAGING';
 $('env-label').classList.toggle('demo',demo);
 $('logout-btn').hidden=demo||!state.user;
 document.querySelectorAll('[data-view]').forEach(button=>{
  if(button.dataset.view===state.view)button.setAttribute('aria-current','page');
  else button.removeAttribute('aria-current');
 });
}
function gate(title,description,buttonText='',action=''){
 $('content').innerHTML='<section class="gate card"><div class="kicker">STREAMHOUSE · DOSTĘP</div><h1>'+
  escaped(title)+'</h1><p>'+escaped(description)+'</p>'+
  (buttonText?'<div class="gate-actions"><button class="button primary" type="button" data-action="'+
  escaped(action)+'">'+escaped(buttonText)+'</button></div>':'')+'</section>';
}
async function rpc(name,params={}){
 const db=await cloud.client();const response=await db.rpc(name,params);
 if(response.error)throw new Error(response.error.message||'Błąd zapytania Supabase.');
 return response.data;
}
function demoMetrics(){
 return {users:demoStore.users.length,moderators:demoStore.users.filter(u=>u.admin_role==='moderator').length,
 campaigns:demoStore.campaigns.length,active_campaigns:demoStore.campaigns.filter(c=>!c.archived_at).length,
 archived_campaigns:demoStore.campaigns.filter(c=>!!c.archived_at).length,
 characters:demoStore.users.reduce((sum,u)=>sum+Number(u.characters),0),events:129,direct_messages:42};
}
function fakeUsers(){
 const query=state.search.trim().toLowerCase();
 return demoStore.users.filter(u=>!query||u.display_name.toLowerCase().includes(query)||u.user_id.toLowerCase().includes(query))
 .slice(state.offset,state.offset+state.limit);
}
function fakeCampaigns(){
 const query=state.search.trim().toLowerCase();
 return demoStore.campaigns.filter(c=>(state.status==='all'||(state.status==='archived'?!!c.archived_at:!c.archived_at))&&
 (!query||c.title.toLowerCase().includes(query)||c.campaign_id.toLowerCase().includes(query)))
 .slice(state.offset,state.offset+state.limit);
}
async function reload(){
 if(state.busy)return;
 state.busy=true;
 try{
  if(demo){
   state.metrics=demoMetrics();state.users=fakeUsers();state.campaigns=fakeCampaigns();
   state.audit=demoStore.audit.slice(0,40);
  }else if(state.view==='dashboard'){
   [state.metrics,state.campaigns,state.audit]=await Promise.all([
     rpc('sh_admin_metrics'),rpc('sh_admin_campaigns',{p_limit:6}),rpc('sh_admin_activity',{p_limit:6})]);
  }else if(state.view==='users'){
   state.users=await rpc('sh_admin_users',{p_query:state.search,p_limit:state.limit,p_offset:state.offset});
  }else if(state.view==='campaigns'){
   state.campaigns=await rpc('sh_admin_campaigns',{p_query:state.search,p_status:state.status,p_limit:state.limit,p_offset:state.offset});
  }else if(state.view==='audit'){
   state.audit=await rpc('sh_admin_activity',{p_limit:80});
  }
  render();
 }catch(error){notify(error.message,true);renderFailure(error.message)}
 finally{state.busy=false}
}
function renderFailure(message){
 $('content').innerHTML='<section class="card"><h1>Błąd odczytu danych</h1><p class="subline">'+escaped(message)+
 '</p><button type="button" class="button" data-action="refresh">Spróbuj ponownie</button></section>';
}
function banner(){
 return demo?'<div class="demo-banner"><strong>TRYB DEMONSTRACYJNY</strong> · Wszystkie konta, kampanie i operacje są fikcyjne. Działania zmieniają wyłącznie dane w tej karcie przeglądarki. Żadne żądanie nie trafia do produkcji.</div>':'';
}
function header(title,description,actions=''){
 return '<div class="heading"><div><div class="kicker">STREAMHOUSE · ADMINISTRATION</div><h1>'+title+
 '</h1><p class="subline">'+description+'</p></div><div class="toolbar">'+actions+
 '<button type="button" class="quiet" data-action="refresh">↻ Odśwież</button></div></div>';
}
function stats(){
 const m=state.metrics||{};
 return '<section class="summary-grid">'+[
  ['Użytkownicy',m.users,'Konta Discord w systemie'],
  ['Kampanie aktywne',m.active_campaigns,'Z '+integer(m.campaigns)+' wszystkich kampanii'],
  ['Bohaterowie',m.characters,'Prywatne karty zapisane w systemie'],
  ['Wydarzenia',m.events,'Historia zdarzeń pokoi']
 ].map(([title,value,desc])=>'<article class="card"><div class="stat-label">'+title+
 '</div><div class="stat-value">'+integer(value)+'</div><div class="stat-detail">'+desc+'</div></article>').join('')+'</section>';
}
function statusTag(c){
 return '<span class="pill '+(c.archived_at?'archived':'')+'">'+(c.archived_at?'Archiwum':'Aktywna')+'</span>';
}
function campaignRows(items){
 if(!items?.length)return '<tr><td colspan="6"><div class="empty">Brak kampanii dla wybranego filtra.</div></td></tr>';
 return items.map(c=>'<tr><td><strong>'+escaped(c.title)+'</strong><div class="secondary idcode">'+escaped(c.campaign_id)+'</div></td>'+
 '<td>'+escaped(c.owner_name)+'<div class="secondary">'+short(c.owner_id)+'</div></td>'+
 '<td>'+integer(c.player_count)+'</td><td>'+integer(c.character_count)+'</td><td>'+statusTag(c)+'</td><td>'+
 '<div class="row-actions"><button type="button" class="quiet" data-action="members" data-id="'+escaped(c.campaign_id)+'">Drużyna</button>'+
 '<button type="button" class="'+(c.archived_at?'quiet':'danger')+'" data-action="toggle-campaign" data-id="'+escaped(c.campaign_id)+'">'+
 (c.archived_at?'Przywróć':'Archiwizuj')+'</button></div></td></tr>').join('');
}
function campaignTable(items,withHeading=true){
 return (withHeading?'<div class="section-title"><h2>Kampanie</h2><span class="kicker">KONTROLA ŚWIATÓW</span></div>':'')+
 '<div class="table-wrap"><table><thead><tr><th>Kampania</th><th>Mistrz Gry</th><th>Gracze</th><th>Postacie</th><th>Status</th><th>Operacje</th></tr></thead><tbody>'+
 campaignRows(items)+'</tbody></table></div>';
}
function userTable(items){
 return '<div class="table-wrap"><table><thead><tr><th>Konto</th><th>Rola administracyjna</th><th>Postacie</th><th>Kampanie MG</th><th>Rejestracja</th><th>Operacje</th></tr></thead><tbody>'+
 (items?.length?items.map(u=>'<tr><td><strong>'+escaped(u.display_name)+'</strong><div class="secondary idcode">'+escaped(u.user_id)+'</div></td>'+
 '<td><span class="pill '+escaped(u.admin_role||'')+'">'+escaped(u.admin_role==='owner'?'Właściciel':u.admin_role==='moderator'?'Moderator':'Użytkownik')+'</span></td>'+
 '<td>'+integer(u.characters)+'</td><td>'+integer(u.campaigns)+'</td><td>'+date(u.registered_at)+'</td><td>'+
 '<div class="row-actions">'+(state.role==='owner'&&u.admin_role!=='owner'&&u.user_id!==state.user?.id?
 '<button type="button" class="'+(u.admin_role==='moderator'?'danger':'quiet')+'" data-action="toggle-moderator" data-id="'+escaped(u.user_id)+'">'+
 (u.admin_role==='moderator'?'Odbierz moderatora':'Nadaj moderatora')+'</button>':'<span class="secondary">Brak uprawnień do zmiany</span>')+
 '</div></td></tr>').join(''):'<tr><td colspan="6"><div class="empty">Nie znaleziono użytkowników.</div></td></tr>')+'</tbody></table></div>';
}
function pager(items){
 return '<div class="pager"><button class="quiet" type="button" data-action="page-prev" '+(state.offset===0?'disabled':'')+'>← Wstecz</button>'+
 '<span>Wyniki '+integer(state.offset+1)+'–'+integer(state.offset+(items?.length||0))+'</span>'+
 '<button class="quiet" type="button" data-action="page-next" '+((items?.length||0)<state.limit?'disabled':'')+'>Dalej →</button></div>';
}
function renderActivity(rows){
 return '<div class="activity">'+(rows?.length?rows.map(r=>'<div class="activity-item"><time>'+date(r.created_at)+'</time>'+
 '<div><strong>'+escaped(r.action)+'</strong><div class="secondary">'+escaped(r.actor_name||'Administrator')+' · '+escaped(r.subject_type||'')+
 ' · '+short(r.subject_id)+'</div><small>'+escaped(r.details?.reason||'Operacja systemowa')+'</small></div></div>').join(''):
 '<div class="empty">Nie zapisano jeszcze żadnych działań administratorów.</div>')+'</div>';
}
function renderDashboard(){
 return header('Centrum dowodzenia','Stan kampanii, aktywność systemu i skróty do najważniejszych operacji.')+
 stats()+'<div class="sub-grid"><section class="card"><div class="section-title"><h2>Ostatnie kampanie</h2>'+
 '<button class="quiet" type="button" data-action="goto-campaigns">Wszystkie →</button></div>'+
 campaignTable(state.campaigns||[],false)+'</section>'+
 '<section class="card"><div class="section-title"><h2>Ostatnie działania</h2><button class="quiet" type="button" data-action="goto-audit">Cały audyt →</button></div>'+
 renderActivity((state.audit||[]).slice(0,6))+'</section></div>'+
 '<section class="card" style="margin-top:20px"><div class="section-title"><h2>Odpowiedzialne zarządzanie</h2></div>'+
 '<p class="subline">Administratorzy widzą metadane kont, kampanii i liczbę wiadomości. Treści prywatnych rozmów oraz prywatne karty postaci nie są dostępne przez panel. Nieodwracalne usuwanie kont i kampanii jest celowo wyłączone.</p></section>';
}
function renderUsers(){
 const search='<input id="search" type="search" class="search" placeholder="Nazwa lub UUID użytkownika" value="'+escaped(state.search)+'" aria-label="Szukaj użytkowników">';
 return header('Użytkownicy','Konta Discord, liczba postaci, prowadzone kampanie i zarządzanie rolami moderatorów.',search)+
 userTable(state.users)+pager(state.users);
}
function renderMemberPanel(){
 const campaign=state.selectedCampaign;
 if(!campaign)return '';
 return '<section class="card" style="margin:0 0 25px"><div class="section-title"><div><h2>Drużyna: '+escaped(campaign.title)+
 '</h2><div class="secondary idcode">'+escaped(campaign.campaign_id)+'</div></div><button type="button" class="quiet" data-action="close-members">Zamknij</button></div>'+
 '<div class="detail-list">'+(state.members.length?state.members.map(m=>'<div class="detail-row"><div><strong class="'+(m.member_role==='gm'?'member-gm':'')+'">'+escaped(m.display_name)+'</strong>'+
 '<small>'+escaped(m.member_role==='gm'?'Mistrz Gry':'Gracz')+' · '+short(m.user_id)+' · od '+date(m.joined_at)+'</small></div>'+
 (m.member_role==='player'?'<button type="button" class="danger" data-action="kick-player" data-id="'+escaped(m.user_id)+'">Usuń gracza</button>':
 '<span class="pill owner">MG · chroniony</span>')+'</div>').join(''):
 '<div class="empty">Brak członków kampanii.</div>')+'</div></section>';
}
function renderCampaigns(){
 const search='<input id="search" type="search" class="search" placeholder="Nazwa lub UUID kampanii" value="'+escaped(state.search)+'" aria-label="Szukaj kampanii">'+
 '<select id="status-filter" aria-label="Filtr statusu">'+
 '<option value="all" '+(state.status==='all'?'selected':'')+'>Wszystkie</option>'+
 '<option value="active" '+(state.status==='active'?'selected':'')+'>Aktywne</option>'+
 '<option value="archived" '+(state.status==='archived'?'selected':'')+'>Archiwum</option></select>';
 return header('Kampanie','Zarządzaj światami, archiwizuj i przywracaj kampanie oraz usuwaj graczy ze składu.',search)+
 renderMemberPanel()+campaignTable(state.campaigns)+pager(state.campaigns);
}
function renderAudit(){
 return header('Dziennik operacji','Niezmienny z poziomu panelu rejestr działań administracyjnych.')+
 '<section class="card"><div class="section-title"><h2>Historia moderacji</h2><span class="kicker">OSTATNIE 80 ZDARZEŃ</span></div>'+
 renderActivity(state.audit)+'</section>';
}
function renderSystem(){
 return header('System i bezpieczeństwo','Weryfikacja środowiska, uprawnień i granic dostępu.')+
 '<div class="system-grid"><section class="card"><h2>Środowisko</h2>'+
 [['Instancja',demo?'Tryb demonstracyjny':'Staging · Supabase'],['Gałąź','feature/admin-staging-v11.11'],['Wersja','11.11 · test'],['Rola',state.role==='owner'?'Właściciel':'Moderator'],
 ['Dane produkcyjne','Niepodłączone w trybie demonstracyjnym'],['Moduł','Panel administracyjny']].map(([label,value])=>
 '<div class="system-row"><span>'+escaped(label)+'</span><strong>'+escaped(value)+'</strong></div>').join('')+'</section>'+
 '<section class="card"><h2>Granice administracji</h2>'+
 '<p class="subline">Wszystkie rzeczywiste operacje idą przez autoryzowane funkcje PostgreSQL. Żadnych kluczy service_role w przeglądarce.</p>'+
 '<div class="system-row"><span>Przyznawanie ról</span><strong>Tylko właściciel</strong></div>'+
 '<div class="system-row"><span>Usuwanie kont</span><strong>Wyłączone</strong></div>'+
 '<div class="system-row"><span>Prywatne wiadomości</span><strong>Treść niedostępna</strong></div>'+
 '<div class="system-row"><span>Moderacja</span><strong>Powód + audyt</strong></div>'+
 '</section></div><section class="card" style="margin-top:20px"><h2>Wdrożenie testowe</h2>'+
 '<p class="subline">Staging uruchamiany jest z osobnej kopii repozytorium. Domyślnie widoczny wyłącznie lokalnie na VPS pod adresem 127.0.0.1:8091, przez tunel SSH. Podłączenie prawdziwej bazy wymaga osobnego projektu lub gałęzi Supabase oraz konta właściciela nadanego bezpośrednio w bazie.</p>'+
 '</section>';
}
function render(){
 setHeader();const content=$('content');
 const viewsHtml={dashboard:renderDashboard,users:renderUsers,campaigns:renderCampaigns,audit:renderAudit,system:renderSystem};
 content.innerHTML=banner()+(viewsHtml[state.view]||renderDashboard)();
}
async function navigate(view){
 if(!views[view])return;
 state.view=view;state.search='';state.offset=0;state.selectedCampaign=null;state.members=[];
 document.querySelector('.sidebar').classList.remove('is-open');setHeader();
 await reload();
}
function openModal(title,description,action,context,buttonText){
 state.modalAction=action;state.modalContext=context;
 $('modal-title').textContent=title;$('modal-description').textContent=description;
 $('modal-reason').value='';$('modal-submit').textContent=buttonText;
 $('modal-root').hidden=false;$('modal-reason').focus();
}
function closeModal(){
 $('modal-root').hidden=true;state.modalAction=null;state.modalContext=null;
}
async function getMembers(id){
 state.selectedCampaign=state.campaigns.find(c=>c.campaign_id===id)||null;
 if(!state.selectedCampaign)return;
 state.members=demo?[...(demoStore.members[id]||[])]:await rpc('sh_admin_members',{p_campaign_id:id});
 render();
}
async function confirmAction(reason){
 const action=state.modalAction,context=state.modalContext;
 if(!action||!context)return;
 const oldCampaign=state.selectedCampaign?.campaign_id;
 if(demo){
  if(action==='campaign.archive'){
   const c=demoStore.campaigns.find(c=>c.campaign_id===context.id);if(c)c.archived_at=context.archived?new Date().toISOString():null;
  }
  if(action==='campaign.remove_player'){
   demoStore.members[context.campaignId]=(demoStore.members[context.campaignId]||[]).filter(x=>x.user_id!==context.id);
   const c=demoStore.campaigns.find(c=>c.campaign_id===context.campaignId);if(c)c.player_count=Math.max(0,c.player_count-1);
  }
  if(action==='moderator.toggle'){
   const user=demoStore.users.find(x=>x.user_id===context.id);if(user)user.admin_role=context.enabled?'moderator':null;
  }
  demoStore.audit.unshift({id:Date.now(),actor_id:sampleOwner,actor_name:'Kronikarz',
    action,subject_type:context.type,subject_id:context.id,details:{reason},created_at:new Date().toISOString()});
 }else{
  if(action==='campaign.archive')await rpc('sh_admin_archive_campaign',{
    p_campaign_id:context.id,p_archived:context.archived,p_reason:reason});
  if(action==='campaign.remove_player')await rpc('sh_admin_remove_player',{
    p_campaign_id:context.campaignId,p_user_id:context.id,p_reason:reason});
  if(action==='moderator.toggle')await rpc('sh_admin_set_moderator',{
    p_user_id:context.id,p_enabled:context.enabled,p_reason:reason});
 }
 closeModal();notify(demo?'Wykonano operację w trybie demonstracyjnym.':'Operacja zapisana w audycie.');
 if(oldCampaign&&(action==='campaign.remove_player'||action==='campaign.archive')){
  state.members=demo?[...(demoStore.members[oldCampaign]||[])]:await rpc('sh_admin_members',{p_campaign_id:oldCampaign});
 }
 await reload();
}
document.addEventListener('click',async event=>{
 const nav=event.target.closest('[data-view]');if(nav){navigate(nav.dataset.view);return}
 const action=event.target.closest('[data-action]');if(!action)return;
 try{
  const name=action.dataset.action,id=action.dataset.id;
  if(name==='login'){
   const db=await cloud.client();
   const redirectTo=new URL('index.html',location.href).href;
   const result=await db.auth.signInWithOAuth({provider:'discord',options:{redirectTo,scopes:'identify'}});
   if(result.error)throw result.error;
  }
  if(name==='refresh')await reload();
  if(name==='goto-campaigns')await navigate('campaigns');
  if(name==='goto-audit')await navigate('audit');
  if(name==='page-prev'){state.offset=Math.max(0,state.offset-state.limit);await reload()}
  if(name==='page-next'){state.offset+=state.limit;await reload()}
  if(name==='close-members'){state.selectedCampaign=null;state.members=[];render()}
  if(name==='members')await getMembers(id);
  if(name==='toggle-campaign'){
   const c=state.campaigns.find(c=>c.campaign_id===id);
   if(!c)return;
   const archived=!c.archived_at;
   openModal(archived?'Archiwizuj kampanię':'Przywróć kampanię',
    'Czy na pewno chcesz '+(archived?'archiwizować':'przywrócić')+' „'+c.title+'”? Operacja będzie zapisana w audycie.',
    'campaign.archive',{id,archived,type:'campaign'},archived?'Archiwizuj':'Przywróć');
  }
  if(name==='kick-player'){
   const member=state.members.find(m=>m.user_id===id);
   const campaign=state.selectedCampaign;if(!member||!campaign||member.member_role!=='player')return;
   openModal('Usuń gracza z kampanii',
     'Gracz „'+member.display_name+'” utraci dostęp do kampanii „'+campaign.title+'”, a stare linki nie przywrócą mu członkostwa.',
     'campaign.remove_player',{id,campaignId:campaign.campaign_id,type:'user'},'Usuń gracza');
  }
  if(name==='toggle-moderator'){
   if(state.role!=='owner')return;
   const user=state.users.find(u=>u.user_id===id);if(!user||user.admin_role==='owner')return;
   const enabled=user.admin_role!=='moderator';
   openModal(enabled?'Nadaj rolę moderatora':'Odbierz rolę moderatora',
     'Zmiana uprawnień konta „'+user.display_name+'” będzie zapisana w audycie.',
     'moderator.toggle',{id,enabled,type:'user'},enabled?'Nadaj rolę':'Odbierz rolę');
  }
 }catch(error){notify(error.message||String(error),true)}
});
document.addEventListener('input',event=>{
 if(event.target.id!=='search')return;
 const text=event.target.value;clearTimeout(searchTimer);
 searchTimer=setTimeout(()=>{state.search=text;state.offset=0;reload()},330);
});
document.addEventListener('change',event=>{
 if(event.target.id!=='status-filter')return;
 state.status=event.target.value;state.offset=0;reload();
});
$('modal-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const reason=$('modal-reason').value.trim();
 if(reason.length<5){notify('Wpisz minimum pięć znaków uzasadnienia.',true);return}
 const submit=$('modal-submit');submit.disabled=true;
 try{await confirmAction(reason)}catch(error){notify(error.message,true)}
 finally{submit.disabled=false}
});
$('modal-close').addEventListener('click',closeModal);
$('modal-cancel').addEventListener('click',closeModal);
$('modal-root').addEventListener('click',event=>{if(event.target===$('modal-root'))closeModal()});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('modal-root').hidden)closeModal()});
$('mobile-menu').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('is-open'));
$('logout-btn').addEventListener('click',async()=>{
 try{await cloud.logout();location.replace('../StreamHouse-Portal.html')}catch(error){notify(error.message,true)}
});
async function startup(){
 if(!enabled){gate('Panel dostępny tylko na staging','Włącz dedykowane środowisko testowe. Panel nie powinien łączyć się z produkcją ani używać jej kluczy.');return}
 if(demo){
  state.role='owner';state.user={id:sampleOwner,user_metadata:{name:'Kronikarz'}};
  await reload();return;
 }
 if(!cloud?.configured){gate('Brak połączenia z testową bazą','Do pełnego testu potrzebna jest oddzielna baza Supabase oraz konfiguracja staging. Produkcyjne konto nie jest tu używane.');return}
 try{
  const result=await cloud.init();state.user=result.user;
  if(!state.user){gate('Zaloguj się, aby zarządzać StreamHouse','Dostęp wymaga zalogowanego konta Discord z rolą owner lub moderator nadaną w bazie danych.','Zaloguj przez Discord','login');return}
  const access=await rpc('sh_admin_access');state.role=access?.role||null;
  if(!['owner','moderator'].includes(state.role)){
   gate('Brak uprawnień administracyjnych','Twoje konto jest zalogowane, ale nie ma przydzielonej roli. Zgłoś się do właściciela systemu.');return;
  }
  await reload();
 }catch(error){gate('Błąd połączenia staging',error.message||String(error),'Spróbuj ponownie','refresh')}
}
startup();
})();
