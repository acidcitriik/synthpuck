// Source of truth for the public alpha version, change history and maturity.
// When cutting the next release, update this file plus package.json and
// package-lock.json. tests/release-info.test.mjs enforces their consistency.
export const APP_VERSION='0.1.0-alpha.6';
export const RELEASE_CHANNEL='ALPHA';
export const RELEASE_DATE='2026-11-03';

export const DEVELOPMENT_STATUS=Object.freeze([
 {state:'JOUABLE',title:'Arcade et entraînement',detail:'7 adversaires, manches au premier à 7 points, modes Arcade et Entraînement.'},
 {state:'EN DÉVELOPPEMENT',title:'IA et équilibrage',detail:'Personnalités, tactiques et adaptation de HAL déjà intégrées ; équilibrage et ressenti à poursuivre.'},
 {state:'EXPÉRIMENTAL',title:'Multijoueur en ligne',detail:'Salon, invitations et WebRTC présents ; fiabilité sur tous les réseaux encore à valider.'},
 {state:'À FINALISER',title:'Finitions et compatibilité',detail:'Tests sur davantage d’appareils, musique STAL encore absente et derniers ajustements visuels/sonores.'}
]);
export const CHANGELOG=Object.freeze([
 {date:'03 NOV. 2026',title:'Version alpha 0.1.0-alpha.6',items:[
  'Les deux cages sont enfin visibles en jeu : ouverture sombre, filet et cadre métallique lumineux.',
  'But adverse rouge « MARQUER » au fond de l’arène ; but du joueur cyan « DÉFENDRE » au premier plan.',
  'Leur position et leur largeur sont calculées sur les vraies ouvertures physiques, sans changer les règles du palet.',
  'Les cages sont dessinées sur un calque transparent adapté à toutes les résolutions et à toutes les arènes.'
 ]},
 {date:'03 NOV. 2026',title:'Version alpha 0.1.0-alpha.5',items:[
  'Les portes gauche/droite effectuent leur animation complète en 3 secondes : bref décollage rapide, puis écartement lent.',
  'Après un but non décisif, le jeu et l’IA restent immobiles pendant GOAL ou SMASH. Engagement automatique dès la disparition du splash.',
  'Les fautes des 7 secondes et 10 secondes conservent leur reprise immédiate, sans écran intermédiaire.'
 ]},
 {date:'03 NOV. 2026',title:'Version alpha 0.1.0-alpha.4',items:[
  'Legacy est arrêtée et remise à 0:00 au départ d’un duel, sans lecture ni sourdine en arrière-plan.',
  'Aucune musique de menu pendant VS, scénario, chargement ou match ; Échap conserve la musique du personnage.',
  'Au retour au menu principal, Legacy redémarre depuis le début.'
 ]},
 {date:'03 NOV. 2026',title:'Version alpha 0.1.0-alpha.3',items:[
  'Pause Échap : la musique du personnage continue sans interruption et Legacy reste sur le menu principal.',
  'Portes verticales gauche/droite animées pendant 3 secondes avec une accélération initiale brève.',
  'Players ready? ne s’affiche qu’après l’ouverture complète des portes.',
  'Écran VS maintenu pendant 4 secondes minimum, davantage si le chargement du duel n’est pas terminé.'
 ]},
 {date:'03 NOV. 2026',title:'Version alpha 0.1.0-alpha.2',items:[
  'Choix du héros parmi six personnages, avec débloquage permanent de HAL après une campagne gagnée.',
  'Sept parcours narratifs : ordres différents, héros exclus des adversaires, combat final toujours contre HAL.',
  'Profils physiques Puissance, Amorti, Effet et Contre, totalisant 14 points par personnage.',
  'Écran VS avec portraits et parcours, véritable chargement du match, puis scénario rétro lisible jusqu’au bouton PASSER.',
  'Deux volets noirs s’ouvrent au début du duel et se referment lors du résultat final.'
 ]},
 {date:'03 NOV. 2026',title:'Version alpha 0.1.0-alpha.1',items:[
  'Ajout d’un chargement réel, avec progression et palet animé, avant le logo et les matchs.',
  'Nouvelle introduction Abundance : logo choisi, bruitage de vent et fondus synchronisés.',
  'Le menu précharge Legacy ; ajout de la page Credits et des attributions audio.',
  'Séparation du code privé et de la version publique, publiée automatiquement.',
  'Affichage de la version alpha et ouverture de ce journal des modifications.'
 ]},
 {date:'02 NOV. 2026',title:'Gameplay, IA et bande-son',items:[
  'Reprises de jeu sans pause après les buts ; règles des 7 secondes de renvoi et 10 secondes d’engagement.',
  'Comportements plus distincts pour les adversaires ; mémoire et techniques adaptatives de HAL.',
  'Ajout des musiques des adversaires et de bruitages de palet, bandes et smash.',
  'Affichage GOAL, SMASH, Players ready?, GO, YOU WIN et YOU LOSE.',
  'Optimisations du rendu et outils de diagnostic des parties.'
 ]},
 {date:'01 NOV. 2026',title:'Identité visuelle et compte',items:[
  'Sprites des raquettes et du palet, interfaces et scènes retravaillés en haute définition.',
  'Ajout du compte joueur et des premiers outils d’invitation en ligne.',
  'Réglages, calibration et ajustements d’affichage sur plusieurs résolutions.'
 ]},
 {date:'29–31 OCT. 2026',title:'Fondations de Synthpuck',items:[
  'Création des scènes, des personnages et de l’interface Arcade / Entraînement.',
  'Mise en place des collisions, de la table de jeu et des premiers contrôles.',
  'Premières passes de correction des graphismes et du comportement du palet.'
 ]}
]);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
export const versionLabel=()=>`${RELEASE_CHANNEL} v${APP_VERSION}`;
export function renderChangelogPage(backButton){
 const status=DEVELOPMENT_STATUS.map(item=>
  '<article class="changelog-status-item"><span class="changelog-status-state">'+escapeHTML(item.state)+'</span>'+
  '<div><h4>'+escapeHTML(item.title)+'</h4><p>'+escapeHTML(item.detail)+'</p></div></article>'
 ).join('');
 const history=CHANGELOG.map(release=>
  '<article class="changelog-release"><div class="changelog-release-heading"><span>'+escapeHTML(release.date)+'</span>'+
  '<h3>'+escapeHTML(release.title)+'</h3></div><ul>'+
  release.items.map(item=>'<li>'+escapeHTML(item)+'</li>').join('')+'</ul></article>'
 ).join('');
 return '<div class="page changelog-page">'+
  '<header class="page-head"><div><p class="eyebrow">SYNTHPUCK / JOURNAL DE DÉVELOPPEMENT</p>'+
  '<h2>CHANGELOG</h2><p class="changelog-version">'+escapeHTML(versionLabel())+'</p></div>'+backButton+'</header>'+
  '<section class="changelog-section"><h3>ÉTAT DU PROJET</h3>'+
  '<p class="changelog-intro">Alpha jouable : les fonctions principales existent, mais la stabilité, les équilibrages et les finitions ne sont pas encore au niveau d’une bêta.</p>'+
  '<div class="changelog-status-grid">'+status+'</div></section>'+
  '<section class="changelog-section"><h3>MISES À JOUR</h3>'+
  '<p class="changelog-intro">Historique des principales évolutions. La numérotation officielle commence avec cette première alpha ; les dates précédentes retracent le développement.</p>'+
  '<div class="changelog-history">'+history+'</div></section></div>';
}
