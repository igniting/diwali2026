// Story mode: chapters + a shadow-puppet storybook (inspired by tholu bommalata,
// the translucent coloured leather puppetry of South India, backlit by an oil lamp).

const TAU = Math.PI * 2;

export const CHAPTERS = [
  { id: 'sandesh', hindi: 'संदेश', title: 'Prologue · The Message' },
  { id: 'rangoli', hindi: 'रंगोली', title: 'Chapter 1 · Rangoli at Ram ki Paidi' },
  { id: 'pehla', hindi: 'पहला दीप', title: 'Chapter 2 · The First Lamps' },
  { id: 'yatra', hindi: 'पुष्पक यात्रा', title: 'Chapter 3 · The Flight Home' },
  { id: 'aandhi', hindi: 'आंधी', title: 'Chapter 4 · The Storm' },
  { id: 'aagaman', hindi: 'आगमन', title: 'Chapter 5 · The Return' },
];

// ------------------------------------------------------------------ puppet drawing
const INK = '#1a0b05';
function cutDots(ctx, x, y, w, h, n = 6) {
  // characteristic punched holes in leather puppets: tiny lit dots along a band
  ctx.save(); ctx.fillStyle = 'rgba(255,220,150,0.85)';
  for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(x + (i + 0.5) * (w / n), y + h / 2, Math.max(0.8, w / n * 0.16), 0, TAU); ctx.fill(); }
  ctx.restore();
}
function part(ctx, fill, draw) {
  ctx.beginPath(); draw(); ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
}
function limb(ctx, x0, y0, x1, y1, w, fill) {
  const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * w / 2, ny = Math.cos(a) * w / 2;
  part(ctx, fill, () => { ctx.moveTo(x0 + nx, y0 + ny); ctx.lineTo(x1 + nx * 0.7, y1 + ny * 0.7); ctx.lineTo(x1 - nx * 0.7, y1 - ny * 0.7); ctx.lineTo(x0 - nx, y0 - ny); ctx.closePath(); });
  ctx.fillStyle = 'rgba(255,220,150,0.9)'; ctx.beginPath(); ctx.arc(x0, y0, w * 0.18, 0, TAU); ctx.fill(); // joint rivet
}
function rod(ctx, x, y, len) {
  ctx.strokeStyle = 'rgba(30,15,5,0.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * 0.15, y + len); ctx.stroke();
}
function flameAt(ctx, x, y, s, t, ph = 0) {
  const f = 1 + Math.sin(t * 12 + ph) * 0.1;
  const g = ctx.createRadialGradient(x, y - s, 0, x, y - s, s * 4);
  g.addColorStop(0, 'rgba(255,190,80,0.55)'); g.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = g; ctx.fillRect(x - s * 4, y - s * 5, s * 8, s * 8);
  ctx.save(); ctx.translate(x, y); ctx.scale(1, f);
  ctx.beginPath(); ctx.moveTo(0, -s * 2); ctx.bezierCurveTo(s, -s, s * 0.8, 0, 0, 0); ctx.bezierCurveTo(-s * 0.8, 0, -s, -s, 0, -s * 2);
  const lg = ctx.createLinearGradient(0, -s * 2, 0, 0); lg.addColorStop(0, '#ff7a00'); lg.addColorStop(1, '#fff3c0');
  ctx.fillStyle = lg; ctx.fill(); ctx.restore();
}

