// Public-facing credits are rendered from the same music and SFX metadata
// used by the game's audio director. No hardcoded second list of song titles.
const html=value=>String(value??'').replace(/[&<>"']/g,char=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));
const contexts=Object.freeze({menu:'MENU',mute:'MUTE',chonk:'CHONK',simous:'MUSTACHE',
 mamouda:'MAMOUDA',diamond:'DIAMOND',stal:'STAL','2502':'HAL / 2502'});
function sourceLink(source){
 if(typeof source!=='string'||!/^https:\/\//i.test(source))return '';
 return '<a class="credits-source" href="'+html(source)+'" target="_blank" rel="noopener noreferrer">SOURCE ↗</a>';
}
function entry(context,track){
 return '<article class="credits-entry">'+
  '<span class="credits-context">'+html(context)+'</span>'+
  '<div class="credits-song"><strong>'+html(track.title)+'</strong><span>'+html(track.artist)+'</span>'+
  (track.status==='planned'?'<span class="credits-planned">MUSIQUE PRÉVUE · FICHIER NON ENCORE INTÉGRÉ</span>':'')+'</div>'+
  '<div class="credits-right"><span class="credits-license">'+html(track.license)+'</span>'+sourceLink(track.source)+'</div>'+
 '</article>';
}
export function renderCreditsPage(tracks,sounds,backButton){
 const music=Object.entries(tracks).map(([id,track])=>entry(contexts[id]??id.toUpperCase(),track)).join('');
 const effects=sounds.map(effect=>entry('SFX',effect)).join('');
 return '<div class="page credits-page">'+
  '<header class="page-head"><div><p class="eyebrow">ABUNDANCE GAMES STUDIOS / SYNTHPUCK</p><h2>CREDITS</h2></div>'+backButton+'</header>'+
  '<section class="credits-section"><h3>MUSIQUES</h3>'+
   '<p class="credits-intro">Titres, artistes et licences du jeu. Les morceaux prévus mais non encore fournis sont signalés.</p>'+
   '<div class="credits-list">'+music+'</div></section>'+
  '<section class="credits-section"><h3>BRUITAGES</h3>'+
   '<p class="credits-intro">Effets sonores effectivement utilisés dans le jeu.</p>'+
   '<div class="credits-list">'+effects+'</div></section>'+
  '<section class="credits-section"><h3>CRÉATION</h3>'+
   '<p class="credits-intro">SYNTHPUCK · ABUNDANCE GAMES STUDIOS</p>'+
   '<p class="credits-note">Les musiques et les bruitages restent soumis à leurs licences respectives. Les liens « SOURCE » renvoient aux auteurs ou aux conditions de licence.</p>'+
  '</section></div>';
}
