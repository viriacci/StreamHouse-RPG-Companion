
(()=>{'use strict';
const S=window.SH,U=window.StreamHouseV11;if(!S||!U)return;
const mg=document.body.dataset.role==='gm',names=['Siła','Zręczność','Kondycja','Inteligencja','Mądrość','Charyzma'];
const $=id=>document.getElementById(id),hId=new URLSearchParams(location.search).get('player')||'elarion';
const validIndex=x=>Number.isInteger(x)&&x>=0&&x<6;
function changes(hero,p){if(!hero||!U.availableFeats(hero).includes(p.level))return {error:'Ten wybór nie jest już dostępny.'};
 if(p.kind==='feat'){const n=String(p.feat||'').trim();return n.length>=2&&n.length<=90?{stats:[...hero.stats],desc:'Atut: '+n,choice:{level:p.level,kind:'feat',name:n}}:{error:'Wybierz prawidłową nazwę atutu.'}}
 if(p.kind!=='one'&&p.kind!=='two')return {error:'Nieprawidłowy rodzaj wyboru.'};
 if(!validIndex(p.first)|| (p.kind==='two'&&(!validIndex(p.second)||p.first===p.second)))return {error:'Wybierz poprawne, różne atrybuty.'};
 const entries=p.kind==='one'?[[p.first,2]]:[[p.first,1],[p.second,1]];
 const stats=[...hero.stats];
 for(const [i,n] of entries){if(stats[i]+n>20)return {error:names[i]+' nie może przekroczyć 20.'};stats[i]+=n}
 return {stats,desc:entries.map(([i,n])=>`${names[i]} ${hero.stats[i]} → ${stats[i]} (+${n})`).join(' · '),choice:{level:p.level,kind:p.kind,first:p.first,second:p.kind==='two'?p.second:undefined}};
}
if(!mg){
 let pending=S.load('v15-pending-'+hId,null);if(pending&&!U.availableFeats(S.heroes[hId]).includes(pending.level)){pending=null;S.save('v15-pending-'+hId,null)}
 const slot=document.createElement('section');slot.id='v15-development-slot';slot.hidden=true;
 slot.innerHTML='<div class="v15-level-row"><div><strong>Rozwój bohatera</strong><small id="v15-level-status"></small></div><button id="v15-open-level" type="button">✦ Rozwijaj postać</button></div>';
 const heroCard=document.querySelector('.character-hero');heroCard?.after(slot);
 const dialog=document.createElement('div');dialog.id='v15-level-dialog';dialog.className='backdrop hidden';
 dialog.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="v15-level-title"><div class="modal-head"><h2 id="v15-level-title">Rozwój postaci</h2><button class="x" type="button" id="v15-level-x" aria-label="Zamknij">×</button></div><div class="v15-field"><label for="v15-choice-kind">Wybór</label><select id="v15-choice-kind"><option value="one">Jeden atrybut +2</option><option value="two">Dwa różne atrybuty +1 / +1</option><option value="feat">Inny atut</option></select></div><div id="v15-attribute-wrap" class="v15-grid"><div class="v15-field"><label for="v15-first">Pierwszy atrybut</label><select id="v15-first"></select></div><div id="v15-second-wrap" class="v15-field"><label for="v15-second">Drugi atrybut</label><select id="v15-second"></select></div></div><div id="v15-feat-wrap" class="v15-field" hidden><label for="v15-feat">Nazwa atutu</label><input id="v15-feat" maxlength="90" placeholder="np. Alert"></div><div class="v15-preview" id="v15-preview"></div><div class="v15-error" id="v15-error" role="alert"></div><div class="v15-actions"><button class="subtle" id="v15-cancel">Anuluj</button><button id="v15-send">Prześlij MG do zatwierdzenia</button></div></div>`;document.body.append(dialog);
 for(const [i,n] of names.entries())for(const id of ['v15-first','v15-second']){const opt=document.createElement('option');opt.value=String(i);opt.textContent=n;$(id).add(opt)}
 let choiceLevel=null;const myHero=()=>S.heroes[hId];
 function refresh(){const hero=myHero(),levels=U.availableFeats(hero);if(pending&&!levels.includes(pending.level)){pending=null;S.save('v15-pending-'+hId,null)}slot.hidden=levels.length===0&&!pending;if(slot.hidden)return;
 $('v15-open-level').disabled=!!pending;$('v15-open-level').textContent=pending?'⌛ Czeka na MG':'✦ Rozwijaj postać';
 $('v15-level-status').textContent=pending?'Wybór wysłany do Mistrza Gry':`Nowy wybór · poziom ${levels[0]}`;
 }
 function getProposal(){return {id:hId,level:choiceLevel,kind:$('v15-choice-kind').value,first:Number($('v15-first').value),second:Number($('v15-second').value),feat:$('v15-feat').value.trim()}}
 function preview(){const k=$('v15-choice-kind').value;$('v15-attribute-wrap').hidden=k==='feat';$('v15-feat-wrap').hidden=k!=='feat';$('v15-second-wrap').hidden=k!=='two';
 const p=getProposal(),res=changes(myHero(),p);$('v15-preview').textContent=res.error||res.desc;$('v15-error').textContent=res.error||''}
 function close(){S.modal('v15-level-dialog',false)}
 $('v15-open-level').onclick=()=>{const levels=U.availableFeats(myHero());if(!levels.length||pending)return;choiceLevel=levels[0];$('v15-level-title').textContent=myHero().name+' · poziom '+choiceLevel;$('v15-choice-kind').value='one';$('v15-first').value='1';$('v15-second').value='4';$('v15-feat').value='';preview();S.modal('v15-level-dialog',true)};
 $('v15-choice-kind').onchange=preview;$('v15-first').onchange=preview;$('v15-second').onchange=preview;$('v15-feat').oninput=preview;
 $('v15-cancel').onclick=$('v15-level-x').onclick=close;dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
 $('v15-send').onclick=()=>{if(pending)return;const p=getProposal(),res=changes(myHero(),p);if(res.error){$('v15-error').textContent=res.error;return}
 pending={...p,requestId:'adv-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)};S.save('v15-pending-'+hId,pending);S.send('advance:proposal',pending);close();refresh();S.toast('Wybór rozwoju wysłany do MG')};
 S.onMessage((type,data)=>{
  if(type==='character:updated'&&data?.id===hId)requestAnimationFrame(refresh);
  if(type==='hello:state'&&pending)S.send('advance:proposal',pending);
  if(!pending||data?.requestId!==pending.requestId)return;
  if(type==='advance:seen'){$('v15-level-status').textContent='MG otrzymał propozycję';}
  if(type==='advance:resolved'){pending=null;S.save('v15-pending-'+hId,null);refresh();S.toast(data.accepted?'Rozwój postaci zatwierdzony':'MG odrzucił wybór rozwoju')}
 });
 if(pending)S.send('advance:proposal',pending);refresh();
 window.SH_V14_refresh=refresh;
}else{
 const old=document.getElementById('v13-advance-open');if(old){old.disabled=true;old.hidden=true}
 const oldInfo=$('v13-advance-info');if(oldInfo)oldInfo.textContent='Wybór rozwoju wykonuje gracz';
 const modal=document.createElement('div');modal.id='v15-approval-dialog';modal.className='backdrop hidden';modal.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="v15-approval-title"><div class="modal-head"><div><div class="eyebrow">Rozwój postaci</div><h2 id="v15-approval-title">Wybór bohatera</h2></div><button id="v15-approval-x" class="x" type="button">×</button></div><div class="v15-summary"><div class="v15-who" id="v15-approval-who"></div><div class="v15-preview" id="v15-approval-preview"></div><div class="v15-error" id="v15-approval-error"></div></div><div class="v15-actions"><button class="subtle" type="button" id="v15-reject">Odrzuć</button><button type="button" id="v15-approve">✓ OK, zatwierdź</button></div></div>`;document.body.append(modal);
 let queue=[],current=null;const seen=new Set();
 function next(){if(current||!queue.length)return;current=queue.shift();const h=S.heroes[current.id];const ch=changes(h,current);
 $('v15-approval-title').textContent=h.name+' · poziom '+current.level;
 $('v15-approval-who').textContent='Propozycja gracza: '+h.name;
 $('v15-approval-preview').textContent=ch.error||ch.desc;
 $('v15-approval-error').textContent=ch.error||'';
 $('v15-approve').disabled=!!ch.error;S.modal('v15-approval-dialog',true)}
 function complete(approve){if(!current)return;const req=current,hero=S.heroes[req.id],calculated=changes(hero,req);let accepted=approve&&!calculated.error;
 if(accepted){const selections=[...(hero.asiChoices||[]),calculated.choice];U.applyState(req.id,{stats:calculated.stats,asiChoices:selections},true,'Rozwój zatwierdzony');S.addFeed?.('gm-feed','Rozwój: '+hero.name,calculated.desc)}
 S.send('advance:resolved',{id:req.id,requestId:req.requestId,level:req.level,accepted});
 S.modal('v15-approval-dialog',false);current=null;setTimeout(next,100)}
 $('v15-approve').onclick=()=>complete(true);$('v15-reject').onclick=()=>complete(false);$('v15-approval-x').onclick=()=>complete(false);modal.addEventListener('click',e=>{if(e.target===modal)complete(false)});
 S.onMessage((type,data)=>{if(type!=='advance:proposal'||!data||!S.heroes[data.id]||!data.requestId)return;
 if(seen.has(data.requestId)){S.send('advance:seen',{id:data.id,requestId:data.requestId});return}seen.add(data.requestId);queue.push(data);S.send('advance:seen',{id:data.id,requestId:data.requestId});next()});
 S.send('advance:hello',{});
 const manager=document.getElementById('v11-manager');const subtitle=$('v13-advance-info');
 if(subtitle&&manager){new MutationObserver(()=>{subtitle.textContent='Wybór rozwoju wykonuje gracz'}).observe(manager,{attributes:true,attributeFilter:['class']})}
}
})();

