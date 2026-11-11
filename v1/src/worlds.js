// Arbuz Express: the five channels and everything that stands in them.
import * as THREE from 'three';
import { part, merge, limb, spike, rng, VC, VCB } from './gfx.js';
import * as T from './tex.js';

const TAU = Math.PI * 2;
const HALF = Math.PI / 2;
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const ball = (r, ws = 7, hs = 5) => new THREE.SphereGeometry(r, ws, hs);
const cyl = (a, b, h, seg = 8) => new THREE.CylinderGeometry(a, b, h, seg);
const cone = (r, h, seg = 6) => new THREE.ConeGeometry(r, h, seg);

function ground(g, map, lit = true) {
  const mat = lit ? new THREE.MeshLambertMaterial({ map }) : new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-HALF), mat);
  g.add(mesh);
  return mesh;
}

function flat(g, geo, mat, x, y, z, ry = 0) {
  const mesh = new THREE.Mesh(geo.rotateX(-HALF), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  g.add(mesh);
  return mesh;
}

function backdrop(g, skyTex, sunTex, sunDir, sunSize, anims) {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(520, 24, 12), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  g.add(dome);
  let sprite = null;
  let dir = null;
  if (sunTex) {
    sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, fog: false, depthWrite: false }));
    sprite.scale.setScalar(sunSize);
    dir = new THREE.Vector3(sunDir[0], sunDir[1], sunDir[2]).normalize().multiplyScalar(430);
    g.add(sprite);
  }
  anims.push((t, e) => {
    dome.position.copy(e.camera.position);
    if (sprite) sprite.position.copy(e.camera.position).add(dir);
  });
}

function inst(g, geo, mat, list) {
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  const d = new THREE.Object3D();
  list.forEach((o, i) => {
    d.position.set(o.x, o.y || 0, o.z);
    d.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
    const s = o.s === undefined ? 1 : o.s;
    if (typeof s === 'number') d.scale.setScalar(s);
    else d.scale.set(s[0], s[1], s[2]);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
    if (o.color) im.setColorAt(i, new THREE.Color(o.color));
  });
  im.frustumCulled = false;
  g.add(im);
  return im;
}

function scatter(rnd, n, rMin, rMax, fn) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU;
    const r = Math.sqrt(rMin * rMin + rnd() * (rMax * rMax - rMin * rMin));
    list.push(fn(Math.cos(a) * r, Math.sin(a) * r, i));
  }
  return list;
}

function movers(rnd, n, o) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU;
    const d = o.spread[0] + rnd() * (o.spread[1] - o.spread[0]);
    const r = o.radius[0] + rnd() * (o.radius[1] - o.radius[0]);
    const speed = (o.speed[0] + rnd() * (o.speed[1] - o.speed[0])) * (rnd() < 0.5 ? -1 : 1);
    list.push({
      cx: Math.cos(a) * d,
      cz: Math.sin(a) * d,
      r,
      w: speed / r,
      ph: rnd() * TAU,
      y: (o.y ? o.y[0] + rnd() * (o.y[1] - o.y[0]) : 0),
      bob: o.bob || 0,
      s: o.s ? o.s[0] + rnd() * (o.s[1] - o.s[0]) : 1,
      jump: o.jump || 0,
    });
  }
  return list;
}

function herd(g, geo, mat, list, anims) {
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  im.frustumCulled = false;
  g.add(im);
  const d = new THREE.Object3D();
  anims.push((t, e) => {
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const a = m.ph + t * m.w;
      d.position.set(m.cx + Math.cos(a) * m.r, m.y + Math.sin(t * 1.3 + m.ph) * m.bob + e.beat * m.jump, m.cz + Math.sin(a) * m.r);
      d.rotation.set(0, m.w > 0 ? -a : Math.PI - a, 0);
      d.scale.setScalar(m.s);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  });
  return im;
}

function kino(g, ctx, x, z, text) {
  const k = new THREE.Group();
  k.add(
    new THREE.Mesh(
      merge([
        part(box(15.6, 13.2, 0.5), '#24242c', [0, 9.6, -0.3]),
        limb([-6, 0, -0.3], [-6, 3.2, -0.3], 0.38, '#5a5a66'),
        limb([6, 0, -0.3], [6, 3.2, -0.3], 0.38, '#5a5a66'),
      ]),
      VC
    )
  );
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(14.4, 12.08), new THREE.MeshBasicMaterial({ map: ctx.videoTex }));
  screen.position.set(0, 9.6, 0);
  k.add(screen);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.25), new THREE.MeshBasicMaterial({ map: T.label(text, '#ffe600', '#1b1bb8') }));
  sign.position.set(0, 17.5, 0);
  k.add(sign);
  k.position.set(x, 0, z);
  k.rotation.y = Math.atan2(-x, -z);
  g.add(k);
}

