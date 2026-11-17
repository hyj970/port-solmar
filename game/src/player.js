// The player on foot: position, health, money, wanted level, pistol ammo,
// and the crimes that raise heat. Driving is handled by cars.js; this module
// owns everything the player does with their own two feet.

import { TUNING, WORLD } from './config.js';
import { clamp, dist } from './utils.js';
import { insideBuilding } from './city.js';

export function createPlayer(city, save) {
  return {
    x: 1200,
    y: 700,
    angle: 0, // facing, radians
    hp: TUNING.playerHp,
    money: save.money,
    ammo: TUNING.pistolAmmoStart,
    wanted: 0,
    wantedTimer: 0, // seconds since the last crime
    inCar: null, // car object when driving, else null
    onFoot: true,
    punchCooldown: 0,
    shootCooldown: 0,
    kills: 0,
    busted: false,
    wasted: false,
  };
}

// A crime raises the wanted level (capped at 5) and resets the decay clock.
export function commitCrime(player, stars, audio) {
  if (player.wanted >= TUNING.maxWanted) return;
  player.wanted = Math.min(TUNING.maxWanted, player.wanted + stars);
  player.wantedTimer = 0;
  if (audio) audio.pickup();
}

export function updatePlayer(player, game, dt) {
  const { input, city, audio } = game;
  if (player.busted || player.wasted) return;
  player.punchCooldown = Math.max(0, player.punchCooldown - dt);
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);

  // Wanted decays after a quiet spell.
  if (player.wanted > 0) {
    player.wantedTimer += dt;
    if (player.wantedTimer > TUNING.wantedDecaySeconds) {
      player.wanted -= 1;
      player.wantedTimer = 0;
    }
  }

  if (player.inCar) return; // cars.js moves the driver.

  const mv = input.moveVector();
  if (mv.x !== 0 || mv.y !== 0) {
    const nx = player.x + mv.x * TUNING.playerSpeed * dt;
    const ny = player.y + mv.y * TUNING.playerSpeed * dt;
    // Slide along buildings: try each axis separately.
    if (!insideBuilding(city, nx, player.y)) player.x = nx;
    if (!insideBuilding(city, player.x, ny)) player.y = ny;
    player.x = clamp(player.x, 40, WORLD.width - 40);
    player.y = clamp(player.y, 40, WORLD.height - 40);
    player.angle = Math.atan2(mv.y, mv.x);
  }
  // Face the mouse when aiming with it.
  if (input.mouse.down || input.mouse.clicked) {
    const world = game.screenToWorld(input.mouse.x, input.mouse.y);
    player.angle = Math.atan2(world.y - player.y, world.x - player.x);
  }
}

export function damagePlayer(player, amount, game) {
  if (player.busted || player.wasted) return;
  player.hp -= amount;
  if (player.hp <= 0) {
    player.hp = 0;
    player.wasted = true;
    game.onWasted();
  }
}

// Busted: lose the fine, lose the heat, wake up at the hospital.
export function bustPlayer(player, game) {
  if (player.busted || player.wasted) return;
  player.busted = true;
  const fine = Math.min(player.money, TUNING.bustedFine);
  player.money -= fine;
  player.wanted = 0;
  player.wantedTimer = 0;
  game.audio.busted();
  game.banner('BUSTED!', 'The PD took ' + fine + ' in fines. Press R to get back on the streets.', 4);
}

// Back on the streets after busted / wasted.
export function respawnPlayer(player, city) {
  player.hp = TUNING.playerHp;
  player.busted = false;
  player.wasted = false;
  player.inCar = null;
  player.onFoot = true;
  player.x = 1200;
  player.y = 700;
  player.angle = 0;
  if (player.money < 0) player.money = 0;
}

export function nearestCarWithin(player, cars, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const c of cars) {
    const d = dist(player.x, player.y, c.x, c.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
