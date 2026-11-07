import {cloudflareConfiguration,iceConfiguration} from './ice-config.js?v=online-20261101-3';
import {playerAuth} from './player-auth.js?v=online-20261101-3';
import {OnlineDirectory} from './online-directory.js';
import {lobbyMarkup,renderOnlineSections} from './online-ui.js';
import {BrowserHost} from './browser-host.js?v=table-screen-time-20261103-1';
import {Match,clamp,magnitude} from './physics.js?v=stal-defense-c-20261105';
import {TACTIC_IDS} from './ai-tactics.js?v=stal-defense-c-20261105';
import {SPRITE_URLS,SPRITE_ART,sortSpriteActors} from './synthpuck-sprite-art.js?v=collider-painter-20261106';
import {HAL_STAGE_ID,HAL_EYE_CALIBRATION,halEyeTarget} from './hal-eye.js';
import {moveTargetWithMouse,moveTargetWithTouch} from './controls.js';
import {ROSTER,STAT_NAMES,getCharacter,matchConfiguration} from './roster.js';
import {TABLE_CALIBRATION,createTableProjection} from './table-projection.js';
import {TABLE_LAYER_FILES,TABLE_NEON_COLORS,processTableImage} from './table-layer-art.js?v=tour-match-front-colour-20261106';
import {paintTableScreen,preloadTableSplashImages,playerScoreLabel,TABLE_SCREEN_NATIVE_CORNERS,normalizeTableMaskWidth,TABLE_MASK_WIDTH_MIN,TABLE_MASK_WIDTH_MAX,TABLE_MASK_WIDTH_DEFAULT} from './table-screen.js?v=mask-default-10-20261106';
import {beginGoalPuckExit,sampleGoalPuckExit} from './goal-puck-exit.js?v=goal-exit-20261106';
import {mamoudaNeonOpacity} from './mamouda-neon.js';
import {GREEN_DEBUG_OVERLAY} from './green-debug-overlay.js';
import {DEFAULT_PADDLE_OFFSETS,normalizePaddleOffset,offsetSpriteY,OFFSET_MIN,OFFSET_MAX} from './paddle-offset.js?v=collider-centred-20261106';
import {ARCADE_ORDER,nextArcadeLevel,stageIdFor} from './campaign.js';
import {campaignExecutionConfig} from './campaign-execution.js';
import {CAMPAIGN_STORIES,TOWER_PLAYER_SKILLS,getCampaignPath,nextCampaignLevel,readCampaignSave,writeCampaignSave,recordCampaignWin} from './campaign-story.js?v=character-campaign-alpha2';
import {renderVersus,renderStory,renderEnding} from './arcade-ui.js?v=character-campaign-alpha2';
import {PHONE_LINES,ELEVATOR_AFTER_WIN,ELEVATOR_ON_TRAVEL,FLOOR_OPPONENTS,elevatorVisibleDoor,elevatorRideRequired,renderPhoneLine,renderCinematicLine,renderElevator} from './elevator-scene.js?v=elevator-art-yellow-20261106';
import {mountElevatorButtonLights} from './elevator-button-lights.js?v=yellow-centered-plus7-plus9-20261107';
import {SPLASH_FILES,randomReadyDelayMs,chooseRoundSplash,GO_DURATION_MS,GOAL_DURATION_MS,RESULT_DURATION_MS} from './round-presentation.js?v=table-screen-time-20261103-1';
import {createAudioDirector,classifyImpact,TRACKS,getSoundCredits,MATCH_SFX_URLS} from './audio.js?v=volume-controls-20261106-1';
import {AUDIO_VOLUME_FIELDS,DEFAULT_AUDIO_SETTINGS,normalizeAudioSettings,readLocalAudioSettings,writeLocalAudioSettings} from './audio-settings.js';
import {escapeHtml} from './player-profile.js';
import {loadResources,waitForImage,waitForAudio,fetchEntire} from './asset-loading.js?v=asset-loading-20261103-1';
import {renderCreditsPage} from './credits.js?v=credits-20261103-1';
import {versionLabel,renderChangelogPage} from './release-info.js?v=alpha-010-20261103-6';
import {selectRenderQuality} from './render-quality.js?v=perf-laptop-20261102-1';
import {createPerformanceCounter,createPerformanceOverlay} from './performance-monitor.js?v=perf-laptop-20261102-1';
import {tickFrameInput} from './frame-input.js?v=table-screen-time-20261103-1';

const NATIVE={w:1672,h:941};
// Stage-normalised portrait height. Every real opponent stays behind the far rail.
const OPPONENT_HEIGHT_NATIVE=240;
const $=id=>document.getElementById(id);
const panel=$('panel'),backdrop=$('backdrop'),arena=$('arena');
const bg=backdrop.getContext('2d',{alpha:false});
const ctx=arena.getContext('2d');
const hud=$('hud'),touchBar=$('touchBar');
$('versionLabel').textContent=versionLabel();
const announcement=document.createElement('div');
announcement.id='roundAnnouncement';announcement.hidden=true;
announcement.innerHTML='<img id="roundAnnouncementImage" alt="" draggable="false"/>';
$('app').appendChild(announcement);
const announcementImage=announcement.querySelector('img');
const duelDoors=document.createElement('div');
duelDoors.id='duelDoors';duelDoors.hidden=true;duelDoors.dataset.state='closed';
duelDoors.innerHTML='<div class="duel-shutter duel-shutter-left"></div><div class="duel-shutter duel-shutter-right"></div>';
$('app').appendChild(duelDoors);
let doorGeneration=0;
// Vertical doors complete before the first Ready/GO announcement.
const DOOR_OPEN_MS=3000,DOOR_CLOSE_MS=1000;
const VS_MIN_VISIBLE_MS=4000,VS_FADE_MS=620;
function cancelDuelDoors(){doorGeneration++;duelDoors.hidden=true;}
function animateDuelDoors(from,to,after){
 const token=++doorGeneration;
 duelDoors.hidden=false;duelDoors.dataset.state=from;
 const leaf=duelDoors.querySelector('.duel-shutter-left');
 let finished=false,fallback=null;
 const complete=()=>{
  if(finished)return;
  finished=true;leaf.removeEventListener('transitionend',onEnd);
  clearTimeout(fallback);
  if(token!==doorGeneration)return;
  // 'Players ready?' or match results start ONLY after the doors finish.
  duelDoors.hidden=true;
  after();
 };
 const onEnd=event=>{
  if(event.target===leaf&&event.propertyName==='transform')complete();
 };
 leaf.addEventListener('transitionend',onEnd);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(token!==doorGeneration){complete();return;}
  duelDoors.dataset.state=to;
  // Browser-background fallback when transitionend is suppressed.
  fallback=setTimeout(complete,(to==='closed'?DOOR_CLOSE_MS:DOOR_OPEN_MS)+120);
 }));
}
function openDuelDoors(after){animateDuelDoors('closed','open',after);}
function closeDuelDoors(after){animateDuelDoors('open','closed',after);}
let roundAnnouncement=null;
let goalExitAnimation=null;
function clearRoundAnnouncement(){
 roundAnnouncement=null;announcement.hidden=true;
 announcement.removeAttribute('data-kind');
 announcementImage.removeAttribute('src');
}
function presentRoundSplash(kind,duration,then=null){
 if(!(kind in SPLASH_FILES))throw new Error('Unknown round splash: '+kind);
 roundAnnouncement={kind,until:performance.now()+duration,then};
 // Six distinct sound signatures; Web Audio obeys browser gesture unlock.
 sound.effect(kind==='smash'?'goalSmash':kind,kind==='ready'?.5:.85);
 announcement.dataset.kind=kind;
 announcementImage.src=SPLASH_FILES[kind];
 announcementImage.alt=kind==='ready'?'Players ready?':kind==='win'?'YOU WIN':kind==='lose'?'YOU LOSE':kind.toUpperCase();
 announcement.hidden=false;
}
function updateRoundAnnouncement(now){
 if(!roundAnnouncement||now<roundAnnouncement.until)return;
 const callback=roundAnnouncement.then;
 clearRoundAnnouncement();
 if(callback)callback();
}

// New four-layer table: every PNG remains full-resolution and untouched on disk.
// STAL keeps its approved background; all seven levels share the table geometry.
const STAL_LAYER_URLS=Object.freeze({
 background:'./assets/stages/stal-background.avif'
});
const images={stages:{},characters:{},sprites:{},stalLayers:{background:null},
 tableLayers:{play:null,tour:null,goal:null,front:null},mamoudaNeon:null,halEye:null};
