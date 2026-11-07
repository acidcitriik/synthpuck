// Visual-only rendering profile: the physics tick and native coordinates never change.
export function selectRenderQuality({requested='auto',hardwareConcurrency=8,deviceMemory=Infinity}={}){
 const mode=['auto','fast','high'].includes(requested)?requested:'auto';
 const slowCPU=Number.isFinite(hardwareConcurrency)&&hardwareConcurrency<=4;
 const lowRAM=Number.isFinite(deviceMemory)&&deviceMemory<=4;
 const fast=mode==='fast'||(mode==='auto'&&(slowCPU||lowRAM));
 return Object.freeze({mode:fast?'fast':'high',requested:mode,dprCap:fast?1:2,shadows:!fast,smoothing:fast?'medium':'high'});
}
