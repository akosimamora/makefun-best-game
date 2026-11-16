// Ember Warden — the between-wave upgrade choices. Each upgrade names what
// it does and applies itself to the player (or the ember) in one place.
import { CONFIG } from './config.js';

export const UPGRADE_POOL = CONFIG.upgrades;

export function rollUpgrades(rng, count) {
  const pool = UPGRADE_POOL.slice();
  const picks = [];
  while (picks.length < count && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

export function applyUpgrade(player, ember, id) {
  const p = CONFIG.player;
  switch (id) {
    case 'rapid':
      player.fireInterval *= 0.8;
      break;
    case 'twin':
      player.projectiles += 1;
      break;
    case 'heavy':
      player.bulletDamage *= 1.35;
      break;
    case 'swift':
      player.speed *= 1.15;
      break;
    case 'magnet':
      player.magnetRadius *= 1.6;
      break;
    case 'mend':
      ember.hp = Math.min(ember.maxHp, ember.hp + 30);
      break;
    case 'aegis':
      player.maxHp += 30;
      player.hp = Math.min(player.maxHp, player.hp + 30);
      break;
    case 'dash':
      player.dashCooldownMax *= 0.65;
      break;
    case 'pierce':
      player.pierce += 1;
      break;
    case 'guard':
      player.guard = Math.min(0.6, player.guard + 0.25);
      break;
    default:
      break;
  }
}
