// Ayodhya Deepotsav — main game
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildWorld, TOP_Y } from './world.js';
import { DiyaSystem, ZONES } from './diyas.js';
import { Player, Sevak, Monkey, buildCrowd } from './characters.js';
import { Effects } from './fx.js';
import { AudioEngine } from './audio.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'ayodhya-deepotsav-v1';

// ---------------------------------------------------------------- number formatting (Indian units)
function fmt(n) {
  n = Math.floor(n);
  if (n < 1e5) return n.toLocaleString('en-IN');
  const units = [[1e17, 'Shankh'], [1e15, 'Padma'], [1e13, 'Neel'], [1e11, 'Kharab'], [1e9, 'Arab'], [1e7, 'Cr'], [1e5, 'L']];
  for (const [v, u] of units) if (n >= v) return (n / v).toFixed(n / v >= 100 ? 0 : 2) + ' ' + u;
  return String(n);
}
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------------------------------------------------------------- persistent state
const UPGRADES = [
  { id: 'speed', icon: '🙌', name: 'Swift Hands', hindi: 'फुर्ती', desc: '+1.5 diyas/sec lighting speed', base: 40, mult: 1.42, max: 80 },
  { id: 'reach', icon: '🪔', name: 'Long Batti', hindi: 'लंबी बत्ती', desc: '+0.3 m lighting reach', base: 75, mult: 1.75, max: 12 },
  { id: 'ghee', icon: '🧈', name: 'Pure Desi Ghee', hindi: 'शुद्ध घी', desc: '+12 s burn time for every diya', base: 100, mult: 1.5, max: 50 },
  { id: 'sevak', icon: '🙋', name: 'Hire a Sevak', hindi: 'सेवक', desc: 'A volunteer who lights diyas for you', base: 220, mult: 1.38, max: 60 },
  { id: 'sevakTrain', icon: '📿', name: 'Sevak Training', hindi: 'प्रशिक्षण', desc: 'Sevaks light 30% faster & walk faster', base: 1200, mult: 1.7, max: 30 },
  { id: 'bhajan', icon: '🎶', name: 'Bhajan Mandali', hindi: 'भजन मंडली', desc: '+25% Punya from everything', base: 400, mult: 1.62, max: 60 },
  { id: 'aanchal', icon: '🧣', name: 'Aanchal Shield', hindi: 'आँचल', desc: '−10% chance wind snuffs a diya', base: 600, mult: 1.9, max: 8 },
  { id: 'agni', icon: '🔥', name: 'Agni Chain', hindi: 'अग्नि श्रृंखला', desc: '+4% chance a flame leaps to a neighbour', base: 1500, mult: 1.8, max: 12 },
  { id: 'utsav', icon: '🎉', name: 'Grand Utsav', hindi: 'महोत्सव', desc: 'Utsav lasts +4 s and fills 15% faster', base: 2000, mult: 1.9, max: 10 },
];

const ACHIEVEMENTS = [
  ['first', '🪔', 'Pehla Deep', 'Light your first diya', (s) => s.totalLit >= 1, 20],
  ['lit1k', '✨', 'Sahasra Deep', 'Light 1,000 diyas', (s) => s.totalLit >= 1000, 400],
  ['lit10k', '🌟', 'Das Hazaar', 'Light 10,000 diyas', (s) => s.totalLit >= 1e4, 4000],
  ['lit1L', '💫', 'Ek Lakh Deep', 'Light 1,00,000 diyas', (s) => s.totalLit >= 1e5, 40000],
  ['lit10L', '🌠', 'Das Lakh Deep', 'Light 10,00,000 diyas', (s) => s.totalLit >= 1e6, 400000],
  ['lit25L', '🏆', 'World Record!', 'Light 25 lakh diyas — like Ayodhya’s record Deepotsav', (s) => s.totalLit >= 2.5e6, 2e6],
  ['night3', '🌙', 'Teesri Raat', 'Complete night 2', (s) => s.bestNight >= 3, 300],
  ['night5', '🌒', 'Paanch Raatein', 'Complete night 4', (s) => s.bestNight >= 5, 1000],
  ['night10', '🌓', 'Das Raatein', 'Complete night 9', (s) => s.bestNight >= 10, 10000],
  ['night20', '🌕', 'Bees Raatein', 'Complete night 19', (s) => s.bestNight >= 20, 200000],
  ['night30', '☀️', 'Akhand Jyoti', 'Complete night 29', (s) => s.bestNight >= 30, 5e6],
  ['stars3', '⭐', 'Perfect Night', 'Earn 3 stars on a night', (s) => s.threeStars >= 1, 500],
  ['stars10', '🌟', 'Tejasvi', 'Earn 3 stars on 10 nights', (s) => s.threeStars >= 10, 20000],
  ['combo50', '🔥', 'Agni Nritya', 'Reach a 50-diya combo', (s) => s.maxCombo >= 50, 800],
  ['combo150', '☄️', 'Jwala Tandav', 'Reach a 150-diya combo', (s) => s.maxCombo >= 150, 8000],
  ['rocket25', '🎆', 'Aatishbazi', 'Launch 25 fireworks', (s) => s.rockets >= 25, 1500],
  ['rocket200', '🎇', 'Sky on Fire', 'Launch 200 fireworks', (s) => s.rockets >= 200, 30000],
  ['float50', '🪷', 'Deep Daan', 'Float 50 diyas on the Sarayu', (s) => s.floated >= 50, 2000],
  ['anar20', '🌋', 'Anar Ustad', 'Light 20 anar fountains', (s) => s.anars >= 20, 2000],
  ['monkey5', '🐒', 'Vanar Sena', 'Catch 5 mischievous vanars', (s) => s.monkeys >= 5, 5000],
  ['golden5', '🪙', 'Lakshmi Kripa', 'Find 5 golden diyas', (s) => s.goldens >= 5, 5000],
  ['sevak10', '🙋', 'Seva Dal', 'Hire 10 sevaks', (s) => s.up.sevak >= 10, 3000],
  ['sevak30', '👥', 'Mahaseva', 'Hire 30 sevaks', (s) => s.up.sevak >= 30, 100000],
  ['mandir', '🛕', 'Darshan', 'Unlock Shri Ram Janmabhoomi Prangan', (s) => s.zones >= ZONES.length, 50000],
  ['hold1k', '💡', 'Jagmag', 'Have 1,000 diyas burning at once', (s) => s.maxHeld >= 1000, 3000],
  ['hold5k', '🌇', 'Ayodhya Jagmagaye', 'Have 5,000 diyas burning at once', (s) => s.maxHeld >= 5000, 60000],
  ['utsav10', '🥁', 'Utsav!', 'Trigger Utsav 10 times', (s) => s.utsavs >= 10, 5000],
  ['crore', '💰', 'Crorepati', 'Earn 1 crore Punya in total', (s) => s.lifetime >= 1e7, 500000],
  ['ashirwad', '🙏', 'Ashirwad', 'Receive the blessings of Shri Ram (prestige)', (s) => s.prestiges >= 1, 0],
  ['hour', '⏳', 'Sachcha Bhakt', 'Play for one hour', (s) => s.playTime >= 3600, 10000],
];