// A figure in profile facing right (dir = 1) or left (dir = -1)
// pose: 'stand' | 'bow' | 'sit' | 'fly' | 'diya' | 'blessing'
function figure(ctx, o, t) {
  const { x, y, s = 1, dir = 1, skin = 'rgba(40,90,170,0.85)', cloth = 'rgba(200,120,20,0.85)', crown = true, pose = 'stand', female = false, tail = false, mace = false } = o;
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
  const sway = Math.sin(t * 1.6 + x) * 0.04;
  ctx.rotate(sway);
  rod(ctx, 0, -40, 160);
  if (pose === 'fly') { ctx.rotate(-1.25); }
  // legs / lower garment
  if (pose === 'sit') {
    part(ctx, cloth, () => { ctx.moveTo(-26, 0); ctx.lineTo(30, 0); ctx.lineTo(34, 18); ctx.lineTo(-30, 18); ctx.closePath(); });
    cutDots(ctx, -24, 6, 50, 6, 7);
  } else if (female) {
    part(ctx, cloth, () => { ctx.moveTo(-10, -40); ctx.lineTo(10, -40); ctx.lineTo(24, 40); ctx.lineTo(-22, 40); ctx.closePath(); });
    cutDots(ctx, -18, 28, 38, 6, 6);
  } else {
    const st = pose === 'bow' ? 0.35 : pose === 'fly' ? 0.5 : 0.12 + Math.sin(t * 2) * 0.04;
    limb(ctx, -4, -6, -4 - Math.sin(st) * 40, 40, 13, skin);
    limb(ctx, 4, -6, 4 + Math.sin(st) * 40, 40, 13, skin);
    part(ctx, cloth, () => { ctx.moveTo(-14, -30); ctx.lineTo(14, -30); ctx.lineTo(20, 4); ctx.lineTo(-18, 4); ctx.closePath(); });
    cutDots(ctx, -14, -6, 32, 6, 5);
  }
  // torso
  part(ctx, skin, () => { ctx.moveTo(-12, -70); ctx.quadraticCurveTo(16, -74, 14, -40); ctx.lineTo(10, -28); ctx.lineTo(-12, -28); ctx.quadraticCurveTo(-18, -50, -12, -70); });
  // necklace & sash
  ctx.strokeStyle = 'rgba(255,215,120,0.95)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(2, -68, 10, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, -66); ctx.lineTo(12, -32); ctx.stroke();
  if (tail) {
    ctx.strokeStyle = INK; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-10, -20); ctx.bezierCurveTo(-60, -10, -50, -90, -24, -96); ctx.stroke();
    ctx.strokeStyle = skin; ctx.lineWidth = 3.5; ctx.stroke();
  }
  // head in profile
  part(ctx, skin, () => {
    ctx.moveTo(-8, -76); ctx.quadraticCurveTo(-14, -98, 2, -104); ctx.quadraticCurveTo(16, -104, 16, -92);
    ctx.lineTo(19, -88); ctx.lineTo(15, -85); ctx.quadraticCurveTo(14, -76, 6, -74); ctx.closePath();
  });
  ctx.fillStyle = 'rgba(255,235,190,0.95)'; ctx.beginPath(); ctx.ellipse(10, -92, 3, 1.6, 0, 0, TAU); ctx.fill(); // eye
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(10.5, -92, 1.1, 0, TAU); ctx.fill();
  if (crown) {
    part(ctx, 'rgba(230,170,30,0.92)', () => { ctx.moveTo(-10, -100); ctx.lineTo(12, -104); ctx.lineTo(6, -128); ctx.lineTo(0, -140); ctx.lineTo(-6, -126); ctx.closePath(); });
    cutDots(ctx, -6, -118, 12, 6, 3);
  } else if (female) {
    part(ctx, INK, () => { ctx.ellipse(-12, -96, 9, 7, 0, 0, TAU); });
  }
  // arms by pose
  const armC = skin;
  if (pose === 'bow') {
    limb(ctx, 4, -66, 34, -70, 10, armC); limb(ctx, 34, -70, 60, -72, 9, armC);
    limb(ctx, 0, -64, 10, -72, 10, armC);
    ctx.strokeStyle = 'rgba(120,60,10,1)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(52, -72, 46, -1.25, 1.25); ctx.stroke(); // bow
    ctx.strokeStyle = 'rgba(255,230,170,0.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(52 + Math.cos(-1.25) * 46, -72 + Math.sin(-1.25) * 46); ctx.lineTo(12, -72); ctx.lineTo(52 + Math.cos(1.25) * 46, -72 + Math.sin(1.25) * 46); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,1)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, -72); ctx.lineTo(110, -72); ctx.stroke(); // arrow
  } else if (pose === 'diya') {
    limb(ctx, 2, -64, 26, -52, 10, armC); limb(ctx, 26, -52, 40, -66, 9, armC);
    part(ctx, 'rgba(160,70,30,0.95)', () => { ctx.ellipse(42, -68, 9, 4, 0, 0, Math.PI); });
    flameAt(ctx, 44, -70, 4, t, x);
  } else if (pose === 'blessing') {
    limb(ctx, 2, -64, 24, -76, 10, armC); limb(ctx, 24, -76, 30, -98, 9, armC);
  } else if (pose === 'fly') {
    limb(ctx, 2, -64, 36, -96, 10, armC); limb(ctx, 36, -96, 60, -110, 9, armC);
    if (mace) {
      ctx.strokeStyle = 'rgba(120,70,20,1)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(58, -106); ctx.lineTo(40, -60); ctx.stroke();
      part(ctx, 'rgba(230,170,30,0.95)', () => { ctx.arc(62, -116, 13, 0, TAU); });
      cutDots(ctx, 52, -119, 20, 6, 4);
    }
  } else {
    limb(ctx, 2, -64, 16, -36, 10, armC); limb(ctx, 16, -36, 22, -20, 9, armC);
    if (mace) {
      ctx.strokeStyle = 'rgba(120,70,20,1)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(22, -20); ctx.lineTo(30, -80); ctx.stroke();
      part(ctx, 'rgba(230,170,30,0.95)', () => { ctx.arc(31, -90, 12, 0, TAU); });
    }
  }
  ctx.restore();
}
function vimanaPuppet(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 1.5) * 4); ctx.scale(s, s);
  const g = ctx.createRadialGradient(0, -30, 10, 0, -30, 180);
  g.addColorStop(0, 'rgba(255,210,120,0.45)'); g.addColorStop(1, 'rgba(255,160,60,0)');
  ctx.fillStyle = g; ctx.fillRect(-200, -220, 400, 380);
  part(ctx, 'rgba(230,170,30,0.92)', () => { ctx.moveTo(-120, 0); ctx.quadraticCurveTo(0, 60, 120, 0); ctx.closePath(); });
  cutDots(ctx, -100, 8, 200, 8, 18);
  part(ctx, 'rgba(230,170,30,0.92)', () => { ctx.moveTo(110, -2); ctx.quadraticCurveTo(160, -30, 140, -70); ctx.lineTo(128, -64); ctx.quadraticCurveTo(140, -34, 100, -10); ctx.closePath(); });
  part(ctx, 'rgba(160,20,30,0.85)', () => { ctx.moveTo(-90, -100); ctx.lineTo(90, -100); ctx.lineTo(50, -140); ctx.lineTo(-50, -140); ctx.closePath(); });
  part(ctx, 'rgba(230,170,30,0.92)', () => { ctx.ellipse(0, -146, 26, 20, 0, Math.PI, 0); });
  for (const px of [-80, -28, 28, 80]) part(ctx, 'rgba(230,170,30,0.92)', () => { ctx.rect(px - 4, -100, 8, 100); });
  ctx.restore();
}
function lankaSpires(ctx, W, H, t) {
  ctx.fillStyle = 'rgba(60,25,10,0.6)';
  for (let i = 0; i < 9; i++) {
    const x = W * (0.05 + i * 0.11), h = H * (0.18 + (i % 3) * 0.06);
    ctx.beginPath(); ctx.moveTo(x - 20, H * 0.72); ctx.lineTo(x - 12, H * 0.72 - h * 0.7); ctx.lineTo(x, H * 0.72 - h); ctx.lineTo(x + 12, H * 0.72 - h * 0.7); ctx.lineTo(x + 20, H * 0.72); ctx.fill();
  }
}
function ayodhyaSkyline(ctx, W, H, t, lit = 1) {
  ctx.fillStyle = 'rgba(40,18,8,0.75)';
  ctx.beginPath(); ctx.moveTo(0, H * 0.74);
  const pts = [[0.05, 0.66], [0.15, 0.62], [0.22, 0.66], [0.3, 0.6], [0.4, 0.58], [0.46, 0.44], [0.5, 0.36], [0.54, 0.44], [0.6, 0.58], [0.7, 0.62], [0.8, 0.6], [0.9, 0.64], [1, 0.66]];
  pts.forEach(([x, y]) => ctx.lineTo(x * W, y * H)); ctx.lineTo(W, H * 0.74); ctx.fill();
  for (let i = 0; i < 46 * lit; i++) flameAt(ctx, (i + 0.5) / 46 * W, H * 0.745, 3, t, i);
}
function stormClouds(ctx, W, H, t) {
  for (let i = 0; i < 7; i++) {
    const x = ((i * 0.18 + t * 0.03) % 1.2 - 0.1) * W, y = H * (0.12 + (i % 3) * 0.06);
    ctx.fillStyle = 'rgba(30,20,35,0.75)';
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + k * 40, y + Math.sin(k) * 10, 60, 30, 0, 0, TAU); ctx.fill(); }
  }
  if (Math.sin(t * 3.1) > 0.85) {
    ctx.strokeStyle = 'rgba(230,240,255,0.9)'; ctx.lineWidth = 3;
    const lx = W * (0.3 + 0.4 * ((Math.floor(t) * 0.37) % 1));
    ctx.beginPath(); ctx.moveTo(lx, H * 0.18); for (let k = 1; k < 7; k++) ctx.lineTo(lx + Math.sin(k * 5 + t) * 18, H * (0.18 + k * 0.08)); ctx.stroke();
  }
}

