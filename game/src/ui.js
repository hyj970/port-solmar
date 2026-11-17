// Menus and messages for Solmar Bay: the sunset title screen, the pause
// screen, the busted / wasted screen, banners for jobs and toasts for the
// small stuff. All drawn on the same canvas as the game.

import { CONTROLS_TEXT, MISSIONS } from './config.js';
import { formatMoney } from './utils.js';

export function createUi() {
  return {
    banner: null, // {title, sub, timer}
    toast: null, // {text, timer}
    menuIndex: 0,
  };
}

export function showBanner(ui, title, sub, seconds) {
  ui.banner = { title, sub, timer: seconds };
}

export function showToast(ui, text, seconds) {
  ui.toast = { text, timer: seconds || 3 };
}

export function updateUi(ui, dt) {
  if (ui.banner) {
    ui.banner.timer -= dt;
    if (ui.banner.timer <= 0) ui.banner = null;
  }
  if (ui.toast) {
    ui.toast.timer -= dt;
    if (ui.toast.timer <= 0) ui.toast = null;
  }
}

function panel(ctx, view, w, h) {
  const x = (view.w - w) / 2;
  const y = (view.h - h) / 2;
  ctx.fillStyle = 'rgba(12, 10, 28, 0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffd23c';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  return { x, y };
}

export function drawMenu(ctx, game, view) {
  const p = panel(ctx, view, 620, 480);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23c';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText('SOLMAR BAY', view.w / 2, p.y + 78);
  ctx.fillStyle = '#ff9a5a';
  ctx.font = '20px sans-serif';
  ctx.fillText('An open-world crime story in Port Solmar', view.w / 2, p.y + 112);
  ctx.fillStyle = '#fff';
  ctx.font = '15px sans-serif';
  ctx.fillText('Six jobs for fixer Vera Solano. Steal cars, dodge the PD,', view.w / 2, p.y + 150);
  ctx.fillText('run taxis, and pull the biggest job the bay has ever seen.', view.w / 2, p.y + 172);
  const items = ['NEW GAME', 'CONTINUE  (' + game.save.missionsDone.length + ' of 6 jobs done)', 'HOW TO PLAY'];
  const ui = game.ui;
  items.forEach((label, i) => {
    const y = p.y + 220 + i * 44;
    ctx.fillStyle = ui.menuIndex === i ? '#ffd23c' : '#ddd';
    ctx.font = (ui.menuIndex === i ? 'bold ' : '') + '20px sans-serif';
    ctx.fillText((ui.menuIndex === i ? '\u25b6 ' : '  ') + label, view.w / 2, y);
  });
  ctx.fillStyle = '#aaa';
  ctx.font = '13px sans-serif';
  ctx.fillText('Up / Down to choose, Enter to confirm — or press Enter to start', view.w / 2, p.y + 372);
  ctx.fillText('Money saved: ' + formatMoney(game.player.money) + '   •   Best escape: ' + game.save.bestWantedEscape + ' stars', view.w / 2, p.y + 398);
  if (ui.menuIndex === 2) {
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    CONTROLS_TEXT.forEach((line, i) => ctx.fillText(line, view.w / 2, p.y + 428 + i * 0));
  }
  ctx.textAlign = 'left';
}

export function drawPause(ctx, game, view) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, view.w, view.h);
  const p = panel(ctx, view, 520, 360);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23c';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('PAUSED', view.w / 2, p.y + 64);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText('Money: ' + formatMoney(game.player.money), view.w / 2, p.y + 110);
  ctx.fillText('Jobs done: ' + game.save.missionsDone.length + ' of 6', view.w / 2, p.y + 136);
  ctx.fillText('Cars stolen: ' + game.save.carsStolen + '   Taxi trips: ' + game.save.taxiTrips, view.w / 2, p.y + 162);
  ctx.fillStyle = '#ccc';
  ctx.font = '14px sans-serif';
  CONTROLS_TEXT.forEach((line, i) => ctx.fillText(line, view.w / 2, p.y + 200 + i * 22));
  ctx.fillText('P — resume      M — mute sound', view.w / 2, p.y + 308);
  ctx.textAlign = 'left';
}

export function drawEndScreen(ctx, game, view) {
  ctx.fillStyle = 'rgba(20, 0, 10, 0.55)';
  ctx.fillRect(0, 0, view.w, view.h);
  const p = panel(ctx, view, 520, 240);
  const player = game.player;
  ctx.textAlign = 'center';
  ctx.fillStyle = player.wasted ? '#ff5a5a' : '#ffd23c';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(player.wasted ? 'WASTED' : 'BUSTED', view.w / 2, p.y + 76);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText(player.wasted ? 'The bay is quiet without you. For now.' : 'The PD took their cut. The streets wait.', view.w / 2, p.y + 118);
  ctx.fillText('Press R to get back out there', view.w / 2, p.y + 156);
  ctx.textAlign = 'left';
}

export function drawOverlays(ctx, game, view) {
  const ui = game.ui;
  if (ui.banner) {
    const a = Math.min(1, ui.banner.timer);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,12,24,0.8)';
    const w = Math.min(640, view.w - 80);
    ctx.fillRect((view.w - w) / 2, 90, w, 74);
    ctx.strokeStyle = '#ffd23c';
    ctx.lineWidth = 2;
    ctx.strokeRect((view.w - w) / 2, 90, w, 74);
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(ui.banner.title, view.w / 2, 122);
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText(ui.banner.sub, view.w / 2, 148);
    ctx.restore();
    ctx.textAlign = 'left';
  }
  if (ui.toast) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, ui.toast.timer);
    ctx.font = '15px sans-serif';
    const w = ctx.measureText(ui.toast.text).width + 28;
    ctx.fillStyle = 'rgba(10,12,24,0.8)';
    ctx.fillRect((view.w - w) / 2, view.h - 130, w, 32);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(ui.toast.text, view.w / 2, view.h - 108);
    ctx.restore();
    ctx.textAlign = 'left';
  }
  if (game.state === 'menu') drawMenu(ctx, game, view);
  else if (game.state === 'pause') drawPause(ctx, game, view);
  else if (game.player.busted || game.player.wasted) drawEndScreen(ctx, game, view);
  // Mission-complete flash.
  if (game.missions.completeTimer > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('★ JOB COMPLETE ★', view.w / 2, 190);
    ctx.textAlign = 'left';
  }
}
