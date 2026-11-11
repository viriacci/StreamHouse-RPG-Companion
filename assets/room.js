/* StreamHouse v9: transport pokoju sesji. Dane online tylko po RLS / RPC; lokalne demo wyraznie odseparowane. */
(function (global) {
  'use strict';
  const STORAGE='streamhouse:room:v8:'; // zachowuje zapisane sesje v8
  const DEFAULT={chapter:'Rozdział I',scene:'Wrota starej twierdzy',narration:'Drużyna stoi u bram dawno zapomnianej twierdzy. Wiatr niesie zapach deszczu i dymu.',theme:'fortress',sharedNote:'',initiative:[],currentTurn:null,tokens:[]};
  const copy=x=>JSON.parse(JSON.stringify(x));
  const err=r=>{if(r?.error)throw Error(r.error.message||'Błąd połączenia');return r.data;};
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const notify='streamhouse:room:demo:';
  function safeName(name){return String(name||'Awanturnik').trim().slice(0,50)||'Awanturnik';}
  function fresh(){return {revision:0,payload:copy(DEFAULT),updated_at:new Date().toISOString()};}
  function validateCharacter(data){
    const hp=Number(data?.hp),max=Number(data?.max_hp),inventory=data?.inventory;
    if(!Number.isInteger(hp)||hp<0||hp>999||!Number.isInteger(max)||max<1||max>999||hp>max)throw Error('HP musi wynosić od 0 do maksymalnego HP (maks. 999).');
    if(!Array.isArray(inventory)||inventory.length>100||inventory.some(x=>typeof x!=='string'||x.length>160)||JSON.stringify(inventory).length>12000)throw Error('Niepoprawny ekwipunek (do 100 pozycji).');
    return {hp,max_hp:max,inventory};
  }
  function validPayload(x){
    if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Nieprawidłowy stan pokoju.');
    if(JSON.stringify(x).length>30000)throw Error('Zbyt duży stan pokoju.');
    return x;
  }
  function local(id,user){
    const key=STORAGE+id;let memory=null;let channel=null;
    try{channel=new BroadcastChannel(notify+id)}catch{}
    const readRaw=()=>{let obj;try{obj=JSON.parse(localStorage.getItem(key))}catch{};return obj&&obj.state&&Array.isArray(obj.events)?obj:memory||{state:fresh(),events:[],presence:{},notes:{}};};
    const writeRaw=obj=>{memory=obj;try{localStorage.setItem(key,JSON.stringify(obj))}catch{};channel?.postMessage({type:'changed'})};
    function publicRead(){const raw=readRaw();let heroes=[];try{const portal=JSON.parse(localStorage.getItem('streamhouse:portal:v1')||'{}');heroes=(portal.heroes||[]).filter(x=>x&&x.id).slice(0,30).map(x=>({id:String(x.id),name:x.name||'Bohater',owner_id:null,character:x,session:raw.heroStates?.[x.id]||null}));}catch{}if(!heroes.length){heroes=[{id:'elarion',name:'Elarion',owner_id:null,character:{kind:'Elf',className:'Łotrzyk',hp:22,maxHp:26,sheet:{derived:{attributes:{str:10,dex:16,con:13,int:12,wis:14,cha:8},startingEquipment:['Sztylet','Wytrychy']}}}},{id:'tharok',name:'Tharok',owner_id:null,character:{kind:'Krasnolud',className:'Wojownik',hp:16,maxHp:32,sheet:{derived:{attributes:{str:17,dex:12,con:16,int:10,wis:11,cha:9},startingEquipment:['Miecz','Tarcza']}}}}].map(h=>({...h,session:raw.heroStates?.[h.id]||null}));}return {state:copy(raw.state),events:copy(raw.events.slice(-80)),presence:Object.entries(raw.presence||{}).map(([uid,x])=>({user_id:uid,...x})),notes:raw.notes?.[user.id]||'',characters:heroes};}
    function append(kind,body,meta={}){const raw=readRaw();const evt={id:Date.now()*1000+Math.floor(Math.random()*1000),campaign_id:id,actor_id:user.id,kind,body,meta,created_at:new Date().toISOString()};raw.events.push(evt);raw.events=raw.events.slice(-80);writeRaw(raw);return evt;}
    return {
      mode:'demo',read:async()=>publicRead(),
      update:async(revision,payload)=>{validPayload(payload);const raw=readRaw();if(raw.state.revision!==revision)throw Error('Konflikt wersji. Odśwież pokój.');raw.state={revision:revision+1,payload:copy(payload),updated_at:new Date().toISOString()};writeRaw(raw);return raw.state.revision;},
      post:async(kind,body)=>{if(kind==='handout'&&!user.isGM)throw Error('Tylko MG może ujawniać wskazówki.');if(!['chat','handout'].includes(kind))throw Error('Niepoprawny wpis.');return append(kind,String(body).slice(0,1200));},
      roll:async(sides,modifier,label)=>{const max=0xffffffff;const bound=Math.floor((max+1)/sides)*sides;let n;do{const b=new Uint32Array(1);crypto.getRandomValues(b);n=b[0]}while(n>=bound);const value=n%sides+1;return append('roll',label,{sides,value,modifier,total:value+modifier});},
      heartbeat:async()=>{const raw=readRaw();raw.presence[user.id]={display_name:safeName(user.displayName),last_seen:new Date().toISOString()};writeRaw(raw);},
      notes:async(text)=>{const raw=readRaw();raw.notes[user.id]=String(text).slice(0,8000);writeRaw(raw);},
      saveCharacter:async(characterId,revision,data)=>{const raw=readRaw();if(!raw.heroStates)raw.heroStates={};const old=raw.heroStates[characterId];if((old?.revision??-1)!==revision)throw Error('Karta została zmieniona. Odśwież przed zapisem.');const next=validateCharacter(data);raw.heroStates[characterId]={...next,revision:revision+1};writeRaw(raw);return revision+1;},
      subscribe:fn=>{const onMsg=()=>fn();const onStorage=e=>{if(e.key===key)fn()};channel?.addEventListener('message',onMsg);global.addEventListener('storage',onStorage);return()=>{channel?.removeEventListener('message',onMsg);global.removeEventListener('storage',onStorage);channel?.close();}}}
  }
  async function online(id,user){
    if(!uuid.test(id))throw Error('Nieprawidłowy identyfikator kampanii.');
    const cloud=global.StreamHouseCloud;
    if(!cloud?.configured)throw Error('Skonfiguruj połączenie z Supabase w assets/cloud-config.js.');
    await cloud.init();const auth=cloud.user();if(!auth?.id)throw Error('Zaloguj się do portalu przez Discord.');
    const campaigns=await cloud.listCampaigns();const campaign=campaigns.find(c=>c.id===id);
    if(!campaign)throw Error('Nie należysz do tej kampanii lub kampania nie istnieje.');
    const isGM=campaign.role==='gm'&&campaign.owner_id===auth.id;
    const db=await cloud.client();
    const read=async()=>{
      const [st,ev,pr,notes,characters,heroStates]=await Promise.all([
        db.from('sh_room_states').select('campaign_id,revision,payload,updated_at').eq('campaign_id',id).single(),
        db.from('sh_room_events').select('id,actor_id,kind,body,meta,created_at').eq('campaign_id',id).order('id',{ascending:false}).limit(80),
        db.from('sh_room_presence').select('user_id,display_name,last_seen').eq('campaign_id',id).limit(100),
        isGM?db.from('sh_room_gm_notes').select('content').eq('campaign_id',id).maybeSingle():Promise.resolve({data:null,error:null}),
        cloud.listShared(id),
        db.from('sh_room_character_state').select('character_id,hp,max_hp,inventory,revision').eq('campaign_id',id).limit(100)
      ]);
      const states=new Map(err(heroStates).map(x=>[x.character_id,x]));
      return {state:err(st),events:err(ev).reverse(),presence:err(pr),notes:err(notes)?.content||'',characters:characters.map(x=>({...x,session:states.get(x.id)||null}))};
    };
    return {
      mode:'online',campaign,isGM,userId:auth.id,read,
      update:async(revision,payload)=>{if(!isGM)throw Error('Tylko MG może sterować sceną.');validPayload(payload);return err(await db.rpc('sh_room_update',{p_campaign_id:id,p_revision:revision,p_payload:payload}));},
      post:async(kind,body)=>{if(kind==='handout'&&!isGM)throw Error('Tylko MG może ujawniać wskazówki.');return err(await db.from('sh_room_events').insert({campaign_id:id,actor_id:auth.id,kind,body,meta:{}}).select('id').single());},
      roll:async(sides,modifier,label)=>err(await db.rpc('sh_room_roll',{p_campaign_id:id,p_sides:sides,p_modifier:modifier,p_label:label})),
      heartbeat:async()=>err(await db.from('sh_room_presence').upsert({campaign_id:id,user_id:auth.id,display_name:safeName(user.displayName)},{onConflict:'campaign_id,user_id'}).select('user_id').single()),
      notes:async(text)=>{if(!isGM)throw Error('Prywatne notatki MG są niedostępne.');return err(await db.from('sh_room_gm_notes').upsert({campaign_id:id,content:String(text).slice(0,8000)},{onConflict:'campaign_id'}).select('campaign_id').single());},
      saveCharacter:async(characterId,revision,data)=>{
        if(!uuid.test(characterId))throw Error('Niepoprawny identyfikator postaci.');
        const safe=validateCharacter(data);
        return err(await db.rpc('sh_room_save_character',{p_campaign_id:id,p_character_id:characterId,p_revision:revision,p_hp:safe.hp,p_max_hp:safe.max_hp,p_inventory:safe.inventory}));
      },
      subscribe:fn=>{
        const ch=db.channel('sh-session-'+id+'-'+Math.random().toString(36).slice(2));
        for(const table of ['sh_room_states','sh_room_events','sh_room_presence','sh_room_character_state']){
          ch.on('postgres_changes',{event:'*',schema:'public',table,filter:'campaign_id=eq.'+id},()=>fn());
        }
        ch.subscribe();return()=>{db.removeChannel(ch)};
      }
    };
  }
  global.StreamHouseRoom=Object.freeze({DEFAULT,online,local});
})(window);