function freshState() {
  return {
    v: 1, punya: 0, lifetime: 0, totalLit: 0, night: 1, bestNight: 1, zones: 1,
    up: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
    ashirwad: 0, ashirwadEarned: 0, prestiges: 0,
    ach: {}, rockets: 0, floated: 0, anars: 0, monkeys: 0, goldens: 0, maxCombo: 0, maxHeld: 0, utsavs: 0, threeStars: 0,
    nightStars: {}, playTime: 0, quests: [], questLevel: 0, lastDay: '', streak: 0, lastSave: Date.now(), tutorial: 0,
    settings: { music: 0.6, sfx: 0.9, quality: null },
  };
}
let S = freshState();
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    const loaded = JSON.parse(raw);
    S = { ...freshState(), ...loaded, up: { ...freshState().up, ...(loaded.up || {}) }, settings: { ...freshState().settings, ...(loaded.settings || {}) } };
  }
} catch (e) { /* storage unavailable */ }
const hadSave = S.totalLit > 0;
function save() {
  S.lastSave = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
}

// ---------------------------------------------------------------- renderer & scene
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
const quality = S.settings.quality || (isTouch ? 'low' : 'high');
$('quality-select').value = quality;

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
const pr = quality === 'high' ? Math.min(devicePixelRatio, 1.75) : quality === 'medium' ? Math.min(devicePixelRatio, 1.25) : Math.min(devicePixelRatio, 1) * 0.85;
renderer.setPixelRatio(pr);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 3000);

const world = buildWorld(scene, quality);
world.setPixelRatio(pr);
const diyas = new DiyaSystem(scene, world);
const crowd = buildCrowd(scene, world, quality === 'low' ? 70 : 150);
const player = new Player(scene, world);
const audio = new AudioEngine();
const fx = new Effects(scene, audio, camera);
fx.setPixelRatio(pr);
const monkey = new Monkey(scene);
let sevaks = [];

// reflections skip small things for speed
const hideInMirror = [diyas.bowls, diyas.glows, ...crowd, ...world.mirrorHidden, fx.dust.points, fx.petals.points, fx.donas];
const origWaterBR = world.water.onBeforeRender;
world.water.onBeforeRender = function (...args) {
  const vis = hideInMirror.map((o) => o.visible);
  hideInMirror.forEach((o) => (o.visible = false));
  origWaterBR.apply(this, args);
  hideInMirror.forEach((o, i) => (o.visible = vis[i]));
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), quality === 'low' ? 0.9 : 1.05, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ---------------------------------------------------------------- derived stats
const up = () => S.up;
function multiplier() {
  return (1 + 0.25 * up().bhajan) * (1 + 0.1 * S.ashirwad) * (G.utsavT > 0 ? 2 : 1) * (G.lakshmiT > 0 ? 3 : 1);
}
function incomeRate() { return (diyas.litCount * 0.1 + G.floating * 0.6) * multiplier(); }
function applyStats() {
  player.lightRate = (4 + 1.5 * up().speed) * (1 + 0.03 * S.ashirwad);
  player.reach = 1.6 + 0.3 * up().reach;
  diyas.burnTime = 60 + 12 * up().ghee;
  diyas.chainChance = 0.04 * up().agni;
  diyas.setUnlockedZones(S.zones);
  syncSevaks();
}
function sevakRate() { return 1.2 * (1 + 0.3 * up().sevakTrain); }
function sevakSpeed() { return 2.6 * (1 + 0.05 * up().sevakTrain); }
function upgradeCost(u) { return Math.floor(u.base * Math.pow(u.mult, S.up[u.id])); }
function nightTarget(n) {
  const all = diyas.count;
  return Math.min(Math.round(60 * Math.pow(1.28, n - 1)), Math.round(all * 0.9));
}
function nightDuration(n) {
  const base = Math.min(300, 150 + 6 * n);
  const capped = Math.round(60 * Math.pow(1.28, n - 1)) > diyas.count * 0.9;
  return capped ? Math.max(150, base - (n - 20) * 5) : base;
}
function windChance() { return Math.min(0.7, 0.18 + 0.025 * S.night) * (1 - 0.1 * up().aanchal); }

function syncSevaks() {
  const want = up().sevak;
  while (sevaks.length > want) sevaks.pop().dispose(scene);
  while (sevaks.length < want) sevaks.push(new Sevak(scene, world, diyas, 0, sevaks.length));
  sevaks.forEach((s, k) => {
    const z = k % S.zones;
    if (s.zone !== z) { s.zone = z; s.placeInZone(); s.target = -1; }
  });
}

// ---------------------------------------------------------------- runtime game state
const G = {
  phase: 'title', // title | play | won | lost | summary
  night: null, timeLeft: 0, target: 0, nightLit: 0, nightPunya: 0, wonT: 0,
  combo: 0, lastLightT: -10, utsav: 0, utsavT: 0, lakshmiT: 0, floating: 0,
  nextGust: 30, gust: null, nextMonkey: 60, nextGolden: 50, goldenT: 0, goldenPos: null,
  windVec: new THREE.Vector3(), paused: false, photo: false, time: 0,
  cam: { yaw: 0, pitch: 0.42, dist: 9, look: new THREE.Vector3() },
  ambientRocket: 8,
};

function addPunya(v) {
  S.punya += v; S.lifetime += v; G.nightPunya += v;
  questProgress('earn', v, true);
}

// ---------------------------------------------------------------- lighting callback
diyas.onLit = (i, source, isNew) => {
  const mult = multiplier();
  if (source === 'player') {
    if (G.time - G.lastLightT < 1.5) G.combo++; else G.combo = 1;
    G.lastLightT = G.time;
    S.maxCombo = Math.max(S.maxCombo, G.combo);
    questProgress('combo', G.combo, false);
    const cm = comboMult();
    const gain = (isNew ? 1 : 0.5) * cm * mult;
    addPunya(gain);
    audio.lightTick(G.combo % 22);
    G.utsav = Math.min(1, G.utsav + (G.utsavT > 0 ? 0 : 0.0016 * (1 + 0.15 * up().utsav)));
    if (G.combo % 3 === 0 || cm > 1) popup(i, '+' + (gain < 10 ? gain.toFixed(1) : fmt(gain)));
  } else if (source === 'sevak') {
    addPunya((isNew ? 0.5 : 0.25) * mult);
  } else {
    addPunya(1 * mult);
    if (Math.random() < 0.3) popup(i, '🔥');
  }
  if (isNew) {
    S.totalLit++; G.nightLit++;
    questProgress('light', 1, true);
  }
};
const comboMult = () => 1 + Math.min(4, Math.floor(G.combo / 10) * 0.25);

// ---------------------------------------------------------------- UI helpers
const _v = new THREE.Vector3();
let popCount = 0;
function popup(i, text) {
  if (popCount > 26) return;
  _v.set(diyas.pos[i * 3], diyas.pos[i * 3 + 1] + 0.3, diyas.pos[i * 3 + 2]).project(camera);
  if (_v.z > 1) return;
  const el = document.createElement('div');
  el.className = 'pop';
  el.textContent = text;
  el.style.left = ((_v.x * 0.5 + 0.5) * innerWidth) + 'px';
  el.style.top = ((-_v.y * 0.5 + 0.5) * innerHeight) + 'px';
  $('popups').appendChild(el);
  popCount++;
  setTimeout(() => { el.remove(); popCount--; }, 900);
}
let bannerTimer = 0;
function banner(title, sub = '', warn = false, dur = 3.2) {
  const b = $('banner');
  b.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
  b.classList.toggle('warn', warn);
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), dur * 1000);
}
function toast(html) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = html;
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), 4200);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
}
function showMessage(html, cb) {
  $('message-body').innerHTML = html;
  $('message').classList.remove('hidden');
  G.paused = true;
  $('message-ok').onclick = () => { $('message').classList.add('hidden'); G.paused = isModalOpen(); audio.init(); cb && cb(); };
}
const isModalOpen = () => !$('shop').classList.contains('hidden') || !$('summary').classList.contains('hidden') || !$('message').classList.contains('hidden');

