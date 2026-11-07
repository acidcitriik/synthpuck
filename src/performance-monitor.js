// Lightweight, opt-in performance diagnostics. Never affects physics or controls.
export function createPerformanceCounter(){
 let from=0,frames=0,slow=0,inputs=0,steps=0,activeSeconds=0,droppedSeconds=0;
 let last={fps:0,physicsHz:0,mouseHz:0,slowPercent:0,droppedMs:0};
 return {
  mouse(){inputs++;},
  frame(time,{elapsedSeconds=0,simulating=false,physicsSteps=0,droppedTime=0}={}){
   if(!from){from=time;return null;}
   frames++;
   if(elapsedSeconds>.025)slow++;
   if(simulating){
    activeSeconds+=elapsedSeconds;
    steps+=physicsSteps;
    droppedSeconds+=droppedTime;
   }
   const windowSeconds=(time-from)/1000;
   if(windowSeconds>=1){
    last={
     fps:Math.round(frames/windowSeconds),
     physicsHz:activeSeconds>0?Math.round(steps/activeSeconds):0,
     mouseHz:Math.round(inputs/windowSeconds),
     slowPercent:Math.round(100*slow/frames),
     droppedMs:Math.round(droppedSeconds*1000)
    };
    from=time;frames=0;slow=0;inputs=0;steps=0;activeSeconds=0;droppedSeconds=0;
    return last;
   }
   return null;
  },
  snapshot(){return {...last};}
 };
}
export function createPerformanceOverlay(documentRef){
 const node=documentRef.createElement('output');
 node.id='synthpuckPerformance';
 node.setAttribute('aria-label','Diagnostic de fluidité');
 node.style.cssText='position:fixed;right:8px;bottom:8px;z-index:9;pointer-events:none;background:rgba(3,8,20,.9);color:#b9ffdf;padding:7px 9px;border:1px solid #607a7a;border-radius:4px;font:12px monospace;white-space:pre;line-height:1.35';
 node.textContent='Mesure de fluidité…';
 documentRef.body.appendChild(node);
 return (v,quality)=>{
  node.textContent=v.fps+' FPS | physique '+(v.physicsHz||'—')+' Hz\n'
    +'souris '+v.mouseHz+' év/s | '+v.slowPercent+' % images lentes\n'
    +'temps perdu '+v.droppedMs+' ms/s | rendu '+quality;
 };
}
