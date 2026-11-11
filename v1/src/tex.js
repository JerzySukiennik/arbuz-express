// Arbuz Express: every texture is painted on a canvas at load, no image files.
import * as THREE from 'three';
import { rng } from './gfx.js';

const TAU = Math.PI * 2;

function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
  }
  return t;
}

function disc(g, x, y, r, fill) {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function shade(g, w, h, amount) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${amount})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
}

function melonSkin(g, w, h, base, stripe) {
  const r = rng(5);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  const n = 10;
  const seg = 12;
  g.fillStyle = stripe;
  for (let i = 0; i < n; i++) {
    const cx = ((i + 0.5) * w) / n;
    const pts = [];
    for (let j = 0; j <= seg; j++) pts.push([cx - 4 - r() * 5 - (j % 2 ? 4 : 0), (j * h) / seg]);
    for (let j = seg; j >= 0; j--) pts.push([cx + 4 + r() * 5 + (j % 2 ? 4 : 0), (j * h) / seg]);
    g.beginPath();
    pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.fill();
  }
  shade(g, w, h, 0.22);
}

const SKIN = {
  arbuz: (g, w, h) => melonSkin(g, w, h, '#b9d19c', '#2e5b2b'),
  arbuz3am: (g, w, h) => melonSkin(g, w, h, '#66775f', '#0e1710'),
  pomarancza(g, w, h) {
    const r = rng(8);
    g.fillStyle = '#ff8a14';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) disc(g, r() * w, r() * h, 0.8 + r() * 1.4, i % 2 ? 'rgba(255,196,96,.55)' : 'rgba(196,86,0,.4)');
    shade(g, w, h, 0.2);
  },
  mango(g, w, h) {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#ffd53d');
    grad.addColorStop(1, '#f5a11a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (const [x, col] of [[w * 0.25, '232,69,42'], [w * 0.75, '140,190,58']]) {
      const b = g.createRadialGradient(x, h * 0.35, 4, x, h * 0.35, 62);
      b.addColorStop(0, `rgba(${col},.85)`);
      b.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = b;
      g.fillRect(0, 0, w, h);
    }
    shade(g, w, h, 0.15);
  },
  pitaja(g, w, h) {
    g.fillStyle = '#e3207f';
    g.fillRect(0, 0, w, h);
    const cols = 8;
    const rows = 4;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col <= cols; col++) {
        const x = ((col + (row % 2) * 0.5) * w) / cols;
        const y = (row * h) / rows + 4;
        for (const dx of [0, -w]) {
          g.fillStyle = '#f2569f';
          g.beginPath();
          g.moveTo(x + dx - 15, y + 30);
          g.lineTo(x + dx, y);
          g.lineTo(x + dx + 15, y + 30);
          g.fill();
          g.fillStyle = '#8bd94a';
          g.beginPath();
          g.moveTo(x + dx - 6, y + 12);
          g.lineTo(x + dx, y);
          g.lineTo(x + dx + 6, y + 12);
          g.fill();
        }
      }
    }
    shade(g, w, h, 0.2);
  },
};

function seeds(g, n, rMin, rMax, size, seed) {
  const r = rng(seed);
  g.fillStyle = '#141011';
  for (let i = 0; i < n; i++) {
    const a = r() * TAU;
    const d = rMin + r() * (rMax - rMin);
    g.save();
    g.translate(64 + Math.cos(a) * d, 64 + Math.sin(a) * d);
    g.rotate(a + Math.PI / 2);
    g.beginPath();
    g.ellipse(0, 0, size * 0.55, size, 0, 0, TAU);
    g.fill();
    g.restore();
  }
}

function melonTop(g, rim, rind, a, b) {
  disc(g, 64, 64, 64, rim);
  disc(g, 64, 64, 58, rind);
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 54);
  grad.addColorStop(0, a);
  grad.addColorStop(1, b);
  disc(g, 64, 64, 54, grad);
  seeds(g, 16, 18, 44, 3.2, 3);
}

