import {getCampaignPath} from './campaign-story.js';

// A character keeps its physical abilities and tactical identity.
// Campaign rank only changes perception, precision and the interval between
// NEW multi-step tactics; puck/motor physics are never modified.
export const CAMPAIGN_SKILL_LIMITS=Object.freeze({
 first:Object.freeze({decisionSeconds:.22,aimError:.24,tacticalRest:1.5}),
 last:Object.freeze({decisionSeconds:.016,aimError:0,tacticalRest:0})
});
const lerp=(a,b,t)=>a+(b-a)*t;
export function campaignExecutionConfig(heroId,roundIndex){
 const path=getCampaignPath(heroId);
 if(!Number.isInteger(roundIndex)||roundIndex<0||roundIndex>=path.length)
   throw new RangeError('Invalid campaign duel rank: '+roundIndex);
 const t=path.length===1?1:roundIndex/(path.length-1);
 const first=CAMPAIGN_SKILL_LIMITS.first,last=CAMPAIGN_SKILL_LIMITS.last;
 return {
  aiDecisionDelay:lerp(first.decisionSeconds,last.decisionSeconds,t),
  aiAimError:lerp(first.aimError,last.aimError,t),
  aiTacticalRest:lerp(first.tacticalRest,last.tacticalRest,t),
  aiCampaignRank:roundIndex+1,
  aiCampaignTotal:path.length
 };
}
