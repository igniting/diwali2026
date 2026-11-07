// Procedural canvas textures (no external image assets needed)
import * as THREE from 'three';

function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function finish(c, repeat = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Value-noise speckle overlay for stone/plaster
function speckle(ctx, w, h, r, count, alphaMax, light = false) {
  for (let i = 0; i < count; i++) {
    const a = r() * alphaMax;
    ctx.fillStyle = light ? `rgba(255,240,220,${a})` : `rgba(40,20,5,${a})`;
    const s = 1 + r() * 3;
    ctx.fillRect(r() * w, r() * h, s, s);
  }
}

function blotches(ctx, w, h, r, count, color, alphaMax, size) {
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h, rad = size * (0.3 + r());
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${color},${r() * alphaMax})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

export function sandstoneTexture(seed = 1, base = '#c9a27a', blocks = true) {
  const [c, ctx] = canvas(512);
  const r = rand(seed);
  ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
  blotches(ctx, 512, 512, r, 60, '120,70,30', 0.18, 70);
  blotches(ctx, 512, 512, r, 40, '255,230,190', 0.12, 60);
  speckle(ctx, 512, 512, r, 9000, 0.25);
  speckle(ctx, 512, 512, r, 4000, 0.15, true);
  if (blocks) {
    ctx.strokeStyle = 'rgba(60,35,15,0.45)';
    ctx.lineWidth = 2;
    const rows = 4;
    for (let y = 0; y < rows; y++) {
      const yy = (y * 512) / rows;
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(512, yy); ctx.stroke();
      const off = y % 2 ? 64 : 0;
      for (let x = off; x < 512 + 128; x += 128) {
        ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, yy + 512 / rows); ctx.stroke();
      }
    }
    // wear: darker water stains near bottom
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(30,20,10,0.12)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  }
  return finish(c);
}

export function pavingTexture(seed = 7) {
  const [c, ctx] = canvas(512);
  const r = rand(seed);
  ctx.fillStyle = '#b89470'; ctx.fillRect(0, 0, 512, 512);
  const n = 4;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = 0.85 + r() * 0.3;
    ctx.fillStyle = `rgb(${184 * v | 0},${148 * v | 0},${112 * v | 0})`;
    ctx.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
  }
  blotches(ctx, 512, 512, r, 50, '90,50,20', 0.15, 60);
  speckle(ctx, 512, 512, r, 8000, 0.22);
  ctx.strokeStyle = 'rgba(50,30,10,0.6)'; ctx.lineWidth = 3;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath(); ctx.moveTo(i * 128, 0); ctx.lineTo(i * 128, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 128); ctx.lineTo(512, i * 128); ctx.stroke();
  }
  return finish(c);
}

export function plasterTexture(seed, base) {
  const [c, ctx] = canvas(256);
  const r = rand(seed);
  ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
  blotches(ctx, 256, 256, r, 30, '80,50,30', 0.18, 50);
  blotches(ctx, 256, 256, r, 20, '255,255,240', 0.12, 40);
  speckle(ctx, 256, 256, r, 3000, 0.15);
  // vertical grime streaks
  for (let i = 0; i < 25; i++) {
    const x = r() * 256;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(40,30,20,0.15)'); g.addColorStop(1, 'rgba(40,30,20,0)');
    ctx.fillStyle = g; ctx.fillRect(x, 0, 2 + r() * 6, 80 + r() * 170);
  }
  return finish(c);
}

