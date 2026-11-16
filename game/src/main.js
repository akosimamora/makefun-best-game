// Ember Warden — boot and the game loop. Wires the canvas, input, audio,
// world and renderer together, and handles the deterministic capture states
// (?shot=title|play|upgrade|end) used for the entry's screenshots.
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { Game } from './world.js';
import { draw } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.width;
canvas.height = CONFIG.height;

const input = new Input(canvas);
const audio = new AudioSys();
const game = new Game(input, audio);
game.buttons = [];

// Exposed for play-testing from a browser console or automation.
window.__game = game;
window.__input = input;

// Audio needs a user gesture; arm it on the first one.
window.addEventListener('pointerdown', () => audio.ensure(), { once: true });
window.addEventListener('keydown', () => audio.ensure(), { once: true });

const params = new URLSearchParams(location.search);
const shot = params.get('shot');

if (shot) {
  // Capture mode: drive the game into the named state, render one frame,
  // and stop. No loop, no audio, no randomness beyond the fixed seed.
  game.startShot(shot);
  draw(ctx, game);
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.buttons = [];
    draw(ctx, game);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