function houseGeo(wall, roof, door) {
  return merge([
    part(box(9, 7, 8), wall, [0, 3.5, 0]),
    part(cone(7.4, 3.6, 4), roof, [0, 8.8, 0], [0, Math.PI / 4, 0]),
    part(box(2.6, 3.4, 0.3), door, [0, 1.7, 4.05]),
    part(cyl(1.3, 1.3, 0.3, 12), door, [0, 3.4, 4.05], [HALF, 0, 0]),
    part(box(1.5, 1.5, 0.3), '#f4f1ff', [-3, 4.4, 4.05]),
    part(box(1.5, 1.5, 0.3), '#f4f1ff', [3, 4.4, 4.05]),
  ]);
}

function treeGeo(trunk, a, b) {
  return merge([
    part(cyl(0.28, 0.42, 2.6, 5), trunk, [0, 1.3, 0]),
    part(new THREE.IcosahedronGeometry(1.7, 0), a, [0, 3.7, 0], [0, 0, 0], [1, 1.15, 1]),
    part(new THREE.IcosahedronGeometry(1.1, 0), b, [0.7, 4.9, 0.2]),
  ]);
}

function palmGeo() {
  const parts = [
    limb([0, 0, 0], [0.3, 2.4, 0], 0.3, '#8a6b3d'),
    limb([0.3, 2.4, 0], [0.2, 4.8, 0.2], 0.25, '#8a6b3d'),
    limb([0.2, 4.8, 0.2], [0.5, 7, 0.1], 0.2, '#8a6b3d'),
  ];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    parts.push(spike([0.5, 7, 0.1], [0.5 + Math.cos(a) * 3.2, 6.1, 0.1 + Math.sin(a) * 3.2], 0.6, '#4f9a3c', 4));
  }
  for (let i = 0; i < 3; i++) parts.push(part(ball(0.25, 5, 4), '#5a3d22', [0.5 + Math.cos(i * 2.1) * 0.35, 6.6, 0.1 + Math.sin(i * 2.1) * 0.35]));
  return merge(parts);
}

function camelGeo() {
  const c = '#c9954c';
  const d = '#ad7c3a';
  return merge([
    part(box(1.1, 1.2, 2.6), c, [0, 2.2, 0]),
    part(ball(0.62, 6, 5), c, [0, 3.0, -0.1], [0, 0, 0], [0.8, 1, 1]),
    part(box(1.2, 0.9, 1.3), '#3a6fd8', [0, 2.6, -0.1]),
    limb([0, 2.5, 1.2], [0, 3.9, 1.9], 0.25, c),
    part(box(0.5, 0.5, 1.0), c, [0, 4.0, 2.2]),
    part(ball(0.06, 4, 3), '#111111', [-0.26, 4.1, 2.4]),
    part(ball(0.06, 4, 3), '#111111', [0.26, 4.1, 2.4]),
    ...[[-0.38, 1], [0.38, 1], [-0.38, -1], [0.38, -1]].map(([x, z]) => part(box(0.25, 1.7, 0.25), d, [x, 0.85, z])),
  ]);
}

function carpetGeo() {
  return merge([
    part(box(2.4, 0.12, 3.6), '#7a3ad8'),
    part(box(1.8, 0.14, 3.0), '#f2b632'),
    part(box(1.2, 0.16, 2.4), '#7a3ad8'),
    part(ball(0.45, 6, 5), '#3b2b23', [0, 0.5, -0.2]),
    part(ball(0.32, 6, 5), '#3b2b23', [0, 1.15, -0.15]),
    part(ball(0.2, 6, 4), '#d9a68e', [0, 1.12, 0.05], [0, 0, 0], [1, 1, 0.6]),
  ]);
}

function elephantGeo() {
  const c = '#8f919c';
  const d = '#7b7d88';
  return merge([
    part(box(2.4, 2.1, 3.6), c, [0, 2.55, 0]),
    part(box(1.7, 1.8, 1.5), c, [0, 3.0, 2.4]),
    limb([0, 2.7, 3.1], [0, 0.9, 3.5], 0.28, d),
    part(box(0.15, 1.7, 1.3), d, [-1.05, 3.1, 2.0], [0, -0.35, 0]),
    part(box(0.15, 1.7, 1.3), d, [1.05, 3.1, 2.0], [0, 0.35, 0]),
    ...[[-0.8, 1.3], [0.8, 1.3], [-0.8, -1.3], [0.8, -1.3]].map(([x, z]) => part(box(0.75, 1.6, 0.75), d, [x, 0.8, z])),
    part(box(2.6, 1.2, 1.5), '#ffc21a', [0, 3.1, -0.2]),
    part(box(2.65, 0.25, 2.3), '#e83e8c', [0, 3.7, -0.2]),
    limb([-0.45, 2.5, 3.1], [-0.6, 2.1, 3.9], 0.07, '#ffffff', 4),
    limb([0.45, 2.5, 3.1], [0.6, 2.1, 3.9], 0.07, '#ffffff', 4),
    part(ball(0.09, 5, 4), '#111111', [-0.6, 3.3, 3.16]),
    part(ball(0.09, 5, 4), '#111111', [0.6, 3.3, 3.16]),
  ]);
}

