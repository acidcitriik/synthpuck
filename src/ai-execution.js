import {chooseCharacterAITarget} from './ai-profiles.js?v=stal-defense-c-20261105';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// Optional campaign-only reaction/precision layer around the unchanged
// character brain. Holding a target briefly makes the first ranks less
// anticipatory, while the final rival updates nearly every simulation tick.
// Never modifies puck, motor, collisions or legal playing area.
export function chooseCampaignAITarget(puck,ai,player,cfg,brain,now){
 const interval=Math.max(0,Number(cfg.aiDecisionDelay)||0);
 const spread=Math.max(0,Number(cfg.aiAimError)||0);
 if(!brain || (interval===0 && spread===0))
   return chooseCharacterAITarget(puck,ai,player,cfg,brain,now);
 if(brain.execution?.target && now<brain.execution.nextAt)
   return brain.execution.target;
 const target=chooseCharacterAITarget(puck,ai,player,cfg,brain,now);
 const seed=brain.tactical?.seed??0;
 // Deterministic, observable-state-only aim drift. The character's personal
 // multi-step tactics may still override this baseline interception target.
 const offset=spread*(.70*Math.sin(now*3.1+puck.x*1.7+seed*.9+1.1)
                     +.30*Math.cos(now*1.3-puck.z*.8+seed*.6));
 const bound=cfg.width/2-cfg.paddleRadius-.08;
 const command={...target,x:clamp(target.x+offset,-bound,bound)};
 brain.execution={target:command,nextAt:now+interval};
 return command;
}