export function windowFacadeTexture(seed, base) {
  // Facade with arched jharokha windows, some glowing warm (emissive map separately)
  const [c, ctx] = canvas(256, 256);
  const [e, ectx] = canvas(256, 256);
  const r = rand(seed);
  ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
  blotches(ctx, 256, 256, r, 25, '80,50,30', 0.2, 40);
  speckle(ctx, 256, 256, r, 2500, 0.15);
  ectx.fillStyle = '#000'; ectx.fillRect(0, 0, 256, 256);
  // cornice band
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(0, 120, 256, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 128, 256, 4);
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
    const x = 40 + col * 128, y = 22 + row * 128, w = 48, h = 76;
    ctx.fillStyle = 'rgba(60,30,15,0.8)';
    ctx.beginPath();
    ctx.moveTo(x - 4, y + h + 4); ctx.lineTo(x - 4, y + 20);
    ctx.arc(x + w / 2, y + 20, w / 2 + 4, Math.PI, 0); ctx.lineTo(x + w + 4, y + h + 4); ctx.fill();
    const lit = r() < 0.6;
    const col1 = lit ? '#ffb347' : '#1a0f08';
    ctx.fillStyle = col1;
    ctx.beginPath();
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + 20);
    ctx.arc(x + w / 2, y + 20, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.fill();
    // lattice
    ctx.strokeStyle = 'rgba(50,25,10,0.9)'; ctx.lineWidth = 2;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * w / 4, y + 4); ctx.lineTo(x + k * w / 4, y + h); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x, y + 45); ctx.lineTo(x + w, y + 45); ctx.stroke();
    if (lit) {
      const g = ectx.createRadialGradient(x + w / 2, y + 50, 4, x + w / 2, y + 50, 45);
      g.addColorStop(0, '#ffcf7a'); g.addColorStop(1, '#b0500f');
      ectx.fillStyle = g;
      ectx.beginPath();
      ectx.moveTo(x, y + h); ectx.lineTo(x, y + 20);
      ectx.arc(x + w / 2, y + 20, w / 2, Math.PI, 0); ectx.lineTo(x + w, y + h); ectx.fill();
      ectx.strokeStyle = '#000'; ectx.lineWidth = 2;
      for (let k = 1; k < 4; k++) { ectx.beginPath(); ectx.moveTo(x + k * w / 4, y + 4); ectx.lineTo(x + k * w / 4, y + h); ectx.stroke(); }
    }
  }
  return [finish(c), finish(e)];
}

export function rangoliTexture(seed = 3) {
  const [c, ctx] = canvas(512);
  const r = rand(seed);
  ctx.clearRect(0, 0, 512, 512);
  const cx = 256, cy = 256;
  const palettes = [
    ['#e8112d', '#ff9f1c', '#ffd60a', '#2ec4b6', '#7b2cbf', '#ffffff'],
    ['#ff006e', '#fb5607', '#ffbe0b', '#3a86ff', '#8338ec', '#ffffff'],
  ];
  const pal = palettes[seed % palettes.length];
  const rings = 7;
  for (let i = rings; i > 0; i--) {
    const rad = (i / rings) * 245;
    const petals = 8 + (i % 3) * 4;
    ctx.fillStyle = pal[i % pal.length];
    for (let p = 0; p < petals; p++) {
      const a = (p / petals) * Math.PI * 2 + (i % 2) * Math.PI / petals;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(rad * 0.35, rad * 0.5, 0, rad);
      ctx.quadraticCurveTo(-rad * 0.35, rad * 0.5, 0, 0);
      ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = pal[(i + 2) % pal.length];
    ctx.beginPath(); ctx.arc(cx, cy, rad * 0.42, 0, Math.PI * 2); ctx.fill();
  }
  // dots ring
  ctx.fillStyle = '#fff';
  for (let p = 0; p < 48; p++) {
    const a = (p / 48) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 248, cy + Math.sin(a) * 248, 4, 0, Math.PI * 2); ctx.fill();
  }
  // powder grain
  const img = ctx.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] > 0) {
      const n = (r() - 0.5) * 50;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Tileable normal map for water built from integer-frequency sine waves
export function waterNormalTexture(size = 256) {
  const [c, ctx] = canvas(size);
  const r = rand(42);
  const waves = [];
  for (let i = 0; i < 28; i++) {
    const kx = Math.round((r() - 0.5) * 24), ky = Math.round((r() - 0.5) * 24);
    if (kx === 0 && ky === 0) continue;
    const amp = 1 / Math.sqrt(kx * kx + ky * ky);
    waves.push([kx, ky, amp, r() * Math.PI * 2]);
  }
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let dx = 0, dy = 0;
    for (const [kx, ky, a, ph] of waves) {
      const arg = (2 * Math.PI * (kx * x + ky * y)) / size + ph;
      const cs = Math.cos(arg) * a;
      dx += cs * kx; dy += cs * ky;
    }
    const n = new THREE.Vector3(-dx * 0.08, -dy * 0.08, 1).normalize();
    const i = (y * size + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255;
    img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
    img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function terracottaTexture() {
  const [c, ctx] = canvas(128);
  const r = rand(11);
  ctx.fillStyle = '#9c4a22'; ctx.fillRect(0, 0, 128, 128);
  blotches(ctx, 128, 128, r, 20, '60,20,5', 0.3, 20);
  speckle(ctx, 128, 128, r, 1500, 0.3);
  ctx.strokeStyle = 'rgba(255,200,120,0.25)';
  for (let y = 10; y < 128; y += 18) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y + 2); ctx.stroke(); }
  return finish(c);
}

export function glowSpriteTexture() {
  const [c, ctx] = canvas(64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
