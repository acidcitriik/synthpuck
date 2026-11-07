// Four independent loudness controls. 100% preserves Synthpuck's original mix.
export const DEFAULT_AUDIO_SETTINGS=Object.freeze({
  gameMusic:100,gameEffects:100,menuMusic:100,menuEffects:100
});
export const AUDIO_VOLUME_FIELDS=Object.freeze([
  Object.freeze({key:'gameMusic',label:'Musique en jeu'}),
  Object.freeze({key:'gameEffects',label:'Effets en jeu'}),
  Object.freeze({key:'menuMusic',label:'Musique des menus'}),
  Object.freeze({key:'menuEffects',label:'Effets des menus'})
]);
export function normalizeAudioSettings(value){
  const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const normalized={...DEFAULT_AUDIO_SETTINGS};
  for(const key of Object.keys(DEFAULT_AUDIO_SETTINGS)){
    const raw=source[key];
    if(raw===undefined||raw===null||raw==='')continue;
    const number=Number(raw);
    if(Number.isFinite(number))normalized[key]=Math.round(Math.max(0,Math.min(100,number)));
  }
  return normalized;
}
export function audioSettingsStorageKey(userId=null){
  return 'synthpuck.audioSettings.'+(userId?'user.'+userId:'guest');
}
export function readLocalAudioSettings(storage,userId=null){
  try{
    const stored=storage?.getItem(audioSettingsStorageKey(userId));
    return stored==null?normalizeAudioSettings():normalizeAudioSettings(JSON.parse(stored));
  }catch{return normalizeAudioSettings();}
}
export function writeLocalAudioSettings(storage,userId,settings){
  try{
    storage?.setItem(audioSettingsStorageKey(userId),JSON.stringify(normalizeAudioSettings(settings)));
    return true;
  }catch{return false;}
}
