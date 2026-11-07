// People of Ayodhya: the player (a young deep-sevak), helper sevaks, devotees and the mischievous vanar
import * as THREE from 'three';
import { glowSpriteTexture } from './textures.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const matCache = new Map();
function mat(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts }));
  return matCache.get(k);
}
let glowTex;
export function makeHandFlame(scale = 1) {
  glowTex ||= glowSpriteTexture();
  const g = new THREE.Group();
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(4, 2.2, 0.8), blending: THREE.AdditiveBlending, depthWrite: false }));
  core.scale.set(0.12 * scale, 0.2 * scale, 1);
  core.position.y = 0.06 * scale;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.2, 0.45, 0.1), blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(0.7 * scale, 0.7 * scale, 1);
  halo.position.y = 0.08 * scale;
  g.add(core, halo);
  g.userData.core = core; g.userData.halo = halo;
  return g;
}

export function makePerson({ cloth = 0xf2a900, lower = 0xf5f0e6, skin = 0x8d5a3b, female = false, scale = 1, thali = false } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const cMat = mat(cloth), lMat = mat(lower), sMat = mat(skin), hMat = mat(0x120c08);
  // torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.62, 10), cMat);
  torso.position.y = 1.16; body.add(torso);
  const legs = [];
  if (female) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.34, 0.86, 12), lMat);
    skirt.position.y = 0.43; body.add(skirt);
    const pallu = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.36), lMat);
    pallu.position.set(-0.17, 1.12, 0); pallu.rotation.z = 0.15; body.add(pallu);
  } else {
    const kurtaSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.27, 0.38, 10), cMat);
    kurtaSkirt.position.y = 0.7; body.add(kurtaSkirt);
    for (const sx of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(sx * 0.1, 0.78, 0);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.76, 8), lMat);
      leg.position.y = -0.38; hip.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.22), mat(0x3a2414));
      foot.position.set(0, -0.76, 0.05); hip.add(foot);
      body.add(hip); legs.push(hip);
    }
  }
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(sx * 0.24, 1.42, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.58, 8), cMat);
    arm.position.y = -0.29; sh.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), sMat);
    hand.position.y = -0.6; sh.add(hand);
    body.add(sh); arms.push(sh);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), sMat);
  neck.position.y = 1.5; body.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), sMat);
  head.position.y = 1.65; head.scale.set(1, 1.12, 1); body.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.128, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hMat);
  hair.position.y = 1.67; hair.rotation.x = -0.25; body.add(hair);
  if (female) {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), hMat);
    bun.position.set(0, 1.66, -0.13); body.add(bun);
    const bindi = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), mat(0xcc0000));
    bindi.position.set(0, 1.7, 0.118); body.add(bindi);
  } else {
    const tilak = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.01), mat(0xff3300, { emissive: 0x501000 }));
    tilak.position.set(0, 1.69, 0.12); body.add(tilak);
  }
  let flame = null;
  if (thali) {
    // puja thali with a diya in the right hand
    const hand = arms[1];
    hand.rotation.x = -1.1;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.02, 16), mat(0xd4af37, { metalness: 1, roughness: 0.3 }));
    plate.position.set(0, -0.62, 0.05); plate.rotation.x = 1.1; hand.add(plate);
    const diya = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.03, 10), mat(0x9c4a22));
    diya.position.set(0, 0.02, 0); plate.add(diya);
    flame = makeHandFlame(1);
    flame.position.set(0, 0.04, 0); plate.add(flame);
  }
  root.scale.setScalar(scale);
  root.userData = { body, legs, arms, head, flame, walkT: Math.random() * 10 };
  return root;
}

export function animateWalk(p, speed, dt) {
  const u = p.userData;
  u.walkT += dt * (2 + speed * 1.6);
  const amp = Math.min(1, speed / 4) * 0.7;
  const s = Math.sin(u.walkT);
  u.legs.forEach((l, i) => (l.rotation.x = s * amp * (i ? 1 : -1)));
  u.arms.forEach((a, i) => { if (!(i === 1 && u.flame)) a.rotation.x = -s * amp * 0.8 * (i ? 1 : -1); });
  u.body.position.y = Math.abs(Math.cos(u.walkT)) * 0.05 * amp;
  if (u.flame) {
    const f = 0.9 + Math.sin(performance.now() * 0.03) * 0.08 + Math.random() * 0.05;
    u.flame.userData.core.scale.set(0.12 * f, 0.2 * f, 1);
  }
}

