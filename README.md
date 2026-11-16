# Ember Warden

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/akosimamora/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/akosimamora/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Entry for make.fun competition **best-game-01** — "Make the best game". Bounty page: https://make.fun/bounty/best-game-01

An arena wave shooter. You are the warden of the last ember light in a dark
field. Waves of gloom wisps drift in to snuff the ember — hold the line for
10 waves and dawn breaks.

## How to play

- **Move** — WASD / arrow keys
- **Aim** — mouse
- **Shoot** — hold left click / Space
- **Dash** — Shift / right-click (brief invulnerability)
- **Pause** — P / Esc, **Mute** — M, **Restart** — R

Defeated wisps drop embers; collect them for score. Between waves, choose 1
of 3 upgrades (fire rate, spread shot, piercing rounds, magnet, dash, ember
guard, and more). You lose if the ember's HP or your HP reaches 0. Survive
wave 10 to win.

Enemy kinds arrive gradually: chasers, dashers (telegraphed lunges),
splitters (break into sparks), and tanks.

## Run it

Serve `game/` with any static file server and open `index.html`:

```sh
python3 -m http.server --directory game 8080
```

No build step, no network requests, no assets beyond the files in `game/`.
All art is drawn on canvas; all sound is synthesized with WebAudio.

## Layout

- `game/index.html` — canvas + page shell
- `game/src/config.js` — tuning constants (waves, enemy stats, upgrades)
- `game/src/input.js` — keyboard + mouse state
- `game/src/audio.js` — WebAudio synth sounds + mute
- `game/src/entities.js` — player, bullets, enemies, particles, pickups
- `game/src/upgrades.js` — upgrade pool + applying a choice
- `game/src/world.js` — state machine, waves, spawning, collisions, scoring
- `game/src/render.js` — all canvas drawing (field, HUD, screens)
- `game/src/main.js` — boot + game loop (+ `?shot=` capture states)
- `main.ts` — entry program: copies `game/` + `screenshots/` to `/output`
  and writes `dossier.json` with the kit's `buildDossier`
- `screenshots/` — 1-title, 2-play, 3-upgrade, 4-end (real renders of the game)