const tintedTableCache=Object.create(null);
function stageTableArt(stage){
 if(!Object.hasOwn(TABLE_NEON_COLORS,stage))return null;
 if(Object.values(images.tableLayers).some(img=>!img?.complete||img.naturalWidth!==NATIVE.w||img.naturalHeight!==NATIVE.h))return null;
 if(!tintedTableCache[stage]){
  tintedTableCache[stage]=Object.fromEntries(
   Object.entries(images.tableLayers).map(([kind,source])=>[kind,processTableImage(source,kind,stage)])
  );
 }
 return tintedTableCache[stage];
}
let renderedMamoudaNeonOpacity=null;
const stalLayersReady=()=>Boolean(images.stalLayers.background?.complete&&images.stalLayers.background.naturalWidth===NATIVE.w&&images.stalLayers.background.naturalHeight===NATIVE.h);
preloadTableSplashImages(SPLASH_FILES);
let tableLitAt=0;
let halGaze={x:HAL_EYE_CALIBRATION.x,y:HAL_EYE_CALIBRATION.y};
let network=null, networkSlot=0, networkTimer=null;
let mode='arcade',level=0,selected='mute',opponent=ROSTER[0];
let heroId='player';
let campaignSave=readCampaignSave(globalThis.localStorage);
// The illustrated elevator is narrative-only: it cannot move or alter the puck.
let elevatorGeneration=0,elevatorTimer=null,elevatorInitialVisit=false,cinematicSkip=null;
const elevatorWhiteout=document.createElement('div');
elevatorWhiteout.id='elevatorWhiteout';elevatorWhiteout.hidden=true;
$('app').appendChild(elevatorWhiteout);
function clearElevatorSequence(){
 elevatorGeneration++;clearTimeout(elevatorTimer);elevatorTimer=null;cinematicSkip=null;
 elevatorWhiteout.hidden=true;elevatorWhiteout.className='';
 if(loadingRetry===startFirstArcadeFight)loadingRetry=null;
}
function showPhoneSequence(){
 clearElevatorSequence();
 const token=elevatorGeneration;
 active=false;touchId=null;hud.hidden=true;touchBar.hidden=true;
 let index=0;
 const display=()=>{
  if(token!==elevatorGeneration||screen!=='phone')return;
  panel.innerHTML=renderPhoneLine(index);
  const duration=[2200,2100,6200,1650,1900,1250,2200][index];
  elevatorTimer=setTimeout(()=>{
   if(token!==elevatorGeneration||screen!=='phone')return;
   if(++index===PHONE_LINES.length)showElevator(1,true);
   else display();
  },duration);
 };
 setScreen('phone');display();
}
// Story interludes use exactly the same black backdrop and skip control as the opening call.
function showBlackDialogue(lines,onDone){
 if(!lines.length){onDone();return;}
 clearElevatorSequence();
 const token=elevatorGeneration;
 active=false;touchId=null;hud.hidden=true;touchBar.hidden=true;
 let index=0;
 cinematicSkip=()=>{
  if(token!==elevatorGeneration||screen!=='phone')return;
  clearElevatorSequence();onDone();
 };
 const display=()=>{
  if(token!==elevatorGeneration||screen!=='phone')return;
  panel.innerHTML=renderCinematicLine(lines[index]);
  elevatorTimer=setTimeout(()=>{
   if(token!==elevatorGeneration||screen!=='phone')return;
   if(++index>=lines.length){clearElevatorSequence();onDone();}
   else display();
  },Math.min(5200,Math.max(2600,lines[index].length*70)));
 };
 setScreen('phone');display();
}
function showElevator(floor,firstVisit=false){
 clearElevatorSequence();
 elevatorInitialVisit=firstVisit;
 active=false;touchId=null;hud.hidden=true;touchBar.hidden=true;
 const lines=firstVisit?["Bon client au 8ème"]:[];
 setScreen('elevator');
 // Re-entering or resuming a campaign starts already facing CLOSED doors.
 // Never replay a synthetic open -> closed animation on entering the lift.
 panel.innerHTML=renderElevator({floor,doorNumber:elevatorVisibleDoor(floor,firstVisit),
  firstVisit,doorState:'closed',caption:lines[0]??''});
 mountElevatorButtonLights(panel.querySelector('.elevator-canvas'));
}
function startFirstArcadeFight(){
 clearElevatorSequence();
 level=0;opponent=getCharacter(FLOOR_OPPONENTS[0]);
 const stage=opponent.id;
 showLoading(matchLoadingTasks(stage,stage),
  ()=>startLoadedMatch(stage,true),startFirstArcadeFight);
}
function enterElevatorStage(buttonFloor){
 if(screen!=='elevator'||mode!=='arcade'||legacyArcade)return;
 const frame=panel.querySelector('.elevator-canvas');
 if(!frame||frame.dataset.phase!=='idle')return;
 const expected=elevatorInitialVisit?8:level+1;
 const message=frame.querySelector('.elevator-dialogue');
 if(buttonFloor!==expected){
  message.textContent=buttonFloor<expected?'Cet étage ne répond plus.':'Rien ne se passe...';
  return;
 }
 if(!elevatorInitialVisit&&ELEVATOR_ON_TRAVEL[expected]){
  showBlackDialogue([ELEVATOR_ON_TRAVEL[expected]],()=>startElevatorTravel(expected));
  return;
 }
 startElevatorTravel(expected);
}
function startElevatorTravel(buttonFloor){
 const expected=elevatorInitialVisit?8:level+1;
 if(buttonFloor!==expected||mode!=='arcade'||legacyArcade)return;
 const token=++elevatorGeneration;
 const first=elevatorInitialVisit;
 const previousFloor=first?1:level;
 const destination=expected;
 const visibleDoor=elevatorVisibleDoor(previousFloor,first);
 const needsRide=elevatorRideRequired(visibleDoor,destination);
 const stage=FLOOR_OPPONENTS[level];
 opponent=getCharacter(stage);
 const text=first?"Bon client au 8ème":'';
 // A travel line may have temporarily switched to the black cinematic screen.
 setScreen('elevator');
 panel.innerHTML=renderElevator({floor:previousFloor,doorNumber:visibleDoor,nextFloor:needsRide?destination:null,
  firstVisit:first,caption:text});
 const view=panel.querySelector('.elevator-canvas');
 mountElevatorButtonLights(view);
 view.dataset.phase='idle';
 const output=view.querySelector('.elevator-dialogue');
 const prepGeneration=++loadingSequence;
 loadingAbort?.abort();loadingAbort=new AbortController();
 // The saved campaign already displays its next door. Do not send the lift
 // up to the same floor again; only wait for assets, then open those doors.
 let loaded=false,arrived=!needsRide;
 let opened=false;
 const check=()=>{
  if(token!==elevatorGeneration||screen!=='elevator'||!loaded||!arrived||opened)return;
  opened=true;
  view.dataset.phase='arrived';
  view.dataset.doorState='open';
  // The open doorway exposes the FULL white layer, not a rendered arena.
  elevatorTimer=setTimeout(()=>{
   if(token!==elevatorGeneration||screen!=='elevator')return;
   if(first)output.textContent="Eh mais t'es qui toi?";
   else output.textContent='';
   view.dataset.phase='walking';
   elevatorTimer=setTimeout(()=>{
    if(token!==elevatorGeneration||screen!=='elevator')return;
    elevatorWhiteout.hidden=false;elevatorWhiteout.className='';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
     if(token!==elevatorGeneration)return;
     elevatorWhiteout.classList.add('show');
    }));
    elevatorTimer=setTimeout(()=>{
     if(token!==elevatorGeneration||screen!=='elevator')return;
     startLoadedMatch(stage,true);
     elevatorWhiteout.className='reveal';
     elevatorTimer=setTimeout(()=>{
      if(token!==elevatorGeneration)return;
      elevatorWhiteout.hidden=true;elevatorWhiteout.className='';
     },900);
    },920);
   },1250);
  },1250);
 };
 // The introductory 01 → 08 journey still moves. A resumed campaign with
 // door 05 already visible opens 05 directly, with no fake upward trip.
 if(needsRide){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(token===elevatorGeneration&&screen==='elevator')view.dataset.phase='moving';
  }));
  elevatorTimer=setTimeout(()=>{
   if(token!==elevatorGeneration||screen!=='elevator')return;
   arrived=true;view.dataset.phase='arrived';view.dataset.currentFloor=String(destination);
   view.dataset.visibleDoor=String(destination).padStart(2,'0');
   check();
  },1480);
 }else{
  view.dataset.currentFloor=String(destination);
  view.dataset.visibleDoor=String(destination).padStart(2,'0');
 }
 // Preload the real match while the elevator appears to travel. The camera
 // never cuts to a partly loaded arena, and game physics remain paused.
 void loadResources(matchLoadingTasks(stage,stage),pct=>{
  if(token!==elevatorGeneration||screen!=='elevator')return;
  loadingPercent=pct;
 },loadingAbort.signal).then(()=>{
  if(token!==elevatorGeneration||screen!=='elevator'||prepGeneration!==loadingSequence)return;
  loadingAbort=null;loaded=true;check();
 }).catch(error=>{
  if(token!==elevatorGeneration||screen!=='elevator')return;
  loadingAbort=null;
  console.warn('Chargement depuis l’ascenseur :',error);
  view.dataset.phase='idle';
  output.textContent='Chargement impossible. Réessaie sur le bouton '+String(expected).padStart(2,'0')+'.';
 });
}
let currentStage='mamouda',screen='loading',match=null,active=false;
let loadingPercent=0,loadingSequence=0,loadingAbort=null,loadingRetry=null;
// Green collision/rail guides are only for manual calibration, not gameplay.
// The optional ?debugPhysics=1 URL forces diagnostics for developers.
const forcePhysicsGuides=new URLSearchParams(location.search).get('debugPhysics')==='1';
const physicsGuidesVisible=()=>forcePhysicsGuides||screen==='calibration';
let lastTime=0,accumulator=0,mouseSensitivity=1,touchId=null;
let lastTouch={x:0,y:0},inputMode='normal',pointerRequested=false;
let layout={scale:1,x:0,y:0,cssW:1,cssH:1,dpr:1};
let pausedReason='',showFarOpponent=false,optionsReturnToPause=false;
// ?audio=off isolates audio overhead for a reproducible same-gameplay comparison.
const qualityParams=new URLSearchParams(location.search);
// Diagnostic compatibility keeps existing extensive physics/browser checks unchanged.
// Normal players always enter the new character campaign flow.
const legacyArcade=qualityParams.get('legacyArcade')==='1'&&qualityParams.get('skipSplash')==='1';
const audioStorage=(()=>{try{return globalThis.localStorage;}catch{return null;}})();
 let activeAudioUserId=null,lastAudioProfile=null;
 let audioSettings=readLocalAudioSettings(audioStorage);
 const sound=createAudioDirector({disabled:qualityParams.get('audio')==='off',initialVolumes:audioSettings});
 playerAuth.subscribe(auth=>{
   const userId=auth.user?.id??null;
   if(userId!==activeAudioUserId){
     activeAudioUserId=userId;
     lastAudioProfile=null;
     audioSettings=readLocalAudioSettings(audioStorage,userId);
     sound.setVolumes(audioSettings);
   }
   if(auth.profile&&auth.profile!==lastAudioProfile){
     lastAudioProfile=auth.profile;
     audioSettings=normalizeAudioSettings(auth.profile.audioSettings);
     sound.setVolumes(audioSettings);
     writeLocalAudioSettings(audioStorage,userId,audioSettings);
     if(screen==='options'){
       for(const field of AUDIO_VOLUME_FIELDS){
         const slider=$('volume-'+field.key),output=$('volume-label-'+field.key);
         if(slider)slider.value=String(audioSettings[field.key]);
         if(output)output.textContent=audioSettings[field.key]+' %';
       }
     }
   }
 });
const renderQuality=selectRenderQuality({requested:qualityParams.get('quality')??'auto',hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:navigator.deviceMemory});
const frameCounter=qualityParams.get('perf')==='1'?createPerformanceCounter():null;
const renderPerformance=frameCounter?createPerformanceOverlay(document):null;
const heardAudioEvents=new WeakSet();
function playMatchAudio(){
 if(!match||mode==='multi')return;
 // Read backwards until the most recent processed event instead of rescanning
 // up to 100 historical contacts every animation frame.
 const fresh=[];
 for(let i=match.events.length-1;i>=0;i--){
  const event=match.events[i];
  if(heardAudioEvents.has(event))break;
  heardAudioEvents.add(event);
  fresh.push(event);
 }
 for(let i=fresh.length-1;i>=0;i--){
  const hit=classifyImpact(fresh[i]);
  if(!hit)continue;
  if(hit.sound==='smash'){sound.effect('smash',Math.max(.4,hit.intensity));}
  else sound.effect(hit.sound,hit.intensity);
 }
}

const paddleOffsets={...DEFAULT_PADDLE_OFFSETS};
// One-time migration: the old +12px shifts misaligned the painted disks
// while the physical colliders stayed centred. Reset legacy calibration once;
// all manual adjustments made after this correction still persist.
try{
 const schema='collider-centred-20261106';
 if(localStorage.getItem('synthpuck.spriteOffsetsVersion')!==schema){
  for(const type of ['player','ai'])localStorage.removeItem('synthpuck.spriteOffset.'+type);
  localStorage.setItem('synthpuck.spriteOffsetsVersion',schema);
 }
}catch{}
for(const type of ['player','ai']){
 try{
  const stored=localStorage.getItem('synthpuck.spriteOffset.'+type);
  if(stored!==null)paddleOffsets[type]=normalizePaddleOffset(stored,DEFAULT_PADDLE_OFFSETS[type]);
 }catch{}
}
// The visually approved width is +10 native pixels on EACH side.
// Preserve custom calibrations. Upgrade only legacy default 0px once.
let tableMaskWidth=TABLE_MASK_WIDTH_DEFAULT;
try{
 const storageKey='synthpuck.tableMaskWidth';
 const versionKey='synthpuck.tableMaskWidthDefaultVersion';
 const saved=localStorage.getItem(storageKey);
 if(saved!==null)tableMaskWidth=normalizeTableMaskWidth(saved,TABLE_MASK_WIDTH_DEFAULT);
 if(localStorage.getItem(versionKey)!=='plus10'){
  if(saved===null||tableMaskWidth===0){
   tableMaskWidth=TABLE_MASK_WIDTH_DEFAULT;
   localStorage.setItem(storageKey,String(tableMaskWidth));
  }
  localStorage.setItem(versionKey,'plus10');
 }
}catch{}
function setTableMaskWidth(value){
 tableMaskWidth=normalizeTableMaskWidth(value,tableMaskWidth);
 try{localStorage.setItem('synthpuck.tableMaskWidth',String(tableMaskWidth));}catch{}
}
const online=new OnlineDirectory(()=>renderOnlineSections(online,!!playerAuth.snapshot().user));
online.onAccepted=()=>{if(screen==='lobby'&&$('lobbyStatus'))$('lobbyStatus').textContent='Invitation acceptée : connexion au duel en cours…';};
try{const stored=Number(localStorage.getItem('synthpuck.mouseSensitivity'));if(stored>=.4&&stored<=2.4)mouseSensitivity=stored;}catch{}
const isTouch=()=>navigator.maxTouchPoints>0 || matchMedia('(pointer:coarse)').matches;

const statBar=(value,accent)=>`<div class="meter" style="--accent:${accent}">${Array.from({length:5},(_,i)=>`<i class="${i<value?'on':''}"></i>`).join('')}</div>`;
const statsHtml=c=>`<div class="stats" style="--accent:${c.accent}">${STAT_NAMES.map((title,i)=>`<div class="stat-line"><label>${title}</label>${statBar(c.stats[i],c.accent)}</div>`).join('')}</div>`;
const avatar=c=>`<img loading="eager" src="./assets/characters/${c.id}.webp?v=fighters-hd-20261031" alt="Portrait de ${c.name}"/>`;
const btn=(label,action,primary=false)=>`<button class="btn ${primary?'primary':''}" data-action="${action}" type="button">${label}</button>`;
const statusText=()=>{
  if(!match)return 'PREMIER À 7';
  if(match.state==='time-transition')return 'TIME! · '+(match.timeTransition?.reason==='return'?'7':'10')+' S';
  if(match.state==='ready')return match.server===-1?'À TOI D’ENGAGER':'ENGAGEMENT ADVERSE';
  if(match.awaitingServe){
    const foul=match.events.findLast(e=>e.type==='timeout');
    if(foul && match.time-foul.time<1.2)
      return foul.reason==='return'?'FAUTE - 7 SECONDES':'FAUTE - 10 SECONDES';
    if(match.server===0)return 'PALET AU CENTRE';
    const left=Math.max(0,Math.ceil(match.cfg.serveLimit-(match.time-match.serveStartedAt)));
    return (match.server===-1?'TON SERVICE · ':'SERVICE IA · ')+left+' S';
  }
  if(match.possessionSide && match.possessionSince!==null){
    const left=Math.max(0,Math.ceil(match.cfg.returnLimit-(match.time-match.possessionSince)));
    return 'RENVOI · '+left+' S';
  }
  return 'PREMIER À 7';
};
function setScreen(name,compact=false){
 if(name!=='playing')clearRoundAnnouncement();
 screen=name;
 if(name!=='playing'&&name!=='menu')sound.scene(name,opponent.id);
 panel.className=compact?'compact':'';
 panel.removeAttribute('hidden');panel.setAttribute('data-screen',name);
 $('fighterName').hidden=true;
}

