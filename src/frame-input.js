// Distribute the latest mouse target evenly across the fixed physics ticks
// in a rendered frame. At 60 FPS there are usually two 120-Hz ticks; feeding
// the full pointer delta to tick 1 and zero to tick 2 wrongly erases the
// short stroke memory. At 165 FPS there is usually at most one tick.
export function tickFrameInput(match,steps){
 if(!Number.isInteger(steps)||steps<0)throw new RangeError('steps must be a nonnegative integer');
 if(steps===0)return;
 const startX=match.player.x,startZ=match.player.z;
 const goalX=match.target.x,goalZ=match.target.z;
 let inHandover=match.state==='time-transition';
 try{
  for(let i=0;i<steps;i++){
   if(!inHandover){
    const portion=(i+1)/steps;
    match.target.x=startX+(goalX-startX)*portion;
    match.target.z=startZ+(goalZ-startZ)*portion;
   }
   match.tick();
   if(match.state==='time-transition')inHandover=true;
  }
 }finally{
  // A TIME! handover owns paddle motion. Never restore stale mouse targets:
  // otherwise the human paddle jumps back on the first live service tick.
  match.target.x=inHandover?match.player.x:goalX;
  match.target.z=inHandover?match.player.z:goalZ;
 }
}
