// Rendering for Solmar Bay: the top-down city, its cars and crowds, and the
// HUD — health, money, wanted stars, objective line and a live minimap.
// Everything is drawn with the canvas 2D API; no images are loaded.

import { WORLD, DISTRICTS, districtAt } from './config.js';
import { clamp, dist } from './utils.js';
import { currentObjective } from './missions.js';

export function createCamera() {
  return { x: 1200, y: 700, zoom: 1 };
}

function drawGround(ctx, cam, view) {
  // District ground colours.
  for (const d of DISTRICTS) {
    const x0 = d.x0 - cam.x;
    const y0 = d.y0 - cam.y;
    if (x0 > view.w || y0 > view.h || x0 + (d.x1 - d.x0) < 0 || y0 + (d.y1 - d.y0) < 0) continue;
    ctx.fillStyle = d.ground;
    ctx.fillRect(x0, y0, d.x1 - d.x0, d.y1 - d.y0);
  }
  // The bay along the north edge: water and a marina strip.
  ctx.fillStyle = '#2e6f8e';
  ctx.fillRect(-cam.x, -cam.y, WORLD.width, 120);
  ctx.fillStyle = '#3a86a8';
  for (let x = 100; x < WORLD.width; x += 260) {
    ctx.fillRect(x - cam.x, 40 - cam.y, 150, 6);
  }
}

function drawRoads(ctx, cam, view) {
  ctx.fillStyle = '#3a3a42';
  for (const rx of WORLD.vRoads) {
    ctx.fillRect(rx - WORLD.roadWidth / 2 - cam.x, -cam.y, WORLD.roadWidth, WORLD.height);
  }
  for (const ry of WORLD.hRoads) {
    ctx.fillRect(-cam.x, ry - WORLD.roadWidth / 2 - cam.y, WORLD.width, WORLD.roadWidth);
  }
  // Sidewalk edges.
  ctx.fillStyle = '#8a8578';
  for (const rx of WORLD.vRoads) {
    ctx.fillRect(rx - WORLD.roadWidth / 2 - cam.x, -cam.y, 8, WORLD.height);
    ctx.fillRect(rx + WORLD.roadWidth / 2 - 8 - cam.x, -cam.y, 8, WORLD.height);
  }
  for (const ry of WORLD.hRoads) {
    ctx.fillRect(-cam.x, ry - WORLD.roadWidth / 2 - cam.y, WORLD.width, 8);
    ctx.fillRect(-cam.x, ry + WORLD.roadWidth / 2 - 8 - cam.y, WORLD.width, 8);
  }
  // Lane dashes.
  ctx.fillStyle = '#d8c85a';
  ctx.fillRect(0, 0, 0, 0);
  for (const rx of WORLD.vRoads) {
    for (let y = 0; y < WORLD.height; y += 64) {
      if (y - cam.y > view.h || y - cam.y < -40) continue;
      ctx.fillRect(rx - 2 - cam.x, y - cam.y, 4, 30);
    }
  }
  for (const ry of WORLD.hRoads) {
    for (let x = 0; x < WORLD.width; x += 64) {
      if (x - cam.x > view.w || x - cam.x < -40) continue;
      ctx.fillRect(x - cam.x, ry - 2 - cam.y, 30, 4);
    }
  }
}

