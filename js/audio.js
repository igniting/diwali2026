// Fully synthesized soundscape (Web Audio): tanpura drone, temple bells, shankh, crackers, river, crowd
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicVol = 0.6;
    this.sfxVol = 0.9;
    this.lastTick = 0;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.music = ctx.createGain(); this.music.gain.value = this.musicVol; this.music.connect(this.master);
    this.sfx = ctx.createGain(); this.sfx.gain.value = this.sfxVol; this.sfx.connect(this.master);
    // simple reverb (temple/ghat ambience)
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.8;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.reverb.buffer = ir;
    this.revGain = ctx.createGain(); this.revGain.gain.value = 0.35;
    this.reverb.connect(this.revGain).connect(this.master);
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < nd.length; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; nd[i] = w * 0.5 + b * 6; }
    this._ambience();
  }
  setMusic(v) { this.musicVol = v; if (this.music) this.music.gain.value = v; }
  setSfx(v) { this.sfxVol = v; if (this.sfx) this.sfx.gain.value = v; }
  get now() { return this.ctx.currentTime; }
  _noise(dest, dur, when = this.now) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true;
    s.connect(dest);
    s.start(when, Math.random() * 1.5); s.stop(when + dur);
    return s;
  }
  _ambience() {
    const ctx = this.ctx;
    // tanpura drone: Pa - Sa' - Sa' - Sa (C)
    const drone = ctx.createGain(); drone.gain.value = 0.05; drone.connect(this.music);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 2; lp.connect(drone);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
    const lfoG = ctx.createGain(); lfoG.gain.value = 500; lfo.connect(lfoG).connect(lp.frequency); lfo.start();
    [98, 130.81, 130.81 * 1.003, 65.41, 196.0].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i === 3 ? 0.6 : 0.35;
      // pluck-like swell cycling across strings
      const sw = ctx.createOscillator(); sw.frequency.value = 0.25;
      const swg = ctx.createGain(); swg.gain.value = 0.25;
      sw.connect(swg).connect(g.gain);
      sw.start(this.now + i * 1.0);
      o.connect(g).connect(lp); o.start();
    });
    // river flow + distant crowd murmur
    const river = ctx.createGain(); river.gain.value = 0.05; river.connect(this.music);
    const rf = ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 500; rf.connect(river);
    this._noise(rf, 1e6);
    const crowd = ctx.createGain(); crowd.gain.value = 0.025; crowd.connect(this.music);
    const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 700; cf.Q.value = 0.7; cf.connect(crowd);
    const clfo = ctx.createOscillator(); clfo.frequency.value = 0.31;
    const clg = ctx.createGain(); clg.gain.value = 0.012; clfo.connect(clg).connect(crowd.gain); clfo.start();
    this._noise(cf, 1e6);
    // occasional temple bells & distant crackers
    const loop = () => {
      if (!this.ctx) return;
      if (Math.random() < 0.6) this.bell(500 + Math.random() * 500, 0.12 + Math.random() * 0.1);
      if (Math.random() < 0.5) this.crackle(0.05, 60 + Math.random() * 200);
      setTimeout(loop, 2500 + Math.random() * 5000);
    };
    setTimeout(loop, 3000);
  }
  bell(freq = 660, vol = 0.3, when = 0) {
    if (!this.ctx) return;
    const t = this.now + when;
    [[1, 1, 4], [2.76, 0.5, 2.6], [5.4, 0.25, 1.6], [8.93, 0.12, 1.0], [0.5, 0.3, 5]].forEach(([r, a, d]) => {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * r;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * a, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(this.sfx); g.connect(this.reverb);
      o.start(t); o.stop(t + d);
    });
  }
  // pleasant pentatonic pluck, pitch rises with combo
  lightTick(combo = 0) {
    if (!this.ctx) return;
    const t = this.now;
    if (t - this.lastTick < 0.045) return;
    this.lastTick = t;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const semi = scale[Math.min(scale.length - 1, combo % 11)] + (combo >= 11 ? 12 : 0);
    const f = 523.25 * Math.pow(2, semi / 12);
    const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const o2 = this.ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.01;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    const g2 = this.ctx.createGain(); g2.gain.value = 0.3;
    o.connect(g); o2.connect(g2).connect(g); g.connect(this.sfx); g.connect(this.reverb);
    o.start(t); o2.start(t); o.stop(t + 0.55); o2.stop(t + 0.55);
    // tiny match "fff" ignition
    const nf = this.ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 3000;
    const ng = this.ctx.createGain(); ng.gain.setValueAtTime(0.03, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    nf.connect(ng).connect(this.sfx);
    this._noise(nf, 0.13, t);
  }
  coin() { [0, 4, 7, 12].forEach((s, i) => this.bell(880 * Math.pow(2, s / 12), 0.08, i * 0.07)); }
  whoosh(dist = 30) {
    if (!this.ctx) return;
    const t = this.now, v = 0.25 / (1 + dist / 60);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3500, t + 1.4);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    f.connect(g).connect(this.sfx);
    this._noise(f, 1.7, t);
  }
  boom(dist = 60, crackly = false) {
    if (!this.ctx) return;
    const delay = Math.min(1.5, dist / 343);
    const t = this.now + delay;
    const v = 0.9 / (1 + dist / 70);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(2500, t); f.frequency.exponentialRampToValueAtTime(120, t + 1.2);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    f.connect(g); g.connect(this.sfx); g.connect(this.reverb);
    this._noise(f, 1.9, t);
    const o = this.ctx.createOscillator(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.6);
    const og = this.ctx.createGain(); og.gain.setValueAtTime(v * 0.9, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    o.connect(og).connect(this.sfx); o.start(t); o.stop(t + 0.9);
    if (crackly) this.crackle(v * 0.5, 0, delay + 0.4);
  }
  crackle(vol = 0.2, dist = 0, when = 0) {
    if (!this.ctx) return;
    const t0 = this.now + when;
    const n = 30 + Math.random() * 40;
    for (let i = 0; i < n; i++) {
      const t = t0 + Math.random() * 1.4;
      const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500 + Math.random() * 3000;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(vol * (0.3 + Math.random()) / (1 + dist / 50), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      f.connect(g).connect(this.sfx);
      this._noise(f, 0.035, t);
    }
  }
  fountain(dur = 6, dist = 10) {
    if (!this.ctx) return;
    const t = this.now, v = 0.18 / (1 + dist / 25);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.5;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.4);
    g.gain.setValueAtTime(v, t + dur - 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(this.sfx);
    this._noise(f, dur, t);
    this.crackle(v * 0.6, 0, 0.3);
  }
  wind(dur = 4) {
    if (!this.ctx) return;
    const t = this.now;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.5;
    f.frequency.setValueAtTime(250, t); f.frequency.linearRampToValueAtTime(900, t + dur * 0.5); f.frequency.linearRampToValueAtTime(300, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(this.sfx);
    this._noise(f, dur, t);
  }
  shankh(when = 0) {
    if (!this.ctx) return;
    const t = this.now + when, dur = 3.2;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t); o.frequency.linearRampToValueAtTime(233, t + 0.4); o.frequency.setValueAtTime(233, t + dur - 0.6); o.frequency.linearRampToValueAtTime(215, t + dur);
    const vib = this.ctx.createOscillator(); vib.frequency.value = 5.5;
    const vg = this.ctx.createGain(); vg.gain.value = 2.5; vib.connect(vg).connect(o.frequency);
    const f1 = this.ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 900; f1.Q.value = 3;
    const f2 = this.ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 1800;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.35);
    g.gain.setValueAtTime(0.5, t + dur - 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f1).connect(f2).connect(g); g.connect(this.sfx); g.connect(this.reverb);
    o.start(t); vib.start(t); o.stop(t + dur); vib.stop(t + dur);
  }
  monkey() {
    if (!this.ctx) return;
    for (let i = 0; i < 5; i++) {
      const t = this.now + i * 0.11;
      const o = this.ctx.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(900 + Math.random() * 400, t); o.frequency.exponentialRampToValueAtTime(500, t + 0.08);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.1);
    }
  }
  dhol(beats = 16, bpm = 132) {
    if (!this.ctx) return;
    const pattern = [1, 0, 0.5, 1, 0, 0.5, 1, 0.6];
    for (let i = 0; i < beats; i++) {
      const a = pattern[i % pattern.length];
      if (!a) continue;
      const t = this.now + (i * 60) / bpm / 2;
      const o = this.ctx.createOscillator();
      o.frequency.setValueAtTime(i % 4 === 0 ? 110 : 180, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.2);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.35 * a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.32);
    }
  }
  aarti() {
    // celebratory: shankh, cascade of bells, dhol
    this.shankh(0);
    for (let i = 0; i < 14; i++) this.bell(600 + (i % 3) * 140, 0.2, 0.6 + i * 0.28);
    this.dhol(48, 140);
  }
}