// Black screen remains visible until every selected asset is decoded/downloaded.
function showLoading(tasks,onReady,onRetry){
 const generation=++loadingSequence;
 loadingAbort?.abort();
 loadingAbort=new AbortController();
 loadingRetry=onRetry;
 active=false;touchId=null;hud.hidden=true;touchBar.hidden=true;
 setScreen('loading');
 panel.innerHTML=`<div class="asset-loading-footer" role="status" aria-live="polite" aria-atomic="true">
  <img class="asset-loading-puck" src="./assets/sprites/puck.webp" alt="" aria-hidden="true" draggable="false">
  <span class="asset-loading-label">Chargement <output id="assetLoadingPercent">0%</output></span></div>`;
 const output=$('assetLoadingPercent');
 const update=pct=>{
  if(generation!==loadingSequence||screen!=='loading')return;
  loadingPercent=pct;
  output.textContent=pct+'%';
 };
 const started=performance.now();
 void loadResources(tasks,update,loadingAbort.signal).then(()=>{
  if(generation!==loadingSequence||screen!=='loading')return;
  // Even on a warm cache show the loader for at least one painted frame.
  const elapsed=performance.now()-started;
  setTimeout(()=>{
   if(generation!==loadingSequence||screen!=='loading')return;
   loadingAbort=null;loadingRetry=null;onReady();
  },Math.max(0,220-elapsed));
 }).catch(error=>{
  if(generation!==loadingSequence||screen!=='loading')return;
  loadingAbort?.abort();loadingAbort=null;
  console.warn('Chargement SYNTHPUCK :',error);
  panel.innerHTML=`<div class="asset-loading-error"><p>Chargement interrompu</p>
    <p class="asset-loading-detail"></p>
    <button type="button" class="btn" data-action="retry-loading">RÉESSAYER</button>
    <button type="button" class="btn" data-action="menu">RETOUR AU MENU</button></div>`;
  panel.querySelector('.asset-loading-detail').textContent=error.message;
 });
}
function imageTask(img){
 return (progress,signal)=>waitForImage(img,signal).then(()=>progress(1));
}
function urlImageTask(src){
 const img=new Image();img.decoding='async';img.src=src;
 return imageTask(img);
}
const STUDIO_LOGO_URL='./assets/ui/abundance-games-studios.svg?v=user-approved-orange-sun-20261103-1';
const STUDIO_WIND_URL='./assets/audio/sfx/dark-storm-wind.wav';
function startStudioLoading(){
 const tasks=[
  (progress,signal)=>fetchEntire(STUDIO_WIND_URL,progress,signal).then(()=>waitForAudio(sound.prepareIntro(),signal)),
  urlImageTask(STUDIO_LOGO_URL),
  urlImageTask('./assets/ui/menu-hud.avif'),
  urlImageTask('./assets/ui/menu-hd.avif'),
  // Legacy must already be fully downloaded before we reveal the main menu.
  ...(qualityParams.get('audio')==='off'?[]:[
   (progress,signal)=>fetchEntire('./assets/audio/music/legacy.mp3',progress,signal)
    .then(()=>waitForAudio(sound.prepare('menu'),signal))
  ])
 ];
 showLoading(tasks,()=>{
  showSplash();
  setTimeout(closeSplash,STUDIO_FADE_IN_MS);
 },startStudioLoading);
}
function matchLoadingTasks(stage,id){
 const tasks=[];
 const addImage=img=>{if(img)tasks.push(imageTask(img));};
 addImage(images.stages[stage]);
 if(stage==='mamouda')addImage(images.mamoudaNeon);
 // Wait for all four full-resolution table PNG layers before revealing the arena.
 if(Object.hasOwn(TABLE_NEON_COLORS,stage)){
  for(const img of Object.values(images.tableLayers))addImage(img);
 }
 if(id!=='2502')addImage(images.characters[id]);
 else addImage(images.halEye);
 for(const img of Object.values(images.sprites))addImage(img);
 for(const src of Object.values(SPLASH_FILES))tasks.push(urlImageTask(src));
 if(qualityParams.get('audio')!=='off'){
  for(const src of MATCH_SFX_URLS)tasks.push((progress,signal)=>fetchEntire(src,progress,signal));
  if(TRACKS[id]?.status!=='planned'){
   const src='./assets/audio/music/'+TRACKS[id].local;
   // The actual opponent recording must be fully available before the duel.
   tasks.push((progress,signal)=>fetchEntire(src,progress,signal).then(()=>waitForAudio(sound.prepare(id),signal)));
  }
 }
 return tasks;
}

