// The heart of Deepotsav: thousands of clay diyas, instanced, each with its own flame & oil
import * as THREE from 'three';
import { STEP_DEPTH, STEP_RISE, NSTEPS, GHAT_HALF, TOP_Y, MANDIR, MANDIR_Y } from './world.js';
import { terracottaTexture } from './textures.js';

export const ZONES = [
  { name: 'Ram ki Paidi', hindi: 'राम की पैड़ी', cost: 0, center: [0, 5] },
  { name: 'Naya Ghat (East)', hindi: 'नया घाट', cost: 1500, center: [66, 5] },
  { name: 'Lakshman Ghat (West)', hindi: 'लक्ष्मण घाट', cost: 6000, center: [-66, 5] },
  { name: 'Hanuman Garhi Marg', hindi: 'हनुमान गढ़ी मार्ग', cost: 25000, center: [0, 50] },
  { name: 'Deep Mala Promenade', hindi: 'दीप माला', cost: 90000, center: [-40, 15] },
  { name: 'Shri Ram Janmabhoomi Prangan', hindi: 'श्री राम जन्मभूमि', cost: 350000, center: [0, 110] },
];

const SPACING = 0.6;

function generatePositions(isFree) {
  const out = [];
  const push = (x, y, z, zone) => { if (isFree(x, z, 0.05)) out.push([x, y, z, zone]); };
  // ghat steps: two rows per step
  for (let i = 0; i < NSTEPS; i++) {
    const y = (i + 1) * STEP_RISE;
    for (const dz of [0.3, 0.86]) {
      const z = i * STEP_DEPTH + dz;
      const off = dz > 0.5 ? SPACING / 2 : 0;
      for (let x = -GHAT_HALF + 1 + off; x <= GHAT_HALF - 1; x += SPACING) {
        const zone = Math.abs(x) <= 24 ? 0 : x > 0 ? 1 : 2;
        push(x, y, z, zone);
      }
    }
  }
  // Temple street edges + mandalas
  for (let z = 21; z <= 79; z += SPACING) {
    for (const x of [-6.0, -5.4, 5.4, 6.0]) push(x, TOP_Y, z, 3);
  }
  for (const cz of [40, 52, 64, 74]) {
    for (const [r, n] of [[2.6, 32], [1.8, 22], [1.0, 12]]) {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        push(Math.cos(a) * r, TOP_Y, cz + Math.sin(a) * r, 3);
      }
    }
  }
  // Promenade rows
  for (const z of [10.35, 10.95, 19.3, 19.9]) {
    for (let x = -GHAT_HALF + 1; x <= GHAT_HALF - 1; x += SPACING) push(x, TOP_Y, z, 4);
  }
  // Ram Mandir prangan: front plaza with lotus-pattern + side & back lanes
  for (let z = MANDIR.z0 + 1.0; z <= 92.4; z += SPACING) {
    for (let x = MANDIR.x0 + 1.2; x <= MANDIR.x1 - 1.2; x += SPACING) {
      const dx = x / 30, dz = (z - 89) / 3;
      const ang = Math.atan2(dz, dx);
      const petal = Math.abs(Math.cos(ang * 4));
      if ((Math.hypot(dx * 1.2, dz * 0.4) < 0.25 + 0.75 * petal) || Math.abs(x) > 24) push(x, MANDIR_Y, z, 5);
    }
  }
  for (const sx of [-1, 1]) {
    for (let z = 93; z <= MANDIR.z1 - 1.5; z += 0.9) {
      for (let x = 17; x <= MANDIR.x1 - 1.2; x += 0.9) push(sx * x, MANDIR_Y, z, 5);
    }
  }
  for (let z = 138.5; z <= MANDIR.z1 - 1.5; z += 0.9) {
    for (let x = -16.2; x <= 16.2; x += 0.9) push(x, MANDIR_Y, z, 5);
  }
  // sort by zone so each zone is a contiguous range
  out.sort((a, b) => a[3] - b[3]);
  return out;
}

export const FLAME_VS = /* glsl */`
  attribute vec3 aOffset; attribute float aLit; attribute float aPhase;
  uniform float uTime; uniform vec3 uWind; uniform float uSize;
  varying vec2 vUv; varying float vLit;
  void main(){
    vLit = aLit; vUv = uv;
    float fl = 0.9 + 0.1*sin(uTime*11.0 + aPhase*40.0) + 0.06*sin(uTime*29.0 + aPhase*13.0);
    float s = uSize * min(aLit, 1.5);
    vec4 mv = modelViewMatrix * vec4(aOffset, 1.0);
    vec2 q = position.xy;
    float yy = q.y*1.6 - 0.3;
    vec3 lean = (viewMatrix * vec4(uWind, 0.0)).xyz;
    float k = max(yy, 0.0);
    mv.xy += vec2(q.x*1.2*s, yy*s*fl) + lean.xy * k*k * s * (1.0 + 0.4*sin(uTime*7.0+aPhase*9.0));
    gl_Position = projectionMatrix * mv;
  }`;
