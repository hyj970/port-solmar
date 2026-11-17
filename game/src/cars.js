// Cars: arcade driving physics (accelerate, steer, drift, damage), the
// road-grid traffic that fills Port Solmar, parked cars to steal, and the
// enter/exit handshake with the player.

import { CAR_MODELS, POLICE_MODEL, WORLD, TUNING } from './config.js';
import { clamp, dist, angleDiff, turnToward, makeRng, pick, randRange } from './utils.js';
import { onRoad, nearestRoadX, nearestRoadY, randomRoadPoint, insideBuilding } from './city.js';
import { commitCrime } from './player.js';

let nextId = 1;

export function makeCar(model, x, y, angle, driver) {
  return {
    id: nextId++,
    model,
    x,
    y,
    angle,
    speed: 0,
    steer: 0,
    health: model.hp,
    driver, // 'parked' | 'traffic' | 'player' | 'police' | 'mission'
    color: model.color,
    targetSpeed: 0,
    // Traffic AI: which way it drives along its road and where it turns.
    dir: 0,
    turnAt: null,
    smoke: 0,
    honkCooldown: 0,
    brakeLight: false,
  };
}

// A road point with a heading that runs ALONG the road it sits on: a car
// spawned on a vertical road heads north/south, on a horizontal road
// east/west. Without this, traffic drives through buildings.
export function randomRoadSpawn(rng) {
  if (rng() < 0.5) {
    const rx = pick(rng, WORLD.vRoads);
    return { x: rx, y: randRange(rng, 260, WORLD.height - 260), angle: rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2 };
  }
  const ry = pick(rng, WORLD.hRoads);
  return { x: randRange(rng, 260, WORLD.width - 260), y: ry, angle: rng() < 0.5 ? 0 : Math.PI };
}

// Spawn parked cars along the roads and a fleet of moving traffic.
export function spawnCars(city) {
  const rng = makeRng(WORLD.seed + 7);
  const cars = [];
  for (let i = 0; i < 22; i++) {
    const p = randomRoadSpawn(rng);
    const off = (WORLD.roadWidth / 2 - 16) * (rng() < 0.5 ? -1 : 1);
    // Park at the roadside, parallel to the road.
    const x = Math.abs(Math.sin(p.angle)) > 0.5 ? p.x + off : p.x;
    const y = Math.abs(Math.sin(p.angle)) > 0.5 ? p.y : p.y + off;
    if (insideBuilding(city, x, y)) continue;
    cars.push(makeCar(pick(rng, CAR_MODELS), x, y, p.angle + (rng() < 0.5 ? 0 : Math.PI), 'parked'));
  }
  for (let i = 0; i < TUNING.trafficCount; i++) {
    const p = randomRoadSpawn(rng);
    const car = makeCar(pick(rng, CAR_MODELS), p.x, p.y, p.angle, 'traffic');
    car.dir = p.angle;
    car.targetSpeed = randRange(rng, 110, 190);
    cars.push(car);
  }
  return cars;
}

function nearestIntersection(car) {
  // The next road crossing ahead of the car along its heading.
  const step = 20;
  for (let d = 40; d < 700; d += step) {
    const x = car.x + Math.cos(car.angle) * d;
    const y = car.y + Math.sin(car.angle) * d;
    const onV = WORLD.vRoads.some((rx) => Math.abs(x - rx) < WORLD.roadWidth / 2);
    const onH = WORLD.hRoads.some((ry) => Math.abs(y - ry) < WORLD.roadWidth / 2);
    if (onV && onH) return { x, y, d };
  }
  return null;
}

function updateTrafficCar(car, dt, city) {
  const ahead = nearestIntersection(car);
  if (ahead && ahead.d < 60 && !car.turnAt) {
    // Decide at the intersection: keep going, or turn left / right.
    const r = Math.random();
    const turn = r < 0.45 ? 0 : r < 0.72 ? Math.PI / 2 : -Math.PI / 2;
    car.turnAt = { x: ahead.x, y: ahead.y, angle: car.angle + turn };
  }
  if (car.turnAt) {
    const target = car.turnAt.angle;
    car.angle = turnToward(car.angle, target, 2.2 * dt);
    if (Math.abs(angleDiff(car.angle, target)) < 0.05) car.turnAt = null;
  }
  // Stay on the road: gently steer back to the nearest centre line.
  const rx = nearestRoadX(car.x);
  const ry = nearestRoadY(car.y);
  const onV = Math.abs(car.x - rx) < WORLD.roadWidth / 2 - 30;
  const onH = Math.abs(car.y - ry) < WORLD.roadWidth / 2 - 30;
  if (!onV && !onH) {
    car.angle = turnToward(car.angle, Math.atan2(ry - car.y, rx - car.x), 1.5 * dt);
  }
  car.speed = clamp(car.speed + (car.targetSpeed - car.speed) * dt * 0.8, 0, car.model.topSpeed);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 120, WORLD.width - 120);
  car.y = clamp(car.y, 120, WORLD.height - 120);
  // Wrap around the far edge so traffic never runs dry.
  if (car.x <= 121 || car.x >= WORLD.width - 121 || car.y <= 121 || car.y >= WORLD.height - 121) {
    const p = randomRoadSpawn(makeRng((Math.random() * 1e9) | 0));
    car.x = p.x;
    car.y = p.y;
    car.angle = p.angle;
    car.dir = p.angle;
    car.turnAt = null;
  }
}

