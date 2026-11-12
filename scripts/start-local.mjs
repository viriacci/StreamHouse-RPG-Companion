// Node.js fallback for Windows machines without Python. Never expose the server beyond localhost.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
const port=Number(process.env.STREAMHOUSE_PORT||8765);
const server=createServer((req,res)=>{
  let path;
  try { path=decodeURIComponent(new URL(req.url||'/', 'http://127.0.0.1/').pathname); }
  catch {res.writeHead(400);res.end('Invalid path');return;}
  let actual=resolve(root,'.'+path);
  if(actual!==root&&!actual.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
  try {if(statSync(actual).isDirectory())actual=resolve(actual,'index.html');}
  catch {res.writeHead(404);res.end('Not found');return;}
  if(actual!==root&&!actual.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
  if(path.startsWith('/bundles/')||path.startsWith('/supabase/')||path.startsWith('/scripts/')||path.startsWith('/docs/')||path.startsWith('/tests/')||path.startsWith('/.')){res.writeHead(403);res.end('Forbidden');return;}
  try {const st=statSync(actual);if(!st.isFile())throw Error();res.writeHead(200,{'Content-Type':mime[extname(actual).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD'){res.end();return;}createReadStream(actual).pipe(res);}catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',e=>{console.error('Nie udalo sie uruchomic lokalnego serwera:',e.message);process.exit(2)});
server.listen(port,'127.0.0.1',()=>{
 const url=`http://127.0.0.1:${port}/`;
 console.log('StreamHouse v11 ->',url,'\nZatrzymaj przez Ctrl+C.');
 if(process.platform==='win32')execFile('cmd',['/c','start','',url],()=>{});
 else if(process.platform==='darwin')execFile('open',[url],()=>{});
 else execFile('xdg-open',[url],()=>{});
});
