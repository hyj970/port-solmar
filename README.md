# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/hyj970/port-solmar/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/hyj970/port-solmar/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay — an original 2D top-down open-world crime game set in the fictional city of Port Solmar. Explore six districts on foot and by car, steal any of eight car models, dodge a five-star police response, run taxi fares, and work six story jobs for fixer Vera Solano — ending with a bank job and a five-star escape to the marina. Traffic follows the road grid, pedestrians flee gunfire, and the whole city is drawn and sounded live: synthesized WebAudio engine, sirens, gunfire and a sunset music loop, no audio files, no network requests.

## Run it

```sh
python3 -m http.server 8080 --directory game
# open http://localhost:8080 in desktop Chrome
```

Or serve `game/` with any static file server and open `index.html`.

## Play it

- **W A S D** — move on foot / drive
- **Mouse** — aim, **Click** — shoot pistol
- **E** — enter / exit a car (stealing a parked car raises your wanted level)
- **Space** — punch on foot / handbrake while driving
- **J** — start the next job for Vera Solano
- **T** — take a taxi fare while driving
- **P** — pause, **M** — mute, **H** — honk, **R** — get back out after busted / wasted

Progress (money, jobs finished) saves in the browser with localStorage.

## How it is built

Plain static files under `game/` — `index.html` and ES modules, no build step, no library, nothing loaded over the network. `main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the kit's `vendor/makefun-game.ts`.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=xwk0pxbf&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