// ---------------------------------------------------------------- quests
const QUESTS = {
  light: { text: (n) => `Light ${fmt(n)} diyas`, goal: (l) => Math.round(80 * Math.pow(1.35, l)) },
  rocket: { text: (n) => `Launch ${n} fireworks 🎆`, goal: (l) => 2 + Math.floor(l / 2) },
  float: { text: (n) => `Float ${n} diyas on the Sarayu 🪷`, goal: (l) => 3 + Math.floor(l / 1.5) },
  combo: { text: (n) => `Reach a ${n}-diya combo 🔥`, goal: (l) => Math.min(400, 15 + l * 8) },
  earn: { text: (n) => `Earn ${fmt(n)} Punya`, goal: (l) => Math.round((300 + incomeRate() * 60) * (1 + l * 0.1)) },
  anar: { text: (n) => `Light ${n} anar fountain${n > 1 ? 's' : ''} 🎇`, goal: (l) => 1 + Math.floor(l / 3) },
  hold: { text: (n) => `Keep ${fmt(n)} diyas burning at once`, goal: () => Math.max(50, Math.round(Math.min(diyas.unlockedEnd * 0.85, diyas.litCount * 1.3 + 40))) },
  monkey: { text: () => `Catch a naughty vanar 🐒`, goal: () => 1 },
  golden: { text: () => `Find a golden Lakshmi diya 🪙`, goal: () => 1 },
};
function newQuest(exclude = []) {
  const types = Object.keys(QUESTS).filter((t) => !exclude.includes(t) && !(t === 'monkey' && S.night < 3) && !(t === 'golden' && S.night < 2));
  const type = types[(Math.random() * types.length) | 0];
  const l = S.questLevel;
  const goal = QUESTS[type].goal(l);
  const reward = Math.round((80 + incomeRate() * 35 + l * 40) * (1 + l * 0.12));
  return { type, goal, progress: 0, reward };
}
function ensureQuests() {
  while (S.quests.length < 3) S.quests.push(newQuest(S.quests.map((q) => q.type)));
}
function questProgress(type, v, add) {
  let changed = false;
  for (const q of S.quests) {
    if (q.type !== type || q.done) continue;
    q.progress = add ? q.progress + v : Math.max(q.progress, v);
    if (q.progress >= q.goal) {
      q.done = true; changed = true;
      S.punya += q.reward; S.lifetime += q.reward;
      S.questLevel++;
      toast(`✅ Quest complete: ${QUESTS[q.type].text(q.goal)} — <b>+${fmt(q.reward)} ✦</b>`);
      audio.coin();
      setTimeout(() => {
        const idx = S.quests.indexOf(q);
        if (idx >= 0) S.quests.splice(idx, 1, newQuest(S.quests.map((x) => x.type)));
        renderQuests();
      }, 1600);
    }
  }
  if (changed) renderQuests();
}
function renderQuests() {
  $('quests').innerHTML = '<h4>Seva Tasks</h4>' + S.quests.map((q) => `
    <div class="quest ${q.done ? 'done' : ''}">
      <div class="qt"><span>${q.done ? '✔ ' : ''}${QUESTS[q.type].text(q.goal)}</span><span class="qr">+${fmt(q.reward)}</span></div>
      <div class="bar"><div style="width:${Math.min(100, (q.progress / q.goal) * 100)}%"></div></div>
    </div>`).join('');
}

// ---------------------------------------------------------------- achievements
function checkAchievements() {
  for (const [id, icon, name, desc, test, reward] of ACHIEVEMENTS) {
    if (S.ach[id] || !test(S)) continue;
    S.ach[id] = Date.now();
    if (reward) { S.punya += reward; S.lifetime += reward; }
    toast(`${icon} <b>${name}</b><br>${desc}${reward ? ` · +${fmt(reward)} ✦` : ''}`);
    audio.bell(990, 0.25); audio.bell(1320, 0.18, 0.15);
  }
}

// ---------------------------------------------------------------- nights
function startNight(n) {
  S.night = n;
  diyas.resetAll();
  G.phase = 'play';
  G.target = nightTarget(n);
  G.timeLeft = nightDuration(n);
  G.duration = G.timeLeft;
  G.nightLit = 0; G.nightPunya = 0; G.combo = 0;
  G.nextGust = n >= 2 ? 18 + Math.random() * 15 : 1e9;
  G.nextMonkey = n >= 3 ? 35 + Math.random() * 30 : 1e9;
  G.nextGolden = 25 + Math.random() * 40;
  sevaks.forEach((s) => { s.target = -1; });
  banner(`रात ${n} · Night ${n}`, `Light <b>${fmt(G.target)}</b> diyas so the Pushpak Vimana can find Ayodhya`, false, 4.5);
  audio.bell(660, 0.3); audio.bell(990, 0.2, 0.4);
  save();
}
function winNight() {
  G.phase = 'won'; G.wonT = 0;
  const frac = G.timeLeft / G.duration;
  const stars = frac > 0.45 ? 3 : frac > 0.2 ? 2 : 1;
  G.stars = stars;
  const reward = Math.round((G.target * 3 + incomeRate() * 25) * (1 + (stars - 1) * 0.5));
  G.reward = reward;
  S.punya += reward; S.lifetime += reward;
  S.nightStars[S.night] = Math.max(S.nightStars[S.night] || 0, stars);
  if (stars === 3) S.threeStars++;
  S.bestNight = Math.max(S.bestNight, S.night + 1);
  fx.startVimana(18);
  audio.aarti();
  banner('🙏 श्री राम पधारे! 🙏', 'Shri Ram has returned to Ayodhya — the Pushpak Vimana found its way!', false, 6);
  for (let k = 0; k < 40; k++) setTimeout(() => fx.launch(-90 + Math.random() * 180, -10 - Math.random() * 40, 0.4), 1500 + k * 280);
  for (let k = 0; k < 6; k++) setTimeout(() => fx.anar(-60 + k * 24, TOP_Y, 18.6), 800 + k * 300);
  fx.petalShower(player.pos.x, player.pos.y + 18, player.pos.z, 500, 26);
  checkAchievements();
  save();
}
function loseNight() {
  G.phase = 'lost';
  showSummary(false);
}
function showSummary(won) {
  G.phase = 'summary';
  const n = S.night;
  const st = won ? G.stars : 0;
  $('summary-body').innerHTML = won ? `
    <div class="sum-title">शुभ दीपावली!</div>
    <div class="sum-sub">Night ${n} complete — Ayodhya glows for Shri Ram</div>
    <div class="stars">${[1, 2, 3].map((k) => `<span class="${k <= st ? '' : 'off'}">⭐</span>`).join('')}</div>
    <div class="sum-rows">
      <div>Diyas lit tonight</div><div>${fmt(G.nightLit)}</div>
      <div>Time remaining</div><div>${fmtTime(G.timeLeft)}</div>
      <div>Punya earned tonight</div><div>${fmt(G.nightPunya)} ✦</div>
      <div>Aarti reward</div><div>+${fmt(G.reward)} ✦</div>
      <div>Next night's goal</div><div>${fmt(nightTarget(n + 1))} diyas</div>
    </div>
    ${nightTarget(n + 1) > diyas.unlockedEnd * 0.8 ? `<div class="note">🔓 Tip: the next goal is big — unlock a new ghat in the Bazaar.</div>` : ''}` : `
    <div class="sum-title">The night grows late…</div>
    <div class="sum-sub">Only ${fmt(diyas.litCount)} of ${fmt(G.target)} diyas were burning when time ran out.</div>
    <div class="sum-rows">
      <div>Diyas lit tonight</div><div>${fmt(G.nightLit)}</div>
      <div>Punya earned tonight</div><div>${fmt(G.nightPunya)} ✦</div>
    </div>
    <div class="note">Visit the Bazaar: hire sevaks, buy ghee for longer flames, or get swifter hands. Then try again!</div>`;
  $('btn-next').textContent = won ? `Night ${n + 1} ➜` : 'Try Again ↻';
  $('btn-next').onclick = () => {
    $('summary').classList.add('hidden');
    G.paused = isModalOpen();
    startNight(won ? n + 1 : n);
  };
  $('summary').classList.remove('hidden');
  G.paused = true;
  save();
}