export const FLAME_FS = /* glsl */`
  varying vec2 vUv; varying float vLit;
  void main(){
    float fx = (vUv.x - 0.5) * 1.2;
    float fy = vUv.y * 1.6 - 0.3;
    float w = 0.36 * sqrt(max(fy, 0.0)) * pow(max(1.0 - fy, 0.0), 0.85);
    float d = w > 0.0 ? abs(fx) / w : 10.0;
    float body = 1.0 - smoothstep(0.35, 1.0, d);
    float inner = (1.0 - smoothstep(0.0, 0.7, d)) * (1.0 - smoothstep(0.15, 0.65, fy));
    float base = (1.0 - smoothstep(0.0, 0.12, fy)) * body;
    float r = length(vec2(fx, (fy - 0.3) * 0.75));
    float halo = exp(-r*r*20.0) * 0.55 + exp(-r*5.0) * 0.12;
    vec3 orange = vec3(1.0, 0.38, 0.06);
    vec3 yellow = vec3(1.0, 0.85, 0.45);
    vec3 col = mix(orange, yellow, inner) * body * 3.2;
    col = mix(col, vec3(0.35, 0.45, 1.0) * 1.5, base * 0.5);
    col += vec3(1.0, 0.5, 0.15) * halo * 1.6;
    float vis = clamp(vLit, 0.0, 1.5);
    gl_FragColor = vec4(col * vis, 1.0);
  }`;

const GLOW_VS = /* glsl */`
  attribute vec3 aOffset; attribute float aLit; attribute float aPhase;
  uniform float uTime; uniform float uRadius;
  varying vec2 vUv; varying float vI;
  void main(){
    vUv = uv;
    vI = clamp(aLit,0.0,1.0) * (0.85 + 0.15*sin(uTime*9.0 + aPhase*30.0));
    vec3 p = aOffset + vec3(position.x * uRadius * step(0.01, aLit), 0.012, position.y * uRadius * step(0.01, aLit));
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }`;
const GLOW_FS = /* glsl */`
  varying vec2 vUv; varying float vI;
  void main(){
    float r = length(vUv - 0.5) * 2.0;
    float a = pow(max(1.0 - r, 0.0), 2.4);
    gl_FragColor = vec4(vec3(1.0, 0.4, 0.09) * a * vI * 0.42, 1.0);
  }`;

export class DiyaSystem {
  constructor(scene, world) {
    const pts = generatePositions(world.isFree);
    const n = this.count = pts.length;
    this.pos = new Float32Array(n * 3);
    this.zone = new Uint8Array(n);
    this.lit = new Uint8Array(n);
    this.oil = new Float32Array(n);
    this.igniteT = new Float32Array(n);
    this.vis = new Float32Array(n);      // attribute: flame visual 0..1
    this.phase = new Float32Array(n);
    this.zoneStart = new Array(ZONES.length).fill(n);
    this.zoneEnd = new Array(ZONES.length).fill(0);
    pts.forEach(([x, y, z, zn], i) => {
      this.pos.set([x, y, z], i * 3);
      this.zone[i] = zn;
      this.phase[i] = Math.random();
      this.zoneStart[zn] = Math.min(this.zoneStart[zn], i);
      this.zoneEnd[zn] = Math.max(this.zoneEnd[zn], i + 1);
    });
    this.zoneCount = ZONES.map((_, z) => Math.max(0, this.zoneEnd[z] - this.zoneStart[z]));
    this.unlockedEnd = 0;
    this.litCount = 0;
    this.burnTime = 60;
    this.chainChance = 0;
    this.chainQueue = [];
    this.onLit = null;
    this.time = 0;
    this.wind = new THREE.Vector3();

    // spatial grid
    this.cell = 2;
    this.grid = new Map();
    for (let i = 0; i < n; i++) {
      const k = this.key(Math.floor(this.pos[i * 3] / this.cell), Math.floor(this.pos[i * 3 + 2] / this.cell));
      let a = this.grid.get(k);
      if (!a) this.grid.set(k, (a = []));
      a.push(i);
    }

    // --- clay bowls ---
    const prof = [
      [0.0, 0.0], [0.05, 0.0], [0.085, 0.018], [0.1, 0.045], [0.093, 0.05], [0.07, 0.03], [0.0, 0.026],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const bowlGeo = new THREE.LatheGeometry(prof, 10);
    const offsets = new THREE.InstancedBufferAttribute(this.pos, 3);
    const visAttr = new THREE.InstancedBufferAttribute(this.vis, 1);
    visAttr.setUsage(THREE.DynamicDrawUsage);
    const phaseAttr = new THREE.InstancedBufferAttribute(this.phase, 1);
    this.visAttr = visAttr;
    bowlGeo.setAttribute('aOffset', offsets);
    bowlGeo.setAttribute('aLit', visAttr);
    const bowlMat = new THREE.MeshStandardMaterial({ map: terracottaTexture(), roughness: 0.85 });
    bowlMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aOffset; attribute float aLit; varying float vLitB; varying float vUpB;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += aOffset; vLitB = aLit; vUpB = position.y;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vLitB; varying float vUpB;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0,0.35,0.08) * clamp(vLitB,0.0,1.0) * (0.12 + vUpB*7.0);');
    };
    // Use InstancedBufferGeometry so all instances share one draw call
    const ibg = new THREE.InstancedBufferGeometry().copy(bowlGeo);
    ibg.setAttribute('aOffset', offsets);
    ibg.setAttribute('aLit', visAttr);
    ibg.instanceCount = n;
    this.bowls = new THREE.Mesh(ibg, bowlMat);
    this.bowls.frustumCulled = false;
    scene.add(this.bowls);

