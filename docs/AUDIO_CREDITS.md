# SYNTHPUCK — crédits audio et licences

Les titres, auteurs et sources affichés par le menu **CREDITS** sont lus directement dans `src/audio.js` via `src/credits.js`, et non copiés dans l'interface.

## Musiques configurées

| Écran | Morceau | Auteur | Licence | État |
|---|---|---|---|---|
| Menu | Legacy | Scott Buckley | CC BY 4.0 | Intégré |
| MUTE | Decoherence | Scott Buckley | CC BY 4.0 | Intégré |
| CHONK | Three Sheets to the Wind | Scott Buckley | CC BY 4.0 | Intégré |
| MUSTACHE | Outlaw Signal | Quantum Cowboy | CC BY 4.0 | Intégré |
| MAMOUDA | Mystic Force | Kevin MacLeod | CC BY 4.0 | Intégré |
| DIAMOND | Space Age Boogie Machine | John Bartmann | CC BY 4.0 | Intégré |
| STAL | Hack the Matrix | WBM Studio | Pixabay Content License | **Prévu : fichier absent** |
| HAL / 2502 | Emergent | Scott Buckley | CC BY 4.0 | Intégré |

Les liens sources individuels et les noms des fichiers sont maintenus dans `TRACKS` de `src/audio.js`.
- Scott Buckley : https://www.scottbuckley.com.au — Creative Commons Attribution 4.0.
- Kevin MacLeod : https://incompetech.com — Creative Commons Attribution 4.0.
- Quantum Cowboy : https://happysoulmusic.com — Creative Commons Attribution 4.0.
- John Bartmann : https://johnbartmann.com/music — Creative Commons Attribution 4.0.
- WBM Studio, « Hack the Matrix » : https://pixabay.com/music/upbeat-hack-the-matrix-dark-progressive-house-499450/ — Pixabay Content License. Ce titre est signalé dans Content ID ; conserver les justificatifs de licence.

## Bruitages réellement routés

| Fichier | Titre | Auteur ou source | Licence |
|---|---|---|---|
| `camera-shutter-click.ogg` | Camera Shutter Click | Mixkit | Mixkit Sound Effects Free License |
| `fast-double-click.ogg` | Fast Double Click | Mixkit | Mixkit Sound Effects Free License |
| `refrigerator-door-slam.wav` | Refrigerator Door Slam | Mixkit | Mixkit Sound Effects Free License |
| `car-door-slam.wav` | Car Door Slam | Mixkit | Mixkit Sound Effects Free License |
| `air-hockey-smack.mp3` | Air Hockey Smack | krb21 (Freesound) | CC0 |
| `dark-storm-wind.wav` | Dark Storm Wind (intro Abundance) | Mixkit | Mixkit Sound Effects Free License |

Mixkit : https://mixkit.co/license/#sfxFree

Dark Storm Wind : https://assets.mixkit.co/active_storage/sfx/2413/2413.wav — effet joué pendant le fondu d'ouverture du logo. Fichier WAV original fourni par l'utilisateur, SHA-256 `882451fb2ab7fef41c9dfdfd8406715c53427d7407c3a2421064072e55fa69cd`.

Air Hockey Smack : https://freesound.org/people/krb21/sounds/118604/ — extrait court du son original.

D'autres fichiers peuvent rester archivés dans `assets/audio/sfx/` sans être utilisés. La page CREDITS ne reprend que ceux réellement routés par `SFX` ainsi que le son du splash indépendant `INTRO_SOUND`.

## Consigne de mise à jour

Lors de chaque modification audio :
1. Modifier `TRACKS` (musique) ou `SFX` / `SFX_CREDITS` (bruitage), en renseignant titre, auteur, licence et URL source.
2. Mettre à jour ce document et l'état `status: 'planned'` des titres encore absents.
3. Exécuter `npm test`. Le test `tests/credits.test.mjs` bloque l'intégration des musiques / bruitages dont les métadonnées sont incomplètes et détecte les contradictions avec les fichiers présents.

Les contenus tiers restent soumis aux droits de leurs auteurs ; ils ne sont pas couverts par les droits exclusifs sur le code et les graphismes originaux de SYNTHPUCK.
