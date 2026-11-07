// Restore the intermittent neon animation from the original Mamouda arena.
// This only affects the painted background; gameplay geometry is untouched.
export function mamoudaNeonOpacity(timeSeconds,reducedMotion=false){
 if(reducedMotion)return 1;
 const phase=((Number(timeSeconds)||0)%13+13)%13;
 if(phase<.18)return 0;
 if(phase<.30)return 1;
 if(phase<.52)return 0;
 if(phase>8.70&&phase<8.90)return .15;
 return 1;
}
