
(function(global){'use strict';
 const models=global.StreamHouseEmeraldGeometry||{};
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const sub=(a,b)=>a.map((x,i)=>x-b[i]),norm=a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l)};
 const avg=points=>points.reduce((a,p)=>a.map((x,i)=>x+p[i]),[0,0,0]).map(x=>x/points.length);
 const qNorm=a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l)};
 const qMul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]+a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[3]+a[1]*b[2]-a[2]*b[0],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
 const qAxis=(axis,t)=>{const n=norm(axis),s=Math.sin(t/2);return [...n.map(x=>x*s),Math.cos(t/2)]};
 const qRotate=(q,v)=>{const u=q.slice(0,3),s=q[3],d=dot(u,v),uu=dot(u,u),c=cross(u,v);return v.map((x,i)=>2*d*u[i]+(s*s-uu)*x+2*s*c[i])};
 const qTo=(a,b)=>{const x=norm(a),y=norm(b),d=dot(x,y);return d<-.999?qAxis([1,0,0],Math.PI):qNorm([...cross(x,y),1+d])};
 const qSlerp=(a,b,t)=>{let d=dot(a,b);if(d<0){b=b.map(x=>-x);d=-d}if(d>.9995)return qNorm(a.map((x,i)=>x+(b[i]-x)*t));const theta=Math.acos(clamp(d,-1,1)),sn=Math.sin(theta);return a.map((x,i)=>x*Math.sin((1-t)*theta)/sn+b[i]*Math.sin(t*theta)/sn)};
 let sequence=0;
 function meshFor(sides){const m=models['d'+(sides===100?10:sides)]||models.d20;if(!m)return null;return m.polygons.map((polygon,index)=>{const points=polygon.map(i=>m.vertices[i]),center=avg(points);let n=norm(cross(sub(points[1],points[0]),sub(points[2],points[0])));if(dot(n,center)<0)n=n.map(v=>-v);return {points,normal:n,index}})}
 function frame(ctx,canvas,meshes,t,finished){const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);const grad=ctx.createRadialGradient(w/2,h/2,10,w/2,h/2,w*.55);grad.addColorStop(0,'#55482a');grad.addColorStop(.6,'#1c251b');grad.addColorStop(1,'#0c1510');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 for(const info of meshes){const {faces,win,sides,part,offset}=info;const qStart=qMul(qAxis([.4,1,.3],7.8*t+offset),qAxis([1,.2,.5],12*t+offset)),target=qMul(qAxis([0,0,1],.16),qTo(faces[win].normal,[0,0,1]));const q=t<.67?qStart:qSlerp(qMul(qAxis([.4,1,.3],7.8*.67+offset),qAxis([1,.2,.5],12*.67+offset)),target,1-Math.pow(1-(t-.67)/.33,3));const fs=[];
 for(const face of faces){const normal=qRotate(q,face.normal);if(normal[2]<0.08)continue;const pts=face.points.map(p=>qRotate(q,p)).map(p=>{const z=4.5-p[2];return [w*.5+offset*w*.25+p[0]*h*.87/z,h*.49-p[1]*h*.87/z,p[2]]});fs.push({pts,normal,index:face.index,z:pts.reduce((a,p)=>a+p[2],0)/pts.length})}
 fs.sort((a,b)=>a.z-b.z);
 for(const f of fs){const pts=f.pts;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(const pt of pts.slice(1))ctx.lineTo(pt[0],pt[1]);ctx.closePath();const light=clamp(.37+dot(f.normal,norm([-.5,.8,1]))*.4,.12,1);ctx.fillStyle=`rgb(${Math.round(16+44*light)},${Math.round(35+127*light)},${Math.round(31+101*light)})`;ctx.shadowColor='#000a';ctx.shadowBlur=18;ctx.fill();ctx.shadowBlur=0;const isWinning=finished&&f.index===win;ctx.strokeStyle=isWinning?'#fff0a7':'#c6a36d';ctx.lineWidth=isWinning?3:1.8;ctx.stroke();const cx=pts.reduce((a,p)=>a+p[0],0)/pts.length,cy=pts.reduce((a,p)=>a+p[1],0)/pts.length;let number=String(f.index+1);if(sides===10||sides===100)number=String(f.index===9?0:f.index+1);if(part==='tens')number=String((f.index===9?0:f.index+1)*10).padStart(2,'0');ctx.save();ctx.clip();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${Math.min(24,Math.max(12,h*.075))}px Georgia,serif`;ctx.lineWidth=3;ctx.strokeStyle='#091410';ctx.strokeText(number,cx,cy);ctx.fillStyle=isWinning?'#fff2bd':'#e9dfbb';ctx.fillText(number,cx,cy);ctx.restore();}
 }
 }
 async function play(canvas,options){if(!canvas?.getContext)return;const token=++sequence;const {sides,value,total,modifier=0}=options;const ctx=canvas.getContext('2d');const v=Number(value);const n=Number(sides);if(![4,6,8,10,12,20,100].includes(n)||!Number.isInteger(v)||v<1||v>n)throw Error('Nieprawidłowy rzut.');
 const faces=meshFor(n);if(!faces?.length)throw Error('Nie znaleziono modelu kości.');
 const make=(digit,part='',offset=0)=>({faces,win:digit===0?9:(digit-1)%faces.length,sides:n,part,offset});
 const meshes=n===100?[make(Math.floor((v%100)/10),'tens',-1),make(v%10,'ones',1)]:[make(v,'',0)];
 const output=document.getElementById('dice-total');if(output)output.textContent='Kość w ruchu…';
 const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?50:1400,start=performance.now();
 await new Promise(resolve=>{function step(now){if(token!==sequence){resolve();return}const t=clamp((now-start)/duration,0,1);frame(ctx,canvas,meshes,t,t>=1);if(t>=1)resolve();else requestAnimationFrame(step)}requestAnimationFrame(step)});
 if(token===sequence&&output)output.textContent=`D${n}: ${v} ${modifier>=0?'+':'−'} ${Math.abs(modifier)} = ${total}`;
 }
 global.StreamHouseRitual=Object.freeze({play});
})(window);
