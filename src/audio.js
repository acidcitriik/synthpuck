// SYNTHPUCK audio routing. Music is licensed separately from the game code.
import {createSynthSoundscape} from './synth-audio.js?v=approved-music-20261102-1';
import {normalizeAudioSettings} from './audio-settings.js';
// Local files under assets/audio/ always take precedence over hosted previews.
export const TRACKS=Object.freeze({
 menu:{title:'Legacy',artist:'Scott Buckley',local:'legacy.mp3',remote:'https://www.scottbuckley.com.au/library/wp-content/uploads/2022/12/Legacy.mp3',source:'https://www.scottbuckley.com.au/library/legacy/',license:'CC BY 4.0'},
 mute:{title:'Decoherence',artist:'Scott Buckley',local:'decoherence.mp3',remote:'https://www.scottbuckley.com.au/library/wp-content/uploads/2022/03/sb_decoherence.mp3',source:'https://www.scottbuckley.com.au/library/decoherence/',license:'CC BY 4.0'},
 chonk:{title:'Three Sheets to the Wind',artist:'Scott Buckley',local:'three-sheets-to-the-wind.mp3',remote:'https://www.scottbuckley.com.au/library/wp-content/uploads/2023/03/ThreeSheetsToTheWind.mp3',source:'https://www.scottbuckley.com.au/library/three-sheets-to-the-wind/',license:'CC BY 4.0'},
 simous:{title:'Outlaw Signal',artist:'Quantum Cowboy',local:'outlaw-signal.mp3',remote:'https://happysoulmusic.com/wp-content/grand-media/audio/Outlaw_Signal.mp3',source:'https://happysoulmusic.com/audio/outlaw_signal-mp3/',license:'CC BY 4.0'},
 mamouda:{title:'Mystic Force',artist:'Kevin MacLeod',local:'mystic-force.mp3',remote:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Mystic%20Force.mp3',source:'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500060',license:'CC BY 4.0'},
 diamond:{title:'Space Age Boogie Machine',artist:'John Bartmann',local:'space-age-boogie-machine.mp3',remote:null,source:'https://freemusicarchive.org/music/John_Bartmann/retro-boogie/space-age-boogie-machine/',license:'CC BY 4.0'},
 stal:{title:'Hack the Matrix',artist:'WBM Studio',local:'hack-the-matrix.mp3',remote:null,source:'https://pixabay.com/music/upbeat-hack-the-matrix-dark-progressive-house-499450/',license:'Pixabay Content License'},
 '2502':{title:'Emergent',artist:'Scott Buckley',local:'emergent.mp3',remote:'https://www.scottbuckley.com.au/library/wp-content/uploads/2019/11/sb_emergent.mp3',source:'https://www.scottbuckley.com.au/library/emergent/',license:'CC BY 4.0'}
});
export function musicKeyForScene(screen,opponentId){
 // Menu music is reserved for navigation, never the VS, story or a duel.
 if(['splash','loading','versus','story'].includes(screen))return null;
 if(['playing','pause','calibration','point','result','complete'].includes(screen))
   return TRACKS[opponentId]?opponentId:null;
 return 'menu';
}
export function classifyImpact(e){
 if(e?.type==='rail')return {sound:'rail',intensity:Math.max(.18,Math.min(1,(e.speed??5)/16))};
 if(e?.type==='impact'){
   const speed=e.speed??e.speedLimit??0;
   const smash=Number(e.smash)||0;
   return {sound:smash>=.5&&speed>=14?'smash':speed<5?'tap':'hit',intensity:Math.max(.24,Math.min(1,speed/16))};
 }
 return null;
}
const ROOT='./assets/audio/';
const BUNDLED_MUSIC=new Set(['menu','mute','chonk','simous','mamouda','diamond','stal','2502']);
const MIXKIT='https://assets.mixkit.co/active_storage/sfx/';
const INTRO_SOUND=ROOT+'sfx/dark-storm-wind.wav';
const SFX=Object.freeze({
 click:ROOT+'sfx/camera-shutter-click.ogg',
 back:ROOT+'sfx/fast-double-click.ogg',
 tap:ROOT+'sfx/refrigerator-door-slam.wav',
 hit:ROOT+'sfx/refrigerator-door-slam.wav',
 rail:ROOT+'sfx/car-door-slam.wav',
 smash:ROOT+'sfx/air-hockey-smack.mp3'
});
export const MATCH_SFX_URLS=Object.freeze([...new Set(['tap','hit','rail','smash'].map(key=>SFX[key]))]);
// Credit records are keyed by the actual SFX filenames. getSoundCredits()
// takes its list from the live playback routing, so unused sounds stay hidden.
export const SFX_CREDITS=Object.freeze({
 'camera-shutter-click.ogg':{title:'Camera Shutter Click',artist:'Mixkit',license:'Mixkit Sound Effects Free License',source:'https://mixkit.co/license/#sfxFree'},
 'fast-double-click.ogg':{title:'Fast Double Click',artist:'Mixkit',license:'Mixkit Sound Effects Free License',source:'https://mixkit.co/license/#sfxFree'},
 'refrigerator-door-slam.wav':{title:'Refrigerator Door Slam',artist:'Mixkit',license:'Mixkit Sound Effects Free License',source:'https://mixkit.co/license/#sfxFree'},
 'car-door-slam.wav':{title:'Car Door Slam',artist:'Mixkit',license:'Mixkit Sound Effects Free License',source:'https://mixkit.co/license/#sfxFree'},
 'air-hockey-smack.mp3':{title:'Air Hockey Smack',artist:'krb21 (Freesound)',license:'CC0',source:'https://freesound.org/people/krb21/sounds/118604/'},
 'dark-storm-wind.wav':{title:'Dark Storm Wind',artist:'Mixkit',license:'Mixkit Sound Effects Free License',source:'https://assets.mixkit.co/active_storage/sfx/2413/2413.wav'}
});
export function getSoundCredits(){
 return [...new Set([...Object.values(SFX),INTRO_SOUND])].map(path=>{
  const filename=path.slice(path.lastIndexOf('/')+1);
  return SFX_CREDITS[filename]??{title:filename,artist:'Attribution à compléter',license:'',source:''};
 });
}
const FALLBACKS={click:MIXKIT+'1133/1133-preview.mp3',back:MIXKIT+'275/275-preview.mp3',hit:MIXKIT+'2073/2073-preview.mp3',rail:MIXKIT+'2073/2073-preview.mp3'};
const VOICE_COUNTS=Object.freeze({click:2,back:2,tap:3,hit:3,rail:3,smash:2});
export function createAudioDirector({AudioClass=globalThis.Audio,AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,disabled=false,initialVolumes}={}){
 if(disabled||typeof AudioClass!=='function')return {
  unlock(){},intro(){},scene(){},setVolumes(){},prepare(){return null;},prepareIntro(){return null;},effect(){},
  snapshot(){return {enabled:false,disabled:Boolean(disabled)}}
 };
 let unlocked=false,key=null,current=null,currentAudio=null;
 let volumes=normalizeAudioSettings(initialVolumes);
 const musicVolume=name=>.32*volumes[name==='menu'?'menuMusic':'gameMusic']/100;
 let introRequested=false,introStarted=false;
 // The supplied 3.387s WAV is separate from collision voice pools.
 const introClip=new AudioClass(INTRO_SOUND);
 introClip.preload='auto';introClip.volume=.66*volumes.menuEffects/100;introClip.load();
 const tracks=new Map(),sfxPools=new Map(),lastPlayed=new Map();
 const synth=createSynthSoundscape({ContextClass:AudioContextClass});
 // Preload each small SFX once. Crucially, no HTMLAudioElement is created in
 // a collision/frame callback; a bounded number of decoded voices is reused.
 for(const [name,src] of Object.entries(SFX)){
   const pool=[];
   for(let i=0;i<VOICE_COUNTS[name];i++){
     const clip=new AudioClass(src);
     clip.preload='auto';
     let fallbackAttempted=false;
     clip.addEventListener('error',()=>{
       if(fallbackAttempted||!FALLBACKS[name])return;
       fallbackAttempted=true;
       clip.src=FALLBACKS[name];
       clip.load();
     });
     clip.load();
     pool.push(clip);
   }
   sfxPools.set(name,pool);
 }
 function tryIntro(){
   if(!introRequested||introStarted)return;
   try{
     const promise=introClip.play();
     if(promise?.then)promise.then(()=>{introStarted=true;}).catch(()=>{});
     else introStarted=true;
   }catch{}
 }
 function intro(){
   if(introStarted)return;
   introRequested=true;
   // Attempt synced autoplay; if blocked, retry only on a gesture during
   // the splash. Never play a delayed storm sound over the main menu.
   tryIntro();
 }
 function prepare(name){
   if(!BUNDLED_MUSIC.has(name))return null;
   const cached=tracks.get(name);
   if(cached)return cached;
   const clip=new AudioClass();
   clip.loop=true;clip.volume=musicVolume(name);clip.preload='auto';
   clip.src=ROOT+'music/'+TRACKS[name].local;
   clip.addEventListener('error',()=>{});
   clip.load();
   tracks.set(name,clip);
   for(const [other,old] of tracks){
     if(tracks.size<=2)break;
     if(other===name||other===key)continue;
     old.pause();old.removeAttribute('src');old.load();tracks.delete(other);
   }
   return clip;
 }
 function tryMusic(){
   // An intro that actually played establishes autoplay permission too.
   // Without permission, keep the soundtrack queued until a user gesture.
   if((!unlocked&&!introStarted)||!currentAudio)return;
   const promise=currentAudio.play();
   promise?.catch?.(()=>{});
 }
 function scene(screen,opponentId){
   if(screen!=='splash'&&introRequested){
     introRequested=false;
     introClip.pause();
   }
   const next=musicKeyForScene(screen,opponentId);
   if(key===next)return;
   // HTMLMediaElement has no stop(): pause AND rewind the previous track.
   // Changing the scene never leaves music muted but playing in the background.
   // Pause/Resume keeps the same key, so the opponent theme remains uninterrupted.
   if(currentAudio){
     currentAudio.pause();
     try{currentAudio.currentTime=0;}catch{}
   }
   synth.scene(null);
   key=next;current=next?TRACKS[next]:null;
   currentAudio=next?prepare(next):null;
   if(next==='menu'&&currentAudio){
     // Every return from a match must restart Legacy at 0:00.
     try{currentAudio.currentTime=0;}catch{}
   }
   tryMusic();
 }
 function setVolumes(value){
   volumes=normalizeAudioSettings(value);
   introClip.volume=.66*volumes.menuEffects/100;
   for(const [name,clip] of tracks)clip.volume=musicVolume(name);
 }
 function unlock(){
   if(unlocked)return;
   unlocked=true;
   synth.unlock();
   tryIntro();
   tryMusic();
 }
 function effect(name,volume=1){
   if(!unlocked)return;
   const category=name==='click'||name==='back'?'menuEffects':'gameEffects';
   const adjusted=Math.max(0,Math.min(1,volume))*volumes[category]/100;
   if(adjusted<=0)return;
   if(synth.effect(name,adjusted))return;
   const pool=sfxPools.get(name);
   if(!pool)return;
   const now=performance.now(),prior=lastPlayed.get(name)??-Infinity;
   if(now-prior<(name==='rail'?50:35))return;
   // Drop only excess simultaneous impacts; never allocate another decoder.
   const clip=pool.find(voice=>voice.paused||voice.ended);
   if(!clip)return;
   lastPlayed.set(name,now);
   clip.volume=Math.max(0,Math.min(1,adjusted*.55));
   try{clip.currentTime=0;}catch{}
   try{clip.play()?.catch?.(()=>{});}catch{}
 }
 prepare('menu');
 return {scene,prepare,prepareIntro:()=>introClip,unlock,intro,effect,setVolumes,snapshot:()=>({
   unlocked,key,track:current?.title??null,volumes:{...volumes},
   buffered:[...tracks.keys()],readyState:currentAudio?.readyState??0,
   voices:[...sfxPools.values()].reduce((sum,pool)=>sum+pool.length,0),
   enabled:true,
   synthesized:synth.snapshot()
 })};
}
