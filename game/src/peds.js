// Pedestrians: Port Solmar's sidewalk crowd. They stroll the pavements,
// scatter when a gun goes off or a car bears down, and a few of them carry
// the mission contacts the player has to meet.

import { TUNING, WORLD } from './config.js';
import { dist, makeRng, pick, randRange, clamp } from './utils.js';
import { randomSidewalkPoint, insideBuilding } from './city.js';

const SHIRTS = ['#e85d5d', '#5d8ae8', '#5de88a', '#e8c85d', '#c05de8', '#5dd8e8', '#e88a5d', '#8a8a8a'];
const NAMES = ['Mara', 'Theo', 'Luz', 'Ike', 'Rosa', 'Dante', 'Priya', 'Marco', 'Nia', 'Cole', 'Ana', 'Jules'];

export function spawnPeds(city) {
  const rng = makeRng(WORLD.seed + 31);
  const peds = [];
  for (let i = 0; i < TUNING.pedCount; i++) {
    const p = randomSidewalkPoint(city, rng);
    peds.push({
      id: i,
      name: pick(rng, NAMES),
      x: p.x,
      y: p.y,
      angle: rng() * Math.PI * 2,
      speed: randRange(rng, 28, 52),
      shirt: pick(rng, SHIRTS),
      skin: pick(rng, ['#f2c9a0', '#c98d5f', '#8a5a3a', '#e8b88a']),
      state: 'walk', // walk | flee | down
      fleeX: 0,
      fleeY: 0,
      fleeTimer: 0,
      wanderTimer: randRange(rng, 2, 6),
      hp: 100,
    });
  }
  return peds;
}

// Everyone within earshot of gunfire or an explosion runs away from it.
export function scarePeds(peds, x, y, radius) {
  for (const p of peds) {
    if (p.state === 'down') continue;
    if (dist(p.x, p.y, x, y) < radius) {
      p.state = 'flee';
      const a = Math.atan2(p.y - y, p.x - x);
      p.fleeX = p.x + Math.cos(a) * 320;
      p.fleeY = p.y + Math.sin(a) * 320;
      p.fleeTimer = 3;
    }
  }
}

export function updatePeds(game, dt) {
  const rng = Math.random;
  for (const p of game.peds) {
    if (p.state === 'down') continue;
    if (p.state === 'flee') {
      p.fleeTimer -= dt;
      const a = Math.atan2(p.fleeY - p.y, p.fleeX - p.x);
      p.angle = a;
      p.x += Math.cos(a) * 130 * dt;
      p.y += Math.sin(a) * 130 * dt;
      if (p.fleeTimer <= 0 || dist(p.x, p.y, p.fleeX, p.fleeY) < 20) p.state = 'walk';
    } else {
      p.wanderTimer -= dt;
      if (p.wanderTimer <= 0) {
        p.angle = rng() * Math.PI * 2;
        p.wanderTimer = 2 + rng() * 5;
      }
      const nx = p.x + Math.cos(p.angle) * p.speed * dt;
      const ny = p.y + Math.sin(p.angle) * p.speed * dt;
      if (!insideBuilding(game.city, nx, ny)) {
        p.x = clamp(nx, 50, WORLD.width - 50);
        p.y = clamp(ny, 50, WORLD.height - 50);
      } else {
        p.angle += Math.PI / 2;
      }
    }
    // A speeding car that clips a pedestrian knocks them down — and the
    // driver earns a wanted star for it.
    const pc = game.player.inCar;
    if (pc && Math.abs(pc.speed) > 150 && dist(p.x, p.y, pc.x, pc.y) < 34) {
      p.state = 'down';
      p.hp = 0;
      game.audio.crash();
      if (game.player.wanted < 5) {
        game.player.wanted = Math.min(5, game.player.wanted + 1);
        game.player.wantedTimer = 0;
      }
      game.toast('You hit a pedestrian! The PD is coming.');
    }
  }
}
