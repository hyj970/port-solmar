// The wanted system and the Solmar PD. Foot cops chase and arrest the
// player; interceptors ram the player's car; higher stars mean more of both.
// Heat fades when the player stays quiet (see player.js).

import { TUNING, WORLD } from './config.js';
import { dist, clamp, angleDiff, turnToward, makeRng } from './utils.js';
import { randomRoadPoint } from './city.js';
import { bustPlayer, damagePlayer } from './player.js';
import { spawnPoliceCar } from './cars.js';

export function createPolice() {
  return {
    footCops: [], // {x, y, angle, hp}
    interceptors: [], // car objects with driver 'police'
    spawnTimer: 0,
  };
}

function spawnFootCop(game) {
  const a = Math.random() * Math.PI * 2;
  const r = 420 + Math.random() * 200;
  const cop = {
    x: clamp(game.player.x + Math.cos(a) * r, 60, WORLD.width - 60),
    y: clamp(game.player.y + Math.sin(a) * r, 60, WORLD.height - 60),
    angle: 0,
    hp: 100,
  };
  game.police.footCops.push(cop);
}

export function updatePolice(game, dt) {
  const player = game.player;
  const wanted = player.wanted;
  const police = game.police;
  police.spawnTimer -= dt;

  // How many officers the current heat calls for.
  const wantFoot = wanted >= 1 ? Math.min(wanted, 3) : 0;
  const wantCars = wanted >= 2 ? Math.min(wanted - 1, 4) : 0;

  if (police.spawnTimer <= 0) {
    if (police.footCops.length < wantFoot) spawnFootCop(game);
    if (police.interceptors.length < wantCars) {
      const car = spawnPoliceCar(game, player.x, player.y);
      police.interceptors.push(car);
    }
    police.spawnTimer = 1.2;
  }
  // Stand down when the heat is gone.
  if (wanted === 0) {
    police.footCops.length = 0;
    for (const c of police.interceptors) {
      c.driver = 'traffic';
      c.targetSpeed = 150;
    }
    police.interceptors.length = 0;
  }

  // Foot cops: run at the player, grapple on contact, arrest after a short
  // struggle (so a fast player can break free by punching or running).
  for (const cop of police.footCops) {
    const d = dist(cop.x, cop.y, player.x, player.y);
    const a = Math.atan2(player.y - cop.y, player.x - cop.x);
    cop.angle = a;
    if (player.inCar) {
      // A cop on foot cannot catch a car; hold position and radio it in.
      continue;
    }
    cop.x += Math.cos(a) * TUNING.copFootSpeed * dt;
    cop.y += Math.sin(a) * TUNING.copFootSpeed * dt;
    if (d < TUNING.copArrestRange) {
      cop.grab = (cop.grab || 0) + dt;
      if (cop.grab > 1.5) {
        bustPlayer(player, game);
        return;
      }
    } else {
      cop.grab = 0;
    }
    if (d < 260 && Math.random() < dt * 0.5) {
      game.enemyShoot(cop.x, cop.y, player.x, player.y, 6);
    }
  }

  // Interceptors: chase the player's car and ram it; on foot they circle.
  for (const car of police.interceptors) {
    const target = player.inCar || player;
    const d = dist(car.x, car.y, target.x, target.y);
    const desired = Math.atan2(target.y - car.y, target.x - car.x);
    car.angle = turnToward(car.angle, desired, 2.6 * dt);
    car.speed = clamp(car.speed + (car.model.topSpeed * 0.92 - car.speed) * dt, 0, car.model.topSpeed);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (player.inCar && d < 52) {
      // Ram: shove the player's car and dent it a little.
      player.inCar.health -= 6 * dt;
      player.inCar.speed *= 0.995;
      player.inCar.x += Math.cos(car.angle) * 30 * dt;
      player.inCar.y += Math.sin(car.angle) * 30 * dt;
      if (Math.random() < dt * 2) game.audio.crash();
    }
    if (!player.inCar && d < 60) {
      damagePlayer(player, 12 * dt, game);
    }
  }

  game.audio.setSiren(wanted >= 2, wanted);
}

// A cop the player shoots goes down and the heat rises.
export function damageCop(game, cop, amount) {
  cop.hp -= amount;
  if (cop.hp <= 0) {
    const i = game.police.footCops.indexOf(cop);
    if (i >= 0) game.police.footCops.splice(i, 1);
    game.player.wanted = Math.min(5, game.player.wanted + 1);
    game.player.wantedTimer = 0;
    game.toast('You took down a cop! Wanted level up.');
  }
}
