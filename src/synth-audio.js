// SYNTHPUCK original short sound effects only, NOT substitute soundtracks.
// DIAMOND & STAL use the actual approved recorded songs in assets/audio/music.
export const SPLASH_SOUNDS=Object.freeze({
 ready:'ready',go:'go',goal:'goal',smash:'goalSmash',win:'win',lose:'lose'
});
export const SYNTH_EFFECTS=Object.freeze(['smash','ready','go','goal','goalSmash','win','lose']);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const hz=n=>440*Math.pow(2,(n-69)/12);
export function createSynthSoundscape({ContextClass=globalThis.AudioContext||globalThis.webkitAudioContext}={}){
 if(typeof ContextClass!=='function')return {
  available:false,unlock(){return false},scene(){},effect(){return false},
  snapshot(){return {available:false,active:null,ready:false}}
 };
 let ctx=null,master=null,noiseBuffer=null;
 function init(){
  if(ctx)return;
  ctx=new ContextClass();
  const limiter=ctx.createDynamicsCompressor();
  limiter.threshold.value=-13;limiter.knee.value=6;limiter.ratio.value=6;
  limiter.attack.value=.004;limiter.release.value=.11;
  master=ctx.createGain();master.gain.value=.42;
  master.connect(limiter);limiter.connect(ctx.destination);
  noiseBuffer=ctx.createBuffer(1,Math.max(1,Math.floor(ctx.sampleRate*.65)),ctx.sampleRate);
  const data=noiseBuffer.getChannelData(0);let seed=8205;
  for(let i=0;i<data.length;i++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   data[i]=(seed/4294967296)*2-1;
  }
 }
 function envelope(out,start,duration,peak,attack=.005){
  const g=ctx.createGain();
  g.gain.setValueAtTime(.0001,start);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),start+Math.max(.002,attack));
  g.gain.exponentialRampToValueAtTime(.0001,start+Math.max(attack+.012,duration));
  g.connect(out);return g;
 }
 function tone(note,start,duration,volume,type='triangle',out=master,cutoff=0){
  const osc=ctx.createOscillator(),amp=envelope(out,start,duration,volume);
  osc.type=type;osc.frequency.setValueAtTime(hz(note),start);
  if(cutoff){
   const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=cutoff;
   osc.connect(lp);lp.connect(amp);
  }else osc.connect(amp);
  osc.start(start);osc.stop(start+duration+.012);
 }
 function sweep(from,to,start,duration,volume,out=master,type='sawtooth'){
  const osc=ctx.createOscillator(),amp=envelope(out,start,duration,volume,.003);
  osc.type=type;osc.frequency.setValueAtTime(from,start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(18,to),start+duration);
  osc.connect(amp);osc.start(start);osc.stop(start+duration+.015);
 }
 function noise(start,duration,volume,out=master,filterHz=3500,filterType='highpass'){
  const osc=ctx.createBufferSource();osc.buffer=noiseBuffer;
  const filter=ctx.createBiquadFilter();filter.type=filterType;filter.frequency.value=filterHz;
  const amp=envelope(out,start,duration,volume,.002);
  osc.connect(filter);filter.connect(amp);osc.start(start);osc.stop(start+duration+.01);
 }
 function chord(notes,start,duration,volume,out){
  for(const n of notes)tone(n,start,duration,volume/notes.length,'sawtooth',out,850);
 }
 function effect(name,strength=1){
  if(!SYNTH_EFFECTS.includes(name)||!ctx||ctx.state==='closed')return false;
  const v=clamp(strength,0,1),t=ctx.currentTime+.007,out=master;
  switch(name){
   case 'smash':
    noise(t,.084,.24*v,out,1600);
    noise(t,.026,.24*v,out,6100);
    sweep(540,120,t,.115,.18*v,out,'triangle');
    tone(68,t,.061,.07*v,'square',out);break;
   case 'ready':
    chord([56,63,68],t,.38,.14*v,out);
    sweep(470,740,t,.35,.095*v,out,'sine');break;
   case 'go':
    tone(74,t,.13,.24*v,'square',out);
    tone(86,t+.115,.22,.20*v,'triangle',out);break;
   case 'goal':
    noise(t,.075,.08*v,out,1700);
    [67,71,74].forEach((n,i)=>tone(n,t+i*.082,.26,.19*v,'triangle',out));break;
   case 'goalSmash':
    effect('smash',v);
    [62,69,81].forEach((n,i)=>tone(n,t+i*.085,.31,.20*v,'sawtooth',out,1700));break;
   case 'win':
    [60,64,67,72,79].forEach((n,i)=>tone(n,t+i*.11,.43,.21*v,'triangle',out));
    chord([72,76,79],t+.58,.80,.18*v,out);break;
   case 'lose':
    [60,57,53,48].forEach((n,i)=>tone(n,t+i*.17,.29,.16*v,'sine',out));
    noise(t+.38,.19,.046*v,out,800,'lowpass');break;
  }
  return true;
 }
 return {
  available:true,
  unlock(){
   try{init();ctx.resume()?.catch?.(()=>{});return true;}catch{return false;}
  },
  scene(){}, // Recorded MP3s are handled exclusively by the audio director.
  effect,
  snapshot(){return {available:true,active:null,ready:Boolean(ctx),clock:ctx?.state??null};}
 };
}
