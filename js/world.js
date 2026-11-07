// Ayodhya environment: Sarayu river, Ram ki Paidi ghats, havelis, temple street, Ram Mandir
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';

export const STEP_DEPTH = 1.2;
export const STEP_RISE = 0.45;
export const NSTEPS = 8;
export const GHAT_HALF = 110;
export const TOP_Y = STEP_RISE * NSTEPS; // 3.6
export const PROM_Z1 = 20;
export const MANDIR_Y = TOP_Y + 2.0;
export const MANDIR = { x0: -34, x1: 34, z0: 86, z1: 146, bx0: -14, bx1: 14, bz0: 98, bz1: 134 };

function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- geometry builder that merges everything per material ----------
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

function worldUV(geo, scale) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (az >= ax) { u = p.getX(i); v = p.getY(i); }
    else { u = p.getZ(i); v = p.getY(i); }
    uv[i * 2] = u / scale; uv[i * 2 + 1] = v / scale;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

class Builder {
  constructor() { this.buckets = {}; this.uvScale = {}; }
  add(key, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    _e.set(rx, ry, rz); _q.setFromEuler(_e); _s.set(sx, sy, sz); _p.set(x, y, z);
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);
    worldUV(g, this.uvScale[key] || 4);
    (this.buckets[key] ||= []).push(g);
  }
  // box with its bottom at y
  box(key, x, y, z, sx, sy, sz, ry = 0) { this.add(key, BOX, x, y + sy / 2, z, 0, ry, 0, sx, sy, sz); }
  cyl(key, x, y, z, r, h, seg = 10, rTop = r) {
    this.add(key, new THREE.CylinderGeometry(rTop, r, h, seg, 1), x, y + h / 2, z);
  }
  build(materials, parent, mirrorHidden) {
    const meshes = {};
    for (const [key, list] of Object.entries(this.buckets)) {
      const geo = mergeGeometries(list, false);
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, materials[key]);
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      meshes[key] = mesh;
    }
    return meshes;
  }
}
const BOX = new THREE.BoxGeometry(1, 1, 1);

// ---------- architectural pieces ----------
function shikhara(b, key, x, y, z, baseW, height, levels = 14, goldKey = 'gold', flags) {
  const h = height / levels;
  let w = baseW;
  for (let i = 0; i < levels; i++) {
    const t = i / levels;
    w = baseW * (1 - 0.7 * Math.pow(t, 1.4));
    const yy = y + i * h;
    b.box(key, x, yy, z, w, h * 1.01, w);
    b.box(key, x, yy, z, w * 0.42, h * 1.01, w * 1.12);
    b.box(key, x, yy, z, w * 1.12, h * 1.01, w * 0.42);
    if (i % 2 === 0) b.box(key, x, yy + h * 0.85, z, w * 1.06, h * 0.18, w * 1.06);
  }
  const top = y + height;
  const ar = w * 0.62;
  b.add(key, new THREE.CylinderGeometry(ar, ar, ar * 0.45, 20), x, top + ar * 0.22, z);
  b.add(key, new THREE.CylinderGeometry(ar * 0.4, ar * 0.9, ar * 0.25, 16), x, top - ar * 0.05, z);
  b.add(goldKey, new THREE.SphereGeometry(ar * 0.35, 12, 8), x, top + ar * 0.75, z, 0, 0, 0, 1, 1.25, 1);
  b.add(goldKey, new THREE.ConeGeometry(ar * 0.12, ar * 0.8, 8), x, top + ar * 1.35, z);
  if (flags) flags.push(new THREE.Vector3(x, top + ar * 1.2, z));
  return top + ar * 1.6;
}

function pyramidRoof(b, key, x, y, z, w, d, levels, goldKey = 'gold') {
  let yy = y;
  for (let i = 0; i < levels; i++) {
    const s = 1 - i / (levels + 1);
    b.box(key, x, yy, z, w * s, 0.55, d * s);
    yy += 0.55;
  }
  b.add(key, new THREE.SphereGeometry(w * 0.16, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), x, yy, z);
  b.add(goldKey, new THREE.SphereGeometry(w * 0.05, 8, 6), x, yy + w * 0.17, z, 0, 0, 0, 1, 1.4, 1);
  return yy;
}

function chhatri(b, x, y, z, s = 1, key = 'dome', pillarKey = 'sandstone') {
  const hw = 1.3 * s;
  b.box(pillarKey, x, y, z, hw * 2.3, 0.3 * s, hw * 2.3);
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    b.cyl(pillarKey, x + px * hw, y + 0.3 * s, z + pz * hw, 0.13 * s, 2.4 * s, 8);
  }
  b.box(pillarKey, x, y + 2.7 * s, z, hw * 2.6, 0.25 * s, hw * 2.6);
  b.add(key, new THREE.SphereGeometry(hw * 1.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), x, y + 2.95 * s, z, 0, 0, 0, 1, 1.15, 1);
  b.add('gold', new THREE.SphereGeometry(0.14 * s, 8, 6), x, y + 2.95 * s + hw * 1.2, z, 0, 0, 0, 1, 1.5, 1);
}

