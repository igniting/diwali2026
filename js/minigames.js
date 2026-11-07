// 2D festival mini-games drawn on a full-screen canvas while the 3D world sleeps:
//   ✈️ Pushpak Yatra — fly the Vimana from Lanka to Ayodhya
//   🔔 Sarayu Aarti  — rhythm game; your hits play the melody
//   🎨 Rangoli       — trace a pattern with 8-fold mirror symmetry

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

export const GAMES = {
  yatra: { icon: '✈️', name: 'Pushpak Yatra', hindi: 'पुष्पक यात्रा', desc: 'Fly Shri Ram home from Lanka. Hold to rise, fly through rings of light, dodge storm clouds and lightning.' },
  aarti: { icon: '🔔', name: 'Sarayu Aarti', hindi: 'सरयू आरती', desc: 'A rhythm game on the ghats. Tap the lanes on the beat; every hit plays the melody.' },
  rangoli: { icon: '🎨', name: 'Rangoli', hindi: 'रंगोली', desc: 'Trace the pattern; your strokes mirror eight ways. Your rangoli then decorates the ghat!' },
};

export class MiniGames {
  constructor(audio) {
    this.audio = audio;
    this.active = null;
    const root = this.root = document.createElement('div');
    root.id = 'mini';
    root.className = 'hidden';
    root.innerHTML = `
      <canvas id="mini-c"></canvas>
      <div class="mini-top">
        <div class="mini-title" id="mini-title"></div>
        <div class="mini-score" id="mini-score"></div>
        <button class="mini-x" id="mini-x" title="Quit">✕</button>
      </div>
      <div class="mini-help" id="mini-help"></div>
      <div class="mini-tools" id="mini-tools"></div>
      <div class="mini-result hidden" id="mini-result"><div class="modal-card"><div id="mini-result-body"></div>
        <div class="summary-buttons"><button class="btn" id="mini-again">↻ Again</button><button class="btn primary" id="mini-done">Continue 🙏</button></div></div></div>`;
    document.body.appendChild(root);
    this.canvas = root.querySelector('#mini-c');
    this.ctx = this.canvas.getContext('2d');
    this.keys = {};
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); this.game?.pointer?.('down', e); });
    c.addEventListener('pointermove', (e) => this.game?.pointer?.('move', e));
    c.addEventListener('pointerup', (e) => this.game?.pointer?.('up', e));
    c.addEventListener('pointercancel', (e) => this.game?.pointer?.('up', e));
    addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.code === 'Escape') { this.quit(); return; }
      if (!this.keys[e.code]) this.game?.key?.(e.code, true);
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { if (!this.active) return; this.keys[e.code] = false; this.game?.key?.(e.code, false); });
    addEventListener('resize', () => this.active && this.resize());
    root.querySelector('#mini-x').onclick = () => this.quit();
    this.loop = this.loop.bind(this);
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.W = innerWidth; this.H = innerHeight;
    this.canvas.width = Math.round(this.W * dpr); this.canvas.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.game?.resize?.();
  }

  // opts: { best, rewardFor(result) -> {text, punya}, onFinish(result), context }
  open(name, opts = {}) {
    this.opts = opts;
    this.name = name;
    this.active = name;
    this.root.classList.remove('hidden');
    this.root.querySelector('#mini-result').classList.add('hidden');
    this.root.querySelector('#mini-title').textContent = `${GAMES[name].icon} ${GAMES[name].name}`;
    this.root.querySelector('#mini-tools').innerHTML = '';
    this.keys = {};
    this.resize();
    const G = { yatra: Yatra, aarti: Aarti, rangoli: Rangoli }[name];
    this.game = new G(this);
    this.resize();
    this.last = performance.now();
    this.ended = false;
    requestAnimationFrame(this.loop);
    this.root.querySelector('#mini-again').onclick = () => this.open(name, opts);
    this.root.querySelector('#mini-done').onclick = () => this.close();
  }
  setScore(html) { this.root.querySelector('#mini-score').innerHTML = html; }
  help(html, ms = 3500) {
    const h = this.root.querySelector('#mini-help');
    h.innerHTML = html; h.classList.add('show');
    clearTimeout(this._ht); this._ht = setTimeout(() => h.classList.remove('show'), ms);
  }
  tools(html) { this.root.querySelector('#mini-tools').innerHTML = html; return this.root.querySelector('#mini-tools'); }
  loop(now) {
    if (!this.active) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.ended) this.game.update(dt);
    this.game.draw(this.ctx, this.W, this.H);
    requestAnimationFrame(this.loop);
  }
  finish(result) {
    if (this.ended) return;
    this.ended = true;
    this.game.stop?.();
    const r = this.opts.rewardFor ? this.opts.rewardFor(result) : { text: '' };
    result.reward = r.punya || 0;
    const best = this.opts.best || 0;
    const newBest = result.score > best;
    this.root.querySelector('#mini-result-body').innerHTML = `
      <div class="sum-title">${result.title}</div>
      <div class="sum-sub">${result.sub || ''}</div>
      ${result.grade ? `<div class="medal-big">${result.grade}</div>` : ''}
      <div class="sum-rows">
        ${(result.rows || []).map(([a, b]) => `<div>${a}</div><div>${b}</div>`).join('')}
        <div>Score</div><div>${Math.round(result.score).toLocaleString('en-IN')}${newBest && best > 0 ? ' 🎉 NEW BEST' : ''}</div>
        <div>Best</div><div>${Math.round(Math.max(best, result.score)).toLocaleString('en-IN')}</div>
        ${r.text ? `<div>Reward</div><div>${r.text}</div>` : ''}
      </div>`;
    this.root.querySelector('#mini-result').classList.remove('hidden');
    this.opts.onFinish?.(result);
  }
  quit() {
    if (!this.active) return;
    if (!this.ended) { this.ended = true; this.game.stop?.(); this.opts.onQuit?.(); }
    this.close();
  }
  close() {
    this.game?.stop?.();
    this.active = null; this.game = null;
    this.root.classList.add('hidden');
    this.opts.onClose?.();
  }
}

