// City generation for Port Solmar: a road grid, blocks filled with buildings,
// parks and props, plus the queries the traffic, pedestrians and missions use
// to find roads, sidewalks and open ground.

import { WORLD, DISTRICTS, districtAt } from './config.js';
import { makeRng, pick, randRange, clamp } from './utils.js';

export function buildCity() {
  const rng = makeRng(WORLD.seed);
  const buildings = [];
  const parks = [];
  const props = []; // palms, lamps, hydrants, crates
  const roadSet = new Set();
  for (const x of WORLD.vRoads) roadSet.add('v' + x);
  for (const y of WORLD.hRoads) roadSet.add('h' + y);

  // Blocks sit between neighbouring road centre lines.
  for (let i = 0; i < WORLD.vRoads.length - 1; i++) {
    for (let j = 0; j < WORLD.hRoads.length - 1; j++) {
      const x0 = WORLD.vRoads[i] + WORLD.roadWidth / 2 + 14;
      const x1 = WORLD.vRoads[i + 1] - WORLD.roadWidth / 2 - 14;
      const y0 = WORLD.hRoads[j] + WORLD.roadWidth / 2 + 14;
      const y1 = WORLD.hRoads[j + 1] - WORLD.roadWidth / 2 - 14;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      const roll = rng();
      const d = districtAt((x0 + x1) / 2, (y0 + y1) / 2);
      if (roll < 0.16) {
        parks.push({ x0, y0, x1, y1, district: d.name, trees: 6 + Math.floor(rng() * 8) });
        for (let t = 0; t < 8; t++) {
          props.push({ kind: 'palm', x: randRange(rng, x0 + 20, x1 - 20), y: randRange(rng, y0 + 20, y1 - 20) });
        }
        continue;
      }
      // One or two buildings per block, with a courtyard gap.
      const split = rng() < 0.5;
      const slots = split
        ? [{ x0, y0, x1: (x0 + x1) / 2 - 12, y1 }, { x0: (x0 + x1) / 2 + 12, y0, x1, y1 }]
        : [{ x0, y0, x1, y1 }];
      for (const s of slots) {
        const w = s.x1 - s.x0;
        const h = s.y1 - s.y0;
        const inset = 14 + rng() * 20;
        buildings.push({
          x: s.x0 + inset,
          y: s.y0 + inset,
          w: w - inset * 2,
          h: h - inset * 2,
          height: 2 + Math.floor(rng() * 9),
          color: pick(rng, ['#7a6a8a', '#8a7a6a', '#6a7a8a', '#9a8a7a', '#5e6a7a', '#a08a6a', '#746a5e']),
          roof: pick(rng, ['#4a4038', '#5e4a3a', '#3a4a42', '#6a5a4a']),
          district: d.name,
          windows: Math.floor(rng() * 3),
        });
      }
      // Street props along the block edges.
      for (let k = 0; k < 4; k++) {
        props.push({ kind: pick(rng, ['lamp', 'palm', 'hydrant']), x: randRange(rng, x0, x1), y: y0 - 6 });
        props.push({ kind: pick(rng, ['lamp', 'palm']), x: randRange(rng, x0, x1), y: y1 + 6 });
      }
    }
  }
  return { buildings, parks, props, roadSet };
}

// Is the point on a road (within half the road width of a centre line)?
export function onRoad(x, y) {
  const half = WORLD.roadWidth / 2;
  for (const rx of WORLD.vRoads) if (Math.abs(x - rx) < half) return true;
  for (const ry of WORLD.hRoads) if (Math.abs(y - ry) < half) return true;
  return false;
}

// Is the point inside any building (solid for cars and people)?
export function insideBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return b;
  }
  return null;
}

export function nearestRoadX(x) {
  let best = WORLD.vRoads[0];
  for (const rx of WORLD.vRoads) if (Math.abs(rx - x) < Math.abs(best - x)) best = rx;
  return best;
}

export function nearestRoadY(y) {
  let best = WORLD.hRoads[0];
  for (const ry of WORLD.hRoads) if (Math.abs(ry - y) < Math.abs(best - y)) best = ry;
  return best;
}

// Snap a point to the nearest road centre line.
export function snapToRoad(x, y) {
  const rx = nearestRoadX(x);
  const ry = nearestRoadY(y);
  return Math.abs(rx - x) < Math.abs(ry - y) ? { x: rx, y, axis: 'v' } : { x, y: ry, axis: 'h' };
}

// Random open point on a road, away from the map edge.
export function randomRoadPoint(rng) {
  if (rng() < 0.5) {
    return { x: pick(rng, WORLD.vRoads), y: randRange(rng, 260, WORLD.height - 260) };
  }
  return { x: randRange(rng, 260, WORLD.width - 260), y: pick(rng, WORLD.hRoads) };
}

// Random sidewalk point: just off a road, not inside a building.
export function randomSidewalkPoint(city, rng) {
  for (let tries = 0; tries < 20; tries++) {
    const p = randomRoadPoint(rng);
    const off = (WORLD.roadWidth / 2 + 14) * (rng() < 0.5 ? -1 : 1);
    const cand = rng() < 0.5 ? { x: p.x + off, y: p.y } : { x: p.x, y: p.y + off };
    cand.x = clamp(cand.x, 60, WORLD.width - 60);
    cand.y = clamp(cand.y, 60, WORLD.height - 60);
    if (!insideBuilding(city, cand.x, cand.y)) return cand;
  }
  return { x: 700, y: 260 };
}

export { DISTRICTS, districtAt };