function tukGeo() {
  const k = '#1b1b1f';
  return merge([
    part(box(1.7, 0.9, 2.6), '#f4c22b', [0, 0.95, -0.2]),
    part(box(1.5, 0.7, 0.9), '#2f9e44', [0, 0.85, 1.3]),
    part(box(1.75, 0.15, 2.5), k, [0, 2.3, -0.1]),
    ...[[-0.78, 0.95], [0.78, 0.95], [-0.78, -1.3], [0.78, -1.3]].map(([x, z]) => part(box(0.1, 0.9, 0.1), k, [x, 1.85, z])),
    part(cyl(0.33, 0.33, 0.2, 8), '#111111', [0, 0.33, 1.55], [0, 0, HALF]),
    part(cyl(0.33, 0.33, 0.2, 8), '#111111', [-0.85, 0.33, -0.9], [0, 0, HALF]),
    part(cyl(0.33, 0.33, 0.2, 8), '#111111', [0.85, 0.33, -0.9], [0, 0, HALF]),
    part(ball(0.16, 5, 4), '#fff7c2', [0, 1.0, 1.78]),
  ]);
}

function palaceGeo() {
  const w = '#fbf4ee';
  const s = '#efe2d6';
  const gold = '#f2b632';
  const dark = '#c4ab9c';
  const parts = [
    part(box(64, 2.4, 64), s, [0, 1.2, 0]),
    part(box(30, 16, 30), w, [0, 10.4, 0]),
    part(cyl(8.5, 9.5, 4, 12), w, [0, 20.4, 0]),
    part(ball(9.6, 12, 8), w, [0, 28.5, 0], [0, 0, 0], [1, 1.15, 1]),
    part(cone(1.6, 7, 6), gold, [0, 41.5, 0]),
  ];
  for (let i = 0; i < 4; i++) {
    const a = i * HALF;
    const sx = Math.sin(a);
    const cz = Math.cos(a);
    parts.push(part(box(8, 11, 0.8), dark, [sx * 15, 8.6, cz * 15], [0, a, 0]));
    parts.push(part(cyl(4, 4, 0.8, 12), dark, [sx * 15, 14.1, cz * 15], [HALF, 0, a]));
  }
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    parts.push(part(cyl(2.6, 2.6, 3, 8), w, [x * 11, 19.9, z * 11]));
    parts.push(part(ball(3, 8, 6), w, [x * 11, 22.4, z * 11]));
    parts.push(part(cone(0.5, 2.2, 5), gold, [x * 11, 26.2, z * 11]));
    parts.push(part(cyl(1.5, 1.9, 32, 8), w, [x * 29, 18.4, z * 29]));
    parts.push(part(cyl(2.4, 2.4, 0.8, 8), s, [x * 29, 25, z * 29]));
    parts.push(part(ball(2.1, 8, 6), w, [x * 29, 35.6, z * 29]));
    parts.push(part(cone(0.5, 2.6, 5), gold, [x * 29, 38.6, z * 29]));
  }
  return merge(parts);
}

function pavilionGeo() {
  const parts = [part(box(4.6, 0.4, 4.6), '#ffffff', [0, 3.5, 0]), part(ball(2, 8, 6), '#ffffff', [0, 4.4, 0], [0, 0, 0], [1, 0.95, 1]), part(cone(0.3, 1.4, 5), '#f2b632', [0, 6.8, 0])];
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) parts.push(part(cyl(0.25, 0.25, 3.4, 6), '#f4f4f4', [x * 1.8, 1.7, z * 1.8]));
  return merge(parts);
}

function dancerGeo() {
  const f = '#3b2b23';
  const s = '#d9a68e';
  return merge([
    part(ball(0.5, 7, 6), f, [0, 1.5, 0], [0, 0, 0], [1, 1.3, 0.9]),
    part(ball(0.42, 7, 6), f, [0, 2.55, 0]),
    part(ball(0.3, 6, 5), s, [0, 2.5, 0.28], [0, 0, 0], [1, 1, 0.5]),
    part(ball(0.14, 5, 4), s, [-0.42, 2.6, 0]),
    part(ball(0.14, 5, 4), s, [0.42, 2.6, 0]),
    part(ball(0.05, 4, 3), '#111111', [-0.1, 2.62, 0.42]),
    part(ball(0.05, 4, 3), '#111111', [0.1, 2.62, 0.42]),
    limb([-0.4, 1.9, 0], [-1.0, 2.9, 0.1], 0.11, f),
    limb([0.4, 1.9, 0], [1.0, 2.9, 0.1], 0.11, f),
    limb([-0.25, 0.95, 0], [-0.35, 0, 0], 0.13, f),
    limb([0.25, 0.95, 0], [0.35, 0, 0], 0.13, f),
    part(new THREE.TorusGeometry(0.4, 0.09, 4, 10), '#ff9a1f', [0, 2.05, 0], [HALF, 0, 0]),
  ]);
}

