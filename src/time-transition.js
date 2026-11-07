// Deterministic, collision-free visual handover after the 7s/10s TIME! foul.
// The match uses this state instead of teleporting the puck and paddles.
// Gameplay collisions and timers are suspended while this animation runs.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>{const x=clamp(t,0,1);return x*x*(3-2*x);};
const distanceToSegment=(p,a,b)=>{
  const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
  const t=len>1e-8?clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/len,0,1):0;
  return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
};
const samplePositions=(p,side,cfg)=>{
  const margin=cfg.paddleRadius+.08,halfW=cfg.width/2-margin;
  const zMin=side===-1?-cfg.length/2+margin:margin/2;
  const zMax=side===-1?-margin/2:cfg.length/2-margin;
  const candidates=[{x:clamp(p.x,-halfW,halfW),z:clamp(p.z,zMin,zMax)}];
  // Prefer a small sideways sidestep, rather than recentering the paddle.
  for(let i=0;i<=32;i++){
    const x=-halfW+(halfW*2)*i/32;
    for(const offset of [0,-.3,.3,-.7,.7,-1,1,-1.6,1.6]){
      candidates.push({x,z:clamp(p.z+offset,zMin,zMax)});
    }
  }
  return candidates;
};
export function planTimeTransition(match,server,duration=1.3){
  const {cfg,puck,player,ai}=match;
  if(server!==-1&&server!==1)throw Error('TIME handover needs a player side');
  const startPuck={x:puck.x,z:puck.z};
  const receiver=server===-1?player:ai;
  const xLimit=cfg.width/2-cfg.paddleRadius-cfg.puckRadius-.2;
  // The puck is placed in front of its new owner's *actual* paddle,
  // not automatically on the centre axis after every foul.
  const endPuck={x:clamp(receiver.x,-xLimit,xLimit),z:server*2.35};
  const gap=cfg.paddleRadius+cfg.puckRadius+.18;
  const starts={player:{x:player.x,z:player.z},ai:{x:ai.x,z:ai.z}};
  function clearPaddle(which,side){
    const p=starts[which];
    const choices=samplePositions(p,side,cfg);
    if(side===server){
      const servingZ=endPuck.z+side*(gap+.12);
      const margin=cfg.paddleRadius+.08;
      choices.push({x:clamp(p.x,-cfg.width/2+margin,cfg.width/2-margin),
        z:clamp(servingZ,side===-1?-cfg.length/2+margin:margin/2,
          side===-1?-margin/2:cfg.length/2-margin)});
    }
    let best=null,bestCost=Infinity;
    for(const q of choices){
      // Server must stay behind the stationary puck, so contact is deliberate.
      if(side===server&&(side===-1?q.z>endPuck.z-gap:q.z<endPuck.z+gap))continue;
      const segmentDistance=distanceToSegment(q,startPuck,endPuck);
      if(segmentDistance<gap+.06)continue;
      const cost=Math.hypot(q.x-p.x,q.z-p.z)+(Math.abs(q.z-p.z)*.12);
      if(cost<bestCost){best=q;bestCost=cost;}
    }
    if(best)return best;
    // If the moving puck sweeps an entire paddle camp, park safely near its goal.
    const rear=side===-1?-cfg.length/2+cfg.paddleRadius+.08:
      cfg.length/2-cfg.paddleRadius-.08;
    const left={x:-cfg.width/2+cfg.paddleRadius+.08,z:rear};
    const right={x:-left.x,z:rear};
    return Math.hypot(left.x-p.x,left.z-p.z)<Math.hypot(right.x-p.x,right.z-p.z)?left:right;
  }
  return {
    server,duration,elapsed:0,startPuck,endPuck,starts,
    ends:{player:clearPaddle('player',-1),ai:clearPaddle('ai',1)}
  };
}
export function advanceTimeTransition(match,dt){
  const t=match.timeTransition;
  if(!t)return true;
  t.elapsed=Math.min(t.duration,t.elapsed+Math.max(0,dt));
  const ratio=t.elapsed/t.duration;
  // Move obstructions out of the way before the puck reaches their path.
  const paddleProgress=ease(ratio/.46);
  for(const who of ['player','ai']){
    const a=t.starts[who],b=t.ends[who],p=match[who];
    p.x=a.x+(b.x-a.x)*paddleProgress;
    p.z=a.z+(b.z-a.z)*paddleProgress;
    p.vx=0;p.vz=0;
  }
  const puckProgress=ease((ratio-.28)/.72),p=match.puck;
  p.x=t.startPuck.x+(t.endPuck.x-t.startPuck.x)*puckProgress;
  p.z=t.startPuck.z+(t.endPuck.z-t.startPuck.z)*puckProgress;
  p.vx=0;p.vz=0;p.spin=0;p.smashActive=false;
  if(ratio>=1){
    // Snap only the final floating-point residue, never a visible distance.
    // This prevents 2.3500000000000005 from reaching snapshot/physics tests.
    p.x=t.endPuck.x;p.z=t.endPuck.z;
    for(const who of ['player','ai']){
      match[who].x=t.ends[who].x;match[who].z=t.ends[who].z;
    }
  }
  match.target.x=match.player.x;
  match.target.z=match.player.z;
  return ratio>=1;
}
