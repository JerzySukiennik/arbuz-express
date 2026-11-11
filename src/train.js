// Arbuz Express: the monkey, the wagons that follow it, pickups and juice particles.
import * as THREE from 'three';
import { part, merge, limb, VC, VCB } from './gfx.js';

const TAU = Math.PI * 2;
const STEP = 0.25;
const N = 1024;
const SPACING = 2.3;
const BASE_Y = 0.96;
const PICKS = 14;
const SPARKS = 180;
export const HEAD_Y = BASE_Y + 1.14;
export const BOUND = 150;

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const WHEELS = [[-0.62, 0.44], [0.62, 0.44], [-0.62, -0.44], [0.62, -0.44]].map(([x, z]) => new THREE.Matrix4().makeTranslation(x, -0.62, z));

function wheelGeo() {
  return merge([
    part(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12), '#17171b', [0, 0, 0], [0, 0, Math.PI / 2]),
    part(new THREE.CylinderGeometry(0.2, 0.2, 0.26, 8), '#ece8df', [0, 0, 0], [0, 0, Math.PI / 2]),
    part(new THREE.BoxGeometry(0.28, 0.07, 0.32), '#8d8a84'),
    part(new THREE.BoxGeometry(0.28, 0.32, 0.07), '#8d8a84'),
  ]);
}

function eyeGeo() {
  const parts = [];
  for (const z of [1, -1]) {
    for (const x of [-0.32, 0.32]) {
      parts.push(part(new THREE.SphereGeometry(0.17, 7, 5), '#ffffff', [x, -0.3, z * 0.82]));
      parts.push(part(new THREE.SphereGeometry(0.08, 6, 4), '#050505', [x, -0.3, z * 0.96]));
    }
  }
  return merge(parts);
}