// Match the opening fade to the exact 3.387-second Mixkit storm WAV.
// The picture fades out, then stays fully black for 1.5 s before the menu.
const STUDIO_FADE_IN_MS=3387,STUDIO_FADE_OUT_MS=800,STUDIO_BLACK_HOLD_MS=1500;
function showSplash(){
  setScreen('splash');hud.hidden=true;touchBar.hidden=true;
  panel.style.setProperty('--studio-fade-in',STUDIO_FADE_IN_MS+'ms');
  panel.innerHTML=`<img class="studio-image" src="${STUDIO_LOGO_URL}" alt="ABUNDANCE GAMES STUDIOS : montagnes blanches sur fond noir"/>`;
  sound.intro();
}
function closeSplash(){
  if(screen!=='splash')return;
  panel.classList.add('splash-exit');
  setTimeout(()=>{
    if(screen!=='splash')return;
    panel.classList.add('splash-blackout');
    // Legacy is already preloaded at startup; keep it ready through the black.
    sound.prepare('menu');
    setTimeout(()=>{if(screen==='splash')showMenu();},STUDIO_BLACK_HOLD_MS);
  },STUDIO_FADE_OUT_MS);
}
function showMenu(){
  optionsReturnToPause=false;
  clearElevatorSequence();
  ++loadingSequence;loadingAbort?.abort();loadingAbort=null;cancelDuelDoors();
  stopNetwork();online.stop();if($('connectionDebug'))$('connectionDebug').hidden=true;
  active=false;touchId=null;mode='arcade';currentStage='mamouda';setBackground(currentStage,false);
  setScreen('menu');hud.hidden=true;touchBar.hidden=true;$('fighterName').hidden=true;
  panel.innerHTML=`<div class="menu-art"><div class="menu-image" role="img" aria-label="SYNTHPUCK, Strike Spin Survive, menu illustré néon BD"></div><nav class="menu-main-buttons" aria-label="Modes de jeu">${btn('ARCADE','arcade',true)}${btn('ENTRAÎNEMENT','training')}${btn('ONLINE','online')}</nav><nav class="menu-secondary-buttons" aria-label="Compte et réglages">${btn('OPTIONS','options')}${btn('DÉCONNEXION','logout')}</nav></div>`;
  // Start Legacy at the instant the menu DOM becomes visible, not in the blackout.
  sound.scene('menu',opponent.id);
}
function showChangelog(){
  if(screen!=='menu')return;
  active=false;
  setScreen('changelog');hud.hidden=true;touchBar.hidden=true;
  panel.innerHTML=renderChangelogPage(btn('← MENU','menu'));
}
function showCredits(){
  active=false;
  setScreen('credits');hud.hidden=true;touchBar.hidden=true;
  panel.innerHTML=renderCreditsPage(TRACKS,getSoundCredits(),btn('← MENU','menu'));
}
function buildPauseTools(){
 if(!match||mode==='multi')return '';
 const levels=mode==='arcade'&&legacyArcade?`<div class="pause-levels"><p class="eyebrow">CHOISIR UN NIVEAU · NOUVEAU DUEL</p><div class="pause-level-grid" role="group" aria-label="Niveaux Arcade">${ROSTER.map((fighter,index)=>`<button type="button" class="pause-level ${index===level?'current':''}" data-pause-level="${index}" aria-label="Niveau ${String(index+1).padStart(2,'0')} : ${fighter.name}" ${index===level?'aria-current="step"':''}><span>${String(index+1).padStart(2,'0')}</span><strong>${fighter.name}</strong></button>`).join('')}</div></div>`:'';
 return `<section class="pause-advanced-options"><h3>RÉGLAGES DU DUEL</h3><div class="mask-width-row"><label for="table-mask-width">LARGEUR DU MASQUE BLANC <output id="table-mask-width-label">${tableMaskWidth>0?'+':''}${tableMaskWidth} px / côté</output></label><div class="mask-width-inputs"><input id="table-mask-width" data-table-mask-width type="range" min="${TABLE_MASK_WIDTH_MIN}" max="${TABLE_MASK_WIDTH_MAX}" step="1" value="${tableMaskWidth}" aria-label="Largeur horizontale du masque blanc"/><input id="table-mask-width-number" data-table-mask-width type="number" min="${TABLE_MASK_WIDTH_MIN}" max="${TABLE_MASK_WIDTH_MAX}" step="1" value="${tableMaskWidth}" aria-label="Largeur du masque blanc en pixels par côté"/></div><p class="sub">Aperçu immédiat. Physique inchangée.</p>${btn('RÉINITIALISER LA LARGEUR','mask-width-reset')}</div>${btn('CALER LES RAQUETTES','calibration')}${btn('RECOMMENCER LE DUEL','retry')}${levels}</section>`;
}
function showOptions(message='Régle tes commandes et tes volumes avant de jouer.'){
   optionsReturnToPause=screen==='pause'||screen==='pause-confirm'||(screen==='options'&&optionsReturnToPause);
   setScreen('options');hud.hidden=true;touchBar.hidden=true;
   const volumes=AUDIO_VOLUME_FIELDS.map(({key,label})=>
     '<div class="audio-volume-row"><label for="volume-'+key+'"><span>'+label+'</span><output id="volume-label-'+key+'">'+audioSettings[key]+' %</output></label><input id="volume-'+key+'" type="range" min="0" max="100" step="1" value="'+audioSettings[key]+'" data-audio-volume="'+key+'" aria-label="'+label+'"></div>'
   ).join('');
   const profileNotice=playerAuth.snapshot().user
     ?'Joueur connecté : ENREGISTRER synchronise ces volumes avec ton profil pour les retrouver sur tes autres appareils.'
     :'Invité : les volumes sont conservés sur cet appareil.';
   const pauseTools=optionsReturnToPause?buildPauseTools():'';
   panel.innerHTML='<div class="page options-page"><header class="page-head"><div><p class="eyebrow">SYNTHPUCK / PERSONNALISATION</p><h2>OPTIONS</h2></div>'+btn(optionsReturnToPause?'← PAUSE':'← MENU',optionsReturnToPause?'pause-back':'menu')+'</header><div class="online-panel"><h3>CONTRÔLES</h3><p class="sub">'+escapeHtml(message)+'</p><label class="account-field">Sensibilité de la souris <input id="sensitivityRange" type="range" min="0.4" max="2.4" step="0.1" value="'+mouseSensitivity+'"></label><p class="sub">Bouton gauche : impact rigide · bouton droit : amorti · gauche + droit : spin · Échap : pause. Pendant un match, ouvre Pause → Caler les raquettes pour les descendre au pixel près, sans déplacer les collisions.</p><p class="sub">Règles du temps palet : premier engagement au centre · 10 s pour servir après un but · 7 s pour renvoyer le palet dans le camp adverse. Dépassement : engagement adverse, aucun point.</p>'+pauseTools+'<div class="audio-settings"><h3>AUDIO</h3><p class="sub">Volume indépendant de 0 % (muet) à 100 %. Le réglage est appliqué immédiatement.</p>'+volumes+'<p class="sub audio-profile-notice">'+profileNotice+'</p></div>'+btn('ENREGISTRER','save-options',true)+'</div></div>';
 }
 function showCalibration(){
 if(!match||mode==='multi')return;
 active=false;
 setScreen('calibration',true);
 const field=(type,title)=>{
  const value=paddleOffsets[type];
  return `<div class="paddle-offset-row"><label for="paddle-offset-${type}">${title} <output id="offset-label-${type}">${value>0?'+':''}${value} px</output></label><div class="paddle-offset-inputs"><input id="paddle-offset-${type}" type="range" min="${OFFSET_MIN}" max="${OFFSET_MAX}" step="1" value="${value}" data-offset-type="${type}" aria-label="${title}, déplacement vertical"/><input id="offset-number-${type}" type="number" min="${OFFSET_MIN}" max="${OFFSET_MAX}" step="1" value="${value}" data-offset-type="${type}" aria-label="${title}, pixels exacts"/></div></div>`;
 };
 panel.innerHTML=`<div class="paddle-calibration-panel"><p class="eyebrow">CALAGE VISUEL · PIXELS NATIFS</p><h2>RAQUETTES</h2><p class="sub">Repères verts affichés seulement pendant le calage. Valeur positive = dessin plus bas. Réglage immédiat et sauvegardé.</p>${field('player','Raquette bleue')}${field('ai','Raquette adverse')}<div class="paddle-calibration-actions">${btn('RÉINITIALISER','calibration-reset')}${btn('RETOUR PAUSE','calibration-done')}${btn('REPRENDRE','resume',true)}</div></div>`;
 document.exitPointerLock?.();
}
function storePaddleOffsets(){
 for(const type of ['player','ai']){
  try{localStorage.setItem('synthpuck.spriteOffset.'+type,String(paddleOffsets[type]));}catch{}
 }
}
function showArcadeIntro(){
  mode='arcade';
  if(legacyArcade){showLegacyArcadeIntro();return;}
  beginCampaign();
}
function beginCampaign(){
  mode='arcade';level=campaignSave.progress[heroId]??0;
  opponent=getCharacter(getCampaignPath(heroId)[level]);
  // New players hear the phone call. Saved games resume at the next lift.
  if(level===0)showPhoneSequence();
  else showElevator(level);
}
function showVersusLoading(){
  if(mode!=='arcade'||legacyArcade)return;
  const path=getCampaignPath(heroId);
  opponent=getCharacter(path[level]);
  const stage=opponent.id;
  const token=++loadingSequence;
  loadingAbort?.abort();loadingAbort=new AbortController();
  loadingRetry=showVersusLoading;
  active=false;touchId=null;hud.hidden=true;touchBar.hidden=true;
  setScreen('versus');
  panel.innerHTML=renderVersus(heroId,opponent.id,level);
  const output=$('versusProgress');
  const tasks=matchLoadingTasks(stage,opponent.id);
  if(heroId!=='player')tasks.push(imageTask(images.characters[heroId]));
  const opened=performance.now();
  void loadResources(tasks,pct=>{
   if(token!==loadingSequence||screen!=='versus')return;
   loadingPercent=pct;output.textContent=pct+'%';
  },loadingAbort.signal).then(()=>{
   if(token!==loadingSequence||screen!=='versus')return;
   loadingAbort=null;loadingRetry=null;
   setTimeout(()=>{
    if(token!==loadingSequence||screen!=='versus')return;
    panel.classList.add('vs-fade-out');
    setTimeout(()=>{
     if(token!==loadingSequence||screen!=='versus')return;
     showCampaignScenario();
    },VS_FADE_MS);
   },Math.max(0,VS_MIN_VISIBLE_MS-(performance.now()-opened)));
  }).catch(error=>{
   if(token!==loadingSequence||screen!=='versus')return;
   loadingAbort=null;console.warn('Chargement du duel :',error);
   const footer=panel.querySelector('.versus-bottom');
   if(footer){footer.innerHTML='<p class="versus-load-error"></p><button type="button" class="btn" data-action="retry-vs">RÉESSAYER</button><button type="button" class="btn" data-action="menu">MENU</button>';
    footer.querySelector('.versus-load-error').textContent=error.message;}
  });
}
function showCampaignScenario(){
  if(mode!=='arcade'||legacyArcade)return;
  setScreen('story');
  hud.hidden=true;touchBar.hidden=true;
  panel.innerHTML=renderStory(heroId,level);
}
function showLegacyArcadeIntro(){
  mode='arcade';opponent=ROSTER[level];selected=opponent.id;
  currentStage=opponent.id;setBackground(currentStage,false);
  setScreen('intro');sound.prepare(opponent.id);hud.hidden=true;touchBar.hidden=true;
  panel.innerHTML=`<div class="page"><header class="page-head"><div><p class="eyebrow">ARCADE / DUEL ${String(level+1).padStart(2,'0')} DE 07</p><h2>TON PROCHAIN ADVERSAIRE</h2></div>${btn('← MENU','menu')}</header><article class="fight-card" style="--accent:${opponent.accent}"><div class="portrait">${avatar(opponent)}</div><div class="fight-detail"><p class="eyebrow">${opponent.arena}</p><h2>${opponent.name}</h2><h3>${opponent.epithet}</h3><p class="sub">${opponent.bio}</p>${statsHtml(opponent)}${btn('LANCER LE DUEL','play',true)}</div></article><p class="sub">Vaincs chaque adversaire dans l’ordre. Premier à 7 points.</p></div>`;
}
function showTrainingSelect(){
  active=false;mode='training';currentStage='training';setBackground('training',false);
  const c=getCharacter(selected);
  sound.prepare(c.id);
  setScreen('training');hud.hidden=true;touchBar.hidden=true;
  panel.innerHTML=`<div class="page"><header class="page-head"><div><p class="eyebrow">GRID 00 / SALLE D’ENTRAÎNEMENT</p><h2>CHOISIS TON ADVERSAIRE</h2></div>${btn('← MENU','menu')}</header><div class="roster" role="group" aria-label="Sélection des personnages">${ROSTER.map(p=>`<button data-character="${p.id}" type="button" class="roster-card ${p.id===c.id?'selected':''}" aria-label="Sélectionner ${p.name}" aria-pressed="${p.id===c.id}">${avatar(p)}<strong>${p.name}</strong></button>`).join('')}</div><div class="select-bottom"><div class="select-info" style="--accent:${c.accent}"><p class="eyebrow">${c.epithet}</p><h3>${c.name}</h3><p class="sub">${c.bio}</p>${statsHtml(c)}</div><div class="select-actions"><p class="sub">Joue contre le profil original de ${c.name} dans l’arène neutre GRID 00. Aucun résultat n’affecte l’Arcade.</p>${btn('COMMENCER L’ENTRAÎNEMENT','play',true)}</div></div></div>`;
}
function renderPauseEntry(label,action,variant=''){
 return `<button type="button" class="pause-entry ${variant}" data-action="${action}"><span>${label}</span><span class="pause-entry-arrow" aria-hidden="true">›</span></button>`;
}
function renderPauseOverlay(reason,subtitle,abandonLabel,abandonAction){
 return `<section class="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pauseHeading"><div class="pause-overlay-inner"><p class="pause-overline">SYNTHPUCK / JEU EN PAUSE</p><h2 id="pauseHeading">PAUSE</h2><p class="pause-caption">${escapeHtml(reason)} · ${escapeHtml(subtitle)}</p><nav class="pause-navigation" aria-label="Menu pause">${renderPauseEntry('CONTINUER','resume','primary')}${renderPauseEntry('OPTIONS','options')}${renderPauseEntry(abandonLabel,abandonAction,'danger')}${renderPauseEntry('RETOUR AU MENU','menu')}</nav><p class="pause-footer">ÉCHAP / ESPACE POUR CONTINUER</p></div></section>`;
}
function showPause(reason='DUEL EN PAUSE'){
 if(mode!=='multi'&&!match)return;
 active=false;pausedReason=reason;optionsReturnToPause=false;
 setScreen('pause',true);hud.hidden=false;touchBar.hidden=true;
 const subtitle=mode==='multi'?'Le duel en ligne continue pour ton adversaire':opponent.name+' · '+(mode==='arcade'?'ARCADE':'ENTRAÎNEMENT');
 const abandonLabel=mode==='multi'?'QUITTER LE DUEL':mode==='training'?'ABANDONNER L’ENTRAÎNEMENT':'ABANDONNER CAMPAGNE';
 panel.innerHTML=renderPauseOverlay(reason,subtitle,abandonLabel,mode==='multi'?'menu':'abandon-campaign');
 document.exitPointerLock?.();
}
function showAbandonConfirmation(){
 if(screen!=='pause')return;
 if(mode!=='arcade'){showMenu();return;}
 active=false;setScreen('pause-confirm',true);
 panel.innerHTML='<section class="pause-overlay pause-confirmation" role="dialog" aria-modal="true" aria-labelledby="abandonHeading"><div class="pause-overlay-inner"><p class="pause-overline">SYNTHPUCK / CAMPAGNE</p><h2 id="abandonHeading">ABANDONNER ?</h2><p class="pause-caption">La progression de cette campagne repartira au premier duel. Les campagnes terminées et les personnages débloqués resteront acquis.</p><nav class="pause-navigation" aria-label="Confirmation abandon">'+renderPauseEntry('NON, CONTINUER','pause-cancel','primary')+renderPauseEntry('OUI, ABANDONNER','confirm-abandon-campaign','danger')+'</nav></div></section>';
}
function confirmAbandonCampaign(){
 if(screen!=='pause-confirm'||mode!=='arcade')return;
 if(!legacyArcade){
  campaignSave={...campaignSave,progress:{...campaignSave.progress,[heroId]:0}};
  writeCampaignSave(globalThis.localStorage,campaignSave);
 }
 showMenu();
}
function logButton(){return mode==='arcade'&&match?.roundLog?btn('TÉLÉCHARGER LE LOG','downloadLog'):'';}
function downloadRoundLog(){
 if(!match?.roundLog)return;
 const data={...match.roundLog,opponent:opponent.id,level:level+1,exportedAt:new Date().toISOString(),build:'round-log-20261101'};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=`synthpuck-${opponent.id}-${match.scores.join('-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showPoint(){
  active=false;
  setScreen('point',true);const last=match.events.findLast(e=>e.type==='goal'||e.type==='timeout');
  const timeout=last?.type==='timeout',won=timeout?last.offender===1:last?.scorer===0;
  const title=timeout?'DÉLAI DÉPASSÉ':won?'POINT !':'POINT ADVERSE';
  const detail=timeout?(last.reason==='serve'?'10 secondes pour engager':'7 secondes pour renvoyer')+' · pas de point':statusText();
  panel.innerHTML=`<div class="compact-center"><p class="eyebrow">${opponent.name}</p><h2 class="${won?'win':'lose'}">${title}</h2><p class="sub">${match.scores[0]} : ${match.scores[1]} · ${detail}</p><p class="sub">${statusText()}</p>${btn('CONTINUER','resume',true)}${logButton()}</div>`;
  document.exitPointerLock?.();
}
function showMatchEnd(){
  active=false;
  if(!legacyArcade)closeDuelDoors(renderMatchEnd);
  else renderMatchEnd();
}
function renderMatchEnd(){
  const win=match.scores[0]>match.scores[1];
  const result=mode==='arcade'?(legacyArcade?nextArcadeLevel(level,win):nextCampaignLevel(heroId,level,win)):{type:'practice'};
  if(mode==='arcade'&&!legacyArcade&&win){
    const recorded=recordCampaignWin(campaignSave,heroId,level);
    campaignSave=recorded.save;
    writeCampaignSave(globalThis.localStorage,campaignSave);
    // Once the doors are closed, skip the intermediate NEXT OPPONENT panel:
    // the new VS screen already introduces the upcoming rival.
    if(result.type==='next'){
      level=result.index;
      document.exitPointerLock?.();
      showBlackDialogue(ELEVATOR_AFTER_WIN[level]??[],()=>showElevator(level));
      return;
    }
  }
  if(result.type==='complete'&&mode==='arcade'&&!legacyArcade){
    setScreen('complete');
    panel.innerHTML=renderEnding(heroId,btn('RETOUR AU MENU','menu',true));
  }else if(result.type==='complete'){
    setScreen('complete',true);
    panel.innerHTML=`<div class="compact-center"><p class="eyebrow">ABUNDANCE GAMES STUDIOS</p><h2 class="win">ARCADE TERMINÉ !</h2><p class="sub">Les sept rivaux sont tombés. Tu es le champion de SYNTHPUCK.</p>${btn('RETOUR AU MENU','menu',true)}${btn('REFAIRE L’ARCADE','arcade')}</div>`;
  }else{
    setScreen('result',true);
    if(mode==='arcade'&&!win){
      panel.innerHTML=`<div class="compact-center continue-panel"><p class="eyebrow">DÉFAITE · ${opponent.name} · ${match.scores[0]} : ${match.scores[1]}</p><h2 class="lose">CONTINUE?</h2><p class="sub">Retenter le duel contre ${opponent.name} ?</p>${btn('OUI · REJOUER','retry',true)}${btn('NON · MENU','menu')}</div>`;
    }else{
      panel.innerHTML=`<div class="compact-center"><p class="eyebrow">${opponent.name} · ${match.scores[0]} : ${match.scores[1]}</p><h2 class="${win?'win':'lose'}">${win?'VICTOIRE':'DÉFAITE'}</h2><p class="sub">${mode==='training'?'Entraînement terminé.':'Adversaire vaincu. Le prochain défi t’attend.'}</p>${mode==='arcade'&&win?btn('ADVERSAIRE SUIVANT','next',true):btn('REJOUER','retry',true)}${mode==='training'?btn('CHOISIR UN ADVERSAIRE','training'):''}${btn('RETOUR AU MENU','menu')}</div>`;
    }
  }
  if(mode==='arcade')panel.insertAdjacentHTML('beforeend',logButton());
  document.exitPointerLock?.();
}
const requestedTechnique=new URLSearchParams(location.search).get('aiTactic');
const debugTactic=TACTIC_IDS.includes(requestedTechnique)?requestedTechnique:null;
const aiDemoMode=debugTactic==='rallyBank'&&new URLSearchParams(location.search).get('aiDemo')==='1';
function createMatch(){
 tableLitAt=0;goalExitAnimation=null;
 opponent=mode==='training'?getCharacter(selected):(legacyArcade?ROSTER[level]:getCharacter(getCampaignPath(heroId)[level]));
 match=new Match({
   ...matchConfiguration(opponent),
   ...(!legacyArcade?{playerSkills:mode==='arcade'?TOWER_PLAYER_SKILLS:getCharacter('mute').stats,aiSkills:opponent.stats}:{}),
   // Rank changes AI execution, not a rival's personality or motor limits.
   // Training, multiplayer, legacy Arcade and tactical diagnostics stay original.
   ...(mode==='arcade'&&!legacyArcade&&!debugTactic?campaignExecutionConfig(heroId,level):{}),
   ...(debugTactic?{aiTactic:debugTactic}:{}),telemetry:mode==='arcade'||Boolean(debugTactic)
 });
 // Strictly opt-in diagnostic: start with an AI service so a human can
 // immediately observe the control sequence; regular matches still contest
 // the centre puck and retain every original rule.
 if(aiDemoMode)match.server=1;
 match.serve();
 halGaze={x:HAL_EYE_CALIBRATION.x,y:HAL_EYE_CALIBRATION.y};
}
function beginMatch(){
  if(mode==='arcade'&&!legacyArcade){
   const stage=getCampaignPath(heroId)[level];opponent=getCharacter(stage);
   showLoading(matchLoadingTasks(stage,stage),()=>startLoadedMatch(stage,true),beginMatch);
   return;
  }
  // Pointer lock must be requested synchronously on the player's button click.
  ensurePointerLock();
  const stage=stageIdFor(mode,opponent.id);
  const fighter=mode==='training'?selected:opponent.id;
  showLoading(matchLoadingTasks(stage,fighter),()=>startLoadedMatch(stage),beginMatch);
}
function startLoadedMatch(stage,fromElevator=false){
  currentStage=stage;
  setBackground(currentStage,true);createMatch();
  $('fighterName').textContent=opponent.name;
  $('fighterName').hidden=true;hud.hidden=false;
  $('hudMode').textContent=mode.toUpperCase();
  $('hudStage').textContent=mode==='training'?`GRID 00 · ${opponent.name}`:`${opponent.arena} · ${opponent.name}`;
  $('hudLevel').textContent=mode==='arcade'?`${String(level+1).padStart(2,'0')} / ${String(legacyArcade?7:getCampaignPath(heroId).length).padStart(2,'0')}`:'GRID 00';
  touchBar.hidden=!isTouch();
  if(isTouch())selectTouchMode(inputMode);
  if(mode==='arcade'&&!legacyArcade){
   panel.innerHTML='';setScreen('playing');
   hud.hidden=true;touchBar.hidden=true;
   if(fromElevator)startOpeningRound();
   else openDuelDoors(()=>{hud.hidden=false;touchBar.hidden=!isTouch();startOpeningRound();});
  }else startOpeningRound();
}
function ensurePointerLock(){
 if(!isTouch()&&!pointerRequested){
  pointerRequested=true;
  const lock=arena.requestPointerLock?.();
  if(lock?.catch)lock.catch(()=>{pointerRequested=false;});
 }
}
function startOpeningRound(){
 tableLitAt=performance.now();
 panel.innerHTML='';
 setScreen('playing');
 sound.scene('playing',opponent.id);
 active=false;accumulator=0;lastTime=0;
 // Only round one of a NEW duel gets this announcement. The stationary
 // central puck and both paddles remain frozen until GO has finished.
 ensurePointerLock();
 presentRoundSplash('ready',randomReadyDelayMs(),()=>{
  presentRoundSplash('go',GO_DURATION_MS,()=>resume());
 });
}
function resume(){
  goalExitAnimation=null;
  panel.innerHTML='';setScreen('playing');
  touchBar.hidden=!isTouch(); // Restore touch controls hidden by the full-screen pause/options overlay.
  active=true;accumulator=0;lastTime=0;
  sound.scene('playing',opponent.id);
  if(match?.state==='ready')match.serve();
  ensurePointerLock();
}
function buttonAction(action){
  if(action==='downloadLog'){downloadRoundLog();}
  else if(action==='online'||action==='multi'){stopNetwork();showLobby();}
  else if(action==='options'){showOptions();}
  else if(action==='pause-back'){if(optionsReturnToPause)showPause(pausedReason);else showMenu();}
  else if(action==='pause-cancel'){showPause(pausedReason);}
  else if(action==='abandon-campaign'){showAbandonConfirmation();}
  else if(action==='confirm-abandon-campaign'){confirmAbandonCampaign();}
  else if(action==='credits'){showCredits();}
  else if(action==='changelog'){showChangelog();}
  else if(action==='logout'){if(playerAuth.snapshot().user){void playerAuth.signOut().then(showMenu).catch(e=>{showOptions('Déconnexion impossible : '+e.message);});}else{$('accountLauncher').click();}}
  else if(action==='account'){$('accountLauncher').click();}
  else if(action==='save-options'){
     const range=$('sensitivityRange');
     if(range){
       mouseSensitivity=clamp(Number(range.value)||1,.4,2.4);
       try{localStorage.setItem('synthpuck.mouseSensitivity',String(mouseSensitivity));}catch{}
     }
     writeLocalAudioSettings(audioStorage,activeAudioUserId,audioSettings);
     const userId=playerAuth.snapshot().user?.id;
     if(!userId)showOptions('Sensibilité et volumes enregistrés sur cet appareil.');
     else{
       const saved={...audioSettings};
       void playerAuth.saveAudioSettings(saved).then(()=>{
         if(screen==='options'&&playerAuth.snapshot().user?.id===userId)
           showOptions('Sensibilité enregistrée. Volumes synchronisés avec ton profil.');
       }).catch(error=>{
         if(screen==='options'&&playerAuth.snapshot().user?.id===userId)
           showOptions('Volumes conservés sur cet appareil, mais sauvegarde du profil impossible : '+error.message);
       });
     }
   }
  else if(action==='host'||action==='join'){connectMultiplayer(action);}
  else if(action==='calibration'){showCalibration();}
  else if(action==='calibration-done'){showPause('CALAGE ENREGISTRÉ');}
  else if(action==='calibration-reset'){Object.assign(paddleOffsets,DEFAULT_PADDLE_OFFSETS);storePaddleOffsets();showCalibration();}
  else if(action==='mask-width-reset'){setTableMaskWidth(TABLE_MASK_WIDTH_DEFAULT);if(screen==='options'&&optionsReturnToPause)showOptions('Largeur du masque réinitialisée.');else showPause(pausedReason);}
  else if(action==='menu'){active=false;document.exitPointerLock?.();showMenu();}
  else if(action==='arcade'){level=0;mode='arcade';showArcadeIntro();}
  else if(action==='skip-cinematic'){if(screen==='phone'){if(cinematicSkip)cinematicSkip();else startFirstArcadeFight();}}
  else if(action==='start-campaign'){beginCampaign();}
  else if(action==='retry-vs'){showVersusLoading();}
  else if(action==='pass-story'){
   if(screen==='story'){ensurePointerLock();startLoadedMatch(opponent.id);}
  }
  else if(action==='training'){mode='training';showTrainingSelect();}
  else if(action==='retry-loading'){loadingRetry?.();}
  else if(action==='play'){beginMatch();}
  else if(action==='resume'){resume();}
  else if(action==='retry'){beginMatch();}
  else if(action==='next'){
    const result=nextArcadeLevel(level,true);
    if(result.type==='next'){level=result.index;if(legacyArcade)showLegacyArcadeIntro();else showVersusLoading();}
  }
}
panel.addEventListener('input',event=>{
 const el=event.target;
 if(screen==='options'&&el?.dataset?.audioVolume){
   const key=el.dataset.audioVolume;
   if(!Object.hasOwn(DEFAULT_AUDIO_SETTINGS,key))return;
   audioSettings=normalizeAudioSettings({...audioSettings,[key]:el.value});
   sound.setVolumes(audioSettings);
   writeLocalAudioSettings(audioStorage,activeAudioUserId,audioSettings);
   const label=$('volume-label-'+key);
   if(label)label.textContent=audioSettings[key]+' %';
   return;
 }
 if(screen==='options'&&optionsReturnToPause&&el?.hasAttribute?.('data-table-mask-width')){
  if(el.type==='number'&&el.value==='')return;
  setTableMaskWidth(el.value);
  for(const input of panel.querySelectorAll('[data-table-mask-width]')){
   if(input!==el)input.value=String(tableMaskWidth);
  }
  const output=$('table-mask-width-label');
  if(output)output.textContent=(tableMaskWidth>0?'+':'')+tableMaskWidth+' px / côté';
  return;
 }
 if(screen!=='calibration')return;
 const type=el?.dataset?.offsetType;
 if(type!=='player'&&type!=='ai')return;
 if(el.type==='number'&&el.value==='')return;
 const value=normalizePaddleOffset(el.value,paddleOffsets[type]);
 paddleOffsets[type]=value;
 storePaddleOffsets();
 for(const input of panel.querySelectorAll('[data-offset-type="'+type+'"]')){
  if(input!==el)input.value=String(value);
 }
 const label=$('offset-label-'+type);
 if(label)label.textContent=(value>0?'+':'')+value+' px';
});
// A real pointer/keyboard gesture is required before browsers will allow audio.
document.addEventListener('pointerdown',()=>sound.unlock(),{capture:true});
document.addEventListener('keydown',()=>sound.unlock(),{capture:true});
document.addEventListener('click',event=>{
 const button=event.target.closest('button');
 if(!button||button.disabled||button.closest('#touchBar'))return;
 const action=button.dataset.action||'';
 const label=button.textContent||'';
 const isBack=action==='menu'||action==='calibration-done'||/RETOUR|ANNULER|FERMER|QUITTER|←/i.test(label);
 sound.effect(isBack?'back':'click',.65);
},{capture:true});
panel.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button || button.disabled)return;
  if(button.dataset.elevatorService!==undefined&&screen==='elevator'){
   panel.querySelector('.elevator-dialogue').textContent='Une serrure de service. Pas de clé.';return;
  }
  if(button.dataset.elevatorFloor!==undefined&&screen==='elevator'){
   enterElevatorStage(Number(button.dataset.elevatorFloor));return;
  }
  if(button.dataset.pauseLevel!==undefined){
    // Only a paused Arcade match may jump to another stage.
    const index=Number(button.dataset.pauseLevel);
    if(!(screen==='pause'||(screen==='options'&&optionsReturnToPause))||mode!=='arcade'||!Number.isInteger(index)||index<0||index>=ROSTER.length)return;
    if(!legacyArcade)return;
    level=index;
    opponent=ROSTER[level];
    selected=opponent.id;
    touchId=null;
    beginMatch();
    return;
  }
  if(button.dataset.character){selected=button.dataset.character;showTrainingSelect();return;}
  if(button.dataset.onlineInvite){void connectMultiplayer('host',null,button.dataset.onlineInvite);return;}
  if(button.dataset.onlineRespond){const id=button.dataset.onlineRespond,accept=button.dataset.onlineAccept==='1';
    if($('lobbyStatus'))$('lobbyStatus').textContent=accept?'Acceptation de l’invitation…':'Refus de l’invitation…';
    if(accept)online.status='busy';
    void online.respond(id,accept).then(code=>{if(accept&&code)void connectMultiplayer('join',code);else if($('lobbyStatus'))$('lobbyStatus').textContent='Invitation refusée.';}).catch(e=>{online.status='available';if($('lobbyStatus'))$('lobbyStatus').textContent='Invitation : '+e.message;});return;}
  if(button.dataset.action)buttonAction(button.dataset.action);
});
$('creditsLauncher').addEventListener('click',()=>buttonAction('credits'));
$('changelogLauncher').addEventListener('click',()=>buttonAction('changelog'));
$('pauseButton').addEventListener('click',()=>{if(active)showPause();});
function selectTouchMode(val){inputMode=val;if(match){match.setButton('left',val==='rigid'||val==='grip');match.setButton('right',val==='soft'||val==='grip');}document.querySelectorAll('[data-touch-mode]').forEach(b=>b.classList.toggle('chosen',b.dataset.touchMode===val));}
touchBar.addEventListener('click',e=>{const b=e.target.closest('[data-touch-mode]');if(b)selectTouchMode(b.dataset.touchMode);});
function loadImage(src){const img=new Image();img.decoding='async';img.addEventListener('load',()=>{frame.stageReady=false;drawBackdrop();});img.src=src;return img;}
for(const p of ROSTER)images.characters[p.id]=loadImage(`./assets/characters/${p.id}.webp?v=fighters-hd-20261031`);
for(const name of ['mamouda','mute','chonk','simous','diamond','2502','training']) images.stages[name]=loadImage(`./assets/stages/${name}.webp`);
images.mamoudaNeon=loadImage('./assets/mamouda/neon-on.webp?v=restored-20261104-1');
for(const [kind,url] of Object.entries(STAL_LAYER_URLS))images.stalLayers[kind]=loadImage(url);
for(const [kind,url] of Object.entries(TABLE_LAYER_FILES))images.tableLayers[kind]=loadImage(url);
images.stages.stal=images.stalLayers.background;
for(const type of ['player','puck','ai'])images.sprites[type]=loadImage(SPRITE_URLS[type]);
// HAL is built into the final stage; the independently painted retina moves at runtime.
images.halEye=loadImage('./assets/characters/hal-eye.webp');
// Full-resolution, separately painted art assets. The previous tiny composite atlas
// was cropped and enlarged at runtime, which introduced blur/pixelation everywhere.
// Preload the menu and HUD assets so ready means their decoded images are available.
const uiPaths=[
 './assets/ui/abundance-games-studios.svg?v=user-approved-orange-sun-20261103-1',
 './assets/ui/menu-hd.avif',
 './assets/ui/panel-blue.webp',
 './assets/ui/panel-red.webp',
 './assets/ui/panel-neutral.webp',
 './assets/ui/pause.webp'
];
let uiArtReady=false;
Promise.all(uiPaths.map(src=>new Promise((resolve,reject)=>{
 const img=new Image();
 img.onload=()=>img.decode?.().then(resolve,reject)??resolve();
 img.onerror=()=>reject(new Error('Missing Synthpuck HD asset: '+src));
 img.src=src;
}))).then(()=>{
 uiArtReady=true;
 document.documentElement.dataset.uiArt='loaded';
}).catch(error=>{
 document.documentElement.dataset.uiArt='failed';
 console.error(error);
});

function resize(){
  const cssW=innerWidth,cssH=innerHeight,dpr=Math.min(devicePixelRatio||1,renderQuality.dprCap);
  // Contain the entire calibrated table and rear-rail silhouette on every aspect ratio.
  // Keep the full table geometry on tall phones to preserve fair play.
  layout={cssW,cssH,dpr,scale:Math.min(cssW/NATIVE.w,cssH/NATIVE.h),x:0,y:0};
  layout.x=(cssW-NATIVE.w*layout.scale)/2;layout.y=(cssH-NATIVE.h*layout.scale)/2;
  // Align the HUD with the actual letterboxed arena, never the black side bands.
  document.documentElement.style.setProperty('--arena-side',`${layout.x}px`);
  document.documentElement.style.setProperty('--arena-top',`${layout.y}px`);
  document.documentElement.style.setProperty('--arena-width',`${NATIVE.w*layout.scale}px`);
  for(const c of [arena,backdrop]){c.width=Math.round(cssW*dpr);c.height=Math.round(cssH*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  bg.setTransform(dpr,0,0,dpr,0,0);
  drawBackdrop();
}
function drawBackdrop(){
 // High-quality sampling protects fine metal engravings at non-native display sizes.
 bg.imageSmoothingEnabled=true;
 bg.imageSmoothingQuality='high';
 const stage=images.stages[currentStage];
 bg.fillStyle='#080d1a';bg.fillRect(0,0,layout.cssW,layout.cssH);
 if(stage?.complete&&stage.naturalWidth){
  bg.drawImage(stage,layout.x,layout.y,NATIVE.w*layout.scale,NATIVE.h*layout.scale);
  // Keep MAMOUDA's approved hand-painted neon sign and flicker.
  if(currentStage==='mamouda'&&images.mamoudaNeon?.naturalWidth){
   const reduced=Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
   const opacity=mamoudaNeonOpacity(performance.now()/1000,reduced);
   renderedMamoudaNeonOpacity=opacity;
   if(opacity>0){
    bg.save();bg.globalAlpha=opacity;
    bg.drawImage(images.mamoudaNeon,layout.x,layout.y,NATIVE.w*layout.scale,NATIVE.h*layout.scale);
    bg.restore();
   }
  }
 }
 if(showFarOpponent)drawOpponent();
 // Native pixel-aligned artwork: Tour is the metal surround; TablePlay
 // restores the clean, moon-reflection-free playing surface inside that rim.
 // Clip only the playable trapezoid so TablePlay's outside texture does not
 // obscure the original side rails or make their outlines shift.
 const themed=stageTableArt(currentStage);
 if(themed){
  // TableTour's authored PNG contains vertically stretched scenery OUTSIDE
  // the visible metal table. Hide only that spill, preserving every rail pixel
  // and the original 1672x941 geometry and drawing resolution.
  bg.save();bg.beginPath();
  const edge=(x,y)=>[layout.x+x*layout.scale,layout.y+y*layout.scale];
  bg.moveTo(...edge(570,380));bg.lineTo(...edge(1102,380));
  bg.lineTo(...edge(1690,811));bg.lineTo(...edge(-18,811));
  bg.closePath();bg.clip();
  bg.drawImage(themed.tour,layout.x,layout.y,NATIVE.w*layout.scale,NATIVE.h*layout.scale);
  bg.restore();
  bg.save();
  bg.beginPath();
  const p=(x,y)=>[layout.x+x*layout.scale,layout.y+y*layout.scale];
  // Use exactly the same polygon as the white backlight; no inset wedge.
  TABLE_SCREEN_NATIVE_CORNERS.forEach(([x,y],i)=>{
   if(i===0)bg.moveTo(...p(x,y));else bg.lineTo(...p(x,y));
  });
  bg.closePath();bg.clip();
  bg.drawImage(themed.play,layout.x,layout.y,NATIVE.w*layout.scale,NATIVE.h*layout.scale);
  bg.restore();
 }
}
function drawOpponent(){
  // HAL's black lens is already part of the final backdrop: never overlay a character here.
  if(currentStage===HAL_STAGE_ID)return;
  const image=images.characters[opponent.id];if(!image?.complete||!image.naturalWidth)return;
  // The character sits behind the visible far rail (same fixed geometry as the puck).
  bg.save();bg.beginPath();bg.rect(0,0,layout.cssW,layout.y+390*layout.scale);bg.clip();
  // Slightly larger portraits, sunk behind the far-rail lip: the cropped
  // torso stays hidden while the head/shoulders remain clear of the table.
  const height=OPPONENT_HEIGHT_NATIVE*layout.scale;
  const width=image.naturalWidth/image.naturalHeight*height;
  const x=layout.x+NATIVE.w*layout.scale/2-width/2;
  const y=layout.y+(396-OPPONENT_HEIGHT_NATIVE)*layout.scale;
  bg.imageSmoothingEnabled=true;
  bg.imageSmoothingQuality='high';
  bg.shadowBlur=0;
  bg.drawImage(image,x,y,width,height);
  bg.restore();
}
// Use the original painted table as the absolute screen-space reference.
// Never alter the backdrop, the physical table or the sprite assets.
let tableProjection=null, projectionConfig=null;
function project(x,z){
  if(!match)return {x:0,y:0};
  if(projectionConfig!==match.cfg){
    tableProjection=createTableProjection(match.cfg.width,match.cfg.length);
    projectionConfig=match.cfg;
  }
  const p=tableProjection.project(x,z);
  return {x:layout.x+p.x*layout.scale,y:layout.y+p.y*layout.scale};
}
function projectedRadius(x,z,r){
  const a=project(x-r,z),b=project(x+r,z),c=project(x,z-r),d=project(x,z+r);
  // The safety floor is expressed in NATIVE stage pixels, not fixed CSS
 // pixels. Fixed 3px/2px values exaggerated pucks on portrait mobile views.
 return {rx:Math.max(3*layout.scale,Math.abs(b.x-a.x)/2),ry:Math.max(2*layout.scale,Math.abs(c.y-d.y)/2)};
}
// Independent transparent artwork. No source rectangles, so no cropped heads,
// rims or cut puck edges. Alpha margins are part of each image.
const spriteArt=SPRITE_ART;

// Only the departing goal sprite may visually leave the physical table.
 // The calibrated gameplay projection remains clamped and unchanged.
function goalExitProject(x,z){
 const edge=match.cfg.length/2;
 if(Math.abs(z)<=edge)return project(x,z);
 const direction=Math.sign(z),boundary=direction*edge;
 const atEdge=project(x,boundary);
 const inside=project(x,boundary-direction*.25);
 const continuation=(Math.abs(z)-edge)/.25;
 return {x:atEdge.x+(atEdge.x-inside.x)*continuation,
  y:atEdge.y+(atEdge.y-inside.y)*continuation};
}
function spriteGeometry(obj,type){
 const p=type==='puck'&&obj.goalExit?goalExitProject(obj.x,obj.z):project(obj.x,obj.z);
 const radius=match.cfg[type==='puck'?'puckRadius':'paddleRadius'];
 const {rx}=projectedRadius(obj.x,obj.z,radius);
 const sprite=spriteArt[type],img=images.sprites[type];
 const sourceWidth=img?.naturalWidth || (type==='ai'?672:type==='player'?674:549);
 const sourceHeight=img?.naturalHeight || (type==='puck'?361:482);
 // Size the PAINTED contact disk to the projected physical disk, not
 // the outer transparent canvas. Its painted contact ellipse must sit on
 // the projected x/z collision centre.
 const width=2*rx*.98*sourceWidth/sprite.inkWidth;
 const height=width*sourceHeight/sourceWidth;
 let y=p.y-height*sprite.anchor;
 // Keep the visible bottom of a close-up sprite above the painted front
 // bumper (which previously exposed/cropped the base near the player).
 // This is a visual-only correction; the physics position never changes.
 const frontRailY=project(obj.x,-match.cfg.length/2).y;
 if(!(type==='puck'&&obj.goalExit))y=Math.min(y,frontRailY+2*layout.scale-height*sprite.inkBottom);
 // Apply the exact native-pixel translation AFTER the bumper guard.
 // Positive values always move the image down, even at the near rail.
 return {x:p.x-width/2,y:offsetSpriteY(y,type,layout.scale,paddleOffsets),width,height};
}
function drawCollisionBody(obj,type){
 const radius=match.cfg[type==='puck'?'puckRadius':'paddleRadius'];
 ctx.save();
 ctx.fillStyle=GREEN_DEBUG_OVERLAY[type==='puck'?'puckFill':type==='ai'?'aiFill':'playerFill'];
 ctx.strokeStyle=GREEN_DEBUG_OVERLAY.colliderOutline;
 ctx.lineWidth=2*layout.scale;
 ctx.beginPath();
 for(let i=0;i<=64;i++){
  const angle=i/64*Math.PI*2;
  const p=project(obj.x+Math.cos(angle)*radius,obj.z+Math.sin(angle)*radius);
  if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
 }
 ctx.closePath();ctx.fill();ctx.stroke();
 const center=project(obj.x,obj.z);
 const tip=project(obj.x+Math.cos(obj.angle??0)*radius*.85,obj.z+Math.sin(obj.angle??0)*radius*.85);
 ctx.beginPath();ctx.moveTo(center.x,center.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();
 ctx.beginPath();ctx.arc(center.x,center.y,2.5*layout.scale,0,Math.PI*2);
 ctx.fillStyle=GREEN_DEBUG_OVERLAY.colliderIndicator;ctx.fill();
 ctx.restore();
}
// Smash is signalled by the scoring splash, not an unwanted orange halo around the puck.
function drawObject(obj,type){
 const {x,y,width,height}=spriteGeometry(obj,type);
 const img=images.sprites[type];
 // Green collision guides are translucent underlays. Paint sprites
 // afterward at full opacity so their artwork is never ghosted.
 if(physicsGuidesVisible()&&!obj.goalExit)drawCollisionBody(obj,type);
 if(img?.complete&&img.naturalWidth){
  ctx.save();
  ctx.globalAlpha=1; // Preserve opaque painted WebP pixels (transparent margins remain)
  if(type==='puck'&&obj.goalExit)ctx.globalAlpha=obj.opacity;
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality=renderQuality.smoothing;
  ctx.shadowColor='#030712b8';ctx.shadowBlur=renderQuality.shadows?5*layout.scale:0;
  ctx.drawImage(img,x,y,width,height);
  if(type==='puck'){
   // Rotate the top-face markings in the table plane, preserving perspective
   // and the fixed lighting/thickness of the original disk artwork.
   const p=obj.goalExit?goalExitProject(obj.x,obj.z):project(obj.x,obj.z),{rx}=projectedRadius(obj.x,obj.z,match.cfg.puckRadius);
   ctx.shadowBlur=0;
   ctx.translate(p.x,p.y-rx*.12);ctx.scale(rx*.68,rx*.30);
   ctx.rotate(-(obj.angle??0));
   ctx.strokeStyle='#12394bd9';ctx.lineWidth=.16;ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(.30,0);ctx.lineTo(.83,0);ctx.stroke();
   ctx.fillStyle='#f4feff';ctx.beginPath();ctx.arc(-.52,0,.13,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }else if(physicsGuidesVisible()){
  const p=project(obj.x,obj.z),{rx}=projectedRadius(obj.x,obj.z,match.cfg[type==='puck'?'puckRadius':'paddleRadius']);
  ctx.beginPath();ctx.ellipse(p.x,p.y,rx,rx*.48,0,0,Math.PI*2);
  ctx.fillStyle=GREEN_DEBUG_OVERLAY[type==='puck'?'puckFill':type==='ai'?'aiFill':'playerFill'];ctx.fill();
 }
 // No yellow/orange ring around the puck during a SMASH.
}
function drawHalEye(dt){
  if(currentStage!==HAL_STAGE_ID||!match)return;
  const eye=images.halEye;
  if(!eye?.complete||!eye.naturalWidth)return;
  const target=halEyeTarget(match.puck,match.cfg);
  const easing=1-Math.exp(-9*Math.max(0,Math.min(dt,0.05)));
  halGaze.x+=(target.x-halGaze.x)*easing;
  halGaze.y+=(target.y-halGaze.y)*easing;
  const c=HAL_EYE_CALIBRATION,scale=layout.scale;
  ctx.save();
  // Keep the moving retina inside the black, raster-painted aperture.
  ctx.beginPath();ctx.arc(layout.x+c.x*scale,layout.y+c.y*scale,c.apertureRadius*scale,0,Math.PI*2);ctx.clip();
  const size=c.spriteSize*scale;
  ctx.drawImage(eye,layout.x+halGaze.x*scale-size/2,layout.y+halGaze.y*scale-size/2,size,size);
  ctx.restore();
}
// Visual debug only: project the actual invisible physics walls, without
// creating/changing collision geometry or repainting the illustrated arena.
function drawPhysicalTableWalls(){
  const {width,length,goalWidth}=match.cfg;
  const halfW=width/2,halfL=length/2,halfGoal=goalWidth/2;
  ctx.save();
  ctx.strokeStyle=GREEN_DEBUG_OVERLAY.tableRails;
  ctx.lineWidth=Math.max(2,4*layout.scale);
  ctx.lineCap='round';
  ctx.lineJoin='round';
  const wall=(x0,z0,x1,z1)=>{
    ctx.beginPath();
    for(let i=0;i<=24;i++){
      const t=i/24,p=project(x0+(x1-x0)*t,z0+(z1-z0)*t);
      if(i===0)ctx.moveTo(p.x,p.y);
      else ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();
  };
  // Lateral walls, then front/rear wall segments: retain the real goal gaps.
  wall(-halfW,-halfL,-halfW,halfL);
  wall(halfW,-halfL,halfW,halfL);
  for(const z of [-halfL,halfL]){
    wall(-halfW,z,-halfGoal,z);
    wall(halfGoal,z,halfW,z);
  }
  ctx.restore();
}
function drawActors(dt=0){
 ctx.clearRect(0,0,layout.cssW,layout.cssH);
 if(!match)return;
 paintTableScreen(ctx,{match,project,layout,power:tableLitAt?Math.min(1,(performance.now()-tableLitAt)/850):0,maskWidth:tableMaskWidth,announcement:roundAnnouncement,opponentName:mode==='multi'?'ADVERSAIRE':opponent.name,playerName:playerScoreLabel(playerAuth.snapshot())});
 const themed=stageTableArt(currentStage);
 // TablePlay stays beneath the white backlight; the authored TableTour
 // metal surround must sit ABOVE that white overlay. Keep the same outer
 // TableTour crop used by drawBackdrop(), hiding stretched scenery while
 // preserving the original rails, original PNG, and every mask-width setting.
 // Only y=380..811 contains the visible rim; crop to reduce per-frame work.
 if(themed?.tour){
  ctx.save();ctx.beginPath();
  const edge=(x,y)=>[layout.x+x*layout.scale,layout.y+y*layout.scale];
  ctx.moveTo(...edge(570,380));ctx.lineTo(...edge(1102,380));
  ctx.lineTo(...edge(1690,811));ctx.lineTo(...edge(-18,811));
  ctx.closePath();ctx.clip();
  ctx.drawImage(themed.tour,0,380,NATIVE.w,431,
   layout.x,layout.y+380*layout.scale,NATIVE.w*layout.scale,431*layout.scale);
  ctx.restore();
 }
 // The visible metal is below the puck, paddles and TableFront.
 drawHalEye(dt);
 const departing=goalExitAnimation?sampleGoalPuckExit(goalExitAnimation,performance.now()):undefined;
 const visiblePuck=goalExitAnimation?departing:match.puck;
 // At the far goal opening, its strip masks the puck as it enters.
 // Elsewhere paint actors back-to-front by table depth: the near puck
 // must be visible in front of either paddle, never artificially beneath.
 const farGoalPuck=Boolean(visiblePuck&&visiblePuck.z>=match.cfg.length/2-match.cfg.puckRadius);
 if(farGoalPuck)drawObject(visiblePuck,'puck');
 if(themed?.goal)ctx.drawImage(themed.goal,layout.x,layout.y,NATIVE.w*layout.scale,NATIVE.h*layout.scale);
 for(const {obj,type} of sortSpriteActors([
  {obj:match.ai,type:'ai'},
  {obj:match.player,type:'player'},
  ...(!farGoalPuck&&visiblePuck?[{obj:visiblePuck,type:'puck'}]:[])
 ]))drawObject(obj,type);
 // TableFront is still drawn last to hide near-goal departures under its lip.
 if(physicsGuidesVisible())drawPhysicalTableWalls();
 if(themed?.front){
  // Only the actual opaque near lip is drawn; transparent scene stays untouched.
  const frontY=760;
  ctx.drawImage(themed.front,0,frontY,NATIVE.w,NATIVE.h-frontY,
   layout.x,layout.y+frontY*layout.scale,NATIVE.w*layout.scale,(NATIVE.h-frontY)*layout.scale);
 }
}
function stopNetwork(){
  if(network&&online.ready)void online.cancelPending().catch(()=>{});
  connectionAttempt=null;
  clearInterval(networkTimer);networkTimer=null;
  if(network){network.onclose=null;network.close();network=null;}
}
let connectionAttempt=null;
let connectionReport='';
function updateConnectionDebug(report){
  connectionReport=report;
  let box=$('connectionDebug');
  if(!box){box=document.createElement('details');box.id='connectionDebug';box.open=true;box.innerHTML='<summary>Diagnostic de connexion</summary><p>Rapport sans adresses IP. Les ports indiqués sont ceux des candidats WebRTC.</p><button type="button" id="downloadDebug">Télécharger le rapport</button><pre id="connectionLog"></pre>';document.body.append(box);
    $('downloadDebug').onclick=()=>{const url=URL.createObjectURL(new Blob([connectionReport],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='synthpuck-connexion.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  }
  box.hidden=false;$('connectionLog').textContent=report;const log=$('connectionLog');log.scrollTop=log.scrollHeight;
}
function showLobby(message='Choisis un joueur en ligne ou utilise un code privé.'){
  online.status='available';
  active=false;mode='multi';hud.hidden=true;touchBar.hidden=true;setScreen('lobby');
  panel.innerHTML=lobbyMarkup(btn);
  $('lobbyStatus').textContent=message;
  renderOnlineSections(online,!!playerAuth.snapshot().user);
  void online.start().then(()=>online.pulse());
}
async function connectMultiplayer(action,suppliedCode=null,inviteTarget=null){
  const code=(suppliedCode??$('roomCode')?.value??'').trim();
  if(action==='join'&&!/^[a-zA-Z0-9_-]{6,128}$/.test(code)){
    if($('lobbyStatus'))$('lobbyStatus').textContent='Colle un code de partie valide.';
    return;
  }
  if(network)stopNetwork();
  const attempt=Symbol();connectionAttempt=attempt;
  const notify=message=>{if($('lobbyStatus'))$('lobbyStatus').textContent=message;};
  notify('Préparation de la connexion WebRTC…');
  let config=iceConfiguration(),relayMessage='';
  if(playerAuth.snapshot().user){
    try{
      const token=await playerAuth.accessToken();
      if(token)config=await cloudflareConfiguration(token);
      else relayMessage=' Relais privé indisponible : STUN uniquement.';
    }catch(error){
      // Deployed TURN Worker and authenticated Supabase are optional during rollout.
      // Never ask the player for or expose a shared TURN API key.
      relayMessage=' Relais TURN non activé : connexion directe uniquement.';
    }
  }else relayMessage=' Mode invité : connexion directe (réseaux restrictifs non garantis).';
  if(connectionAttempt!==attempt||screen!=='lobby')return;
  const ws=new BrowserHost(config);network=ws;
  ws.debug.onchange=updateConnectionDebug;updateConnectionDebug(ws.debug.report());
  notify('Connexion au service de jeu…'+relayMessage);
  const timeout=setTimeout(()=>{
    if(network===ws&&ws.readyState!==WebSocket.OPEN){
      stopNetwork();showLobby('Service de connexion indisponible. Vérifie Internet.');
    }
  },30000);
  ws.onopen=()=>{
    clearTimeout(timeout);
    if(network!==ws)return;
    ws.send(JSON.stringify({type:action==='host'?'create':'join',code}));
  };
  ws.onclose=()=>{
    clearTimeout(timeout);
    if(network!==ws)return;
    stopNetwork();showLobby('Connexion interrompue. Tu peux réessayer.');
  };
  ws.onerror=()=>notify('Échec de la connexion. Vérifie Internet.');
  ws.onmessage=e=>{
    if(network!==ws)return;
    const d=JSON.parse(e.data);
    if(d.type==='lobby'){
      notify('Code : '+d.code+' · En attente de ton adversaire…'+relayMessage);
      if(inviteTarget){
        const target=inviteTarget;inviteTarget=null;
        void online.setStatus('busy')
          .then(()=>online.invite(target,d.code))
          .then(()=>notify('Invitation envoyée ! Attends que ton adversaire accepte.'))
          .catch(error=>{
            notify('Invitation impossible : '+error.message+' · Tu peux partager le code : '+d.code);
            void online.setStatus('available');
          });
      }
    }
    if(d.type==='error'){stopNetwork();showLobby(d.message);}
    if(d.type==='left'){stopNetwork();showLobby('L’autre joueur a quitté la partie.');}
    if(d.type==='start'){
      // Keep signed-in players visible as EN PARTIE while their duel runs.
      online.status='busy';void online.pulse();
      networkSlot=d.slot;mode='multi';match=new Match();
      currentStage='training';setBackground('training',false);
      $('hudMode').textContent='ONLINE';$('hudStage').textContent='DUEL 1V1';
      $('hudLevel').textContent=networkSlot?'JOUEUR 2':'JOUEUR 1';
      // Network matches also show the exact same asset loader before play.
      // Incoming authoritative state packets continue to update match meanwhile.
      const startOnlineDuel=()=>{
        if(network!==ws)return;
        tableLitAt=performance.now();
        hud.hidden=false;touchBar.hidden=!isTouch();
        resume();
        networkTimer=setInterval(()=>{
          if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<4096)
            ws.send(JSON.stringify({type:'input',...match.target,left:match.input.left,right:match.input.right}));
        },1000/60);
      };
      showLoading(matchLoadingTasks('training',opponent.id),startOnlineDuel,
        ()=>showLoading(matchLoadingTasks('training',opponent.id),startOnlineDuel));
    }
    if(d.type==='state'&&match){
      const flip=p=>({...p,x:-p.x,z:-p.z,vx:-p.vx,vz:-p.vz});
      Object.assign(match.player,networkSlot?flip(d.ai):d.player);
      Object.assign(match.ai,networkSlot?flip(d.player):d.ai);
      Object.assign(match.puck,networkSlot?flip(d.puck):d.puck);
      match.scores=networkSlot?[...d.scores].reverse():d.scores;
      match.state=d.state;match.server=networkSlot?-d.server:d.server;
      match.awaitingServe=d.awaitingServe;
      match.time=d.time??match.time;
      match.serveStartedAt=d.serveStartedAt??match.serveStartedAt;
      match.possessionSide=networkSlot?-(d.possessionSide??0):(d.possessionSide??0);
      match.possessionSince=d.possessionSince??null;
      match.timeTransition=d.state==='time-transition'?{reason:d.timeoutReason}:null;
      if(d.state==='over'){
        active=false;clearInterval(networkTimer);setScreen('result',true);
        panel.innerHTML='<div class="compact-center"><h2>'+
          (match.scores[0]>match.scores[1]?'VICTOIRE':'DÉFAITE')+
          '</h2><p>'+match.scores.join(' : ')+'</p>'+
          btn('RETOUR AU LOBBY','multi',true)+btn('MENU','menu')+'</div>';
        document.exitPointerLock?.();
      }
    }
  };
}
let cachedHudScore='',cachedHudStatus='';
function updateHud(){
 if(!match)return;
 const value=match.scores[0]+' <span>:</span> '+match.scores[1];
 if(value!==cachedHudScore){$('score').innerHTML=value;cachedHudScore=value;}
 const status=statusText();
 if(status!==cachedHudStatus){$('hudStatus').textContent=status;cachedHudStatus=status;}
}
function frame(time){
  requestAnimationFrame(frame);
  const actualElapsed=lastTime?Math.max(0,(time-lastTime)/1000):0;
  const dt=Math.min(.04,actualElapsed);lastTime=time;
  const simulating=active&&match&&mode!=='multi';
  let physicsSteps=0,droppedTime=Math.max(0,actualElapsed-dt);
  updateRoundAnnouncement(time);
  if(active&&match&&mode!=='multi'){
    accumulator+=dt;
    let steps=0;
    while(accumulator>=match.cfg.tick&&steps<8){accumulator-=match.cfg.tick;steps++;}
    tickFrameInput(match,steps);
    physicsSteps=steps;
    if(steps===8){droppedTime+=accumulator;accumulator=0;}
    playMatchAudio();
    if(match.state==='over'||match.state==='ready'){
      const goal=match.events.findLast(e=>e.type==='goal');
      if(match.state==='over'){
        active=false;
        if(goal){
          goalExitAnimation=beginGoalPuckExit(match.puck,match.cfg,time);
          const type=chooseRoundSplash(goal,match.scores,match.cfg.scoreToWin);
          presentRoundSplash(type,RESULT_DURATION_MS,()=>showMatchEnd());
        }else showMatchEnd();
      }else{
        // A goal awards its point immediately, but nobody may serve or move
        // while GOAL/SMASH covers the arena. The next physical service starts
        // automatically AFTER the splash has completely disappeared.
        // Possession faults still restart instantly (no GOAL splash).
        const type=goal?chooseRoundSplash(goal,match.scores,match.cfg.scoreToWin):null;
        if(type){
          active=false;
          accumulator=0;
          goalExitAnimation=beginGoalPuckExit(match.puck,match.cfg,time);
          presentRoundSplash(type,GOAL_DURATION_MS,()=>{
            if(screen==='playing'&&match?.state==='ready')resume();
          });
        }else match.serve();
      }
    }
  }
  if(images.stages[currentStage]?.complete&&images.stages[currentStage].naturalWidth && !frame.stageReady){drawBackdrop();frame.stageReady=true;}
  if(currentStage==='mamouda'&&images.stages.mamouda?.naturalWidth&&images.mamoudaNeon?.naturalWidth){
    const reduced=Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    const opacity=mamoudaNeonOpacity(time/1000,reduced);
    if(opacity!==renderedMamoudaNeonOpacity)drawBackdrop();
  }
  if(screen==='playing'||screen==='pause'||screen==='calibration'||screen==='point'||screen==='result'){drawActors(dt);updateHud();}
  if(frameCounter){const reading=frameCounter.frame(time,{elapsedSeconds:actualElapsed,simulating,physicsSteps,droppedTime});if(reading)renderPerformance(reading,renderQuality.mode);}
}
function setBackground(stage,withOpponent){
  currentStage=stage;showFarOpponent=withOpponent;ctx.clearRect(0,0,layout.cssW,layout.cssH);frame.stageReady=false;
  // Draw the opponent only in gameplay, never on the select/menu backdrop.
  if(!withOpponent){const prior=active;active=false;drawBackdrop();active=prior;}
  else{drawBackdrop();}
}
addEventListener('resize',resize);
function isGameInputBlocked(event){
  if(!$('accountOverlay').hidden)return true;
  const target=event?.target;
  return target instanceof Element && Boolean(target.closest(
    'input,select,textarea,[contenteditable="true"],[role="textbox"]'));
}
document.addEventListener('mousemove',e=>{
  if(!active||!match||isTouch()||isGameInputBlocked(e))return;
  // Relative motion allows the original controller to stay instant and reversible.
  frameCounter?.mouse();
  const movement=moveTargetWithMouse(match.target,e.movementX,e.movementY,mouseSensitivity,match.cfg);
  match.target.x=movement.x;match.target.z=movement.z;
});
arena.addEventListener('click',()=>{if(active&&$('accountOverlay').hidden&&!isTouch()&&document.pointerLockElement!==arena){arena.requestPointerLock?.().catch(()=>{});}});
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==arena){pointerRequested=false;if(active&&!isTouch()&&$('accountOverlay').hidden)showPause();}});
document.addEventListener('mousedown',e=>{if(!active||!match||isTouch()||isGameInputBlocked(e))return;if(e.button===0)match.setButton('left',true);if(e.button===2)match.setButton('right',true);});
document.addEventListener('mouseup',e=>{if(!match||isTouch())return;if(e.button===0)match.setButton('left',false);if(e.button===2)match.setButton('right',false);});
document.addEventListener('contextmenu',e=>{if(active)e.preventDefault();});
arena.addEventListener('touchstart',e=>{
  if(!active||!match||touchId!==null||isGameInputBlocked(e))return;
  const t=e.changedTouches[0];if(!t)return;e.preventDefault();touchId=t.identifier;lastTouch={x:t.clientX,y:t.clientY};
},{passive:false});
addEventListener('touchmove',e=>{
  if(!active||touchId===null||!match||isGameInputBlocked(e))return;
  const t=[...e.changedTouches].find(t=>t.identifier===touchId);if(!t)return;e.preventDefault();
  const target=moveTargetWithTouch(match.target,t.clientX-lastTouch.x,t.clientY-lastTouch.y,layout.cssW,layout.cssH,mouseSensitivity,match.cfg);
  match.target.x=target.x;match.target.z=target.z;lastTouch={x:t.clientX,y:t.clientY};
},{passive:false});
for(const type of ['touchend','touchcancel'])addEventListener(type,e=>{if([...e.changedTouches].some(t=>t.identifier===touchId))touchId=null;});
addEventListener('keydown',e=>{
  if(isGameInputBlocked(e))return;
  if(e.code==='Escape'&&(screen==='credits'||screen==='changelog')){e.preventDefault();showMenu();return;}
  if(e.code==='Escape'&&(screen==='story'||screen==='versus'||screen==='phone'||screen==='elevator')){
   e.preventDefault();++loadingSequence;loadingAbort?.abort();showMenu();return;
  }
  if(e.code==='Escape'&&(screen==='pause'||screen==='pause-confirm'||screen==='calibration'||(screen==='options'&&optionsReturnToPause))){
    e.preventDefault();if(screen==='pause')resume();else showPause(pausedReason);return;
  }
  if(e.code==='Escape'&&active){e.preventDefault();showPause();}
  if(e.code==='Space'){e.preventDefault();if(screen==='pause'||screen==='point')resume();}
});
addEventListener('blur',()=>{match?.setButton('left',false);match?.setButton('right',false);if(active&&$('accountOverlay').hidden)showPause('FENÊTRE INACTIVE');});
// Read-only diagnostics support end-to-end verification of game states.
window.__synthpuck=Object.freeze({
  snapshot:()=>({screen,mode,level,opponent:opponent.id,stage:currentStage,
    hero:heroId==='player'?null:heroId,unlockedHal:campaignSave.unlockedHal,campaignPath:mode==='arcade'&&!legacyArcade?[...getCampaignPath(heroId)]:null,
    score:match?[...match.scores]:null,state:match?.state??null,
    loadingPercent:screen==='loading'||screen==='versus'||screen==='story'?loadingPercent:null,
    doorState:duelDoors.hidden?'hidden':duelDoors.dataset.state,
    elevatorFloor:panel.querySelector('.elevator-canvas')?.dataset.currentFloor??null,
    elevatorPhase:panel.querySelector('.elevator-canvas')?.dataset.phase??null,
    elevatorDoorState:panel.querySelector('.elevator-canvas')?.dataset.doorState??null,
    ready:currentStage==='stal'?stalLayersReady():Boolean(images.stages[currentStage]?.complete&&images.stages[currentStage].naturalWidth),
    stalLayeredArtReady:stalLayersReady(),
    active,roundSplash:roundAnnouncement?.kind??null,
    audio:sound.snapshot(),
    performance:frameCounter?.snapshot()??null,
    roundSplashRemainingMs:roundAnnouncement?Math.max(0,Math.ceil(roundAnnouncement.until-performance.now())):null,
    spriteSizes:Object.fromEntries(Object.entries(images.sprites).map(([type,img])=>[type,[img.naturalWidth||0,img.naturalHeight||0]])),
    viewport:{width:layout.cssW,height:layout.cssH},
    uiArtReady,
    opponentHeightNative:OPPONENT_HEIGHT_NATIVE,
    arenaFrame:{left:layout.x,top:layout.y,width:NATIVE.w*layout.scale,height:NATIVE.h*layout.scale},
    halEyeReady:Boolean(images.halEye?.complete&&images.halEye.naturalWidth),
    halEyePosition:currentStage===HAL_STAGE_ID?{...halGaze}:null,
    aiSpeed:match?.cfg.aiSpeed??null,aiStyle:match?.cfg.aiStyle??null,
    playerSkills:match?.cfg.playerSkills??null,aiSkills:match?.cfg.aiSkills??null,
    aiTactic:match?.aiBrain?.tactical?.active?.id??null,
    aiTacticPhase:match?.aiBrain?.tactical?.active?.phase??null,
    aiTacticSelected:match?.aiBrain?.tactical?.selected?.at(-1)??null,
    aiTacticCompleted:match?.aiBrain?.tactical?.completed?.slice()??[],
    aiTacticOverride:debugTactic,
    aiDemoMode,
    paddleOffsets:{...paddleOffsets},
    tableMaskWidth,
    physicsGuidesVisible:physicsGuidesVisible(),
    player:match?{x:match.player.x,z:match.player.z}:null,
    target:match?{x:match.target.x,z:match.target.z}:null}),
  project:(x,z)=>match?project(x,z):null,
  projectedRadius:(x,z,r)=>match?projectedRadius(x,z,r):null,
  spriteGeometry:(type,x,z)=>match?spriteGeometry({x,z},type):null,
  calibration:TABLE_CALIBRATION
});
resize();requestAnimationFrame(frame);
const params=new URLSearchParams(location.search);
if(params.get('skipSplash')==='1'){showMenu();}
else{startStudioLoading();}
// Never unlock future Arcade stages using query-string parameters.