// ---------------------------------------------------------------- actions
const costRocket = () => Math.round(15 + incomeRate() * 2);
const costAnar = () => Math.round(12 + incomeRate() * 1.5);
const costFloat = () => Math.round(5 + incomeRate() * 0.6);
function spend(c) { if (S.punya < c) { audio.bell(220, 0.1); return false; } S.punya -= c; return true; }
function utsavGain(v) { if (G.utsavT <= 0) G.utsav = Math.min(1, G.utsav + v * (1 + 0.15 * up().utsav)); }
function actRocket() {
  if (G.phase === 'title' || !spend(costRocket())) return;
  const a = player.heading;
  fx.launch(player.pos.x + Math.sin(a) * 6, Math.min(player.pos.z + Math.cos(a) * 6, player.pos.z < 12 ? -3 : player.pos.z), player.pos.z < 12 ? 0.4 : player.pos.y);
  S.rockets++; questProgress('rocket', 1, true); utsavGain(0.07);
}
function actAnar() {
  if (G.phase === 'title' || !spend(costAnar())) return;
  const a = player.heading;
  const x = player.pos.x + Math.sin(a) * 1.6, z = player.pos.z + Math.cos(a) * 1.6;
  fx[Math.random() < 0.65 ? 'anar' : 'chakri'](x, world.heightAt(x, z), z);
  S.anars++; questProgress('anar', 1, true); utsavGain(0.06);
}
function actFloat() {
  if (G.phase === 'title') return;
  if (player.pos.z > 2.6) { banner('🪷 Go down to the water', 'Walk to the lowest steps of the ghat to float a diya on the Sarayu', false, 2.5); return; }
  if (!spend(costFloat())) return;
  if (!fx.floatDiya(player.pos.x + (Math.random() - 0.5), -0.6)) { S.punya += costFloat(); return; }
  S.floated++; questProgress('float', 1, true); utsavGain(0.03);
  audio.bell(1200, 0.08);
}

