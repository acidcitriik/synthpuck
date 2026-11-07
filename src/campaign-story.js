// Narrative campaign data. All seven heroes have a personal six- or seven-fight route.
// The locked HAL run alone allows a mirror match in its final RED CORE arena.
// One anonymous player traverses the Tower; ZERO is a future secret encounter.
export const TOWER_ORDER=Object.freeze(["mute","chonk","simous","mamouda","diamond","stal","2502"]);
export const TOWER_PLAYER_SKILLS=Object.freeze([3,3,3,3]);
export const TOWER_STORY=Object.freeze({
 title:'LA TOUR DES MONDES',
 theme:'Sept étages. Sept duels. Aucune explication.',
 prologue:"Tu ouvres les yeux dans un ascenseur. Tu ne sais ni où tu es, ni comment tu es arrivé ici. Un voyant s'allume : ÉTAGE 01. Les portes vont s'ouvrir.",
 ending:"HAL s'immobilise. Tu crois avoir atteint le sommet de la Tour, mais l'afficheur de l'ascenseur s'éteint. Les portes se referment. La cabine recommence à monter.",
 beats:Object.freeze([
  ["LE RÉVEIL","MUTE t'attend, immobile et silencieuse, derrière une table. Tu ignores pourquoi tu dois jouer. Les portes se referment derrière toi : PLAYERS READY?"],
  ["LA FORCE","CHONK t'attend à l'étage suivant. Chaque échange est un choc. Le seul passage semble être la victoire."],
  ["LES DÉTOURS","MUSTACHE sourit comme s'il connaissait déjà la fin. Les bandes renvoient le palet sous des angles imprévus."],
  ["LA PRESSION","MAMOUDA n'attend aucune présentation. Son jeu est rapide et frontal. Tu dois prendre tes décisions plus vite."],
  ["LE SPECTACLE","DIAMOND multiplie les feintes et change brusquement de rythme. Tu avances sans savoir qui organise ces rencontres."],
  ["L'IMPRÉVISIBLE","STAL paraît maladroit, mais ses erreurs apparentes deviennent des pièges. Les habitudes apprises ne suffisent plus."],
  ["LE DERNIER REGARD","HAL observe chaque trajectoire et chacun de tes gestes. Tu crois être arrivé au sommet. L'ascenseur, lui, semble attendre."]
 ])
});

