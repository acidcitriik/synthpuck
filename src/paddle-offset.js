// Fine-tuning in NATIVE stage pixels (1672×941), independent of the viewport.
// Zero centres the painted contact disk on its real collider.
// Custom shifts remain available for optional manual calibration.
export const DEFAULT_PADDLE_OFFSETS=Object.freeze({player:0,ai:0});
export const OFFSET_MIN=-60;
export const OFFSET_MAX=90;
export function normalizePaddleOffset(value, fallback=0){
 const n=Number(value);
 return Number.isFinite(n)?Math.min(OFFSET_MAX,Math.max(OFFSET_MIN,Math.round(n))):fallback;
}
export function offsetSpriteY(y,type,layoutScale,offsets){
 if(type!=='player'&&type!=='ai')return y;
 return y+normalizePaddleOffset(offsets[type]??0)*layoutScale;
}
