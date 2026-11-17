// Screenshot staging: ?shot=cover|drive|foot|heist arranges a real, live
// scene of the game — the same code the player plays, posed by moving the
// player, the cars and the cops, never by drawing anything fake.

import { CAR_MODELS } from './config.js';
import { makeCar } from './cars.js';
import { startNextMission } from './missions.js';

function putPlayerInCar(game, modelId, x, y, angle, speed) {
  const model = CAR_MODELS.find((m) => m.id === modelId) || CAR_MODELS[3];
  const car = makeCar(model, x, y, angle, 'player');
  car.speed = speed;
  game.cars.push(car);
  game.player.inCar = car;
  game.player.onFoot = false;
  game.player.x = x;
  game.player.y = y;
  game.player.angle = angle;
  return car;
}

function addInterceptor(game, x, y, angle) {
  const car = makeCar(
    { id: 'police', name: 'Solmar PD Interceptor', kind: 'police', color: '#1c1c22', topSpeed: 540, accel: 460, grip: 4.8, hp: 120 },
    x, y, angle, 'police',
  );
  car.speed = 420;
  game.cars.push(car);
  game.police.interceptors.push(car);
  return car;
}

function addTrafficNear(game, x, y) {
  const spots = [
    [x - 260, y - 40, 0], [x + 300, y + 40, Math.PI], [x - 60, y + 220, Math.PI / 2],
    [x + 120, y - 260, -Math.PI / 2], [x - 420, y + 60, 0],
  ];
  for (const [cx, cy, a] of spots) {
    const model = CAR_MODELS[(Math.abs(cx) + Math.abs(cy)) % CAR_MODELS.length];
    const car = makeCar(model, cx, cy, a, 'traffic');
    car.speed = 140;
    car.targetSpeed = 160;
    game.cars.push(car);
  }
}

export function stageShot(game, mode) {
  const player = game.player;
  game.state = 'play';
  if (mode === 'cover') {
    // The money shot: a five-star escape in the Comet R, interceptors on
    // the tail, traffic everywhere, the marina safehouse on the HUD.
    putPlayerInCar(game, 'sport', 2200, 1700, 0, 430);
    player.wanted = 3;
    player.wantedTimer = 0;
    player.money = 12840;
    addInterceptor(game, 2200 - 260, 1700 - 30, 0);
    addInterceptor(game, 2200 - 340, 1700 + 44, 0);
    addTrafficNear(game, 2200, 1700);
    // Force the final job active so the objective reads on screen.
    game.missions.index = 5;
    startNextMission(game);
    game.missions.active.step = 2;
    game.missions.active.target = { x: 700, y: 200, label: 'Escape to the marina safehouse!' };
  } else if (mode === 'drive') {
    putPlayerInCar(game, 'coupe', 1200, 1200, Math.PI / 2, 380);
    player.wanted = 1;
    player.wantedTimer = 0;
    player.money = 2450;
    addTrafficNear(game, 1200, 1200);
    game.missions.index = 0;
    startNextMission(game);
    game.missions.active.step = 1;
    game.missions.active.target = { x: 1700, y: 700, label: 'Chop garage, Old Harbor' };
  } else if (mode === 'foot') {
    // On foot in Coral Row, pistol out, pedestrians on the sidewalk.
    player.x = 3700;
    player.y = 1200;
    player.angle = -Math.PI / 2;
    player.ammo = 18;
    player.money = 760;
    player.wanted = 0;
    for (const p of game.peds) {
      // Spread the crowd along the two roads crossing here, on the
      // sidewalks, instead of bunching them around the player.
      const along = -400 + ((p.id * 173) % 800);
      if (p.id % 2 === 0) {
        p.x = 3700 + along;
        p.y = 1200 + (p.id % 4 < 2 ? -62 : 62);
      } else {
        p.x = 3700 + (p.id % 4 < 2 ? -62 : 62);
        p.y = 1200 + along;
      }
      p.state = 'walk';
    }
    game.missions.index = 3;
    startNextMission(game);
  } else if (mode === 'heist') {
    // The Dockside shootout: rivals firing, cops closing in, muzzle flash.
    player.x = 2200;
    player.y = 2500;
    player.angle = Math.PI / 2;
    player.ammo = 24;
    player.wanted = 4;
    player.wantedTimer = 0;
    player.money = 5120;
    game.missions.index = 3;
    startNextMission(game);
    game.missions.active.step = 1;
    for (let i = 0; i < 6; i++) {
      game.combat.enemies.push({
        x: 2200 + (i - 2.5) * 70,
        y: 2700 + (i % 2 === 0 ? -30 : 30),
        hp: 100,
        shootTimer: 1.2 + i * 0.4, // hold the first volley so the shot is taken alive
      });
    }
    game.missions.active.target = { x: 2200, y: 2700, label: 'Take out the rival crew (6 left)' };
    addInterceptor(game, 1900, 2700, 0);
  }
  game.camera.x = player.x - 640;
  game.camera.y = player.y - 360;
  // Screenshots show the game, not the new-job banner: the mission stays
  // active on the HUD, the popup is dismissed.
  game.ui.banner = null;
  game.ui.toast = null;
}