function ufoGeo() {
  const parts = [part(ball(1, 10, 6), '#9aa3ad', [0, 0, 0], [0, 0, 0], [3.2, 0.55, 3.2]), part(ball(1.3, 8, 6), '#7fe9ff', [0, 0.45, 0])];
  for (let i = 0; i < 8; i++) parts.push(part(ball(0.22, 5, 4), '#ffe14d', [Math.cos((i / 8) * TAU) * 2.6, -0.15, Math.sin((i / 8) * TAU) * 2.6]));
  parts.push(part(box(0.9, 0.8, 1.6), '#f5f5f5', [0, -6, 0]));
  parts.push(part(box(0.5, 0.5, 0.6), '#f5f5f5', [0, -5.7, 1.05]));
  parts.push(part(box(0.5, 0.45, 0.6), '#17171b', [0.22, -5.85, 0.2]));
  parts.push(part(box(0.4, 0.5, 0.5), '#17171b', [-0.26, -6.05, -0.5]));
  parts.push(part(box(0.3, 0.2, 0.2), '#f0a4b8', [0, -5.85, 1.4]));
  for (const [x, z] of [[-0.3, 0.55], [0.3, 0.55], [-0.3, -0.55], [0.3, -0.55]]) parts.push(part(box(0.18, 0.7, 0.18), '#f5f5f5', [x, -6.7, z]));
  return merge(parts);
}

function rocketGeo() {
  const o = '#ff7a1a';
  return merge([
    part(cyl(0.7, 0.7, 5, 8), '#f2f2f2', [0, 0, 0], [HALF, 0, 0]),
    part(cone(0.7, 1.8, 8), o, [0, 0, 3.4], [HALF, 0, 0]),
    part(box(0.12, 2.6, 1.4), o, [0, 0, -2]),
    part(box(2.6, 0.12, 1.4), o, [0, 0, -2]),
    part(ball(0.32, 6, 5), '#5fc8ff', [0, 0.55, 1.2]),
    part(cone(0.55, 2.8, 6), '#ffd84d', [0, 0, -3.9], [-HALF, 0, 0]),
  ]);
}

function deadTreeGeo() {
  const c = '#2a2520';
  return merge([
    limb([0, 0, 0], [0.2, 3.4, 0], 0.26, c),
    limb([0.2, 3.4, 0], [1.6, 5.6, 0.4], 0.13, c, 4),
    limb([0.2, 3.4, 0], [-1.2, 5.2, -0.5], 0.13, c, 4),
    limb([0.15, 2.4, 0], [-0.4, 3.6, 1.3], 0.1, c, 4),
    limb([1.0, 4.6, 0.3], [1.3, 6.4, -0.4], 0.07, c, 4),
  ]);
}

function buildArbuz(ctx) {
  const g = new THREE.Group();
  const anims = [];
  const rnd = rng(101);
  ground(g, T.GROUND.trawa());
  backdrop(g, T.sky('#a6aded', '#efecf7', '#b6c59a', { clouds: 10 }), T.sun('arbuz'), [0.45, 0.4, 0.8], 120, anims);
  const carpet = new THREE.MeshLambertMaterial({ color: '#d9606a' });
  flat(g, new THREE.RingGeometry(52, 63, 72), carpet, 0, 0.09, 0);
  flat(g, new THREE.PlaneGeometry(11, 106), carpet, 0, 0.09, 0);
  flat(g, new THREE.PlaneGeometry(900, 22), new THREE.MeshLambertMaterial({ color: '#7d84ea' }), 0, 0.045, -96, 0.12);

  const boats = [];
  for (let i = 0; i < 4; i++) boats.push({ off: i * 110 + rnd() * 40, v: 3 + rnd() * 3, side: (rnd() - 0.5) * 9 });
  const boatMesh = new THREE.InstancedMesh(
    merge([part(ball(1, 8, 5), '#1f2233', [0, 0.1, 0], [0, 0, 0], [1.1, 0.5, 2.6]), part(cyl(0.22, 0.25, 1.3, 5), '#e9e4da', [0, 0.95, -0.4]), part(ball(0.26, 6, 5), '#e2b39c', [0, 1.8, -0.4])]),
    VC,
    boats.length
  );
  boatMesh.frustumCulled = false;
  g.add(boatMesh);
  const d = new THREE.Object3D();
  const cs = Math.cos(0.12);
  const sn = Math.sin(0.12);
  anims.push((t) => {
    boats.forEach((b, i) => {
      const u = ((b.off + t * b.v) % 440) - 220;
      d.position.set(u * cs + b.side * sn, 0.1 + Math.sin(t * 2 + i) * 0.08, -96 - u * sn + b.side * cs);
      d.rotation.set(0, HALF + 0.12, Math.sin(t * 1.5 + i) * 0.06);
      d.updateMatrix();
      boatMesh.setMatrixAt(i, d.matrix);
    });
    boatMesh.instanceMatrix.needsUpdate = true;
  });

  const houses = [{ x: -19, z: 34, ry: HALF, s: 1 }, { x: 24, z: 12, ry: -HALF, s: 0.9 }];
  scatter(rnd, 7, 70, 140, (x, z) => houses.push({ x, z, ry: rnd() * TAU, s: 0.9 + rnd() * 0.5 }));
  inst(g, houseGeo('#6c6fe6', '#5357c8', '#d8262c'), VC, houses);
  inst(g, treeGeo('#7b5b3c', '#6f9c57', '#86b068'), VC, scatter(rnd, 80, 16, 200, (x, z) => ({ x, z, ry: rnd() * TAU, s: 0.8 + rnd() * 1.1 })));
  inst(g, part(ball(1, 8, 5), '#9db588'), VC, scatter(rnd, 11, 245, 290, (x, z) => ({ x, z, s: [60 + rnd() * 30, 16 + rnd() * 14, 60 + rnd() * 30] })));
  kino(g, ctx, 26, 78, 'KINO ARBUZ');
  return { group: g, anims };
}

