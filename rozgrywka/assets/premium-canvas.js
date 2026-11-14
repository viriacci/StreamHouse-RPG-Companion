
(() => {
  'use strict';
  const S = window.SH;
  const overlay = document.getElementById('ritual-overlay');
  const stage = overlay?.querySelector('.dice-stage');
  const data = window.StreamHouseEmeraldGeometry;
  if (!S || !stage || !data) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'streamhouse-premium-canvas';
  canvas.style.cssText = 'width:100%;height:100%;display:block;filter:drop-shadow(0 14px 18px #0009);pointer-events:none';
  const ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx) return;

  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const plus=(a,b)=>a.map((x,i)=>x+b[i]);
  const mul=(a,s)=>a.map(x=>x*s);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const len=a=>Math.hypot(...a);
  const norm=a=>mul(a,1/(len(a)||1));
  const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  const qmul=(a,b)=>[
    a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
    a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
    a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
    a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]
  ];
  const qa=(axis,angle)=>{const n=norm(axis),s=Math.sin(angle/2);return [...mul(n,s),Math.cos(angle/2)]};
  const qn=q=>mul(q,1/(Math.hypot(...q)||1));
  const qr=(q,v)=>{const u=q.slice(0,3),s=q[3],d=dot(u,v),uu=dot(u,u),c=cross(u,v);return v.map((x,i)=>2*d*u[i]+(s*s-uu)*x+2*s*c[i])};
  const qfromto=(a,b)=>{a=norm(a);b=norm(b);const d=dot(a,b);return d<-.999?qa([1,0,0],Math.PI):qn([...cross(a,b),1+d])};
  const qslerp=(a,b,t)=>{let d=a.reduce((s,x,i)=>s+x*b[i],0);if(d<0){b=b.map(x=>-x);d=-d}if(d>.9995)return qn(a.map((v,i)=>v+(b[i]-v)*t));const th=Math.acos(clamp(d,-1,1)),sn=Math.sin(th);return a.map((v,i)=>(v*Math.sin((1-t)*th)+b[i]*Math.sin(t*th))/sn)};
  const spin=(t,offset)=>qn(qmul(qa([0,1,0],(3.5*t+offset)*Math.PI*2),qmul(qa([1,0,0],(2.8*t+offset*.2)*Math.PI*2),qa([0,0,1],(.65*t+.1)*Math.PI*2))));
  const saved=new Map(),shapes=new Map(),faceAtlases=new Map(),inkAtlases=new Map();
  const htmlEscape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const signed=x=>Number(x)>=0?`+${Number(x)}`:`${Number(x)}`;
  function shapeFor(sides){if(shapes.has(sides))return shapes.get(sides);
    const mesh=data['d'+sides]||data.d20;
    const columns=Math.ceil(Math.sqrt(mesh.polygons.length));
    const rows=Math.ceil(mesh.polygons.length/columns);
    const faces=mesh.polygons.map((raw,index)=>{
      let points=raw.map(i=>mesh.vertices[i]);
      const center=mul(points.reduce((a,b)=>plus(a,b),[0,0,0]),1/points.length);
      let n=norm(cross(sub(points[1],points[0]),sub(points[2],points[0])));
      if(dot(n,center)<0){points=points.slice().reverse();n=mul(n,-1)}
      let t=norm(sub([1,0,0],mul(n,n[0])));
      if(len(t)<.15)t=norm(sub([0,1,0],mul(n,n[1])));
      const b=norm(cross(n,t));
      const coords=points.map(p=>[dot(sub(p,center),t),dot(sub(p,center),b)]);
      const maxCoord=Math.max(...coords.map(v=>Math.max(Math.abs(v[0]),Math.abs(v[1]))));
      const fit=.42/Math.max(maxCoord,.001);
      return {points,center,n,t,b,index,column:index%columns,row:Math.floor(index/columns),columns,rows,fit};
    });
    shapes.set(sides,faces);return faces;
  }
  function faceIdx(sides,value,part){
    if(part==='tens')return value===100?0:Math.floor(value/10)%10;
    if(part==='ones')return value===100?9:((value%10||10)-1);
    return (Math.max(1,value)-1)%sides;
  }
  function target(face){const q=qfromto(face.n,[0,0,1]);const v=qr(q,face.b);return qn(qmul(qa([0,0,1],Math.atan2(v[0],v[1])),q))}
  async function getImage(theme,key,type='albedo'){
    const cacheKey=theme+':'+key+':'+type;
    if(saved.has(cacheKey)){const ref=saved.get(cacheKey);saved.delete(cacheKey);saved.set(cacheKey,ref);return ref}
    const promise=window.StreamHousePremiumMaterials.atlas(theme,key,type);
    saved.set(cacheKey,promise);while(saved.size>28)saved.delete(saved.keys().next().value);return promise;
  }
  async function setupAtlas(face,theme,sides,part,type='albedo'){
    const key=part==='tens'?'d100-tens':part==='ones'?'d100-ones':'d'+sides;
    const cacheKey=theme+':'+key+':'+type+':'+face.index;
    if(faceAtlases.has(cacheKey)){const ref=faceAtlases.get(cacheKey);faceAtlases.delete(cacheKey);faceAtlases.set(cacheKey,ref);return ref}
    const im=await getImage(theme,key,type);
    const cw=im.width/face.columns,ch=im.height/face.rows;
    const c=document.createElement('canvas');c.width=Math.round(cw);c.height=Math.round(ch);
    c.getContext('2d').drawImage(im,face.column*cw,face.row*ch,cw,ch,0,0,c.width,c.height);
    faceAtlases.set(cacheKey,c);while(faceAtlases.size>240)faceAtlases.delete(faceAtlases.keys().next().value);return c;
  }
  function resize(){const box=stage.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,1.5);const w=Math.max(260,Math.round(box.width*dpr)),h=Math.max(240,Math.round(box.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}return [w,h]}
  function project(p,w,h){const cameraZ=4.8;const f=Math.min(w,h)*1.78;const denom=Math.max(.8,cameraZ-p[2]);return [w*.5+f*p[0]/denom,h*.49-f*p[1]/denom]}
  function polygon(ctx,points){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))ctx.lineTo(p[0],p[1]);ctx.closePath()}
  function textureTri(image, src, dest){
    const [[x0,y0],[x1,y1],[x2,y2]]=src,[[u0,v0],[u1,v1],[u2,v2]]=dest;
    const den=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
    if(Math.abs(den)<.01)return;
    const a=((u1-u0)*(y2-y0)-(u2-u0)*(y1-y0))/den;
    const c=((x1-x0)*(u2-u0)-(x2-x0)*(u1-u0))/den;
    const b=((v1-v0)*(y2-y0)-(v2-v0)*(y1-y0))/den;
    const d=((x1-x0)*(v2-v0)-(x2-x0)*(v1-v0))/den;
    const e=u0-a*x0-c*y0, f=v0-b*x0-d*y0;
    ctx.save();polygon(ctx,dest);ctx.clip();ctx.setTransform(a,b,c,d,e,f);ctx.drawImage(image,0,0);ctx.restore();
  }
  function drawFace(face,item,w,h,finished,glow=1){
    const pts=face.points.map(p=>{
      const q=qr(item.q,p);return [q[0]*item.scale+item.x,q[1]*item.scale+item.y,q[2]*item.scale]
    });
    const normal=qr(item.q,face.n);if(normal[2]<=.005)return;
    const ps=pts.map(p=>project(p,w,h));
    const mid=[ps.reduce((a,p)=>a+p[0],0)/ps.length,ps.reduce((a,p)=>a+p[1],0)/ps.length];
    const image=face.atlas;
    const cw=image.width,ch=image.height;
    const uv=p=>{const v=sub(p,face.center);return [(.5+dot(v,face.t)*face.fit)*cw,(.5-dot(v,face.b)*face.fit)*ch]};
    const srcC=[cw*.5,ch*.5],dstC=mid;
    ctx.save();polygon(ctx,ps);ctx.clip();
    for(let j=0;j<ps.length;j++){
      const k=(j+1)%ps.length;
      textureTri(image,[srcC,uv(face.points[j]),uv(face.points[k])],[dstC,ps[j],ps[k]]);
    }
    const lit=dot(normal,norm([-.65,.8,1.4]));
    ctx.fillStyle=lit<0?`rgba(2,2,8,${Math.min(.55,-lit*.46)})`:`rgba(255,245,224,${Math.min(.16,lit*.10)})`;
    polygon(ctx,ps);ctx.fill();
    if(finished&&face.index===item.face){
      const phase=clamp(glow,0,1);
      const radius=Math.max(1,...ps.map(pt=>Math.hypot(pt[0]-mid[0],pt[1]-mid[1])));
      const fill=ctx.createRadialGradient(mid[0],mid[1],0,mid[0],mid[1],radius);
      fill.addColorStop(0,`rgba(255,206,69,${(.30+.36*phase).toFixed(3)})`);
      fill.addColorStop(.48,`rgba(249,193,63,${(.22+.26*phase).toFixed(3)})`);
      fill.addColorStop(1,`rgba(222,160,41,${(.085+.12*phase).toFixed(3)})`);
      ctx.fillStyle=fill;polygon(ctx,ps);ctx.fill();
      const ink=face.inkAtlas;
      for(let j=0;j<ps.length;j++){
        const k=(j+1)%ps.length;
        textureTri(ink,[srcC,uv(face.points[j]),uv(face.points[k])],[dstC,ps[j],ps[k]]);
      }
    }
    const inset=.062;
    for(let j=0;j<ps.length;j++){
      const k=(j+1)%ps.length,p=ps[j],q=ps[k];
      const innerP=[p[0]*(1-inset)+mid[0]*inset,p[1]*(1-inset)+mid[1]*inset];
      const innerQ=[q[0]*(1-inset)+mid[0]*inset,q[1]*(1-inset)+mid[1]*inset];
      const config=window.StreamHousePremiumMaterials.theme(item.theme);
      if(config.metal>.40){
        const edgeMid=[(p[0]+q[0])*.5,(p[1]+q[1])*.5];
        const grad=ctx.createLinearGradient(edgeMid[0],edgeMid[1],(innerP[0]+innerQ[0])*.5,(innerP[1]+innerQ[1])*.5);
        const shine=.5+.5*clamp(dot(normal,norm([.3,.85,1.2])),-1,1);
        const base=config.rim, rgb=[1,3,5].map(i=>parseInt(base.slice(i,i+2),16));
        const scale=(v,f)=>Math.round(Math.min(255,Math.max(0,v*f)));
        const toHex=(factor)=>'#'+rgb.map(v=>scale(v,factor).toString(16).padStart(2,'0')).join('');
        grad.addColorStop(0,shine>.55?toHex(1.32):toHex(.78));grad.addColorStop(.18,toHex(1.14));grad.addColorStop(.52,toHex(.51));grad.addColorStop(.78,toHex(.89));grad.addColorStop(1,toHex(.22));
        polygon(ctx,[p,q,innerQ,innerP]);ctx.fillStyle=grad;ctx.fill();
        ctx.strokeStyle=config.rim;ctx.lineWidth=Math.max(.85,w/900);ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.stroke();
        ctx.strokeStyle='#35302a';ctx.lineWidth=Math.max(.7,w/1200);ctx.beginPath();ctx.moveTo(...innerP);ctx.lineTo(...innerQ);ctx.stroke();
      } else {
        const grad=ctx.createLinearGradient(p[0],p[1],innerP[0],innerP[1]);grad.addColorStop(0,'#97a888');grad.addColorStop(.4,'#273d33');grad.addColorStop(1,'#0a1b19');polygon(ctx,[p,q,innerQ,innerP]);ctx.fillStyle=grad;ctx.globalAlpha=.6;ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle='#a6bb9a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.stroke();
      }
    }
    ctx.restore();
    if(finished&&face.index===item.face){
      ctx.save();ctx.lineJoin='round';polygon(ctx,ps);
      ctx.shadowBlur=Math.min(14,w*.022);ctx.shadowColor='rgba(245,193,99,.52)';
      ctx.lineWidth=Math.max(1.4,w*.0025);
      ctx.strokeStyle=`rgba(255,225,160,${(.27+.25*clamp(glow,0,1)).toFixed(3)})`;
      ctx.stroke();ctx.restore();
    }
  }
  function paint(items,finished,glow=1){const [w,h]=resize();ctx.clearRect(0,0,w,h);
    const bg=ctx.createRadialGradient(w*.5,h*.84,5,w*.5,h*.84,h*.4);
    bg.addColorStop(0,'#00000084');bg.addColorStop(1,'#00000000');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    const faces=[];
    for(const item of items){for(const face of item.faces){const wc=qr(item.q,face.center);faces.push({face,item,z:wc[2]*item.scale})}}
    faces.sort((a,b)=>a.z-b.z);
    for(const {face,item} of faces)drawFace(face,item,w,h,finished,glow);
  }
  let active=false,pulseRAF=0,pulseStart=0,pulseItems=null;
  function stopPulse(){if(pulseRAF)cancelAnimationFrame(pulseRAF);pulseRAF=0;pulseItems=null}
  function startPulse(items,reduce){
    stopPulse();pulseItems=items;
    if(reduce){paint(items,true,.52);return}
    pulseStart=performance.now();
    const tick=now=>{
      if(!pulseItems||overlay.classList.contains('hidden')||!canvas.isConnected){stopPulse();return}
      const intensity=.5-.5*Math.cos((now-pulseStart)*Math.PI*2/3400);
      paint(items,true,intensity);
      pulseRAF=requestAnimationFrame(tick);
    };
    pulseRAF=requestAnimationFrame(tick);
  }
  async function roll(options={}){
    if(active)return;stopPulse();
    const sides=Number(options.sides)||20,value=Number(options.value)||1,theme=window.StreamHousePremiumMaterials.catalog[options.theme]?options.theme:'goblin';
    const bonus=Number(options.bonus)||0;
    const mods=Array.isArray(options.modifiers)?options.modifiers:(bonus?[{label:'Modyfikator',value:bonus}]:[]);
    const total=value+mods.reduce((s,m)=>s+(Number(m.value)||0),0);
    const two=sides===100||(options.second!==null&&options.second!==undefined);
    const entries=sides===100?[[10,value,'tens'],[10,value,'ones']]:two?[[sides,value,'single'],[sides,Number(options.second)||1,'single']]:[[sides,value,'single']];
    const items=[];
    for(let index=0;index<entries.length;index++){
      const [s,v,part]=entries[index],faces=shapeFor(s);
      const completeFaces=await Promise.all(faces.map(async f=>({...f,atlas:await setupAtlas(f,theme,s,part),inkAtlas:await setupAtlas(f,theme,s,part,'ink')}))); 
      const face=faceIdx(s,v,part);
      items.push({faces:completeFaces,face,theme,q:spin(0,index*.22),target:target(completeFaces[face]),scale:two?.83:1.12,x:two?(index===0?-1.06:1.06):0,y:0,offset:index*.2});
    }
    active=true;stage.replaceChildren(canvas);overlay.classList.remove('hidden');
    overlay.querySelector('#ritual-title').textContent=options.title||'Rzut kością';
    const under=overlay.querySelector('#ritual-under');under.textContent=options.detail||'';
    const result=overlay.querySelector('#ritual-final'),close=overlay.querySelector('#ritual-close');result.classList.add('hidden');close.classList.add('hidden');
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const duration=reduced?170:2100,start=performance.now();
    await new Promise(resolve=>{const tick=now=>{
      const t=clamp((now-start)/duration,0,1);
      for(const item of items){const join=.59,qJoin=spin(join,item.offset);item.q=t<join?spin(t,item.offset):qslerp(qJoin,item.target,1-Math.pow(1-(t-join)/(1-join),3))}
      paint(items,t>.976);
      if(t<1&&canvas.isConnected)requestAnimationFrame(tick);else resolve();
    };requestAnimationFrame(tick)});
    for(const item of items)item.q=item.target;
    if(!reduced){await new Promise(resolve=>{const startFade=performance.now();const fade=now=>{const p=clamp((now-startFade)/480,0,1);paint(items,true,.08+.42*p);if(p<1&&canvas.isConnected)requestAnimationFrame(fade);else resolve()};requestAnimationFrame(fade)})}
    paint(items,true,.5);
    const modHtml=mods.map(m=>`<span class="sh-mod-tag ${Number(m.value)>=0?'positive':'negative'}"><em>${htmlEscape(m.label||'Modyfikator')}</em><b>${signed(m.value)}</b></span>`).join('');
    result.innerHTML=`<div class="sh-result-title">D${sides} · Kość ${value}</div>${mods.length?`<div class="sh-mod-list">${modHtml}</div>`:''}<div class="sh-result-total"><span>Wynik końcowy</span><strong>${total}</strong></div>`;
    result.classList.remove('hidden');close.classList.remove('hidden');under.textContent='';active=false;startPulse(items,reduced);options.onComplete?.();return value;
  }
  window.StreamHousePremiumCanvas={roll,state:()=>({active,pulsing:!!pulseRAF,atlases:saved.size,mode:'UV-mapped Canvas 3D (20 themes)'})};
})();