function drawCityDetails(ctx, game, cam, view) {
  const city = game.city;
  // Parks: green with trees.
  for (const p of city.parks) {
    if (p.x1 - cam.x < 0 || p.x0 - cam.x > view.w || p.y1 - cam.y < 0 || p.y0 - cam.y > view.h) continue;
    ctx.fillStyle = '#5e8a4a';
    ctx.fillRect(p.x0 - cam.x, p.y0 - cam.y, p.x1 - p.x0, p.y1 - p.y0);
    ctx.fillStyle = '#6fa055';
    for (let i = 0; i < p.trees; i++) {
      const tx = p.x0 + ((i * 67) % (p.x1 - p.x0));
      const ty = p.y0 + ((i * 43) % (p.y1 - p.y0));
      ctx.beginPath();
      ctx.arc(tx - cam.x, ty - cam.y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Buildings: shadow, walls, roof and lit windows.
  for (const b of city.buildings) {
    if (b.x + b.w - cam.x < 0 || b.x - cam.x > view.w || b.y + b.h - cam.y < 0 || b.y - cam.y > view.h) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 8 - cam.x, b.y + 10 - cam.y, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6 - cam.x, b.y + 6 - cam.y, b.w - 12, b.h - 12);
    ctx.fillStyle = 'rgba(255, 220, 130, 0.85)';
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor(b.h / 34));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i * 3 + j * 7 + b.height) % 4 === 0) continue;
        ctx.fillRect(b.x + 12 + i * 34 - cam.x, b.y + 12 + j * 34 - cam.y, 14, 10);
      }
    }
  }
  // Props: palms, lamps, hydrants.
  for (const p of city.props) {
    if (p.x - cam.x < -20 || p.x - cam.x > view.w + 20 || p.y - cam.y < -20 || p.y - cam.y > view.h + 20) continue;
    if (p.kind === 'palm') {
      ctx.strokeStyle = '#6a4a2e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p.x - cam.x, p.y - cam.y);
      ctx.lineTo(p.x + 4 - cam.x, p.y - 16 - cam.y);
      ctx.stroke();
      ctx.fillStyle = '#3f7a3a';
      ctx.beginPath();
      ctx.arc(p.x + 4 - cam.x, p.y - 18 - cam.y, 11, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'lamp') {
      ctx.strokeStyle = '#2e2e34';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x - cam.x, p.y - cam.y);
      ctx.lineTo(p.x - cam.x, p.y - 22 - cam.y);
      ctx.stroke();
      ctx.fillStyle = '#ffe9a0';
      ctx.beginPath();
      ctx.arc(p.x - cam.x, p.y - 24 - cam.y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#c22e3e';
      ctx.fillRect(p.x - 4 - cam.x, p.y - 8 - cam.y, 8, 12);
    }
  }
}

