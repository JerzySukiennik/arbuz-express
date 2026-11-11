// Arbuz Express: music and effects, pushed through a chain that makes them sound worse on purpose.
const MUSIC = ['arbuz', 'habibi', 'bollywood', 'kosmos'];
const SFX = ['honk', 'malpa', 'plop', 'szum'];

function tanhCurve(k) {
  const n = 1024;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return c;
}

function stairCurve(steps) {
  const n = 2048;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.round(x * steps) / steps;
  }
  return c;
}

export class Sound {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.src = null;
    this.muted = false;
    this.rate = 1;
    this.env = 0;
    this.avg = 0.2;
    this.ready = false;
  }

  init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = (this.ctx = new AC());
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.5;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.shelf = ctx.createBiquadFilter();
    this.shelf.type = 'lowshelf';
    this.shelf.frequency.value = 150;
    this.drive = ctx.createGain();
    this.drive.gain.value = 0.36;
    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = tanhCurve(2.6);
    this.level = ctx.createGain();
    this.crush = ctx.createWaveShaper();
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = 0.34;
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.55;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0;
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.7;
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 12;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;

    this.shelf.connect(this.drive).connect(this.shaper).connect(this.level).connect(this.crush);
    this.sfxGain.connect(this.crush);
    this.crush.connect(this.lowpass).connect(this.master);
    this.lowpass.connect(this.delay).connect(this.wet).connect(this.master);
    this.delay.connect(this.feedback).connect(this.delay);
    this.master.connect(comp).connect(ctx.destination);
    this.setQuality({ steps: 16, lowpass: 3600 });
  }

  async load() {
    await Promise.all(
      [...MUSIC, ...SFX].map(async (name) => {
        const res = await fetch(`assets/audio/${name}.mp3`);
        const data = await res.arrayBuffer();
        this.buffers[name] = await new Promise((ok, fail) => this.ctx.decodeAudioData(data, ok, fail));
      })
    );
    this.ready = true;
  }

  resume() {
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  setQuality(q) {
    this.crush.curve = stairCurve(q.steps);
    this.baseLowpass = q.lowpass;
    this.lowpass.frequency.value = q.lowpass * (this.dark ? 0.45 : 1);
  }

  setMuted(m) {
    this.muted = m;
    this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.02);
  }

  playMusic(name, rate, echo) {
    this.stopMusic();
    const buf = this.buffers[name];
    if (!buf) return;
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.loopStart = 0.03;
    s.loopEnd = buf.duration - 0.06;
    s.playbackRate.value = rate;
    s.connect(this.analyser);
    s.connect(this.shelf);
    s.start(0, 0.03);
    this.src = s;
    this.rate = rate;
    this.dark = echo > 0;
    this.wet.gain.setTargetAtTime(echo, this.ctx.currentTime, 0.05);
    this.lowpass.frequency.setTargetAtTime(this.baseLowpass * (this.dark ? 0.45 : 1), this.ctx.currentTime, 0.05);
  }

  stopMusic() {
    if (!this.src) return;
    try {
      this.src.stop();
    } catch (e) {
      this.src.disconnect();
    }
    this.src.disconnect();
    this.src = null;
  }

  sfx(name, vol = 1, rate = 1) {
    const buf = this.buffers[name];
    if (!buf || this.ctx.state !== 'running') return;
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    s.connect(g).connect(this.sfxGain);
    s.start();
  }

  setBoost(b) {
    const t = this.ctx.currentTime;
    this.shelf.gain.setTargetAtTime(b * 24, t, 0.04);
    this.drive.gain.setTargetAtTime(0.36 + b * 2.4, t, 0.04);
    this.level.gain.setTargetAtTime(1 - b * 0.42, t, 0.04);
    if (this.src) this.src.playbackRate.setTargetAtTime(this.rate * (1 + b * 0.09), t, 0.08);
  }

  beat(dt, t) {
    if (!this.src || this.ctx.state !== 'running') {
      const p = (t * 2) % 1;
      return Math.max(0, 1 - p * 3);
    }
    this.analyser.getByteFrequencyData(this.bins);
    const bass = (this.bins[1] + this.bins[2] + this.bins[3] + this.bins[4]) / 1020;
    this.avg += (bass - this.avg) * Math.min(1, dt * 1.2);
    const hit = Math.min(1, Math.max(0, (bass - this.avg * 1.05) * 5));
    this.env = Math.max(hit, this.env - dt * 4.5);
    return this.env;
  }
}
