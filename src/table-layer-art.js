// Synthpuck table layers: lossless, native-resolution pixel processing only.
// Source PNGs remain untouched. Never generate, resize or recompress source art.
export const TABLE_LAYER_FILES=Object.freeze({
 play:'./assets/stages/table/TablePlay.png',
 tour:'./assets/stages/table/TableTour.png',
 goal:'./assets/stages/table/TableGoal.png',
 front:'./assets/stages/table/TableFront.png'
});
export const TABLE_NEON_COLORS=Object.freeze({
 mute:null,                                      // Original blue artwork
 stal:Object.freeze([42,255,61,1]),             // Green
 mamouda:Object.freeze([255,42,48,1]),          // Red
 chonk:Object.freeze([194,103,38,.87]),         // Brown/copper
 diamond:Object.freeze([181,66,255,1]),         // Violet
 simous:Object.freeze([255,219,22,1]),          // Yellow (MUSTACHE)
 '2502':Object.freeze([146,22,54,.87])          // Bordeaux (HAL)
});
const clamp01=x=>Math.min(1,Math.max(0,x));
const ellipsis=(x,y,cx,cy,rx,ry)=>{
 const d=((x-cx)/rx)**2+((y-cy)/ry)**2;
 return d>=1?0:(1-d)**2;
};
// Restore the original navy floor under the two white, moon-like glare streaks.
// Unlike image generation/inpainting this is deterministic, selective RGB filtering;
// original texture, perspective, alpha and the rest of the PNG are preserved.
export function removeMoonReflection(pixels,width,height){
 if(width!==1672||height!==941)throw Error('TablePlay must retain native 1672x941 dimensions');
 for(let y=430;y<810;y++)for(let x=230;x<1450;x++){
  const left=ellipsis(x,y,380,686,150,250);
  const right=ellipsis(x,y,1280,686,150,250);
  const region=Math.max(left,right);
  if(!region)continue;
  const i=(y*width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
  if(!pixels[i+3])continue;
  // Blue LEDs remain blue; only the neutral almost-white flare is removed.
  const light=clamp01((r-44)/120)*clamp01((g-75)/110)*clamp01((b-100)/110);
  const strength=Math.min(.96,region*light*1.45);
  if(!strength)continue;
  const baseR=r*.16+4,baseG=g*.43+12,baseB=b*.63+18;
  pixels[i]=Math.round(r+(baseR-r)*strength);
  pixels[i+1]=Math.round(g+(baseG-g)*strength);
  pixels[i+2]=Math.round(b+(baseB-b)*strength);
 }
 return pixels;
}
export function tintNeonPixels(pixels,colour){
 if(!colour)return pixels;
 const [red,green,blue,brightness]=colour,peak=Math.max(red,green,blue);
 const rr=red/peak,gg=green/peak,bb=blue/peak;
 for(let i=0;i<pixels.length;i+=4){
  if(!pixels[i+3])continue;
  const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
  const mask=clamp01((b-r-7)/44)*clamp01((b-g+16)/40);
  if(!mask)continue;
  const floor=Math.min(r,g,b),light=(Math.max(r,g,b)-floor)*brightness;
  pixels[i]=Math.round(r+(floor+light*rr-r)*mask);
  pixels[i+1]=Math.round(g+(floor+light*gg-g)*mask);
  pixels[i+2]=Math.round(b+(floor+light*bb-b)*mask);
 }
 return pixels;
}
// TableFront is the colour reference for every stage. Colour the cyan/blue
// details on TableTour using EXACTLY the same pixel transfer function as
// TableFront, instead of leaving blue metal/reflections alongside tinted front
// pieces. Neutral metal stays neutral, while original shading and alpha remain.
export function tintTourNeonPixels(pixels,width,height,colour){
 if(width!==1672||height!==941)throw Error('TableTour must retain native 1672x941 dimensions');
 return tintNeonPixels(pixels,colour);
}

export function processTableImage(source,kind,stage){
 if(!Object.hasOwn(TABLE_LAYER_FILES,kind))throw Error('Unknown table layer: '+kind);
 if(!Object.hasOwn(TABLE_NEON_COLORS,stage))throw Error('Unknown table colour: '+stage);
 if(!source?.naturalWidth||!source?.naturalHeight)return null;
 if(source.naturalWidth!==1672||source.naturalHeight!==941)throw Error('Misaligned table PNG: '+kind);
 // The actual goal asset is kept pixel-for-pixel, without an unnecessary tint.
 if(kind==='goal')return source;
 if(kind!=='play'&&!TABLE_NEON_COLORS[stage])return source;
 const canvas=document.createElement('canvas');
 canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(source,0,0);
 const image=ctx.getImageData(0,0,canvas.width,canvas.height);
 if(kind==='play')removeMoonReflection(image.data,canvas.width,canvas.height);
 // Match TableTour's blue/cyan material to TableFront's existing stage palette.
 if(kind==='tour')tintTourNeonPixels(image.data,canvas.width,canvas.height,TABLE_NEON_COLORS[stage]);
 else tintNeonPixels(image.data,TABLE_NEON_COLORS[stage]);
 ctx.putImageData(image,0,0);
 return canvas;
}