// ---------------------------------------------------------------- Player
export class Player {
  constructor(scene, world) {
    this.world = world;
    this.mesh = makePerson({ cloth: 0xffb000, lower: 0xfaf3e3, skin: 0x9a6440, thali: true });
    scene.add(this.mesh);
    this.light = new THREE.PointLight(0xff9a40, 6, 9, 1.6);
    this.light.position.set(0, 1.4, 0.4);
    this.mesh.add(this.light);
    this.pos = new THREE.Vector3(0, 3.6, 16);
    this.heading = Math.PI; // facing the river (-z)
    this.speed = 0;
    this.y = 3.6;
    this.baseSpeed = 4.6;
    this.sprintMul = 1.6;
    this.reach = 1.6;
    this.lightRate = 4;
    this.lightBudget = 0;
    this.stamina = 1;
  }
  update(dt, input, camYaw) {
    let mx = input.x, mz = input.z;
    const len = Math.hypot(mx, mz);
    let target = 0;
    const sprint = input.sprint && this.stamina > 0.05;
    if (len > 0.01) {
      mx /= Math.max(1, len); mz /= Math.max(1, len);
      // camera-relative: forward = away from camera
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
      const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      const dx = rx * mx + fx * mz, dz = rz * mx + fz * mz;
      target = this.baseSpeed * (sprint ? this.sprintMul : 1) * Math.min(1, len);
      const want = Math.atan2(dx, dz);
      let d = want - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, dt * 12);
      this.moveDir = [dx / Math.hypot(dx, dz), dz / Math.hypot(dx, dz)];
    }
    this.stamina = Math.max(0, Math.min(1, this.stamina + (sprint && len > 0.01 ? -dt * 0.18 : dt * 0.12)));
    this.speed += (target - this.speed) * Math.min(1, dt * 10);
    if (this.speed > 0.01 && this.moveDir) {
      const step = this.speed * dt;
      const nx = this.pos.x + this.moveDir[0] * step;
      const nz = this.pos.z + this.moveDir[1] * step;
      if (this.world.isFree(nx, nz)) { this.pos.x = nx; this.pos.z = nz; }
      else if (this.world.isFree(nx, this.pos.z)) this.pos.x = nx;
      else if (this.world.isFree(this.pos.x, nz)) this.pos.z = nz;
    }
    const gy = this.world.heightAt(this.pos.x, this.pos.z);
    this.y += (gy - this.y) * Math.min(1, dt * 14);
    this.pos.y = this.y;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    animateWalk(this.mesh, this.speed, dt);
    this.light.intensity = 5 + Math.sin(performance.now() * 0.02) * 0.6 + Math.random() * 0.4;
  }
}

// ---------------------------------------------------------------- Sevaks (helpers)
const SEVAK_CLOTHES = [0xff7a00, 0xffd000, 0xe63946, 0xff9f1c, 0xf4a261, 0xffffff];
export class Sevak {
  constructor(scene, world, diyas, zone, idx, opts = {}) {
    this.world = world; this.diyas = diyas; this.zone = zone;
    this.source = opts.source || 'sevak';
    this.range = opts.range || null; // [start, count] overrides the zone
    const female = idx % 3 === 1;
    this.mesh = makePerson({ cloth: opts.cloth || SEVAK_CLOTHES[idx % SEVAK_CLOTHES.length], lower: female ? [0xd62828, 0x6a0dad, 0x0077b6, 0x2a9d8f][idx % 4] : 0xf8f4ea, skin: [0x8d5a3b, 0x6e4529, 0xa86f4c][idx % 3], female, thali: true, scale: 0.97 + Math.random() * 0.06 });
    scene.add(this.mesh);
    this.pos = new THREE.Vector3();
    this.target = -1;
    this.budget = 0;
    this.stuck = 0;
    this.speed = 0;
    this.heading = 0;
    this.placeInZone();
  }
  placeInZone() {
    const d = this.diyas;
    const [s0, n0] = this.span();
    const i = s0 + ((Math.random() * n0) | 0);
    let x = d.pos[i * 3], z = d.pos[i * 3 + 2];
    if (!this.world.isFree(x, z)) { x = 0; z = 16; }
    this.pos.set(x, this.world.heightAt(x, z), z);
  }
  span() { return this.range || [this.diyas.zoneStart[this.zone], this.diyas.zoneCount[this.zone]]; }
  pickTarget() {
    const d = this.diyas;
    const [s, n] = this.span();
    // prefer an unlit diya close by, so helpers sweep along the rows
    const near = d.findTarget(this.pos.x, this.pos.z, 7, this.pos.y);
    if (near >= 0 && near >= s && near < s + n && !d.lit[near]) { this.target = near; return; }
    let best = -1, bd = Infinity;
    const low = d.burnTime * 0.3;
    for (let k = 0; k < 14; k++) {
      const i = s + ((Math.random() * n) | 0);
      if (d.lit[i] && d.oil[i] > low) continue;
      const dx = d.pos[i * 3] - this.pos.x, dz = d.pos[i * 3 + 2] - this.pos.z;
      const dist = dx * dx + dz * dz + (d.lit[i] ? 40 : 0);
      if (dist < bd) { bd = dist; best = i; }
    }
    this.target = best;
  }
  update(dt, rate, reach, speed) {
    const d = this.diyas;
    if (this.target < 0 || (d.lit[this.target] && d.oil[this.target] > d.burnTime * 0.3)) {
      this.pickTarget();
    }
    this.budget = Math.min(this.budget + rate * dt, 2);
    let moving = false;
    if (this.target >= 0) {
      const tx = d.pos[this.target * 3], tz = d.pos[this.target * 3 + 2];
      const dx = tx - this.pos.x, dz = tz - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > reach * 0.7) {
        moving = true;
        const sp = speed;
        const nx = this.pos.x + (dx / dist) * sp * dt, nz = this.pos.z + (dz / dist) * sp * dt;
        if (this.world.isFree(nx, nz)) { this.pos.x = nx; this.pos.z = nz; this.stuck = 0; }
        else if (this.world.isFree(nx, this.pos.z)) this.pos.x = nx;
        else if (this.world.isFree(this.pos.x, nz)) this.pos.z = nz;
        else { this.stuck += dt; if (this.stuck > 1) { this.target = -1; this.stuck = 0; } }
        const want = Math.atan2(dx, dz);
        let a = want - this.heading; a = Math.atan2(Math.sin(a), Math.cos(a));
        this.heading += a * Math.min(1, dt * 8);
      }
    }
    while (this.budget >= 1) {
      const i = d.findTarget(this.pos.x, this.pos.z, reach, this.pos.y);
      if (i < 0) break;
      d.light(i, this.source);
      this.budget -= 1;
    }
    this.speed += ((moving ? speed : 0) - this.speed) * Math.min(1, dt * 8);
    this.pos.y += (this.world.heightAt(this.pos.x, this.pos.z) - this.pos.y) * Math.min(1, dt * 12);
    if (this.mesh.visible) {
      this.mesh.position.copy(this.pos);
      this.mesh.rotation.y = this.heading;
      animateWalk(this.mesh, this.speed, dt);
    }
  }
  dispose(scene) { scene.remove(this.mesh); }
}