// ------------------------------------------------------------------ panels
const RAM = { skin: 'rgba(40,90,180,0.88)', cloth: 'rgba(235,170,30,0.9)' };
const SITA = { skin: 'rgba(230,160,120,0.88)', cloth: 'rgba(200,30,60,0.88)', female: true, crown: true };
const LAKSHMAN = { skin: 'rgba(220,170,110,0.88)', cloth: 'rgba(200,110,20,0.9)' };
const HANUMAN = { skin: 'rgba(210,90,30,0.9)', cloth: 'rgba(240,190,40,0.9)', tail: true, mace: true };
const BHARAT = { skin: 'rgba(60,110,160,0.88)', cloth: 'rgba(240,220,170,0.9)', crown: false };
const FOLK = [
  { skin: 'rgba(180,110,70,0.85)', cloth: 'rgba(200,40,40,0.85)', crown: false, female: true },
  { skin: 'rgba(160,100,60,0.85)', cloth: 'rgba(240,160,30,0.85)', crown: false },
  { skin: 'rgba(190,120,80,0.85)', cloth: 'rgba(120,40,140,0.85)', crown: false, female: true },
  { skin: 'rgba(150,90,55,0.85)', cloth: 'rgba(30,130,120,0.85)', crown: false },
];

export const PANELS = {
  prologue: [
    { hi: 'लंका विजय', en: 'After fourteen years of exile, Shri Ram has triumphed over Ravana in golden Lanka. Dharma is restored.',
      draw: (c, W, H, t) => { lankaSpires(c, W, H, t); figure(c, { x: W * 0.38, y: H * 0.68, s: H / 330, ...RAM, pose: 'bow' }, t); } },
    { hi: 'हनुमान का संदेश', en: 'Hanuman leaps across the sky to carry the joyful news ahead: “Ram is coming home!”',
      draw: (c, W, H, t) => { const p = Math.min(1, 0.15 + t * 0.09); figure(c, { x: W * (0.12 + p * 0.7), y: H * (0.95 - Math.sin(p * Math.PI) * 0.3), s: H / 300, ...HANUMAN, pose: 'fly' }, t); for (let k = 0; k < 30; k++) { c.fillStyle = 'rgba(255,240,200,0.5)'; c.fillRect((k * 97) % W, (k * 53) % (H * 0.5), 2, 2); } } },
    { hi: 'भरत की आज्ञा', en: 'In Nandigram, Bharat — who ruled with Ram’s sandals upon the throne — rises with joy: “Light every lamp in Ayodhya!”',
      draw: (c, W, H, t) => {
        part(c, 'rgba(230,170,30,0.9)', () => { c.rect(W * 0.6, H * 0.52, W * 0.14, H * 0.16); });
        cutDots(c, W * 0.6, H * 0.55, W * 0.14, 6, 9);
        c.fillStyle = 'rgba(255,230,160,0.9)'; c.beginPath(); c.ellipse(W * 0.645, H * 0.505, 14, 5, 0, 0, TAU); c.ellipse(W * 0.695, H * 0.505, 14, 5, 0, 0, TAU); c.fill();
        flameAt(c, W * 0.67, H * 0.47, 6, t);
        figure(c, { x: W * 0.36, y: H * 0.7, s: H / 330, ...BHARAT, pose: 'blessing' }, t);
      } },
    { hi: 'अयोध्या जागी', en: 'But tonight is Amavasya — a moonless night. The Pushpak Vimana must find its way home. The people of Ayodhya turn to you…',
      draw: (c, W, H, t) => { ayodhyaSkyline(c, W, H, t, 0.15); FOLK.forEach((f, i) => figure(c, { x: W * (0.2 + i * 0.18), y: H * 0.78, s: H / 420, ...f, pose: 'diya' }, t)); } },
  ],
  yatra: [
    { hi: 'पुष्पक विमान', en: 'On the shores of Lanka, Shri Ram, Sita and Lakshman board the Pushpak Vimana. Far to the north, Ayodhya’s lamps begin to glow.',
      draw: (c, W, H, t) => {
        lankaSpires(c, W, H, t);
        vimanaPuppet(c, W * 0.5, H * 0.56, H / 520, t);
        [[RAM, -0.06], [SITA, 0], [LAKSHMAN, 0.06]].forEach(([f, dx]) => figure(c, { x: W * (0.5 + dx), y: H * 0.5, s: H / 640, ...f }, t));
      } },
    { hi: 'उड़ान', en: 'Guide the Vimana through the night. Fly through the rings of lamps — their light keeps the Vimana glowing. Beware the storm above!',
      draw: (c, W, H, t) => { vimanaPuppet(c, W * (0.2 + ((t * 0.05) % 0.7)), H * 0.45, H / 700, t); ayodhyaSkyline(c, W, H, t, 0.5); } },
  ],
  storm: [
    { hi: 'आंधी', en: 'As the Vimana nears, a fierce storm rises over the Sarayu. The wind tears at the flames along the ghats.',
      draw: (c, W, H, t) => { stormClouds(c, W, H, t); ayodhyaSkyline(c, W, H, t, 0.6); } },
    { hi: 'सेवक', en: 'Bharat sends his sevaks to stand beside you. Together, guard the flames — keep the lamps burning through the Aandhi!',
      draw: (c, W, H, t) => { stormClouds(c, W, H, t); figure(c, { x: W * 0.22, y: H * 0.74, s: H / 360, ...BHARAT, pose: 'blessing' }, t); FOLK.forEach((f, i) => figure(c, { x: W * (0.42 + i * 0.13), y: H * 0.8, s: H / 440, ...f, pose: 'diya' }, t)); } },
  ],
  arrival: [
    { hi: 'आगमन', en: 'The storm has passed! The Vimana is close. Light the path from the ghats up Hanuman Garhi Marg, so all of Ayodhya can welcome its king.',
      draw: (c, W, H, t) => { ayodhyaSkyline(c, W, H, t, 1); vimanaPuppet(c, W * 0.75, H * 0.22, H / 1300, t); } },
  ],
  epilogue: [
    { hi: 'राम राज्य', en: 'Shri Ram is home. Ayodhya glows brighter than it ever has — and to this day, on this night, every home lights a lamp to welcome him.',
      draw: (c, W, H, t) => { ayodhyaSkyline(c, W, H, t, 1); [[RAM, -0.08], [SITA, 0], [LAKSHMAN, 0.08]].forEach(([f, dx]) => figure(c, { x: W * (0.5 + dx), y: H * 0.68, s: H / 380, ...f, pose: 'blessing' }, t)); figure(c, { x: W * 0.28, y: H * 0.72, s: H / 400, ...HANUMAN, dir: 1 }, t); } },
    { hi: 'शुभ दीपावली', en: 'Thank you for lighting Ayodhya. The endless Utsav, Deep Dash and the festival games are now open. Jai Shri Ram! 🙏',
      draw: (c, W, H, t) => { ayodhyaSkyline(c, W, H, t, 1); for (let i = 0; i < 5; i++) { const x = W * (0.15 + i * 0.17), y = H * (0.2 + (i % 2) * 0.08), r = ((t * 0.6 + i * 0.3) % 1) * 90; c.strokeStyle = `hsla(${i * 70},100%,70%,${1 - r / 90})`; c.lineWidth = 2; for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke(); } } } },
  ],
};

