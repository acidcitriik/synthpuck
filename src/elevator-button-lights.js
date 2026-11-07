// Illuminate the EXISTING photographed cabin buttons in image pixel space.
// No HTML outlines or separate rectangular button graphics: the original cabin
// image provides the shape, metal detail and unchanged colour of finished floors.
// The offscreen canvas is only a transparent recolour overlay for unfinished levels.
const clamp01=v=>Math.max(0,Math.min(1,v));
const FLOOR_GRID=[7,8,5,6,3,4,1,2];
export function elevatorLampRects(width,height,litFloors){
 if(!(width>0&&height>0))throw RangeError('Invalid elevator art size');
 const lit=new Set(litFloors);
 return FLOOR_GRID.filter(floor=>lit.has(floor)).map(floor=>{
  const column=floor%2===1?0:1, row=Math.floor((8-floor)/2);
  // Align the yellow fill INSIDE the photographed button faces. The hit
  // targets remain at their original positions; only the artwork shifts.
  // Corrections are in native 1672×941 image pixels and scale with the image.
  const scaleX=width/1672,scaleY=height/941;
  return {floor,
   cx:(.7418+column*.0363+.0305/2)*width+7*scaleX,
   cy:(.3078+row*.0594+.05/2)*height+9*scaleY,
   halfW:.0305*width*.31,halfH:.05*height*.31};
 });
}
function softRoundedRect(dx,dy,halfW,halfH){
 const r=Math.min(halfW,halfH)*.22;
 const x=Math.abs(dx)-(halfW-r),y=Math.abs(dy)-(halfH-r);
 const distance=Math.hypot(Math.max(x,0),Math.max(y,0))+
  Math.min(Math.max(x,y),0)-r;
 return clamp01((1.3-distance)/2.8);
}
export function paintElevatorButtonLights(img,canvas,litFloors){
 if(!img?.naturalWidth||!img?.naturalHeight||!canvas)return;
 const w=img.naturalWidth,h=img.naturalHeight;
 canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');
 if(!ctx)return;
 ctx.clearRect(0,0,w,h);
 if(!litFloors.length)return;
 const scratch=document.createElement('canvas');
 scratch.width=w;scratch.height=h;
 const srcCtx=scratch.getContext('2d',{willReadFrequently:true});
 if(!srcCtx)return;
 srcCtx.drawImage(img,0,0,w,h);
 let source;
 try{source=srcCtx.getImageData(0,0,w,h).data;}catch{return;}
 const result=ctx.createImageData(w,h),dst=result.data;
 for(const {cx,cy,halfW,halfH} of elevatorLampRects(w,h,litFloors)){
  const left=Math.max(0,Math.floor(cx-halfW-3)),right=Math.min(w,Math.ceil(cx+halfW+3));
  const top=Math.max(0,Math.floor(cy-halfH-3)),bottom=Math.min(h,Math.ceil(cy+halfH+3));
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
   const coverage=softRoundedRect(x+.5-cx,y+.5-cy,halfW,halfH);
   if(!coverage)continue;
   const i=(y*w+x)*4;
   const luminosity=(source[i]*.2126+source[i+1]*.7152+source[i+2]*.0722)/255;
   // Transfer original button surface detail to an amber/yellow palette,
   // instead of painting misaligned flat boxes around the source graphic.
   dst[i]=Math.round(179+76*luminosity);
   dst[i+1]=Math.round(117+105*luminosity);
   dst[i+2]=Math.round(4+30*luminosity);
   dst[i+3]=Math.round(222*coverage*(source[i+3]/255));
  }
 }
 ctx.putImageData(result,0,0);
}
export function mountElevatorButtonLights(frame){
 const image=frame?.querySelector('.elevator-cabin');
 const canvas=frame?.querySelector('.elevator-lamp-art');
 if(!image||!canvas)return;
 const lit=[...frame.querySelectorAll('.elevator-floor-hit[data-floor-light="on"]')]
  .map(b=>Number(b.dataset.elevatorFloor)).filter(Number.isInteger);
 const paint=()=>{if(frame.isConnected)paintElevatorButtonLights(image,canvas,lit);};
 if(image.complete&&image.naturalWidth)paint();
 else image.addEventListener('load',paint,{once:true});
}
