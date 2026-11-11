// Arbuz Express: renderer, the low-quality post pass and geometry helpers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const QUALITIES = [
  { label: '144p', lines: 144, block: 4, crush: 0.6, steps: 6, lowpass: 1900 },
  { label: '240p', lines: 240, block: 4, crush: 0.32, steps: 16, lowpass: 3600 },
  { label: '360p', lines: 360, block: 6, crush: 0.16, steps: 64, lowpass: 7000 },
];

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const VC = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
export const VCB = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const P = new THREE.Vector3();
const S = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export function partM(geo, color, matrix) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(matrix);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r;
    a[i * 3 + 1] = c.g;
    a[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.deleteAttribute('uv');
  return g;
}

export function part(geo, color, p = [0, 0, 0], r = [0, 0, 0], s = 1) {
  if (typeof s === 'number') S.set(s, s, s);
  else S.set(s[0], s[1], s[2]);
  M.compose(P.set(p[0], p[1], p[2]), Q.setFromEuler(E.set(r[0], r[1], r[2])), S);
  return partM(geo, color, M);
}

function between(geo, a, b, color) {
  const A = new THREE.Vector3(a[0], a[1], a[2]);
  const B = new THREE.Vector3(b[0], b[1], b[2]);
  const d = B.clone().sub(A);
  const len = d.length();
  Q.setFromUnitVectors(UP, d.normalize());
  M.compose(A.add(B).multiplyScalar(0.5), Q, S.set(1, len, 1));
  return partM(geo, color, M);
}

export function limb(a, b, r, color, seg = 5) {
  return between(new THREE.CylinderGeometry(r, r, 1, seg), a, b, color);
}

export function spike(a, b, r, color, seg = 4) {
  return between(new THREE.ConeGeometry(r, 1, seg), a, b, color);
}

export function merge(parts) {
  const g = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return g;
}

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAG = `
uniform sampler2D tDiffuse;
uniform vec2 res;
uniform float time;
uniform float block;
uniform float crush;
uniform float deep;
uniform float sat;
uniform float noise;
uniform float vig;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 toScreen(vec3 c) {
  return pow(max(c, 0.0), vec3(0.4545));
}

void main() {
  vec2 px = vUv * res;
  vec2 b = floor(px / block);
  float tick = floor(time * 9.0);
  float k = clamp(crush + deep * 0.45, 0.0, 1.0);
  float lost = step(1.0 - 0.012 - k * 0.07 - deep * 0.12, hash(b * 0.37 + tick));
  vec2 off = lost * (vec2(hash(b + tick + 1.7), hash(b + tick + 9.1)) - 0.5) * block * 3.0 / res;
  vec3 c = toScreen(texture2D(tDiffuse, vUv + off).rgb);
  vec2 bc = (b * block + block * 0.5) / res + off;
  vec3 cb = toScreen(texture2D(tDiffuse, bc).rgb);
  const vec3 W = vec3(0.299, 0.587, 0.114);
  float y = dot(c, W);
  float yb = dot(cb, W);
  vec3 chroma = cb - yb;
  float yq = mix(y, yb, 0.12 + k * 0.6);
  float levels = mix(44.0, 9.0, k);
  yq = floor(yq * levels + 0.5) / levels;
  vec3 col = vec3(yq) + chroma * sat * (1.0 + deep * 1.7);
  vec2 f = fract(px / block);
  float edge = max(step(f.x, 1.0 / block), step(f.y, 1.0 / block));
  col -= edge * 0.028 * (0.4 + k);
  col += (hash(px + time * 61.0) - 0.5) * noise;
  col = (col - 0.5) * (1.0 + deep * 1.1) + 0.5 + vec3(0.09, 0.03, -0.07) * deep;
  vec2 q = vUv - 0.5;
  col *= 1.0 - dot(q, q) * vig * 2.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export class Gfx {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.uniforms = {
      tDiffuse: { value: this.rt.texture },
      res: { value: new THREE.Vector2(4, 4) },
      time: { value: 0 },
      block: { value: 4 },
      crush: { value: 0.3 },
      deep: { value: 0 },
      sat: { value: 1 },
      noise: { value: 0.04 },
      vig: { value: 0.25 },
    };
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    this.postScene.add(quad);
    this.q = 1;
    this.baseCrush = 0.3;
  }

  resize() {
    const W = Math.max(1, window.innerWidth);
    const H = Math.max(1, window.innerHeight);
    const q = QUALITIES[this.q];
    const k = q.lines / Math.min(W, H);
    const w = Math.max(2, Math.round((W * k) / 2) * 2);
    const h = Math.max(2, Math.round((H * k) / 2) * 2);
    this.renderer.setSize(w, h, false);
    this.rt.setSize(w, h);
    this.uniforms.res.value.set(w, h);
    this.uniforms.block.value = q.block;
    this.baseCrush = q.crush;
    return W / H;
  }

  render(scene, camera) {
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }
}
