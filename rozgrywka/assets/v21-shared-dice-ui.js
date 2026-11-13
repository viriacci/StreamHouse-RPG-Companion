(()=>{'use strict';
const S=window.SH;
if(!S)return;
const $all=(q,root=document)=>Array.from(root.querySelectorAll(q));
let menu=null,active=null;
function closeMenu(){if(menu)menu.remove();menu=null;active=null}
function upgrade(select){if(select.dataset.shUpgraded||select.closest('#book-turn'))return;select.dataset.shUpgraded='1';
const wrapper=document.createElement('div');wrapper.className='sh-select-wrap';select.parentNode.insertBefore(wrapper,select);wrapper.append(select);
const btn=document.createElement('button');btn.type='button';btn.className='sh-select-trigger';btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-label',select.getAttribute('aria-label')||select.id||'Wybór');btn.innerHTML='<span class="selected-label"></span><span class="sh-chevron" aria-hidden="true">⌄</span>';wrapper.append(btn);
const sync=()=>{btn.querySelector('.selected-label').textContent=select.selectedOptions[0]?.textContent||'Wybierz';btn.disabled=select.disabled};select.addEventListener('change',sync);sync();
function open(){closeMenu();sync();active=btn;menu=document.createElement('div');menu.className='sh-select-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',btn.getAttribute('aria-label'));
const r=btn.getBoundingClientRect(),height=Math.min(280,window.innerHeight-r.bottom-12);menu.style.cssText=`position:fixed;z-index:12000;left:${Math.max(4,r.left)}px;top:${r.bottom+5}px;min-width:${r.width}px;max-width:min(500px,96vw);max-height:${Math.max(110,height)}px;overflow-y:auto`;
Array.from(select.options).forEach((op,i)=>{const option=document.createElement('button');option.type='button';option.className='sh-select-option'+(op.selected?' selected':'');option.role='option';option.setAttribute('aria-selected',String(op.selected));option.textContent=op.textContent;option.disabled=op.disabled;option.onclick=()=>{select.value=op.value;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));closeMenu();btn.focus()};menu.append(option)});
document.body.append(menu);
const bottom=r.bottom+5+menu.offsetHeight;if(bottom>window.innerHeight-5)menu.style.top=Math.max(5,r.top-menu.offsetHeight-5)+'px';
const selected=menu.querySelector('.selected');selected?.scrollIntoView({block:'nearest'});
}
btn.onclick=()=>{if(active===btn)closeMenu();else open()};btn.onkeydown=e=>{if(e.key==='Escape'){closeMenu();return}if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Enter'||e.key===' '){e.preventDefault();if(active!==btn)open();const options=$all('.sh-select-option:not([disabled])',menu);if(!options.length)return;const focusIdx=Math.max(0,options.indexOf(document.activeElement));options[Math.min(options.length-1,Math.max(0,focusIdx+(e.key==='ArrowUp'?-1:1)))].focus()}};
}
function upgradeAll(){document.querySelectorAll('select:not([data-sh-upgraded])').forEach(upgrade)}
upgradeAll();
if(document.body.dataset.role==='player'){
 const saved=S.load('player-dice-theme','goblin');document.documentElement.dataset.diceTheme=saved;
 const dlg=document.createElement('div');dlg.id='sh-player-dice-dialog';dlg.className='backdrop hidden';dlg.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="player-dice-title"><div class="modal-head"><h2 id="player-dice-title">Wybór kości</h2><button class="x" type="button" id="sh-player-dice-close">×</button></div><div class="field"><label for="sh-player-theme">Zestaw kości</label><select id="sh-player-theme"><option value="goblin">Szmaragdowa Relikwia</option><option value="obsidian">Obsydianowa Korona</option></select></div><div class="modal-actions"><button type="button" class="btn primary" id="sh-player-dice-save">Zapisz wybór</button></div></div>`;document.body.append(dlg);
 const open=()=>{document.getElementById('sh-player-theme').value=document.documentElement.dataset.diceTheme||'goblin';S.modal(dlg.id,true)};
 const close=()=>S.modal(dlg.id,false);
 document.getElementById('sh-game-options')?.addEventListener('click',open);
 document.getElementById('sh-player-dice-close').onclick=close;
 document.getElementById('sh-player-dice-save').onclick=()=>{const theme=document.getElementById('sh-player-theme').value;document.documentElement.dataset.diceTheme=theme;S.save('player-dice-theme',theme);close();S.toast?.('Wybrano zestaw: '+(window.StreamHouseDiceSkins?.find(x=>x.id===theme)?.name||theme))};
 dlg.addEventListener('click',e=>{if(e.target===dlg)close()});
}
const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'))upgradeAll();fixLayers()});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target)&&!(active?.contains(e.target)))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu){closeMenu();return}if(menu&&(e.key==='ArrowDown'||e.key==='ArrowUp')){const options=$all('.sh-select-option:not([disabled])',menu);if(!options.length)return;const idx=options.indexOf(document.activeElement);options[Math.min(options.length-1,Math.max(0,idx+(e.key==='ArrowDown'?1:-1)))].focus();e.preventDefault()}});
window.addEventListener('scroll',e=>{if(menu&&menu.contains(e.target))return;closeMenu()},true);window.addEventListener('resize',closeMenu);
const priority={ 'character-dialog':20,'edit-script-dialog':35,'edit-scene-dialog':35,'clue-dialog':35,'sh-game-dialog':35,'sh-player-dice-dialog':35,'sh-upload-dialog':40,'test-dialog':55,'incoming-dialog':60,'question-dialog':70,'approve-dialog':80 };
let lastOpen=new WeakMap(),seq=0,schedule=false;
function fixLayers(){if(schedule)return;schedule=true;queueMicrotask(()=>{schedule=false;const arr=$all('.backdrop:not(.hidden)');arr.forEach(el=>{if(!lastOpen.has(el))lastOpen.set(el,++seq)});arr.sort((a,b)=>(priority[a.id]||35)-(priority[b.id]||35)||lastOpen.get(a)-lastOpen.get(b));arr.forEach((el,i)=>el.style.setProperty('z-index',String(200+i*10),'important'));const active=arr.at(-1);for(const el of arr)el.setAttribute('aria-hidden',String(el!==active));})}
S.openNotepad=(key='gm')=>{const url=new URL('StreamHouse-v15-Dziennik.html',location.href);url.searchParams.set('key',key);const w=window.open(url.href,'streamhouse-book-'+key,'width=1180,height=900,resizable=yes,scrollbars=yes');if(!w)S.toast?.('Zezwól na otwieranie okien, aby zobaczyć dziennik.');else w.focus()};
const esc=t=>String(t).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
window.SHFormatMods=mods=>(Array.isArray(mods)?mods:[]).map(m=>{const v=Number(m.value)||0;return `<span class="sh-mod-tag ${v>0?'positive':v<0?'negative':'zero'}"><em>${esc(m.label||'Modyfikator')}</em><b>${v>=0?'+':''}${v}</b></span>`}).join('');
})();

;
(()=>{'use strict';
const S=window.SH;
if(!S)return;
const MODELS={"goblin":{"d10":{"vertices":[[-0.0,0.0,-1.0],[0.28574,0.74192,-0.10557],[0.79391,-0.04249,-0.10557],[-0.61731,0.50102,-0.10557],[-0.66726,-0.43228,-0.10557],[0.20492,-0.76818,-0.10557],[0.61731,-0.50102,0.10557],[-0.28574,-0.74192,0.10557],[0.0,0.0,1.0],[0.66726,0.43228,0.10557],[-0.20492,0.76818,0.10557],[-0.79391,0.04249,0.10557]],"triangles":[[0,1,9],[0,9,2],[3,10,1],[3,1,0],[2,6,5],[2,5,0],[3,0,4],[3,4,11],[4,0,5],[4,5,7],[7,5,6],[7,6,8],[8,11,4],[8,4,7],[9,8,6],[9,6,2],[10,8,9],[10,9,1],[11,8,10],[11,10,3]],"polygons":[[0,1,9,2],[3,10,1,0],[2,6,5,0],[3,0,4,11],[4,0,5,7],[7,5,6,8],[8,11,4,7],[9,8,6,2],[10,8,9,1],[11,8,10,3]],"faces":10,"baseVertexCount":12,"sideCounts":[4]},"d100":{"vertices":[[-0.0,-0.0,-1.0],[0.28574,0.74192,-0.10557],[0.79391,-0.04249,-0.10557],[-0.61731,0.50102,-0.10557],[-0.66726,-0.43228,-0.10557],[0.20492,-0.76818,-0.10557],[0.61731,-0.50102,0.10557],[-0.28574,-0.74192,0.10557],[0.0,-0.0,1.0],[0.66726,0.43228,0.10557],[-0.20492,0.76818,0.10557],[-0.79391,0.04249,0.10557]],"triangles":[[0,1,9],[0,9,2],[3,10,1],[3,1,0],[2,6,5],[2,5,0],[3,0,4],[3,4,11],[4,0,5],[4,5,7],[7,5,6],[7,6,8],[8,11,4],[8,4,7],[9,8,6],[9,6,2],[10,8,9],[10,9,1],[11,8,10],[11,10,3]],"polygons":[[0,1,9,2],[3,10,1,0],[2,6,5,0],[3,0,4,11],[4,0,5,7],[7,5,6,8],[8,11,4,7],[9,8,6,2],[10,8,9,1],[11,8,10,3]],"faces":10,"baseVertexCount":12,"sideCounts":[4]},"d12":{"vertices":[[-0.72941,0.65798,-0.18714],[-0.45118,0.4067,-0.79438],[-0.20317,0.96097,0.18776],[-0.97666,0.10362,0.18815],[-0.60322,0.064,0.795],[-0.85124,-0.49027,-0.18714],[-0.52648,-0.30296,-0.79438],[-0.40029,-0.89694,0.18776],[-0.24701,-0.55438,0.79476],[0.20317,-0.96097,-0.18776],[0.72941,-0.65798,0.18714],[0.12518,-0.59387,-0.79476],[0.60322,-0.064,-0.795],[0.24701,0.55438,-0.79476],[0.97666,-0.10362,-0.18815],[0.85124,0.49027,0.18714],[0.52648,0.30296,0.79438],[0.40029,0.89694,-0.18776],[0.45118,-0.4067,0.79438],[-0.12518,0.59387,0.79476]],"triangles":[[0,2,17],[0,17,13],[0,13,1],[0,1,6],[0,6,5],[0,5,3],[0,3,4],[0,4,19],[0,19,2],[3,5,7],[3,7,8],[3,8,4],[6,11,9],[6,9,7],[6,7,5],[10,18,8],[10,8,7],[10,7,9],[10,9,11],[10,11,12],[10,12,14],[1,13,12],[1,12,11],[1,11,6],[15,14,12],[15,12,13],[15,13,17],[10,14,15],[10,15,16],[10,16,18],[2,19,16],[2,16,15],[2,15,17],[8,18,16],[8,16,19],[8,19,4]],"polygons":[[0,2,17,13,1],[0,1,6,5,3],[0,3,4,19,2],[3,5,7,8,4],[6,11,9,7,5],[10,18,8,7,9],[10,9,11,12,14],[1,13,12,11,6],[15,14,12,13,17],[10,14,15,16,18],[2,19,16,15,17],[8,18,16,19,4]],"faces":12,"baseVertexCount":20,"sideCounts":[5]},"d20":{"vertices":[[-0.39863,0.89772,0.18759],[0.57813,0.79408,-0.18759],[0.3573,0.49077,0.79465],[-0.24637,0.55482,-0.79465],[-0.60368,0.06405,0.79465],[-0.97676,0.10364,-0.1876],[-0.57813,-0.79408,0.18759],[-0.3573,-0.49077,-0.79465],[0.39863,-0.89772,-0.18759],[0.60368,-0.06405,-0.79465],[0.97676,-0.10364,0.1876],[0.24637,-0.55482,0.79465]],"triangles":[[2,1,0],[3,0,1],[0,4,2],[0,3,5],[0,5,4],[6,5,7],[6,4,5],[5,3,7],[7,8,6],[8,7,9],[9,7,3],[1,10,9],[8,9,10],[1,9,3],[1,2,10],[8,10,11],[10,2,11],[6,11,4],[11,6,8],[4,11,2]],"polygons":[[2,1,0],[3,0,1],[0,4,2],[0,3,5],[0,5,4],[6,5,7],[6,4,5],[5,3,7],[7,8,6],[8,7,9],[9,7,3],[1,10,9],[8,9,10],[1,9,3],[1,2,10],[8,10,11],[10,2,11],[6,11,4],[11,6,8],[4,11,2]],"faces":20,"baseVertexCount":12,"sideCounts":[3]},"d4":{"vertices":[[-0.0,0.0,1.0],[0.7622,-0.55492,-0.33333],[0.09948,0.93755,-0.33333],[-0.86168,-0.38263,-0.33333]],"triangles":[[0,3,1],[0,1,2],[0,2,3],[2,1,3]],"polygons":[[0,3,1],[0,1,2],[0,2,3],[2,1,3]],"faces":4,"baseVertexCount":4,"sideCounts":[3]},"d6":{"vertices":[[0.57664,0.57806,0.57735],[0.57806,-0.57664,0.57735],[-0.57806,0.57664,0.57735],[0.57664,0.57806,-0.57735],[-0.57806,0.57664,-0.57735],[0.57806,-0.57664,-0.57735],[-0.57664,-0.57806,-0.57735],[-0.57664,-0.57806,0.57735]],"triangles":[[0,1,5],[0,5,3],[0,2,7],[0,7,1],[0,3,4],[0,4,2],[6,4,3],[6,3,5],[6,5,1],[6,1,7],[6,7,2],[6,2,4]],"polygons":[[0,1,5,3],[0,2,7,1],[0,3,4,2],[6,4,3,5],[6,5,1,7],[6,7,2,4]],"faces":6,"baseVertexCount":8,"sideCounts":[4]},"d8":{"vertices":[[0.05344,0.99857,0.0],[-0.99857,0.05344,0.0],[-0.0,0.0,-1.0],[0.99857,-0.05344,0.0],[-0.0,0.0,1.0],[-0.05344,-0.99857,0.0]],"triangles":[[4,0,1],[2,1,0],[2,0,3],[4,3,0],[4,1,5],[4,5,3],[2,3,5],[2,5,1]],"polygons":[[4,0,1],[2,1,0],[2,0,3],[4,3,0],[4,1,5],[4,5,3],[2,3,5],[2,5,1]],"faces":8,"baseVertexCount":6,"sideCounts":[3]}},"metal":{"d10":{"vertices":[[-0.0,0.0,-1.0],[0.28574,0.74192,-0.10557],[0.79391,-0.04249,-0.10557],[-0.61731,0.50102,-0.10557],[-0.66726,-0.43228,-0.10557],[0.20492,-0.76818,-0.10557],[0.61731,-0.50102,0.10557],[-0.28574,-0.74192,0.10557],[0.0,0.0,1.0],[0.66726,0.43228,0.10557],[-0.20492,0.76818,0.10557],[-0.79391,0.04249,0.10557]],"triangles":[[0,1,9],[0,9,2],[3,10,1],[3,1,0],[2,6,5],[2,5,0],[3,0,4],[3,4,11],[4,0,5],[4,5,7],[7,5,6],[7,6,8],[8,11,4],[8,4,7],[9,8,6],[9,6,2],[10,8,9],[10,9,1],[11,8,10],[11,10,3]],"polygons":[[0,1,9,2],[3,10,1,0],[2,6,5,0],[3,0,4,11],[4,0,5,7],[7,5,6,8],[8,11,4,7],[9,8,6,2],[10,8,9,1],[11,8,10,3]],"faces":10,"baseVertexCount":12,"sideCounts":[4]},"d100":{"vertices":[[-0.0,-0.0,-1.0],[0.28574,0.74192,-0.10557],[0.79391,-0.04249,-0.10557],[-0.61731,0.50102,-0.10557],[-0.66726,-0.43228,-0.10557],[0.20492,-0.76818,-0.10557],[0.61731,-0.50102,0.10557],[-0.28574,-0.74192,0.10557],[0.0,-0.0,1.0],[0.66726,0.43228,0.10557],[-0.20492,0.76818,0.10557],[-0.79391,0.04249,0.10557]],"triangles":[[0,1,9],[0,9,2],[3,10,1],[3,1,0],[2,6,5],[2,5,0],[3,0,4],[3,4,11],[4,0,5],[4,5,7],[7,5,6],[7,6,8],[8,11,4],[8,4,7],[9,8,6],[9,6,2],[10,8,9],[10,9,1],[11,8,10],[11,10,3]],"polygons":[[0,1,9,2],[3,10,1,0],[2,6,5,0],[3,0,4,11],[4,0,5,7],[7,5,6,8],[8,11,4,7],[9,8,6,2],[10,8,9,1],[11,8,10,3]],"faces":10,"baseVertexCount":12,"sideCounts":[4]},"d12":{"vertices":[[-0.72941,0.65798,-0.18714],[-0.45118,0.4067,-0.79438],[-0.20317,0.96097,0.18776],[-0.97666,0.10362,0.18815],[-0.60322,0.064,0.795],[-0.85124,-0.49027,-0.18714],[-0.52648,-0.30296,-0.79438],[-0.40029,-0.89694,0.18776],[-0.24701,-0.55438,0.79476],[0.20317,-0.96097,-0.18776],[0.72941,-0.65798,0.18714],[0.12518,-0.59387,-0.79476],[0.60322,-0.064,-0.795],[0.24701,0.55438,-0.79476],[0.97666,-0.10362,-0.18815],[0.85124,0.49027,0.18714],[0.52648,0.30296,0.79438],[0.40029,0.89694,-0.18776],[0.45118,-0.4067,0.79438],[-0.12518,0.59387,0.79476]],"triangles":[[0,2,17],[0,17,13],[0,13,1],[0,1,6],[0,6,5],[0,5,3],[0,3,4],[0,4,19],[0,19,2],[3,5,7],[3,7,8],[3,8,4],[6,11,9],[6,9,7],[6,7,5],[10,18,8],[10,8,7],[10,7,9],[10,9,11],[10,11,12],[10,12,14],[1,13,12],[1,12,11],[1,11,6],[15,14,12],[15,12,13],[15,13,17],[10,14,15],[10,15,16],[10,16,18],[2,19,16],[2,16,15],[2,15,17],[8,18,16],[8,16,19],[8,19,4]],"polygons":[[0,2,17,13,1],[0,1,6,5,3],[0,3,4,19,2],[3,5,7,8,4],[6,11,9,7,5],[10,18,8,7,9],[10,9,11,12,14],[1,13,12,11,6],[15,14,12,13,17],[10,14,15,16,18],[2,19,16,15,17],[8,18,16,19,4]],"faces":12,"baseVertexCount":20,"sideCounts":[5]},"d20":{"vertices":[[-0.39863,0.89772,0.18759],[0.57813,0.79408,-0.18759],[0.3573,0.49077,0.79465],[-0.24637,0.55482,-0.79465],[-0.60368,0.06405,0.79465],[-0.97676,0.10364,-0.1876],[-0.57813,-0.79408,0.18759],[-0.3573,-0.49077,-0.79465],[0.39863,-0.89772,-0.18759],[0.60368,-0.06405,-0.79465],[0.97676,-0.10364,0.1876],[0.24637,-0.55482,0.79465]],"triangles":[[2,1,0],[3,0,1],[0,4,2],[0,3,5],[0,5,4],[6,5,7],[6,4,5],[5,3,7],[7,8,6],[8,7,9],[9,7,3],[1,10,9],[8,9,10],[1,9,3],[1,2,10],[8,10,11],[10,2,11],[6,11,4],[11,6,8],[4,11,2]],"polygons":[[2,1,0],[3,0,1],[0,4,2],[0,3,5],[0,5,4],[6,5,7],[6,4,5],[5,3,7],[7,8,6],[8,7,9],[9,7,3],[1,10,9],[8,9,10],[1,9,3],[1,2,10],[8,10,11],[10,2,11],[6,11,4],[11,6,8],[4,11,2]],"faces":20,"baseVertexCount":12,"sideCounts":[3]},"d4":{"vertices":[[-0.0,0.0,1.0],[0.7622,-0.55492,-0.33333],[0.09948,0.93755,-0.33333],[-0.86168,-0.38263,-0.33333]],"triangles":[[0,3,1],[0,1,2],[0,2,3],[2,1,3]],"polygons":[[0,3,1],[0,1,2],[0,2,3],[2,1,3]],"faces":4,"baseVertexCount":4,"sideCounts":[3]},"d6":{"vertices":[[0.57664,0.57806,0.57735],[0.57806,-0.57664,0.57735],[-0.57806,0.57664,0.57735],[0.57664,0.57806,-0.57735],[-0.57806,0.57664,-0.57735],[0.57806,-0.57664,-0.57735],[-0.57664,-0.57806,-0.57735],[-0.57664,-0.57806,0.57735]],"triangles":[[0,1,5],[0,5,3],[0,2,7],[0,7,1],[0,3,4],[0,4,2],[6,4,3],[6,3,5],[6,5,1],[6,1,7],[6,7,2],[6,2,4]],"polygons":[[0,1,5,3],[0,2,7,1],[0,3,4,2],[6,4,3,5],[6,5,1,7],[6,7,2,4]],"faces":6,"baseVertexCount":8,"sideCounts":[4]},"d8":{"vertices":[[0.05344,0.99857,0.0],[-0.99857,0.05344,0.0],[-0.0,0.0,-1.0],[0.99857,-0.05344,0.0],[-0.0,0.0,1.0],[-0.05344,-0.99857,0.0]],"triangles":[[4,0,1],[2,1,0],[2,0,3],[4,3,0],[4,1,5],[4,5,3],[2,3,5],[2,5,1]],"polygons":[[4,0,1],[2,1,0],[2,0,3],[4,3,0],[4,1,5],[4,5,3],[2,3,5],[2,5,1]],"faces":8,"baseVertexCount":6,"sideCounts":[3]}}};
const overlay=document.getElementById('ritual-overlay');
const stage=overlay?.querySelector('.dice-stage');
if(!overlay||!stage)return;
stage.innerHTML='<canvas id="streamhouse-dice-canvas" aria-label="Obracające się modele kości w 3D"></canvas>';
const canvas=document.getElementById('streamhouse-dice-canvas');
const ctx=canvas.getContext('2d',{alpha:true,desynchronized:false});
const $=id=>overlay.querySelector('#'+id);
const final=$('ritual-final'),close=$('ritual-close'),title=$('ritual-title'),sub=$('ritual-under');
const themes={"goblin":{"a":"#102e2b","b":"#1a8167","c":"#071c18","edge":"#d3c18a","bright":"#fff2ca","ink":"#fff2ca","pattern":"marble","mesh":"goblin","name":"Szmaragdowa Relikwia"},"amethyst":{"a":"#211345","b":"#8b51cc","c":"#160e29","edge":"#e8cfef","bright":"#ffffff","ink":"#ffffff","pattern":"nebula","mesh":"goblin","name":"Królewski Ametyst"},"midnight":{"a":"#080f2d","b":"#4c2f9c","c":"#050619","edge":"#a9b9ef","bright":"#fcfaff","ink":"#fcfaff","pattern":"galaxy","mesh":"goblin","name":"Nocna Mgławica"},"sapphire":{"a":"#0c336f","b":"#27a9e5","c":"#071941","edge":"#ccecf6","bright":"#ffffff","ink":"#ffffff","pattern":"crystal","mesh":"goblin","name":"Lodowy Szafir"},"obsidian":{"a":"#070b10","b":"#303945","c":"#03060b","edge":"#d4b276","bright":"#fff1d3","ink":"#fff1d3","pattern":"obsidian","mesh":"metal","name":"Obsydianowa Korona"},"iron":{"a":"#28333f","b":"#a0a8ad","c":"#101820","edge":"#dee5e1","bright":"#fff9ec","ink":"#fff9ec","pattern":"metal","mesh":"metal","name":"Stalowy Gwardzista"},"brass":{"a":"#4d3417","b":"#bc8e42","c":"#251707","edge":"#f5d28c","bright":"#fff6d9","ink":"#fff6d9","pattern":"metal","mesh":"metal","name":"Mosiężny Bastion"},"ruby":{"a":"#500f1c","b":"#bf2744","c":"#1e0710","edge":"#f6a0aa","bright":"#fff5ed","ink":"#fff5ed","pattern":"crystal","mesh":"goblin","name":"Krwawy Rubin"},"ivory":{"a":"#9d8159","b":"#f8ebd1","c":"#6f573b","edge":"#a37b41","bright":"#4c351d","ink":"#4c351d","pattern":"bone","mesh":"goblin","name":"Kość Przodków"},"opal":{"a":"#063e4a","b":"#39b4aa","c":"#112544","edge":"#bdebe2","bright":"#f6ffff","ink":"#f6ffff","pattern":"opal","mesh":"goblin","name":"Opal Oceanu"},"pharaoh":{"a":"#55380e","b":"#e5b557","c":"#251808","edge":"#f5e1a4","bright":"#fff4d7","ink":"#fff4d7","pattern":"sand","mesh":"metal","name":"Złoto Faraona"},"scroll":{"a":"#6a4626","b":"#e9d4aa","c":"#49351d","edge":"#9d633a","bright":"#4b311e","ink":"#4b311e","pattern":"parchment","mesh":"goblin","name":"Runiczny Pergamin"},"inferno":{"a":"#300c0a","b":"#db4f22","c":"#120607","edge":"#f0a05b","bright":"#ffe8ba","ink":"#ffe8ba","pattern":"lava","mesh":"metal","name":"Piekielna Kuźnia"},"moonstone":{"a":"#8db5ca","b":"#e3f7f8","c":"#5c768e","edge":"#e9fcff","bright":"#17394a","ink":"#17394a","pattern":"ice","mesh":"goblin","name":"Księżycowy Kryształ"},"verdigris":{"a":"#15514b","b":"#83bb98","c":"#312823","edge":"#a8d1ae","bright":"#f8f0cc","ink":"#f8f0cc","pattern":"patina","mesh":"metal","name":"Zatruta Patyna"},"druid":{"a":"#1a3323","b":"#538d50","c":"#0b1b11","edge":"#bba977","bright":"#fff8da","ink":"#fff8da","pattern":"wood","mesh":"goblin","name":"Serce Puszczy"},"stardust":{"a":"#150f32","b":"#6c4aaf","c":"#060c27","edge":"#d0b0f2","bright":"#fffaff","ink":"#fffaff","pattern":"galaxy","mesh":"goblin","name":"Astralny Pył"},"amber":{"a":"#6b3109","b":"#e9a633","c":"#3b1706","edge":"#f5db91","bright":"#fff5d6","ink":"#fff5d6","pattern":"amber","mesh":"goblin","name":"Bursztynowy Tron"},"rose":{"a":"#692a4f","b":"#da8bb9","c":"#2c1d42","edge":"#ffe0ed","bright":"#ffffff","ink":"#ffffff","pattern":"opal","mesh":"goblin","name":"Różany Opal"},"antique":{"a":"#49392c","b":"#b3a084","c":"#181713","edge":"#dcc79e","bright":"#fff6df","ink":"#fff6df","pattern":"aged","mesh":"metal","name":"Stara Korona"}};

const skinTextureCache=new Map();
function textureFor(id,pal){
 if(skinTextureCache.has(id))return skinTextureCache.get(id);
 const out=document.createElement('canvas');out.width=out.height=256;const c=out.getContext('2d',{willReadFrequently:false});const pixels=c.createImageData(256,256);const rgb0=hexRgb(pal.a),rgb1=hexRgb(pal.b),rgb2=hexRgb(pal.c);
 const hash=(ix,iy,seed=0)=>{let n=Math.imul(ix+seed*13,374761393)+Math.imul(iy-seed*17,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295};
 const noise=(x,y,seed=1)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);const aa=hash(xi,yi,seed),ba=hash(xi+1,yi,seed),ab=hash(xi,yi+1,seed),bb=hash(xi+1,yi+1,seed);return (aa+(ba-aa)*u)*(1-v)+(ab+(bb-ab)*u)*v};
 const fractal=(x,y,seed)=>noise(x*3,y*3,seed)*.53+noise(x*9,y*9,seed+3)*.3+noise(x*27,y*27,seed+7)*.17;
 const clamp01=x=>Math.max(0,Math.min(1,x));
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
   const u=x/256,v=y/256,n=fractal(u,v,17),tiny=noise(u*180,v*180,33);
   let t=n,glimmer=0;const wave=Math.sin((u*7+v*3+n*2)*Math.PI*2);
   switch(pal.pattern){
     case 'marble': t=clamp01(n*.65+Math.sin((u*6+v*4+fractal(u,v,37)*2)*Math.PI*2)*.22+.1);glimmer=.13*Math.max(0,Math.sin((u+v+n)*48));break;
     case 'nebula': t=clamp01(.3+n*.58+.21*Math.sin((u*2-v+fractal(u,v,31)*3)*9));glimmer=.15*Math.max(0,Math.sin((u*1.7+v+n)*47));break;
     case 'galaxy': t=clamp01(n*.75+.18*Math.sin((u*3+v*2)*7));glimmer=hash(x,y,39)>.997?.75:0;break;
     case 'crystal': t=clamp01(n*.55+(Math.abs((u*5+v*6+noise(u*5,v*5,4)*2)%1-.5)<.06?.45:0));glimmer=tiny>.88?.18:0;break;
     case 'obsidian':t=clamp01(.10+n*.24+.15*Math.pow(Math.max(0,wave),6));glimmer=tiny>.99?.10:0;break;
     case 'metal':t=clamp01(.2+n*.58+.12*Math.sin(u*260)+.06*Math.sin(v*600));glimmer=.15*Math.abs(Math.sin(u*160));break;
     case 'bone':t=clamp01(.45+n*.38+.12*Math.sin(u*25+fractal(u,v,12)*4));break;
     case 'opal':t=clamp01(n*.45+.25*Math.sin((u*5-v*3+n*3)*9)+.24);glimmer=.25*Math.max(0,Math.sin(u*20+v*25));break;
     case 'sand':t=clamp01(.35+n*.4+tiny*.2);glimmer=tiny>.91?.23:0;break;
     case 'parchment':t=clamp01(.45+n*.25+.09*Math.sin((u+v)*20));break;
     case 'lava':t=clamp01(.15+n*.4+(Math.abs(Math.sin((u*5+fractal(u,v,8)*3+v*5)*7))>.94?.57:0));glimmer=t*.18;break;
     case 'ice':t=clamp01(.33+n*.43+(Math.abs(Math.sin((u*8+v*2+n*3)*11))>.93?.22:0));glimmer=.15;break;
     case 'patina':t=clamp01(n*.57+.25*Math.sin((u*4+v*8)*6));break;
     case 'wood':t=clamp01(.35+n*.22+.31*Math.sin((Math.hypot(u-.45,v-.37)*10+n*1.5)*14));break;
     case 'amber':t=clamp01(.24+n*.55+.1*Math.sin((u*2+v*4)*11));glimmer=.12;break;
     case 'aged':t=clamp01(n*.62+.18*Math.sin((u*2+v)*25));break;
   }
   const from=t<.5?rgb2:rgb0,to=t<.5?rgb0:rgb1,fac=t<.5?t*2:t*2-1;
   const k=(y*256+x)*4;for(let ch=0;ch<3;ch++)pixels.data[k+ch]=Math.min(255,from[ch]*(1-fac)+to[ch]*fac+glimmer*110+(tiny-.5)*13);
   pixels.data[k+3]=255;
 }
 c.putImageData(pixels,0,0);skinTextureCache.set(id,out);return out;
}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function hexRgb(h){const v=h.replace('#','');return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16))}
function mix(a,b,t){const x=hexRgb(a),y=hexRgb(b);return `rgb(${x.map((v,i)=>Math.round(v*(1-t)+y[i]*t)).join(',')})`}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function vecSub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function mul(a,t){return a.map(v=>v*t)}
function norm(a){const l=Math.hypot(...a)||1;return a.map(v=>v/l)}
function qNorm(q){const l=Math.hypot(...q)||1;return q.map(v=>v/l)}
function qMul(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]}
function qAxis(axis,angle){const s=Math.sin(angle/2),n=norm(axis);return [n[0]*s,n[1]*s,n[2]*s,Math.cos(angle/2)]}
function qFromTo(a,b){a=norm(a);b=norm(b);const d=dot(a,b);if(d<-.999)return qAxis([1,0,0],Math.PI);const c=cross(a,b);return qNorm([c[0],c[1],c[2],1+d])}
function qRotate(q,v){const u=q.slice(0,3),s=q[3],d=dot(u,v),uu=dot(u,u),c=cross(u,v);return [0,1,2].map(i=>2*d*u[i]+(s*s-uu)*v[i]+2*s*c[i])}
function qSlerp(a,b,t){let d=dot(a,b);if(d<0){b=b.map(v=>-v);d=-d}if(d>.9995)return qNorm(a.map((v,i)=>v+(b[i]-v)*t));const theta=Math.acos(clamp(d,-1,1)),sn=Math.sin(theta);const x=Math.sin((1-t)*theta)/sn,y=Math.sin(t*theta)/sn;return a.map((v,i)=>v*x+b[i]*y)}
function qSpin(t,offset){const pi=Math.PI;return qNorm(qMul(qAxis([0,1,0],(4.1*t+offset)*pi*2),qMul(qAxis([1,0,0],(2.5*t+offset*.25)*pi*2),qAxis([0,0,1],(1.3*t+.11)*pi*2))))}
const faceCache={};
function facesFor(set,sides){const key=set+'_'+sides;if(faceCache[key])return faceCache[key];let mesh=MODELS[set]?.['d'+sides]||MODELS.goblin['d'+(sides===100?10:sides)]||MODELS.goblin.d20;
const vertices=mesh.vertices,faces=mesh.polygons.map((indices,i)=>{const points=indices.map(j=>vertices[j]),center=mul(points.reduce((acc,v)=>[acc[0]+v[0],acc[1]+v[1],acc[2]+v[2]],[0,0,0]),1/points.length);let n=norm(cross(vecSub(points[1],points[0]),vecSub(points[2],points[0])));if(dot(n,center)<0)n=n.map(v=>-v);return {points,center,normal:n,index:i}});
return faceCache[key]={faces,vertices};}
function faceNumber(sides,index,tens){if(sides===100&&tens)return String(index*10).padStart(2,'0');if(sides===10||sides===100)return index===9?'0':String(index+1);return String(index+1)}
function winningFace(sides,value,tens){if(sides===100){if(tens)return Math.floor((value%100)/10)%10;return (value%10+9)%10}return ((Math.max(1,value)-1)%sides)}
function targetQuat(face,yaw=0){return qMul(qAxis([0,0,1],yaw),qFromTo(face.normal,[0,0,1]))}
function project(pt,w,h){const f=h*1.52,z=5.1-pt[2];return [w/2+pt[0]/z*f,h/2-pt[1]/z*f]}
let canvasW=800,canvasH=390;
function resize(){const rect=canvas.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1);canvasW=canvas.width=Math.max(320,Math.round(rect.width*dpr));canvasH=canvas.height=Math.max(240,Math.round(rect.height*dpr))}
const tex=document.createElement('canvas');tex.width=tex.height=256;const tc=tex.getContext('2d');const img=tc.createImageData(256,256);let seed=42;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};for(let i=0;i<img.data.length;i+=4){const a=rnd()*40;img.data[i]=245;img.data[i+1]=220;img.data[i+2]=170;img.data[i+3]=a}tc.putImageData(img,0,0);
function paintBackground(w,h,n){ctx.save();for(let i=0;i<n;i++){const x=w/2+(n===2?(i===0?-.22:.22):0)*w;const r=ctx.createRadialGradient(x,h*.74,2,x,h*.74,h*.48);r.addColorStop(0,'#000b');r.addColorStop(.4,'#0006');r.addColorStop(1,'#0000');ctx.fillStyle=r;ctx.fillRect(x-h*.48,h*.3,h*.96,h*.96)}ctx.restore()}
function paintOne(dice,w,h,theme,finished){const pal=themes[theme]||themes.goblin,set=(pal.mesh==='metal'?'metal':'goblin');const base=facesFor(set,dice.sides===100?10:dice.sides);
const points=base.faces.map(f=>{const localpts=f.points.map(p=>qRotate(dice.q,mul(p,dice.scale))),worldpts=localpts.map(p=>[p[0]+dice.x,p[1]+dice.y,p[2]]);const center=mul(worldpts.reduce((acc,v)=>[acc[0]+v[0],acc[1]+v[1],acc[2]+v[2]],[0,0,0]),1/worldpts.length);const normal=qRotate(dice.q,f.normal);return {...f,worldpts,screen:worldpts.map(v=>project(v,w,h)),center,normal,depth:center[2]}});
points.sort((a,b)=>a.depth-b.depth);
for(const f of points){if(dot(f.normal,[0,0,1])<.10)continue;const ps=f.screen;
ctx.save();ctx.beginPath();ctx.moveTo(ps[0][0],ps[0][1]);ps.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));ctx.closePath();
const diffuse=clamp(.5+dot(f.normal,norm([-.48,.72,1.2]))*.28,0.18,1),peak=clamp(diffuse*1.3,0,1),shade=clamp(.52-diffuse*.36,.04,.5),minY=Math.min(...ps.map(p=>p[1])),maxY=Math.max(...ps.map(p=>p[1]));
const grad=ctx.createLinearGradient(0,minY,0,maxY);grad.addColorStop(0,mix(pal.a,pal.b,peak));grad.addColorStop(.52,mix(pal.a,pal.c,shade));grad.addColorStop(1,mix(pal.c,pal.a,Math.max(.1,diffuse*.45)));ctx.fillStyle=grad;ctx.shadowColor='#000c';ctx.shadowBlur=23;ctx.fill();ctx.shadowBlur=0;
ctx.save();ctx.clip();ctx.globalAlpha=pal.pattern==='metal'?.42:pal.pattern==='obsidian'?.52:.76;const surface=textureFor(theme,pal);const mids=[ps.reduce((q,p)=>q+p[0],0)/ps.length,ps.reduce((q,p)=>q+p[1],0)/ps.length];const span=Math.max(36,Math.hypot(ps[0][0]-mids[0],ps[0][1]-mids[1])*2.15);ctx.drawImage(surface,mids[0]-span,mids[1]-span,span*2,span*2);ctx.restore();
ctx.save();ctx.clip();const middle=[ps.reduce((v,p)=>v+p[0],0)/ps.length,ps.reduce((v,p)=>v+p[1],0)/ps.length],size=Math.max(15,Math.hypot(ps[0][0]-middle[0],ps[0][1]-middle[1]));
const highlight=ctx.createRadialGradient(middle[0]-size*.38,middle[1]-size*.58,2,middle[0],middle[1],size*1.3);
highlight.addColorStop(0,pal.pattern==='metal'?'#fff9de91':'#f5e6a65a');highlight.addColorStop(.44,pal.pattern==='metal'?'#b6d0dd22':'#d5a7681d');highlight.addColorStop(1,'#00000000');
ctx.globalCompositeOperation='screen';ctx.fillStyle=highlight;ctx.fillRect(middle[0]-size*1.5,middle[1]-size*1.5,size*3,size*3);
ctx.globalCompositeOperation='source-over';ctx.globalAlpha=pal.pattern==='metal'?.20:.12;ctx.strokeStyle=pal.pattern==='metal'?'#f1e9d0':'#d6bf7d';ctx.lineWidth=.5;
for(let k=0;k<8;k++){const off=(k-4)*size*.28;ctx.beginPath();ctx.moveTo(middle[0]-size*.9,middle[1]+off);ctx.lineTo(middle[0]+size*.86,middle[1]+off-size*.25);ctx.stroke()}ctx.restore();
ctx.beginPath();ctx.moveTo(ps[0][0],ps[0][1]);ps.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));ctx.closePath();
ctx.save();ctx.clip();ctx.globalAlpha=pal.pattern==='metal'?.2:.13;ctx.fillStyle=ctx.createPattern(tex,'repeat');ctx.fillRect(0,0,w,h);ctx.restore();
ctx.beginPath();ctx.moveTo(ps[0][0],ps[0][1]);ps.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));ctx.closePath();
const win=finished&&f.index===dice.winner;
const rim=ctx.createLinearGradient(ps[0][0],ps[0][1],ps[2][0],ps[2][1]);
rim.addColorStop(0,'#fff9e6');rim.addColorStop(.21,pal.edge);rim.addColorStop(.55,mix(pal.edge,pal.c,.54));rim.addColorStop(.83,'#ead6ac');rim.addColorStop(1,pal.edge);
ctx.strokeStyle=win?'#ffe3a0':rim;ctx.lineWidth=win?Math.max(1.2,w/700):Math.max(.55,w/1500);
if(win){ctx.shadowBlur=28;ctx.shadowColor='#ffd578';ctx.stroke();ctx.shadowBlur=14;ctx.shadowColor='#ffd577'}ctx.stroke();ctx.shadowBlur=0;
ctx.globalAlpha=.65;ctx.strokeStyle=win?'#fff1be':mix(pal.edge,pal.b,.35);ctx.lineWidth=Math.max(.325,w/3100);ctx.stroke();ctx.globalAlpha=1;
const sc=[ps.reduce((v,p)=>v+p[0],0)/ps.length,ps.reduce((v,p)=>v+p[1],0)/ps.length],faceText=faceNumber(dice.sides,f.index,dice.tens);
const minToEdge=Math.min(...ps.map((p,i)=>{const n=ps[(i+1)%ps.length],dx=n[0]-p[0],dy=n[1]-p[1];return Math.abs(dx*(sc[1]-p[1])-dy*(sc[0]-p[0]))/(Math.hypot(dx,dy)||1)}));
if(minToEdge>7*(w/800)){
 ctx.save();ctx.clip();ctx.textAlign='center';ctx.textBaseline='middle';
 let fs=Math.min(minToEdge*1.34,28*(w/800));ctx.font=`700 ${fs}px Georgia,serif`;
 while(fs>8*(w/800)&&ctx.measureText(faceText).width>minToEdge*1.63){fs*=.89;ctx.font=`700 ${fs}px Georgia,serif`}
 if(ctx.measureText(faceText).width<=minToEdge*1.74){ctx.lineWidth=Math.max(1,w/900);ctx.strokeStyle=pal.pattern==='parchment'||pal.pattern==='bone'?'#f6e7c1':'#101811';ctx.shadowColor=win?'#e6c580':'#0008';ctx.shadowBlur=win?9:3;ctx.strokeText(faceText,sc[0],sc[1]);ctx.fillStyle=pal.ink;ctx.fillText(faceText,sc[0],sc[1]);ctx.shadowBlur=0}
 ctx.restore();
}
ctx.restore();}
}
function renderFrame(items,theme,finished){const w=canvasW,h=canvasH;ctx.clearRect(0,0,w,h);paintBackground(w,h,items.length);for(const d of items)paintOne(d,w,h,theme,finished)}
function signed(n){return n>=0?'+'+n:String(n)}
function decorateMods(mods){return mods.map(m=>{const val=Number(m.value)||0;return `<span class="sh-mod-tag ${val>0?'positive':val<0?'negative':'zero'}"><em>${String(m.label||'Modyfikator').replaceAll('<','&lt;').replaceAll('>','&gt;')}</em><b>${signed(val)}</b></span>`}).join('')}
function displayResult({value,sides,modifiers,total,second,mode}){const diceNote=sides===100?'Rzut procentowy D100':`Rzut kością D${sides}`;const lead=second===null?diceNote:(mode==='advantage'?'Przewaga':'Utrudnienie');final.innerHTML=`<div class="sh-result-title">${lead} · Kość ${sides===100?String(value).padStart(2,'0'):value}</div>${modifiers.length?`<div class="sh-mod-list">${decorateMods(modifiers)}</div>`:''}<div class="sh-result-total"><span>Wynik końcowy</span><strong>${total}</strong></div>`}
let inProgress=false;
S.ritualRoll=async function({title:headline='Rzut kością',detail='',value=1,bonus=0,modifiers=null,second=null,mode='normal',sides=20,theme=null,onComplete}={}){
if(inProgress)return;inProgress=true;overlay.classList.remove('hidden');resize();const actualTheme=theme||document.documentElement.dataset.diceTheme||'goblin';title.textContent=headline;sub.textContent=detail||'';final.classList.add('hidden');close.classList.add('hidden');
const modArray=Array.isArray(modifiers)?modifiers.filter(x=>x&&Number.isFinite(Number(x.value))):bonus?[{label:detail?.split(' (')[0]||'Modyfikator',value:bonus}]:[];
const finalTotal=Number(value)+modArray.reduce((sum,m)=>sum+(Number(m.value)||0),0);
const two=sides===100||second!==null,items=[];const diceSides=sides===100?100:sides;
function die(n,part){const base=facesFor((themes[actualTheme]?.mesh==='metal'?'metal':'goblin'),sides===100?10:sides),winner=winningFace(diceSides,n,part==='tens');const qtarget=targetQuat(base.faces[winner],((part==='tens'?-1:part==='ones'?1:.25))*0.22);return {sides:diceSides,value:n,winner,tens:part==='tens',qtarget,q:qSpin(0,.22),scale:two?.85:1.23,x:two?(part==='tens'?-1.17:part==='ones'?1.17:items.length===0?-1.17:1.17):0,y:0,offset:items.length*.19}};
if(sides===100){items.push(die(value,'tens'));items.push(die(value,'ones'))}else if(second!==null){items.push(die(value,'single'));items.push(die(second,'single'))}else items.push(die(value,'single'));
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;const duration=reduced?220:2000;const t0=performance.now();
await new Promise(resolve=>{function tick(now){const t=clamp((now-t0)/duration,0,1);for(const d of items){const bridge=qSpin(.61,d.offset);const prog=t<.61?t/.61:(t-.61)/.39;d.q=t<.61?qSpin(prog*.61,d.offset):qSlerp(bridge,d.qtarget,1-Math.pow(1-prog,3));d.y=t<.84?Math.sin(t*4.8*Math.PI)*(.15*(1-t)):.0}renderFrame(items,actualTheme,t>=.98);if(t<1)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});
renderFrame(items,actualTheme,true);displayResult({value,sides,modifiers:modArray,total:finalTotal,second,mode});final.classList.remove('hidden');close.classList.remove('hidden');sub.textContent='';onComplete?.();inProgress=false;return value};
window.addEventListener('resize',()=>{if(!overlay.classList.contains('hidden'))resize()});
})();

;

(()=>{'use strict';
const S=window.SH;
if(!S)return;
const isGM=document.body.dataset.role==='gm';
const $=id=>document.getElementById(id);
const esc=S.escapeHTML;
const defaults={elarion:38,tharok:52,lyra:16};
const levelXp=[0,0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
const experienceLevel=xp=>{let level=1;while(level<20&&xp>=levelXp[level+1])level++;return level};
const proficiency=level=>2+Math.floor((level-1)/4);
const initialSkills=Object.fromEntries(Object.entries(S.heroes).map(([id,h])=>[id,{...h.skills}]));
const initialStats=Object.fromEntries(Object.entries(S.heroes).map(([id,h])=>[id,[...h.stats]]));
const initialCombat=Object.fromEntries(Object.entries(S.heroes).map(([id,h])=>[id,{ac:h.ac,initiative:h.initiative}]));
const abilityIndex={athletics:0,stealth:1,dexSave:1,perception:4,persuasion:5};
const featsMilestones={elarion:[4,8,10,12,16],tharok:[4,6,8,12,14,16],lyra:[4,8,12,16]};
function availableFeats(hero){return (featsMilestones[hero.id]||[4,8,12,16]).filter(l=>l<=hero.level&&!(hero.asiChoices||[]).some(c=>c.level===l))} 
function abilityMod(n){return Math.floor((n-10)/2)};
const proficiencies={elarion:{perception:1,stealth:2,dexSave:1},tharok:{athletics:1},lyra:{}};
function applySkills(id){const hero=S.heroes[id],delta=proficiency(hero.level)-2,base=initialSkills[id];for(const [k,raw] of Object.entries(base)){const idx=abilityIndex[k];const statDelta=idx===undefined?0:abilityMod(hero.stats[idx])-abilityMod(initialStats[id][idx]);hero.skills[k]=raw+delta*(proficiencies[id]?.[k]||0)+statDelta}
const dexDiff=abilityMod(hero.stats[1])-abilityMod(initialStats[id][1]);hero.initiative=initialCombat[id].initiative+dexDiff;hero.ac=initialCombat[id].ac+(id==='elarion'||id==='lyra'?dexDiff:0)};
const stateKey='streamhouse-v11-character-state';
const catsKey='streamhouse-v11-categories';
const profileKey='streamhouse-v11-gm-profile';
const cache=S.load(stateKey,{});
const categoriesDefault=['Broń','Pancerz','Narzędzia','Wyposażenie','Zużywalne','Magia','Fabularne'];
let categories=S.load(catsKey,categoriesDefault);if(!Array.isArray(categories)||!categories.length)categories=[...categoriesDefault];
let gmProfile=S.load(profileKey,{name:'Mistrz Gry'});if(!gmProfile||typeof gmProfile!=='object')gmProfile={name:'Mistrz Gry'};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const int=(v,defaultValue=0)=>Number.isFinite(Number(v))?Math.trunc(Number(v)):defaultValue;
function copyCurrentState(id){const h=S.heroes[id];return {hp:h.hp,maxHp:h.maxHp,level:h.level,xp:int(h.xp,levelXp[h.level]||0),money:int(h.money,defaults[id]||0),stats:[...h.stats],asiChoices:(h.asiChoices||[]).map(c=>({...c}))};}
function restore(){for(const id of Object.keys(S.heroes)){const h=S.heroes[id];const st=cache[id]||{};h.maxHp=clamp(int(st.maxHp,h.maxHp),1,9999);h.hp=clamp(int(st.hp,h.hp),0,h.maxHp);const savedLevel=clamp(int(st.level,h.level),1,20);h.xp=clamp(int(st.xp,levelXp[savedLevel]),0,100000000);h.level=experienceLevel(h.xp);h.money=clamp(int(st.money,defaults[id]||0),0,100000000);h.stats=Array.isArray(st.stats)&&st.stats.length===6?st.stats.map((v,i)=>clamp(int(v,initialStats[id][i]),1,20)):[...initialStats[id]];h.asiChoices=Array.isArray(st.asiChoices)?st.asiChoices.filter(x=>Number.isInteger(x.level)&&typeof x.kind==='string').map(x=>({...x})):[];applySkills(id)}}
restore();
function signalPersist(){S.save(stateKey,Object.fromEntries(Object.keys(S.heroes).map(id=>[id,copyCurrentState(id)])));}
function sheetRefresh(){const d=$('character-dialog');if(!d||d.classList.contains('hidden'))return;const id=d.dataset.heroId||(new URLSearchParams(location.search).get('player')||'elarion');const el=$('character-content');if(el){el.innerHTML=S.displayHero(id);S.refreshAvatars?.();}}
function decorateHp(){document.querySelectorAll('.sh-ally').forEach(card=>{const id=card.dataset.hero;const h=S.heroes[id];if(!h)return;const pct=Math.round(h.hp/h.maxHp*100);const bar=card.querySelector('.sh-ally-hp i');if(bar){bar.style.width=clamp(pct,0,100)+'%';bar.classList.remove('v11-hp-green','v11-hp-yellow','v11-hp-red');bar.classList.add(pct<=25?'v11-hp-red':pct<=50?'v11-hp-yellow':'v11-hp-green')}const stats=card.querySelector('.sh-ally-stats');const hp=stats?.querySelector('span:first-child b');if(hp)hp.textContent=h.hp+'/'+h.maxHp;const role=card.querySelector('.sh-ally-role');if(role)role.textContent=h.spec.split(' · ').join(' · ')+' · poziom '+h.level});document.querySelectorAll('.hp-track i').forEach(el=>{const b=el.closest('.hero');const nm=b?.querySelector('.hero-meta strong')?.textContent;const h=Object.values(S.heroes).find(p=>p.name===nm);if(!h)return;const pct=Math.round(h.hp/h.maxHp*100);el.style.width=pct+'%';el.classList.remove('v11-hp-green','v11-hp-yellow','v11-hp-red');el.classList.add(pct<=25?'v11-hp-red':pct<=50?'v11-hp-yellow':'v11-hp-green')});}
function refreshState(){window.SHRefreshRoster?.();decorateHp();renderGmProfile();refreshSignals();sheetRefresh();updateOwnCard();window.SH_V13_refresh?.();window.SH_V14_refresh?.();}
function applyState(id,patch,send=true,log=''){if(!S.heroes[id])return;const h=S.heroes[id];const previous=copyCurrentState(id);const st={...previous,...patch};st.maxHp=clamp(int(st.maxHp,h.maxHp),1,9999);st.hp=clamp(int(st.hp,h.hp),0,st.maxHp);
if(Object.hasOwn(patch,'level')&&!Object.hasOwn(patch,'xp'))st.xp=levelXp[clamp(int(patch.level,h.level),1,20)];
st.xp=clamp(int(st.xp,h.xp),0,100000000);st.level=experienceLevel(st.xp);st.money=clamp(int(st.money,h.money),0,100000000);st.stats=Array.isArray(st.stats)&&st.stats.length===6?st.stats.map((v,i)=>clamp(int(v,h.stats[i]),1,20)):[...h.stats];st.asiChoices=Array.isArray(st.asiChoices)?st.asiChoices.map(c=>({...c})):[...(h.asiChoices||[])];Object.assign(h,st);applySkills(id);signalPersist();refreshState();if(send){S.send('character:updated',{id,state:copyCurrentState(id)});if(log&&isGM)S.addFeed?.('gm-feed',h.name+' · '+log,'Poziom '+h.level+' · HP '+h.hp+'/'+h.maxHp+' · PD '+h.xp+' · '+h.money+' '+S.getCurrencyName?.())}}
S.onMessage((type,data)=>{if(type==='character:updated'&&data?.id&&S.heroes[data.id])applyState(data.id,data.state,false);if(type==='avatar:updated'&&data?.id==='gm')renderGmProfile();if(type==='gm:profile'&&data?.name){gmProfile={name:String(data.name).slice(0,50)};S.save(profileKey,gmProfile);renderGmProfile();sheetRefresh()}if(type==='inventory:changed'){setTimeout(sheetRefresh,0)}});
const remoteAvatars=Object.create(null);
const originalGetAvatar=S.getAvatar;
S.getAvatar=id=>remoteAvatars[id]||originalGetAvatar(id);
S.onMessage((type,data)=>{if(type==='avatar:updated'&&data?.id&&data?.url){remoteAvatars[data.id]=data.url;sheetRefresh();renderGmProfile()}});
const originalSetAvatar=S.setAvatar;
S.setAvatar=(id,url)=>{remoteAvatars[id]=url;const saved=originalSetAvatar(id,url);sheetRefresh();renderGmProfile();return saved};
const originalDisplay=S.displayHero;
S.displayHero=function(id){const h=S.heroes[id]||S.heroes.elarion;const idReal=h.id;const template=document.createElement('template');template.innerHTML=originalDisplay(idReal);const sheet=template.content.querySelector('.sh-sheet');if(!sheet)return originalDisplay(idReal);
 const avatar=sheet.querySelector('.sheet-avatar');if(avatar){const photo=S.getAvatar?.(idReal);avatar.removeAttribute('style');avatar.replaceChildren();if(photo){const img=document.createElement('img');img.src=photo;img.alt='Portret: '+h.name;img.decoding='async';avatar.append(img)}else{const span=document.createElement('span');span.className='avatar-fallback';span.textContent=h.name.slice(0,1).toUpperCase();avatar.append(span)}}
 const money=sheet.querySelector('.sh-currency-amount');if(money)money.textContent=String(h.money);
 const vitals=sheet.querySelector('.sh-vitals');if(vitals){const values=vitals.querySelectorAll('b');if(values[0])values[0].textContent=h.hp+'/'+h.maxHp;if(values[3])values[3].textContent='+'+proficiency(h.level);}
 const head=sheet.querySelector('header');if(head){const meta=document.createElement('div');meta.className='v11-sheet-extra';meta.innerHTML=`<span>Punkty doświadczenia <strong>${h.xp.toLocaleString('pl-PL')} PD</strong></span><span>Poziom <strong>${h.level}</strong></span>`;head.insertAdjacentElement('afterend',meta)}
 const foot=sheet.querySelector('.sh-inv-foot');if(foot&&isGM){let add=foot.querySelector('[data-item-add]');const toolbar=document.createElement('div');toolbar.className='v11-sheet-toolbar';const manage=document.createElement('button');manage.type='button';manage.className='v11-action';manage.dataset.manageHero=idReal;manage.textContent='✥ Zarządzaj bohaterem';toolbar.append(manage);const wallet=foot.querySelector('.sh-currency');if(wallet){const ctl=document.createElement('div');ctl.className='v11-money-controls';ctl.innerHTML=`<button type="button" data-wallet-change="-" data-wallet-id="${idReal}" title="Odejmij walutę">−</button><button type="button" data-wallet-change="+" data-wallet-id="${idReal}" title="Dodaj walutę">+</button>`;wallet.append(ctl)}if(add){add.textContent='＋ Przedmiot';toolbar.append(add)}foot.append(toolbar)}
 return template.innerHTML;
};
function updateOwnCard(){if(isGM)return;const id=new URLSearchParams(location.search).get('player')||'elarion';const h=S.heroes[id]||S.heroes.elarion;const hp=$('player-hp');if(hp)hp.textContent=h.hp+'/'+h.maxHp;const lev=$('player-level');if(lev)lev.textContent=String(h.level);const stat=document.querySelector('.character-large + .character-detail');if(stat)stat.dataset.level=String(h.level);}
function ensureGmProfile(){if(isGM)return;if($('v11-gm-profile'))return;const el=document.createElement('section');el.className='v11-gm-profile';el.id='v11-gm-profile';el.innerHTML='<div class="v11-gm-avatar" id="v11-gm-avatar" data-avatar="gm">MG</div><div><small>Mistrz Gry</small><strong id="v11-gm-name"></strong></div>';const team=$('team-player');if(team)team.before(el)}
function renderGmProfile(){if(isGM)return;ensureGmProfile();const name=$('v11-gm-name');if(name)name.textContent=gmProfile.name||'Mistrz Gry';const avatar=$('v11-gm-avatar');if(!avatar)return;const photo=S.getAvatar?.('gm');avatar.innerHTML='';if(photo){const img=document.createElement('img');img.src=photo;img.alt='Avatar Mistrza Gry';avatar.append(img)}else avatar.textContent=(gmProfile.name||'MG').slice(0,2).toUpperCase()}
if(isGM){
 const dlg=document.createElement('div');dlg.id='v11-manager';dlg.className='backdrop hidden v11-manager';dlg.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="Zarządzanie bohaterem"><div class="v11-management-header"><h2 id="v11-manage-title">Bohater</h2><button type="button" class="x" id="v11-manage-close">×</button></div><div class="v11-snapshot" id="v11-manage-snapshot"></div><div class="v11-control-row"><div class="v11-control-label">Punkty życia</div><input id="v11-hp-input" type="number" min="1" max="9999" value="5" aria-label="Punkty życia"><button id="v11-damage">− Obrażenia</button><button id="v11-heal">+ Leczenie</button></div><div class="v11-control-row"><div class="v11-control-label">Maksymalne HP</div><input id="v11-maxhp-input" type="number" min="1" max="9999" value="22" aria-label="Maksymalne punkty życia"><button id="v11-maxhp-set">Ustaw limit</button><span></span></div><div class="v11-control-row"><div class="v11-control-label">Punkty doświadczenia</div><input id="v11-exp-input" type="number" min="1" max="10000000" value="250" aria-label="Punkty doświadczenia"><button id="v11-exp-remove">− Odejmij PD</button><button id="v11-exp-add">+ Dodaj PD</button></div><div class="v11-lvl"><strong>Poziom</strong><button type="button" id="v11-level-down">−</button><strong id="v11-level-display">3</strong><button type="button" id="v11-level-up">+</button><span class="v11-help" id="v11-xp-next"></span></div><div class="v11-control-row"><div class="v11-control-label">Waluta</div><input id="v11-money-input" type="number" min="1" max="10000000" value="10" aria-label="Ilość waluty"><button id="v11-money-remove">− Zabierz</button><button id="v11-money-add">+ Przekaż</button></div><p class="v11-help">Awans zmienia poziom postaci. Nowe cechy klasy dobierze MG podczas rozwijania bohatera.</p><div class="v11-dialog-actions"><button id="v11-manager-done">Zamknij</button></div></div>`;document.body.append(dlg);
 let current='elarion';
 function updateManager(){const h=S.heroes[current];$('v11-manage-title').textContent=h.name+' · Zarządzanie';$('v11-manage-snapshot').innerHTML=`<div><small>HP</small><strong>${h.hp}/${h.maxHp}</strong></div><div><small>PD</small><strong>${h.xp.toLocaleString('pl-PL')}</strong></div><div><small>Waluta</small><strong>${h.money.toLocaleString('pl-PL')}</strong></div>`;$('v11-level-display').textContent=h.level;$('v11-maxhp-input').value=h.maxHp;$('v11-xp-next').textContent=h.level>=20?'Poziom maksymalny':'Następny próg: '+levelXp[h.level+1].toLocaleString('pl-PL')+' PD';}
 function openManager(id){if(!S.heroes[id])return;current=id;updateManager();dlg.classList.remove('hidden');const cd=$('character-dialog');if(cd&&!cd.classList.contains('hidden'))cd.classList.add('hidden')}
 $('v11-manage-close').onclick=$('v11-manager-done').onclick=()=>dlg.classList.add('hidden');dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.classList.add('hidden')});
 function amount(id,max=10000000){return clamp(int($(id).value,0),0,max)}
 $('v11-damage').onclick=()=>{const h=S.heroes[current];applyState(current,{hp:h.hp-amount('v11-hp-input')},true,'obrażenia');updateManager()};
 $('v11-heal').onclick=()=>{const h=S.heroes[current];applyState(current,{hp:h.hp+amount('v11-hp-input')},true,'leczenie');updateManager()};
 $('v11-maxhp-set').onclick=()=>{applyState(current,{maxHp:amount('v11-maxhp-input',9999)},true,'zmiana maksymalnego HP');updateManager()};
 $('v11-exp-add').onclick=()=>{const h=S.heroes[current];applyState(current,{xp:h.xp+amount('v11-exp-input')},true,'dodano PD');updateManager()};
 $('v11-exp-remove').onclick=()=>{const h=S.heroes[current];applyState(current,{xp:h.xp-amount('v11-exp-input')},true,'odjęto PD');updateManager()};
 $('v11-level-up').onclick=()=>{const h=S.heroes[current];applyState(current,{level:h.level+1},true,'awans');updateManager()};
 $('v11-level-down').onclick=()=>{const h=S.heroes[current];applyState(current,{level:h.level-1},true,'zmiana poziomu');updateManager()};
 $('v11-money-add').onclick=()=>{const h=S.heroes[current];applyState(current,{money:h.money+amount('v11-money-input')},true,'przekazano walutę');updateManager()};
 $('v11-money-remove').onclick=()=>{const h=S.heroes[current];applyState(current,{money:h.money-amount('v11-money-input')},true,'zabrano walutę');updateManager()};
 window.addEventListener('click',e=>{const btn=e.target.closest?.('[data-manage-hero]');if(btn){e.preventDefault();e.stopImmediatePropagation();openManager(btn.dataset.manageHero)}const wallet=e.target.closest?.('[data-wallet-change]');if(wallet){e.preventDefault();e.stopImmediatePropagation();openManager(wallet.dataset.walletId);$('v11-money-input').focus()}},true);
 let renderSettingsCategories=()=>{};
 const options=$('sh-game-dialog');const originalSave=$('sh-options-save');if(options&&originalSave){const currencyInput=$('sh-currency-input');const settings=document.createElement('div');settings.className='v11-settings-categories';settings.innerHTML=`<h3>Postać Mistrza Gry</h3><div class="v11-setting-row"><input id="v11-gm-name" placeholder="Nazwa Mistrza Gry" maxlength="50" value="${esc(gmProfile.name||'Mistrz Gry')}"></div><h3 style="margin-top:18px">Kategorie przedmiotów</h3><div id="v11-category-list" class="v11-category-list"></div><div class="v11-setting-row"><input id="v11-new-category" maxlength="40" placeholder="Nowa kategoria"><button id="v11-category-add" type="button">＋ Dodaj</button></div>`;originalSave.parentElement.before(settings);
 function displayCats(){const list=$('v11-category-list');if(!list)return;list.innerHTML='';categories.forEach((cat,i)=>{const tag=document.createElement('div');tag.className='v11-category-chip';const txt=document.createElement('span');txt.textContent=cat;tag.append(txt);const edit=document.createElement('button');edit.type='button';edit.title='Zmień nazwę kategorii';edit.textContent='✎';edit.onclick=()=>{const name=prompt('Nowa nazwa kategorii:',cat)?.trim();if(!name||categories.some((x,j)=>j!==i&&x.toLowerCase()===name.toLowerCase()))return;const old=categories[i];categories[i]=name.slice(0,40);saveCats();displayCats();const inv=S.getInventory;for(const id of Object.keys(S.heroes)){const items=inv(id).map(it=>[...it]);for(const it of items)if(it[2]===old)it[2]=categories[i];S._inventoryOverride=S._inventoryOverride||Object.create(null);S._inventoryOverride[id]=items;S.save('inventory-v4-'+id,items);S.send('inventory:changed',{id,items})}sheetRefresh()};tag.append(edit);const del=document.createElement('button');del.type='button';del.textContent='×';del.title='Usuń kategorię';del.onclick=()=>{if(categories.length<=1)return;categories.splice(i,1);saveCats();displayCats()};tag.append(del);list.append(tag)})}
 function saveCats(){S.save(catsKey,categories);S.send('campaign:categories',{categories:[...categories]});syncItemCategories()}
 $('v11-category-add').onclick=()=>{const val=$('v11-new-category').value.trim().slice(0,40);if(!val||categories.some(c=>c.toLowerCase()===val.toLowerCase()))return;categories.push(val);$('v11-new-category').value='';saveCats();displayCats()};
 originalSave.addEventListener('click',()=>{const name=$('v11-gm-name').value.trim().slice(0,50)||'Mistrz Gry';gmProfile={name};S.save(profileKey,gmProfile);S.send('gm:profile',gmProfile);renderGmProfile();sheetRefresh()},true);
 $('sh-game-options')?.addEventListener('click',()=>{displayCats();$('v11-gm-name').value=gmProfile.name||'Mistrz Gry'},true);
 renderSettingsCategories=displayCats;displayCats();}
 const invDialog=document.createElement('div');invDialog.id='v11-item-dialog';invDialog.className='backdrop hidden v11-item-dialog';invDialog.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="Dodaj przedmiot"><div class="modal-head"><h2>Dodaj przedmiot</h2><button class="x" id="v11-item-close" type="button">×</button></div><div class="v11-form"><label>Nazwa<input id="v11-item-name" maxlength="70" placeholder="Nazwa przedmiotu"></label><label>Kategoria<select id="v11-item-category"></select></label><label>Opis<input id="v11-item-desc" maxlength="160" placeholder="Właściwości i opis"></label><label>Ilość<input id="v11-item-qty" type="number" min="1" max="99" value="1"></label></div><div class="v11-dialog-actions"><button id="v11-item-cancel" type="button">Anuluj</button><button id="v11-item-save" class="primary" type="button">Dodaj do ekwipunku</button></div></div>`;document.body.append(invDialog);
 let itemHero='elarion';
 function syncItemCategories(){const sel=$('v11-item-category');if(!sel)return;const prior=sel.value;sel.innerHTML=categories.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');sel.value=categories.includes(prior)?prior:categories[0];sel.dispatchEvent(new Event('change',{bubbles:true}))}
 syncItemCategories();
 window.addEventListener('click',e=>{const btn=e.target.closest?.('[data-item-add]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();itemHero=btn.dataset.itemAdd;syncItemCategories();invDialog.classList.remove('hidden');$('v11-item-name').value='';$('v11-item-desc').value='';$('v11-item-qty').value=1;$('v11-item-name').focus()},true);
 $('v11-item-close').onclick=$('v11-item-cancel').onclick=()=>invDialog.classList.add('hidden');invDialog.addEventListener('click',e=>{if(e.target===invDialog)invDialog.classList.add('hidden')});
 $('v11-item-save').onclick=()=>{const name=$('v11-item-name').value.trim().slice(0,70);if(!name){$('v11-item-name').focus();return}const items=S.getInventory(itemHero).map(it=>[...it]);items.push([name,$('v11-item-desc').value.trim().slice(0,160),$('v11-item-category').value,clamp(int($('v11-item-qty').value,1),1,99)]);S._inventoryOverride=S._inventoryOverride||Object.create(null);S._inventoryOverride[itemHero]=items;S.save('inventory-v4-'+itemHero,items);S.send('inventory:changed',{id:itemHero,items});invDialog.classList.add('hidden');sheetRefresh();S.addFeed?.('gm-feed','Dodano przedmiot',S.heroes[itemHero].name+': '+name)};
 S.onMessage((type,data)=>{if(type==='campaign:categories'&&Array.isArray(data?.categories)){categories=[...data.categories];S.save(catsKey,categories);renderSettingsCategories();syncItemCategories()}});
}
const signals={};
const rolling=Object.create(null);
function updateSignal(player,kind){if(!S.heroes[player])return;if(kind)signals[player]=kind;else delete signals[player];refreshSignals()}
function refreshSignals(){document.querySelectorAll('.sh-ally').forEach(card=>{card.querySelector('.v11-signal')?.remove();const id=card.dataset.hero,kind=signals[id],isRolling=!!rolling[id];if(!kind&&!isRolling)return;const el=document.createElement('div');el.className='v11-signal'+(isRolling?' v12-rolling':'');el.innerHTML='<i></i><strong>'+(isRolling?'Rzuca kością':kind==='question:request'?'Zadaje pytanie':'Prosi o próbę')+'</strong>';card.append(el)})}
function updateRollStatus(player,active){if(!S.heroes[player])return;if(active)rolling[player]=true;else delete rolling[player];refreshSignals()}
S.onMessage((type,data)=>{if(!data?.player)return;if(type==='question:request'||type==='question:attempt')updateSignal(data.player,type);if(type==='question:rejected'||type==='question:accepted'||type==='question:closed')updateSignal(data.player,null);if(type==='character:roll-status')updateRollStatus(data.player,!!data.active);if(type==='hello:player'&&isGM)for(const player of Object.keys(rolling))S.send('character:roll-status',{player,active:true})});
if(!isGM){const me=new URLSearchParams(location.search).get('player')||'elarion';let requestedRoll=false;
const emit=active=>{updateRollStatus(me,active);S.send('character:roll-status',{player:me,active})};
document.addEventListener('click',e=>{
 const t=e.target;if(!(t instanceof Element))return;
 if(t.closest('#roll-requested')){requestedRoll=true;emit(true)}
 else if(t.closest('#free-roll')||t.closest('#skills button')){requestedRoll=false;emit(true)}
 else if(t.closest('#ritual-close')&&!requestedRoll){emit(false)}
 else if(t.closest('#finish-incoming')){requestedRoll=false;emit(false)}
},true);
}
if(!isGM){const me=new URLSearchParams(location.search).get('player')||'elarion';for(const id of ['ask-gm','attempt-gm'])$(id)?.addEventListener('click',()=>updateSignal(me,id==='ask-gm'?'question:request':'question:attempt'));}
window.StreamHouseV11={applyState,renderGmProfile,refreshState,updateSignal,availableFeats,proficiency,getCategories:()=>categories,openManager:(id)=>$("v11-manager")&&$("v11-manager").querySelector("#v11-manage-close")&&document.querySelector(`[data-manage-hero="${id}"]`)?.click()};
refreshState();
})();