// ---------------------------------------------------------------- shop
let shopTab = 'upgrades';
let buyMax = false;
function openShop(tab) {
  if (G.phase === 'title') return;
  if (tab) shopTab = tab;
  $('shop').classList.remove('hidden');
  G.paused = true;
  renderShop();
}
function closeShop() {
  $('shop').classList.add('hidden');
  if (G.reopenSummary) { G.reopenSummary = false; $('summary').classList.remove('hidden'); }
  G.paused = isModalOpen();
}
function renderShop() {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === shopTab));
  $('shop-punya').textContent = fmt(S.punya);
  const body = $('shop-body');
  if (shopTab === 'upgrades') {
    body.innerHTML = `<div class="settings-row"><label><input type="checkbox" id="buymax" ${buyMax ? 'checked' : ''}> Buy max</label></div><div class="grid">` + UPGRADES.map((u) => {
      const lv = S.up[u.id], maxed = lv >= u.max, c = upgradeCost(u);
      let extra = '';
      if (u.id === 'speed') extra = `${player.lightRate.toFixed(1)} diyas/s`;
      if (u.id === 'reach') extra = `${player.reach.toFixed(1)} m`;
      if (u.id === 'ghee') extra = `${diyas.burnTime} s per diya`;
      if (u.id === 'sevak') extra = `${lv} sevaks · ${(lv * sevakRate()).toFixed(1)} diyas/s`;
      if (u.id === 'sevakTrain') extra = `${sevakRate().toFixed(2)} diyas/s each`;
      if (u.id === 'bhajan') extra = `x${(1 + 0.25 * lv).toFixed(2)} Punya`;
      if (u.id === 'aanchal') extra = `${Math.round(windChance() * 100)}% gust chance`;
      if (u.id === 'agni') extra = `${Math.round(diyas.chainChance * 100)}% chain`;
      if (u.id === 'utsav') extra = `${15 + 4 * lv} s Utsav`;
      return `<div class="card ${maxed ? 'owned' : ''}">
        <div class="ic">${u.icon}</div>
        <div class="info"><div class="nm">${u.name}<small>${u.hindi}</small></div><div class="ds">${u.desc}</div><div class="lv">Level ${lv}${u.max < 99 ? '/' + u.max : ''} · ${extra}</div></div>
        <button class="btn ${S.punya >= c && !maxed ? 'primary' : ''} buy" data-up="${u.id}" ${maxed || S.punya < c ? 'disabled' : ''}>${maxed ? 'MAX' : '✦ ' + fmt(c)}</button>
      </div>`;
    }).join('') + '</div>';
    $('buymax').onchange = (e) => { buyMax = e.target.checked; };
    body.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => buyUpgrade(b.dataset.up)));
  } else if (shopTab === 'zones') {
    body.innerHTML = '<div class="grid">' + ZONES.map((z, k) => {
      const owned = k < S.zones, next = k === S.zones;
      return `<div class="card ${owned ? 'owned' : next ? '' : 'locked'}">
        <div class="ic">${['🛕', '🌊', '🏞️', '🐒', '🪔', '🚩'][k]}</div>
        <div class="info"><div class="nm">${z.name}<small>${z.hindi}</small></div>
          <div class="ds">${fmt(diyas.zoneCount[k])} diyas${owned ? ' · unlocked' : ''}</div></div>
        ${owned ? `<button class="btn buy" data-tp="${k}">Go there</button>` :
          next ? `<button class="btn ${S.punya >= z.cost ? 'primary' : ''} buy" data-zone="${k}" ${S.punya < z.cost ? 'disabled' : ''}>✦ ${fmt(z.cost)}</button>` :
            `<button class="btn buy" disabled>🔒</button>`}
      </div>`;
    }).join('') + `</div><div class="note">Total diyas in Ayodhya: ${fmt(diyas.count)} · unlocked: ${fmt(diyas.unlockedEnd)}</div>`;
    body.querySelectorAll('[data-zone]').forEach((b) => (b.onclick = () => buyZone(+b.dataset.zone)));
    body.querySelectorAll('[data-tp]').forEach((b) => (b.onclick = () => teleport(+b.dataset.tp)));
  } else if (shopTab === 'ashirwad') {
    const earnable = Math.floor(Math.sqrt(S.lifetime / 2e5));
    const claim = Math.max(0, earnable - S.ashirwadEarned);
    const can = S.bestNight >= 12 && claim > 0;
    body.innerHTML = `
      <div class="card"><div class="ic">🙏</div><div class="info">
        <div class="nm">Ashirwad — Blessings of Shri Ram</div>
        <div class="ds">You have <b>${S.ashirwad}</b> Ashirwad: +${S.ashirwad * 10}% Punya and +${S.ashirwad * 3}% lighting speed, forever.</div>
        <div class="ds">Offer this Deepotsav to Shri Ram to start again from Night 1 with <b>${claim}</b> new Ashirwad.
          Punya, upgrades and zones reset. Achievements and stats stay.</div>
        <div class="lv">${S.bestNight >= 12 ? '' : 'Unlocks after reaching Night 12. '}Ashirwad earned so far grows with lifetime Punya (${fmt(S.lifetime)}).</div>
      </div><button class="btn ${can ? 'primary' : ''} buy" id="prestige" ${can ? '' : 'disabled'}>Offer 🪔</button></div>`;
    $('prestige').onclick = () => {
      if (!confirm(`Offer your Deepotsav and receive ${claim} Ashirwad? Progress (except achievements) will reset.`)) return;
      const keep = { ach: S.ach, rockets: S.rockets, floated: S.floated, anars: S.anars, monkeys: S.monkeys, goldens: S.goldens, maxCombo: S.maxCombo, maxHeld: S.maxHeld, utsavs: S.utsavs, threeStars: S.threeStars, playTime: S.playTime, totalLit: S.totalLit, lifetime: S.lifetime, settings: S.settings, streak: S.streak, lastDay: S.lastDay, tutorial: 99, bestNight: S.bestNight };
      const ash = S.ashirwad + claim, earned = S.ashirwadEarned + claim, pres = S.prestiges + 1;
      S = { ...freshState(), ...keep, ashirwad: ash, ashirwadEarned: earned, prestiges: pres };
      S.bestNight = 1;
      ensureQuests(); renderQuests(); applyStats(); closeShop();
      teleport(0); startNight(1);
      audio.aarti(); checkAchievements();
    };
  } else if (shopTab === 'achievements') {
    const got = ACHIEVEMENTS.filter((a) => S.ach[a[0]]).length;
    body.innerHTML = `<div class="note" style="margin:0 0 10px">${got} / ${ACHIEVEMENTS.length} unlocked</div><div class="grid">` + ACHIEVEMENTS.map(([id, icon, name, desc, , reward]) =>
      `<div class="card ach ${S.ach[id] ? 'got' : ''}"><div class="ic">${icon}</div><div class="info"><div class="nm">${name}</div><div class="ds">${desc}</div>${reward ? `<div class="lv">Reward ✦ ${fmt(reward)}</div>` : ''}</div></div>`).join('') + '</div>';
  } else {
    body.innerHTML = `
      <div class="section-title">Your Deepotsav</div>
      <div class="stats">
        <div>Diyas lit (all time)</div><div>${fmt(S.totalLit)}</div>
        <div>Best night reached</div><div>${S.bestNight}</div>
        <div>Most diyas burning at once</div><div>${fmt(S.maxHeld)}</div>
        <div>Lifetime Punya</div><div>${fmt(S.lifetime)}</div>
        <div>Best combo</div><div>${S.maxCombo}</div>
        <div>Fireworks · Anars · Floated</div><div>${S.rockets} · ${S.anars} · ${S.floated}</div>
        <div>Vanars caught · Golden diyas</div><div>${S.monkeys} · ${S.goldens}</div>
        <div>Daily streak</div><div>${S.streak} day${S.streak === 1 ? '' : 's'}</div>
        <div>Time played</div><div>${Math.floor(S.playTime / 3600)}h ${Math.floor((S.playTime % 3600) / 60)}m</div>
      </div>
      <div class="section-title">Settings</div>
      <div class="settings-row">Music <input type="range" id="vol-music" min="0" max="1" step="0.05" value="${S.settings.music}"></div>
      <div class="settings-row">Sounds <input type="range" id="vol-sfx" min="0" max="1" step="0.05" value="${S.settings.sfx}"></div>
      <div class="settings-row">Graphics <select id="q2"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select> <small>(reloads)</small></div>
      <div class="section-title">Controls</div>
      <div class="ds" style="line-height:1.9">WASD / arrows walk · Shift run · drag to look · wheel zoom · Q/E turn camera<br>B Bazaar · F fireworks · G anar/chakri · R float a diya (at the water) · P photo mode · Esc close</div>
      <div class="summary-buttons" style="justify-content:flex-start"><button class="btn" id="reset-all">Reset all progress</button></div>`;
    $('vol-music').oninput = (e) => { S.settings.music = +e.target.value; audio.setMusic(S.settings.music); };
    $('vol-sfx').oninput = (e) => { S.settings.sfx = +e.target.value; audio.setSfx(S.settings.sfx); };
    $('q2').value = quality;
    $('q2').onchange = (e) => { S.settings.quality = e.target.value; save(); location.reload(); };
    $('reset-all').onclick = () => {
      if (confirm('Erase ALL progress, including achievements?')) { localStorage.removeItem(SAVE_KEY); location.reload(); }
    };
  }
}
function buyUpgrade(id) {
  const u = UPGRADES.find((x) => x.id === id);
  let n = 0;
  do {
    const c = upgradeCost(u);
    if (S.punya < c || S.up[id] >= u.max) break;
    S.punya -= c; S.up[id]++; n++;
  } while (buyMax);
  if (n) {
    audio.coin();
    applyStats();
    if (id === 'sevak') toast(`🙋 ${n > 1 ? n + ' new sevaks have' : 'A new sevak has'} joined the seva!`);
    checkAchievements();
    save();
  }
  renderShop();
}
function buyZone(k) {
  const z = ZONES[k];
  if (k !== S.zones || S.punya < z.cost) return;
  S.punya -= z.cost;
  S.zones++;
  applyStats();
  audio.aarti();
  closeShop();
  teleport(k);
  banner(`${z.hindi}`, `${z.name} is open — ${fmt(diyas.zoneCount[k])} more diyas await!`, false, 4);
  checkAchievements();
  save();
}
function teleport(k) {
  const d = diyas;
  let [x, z] = ZONES[k].center;
  // find a free spot near the zone's diyas
  const i = d.zoneStart[k] + Math.floor(d.zoneCount[k] / 2);
  if (k === 3) { x = 0; z = 46; }
  else if (k === 5) { x = 0; z = 89; }
  else if (k === 4) { x = d.pos[i * 3]; z = 17; }
  else { x = d.pos[i * 3]; z = 6; }
  if (!world.isFree(x, z)) { x = 0; z = 16; }
  player.pos.set(x, world.heightAt(x, z), z);
  player.y = player.pos.y;
  G.cam.yaw = k === 3 || k === 5 ? Math.PI : 0;
  if (k === 3 || k === 5) player.heading = 0;
  closeShop();
}

