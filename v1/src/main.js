// Arbuz Express: boot, input, camera, HUD and channel switching.
import * as THREE from 'three';
import { Gfx, QUALITIES } from './gfx.js';
import { Train, HEAD_Y } from './train.js';
import { WORLDS, buildWorld } from './worlds.js';
import { Sound } from './audio.js';
import { fruitTextures } from './tex.js';

const $ = (id) => document.getElementById(id);
const pad2 = (n) => String(n).padStart(2, '0');
const MILESTONES = { 12: 'MAŁPA ZADOWOLONA', 16: 'TO JUŻ JEST TIR', 24: 'OWOCOWA ANAKONDA', 36: 'WIDAĆ GO Z KOSMOSU', 50: 'PKP INTERCITY PŁACZE', 79: 'KONIEC OWOCÓW NA ŚWIECIE' };

const video = $('vid');
const gfx = new Gfx($('gl'));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 1300);
const hemi = new THREE.HemisphereLight('#ffffff', '#888888', 2);
const sun = new THREE.DirectionalLight('#ffffff', 1.5);
sun.position.set(40, 80, 30);
scene.add(hemi, sun);
scene.fog = new THREE.Fog('#ffffff', 60, 340);

const fruits = fruitTextures();
const videoTex = new THREE.VideoTexture(video);
videoTex.colorSpace = THREE.SRGBColorSpace;
const train = new Train(scene, fruits);
const ctx = { videoTex, fruits, shellGeo: train.shellGeo, topGeo: train.topGeo, eyeGeo: train.eyeGeo, shellMat: train.shellMat, topMat: train.topMat };
const sound = new Sound();

const state = {
  running: false,
  ch: 0,
  cam: 0,
  t: 0,
  play: 0,
  steer: 0,
  boost: 0,
  boostHeld: false,
  hop: false,
  honk: false,
  intro: 0,
  zoom: 0,
  punch: 0,
  aspect: 1,
  subT: 0,
  subI: 0,
  clock: -1,
  staticT: 0,
  picks: 0,
  bassOn: false,
};
const keys = new Set();
const touches = new Map();
const worlds = [];
let world = null;
let last = 0;
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
const vA = new THREE.Vector3();
const vB = new THREE.Vector3();
const env = { camera, beat: 0, head: train.head, honk: false, dt: 0 };
const opts = { steer: 0, speed: 9, hop: false, beat: 0, boost: 0, lowG: false, stare: false, camera, bits: [] };

function pop(text, big) {
  const el = document.createElement('div');
  el.className = big ? 'pop big' : 'pop';
  el.textContent = text;
  el.style.left = 28 + Math.random() * 44 + '%';
  el.style.top = (big ? 26 : 34) + Math.random() * 22 + '%';
  el.style.setProperty('--tilt', (Math.random() * 24 - 12).toFixed(1) + 'deg');
  $('pops').appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

function updateCount() {
  $('osd-count').textContent = 'WAGONY ' + pad2(train.count - 1);
}

function showStatic() {
  const c = $('static');
  const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height);
  c.style.display = 'block';
  state.staticT = 0.38;
  const draw = () => {
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    state.staticT -= 1 / 30;
    if (state.staticT > 0) setTimeout(draw, 33);
    else c.style.display = 'none';
  };
  draw();
}

