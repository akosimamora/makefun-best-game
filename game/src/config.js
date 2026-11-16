// Ember Warden — tuning constants. One place holds every number the game
// balances on, so the feel can be tuned without touching the logic.
export const CONFIG = {
  width: 960,
  height: 600,
  ember: { x: 480, y: 300, radius: 26, maxHp: 100 },

  player: {
    radius: 14,
    speed: 250,
    maxHp: 100,
    fireInterval: 0.22,
    bulletSpeed: 780,
    bulletDamage: 12,
    bulletRadius: 5,
    magnetRadius: 90,
    dashCooldown: 1.4,
    dashSpeed: 720,
    dashTime: 0.16,
  },

  // Enemy kinds. Each has its own look, movement and role in a wave.
  enemies: {
    chaser:   { radius: 13, hp: 18,  speed: 70,  damage: 8,  score: 10, color: '#b388ff', emberDrop: 1 },
    dasher:   { radius: 12, hp: 14,  speed: 58,  damage: 12, score: 15, color: '#ff7ad9', emberDrop: 1 },
    splitter: { radius: 16, hp: 26,  speed: 52,  damage: 6,  score: 20, color: '#7ef0c1', emberDrop: 2 },
    spark:    { radius: 8,  hp: 8,   speed: 100, damage: 4,  score: 5,  color: '#c8f7c5', emberDrop: 0 },
    tank:     { radius: 24, hp: 90,  speed: 32,  damage: 20, score: 30, color: '#ff9d5c', emberDrop: 3 },
  },

  // Wave composition. count grows; kinds unlock as the waves go on.
  waveCount: (n) => 5 + 3 * n,
  waveKinds: (n) => {
    const kinds = ['chaser'];
    if (n >= 2) kinds.push('dasher');
    if (n >= 3) kinds.push('splitter');
    if (n >= 4) kinds.push('tank');
    return kinds;
  },
  spawnInterval: (n) => Math.max(0.45, 1.15 - n * 0.07),
  maxWave: 10,

  // Between-wave upgrade choices.
  upgrades: [
    { id: 'rapid',   name: 'Rapid Caster',  desc: '+25% fire rate',            glyph: '»' },
    { id: 'twin',    name: 'Twin Shot',     desc: '+1 projectile per shot',    glyph: '‡' },
    { id: 'heavy',   name: 'Heavy Rounds',  desc: '+35% bullet damage',        glyph: '◆' },
    { id: 'swift',   name: 'Swift Boots',   desc: '+15% move speed',           glyph: '➤' },
    { id: 'magnet',  name: 'Magnet Core',   desc: '+60% ember pickup radius',  glyph: '◎' },
    { id: 'mend',    name: 'Ember Mend',    desc: 'Restore 30 ember HP',       glyph: '✚' },
    { id: 'aegis',   name: 'Aegis Plating', desc: '+30 max HP, heal 30',       glyph: '⛨' },
    { id: 'dash',    name: 'Dash Recharge', desc: '-35% dash cooldown',        glyph: '↯' },
    { id: 'pierce',  name: 'Piercing Rounds', desc: 'Bullets pierce +1 enemy', glyph: '⇢' },
    { id: 'guard',   name: 'Ember Guard',   desc: 'Ember takes 25% less damage', glyph: '⬢' },
  ],

  palette: {
    bgTop: '#12122e',
    bgBottom: '#07071a',
    emberCore: '#ffd166',
    emberGlow: '#ff9f1c',
    player: '#ffd166',
    playerRing: '#fff3c4',
    bullet: '#ffe9a8',
    text: '#f4ead8',
    dim: '#9d94c7',
    hudBar: '#2a2a4d',
    emberBar: '#ff9f1c',
    hpBar: '#7ef0c1',
    danger: '#ff5d73',
  },
};
