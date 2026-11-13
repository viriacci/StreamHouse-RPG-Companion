/* StreamHouse RPG Companion v7 | Cloud adapter, browser + Supabase Auth (Discord OAuth)
   All writes are subject to database Row Level Security.
   No Discord secret or service_role is used client-side. */
(function(global){
  'use strict';
  // Publiczne domyslne ustawienia dzialaja tez, gdy konfiguracja VPS jest pusta.
  // Zewnetrzne ustawienia z kompletnym URL i kluczem maja pierwszenstwo.
  const runtime=global.STREAMHOUSE_CLOUD_CONFIG||{};
  const fallback=global.STREAMHOUSE_CLOUD_DEFAULT_CONFIG||{};
  const settings=runtime.url&&runtime.publishableKey?runtime:fallback;
  let sdk=null, api=null, authUser=null, bootPromise=null, sdkPromise=null;
  let lastError='';
  const publicUrl=String(settings.url||'').trim().replace(/\/$/,'');
  const publishableKey=String(settings.publishableKey||'').trim();
  const validUrl=(()=>{try{const u=new URL(publicUrl);return (!u.username&&!u.password&&!u.search&&!u.hash)&&(u.protocol==='https:'||u.hostname==='localhost'&&u.protocol==='http:')}catch{return false}})();
  const configured=!!(validUrl&&publishableKey&&(publishableKey.startsWith('sb_publishable_')||publishableKey.startsWith('eyJ')));
  const fail=(err)=>{lastError=err?.message||String(err||'Nieznany błąd sieci');throw new Error(lastError)};
  function fire(){if(typeof global.dispatchEvent==='function'&&typeof global.CustomEvent==='function')global.dispatchEvent(new CustomEvent('streamhouse:cloud-change',{detail:{configured,user:authUser,error:lastError}}));}
  async function ensureSDK(){
    if(!configured)throw Error('Połączenie z chmurą nie jest skonfigurowane.');
    if(sdk)return sdk;
    if(!sdkPromise)sdkPromise=new Promise((resolve,reject)=>{
      if(global.supabase?.createClient){resolve(global.supabase);return}
      const tag=document.createElement('script');
      tag.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js';
      tag.crossOrigin='anonymous';tag.referrerPolicy='no-referrer';
      tag.onload=()=>global.supabase?.createClient?resolve(global.supabase):reject(Error('Nie załadowano biblioteki Supabase.'));
      tag.onerror=()=>reject(Error('Brak dostępu do biblioteki Supabase. Sprawdź sieć i blokady skryptów.'));
      document.head.appendChild(tag);
    }).catch(err=>{sdkPromise=null;throw err});
    sdk=await sdkPromise;return sdk;
  }
  async function ensureAPI(){
    if(api)return api;
    const lib=await ensureSDK();
    api=lib.createClient(publicUrl,publishableKey,{auth:{flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
    return api;
  }
  async function init(){
    if(!configured)return {configured:false,user:null};
    if(!bootPromise)bootPromise=(async()=>{
      const c=await ensureAPI();
      c.auth.onAuthStateChange((_event,session)=>{
        authUser=session?.user||null;fire();
      });
      const {data,error}=await c.auth.getUser();
      if(error&&error.name!=='AuthSessionMissingError')throw error;
      authUser=data?.user||null;lastError='';fire();
      return {configured:true,user:authUser};
    })().catch(err=>{bootPromise=null;authUser=null;fire();return fail(err)});
    return bootPromise;
  }
  async function login(){
    if(location.protocol==='file:')throw Error('Logowanie Discord wymaga strony HTTP(S), nie pliku file://.');
    const c=await ensureAPI();
    const returnUrl=new URL('StreamHouse-Portal.html',location.href);
    const invite=new URLSearchParams(location.search).get('invite');
    if(invite&&/^[a-f0-9]{32}$/i.test(invite)){try{sessionStorage.setItem('streamhouse:pending-invite',invite)}catch{}}
    returnUrl.search='';
    returnUrl.hash='';
    const {error}=await c.auth.signInWithOAuth({provider:'discord',options:{redirectTo:returnUrl.href,scopes:'identify'}});
    if(error)return fail(error);
  }
  async function logout(){const c=await ensureAPI();const {error}=await c.auth.signOut();if(error)return fail(error);authUser=null;fire()}
  async function own(){await init();if(!authUser?.id)throw Error('Zaloguj się przez Discord, aby korzystać z chmury.');return authUser}
  async function query(promise){const result=await promise;if(result.error)return fail(result.error);return result.data}
  async function saveProfile(displayName,avatarUrl=''){
    const u=await own(),c=await ensureAPI();
    const url=typeof avatarUrl==='string'&&/^https:\/\//i.test(avatarUrl)?avatarUrl.slice(0,2048):'';
    return query(c.from('sh_profiles').upsert({id:u.id,display_name:String(displayName||'Awanturnik').slice(0,40),avatar_url:url,updated_at:new Date().toISOString()},{onConflict:'id'}).select('id').single());
  }
  async function saveProfileTitle(title){const c=await ensureAPI();await own();const {data,error}=await c.auth.updateUser({data:{streamhouse_profile_title:String(title||'Kronikarz StreamHouse').slice(0,50)}});if(error)return fail(error);authUser=data?.user||authUser;fire();return authUser;}
  async function upsertHero(hero){
    const u=await own(),c=await ensureAPI();
    if(!hero||typeof hero!=='object'||!hero.id||!hero.name||!hero.sheet)throw Error('Niepoprawna karta bohatera.');
    if(JSON.stringify(hero).length>750000)throw Error('Karta przekracza limit chmury (750 kB). Zmniejsz portret.');
    return query(c.from('sh_characters').upsert({owner_id:u.id,client_id:String(hero.id).slice(0,100),name:String(hero.name).slice(0,80),payload:hero,updated_at:new Date().toISOString()},{onConflict:'owner_id,client_id'}).select('id,client_id,name,updated_at').single());
  }
  async function listHeroes(){const u=await own(),c=await ensureAPI();return query(c.from('sh_characters').select('id,client_id,name,payload,updated_at').eq('owner_id',u.id).order('updated_at',{ascending:false}).limit(200))}
  async function getHeroById(id){const u=await own(),c=await ensureAPI();return query(c.from('sh_characters').select('id,client_id,name,payload').eq('owner_id',u.id).eq('id',id).single())}
  async function deleteHero(id){const u=await own(),c=await ensureAPI();const rows=await query(c.from('sh_characters').delete().eq('id',id).eq('owner_id',u.id).select('id'));if(!rows?.length)throw Error('Nie znaleziono postaci na Twoim koncie.');return rows}
  async function upsertCampaign(campaign){
    const u=await own(),c=await ensureAPI();
    if(!campaign?.id||!campaign.name)throw Error('Niepoprawne dane kampanii.');
    return query(c.from('sh_campaigns').upsert({owner_id:u.id,client_id:String(campaign.id).slice(0,100),title:String(campaign.name).slice(0,90),description:String(campaign.description||'').slice(0,1000),currency:String(campaign.currency||'Sztuki złota').slice(0,50)},{onConflict:'owner_id,client_id'}).select('id,owner_id,client_id,title,description,currency').single());
  }
  async function listCampaigns(){
    const u=await own(),c=await ensureAPI();
    const [campaigns,members]=await Promise.all([
      query(c.from('sh_campaigns').select('id,owner_id,client_id,title,description,currency').order('created_at',{ascending:false}).limit(150)),
      query(c.from('sh_campaign_members').select('campaign_id,role').eq('user_id',u.id).limit(150))
    ]);
    const roles=new Map(members.map(m=>[m.campaign_id,m.role]));
    return campaigns.map(x=>({...x,role:roles.get(x.id)||(x.owner_id===u.id?'gm':'player')}));
  }
  async function createInvite(campaignId){await own();const c=await ensureAPI();return query(c.rpc('sh_create_invite',{p_campaign_id:campaignId}))}
  async function joinByCode(code){await own();const c=await ensureAPI();return query(c.rpc('sh_join_by_code',{p_code:String(code||'').trim().toLowerCase()}))}
  async function shareHero(campaignId,characterId){
    const u=await own(),c=await ensureAPI();
    return query(c.from('sh_campaign_characters').upsert({campaign_id:campaignId,character_id:characterId,owner_id:u.id},{onConflict:'campaign_id,character_id'}).select('campaign_id,character_id').single());
  }
  async function listShared(campaignId){
    await own();const c=await ensureAPI();
    const links=await query(c.from('sh_campaign_characters').select('character_id,owner_id').eq('campaign_id',campaignId).limit(100));
    if(!links.length)return [];
    const chars=await query(c.from('sh_characters').select('id,name,payload').in('id',links.map(x=>x.character_id)));
    return chars.map(x=>({id:x.id,name:x.name,owner_id:links.find(link=>link.character_id===x.id)?.owner_id||null,character:x.payload}));
  }
  // v11.4: identyfikatory kont (nie nicki) wiążą zaproszenia i wiadomości prywatne.
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function peerId(value){const id=String(value||'').trim().toLowerCase();if(!uuid.test(id))throw Error('Wpisz poprawne ID konta StreamHouse (UUID).');return id;}
  async function requestFriend(id){await own();return query((await ensureAPI()).rpc('sh_friend_request',{p_target:peerId(id)}))}
  async function respondFriend(id,accept){await own();return query((await ensureAPI()).rpc('sh_friend_respond',{p_sender:peerId(id),p_accept:!!accept}))}
  async function removeFriend(id){await own();return query((await ensureAPI()).rpc('sh_friend_remove',{p_peer:peerId(id)}))}
  async function listFriends(){
    const u=await own(),db=await ensureAPI();
    const links=await query(db.from('sh_friend_links').select('low_id,high_id,requested_by,status,created_at,accepted_at')
      .or('low_id.eq.'+u.id+',high_id.eq.'+u.id).order('created_at',{ascending:false}).limit(150));
    const accepted=links.filter(x=>x.status==='accepted');
    const ids=accepted.map(x=>x.low_id===u.id?x.high_id:x.low_id);
    const profiles=ids.length?await query(db.from('sh_profiles').select('id,display_name,avatar_url').in('id',ids).limit(150)):[];
    return {me:u.id,links,profiles};
  }
  async function listDirectMessages(id){
    const peer=peerId(id),me=(await own()).id,db=await ensureAPI();
    return query(db.from('sh_direct_messages').select('id,sender_id,recipient_id,body,created_at')
      .or('and(sender_id.eq.'+me+',recipient_id.eq.'+peer+'),and(sender_id.eq.'+peer+',recipient_id.eq.'+me+')')
      .order('id',{ascending:false}).limit(60));
  }
  async function sendDirectMessage(id,body){
    const peer=peerId(id),me=(await own()).id,db=await ensureAPI(),message=String(body||'').trim();
    if(!message||message.length>1000)throw Error('Wiadomość musi mieć 1–1000 znaków.');
    return query(db.from('sh_direct_messages').insert({sender_id:me,recipient_id:peer,body:message})
      .select('id,sender_id,recipient_id,body,created_at').single());
  }
  async function subscribeMessages(onChange){
    const me=(await own()).id,db=await ensureAPI();
    const channel=db.channel('sh-messages-'+me+'-'+Math.random().toString(36).slice(2));
    for(const filter of ['sender_id=eq.'+me,'recipient_id=eq.'+me]){
      channel.on('postgres_changes',{event:'INSERT',schema:'public',table:'sh_direct_messages',filter},onChange);
    }
    for(const filter of ['low_id=eq.'+me,'high_id=eq.'+me]){
      channel.on('postgres_changes',{event:'*',schema:'public',table:'sh_friend_links',filter},onChange);
    }
    channel.subscribe();return ()=>{db.removeChannel(channel)};
  }
  global.StreamHouseCloud=Object.freeze({configured,init,login,logout,user:()=>authUser,error:()=>lastError,saveProfile,saveProfileTitle,upsertHero,listHeroes,getHeroById,deleteHero,upsertCampaign,listCampaigns,createInvite,joinByCode,shareHero,listShared,requestFriend,respondFriend,removeFriend,listFriends,listDirectMessages,sendDirectMessage,subscribeMessages,client:ensureAPI});
})(window);