// ---------------------------------------------------------------- Vanar (monkey) event
export class Monkey {
  constructor(scene) {
    const g = new THREE.Group();
    const fur = mat(0x6b4a2b), face = mat(0xd9a07a);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), fur);
    body.scale.set(0.8, 0.75, 1.25); body.position.y = 0.5; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), fur);
    head.position.set(0, 0.72, 0.33); g.add(head);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6), face);
    muzzle.position.set(0, 0.69, 0.45); muzzle.scale.set(1, 0.8, 0.7); g.add(muzzle);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), face);
      ear.position.set(sx * 0.15, 0.75, 0.3); g.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), mat(0x000000));
      eye.position.set(sx * 0.05, 0.76, 0.47); g.add(eye);
    }
    this.limbs = [];
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const l = new THREE.Group(); l.position.set(sx * 0.15, 0.45, sz * 0.22);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.45, 6), fur);
      m.position.y = -0.22; l.add(m); g.add(l); this.limbs.push(l);
    }
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 6, 16, Math.PI * 1.2), fur);
    tail.position.set(0, 0.75, -0.35); tail.rotation.y = Math.PI / 2; g.add(tail);
    // a stolen laddoo in hand
    const laddoo = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0xffa500, { emissive: 0x803000 }));
    laddoo.position.set(0.2, 0.5, 0.45); g.add(laddoo);
    g.visible = false;
    scene.add(g);
    this.mesh = g;
    this.active = false;
    this.pos = new THREE.Vector3();
    this.dir = new THREE.Vector2(1, 0);
    this.t = 0;
  }
  spawn(x, z, y) {
    this.active = true; this.mesh.visible = true;
    this.pos.set(x, y, z); this.t = 0; this.life = 26;
    const a = Math.random() * Math.PI * 2; this.dir.set(Math.cos(a), Math.sin(a));
  }
  update(dt, world, diyas, player) {
    if (!this.active) return { out: 0 };
    this.t += dt;
    const toP = new THREE.Vector2(this.pos.x - player.pos.x, this.pos.z - player.pos.z);
    const pd = toP.length();
    let speed = 3.4;
    if (pd < 7) { toP.normalize(); this.dir.lerp(toP, Math.min(1, dt * 3)).normalize(); speed = 5.6; }
    else if (Math.random() < dt * 0.8) { const a = Math.random() * Math.PI * 2; this.dir.set(Math.cos(a), Math.sin(a)); }
    const nx = this.pos.x + this.dir.x * speed * dt, nz = this.pos.z + this.dir.y * speed * dt;
    if (world.isFree(nx, nz)) { this.pos.x = nx; this.pos.z = nz; }
    else { this.dir.set(-this.dir.x + (Math.random() - 0.5), -this.dir.y + (Math.random() - 0.5)).normalize(); }
    this.pos.y += (world.heightAt(this.pos.x, this.pos.z) - this.pos.y) * Math.min(1, dt * 15);
    this.mesh.position.copy(this.pos);
    this.mesh.position.y += Math.abs(Math.sin(this.t * 14)) * 0.18;
    this.mesh.rotation.y = Math.atan2(this.dir.x, this.dir.y);
    this.limbs.forEach((l, i) => (l.rotation.x = Math.sin(this.t * 14 + (i % 2) * Math.PI) * 0.8));
    const out = diyas.extinguishNear(this.pos.x, this.pos.z, 0.55, 0.9);
    let caught = pd < 1.5;
    if (caught || this.t > this.life) {
      this.active = false; this.mesh.visible = false;
    }
    return { out, caught, escaped: !caught && !this.active };
  }
}

