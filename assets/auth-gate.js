
(function(global){
  'use strict';
  const script=document.currentScript;
  const portal=new URL('../StreamHouse-Portal.html',script?.src||global.location.href);
  portal.searchParams.set('login_required','1');
  const cloud=global.StreamHouseCloud;
  let unlocked=false;
  function close(){
    if(unlocked)return;
    global.location.replace(portal.href);
  }
  async function check(){
    try{
      if(!cloud?.configured)throw Error('Brak konfiguracji Supabase');
      const result=await cloud.init(); // getUser() potwierdza sesje w Auth API
      if(!result.user?.id)throw Error('Brak sesji Discord');
      unlocked=true;
      document.documentElement.classList.remove('sh-auth-locked');
      global.addEventListener('streamhouse:cloud-change',()=>{
        if(unlocked&&!cloud.user()?.id){
          document.documentElement.classList.add('sh-auth-locked');
          unlocked=false;close();
        }
      });
    }catch(err){close();}
  }
  check();
})(window);
