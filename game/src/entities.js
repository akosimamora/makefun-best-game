// Ember Warden — the things that move: player, bullets, enemies, particles,
// ember pickups and floating score text. Each is a plain object made by a
// factory; update and draw live in world.js and render.js.
import { CONFIG } from './config.js';

export function makePlayer() {
  const p = CONFIG.player;
  return {
    x: CONFIG.width / 2,
    y: CONFIG.height - 90,
    radius: p.radius,
    angle: -Math.PI / 2,
    hp: p.maxHp,
    maxHp: p.maxHp,
    speed: p.speed,
    fireTimer: 0,
    fireInterval: p.fireInterval,
    bulletDamage: p.bulletDamage,
    bulletSpeed: p.bulletSpeed,
    projectiles: 1,
    pierce: 0,
    magnetRadius: p.magnetRadius,
    dashTimer: 0,
    dashCooldown: 0,
    dashCooldownMax: p.dashCooldown,
    dashTime: 0,
    dashX: 0,
    dashY: 0,
    invuln: 0,
    guard: 0, // fraction of ember damage prevented
    shield: 0, // aegis charges, unused placeholder kept for clarity
  };
}

export function makeBullet(x, y, angle, speed, damage, pierce) {
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: CONFIG.player.bulletRadius,
    damage,
    pierce,
    hitIds: new Set(),
    life: 1.6,
  };
}

let nextEnemyId = 1;

export function makeEnemy(kind, x, y) {
  const s = CONFIG.enemies[kind];
  return {
    id: nextEnemyId++,
    kind,
    x, y,
    radius: s.radius,
    hp: s.hp,
    maxHp: s.hp,
    speed: s.speed * (0.9 + Math.random() * 0.2),
    damage: s.damage,
    score: s.score,
    color: s.color,
    emberDrop: s.emberDrop,
    // dasher state
    mode: 'approach',
    modeTimer: 1 + Math.random(),
    dashVx: 0,
    dashVy: 0,
    flash: 0,
    wobble: Math.random() * Math.PI * 2,
  };
}

export function makeParticle(x, y, color, count, speed) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    parts.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      size: 2 + Math.random() * 3,
      color,
    });
  }
  return parts;
}

export function makeEmberDrop(x, y, value) {
  return {
    x, y,
    vx: (Math.random() - 0.5) * 40,
    vy: (Math.random() - 0.5) * 40,
    radius: 6,
    value,
    life: 12,
    bob: Math.random() * Math.PI * 2,
  };
}

export function makeFloatText(x, y, text, color) {
  return { x, y, text, color: color || '#f4ead8', life: 0.9, maxLife: 0.9 };
}