// ---------------------------------------------------------------- Crowd of devotees (instanced)
export function buildCrowd(scene, world, count = 140) {
  const clothGeos = [], skinGeos = [];
  const add = (arr, geo, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const g = geo.toNonIndexed(); g.scale(sx, sy, sz); g.translate(x, y, z);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    arr.push(g);
  };
  add(clothGeos, new THREE.CylinderGeometry(0.17, 0.21, 0.62, 8), 0, 1.16, 0);
  add(clothGeos, new THREE.CylinderGeometry(0.2, 0.33, 0.86, 8), 0, 0.43, 0);
  add(clothGeos, new THREE.CylinderGeometry(0.05, 0.05, 0.55, 6), -0.24, 1.15, 0);
  add(clothGeos, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), 0.2, 1.2, 0.12);
  add(skinGeos, new THREE.SphereGeometry(0.12, 10, 8), 0, 1.65, 0, 1, 1.12, 1);
  add(skinGeos, new THREE.CylinderGeometry(0.05, 0.06, 0.1, 6), 0, 1.5, 0);
  // folded hands (pranam)
  add(skinGeos, new THREE.SphereGeometry(0.055, 6, 4), 0.06, 1.35, 0.2);
  const hairGeo = new THREE.SphereGeometry(0.128, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).toNonIndexed();
  hairGeo.deleteAttribute('uv'); hairGeo.translate(0, 1.67, -0.01);
  const cloth = mergeGeometries(clothGeos);
  const skin = mergeGeometries(skinGeos);
  const clothMesh = new THREE.InstancedMesh(cloth, new THREE.MeshStandardMaterial({ roughness: 0.9 }), count);
  const skinMesh = new THREE.InstancedMesh(skin, new THREE.MeshStandardMaterial({ roughness: 0.7 }), count);
  const hairMesh = new THREE.InstancedMesh(hairGeo, new THREE.MeshStandardMaterial({ color: 0x0f0a07, roughness: 0.9 }), count);
  const palette = [0xe63946, 0xff7f11, 0xffd60a, 0x9b2226, 0x7209b7, 0x0077b6, 0xf72585, 0x2a9d8f, 0xffffff, 0xff006e, 0xfb8500, 0xd00000];
  const skins = [0x8d5a3b, 0x6e4529, 0xa86f4c, 0x5c3a24, 0xb98060];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  const people = [];
  let placed = 0, tries = 0;
  while (placed < count && tries < count * 30) {
    tries++;
    const r = Math.random();
    let x, z, face;
    if (r < 0.55) { x = (Math.random() - 0.5) * 210; z = 14.8 + Math.random() * 3.8; face = Math.PI; }        // promenade, watching the river
    else if (r < 0.75) { x = (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 2); z = 22 + Math.random() * 56; face = (x < 0 ? 1 : -1) * Math.PI / 2; }
    else { x = (Math.random() - 0.5) * 28; z = 93 + Math.random() * 1.6; face = 0; }                          // facing the mandir
    if (!world.isFree(x, z, 0.4)) continue;
    const y = world.heightAt(x, z);
    const s = 0.88 + Math.random() * 0.22;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), face + (Math.random() - 0.5) * 0.9);
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
    clothMesh.setMatrixAt(placed, m); skinMesh.setMatrixAt(placed, m); hairMesh.setMatrixAt(placed, m);
    clothMesh.setColorAt(placed, c.set(palette[(Math.random() * palette.length) | 0]));
    skinMesh.setColorAt(placed, c.set(skins[(Math.random() * skins.length) | 0]));
    people.push({ x, z, r: 0.3 });
    placed++;
  }
  clothMesh.count = skinMesh.count = hairMesh.count = placed;
  scene.add(clothMesh, skinMesh, hairMesh);
  for (const p of people) world.colliders.push({ x0: p.x - 0.25, x1: p.x + 0.25, z0: p.z - 0.25, z1: p.z + 0.25 });
  return [clothMesh, skinMesh, hairMesh];
}