function setChannel(i, quiet) {
  const w = WORLDS[i];
  state.ch = i;
  if (world) scene.remove(world.group);
  world = worlds[i] || (worlds[i] = buildWorld(i, ctx));
  scene.add(world.group);
  scene.fog.color.set(w.fog[0]);
  scene.fog.near = w.fog[1];
  scene.fog.far = w.fog[2];
  hemi.color.set(w.hemi[0]);
  hemi.groundColor.set(w.hemi[1]);
  hemi.intensity = w.hemi[2];
  sun.color.set(w.sun[0]);
  sun.intensity = w.sun[1];
  gfx.uniforms.sat.value = w.post.sat;
  gfx.uniforms.noise.value = w.post.noise;
  gfx.uniforms.vig.value = w.post.vig;
  train.setFruit(w.fruit);
  train.setLook(w.look);
  train.beamMat.color.set(w.beam);
  train.reset();
  opts.lowG = !!w.lowG;
  opts.stare = !!w.stare;
  opts.bits = w.bits;
  state.intro = 2.6;
  state.subT = 1.2;
  state.subI = 0;
  const h = train.head;
  camPos.set(h.x - 3.4, 1.7, h.z + 10.5);
  camLook.set(h.x, 1.6, h.z);
  $('osd-ch').textContent = 'CH ' + pad2(i + 1);
  $('osd-name').textContent = w.name;
  $('hud').dataset.ch = w.id;
  $('sub').textContent = '';
  updateCount();
  if (sound.ready) {
    sound.playMusic(w.track, w.rate, w.echo);
    if (!quiet) sound.sfx('szum', 0.8);
  }
  if (!quiet) showStatic();
}

function setQuality(q) {
  gfx.q = q;
  state.aspect = gfx.resize();
  camera.aspect = state.aspect;
  camera.updateProjectionMatrix();
  if (sound.ctx) sound.setQuality(QUALITIES[q]);
  $('b-q').textContent = QUALITIES[q].label;
  document.querySelectorAll('#menu [data-q]').forEach((b) => b.classList.toggle('on', +b.dataset.q === q));
}

function honk() {
  state.honk = true;
  state.zoom = 0.6;
  state.punch = 1;
  train.lookT = 1.1;
  sound.sfx('honk', 1, 0.92 + Math.random() * 0.16);
  if (Math.random() < 0.35) sound.sfx('malpa', 0.7, 0.9 + Math.random() * 0.3);
}

function hop() {
  if (train.head.y > 0.001) return;
  state.hop = true;
  sound.sfx('plop', 0.7, 0.55);
}

function toggleMute() {
  sound.setMuted(!sound.muted);
  $('b-mute').textContent = sound.muted ? 'CISZA' : 'DŹWIĘK';
}

function nextCam() {
  state.cam = (state.cam + 1) % 3;
  state.intro = 0;
  pop(['KAMERA: POŚCIG', 'KAMERA: JAK W FILMIE', 'KAMERA: DRON'][state.cam]);
}

function rig(mode, pos, look) {
  const h = train.head;
  const fx = Math.sin(h.th);
  const fz = Math.cos(h.th);
  const rx = -fz;
  const rz = fx;
  if (mode === 0) {
    pos.set(h.x - fx * 6.2 + rx * 2.3, 3.9 + h.y * 0.5, h.z - fz * 6.2 + rz * 2.3);
    look.set(h.x + fx * 2.5, 1.9 + h.y * 0.6, h.z + fz * 2.5);
    return 5;
  }
  if (mode === 1) {
    pos.set(h.x + fx * 6.5 + rx * 4.4, 2.8 + h.y * 0.4, h.z + fz * 6.5 + rz * 4.4);
    look.set(h.x - fx * 1.6, 1.4 + h.y * 0.6, h.z - fz * 1.6);
    return 7;
  }
  pos.set(h.x - fx * 7, 42, h.z - fz * 7);
  look.set(h.x + fx * 2, 0, h.z + fz * 2);
  return 3;
}