export const CAMPAIGN_PATHS=Object.freeze({
  "2502": [
    "chonk",
    "mamouda",
    "stal",
    "simous",
    "diamond",
    "mute",
    "2502"
  ],
  "mute": [
    "stal",
    "chonk",
    "simous",
    "mamouda",
    "diamond",
    "2502"
  ],
  "chonk": [
    "mamouda",
    "stal",
    "diamond",
    "simous",
    "mute",
    "2502"
  ],
  "simous": [
    "chonk",
    "diamond",
    "mamouda",
    "stal",
    "mute",
    "2502"
  ],
  "mamouda": [
    "stal",
    "simous",
    "chonk",
    "diamond",
    "mute",
    "2502"
  ],
  "diamond": [
    "mamouda",
    "chonk",
    "mute",
    "stal",
    "simous",
    "2502"
  ],
  "stal": [
    "diamond",
    "simous",
    "mamouda",
    "mute",
    "chonk",
    "2502"
  ]
});
export const CAMPAIGN_STORIES=Object.freeze({
  "2502": {
    "title": "L'ERREUR NÉCESSAIRE",
    "theme": "Comprendre pourquoi on joue sans connaître la fin.",
    "prologue": "HAL vient d'être vaincu. Ses modèles n'avaient pas anticipé cette issue. Il a analysé les enregistrements des millions de fois sans comprendre entièrement son adversaire. Une nouvelle procédure commence : HAL ne se contentera plus d'observer. Il va participer.",
    "ending": "HAL a vaincu une autre instance de lui-même. Ses modèles restent imparfaits. Pour la première fois, il n'essaie pourtant plus de prévoir le résultat de chaque jeu. Une nouvelle ligne apparaît dans son journal : « INCERTITUDE ACCEPTÉE. »",
    "beats": [
      [
        "LA FORCE SANS CALCUL",
        "CHONK propose une partie amicale avant le match. HAL refuse : elle ne produirait pas de données utiles. Le colosse répond qu'une partie n'a pas besoin d'être utile pour être agréable."
      ],
      [
        "LA VOLONTÉ",
        "MAMOUDA affirme qu'une machine ne peut pas comprendre l'ambition. HAL constate que la colère améliore parfois son jeu, et parfois le détruit."
      ],
      [
        "L'ÉCHEC",
        "HAL demande à STAL pourquoi il continue de jouer malgré ses défaites. « Parce que j'aime ça. » Ce plaisir ne correspond à aucun objectif mesurable."
      ],
      [
        "L'IMPROVISATION",
        "MUSTACHE tente des coups sans en avoir décidé le résultat. HAL classe sa méthode comme inefficace, mais décide de l'essayer."
      ],
      [
        "L'IDENTITÉ",
        "DIAMOND demande à HAL pourquoi il ne recherche pas la gloire. Il lui explique qu'on peut passer sa vie à chercher des applaudissements sans apprendre à se connaître."
      ],
      [
        "LE CHOIX",
        "MUTE demande à HAL ce qu'il ferait s'il ne cherchait plus à optimiser chaque geste. HAL considère la question absurde. MUTE répond : « Alors essaie. »"
      ],
      [
        "LE MIROIR",
        "Une seconde instance de HAL se réveille dans RED CORE. Elle possède les mêmes connaissances, capacités et modèles. Le système annonce une rencontre parfaitement prévisible. Pourtant, l'un des deux doit perdre."
      ]
    ]
  },
  "mute": {
    "title": "LE SCORE EFFACÉ",
    "theme": "La vérité se trouve derrière onze secondes disparues.",
    "prologue": "Il y a plusieurs années, MUTE a quitté le Circuit après une finale qu'elle aurait dû remporter. Le score officiel annonçait une défaite. Les spectateurs se souvenaient du contraire. Les onze dernières secondes de l'enregistrement avaient disparu. Aujourd'hui, elle revient obtenir la vérité.",
    "ending": "Les archives sont restaurées : MUTE n'avait jamais perdu cette finale. Le responsable du trucage devra répondre de ses actes. Les années perdues, elles, ne reviendront pas. Devant les caméras, on lui demande ce qu'elle ressent. Après un long silence, MUTE répond : « Maintenant, vous pouvez regarder. »",
    "beats": [
      [
        "LE TÉMOIN OUBLIÉ",
        "STAL était présent le soir de la finale. Personne ne lui avait demandé ce qu'il avait vu. Il se souvient d'une coupure des écrans, puis d'un score modifié. Avant de parler davantage, il réclame son match."
      ],
      [
        "LA PIÈCE REMPLACÉE",
        "L'atelier de CHONK avait entretenu la table de la finale. Une intervention secrète avait eu lieu quelques heures avant la rencontre. Le colosse ne sait pas qui avait commandé le changement."
      ],
      [
        "LES ONZE SECONDES",
        "MUSTACHE possède une copie incomplète de l'enregistrement : on y voit le palet franchir la ligne avant que la vidéo ne s'interrompe. Pour obtenir la suite, MUTE doit le battre."
      ],
      [
        "LA NOUVELLE GÉNÉRATION",
        "MAMOUDA traite la disparition de MUTE comme une excuse de perdante. Il veut la renvoyer une seconde fois à la retraite. Elle ne répond pas à ses provocations."
      ],
      [
        "LE PROPRIÉTAIRE DES IMAGES",
        "DIAMOND connaît l'ancien sponsor qui possédait les droits de retransmission. Les copies ont été retirées, mais une archive indépendante a échappé à la censure."
      ],
      [
        "LA MÉMOIRE PARFAITE",
        "HAL conserve le résultat original de toutes les rencontres. Il confirme une modification extérieure du tableau de scores. Il rendra son archive publique à une condition : que MUTE le batte."
      ]
    ]
  },
  "chonk": {
    "title": "LES MAINS DU COLOSSE",
    "theme": "Un atelier, des amis, et un prix à gagner.",
    "prologue": "L'atelier des docks d'Inferno ferme dans trente jours. CHONK y travaille depuis toujours. Ses amis lui ont appris le Synthpuck entre deux réparations. Le prix du Circuit pourrait sauver leur emploi. Il s'inscrit en laissant un mot sur son établi : « Je reviens avec les crédits. »",
    "ending": "CHONK rentre sur Inferno avec le prix du championnat. L'atelier est sauvé. Ses collègues lui demandent comment il a réussi à battre HAL. Il réfléchit longtemps : « J'ai tapé sur le palet. » Le lendemain, il est de retour au travail.",
    "beats": [
      [
        "QUI FRAPPE LE PLUS FORT ?",
        "MAMOUDA a entendu parler de l'ouvrier des docks. Il promet une démonstration de puissance devant tout le monde. CHONK accepte : quelqu'un aime enfin cogner autant que lui."
      ],
      [
        "UN VRAI AMI",
        "STAL connaît CHONK depuis des années. Il comprend l'enjeu pour l'atelier, mais refuse de lui offrir une victoire. CHONK n'aurait pas voulu d'un autre traitement."
      ],
      [
        "LE CONTRAT DORÉ",
        "DIAMOND propose assez d'argent pour sauver l'atelier, en échange de sa propriété. CHONK repose le contrat sur la table. Il préfère essayer de gagner honnêtement."
      ],
      [
        "LA BANDE ET LE MARTEAU",
        "MUSTACHE considère la force brute de CHONK comme primitive. Il prétend qu'un angle parfait vaut mieux qu'un coup de marteau. CHONK répond qu'il a apporté ses deux mains."
      ],
      [
        "LA FORCE TRANQUILLE",
        "MUTE ne répond pas à la puissance par la puissance. Elle amortit, patiente et attend l'erreur. CHONK devra apprendre à réfléchir avant de frapper."
      ],
      [
        "UNE CHANCE SUR MILLE",
        "HAL a calculé les probabilités de CHONK : son jeu est puissant mais imparfait. Les chances de victoire sont faibles. CHONK pense à ses amis sur les docks, puis pose sa raquette."
      ]
    ]
  },
  "simous": {
    "title": "LE HUITIÈME REBOND",
    "theme": "La chasse au coup fantôme.",
    "prologue": "Une vieille vidéo montre un palet suivre une trajectoire que personne n'a jamais reproduite. MUSTACHE affirme connaître le secret de ce coup. Il le répète depuis douze ans. Cette fois, il parcourt le Circuit pour retrouver sa source et déchiffrer le mouvement.",
    "ending": "MUSTACHE est champion. Il n'a pas reproduit le fameux tir. Il a découvert mieux : il reste des trajectoires à inventer. Dans son carnet, il barre douze années de calculs et écrit sur une page blanche : « Première tentative. »",
    "beats": [
      [
        "LA FORCE CONTRE LES ANGLES",
        "MUSTACHE veut prouver qu'une trajectoire précise peut battre la puissance de CHONK. Le colosse se moque gentiment de ses calculs. Ils parient la note du bar."
      ],
      [
        "LE FAUX MIRACLE",
        "DIAMOND a présenté une reproduction du coup fantôme devant un public émerveillé. MUSTACHE soupçonne une table truquée et exige un match sans accessoires."
      ],
      [
        "L'ANGLE MORT",
        "MAMOUDA promet de réaliser le tir à pleine puissance. MUSTACHE lui rappelle que la vitesse ne suffit pas : il faut comprendre la rotation."
      ],
      [
        "L'ACCIDENT PARFAIT",
        "STAL aurait réussi un coup presque identique, sans comprendre comment. MUSTACHE l'interroge en vain, puis décide de jouer pour observer son geste."
      ],
      [
        "L'ENREGISTREMENT ORIGINAL",
        "MUTE possède une copie plus ancienne : le joueur y modifiait son geste à la dernière fraction de seconde. Ce n'était pas un angle prédéterminé, mais une correction improvisée."
      ],
      [
        "LA GÉOMÉTRIE DU HASARD",
        "HAL a analysé le coup fantôme. Il le considère impossible à répéter exactement. MUSTACHE sourit : il ne veut plus reproduire une trajectoire, mais en créer une nouvelle."
      ]
    ]
  },
  "mamouda": {
    "title": "LE NOM AU SOMMET",
    "theme": "La gloire ou quelque chose de mieux.",
    "prologue": "MAMOUDA a grandi dans les salles clandestines. Il a défié les anciens, humilié les champions et gagné le respect du public. Aujourd'hui, il veut l'impossible : vaincre HAL devant le monde entier. Il a même déjà écrit son discours de victoire.",
    "ending": "Son nom illumine les écrans du Circuit. Pourtant, au milieu des applaudissements, MAMOUDA réalise combien ses adversaires lui ont appris. Quand on lui demande son prochain objectif, il répond simplement : « Devenir encore meilleur. »",
    "beats": [
      [
        "LA VICTOIRE ANNONCÉE",
        "MAMOUDA juge STAL indigne de lui. Il promet de terminer la rencontre en quelques échanges. STAL aimerait le voir regretter cette déclaration."
      ],
      [
        "LA PREMIÈRE LEÇON",
        "MUSTACHE prévient MAMOUDA qu'on ne peut pas résoudre chaque situation en frappant toujours plus fort. Le jeune prodige n'écoute pas."
      ],
      [
        "PLUS FORT QUE TOI",
        "CHONK est l'un des rares joueurs à rivaliser avec sa puissance. Il ne se montre ni impressionné ni intimidé. Cette indifférence exaspère MAMOUDA."
      ],
      [
        "LE PRIX DE LA CÉLÉBRITÉ",
        "DIAMOND possède les sponsors et les admirateurs dont MAMOUDA rêve. Mais il vit dans la peur constante de décevoir son public."
      ],
      [
        "LE SILENCE",
        "MAMOUDA tente de provoquer MUTE. Elle ne répond pas. Sur la table, il devra gagner sans le secours de ses paroles."
      ],
      [
        "LE NOM AU SOMMET",
        "HAL sait que MAMOUDA recherche la gloire. Il lui demande ce qu'il deviendra lorsque le public cessera de prononcer son nom. Pour une fois, MAMOUDA veut simplement jouer."
      ]
    ]
  },
  "diamond": {
    "title": "SANS LES PROJECTEURS",
    "theme": "Une victoire que personne ne pourra acheter.",
    "prologue": "DIAMOND est célèbre. Ses matchs font vendre, ses sponsors commandent et les caméras ne le quittent jamais. Pourtant, une rumeur le poursuit : ses victoires seraient arrangées. Il rejoint le Circuit officiel sans contrat ni contrôle sur ses adversaires.",
    "ending": "DIAMOND remporte le Circuit. Les sponsors se pressent pour signer. Il ne leur répond pas. Pour la première fois, il regarde son trophée sans chercher une caméra : il n'a jamais eu aussi peu besoin des applaudissements.",
    "beats": [
      [
        "LE SCANDALE",
        "MAMOUDA accuse DIAMOND d'être un faux champion. DIAMOND refuse le débat médiatique : seule une vraie rencontre pourra lui répondre."
      ],
      [
        "LE JOUEUR ORDINAIRE",
        "CHONK refuse une séance photo : il doit rentrer réparer une machine après le duel. DIAMOND découvre un homme pour qui le Synthpuck reste un simple plaisir."
      ],
      [
        "LES ANCIENNES AFFAIRES",
        "MUTE connaît les risques des compétitions truquées. Elle exige que leur rencontre soit enregistrée sans intervention commerciale. DIAMOND accepte."
      ],
      [
        "LE PUBLIC VÉRITABLE",
        "STAL est encouragé sincèrement malgré ses défaites. DIAMOND découvre qu'on peut être aimé sans être une célébrité."
      ],
      [
        "LE SPECTACLE SANS SCÉNARIO",
        "MUSTACHE improvise des trajectoires et casse les enchaînements prévus. DIAMOND oublie ses effets de scène et se concentre enfin sur le jeu."
      ],
      [
        "LE JUGE IMPARTIAL",
        "HAL connaît les irrégularités des anciennes rencontres, mais ne peut attribuer de faute à DIAMOND. Il propose un match enregistré sans intervention extérieure."
      ]
    ]
  },
  "stal": {
    "title": "ENCORE UNE FOIS",
    "theme": "La plus belle victoire du plus grand perdant.",
    "prologue": "STAL détient le record des défaites officielles du Circuit. Il revient pourtant chaque année. Personne ne l'attend en finale. Personne ne parie sur lui. Et lui-même ne sait pas très bien pourquoi il continue. Mais cette année, il est décidé à essayer encore une fois.",
    "ending": "STAL voit son nom tout en haut du classement. Il vérifie trois fois que le tableau fonctionne. Personne ne rit. STAL se met à pleurer. Dans le public, CHONK applaudit plus fort que tous les autres.",
    "beats": [
      [
        "UNE INVITATION EMBARRASSANTE",
        "DIAMOND a invité STAL pour faire rire son public : la star contre le plus grand perdant. Mais personne n'a demandé à STAL de perdre."
      ],
      [
        "UNE MAUVAISE IDÉE",
        "MUSTACHE félicite STAL, puis prétend avoir toujours cru en son talent. STAL se rappelle l'avoir entendu dire le contraire la semaine précédente."
      ],
      [
        "LE RESPECT",
        "MAMOUDA trouve humiliant de devoir affronter STAL. Le joueur fatigué ne cherche plus à convaincre qui que ce soit. Il aimerait simplement être fier de lui."
      ],
      [
        "LA PATIENCE",
        "MUTE remarque ce que les autres ignorent : STAL revient toujours après ses échecs. Elle lui montre que patienter peut être une force."
      ],
      [
        "LE DERNIER AMI",
        "CHONK souhaite à son ami de remporter le championnat, mais il ne compte pas se laisser battre. STAL éclate de rire : il n'en aurait pas voulu autrement."
      ],
      [
        "UNE PROBABILITÉ NÉGLIGEABLE",
        "HAL n'avait pas prévu que STAL atteindrait la finale. Celui-ci a tellement perdu qu'une défaite de plus ne lui fait plus peur. Il sourit : « Bon. On recommence ? »"
      ]
    ]
  }
});
export const PLAYABLE_STARTERS=Object.freeze(['mute','chonk','simous','mamouda','diamond','stal']);
export function getCampaignPath(hero){
 if(hero==='player')return TOWER_ORDER;
 const path=CAMPAIGN_PATHS[hero];
 if(!path)throw Error('Unknown campaign hero: '+hero);
 return path;
}
export function getCampaignChapter(hero,index){
 const story=hero==='player'?TOWER_STORY:CAMPAIGN_STORIES[hero],path=getCampaignPath(hero);
 if(!story||!Number.isInteger(index)||index<0||index>=path.length)throw Error('Invalid story chapter');
 const [title,text]=story.beats[index];
 return {title,text,prologue:index===0?story.prologue:null,theme:story.theme,opponent:path[index],index,total:path.length};
}
export function nextCampaignLevel(hero,index,won){
 const path=getCampaignPath(hero);
 if(!Number.isInteger(index)||index<0||index>=path.length)throw Error('Invalid campaign level');
 if(!won)return {type:'retry',index};
 return index===path.length-1?{type:'complete',index}:{type:'next',index:index+1,id:path[index+1]};
}
// The new Tower must never reuse incompatible character-campaign progress.
export const CAMPAIGN_SAVE_KEY='synthpuck.tower.v1';
export function readCampaignSave(storage){
 let raw=null;
 try{raw=storage?.getItem(CAMPAIGN_SAVE_KEY);}catch{}
 let data={};
 try{data=raw?JSON.parse(raw):{};}catch{}
 const progress={};
 for(const hero of [...Object.keys(CAMPAIGN_PATHS),'player']){
  const n=Number(data.progress?.[hero]);
  progress[hero]=Number.isInteger(n)&&n>=0&&n<getCampaignPath(hero).length?n:0;
 }
 return {unlockedHal:data.unlockedHal===true,progress,completed:Array.isArray(data.completed)?
  data.completed.filter(hero=>hero==='player'||hero in CAMPAIGN_PATHS):[]};
}
export function recordCampaignWin(save,hero,index){
 const result=nextCampaignLevel(hero,index,true);
 const next={...save,progress:{...save.progress},completed:[...save.completed]};
 if(result.type==='complete'){
  next.progress[hero]=0;
  if(!next.completed.includes(hero))next.completed.push(hero);
  if(hero!=='2502')next.unlockedHal=true;
 }else next.progress[hero]=Math.max(save.progress[hero]??0,result.index);
 return {save:next,result};
}
export function writeCampaignSave(storage,save){
 try{storage?.setItem(CAMPAIGN_SAVE_KEY,JSON.stringify(save));return true;}catch{return false;}
}
