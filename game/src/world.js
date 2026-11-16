// Ember Warden — the game itself: state machine, waves, spawning, combat,
// collisions, scoring and the win/lose rules. Render reads this object;
// input and audio are handed in.
import { CONFIG } from './config.js';
import {
  makePlayer, makeBullet, makeEnemy, makeParticle, makeEmberDrop, makeFloatText,
} from './entities.js';
import { rollUpgrades, applyUpgrade } from './upgrades.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EMBER = CONFIG.ember;

export class Game {
  constructor(input, audio) {
    this.input = input;
    this.audio = audio;
    this.rng = Math.random;
    this.state = 'title'; // title | playing | upgrade | paused | gameover | victory
    this.buttons = []; // {id, x, y, w, h} for the current screen, hit-tested here
    this.shake = 0;
    this.time = 0;
    this.reset();
  }

  reset() {
    this.player = makePlayer();
    this.ember = { x: EMBER.x, y: EMBER.y, radius: EMBER.radius, hp: EMBER.maxHp, maxHp: EMBER.maxHp };
    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.drops = [];
    this.texts = [];
    this.score = 0;
    this.kills = 0;
    this.embersCollected = 0;
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.banner = 0;
    this.bannerText = '';
    this.upgradeChoices = [];
    this.shake = 0;
    this.time = 0;
    this.waveClearBonusGiven = false;
  }

  startGame() {
    this.reset();
    this.state = 'playing';
    this.startWave(1);
  }

  startWave(n) {
    this.wave = n;
    const kinds = CONFIG.waveKinds(n);
    const count = CONFIG.waveCount(n);
    this.spawnQueue = [];
    for (let i = 0; i < count; i++) {
      // Early waves are mostly chasers; the mix widens as waves go on.
      let kind = 'chaser';
      const r = this.rng();
      if (n >= 4 && r < 0.14) kind = 'tank';
      else if (n >= 3 && r < 0.36) kind = 'splitter';
      else if (n >= 2 && r < 0.58) kind = 'dasher';
      else kind = kinds[Math.floor(this.rng() * kinds.length)];
      this.spawnQueue.push(kind);
    }
    this.spawnTimer = 0.8;
    this.banner = 1.6;
    this.bannerText = 'Wave ' + n;
    this.audio.horn();
  }

  spawnOne() {
    const kind = this.spawnQueue.shift();
    const side = Math.floor(this.rng() * 4);
    let x, y;
    const m = 24;
    if (side === 0) { x = m + this.rng() * (CONFIG.width - 2 * m); y = m; }
    else if (side === 1) { x = m + this.rng() * (CONFIG.width - 2 * m); y = CONFIG.height - m; }
    else if (side === 2) { x = m; y = m + this.rng() * (CONFIG.height - 2 * m); }
    else { x = CONFIG.width - m; y = m + this.rng() * (CONFIG.height - 2 * m); }
    this.enemies.push(makeEnemy(kind, x, y));
  }