function updateCamera(dt) {
  const h = train.head;
  const k = rig(state.cam, vA, vB);
  if (state.zoom > 0) vB.set(h.x, HEAD_Y + h.y, h.z);
  if (state.intro > 0) {
    state.intro -= dt;
    if (state.intro <= 0) {
      camPos.copy(vA);
      camLook.copy(vB);
    } else {
      camLook.lerp(vB.set(h.x, 1.5 + h.y, h.z), 1 - Math.exp(-dt * 10));
    }
  } else {
    camPos.lerp(vA, 1 - Math.exp(-dt * k));
    camLook.lerp(vB, 1 - Math.exp(-dt * (state.zoom > 0 ? 16 : 8)));
  }
  const amp = 0.05 + state.boost * 0.28 + state.punch * 0.25;
  const t = state.t;
  camera.position.set(camPos.x + Math.sin(t * 13.1) * amp * 0.6 + Math.sin(t * 1.9) * 0.08, camPos.y + Math.sin(t * 17.3) * amp + Math.sin(t * 2.6) * 0.06, camPos.z + Math.cos(t * 11.7) * amp * 0.6);
  camera.lookAt(camLook);
  camera.rotateZ(Math.sin(t * 0.8) * 0.02 + Math.sin(t * 23) * state.boost * 0.03);
  const base = state.aspect < 1 ? 82 : 62;
  const target = state.zoom > 0 ? 20 : base + env.beat * 3 + state.boost * 24;
  camera.fov += (target - camera.fov) * (1 - Math.exp(-dt * (state.zoom > 0 ? 18 : 7)));
  camera.updateProjectionMatrix();
  state.zoom = Math.max(0, state.zoom - dt);
  state.punch = Math.max(0, state.punch - dt * 3);
}

function update(dt) {
  const w = WORLDS[state.ch];
  state.t += dt;
  state.play += dt;
  let steer = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) steer -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) steer += 1;
  for (const x of touches.values()) steer += x < window.innerWidth / 2 ? -1 : 1;
  steer = Math.max(-1, Math.min(1, steer));
  state.steer += (steer - state.steer) * Math.min(1, dt * 9);
  const held = state.boostHeld || keys.has('ShiftLeft') || keys.has('ShiftRight');
  const before = state.boost;
  state.boost += ((held ? 1 : 0) - state.boost) * Math.min(1, dt * 6);
  if (Math.abs(state.boost - before) > 0.0005 && sound.ready) sound.setBoost(state.boost);
  if (state.boost > 0.5 !== state.bassOn) {
    state.bassOn = state.boost > 0.5;
    $('hud').classList.toggle('bass', state.bassOn);
  }

  env.beat = sound.beat(dt, state.t);
  env.dt = dt;
  env.honk = state.honk;
  opts.steer = state.steer;
  opts.speed = 9 + state.boost * 13;
  opts.hop = state.hop;
  opts.beat = env.beat;
  opts.boost = state.boost;
  const picked = train.update(dt, state.t, opts);
  state.hop = false;
  for (let i = 0; i < picked; i++) {
    state.picks++;
    state.punch = 0.7;
    if (train.addWagon()) {
      updateCount();
      pop('+1 ' + w.unit);
      const m = MILESTONES[train.count - 1];
      if (m) {
        pop(m, true);
        sound.sfx('malpa', 0.8, 1);
      }
    } else {
      pop('POCIĄG PEŁNY');
    }
    sound.sfx('plop', 1, 0.9 + Math.random() * 0.5);
    if (state.picks % 5 === 0) sound.sfx('malpa', 0.5, 1.1 + Math.random() * 0.3);
  }
  world.update(state.t, env);
  state.honk = false;
  updateCamera(dt);

  gfx.uniforms.time.value = state.t;
  gfx.uniforms.deep.value = state.boost;
  gfx.uniforms.crush.value = gfx.baseCrush;

  state.subT -= dt;
  if (state.subT <= 0) {
    const sub = $('sub');
    if (sub.textContent) {
      sub.textContent = '';
      state.subT = 2.2;
    } else {
      sub.textContent = w.captions[state.subI % w.captions.length];
      state.subI++;
      state.subT = 4.4;
    }
  }
  const sec = Math.floor(state.play);
  if (sec !== state.clock) {
    state.clock = sec;
    $('clock').textContent = w.id === 'noc' ? '3:00:' + pad2(sec % 60) : Math.floor(sec / 3600) + ':' + pad2(Math.floor(sec / 60) % 60) + ':' + pad2(sec % 60);
  }
}

function frame(now) {
  if (!state.running) return;
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  update(dt);
  gfx.render(scene, camera);
}

