// Combat: the player's pistol and punch, enemy gunfire, bullets, muzzle
// flashes and explosions. Bullets are simple point projectiles with a short
// life; hits are resolved against peds, cops, gang members and cars.

import { TUNING } from './config.js';
import { dist } from './utils.js';
import { scarePeds } from './peds.js';
import { commitCrime, damagePlayer } from './player.js';
import { damageCop } from './police.js';

export function createCombat() {
  return {
    bullets: [], // {x, y, vx, vy, life, friendly, damage}
    flashes: [], // {x, y, life}
    explosions: [], // {x, y, life, radius}
    enemies: [], // gang members for mission 4: {x, y, hp, shootTimer}
  };
}

export function playerShoot(game) {
  const player = game.player;
  if (player.shootCooldown > 0 || player.ammo <= 0 || player.inCar) return;
  player.ammo -= 1;
  player.shootCooldown = 0.28;
  const range = TUNING.pistolRange;
  const bx = player.x + Math.cos(player.angle) * 26;
  const by = player.y + Math.sin(player.angle) * 26;
  game.combat.bullets.push({
    x: bx, y: by,
    vx: Math.cos(player.angle) * 900,
    vy: Math.sin(player.angle) * 900,
    life: range / 900,
    friendly: true,
    damage: TUNING.pistolDamage,
  });
  game.combat.flashes.push({ x: bx, y: by, life: 0.07 });
  game.audio.gunshot();
  scarePeds(game.peds, player.x, player.y, 420);
  if (player.wanted < 5) {
    player.wanted = Math.min(5, player.wanted + 1);
    player.wantedTimer = 0;
  }
}

export function playerPunch(game) {
  const player = game.player;
  if (player.punchCooldown > 0 || player.inCar) return;
  player.punchCooldown = 0.45;
  game.audio.punch();
  const reach = TUNING.punchRange;
  const hx = player.x + Math.cos(player.angle) * reach;
  const hy = player.y + Math.sin(player.angle) * reach;
  // Knock down the nearest pedestrian in reach.
  for (const p of game.peds) {
    if (p.state !== 'down' && dist(p.x, p.y, hx, hy) < 30) {
      p.state = 'down';
      p.hp = 0;
      commitCrime(player, 1, game.audio);
      game.toast('You knocked out ' + p.name + '. The PD noticed.');
      return;
    }
  }
  for (const cop of game.police.footCops) {
    if (dist(cop.x, cop.y, hx, hy) < 30) {
      damageCop(game, cop, TUNING.punchDamage);
      return;
    }
  }
}

export function enemyShoot(game, fromX, fromY, toX, toY, damage) {
  const a = Math.atan2(toY - fromY, toX - fromX) + (Math.random() - 0.5) * 0.14;
  game.combat.bullets.push({
    x: fromX, y: fromY,
    vx: Math.cos(a) * 820,
    vy: Math.sin(a) * 820,
    life: 0.7,
    friendly: false,
    damage,
  });
  game.combat.flashes.push({ x: fromX, y: fromY, life: 0.06 });
  game.audio.gunshot();
}

export function explode(game, x, y) {
  game.combat.explosions.push({ x, y, life: 0.7, radius: 90 });
  game.audio.crash();
  scarePeds(game.peds, x, y, 500);
}

function hitBuilding(game, x, y) {
  return game.city.buildings.some((b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);
}

export function updateCombat(game, dt) {
  const combat = game.combat;
  for (const f of combat.flashes) f.life -= dt;
  combat.flashes = combat.flashes.filter((f) => f.life > 0);
  for (const e of combat.explosions) e.life -= dt;
  combat.explosions = combat.explosions.filter((e) => e.life > 0);

  for (const b of combat.bullets) {
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || hitBuilding(game, b.x, b.y)) { b.life = 0; continue; }
    if (b.friendly) {
      // Gang members first, then cops, then pedestrians, then cars.
      let hit = false;
      for (const e of combat.enemies) {
        if (e.hp > 0 && dist(b.x, b.y, e.x, e.y) < 22) {
          e.hp -= b.damage;
          b.life = 0;
          hit = true;
          if (e.hp <= 0) {
            game.player.kills += 1;
            game.toast('Rival down. ' + combat.enemies.filter((x) => x.hp > 0).length + ' left.');
          }
          break;
        }
      }
      if (hit) continue;
      for (const cop of [...game.police.footCops]) {
        if (dist(b.x, b.y, cop.x, cop.y) < 20) {
          damageCop(game, cop, b.damage);
          b.life = 0;
          hit = true;
          break;
        }
      }
      if (hit) continue;
      for (const p of game.peds) {
        if (p.state !== 'down' && dist(b.x, b.y, p.x, p.y) < 18) {
          p.state = 'down';
          p.hp = 0;
          b.life = 0;
          commitCrime(game.player, 1, game.audio);
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const car of game.cars) {
        if (car.driver !== 'player' && dist(b.x, b.y, car.x, car.y) < 30) {
          car.health -= b.damage;
          b.life = 0;
          if (car.health <= 0 && car.driver !== 'parked') explode(game, car.x, car.y);
          break;
        }
      }
    } else {
      const player = game.player;
      if (!player.inCar && dist(b.x, b.y, player.x, player.y) < 18) {
        damagePlayer(player, b.damage, game);
        b.life = 0;
      } else if (player.inCar && dist(b.x, b.y, player.inCar.x, player.inCar.y) < 34) {
        player.inCar.health -= b.damage;
        b.life = 0;
      }
    }
  }
  combat.bullets = combat.bullets.filter((b) => b.life > 0);

  // Gang members shoot back at the player.
  for (const e of combat.enemies) {
    if (e.hp <= 0) continue;
    e.shootTimer -= dt;
    const d = dist(e.x, e.y, game.player.x, game.player.y);
    if (e.shootTimer <= 0 && d < 480) {
      enemyShoot(game, e.x, e.y, game.player.x, game.player.y, 8);
      e.shootTimer = 0.9 + Math.random() * 0.7;
    }
  }
}