// ------------------------------------------------------------------ shared drawing helpers
function glow(ctx, x, y, r, color, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('A', a));
  g.addColorStop(1, color.replace('A', 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function flame(ctx, x, y, s, t, phase = 0) {
  const f = 1 + Math.sin(t * 13 + phase) * 0.08 + Math.sin(t * 29 + phase * 3) * 0.05;
  glow(ctx, x, y - s * 0.4, s * 2.2, 'rgba(255,150,40,A)', 0.35);
  ctx.save(); ctx.translate(x, y); ctx.scale(1, f);
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.3);
  ctx.bezierCurveTo(s * 0.55, -s * 0.6, s * 0.5, 0, 0, 0);
  ctx.bezierCurveTo(-s * 0.5, 0, -s * 0.55, -s * 0.6, 0, -s * 1.3);
  const g = ctx.createLinearGradient(0, -s * 1.3, 0, 0);
  g.addColorStop(0, '#ff7a00'); g.addColorStop(0.5, '#ffd36b'); g.addColorStop(1, '#fff6d8');
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}
function diya(ctx, x, y, s, t, phase) {
  ctx.fillStyle = '#9c4a22';
  ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.42, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#c4672f';
  ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.22, 0, 0, TAU); ctx.fill();
  flame(ctx, x + s * 0.2, y - s * 0.05, s * 0.5, t, phase);
}
class Sparks {
  constructor() { this.p = []; }
  burst(x, y, n, colors, speed = 160, life = 0.8, grav = 120) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = speed * (0.4 + Math.random() * 0.6);
      this.p.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, c: colors[(Math.random() * colors.length) | 0], grav, s: 1.5 + Math.random() * 2 });
    }
  }
  update(dt) {
    for (let i = this.p.length - 1; i >= 0; i--) {
      const p = this.p[i];
      p.life -= dt; if (p.life <= 0) { this.p.splice(i, 1); continue; }
      p.vx *= 1 - dt * 1.5; p.vy = p.vy * (1 - dt * 1.5) + p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  draw(ctx, ox = 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of this.p) {
      ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x - ox, p.y, p.s, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}
const STARS = Array.from({ length: 160 }, () => [Math.random(), Math.random() * 0.75, Math.random() * 1.4 + 0.3, Math.random() * 6]);
function nightSky(ctx, W, H, t, warm = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#04040f'); g.addColorStop(0.6, '#140a22'); g.addColorStop(1, warm ? '#3a1a10' : '#1c0f1c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#dfe6ff';
  for (const [x, y, s, ph] of STARS) { ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 1.5 + ph); ctx.fillRect(x * W, y * H, s, s); }
  ctx.globalAlpha = 1;
}

// ================================================================== ✈️ Pushpak Yatra
class Yatra {
  constructor(m) {
    this.m = m; this.a = m.audio;
    this.t = 0;
    this.dist = 0; this.total = 3000; // world units (1u = H/100 px)
    this.y = 50; this.vy = 0; this.hold = false;
    this.lives = 3; this.inv = 0;
    this.score = 0; this.combo = 0; this.rings = 0; this.ringsTotal = 0; this.marigolds = 0;
    this.objs = []; this.nextSpawn = 60;
    this.sparks = new Sparks();
    this.shake = 0; this.state = 'intro'; this.introT = 2.2;
    this.trail = [];
    m.help(window.matchMedia('(pointer: coarse)').matches ? '👆 <b>Hold</b> anywhere to rise · release to glide down' : '<b>Hold Space</b> / mouse to rise · release to glide down', 4000);
  }
  get u() { return this.m.H / 100; }
  speed() { return 34 + 26 * (this.dist / this.total); }
  pointer(type) { if (type === 'down') this.hold = true; if (type === 'up') this.hold = false; }
  key(code, down) { if (['Space', 'ArrowUp', 'KeyW'].includes(code)) this.hold = down; }
  spawn() {
    const prog = this.dist / this.total;
    const x = this.dist + 130 * (this.m.W / this.m.H) + 10;
    const r = Math.random();
    if (r < 0.5 - 0.15 * prog) {
      const y = rnd(18, 82);
      this.objs.push({ k: 'ring', x, y, r: 9.5 - prog * 2.5 });
      this.ringsTotal++;
      // marigold trail leading into the ring
      for (let i = 1; i <= 4; i++) this.objs.push({ k: 'gold', x: x - i * 7, y: y + Math.sin(i) * 3 });
    } else if (r < 0.5 + 0.25 + 0.15 * prog || prog < 0.2) {
      const y = rnd(10, 90);
      this.objs.push({ k: 'cloud', x: x + 5, y, w: rnd(16, 24), h: rnd(9, 13), vy: rnd(-8, 8) * prog, ph: Math.random() * 6 });
    } else {
      const fromTop = Math.random() < 0.5;
      this.objs.push({ k: 'bolt', x, len: rnd(35, 55), top: fromTop, ph: Math.random(), seed: Math.random() * 100 });
    }
    this.nextSpawn = this.dist + rnd(34, 48) - prog * 12;
  }
  hit() {
    if (this.inv > 0) return;
    this.lives--; this.inv = 1.6; this.shake = 0.5; this.combo = 0;
    this.a.boom?.(25);
    try { navigator.vibrate?.(120); } catch (e) { /* noop */ }
    if (this.lives <= 0) { this.state = 'crash'; this.endT = 1.4; }
  }
  update(dt) {
    this.t += dt;
    this.sparks.update(dt);
    this.shake = Math.max(0, this.shake - dt);
    this.inv = Math.max(0, this.inv - dt);
    if (this.state === 'intro') {
      this.introT -= dt;
      this.y += (50 - this.y) * dt * 2;
      if (this.introT <= 0) { this.state = 'fly'; this.a.shankh?.(0); }
      return;
    }
    if (this.state === 'crash') {
      this.vy += 80 * dt; this.y += this.vy * dt;
      this.endT -= dt;
      if (this.endT <= 0) this.end(false);
      return;
    }
    if (this.state === 'land') {
      this.endT -= dt;
      this.y += (62 - this.y) * dt * 1.5;
      this.dist += this.speed() * dt * Math.max(0, this.endT / 3);
      if (Math.random() < dt * 5) this.sparks.burst(rnd(0.1, 0.9) * this.m.W, rnd(0.1, 0.45) * this.m.H, 50, ['#ffd36b', '#ff5ea8', '#7ee0ff', '#ffffff'], 180, 1.2, 60);
      if (this.endT <= 0) this.end(true);
      return;
    }
    const sp = this.speed();
    this.dist += sp * dt;
    this.vy += (this.hold ? -210 : 95) * dt;
    this.vy = clamp(this.vy, -55, 60);
    this.y += this.vy * dt;
    if (this.y < 5) { this.y = 5; this.vy = Math.max(0, this.vy); }
    if (this.y > 92) { this.y = 92; this.vy = -25; } // skim the river: a soft bounce, no penalty
    this.score += sp * dt * 0.5;
    if (this.dist > this.nextSpawn && this.dist < this.total - 160) this.spawn();
    const px = this.dist + 25 * (this.m.W / this.m.H) * 0.5; // vimana world x
    for (let i = this.objs.length - 1; i >= 0; i--) {
      const o = this.objs[i];
      if (o.k === 'cloud') { o.y += o.vy * dt; if (o.y < 8 || o.y > 92) o.vy *= -1; }
      const dx = o.x - px;
      if (o.k === 'ring' && !o.done && dx < 0) {
        o.done = true;
        if (Math.abs(this.y - o.y) < o.r) {
          this.combo++; this.rings++;
          const pts = 100 * Math.min(5, 1 + Math.floor(this.combo / 3));
          this.score += pts;
          this.a.lightTick?.(this.combo);
          o.hitT = this.t;
          this.sparks.burst(this.sx(o.x), o.y * this.u, 30, ['#ffd36b', '#fff2c0', '#ff9a2a'], 220, 0.7, 40);
          this.pop = { t: this.t, text: `+${pts}`, y: o.y };
        } else { this.combo = 0; }
      }
      if (o.k === 'gold' && !o.done && Math.abs(dx) < 3 && Math.abs(o.y - this.y) < 5) {
        o.done = true; this.marigolds++; this.score += 15;
        if (this.marigolds % 20 === 0 && this.lives < 3) { this.lives++; this.a.bell?.(1320, 0.25); this.pop = { t: this.t, text: '+1 🪔', y: this.y }; }
        this.sparks.burst(this.sx(o.x), o.y * this.u, 8, ['#ff9a00', '#ffc300'], 90, 0.5, 60);
      }
      if (o.k === 'cloud' && Math.abs(dx) < o.w * 0.4 && Math.abs(o.y - this.y) < o.h * 0.38) this.hit(); // forgiving hitbox
      if (o.k === 'bolt') {
        const on = ((this.t + o.ph) % 1.5) < 0.75;
        o.on = on;
        if (on && Math.abs(dx) < 1.8) {
          const inBolt = o.top ? this.y < o.len : this.y > 100 - o.len;
          if (inBolt) this.hit();
        }
      }
      if (dx < -60) this.objs.splice(i, 1);
    }
    this.trail.push([px, this.y]); if (this.trail.length > 24) this.trail.shift();
    if (this.dist >= this.total) {
      this.state = 'land'; this.endT = 3.5;
      this.score += 2000 + this.lives * 600;
      this.a.aarti?.();
    }
    this.m.setScore(`✦ ${Math.round(this.score).toLocaleString('en-IN')} · ${'🪔'.repeat(Math.max(0, this.lives))}${this.combo > 2 ? ` · 🔥${this.combo}` : ''}`);
  }
  sx(wx) { return (wx - this.dist) * this.u + this.m.W * 0.25 - 25 * (this.m.W / this.m.H) * 0.5 * this.u; }
  end(won) {
    this.m.finish({
      score: Math.round(this.score), won,
      title: won ? 'अयोध्या आगमन!' : 'The storm was too strong…',
      sub: won ? 'The Pushpak Vimana landed safely in Ayodhya' : `You flew ${Math.round((this.dist / this.total) * 100)}% of the way home`,
      grade: won ? (this.lives === 3 ? '🏆 Flawless flight' : '✈️ Safe landing') : '',
      rows: [['Rings of light', `${this.rings} / ${this.ringsTotal}`], ['Marigolds', this.marigolds], ['Lamps (lives) left', this.lives]],
    });
  }
  draw(ctx, W, H) {
    const u = this.u, t = this.t, prog = clamp(this.dist / this.total, 0, 1);
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 14 * this.shake, (Math.random() - 0.5) * 14 * this.shake);
    nightSky(ctx, W, H, t, prog);
    // far hills (Lanka's mountains → plains)
    const layer = (par, base, amp, col, freq) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + 10; x += 10) {
        const wx = (x / u + this.dist * par) * freq;
        ctx.lineTo(x, H * base - (Math.sin(wx) * 0.5 + Math.sin(wx * 2.3 + 1) * 0.3 + Math.sin(wx * 5.1) * 0.12) * amp * H * (1 - prog * 0.7));
      }
      ctx.lineTo(W, H); ctx.fill();
    };
    layer(0.15, 0.78, 0.12, '#140c1e', 0.02);
    layer(0.35, 0.86, 0.07, '#0d0814', 0.035);
    // sea → river with distant lights
    ctx.fillStyle = prog < 0.35 ? '#05101c' : '#08101a';
    ctx.fillRect(0, H * 0.9, W, H * 0.1);
    for (let i = 0; i < 40; i++) {
      const lx = ((i * 97 - this.dist * u * 0.6) % (W + 40) + W + 40) % (W + 40) - 20;
      ctx.fillStyle = prog > 0.3 ? 'rgba(255,170,70,0.8)' : 'rgba(150,200,255,0.25)';
      ctx.fillRect(lx, H * 0.905 + (i % 3) * 3, 2, 2);
    }
    // Ayodhya skyline appears near the end
    if (prog > 0.7) {
      const ax = W * 1.25 - (prog - 0.7) / 0.3 * W * 0.65;
      ctx.fillStyle = '#1a0d0a';
      ctx.beginPath();
      ctx.moveTo(ax - W * 0.4, H * 0.9);
      for (const [dx, h] of [[-0.35, 0.08], [-0.25, 0.12], [-0.15, 0.09], [-0.05, 0.1]]) { ctx.lineTo(ax + dx * W, H * (0.9 - h)); ctx.lineTo(ax + (dx + 0.08) * W, H * (0.9 - h)); }
      ctx.lineTo(ax + 0.05 * W, H * 0.8); ctx.lineTo(ax + 0.08 * W, H * 0.62); ctx.lineTo(ax + 0.1 * W, H * 0.55);
      ctx.lineTo(ax + 0.12 * W, H * 0.62); ctx.lineTo(ax + 0.15 * W, H * 0.8); ctx.lineTo(ax + 0.35 * W, H * 0.82); ctx.lineTo(ax + 0.35 * W, H * 0.9);
      ctx.fill();
      ctx.fillStyle = '#ffb347';
      for (let i = 0; i < 70; i++) { const lx = ax - W * 0.4 + (i / 70) * W * 0.75; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6 + i); ctx.fillRect(lx, H * 0.893, 2.5, 2.5); }
      ctx.globalAlpha = 1;
      flame(ctx, ax + 0.1 * W, H * 0.55, 6, t);
    }
    // objects
    for (const o of this.objs) {
      const x = this.sx(o.x);
      if (x < -80 || x > W + 80) continue;
      if (o.k === 'ring') {
        const R = o.r * u, done = o.hitT && t - o.hitT < 0.5;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        glow(ctx, x, o.y * u, R * 1.6, done ? 'rgba(255,240,180,A)' : 'rgba(255,170,60,A)', done ? 0.6 : 0.25);
        ctx.restore();
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * TAU + t * 0.8;
          const lx = x + Math.cos(a) * R * 0.35, ly = o.y * u + Math.sin(a) * R;
          ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(lx, ly, Math.max(2, u * 0.55), 0, TAU); ctx.fill();
        }
      } else if (o.k === 'gold' && !o.done) {
        ctx.fillStyle = '#ff9a00'; ctx.beginPath(); ctx.arc(x, o.y * u, u * 0.9, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffc300'; ctx.beginPath(); ctx.arc(x, o.y * u, u * 0.5, 0, TAU); ctx.fill();
      } else if (o.k === 'cloud') {
        const cy = o.y * u, w = o.w * u, h = o.h * u;
        ctx.fillStyle = '#2a2438';
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + (k - 2) * w * 0.2, cy + Math.sin(k * 2 + o.ph) * h * 0.15, w * 0.28, h * 0.45, 0, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#3d3552';
        ctx.beginPath(); ctx.ellipse(x, cy - h * 0.15, w * 0.35, h * 0.3, 0, 0, TAU); ctx.fill();
        if (Math.sin(t * 9 + o.ph * 5) > 0.93) { ctx.fillStyle = 'rgba(200,220,255,0.6)'; ctx.beginPath(); ctx.ellipse(x, cy, w * 0.4, h * 0.4, 0, 0, TAU); ctx.fill(); }
      } else if (o.k === 'bolt') {
        const y0 = o.top ? 0 : H, y1 = o.top ? o.len * u : H - o.len * u;
        if (o.on) {
          ctx.save(); ctx.strokeStyle = '#e8f0ff'; ctx.lineWidth = 3; ctx.shadowColor = '#7fb2ff'; ctx.shadowBlur = 18;
          ctx.beginPath(); ctx.moveTo(x, y0);
          for (let k = 1; k <= 8; k++) ctx.lineTo(x + Math.sin(o.seed + k * 7.1 + Math.floor(t * 20)) * u * 1.5, y0 + (y1 - y0) * (k / 8));
          ctx.stroke(); ctx.restore();
        } else {
          ctx.strokeStyle = 'rgba(160,190,255,0.35)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }
    // trail
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    this.trail.forEach(([wx, wy], i) => { ctx.globalAlpha = i / this.trail.length * 0.5; ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(this.sx(wx) - 3 * u, wy * u + 1.5 * u, (i / this.trail.length) * u * 0.9, 0, TAU); ctx.fill(); });
    ctx.restore();
    this.drawVimana(ctx, this.sx(this.dist + 25 * (W / H) * 0.5), this.y * u, u);
    this.sparks.draw(ctx);
    if (this.pop && t - this.pop.t < 0.8) {
      ctx.globalAlpha = 1 - (t - this.pop.t) / 0.8;
      ctx.fillStyle = '#ffe08a'; ctx.font = `700 ${Math.round(u * 3.2)}px Poppins, sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(this.pop.text, W * 0.25, this.pop.y * u - (t - this.pop.t) * 40 - u * 5);
      ctx.globalAlpha = 1;
    }
    // progress: Lanka → Ayodhya
    const bw = Math.min(420, W * 0.6), bx = (W - bw) / 2, by = H - 22;
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(bx, by, bw, 6);
    ctx.fillStyle = '#ffb238'; ctx.fillRect(bx, by, bw * prog, 6);
    ctx.font = '12px Poppins, sans-serif'; ctx.fillStyle = '#e9cfa8'; ctx.textAlign = 'right'; ctx.fillText('Lanka', bx - 8, by + 7);
    ctx.textAlign = 'left'; ctx.fillText('Ayodhya 🛕', bx + bw + 8, by + 7);
    if (this.state === 'intro') {
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffd36b'; ctx.font = `400 ${Math.round(Math.min(W, H) * 0.08)}px "Yatra One", serif`;
      ctx.fillText(this.introT > 1 ? 'लंका से अयोध्या' : 'उड़ान!', W / 2, H * 0.4);
    }
    ctx.restore();
  }
  drawVimana(ctx, x, y, u) {
    const s = u * 1.15, blink = this.inv > 0 && Math.floor(this.t * 12) % 2 === 0;
    if (blink) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(clamp(this.vy / 220, -0.25, 0.3));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, s * 9, 'rgba(255,190,90,A)', 0.35); ctx.restore();
    // hull
    const g = ctx.createLinearGradient(0, -s, 0, s * 2);
    g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#b8740e');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-s * 6, 0); ctx.quadraticCurveTo(0, s * 3.2, s * 6, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a3121a'; ctx.fillRect(-s * 5.5, -s * 0.6, s * 11, s * 0.7);
    // swan prow & tail
    ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = s * 0.7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * 5.5, -s * 0.2); ctx.quadraticCurveTo(s * 7.8, -s * 1.5, s * 6.8, -s * 3.2); ctx.stroke();
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(s * 7, -s * 3.4, s * 0.7, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 5.5, -s * 0.3); ctx.lineTo(-s * 8, -s * 3); ctx.lineTo(-s * 6.5, -s * 0.2); ctx.fill();
    // pavilion
    ctx.fillStyle = '#ffd36b';
    for (const px of [-3.5, -1.2, 1.2, 3.5]) ctx.fillRect(px * s - s * 0.2, -s * 3.6, s * 0.4, s * 3);
    ctx.fillStyle = '#a3121a';
    ctx.beginPath(); ctx.moveTo(-s * 4.4, -s * 3.6); ctx.lineTo(s * 4.4, -s * 3.6); ctx.lineTo(s * 2.4, -s * 5.2); ctx.lineTo(-s * 2.4, -s * 5.2); ctx.fill();
    ctx.fillStyle = '#ffd36b';
    ctx.beginPath(); ctx.ellipse(0, -s * 5.6, s * 1.3, s * 1.0, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(-s * 0.12, -s * 7.4, s * 0.24, s * 1.4);
    ctx.fillStyle = '#ff7a00'; ctx.beginPath(); ctx.moveTo(s * 0.12, -s * 7.4); ctx.lineTo(s * 1.5, -s * 7); ctx.lineTo(s * 0.12, -s * 6.6); ctx.fill();
    // passengers with halos
    [[-2.2, '#2b4c9a'], [-0.7, '#c2185b'], [0.8, '#f1c40f'], [2.3, '#e65100']].forEach(([px, c]) => {
      glow(ctx, px * s, -s * 2.6, s * 1.2, 'rgba(255,220,140,A)', 0.5);
      ctx.fillStyle = c; ctx.fillRect(px * s - s * 0.4, -s * 2.3, s * 0.8, s * 1.8);
      ctx.fillStyle = '#f2d2b0'; ctx.beginPath(); ctx.arc(px * s, -s * 2.6, s * 0.38, 0, TAU); ctx.fill();
    });
    // rim lamps
    for (let k = -5; k <= 5; k++) { ctx.fillStyle = Math.sin(this.t * 8 + k) > 0 ? '#fff2c0' : '#ffb347'; ctx.beginPath(); ctx.arc(k * s, s * 0.35, s * 0.25, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}

// ================================================================== 🔔 Sarayu Aarti (rhythm)
// Raga-flavoured melody (C major pentatonic with Ma tivra colour); one note per chart entry.
const MELODY = [0, 2, 4, 7, 9, 7, 4, 2, 4, 6, 7, 9, 12, 9, 7, 4, 2, 4, 7, 4, 2, 0, 2, 4, 7, 9, 11, 12, 11, 9, 7, 6, 4, 2, 0, 2];
class Aarti {
  constructor(m) {
    this.m = m; this.a = m.audio;
    const ac = this.a.ctx;
    this.bpm = 104; this.spb = 60 / this.bpm;
    this.beats = 76;
    this.travel = 1.7; // seconds a note takes to fall
    this.start = (ac ? ac.currentTime : performance.now() / 1000) + 2.2;
    this.notes = this.makeChart();
    this.score = 0; this.combo = 0; this.maxCombo = 0; this.perfect = 0; this.good = 0; this.miss = 0;
    this.judge = null; this.sched = 0; this.swing = 0; this.flare = [0, 0, 0];
    this.sparks = new Sparks();
    this.musicWas = this.a.musicVol;
    this.a.setMusic?.(0.08);
    this.lanePress = [0, 0, 0];
    m.help(window.matchMedia('(pointer: coarse)').matches ? 'Tap the <b>left / middle / right</b> of the screen as the bells reach the line' : 'Press <b>A S D</b> (or ← ↓ →) as the bells reach the line', 4000);
  }
  now() { return this.a.ctx ? this.a.ctx.currentTime : performance.now() / 1000; }
  makeChart() {
    const notes = [];
    let lane = 1, mi = 0;
    for (let b = 4; b < this.beats; b++) {
      const section = b < 20 ? 0 : b < 44 ? 1 : b < 60 ? 2 : 3;
      const add = (beat) => {
        lane = (lane + (Math.random() < 0.5 ? 1 : 2)) % 3;
        notes.push({ t: beat * this.spb, lane, pitch: MELODY[mi++ % MELODY.length], hit: false, missed: false });
      };
      if (section === 0) { if (b % 2 === 0) add(b); }
      else if (section === 1) { add(b); }
      else if (section === 2) { add(b); if (b % 2 === 1) add(b + 0.5); }
      else { add(b); add(b + 0.5); if (b % 4 === 3) { const l = (lane + 1) % 3; notes.push({ t: (b + 0.5) * this.spb, lane: l, pitch: MELODY[mi % MELODY.length] + 7, hit: false, missed: false }); } }
    }
    return notes;
  }
  // background percussion scheduled slightly ahead on the audio clock
  schedule() {
    const ac = this.a.ctx; if (!ac) return;
    const horizon = this.now() + 0.25;
    while (this.start + this.sched * this.spb / 2 < horizon && this.sched < this.beats * 2 + 2) {
      const when = this.start + this.sched * this.spb / 2;
      const beat = this.sched / 2;
      if (this.sched % 2 === 0) this.drum(when, beat % 4 === 0 ? 70 : 110, beat % 4 === 0 ? 0.5 : 0.32);
      else this.manjira(when);
      if (beat % 8 === 0 && this.sched % 2 === 0) this.drone(when);
      this.sched++;
    }
  }
  drum(when, f, v) {
    const ac = this.a.ctx, o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(f * 1.8, when); o.frequency.exponentialRampToValueAtTime(f * 0.6, when + 0.18);
    g.gain.setValueAtTime(v, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
    o.connect(g).connect(this.a.sfx); o.start(when); o.stop(when + 0.32);
  }
  manjira(when) {
    const ac = this.a.ctx;
    [2900, 4100].forEach((f) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.025, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
      o.connect(g).connect(this.a.sfx); o.start(when); o.stop(when + 0.13);
    });
  }
  drone(when) {
    const ac = this.a.ctx;
    [130.81, 196, 261.63].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(0.03 - i * 0.006, when + 0.3);
      g.gain.linearRampToValueAtTime(0.0001, when + this.spb * 8);
      o.connect(lp).connect(g).connect(this.a.sfx);
      o.start(when); o.stop(when + this.spb * 8 + 0.1);
    });
  }
  pluck(semi) {
    const ac = this.a.ctx; if (!ac) return;
    const t = ac.currentTime, f = 523.25 * Math.pow(2, semi / 12);
    [[1, 0.16], [2, 0.05], [3, 0.03]].forEach(([h, v]) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = h === 1 ? 'triangle' : 'sine'; o.frequency.value = f * h;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g); g.connect(this.a.sfx); g.connect(this.a.reverb); o.start(t); o.stop(t + 1);
    });
  }
  press(lane) {
    this.lanePress[lane] = 0.15;
    const now = this.now() - this.start;
    let best = null, bd = 1;
    for (const n of this.notes) {
      if (n.hit || n.missed || n.lane !== lane) continue;
      const d = Math.abs(n.t - now);
      if (d < bd) { bd = d; best = n; }
      if (n.t - now > 0.3) break;
    }
    if (!best || bd > 0.16) { this.judge = { text: '·', t: performance.now(), c: '#888' }; return; }
    best.hit = true;
    const perfect = bd <= 0.07;
    if (perfect) this.perfect++; else this.good++;
    this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
    const mult = Math.min(2, 1 + Math.floor(this.combo / 10) * 0.1);
    this.score += (perfect ? 300 : 150) * mult;
    this.pluck(best.pitch);
    this.swing += perfect ? 0.55 : 0.35;
    this.flare[lane] = 1;
    this.judge = { text: perfect ? 'PERFECT' : 'GOOD', t: performance.now(), c: perfect ? '#fff2a8' : '#9fe7ff' };
    const W = this.m.W, H = this.m.H;
    this.sparks.burst(this.laneX(lane, W), H * 0.8, perfect ? 22 : 10, ['#ffd36b', '#ff9a2a', '#fff'], 200, 0.6, 200);
  }
  laneX(l, W) { return W / 2 + (l - 1) * Math.min(W * 0.22, 150); }
  pointer(type, e) { if (type === 'down') this.press(clamp(Math.floor((e.clientX / this.m.W) * 3), 0, 2)); }
  key(code, down) {
    if (!down) return;
    const map = { KeyA: 0, KeyS: 1, KeyD: 2, KeyJ: 0, KeyK: 1, KeyL: 2, ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2, Digit1: 0, Digit2: 1, Digit3: 2, KeyF: 0, Space: 1 };
    if (code in map) this.press(map[code]);
  }
  update(dt) {
    this.schedule();
    this.sparks.update(dt);
    this.lanePress = this.lanePress.map((v) => Math.max(0, v - dt));
    this.flare = this.flare.map((v) => Math.max(0, v - dt * 3));
    const now = this.now() - this.start;
    for (const n of this.notes) {
      if (!n.hit && !n.missed && now - n.t > 0.16) { n.missed = true; this.miss++; this.combo = 0; this.judge = { text: 'MISS', t: performance.now(), c: '#ff7b6b' }; }
    }
    const total = this.notes.length, done = this.perfect + this.good + this.miss;
    this.m.setScore(`✦ ${Math.round(this.score).toLocaleString('en-IN')}${this.combo > 4 ? ` · 🔥${this.combo}` : ''}`);
    if (done >= total && now > this.notes[total - 1].t + 1) {
      const acc = (this.perfect + this.good * 0.6) / total;
      const grade = acc >= 0.95 ? 'S' : acc >= 0.85 ? 'A' : acc >= 0.7 ? 'B' : acc >= 0.5 ? 'C' : 'D';
      if (acc >= 0.7) this.a.shankh?.(0);
      this.m.finish({
        score: Math.round(this.score), acc, grade: `<b class="grade g${grade}">${grade}</b>`,
        title: acc >= 0.85 ? 'जय सरयू मैया!' : acc >= 0.6 ? 'सुंदर आरती!' : 'Keep practising…',
        sub: `Accuracy ${Math.round(acc * 100)}%`,
        rows: [['Perfect · Good · Miss', `${this.perfect} · ${this.good} · ${this.miss}`], ['Best combo', this.maxCombo]],
      });
    }
  }
  stop() { this.a.setMusic?.(this.musicWas); }
  draw(ctx, W, H) {
    const t = this.now() - this.start, real = performance.now() / 1000;
    nightSky(ctx, W, H, real, 1);
    // temple + ghat silhouettes, river reflection
    ctx.fillStyle = '#120808';
    ctx.beginPath(); ctx.moveTo(0, H * 0.62);
    const sk = [[0.05, 0.56], [0.12, 0.5], [0.16, 0.42], [0.2, 0.5], [0.3, 0.55], [0.78, 0.55], [0.84, 0.47], [0.88, 0.38], [0.92, 0.47], [1, 0.56]];
    sk.forEach(([x, y]) => ctx.lineTo(x * W, y * H));
    ctx.lineTo(W, H * 0.62); ctx.fill();
    for (let i = 0; i < 60; i++) {
      const x = (i / 60) * W + 6;
      flame(ctx, x, H * 0.615, 3, real, i);
      ctx.fillStyle = 'rgba(255,160,60,0.25)'; ctx.fillRect(x - 1, H * 0.64 + (i % 4) * 4, 3, 8 + Math.sin(real * 3 + i) * 3);
    }
    const rg = ctx.createLinearGradient(0, H * 0.63, 0, H);
    rg.addColorStop(0, 'rgba(40,20,30,0.9)'); rg.addColorStop(1, 'rgba(5,5,12,1)');
    ctx.fillStyle = rg; ctx.fillRect(0, H * 0.63, W, H * 0.37);
    // lanes
    const hitY = H * 0.8, topY = H * 0.08;
    for (let l = 0; l < 3; l++) {
      const x = this.laneX(l, W);
      ctx.strokeStyle = this.lanePress[l] > 0 ? 'rgba(255,220,140,0.5)' : 'rgba(255,200,120,0.14)';
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x, hitY + 30); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, hitY, 46, 'rgba(255,170,60,A)', 0.25 + this.flare[l] * 0.6);
      ctx.restore();
      ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, hitY, 24, 0, TAU); ctx.stroke();
    }
    // notes: bells/marigolds falling
    for (const n of this.notes) {
      if (n.hit) continue;
      const dtn = n.t - t;
      if (dtn > this.travel || dtn < -0.3) continue;
      const y = hitY - (dtn / this.travel) * (hitY - topY);
      const x = this.laneX(n.lane, W);
      ctx.globalAlpha = n.missed ? 0.25 : 1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, 30, 'rgba(255,150,40,A)', 0.4); ctx.restore();
      ctx.fillStyle = '#ff8c00'; ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffc300';
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 11, y + Math.sin(a) * 11, 5, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#d4af37'; ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🔔', x, y + 1);
      ctx.globalAlpha = 1;
    }
    // the aarti thali swinging in a circle at the bottom centre
    const ang = this.swing;
    const cx = W / 2 + Math.cos(ang * 2) * 18, cy = H * 0.93 + Math.sin(ang * 2) * 8;
    ctx.fillStyle = '#d4af37'; ctx.beginPath(); ctx.ellipse(cx, cy, 70, 16, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b8901f'; ctx.beginPath(); ctx.ellipse(cx, cy + 4, 70, 14, 0, 0, Math.PI); ctx.fill();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + ang;
      const fx = cx + Math.cos(a) * 42, fy = cy - 6 + Math.sin(a) * 9;
      diya(ctx, fx, fy, 9, real, k);
      if (Math.max(...this.flare) > 0.5) flame(ctx, fx + 2, fy - 4, 8 * Math.max(...this.flare), real, k);
    }
    this.sparks.draw(ctx);
    // judgement & countdown
    if (this.judge) {
      const age = (performance.now() - this.judge.t) / 1000;
      if (age < 0.6) {
        ctx.globalAlpha = 1 - age / 0.6; ctx.fillStyle = this.judge.c; ctx.textAlign = 'center';
        ctx.font = `700 ${Math.round(Math.min(W, H) * 0.06)}px Poppins, sans-serif`;
        ctx.fillText(this.judge.text, W / 2, H * 0.42 - age * 30);
        if (this.combo > 4) { ctx.font = `600 ${Math.round(Math.min(W, H) * 0.035)}px Poppins, sans-serif`; ctx.fillText(`${this.combo} combo`, W / 2, H * 0.42 + Math.min(W, H) * 0.05); }
        ctx.globalAlpha = 1;
      }
    }
    if (t < 0) {
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffd36b'; ctx.font = `400 ${Math.round(Math.min(W, H) * 0.09)}px "Yatra One", serif`;
      ctx.fillText(t < -1.2 ? 'सरयू आरती' : String(Math.ceil(-t / 0.4)), W / 2, H * 0.36);
    }
    // progress
    const p = clamp(t / (this.beats * this.spb), 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(W * 0.2, H - 6, W * 0.6, 3);
    ctx.fillStyle = '#ffb238'; ctx.fillRect(W * 0.2, H - 6, W * 0.6 * p, 3);
  }
}

// ================================================================== 🎨 Rangoli
const COLORS = ['#e8112d', '#ff9f1c', '#ffd60a', '#ff4fa3', '#2ec4b6', '#7b2cbf', '#ffffff'];
class Rangoli {
  constructor(m) {
    this.m = m; this.a = m.audio;
    this.sym = 8;
    this.time = 45; this.left = this.time;
    this.color = COLORS[1];
    this.size = 0;
    this.art = document.createElement('canvas');
    this.art.width = this.art.height = 512;
    this.actx = this.art.getContext('2d');
    this.strokes = 0; this.inkTotal = 0; this.inkGood = 0;
    this.template = (Math.random() * 3) | 0;
    this.guide = this.makeGuide();
    this.covered = new Uint8Array(this.guide.length);
    this.drawing = false; this.lastPt = null;
    this.sparks = new Sparks();
    const tools = m.tools(COLORS.map((c, i) => `<button class="swatch ${i === 1 ? 'on' : ''}" data-c="${c}" style="background:${c}"></button>`).join('') + '<button class="btn primary" id="rg-done">Done ✔</button>');
    tools.querySelectorAll('.swatch').forEach((b) => (b.onclick = () => { this.color = b.dataset.c; tools.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('on', x === b)); }));
    tools.querySelector('#rg-done').onclick = () => this.end();
    m.help('Trace the glowing dotted pattern. Every stroke is <b>mirrored 8 ways</b>!', 4500);
  }
  makeGuide() {
    // points in normalised coords (-1..1)
    const pts = [];
    const add = (x, y) => pts.push([x, y]);
    const k = this.sym;
    if (this.template === 0) { // lotus
      for (let i = 0; i < 360; i++) { const a = (i / 360) * TAU; const r = 0.5 + 0.38 * Math.abs(Math.cos(a * k / 2)); add(Math.cos(a) * r, Math.sin(a) * r); }
      for (let i = 0; i < 90; i++) { const a = (i / 90) * TAU; add(Math.cos(a) * 0.3, Math.sin(a) * 0.3); }
    } else if (this.template === 1) { // star with rings
      for (let i = 0; i < k * 2; i++) {
        const a0 = (i / (k * 2)) * TAU, a1 = ((i + 1) / (k * 2)) * TAU;
        const r0 = i % 2 ? 0.45 : 0.88, r1 = i % 2 ? 0.88 : 0.45;
        for (let s = 0; s < 18; s++) { const f = s / 18; add(Math.cos(a0) * r0 * (1 - f) + Math.cos(a1) * r1 * f, Math.sin(a0) * r0 * (1 - f) + Math.sin(a1) * r1 * f); }
      }
      for (let i = 0; i < 120; i++) { const a = (i / 120) * TAU; add(Math.cos(a) * 0.3, Math.sin(a) * 0.3); }
    } else { // petals around a circle
      for (let p = 0; p < k; p++) {
        const base = (p / k) * TAU;
        for (let i = 0; i <= 40; i++) {
          const f = i / 40, a = base + Math.sin(f * Math.PI) * 0.32, r = 0.3 + f * 0.6;
          add(Math.cos(a) * r, Math.sin(a) * r);
          const b2 = base - Math.sin(f * Math.PI) * 0.32;
          add(Math.cos(b2) * r, Math.sin(b2) * r);
        }
      }
      for (let i = 0; i < 160; i++) { const a = (i / 160) * TAU; add(Math.cos(a) * 0.9, Math.sin(a) * 0.9); }
    }
    return pts;
  }
  resize() { this.size = Math.min(this.m.W, this.m.H - 120) * 0.86; }
  toNorm(e) {
    const cx = this.m.W / 2, cy = this.m.H / 2 + 10;
    return [(e.clientX - cx) / (this.size / 2), (e.clientY - cy) / (this.size / 2)];
  }
  pointer(type, e) {
    if (this.done) return;
    if (type === 'down') { this.drawing = true; this.lastPt = this.toNorm(e); this.strokes++; }
    else if (type === 'move' && this.drawing) { const p = this.toNorm(e); this.paint(this.lastPt, p); this.lastPt = p; }
    else if (type === 'up') this.drawing = false;
  }
  paint(p0, p1) {
    const a = this.actx, S = 512, k = this.sym;
    const steps = Math.max(1, Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 0.01));
    for (let s = 0; s <= steps; s++) {
      const x = p0[0] + (p1[0] - p0[0]) * s / steps, y = p0[1] + (p1[1] - p0[1]) * s / steps;
      if (Math.hypot(x, y) > 1.02) continue;
      const r = Math.hypot(x, y), th = Math.atan2(y, x);
      this.inkTotal++;
      let near = false;
      for (let m = 0; m < k; m++) {
        for (const flip of [1, -1]) {
          const ang = flip * th + (m / k) * TAU;
          const X = Math.cos(ang) * r, Y = Math.sin(ang) * r;
          a.fillStyle = this.color;
          a.globalAlpha = 0.9;
          a.beginPath(); a.arc(S / 2 + X * S / 2, S / 2 + Y * S / 2, 7 + Math.random() * 2, 0, TAU); a.fill();
          // coverage of guide points
          for (let i = 0; i < this.guide.length; i++) {
            const g = this.guide[i];
            if (Math.abs(g[0] - X) < 0.045 && Math.abs(g[1] - Y) < 0.045) { this.covered[i] = 1; near = true; }
          }
        }
      }
      if (near) this.inkGood++;
    }
    a.globalAlpha = 1;
    if (Math.random() < 0.3) this.sparks.burst(this.m.W / 2 + p1[0] * this.size / 2, this.m.H / 2 + 10 + p1[1] * this.size / 2, 3, [this.color], 60, 0.4, 0);
  }
  coverage() { let c = 0; for (const v of this.covered) c += v; return c / this.covered.length; }
  update(dt) {
    this.sparks.update(dt);
    this.left -= dt;
    const cov = this.coverage();
    this.m.setScore(`🎯 ${Math.round(cov * 100)}% · ⏳ ${Math.max(0, Math.ceil(this.left))}s`);
    if (this.left <= 0 || cov >= 0.985) this.end();
  }
  end() {
    if (this.done) return;
    this.done = true;
    const cov = this.coverage();
    const neat = this.inkTotal ? this.inkGood / this.inkTotal : 0;
    const score = Math.round(cov * 100 * (0.6 + 0.4 * neat) * 100);
    const pct = Math.round(score / 100);
    this.a.coin?.();
    this.m.finish({
      score, art: this.art, pct,
      title: pct >= 85 ? 'अति सुंदर!' : pct >= 60 ? 'सुंदर रंगोली!' : 'A humble rangoli',
      sub: 'Your rangoli now decorates Ram ki Paidi',
      grade: pct >= 90 ? '🌸🌸🌸' : pct >= 70 ? '🌸🌸' : '🌸',
      rows: [['Pattern covered', `${Math.round(cov * 100)}%`], ['Neatness', `${Math.round(neat * 100)}%`]],
    });
  }
  draw(ctx, W, H) {
    const t = performance.now() / 1000;
    ctx.fillStyle = '#1a0f0a'; ctx.fillRect(0, 0, W, H);
    // stone floor
    ctx.fillStyle = '#2a1a10';
    for (let y = 0; y < H; y += 60) for (let x = (y / 60) % 2 ? 30 : 0; x < W; x += 60) ctx.fillRect(x + 1, y + 1, 58, 58);
    const cx = W / 2, cy = H / 2 + 10, R = this.size / 2;
    // border diyas
    for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; diya(ctx, cx + Math.cos(a) * (R + 26), cy + Math.sin(a) * (R + 26) + 6, 8, t, k); }
    ctx.drawImage(this.art, cx - R, cy - R, R * 2, R * 2);
    // guide dots
    if (!this.done) {
      for (let i = 0; i < this.guide.length; i += 2) {
        const [x, y] = this.guide[i];
        if (this.covered[i]) continue;
        ctx.fillStyle = `rgba(255,236,170,${0.6 + 0.3 * Math.sin(t * 4 + i * 0.1)})`;
        ctx.beginPath(); ctx.arc(cx + x * R, cy + y * R, 2.4, 0, TAU); ctx.fill();
      }
      // mirror axes hint
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let k = 0; k < this.sym; k++) { const a = (k / this.sym) * TAU; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); }
    }
    this.sparks.draw(ctx);
  }
}