// ---------------------------------------------------------------- events: wind, vanar, golden diya
function updateEvents(dt) {
  // wind gust
  G.nextGust -= dt;
  if (G.nextGust <= 0 && !G.gust) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const zoneK = (Math.random() * S.zones) | 0;
    const s = diyas.zoneStart[zoneK], n = diyas.zoneCount[zoneK];
    const i = s + ((Math.random() * n) | 0);
    G.gust = { t: -3, dir, x: diyas.pos[i * 3], z: diyas.pos[i * 3 + 2], done: false };
    banner('🌬️ हवा! A gust of wind is coming', `${dir > 0 ? 'From the west' : 'From the east'} — near ${ZONES[zoneK].name}. Relight quickly!`, true, 3);
    G.nextGust = Math.max(12, (40 + Math.random() * 25) / (1 + S.night * 0.04));
  }
  if (G.gust) {
    const g = G.gust;
    g.t += dt;
    if (g.t > 0 && !g.done) {
      g.done = true;
      audio.wind(4);
      const zmin = g.z < 22 ? 0 : g.z - 25, zmax = g.z < 22 ? 21 : g.z + 25;
      fx.windStreaks(g.x, zmin, zmax, g.dir);
      const out = diyas.gust(g.x, 22, zmin, zmax, windChance());
      if (out > 0) setTimeout(() => toast(`🌬️ The wind snuffed out <b>${fmt(out)}</b> diyas`), 600);
    }
    const env = g.t > 0 ? Math.max(0, Math.sin(Math.min(1, g.t / 4) * Math.PI)) : Math.max(0, (g.t + 3) / 3) * 0.15;
    G.windVec.set(g.dir * env * 1.2, 0, 0);
    if (g.t > 4) { G.gust = null; G.windVec.set(0, 0, 0); }
  } else {
    G.windVec.set(Math.sin(G.time * 0.3) * 0.08, 0, Math.cos(G.time * 0.21) * 0.05);
  }
  // vanar
  G.nextMonkey -= dt;
  if (G.nextMonkey <= 0 && !monkey.active) {
    let i = -1;
    for (let k = 0; k < 40; k++) {
      const j = (Math.random() * diyas.unlockedEnd) | 0;
      if (diyas.lit[j] && diyas.zone[j] !== 5) { i = j; break; }
    }
    if (i >= 0) {
      const x = diyas.pos[i * 3], z = diyas.pos[i * 3 + 2];
      monkey.spawn(x, z, diyas.pos[i * 3 + 1]);
      audio.monkey();
      banner('🐒 Shararati vanar!', 'A naughty monkey is snuffing diyas — chase it down!', true, 3);
    }
    G.nextMonkey = 60 + Math.random() * 50;
  }
  if (monkey.active) {
    const r = monkey.update(dt, world, diyas, player);
    if (Math.random() < dt * 0.6) audio.monkey();
    if (r.caught) {
      const reward = Math.round(100 + incomeRate() * 45);
      S.punya += reward; S.lifetime += reward; S.monkeys++;
      questProgress('monkey', 1, true);
      banner('🐒 Pakad liya!', `The vanar drops a laddoo — +${fmt(reward)} ✦`, false, 2.5);
      audio.coin();
      checkAchievements();
    } else if (r.escaped) {
      toast('🐒 The vanar escaped into the trees…');
    }
  }
  // golden diya
  G.nextGolden -= dt;
  if (G.nextGolden <= 0 && !fx.golden.visible) {
    const i = (Math.random() * diyas.unlockedEnd) | 0;
    let x = diyas.pos[i * 3], z = diyas.pos[i * 3 + 2];
    if (z < 9.6) z = Math.min(9.4, z + 0.3);
    fx.golden.position.set(x, world.heightAt(x, z), z);
    fx.golden.visible = true;
    G.goldenT = 30;
    banner('🪙 Lakshmi ka Deep!', 'A golden diya has appeared — follow the beam of light!', false, 3);
    audio.bell(1320, 0.2); audio.bell(1760, 0.15, 0.2);
    G.nextGolden = 70 + Math.random() * 60;
  }
  if (fx.golden.visible) {
    G.goldenT -= dt;
    const d = Math.hypot(fx.golden.position.x - player.pos.x, fx.golden.position.z - player.pos.z);
    if (d < 1.8) {
      fx.golden.visible = false;
      G.lakshmiT = 20;
      const reward = Math.round(150 + incomeRate() * 30);
      S.punya += reward; S.lifetime += reward; S.goldens++;
      questProgress('golden', 1, true);
      banner('🪙 Lakshmi Kripa!', `x3 Punya for 20 seconds · +${fmt(reward)} ✦`, false, 3);
      fx.petalShower(player.pos.x, player.pos.y + 8, player.pos.z, 200, 8);
      audio.coin(); audio.bell(1320, 0.3, 0.3);
      checkAchievements();
    } else if (G.goldenT <= 0) fx.golden.visible = false;
  }
  // utsav
  if (G.utsavT > 0) {
    G.utsavT -= dt;
    G.utsavRocket = (G.utsavRocket || 0) - dt;
    if (G.utsavRocket <= 0) { fx.launch(-80 + Math.random() * 160, -12 - Math.random() * 30, 0.4); G.utsavRocket = 0.55; }
    if (G.utsavT <= 0) G.utsav = 0;
  } else if (G.utsav >= 1) {
    G.utsavT = 15 + 4 * up().utsav;
    S.utsavs++;
    banner('🥁 उत्सव! UTSAV!', 'Double Punya — the whole of Ayodhya celebrates!', false, 3);
    audio.dhol(64, 140); audio.shankh(0.2);
    checkAchievements();
  }
  if (G.lakshmiT > 0) G.lakshmiT -= dt;
}

// ---------------------------------------------------------------- input
const keys = {};
const input = { x: 0, z: 0, sprint: false };
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  keys[e.code] = true;
  if (G.phase === 'title') return;
  if (e.code === 'KeyB') { $('shop').classList.contains('hidden') ? openShop() : closeShop(); }
  if (e.code === 'Escape') {
    if (!$('shop').classList.contains('hidden')) closeShop();
    else if ($('summary').classList.contains('hidden') && $('message').classList.contains('hidden')) openShop('settings');
  }
  if (isModalOpen()) return;
  if (e.code === 'KeyF') actRocket();
  if (e.code === 'KeyG') actAnar();
  if (e.code === 'KeyR') actFloat();
  if (e.code === 'KeyP') { G.photo = !G.photo; document.body.classList.toggle('photo', G.photo); }
  if (e.code === 'Space' && G.phase === 'won' && G.wonT > 4) { G.wonT = 99; }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

let dragging = null;
canvas.addEventListener('pointerdown', (e) => { dragging = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); audio.init(); });
canvas.addEventListener('pointermove', (e) => {
  if (!dragging || dragging.id !== e.pointerId) return;
  const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
  dragging.x = e.clientX; dragging.y = e.clientY;
  G.cam.yaw -= dx * 0.005;
  G.cam.pitch = Math.max(0.05, Math.min(1.35, G.cam.pitch + dy * 0.004));
});
canvas.addEventListener('pointerup', () => (dragging = null));
canvas.addEventListener('pointercancel', () => (dragging = null));
canvas.addEventListener('wheel', (e) => { G.cam.dist = Math.max(3, Math.min(40, G.cam.dist * (1 + Math.sign(e.deltaY) * 0.1))); e.preventDefault(); }, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// touch joystick
const joy = { active: false, x: 0, z: 0 };
const jEl = $('joystick'), stick = $('stick');
jEl.addEventListener('pointerdown', (e) => { joy.active = e.pointerId; jEl.setPointerCapture(e.pointerId); moveJoy(e); audio.init(); });
jEl.addEventListener('pointermove', (e) => { if (joy.active === e.pointerId) moveJoy(e); });
const endJoy = () => { joy.active = false; joy.x = joy.z = 0; stick.style.transform = ''; };
jEl.addEventListener('pointerup', endJoy); jEl.addEventListener('pointercancel', endJoy);
function moveJoy(e) {
  const r = jEl.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const m = r.width / 2 - 10, l = Math.hypot(dx, dy);
  if (l > m) { dx *= m / l; dy *= m / l; }
  stick.style.transform = `translate(${dx}px, ${dy}px)`;
  joy.x = dx / m; joy.z = -dy / m;
}
let touchRun = false;
$('btn-run').addEventListener('pointerdown', () => { touchRun = !touchRun; $('btn-run').classList.toggle('on', touchRun); });
// pinch zoom
const touches = new Map();
canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2) {
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (touches.has('pinch')) G.cam.dist = Math.max(3, Math.min(40, G.cam.dist * touches.get('pinch') / d));
    touches.set('pinch', d);
  }
}, { passive: true });
canvas.addEventListener('touchend', () => touches.delete('pinch'));