function buildHabibi(ctx) {
  const g = new THREE.Group();
  const anims = [];
  const rnd = rng(202);
  ground(g, T.GROUND.piasek());
  backdrop(g, T.sky('#58aee8', '#f8e6b6', '#e8d098', { clouds: 3 }), T.sun('slonce'), [-0.5, 0.55, 0.65], 130, anims);
  inst(g, part(cone(1, 1, 4), '#d4b06a', [0, 0.5, 0], [0, Math.PI / 4, 0]), VC, [
    { x: -60, z: 120, s: [44, 50, 44] },
    { x: 20, z: 150, s: [30, 34, 30] },
    { x: 95, z: 105, s: [22, 25, 22] },
    ...scatter(rnd, 5, 110, 210, (x, z) => {
      const s = 18 + rnd() * 26;
      return { x, z, s: [s, s * 1.12, s] };
    }),
  ]);
  const water = new THREE.MeshLambertMaterial({ color: '#45b6e4' });
  const oases = [{ x: 34, z: 40 }, { x: -70, z: -40 }, { x: 60, z: -90 }];
  const palms = [];
  for (const o of oases) {
    flat(g, new THREE.CircleGeometry(10, 20), water, o.x, 0.06, o.z);
    for (let i = 0; i < 7; i++) {
      const a = rnd() * TAU;
      palms.push({ x: o.x + Math.cos(a) * (10 + rnd() * 4), z: o.z + Math.sin(a) * (10 + rnd() * 4), ry: rnd() * TAU, s: 0.9 + rnd() * 0.6 });
    }
  }
  scatter(rnd, 34, 18, 190, (x, z) => palms.push({ x, z, ry: rnd() * TAU, s: 0.8 + rnd() * 0.8 }));
  inst(g, palmGeo(), VC, palms);
  inst(
    g,
    merge([part(cone(3.2, 3.4, 6), '#f3ecdc', [0, 1.7, 0]), part(box(1.1, 1.7, 0.2), '#5a3a2a', [0, 0.85, 2.75]), limb([0, 3.2, 0], [0, 4.4, 0], 0.05, '#5a3a2a', 4), part(box(0.7, 0.4, 0.04), '#2f9e44', [0.38, 4.2, 0])]),
    VC,
    scatter(rnd, 9, 25, 150, (x, z) => ({ x, z, ry: rnd() * TAU, s: 0.9 + rnd() * 0.4 }))
  );
  herd(g, camelGeo(), VC, movers(rnd, 11, { spread: [48, 135], radius: [10, 30], speed: [1.6, 3.2], s: [1, 1.5], bob: 0.06, jump: 0.3 }), anims);
  herd(g, carpetGeo(), VC, movers(rnd, 4, { spread: [0, 60], radius: [26, 70], speed: [9, 15], y: [8, 16], bob: 1.2, s: [1.4, 1.9] }), anims);
  kino(g, ctx, -30, 76, 'KINO HABIBI');
  return { group: g, anims };
}