    // --- flames ---
    const fg = new THREE.InstancedBufferGeometry();
    const plane = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    fg.index = plane.index;
    fg.setAttribute('position', plane.attributes.position);
    fg.setAttribute('uv', plane.attributes.uv);
    const flameOffsets = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) flameOffsets.set([this.pos[i * 3], this.pos[i * 3 + 1] + 0.045, this.pos[i * 3 + 2]], i * 3);
    fg.setAttribute('aOffset', new THREE.InstancedBufferAttribute(flameOffsets, 3));
    fg.setAttribute('aLit', visAttr);
    fg.setAttribute('aPhase', phaseAttr);
    fg.instanceCount = 0;
    this.flameUniforms = { uTime: { value: 0 }, uWind: { value: this.wind }, uSize: { value: 0.16 } };
    this.flames = new THREE.Mesh(fg, new THREE.ShaderMaterial({
      uniforms: this.flameUniforms, vertexShader: FLAME_VS, fragmentShader: FLAME_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.flames.frustumCulled = false;
    this.flames.renderOrder = 10;
    scene.add(this.flames);

    // --- warm light pools on the stone ---
    const gg = new THREE.InstancedBufferGeometry();
    gg.index = plane.index;
    const gp = new THREE.PlaneGeometry(1, 1);
    gg.index = gp.index;
    gg.setAttribute('position', gp.attributes.position);
    gg.setAttribute('uv', gp.attributes.uv);
    gg.setAttribute('aOffset', offsets);
    gg.setAttribute('aLit', visAttr);
    gg.setAttribute('aPhase', phaseAttr);
    gg.instanceCount = 0;
    this.glowUniforms = { uTime: this.flameUniforms.uTime, uRadius: { value: 1.3 } };
    this.glows = new THREE.Mesh(gg, new THREE.ShaderMaterial({
      uniforms: this.glowUniforms, vertexShader: GLOW_VS, fragmentShader: GLOW_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide,
    }));
    this.glows.frustumCulled = false;
    this.glows.renderOrder = 5;
    scene.add(this.glows);
  }

  key(ix, iz) { return (ix + 1000) * 4096 + (iz + 1000); }

  setUnlockedZones(k) {
    // zones are unlocked in order; k = number of unlocked zones
    this.unlockedZones = k;
    this.unlockedEnd = k > 0 ? this.zoneEnd[k - 1] : 0;
    this.flames.geometry.instanceCount = this.unlockedEnd;
    this.glows.geometry.instanceCount = this.unlockedEnd;
  }

  forEachNear(x, z, r, fn) {
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    const r2 = r * r;
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const a = this.grid.get(this.key(ix, iz));
      if (!a) continue;
      for (const i of a) {
        const dx = this.pos[i * 3] - x, dz = this.pos[i * 3 + 2] - z;
        const d2 = dx * dx + dz * dz;
        if (d2 <= r2) fn(i, d2);
      }
    }
  }

  // Find best diya to light near (x,z): unlit first, then those running low on oil
  findTarget(x, z, r, y = null) {
    let best = -1, bestScore = Infinity;
    const lowOil = this.burnTime * 0.3;
    this.forEachNear(x, z, r, (i, d2) => {
      if (i >= this.unlockedEnd) return;
      if (y !== null && Math.abs(this.pos[i * 3 + 1] - y) > 2.2) return;
      let score;
      if (!this.lit[i]) score = d2;
      else if (this.oil[i] < lowOil) score = d2 + 100 + this.oil[i];
      else return;
      if (score < bestScore) { bestScore = score; best = i; }
    });
    return best;
  }

  light(i, source, depth = 0) {
    const wasLit = this.lit[i];
    if (!wasLit) {
      this.lit[i] = 1;
      this.litCount++;
      this.igniteT[i] = this.time;
    }
    this.oil[i] = this.burnTime * (0.9 + Math.random() * 0.2);
    if (this.onLit) this.onLit(i, source, !wasLit);
    if (!wasLit && this.chainChance > 0 && depth < 6) {
      this.forEachNear(this.pos[i * 3], this.pos[i * 3 + 2], 0.75, (j) => {
        if (j < this.unlockedEnd && !this.lit[j] && Math.random() < this.chainChance * Math.pow(0.8, depth)) {
          this.chainQueue.push({ i: j, t: this.time + 0.12 + Math.random() * 0.15, depth: depth + 1 });
        }
      });
    }
  }

  extinguish(i) {
    if (!this.lit[i]) return false;
    this.lit[i] = 0;
    this.oil[i] = 0;
    this.litCount--;
    return true;
  }

  extinguishNear(x, z, r, chance = 1) {
    let c = 0;
    this.forEachNear(x, z, r, (i) => { if (this.lit[i] && Math.random() < chance && this.extinguish(i)) c++; });
    return c;
  }

  // wind gust sweeps a band of x; returns number blown out
  gust(xCenter, halfWidth, zMin, zMax, chance) {
    let c = 0;
    for (let i = 0; i < this.unlockedEnd; i++) {
      if (!this.lit[i]) continue;
      const x = this.pos[i * 3], z = this.pos[i * 3 + 2];
      if (Math.abs(x - xCenter) < halfWidth && z >= zMin && z <= zMax && Math.random() < chance) {
        if (this.extinguish(i)) c++;
      }
    }
    return c;
  }

  resetAll() {
    this.lit.fill(0); this.oil.fill(0); this.vis.fill(0);
    this.litCount = 0; this.chainQueue.length = 0;
    this.visAttr.needsUpdate = true;
  }

  unlitInZone(z) {
    let c = 0;
    for (let i = this.zoneStart[z]; i < this.zoneEnd[z]; i++) if (!this.lit[i]) c++;
    return c;
  }

  randomUnlit(tries = 30) {
    for (let k = 0; k < tries; k++) {
      const i = (Math.random() * this.unlockedEnd) | 0;
      if (!this.lit[i]) return i;
    }
    for (let k = 0; k < tries; k++) {
      const i = (Math.random() * this.unlockedEnd) | 0;
      if (this.oil[i] < this.burnTime * 0.3) return i;
    }
    return -1;
  }

  update(dt, t) {
    this.time = t;
    this.flameUniforms.uTime.value = t;
    // chain ignitions
    if (this.chainQueue.length) {
      const q = this.chainQueue;
      for (let k = q.length - 1; k >= 0; k--) {
        if (q[k].t <= t) {
          const { i, depth } = q[k];
          q.splice(k, 1);
          if (!this.lit[i]) this.light(i, 'chain', depth);
        }
      }
    }
    const lowOil = this.burnTime * 0.22;
    const vis = this.vis, oil = this.oil, lit = this.lit, ig = this.igniteT;
    for (let i = 0; i < this.unlockedEnd; i++) {
      if (lit[i]) {
        oil[i] -= dt;
        if (oil[i] <= 0) { lit[i] = 0; this.litCount--; }
        const grow = Math.min(1, (t - ig[i]) * 3.5);
        const fade = oil[i] < lowOil ? 0.45 + 0.55 * (oil[i] / lowOil) : 1;
        // fresh flames briefly flare up (>1 → halo pop)
        vis[i] = grow * fade * (1 + Math.max(0, 0.6 - (t - ig[i]) * 1.5));
      } else if (vis[i] > 0) {
        vis[i] = Math.max(0, vis[i] - dt * 2.5);
      }
    }
    this.visAttr.needsUpdate = true;
  }
}
