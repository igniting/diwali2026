// Visual effects: fireworks (aatishbazi), anar & chakri, floating diyas on the Sarayu,
// Pushpak Vimana, golden Lakshmi diya, wind gusts, marigold petal showers
import * as THREE from 'three';
import { FLAME_VS, FLAME_FS } from './diyas.js';
import { glowSpriteTexture } from './textures.js';
import { makeHandFlame } from './characters.js';

const PT_VS = /* glsl */`
  attribute vec3 color; attribute float aSize; attribute float aAlpha;
  uniform float uPixel;
  varying vec3 vColor; varying float vAlpha;
  void main(){
    vColor = color; vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aAlpha > 0.0 ? clamp(aSize * uPixel * (300.0 / -mv.z), 1.0, 64.0) : 0.0;
  }`;
const PT_FS_ADD = /* glsl */`
  varying vec3 vColor; varying float vAlpha;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a + smoothstep(0.15, 0.0, d);
    gl_FragColor = vec4(vColor * a * vAlpha * 2.5, 1.0);
  }`;
const PT_FS_NORM = /* glsl */`
  varying vec3 vColor; varying float vAlpha;
  void main(){
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c * vec2(1.0, 1.8));
    if (d > 0.5) discard;
    gl_FragColor = vec4(vColor * (0.7 + 0.3 * (0.5 - d)), vAlpha);
  }`;

class Particles {
  constructor(scene, max, additive = true) {
    this.max = max;
    this.p = new Float32Array(max * 3);
    this.v = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.flags = new Uint8Array(max);
    this.payload = new Array(max);
    this.free = [];
    for (let i = max - 1; i >= 0; i--) this.free.push(i);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = { uPixel: { value: 1 } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: PT_VS, fragmentShader: additive ? PT_FS_ADD : PT_FS_NORM,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
    scene.add(this.points);
    this.onDeath = null;
    this.time = 0;
  }
  emit(x, y, z, vx, vy, vz, life, r, g, b, size, drag = 0.5, grav = 9.8, flags = 0, payload = null) {
    const i = this.free.pop();
    if (i === undefined) return -1;
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
    this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
    this.size[i] = size; this.life[i] = this.maxLife[i] = life;
    this.drag[i] = drag; this.grav[i] = grav; this.flags[i] = flags; this.payload[i] = payload;
    this.alpha[i] = 1;
    return i;
  }
  update(dt) {
    this.time += dt;
    const { p, v, life, maxLife, drag, grav, flags, alpha } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      if (life[i] <= 0) {
        alpha[i] = 0;
        this.free.push(i);
        if (this.onDeath && (flags[i] & 12)) this.onDeath(i);
        continue;
      }
      const dk = Math.max(0, 1 - drag[i] * dt);
      v[i * 3] *= dk; v[i * 3 + 1] = v[i * 3 + 1] * dk - grav[i] * dt; v[i * 3 + 2] *= dk;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      const f = life[i] / maxLife[i];
      let a = Math.min(1, f * 2.2);
      if (flags[i] & 2) a *= (Math.sin(this.time * 40 + i) > 0.2 ? 1 : 0.05);
      if (flags[i] & 16) a = Math.min(1, f * 3); // petals
      alpha[i] = a;
      if ((flags[i] & 1) && Math.random() < 0.55) {
        this.emit(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6,
          0.35 + Math.random() * 0.45, 1.0, 0.6, 0.25, this.size[i] * 0.55, 2, 2, 0);
      }
      if (flags[i] & 16) { // fluttering petals
        v[i * 3] += Math.sin(this.time * 3 + i) * dt * 2;
        v[i * 3 + 2] += Math.cos(this.time * 2.3 + i * 1.3) * dt * 2;
      }
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
  }
}

const PALETTES = [
  [[1, 0.25, 0.15], [1, 0.8, 0.3]],
  [[0.3, 0.5, 1], [1, 1, 1]],
  [[0.3, 1, 0.4], [1, 0.9, 0.3]],
  [[1, 0.3, 0.8], [0.6, 0.3, 1]],
  [[1, 0.65, 0.2], [1, 0.85, 0.45]],
  [[0.2, 0.9, 1], [1, 0.3, 0.6]],
  [[1, 1, 1], [1, 0.8, 0.4]],
];
const TYPES = ['peony', 'chrysanthemum', 'ring', 'willow', 'strobe', 'palm', 'crossette', 'heart'];

export class Effects {
  constructor(scene, audio, camera) {
    this.scene = scene; this.audio = audio; this.camera = camera;
    this.sparks = new Particles(scene, 14000, true);
    this.petals = new Particles(scene, 2500, false);
    this.dust = new Particles(scene, 1500, true);
    this.sparks.onDeath = (i) => this._onDeath(i);
    this.fountains = [];
    this.flashes = [];
    for (let k = 0; k < 3; k++) {
      const l = new THREE.PointLight(0xffffff, 0, 260, 1.2);
      scene.add(l);
      this.flashes.push({ light: l, t: 0 });
    }
    this.fountainLight = new THREE.PointLight(0xffb060, 0, 30, 1.5);
    scene.add(this.fountainLight);
    this.time = 0;
    this._buildFloating(scene);
    this._buildVimana(scene);
    this._buildGolden(scene);
    this.windStrength = 0;
  }
  setPixelRatio(pr) { [this.sparks, this.petals, this.dust].forEach(p => (p.uniforms.uPixel.value = pr)); }