function buildBollywood(ctx) {
  const g = new THREE.Group();
  const anims = [];
  const rnd = rng(303);
  ground(g, T.GROUND.trawnik());
  backdrop(g, T.sky('#ff74b0', '#ffd684', '#55b862', { clouds: 8, cloudColor: 'rgba(255,236,200,.85)' }), T.sun('roz'), [0.05, 0.3, 0.95], 150, anims);
  flat(g, new THREE.CircleGeometry(58, 40), new THREE.MeshLambertMaterial({ color: '#f6dbe8' }), 0, 0.06, 118);
  flat(g, new THREE.PlaneGeometry(12, 62), new THREE.MeshLambertMaterial({ color: '#57c7d9' }), 0, 0.1, 50);
  const palace = new THREE.Mesh(palaceGeo(), VC);
  palace.position.set(0, 0, 122);
  g.add(palace);
  const tints = ['#ff7eb6', '#4fd6c8', '#ffd04d', '#b98cff', '#ff9a52'];
  inst(g, pavilionGeo(), VC, scatter(rnd, 12, 30, 160, (x, z, i) => ({ x, z: z > 60 && Math.abs(x) < 70 ? -z : z, ry: rnd() * TAU, s: 1.2 + rnd() * 0.8, color: tints[i % tints.length] })));
  inst(g, treeGeo('#7b5b3c', '#3fae5a', '#ff7eb6'), VC, scatter(rnd, 60, 22, 200, (x, z) => ({ x, z: z > 50 && Math.abs(x) < 75 ? -z : z, ry: rnd() * TAU, s: 0.8 + rnd() })));
  herd(g, elephantGeo(), VC, movers(rnd, 8, { spread: [55, 135], radius: [12, 34], speed: [1.5, 2.8], s: [1, 1.5], jump: 0.9 }), anims);
  herd(g, tukGeo(), VC, movers(rnd, 10, { spread: [40, 120], radius: [14, 28], speed: [8, 14], s: [1.1, 1.3], jump: 0.5 }), anims);

  const dancers = [];
  for (let i = 0; i < 9; i++) for (const side of [-1, 1]) dancers.push({ x: side * (10 + (i % 2) * 2.5), z: 14 + i * 5.2, side });
  const dm = new THREE.InstancedMesh(dancerGeo(), VC, dancers.length);
  dm.frustumCulled = false;
  g.add(dm);
  const d = new THREE.Object3D();
  anims.push((t, e) => {
    dancers.forEach((o, i) => {
      d.position.set(o.x + Math.sin(t * 2.4 + i) * 0.7, Math.abs(Math.sin(t * 5 + i * 0.5)) * 0.5 + e.beat * 1.1, o.z);
      d.rotation.set(0, -o.side * HALF + Math.sin(t * 3 + i) * 0.9, Math.sin(t * 5 + i) * 0.18);
      d.scale.setScalar(1.5);
      d.updateMatrix();
      dm.setMatrixAt(i, d.matrix);
    });
    dm.instanceMatrix.needsUpdate = true;
  });
  kino(g, ctx, -52, 40, 'KINO BOLLYWOOD');
  return { group: g, anims };
}

function buildKosmos(ctx) {
  const g = new THREE.Group();
  const anims = [];
  const rnd = rng(404);
  backdrop(g, T.sky('#05021a', '#1a0a3c', '#0a0424', { stars: 700, starsBelow: true, nebula: ['rgba(255,80,200,.28)', 'rgba(80,140,255,.26)', 'rgba(140,60,255,.25)'] }), null, null, 0, anims);
  ground(g, T.GROUND.siatka(), false);

  const planets = [
    { kind: 'arbuz', x: -110, y: 70, z: 210, r: 46, ring: true },
    { kind: 'pomarancza', x: 190, y: 95, z: 120, r: 30 },
    { kind: 'pitaja', x: 120, y: 40, z: -200, r: 24 },
    { kind: 'mango', x: -220, y: 60, z: -80, r: 34 },
    { kind: 'arbuz', x: 40, y: 150, z: -40, r: 16 },
  ];
  const balls = planets.map((p) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshLambertMaterial({ map: ctx.fruits[p.kind].skin }));
    mesh.position.set(p.x, p.y, p.z);
    mesh.scale.setScalar(p.r);
    mesh.rotation.z = 0.4;
    if (p.ring) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.35, 2.1, 40), new THREE.MeshBasicMaterial({ color: '#ffd9a0', side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false }));
      ring.rotation.x = HALF - 0.3;
      mesh.add(ring);
    }
    g.add(mesh);
    return mesh;
  });
  anims.push((t) => balls.forEach((b, i) => (b.rotation.y = t * (0.05 + i * 0.02))));

  inst(g, part(new THREE.IcosahedronGeometry(1, 0), '#8a8c9c'), VC, scatter(rnd, 80, 18, 230, (x, z) => ({ x, z, y: 2 + rnd() * 34, rx: rnd() * 3, ry: rnd() * 3, s: [0.6 + rnd() * 3, 0.6 + rnd() * 2.4, 0.6 + rnd() * 3] })));
  const ufos = movers(rnd, 4, { spread: [20, 110], radius: [14, 40], speed: [3, 6], y: [15, 20], bob: 0.8, s: [1.2, 1.7] });
  herd(g, ufoGeo(), VC, ufos, anims);
  herd(g, new THREE.ConeGeometry(2.7, 9.5, 10, 1, true).translate(0, -4.9, 0), new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }), ufos, anims);
  herd(g, rocketGeo(), VC, movers(rnd, 3, { spread: [0, 40], radius: [60, 130], speed: [34, 50], y: [22, 46], bob: 3, s: [2, 2.8] }), anims);

  const n = 520;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU;
    const r = Math.sqrt(rnd()) * 210;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = 0.4 + rnd() * 16;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const dust = new THREE.BufferGeometry();
  dust.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(dust, new THREE.PointsMaterial({ size: 0.4, color: '#ffffff' }));
  points.frustumCulled = false;
  g.add(points);
  kino(g, ctx, 30, 80, 'KINO ORBITA');
  return { group: g, anims };
}