const TOP = {
  arbuz: (g) => melonTop(g, '#cfe0b4', '#f4f6e8', '#f2667a', '#de3652'),
  arbuz3am: (g) => melonTop(g, '#39463a', '#6f7c6c', '#8a1c2b', '#470b15'),
  pomarancza(g) {
    disc(g, 64, 64, 64, '#ff8a14');
    disc(g, 64, 64, 59, '#fff0d2');
    disc(g, 64, 64, 54, '#ffab2e');
    g.strokeStyle = '#ffe2a6';
    g.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      g.beginPath();
      g.moveTo(64, 64);
      g.lineTo(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54);
      g.stroke();
    }
    disc(g, 64, 64, 7, '#fff0d2');
  },
  mango(g) {
    disc(g, 64, 64, 64, '#f5a11a');
    const grad = g.createRadialGradient(64, 64, 6, 64, 64, 59);
    grad.addColorStop(0, '#ffb81f');
    grad.addColorStop(1, '#ffd84a');
    disc(g, 64, 64, 59, grad);
    g.fillStyle = '#e0901a';
    g.beginPath();
    g.ellipse(64, 64, 30, 17, 0.3, 0, TAU);
    g.fill();
    g.strokeStyle = '#c97a12';
    g.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.moveTo(44, 64 + i * 4);
      g.lineTo(84, 70 + i * 4);
      g.stroke();
    }
  },
  pitaja(g) {
    disc(g, 64, 64, 64, '#e3207f');
    disc(g, 64, 64, 58, '#fbf8f3');
    seeds(g, 110, 3, 54, 1.5, 9);
  },
};

export function fruitTextures() {
  const out = {};
  for (const kind of Object.keys(SKIN)) {
    out[kind] = { skin: tex(256, 128, SKIN[kind]), top: tex(128, 128, TOP[kind]) };
    out[kind].skin.wrapS = THREE.RepeatWrapping;
  }
  return out;
}

function blotches(g, w, h, base, colors, n, seed, rMin = 6, rMax = 22) {
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = rMin + r() * (rMax - rMin);
    const col = colors[i % colors.length];
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) disc(g, x + dx, y + dy, rad, col);
  }
}

export const GROUND = {
  trawa: () => tex(256, 256, (g, w, h) => blotches(g, w, h, '#a8b985', ['#9cae78', '#b6c592', '#a2b47e', '#93a66f'], 90, 21), 80),
  piasek: () =>
    tex(256, 256, (g, w, h) => {
      blotches(g, w, h, '#e8d098', ['#e2c88c', '#eed8a6'], 40, 22, 10, 30);
      g.strokeStyle = 'rgba(190,150,80,.45)';
      g.lineWidth = 2;
      for (let y = 8; y < h; y += 32) {
        g.beginPath();
        for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin((x / w) * TAU * 2) * 5);
        g.stroke();
      }
    }, 70),
  trawnik: () =>
    tex(256, 256, (g, w, h) => {
      blotches(g, w, h, '#55b862', ['#4cab58', '#63c56e', '#58bd64'], 70, 23);
      const r = rng(24);
      const fl = ['#ff5fa8', '#ffe14d', '#ffffff', '#ff9a1f'];
      for (let i = 0; i < 46; i++) disc(g, r() * w, r() * h, 2.2 + r() * 1.6, fl[i % 4]);
    }, 80),
  siatka: () =>
    tex(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(40,14,90,.55)';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ff4fd8';
      g.lineWidth = 5;
      g.strokeRect(0, 0, w, h);
    }, 140),
  noc: () => tex(256, 256, (g, w, h) => blotches(g, w, h, '#1c251d', ['#161d17', '#232e24', '#1a221b'], 90, 25), 80),
};

