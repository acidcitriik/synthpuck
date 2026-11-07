import {predictRailX} from './ai.js';

// Intentional multi-step AI tactics. Never changes puck position, velocity,
// friction, paddle motor, or collision math. Only requests reachable paddle
// targets and a contact mode from the *same* production physics engine.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const speed=p=>Math.hypot(p.vx,p.vz);
export const TACTIC_IDS=Object.freeze([
 'rallyBank','straight','cut','crossStraight','under','over','oneTwo','chase',
 'pumpFake','offSpeed','zShot','vShot','centerSlide','sweep',
 'flip','circleFake','oneTimer'
]);
export const TACTIC_DECKS=Object.freeze({
 guard:['straight','offSpeed','oneTimer'],
 bruiser:['straight','crossStraight','under','oneTwo'],
 banker:['rallyBank','under','over','zShot','vShot','chase'],
 rush:['crossStraight','flip','oneTimer','straight'],
 showboat:['rallyBank','pumpFake','circleFake','centerSlide','sweep','cut','offSpeed'],
 erratic:['cut','rallyBank','chase','oneTwo','circleFake','flip','zShot'],
 adaptive:TACTIC_IDS
});
const STEP=(dx,dz,mode='normal',kind='stage')=>({dx,dz,mode,kind});
const strike=(dx,dz,mode='normal')=>STEP(dx,dz,mode,'strike');
// Side means the side of the puck from which the paddle approaches. The
// resulting shots depend on real contact position and stroke speed, so the
// chosen technique is an *attempt*, never a guaranteed goal or bank count.
export function tacticSteps(id,side=1){
 switch(id){
  // The controlled rally has its own dynamic multi-contact state machine.
  case 'rallyBank':return [STEP(.85,.16,'normal','stage'),STEP(-.32,.10,'soft','stage'),strike(-.45,-.38,'rigid')];
  case 'straight':return [STEP(0,.98),strike(0,-.34,'rigid')];
  case 'cut':return [STEP(side*.76,.82),strike(-side*.33,-.27,'grip')];
  case 'crossStraight':return [STEP(side*.36,.96),strike(-side*.37,-.36,'rigid')];
  case 'under':return [STEP(-side*.67,.89),strike(side*.60,-.43,'rigid')];
  case 'over':return [STEP(-side*.76,.94),strike(side*.42,-.18,'soft')];
  case 'oneTwo':return [STEP(side*.45,1.08),strike(-side*.70,-.52,'rigid')];
  case 'chase':return [STEP(-side*.87,.18),strike(side*.53,.04,'soft')];
  case 'pumpFake':return [STEP(side*.60,.87),STEP(side*.68,.58,'normal','fake'),
    STEP(side*.72,.91,'normal','fake'),strike(-side*.30,-.32,'rigid')];
  case 'offSpeed':return [STEP(side*.16,1.18),STEP(side*.14,.79,'normal','fake'),strike(0,-.16,'soft')];
  case 'zShot':return [STEP(-side*.83,.91),strike(side*.70,-.42,'grip')];
  case 'vShot':return [STEP(-side*.71,.96),strike(side*.58,-.18,'grip')];
  case 'centerSlide':return [STEP(-side*.86,.22),strike(side*.42,.04,'soft')];
  case 'sweep':return [STEP(side*.86,.94),STEP(side*.90,.68,'normal','fake'),
    strike(-side*.51,-.35,'grip')];
  case 'flip':return [STEP(side*.37,1.16),STEP(side*.37,.80,'normal','fake'),
    strike(-side*.46,-.36,'rigid')];
  case 'circleFake':return [STEP(side*.93,.77),STEP(side*.95,-.80,'normal','fake'),
    STEP(-side*.94,-.82,'normal','fake'),STEP(-side*.93,.86,'normal','fake'),
    strike(side*.04,-.40,'rigid')];
  case 'oneTimer':return [strike(0,-.35,'rigid')];
  default:throw new RangeError('Unknown air hockey technique: '+id);
 }
}
export function createTacticalMemory(seed=0){
 return {seed,cursor:seed,active:null,cooldownUntil:0,selected:[],completed:[],cancelled:0,human:null};
}
// The AI learns only from the player's real paddle position, not hidden inputs
// or an impossible prediction of a future mouse gesture. Sample once every
// 120 ms, independently of the number of collision substeps.
export function observeHumanPaddle(memory,player,now){
 if(!memory.human){
   memory.human={x:player.x,time:now,lateralSpeed:0,readings:0};
 }else if(now-memory.human.time>=.12){
   const previous=memory.human,elapsed=now-previous.time;
   const observed=clamp((player.x-previous.x)/elapsed,-9,9);
   previous.lateralSpeed=previous.lateralSpeed*.60+observed*.40;
   previous.x=player.x;previous.time=now;previous.readings++;
 }
 return memory.human;
}
// Personality-aware choices, applied *only* when a new safe opportunity
// starts. Never change a running shot every 120-Hz frame.
export function selectTacticalTechnique(style,deck,memory,player){
 const rotation=deck[memory.cursor%deck.length];
 // HAL may use the trend remembered from earlier rallies immediately;
 // other opponents preserve their opening signature move.
 if(memory.selected.length===0&&!(style==='adaptive'&&memory.human?.readings>=3))
   return rotation;
 const drift=memory.human?.lateralSpeed??0;
 const x=player.x;
 if(style==='adaptive'){
   if(Math.abs(drift)>2.1)return 'pumpFake';
   if(Math.abs(x)>1.15)return memory.cursor%2?'crossStraight':'under';
   if(Math.abs(x)<.45&&memory.cursor%3===0)return 'rallyBank';
 }
 if(style==='showboat'&&Math.abs(drift)>1.8)return 'pumpFake';
 if(style==='banker'&&Math.abs(x)>1.3&&rotation==='over')return 'under';
 return rotation;
}
// Switch sides between rounds if the defender is central; when they have
// committed to one edge, favour the opposite scoring lane instead.
export function chooseRallySide(puck,player,memory){
 if(puck.x>.4)return -1;
 if(puck.x<-.4)return 1;
 const base=player.x>=0?1:-1;
 return Math.abs(player.x)>.80?base:(memory.seed%2? -base:base);
}
// A genuine extended possession: a soft lateral touch sends the puck to
// one rail, the AI catches the return on the other side and cushions it back,
// then winds up and attacks diagonally. Every direction change of the puck
// is calculated by the existing motor/collision/rail solver; no puck impulses
// are assigned here. Keep this in the opponent's half and within the 7s rule.
export function chooseControlledRally(puck,ai,player,cfg,active,now){
 const side=active.side;
 const limit=cfg.width/2-cfg.puckRadius;
 const bound=(x,z,mode='normal')=>({
   x:clamp(x,-cfg.width/2+cfg.paddleRadius+.09,cfg.width/2-cfg.paddleRadius-.09),
   z:clamp(z,cfg.paddleRadius+.09,cfg.length/2-cfg.paddleRadius-.09),mode
 });
 if(active.phase==='controlSetup'){
   const target=bound(puck.x+side*.85,puck.z+.16);
   if(Math.hypot(ai.x-target.x,ai.z-target.z)<.13&&speed(ai)<1.2)
     active.phase='controlTap';
   return target;
 }
 if(active.phase==='controlTap')
   return bound(puck.x-side*.32,puck.z+.10,'soft');
 if(active.phase==='controlWall'){
   if(side*puck.x<-(limit-.05)&&side*puck.vx>0){
     active.phase='controlReturn';active.phaseAt=now;
   }
   return bound(side*1.12,puck.z+.06,'soft');
 }
 if(active.phase==='controlReturn')
   return bound(side*1.12,puck.z+.06,'soft');
 if(active.phase==='controlFeint'){
   // DIAMOND briefly retreats off the puck's line, selling a heavy attack
   // before the actual wind-up. This is a real motor movement, not a puck edit.
   if(now-active.phaseAt>.20){
     active.phase='controlCharge';active.phaseAt=now;
   }else return bound(puck.x+side*.95,puck.z+.91);
 }
 if(active.phase==='controlCharge'){
   if(!active.aimLocked){
     // HAL changes its final shot if the defender is already guarding one wing.
     // The decision is locked before the strike; no last-frame aim cheating.
     active.finishType=cfg.aiStyle==='adaptive'&&Math.abs(player.x)>1.25?'direct':'bank';
     active.aimLocked=true;
   }
   const target=bound(puck.x+side*.70,puck.z+.65);
   // Keep the windup visible without chasing a moving puck forever.
   if(Math.hypot(ai.x-target.x,ai.z-target.z)<.24||now-active.phaseAt>active.chargeHold){
     active.phase='controlAttack';active.phaseAt=now;
   }
   return target;
 }
 if(active.phase==='controlAttack')
   return active.finishType==='direct'
     ?bound(puck.x-side*.12,puck.z-.50,'rigid')
     :bound(puck.x-side*.60,puck.z-.45,'rigid');
 return null;
}

