(function(){
'use strict';
let context=null;
async function play(){
 const Audio=window.AudioContext||window.webkitAudioContext;
 if(!Audio)throw Error('Przeglądarka nie obsługuje dźwięku.');
 context=context||new Audio();
 const resume=context.state==='running'?Promise.resolve():context.resume();
 const ctx=context,t=ctx.currentTime+.03;
 const master=ctx.createGain();master.gain.value=.32;master.connect(ctx.destination);
 const noise=ctx.createBuffer(1,Math.floor(ctx.sampleRate*2.45),ctx.sampleRate);
 const data=noise.getChannelData(0);
 let seed=0x5a17;
 for(let i=0;i<data.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=(seed/2147483648)*.55}
 const wash=ctx.createBufferSource();wash.buffer=noise;
 const filter=ctx.createBiquadFilter();filter.type='lowpass';
 filter.frequency.setValueAtTime(220,t);
 filter.frequency.exponentialRampToValueAtTime(3200,t+1.9);
 filter.frequency.exponentialRampToValueAtTime(240,t+2.4);
 const wind=ctx.createGain();
 wind.gain.setValueAtTime(.0001,t);
 wind.gain.exponentialRampToValueAtTime(.32,t+1.55);
 wind.gain.exponentialRampToValueAtTime(.0001,t+2.42);
 wash.connect(filter).connect(wind).connect(master);
 wash.start(t);wash.stop(t+2.45);
 function tone(freq,start,duration,kind,volume,target){
  const osc=ctx.createOscillator(),env=ctx.createGain();
  osc.type=kind;osc.frequency.setValueAtTime(freq,t+start);
  if(target)osc.frequency.exponentialRampToValueAtTime(target,t+start+duration*.8);
  env.gain.setValueAtTime(.0001,t+start);
  env.gain.exponentialRampToValueAtTime(volume,t+start+.035);
  env.gain.exponentialRampToValueAtTime(.0001,t+start+duration);
  osc.connect(env).connect(master);
  osc.start(t+start);osc.stop(t+start+duration+.02);
 }
 tone(98,0,2.45,'sine',.11,146.83);
 tone(146.83,.15,2.15,'triangle',.055,220);
 tone(55,2.04,1.05,'sine',.54,38);
 tone(440,2.10,1.15,'sine',.13,439);
 tone(659.25,2.17,.83,'sine',.085,660);
 tone(880,2.21,.63,'sine',.045,878);
 await resume;
 return true;
}
window.StreamHouseIntroAudio=Object.freeze({play});
})();