export function sky(top, horizon, below, opts = {}) {
  return tex(512, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h / 2);
    grad.addColorStop(0, top);
    grad.addColorStop(1, horizon);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h / 2);
    g.fillStyle = below;
    g.fillRect(0, h / 2, w, h / 2);
    const r = rng(opts.seed || 31);
    if (opts.stars) {
      const yMax = opts.starsBelow ? h : h / 2;
      for (let i = 0; i < opts.stars; i++) {
        const a = 0.35 + r() * 0.65;
        disc(g, r() * w, r() * yMax, 0.5 + r() * 1.1, `rgba(255,255,${200 + Math.floor(r() * 55)},${a})`);
      }
    }
    if (opts.nebula) {
      for (let i = 0; i < opts.nebula.length * 3; i++) {
        const x = r() * w;
        const y = r() * h;
        const rad = 30 + r() * 60;
        const b = g.createRadialGradient(x, y, 2, x, y, rad);
        b.addColorStop(0, opts.nebula[i % opts.nebula.length]);
        b.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = b;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
    if (opts.clouds) {
      g.fillStyle = opts.cloudColor || 'rgba(255,255,255,.8)';
      for (let i = 0; i < opts.clouds; i++) {
        const x = r() * w;
        const y = h * (0.3 + r() * 0.15);
        for (let k = 0; k < 4; k++) {
          g.beginPath();
          g.ellipse(x + (k - 1.5) * 9, y + (k % 2) * 3, 12 + r() * 6, 5 + r() * 2, 0, 0, TAU);
          g.fill();
        }
      }
    }
  });
}

const SUN = {
  arbuz(g) {
    const glow = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    glow.addColorStop(0, 'rgba(255,255,220,.9)');
    glow.addColorStop(1, 'rgba(255,255,220,0)');
    disc(g, 64, 64, 64, glow);
    g.save();
    g.translate(64, 54);
    g.rotate(-0.25);
    for (const [r, col] of [[44, '#2e5b2b'], [39, '#f4f6e8'], [35, '#e8455a']]) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI);
      g.fill();
    }
    g.fillStyle = '#141011';
    for (const [x, y] of [[-20, 10], [-6, 18], [9, 12], [21, 8], [0, 6]]) {
      g.beginPath();
      g.ellipse(x, y, 2, 3.4, 0, 0, TAU);
      g.fill();
    }
    g.restore();
  },
  slonce(g) {
    g.strokeStyle = 'rgba(255,236,150,.8)';
    g.lineWidth = 5;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      g.beginPath();
      g.moveTo(64 + Math.cos(a) * 36, 64 + Math.sin(a) * 36);
      g.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62);
      g.stroke();
    }
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 34);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#ffe14d');
    disc(g, 64, 64, 34, grad);
  },
  roz(g) {
    const glow = g.createRadialGradient(64, 64, 20, 64, 64, 64);
    glow.addColorStop(0, 'rgba(255,220,160,.9)');
    glow.addColorStop(1, 'rgba(255,160,120,0)');
    disc(g, 64, 64, 64, glow);
    const grad = g.createLinearGradient(0, 24, 0, 104);
    grad.addColorStop(0, '#fff2a8');
    grad.addColorStop(1, '#ff8a5c');
    disc(g, 64, 64, 40, grad);
  },
  ksiezyc(g) {
    const glow = g.createRadialGradient(64, 64, 30, 64, 64, 64);
    glow.addColorStop(0, 'rgba(220,235,220,.5)');
    glow.addColorStop(1, 'rgba(220,235,220,0)');
    disc(g, 64, 64, 64, glow);
    disc(g, 64, 64, 42, '#e3e7d8');
    disc(g, 42, 44, 7, '#c9cebd');
    disc(g, 88, 80, 5, '#c9cebd');
    disc(g, 64, 74, 17, '#cfd3c2');
    disc(g, 50, 58, 6, '#161a16');
    disc(g, 78, 58, 6, '#161a16');
    disc(g, 51, 57, 2, '#ffffff');
    disc(g, 79, 57, 2, '#ffffff');
    g.strokeStyle = '#161a16';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(64, 74, 9, 0.15, Math.PI - 0.15);
    g.stroke();
  },
};

export function sun(kind) {
  return tex(128, 128, (g) => SUN[kind](g));
}

export function label(text, fg, bg) {
  return tex(512, 96, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = 'bold 58px Impact, "Arial Black", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 3, w - 24);
  });
}