$('act-rocket').onclick = actRocket;
$('act-anar').onclick = actAnar;
$('act-float').onclick = actFloat;
$('act-shop').onclick = () => openShop();
$('btn-menu').onclick = () => openShop('settings');
$('shop-close').onclick = closeShop;
$('btn-shop2').onclick = () => { $('summary').classList.add('hidden'); openShop('upgrades'); G.reopenSummary = true; };
document.querySelectorAll('.tab').forEach((t) => (t.onclick = () => { shopTab = t.dataset.tab; renderShop(); }));
$('shop').addEventListener('pointerdown', (e) => { if (e.target.id === 'shop') closeShop(); });

// ---------------------------------------------------------------- HUD update
let hudT = 0;
function updateHUD() {
  $('night-label').textContent = `Night ${S.night}`;
  const tEl = $('night-timer');
  tEl.textContent = G.phase === 'play' ? fmtTime(Math.max(0, G.timeLeft)) : G.phase === 'won' || G.phase === 'summary' ? '✓' : '';
  tEl.classList.toggle('urgent', G.phase === 'play' && G.timeLeft < 20);
  const frac = Math.min(1, diyas.litCount / Math.max(1, G.target));
  $('target-fill').style.width = frac * 100 + '%';
  $('target-fill').classList.toggle('done', G.phase !== 'play');
  $('lit-count').textContent = fmt(diyas.litCount);
  $('target-count').textContent = fmt(G.target);
  $('zone-hint').textContent = G.target > diyas.unlockedEnd ? `⚠ Only ${fmt(diyas.unlockedEnd)} diyas unlocked — open a new ghat in the Bazaar!` : '';
  $('punya').textContent = fmt(S.punya);
  const ir = incomeRate();
  $('persec').textContent = `+${ir < 100 ? ir.toFixed(1) : fmt(ir)} /s` + (S.ashirwad ? ` · 🙏${S.ashirwad}` : '');
  let b = '';
  if (G.utsavT > 0) b += `<span class="boost">🥁 Utsav x2 · ${Math.ceil(G.utsavT)}s</span>`;
  if (G.lakshmiT > 0) b += `<span class="boost">🪙 Lakshmi x3 · ${Math.ceil(G.lakshmiT)}s</span>`;
  if (up().bhajan) b += `<span class="boost">🎶 x${(1 + 0.25 * up().bhajan).toFixed(2)}</span>`;
  $('boosts').innerHTML = b;
  const c = $('combo');
  if (G.combo >= 5 && G.time - G.lastLightT < 1.5) {
    c.classList.remove('hidden');
    const txt = `🔥 ${G.combo} combo · x${comboMult().toFixed(2)}`;
    if (c.textContent !== txt) { c.textContent = txt; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  } else c.classList.add('hidden');
  $('utsav-fill').style.width = (G.utsavT > 0 ? (G.utsavT / (15 + 4 * up().utsav)) : G.utsav) * 100 + '%';
  $('utsav').classList.toggle('active', G.utsavT > 0);
  $('cost-rocket').textContent = fmt(costRocket());
  $('cost-anar').textContent = fmt(costAnar());
  $('cost-float').textContent = fmt(costFloat());
  $('act-rocket').classList.toggle('disabled', S.punya < costRocket());
  $('act-anar').classList.toggle('disabled', S.punya < costAnar());
  $('act-float').classList.toggle('disabled', S.punya < costFloat() || player.pos.z > 2.6);
  const canBuy = UPGRADES.some((u) => S.up[u.id] < u.max && S.punya >= upgradeCost(u)) || (S.zones < ZONES.length && S.punya >= ZONES[S.zones].cost);
  $('act-shop').classList.toggle('can-buy', canBuy);
  $('stamina').classList.toggle('show', player.stamina < 0.99);
  $('stamina-fill').style.width = player.stamina * 100 + '%';
  // golden arrow
  const arrow = $('arrow');
  if (fx.golden.visible) {
    const dx = fx.golden.position.x - player.pos.x, dz = fx.golden.position.z - player.pos.z;
    const ang = Math.atan2(dx, dz) - (G.cam.yaw + Math.PI);
    arrow.classList.remove('hidden');
    const r = Math.min(innerWidth, innerHeight) * 0.28;
    arrow.style.transform = `translate(${Math.sin(-ang) * r - 15}px, ${-Math.cos(ang) * r - 15}px) rotate(${-ang * 180 / Math.PI - 90}deg)`;
    $('arrow-dist').textContent = `${Math.round(Math.hypot(dx, dz))} m · ${Math.ceil(G.goldenT)}s`;
  } else arrow.classList.add('hidden');
  if (!$('shop').classList.contains('hidden')) $('shop-punya').textContent = fmt(S.punya);
}

// ---------------------------------------------------------------- tutorial hints
const TUTORIAL = [
  [0, 'Walk the ghat steps with <kbd>W A S D</kbd>', 'Your puja thali lights every diya you pass'],
  [12, 'Light diyas quickly in a row', 'to build a 🔥 combo and earn more Punya ✦'],
  [30, 'Open the Bazaar with <kbd>B</kbd> 🛕', 'Hire sevaks, buy ghee and unlock more ghats'],
  [55, 'Diyas burn out!', 'Keep walking the ghats — dim flames need fresh ghee'],
  [80, 'Celebrate! <kbd>F</kbd> fireworks · <kbd>G</kbd> anar', 'They fill the Utsav meter for double Punya'],
  [110, 'Walk down to the water and press <kbd>R</kbd>', 'to float a diya on the Sarayu 🪷'],
];
let tutT = 0;
function updateTutorial(dt) {
  if (S.tutorial >= TUTORIAL.length) return;
  tutT += dt;
  const [at, a, b] = TUTORIAL[S.tutorial];
  if (tutT >= at) { banner(a, b, false, 5); S.tutorial++; }
}

// ---------------------------------------------------------------- camera
function updateCamera(dt) {
  if (keys.KeyQ) G.cam.yaw += dt * 1.8;
  if (keys.KeyE) G.cam.yaw -= dt * 1.8;
  const target = new THREE.Vector3(player.pos.x, player.pos.y + 1.5, player.pos.z);
  let dist = G.cam.dist, yaw = G.cam.yaw, pitch = G.cam.pitch;
  if (G.phase === 'title') {
    yaw = G.time * 0.05 + Math.PI * 0.85; pitch = 0.32; dist = 34;
    target.set(0, 6, 16);
  }
  let lookAt = null;
  if (G.phase === 'won' && fx.vimanaActive()) {
    // stand behind the player and look up at the arriving Vimana
    const vp = fx.vimana.position;
    yaw = Math.atan2(player.pos.x - vp.x, player.pos.z - vp.z);
    pitch = 0.12; dist = Math.max(dist, 9);
    lookAt = vp;
  }
  if (G.camOverride) { // used by automated screenshots
    const o = G.camOverride;
    camera.position.set(...o.pos); G.cam.look.set(...o.look); camera.lookAt(G.cam.look); return;
  }
  G.cam.look.lerp(target, Math.min(1, dt * 8));
  const cx = G.cam.look.x + Math.sin(yaw) * Math.cos(pitch) * dist;
  const cz = G.cam.look.z + Math.cos(yaw) * Math.cos(pitch) * dist;
  let cy = G.cam.look.y + Math.sin(pitch) * dist;
  const gh = cz < 0 ? 0.6 : world.heightAt(cx, cz) + 0.5;
  cy = Math.max(cy, gh);
  camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * (lookAt ? 2 : 10)));
  if (lookAt) { G.cam.vLook = (G.cam.vLook || lookAt.clone()).lerp(lookAt, Math.min(1, dt * 3)); camera.lookAt(G.cam.vLook); }
  else { G.cam.vLook = null; camera.lookAt(G.cam.look); }
}

