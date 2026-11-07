// Canvas 2D projection of a luminous in-table display, without switching renderers.
// All coordinates are measured in real table units and use the existing calibrated
// project() transform. The painted background remains visible below the translucent
// illuminated surface, retaining its scratches and gloss.
const W=768,H=1200;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
const images={};
let contentCache=null,contentKey='',backing=null,backingCtx=null;
let projectedCache=null,projectedKey='',projectedCtx=null;

export function preloadTableSplashImages(files){
  for(const [kind,src] of Object.entries(files)){
    if(images[kind])continue;
    const img=new Image();
    img.decoding='async';
    img.src=src;
    img.onload=()=>{contentKey='';projectedKey='';};
    images[kind]=img;
  }
}
function getBuffer(){
  if(!backing){
    backing=document.createElement('canvas');
    backing.width=W;backing.height=H;
    backingCtx=backing.getContext('2d',{alpha:true});
  }
  return backing;
}
function fillTexture(ctx){
  // Preserve texture scars, never paint new dark holes over the artwork.
  ctx.save();
  let seed=17461;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let k=0;k<33;k++){
    const x=25+random()*(W-50),y=36+random()*(H-72);
    const length=15+random()*180,angle=(random()-.5)*.35;
    ctx.strokeStyle=k%3?'rgba(56,81,99,.12)':'rgba(255,255,255,.32)';
    ctx.lineWidth=k%7===0?1.8:.65;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(angle)*length,y+Math.sin(angle)*length);ctx.stroke();
  }
  ctx.restore();
}
function scorePlate(ctx,{y,num,label,accent}){
  const x=W/2;
  ctx.save();
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='rgba(30,55,74,.10)';
  ctx.beginPath();ctx.roundRect(x-132,y-63,264,123,16);ctx.fill();
  ctx.fillStyle='#243749';ctx.font='900 83px Impact, "Arial Black", sans-serif';
  ctx.fillText(String(num),x,y-4);
  ctx.font='800 23px Rajdhani, Arial, sans-serif';
  ctx.fillStyle='#30495a';ctx.fillText(label,x,y+48);
  ctx.fillStyle=accent;ctx.fillRect(x-90,y+59,180,5);
  ctx.restore();
}
// The game table shows the signed-in profile nickname, not the chosen fighter.
// Keep Unicode code points intact when shortening the displayed name.
export function playerScoreLabel(auth){
 if(!auth?.user)return 'Player';
 const nickname=auth.profile?.nickname||auth.user.user_metadata?.nickname||'Player';
 const short=Array.from(String(nickname).trim()).slice(0,10).join('');
 return short||'Player';
}
function paintInfoTexture(match,kind,reason,opponentName,playerName){
  getBuffer();
  const c=backingCtx;c.clearRect(0,0,W,H);
  fillTexture(c);
  scorePlate(c,{y:116,num:match.scores[1],label:opponentName||'ADVERSAIRE',accent:'#ff607e'});
  scorePlate(c,{y:1072,num:match.scores[0],label:playerName,accent:'#2b93b3'});
  if(kind){
    const splash=images[kind];
    if(splash?.complete && splash.naturalWidth){
      c.save();
      c.shadowColor='rgba(12,22,35,.38)';c.shadowBlur=18;
      c.drawImage(splash,22,420,W-44,310);
      c.restore();
    }else{
      c.save();c.textAlign='center';c.textBaseline='middle';
      c.font='900 120px Impact, "Arial Black", sans-serif';
      c.lineWidth=12;c.strokeStyle='#142335';c.strokeText(kind==='time'?'TIME!':kind.toUpperCase(),W/2,586);
      c.fillStyle='#ef4d57';c.fillText(kind==='time'?'TIME!':kind.toUpperCase(),W/2,586);c.restore();
    }
    if(kind==='time'){
      c.save();
      c.font='900 34px Rajdhani, Arial, sans-serif';
      c.textAlign='center';
      c.fillStyle='#b62b48';
      c.fillText(reason==='return'?'7 SECONDES':'10 SECONDES',W/2,730);
      c.restore();
    }
  }
  contentCache=backing;
}
// Visual inner LED-rail boundaries in the original 1672x941 artwork.
// The prior (643 to 260) mask left 25-40px-wide magenta wedges.
// Both TablePlay and the white backlight now use these same corners.
// Physics/collision coordinates are deliberately not modified.
export const TABLE_SCREEN_NATIVE_CORNERS=Object.freeze([
  Object.freeze([617,409]),   // far left, inside illuminated rail
  Object.freeze([1055,409]),  // far right
  Object.freeze([1452,806]),  // near right, behind the metal front lip
  Object.freeze([220,806])    // near left, behind the metal front lip
]);
// Horizontal adjustment of the white mask in native pixels per side.
// The underlying painted table and physical collision space never move.
export const TABLE_MASK_WIDTH_MIN=-80;
export const TABLE_MASK_WIDTH_MAX=160;
export const TABLE_MASK_WIDTH_DEFAULT=10;
export function normalizeTableMaskWidth(value,fallback=0){
 const n=Number(value);
 return Number.isFinite(n)
  ?Math.max(TABLE_MASK_WIDTH_MIN,Math.min(TABLE_MASK_WIDTH_MAX,Math.round(n)))
  :fallback;
}
export function tableScreenMaskCorners(width=0){
 const offset=normalizeTableMaskWidth(width);
 return TABLE_SCREEN_NATIVE_CORNERS.map(([x,y],i)=>[x+(i===0||i===3?-offset:offset),y]);
}
function tablePath(ctx,layout,maskWidth=0){
 ctx.beginPath();
 for(const [i,[x,y]] of tableScreenMaskCorners(maskWidth).entries()){
  const px=layout.x+x*layout.scale,py=layout.y+y*layout.scale;
  if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
 }
 ctx.closePath();
}
function projectStrips(ctx,texture,match,project){
  const halfW=match.cfg.width/2-.10,halfL=match.cfg.length/2-.12;
  const strips=80;
  for(let i=0;i<strips;i++){
    const v0=Math.floor(H*i/strips),v1=Math.ceil(H*(i+1)/strips);
    const z0=halfL-(2*halfL)*(i/strips);
    const z1=halfL-(2*halfL)*((i+1)/strips);
    const lt=project(halfW,z0),rt=project(-halfW,z0);
    const lb=project(halfW,z1),rb=project(-halfW,z1);
    const top=(lt.y+rt.y)/2,bottom=(lb.y+rb.y)/2;
    if(bottom<=top)continue;
    // Per-row affine resampling is visually equivalent to the calibrated
    // projective warp at the 80-row resolution (including its centre correction).
    const left=(lt.x+lb.x)/2,right=(rt.x+rb.x)/2;
    const overlap=.40;
    ctx.drawImage(texture,0,v0,W,v1-v0,left,top-overlap,right-left,bottom-top+2*overlap);
  }
}
export function paintTableScreen(ctx,{match,project,layout,power=1,maskWidth=0,announcement=null,opponentName='ADVERSAIRE',playerName='Player'}){
  if(!match||power<=0)return;
  const strength=smooth(power);
  maskWidth=normalizeTableMaskWidth(maskWidth);
  ctx.save();
  // A milky backlit layer still lets the original illustration's material
  // scratches, original perforations and bright specular streaks show through.
  tablePath(ctx,layout,maskWidth);ctx.clip();
  const a=.75*strength;
  const top=project(0,match.cfg.length/2-.10);
  const bottom=project(0,-match.cfg.length/2+.10);
  const gradient=ctx.createLinearGradient(0,top.y,0,bottom.y);
  gradient.addColorStop(0,`rgba(228,245,255,${a*.90})`);
  gradient.addColorStop(.43,`rgba(250,252,255,${a})`);
  gradient.addColorStop(1,`rgba(234,247,255,${a*.96})`);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
  // Tiny specular wash reinforces the glass without obscuring the painted marks.
  ctx.restore();
  const kind=match.state==='time-transition'?'time':announcement?.kind??null;
  const reason=match.timeTransition?.reason??null;
  const key=match.scores.join(':')+'|'+kind+'|'+reason+'|'+opponentName+'|'+playerName;
  if(key!==contentKey||!contentCache){
    paintInfoTexture(match,kind,reason,opponentName,playerName);
    contentKey=key;projectedKey='';
  }
  // Perspective warp is expensive on CPU/software-rendered mobile browsers.
  // Rasterize it ONLY when text, image, scoreboard, or viewport changes.
  // Normal frames now composite a single cached translucent canvas.
  const viewportKey=key+'|'+layout.cssW+'x'+layout.cssH+'@'+layout.dpr+
    '|'+match.cfg.width+'x'+match.cfg.length+'|mask='+maskWidth;
  if(!projectedCache||projectedKey!==viewportKey){
    if(!projectedCache)projectedCache=document.createElement('canvas');
    const width=Math.round(layout.cssW*layout.dpr);
    const height=Math.round(layout.cssH*layout.dpr);
    if(projectedCache.width!==width||projectedCache.height!==height){
      projectedCache.width=width;projectedCache.height=height;
    }
    if(!projectedCtx)projectedCtx=projectedCache.getContext('2d',{alpha:true});
    const off=projectedCtx;
    off.setTransform(1,0,0,1,0,0);
    off.clearRect(0,0,width,height);
    off.setTransform(layout.dpr,0,0,layout.dpr,0,0);
    off.save();tablePath(off,layout,maskWidth);off.clip();
    projectStrips(off,contentCache,match,project);
    off.restore();
    projectedKey=viewportKey;
  }
  ctx.save();ctx.globalAlpha=strength;
  ctx.drawImage(projectedCache,0,0,layout.cssW,layout.cssH);
  ctx.restore();
}
