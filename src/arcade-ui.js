import {ROSTER,getCharacter,STAT_NAMES} from './roster.js';
import {CAMPAIGN_STORIES,TOWER_STORY,getCampaignPath} from './campaign-story.js';
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','':'&#39;'}[c]??'&#39;'));
const portrait=(person,extra='')=>'<img class="'+extra+'" src="./assets/characters/'+encodeURIComponent(person.id)+'.webp?v=fighters-hd-20261031" alt="Portrait de '+safe(person.name)+'" draggable="false"/>';
function statStrip(person){
 return '<div class="arcade-abilities">'+STAT_NAMES.map((name,i)=>
  '<div class="arcade-ability"><span>'+safe(name)+'</span><div class="arcade-meter" aria-label="'+safe(name)+' : '+person.stats[i]+' sur 5">'+
  Array.from({length:5},(_,n)=>'<i class="'+(n<person.stats[i]?'lit':'')+'"></i>').join('')+
  '</div><strong>'+person.stats[i]+'/5</strong></div>').join('')+'</div>';
}
export function renderHeroSelect(heroId,save){
 const cards=ROSTER.map(person=>{
  const locked=person.id==='2502'&&!save.unlockedHal,chosen=heroId===person.id&&!locked;
  const status=locked?'<span class="arcade-lock">VERROUILLÉ · TERMINE UNE CAMPAGNE</span>':
    save.completed.includes(person.id)?'<span class="arcade-done">CAMPAGNE TERMINÉE ✓</span>':
    save.progress[person.id]>0?'<span class="arcade-progress">REPRISE · COMBAT '+(save.progress[person.id]+1)+'</span>':'';
  return '<button type="button" class="arcade-hero-card'+(chosen?' selected':'')+(locked?' locked':'')+'" data-hero="'+person.id+
   '" aria-label="'+(locked?'HAL verrouillé': 'Incarner '+safe(person.name))+'" aria-pressed="'+chosen+'" '+(locked?'disabled':'')+'>'+
   portrait(person)+'<strong>'+safe(person.name)+'</strong>'+status+'</button>';
 }).join('');
 const hero=getCharacter(heroId);
 const path=getCampaignPath(heroId);
 const route=path.map((id,i)=>'<div class="arcade-route-face" title="Duel '+(i+1)+' : '+safe(getCharacter(id).name)+'">'+
  portrait(getCharacter(id))+'<span>'+String(i+1).padStart(2,'0')+'</span></div>').join('');
 return '<div class="page arcade-select-page"><header class="page-head"><div>'+
  '<p class="eyebrow">ARCADE / LE CIRCUIT DES SEPT</p><h2>CHOISIS TON HÉROS</h2>'+
  '<p class="sub">Chaque personnage possède son histoire, ses forces et ses faiblesses.</p></div>'+
  '<button type="button" class="btn" data-action="menu">← MENU</button></header>'+
  '<section class="arcade-hero-roster" role="group" aria-label="Choix du héros">'+cards+'</section>'+
  '<section class="arcade-selected-info" style="--accent:'+hero.accent+'">'+
  '<div class="arcade-hero-summary">'+portrait(hero)+
  '<div><p class="eyebrow">'+safe(hero.epithet)+'</p><h3>'+safe(hero.name)+'</h3>'+
  '<p class="arcade-story-hook">'+safe(CAMPAIGN_STORIES[heroId].title)+'</p>'+
  '<p class="sub">'+safe(CAMPAIGN_STORIES[heroId].theme)+'</p></div></div>'+
  '<div class="arcade-build"><h4>COMPÉTENCES · 14 / 20</h4>'+statStrip(hero)+'</div>'+
  '<div class="arcade-route"><p class="eyebrow">TON PARCOURS · '+path.length+' COMBATS</p><div class="arcade-route-faces">'+route+'</div>'+
  '<button type="button" class="btn primary" data-action="start-campaign">'+
  (save.progress[heroId]>0?'REPRENDRE LA CAMPAGNE':'COMMENCER LA CAMPAGNE')+'</button></div></section></div>';
}
export function renderVersus(heroId,opponentId,index,progressPercent=0){
 const anonymous=heroId==='player',player=anonymous?null:getCharacter(heroId),rival=getCharacter(opponentId),path=getCampaignPath(heroId);
 return '<div class="versus-screen" style="--player-color:'+(anonymous?'#62d7ff':player.accent)+';--rival-color:'+rival.accent+'">'+
  '<header class="versus-heading"><span>'+(anonymous?'LA TOUR DES MONDES':'LE CIRCUIT DES SEPT')+'</span><strong>DUEL '+String(index+1).padStart(2,'0')+' / '+String(path.length).padStart(2,'0')+'</strong></header>'+
  '<div class="versus-fighters"><div class="versus-fighter versus-player">'+(anonymous?'<div class="versus-anonymous" aria-label="Joueur anonyme">?</div>':portrait(player))+
  '<div class="versus-fighter-caption"><small>'+(anonymous?'JOUEUR ANONYME':'VOUS INCARNEZ')+'</small><strong>'+(anonymous?'VOUS':safe(player.name))+'</strong></div></div>'+
  '<div class="versus-mark" aria-label="versus">VS</div>'+
  '<div class="versus-fighter versus-opponent">'+portrait(rival)+
  '<div class="versus-fighter-caption"><small>'+safe(rival.arena)+'</small><strong>'+safe(rival.name)+'</strong></div></div></div>'+
  '<div class="versus-bottom"><div class="versus-route">'+path.map((id,i)=>
    '<div class="versus-route-card '+(i<index?'done':i===index?'current':'pending')+'">'+
    portrait(getCharacter(id))+'<span>'+String(i+1).padStart(2,'0')+'</span></div>').join('')+'</div>'+
  '<div class="versus-load" role="status">PRÉPARATION DU DUEL <output id="versusProgress">'+progressPercent+'%</output></div></div></div>';
}
export function renderStory(heroId,index){
 const anonymous=heroId==='player',c=anonymous?TOWER_STORY:CAMPAIGN_STORIES[heroId],chapter=c.beats[index],path=getCampaignPath(heroId);
 const rival=getCharacter(path[index]);
 return '<div class="story-terminal">'+
  '<div class="story-header"><span>ABUNDANCE // SYNTHPUCK</span><span>CHAPITRE '+String(index+1).padStart(2,'0')+'/'+String(path.length).padStart(2,'0')+'</span></div>'+
  '<p class="story-campaign">'+(anonymous?'VOUS':safe(getCharacter(heroId).name))+' — '+safe(c.title)+'</p>'+
  (index===0?'<section class="story-prologue"><p class="story-chapter-label">PROLOGUE</p><p>'+safe(c.prologue)+'</p></section>':'')+
  '<section class="story-chapter"><p class="story-chapter-label">ADVERSAIRE : '+safe(rival.name)+'</p>'+
  '<h2>'+safe(chapter[0])+'</h2><p>'+safe(chapter[1])+'</p></section>'+
  '<footer class="story-footer"><span class="story-prepared">RESSOURCES CHARGÉES · 100 %</span>'+
  '<button class="story-pass" type="button" data-action="pass-story">PASSER <span aria-hidden="true">▸</span></button></footer></div>';
}
export function renderEnding(heroId,backButton){
 const anonymous=heroId==='player',story=anonymous?TOWER_STORY:CAMPAIGN_STORIES[heroId];
 return '<div class="story-terminal story-ending"><div class="story-header"><span>'+(anonymous?'TOUR DES MONDES':'CIRCUIT TERMINÉ')+'</span><span>FIN DU PARCOURS</span></div>'+
  '<p class="story-campaign">'+(anonymous?'VOUS':safe(getCharacter(heroId).name))+' — '+safe(story.title)+'</p>'+
  '<section class="story-chapter"><p class="story-chapter-label">ÉPILOGUE</p><h2>'+(anonymous?'SEPT ÉTAGES FRANCHIS':'CHAMPION DU CIRCUIT')+'</h2><p>'+
  safe(story.ending)+'</p></section>'+
  '<footer class="story-footer"><span class="story-prepared">CAMPAGNE TERMINÉE</span>'+backButton+'</footer></div>';
}