;

(function(){'use strict';
const CATALOG=[{"id":"goblin","name":"Szmaragdowa Relikwia","description":"Malachitowa żywica PBR, polerowany minerał i kościane cyfry","a":"#102e2b","b":"#1a8167","edge":"#d3c18a"},{"id":"amethyst","name":"Królewski Ametyst","description":"Fioletowy minerał PBR i metaliczne srebrne krawędzie 3D","a":"#211345","b":"#8b51cc","edge":"#e8cfef"},{"id":"midnight","name":"Nocna Mgławica","description":"Granatowe gwiazdy i pył kosmiczny","a":"#080f2d","b":"#4c2f9c","edge":"#a9b9ef"},{"id":"sapphire","name":"Lodowy Szafir","description":"Przezroczysty błękit kryształu","a":"#0c336f","b":"#27a9e5","edge":"#ccecf6"},{"id":"obsidian","name":"Obsydianowa Korona","description":"Czarny połysk i złote krawędzie","a":"#070b10","b":"#303945","edge":"#d4b276"},{"id":"iron","name":"Stalowy Gwardzista","description":"Zimna szczotkowana stal","a":"#28333f","b":"#a0a8ad","edge":"#dee5e1"},{"id":"brass","name":"Mosiężny Bastion","description":"Złote okucia i przygaszony brąz","a":"#4d3417","b":"#bc8e42","edge":"#f5d28c"},{"id":"ruby","name":"Krwawy Rubin","description":"Głęboka czerwona żywica","a":"#500f1c","b":"#bf2744","edge":"#f6a0aa"},{"id":"ivory","name":"Kość Przodków","description":"Matowa kość i stare ryty","a":"#9d8159","b":"#f8ebd1","edge":"#a37b41"},{"id":"opal","name":"Opal Oceanu","description":"Zmienne turkusowe refleksy","a":"#063e4a","b":"#39b4aa","edge":"#bdebe2"},{"id":"pharaoh","name":"Złoto Faraona","description":"Szlifowane złoto i drobny pył","a":"#55380e","b":"#e5b557","edge":"#f5e1a4"},{"id":"scroll","name":"Runiczny Pergamin","description":"Ciepły pergamin i rzeźbione brzegi","a":"#6a4626","b":"#e9d4aa","edge":"#9d633a"},{"id":"inferno","name":"Piekielna Kuźnia","description":"Żar, pęknięcia i czarne żelazo","a":"#300c0a","b":"#db4f22","edge":"#f0a05b"},{"id":"moonstone","name":"Księżycowy Kryształ","description":"Perłowy szron i lodowe żyłki","a":"#8db5ca","b":"#e3f7f8","edge":"#e9fcff"},{"id":"verdigris","name":"Zatruta Patyna","description":"Postarzana miedź i zielona patyna","a":"#15514b","b":"#83bb98","edge":"#a8d1ae"},{"id":"druid","name":"Serce Puszczy","description":"Zielone drewno z naturalnymi słojami","a":"#1a3323","b":"#538d50","edge":"#bba977"},{"id":"stardust","name":"Astralny Pył","description":"Granat i fiolet z gwiezdnymi refleksami","a":"#150f32","b":"#6c4aaf","edge":"#d0b0f2"},{"id":"amber","name":"Bursztynowy Tron","description":"Ciepła półprzezroczysta żywica","a":"#6b3109","b":"#e9a633","edge":"#f5db91"},{"id":"rose","name":"Różany Opal","description":"Róż, opal i fioletowe cienie","a":"#692a4f","b":"#da8bb9","edge":"#ffe0ed"},{"id":"antique","name":"Stara Korona","description":"Antyczny stop srebra i brązu","a":"#49392c","b":"#b3a084","edge":"#dcc79e"}];
window.StreamHouseDiceSkins=CATALOG;
function buildPicker(select){
 if(!select||select.dataset.shLibrary)return;
 select.dataset.shLibrary='yes';select.textContent='';
 const gal=document.createElement('div');gal.className='sh-skin-gallery';gal.setAttribute('role','group');gal.setAttribute('aria-label','Zestawy kości');
 const txt=document.createElement('div');txt.className='sh-skin-library-heading';txt.textContent='Wybierz zestaw kości';
 const note=document.createElement('div');note.className='sh-skin-choice-note';note.textContent='20 zestawów do wyboru. Szmaragdowa Relikwia i Królewski Ametyst korzystają z materiałów WebGL2/PBR. Ametyst ma osobne metaliczne srebrne krawędzie.';
 for(const item of CATALOG){
  const o=document.createElement('option');o.value=item.id;o.textContent=item.name;select.append(o);
  const btn=document.createElement('button');btn.type='button';btn.className='sh-skin-card';btn.dataset.skin=item.id;
  btn.innerHTML=`<span class="sh-swatch" style="--a:${item.a};--b:${item.b};--edge:${item.edge}">20</span><span><span class="sh-skin-name">${item.name}</span><span class="sh-skin-description">${item.description}</span></span>`;
  btn.onclick=()=>{select.value=item.id;select.dispatchEvent(new Event('change',{bubbles:true}));refresh()};gal.append(btn);
 }
 function refresh(){const id=select.value;gal.querySelectorAll('.sh-skin-card').forEach(b=>{const yes=b.dataset.skin===id;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes))})}
 select.addEventListener('change',refresh);
 const box=document.createElement('div');box.className='sh-skin-library';box.append(txt,gal,note);select.after(box);
 const stored=document.documentElement.dataset.diceTheme||select.value;
 select.value=CATALOG.some(x=>x.id===stored)?stored:'goblin';refresh();
 const parentModal=select.closest('.modal');parentModal?.addEventListener('pointerdown',e=>{if(e.target.closest('.sh-skin-card'))refresh()});
 const observer=new MutationObserver(()=>{if(!select.isConnected){observer.disconnect();return}const stored=document.documentElement.dataset.diceTheme||'goblin';if(stored!==select.value){select.value=stored;refresh()}});
 observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-dice-theme']});
 }
 for(const id of ['sh-player-theme','sh-dice-theme'])buildPicker(document.getElementById(id));
})();