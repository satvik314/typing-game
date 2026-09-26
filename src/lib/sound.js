// Typewriter sounds synthesised with the Web Audio API: no audio files needed.

export class Sound {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.ctx = null;
  }

  ensure() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  env(gainNode, t, peak, dur, attack = 0.002) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  burst(t, { freq = 2000, q = 1, dur = 0.04, gain = 0.5, type = 'bandpass' } = {}) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    this.env(g, t, gain, dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5, dur + 0.02);
  }

  tone(t, { freq = 440, to, dur = 0.1, gain = 0.3, type = 'sine', attack = 0.002 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    this.env(g, t, gain, dur, attack);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  key() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    this.burst(t, { freq: 1700 + Math.random() * 1500, q: 0.9, dur: 0.045, gain: 0.6 });
    this.tone(t, { freq: 190 + Math.random() * 40, to: 70, dur: 0.06, gain: 0.35, type: 'triangle' });
  }

  space() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    this.burst(t, { freq: 900, q: 0.8, dur: 0.07, gain: 0.55 });
    this.tone(t, { freq: 120, to: 50, dur: 0.08, gain: 0.4, type: 'triangle' });
  }

  backspace() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    this.burst(t, { freq: 3400, q: 1.4, dur: 0.03, gain: 0.3 });
  }

  error() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    this.burst(t, { freq: 600, q: 0.7, dur: 0.08, gain: 0.5, type: 'lowpass' });
    this.tone(t, { freq: 95, to: 60, dur: 0.12, gain: 0.35, type: 'square' });
  }

  bell() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    this.tone(t, { freq: 2093, dur: 1.2, gain: 0.16, attack: 0.003 });
    this.tone(t, { freq: 2093 * 2.76, dur: 0.5, gain: 0.05, attack: 0.003 });
    this.tone(t, { freq: 2637, dur: 0.9, gain: 0.06, attack: 0.003 });
  }

  /** Carriage return: a run of ratchet clicks, a slide, then a clunk. */
  carriage() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      this.burst(t + i * 0.026, { freq: 2600, q: 2, dur: 0.018, gain: 0.25 });
    }
    this.burst(t + 0.02, { freq: 500, q: 0.5, dur: 0.22, gain: 0.12, type: 'lowpass' });
    this.burst(t + 0.2, { freq: 800, q: 0.8, dur: 0.07, gain: 0.5 });
    this.tone(t + 0.2, { freq: 110, to: 45, dur: 0.1, gain: 0.4, type: 'triangle' });
  }

  served() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    this.tone(t, { freq: 1318, dur: 0.25, gain: 0.14 });
    this.tone(t + 0.07, { freq: 1760, dur: 0.35, gain: 0.12 });
  }

  levelUp() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(t + i * 0.09, { freq: f, dur: 0.3, gain: 0.12 }));
  }

  gameOver() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    [523, 440, 349, 262].forEach((f, i) =>
      this.tone(t + i * 0.16, { freq: f, dur: 0.35, gain: 0.14, type: 'triangle' }),
    );
  }
}
