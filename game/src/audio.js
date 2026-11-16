// Ember Warden — all sound is synthesized with WebAudio. No audio files:
// every effect is an oscillator (or noise) shaped by a short envelope.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  // Created on the first user gesture; browsers block audio before that.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol || 0.2;
    if (lowpass) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      src.connect(f).connect(g).connect(this.master);
    } else {
      src.connect(g).connect(this.master);
    }
    src.start(t);
  }

  shoot() { this.tone(720, 0.09, 'square', 0.08, 240); }
  hit() { this.noise(0.08, 0.16, 1200); this.tone(180, 0.08, 'triangle', 0.12, 90); }
  die() { this.tone(320, 0.25, 'sawtooth', 0.14, 60); this.noise(0.18, 0.12, 900); }
  pickup() { this.tone(880, 0.1, 'sine', 0.14, 1320); }
  hurt() { this.tone(140, 0.2, 'sawtooth', 0.18, 70); }
  dash() { this.noise(0.14, 0.1, 2400); }
  horn() { this.tone(196, 0.5, 'sawtooth', 0.12, 196); this.tone(294, 0.5, 'sawtooth', 0.08, 294); }
  click() { this.tone(660, 0.06, 'sine', 0.12, 660); }
  upgrade() { this.tone(523, 0.12, 'sine', 0.14); setTimeout(() => this.tone(784, 0.16, 'sine', 0.14), 90); }
  gameover() { this.tone(392, 0.4, 'triangle', 0.16, 196); setTimeout(() => this.tone(262, 0.6, 'triangle', 0.16, 131), 300); }
  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.25, 'sine', 0.15), i * 130));
  }
}
