// Vera Solano's six jobs and the taxi side-hustle. Missions run in order;
// each one is a small state machine of steps with a map marker, a timer
// where it matters, and a payout at the end.

import { MISSIONS, TUNING } from './config.js';
import { dist, formatMoney } from './utils.js';
import { storeSave } from './save.js';
import { makeRng } from './utils.js';
import { randomRoadPoint } from './city.js';

const GARAGE = { x: 1700, y: 700, label: 'Chop garage, Old Harbor' };
const MARINA_SAFEHOUSE = { x: 700, y: 200, label: 'Marina safehouse' };
const BANK = { x: 4200, y: 2700, label: 'Palm Court bank' };
const DOCKYARD = { x: 2200, y: 2700, label: 'Dockside yard' };
const CONTACT = { x: 4200, y: 1200, label: 'Vera\u2019s cousin, Coral Row' };
const PALM_SAFEHOUSE = { x: 4700, y: 2700, label: 'Palm Court safehouse' };
const RACE_POINTS = [
  { x: 700, y: 700 }, { x: 4200, y: 700 }, { x: 4700, y: 2200 },
  { x: 1200, y: 3200 }, { x: 2200, y: 1700 },
];

export function createMissions(save) {
  return {
    index: save.missionsDone.length, // next job to run
    active: null, // {def, step, target, timer, checkpoints, cpIndex, grabTimer}
    complete: null, // last finished mission, shown as a banner
    completeTimer: 0,
    taxi: null, // {stage, px, py, dx, dy, fare, label}
  };
}

export function nextMissionDef(missions) {
  return MISSIONS[missions.index] || null;
}

export function startNextMission(game) {
  const def = nextMissionDef(game.missions);
  if (!def) {
    game.toast('All six jobs done. Vera says you\u2019re a legend of Port Solmar.');
    return false;
  }
  const m = { def, step: 0, target: null, timer: 0, checkpoints: [], cpIndex: 0, grabTimer: 0 };
  if (def.id === 'm1') {
    m.target = { x: 0, y: 0, label: 'Steal any car' };
  } else if (def.id === 'm2') {
    m.target = { ...CONTACT };
  } else if (def.id === 'm3') {
    m.target = { x: 0, y: 0, label: 'Steal a Vantara GT (red coupe)' };
  } else if (def.id === 'm4') {
    m.target = { ...DOCKYARD };
  } else if (def.id === 'm5') {
    m.checkpoints = RACE_POINTS.map((p) => ({ ...p }));
    m.target = { ...m.checkpoints[0], label: 'Checkpoint 1 of 5' };
    m.timer = 120;
  } else if (def.id === 'm6') {
    m.target = { ...BANK };
  }
  game.missions.active = m;
  game.banner('NEW JOB: ' + def.title, def.brief, 5);
  game.audio.pickup();
  return true;
}

function finishMission(game) {
  const m = game.missions.active;
  const player = game.player;
  player.money += m.def.pay;
  game.save.missionsDone.push(m.def.id);
  game.save.money = player.money;
  storeSave(game.save);
  game.missions.complete = m.def;
  game.missions.completeTimer = 5;
  game.missions.active = null;
  game.missions.index += 1;
  game.combat.enemies.length = 0;
  game.audio.missionDone();
  game.banner('JOB DONE: ' + m.def.title, 'Vera paid ' + formatMoney(m.def.pay) + '.', 5);
}

function failMission(game, reason) {
  const m = game.missions.active;
  game.missions.active = null;
  game.combat.enemies.length = 0;
  game.banner('JOB FAILED: ' + m.def.title, reason + ' Press J to try again.', 5);
}

function near(player, target, radius) {
  return target && dist(player.x, player.y, target.x, target.y) < radius;
}