// Arcade handling for the player's car: grip, drift and damage.
export function updatePlayerCar(car, input, dt, game) {
  const model = car.model;
  const fwd = input.down('KeyW') || input.down('ArrowUp');
  const back = input.down('KeyS') || input.down('ArrowDown');
  const left = input.down('KeyA') || input.down('ArrowLeft');
  const right = input.down('KeyD') || input.down('ArrowRight');
  const handbrake = input.down('Space');

  if (fwd) car.speed += model.accel * dt;
  else if (back) car.speed -= model.accel * 0.8 * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 140 * dt);
  car.speed = clamp(car.speed, -model.topSpeed * 0.45, model.topSpeed);

  const steerInput = (left ? -1 : 0) + (right ? 1 : 0);
  const steerTarget = steerInput * (handbrake ? 1 : 0.85);
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
  const grip = handbrake ? model.grip * 0.45 : model.grip;
  const turnRate = car.steer * grip * clamp(Math.abs(car.speed) / 160, 0, 1) * Math.sign(car.speed || 1);
  car.angle += turnRate * dt;

  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 60, WORLD.width - 60);
  car.y = clamp(car.y, 60, WORLD.height - 60);
  car.brakeLight = back || (fwd && car.speed < -20);
  // The driver rides with the car: position, facing and the camera, the
  // minimap, the police chase and the mission checks all read the player.
  game.player.x = car.x;
  game.player.y = car.y;
  game.player.angle = car.angle;

  // Bumping into a building scrapes the car and costs speed.
  if (insideBuilding(game.city, car.x, car.y)) {
    car.x -= Math.cos(car.angle) * car.speed * dt;
    car.y -= Math.sin(car.angle) * car.speed * dt;
    if (Math.abs(car.speed) > 120) {
      car.health -= 6;
      car.smoke = 1;
      game.audio.crash();
    }
    car.speed *= 0.4;
  }
  if (car.health <= 25) car.smoke = Math.max(car.smoke, 0.6);
  if (car.health <= 0) {
    car.health = 0;
    car.speed = 0;
    game.explode(car.x, car.y);
    game.ejectPlayer(car);
  }
  game.audio.setEngine(Math.abs(car.speed) / model.topSpeed, true);
}

export function updateCars(game, dt) {
  for (const car of game.cars) {
    car.honkCooldown = Math.max(0, car.honkCooldown - dt);
    car.smoke = Math.max(0, car.smoke - dt * 0.3);
    if (car.driver === 'traffic') updateTrafficCar(car, dt, game.city);
    else if (car.driver === 'player') updatePlayerCar(car, game.input, dt, game);
  }
  // Gentle separation so traffic does not pile up on one spot.
  for (let i = 0; i < game.cars.length; i++) {
    for (let j = i + 1; j < game.cars.length; j++) {
      const a = game.cars[i];
      const b = game.cars[j];
      if (a.driver === 'parked' || b.driver === 'parked') continue;
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < 44 && d > 0.01) {
        const push = (44 - d) / 2;
        const nx = (b.x - a.x) / d;
        const ny = (b.y - a.y) / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        if (a.driver === 'player' || b.driver === 'player') {
          // A scrape, not a per-frame drain: damage scales with time spent
          // overlapped, so it is the same at any frame rate.
          const pc = a.driver === 'player' ? a : b;
          pc.health -= 8 * dt;
          pc.speed *= 0.995;
        }
      }
    }
  }
}

// Step into the nearest car (E). Stealing a parked car — or jacking a
// driven one — is a crime.
export function enterCar(game, car) {
  const player = game.player;
  if (!car) return false;
  if (car.driver === 'parked') {
    commitCrime(player, 1, game.audio);
    game.save.carsStolen += 1;
    game.toast('Stole a ' + car.model.name + ' — the PD noticed!');
  } else if (car.driver === 'traffic') {
    commitCrime(player, 1, game.audio);
    game.save.carsStolen += 1;
    game.toast('Carjacked a ' + car.model.name + ' — the PD noticed!');
  }
  car.driver = 'player';
  player.inCar = car;
  player.onFoot = false;
  player.x = car.x;
  player.y = car.y;
  return true;
}

export function exitCar(game) {
  const player = game.player;
  const car = player.inCar;
  if (!car) return;
  car.driver = 'parked';
  car.speed = 0;
  player.inCar = null;
  player.onFoot = true;
  player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  game.audio.setEngine(0, false);
}

export function spawnPoliceCar(game, nearX, nearY) {
  const p = randomRoadPoint(makeRng((Math.random() * 1e9) | 0));
  const car = makeCar(POLICE_MODEL, p.x, p.y, 0, 'police');
  car.targetSpeed = POLICE_MODEL.topSpeed;
  game.cars.push(car);
  return car;
}