function start(i) {
  sound.resume();
  video.play().catch(() => {});
  $('menu').hidden = true;
  $('hud').hidden = false;
  document.body.classList.add('play');
  setQuality(gfx.q);
  setChannel(i, true);
  if (sound.ready) sound.sfx('malpa', 0.8, 1);
  state.running = true;
  last = performance.now();
  requestAnimationFrame(frame);
}

function toMenu() {
  state.running = false;
  sound.stopMusic();
  $('menu').hidden = false;
  $('hud').hidden = true;
  document.body.classList.remove('play');
}

async function warm() {
  const r = gfx.renderer;
  for (const f of Object.values(fruits)) {
    r.initTexture(f.skin);
    r.initTexture(f.top);
  }
  r.setRenderTarget(gfx.rt);
  for (let i = 0; i < WORLDS.length; i++) {
    worlds[i] = buildWorld(i, ctx);
    scene.add(worlds[i].group);
    train.setLook(WORLDS[i].look);
    await r.compileAsync(scene, camera);
    scene.remove(worlds[i].group);
  }
  r.setRenderTarget(null);
  await r.compileAsync(gfx.postScene, gfx.postCam);
}

function hold(el, down, up) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      el.blur();
    }
    el.classList.add('down');
    down();
  });
  const end = (e) => {
    e.stopPropagation();
    el.classList.remove('down');
    if (up) up();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function boot() {
  const list = $('channels');
  WORLDS.forEach((w, i) => {
    const b = document.createElement('button');
    b.className = 'chan';
    b.innerHTML = `<i>${w.icon}</i><b>KANAŁ ${i + 1}</b><span>${w.name}</span><small>${w.sub}</small>`;
    b.disabled = true;
    b.addEventListener('click', () => start(i));
    list.appendChild(b);
  });
  document.querySelectorAll('#menu [data-q]').forEach((b) => b.addEventListener('click', () => setQuality(+b.dataset.q)));

  hold($('b-hop'), hop);
  hold($('b-honk'), honk);
  hold($('b-bass'), () => (state.boostHeld = true), () => (state.boostHeld = false));
  hold($('b-ch'), () => setChannel((state.ch + 1) % WORLDS.length));
  hold($('b-cam'), nextCam);
  hold($('b-q'), () => setQuality((gfx.q + 1) % QUALITIES.length));
  hold($('b-mute'), toggleMute);
  hold($('b-menu'), toMenu);

  const gl = $('gl');
  gl.addEventListener('pointerdown', (e) => {
    touches.set(e.pointerId, e.clientX);
    gl.setPointerCapture(e.pointerId);
  });
  gl.addEventListener('pointermove', (e) => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, e.clientX);
  });
  const lift = (e) => touches.delete(e.pointerId);
  gl.addEventListener('pointerup', lift);
  gl.addEventListener('pointercancel', lift);
  gl.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (!state.running) return;
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') hop();
    else if (e.code === 'KeyH' || e.code === 'KeyE' || e.code === 'Enter') honk();
    else if (e.code === 'KeyC') nextCam();
    else if (e.code === 'KeyQ') setQuality((gfx.q + 1) % QUALITIES.length);
    else if (e.code === 'KeyM') toggleMute();
    else if (e.code === 'Escape') toMenu();
    else if (/^Digit[1-5]$/.test(e.code)) setChannel(+e.code.slice(5) - 1);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => {
    keys.clear();
    touches.clear();
    state.boostHeld = false;
  });
  window.addEventListener('resize', () => setQuality(gfx.q));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sound.suspend();
    else if (state.running) {
      sound.resume();
      last = performance.now();
    }
  });

  setQuality(1);
  sound.init();
  Promise.allSettled([sound.load(), warm()]).then(() => {
    $('loading').hidden = true;
    list.querySelectorAll('button').forEach((b) => (b.disabled = false));
  });
  window.arbuz = {
    state,
    train,
    gfx,
    sound,
    keys,
    start,
    setChannel,
    setQuality,
    honk,
    hop,
    nextCam,
    step(n, dt = 1 / 60) {
      for (let i = 0; i < n; i++) update(dt);
      gfx.render(scene, camera);
    },
  };
}

boot();
