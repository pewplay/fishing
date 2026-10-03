# Fishing Game for PewPlay

This directory contains the original static game adapted for the PewPlay game template. Open `index.html` to play.

`game.json` holds the game page text. `preview.png` and `cover.png` provide the page images. The PewPlay workflow checks pushes to `preview` and `main`.

Game controls: hold the mouse button, a finger or any key to lift the catch zone; release to let it sink. Keep the fish in the zone to fill the meter.

## October 2026 update
- The scene is scaled as one block to fill the full height of the window (portrait and landscape), with crisp canvases (devicePixelRatio aware) and a stats panel (fish landed, round time, best time) plus an on-screen hint.
- Fixed 60 Hz simulation step, so the game runs at the same speed on 120/144 Hz screens; input released when the page is hidden.
- Rounds start on the first press; "Perfect" is now earned (meter never far below its start) instead of always shown; in-page "Fish again" button, Enter/Space to restart.
- Records saved in localStorage under `fishing:caught` and `fishing:best` (no previous keys existed).
- New cover, screenshots and a re-framed preview (same subject and colours, kept inside the central area).
