// Floating power-ups that appear on the ghats: grab them for bursts of fun
import * as THREE from 'three';
import { glowSpriteTexture } from './textures.js';

export const POWERUPS = {
  blaze: { icon: '🔥', name: 'Agni Blast', desc: 'Every diya around you bursts alight', color: [1.6, 0.6, 0.15], weight: 3 },
  speed: { icon: '⚡', name: 'Pavan Veg', desc: 'Run and light twice as fast for 8 s', color: [0.5, 1.0, 1.6], weight: 3 },
  magnet: { icon: '🪔', name: 'Lambi Jyoti', desc: 'Double lighting reach for 10 s', color: [1.6, 1.3, 0.4], weight: 2 },
  double: { icon: '✖️2', name: 'Dugna', desc: 'Double points for 10 s', color: [1.3, 0.4, 1.4], weight: 2 },
  time: { icon: '⏳', name: 'Samay', desc: '+6 seconds', color: [0.5, 1.5, 0.6], weight: 2 },
};

function iconTexture(icon) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,240,200,0.95)');
  g.addColorStop(0.7, 'rgba(255,170,60,0.85)');
  g.addColorStop(1, 'rgba(120,40,0,0.9)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(64, 64, 60, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = '#fff3c4'; ctx.stroke();
  ctx.font = `${icon.length > 2 ? 50 : 66}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(icon, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class PowerUps {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.tex = {};
    this.glow = glowSpriteTexture();
    for (const k of Object.keys(POWERUPS)) this.tex[k] = iconTexture(POWERUPS[k].icon);
  }
  randomType(rng = Math.random, allowTime = true) {
    const keys = Object.keys(POWERUPS).filter((k) => allowTime || k !== 'time');
    const total = keys.reduce((a, k) => a + POWERUPS[k].weight, 0);
    let r = rng() * total;
    for (const k of keys) { r -= POWERUPS[k].weight; if (r <= 0) return k; }
    return keys[0];
  }
  spawn(type, x, y, z, life = 14) {
    const g = new THREE.Group();
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex[type], depthWrite: false, toneMapped: false }));
    icon.scale.setScalar(0.9);
    const c = POWERUPS[type].color;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: new THREE.Color(c[0], c[1], c[2]), blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(2.6);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.35, 8, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0] * 0.35, c[1] * 0.35, c[2] * 0.35), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 4;
    g.add(halo, icon, beam);
    g.position.set(x, y + 1.1, z);
    this.scene.add(g);
    this.items.push({ type, g, icon, halo, x, y, z, t: 0, life });
  }
  clear() { for (const it of this.items) this.scene.remove(it.g); this.items.length = 0; }
  // returns array of picked types
  update(dt, t, px, pz) {
    const picked = [];
    for (let k = this.items.length - 1; k >= 0; k--) {
      const it = this.items[k];
      it.t += dt;
      const fade = Math.min(1, it.t * 3) * Math.min(1, (it.life - it.t) / 1.5);
      it.g.position.y = it.y + 1.1 + Math.sin(t * 3 + k) * 0.15;
      it.icon.material.opacity = fade;
      it.icon.material.transparent = true;
      it.halo.material.opacity = fade * (0.7 + 0.3 * Math.sin(t * 6));
      it.halo.material.transparent = true;
      const pulse = 1 + Math.max(0, (3 - (it.life - it.t))) * 0.1 * Math.sin(t * 20);
      it.icon.scale.setScalar(0.9 * pulse);
      if (Math.hypot(it.x - px, it.z - pz) < 1.4) {
        picked.push({ type: it.type, x: it.x, y: it.y, z: it.z });
        this.scene.remove(it.g); this.items.splice(k, 1);
      } else if (it.t >= it.life) {
        this.scene.remove(it.g); this.items.splice(k, 1);
      }
    }
    return picked;
  }
}
