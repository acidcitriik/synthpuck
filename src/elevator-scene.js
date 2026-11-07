// SYNTHPUCK's anonymous delivery driver. Screen art uses the user's approved,
// pixel-aligned 1672 x 941 layers; no procedural changes to opponent stages.
export const PHONE_LINES=Object.freeze([
 "Ouais allo ma chérie?",
 "J'capte rien ici...",
 "Bon si tu m'entends, j'balance la pizza chez le dernier client, je passe prendre le film que tu voulais au vidéoclub et je rentre te rejoindre sous la couette...",
 "Allo...",
 "Bip. Bip...",
 "Relou",
 "Et pourquoi ça s'arrête?"
]);
export const FLOOR_OPPONENTS=Object.freeze(['mute','chonk','simous','mamouda','diamond','stal','2502']);
export const ELEVATOR_AFTER_WIN=Object.freeze({
 1:["C'est quoi ce délire? Chelou la petite."],
 4:["Bon ils vont pas me lâcher ces tarés?!","Je vais tous me les faire!!"]
});
export const ELEVATOR_ON_TRAVEL=Object.freeze({
 2:"C'est pas vrai je veux juste livrer cette pizza."
});
// Atlas 3x3, each cell exactly 366x695 (transparent outside the existing leaf):
// top row = 0,1,2; middle row = 3,4,5; bottom row = 6,7,8.
export const ELEVATOR_ASSETS=Object.freeze({
 cabin:'./assets/elevator/Ascenseur.png?v=updated-cabin-20261106',
 leaves:'./assets/elevator/leaves.avif'
});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function elevatorTarget(level,firstVisit=false){
 if(!Number.isInteger(level)||level<0||level>=FLOOR_OPPONENTS.length)throw RangeError('Invalid Arcade floor');
 return firstVisit&&level===0?8:level+1;
}
// The door already facing the player when an elevator screen is displayed.
// On a saved campaign the next opponent's door is ALREADY in front of us;
// only the very first 01 -> 08 journey requires travelling.
export function elevatorVisibleDoor(floor,firstVisit=false){
 if(!Number.isInteger(floor)||floor<1||floor>8)throw RangeError('Invalid elevator floor');
 return firstVisit?floor:Math.min(8,floor+1);
}
export function elevatorRideRequired(visibleDoor,targetDoor){
 if(!Number.isInteger(visibleDoor)||visibleDoor<1||visibleDoor>8||
    !Number.isInteger(targetDoor)||targetDoor<1||targetDoor>8)
  throw RangeError('Invalid elevator door');
 return visibleDoor!==targetDoor;
}
export function doorAtlasPosition(number){
 if(!Number.isInteger(number)||number<0||number>8)throw RangeError('Invalid door number');
 return {x:number%3*50,y:Math.floor(number/3)*50};
}
function leaf(number,side){
 const {x,y}=doorAtlasPosition(number);
 return '<div class="elevator-leaf elevator-leaf-'+side+'" aria-hidden="true" style="background-position:'+x+'% '+y+'%"></div>';
}
function pair(number,name){
 return '<div class="elevator-door-pair '+name+'" aria-hidden="true">'+leaf(0,'left')+leaf(number,'right')+'</div>';
}
export function renderCinematicLine(line){
 return '<div class="phone-cinematic"><p class="phone-cinematic-line" aria-live="polite">'+esc(line)+'</p>'+
 '<button class="phone-skip" type="button" data-action="skip-cinematic">PASSER LA CINÉMATIQUE ›</button></div>';
}
export function renderPhoneLine(lineIndex){
 if(!Number.isInteger(lineIndex)||lineIndex<0||lineIndex>=PHONE_LINES.length)throw RangeError('Invalid phone line');
 return renderCinematicLine(PHONE_LINES[lineIndex]);
}
export function renderElevator({floor=1,nextFloor=null,doorNumber=null,caption='',firstVisit=false,doorState='closed'}={}){
 if(!Number.isInteger(floor)||floor<1||floor>8)throw RangeError('Invalid elevator number');
 if(nextFloor!==null&&(!Number.isInteger(nextFloor)||nextFloor<1||nextFloor>8))throw RangeError('Invalid incoming floor');
 if(doorNumber!==null&&(!Number.isInteger(doorNumber)||doorNumber<1||doorNumber>8))throw RangeError('Invalid visible door');
 const visibleDoor=doorNumber??elevatorVisibleDoor(floor,firstVisit);
 const allowed=firstVisit?8:Math.min(8,floor+1);
 // A level's lamp goes off ONLY after completing that level. Every future
 // level remains illuminated, even though campaign selection stays sequential.
 const controls=[7,8,5,6,3,4,1,2].map(n=>{
  const completed=!firstVisit&&n<allowed;
  const target=n===allowed;
  return '<button type="button" class="elevator-floor-hit '+(target?'elevator-floor-target ':'')+
   (completed?'elevator-floor-used':'elevator-floor-lit')+
   '" data-elevator-floor="'+n+'" data-floor-light="'+(completed?'off':'on')+
   '" aria-label="Étage '+String(n).padStart(2,'0')+'" title="Étage '+String(n).padStart(2,'0')+
   '" style="--floor-column:'+(n%2===1?0:1)+';--floor-row:'+Math.floor((8-n)/2)+'"></button>';
 }).join('');
 return '<div class="elevator-canvas" data-door-state="'+esc(doorState)+'" data-phase="idle" data-travel="'+(nextFloor===null?'0':'1')+'" data-current-floor="'+floor+'" data-visible-door="'+String(visibleDoor).padStart(2,'0')+'">'+
   '<div class="elevator-light-base" aria-hidden="true"></div>'+
   '<div class="elevator-door-viewport" aria-hidden="true">'+
     pair(visibleDoor,'elevator-pair-current')+
     (nextFloor===null?'':pair(nextFloor,'elevator-pair-incoming'))+
   '</div>'+
   '<img class="elevator-cabin" src="'+ELEVATOR_ASSETS.cabin+'" alt="Intérieur d’un ascenseur, portes métalliques numérotées et tableau de commande" draggable="false"/>'+
   '<canvas class="elevator-lamp-art" aria-hidden="true"></canvas>'+
   '<div class="elevator-controls" role="group" aria-label="Choisir un étage">'+controls+'</div>'+
   '<button class="elevator-service-hit" type="button" data-elevator-service aria-label="Serrure de service"></button>'+
   '<div class="elevator-halo" aria-hidden="true"></div>'+
   '<div class="elevator-dialogue" role="status">'+esc(caption)+'</div>'+
   '<button class="elevator-menu" type="button" data-action="menu">MENU</button>'+
 '</div>';
}
