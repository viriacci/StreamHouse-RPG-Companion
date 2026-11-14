
(() => {
 'use strict';
 const S = window.SH;
 const overlay = document.getElementById('ritual-overlay');
 const stage = overlay?.querySelector('.dice-stage');
 if (!S || !stage) return;
 const oldRoll = S.ritualRoll;
 const canvasFallback = () => window.StreamHousePremiumCanvas;
 const oldCanvas = stage.querySelector('#streamhouse-dice-canvas');
 const canvas = document.createElement('canvas');
 canvas.id = 'streamhouse-premium-webgl';
 canvas.setAttribute('aria-label', 'Kości fantasy 3D z materiałami PBR');
 canvas.style.cssText = 'display:block;width:100%;height:100%;filter:drop-shadow(0 19px 22px #0007)';
 const stageShadow = document.createElement('div');
 stageShadow.style.cssText = 'position:absolute;pointer-events:none;left:20%;right:20%;bottom:5%;height:15%;background:radial-gradient(ellipse,#0009,transparent 70%);filter:blur(18px)';
 let gl = null, program=null, geometry=null, readyPromise=null, meshJson=null;
 const meshCache = new Map(), textures = new Map();
 let running = false, lastDraw = null, fallback = false, lastError = null, currentMode = 'WebGL2', pulseRAF = 0;
 const assetBase = (document.currentScript?.src || './assets/premium-webgl.js').replace(/premium-webgl\.js(?:\?.*)?$/, '');
 const clamp = (v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
 const len=v=>Math.hypot(v[0],v[1],v[2]);
 const norm=v=>{const l=len(v)||1;return v.map(x=>x/l)};
 const mul=(v,t)=>v.map(x=>x*t);
 const plus=(a,b)=>a.map((x,i)=>x+b[i]);
 const qm=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[0]];
 const qa=(axis,angle)=>{const a=norm(axis),s=Math.sin(angle/2);return [a[0]*s,a[1]*s,a[2]*s,Math.cos(angle/2)]};
 const qn=q=>{const l=Math.hypot(...q)||1;return q.map(x=>x/l)};
 const qrotate=(q,v)=>{const u=q.slice(0,3),s=q[3],d=dot(u,v),uu=dot(u,u),c=cross(u,v);return v.map((x,i)=>2*d*u[i]+(s*s-uu)*x+2*s*c[i])};
 function qfromto(a,b){a=norm(a);b=norm(b);const d=dot(a,b);if(d<-.999)return qa([1,0,0],Math.PI);return qn([...cross(a,b),1+d])}
 function qslerp(a,b,t){let d=a.reduce((s,x,i)=>s+x*b[i],0);if(d<0){b=b.map(v=>-v);d=-d}if(d>.9995)return qn(a.map((v,i)=>v+(b[i]-v)*t));const th=Math.acos(clamp(d,-1,1)),sn=Math.sin(th);return a.map((v,i)=>(v*Math.sin((1-t)*th)+b[i]*Math.sin(t*th))/sn)}
 function qspin(t,offset){return qn(qm(qa([0,1,0],(3.75*t+offset)*Math.PI*2),qm(qa([1,0,0],(2.7*t+offset*.15)*Math.PI*2),qa([0,0,1],(.65*t+.1)*Math.PI*2))))}
 const faceNumber=(s,i,part)=>part==='tens'?String(i*10).padStart(2,'0'):s===10||part==='ones'?(i===9?'0':String(i+1)):String(i+1);
 const faceIndex=(s,value,part)=>part==='tens'?(value===100?0:Math.floor(value/10)%10):part==='ones'?(value===100?9:(value%10===0?9:value%10-1)):s===10?(value===0?9:value-1):(Math.max(1,value)-1)%s;
 const namedSigned=n=>n>=0?`+${n}`:`${n}`;
 const htmlEscape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const VS=`#version 300 es
 precision highp float;
 layout(location=0) in vec3 aPosition;
 layout(location=1) in vec3 aNormal;
 layout(location=2) in vec2 aUV;
 layout(location=3) in vec3 aTangent;
 layout(location=4) in vec3 aBitangent;
 layout(location=5) in float aBevel;
 layout(location=6) in float aFace;
 layout(location=7) in float aRail;
 uniform mat4 uProjection;
 uniform vec4 uQuat;
 uniform vec3 uOffset;
 uniform float uScale;
 out vec2 vUV;
 out vec3 vPos,vNormal,vTangent,vBitangent;
 out float vBevel,vFace,vRail;
 vec3 rotate(vec3 v,vec4 q){return v+2.0*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
 void main(){
 vPos=rotate(aPosition,uQuat)*uScale+uOffset;
 vNormal=normalize(rotate(aNormal,uQuat));
 vTangent=normalize(rotate(aTangent,uQuat));
 vBitangent=normalize(rotate(aBitangent,uQuat));
 vUV=aUV;vBevel=aBevel;vFace=aFace;vRail=aRail;
 gl_Position=uProjection*vec4(vPos.xy,vPos.z-5.0,1.0);
 }`;
 const FS=`#version 300 es
 precision highp float;
 in vec2 vUV;
 in vec3 vPos,vNormal,vTangent,vBitangent;
 in float vBevel,vFace,vRail;
 uniform sampler2D uAlbedo,uNormalMap,uRoughness,uInkMask;
 uniform float uWinner,uFinished,uSilverRim,uGlowStrength;
 uniform vec3 uTrimColor;
 uniform vec2 uAtlasGrid;
 out vec4 frag;
 const float PI=3.14159265358979;
 vec3 lightTerm(vec3 L,vec3 radiance,vec3 N,vec3 V,vec3 base,float rough,float metal){
   vec3 H=normalize(V+L);
   float NL=max(dot(N,L),0.0),NV=max(dot(N,V),0.0001),NH=max(dot(N,H),0.0001),VH=max(dot(V,H),0.0001);
   float alpha=max(.055,rough*rough),a2=alpha*alpha;
   float denom=NH*NH*(a2-1.0)+1.0;
   float NDF=a2/max(PI*denom*denom,.0001);
   float k=(rough+1.0)*(rough+1.0)/8.0;
   float GGXv=NV/(NV*(1.0-k)+k);
   float GGXl=NL/(NL*(1.0-k)+k);
   vec3 F0=mix(vec3(.045),base,metal);
   vec3 fresnel=F0+(1.0-F0)*pow(1.0-VH,5.0);
   vec3 spec=(NDF*GGXv*GGXl*fresnel)/max(4.0*NV*NL,.001);
   vec3 diffuse=base/PI*(1.0-fresnel)*(1.0-metal);
   return (diffuse+spec)*radiance*NL;
 }
 void main(){
   if(vRail>.5 && uSilverRim<.5)discard;
   vec3 base=pow(texture(uAlbedo,vUV).rgb,vec3(2.2));
   float rough=clamp(texture(uRoughness,vUV).r,.13,.46);
   vec3 mapped=texture(uNormalMap,vUV).xyz*2.0-1.0;
   mapped.xy*=.27*(1.0-vRail);
   vec3 N=normalize(mat3(normalize(vTangent),normalize(vBitangent),normalize(vNormal))*normalize(mapped));
   vec3 V=normalize(vec3(0.0,0.0,5.0)-vPos);
   float bevel=clamp(vBevel,0.0,1.0);
   float metal=mix(.015,.99,bevel*uSilverRim);
   rough=mix(rough,.105,bevel*uSilverRim);
   vec3 silver=uTrimColor;
   base=mix(base,silver,bevel*uSilverRim);
   rough=mix(rough,.125,bevel*(1.0-uSilverRim)*.72);
   metal=mix(metal,.12,bevel*(1.0-uSilverRim));
   base*=mix(1.0,.7,bevel*(1.0-uSilverRim));
   vec3 color=base*(.24+.12*clamp(N.y*.5+.5,0.0,1.0));
   color+=lightTerm(normalize(vec3(-.60,1.0,1.55)),vec3(3.4,3.1,2.65),N,V,base,rough,metal);
   color+=lightTerm(normalize(vec3(1.10,-.22,.65)),vec3(.95,1.52,1.32),N,V,base,rough,metal);
   color+=lightTerm(normalize(vec3(.1,-1.3,-.2)),vec3(.75,.8,1.05),N,V,base,rough,metal);
   vec3 R=reflect(-V,N);
   float env=pow(max(dot(R,normalize(vec3(-.4,.94,.44))),0.0),mix(25.0,3.0,rough));
   color+=vec3(.78,.95,.87)*env*(.29+.45*(1.0-rough));
   float glint=pow(max(dot(N,normalize(vec3(-.7,.7,1.0))),0.0),mix(90.0,18.0,rough));
   color+=vec3(1.0,.99,.93)*glint*.22;
   float fres=pow(1.0-max(dot(N,V),0.0),3.0);
   color+=mix(vec3(.08,.26,.21),vec3(.24,.27,.36),uSilverRim)*fres*(1.0-.65*bevel);
   float streak=pow(max(dot(reflect(-V,N),normalize(vec3(.48,.79,.3))),0.0),7.0);
   color+=bevel*uSilverRim*(.42+silver)*(.13+.75*streak);
   color+=bevel*uSilverRim*vec3(.30,.39,.48)*pow(1.0-max(dot(N,V),0.0),2.0);
   float win=(1.0-step(.45,abs(vFace-uWinner)))*uFinished;
   vec3 texel=texture(uAlbedo,vUV).rgb;
   float numeral=texture(uInkMask,vUV).a;
   vec2 faceUV=fract(vec2(vUV.x*uAtlasGrid.x,(1.0-vUV.y)*uAtlasGrid.y));
   float radial=1.0-smoothstep(.08,.75,length((faceUV-.5)*1.25));
   float strength=clamp(uGlowStrength,0.0,1.0);
   float shell=win*(1.0-smoothstep(.10,.46,bevel))*(1.0-numeral);
   float opacity=(.18+.37*strength)*(.42+.58*radial)*shell;
   color=mix(color,vec3(1.53,1.07,.24),opacity);
   color+=vec3(.18,.105,.028)*shell*radial*(.35+.65*strength);
   float goldRim=win*bevel;
   color=mix(color,vec3(1.35,1.02,.60),goldRim*(.14+.12*strength));
   color+=vec3(.12,.08,.025)*goldRim*(.3+.4*strength);
   color=color/(color+vec3(1.0));
   color=pow(max(color,vec3(0.0)),vec3(1.0/2.2));
   frag=vec4(color,1.0);
 }`;
 function createShader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader: '+gl.getShaderInfoLog(s));return s}
 function createProgram(){const p=gl.createProgram(),vs=createShader(gl.VERTEX_SHADER,VS),fs=createShader(gl.FRAGMENT_SHADER,FS);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Link WebGL: '+gl.getProgramInfoLog(p));return p}
 function makeMesh(sides){
   const data=meshJson['d'+sides]||meshJson.d20;
   const vertices=data.vertices,faces=[];
   const rows=Math.ceil(Math.sqrt(data.polygons.length)),cols=rows;
   const columns=Math.ceil(Math.sqrt(data.polygons.length)),rowCount=Math.ceil(data.polygons.length/columns);
   const output=[];
   function emit(p,n,uv,tan,bitan,bevel,id,rail=0){output.push(...p,...n,...uv,...tan,...bitan,bevel,id,rail)}
   data.polygons.forEach((raw,i)=>{
    let pts=raw.map(j=>vertices[j]);const center=mul(pts.reduce((a,b)=>plus(a,b),[0,0,0]),1/pts.length);
    let n=norm(cross(sub(pts[1],pts[0]),sub(pts[2],pts[0])));
    if(dot(n,center)<0){pts=pts.slice().reverse();n=n.map(x=>-x)}
    let t=norm(sub([1,0,0],mul(n,n[0])));
    if(len(t)<.16)t=norm(sub([0,1,0],mul(n,n[1])));
    let b=norm(cross(n,t));
    const local=pts.map(p=>[dot(sub(p,center),t),dot(sub(p,center),b)]);
    const maxCoord=Math.max(...local.map(x=>Math.max(Math.abs(x[0]),Math.abs(x[1]))));
    const fit=.42/Math.max(maxCoord, .001);
    const row=Math.floor(i/columns),col=i%columns;
    const uv=p=>{const l=sub(p,center);return [(col+.5+dot(l,t)*fit)/columns,1-(row+.5-dot(l,b)*fit)/rowCount]};
    const top=plus(center,mul(n,.029));
    const inner=pts.map(p=>plus(plus(center,mul(sub(p,center),.940)),mul(n,.026)));
    const norms=pts.map(p=>norm(plus(mul(n,.34),mul(norm(p),.66))));
    function tri(a,na,aa,c,nc,ac,d,nd,ad){emit(a,na,uv(a),t,b,aa,i);emit(c,nc,uv(c),t,b,ac,i);emit(d,nd,uv(d),t,b,ad,i)}
    for(let j=0;j<pts.length;j++)tri(top,n,0,inner[j],n,0,inner[(j+1)%pts.length],n,0);
    for(let j=0;j<pts.length;j++){
      const next=(j+1)%pts.length;
      tri(inner[j],n,1,pts[j],norms[j],1,pts[next],norms[next],1);
      tri(inner[j],n,1,pts[next],norms[next],1,inner[next],n,1);
    }
    faces.push({n,t,b,index:i});
   });
   const edges=new Set();
   for(const poly of data.polygons){for(let i=0;i<poly.length;i++){
     const a=poly[i],b=poly[(i+1)%poly.length];
     const key=[Math.min(a,b),Math.max(a,b)].join(':');
     if(edges.has(key))continue;edges.add(key);
     const p0=vertices[a],p1=vertices[b],edge=norm(sub(p1,p0));
     const mid=mul(plus(p0,p1),.5),radial=norm(mid);
     let lateral=norm(cross(edge,radial));
     if(len(lateral)<.1)lateral=norm(cross(edge,[0,1,0]));
     const normalFor=theta=>norm(plus(mul(radial,Math.cos(theta)),mul(lateral,Math.sin(theta))));
     const radius=.009,offset=.004,segments=8;
     for(let j=0;j<segments;j++){
       const n0=normalFor(j*2*Math.PI/segments),n1=normalFor((j+1)*2*Math.PI/segments);
       const rail=(p,n)=>plus(plus(p,mul(radial,offset)),mul(n,radius));
       const a0=rail(p0,n0),a1=rail(p1,n0),b0=rail(p0,n1),b1=rail(p1,n1);
       const uv=[.5/cols,1-.5/Math.ceil(data.polygons.length/cols)];
       emit(a0,n0,uv,edge,lateral,1,-2,1);emit(a1,n0,uv,edge,lateral,1,-2,1);emit(b1,n1,uv,edge,lateral,1,-2,1);
       emit(a0,n0,uv,edge,lateral,1,-2,1);emit(b1,n1,uv,edge,lateral,1,-2,1);emit(b0,n1,uv,edge,lateral,1,-2,1);
     }
   }}
   const vao=gl.createVertexArray();gl.bindVertexArray(vao);
   const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(output),gl.STATIC_DRAW);
   let off=0;for(const [loc,size] of [[0,3],[1,3],[2,2],[3,3],[4,3],[5,1],[6,1],[7,1]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,17*4,off*4);off+=size}
   gl.bindVertexArray(null);
   return {vao,count:output.length/17,faces,buffer:buf,columns,rowCount};
 }
 async function loadImage(url){
    const key=url.split('/').pop().replace(/\.webp(?:\?.*)?$/,'');
    const safeUrl=window.StreamHousePremiumAtlases?.[key]||url;
    return await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Nie można odczytać mapy '+key));i.src=safeUrl});
  }
 function makeTexture(img){const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);return tex}
 async function assetsFor(theme,key){const cacheKey=theme+':'+key;if(textures.has(cacheKey)){const old=textures.get(cacheKey);textures.delete(cacheKey);textures.set(cacheKey,old);return old}const files=['albedo','normal','roughness','ink'];const images=await Promise.all(files.map(f=>window.StreamHousePremiumMaterials.atlas(theme,key,f)));const tex=images.map(makeTexture);textures.set(cacheKey,tex);while(textures.size>16){const oldest=textures.keys().next().value;for(const t of textures.get(oldest))gl.deleteTexture(t);textures.delete(oldest)}return tex}
 async function ensure(){if(readyPromise)return readyPromise;readyPromise=(async()=>{
   gl=canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'high-performance'});
   if(!gl)throw Error('WebGL2 niedostępny');
   program=createProgram();
   meshJson=window.StreamHouseEmeraldGeometry;if(!meshJson)throw Error('Brak danych brył: dice-geometry.js');
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   await assetsFor('goblin','d20');
 })().catch(e=>{console.warn('StreamHouse WebGL2 niedostępne, przełączam na mapowanie UV Canvas:',e);lastError=String(e);currentMode='Canvas UV';fallback=true;throw e});return readyPromise}
 function resize(){const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.75);const w=Math.max(320,Math.round(box.width*dpr)),h=Math.max(220,Math.round(box.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h)}
 function proj(){const f=1/Math.tan(.55/2),a=canvas.width/canvas.height,n=.1,far=60;return new Float32Array([f/a,0,0,0, 0,f,0,0, 0,0,(far+n)/(n-far),-1, 0,0,2*far*n/(n-far),0])}
 function target(face){let q=qfromto(face.n,[0,0,1]);const v=qrotate(q,face.b);const rotation=Math.atan2(v[0],v[1]);return qn(qm(qa([0,0,1],rotation),q))}
 function draw(items,finished=false,glow=1){if(!gl)return;resize();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
   const uniform=(name)=>gl.getUniformLocation(program,name);
   gl.uniformMatrix4fv(uniform('uProjection'),false,proj());
   gl.uniform1i(uniform('uAlbedo'),0);gl.uniform1i(uniform('uNormalMap'),1);gl.uniform1i(uniform('uRoughness'),2);gl.uniform1i(uniform('uInkMask'),3);
   for(const item of items){if(!item.textures||!item.geometry)continue;
     item.textures.forEach((tex,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex)});
     gl.uniform4fv(uniform('uQuat'),item.q);
     gl.uniform3fv(uniform('uOffset'),[item.x,item.y,item.z||0]);
     gl.uniform1f(uniform('uScale'),item.scale);
     gl.uniform1f(uniform('uWinner'),item.face);
     const material=window.StreamHousePremiumMaterials.theme(item.theme);
     gl.uniform1f(uniform('uSilverRim'),material.metal);
     const hex=material.rim.replace('#','');const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255);
     gl.uniform3fv(uniform('uTrimColor'),rgb);
     gl.uniform1f(uniform('uFinished'),finished?1:0);
     gl.uniform1f(uniform('uGlowStrength'),glow);
     gl.uniform2f(uniform('uAtlasGrid'),item.geometry.columns,item.geometry.rowCount);
     gl.bindVertexArray(item.geometry.vao);gl.drawArrays(gl.TRIANGLES,0,item.geometry.count);
   }
   gl.bindVertexArray(null);
 }
 function formatMods(mods){return mods.map(m=>{const v=Number(m.value)||0;return `<span class="sh-mod-tag ${v>0?'positive':v<0?'negative':'zero'}"><em>${htmlEscape(m.label||'Modyfikator')}</em><b>${namedSigned(v)}</b></span>`}).join('')}
 function resultCard({value,sides,mods,total,mode,second}){
   const title=second!==null?(mode==='advantage'?'Przewaga':'Utrudnienie'):(sides===100?'Rzut procentowy D100':`Rzut kością D${sides}`);
   return `<div class="sh-result-title">${title} · Kość ${value}</div>${mods.length?`<div class="sh-mod-list">${formatMods(mods)}</div>`:''}<div class="sh-result-total"><span>Wynik końcowy</span><strong>${total}</strong></div>`;
 }
 let contextLost=false;
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;fallback=true;currentMode='Canvas UV';console.warn('WebGL: kontekst utracony, aktywny renderer UV Canvas')});
 const stopPulse=()=>{if(pulseRAF)cancelAnimationFrame(pulseRAF);pulseRAF=0};
 function startPulse(items,reduced){
   stopPulse();lastDraw={items,pulse:.52};
   if(reduced){draw(items,true,.52);return}
   const begin=performance.now();
   const tick=now=>{
     if(fallback||contextLost||overlay.classList.contains('hidden')||!canvas.isConnected){stopPulse();return}
     const pulse=.5-.5*Math.cos((now-begin)*Math.PI*2/3400);
     lastDraw.pulse=pulse;draw(items,true,pulse);
     pulseRAF=requestAnimationFrame(tick);
   };
   pulseRAF=requestAnimationFrame(tick);
 }
 const oldResize=()=>{if(!overlay.classList.contains('hidden')&&lastDraw&&canvas.isConnected&&!running&&!fallback)draw(lastDraw.items,true,lastDraw.pulse)};
 window.addEventListener('resize',oldResize);
 S.ritualRoll = async function(options={}){
   const theme=options.theme||document.documentElement.dataset.diceTheme||'goblin';
   if(!window.StreamHousePremiumMaterials?.catalog?.[theme]){
     if(oldCanvas&&!oldCanvas.isConnected)stage.replaceChildren(oldCanvas);
     return oldRoll(options);
   }
   if(fallback){currentMode='Canvas UV';return canvasFallback()?.roll(options)}
   if(running)return;stopPulse();
   try{await ensure()}catch{return canvasFallback()?.roll(options)}
   const sides=Number(options.sides)||20,value=Number(options.value)||1,bonus=Number(options.bonus)||0;
   const modifiers=Array.isArray(options.modifiers)?options.modifiers.filter(m=>m&&Number.isFinite(Number(m.value))):(bonus?[{label:'Modyfikator',value:bonus}]:[]);
   const total=value+modifiers.reduce((a,m)=>a+Number(m.value),0);
   const isTwo=sides===100||options.second!==null&&options.second!==undefined;
   const list=[];
   const makeItem=async(part,n,index)=>{
    const s=sides===100?10:sides,k=part==='tens'?'d100-tens':part==='ones'?'d100-ones':'d'+s;
    let shape=meshCache.get(s);if(!shape){shape=makeMesh(s);meshCache.set(s,shape)}
    const face=faceIndex(s,n,part);
    const d={geometry:shape,textures:await assetsFor(theme,k),theme,q:qspin(0,index*.21),face,qTarget:target(shape.faces[face]),x:isTwo?(index===0?-1.02:1.02):0,y:0,z:0,scale:isTwo?.82:1.12,offset:index*.19};
    list.push(d);
   };
   try{
     if(sides===100){await makeItem('tens',value,0);await makeItem('ones',value,1)}
     else if(isTwo){await makeItem('single',value,0);await makeItem('single',Number(options.second)||1,1)}
     else await makeItem('single',value,0);
   }catch(e){console.warn('Tekstura PBR niedostępna, uruchamiam UV Canvas:',e);lastError=String(e);currentMode='Canvas UV';return canvasFallback()?.roll(options)}
   running=true;
   stage.replaceChildren(stageShadow,canvas);overlay.classList.remove('hidden');
   overlay.querySelector('#ritual-title').textContent=options.title||'Rzut kością';
   overlay.querySelector('#ritual-under').textContent=options.detail||'';
   overlay.querySelector('#ritual-final').classList.add('hidden');
   overlay.querySelector('#ritual-close').classList.add('hidden');
   const reduce=window.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
   const duration=reduce?160:2100,begin=performance.now();
   await new Promise(resolve=>{const tick=now=>{
     const t=clamp((now-begin)/duration,0,1);
     for(const d of list){const transition=.58,mid=qspin(transition,d.offset);
       if(t<transition)d.q=qspin(t,d.offset);
       else d.q=qslerp(mid,d.qTarget,1-Math.pow(1-(t-transition)/(1-transition),3));
       d.z=t<.78?.09*Math.sin(t*4*Math.PI)*(1-t):0;
     }
     draw(list,t>.965);
     if(t<1&&canvas.isConnected)requestAnimationFrame(tick);else resolve();
   };requestAnimationFrame(tick)});
   for(const d of list)d.q=d.qTarget;
   if(!reduce){await new Promise(resolve=>{const glowStart=performance.now();const fade=now=>{const p=clamp((now-glowStart)/480,0,1);draw(list,true,.08+.42*p);if(p<1&&canvas.isConnected)requestAnimationFrame(fade);else resolve()};requestAnimationFrame(fade)})}
   draw(list,true,.5);
   overlay.querySelector('#ritual-final').innerHTML=resultCard({value,sides,mods:modifiers,total,mode:options.mode||'normal',second:options.second??null});
   overlay.querySelector('#ritual-final').classList.remove('hidden');
   overlay.querySelector('#ritual-close').classList.remove('hidden');
   overlay.querySelector('#ritual-under').textContent='';
   running=false;startPulse(list,reduce);options.onComplete?.();return value;
 };
 window.StreamHousePremiumDice={version:'4.0.0',renderer:'WebGL2 PBR',supported:window.StreamHousePremiumMaterials.names,state:()=>({ready:!!gl&&!fallback,running,meshes:meshCache.size,materials:textures.size,contextLost,pulsing:!!pulseRAF,mode:currentMode,error:lastError}),showPreview:(theme='amethyst')=>S.ritualRoll({title:theme==='amethyst'?'Królewski Ametyst':'Szmaragdowa Relikwia',value:17,sides:20,theme,modifiers:[{label:'Percepcja',value:4},{label:'Wyrzutek',value:-3}]})};
})();