function drawCarShape(ctx, car, cam, time) {
  const x = car.x - cam.x;
  const y = car.y - cam.y;
  const len = car.model.kind === 'van' ? 62 : car.model.kind === 'suv' ? 56 : 50;
  const wid = car.model.kind === 'van' ? 30 : 26;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(car.angle);
  // Wheels.
  ctx.fillStyle = '#111';
  ctx.fillRect(-len / 2 + 4, -wid / 2 - 3, 12, 6);
  ctx.fillRect(-len / 2 + 4, wid / 2 - 3, 12, 6);
  ctx.fillRect(len / 2 - 16, -wid / 2 - 3, 12, 6);
  ctx.fillRect(len / 2 - 16, wid / 2 - 3, 12, 6);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -len / 2, -wid / 2, len, wid, 8);
  ctx.fill();
  // Cabin and windshield.
  ctx.fillStyle = 'rgba(20, 30, 44, 0.9)';
  roundRect(ctx, -6, -wid / 2 + 4, 18, wid - 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(180, 220, 255, 0.7)';
  ctx.fillRect(len / 2 - 12, -wid / 2 + 5, 4, wid - 10);
  // Headlights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(len / 2 - 2, -wid / 2 + 3, 3, 5);
  ctx.fillRect(len / 2 - 2, wid / 2 - 8, 3, 5);
  if (car.brakeLight) {
    ctx.fillStyle = '#ff2e2e';
    ctx.fillRect(-len / 2 - 1, -wid / 2 + 3, 3, 5);
    ctx.fillRect(-len / 2 - 1, wid / 2 - 8, 3, 5);
  }
  // Police light bar, flashing red and blue.
  if (car.model.kind === 'police') {
    const phase = Math.floor(time * 6) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2e2e' : '#2e5eff';
    ctx.fillRect(-8, -wid / 2 - 2, 8, 5);
    ctx.fillStyle = phase ? '#2e5eff' : '#ff2e2e';
    ctx.fillRect(-8, wid / 2 - 3, 8, 5);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
  }
  // Taxi sign.
  if (car.model.kind === 'taxi') {
    ctx.fillStyle = '#111';
    ctx.fillRect(-8, -4, 16, 8);
    ctx.fillStyle = '#f2c200';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 2);
  }
  ctx.restore();
  // Damage smoke.
  if (car.smoke > 0.2) {
    ctx.fillStyle = 'rgba(80,80,80,' + (0.25 + car.smoke * 0.4) + ')';
    ctx.beginPath();
    ctx.arc(x - Math.cos(car.angle) * 20, y - Math.sin(car.angle) * 20, 10 + Math.random() * 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPlayerShape(ctx, game, cam) {
  const p = game.player;
  const x = p.x - cam.x;
  const y = p.y - cam.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: jacket and head.
  ctx.fillStyle = '#2e4a6b';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(4, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  // Pistol in hand.
  if (!p.inCar) {
    ctx.fillStyle = '#222';
    ctx.fillRect(8, -2, 12, 4);
  }
  ctx.restore();
}

function drawPeds(ctx, game, cam) {
  for (const p of game.peds) {
    const x = p.x - cam.x;
    const y = p.y - cam.y;
    if (x < -30 || x > 2000 || y < -30 || y > 2000) continue;
    if (p.state === 'down') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.shirt;
      ctx.beginPath();
      ctx.ellipse(x, y, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.shirt;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(3, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawMarker(ctx, game, cam, time) {
  const obj = currentObjective(game);
  if (!obj || !obj.x) return;
  const x = obj.x - cam.x;
  const y = obj.y - cam.y;
  const pulse = 1 + Math.sin(time * 4) * 0.15;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#ffd23c';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  const s = 14 * pulse;
  ctx.beginPath();
  ctx.rect(-s / 2, -s / 2, s, s);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Beacon column rising from the marker.
  const grad = ctx.createLinearGradient(0, y, 0, y - 220);
  grad.addColorStop(0, 'rgba(255, 210, 60, 0.35)');
  grad.addColorStop(1, 'rgba(255, 210, 60, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - 8, y - 220, 16, 220);
}

function drawMinimap(ctx, game, view) {
  const mw = 190;
  const mh = 140;
  const mx = view.w - mw - 16;
  const my = view.h - mh - 16;
  const sx = mw / WORLD.width;
  const sy = mh / WORLD.height;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 12, 24, 0.78)';
  roundRect(ctx, mx - 6, my - 6, mw + 12, mh + 12, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  // District tints.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(mx + d.x0 * sx, my + d.y0 * sy, (d.x1 - d.x0) * sx, (d.y1 - d.y0) * sy);
  }
  // Roads.
  ctx.fillStyle = '#3a3a42';
  for (const rx of WORLD.vRoads) ctx.fillRect(mx + rx * sx - 1, my, 2, mh);
  for (const ry of WORLD.hRoads) ctx.fillRect(mx, my + ry * sy - 1, mw, 2);
  // Objective marker.
  const obj = currentObjective(game);
  if (obj && obj.x) {
    ctx.fillStyle = '#ffd23c';
    ctx.beginPath();
    ctx.arc(mx + obj.x * sx, my + obj.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cops.
  ctx.fillStyle = '#4a8aff';
  for (const c of game.police.interceptors) {
    ctx.beginPath();
    ctx.arc(mx + c.x * sx, my + c.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#7ab8ff';
  for (const cop of game.police.footCops) {
    ctx.fillRect(mx + cop.x * sx - 2, my + cop.y * sy - 2, 4, 4);
  }
  // Player arrow.
  const p = game.player;
  ctx.save();
  ctx.translate(mx + p.x * sx, my + p.y * sy);
  ctx.rotate(p.inCar ? p.inCar.angle : p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(districtAt(p.x, p.y).name.toUpperCase(), mx, my - 10);
}

function drawHud(ctx, game, view) {
  const p = game.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Money + health, top left.
  ctx.fillStyle = 'rgba(10,12,24,0.72)';
  roundRect(ctx, 12, 12, 210, 64, 8);
  ctx.fill();
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('$' + Math.floor(p.money).toLocaleString('en-US'), 24, 40);
  ctx.fillStyle = '#333';
  ctx.fillRect(24, 50, 186, 12);
  ctx.fillStyle = p.hp > 40 ? '#4ade80' : '#ef4444';
  ctx.fillRect(24, 50, 186 * clamp(p.hp / 100, 0, 1), 12);
  ctx.fillStyle = '#fff';
  ctx.font = '11px sans-serif';
  ctx.fillText('HEALTH ' + Math.round(p.hp), 24, 72);
  // Wanted stars, top right.
  const stars = p.wanted;
  ctx.fillStyle = 'rgba(10,12,24,0.72)';
  roundRect(ctx, view.w - 190, 12, 178, 44, 8);
  ctx.fill();
  ctx.font = '24px sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < stars ? '#ffd23c' : 'rgba(255,255,255,0.25)';
    ctx.fillText('\u2605', view.w - 178 + i * 34, 42);
  }
  // Objective line, top centre.
  const obj = currentObjective(game);
  if (obj) {
    ctx.font = 'bold 15px sans-serif';
    const w = ctx.measureText(obj.label).width + 28;
    ctx.fillStyle = 'rgba(10,12,24,0.72)';
    roundRect(ctx, (view.w - w) / 2, 12, w, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd23c';
    ctx.textAlign = 'center';
    ctx.fillText(obj.label, view.w / 2, 35);
    ctx.textAlign = 'left';
    if (obj.timer != null) {
      ctx.fillStyle = obj.timer < 20 ? '#ff5a5a' : '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('TIME ' + Math.ceil(obj.timer) + 's', (view.w - w) / 2 + 8, 70);
    }
  }
  // Driving readout, bottom left.
  if (p.inCar) {
    const car = p.inCar;
    ctx.fillStyle = 'rgba(10,12,24,0.72)';
    roundRect(ctx, 12, view.h - 76, 190, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(Math.round(Math.abs(car.speed) * 0.36) + ' km/h', 24, view.h - 44);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#ffd23c';
    ctx.fillText(car.model.name, 24, view.h - 24);
    ctx.fillStyle = '#333';
    ctx.fillRect(24, view.h - 20, 166, 6);
    ctx.fillStyle = car.health > 30 ? '#4ade80' : '#ef4444';
    ctx.fillRect(24, view.h - 20, 166 * clamp(car.health / car.model.hp, 0, 1), 6);
  } else {
    // On foot: ammo + controls hint.
    ctx.fillStyle = 'rgba(10,12,24,0.72)';
    roundRect(ctx, 12, view.h - 76, 210, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('PISTOL  ' + p.ammo + ' rounds', 24, view.h - 48);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.fillText('E — steal car    J — next job    T — taxi fare', 24, view.h - 26);
  }
  drawMinimap(ctx, game, view);
}

export function render(game, ctx, view, time) {
  const cam = game.camera;
  ctx.clearRect(0, 0, view.w, view.h);
  // Sunset sky wash behind everything.
  const sky = ctx.createLinearGradient(0, 0, 0, view.h);
  sky.addColorStop(0, '#ff9a5a');
  sky.addColorStop(0.5, '#e86a7a');
  sky.addColorStop(1, '#7a4a8a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.save();
  ctx.scale(cam.zoom, cam.zoom);
  drawGround(ctx, cam, view);
  drawRoads(ctx, cam, view);
  drawCityDetails(ctx, game, cam, view);
  drawMarker(ctx, game, cam, time);
  drawPeds(ctx, game, cam);
  for (const car of game.cars) drawCarShape(ctx, car, cam, time);
  for (const cop of game.police.footCops) {
    const x = cop.x - cam.x;
    const y = cop.y - cam.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(cop.angle);
    ctx.fillStyle = '#1c3a6b';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath();
    ctx.arc(3, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
    ctx.restore();
  }
  // Gang members.
  for (const e of game.combat.enemies) {
    if (e.hp <= 0) continue;
    const x = e.x - cam.x;
    const y = e.y - cam.y;
    ctx.fillStyle = '#7a1c1c';
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', x, y + 3);
  }
  // Bullets and flashes.
  for (const b of game.combat.bullets) {
    ctx.strokeStyle = '#ffe9a0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x - cam.x, b.y - cam.y);
    ctx.lineTo(b.x - b.vx * 0.02 - cam.x, b.y - b.vy * 0.02 - cam.y);
    ctx.stroke();
  }
  for (const f of game.combat.flashes) {
    ctx.fillStyle = 'rgba(255, 220, 120, 0.9)';
    ctx.beginPath();
    ctx.arc(f.x - cam.x, f.y - cam.y, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const ex of game.combat.explosions) {
    const r = ex.radius * (1 - ex.life / 0.7) + 20;
    ctx.fillStyle = 'rgba(255, 120, 40, ' + (ex.life / 0.7) + ')';
    ctx.beginPath();
    ctx.arc(ex.x - cam.x, ex.y - cam.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  drawPlayerShape(ctx, game, cam);
  ctx.restore();
  // Warm sunset vignette over the world.
  const vig = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.45, view.w / 2, view.h / 2, view.h * 0.85);
  vig.addColorStop(0, 'rgba(255, 150, 80, 0)');
  vig.addColorStop(1, 'rgba(120, 40, 90, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, view.w, view.h);
  if (game.state === 'play') drawHud(ctx, game, view);
}
