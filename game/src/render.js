// Ember Warden — every pixel the game shows. One draw call renders the
// field, the HUD and whichever screen is up; buttons are registered here
// so world.js can hit-test clicks against them.
import { CONFIG } from './config.js';

const PAL = CONFIG.palette;
const W = CONFIG.width;
const H = CONFIG.height;

// Fixed star field, so the background never flickers between frames.
const STARS = [];
for (let i = 0; i < 90; i++) {
  STARS.push({
    x: (i * 137.5) % W,
    y: (i * 89.3) % H,
    r: 0.6 + ((i * 7) % 10) / 8,
    tw: (i * 0.37) % (Math.PI * 2),
  });
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

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = PAL.hudBar;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
  ctx.fillStyle = PAL.text;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 8, y + h / 2 + 0.5);
}

export function draw(ctx, game) {
  const t = game.time;
  ctx.save();
  if (game.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  drawBackground(ctx, t);
  if (game.state !== 'title') {
    drawEmber(ctx, game, t);
    drawDrops(ctx, game);
    drawEnemies(ctx, game);
    drawPlayer(ctx, game);
    drawBullets(ctx, game);
    drawParticles(ctx, game);
    drawTexts(ctx, game);
    drawHud(ctx, game);
    drawBanner(ctx, game);
  }
  ctx.restore();

  // Screens sit above the field, unshaken.
  if (game.state === 'title') drawTitle(ctx, game);
  else if (game.state === 'upgrade') drawUpgrade(ctx, game);
  else if (game.state === 'paused') drawPaused(ctx, game);
  else if (game.state === 'gameover') drawEnd(ctx, game, false);
  else if (game.state === 'victory') drawEnd(ctx, game, true);
}

function drawBackground(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, PAL.bgTop);
  g.addColorStop(1, PAL.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (const s of STARS) {
    const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.4 + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cfc8ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Soft vignette so the edges fall away into the night.
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function drawEmber(ctx, game, t) {
  const e = game.ember;
  const pulse = 1 + 0.06 * Math.sin(t * 3);
  const glowR = 110 * pulse;
  const g = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, glowR);
  g.addColorStop(0, 'rgba(255, 209, 102, 0.55)');
  g.addColorStop(0.4, 'rgba(255, 159, 28, 0.18)');
  g.addColorStop(1, 'rgba(255, 159, 28, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(e.x, e.y, glowR, 0, Math.PI * 2);
  ctx.fill();
  // The ember itself: a bright core with a flame tongue.
  ctx.save();
  ctx.shadowColor = PAL.emberGlow;
  ctx.shadowBlur = 26;
  ctx.fillStyle = PAL.emberCore;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius * 0.62 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius * 0.3 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Ring shows ember HP at a glance.
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (e.hp / e.maxHp));
  ctx.stroke();
  if (e.hp <= 30) {
    ctx.fillStyle = PAL.danger;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE EMBER FADES', e.x, e.y + e.radius + 26);
  }
}

function drawDrops(ctx, game) {
  for (const d of game.drops) {
    const bob = Math.sin(d.bob) * 2;
    ctx.save();
    ctx.shadowColor = PAL.emberGlow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = PAL.emberCore;
    ctx.translate(d.x, d.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
}

function drawEnemies(ctx, game) {
  for (const e of game.enemies) {
    ctx.save();
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Darker core and two eyes give each wisp a face.
    ctx.fillStyle = 'rgba(10, 10, 30, 0.55)';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    const eyeOff = e.radius * 0.32;
    ctx.beginPath();
    ctx.arc(e.x - eyeOff, e.y - 2, 2.2, 0, Math.PI * 2);
    ctx.arc(e.x + eyeOff, e.y - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Dasher telegraphs its lunge with a flashing ring.
    if (e.kind === 'dasher' && e.mode === 'telegraph') {
      ctx.strokeStyle = Math.sin(game.time * 30) > 0 ? '#ff5d73' : '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Hit flash.
    if (e.flash > 0) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // HP bar for the tough ones.
    if (e.maxHp >= 26 && e.hp < e.maxHp) {
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w, 4);
      ctx.fillStyle = PAL.danger;
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w * (e.hp / e.maxHp), 4);
    }
    ctx.restore();
  }
}

function drawPlayer(ctx, game) {
  const p = game.player;
  if (p.invuln > 0 && Math.floor(game.time * 14) % 2 === 0 && game.state === 'playing') return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.shadowColor = PAL.player;
  ctx.shadowBlur = 16;
  // Little warden: a hooded triangle pointing where it aims, lantern at hand.
  ctx.rotate(p.angle);
  ctx.fillStyle = PAL.player;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-10, -11);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-10, 11);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(4, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Dash cooldown ring.
  if (p.dashCooldown > 0) {
    ctx.strokeStyle = 'rgba(244, 234, 216, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCooldown / p.dashCooldownMax));
    ctx.stroke();
  }
}

function drawBullets(ctx, game) {
  ctx.save();
  ctx.shadowColor = PAL.bullet;
  ctx.shadowBlur = 8;
  ctx.fillStyle = PAL.bullet;
  for (const b of game.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx, game) {
  for (const pt of game.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx, game) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of game.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, game) {
  const p = game.player;
  ctx.save();
  // Top strip.
  ctx.fillStyle = 'rgba(7, 7, 26, 0.72)';
  ctx.fillRect(0, 0, W, 44);
  ctx.fillStyle = PAL.text;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCORE  ' + game.score, 14, 22);
  ctx.textAlign = 'center';
  ctx.fillText('WAVE  ' + Math.max(1, game.wave) + ' / ' + CONFIG.maxWave, W / 2, 22);
  ctx.textAlign = 'right';
  ctx.fillText('◆ ' + game.embersCollected, W - 14, 22);
  // Bottom bars: player HP left, ember HP right.
  bar(ctx, 14, H - 30, 220, 16, p.hp / p.maxHp, PAL.hpBar, 'HP ' + Math.ceil(p.hp));
  bar(ctx, W - 234, H - 30, 220, 16, game.ember.hp / game.ember.maxHp, PAL.emberBar, 'EMBER ' + Math.ceil(game.ember.hp));
  ctx.restore();
}

function drawBanner(ctx, game) {
  if (game.banner <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, game.banner);
  ctx.fillStyle = PAL.text;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = PAL.emberGlow;
  ctx.shadowBlur = 24;
  ctx.fillText(game.bannerText, W / 2, H / 2 - 60);
  ctx.restore();
}

// ---- screens ---------------------------------------------------------------
function dim(ctx) {
  ctx.fillStyle = 'rgba(5, 5, 20, 0.72)';
  ctx.fillRect(0, 0, W, H);
}

function button(ctx, game, id, x, y, w, h, label) {
  const hover = game.input.mouseX >= x && game.input.mouseX <= x + w &&
    game.input.mouseY >= y && game.input.mouseY <= y + h;
  ctx.fillStyle = hover ? '#ff9f1c' : '#e8a33d';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.fillStyle = '#1a1030';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  game.buttons.push({ id, x, y, w, h });
}

function drawTitle(ctx, game) {
  game.buttons = [];
  drawBackground(ctx, game.time);
  // The ember, big and alone in the dark.
  const cx = W / 2;
  const cy = 168;
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 150);
  g.addColorStop(0, 'rgba(255, 209, 102, 0.6)');
  g.addColorStop(1, 'rgba(255, 159, 28, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = PAL.emberGlow;
  ctx.shadowBlur = 30;
  ctx.fillStyle = PAL.emberCore;
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL.text;
  ctx.font = 'bold 58px Georgia, serif';
  ctx.shadowColor = PAL.emberGlow;
  ctx.shadowBlur = 22;
  ctx.fillText('EMBER WARDEN', cx, 268);
  ctx.shadowBlur = 0;
  ctx.font = 'italic 19px Georgia, serif';
  ctx.fillStyle = PAL.dim;
  ctx.fillText('Guard the last light. Survive 10 waves of the gloom.', cx, 308);

  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = PAL.text;
  const lines = [
    'Move  WASD / Arrows      Aim  Mouse      Shoot  Hold click / Space',
    'Dash  Shift / Right-click      Pause  P      Mute  M',
    'Wisps hunt the ember — if it dies, the night wins.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, cx, 352 + i * 26));

  button(ctx, game, 'start', cx - 110, 448, 220, 52, '▶  START');
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = PAL.dim;
  ctx.fillText('or press Enter', cx, 524);
}

function drawUpgrade(ctx, game) {
  game.buttons = [];
  dim(ctx);
  const cx = W / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL.text;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText('Wave ' + game.wave + ' cleared!', cx, 92);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = PAL.dim;
  ctx.fillText('Choose one boon before the dark returns  —  press 1, 2 or 3', cx, 128);

  const cw = 220;
  const ch = 190;
  const gap = 28;
  const total = cw * 3 + gap * 2;
  const x0 = cx - total / 2;
  const y0 = 190;
  game.upgradeChoices.forEach((up, i) => {
    const x = x0 + i * (cw + gap);
    const hover = game.input.mouseX >= x && game.input.mouseX <= x + cw &&
      game.input.mouseY >= y0 && game.input.mouseY <= y0 + ch;
    ctx.fillStyle = hover ? '#23234d' : '#171734';
    roundRect(ctx, x, y0, cw, ch, 14);
    ctx.fill();
    ctx.strokeStyle = hover ? PAL.emberGlow : '#3a3a6b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PAL.emberCore;
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText(up.glyph, x + cw / 2, y0 + 56);
    ctx.fillStyle = PAL.text;
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(up.name, x + cw / 2, y0 + 108);
    ctx.fillStyle = PAL.dim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(up.desc, x + cw / 2, y0 + 138);
    ctx.fillStyle = '#6f66a0';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('[ ' + (i + 1) + ' ]', x + cw / 2, y0 + 166);
    game.buttons.push({ id: 'upgrade-' + i, x, y: y0, w: cw, h: ch });
  });
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = PAL.dim;
  ctx.fillText('Score ' + game.score + '   •   Ember HP ' + Math.ceil(game.ember.hp), cx, 430);
}

function drawPaused(ctx, game) {
  game.buttons = [];
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL.text;
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('Paused', W / 2, H / 2 - 30);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = PAL.dim;
  ctx.fillText('Press P to return to the fight', W / 2, H / 2 + 12);
  button(ctx, game, 'resume', W / 2 - 100, H / 2 + 44, 200, 46, 'RESUME');
}

function drawEnd(ctx, game, victory) {
  game.buttons = [];
  dim(ctx);
  const cx = W / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (victory) {
    ctx.save();
    ctx.shadowColor = PAL.emberGlow;
    ctx.shadowBlur = 26;
    ctx.fillStyle = PAL.emberCore;
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('DAWN BREAKS', cx, 150);
    ctx.restore();
    ctx.fillStyle = PAL.text;
    ctx.font = 'italic 19px Georgia, serif';
    ctx.fillText('Ten waves held. The ember lives to see the morning.', cx, 196);
  } else {
    ctx.fillStyle = PAL.danger;
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('THE LIGHT IS GONE', cx, 150);
    ctx.fillStyle = PAL.text;
    ctx.font = 'italic 19px Georgia, serif';
    ctx.fillText('The gloom snuffed the ember on wave ' + Math.max(1, game.wave) + '.', cx, 196);
  }
  ctx.fillStyle = PAL.text;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('SCORE  ' + game.score, cx, 268);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = PAL.dim;
  ctx.fillText(
    'Waves cleared  ' + (victory ? CONFIG.maxWave : Math.max(0, game.wave - 1)) +
    '    •    Wisps banished  ' + game.kills +
    '    •    Embers gathered  ' + game.embersCollected,
    cx, 306,
  );
  button(ctx, game, 'restart', cx - 110, 360, 220, 52, '↻  PLAY AGAIN');
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = PAL.dim;
  ctx.fillText('or press R', cx, 436);
}