function build3am(ctx) {
  const g = new THREE.Group();
  const anims = [];
  const rnd = rng(505);
  ground(g, T.GROUND.noc());
  backdrop(g, T.sky('#020403', '#141f19', '#0b100d', { stars: 90 }), T.sun('ksiezyc'), [0.25, 0.45, 0.85], 110, anims);
  inst(g, deadTreeGeo(), VC, scatter(rnd, 90, 12, 190, (x, z) => ({ x, z, ry: rnd() * TAU, s: 0.9 + rnd() * 1.3 })));
  const houses = [{ x: -19, z: 34, ry: HALF, s: 1 }];
  scatter(rnd, 5, 50, 140, (x, z) => houses.push({ x, z, ry: rnd() * TAU, s: 1 }));
  inst(g, houseGeo('#30335f', '#22244a', '#11121c'), VC, houses);
  inst(g, merge([part(box(2.2, 3, 0.1), '#ffd978', [0, 1.6, 4.22]), part(box(1.2, 1.2, 0.1), '#ffd978', [-3, 4.4, 4.22]), part(box(1.2, 1.2, 0.1), '#ffd978', [3, 4.4, 4.22])]), VCB, houses);

  const lamps = scatter(rnd, 12, 14, 150, (x, z) => ({ x, z, ry: rnd() * TAU }));
  inst(g, merge([limb([0, 0, 0], [0, 6, 0], 0.12, '#1c1c20'), limb([0, 6, 0], [1.2, 6.3, 0], 0.08, '#1c1c20', 4)]), VC, lamps);
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffe9a0', fog: false });
  inst(g, ball(0.42, 6, 5).translate(1.3, 6.1, 0), bulbMat, lamps);
  anims.push((t) => bulbMat.color.set(Math.sin(t * 31) * Math.sin(t * 7.3) > 0.55 ? '#2c2816' : '#ffe9a0'));

  const watchers = scatter(rnd, 12, 55, 120, (x, z) => ({ x, z }));
  const wShell = new THREE.InstancedMesh(ctx.shellGeo, ctx.shellMat, watchers.length);
  const wTop = new THREE.InstancedMesh(ctx.topGeo, ctx.topMat, watchers.length);
  const wEyes = new THREE.InstancedMesh(ctx.eyeGeo, VCB, watchers.length);
  wTop.instanceMatrix = wShell.instanceMatrix;
  wEyes.instanceMatrix = wShell.instanceMatrix;
  for (const mesh of [wShell, wTop, wEyes]) {
    mesh.frustumCulled = false;
    g.add(mesh);
  }
  const d = new THREE.Object3D();
  anims.push((t, e) => {
    for (const w of watchers) {
      const dx = e.head.x - w.x;
      const dz = e.head.z - w.z;
      const dist = Math.hypot(dx, dz) || 1;
      if (e.honk && dist < 70) {
        const a = Math.random() * TAU;
        w.x = e.head.x + Math.cos(a) * (95 + Math.random() * 30);
        w.z = e.head.z + Math.sin(a) * (95 + Math.random() * 30);
      } else if (dist > 15) {
        w.x += (dx / dist) * 2.2 * e.dt;
        w.z += (dz / dist) * 2.2 * e.dt;
      }
    }
    watchers.forEach((w, i) => {
      d.position.set(w.x, 3.5, w.z);
      d.rotation.set(0.45, Math.atan2(e.head.x - w.x, e.head.z - w.z), Math.sin(t * 0.7 + i) * 0.08, 'YXZ');
      d.scale.setScalar(4);
      d.updateMatrix();
      wShell.setMatrixAt(i, d.matrix);
    });
    wShell.instanceMatrix.needsUpdate = true;
  });
  kino(g, ctx, -22, 66, 'KINO NOCNE');
  return { group: g, anims };
}