function buildMonkey() {
  const f = '#3b2b23';
  const s = '#d9a68e';
  const m = '#e6b9a3';
  const root = new THREE.Group();
  root.add(
    new THREE.Mesh(
      merge([
        part(new THREE.SphereGeometry(0.36, 8, 6), f, [0, 0.45, -0.05], [0, 0, 0], [1, 1.35, 0.9]),
        limb([-0.3, 0.72, 0.02], [-0.21, 0.5, 0.52], 0.075, f),
        limb([0.3, 0.72, 0.02], [0.21, 0.5, 0.52], 0.075, f),
        part(new THREE.SphereGeometry(0.09, 5, 4), s, [-0.21, 0.5, 0.54]),
        part(new THREE.SphereGeometry(0.09, 5, 4), s, [0.21, 0.5, 0.54]),
        limb([0, 0, 0.42], [0, 0.48, 0.62], 0.035, '#9aa0a8'),
      ]),
      VC
    )
  );
  const wheel = new THREE.Mesh(
    merge([
      part(new THREE.TorusGeometry(0.22, 0.035, 5, 12), '#8f959d'),
      part(new THREE.BoxGeometry(0.42, 0.04, 0.03), '#8f959d'),
      part(new THREE.BoxGeometry(0.04, 0.42, 0.03), '#8f959d'),
    ]),
    VC
  );
  wheel.position.set(0, 0.5, 0.63);
  const wheelBase = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.48, 0.2).normalize());
  root.add(wheel);

  const head = new THREE.Group();
  head.position.set(0, 1.14, 0);
  head.add(
    new THREE.Mesh(
      merge([
        part(new THREE.SphereGeometry(0.3, 8, 7), f, [0, 0, 0], [0, 0, 0], [1, 1.05, 1]),
        part(new THREE.SphereGeometry(0.22, 8, 6), s, [0, 0.03, 0.19], [0, 0, 0], [1, 1.05, 0.55]),
        part(new THREE.SphereGeometry(0.17, 8, 6), m, [0, -0.11, 0.25], [0, 0, 0], [1.15, 0.8, 0.8]),
        part(new THREE.BoxGeometry(0.17, 0.018, 0.03), '#4a2a22', [0, -0.14, 0.385]),
        part(new THREE.SphereGeometry(0.1, 6, 5), s, [-0.3, 0.03, 0], [0, 0, 0], [0.5, 1, 1]),
        part(new THREE.SphereGeometry(0.1, 6, 5), s, [0.3, 0.03, 0], [0, 0, 0], [0.5, 1, 1]),
        part(new THREE.SphereGeometry(0.08, 6, 5), '#ffffff', [-0.1, 0.09, 0.28]),
        part(new THREE.SphereGeometry(0.08, 6, 5), '#ffffff', [0.1, 0.09, 0.28]),
        part(new THREE.SphereGeometry(0.036, 5, 4), '#111111', [-0.08, 0.105, 0.348]),
        part(new THREE.SphereGeometry(0.036, 5, 4), '#111111', [0.125, 0.07, 0.345]),
      ]),
      VC
    )
  );
  root.add(head);

  const looks = {};
  looks.shades = new THREE.Mesh(
    merge([
      part(new THREE.BoxGeometry(0.16, 0.1, 0.04), '#0b0b0d', [-0.09, 0.09, 0.365]),
      part(new THREE.BoxGeometry(0.16, 0.1, 0.04), '#0b0b0d', [0.09, 0.09, 0.365]),
      part(new THREE.BoxGeometry(0.62, 0.03, 0.03), '#0b0b0d', [0, 0.12, 0.35]),
      part(new THREE.BoxGeometry(0.02, 0.03, 0.36), '#0b0b0d', [-0.305, 0.12, 0.18]),
      part(new THREE.BoxGeometry(0.02, 0.03, 0.36), '#0b0b0d', [0.305, 0.12, 0.18]),
    ]),
    VC
  );
  head.add(looks.shades);
  looks.helmet = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 9), new THREE.MeshBasicMaterial({ color: '#cfeeff', transparent: true, opacity: 0.28, depthWrite: false }));
  looks.helmet.add(new THREE.Mesh(part(new THREE.TorusGeometry(0.34, 0.07, 5, 12), '#f2f2f2', [0, -0.34, 0], [Math.PI / 2, 0, 0]), VC));
  head.add(looks.helmet);
  looks.glow = new THREE.Mesh(
    merge([part(new THREE.SphereGeometry(0.075, 6, 5), '#ffffff', [-0.09, 0.09, 0.3]), part(new THREE.SphereGeometry(0.075, 6, 5), '#ffffff', [0.09, 0.09, 0.3])]),
    VCB
  );
  head.add(looks.glow);
  looks.garland = new THREE.Mesh(
    merge([
      part(new THREE.TorusGeometry(0.3, 0.075, 5, 12), '#ff9a1f', [0, 0.88, 0.02], [Math.PI / 2 - 0.25, 0, 0]),
      part(new THREE.TorusGeometry(0.35, 0.06, 5, 12), '#ffd21f', [0, 0.8, 0.06], [Math.PI / 2 - 0.35, 0, 0]),
    ]),
    VC
  );
  root.add(looks.garland);
  return { root, head, wheel, wheelBase, looks };
}