// ------------------------------------------------------------------ storybook overlay
export class Storybook {
  constructor(audio) {
    this.audio = audio;
    const root = this.root = document.createElement('div');
    root.id = 'book';
    root.className = 'hidden';
    root.innerHTML = `<canvas id="book-c"></canvas>
      <div class="book-text"><div class="book-hi" id="book-hi"></div><div class="book-en" id="book-en"></div><div class="book-next" id="book-next">Tap to continue ▸</div></div>
      <button class="book-skip" id="book-skip">Skip ⏭</button>`;
    document.body.appendChild(root);
    this.c = root.querySelector('#book-c');
    this.ctx = this.c.getContext('2d');
    root.addEventListener('pointerup', (e) => { if (e.target.id !== 'book-skip') this.next(); });
    root.querySelector('#book-skip').onclick = (e) => { e.stopPropagation(); this.finish(); };
    addEventListener('keydown', (e) => { if (!this.active) return; if (['Space', 'Enter', 'ArrowRight'].includes(e.code)) { e.preventDefault(); this.next(); } if (e.code === 'Escape') this.finish(); });
    addEventListener('resize', () => this.active && this.resize());
    this.loop = this.loop.bind(this);
  }
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.W = innerWidth; this.H = innerHeight;
    this.c.width = this.W * dpr; this.c.height = this.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  open(panels) {
    return new Promise((resolve) => {
      this.panels = panels; this.i = -1; this.resolve = resolve;
      this.active = true;
      this.root.classList.remove('hidden');
      this.resize();
      this.t0 = performance.now();
      this.next();
      requestAnimationFrame(this.loop);
    });
  }
  next() {
    if (!this.active) return;
    // first tap while text is still typing reveals it fully
    if (this.i >= 0 && !this.revealAll && this.typed < this.panels[this.i].en.length) { this.revealAll = true; return; }
    this.i++;
    if (this.i >= this.panels.length) { this.finish(); return; }
    this.panelT = performance.now();
    this.typed = 0; this.revealAll = false;
    this.root.querySelector('#book-hi').textContent = this.panels[this.i].hi;
    this.audio.bell?.(660 + this.i * 110, 0.18);
  }
  finish() {
    if (!this.active) return;
    this.active = false;
    this.root.classList.add('hidden');
    this.resolve?.();
  }
  loop(now) {
    if (!this.active) return;
    const t = (now - this.t0) / 1000;
    const { ctx: c, W, H } = this;
    const p = this.panels[this.i];
    // backlit cloth screen with a flickering oil lamp behind it
    const flick = 0.88 + Math.sin(t * 9) * 0.04 + Math.sin(t * 23) * 0.03;
    const g = c.createRadialGradient(W * 0.5, H * 0.55, 10, W * 0.5, H * 0.55, Math.max(W, H) * 0.75);
    g.addColorStop(0, `rgba(255,${Math.round(196 * flick)},${Math.round(110 * flick)},1)`);
    g.addColorStop(0.55, `rgba(${Math.round(220 * flick)},120,40,1)`);
    g.addColorStop(1, 'rgba(40,12,4,1)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(90,40,10,0.06)';
    for (let x = 0; x < W; x += 4) c.fillRect(x, 0, 1, H); // cloth weave
    // panel fade-in
    const age = (now - this.panelT) / 1000;
    c.save(); c.globalAlpha = Math.min(1, age * 2);
    p.draw(c, W, H * 0.66, age);
    c.restore();
    // stage frame
    c.strokeStyle = 'rgba(60,20,5,0.9)'; c.lineWidth = 14; c.strokeRect(7, 7, W - 14, H - 14);
    c.strokeStyle = 'rgba(230,170,30,0.6)'; c.lineWidth = 2; c.strokeRect(18, 18, W - 36, H - 36);
    // typewriter narration
    this.typed = this.revealAll ? p.en.length : Math.min(p.en.length, age * 48);
    const en = this.root.querySelector('#book-en');
    const shown = p.en.slice(0, Math.floor(this.typed));
    if (en.textContent !== shown) en.textContent = shown;
    this.root.querySelector('#book-next').style.opacity = this.typed >= p.en.length ? 1 : 0;
    requestAnimationFrame(this.loop);
  }
}