export const WORLDS = [
  {
    id: 'arbuz',
    icon: '🍉',
    name: 'ARBUZ EXPRESS',
    sub: 'oryginał z filmu',
    fruit: 'arbuz',
    unit: 'ARBUZ',
    look: 'none',
    track: 'arbuz',
    rate: 1,
    echo: 0,
    fog: ['#e6e4f3', 60, 340],
    hemi: ['#f3f1ff', '#9fb07c', 2.3],
    sun: ['#fff6e0', 1.5],
    post: { sat: 1.0, noise: 0.045, vig: 0.25 },
    beam: '#fff36b',
    bits: ['#e8455a', '#f2667a', '#2e5b2b', '#141011'],
    build: buildArbuz,
    captions: ['[małpa prowadzi pociąg z arbuzów]', 'bilet kosztuje jednego banana', 'następna stacja: arbuz', 'maszynista nie ma prawa jazdy', '[muzyka nie do zatrzymania]', 'pociąg nie hamuje, bo nie ma hamulców'],
  },
  {
    id: 'habibi',
    icon: '🍊',
    name: 'HABIBI EXPRESS',
    sub: 'pustynia i dzwonek z Nokii',
    fruit: 'pomarancza',
    unit: 'POMARAŃCZA',
    look: 'shades',
    track: 'habibi',
    rate: 1,
    echo: 0,
    fog: ['#f6e3b4', 70, 360],
    hemi: ['#fff4d6', '#e0c07a', 2.4],
    sun: ['#fff1c8', 1.9],
    post: { sat: 1.1, noise: 0.045, vig: 0.25 },
    beam: '#ffffff',
    bits: ['#ff8a14', '#ffab2e', '#fff0d2'],
    build: buildHabibi,
    captions: ['habibi, wsiadaj do pomarańczy', 'wielbłądy mają pierwszeństwo', '[dzwoni Nokia, nikt nie odbiera]', 'piramida po lewej, piramida po prawej', 'następna stacja: oaza', 'latający dywan nie ma przeglądu'],
  },
  {
    id: 'bollywood',
    icon: '🥭',
    name: 'BOLLYWOOD EXPRESS',
    sub: 'tunak tunak tun',
    fruit: 'mango',
    unit: 'MANGO',
    look: 'garland',
    track: 'bollywood',
    rate: 1,
    echo: 0,
    fog: ['#ffd9a0', 70, 360],
    hemi: ['#fff0f4', '#7fd08a', 2.4],
    sun: ['#ffe2c0', 1.6],
    post: { sat: 1.25, noise: 0.045, vig: 0.22 },
    beam: '#ffffff',
    bits: ['#ffd53d', '#ff5fa8', '#4fd6c8', '#ff9a1f', '#b98cff'],
    build: buildBollywood,
    captions: ['tunak tunak tun, małpa da da da', '[wszyscy tańczą, nikt nie wie czemu]', 'tuk-tuk ma zawsze pierwszeństwo', 'następna stacja: Tadż Mango', 'słoń patrzy. słoń ocenia.', 'budżet filmu: trzy mango'],
  },
  {
    id: 'kosmos',
    icon: '🚀',
    name: 'ARBUZ W KOSMOSIE',
    sub: 'grawitacja wyłączona',
    fruit: 'pitaja',
    unit: 'PITAJA',
    look: 'helmet',
    track: 'kosmos',
    rate: 1.22,
    echo: 0,
    lowG: true,
    fog: ['#0c0528', 110, 430],
    hemi: ['#b9a8ff', '#3a1c6e', 2.2],
    sun: ['#ffffff', 1.6],
    post: { sat: 1.2, noise: 0.05, vig: 0.35 },
    beam: '#7fe9ff',
    bits: ['#e3207f', '#fbf8f3', '#8bd94a', '#141011'],
    build: buildKosmos,
    captions: ['Houston, mamy pitaję', 'w kosmosie nikt nie usłyszy klaksonu', '[krowa leci na urlop]', 'następna stacja: Saturn Zdrój', 'tamta rakieta jest z GSP', 'grawitacja wyłączona za niepłacenie'],
  },
  {
    id: 'noc',
    icon: '🌙',
    name: '3:00 W NOCY',
    sub: 'wersja przeklęta, zwolniona',
    fruit: 'arbuz3am',
    unit: 'COŚ',
    look: 'glow',
    track: 'arbuz',
    rate: 0.62,
    echo: 0.5,
    stare: true,
    fog: ['#0c120e', 10, 84],
    hemi: ['#6f927a', '#101611', 2.3],
    sun: ['#9fb4d8', 0.9],
    post: { sat: 0.55, noise: 0.12, vig: 0.55 },
    beam: '#c8ffd0',
    bits: ['#8a1c2b', '#39463a', '#e3e7d8'],
    build: build3am,
    captions: ['jest 3:00. czemu jeszcze jeździsz?', 'arbuzy cię widzą', '[muzyka zwalnia. małpa nie.]', 'zatrąb, to się odsuną', 'następna stacja: nie ma stacji', 'małpa wie, co zrobiłeś'],
  },
];

export function buildWorld(i, ctx) {
  const w = WORLDS[i].build(ctx);
  return {
    group: w.group,
    update(t, env) {
      for (const fn of w.anims) fn(t, env);
    },
  };
}
