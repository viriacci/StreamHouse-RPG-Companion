const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
const roomScript=fs.readFileSync(require('node:path').join(__dirname,'..','assets','room.js'),'utf8');
const ID='123e4567-e89b-42d3-a456-426614174000', owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', player='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
let characterState=null;const heroId='cccccccc-cccc-4ccc-cccc-cccccccccccc';
let state={campaign_id:ID,revision:0,payload:{chapter:'Rozdział I',scene:'Twierdza',initiative:[],tokens:[]},updated_at:'now'},notes=null,events=[],presence=[];
const chain=(table)=>{
 const obj={select(){return this},eq(){return this},order(){return this},limit(){return this},single(){return Promise.resolve(this.result())},maybeSingle(){return Promise.resolve(this.result())},insert(v){this.inserted=v;return this},upsert(v){this.upserted=v;return this},result(){
 if(this.inserted){events.push({...this.inserted,id:events.length+1,created_at:'now'});return {data:events.at(-1),error:null}}
 if(this.upserted){if(table==='sh_room_presence')presence.push(this.upserted);else notes=this.upserted;return{data:this.upserted,error:null}}
 return {data:table==='sh_room_states'?state:table==='sh_room_events'?events:table==='sh_room_presence'?presence:table==='sh_room_gm_notes'?notes:table==='sh_room_character_state'?(characterState?[characterState]:[]):null,error:null}},
 then(done,fail){return Promise.resolve(this.result()).then(done,fail)}
 };return obj;
};
function client(){return{from:chain,rpc:async(method,v)=>{
 if(method==='sh_room_update'){if(v.p_revision!==state.revision)return{data:null,error:{message:'conflict'}};state={...state,revision:state.revision+1,payload:v.p_payload};return{data:state.revision,error:null}}
 if(method==='sh_room_save_character'){if(v.p_revision!==(characterState?.revision??-1))return{data:null,error:{message:'Konflikt wersji'}};characterState={character_id:v.p_character_id,hp:v.p_hp,max_hp:v.p_max_hp,inventory:v.p_inventory,revision:v.p_revision+1};return{data:characterState.revision,error:null}}
 if(method==='sh_room_roll'){events.push({id:events.length+1,kind:'roll',body:v.p_label,meta:{value:7,total:7+v.p_modifier}});return{data:{value:7,total:7+v.p_modifier},error:null}}
 },channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){} }}
const ctx={window:{},URL,crypto:require('node:crypto').webcrypto,localStorage:{getItem(){return null},setItem(){}},BroadcastChannel:class{postMessage(){} addEventListener(){} removeEventListener(){} close(){}},Date,Math};ctx.window.StreamHouseCloud={configured:true,init:async()=>true,user:()=>({id:owner}),client:async()=>client(),listCampaigns:async()=>[{id:ID,owner_id:owner,role:'gm',title:'Kampania'}],listShared:async()=>[{id:heroId,name:'Ragna',character:{name:'Ragna'}}]};vm.createContext(ctx);vm.runInContext(roomScript,ctx);const api=ctx.window.StreamHouseRoom;
(async()=>{
 const gm=await api.online(ID,{});assert(gm.isGM);assert.equal((await gm.read()).state.revision,0);
 assert.equal(await gm.update(0,{chapter:'II',scene:'Krypta',initiative:[],tokens:[]}),1);assert.equal((await gm.read()).state.revision,1);
 assert.equal(await gm.saveCharacter(heroId,-1,{hp:13,max_hp:20,inventory:['Miecz','Lina']}),0);
 const card=(await gm.read()).characters;assert.equal(card.length,1);assert.equal(card[0].session.hp,13);
 await assert.rejects(()=>gm.saveCharacter(heroId,-1,{hp:14,max_hp:20,inventory:[]}),/Konflikt/);
 await gm.post('handout','Wskazówka');await gm.roll(20,2,'Percepcja');assert.equal(events.length,2);
 ctx.window.StreamHouseCloud.user=()=>({id:player});ctx.window.StreamHouseCloud.listCampaigns=async()=>[{id:ID,owner_id:owner,role:'player',title:'Kampania'}];
 const pl=await api.online(ID,{});assert.equal(pl.isGM,false);
 await assert.rejects(()=>pl.update(1,{}),/Tylko MG/);await assert.rejects(()=>pl.post('handout','Sekret'),/Tylko MG/);
 console.log('MOCK CLOUD PASS: GM update, events, server rolls, member role permissions, character persistence');
})().catch(e=>{console.error(e);process.exitCode=1});
