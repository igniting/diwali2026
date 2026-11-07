# 🪔 Ayodhya Deepotsav — a 3D Diwali game

Shri Ram, Sita and Lakshman are coming home to Ayodhya on the Pushpak Vimana after fourteen years of exile.
On this moonless Amavasya night it is your seva to light the ghats of the Sarayu, so the Vimana can find its way.

It's built with [three.js](https://threejs.org) and runs as a static site, with no build step and no external assets.
Everything is made in code: the sandstone, rangoli, water, people, temple and music.

**Play:** https://igniting.github.io/diwali2026/ (after GitHub Pages is enabled, see below)

## What you'll find

- **Ram ki Paidi ghats** on the Sarayu: more than 10,000 clay diyas, each with its own flame, oil and flicker, reflected in the river.
- **Ram Mandir** in pink sandstone, with a Nagara shikhara, mandapas, colonnades and string lights.
- **Hanuman Garhi Marg**: havelis with jharokhas, akash kandil lanterns, marigold torans and light canopies.
- **Fireworks**: peony, chrysanthemum, willow, ring, strobe, palm, crossette and heart shells, with real flash lighting and sound that arrives late with distance. You can also light **anar** fountains and **chakri** spinners.
- **Deep daan**: float diyas on leaf boats down the Sarayu.
- **Pushpak Vimana** flies in at the end of each night while the Maha Aarti plays (shankh, bells, dhol) and marigold petals fall.
- The whole soundscape is synthesised live: tanpura drone, temple bells, river, crowd and crackers.

## How to play

| Key | Action |
| --- | --- |
| `W A S D` / arrows | walk (your puja thali lights diyas you pass) |
| `Shift` | run |
| mouse drag · wheel · `Q`/`E` | look around · zoom · turn camera |
| `B` | Bazaar (upgrades, zones, prestige, achievements) |
| `F` | launch fireworks |
| `G` | anar / chakri |
| `R` | float a diya (stand on the lowest ghat step) |
| `P` | photo mode (hide the HUD) |

It also works on phones, with an on-screen joystick, a run button and pinch to zoom.

**The loop:** each night has a goal. Get that many diyas burning at the same time before the time runs out.
Diyas burn down, the wind snuffs them out and naughty vanars knock them over. Light quickly in a row to build combos.
Spend your Punya ✦ on swifter hands, desi ghee for longer flames, sevaks who light diyas for you, Agni Chain flames that spread on their own, and new ghats.
You'll also find seva tasks, 30 achievements, golden Lakshmi diyas, the Utsav meter (double Punya), daily prasad streaks, offline earnings from your sevaks, and an **Ashirwad** prestige from night 12.
Progress saves automatically in your browser.

## Hosting on GitHub Pages

1. Open **Settings → Pages** in this repository.
2. Under *Build and deployment*, set **Source** to *Deploy from a branch*, then pick **`main`** and **`/ (root)`**, and click **Save**.
3. After a minute the game is live at `https://<user>.github.io/diwali2026/`.

To run it locally, serve the folder with any static server, for example `python3 -m http.server`, then open http://localhost:8000.

## Project layout

```
index.html          UI shell + import map
css/style.css       HUD / menus
js/main.js          game loop, economy, nights, quests, events, UI
js/world.js         Ayodhya: ghats, havelis, Ram Mandir, river, sky, lights
js/diyas.js         instanced diya system (bowls, flames, light pools)
js/characters.js    player, sevaks, crowd, vanar
js/fx.js            fireworks, anar/chakri, floating diyas, Pushpak Vimana, petals
js/audio.js         Web Audio synthesis
js/textures.js      procedural canvas textures
vendor/three/       three.js r160 (MIT)
```

शुभ दीपावली! 🙏
