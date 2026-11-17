// Solmar Bay bootstrap: builds the world, runs the frame loop, wires keys
// to actions, and exposes the live game on window.__solmar for play-testing
// and screenshots.

import { WORLD, TUNING } from './config.js';
import { buildCity } from './city.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSave, storeSave } from './save.js';
import { createPlayer, updatePlayer, respawnPlayer, nearestCarWithin, damagePlayer } from './player.js';
import { spawnCars, updateCars, enterCar, exitCar } from './cars.js';
import { spawnPeds, updatePeds } from './peds.js';
import { createPolice, updatePolice } from './police.js';
import { createCombat, updateCombat, playerShoot, playerPunch, explode, enemyShoot } from './combat.js';
import { createMissions, startNextMission, updateMissions, startTaxi } from './missions.js';
import { createCamera, render } from './render.js';
import { createUi, showBanner, showToast, updateUi, drawOverlays } from './ui.js';
import { stageShot } from './shots.js';
import { clamp, lerp } from './utils.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const save = loadSave();
const game = {
  state: 'menu',
  city: buildCity(),
  cars: [],
  peds: [],
  player: null,
  police: createPolice(),
  combat: createCombat(),
  missions: createMissions(save),
  camera: createCamera(),
  input: createInput(canvas),
  audio: createAudio(),
  ui: createUi(),
  save,
  time: 0,
  playSeconds: 0,
  screenToWorld(sx, sy) {
    return { x: sx / this.camera.zoom + this.camera.x, y: sy / this.camera.zoom + this.camera.y };
  },
  banner(title, sub, seconds) { showBanner(this.ui, title, sub, seconds); },
  toast(text) { showToast(this.ui, text, 3); },
  onWasted() {
    this.audio.busted();
    this.banner('WASTED', 'The bay is quiet without you. Press R to get back out there.', 4);
  },
  ejectPlayer(car) {
    if (this.player.inCar === car) {
      this.player.inCar = null;
      this.player.onFoot = true;
      this.player.x = car.x + 40;
      this.player.y = car.y + 40;
      this.toast('Your car blew up!');
    }
  },
  explode(x, y) { explode(this, x, y); },
  enemyShoot(fromX, fromY, toX, toY, damage) {
    enemyShoot(this, fromX, fromY, toX, toY, damage);
  },
};

game.player = createPlayer(game.city, save);
game.cars = spawnCars(game.city);
game.peds = spawnPeds(game.city);

// Screenshot staging (?shot=cover|drive|foot|heist) runs the real game,
// posed. Anything else starts at the title menu.
const shotMode = new URLSearchParams(window.location.search).get('shot');
if (shotMode) {
  stageShot(game, shotMode);
} else {
  game.camera.x = game.player.x - canvas.width / 2;
  game.camera.y = game.player.y - canvas.height / 2;
}

function startPlay(fresh) {
  if (fresh) {
    game.save.missionsDone = [];
    game.save.money = 250;
    game.save.carsStolen = 0;
    game.save.taxiTrips = 0;
    game.player.money = 250;
    game.missions = createMissions(game.save);
    respawnPlayer(game.player, game.city);
  }
  game.state = 'play';
  game.audio.unlock();
}

function handleMenuKeys() {
  const input = game.input;
  if (input.hit('ArrowUp') || input.hit('KeyW')) {
    game.ui.menuIndex = (game.ui.menuIndex + 2) % 3;
  }
  if (input.hit('ArrowDown') || input.hit('KeyS')) {
    game.ui.menuIndex = (game.ui.menuIndex + 1) % 3;
  }
  if (input.hit('Enter')) {
    if (game.ui.menuIndex === 0) startPlay(true);
    else if (game.ui.menuIndex === 1) startPlay(false);
    else game.ui.menuIndex = 0;
  }
}

function handlePlayKeys() {
  const input = game.input;
  const player = game.player;
  if (input.hit('KeyP') || input.hit('Escape')) {
    game.state = 'pause';
    return;
  }
  if (input.hit('KeyM')) {
    const muted = game.audio.toggleMute();
    game.toast(muted ? 'Sound muted.' : 'Sound on.');
  }
  if ((player.busted || player.wasted) && input.hit('KeyR')) {
    respawnPlayer(player, game.city);
    return;
  }
  if (player.busted || player.wasted) return;
  if (input.hit('KeyE')) {
    if (player.inCar) exitCar(game);
    else {
      const car = nearestCarWithin(player, game.cars, 70);
      if (car) enterCar(game, car);
    }
  }
  if (input.hit('KeyJ')) startNextMission(game);
  if (input.hit('KeyT')) startTaxi(game);
  if (input.hit('KeyH') && player.inCar) {
    game.audio.honk();
    const car = player.inCar;
    car.honkCooldown = 0.5;
  }
  if (input.hit('Space') && !player.inCar) playerPunch(game);
  if ((input.hit('KeyF') || input.mouse.clicked) && !player.inCar) playerShoot(game);
  if (input.mouse.down && !player.inCar && player.shootCooldown <= 0) playerShoot(game);
}

function updateCamera(dt) {
  const player = game.player;
  const viewW = canvas.width / game.camera.zoom;
  const viewH = canvas.height / game.camera.zoom;
  const tx = player.x - viewW / 2;
  const ty = player.y - viewH / 2;
  const k = Math.min(1, dt * 5);
  game.camera.x = lerp(game.camera.x, tx, k);
  game.camera.y = lerp(game.camera.y, ty, k);
  game.camera.x = clamp(game.camera.x, -200, WORLD.width - viewW + 200);
  game.camera.y = clamp(game.camera.y, -200, WORLD.height - viewH + 200);
}

function update(dt) {
  game.time += dt;
  updateUi(game.ui, dt);
  if (game.state === 'menu') {
    handleMenuKeys();
    // The menu shows the city alive behind it: traffic and peds keep moving.
    updateCars(game, dt);
    updatePeds(game, dt);
    updateCamera(dt);
    return;
  }
  if (game.state === 'pause') {
    if (game.input.hit('KeyP') || game.input.hit('Escape')) game.state = 'play';
    return;
  }
  handlePlayKeys();
  game.playSeconds += dt;
  if (Math.floor(game.playSeconds) % 15 === 0) {
    game.save.money = game.player.money;
    game.save.playSeconds = (game.save.playSeconds || 0) + dt;
    storeSave(game.save);
  }
  updatePlayer(game.player, game, dt);
  updateCars(game, dt);
  updatePeds(game, dt);
  updatePolice(game, dt);
  updateCombat(game, dt);
  updateMissions(game, dt);
  updateCamera(dt);
  game.audio.setEngine(0, false);
  if (game.player.inCar) {
    // engine sound is driven from updatePlayerCar; keep it alive here.
    game.audio.setEngine(Math.abs(game.player.inCar.speed) / game.player.inCar.model.topSpeed, true);
  }
}

let last = performance.now();
let readyFlagged = false;

function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  update(dt);
  render(game, ctx, { w: canvas.width, h: canvas.height }, game.time);
  drawOverlays(ctx, game, { w: canvas.width, h: canvas.height });
  game.input.endFrame();
  if (!readyFlagged) {
    readyFlagged = true;
    window.__solmar = game;
    window.__solmarReady = true;
  }
  requestAnimationFrame(frame);
}

// First gesture unlocks audio (browsers require it).
window.addEventListener('keydown', () => game.audio.unlock(), { once: true });
window.addEventListener('mousedown', () => game.audio.unlock(), { once: true });

window.__solmar = game;
requestAnimationFrame(frame);
