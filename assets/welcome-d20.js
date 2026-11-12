/* StreamHouse Landing D20
   Real D20 mesh + per-face atlas from the v21 in-game dice engine.
   UV numbers and malachite texture rotate together with the mesh.
   Small software 3D viewer keeps the home screen lightweight, offline, and portable.
*/
(() => {
  'use strict';
  const canvas=document.getElementById('portal-die');
  const portal=document.getElementById('portal');
  // Animacja rzutu dotyczy samej bryły 3D, nie wartości ani podświetlenia ścianki.
  // Trzy pełne obroty po kliknięciu, bez losowania wyniku.
  let rollStart=null;
  const rollDuration=1150;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function startRoll(){
    if(!portal)return;
    rollStart=performance.now();
    portal.classList.add('sh-die-rolling');
    if(reduced){rollStart=null;portal.classList.remove('sh-die-rolling')}
  }
  if(portal){
    portal.addEventListener('click',startRoll);
    portal.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();startRoll()}
    });
  }

  const mesh=window.StreamHouseEmeraldGeometry?.d20;
  const ctx=canvas?.getContext('2d',{alpha:true});
  if(!canvas||!ctx||!portal||!mesh)return;

  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const mul=(a,s)=>a.map(v=>v*s);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=a=>mul(a,1/(Math.hypot(...a)||1));
  const qr=(q,v)=>{const u=q.slice(0,3),s=q[3],d=dot(u,v),uu=dot(u,u),c=cross(u,v);return v.map((x,i)=>2*d*u[i]+(s*s-uu)*x+2*s*c[i])};
  const qm=(a,b)=>[
    a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
    a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
    a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
    a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]
  ];
  const qa=(axis,a)=>{const n=norm(axis),s=Math.sin(a/2);return [...mul(n,s),Math.cos(a/2)]};
  const faces=mesh.polygons.map((raw,index)=>{
    let points=raw.map(i=>mesh.vertices[i]);
    const center=mul(points.reduce(add,[0,0,0]),1/points.length);
    let normal=norm(cross(sub(points[1],points[0]),sub(points[2],points[0])));
    if(dot(normal,center)<0){points=points.slice().reverse();normal=mul(normal,-1)}
    let t=norm(sub([1,0,0],mul(normal,normal[0])));
    if(Math.hypot(...t)<.15)t=norm(sub([0,1,0],mul(normal,normal[1])));
    const b=norm(cross(normal,t));
    const coords=points.map(p=>[dot(sub(p,center),t),dot(sub(p,center),b)]);
    const maxCoord=Math.max(...coords.flat().map(Math.abs));
    return {points,center,normal,t,b,fit:.42/Math.max(.001,maxCoord),index};
  });
  const atlas=new Image();atlas.decoding='async';
  atlas.src='assets/emerald-d20-albedo.webp';
  let tiles=[];

  function closedPolygon(ps){ctx.beginPath();ctx.moveTo(...ps[0]);for(let i=1;i<ps.length;i++)ctx.lineTo(...ps[i]);ctx.closePath()}
  // Affine texture mapping, the same per-face UV triangulation used by in-game Canvas 3D.
  function texturedTriangle(image,src,dst){
    const [[x0,y0],[x1,y1],[x2,y2]]=src,[[u0,v0],[u1,v1],[u2,v2]]=dst;
    const den=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
    if(Math.abs(den)<.01)return;
    const a=((u1-u0)*(y2-y0)-(u2-u0)*(y1-y0))/den;
    const c=((x1-x0)*(u2-u0)-(x2-x0)*(u1-u0))/den;
    const b=((v1-v0)*(y2-y0)-(v2-v0)*(y1-y0))/den;
    const d=((x1-x0)*(v2-v0)-(x2-x0)*(v1-v0))/den;
    const e=u0-a*x0-c*y0, f=v0-b*x0-d*y0;
    ctx.save();closedPolygon(dst);ctx.clip();ctx.setTransform(a,b,c,d,e,f);ctx.drawImage(image,0,0);ctx.restore();
  }
  function drawFace(face,q,w,h){
    const normal=qr(q,face.normal);if(normal[2]<=.01)return;
    const raw=face.points.map(p=>qr(q,p));
    const project=p=>{const cameraZ=4.8,scale=Math.min(w,h)*1.9,denom=Math.max(.8,cameraZ-p[2]);return [w*.5+scale*p[0]/denom,h*.5-scale*p[1]/denom]};
    const ps=raw.map(project);
    const mid=[ps.reduce((a,p)=>a+p[0],0)/ps.length,ps.reduce((a,p)=>a+p[1],0)/ps.length];
    const image=tiles[face.index];if(!image)return;
    const uv=p=>{const v=sub(p,face.center);return [(.5+dot(v,face.t)*face.fit)*image.width,(.5-dot(v,face.b)*face.fit)*image.height]};
    const srcC=[image.width*.5,image.height*.5];
    ctx.save();closedPolygon(ps);ctx.clip();
    for(let j=0;j<ps.length;j++){const k=(j+1)%ps.length;texturedTriangle(image,[srcC,uv(face.points[j]),uv(face.points[k])],[mid,ps[j],ps[k]])}
    const lit=dot(normal,norm([-.65,.8,1.4]));
    closedPolygon(ps);
    ctx.fillStyle=lit<0?`rgba(2,12,11,${Math.min(.5,-lit*.33)})`:`rgba(243,226,188,${Math.min(.17,lit*.12)})`;ctx.fill();
    // Brushed-metal bevel, much like the rim material of the in-game die.
    const inset=.065;
    for(let j=0;j<ps.length;j++){
      const k=(j+1)%ps.length,p=ps[j],e=ps[k];
      const pi=[p[0]*(1-inset)+mid[0]*inset,p[1]*(1-inset)+mid[1]*inset];
      const ei=[e[0]*(1-inset)+mid[0]*inset,e[1]*(1-inset)+mid[1]*inset];
      const shade=Math.max(0,Math.min(1,(lit+1)*.5));
      const g=ctx.createLinearGradient(p[0],p[1],pi[0],pi[1]);
      g.addColorStop(0,shade>.48?'#e5d6a2':'#b69b66');g.addColorStop(.5,'#a58d58');g.addColorStop(1,'#263d34');
      closedPolygon([p,e,ei,pi]);ctx.fillStyle=g;ctx.globalAlpha=.87;ctx.fill();ctx.globalAlpha=1;
      ctx.strokeStyle='#e3cf98';ctx.lineWidth=Math.max(1,w/340);ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...e);ctx.stroke();
    }
    ctx.restore();
  }
  function draw(time){
    const w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h);
    const t=time*.001;
    // Slow yaw + small tilts, with no synchronized or fake camera-facing numerals.
    let q=qm(qa([0,1,0],t*.39+.58),qm(qa([1,0,0],.32+Math.sin(t*.32)*.24),qa([0,0,1],.1+Math.sin(t*.2)*.14)));
    if(rollStart!==null){
      const progress=Math.min(1,Math.max(0,(time-rollStart)/rollDuration));
      const eased=1-Math.pow(1-progress,3);
      // Pełne obroty sklejają się dokładnie z powolnym, pierwotnym ruchem.
      q=qm(qa([.7,1,.34],6*Math.PI*eased),q);
      if(progress>=1){rollStart=null;portal.classList.remove('sh-die-rolling')}
    }
    const sorted=faces.map(face=>({face,z:qr(q,face.center)[2]})).sort((a,b)=>a.z-b.z);
    for(const {face} of sorted)drawFace(face,q,w,h);
  }
  function init(){
    if(!atlas.naturalWidth||!atlas.naturalHeight)return;
    const cols=5,rows=4,cellW=atlas.width/cols,cellH=atlas.height/rows;
    tiles=faces.map((face,i)=>{
      const c=document.createElement('canvas');c.width=Math.round(cellW);c.height=Math.round(cellH);
      c.getContext('2d').drawImage(atlas,(i%cols)*cellW,Math.floor(i/cols)*cellH,cellW,cellH,0,0,c.width,c.height);
      return c;
    });
    let visible=true,last=0;
    if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{visible=!!entries[0]?.isIntersecting});observer.observe(portal)}
    if(reduced){draw(1500);portal.classList.add('dice-ready');return}
    function frame(now){requestAnimationFrame(frame);if(!visible||document.hidden||now-last<32)return;last=now;draw(now)}
    draw(performance.now());portal.classList.add('dice-ready');requestAnimationFrame(frame);
  }
  function failImage(){
    console.error('[StreamHouse] Brakuje assets/emerald-d20-albedo.webp. Uruchom lokalny serwer z kompletnymi zasobami.');
    canvas.setAttribute('data-error','missing-texture');
    // This SVG fallback appears ONLY if the original v21 texture cannot be loaded.
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 300 300');svg.setAttribute('aria-label','Kość D20, awaryjny wygląd bez tekstury');
    svg.style.cssText='width:100%;height:100%;filter:drop-shadow(0 14px 21px #000b)';
    svg.innerHTML='<defs><linearGradient id="sh-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4da96"/><stop offset=".55" stop-color="#806039"/><stop offset="1" stop-color="#ddc08e"/></linearGradient><linearGradient id="sh-stone" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#406b56"/><stop offset=".56" stop-color="#172b26"/><stop offset="1" stop-color="#31594a"/></linearGradient></defs><path d="M150 18 280 104 232 262H68L20 104Z" fill="url(#sh-metal)" stroke="#f4d69a" stroke-width="5"/><path d="M150 29 268 108 225 248H75L32 108Z" fill="url(#sh-stone)" stroke="#c7a76a" stroke-width="3"/><path d="M150 29 150 144 32 108M150 144l118-36M150 144l75 104M150 144 75 248" stroke="#cba36b" stroke-width="4" fill="none"/><text x="150" y="123" text-anchor="middle" fill="#f1d6a0" font-size="44" font-family="Georgia">20</text></svg>';
    canvas.style.display='none';canvas.parentElement?.append(svg);portal.classList.add('dice-ready');
  }
  atlas.addEventListener('error',failImage,{once:true});
  if(atlas.complete){if(atlas.naturalWidth)init();else failImage()}else atlas.addEventListener('load',init,{once:true});
})();
