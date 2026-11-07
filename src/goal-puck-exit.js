// Visual-only continuation after a scored goal. The Match/physics puck stops as
// before; this never modifies positions, velocities, collisions, points or timers.
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));

export function beginGoalPuckExit(puck,cfg,now){
 if(!puck||!Number.isFinite(puck.x)||!Number.isFinite(puck.z)||
    !Number.isFinite(puck.vx)||!Number.isFinite(puck.vz)||
    !Number.isFinite(cfg.length)||!Number.isFinite(cfg.puckRadius))return null;
 const side=puck.vz>0?1:puck.vz<0?-1:puck.z>=0?1:-1;
 const targetZ=side*(cfg.length/2+cfg.puckRadius*2+.42);
 const distance=Math.max(0,side*(targetZ-puck.z));
 // Visible for multiple frames at 60Hz even for fast shots; slow goals still
 // disappear well before the unchanged GOAL/SMASH splash has finished.
 const durationMs=clamp(distance/Math.max(2.5,Math.abs(puck.vz))*1000,190,480);
 const slope=puck.vx/Math.max(1,Math.abs(puck.vz));
 const targetX=clamp(puck.x+distance*slope,
  -cfg.goalWidth/2+cfg.puckRadius,cfg.goalWidth/2-cfg.puckRadius);
 return Object.freeze({
  start:Object.freeze({...puck}),targetZ,targetX,side,startedAt:now,durationMs
 });
}

export function sampleGoalPuckExit(exit,now){
 if(!exit)return null;
 const t=clamp((now-exit.startedAt)/exit.durationMs,0,1);
 if(t>=1)return null;
 const p=exit.start;
 // Full opacity until the puck has travelled entirely under the end lip;
 // only the short remaining section fades away.
 const opacity=t<=.82?1:clamp((1-t)/.18,0,1);
 return {
  ...p,
  x:p.x+(exit.targetX-p.x)*t,
  z:p.z+(exit.targetZ-p.z)*t,
  angle:(p.angle??0)+(p.spin??0)*t*exit.durationMs/1000,
  goalExit:true,opacity
 };
}