// ---------- decor point-lights shader (string lights, distant lamps) ----------
function makeDecorPoints(pts) {
  const n = pts.length;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n), mode = new Float32Array(n);
  pts.forEach((p, i) => {
    pos.set([p.x, p.y, p.z], i * 3);
    col.set([p.c.r, p.c.g, p.c.b], i * 3);
    size[i] = p.s; ph[i] = p.ph; mode[i] = p.m;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('aMode', new THREE.BufferAttribute(mode, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixel: { value: 1 } },
    vertexShader: /* glsl */`
      attribute vec3 color; attribute float aSize; attribute float aPhase; attribute float aMode;
      uniform float uTime; uniform float uPixel;
      varying vec3 vColor; varying float vI;
      vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_Position = projectionMatrix * mv;
        float tw;
        vColor = color;
        if (aMode < 0.5) tw = 0.85 + 0.15*sin(uTime*2.5 + aPhase*30.0);
        else if (aMode < 1.5) tw = 0.2 + 0.8*step(0.55, fract(aPhase*0.33 - uTime*0.9));
        else { vColor = hue(fract(aPhase*0.05 + uTime*0.15)) * 1.2 + 0.1; tw = 0.6 + 0.4*sin(uTime*4.0+aPhase); }
        vI = tw;
        gl_PointSize = clamp(aSize * uPixel * (260.0 / -mv.z), 1.5, 48.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor; varying float vI;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a = a*a*1.4 + smoothstep(0.18,0.0,d)*1.6;
        gl_FragColor = vec4(vColor * vI * a * 2.4, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  return p;
}

function catenary(a, b, sag, n, out) {
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push(new THREE.Vector3(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t),
      a.z + (b.z - a.z) * t));
  }
  return out;
}

// ======================================================================
export function buildWorld(scene, quality) {
  const rnd = mulberry(2026);
  const tex = {
    sand: TX.sandstoneTexture(1, '#c79e74'),
    sandPlain: TX.sandstoneTexture(5, '#cfa67c', false),
    pink: TX.sandstoneTexture(9, '#d79a86', true),
    paving: TX.pavingTexture(7),
    terracotta: TX.terracottaTexture(),
  };
  const facadeColors = ['#d9a441', '#e7c58a', '#d77a4e', '#e9dcc4', '#e3a8a0', '#f0c96a'];
  const materials = {
    sandstone: new THREE.MeshStandardMaterial({ map: tex.sand, roughness: 0.92, color: 0xd8c0a0 }),
    stoneplain: new THREE.MeshStandardMaterial({ map: tex.sandPlain, roughness: 0.9 }),
    paving: new THREE.MeshStandardMaterial({ map: tex.paving, roughness: 0.85 }),
    pink: new THREE.MeshStandardMaterial({ map: tex.pink, roughness: 0.75, color: 0xffd6c8, emissive: 0x2a1006, emissiveIntensity: 1 }),
    dome: new THREE.MeshStandardMaterial({ color: 0xf4ead8, roughness: 0.6 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffc34d, metalness: 1, roughness: 0.25, emissive: 0x5a3000, emissiveIntensity: 0.6 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x4a2a16, roughness: 0.8 }),
    land: new THREE.MeshStandardMaterial({ color: 0x0b0d0a, roughness: 1 }),
    tree: new THREE.MeshStandardMaterial({ color: 0x14240f, roughness: 1 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x2b1d12, roughness: 1 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0xa8201a, roughness: 0.9 }),
  };
  const facadeKeys = [];
  facadeColors.forEach((c, i) => {
    const [map, em] = TX.windowFacadeTexture(100 + i, c);
    materials['facade' + i] = new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.9 });
    facadeKeys.push('facade' + i);
  });

  const b = new Builder();
  b.uvScale = { sandstone: 4, stoneplain: 4, paving: 4, pink: 5, dome: 3, gold: 1, wood: 2, land: 20, tree: 4, trunk: 2, cloth: 2 };
  facadeKeys.forEach(k => (b.uvScale[k] = 8));

  const decor = [];
  const colorWarm = new THREE.Color(1.0, 0.62, 0.22);
  const colorWhite = new THREE.Color(1.0, 0.85, 0.6);
  const lightString = (a, bb, n, color, mode = 1, size = 0.6, sag = 0.3) => {
    const pts = catenary(a, bb, sag, n, []);
    pts.forEach((p, i) => decor.push({ x: p.x, y: p.y, z: p.z, c: color === 'rainbow' ? colorWhite : color, s: size, ph: i, m: color === 'rainbow' ? 2 : mode }));
  };
  const flags = [];
  const colliders = [];
  const lanterns = [];
  const garlands = [];

  // ---- Ghat steps (Ram ki Paidi) ----
  for (let i = 0; i < NSTEPS; i++) {
    const top = (i + 1) * STEP_RISE;
    b.box('sandstone', 0, -2.5, i * STEP_DEPTH + STEP_DEPTH / 2, GHAT_HALF * 2, top + 2.5, STEP_DEPTH);
  }
  // embankment walls on both sides
  for (const sx of [-1, 1]) {
    b.box('sandstone', sx * (GHAT_HALF + 145), -2.5, 4.8, 290, TOP_Y + 2.5, 9.6);
    // bastion towers at the ends of the ghats
    b.box('sandstone', sx * (GHAT_HALF + 3), -2.5, 3, 6, TOP_Y + 4.5, 6);
    chhatri(b, sx * (GHAT_HALF + 3), TOP_Y + 2, 3, 1.1);
    colliders.push({ x0: sx * (GHAT_HALF + 3) - 3, x1: sx * (GHAT_HALF + 3) + 3, z0: 0, z1: 6 });
  }
  // Plateau / promenade / city ground
  b.box('paving', 0, -2.5, 9.6 + 145, 900, TOP_Y + 2.5, 290);
  // promenade edge kerb
  b.box('stoneplain', 0, TOP_Y, 9.75, GHAT_HALF * 2, 0.18, 0.3);

  // Promenade chhatris
  const chhatriXs = [-95, -70, -45, 45, 70, 95];
  for (const x of chhatriXs) {
    chhatri(b, x, TOP_Y, 13, 1);
    colliders.push({ x0: x - 1.6, x1: x + 1.6, z0: 11.4, z1: 14.6 });
    // lights around dome
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      decor.push({ x: x + Math.cos(a) * 1.55, y: TOP_Y + 3.2, z: 13 + Math.sin(a) * 1.55, c: colorWarm, s: 0.7, ph: k, m: 1 });
    }
  }

  // Lamp posts along promenade (old style, warm)
  for (let x = -105; x <= 105; x += 15) {
    if (Math.abs(x) < 8) continue;
    b.cyl('wood', x, TOP_Y, 18.5, 0.08, 4, 6);
    b.box('wood', x, TOP_Y + 4, 18.5, 0.25, 0.4, 0.25);
    decor.push({ x, y: TOP_Y + 4.25, z: 18.5, c: new THREE.Color(1, 0.75, 0.4), s: 2.2, ph: x, m: 0 });
  }

  // ---- Havelis & temples behind promenade ----
  const rowZ = 22;
  let x = -150;
  let bi = 0;
  while (x < 150) {
    const w = 8 + rnd() * 7;
    const cx = x + w / 2;
    x += w + 0.4;
    if (Math.abs(cx) < 8 + w / 2) continue; // temple street gap
    bi++;
    const h = 7 + rnd() * 8;
    const d = 9 + rnd() * 4;
    const fk = facadeKeys[(rnd() * facadeKeys.length) | 0];
    b.box(fk, cx, TOP_Y, rowZ + d / 2, w, h, d);
    // plinth & cornice
    b.box('stoneplain', cx, TOP_Y, rowZ + d / 2 - 0.1, w + 0.3, 0.6, d + 0.3);
    b.box('stoneplain', cx, TOP_Y + h, rowZ + d / 2, w + 0.5, 0.35, d + 0.5);
    // parapet
    b.box('stoneplain', cx, TOP_Y + h + 0.35, rowZ - 0.05, w + 0.5, 0.7, 0.25);
    // balcony jharokha
    if (rnd() < 0.7) {
      b.box('stoneplain', cx, TOP_Y + h * 0.48, rowZ - 0.7, w * 0.5, 0.25, 1.4);
      b.box(fk, cx, TOP_Y + h * 0.48 + 0.25, rowZ - 1.3, w * 0.5, 0.9, 0.12);
      b.add('dome', new THREE.SphereGeometry(w * 0.13, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), cx, TOP_Y + h * 0.48 + 2.6, rowZ - 0.6, 0, 0, 0, 1.6, 0.8, 0.9);
    }
    const isTemple = bi % 5 === 2;
    if (isTemple) {
      shikhara(b, 'stoneplain', cx, TOP_Y + h + 0.3, rowZ + d / 2, Math.min(w, d) * 0.7, 9 + rnd() * 5, 10, 'gold', flags);
    } else if (rnd() < 0.55) {
      chhatri(b, cx - w * 0.3, TOP_Y + h + 0.35, rowZ + 2, 0.6);
      if (w > 10) chhatri(b, cx + w * 0.3, TOP_Y + h + 0.35, rowZ + 2, 0.6);
    }
    // string lights on cornice + vertical drops (jhalar)
    const colorMode = rnd();
    const c = colorMode < 0.35 ? 'rainbow' : colorMode < 0.7 ? colorWarm : colorWhite;
    lightString(new THREE.Vector3(cx - w / 2, TOP_Y + h + 0.1, rowZ - 0.3), new THREE.Vector3(cx + w / 2, TOP_Y + h + 0.1, rowZ - 0.3), Math.round(w * 2.5), c, 1, 0.55, 0.0);
    for (let k = 0; k <= Math.round(w / 1.2); k++) {
      const xx = cx - w / 2 + k * 1.2;
      const len = 2 + ((k * 7) % 5) * 0.5;
      for (let j = 0; j < len * 3; j++) decor.push({ x: xx, y: TOP_Y + h - j / 3, z: rowZ - 0.3, c: c === 'rainbow' ? colorWhite : c, s: 0.45, ph: j + k * 3, m: c === 'rainbow' ? 2 : 1 });
    }
    // hanging akash kandil lanterns
    lanterns.push({ x: cx - w * 0.25, y: TOP_Y + h * 0.3 + 1.2, z: rowZ - 0.9 });
    if (w > 11) lanterns.push({ x: cx + w * 0.25, y: TOP_Y + h * 0.3 + 1.2, z: rowZ - 0.9 });
    // marigold toran over doorway
    garlands.push([new THREE.Vector3(cx - 1.4, TOP_Y + 3, rowZ - 0.1), new THREE.Vector3(cx + 1.4, TOP_Y + 3, rowZ - 0.1), 0.5]);
    // doorway
    b.box('wood', cx, TOP_Y, rowZ - 0.02, 2.2, 2.8, 0.1);
    colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: rowZ - 1.5, z1: rowZ + d });
  }

  // ---- Temple Street (towards Ram Mandir) ----
  for (const side of [-1, 1]) {
    let z = 34;
    while (z < 80) {
      const d = 7 + rnd() * 5;
      const h = 6 + rnd() * 6;
      const cz = z + d / 2;
      const fk = facadeKeys[(rnd() * facadeKeys.length) | 0];
      const cx = side * (7 + 5);
      b.box(fk, cx, TOP_Y, cz, 10, h, d);
      b.box('stoneplain', cx, TOP_Y + h, cz, 10.4, 0.35, d + 0.3);
      // shop awning
      b.add('cloth', BOX, side * 6.4, TOP_Y + 3, cz, 0, 0, side * 0.35, 1.6, 0.08, d * 0.9);
      const c = rnd() < 0.5 ? 'rainbow' : colorWarm;
      lightString(new THREE.Vector3(side * 7, TOP_Y + h, z), new THREE.Vector3(side * 7, TOP_Y + h, z + d), Math.round(d * 2.5), c, 1, 0.55, 0);
      lanterns.push({ x: side * 6.6, y: TOP_Y + 4.6, z: cz });
      z += d + 0.3;
    }
    colliders.push({ x0: side < 0 ? -40 : 6.8, x1: side < 0 ? -6.8 : 40, z0: 33.8, z1: 80 });
  }
  // light canopies across the street
  for (let z = 36; z < 80; z += 4) {
    lightString(new THREE.Vector3(-7, TOP_Y + 6.5, z), new THREE.Vector3(7, TOP_Y + 6.5, z), 26, z % 8 === 0 ? 'rainbow' : colorWarm, 1, 0.5, 1.2);
  }
  // Grand torana gate at street entrance
  for (const sx of [-1, 1]) {
    b.box('pink', sx * 6.2, TOP_Y, 31, 1.4, 9, 1.4);
    chhatri(b, sx * 6.2, TOP_Y + 9, 31, 0.5, 'pink', 'pink');
  }
  b.box('pink', 0, TOP_Y + 7.5, 31, 13.8, 1.4, 1.2);
  b.add('pink', new THREE.CylinderGeometry(2.4, 2.4, 1.0, 24, 1, false, 0, Math.PI), 0, TOP_Y + 8.9, 31, Math.PI / 2, 0, Math.PI / 2);
  lightString(new THREE.Vector3(-6.9, TOP_Y + 8.95, 30.3), new THREE.Vector3(6.9, TOP_Y + 8.95, 30.3), 50, colorWarm, 1, 0.6, 0);
  garlands.push([new THREE.Vector3(-5.5, TOP_Y + 7.4, 30.3), new THREE.Vector3(5.5, TOP_Y + 7.4, 30.3), 1.5]);
  colliders.push({ x0: -7, x1: -5.4, z0: 30.2, z1: 31.8 }, { x0: 5.4, x1: 7, z0: 30.2, z1: 31.8 });

  // ---- Ram Mandir ----
  const M = MANDIR;
  // raised platform + steps
  b.box('pink', 0, TOP_Y - 0.5, (M.z0 + M.z1) / 2, M.x1 - M.x0, MANDIR_Y - TOP_Y + 0.5, M.z1 - M.z0);
  for (let i = 0; i < 6; i++) {
    b.box('pink', 0, TOP_Y - 0.5, 80 + i, 22, 0.5 + (i + 1) * ((MANDIR_Y - TOP_Y) / 6), 1.02);
  }
  for (const sx of [-1, 1]) b.box('pink', sx * (11 + (M.x1 - 11) / 2), MANDIR_Y, M.z0 + 0.3, M.x1 - 11, 0.6, 0.5);
  // compound parapet (with gap at the front)
  for (const sx of [-1, 1]) {
    b.box('pink', sx * M.x1, MANDIR_Y, (M.z0 + M.z1) / 2, 0.6, 1.2, M.z1 - M.z0);
  }
  b.box('pink', 0, MANDIR_Y, M.z1, M.x1 - M.x0, 1.2, 0.6);
  // main temple
  const tY = MANDIR_Y;
  b.box('pink', 0, tY, 116, 30, 3, 40);         // jagati plinth
  for (let i = 0; i < 5; i++) b.box('pink', 0, tY, 93.3 + i * 0.6, 12, (i + 1) * 0.6, 0.62); // front steps
  const floors = 3;
  for (let f = 0; f < floors; f++) {
    const y0 = tY + 3 + f * 6;
    const sh = 1 - f * 0.06;
    b.box('pink', 0, y0, 117, 26 * sh, 6, 34 * sh);
    b.box('pink', 0, y0 + 5.6, 117, 27.5 * sh, 0.5, 35.5 * sh);   // cornice
    b.box('pink', 0, y0, 117, 27 * sh, 0.4, 35 * sh);
    // colonnade
    const hw = 13.6 * sh, hd = 17.6 * sh;
    for (let px = -hw; px <= hw + 0.01; px += hw / 6) {
      b.cyl('pink', px, y0 + 0.4, 117 - hd, 0.32, 5.2, 10);
      b.cyl('pink', px, y0 + 0.4, 117 + hd, 0.32, 5.2, 10);
    }
    for (let pz = -hd; pz <= hd + 0.01; pz += hd / 7) {
      b.cyl('pink', -hw, y0 + 0.4, 117 + pz, 0.32, 5.2, 10);
      b.cyl('pink', hw, y0 + 0.4, 117 + pz, 0.32, 5.2, 10);
    }
    // golden string lights outlining cornice
    const yy = y0 + 6.15;
    lightString(new THREE.Vector3(-hw - 0.2, yy, 117 - hd - 0.2), new THREE.Vector3(hw + 0.2, yy, 117 - hd - 0.2), 70, colorWhite, 0, 0.55, 0);
    lightString(new THREE.Vector3(-hw - 0.2, yy, 117 + hd + 0.2), new THREE.Vector3(hw + 0.2, yy, 117 + hd + 0.2), 70, colorWhite, 0, 0.55, 0);
    lightString(new THREE.Vector3(-hw - 0.2, yy, 117 - hd), new THREE.Vector3(-hw - 0.2, yy, 117 + hd), 90, colorWhite, 0, 0.55, 0);
    lightString(new THREE.Vector3(hw + 0.2, yy, 117 - hd), new THREE.Vector3(hw + 0.2, yy, 117 + hd), 90, colorWhite, 0, 0.55, 0);
  }
  const roofY = tY + 3 + floors * 6;
  // mandapa domes along the axis
  for (const [mz, s] of [[102, 0.7], [109, 0.85], [116, 1.0], [123, 0.8]]) {
    pyramidRoof(b, 'pink', 0, roofY, mz, 9 * s, 7 * s, 7);
    for (const sx of [-1, 1]) pyramidRoof(b, 'pink', sx * 8.5, roofY, mz, 5 * s, 5 * s, 5);
  }
  // main shikhara over garbhagriha + sub spires
  const shTop = shikhara(b, 'pink', 0, roofY, 129, 11, 24, 16, 'gold', flags);
  for (const [sx, sz] of [[-5.5, 125], [5.5, 125], [-5.5, 133], [5.5, 133]]) shikhara(b, 'pink', sx, roofY, sz, 4.5, 11, 9, 'gold');
  for (let i = 0; i < 60; i++) {
    const t = i / 60;
    const ww = 11 * (1 - 0.7 * Math.pow(t, 1.4)) * 0.56 + 0.35;
    for (const [dx, dz] of [[-1, -1], [1, -1]]) decor.push({ x: dx * ww, y: roofY + t * 24, z: 129 + dz * ww, c: colorWhite, s: 0.6, ph: i, m: 0 });
  }
  colliders.push({ x0: M.bx0 - 1, x1: M.bx1 + 1, z0: M.bz0 - 3, z1: M.bz1 + 3 });
  // corner chhatris on compound
  for (const [cx, cz] of [[-30, 90], [30, 90], [-30, 142], [30, 142]]) {
    chhatri(b, cx, MANDIR_Y, cz, 1.2, 'pink', 'pink');
    colliders.push({ x0: cx - 2, x1: cx + 2, z0: cz - 2, z1: cz + 2 });
  }

  // ---- Trees (peepal/neem silhouettes) with fairy lights ----
  const treeSpots = [[-120, 14], [120, 14], [-24, 40], [24, 40], [-40, 70], [40, 70], [-50, 100], [50, 100], [-50, 135], [50, 135]];
  for (const [tx, tz] of treeSpots) {
    const ty = Math.abs(tx) <= M.x1 && tz >= M.z0 ? MANDIR_Y : TOP_Y;
    b.cyl('trunk', tx, ty, tz, 0.5, 4, 8, 0.35);
    for (let k = 0; k < 7; k++) {
      const ox = (rnd() - 0.5) * 5, oz = (rnd() - 0.5) * 5, oy = 4 + rnd() * 3;
      b.add('tree', new THREE.IcosahedronGeometry(2 + rnd() * 1.4, 1), tx + ox, ty + oy, tz + oz);
      for (let j = 0; j < 14; j++) {
        const a = rnd() * Math.PI * 2, e = rnd() * Math.PI;
        const r = 2.4;
        decor.push({ x: tx + ox + Math.cos(a) * Math.sin(e) * r, y: ty + oy + Math.cos(e) * r, z: tz + oz + Math.sin(a) * Math.sin(e) * r, c: rnd() < 0.5 ? colorWhite : new THREE.Color(0.4, 0.7, 1), s: 0.4, ph: rnd() * 50, m: 0 });
      }
    }
    colliders.push({ x0: tx - 0.8, x1: tx + 0.8, z0: tz - 0.8, z1: tz + 0.8 });
  }

  // ---- Far shore of the Sarayu ----
  b.box('land', 0, -3, -200, 1600, 4.2, 70);
  for (let i = 0; i < 160; i++) {
    const fx = -700 + rnd() * 1400, fz = -172 - rnd() * 40;
    b.add('tree', new THREE.IcosahedronGeometry(3 + rnd() * 5, 0), fx, 2 + rnd() * 4, fz, 0, rnd() * 3, 0, 1, 0.8 + rnd() * 0.6, 1);
  }
  for (let i = 0; i < 700; i++) {
    const fx = -700 + rnd() * 1400;
    decor.push({ x: fx, y: 1.3 + rnd() * 4, z: -167 - rnd() * 25, c: rnd() < 0.8 ? colorWarm : new THREE.Color(1, 0.3, 0.6), s: 1.4 + rnd() * 1.2, ph: rnd() * 100, m: rnd() < 0.8 ? 0 : 2 });
  }
  // A long bridge (Sarayu setu) in the far east
  for (let i = 0; i < 18; i++) b.box('stoneplain', 260, -1, -20 - i * 9, 2, 7, 2);
  b.box('stoneplain', 260, 6, -96, 6, 1, 166);
  for (let i = 0; i < 80; i++) decor.push({ x: 257, y: 7.3, z: -14 - i * 2.1, c: colorWhite, s: 1.1, ph: i, m: 0 }, { x: 263, y: 7.3, z: -14 - i * 2.1, c: colorWhite, s: 1.1, ph: i + 0.5, m: 0 });

  // ---- assemble static architecture ----
  const arch = new THREE.Group();
  arch.name = 'architecture';
  b.build(materials, arch);
  scene.add(arch);

  // ---- Akash kandil lanterns (emissive) ----
  const lanternGroup = new THREE.Group();
  const lanternColors = [0xff3b30, 0xff9500, 0xff2d92, 0xffcc00, 0xaf52de, 0x34c759];
  const lgeo = new THREE.OctahedronGeometry(0.42, 0);
  const tailGeo = new THREE.ConeGeometry(0.18, 0.7, 6);
  lanterns.forEach((l, i) => {
    const col = new THREE.Color(lanternColors[i % lanternColors.length]).multiplyScalar(2.2);
    const m = new THREE.Mesh(lgeo, new THREE.MeshBasicMaterial({ color: col }));
    m.position.set(l.x, l.y, l.z);
    m.scale.set(1, 1.25, 1);
    const tail = new THREE.Mesh(tailGeo, m.material);
    tail.position.y = -0.75; tail.rotation.x = Math.PI;
    m.add(tail);
    m.userData.phase = i * 1.7;
    lanternGroup.add(m);
  });
  scene.add(lanternGroup);

  // ---- Marigold garlands (genda phool) ----
  const gPts = [];
  // promenade railing garlands
  for (let gx = -GHAT_HALF; gx < GHAT_HALF; gx += 4) {
    garlands.push([new THREE.Vector3(gx, TOP_Y + 1.1, 9.8), new THREE.Vector3(gx + 4, TOP_Y + 1.1, 9.8), 0.35]);
  }
  garlands.forEach(([a, c, sag]) => catenary(a, c, sag, Math.round(a.distanceTo(c) * 6), gPts));
  const marigold = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.085, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, emissive: 0x401000 }), gPts.length);
  const mm = new THREE.Matrix4();
  const mcol = new THREE.Color();
  gPts.forEach((p, i) => {
    mm.makeTranslation(p.x, p.y, p.z);
    marigold.setMatrixAt(i, mm);
    marigold.setColorAt(i, mcol.set(i % 7 < 4 ? 0xff8c00 : 0xffc300));
  });
  scene.add(marigold);
  // railing posts for garlands
  const railPosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 1.15, 6), materials.stoneplain, Math.ceil(GHAT_HALF * 2 / 4) + 1);
  let rp = 0;
  for (let gx = -GHAT_HALF; gx <= GHAT_HALF; gx += 4) { mm.makeTranslation(gx, TOP_Y + 0.57, 9.8); railPosts.setMatrixAt(rp++, mm); }
  railPosts.count = rp;
  scene.add(railPosts);

  // ---- Flags on spires ----
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xff7a00, side: THREE.DoubleSide, emissive: 0x803000, emissiveIntensity: 0.6 });
  const flagMeshes = flags.map((f, i) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(1.6, -0.5); shape.lineTo(0, -1.1); shape.lineTo(0, 0);
    const g = new THREE.ShapeGeometry(shape);
    const m = new THREE.Mesh(g, flagMat);
    const s = f.y > 40 ? 2.2 : 1;
    m.scale.setScalar(s);
    m.position.set(f.x, f.y + 1.3 * s, f.z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 1.6 * s, 4), materials.gold);
    pole.position.set(f.x, f.y + 0.6 * s, f.z);
    scene.add(pole);
    m.userData.phase = i;
    scene.add(m);
    return m;
  });

  // ---- Decor points (string lights etc.) ----
  const decorPoints = makeDecorPoints(decor);
  scene.add(decorPoints);

  // ---- Water: Sarayu ----
  const waterGeo = new THREE.PlaneGeometry(1800, 480);
  const reflRes = quality === 'high' ? 1024 : quality === 'medium' ? 512 : 256;
  const water = new Water(waterGeo, {
    textureWidth: reflRes, textureHeight: reflRes,
    waterNormals: TX.waterNormalTexture(256),
    sunDirection: new THREE.Vector3(0, 0.25, 1).normalize(),
    sunColor: 0xffa040,
    waterColor: 0x02080f,
    distortionScale: 2.2,
    fog: true,
  });
  // night: remove the constant grey ambient from the stock shader
  water.material.fragmentShader = water.material.fragmentShader.replace('vec3( 0.1 ) + reflectionSample * 0.9', 'vec3( 0.003 ) + reflectionSample * 0.95');
  water.material.uniforms.size.value = 3.0;
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.0, -236);
  scene.add(water);

  // ---- Sky dome + stars (Amavasya: moonless night) ----
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1400, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { uGlow: { value: 0 } },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; uniform float uGlow;
        void main(){
          float h = max(vP.y, 0.0);
          vec3 zen = vec3(0.002,0.004,0.014);
          vec3 hor = mix(vec3(0.025,0.02,0.045), vec3(0.07,0.035,0.03), uGlow);
          vec3 c = mix(hor, zen, pow(h, 0.3));
          // warm city glow toward the ghats/temple (+z)
          c += vec3(0.09,0.035,0.01) * uGlow * pow(1.0-h, 10.0) * smoothstep(-0.3, 1.0, vP.z);
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
  scene.add(sky);
  const starN = 3000;
  const sp = new Float32Array(starN * 3), sph = new Float32Array(starN), ssz = new Float32Array(starN);
  for (let i = 0; i < starN; i++) {
    const u = rnd(), v = rnd() * 0.9 + 0.08;
    const th = u * Math.PI * 2, ph = Math.acos(v);
    sp.set([Math.cos(th) * Math.sin(ph) * 1300, Math.cos(ph) * 1300, Math.sin(th) * Math.sin(ph) * 1300], i * 3);
    sph[i] = rnd() * 100; ssz[i] = Math.pow(rnd(), 6) * 3 + 0.8;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('aPhase', new THREE.BufferAttribute(sph, 1));
  sg.setAttribute('aSize', new THREE.BufferAttribute(ssz, 1));
  const stars = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixel: { value: 1 } },
    vertexShader: `attribute float aPhase; attribute float aSize; uniform float uTime; uniform float uPixel; varying float vA;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv;
        vA = (0.55+0.45*sin(uTime*1.7+aPhase)) * smoothstep(0.0, 0.25, normalize(position).y);
        gl_PointSize = aSize*uPixel; }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-0.5); gl_FragColor=vec4(vec3(0.75,0.82,1.0)*vA*smoothstep(0.5,0.0,d), 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  stars.frustumCulled = false;
  scene.add(stars);

  // ---- Boats on the river ----
  const boats = [];
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-3, 0); hullShape.quadraticCurveTo(0, -0.9, 3, 0); hullShape.lineTo(-3, 0);
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.6, 1.5), materials.wood);
    hull.position.y = 0.15;
    g.add(hull);
    for (const sx of [-1, 1]) {
      const prow = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 4), materials.wood);
      prow.rotation.z = sx * Math.PI / 2; prow.rotation.y = Math.PI / 4;
      prow.position.set(sx * 3.45, 0.2, 0); prow.scale.set(1, 1, 0.75);
      g.add(prow);
    }
    // canopy on some boats with lights
    if (i % 2 === 0) {
      const can = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.6), materials.cloth);
      can.position.y = 1.7; g.add(can);
      for (const [px, pz] of [[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.7], [1.1, 0.7]]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 4), materials.wood);
        p.position.set(px, 1.05, pz); g.add(p);
      }
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.6) }));
      bulb.position.y = 1.55; g.add(bulb);
    }
    g.position.set(-90 + i * 22 + rnd() * 6, 0, -8 - rnd() * 20);
    g.rotation.y = rnd() * 0.5 - 0.25;
    g.userData.phase = rnd() * 10;
    g.userData.drift = (rnd() - 0.5) * 0.4;
    scene.add(g);
    boats.push(g);
  }

  // ---- Lights ----
  const hemi = new THREE.HemisphereLight(0x23305a, 0x2a1a10, 0.55);
  scene.add(hemi);
  const diyaLight = new THREE.DirectionalLight(0xff9a40, 0.0); // collective glow of the diyas
  diyaLight.position.set(0, 2, -6);
  diyaLight.target.position.set(0, 4, 30);
  scene.add(diyaLight, diyaLight.target);
  const spots = [];
  for (const sx of [-1, 1]) {
    const s = new THREE.SpotLight(0xffd2a0, 900, 140, 0.45, 0.6, 1.6);
    s.position.set(sx * 30, MANDIR_Y + 2, 80);
    s.target.position.set(0, MANDIR_Y + 16, 118);
    scene.add(s, s.target);
    spots.push(s);
  }
  scene.fog = new THREE.FogExp2(0x0a0812, 0.0042);

  // ---- Walkable regions ----
  const walk = [
    { x0: -GHAT_HALF + 0.3, x1: GHAT_HALF - 0.3, z0: 0.35, z1: 20.5 }, // ghats + promenade
    { x0: -6.6, x1: 6.6, z0: 20, z1: 81 },                              // temple street
    { x0: -10.5, x1: 10.5, z0: 79, z1: 87 },                            // mandir stairs
    { x0: M.x0 + 0.8, x1: M.x1 - 0.8, z0: M.z0, z1: M.z1 - 0.8 },        // mandir prangan
  ];
  // world colliders built from havelis: allow walking on promenade in front of them only
  const heightAt = (x, z) => {
    if (z < NSTEPS * STEP_DEPTH && Math.abs(x) <= GHAT_HALF) {
      if (z < 0) return 0;
      return (Math.floor(z / STEP_DEPTH) + 1) * STEP_RISE;
    }
    if (z >= 80 && z < 86 && Math.abs(x) < 11) return TOP_Y + ((Math.min(5.999, z - 80) | 0) + 1) * ((MANDIR_Y - TOP_Y) / 6);
    if (z >= M.z0 && z <= M.z1 && x >= M.x0 && x <= M.x1) return MANDIR_Y;
    return TOP_Y;
  };
  const isFree = (x, z, r = 0.3) => {
    let inWalk = false;
    for (const w of walk) if (x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1) { inWalk = true; break; }
    if (!inWalk) return false;
    for (const c of colliders) if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return false;
    return true;
  };

  const tmpWind = new THREE.Vector3();
  function update(t, dt, litFrac) {
    decorPoints.material.uniforms.uTime.value = t;
    stars.material.uniforms.uTime.value = t;
    water.material.uniforms.time.value = t * 0.35;
    sky.material.uniforms.uGlow.value = 0.25 + 0.75 * litFrac;
    diyaLight.intensity = 0.15 + litFrac * 1.4;
    hemi.intensity = 0.45 + litFrac * 0.35;
    lanternGroup.children.forEach(l => {
      l.rotation.y = t * 0.5 + l.userData.phase;
      l.rotation.z = Math.sin(t * 1.3 + l.userData.phase) * 0.08;
    });
    flagMeshes.forEach(f => { f.rotation.y = Math.sin(t * 1.4 + f.userData.phase) * 0.35; f.scale.x = f.scale.y * (0.85 + 0.15 * Math.sin(t * 5 + f.userData.phase)); });
    boats.forEach(bt => {
      bt.position.y = Math.sin(t * 0.9 + bt.userData.phase) * 0.08;
      bt.rotation.z = Math.sin(t * 0.7 + bt.userData.phase) * 0.03;
      bt.position.x += bt.userData.drift * dt;
      if (bt.position.x > 130) bt.position.x = -130;
      if (bt.position.x < -130) bt.position.x = 130;
    });
  }

  return {
    water, heightAt, isFree, update, colliders, materials, decorPoints, stars,
    mirrorHidden: [marigold, railPosts, lanternGroup],
    setPixelRatio(pr) { decorPoints.material.uniforms.uPixel.value = pr; stars.material.uniforms.uPixel.value = pr; },
  };
}