// ---------------------------------------------------------------- main loop
const clock = new THREE.Clock();
let saveT = 0, achT = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  G.time += dt;
  const t = G.time;
  const sim = !G.paused && G.phase !== 'title';

  // input → player
  input.x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x;
  input.z = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + joy.z;
  input.sprint = keys.ShiftLeft || keys.ShiftRight || touchRun;
  if (!sim) { input.x = input.z = 0; }
  player.update(dt, input, G.cam.yaw);

  if (sim) {
    S.playTime += dt;
    // player lights diyas
    player.lightBudget = Math.min(player.lightBudget + player.lightRate * dt, 3);
    while (player.lightBudget >= 1) {
      const i = diyas.findTarget(player.pos.x, player.pos.z, player.reach, player.pos.y);
      if (i < 0) { player.lightBudget = Math.min(player.lightBudget, 1); break; }
      diyas.light(i, 'player');
      player.lightBudget -= 1;
    }
    const sr = sevakRate(), ss = sevakSpeed();
    for (const s of sevaks) s.update(dt, sr, 1.3, ss);
    diyas.update(dt, t);
    G.floating = fx.activeFloating();
    addPunya(incomeRate() * dt);
    S.maxHeld = Math.max(S.maxHeld, diyas.litCount);
    questProgress('hold', diyas.litCount, false);
    updateEvents(dt);
    updateTutorial(dt);
    if (G.phase === 'play') {
      G.timeLeft -= dt;
      if (diyas.litCount >= G.target) winNight();
      else if (G.timeLeft <= 0) loseNight();
    } else if (G.phase === 'won') {
      G.wonT += dt;
      if (G.wonT > 19) showSummary(true);
    }
    // ambient fireworks from the far bank and from boats
    G.ambientRocket -= dt;
    if (G.ambientRocket <= 0) {
      if (Math.random() < 0.6) fx.launch(-300 + Math.random() * 600, -175 - Math.random() * 20, 1.5, null, 26 + Math.random() * 14);
      else fx.launch(-100 + Math.random() * 200, -20 - Math.random() * 40, 0.4);
      G.ambientRocket = 4 + Math.random() * 9;
    }
    saveT += dt; achT += dt;
    if (achT > 1) { achT = 0; checkAchievements(); }
    if (saveT > 10) { saveT = 0; save(); }
  } else {
    diyas.update(G.phase === 'title' ? dt : 0, t);
    if (G.phase === 'title') {
      // keep the title scene glowing with random diyas and festive fireworks
      for (let k = 0; k < 40; k++) {
        const i = (Math.random() * diyas.unlockedEnd) | 0;
        if (!diyas.lit[i]) { diyas.lit[i] = 1; diyas.litCount++; diyas.igniteT[i] = t; diyas.oil[i] = 9999; }
      }
      G.ambientRocket -= dt;
      if (G.ambientRocket <= 0) { fx.launch(-80 + Math.random() * 160, -20 - Math.random() * 40, 0.4); G.ambientRocket = 0.8 + Math.random() * 1.6; }
    }
  }
  diyas.flameUniforms.uWind.value.copy(G.windVec);
  fx.update(dt, t, player, G.windVec);
  world.update(t, dt, Math.min(1, diyas.litCount / 3000));
  updateCamera(dt);
  hudT += dt;
  if (hudT > 0.1 && G.phase !== 'title') { hudT = 0; updateHUD(); }
  composer.render();
}

// ---------------------------------------------------------------- boot
function dailyAndOffline() {
  const msgs = [];
  // offline seva by sevaks
  const away = Math.min(8 * 3600, (Date.now() - (S.lastSave || Date.now())) / 1000);
  if (hadSave && away > 120 && up().sevak > 0) {
    const held = Math.min(diyas.unlockedEnd, up().sevak * sevakRate() * diyas.burnTime);
    const earned = Math.round(held * 0.1 * (1 + 0.25 * up().bhajan) * (1 + 0.1 * S.ashirwad) * away * 0.15);
    if (earned > 0) {
      S.punya += earned; S.lifetime += earned;
      msgs.push(`<p>🙋 While you were away (${Math.floor(away / 3600)}h ${Math.floor((away % 3600) / 60)}m), your <b>${up().sevak}</b> sevaks kept the diyas burning and earned <b>${fmt(earned)} ✦</b>.</p>`);
    }
  }
  const today = new Date().toDateString();
  if (S.lastDay !== today) {
    const yesterday = new Date(Date.now() - 864e5).toDateString();
    S.streak = S.lastDay === yesterday ? S.streak + 1 : 1;
    S.lastDay = today;
    const reward = Math.round(100 * S.streak * Math.max(1, S.night) * (1 + 0.1 * S.ashirwad));
    S.punya += reward; S.lifetime += reward;
    msgs.push(`<p>🎁 <b>Daily prasad</b> — day ${S.streak} of your streak: <b>+${fmt(reward)} ✦</b><br><small>Come back tomorrow for a bigger blessing!</small></p>`);
  }
  if (msgs.length) showMessage(`<div class="sum-title">स्वागत है!</div>${msgs.join('')}`);
}

function begin() {
  audio.init();
  audio.setMusic(S.settings.music); audio.setSfx(S.settings.sfx);
  $('title').classList.add('hidden');
  $('hud').classList.remove('hidden');
  diyas.resetAll();
  monkey.active = false;
  player.pos.set(0, world.heightAt(0, 7.8), 7.8);
  player.y = player.pos.y;
  G.cam.yaw = 0; G.cam.pitch = 0.42;
  ensureQuests(); renderQuests();
  applyStats();
  G.phase = 'play';
  startNight(S.night);
  dailyAndOffline();
  save();
}

$('btn-play').onclick = begin;
$('quality-select').onchange = (e) => { S.settings.quality = e.target.value; save(); location.reload(); };
addEventListener('visibilitychange', () => { if (document.hidden && G.phase !== 'title') save(); });
addEventListener('beforeunload', () => { if (G.phase !== 'title') save(); });

applyStats();
diyas.setUnlockedZones(ZONES.length); // title screen: show the whole city glowing
if (hadSave) {
  $('btn-play').textContent = `🪔 Continue — Night ${S.night}`;
  $('continue-info').textContent = `✦ ${fmt(S.punya)} Punya · ${fmt(S.totalLit)} diyas lit · ${up().sevak} sevaks`;
}
renderer.compile(scene, camera);
$('loading').classList.add('hidden');
$('title').classList.remove('hidden');
frame();
// debugging handle (used by automated screenshots)
window.__deepotsav = { G, get S() { return S; }, player, diyas, fx, camera, begin, world };