// STAL must stop performing misdirection when an observable shot is headed
// for the actual goal mouth. Only physical puck trajectory and rail geometry
// are used; no prediction of a future mouse movement or motor advantage.
export function stalGoalThreat(puck,cfg){
 if(!puck||puck.z<.35||puck.z>=cfg.length/2||puck.vz<=1.6)return null;
 const arrival=(cfg.length/2-puck.z)/puck.vz;
 if(arrival<=0||arrival>1.25)return null;
 if(Math.abs(predictRailX(puck,arrival,cfg))>cfg.goalWidth/2+cfg.puckRadius+.18)return null;
 const minZ=cfg.paddleRadius+.09,maxZ=cfg.length/2-minZ;
 const z=clamp(Math.max(2.65,puck.z+.37),minZ,maxZ);
 const lead=clamp((z-puck.z)/puck.vz,0,arrival);
 return {x:clamp(predictRailX(puck,lead,cfg),
   -cfg.width/2+minZ,cfg.width/2-minZ),z};
}

export function chooseTacticalTarget(puck,ai,player,cfg,brain,now,fallback,remaining=7){
 if(!brain||!cfg.aiStyle)return fallback;
 const memory=brain.tactical??(brain.tactical=createTacticalMemory());
 observeHumanPaddle(memory,player,now);
 // Variant C, STAL only: abandon an unsafe fake and physically return to
 // defence. Keep an actual cooldown so cancelling a trick has a cost.
 // Forced aiTactic diagnostics remain bit-for-bit on their original path.
 const threat=cfg.aiStyle==='erratic'&&!cfg.aiTactic?stalGoalThreat(puck,cfg):null;
 if(threat){
   if(memory.active){
     memory.active=null;memory.cancelled++;
     memory.cooldownUntil=now+.60;
   }
   return {...threat,mode:'normal'};
 }
 const xMax=cfg.width/2-cfg.paddleRadius-.09;
 const zMin=cfg.paddleRadius+.09,zMax=cfg.length/2-zMin;
 const bounded=target=>({
   x:clamp(target.x,-xMax,xMax),z:clamp(target.z,zMin,zMax),
   mode:target.mode??'normal'
 });
 const calm=speed(puck)<1.55;
 const safe=puck.z>1.0&&puck.z<3.45&&Math.abs(puck.x)<1.74;
 let active=memory.active;
 // Do not prepare decorative tricks in a dangerous or unreachable situation.
 // Return to the original interception AI immediately on fast incoming shots.
 if(active&&((puck.z<.5&&!(active.id==='oneTwo'&&active.phase==='recover'))||
   puck.z>4.1||remaining<1.15||
   now-active.started>(active.id==='rallyBank'?5.75:active.phase==='recover'?5.25:3.25)||
   (active.phase==='setup'&&!calm&&speed(puck)>3.4))){

   memory.active=null;memory.cooldownUntil=now+.35;memory.cancelled++;
   active=null;
 }
 if(!active){
   // Campaign-only rest before NEW combos, never an active or first signature move.
   const rest=memory.selected.length?Math.max(0,Number(cfg.aiTacticalRest)||0):0;
   if(now<memory.cooldownUntil+rest||remaining<3.25)return fallback;
   const incoming=puck.z>.4&&puck.vz>1.2&&speed(puck)>2;
   if(incoming&&['rush','adaptive','guard'].includes(cfg.aiStyle)){
     active={id:'oneTimer',started:now,side:player.x>=0?1:-1,step:0,
       phase:'recover',origin:{x:puck.x,z:puck.z},lastX:puck.x,lastZ:puck.z};
     memory.active=active;memory.selected.push('oneTimer');
   }else if(safe&&calm&&Math.hypot(ai.x-puck.x,ai.z-puck.z)<3.5){
     const deck=cfg.aiTactic?[cfg.aiTactic]:(TACTIC_DECKS[cfg.aiStyle]??['straight']);
     const id=cfg.aiTactic??selectTacticalTechnique(cfg.aiStyle,deck,memory,player);
     memory.cursor++;
     const side=id==='rallyBank'?chooseRallySide(puck,player,memory)
       :puck.x>.4?-1:puck.x<-.4?1:player.x>=0?1:-1;
     active={id,started:now,side,style:cfg.aiStyle,step:0,phase:id==='rallyBank'?'controlSetup':'setup',origin:{x:puck.x,z:puck.z},
       chargeHold:cfg.aiStyle==='showboat'&&memory.seed%2===1?.54:cfg.aiStyle==='banker'&&memory.seed%2===1?.38:.45,
       finishType:'bank',
       lastX:puck.x,lastZ:puck.z};
     memory.active=active;memory.selected.push(id);
     // The legacy baseline AI has its own bank setup. Keep it from rearming
     // underneath a multi-step tactic when this plan completes.
     brain.bankAttempts=1;
   }else return fallback;
 }
 if(active.id==='rallyBank'){
   // Do not interfere with dangerous returning volleys or the referee clock.
   if(puck.z<.58||puck.z>3.9||remaining<1.15||
       (active.phase==='controlSetup'&&speed(puck)>2.6)){
     memory.active=null;memory.cooldownUntil=now+.5;memory.cancelled++;
     return fallback;
   }
   return chooseControlledRally(puck,ai,player,cfg,active,now)??fallback;
 }
 if(active.phase==='recover'){
   // A soft first tap in Chase / Center Slide or an opening One-Two
   // is followed by a physically real rebound/interception. No teleport.
   if(active.id==='oneTimer')return bounded({...fallback,mode:'rigid'});
   if(active.id==='oneTwo'&&puck.z<-.3)active.wentAcross=true;
   if(active.id==='chase'&&Math.abs(puck.x)>cfg.width/2-cfg.puckRadius-.07)
     active.sawSideRail=true;
   const returned=active.id==='centerSlide'
     ?Math.abs(puck.x)<.65&&puck.z>.65&&speed(puck)>1
     :active.id==='oneTwo'
       ?active.wentAcross&&puck.z>.8&&puck.vz>1
       :active.sawSideRail&&puck.z>.75&&speed(puck)>.5;
   if(returned){
     active.phase='finish';active.started=now;
   }
   return bounded({...fallback,mode:'normal'});
 }
 if(active.phase==='finish'){
   // One-timer after the real prelude/band return.
   return bounded({...fallback,mode:'rigid'});
 }
 const steps=tacticSteps(active.id,active.side);
 const step=steps[Math.min(active.step,steps.length-1)];
 if(step.kind!=='strike'&&now-active.started>.35){
   // Abort a plan rather than waiting for a motionless setup forever.
   if(Math.hypot(ai.x-(puck.x+step.dx),ai.z-(puck.z+step.dz))<.16&&
     speed(ai)<1.3){
     active.step++;
     active.started=now;
   }
 }
 const current=steps[Math.min(active.step,steps.length-1)];
 if(current.kind==='strike'&&now-active.started>1.0){
   memory.active=null;memory.cancelled++;memory.cooldownUntil=now+.30;
   return fallback;
 }
 // Keep the moving puck as the local anchor while it drifts slowly. Fast
 // incoming pucks cancel planning above; we never try to trap a live attack.
 return bounded({x:puck.x+current.dx,z:puck.z+current.dz,mode:current.mode});
}
// Called ONLY after a real, reportable paddle/puck collision.
export function registerTacticalHit(brain,puck,now){
 const memory=brain?.tactical,active=memory?.active;
 if(!active)return null;
 const id=active.id;
 if(id==='rallyBank'){
   if(active.phase==='controlTap'){
     active.phase='controlWall';active.phaseAt=now;
     return {id,stage:'first-lateral-control'};
   }
   if(active.phase==='controlReturn'){
     active.phase=memory.seed%2===1&&active.style==='showboat'&&puck.z>1.65
       ?'controlFeint':'controlCharge';
     active.phaseAt=now;
     return {id,stage:'second-lateral-control'};
   }
   if(active.phase==='controlAttack'){
     memory.completed.push(id);memory.active=null;
     memory.cooldownUntil=now+.85;
     return {id,stage:'diagonal-bank-attempt'};
   }
   return null;
 }
 if(id==='oneTwo'||id==='chase'||id==='centerSlide'){
   if(active.phase==='recover')return null;
   if(active.phase!=='finish'){
     active.phase='recover';active.started=now;active.step=0;
     return {id,stage:'first'};
   }
 }
 memory.completed.push(id);
 memory.active=null;
 memory.cooldownUntil=now+.45;
 return {id,stage:'finish'};
}