  // ------------------------------------------------ fireworks
  launch(x, z, y0 = 0.5, type = null, height = null) {
    type = type || TYPES[(Math.random() * TYPES.length) | 0];
    const pal = PALETTES[(Math.random() * PALETTES.length) | 0];
    const vy = height || 30 + Math.random() * 12;
    const life = vy / 9.8 * 0.85;
    this.sparks.emit(x, y0, z, (Math.random() - 0.5) * 3, vy, (Math.random() - 0.5) * 3, life, 1, 0.75, 0.4, 0.8, 0.05, 9.8, 1 | 8, { type, pal });
    this.audio?.whoosh(this._dist(x, y0, z));
  }
  _dist(x, y, z) { return this.camera.position.distanceTo(new THREE.Vector3(x, y, z)); }
  _onDeath(i) {
    const s = this.sparks;
    const pl = s.payload[i];
    if (!pl) return;
    const x = s.p[i * 3], y = s.p[i * 3 + 1], z = s.p[i * 3 + 2];
    if (pl.sub) { this._burst(x, y, z, 'mini', pl.pal); return; }
    this._burst(x, y, z, pl.type, pl.pal);
  }
  _burst(x, y, z, type, pal) {
    const s = this.sparks;
    const c1 = pal[0], c2 = pal[1];
    const rnd = () => Math.random();
    const dir = new THREE.Vector3();
    const flash = (int) => {
      const f = this.flashes.find(f => f.t <= 0) || this.flashes[0];
      f.light.position.set(x, y, z);
      f.light.color.setRGB(c1[0], c1[1], c1[2]);
      f.base = int; f.t = 1;
    };
    const dist = this._dist(x, y, z);
    if (type === 'mini') {
      for (let k = 0; k < 18; k++) {
        dir.randomDirection().multiplyScalar(5);
        s.emit(x, y, z, dir.x, dir.y, dir.z, 0.6 + rnd() * 0.3, c2[0], c2[1], c2[2], 0.8, 1.5, 3, 0);
      }
      return;
    }
    flash(type === 'willow' ? 9000 : 14000);
    this.audio?.boom(dist, type === 'strobe' || type === 'chrysanthemum');
    const n = type === 'willow' ? 140 : type === 'palm' ? 8 : 220;
    const speed = type === 'willow' ? 10 : 14;
    const axis = new THREE.Vector3().randomDirection();
    const tang = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0)).normalize();
    const bit = new THREE.Vector3().crossVectors(axis, tang);
    for (let k = 0; k < n; k++) {
      let col = rnd() < 0.7 ? c1 : c2;
      let life = 1.6 + rnd() * 0.7, drag = 1.3, grav = 4, flags = 0, size = 1.25, sp = speed * (0.85 + rnd() * 0.3);
      if (type === 'ring') {
        const a = (k / n) * Math.PI * 2;
        dir.copy(tang).multiplyScalar(Math.cos(a)).addScaledVector(bit, Math.sin(a));
      } else if (type === 'heart') {
        const a = (k / n) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(a), 3) / 16;
        const hy = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16;
        dir.set(hx, hy, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(this.camera.position.x - x, this.camera.position.z - z));
        col = [1, 0.2, 0.45]; grav = 1.5;
      } else {
        dir.randomDirection();
      }
      if (type === 'willow') { col = [1, 0.7, 0.3]; life = 3.2 + rnd(); drag = 1.6; grav = 2.5; flags = 1; size = 0.9; }
      if (type === 'chrysanthemum') { flags = 1; }
      if (type === 'strobe') { col = [1, 1, 1]; flags = 2; life = 2 + rnd(); size = 1.0; }
      if (type === 'palm') { flags = 1; life = 2.4; drag = 0.9; size = 2.2; sp = 16; grav = 5; col = [1, 0.75, 0.35]; }
      if (type === 'crossette') { flags = 4; life = 1.0 + rnd() * 0.3; }
      s.emit(x, y, z, dir.x * sp, dir.y * sp, dir.z * sp, life, col[0], col[1], col[2], size, drag, grav, flags,
        type === 'crossette' ? { sub: true, pal } : null);
    }
    // glitter core
    for (let k = 0; k < 40; k++) {
      dir.randomDirection().multiplyScalar(3 + rnd() * 3);
      s.emit(x, y, z, dir.x, dir.y, dir.z, 0.8 + rnd() * 0.6, 1, 0.95, 0.8, 0.7, 1.5, 1.5, 2);
    }
  }
  // ground fireworks: anar (fountain) & chakri (spinner)
  anar(x, y, z, dur = 7) { this.fountains.push({ kind: 'anar', x, y, z, t: 0, dur }); this.audio?.fountain(dur, this._dist(x, y, z)); }
  chakri(x, y, z, dur = 6) { this.fountains.push({ kind: 'chakri', x, y, z, t: 0, dur, a: 0 }); this.audio?.fountain(dur, this._dist(x, y, z)); }

  petalShower(cx, cy, cz, n = 600, spread = 30) {
    for (let k = 0; k < n; k++) {
      const orange = Math.random() < 0.6;
      this.petals.emit(cx + (Math.random() - 0.5) * spread, cy + Math.random() * 10, cz + (Math.random() - 0.5) * spread,
        0, -1 - Math.random(), 0, 9 + Math.random() * 5, orange ? 1 : 1, orange ? 0.45 : 0.78, orange ? 0.02 : 0.05, 0.9, 1.6, 0.6, 16);
    }
  }

  windStreaks(xCenter, zMin, zMax, dirX) {
    for (let k = 0; k < 220; k++) {
      const z = zMin + Math.random() * (zMax - zMin);
      this.dust.emit(xCenter - dirX * 25 + (Math.random() - 0.5) * 20, 0.6 + Math.random() * 4 + z * 0.3, z,
        dirX * (14 + Math.random() * 8), (Math.random() - 0.3) * 1.5, (Math.random() - 0.5) * 2,
        2 + Math.random() * 1.5, 0.12, 0.11, 0.1, 0.9, 0.1, -0.1, 0);
    }
  }

  // ------------------------------------------------ floating diyas (deep daan)
  _buildFloating(scene) {
    const N = this.floatMax = 260;
    this.floatData = [];
    const offs = new Float32Array(N * 3), vis = new Float32Array(N), ph = new Float32Array(N);
    for (let i = 0; i < N; i++) { ph[i] = Math.random(); this.floatData.push({ active: false }); }
    const g = new THREE.InstancedBufferGeometry();
    const plane = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    g.index = plane.index;
    g.setAttribute('position', plane.attributes.position);
    g.setAttribute('uv', plane.attributes.uv);
    this.floatOffsets = new THREE.InstancedBufferAttribute(offs, 3).setUsage(THREE.DynamicDrawUsage);
    this.floatVis = new THREE.InstancedBufferAttribute(vis, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aOffset', this.floatOffsets);
    g.setAttribute('aLit', this.floatVis);
    g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1));
    g.instanceCount = N;
    this.floatUniforms = { uTime: { value: 0 }, uWind: { value: new THREE.Vector3() }, uSize: { value: 0.22 } };
    const flames = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: this.floatUniforms, vertexShader: FLAME_VS, fragmentShader: FLAME_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    flames.frustumCulled = false;
    flames.renderOrder = 11;
    scene.add(flames);
    // leaf-boat (dona) with marigold rim
    const dona = new THREE.CylinderGeometry(0.18, 0.12, 0.07, 10);
    this.donas = new THREE.InstancedMesh(dona, new THREE.MeshStandardMaterial({ color: 0x2f5a1c, roughness: 0.8, emissive: 0x3a1500 }), N);
    this.donas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.donas.count = N;
    const m = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < N; i++) this.donas.setMatrixAt(i, m);
    this.donas.frustumCulled = false;
    scene.add(this.donas);
  }
  floatDiya(x, z) {
    const i = this.floatData.findIndex(f => !f.active);
    if (i < 0) return false;
    this.floatData[i] = { active: true, x, z, t: 0, vx: 0.25 + Math.random() * 0.2, vz: -0.6 - Math.random() * 0.3, ph: Math.random() * 6 };
    return true;
  }
  activeFloating() { return this.floatData.reduce((a, f) => a + (f.active ? 1 : 0), 0); }

  // ------------------------------------------------ Pushpak Vimana
  _buildVimana(scene) {
    const g = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ color: 0xffc34d, metalness: 1, roughness: 0.25, emissive: 0x7a4400, emissiveIntensity: 1.2 });
    const red = new THREE.MeshStandardMaterial({ color: 0xa3121a, roughness: 0.5, emissive: 0x300000 });
    const white = new THREE.MeshStandardMaterial({ color: 0xfff6e0, roughness: 0.4, emissive: 0x403020 });
    // hull
    const hull = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gold);
    hull.scale.set(1.9, 0.6, 1); g.add(hull);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.4, 24), red); deck.scale.set(1.8, 1, 0.95); g.add(deck);
    // swan/peacock prow
    const neck = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.35, 8, 16, Math.PI * 0.9), gold);
    neck.position.set(7.2, 1.2, 0); neck.rotation.z = -0.3; g.add(neck);
    const headM = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), gold); headM.position.set(8.4, 2.6, 0); g.add(headM);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4, 12, 1, true), gold);
    tail.position.set(-8, 2, 0); tail.rotation.z = -1.0; g.add(tail);
    // pavilion
    for (const [px, pz] of [[-3.5, -2.4], [3.5, -2.4], [-3.5, 2.4], [3.5, 2.4], [0, -2.6], [0, 2.6]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.4, 8), gold);
      p.position.set(px, 1.9, pz); g.add(p);
    }
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.6, 0.5, 8), red); roof.position.y = 3.8; roof.scale.set(1.3, 1, 0.9); g.add(roof);
    for (let i = 0; i < 4; i++) {
      const tier = new THREE.Mesh(new THREE.CylinderGeometry(2.6 - i * 0.55, 3.1 - i * 0.55, 0.9, 8), i % 2 ? red : gold);
      tier.position.y = 4.4 + i * 0.85; g.add(tier);
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 10), gold); dome.position.y = 7.8; dome.scale.y = 1.3; g.add(dome);
    const kalash = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.2, 8), gold); kalash.position.y = 9.2; g.add(kalash);
    // Shri Ram, Sita, Lakshman & Hanuman as silhouetted figures (with halos)
    const glowTex = glowSpriteTexture();
    const figColors = [0x2b4c9a, 0xc2185b, 0xf1c40f, 0xe65100];
    [-1.2, 0, 1.2, 2.6].forEach((fx, i) => {
      const fig = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 1.8, 10), new THREE.MeshStandardMaterial({ color: figColors[i], emissive: figColors[i], emissiveIntensity: 0.4 }));
      fig.position.set(fx, 1.1, 0); g.add(fig);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), white); head.position.set(fx, 2.2, 0); g.add(head);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 8), gold); crown.position.set(fx, 2.55, 0); g.add(crown);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.5, 1.8, 0.8), blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.position.set(fx, 2.3, 0.1); halo.scale.setScalar(1.6); g.add(halo);
    });
    // lamps all around the rim
    const lampGeo = new THREE.SphereGeometry(0.12, 6, 4);
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.6, 0.8) });
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const l = new THREE.Mesh(lampGeo, lampMat);
      l.position.set(Math.cos(a) * 7.4, 0.35, Math.sin(a) * 3.9); g.add(l);
    }
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.2, 0.7, 0.25), blending: THREE.AdditiveBlending, depthWrite: false }));
    aura.scale.set(40, 26, 1); aura.position.y = 3; g.add(aura);
    const light = new THREE.PointLight(0xffc070, 3000, 120, 1.4); light.position.y = -2; g.add(light);
    g.visible = false;
    g.scale.setScalar(1.8);
    scene.add(g);
    this.vimana = g;
    this.vimanaT = -1;
    this.vimanaPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-420, 120, -380), new THREE.Vector3(-200, 70, -120), new THREE.Vector3(-60, 34, -30),
      new THREE.Vector3(0, 30, 8), new THREE.Vector3(30, 40, 50), new THREE.Vector3(10, 62, 110), new THREE.Vector3(0, 75, 140),
    ]);
  }
  startVimana(dur = 18) { this.vimanaT = 0; this.vimanaDur = dur; this.vimana.visible = true; }
  vimanaActive() { return this.vimanaT >= 0; }

  // ------------------------------------------------ golden Lakshmi diya
  _buildGolden(scene) {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1, roughness: 0.2, emissive: 0xaa6600, emissiveIntensity: 1.5 }));
    bowl.position.y = 0.35; g.add(bowl);
    const flame = makeHandFlame(3.2); flame.position.y = 0.4; g.add(flame);
    const beamMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `varying vec2 vUv; uniform float uTime; void main(){ float a=(1.0-vUv.y)*(0.6+0.4*sin(uTime*4.0+vUv.y*20.0)); gl_FragColor=vec4(vec3(1.0,0.75,0.2)*a*0.9,1.0);} `,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 50, 16, 1, true), beamMat);
    beam.position.y = 25; g.add(beam);
    const light = new THREE.PointLight(0xffc040, 30, 14, 1.5); light.position.y = 1.5; g.add(light);
    g.visible = false;
    scene.add(g);
    this.golden = g; this.goldenBeam = beamMat; this.goldenFlame = flame;
  }

  update(dt, t, player, windVec) {
    this.time = t;
    this.sparks.update(dt);
    this.petals.update(dt);
    this.dust.update(dt);
    // explosion flashes
    for (const f of this.flashes) {
      if (f.t > 0) { f.t -= dt * 2.2; f.light.intensity = Math.max(0, f.t) ** 2 * f.base; }
      else f.light.intensity = 0;
    }
    // ground fountains
    let fl = 0;
    for (let k = this.fountains.length - 1; k >= 0; k--) {
      const f = this.fountains[k];
      f.t += dt;
      const env = Math.min(1, f.t * 2) * Math.min(1, (f.dur - f.t) * 1.5);
      if (f.t > f.dur) { this.fountains.splice(k, 1); continue; }
      fl = Math.max(fl, env);
      this.fountainLight.position.set(f.x, f.y + 1, f.z);
      const n = Math.round(30 * env);
      for (let i = 0; i < n; i++) {
        if (f.kind === 'anar') {
          const a = Math.random() * Math.PI * 2, s = Math.random() * 1.6;
          const up = 7 + Math.random() * 4 * env;
          this.sparks.emit(f.x, f.y + 0.3, f.z, Math.cos(a) * s, up, Math.sin(a) * s, 0.9 + Math.random() * 0.6,
            1, 0.7 + Math.random() * 0.3, 0.35 + Math.random() * 0.4, 0.55, 0.4, 9.8, Math.random() < 0.1 ? 2 : 0);
        } else {
          f.a += dt * 20 / n;
          const cx = Math.cos(f.a), cz = Math.sin(f.a);
          this.sparks.emit(f.x + cx * 0.25, f.y + 0.1, f.z + cz * 0.25, -cz * 6 + cx, 0.8 + Math.random(), cx * 6 + cz, 0.35 + Math.random() * 0.3,
            1, 0.5 + Math.random() * 0.3, 0.2, 0.5, 1.5, 6, 0);
        }
      }
    }
    this.fountainLight.intensity = fl * (14 + Math.random() * 8);

    // floating diyas
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const offs = this.floatOffsets.array, vis = this.floatVis.array;
    for (let i = 0; i < this.floatMax; i++) {
      const f = this.floatData[i];
      if (!f.active) { vis[i] = 0; this.donas.setMatrixAt(i, zero); continue; }
      f.t += dt;
      f.x += f.vx * dt; f.z += f.vz * dt; f.vz *= (1 - dt * 0.05);
      if (f.z < -60) f.vz = Math.max(f.vz, -0.05);
      const bob = Math.sin(t * 1.6 + f.ph) * 0.03;
      p.set(f.x, 0.04 + bob, f.z);
      q.setFromEuler(new THREE.Euler(Math.sin(t + f.ph) * 0.08, 0, Math.cos(t * 1.3 + f.ph) * 0.08));
      m.compose(p, q, s);
      this.donas.setMatrixAt(i, m);
      offs[i * 3] = f.x; offs[i * 3 + 1] = 0.1 + bob; offs[i * 3 + 2] = f.z;
      vis[i] = Math.min(1, f.t * 2) * (f.t > 150 ? Math.max(0, 1 - (f.t - 150) / 10) : 1);
      if (f.t > 160 || f.x > 400) f.active = false;
    }
    this.donas.instanceMatrix.needsUpdate = true;
    this.floatOffsets.needsUpdate = true; this.floatVis.needsUpdate = true;
    this.floatUniforms.uTime.value = t;
    this.floatUniforms.uWind.value.copy(windVec).multiplyScalar(0.5);

    // vimana flight
    if (this.vimanaT >= 0) {
      this.vimanaT += dt;
      const u = Math.min(1, this.vimanaT / this.vimanaDur);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const pos = this.vimanaPath.getPointAt(e);
      const tan = this.vimanaPath.getTangentAt(Math.min(0.999, e));
      this.vimana.position.copy(pos);
      this.vimana.position.y += Math.sin(t * 1.5) * 0.4;
      this.vimana.rotation.y = Math.atan2(-tan.z, tan.x);
      this.vimana.rotation.z = Math.sin(t) * 0.03;
      if (Math.random() < dt * 20) this.petals.emit(pos.x + (Math.random() - 0.5) * 12, pos.y - 1, pos.z + (Math.random() - 0.5) * 8, 0, -1, 0, 12, 1, Math.random() < 0.5 ? 0.45 : 0.78, 0.03, 0.9, 1.6, 0.6, 16);
      if (u >= 1) { this.vimanaT = -1; this.vimana.visible = false; }
    }
    // golden diya
    if (this.golden.visible) {
      this.goldenBeam.uniforms.uTime.value = t;
      this.golden.rotation.y += dt;
      const f = 0.9 + Math.random() * 0.2;
      this.goldenFlame.userData.core.scale.set(0.38 * f, 0.64 * f, 1);
    }
  }
}