export class Train {
  constructor(scene, fruits, max = 80) {
    this.scene = scene;
    this.fruits = fruits;
    this.max = max;
    this.count = 9;
    this.grow = 1;
    this.px = new Float32Array(N);
    this.py = new Float32Array(N);
    this.pz = new Float32Array(N);
    this.pt = new Float32Array(N);
    this.K = 0;
    this.D = 0;
    this.head = { x: 0, y: 0, z: 0, vy: 0, th: 0 };
    this.headYaw = 0;
    this.headPitch = 0;
    this.lookT = 0;
    this.out = { x: 0, y: 0, z: 0, th: 0 };

    this.shellGeo = new THREE.SphereGeometry(1, 18, 7, 0, TAU, Math.PI / 2, Math.PI / 2).scale(1, 0.82, 1);
    this.topGeo = new THREE.CircleGeometry(1, 18).rotateX(-Math.PI / 2);
    this.eyeGeo = eyeGeo();
    this.shellMat = new THREE.MeshLambertMaterial({ map: fruits.arbuz.skin });
    this.topMat = new THREE.MeshLambertMaterial({ map: fruits.arbuz.top });

    const mk = (geo, mat, n) => {
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      mesh.frustumCulled = false;
      scene.add(mesh);
      return mesh;
    };
    this.shells = mk(this.shellGeo, this.shellMat, max);
    this.tops = mk(this.topGeo, this.topMat, max);
    this.tops.instanceMatrix = this.shells.instanceMatrix;
    this.eyes = mk(this.eyeGeo, VCB, max);
    this.eyes.instanceMatrix = this.shells.instanceMatrix;
    this.eyes.visible = false;
    this.wheels = mk(wheelGeo(), VC, max * 4);

    this.monkey = buildMonkey();
    scene.add(this.monkey.root);

    this.picks = [];
    for (let i = 0; i < PICKS; i++) this.picks.push({ x: 0, z: 0, ph: Math.random() * TAU });
    this.pShells = mk(this.shellGeo, this.shellMat, PICKS);
    this.pTops = mk(this.topGeo, this.topMat, PICKS);
    this.pTops.instanceMatrix = this.pShells.instanceMatrix;
    this.beamMat = new THREE.MeshBasicMaterial({ color: '#fff36b', transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.beams = mk(new THREE.CylinderGeometry(0.4, 0.4, 26, 6, 1, true).translate(0, 13, 0), this.beamMat, PICKS);

    this.sPos = new Float32Array(SPARKS * 3).fill(-999);
    this.sCol = new Float32Array(SPARKS * 3);
    this.sVel = new Float32Array(SPARKS * 3);
    this.sLife = new Float32Array(SPARKS);
    this.sNext = 0;
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.sPos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(this.sCol, 3));
    this.sparks = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.5, vertexColors: true }));
    this.sparks.frustumCulled = false;
    scene.add(this.sparks);

    this.dummy = new THREE.Object3D();
    this.m = new THREE.Matrix4();
    this.spin = new THREE.Matrix4();
    this.qz = new THREE.Quaternion();
    this.zAxis = new THREE.Vector3(0, 0, 1);
    this.color = new THREE.Color();
    this.reset();
  }

  setFruit(kind) {
    this.shellMat.map = this.fruits[kind].skin;
    this.topMat.map = this.fruits[kind].top;
  }

  setLook(name) {
    const l = this.monkey.looks;
    for (const key of Object.keys(l)) l[key].visible = key === name;
    this.eyes.visible = name === 'glow';
  }

  reset() {
    const h = this.head;
    h.x = 0;
    h.z = 0;
    h.y = 0;
    h.vy = 0;
    h.th = 0;
    for (let k = 0; k < N; k++) {
      this.px[k] = 0;
      this.py[k] = 0;
      this.pz[k] = -(N - 1 - k) * STEP;
      this.pt[k] = 0;
    }
    this.K = N - 1;
    this.D = this.K * STEP;
    this.headYaw = 0;
    for (let i = 0; i < PICKS; i++) this.placePick(i, false);
  }

  placePick(i, ahead) {
    const h = this.head;
    const p = this.picks[i];
    let x = 0;
    let z = 0;
    let ok = false;
    if (ahead) {
      const a = h.th + (Math.random() - 0.5) * 2.2;
      const d = 40 + Math.random() * 60;
      x = h.x + Math.sin(a) * d;
      z = h.z + Math.cos(a) * d;
      ok = Math.hypot(x, z) < BOUND - 15;
    }
    if (!ok) {
      const a = Math.random() * TAU;
      const d = 18 + Math.random() * (BOUND - 40);
      x = Math.cos(a) * d;
      z = Math.sin(a) * d;
    }
    p.x = x;
    p.z = z;
  }

  sample(q, out) {
    const lo = this.K - N + 2;
    let k0 = Math.floor(q / STEP);
    let a = q / STEP - k0;
    if (k0 < lo) {
      k0 = lo;
      a = 0;
    }
    const h = this.head;
    if (k0 >= this.K) {
      const i = this.K % N;
      const span = this.D - this.K * STEP;
      const b = span > 1e-4 ? Math.min(1, Math.max(0, (q - this.K * STEP) / span)) : 1;
      out.x = this.px[i] + (h.x - this.px[i]) * b;
      out.y = this.py[i] + (h.y - this.py[i]) * b;
      out.z = this.pz[i] + (h.z - this.pz[i]) * b;
      out.th = this.pt[i] + wrap(h.th - this.pt[i]) * b;
      return out;
    }
    const i = k0 % N;
    const j = (k0 + 1) % N;
    out.x = this.px[i] + (this.px[j] - this.px[i]) * a;
    out.y = this.py[i] + (this.py[j] - this.py[i]) * a;
    out.z = this.pz[i] + (this.pz[j] - this.pz[i]) * a;
    out.th = this.pt[i] + wrap(this.pt[j] - this.pt[i]) * a;
    return out;
  }

  addWagon() {
    if (this.count >= this.max) return false;
    this.count++;
    this.grow = 0;
    return true;
  }

  burst(x, y, z, colors, n = 26) {
    for (let k = 0; k < n; k++) {
      const i = this.sNext;
      this.sNext = (this.sNext + 1) % SPARKS;
      const a = Math.random() * TAU;
      const v = 3 + Math.random() * 6;
      this.sPos[i * 3] = x;
      this.sPos[i * 3 + 1] = y;
      this.sPos[i * 3 + 2] = z;
      this.sVel[i * 3] = Math.cos(a) * v;
      this.sVel[i * 3 + 1] = 4 + Math.random() * 7;
      this.sVel[i * 3 + 2] = Math.sin(a) * v;
      this.sLife[i] = 0.8 + Math.random() * 0.6;
      this.color.set(colors[k % colors.length]);
      this.sCol[i * 3] = this.color.r;
      this.sCol[i * 3 + 1] = this.color.g;
      this.sCol[i * 3 + 2] = this.color.b;
    }
    this.sparks.geometry.attributes.color.needsUpdate = true;
  }

  update(dt, t, o) {
    const h = this.head;
    let steer = o.steer;
    const r = Math.hypot(h.x, h.z);
    if (r > BOUND) {
      const d = wrap(Math.atan2(-h.x, -h.z) - h.th);
      if (Math.abs(d) > 0.35) steer = d > 0 ? -1 : 1;
    }
    h.th -= steer * 1.7 * dt;
    const sx = Math.sin(h.th);
    const cz = Math.cos(h.th);
    h.x += sx * o.speed * dt;
    h.z += cz * o.speed * dt;
    if (o.hop && h.y <= 0.001) h.vy = o.lowG ? 7 : 8.5;
    h.vy -= (o.lowG ? 6.5 : 24) * dt;
    h.y += h.vy * dt;
    if (h.y < 0) {
      h.y = 0;
      h.vy = 0;
    }
    this.D += o.speed * dt;
    while ((this.K + 1) * STEP <= this.D) {
      this.K++;
      const i = this.K % N;
      this.px[i] = h.x;
      this.py[i] = h.y;
      this.pz[i] = h.z;
      this.pt[i] = h.th;
    }
    this.grow = Math.min(1, this.grow + dt * 3.5);

    const d = this.dummy;
    const out = this.out;
    const amp = o.beat * (0.1 + o.boost * 0.22);
    this.spin.makeRotationX(this.D / 0.34);
    for (let i = 0; i < this.count; i++) {
      this.sample(this.D - i * SPACING, out);
      const wob = Math.sin(t * 7 + i * 1.3);
      d.position.set(out.x, BASE_Y + out.y + Math.abs(wob) * 0.04, out.z);
      d.rotation.set(0, out.th, wob * 0.035 + (i === 0 ? steer * 0.1 : 0), 'YXZ');
      let s = 1 + amp * (0.55 + 0.45 * Math.sin(i * 0.9 - t * 9));
      if (i === this.count - 1) s *= this.grow;
      d.scale.setScalar(s);
      d.updateMatrix();
      this.shells.setMatrixAt(i, d.matrix);
      for (let w = 0; w < 4; w++) {
        this.m.multiplyMatrices(d.matrix, WHEELS[w]).multiply(this.spin);
        this.wheels.setMatrixAt(i * 4 + w, this.m);
      }
      if (i === 0) {
        const mk = this.monkey;
        mk.root.position.copy(d.position);
        mk.root.rotation.copy(d.rotation);
        mk.root.scale.copy(d.scale);
      }
    }
    this.shells.count = this.tops.count = this.eyes.count = this.count;
    this.wheels.count = this.count * 4;
    this.shells.instanceMatrix.needsUpdate = true;
    this.wheels.instanceMatrix.needsUpdate = true;

    const mk = this.monkey;
    this.lookT = Math.max(0, this.lookT - dt);
    let yaw = -steer * 0.5 + Math.sin(t * 1.7) * 0.14;
    let pitch = o.beat * 0.32 + Math.sin(t * 2.3) * 0.05;
    if (this.lookT > 0 || o.stare) {
      yaw = wrap(Math.atan2(o.camera.position.x - h.x, o.camera.position.z - h.z) - h.th);
      pitch = -0.12;
    }
    const kf = Math.min(1, dt * 13);
    this.headYaw += wrap(yaw - this.headYaw) * kf;
    this.headPitch += (pitch - this.headPitch) * kf;
    mk.head.rotation.set(this.headPitch, this.headYaw, Math.sin(t * 3.1) * 0.06, 'YXZ');
    mk.wheel.quaternion.copy(mk.wheelBase).multiply(this.qz.setFromAxisAngle(this.zAxis, steer * 1.5 + Math.sin(t * 5) * 0.08));

    let picked = 0;
    for (let i = 0; i < PICKS; i++) {
      const p = this.picks[i];
      if (Math.hypot(p.x - h.x, p.z - h.z) < 2.4 && h.y < 3) {
        picked++;
        this.burst(p.x, 1.6, p.z, o.bits);
        this.placePick(i, true);
      }
      d.position.set(p.x, 1.7 + Math.sin(t * 2 + p.ph) * 0.35, p.z);
      d.rotation.set(0.55, t * 1.6 + p.ph, 0.25);
      d.scale.setScalar(0.85 + o.beat * 0.2);
      d.updateMatrix();
      this.pShells.setMatrixAt(i, d.matrix);
      d.position.y = 0;
      d.rotation.set(0, 0, 0);
      d.scale.set(1 + o.beat * 0.5, 1, 1 + o.beat * 0.5);
      d.updateMatrix();
      this.beams.setMatrixAt(i, d.matrix);
    }
    this.pShells.instanceMatrix.needsUpdate = true;
    this.beams.instanceMatrix.needsUpdate = true;

    let alive = false;
    for (let i = 0; i < SPARKS; i++) {
      if (this.sLife[i] <= 0) continue;
      alive = true;
      this.sLife[i] -= dt;
      this.sVel[i * 3 + 1] -= 16 * dt;
      this.sPos[i * 3] += this.sVel[i * 3] * dt;
      this.sPos[i * 3 + 1] += this.sVel[i * 3 + 1] * dt;
      this.sPos[i * 3 + 2] += this.sVel[i * 3 + 2] * dt;
      if (this.sLife[i] <= 0) this.sPos[i * 3 + 1] = -999;
    }
    if (alive) this.sparks.geometry.attributes.position.needsUpdate = true;
    return picked;
  }
}