export function updateMissions(game, dt) {
  const ms = game.missions;
  if (ms.completeTimer > 0) ms.completeTimer -= dt;
  const m = ms.active;
  const player = game.player;
  if (!m) {
    updateTaxi(game, dt);
    return;
  }

  if (m.def.id === 'm1') {
    if (m.step === 0) {
      if (player.inCar) {
        m.step = 1;
        m.target = { ...GARAGE };
        game.toast('Good wheels. Take it to the chop garage.');
      }
    } else if (near(player, m.target, 80) && player.inCar) {
      finishMission(game);
    }
  } else if (m.def.id === 'm2') {
    if (m.step === 0 && near(player, m.target, 70)) {
      m.step = 1;
      m.target = { ...PALM_SAFEHOUSE };
      game.toast('Cousin\u2019s in. Get him to Palm Court — and keep it clean.');
    } else if (m.step === 1 && near(player, m.target, 80)) {
      finishMission(game);
    }
  } else if (m.def.id === 'm3') {
    if (m.step === 0) {
      if (player.inCar && player.inCar.model.id === 'coupe') {
        m.step = 1;
        m.target = { ...GARAGE };
        player.wanted = Math.max(player.wanted, 2);
        player.wantedTimer = 0;
        game.toast('That\u2019s the one. Lose the heat and deliver it.');
      }
    } else if (near(player, m.target, 80) && player.inCar) {
      finishMission(game);
    }
  } else if (m.def.id === 'm4') {
    if (m.step === 0 && near(player, m.target, 90)) {
      m.step = 1;
      // The rival crew opens fire from the road by the containers — on open
      // ground, never inside a building, so the shootout is winnable.
      for (let i = 0; i < 6; i++) {
        game.combat.enemies.push({
          x: DOCKYARD.x + (i - 2.5) * 70,
          y: DOCKYARD.y + (i % 2 === 0 ? -30 : 30),
          hp: 100,
          shootTimer: 0.5 + i * 0.3,
        });
      }
      m.target = { x: DOCKYARD.x, y: DOCKYARD.y, label: 'Take out the rival crew (6)' };
      game.toast('They\u2019re here. On foot, pistol out — good luck.');
      player.wanted = Math.max(player.wanted, 2);
      player.wantedTimer = 0;
    } else if (m.step === 1) {
      const left = game.combat.enemies.filter((e) => e.hp > 0).length;
      m.target.label = 'Take out the rival crew (' + left + ' left)';
      if (left === 0) finishMission(game);
    }
  } else if (m.def.id === 'm5') {
    m.timer -= dt;
    if (m.timer <= 0) {
      failMission(game, 'Out of time on the Sunset Run.');
      return;
    }
    if (near(player, m.target, 90)) {
      m.cpIndex += 1;
      if (m.cpIndex >= m.checkpoints.length) {
        finishMission(game);
      } else {
        const cp = m.checkpoints[m.cpIndex];
        m.target = { ...cp, label: 'Checkpoint ' + (m.cpIndex + 1) + ' of 5' };
        game.audio.pickup();
      }
    }
  } else if (m.def.id === 'm6') {
    if (m.step === 0 && near(player, m.target, 80)) {
      m.step = 1;
      m.grabTimer = 8;
      m.target = { ...BANK, label: 'Grabbing the cash — hold the bank!' };
      game.toast('Vault\u2019s open. Hold on for 8 seconds.');
    } else if (m.step === 1) {
      m.grabTimer -= dt;
      m.target.label = 'Grabbing the cash — ' + Math.ceil(m.grabTimer) + 's';
      if (!near(player, m.target, 110)) {
        m.step = 0;
        m.target = { ...BANK };
        game.toast('You left the bank too soon. Get back in there.');
      } else if (m.grabTimer <= 0) {
        m.step = 2;
        m.target = { ...MARINA_SAFEHOUSE, label: 'Escape to the marina safehouse!' };
        player.wanted = 5;
        player.wantedTimer = 0;
        game.banner('FIVE STARS', 'Every cop in Port Solmar is coming. Run!', 4);
      }
    } else if (m.step === 2 && near(player, m.target, 90)) {
      game.save.bestWantedEscape = Math.max(game.save.bestWantedEscape, 5);
      finishMission(game);
    }
  }
}

// Taxi fares: press T in a car to take a fare, pick the rider up, drop them
// off. Pays a base fare plus distance.
export function startTaxi(game) {
  const player = game.player;
  if (!player.inCar || game.missions.taxi) return false;
  const rng = makeRng((Math.random() * 1e9) | 0);
  const pickup = randomRoadPoint(rng);
  const drop = randomRoadPoint(rng);
  const fare = Math.round(TUNING.taxiBaseFare + dist(pickup.x, pickup.y, drop.x, drop.y) * TUNING.taxiPerPx);
  game.missions.taxi = {
    stage: 0, px: pickup.x, py: pickup.y, dx: drop.x, dy: drop.y, fare,
    label: 'Pick up the rider (' + formatMoney(fare) + ')',
  };
  game.toast('Taxi fare: pick up the rider for ' + formatMoney(fare) + '.');
  return true;
}

function updateTaxi(game, dt) {
  const taxi = game.missions.taxi;
  if (!taxi) return;
  const player = game.player;
  if (!player.inCar) {
    game.missions.taxi = null;
    game.toast('Fare cancelled — you left the car.');
    return;
  }
  if (taxi.stage === 0 && dist(player.x, player.y, taxi.px, taxi.py) < 80) {
    taxi.stage = 1;
    taxi.label = 'Drop the rider off (' + formatMoney(taxi.fare) + ')';
    game.audio.pickup();
  } else if (taxi.stage === 1 && dist(player.x, player.y, taxi.dx, taxi.dy) < 80) {
    player.money += taxi.fare;
    game.save.money = player.money;
    game.save.taxiTrips += 1;
    storeSave(game.save);
    game.missions.taxi = null;
    game.audio.missionDone();
    game.toast('Fare complete: +' + formatMoney(taxi.fare) + '.');
  }
}

// The current objective line for the HUD, or null when free-roaming.
export function currentObjective(game) {
  const m = game.missions.active;
  if (m) {
    return {
      label: m.def.title + ' — ' + (m.target ? m.target.label : ''),
      x: m.target ? m.target.x : 0,
      y: m.target ? m.target.y : 0,
      timer: m.def.id === 'm5' ? m.timer : null,
    };
  }
  const taxi = game.missions.taxi;
  if (taxi) {
    return {
      label: 'Taxi: ' + taxi.label,
      x: taxi.stage === 0 ? taxi.px : taxi.dx,
      y: taxi.stage === 0 ? taxi.py : taxi.dy,
      timer: null,
    };
  }
  const next = nextMissionDef(game.missions);
  return next ? { label: 'Next job: ' + next.title + ' — press J to start', x: 0, y: 0, timer: null } : null;
}