  // ---- combat ------------------------------------------------------------
  fireBullet() {
    const p = this.player;
    const n = p.projectiles;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 0.09;
      const a = p.angle + off;
      this.bullets.push(makeBullet(
        p.x + Math.cos(a) * (p.radius + 6),
        p.y + Math.sin(a) * (p.radius + 6),
        a, p.bulletSpeed, p.bulletDamage, p.pierce,
      ));
    }
    this.audio.shoot();
  }

  damageEmber(amount) {
    const reduced = amount * (1 - this.player.guard);
    this.ember.hp = Math.max(0, this.ember.hp - reduced);
    this.shake = Math.min(12, this.shake + 5);
    this.audio.hurt();
    if (this.ember.hp <= 0) this.endGame(false);
  }

  damagePlayer(amount) {
    const p = this.player;
    if (p.invuln > 0 || p.dashTime > 0) return;
    p.hp = Math.max(0, p.hp - amount);
    p.invuln = 0.7;
    this.shake = Math.min(12, this.shake + 6);
    this.audio.hurt();
    if (p.hp <= 0) this.endGame(false);
  }

  killEnemy(enemy, index) {
    this.enemies.splice(index, 1);
    this.kills++;
    this.score += enemy.score;
    this.texts.push(makeFloatText(enemy.x, enemy.y - 10, '+' + enemy.score, '#ffe9a8'));
    this.particles.push(...makeParticle(enemy.x, enemy.y, enemy.color, 14, 160));
    this.audio.die();
    if (enemy.kind === 'splitter') {
      for (let i = 0; i < 2; i++) {
        const s = makeEnemy('spark', enemy.x + (i === 0 ? -10 : 10), enemy.y);
        this.enemies.push(s);
      }
    }
    for (let i = 0; i < enemy.emberDrop; i++) {
      this.drops.push(makeEmberDrop(enemy.x, enemy.y, 1));
    }
  }

  onWaveCleared() {
    const bonus = 50 + this.wave * 10;
    this.score += bonus;
    this.texts.push(makeFloatText(EMBER.x, EMBER.y - 60, 'Wave clear! +' + bonus, '#7ef0c1'));
    if (this.wave >= CONFIG.maxWave) {
      this.endGame(true);
      return;
    }
    this.upgradeChoices = rollUpgrades(this.rng, 3);
    this.state = 'upgrade';
    this.audio.upgrade();
  }

  chooseUpgrade(i) {
    const up = this.upgradeChoices[i];
    if (!up) return;
    applyUpgrade(this.player, this.ember, up.id);
    this.audio.upgrade();
    this.upgradeChoices = [];
    this.state = 'playing';
    this.startWave(this.wave + 1);
  }

  endGame(victory) {
    this.state = victory ? 'victory' : 'gameover';
    if (victory) this.audio.victory();
    else this.audio.gameover();
  }

  // ---- per-frame update --------------------------------------------------
  update(dt) {
    this.time += dt;
    if (this.state === 'title') return this.updateMenu(dt);
    if (this.state === 'upgrade') return this.updateMenu(dt);
    if (this.state === 'gameover' || this.state === 'victory') return this.updateMenu(dt);
    if (this.state === 'paused') {
      if (this.input.pressed('KeyP') || this.input.pressed('Escape')) this.state = 'playing';
      return;
    }
    this.updatePlaying(dt);
  }

  updateMenu(dt) {
    const inp = this.input;
    if (inp.pressed('KeyM')) this.audio.toggleMute();
    if (this.state === 'title') {
      if (inp.pressed('Enter') || inp.pressed('Space')) this.startGame();
    } else if (this.state === 'upgrade') {
      if (inp.pressed('Digit1')) this.chooseUpgrade(0);
      if (inp.pressed('Digit2')) this.chooseUpgrade(1);
      if (inp.pressed('Digit3')) this.chooseUpgrade(2);
    } else if (this.state === 'gameover' || this.state === 'victory') {
      if (inp.pressed('KeyR') || inp.pressed('Enter')) this.startGame();
    }
    if (inp.clicked) {
      const c = inp.clicked;
      for (const b of this.buttons) {
        if (c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h) {
          this.clickButton(b.id);
          break;
        }
      }
    }
  }

  clickButton(id) {
    this.audio.ensure();
    this.audio.click();
    if (id === 'start') this.startGame();
    else if (id === 'restart') this.startGame();
    else if (id === 'upgrade-0') this.chooseUpgrade(0);
    else if (id === 'upgrade-1') this.chooseUpgrade(1);
    else if (id === 'upgrade-2') this.chooseUpgrade(2);
    else if (id === 'resume') this.state = 'playing';
  }

  updatePlaying(dt) {
    const inp = this.input;
    const p = this.player;
    if (inp.pressed('KeyM')) this.audio.toggleMute();
    if (inp.pressed('KeyP') || inp.pressed('Escape')) { this.state = 'paused'; return; }

    // Aim at the mouse.
    p.angle = Math.atan2(inp.mouseY - p.y, inp.mouseX - p.x);

    // Dash (Shift or right-click), in the move direction or aim direction.
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    if ((inp.pressed('ShiftLeft') || inp.pressed('ShiftRight') || inp.rightClicked) && p.dashCooldown <= 0) {
      let dx = inp.moveX();
      let dy = inp.moveY();
      if (dx === 0 && dy === 0) { dx = Math.cos(p.angle); dy = Math.sin(p.angle); }
      const len = Math.hypot(dx, dy) || 1;
      p.dashX = dx / len;
      p.dashY = dy / len;
      p.dashTime = CONFIG.player.dashTime;
      p.dashCooldown = p.dashCooldownMax;
      p.invuln = Math.max(p.invuln, 0.25);
      this.audio.dash();
    }

    // Move.
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.x += p.dashX * CONFIG.player.dashSpeed * dt;
      p.y += p.dashY * CONFIG.player.dashSpeed * dt;
    } else {
      let mx = inp.moveX();
      let my = inp.moveY();
      const len = Math.hypot(mx, my);
      if (len > 0) {
        p.x += (mx / len) * p.speed * dt;
        p.y += (my / len) * p.speed * dt;
      }
    }
    p.x = Math.max(p.radius, Math.min(CONFIG.width - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(CONFIG.height - p.radius, p.y));

    // Fire while the mouse button or Space is held.
    p.fireTimer -= dt;
    if ((inp.mouseDown || inp.down('Space')) && p.fireTimer <= 0) {
      p.fireTimer = p.fireInterval;
      this.fireBullet();
    }

    // Spawning.
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnOne();
        this.spawnTimer = CONFIG.spawnInterval(this.wave) * (0.8 + this.rng() * 0.4);
      }
    }
    if (this.banner > 0) this.banner -= dt;

    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.updateDrops(dt);
    this.updateParticles(dt);

    // Wave clear: queue empty and nothing left alive.
    if (this.spawnQueue.length === 0 && this.enemies.length === 0 && this.state === 'playing') {
      this.onWaveCleared();
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 30 * dt);
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0 || b.x < -40 || b.x > CONFIG.width + 40 || b.y < -40 || b.y > CONFIG.height + 40;
      if (!dead) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (b.hitIds.has(e.id)) continue;
          const dx = e.x - b.x;
          const dy = e.y - b.y;
          const rr = e.radius + b.radius + 2; // a touch of forgiveness
          if (dx * dx + dy * dy < rr * rr) {
            b.hitIds.add(e.id);
            e.hp -= b.damage;
            e.flash = 0.12;
            this.particles.push(...makeParticle(b.x, b.y, '#ffe9a8', 4, 90));
            this.audio.hit();
            if (e.hp <= 0) this.killEnemy(e, j);
            if (b.pierce > 0) b.pierce -= 1;
            else { dead = true; }
            break;
          }
        }
      }
      if (dead) this.bullets.splice(i, 1);
    }
  }

  updateEnemies(dt) {
    const p = this.player;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.flash > 0) e.flash -= dt;
      const toEmberX = EMBER.x - e.x;
      const toEmberY = EMBER.y - e.y;
      const dEmber = Math.hypot(toEmberX, toEmberY) || 1;
      const toPlayerX = p.x - e.x;
      const toPlayerY = p.y - e.y;
      const dPlayer = Math.hypot(toPlayerX, toPlayerY) || 1;

      if (e.kind === 'dasher') {
        e.modeTimer -= dt;
        if (e.mode === 'approach') {
          e.x += (toPlayerX / dPlayer) * e.speed * dt;
          e.y += (toPlayerY / dPlayer) * e.speed * dt;
          if (e.modeTimer <= 0) { e.mode = 'telegraph'; e.modeTimer = 0.45; }
        } else if (e.mode === 'telegraph') {
          if (e.modeTimer <= 0) {
            e.mode = 'dash';
            e.modeTimer = 0.35;
            e.dashVx = toPlayerX / dPlayer;
            e.dashVy = toPlayerY / dPlayer;
          }
        } else {
          e.x += e.dashVx * 520 * dt;
          e.y += e.dashVy * 520 * dt;
          if (e.modeTimer <= 0) { e.mode = 'approach'; e.modeTimer = 1.2 + this.rng() * 0.8; }
        }
      } else {
        // Chaser, splitter, spark, tank: drift at the ember, wobbling.
        e.wobble += dt * 2;
        const wob = Math.sin(e.wobble) * 0.35;
        const tx = toEmberX / dEmber;
        const ty = toEmberY / dEmber;
        const px = -ty * wob;
        const py = tx * wob;
        // Sparks and chasers also veer at a close player.
        let mx = tx + px;
        let my = ty + py;
        if ((e.kind === 'chaser' || e.kind === 'spark') && dPlayer < 150) {
          mx = toPlayerX / dPlayer;
          my = toPlayerY / dPlayer;
        }
        const len = Math.hypot(mx, my) || 1;
        e.x += (mx / len) * e.speed * dt;
        e.y += (my / len) * e.speed * dt;
      }

      // Reached the ember: it snuffs a chunk of the light and dies.
      if (dEmber < EMBER.radius + e.radius - 4) {
        this.particles.push(...makeParticle(EMBER.x, EMBER.y, e.color, 10, 140));
        this.enemies.splice(i, 1);
        this.damageEmber(e.damage);
        continue;
      }
      // Touched the player: both hurt.
      if (dPlayer < p.radius + e.radius - 2) {
        this.particles.push(...makeParticle(p.x, p.y, '#ff5d73', 8, 130));
        this.enemies.splice(i, 1);
        this.damagePlayer(e.damage);
      }
    }

    // Gentle separation so enemies do not stack on one point.
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i];
        const b = this.enemies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.radius + b.radius;
        if (d > 0 && d < min) {
          const push = (min - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  updateDrops(dt) {
    const p = this.player;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.life -= dt;
      d.bob += dt * 4;
      const dx = p.x - d.x;
      const dy = p.y - d.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < p.magnetRadius) {
        d.x += (dx / dist) * 330 * dt;
        d.y += (dy / dist) * 330 * dt;
      } else {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vx *= 0.98;
        d.vy *= 0.98;
      }
      if (dist < p.radius + 14) {
        this.drops.splice(i, 1);
        this.score += 5;
        this.embersCollected += d.value;
        this.audio.pickup();
        continue;
      }
      if (d.life <= 0) this.drops.splice(i, 1);
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.y -= 34 * dt;
      t.life -= dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  // ---- deterministic captures --------------------------------------------
  // Drives the game into a named state for screenshots, using a fixed seed
  // and a simple auto-player. This is the game's own code playing itself.
  startShot(kind) {
    this.rng = mulberry32(1337);
    const dt = 1 / 60;
    if (kind === 'title') {
      this.state = 'title';
      return;
    }
    if (kind === 'play') {
      this.startGame();
      this.wave = 4;
      this.spawnQueue = [];
      for (let i = 0; i < CONFIG.waveCount(4); i++) this.spawnQueue.push(['chaser', 'dasher', 'splitter', 'tank'][i % 4]);
      // Flood the field at once, then let the auto-player fight for a few
      // seconds: the capture shows the wave at its busiest.
      while (this.spawnQueue.length) this.spawnOne();
      this.banner = 0;
      this.simulate(3.5, dt, false);
      return;
    }
    if (kind === 'upgrade') {
      this.startGame();
      this.simulateUntil(() => this.state === 'upgrade', 6000, dt, true);
      return;
    }
    if (kind === 'end') {
      this.startGame();
      this.simulateUntil(() => this.state === 'victory', 200000, dt, true);
      if (this.state !== 'victory') {
        // Safety net: show the victory screen with the run's real totals.
        this.state = 'victory';
      }
      return;
    }
    this.state = 'title';
  }

  // Auto-player: circle the ember, aim at the nearest enemy, keep firing.
  autoplay(dt) {
    const p = this.player;
    const inp = this.input;
    const cx = EMBER.x;
    const cy = EMBER.y;
    const ang = this.time * 0.9;
    const tx = cx + Math.cos(ang) * 190;
    const ty = cy + Math.sin(ang) * 190;
    const dx = tx - p.x;
    const dy = ty - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const step = Math.min(d, p.speed * dt);
    p.x += (dx / d) * step;
    p.y += (dy / d) * step;
    let nearest = null;
    let best = Infinity;
    for (const e of this.enemies) {
      const dd = Math.hypot(e.x - p.x, e.y - p.y);
      if (dd < best) { best = dd; nearest = e; }
    }
    if (nearest) {
      // Lead the target: aim where it will be when the bullet arrives,
      // estimating its velocity from its last two observed positions.
      const tof = best / this.player.bulletSpeed;
      const ox = nearest.px ?? nearest.x;
      const oy = nearest.py ?? nearest.y;
      const vx = (nearest.x - ox) / dt;
      const vy = (nearest.y - oy) / dt;
      nearest.px = nearest.x;
      nearest.py = nearest.y;
      const px = nearest.x + vx * tof;
      const py = nearest.y + vy * tof;
      p.angle = Math.atan2(py - p.y, px - p.x);
      inp.mouseX = px;
      inp.mouseY = py;
    }
    inp.mouseDown = true;
  }

  simulate(seconds, dt, god) {
    const steps = Math.floor(seconds / dt);
    for (let i = 0; i < steps; i++) this.simulateStep(dt, god);
  }

  simulateUntil(cond, maxSteps, dt, god) {
    for (let i = 0; i < maxSteps; i++) {
      if (cond()) return;
      this.simulateStep(dt, god);
    }
  }

  simulateStep(dt, god) {
    if (god) {
      this.player.hp = this.player.maxHp;
      this.ember.hp = this.ember.maxHp;
      this.player.bulletDamage = Math.max(this.player.bulletDamage, 60);
    }
    if (this.state === 'playing') {
      this.autoplay(dt);
      this.updatePlaying(dt);
    } else if (this.state === 'upgrade') {
      // In capture mode, pick the first upgrade and keep going.
      this.chooseUpgrade(0);
    }
    this.input.endFrame();
  }
}
