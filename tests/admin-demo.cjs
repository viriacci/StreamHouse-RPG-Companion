'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const script=fs.readFileSync('admin/admin.js','utf8');
function run(environment){
 const nodes=new Map();
 const handlers={};
 function element(id){
  if(!nodes.has(id))nodes.set(id,{
   id,value:'',hidden:false,disabled:false,textContent:'',innerHTML:'',dataset:{},
   classList:{add(){},remove(){},toggle(){}},
   setAttribute(){},removeAttribute(){},focus(){},
   addEventListener(event,fn){handlers[id+':'+event]=fn}
  });
  return nodes.get(id);
 }
 const document={
  getElementById:element,
  querySelectorAll(){return []},
  querySelector(sel){return sel==='.sidebar'?element('sidebar'):null},
  addEventListener(event,fn){handlers['document:'+event]=fn}
 };
 const sandbox={
  window:environment,document,
  setTimeout,clearTimeout,
  Date,Number,console,Promise,
  location:{href:'http://127.0.0.1:8091/admin/index.html'}
 };
 vm.runInNewContext(script,sandbox,{timeout:1000});
 return {node:element,handlers};
}
function action(type,name,id){
 return {
  dataset:{action:name,id},
  closest(selector){
   if(selector==='[data-action]')return this;
   return null;
  }
 };
}
(async()=>{
 const missing=run({STREAMHOUSE_ADMIN_DEMO:true});
 assert(missing.node('content').innerHTML.includes('Panel dostępny tylko na staging'));
 const app=run({STREAMHOUSE_ADMIN_DEMO:true,STREAMHOUSE_ADMIN_ENV:'staging'});
 await new Promise(resolve=>setTimeout(resolve,5));
 assert(app.node('content').innerHTML.includes('Centrum dowodzenia'));
 assert(app.node('content').innerHTML.includes('TRYB DEMONSTRACYJNY'));
 assert(app.node('content').innerHTML.includes('Legenda Zaginionej Korony'));
 assert(!app.node('content').innerHTML.includes('xqfglhaapojxnjdmxkrm'));
 await app.handlers['document:click']({
  target:action('click','goto-campaigns'),
  preventDefault(){}
 });
 assert(app.node('content').innerHTML.includes('Zarządzaj światami'));
 await app.handlers['document:click']({
  target:action('click','members','20000000-0000-4000-8000-000000000001'),
  preventDefault(){}
 });
 assert(app.node('content').innerHTML.includes('Mistrz Gry'));
 assert(app.node('content').innerHTML.includes('Usuń gracza'));
 console.log('PASS: staging gate, offline demo, dashboard, campaign list, roster.');
})().catch(err=>{console.error(err);process.exitCode=1});
