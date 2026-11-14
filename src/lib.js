/* ============================================================
   lib.js — drawing primitives for the motion-graphics renderer
   Every value is a pure function of time so any frame can be
   rendered in isolation (frame-accurate, no flicker).
   ============================================================ */

const W = 1920, H = 1080;

const P = {
  navy: '#071B35',
  navyDeep: '#040F1F',
  royal: '#123B70',
  royalLight: '#1C4E8C',
  teal: '#16C6B7',
  tealSoft: '#5FE3D4',
  tealDeep: '#0E9A8F',
  white: '#FFFFFF',
  gold: '#F5C451',
  goldDeep: '#D9A22E',
  goldLight: '#FFE7A8',
  red: '#FF5A5F',
  green: '#25D366',
  fbBlue: '#1877F2',
  ink: '#04101D',
};

const F = {
  bn: 'BengaliUI',        // Noto Sans Bengali (UI / subtitles)
  bnDisp: 'BengaliDisplay', // Baloo Da 2 (display headings)
  bnText: 'HindUI',       // Hind Siliguri
  en: 'Geo',              // Poppins
};

/* ---------------------------------------------------------- math helpers */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, v) => (b === a ? 0 : clamp((v - a) / (b - a)));
const TAU = Math.PI * 2;

const E = {
  linear: (x) => x,
  inQ: (x) => x * x,
  outQ: (x) => 1 - (1 - x) * (1 - x),
  out: (x) => 1 - Math.pow(1 - x, 3),
  out5: (x) => 1 - Math.pow(1 - x, 5),
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutQ: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  back: (x, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  elastic: (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

/** deterministic pseudo random in [0,1) for a given seed */
function rnd(seed) {
  let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function rnd2(a, b) {
  return rnd(a * 91.7 + b * 13.13);
}
const rrange = (seed, a, b) => a + rnd(seed) * (b - a);

/* ---------------------------------------------------------- colour utils */
function rgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function mix(h1, h2, t) {
  const p = (h) => { const s = h.replace('#', ''); const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const a = p(h1), b = p(h2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}

/* ---------------------------------------------------------- canvas basics */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function radial(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function lingrad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/* soft light blob */
function glow(ctx, x, y, r, color, alpha = 1, blend = 'lighter') {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalCompositeOperation = blend;
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = radial(ctx, x, y, r, [[0, rgba(color, 0.55)], [0.45, rgba(color, 0.18)], [1, rgba(color, 0)]]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* premium glass card */
function glass(ctx, x, y, w, h, r, o = {}) {
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= a;
  if (o.shadow !== false) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = o.shadowBlur || 38;
    ctx.shadowOffsetY = o.shadowY === undefined ? 18 : o.shadowY;
  }
  ctx.fillStyle = lingrad(ctx, x, y, x + w * 0.4, y + h, [
    [0, rgba('#254A78', o.top === undefined ? 0.62 : o.top)],
    [1, rgba('#0B2138', o.bottom === undefined ? 0.78 : o.bottom)],
  ]);
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // hairline border
  ctx.lineWidth = o.borderW || 1.6;
  ctx.strokeStyle = lingrad(ctx, x, y, x, y + h, [
    [0, rgba('#FFFFFF', 0.36)],
    [0.5, rgba('#9FC4E8', 0.13)],
    [1, rgba(P.teal, 0.22)],
  ]);
  roundRect(ctx, x + 0.8, y + 0.8, w - 1.6, h - 1.6, r);
  ctx.stroke();
  // top specular
  ctx.globalAlpha *= 0.5;
  ctx.strokeStyle = rgba('#FFFFFF', 0.55);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.9, y + 2.4);
  ctx.lineTo(x + w - r * 0.9, y + 2.4);
  ctx.stroke();
  ctx.restore();
}

/* ---------------------------------------------------------- typography */
/**
 * draw(ctx, text, x, y, {size, family, weight, color, align, baseline,
 *                        spacing, alpha, glow, shadow, italic})
 */
function drawText(ctx, text, x, y, o = {}) {
  const size = o.size || 40;
  const fam = o.family || F.bn;
  const weight = o.weight || 600;
  const alpha = o.alpha === undefined ? 1 : o.alpha;
  if (alpha <= 0.004) return 0;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${o.italic ? 'italic ' : ''}${weight} ${size}px ${fam}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = (o.spacing || 0) + 'px';
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'alphabetic';
  if (o.shadow) {
    ctx.shadowColor = o.shadow;
    ctx.shadowBlur = o.shadowBlur || 16;
    ctx.shadowOffsetY = o.shadowY || 4;
  }
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = o.glowBlur || 34;
  }
  if (o.grad) {
    const m = ctx.measureText(text);
    const wdt = m.width || size;
    const x0 = o.align === 'center' ? x - wdt / 2 : o.align === 'right' ? x - wdt : x;
    ctx.fillStyle = lingrad(ctx, x0, y - size * 0.82, x0, y + size * 0.2, o.grad);
  } else {
    ctx.fillStyle = o.color || P.white;
  }
  ctx.fillText(text, x, y);
  if (o.stroke) {
    ctx.lineWidth = o.strokeW || 2;
    ctx.strokeStyle = o.stroke;
    ctx.strokeText(text, x, y);
  }
  const wdt = ctx.measureText(text).width;
  ctx.restore();
  return wdt;
}

/** text with a wipe reveal (left→right) — used for headline reveals */
function drawTextWipe(ctx, text, x, y, o = {}, reveal = 1) {
  if (reveal <= 0.001) return;
  if (reveal >= 0.999) { drawText(ctx, text, x, y, o); return; }
  ctx.save();
  const size = o.size || 40;
  ctx.font = `${o.weight || 600} ${size}px ${o.family || F.bn}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = (o.spacing || 0) + 'px';
  const wdt = ctx.measureText(text).width;
  const x0 = o.align === 'center' ? x - wdt / 2 : o.align === 'right' ? x - wdt : x;
  ctx.beginPath();
  ctx.rect(x0 - size * 0.3, y - size * 1.5, (wdt + size * 0.6) * reveal, size * 2.2);
  ctx.clip();
  // soften the leading edge with a small gradient mask
  drawText(ctx, text, x, y, o);
  ctx.restore();
  if (reveal < 0.995) {
    const ex = x0 + wdt * reveal;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lingrad(ctx, ex - 60, y, ex + 8, y, [[0, rgba(P.tealSoft, 0)], [0.7, rgba(P.tealSoft, 0.55)], [1, rgba('#FFFFFF', 0.9)]]);
    ctx.fillRect(ex - 60, y - size * 1.1, 68, size * 1.35);
    ctx.restore();
  }
}

/* ---------------------------------------------------------- components */
function pill(ctx, x, y, w, h, o = {}) {
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0.003) return;
  ctx.save();
  ctx.globalAlpha *= a;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = o.fill || rgba(P.teal, 0.14);
  ctx.fill();
  ctx.lineWidth = o.lw || 1.4;
  ctx.strokeStyle = o.stroke || rgba(P.teal, 0.55);
  ctx.stroke();
  if (o.text) {
    drawText(ctx, o.text, x + w / 2, y + h / 2 + (o.size || 22) * 0.36, {
      size: o.size || 22, family: o.font || F.bn, weight: o.weight || 600,
      color: o.color || P.tealSoft, align: 'center', spacing: o.spacing || 0.5,
    });
  }
  ctx.restore();
}

/** glowing progress ring; prog 0..1 */
function ring(ctx, cx, cy, r, prog, o = {}) {
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0.003) return;
  const lw = o.lw || 12;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.lineCap = 'round';
  // track
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.strokeStyle = o.track || rgba('#FFFFFF', 0.1);
  ctx.lineWidth = lw;
  ctx.stroke();
  // value
  const start = o.start === undefined ? -Math.PI / 2 : o.start;
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, start + TAU * clamp(prog));
  ctx.strokeStyle = o.color || lingrad(ctx, cx - r, cy - r, cx + r, cy + r, [[0, P.teal], [1, P.tealSoft]]);
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 26; }
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.restore();
}

function check(ctx, x, y, s, o = {}) {
  const p = o.prog === undefined ? 1 : clamp(o.prog);
  if (p <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
  ctx.strokeStyle = o.color || P.teal;
  ctx.lineWidth = o.lw || s * 0.22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 18; }
  const pts = [[-0.42, 0.02], [-0.1, 0.36], [0.46, -0.36]].map(([a, b]) => [x + a * s, y + b * s]);
  const d1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
  const d2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
  const total = d1 + d2;
  let len = total * Math.min(1, p * 1.4);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (len <= d1) {
    ctx.lineTo(lerp(pts[0][0], pts[1][0], len / d1), lerp(pts[0][1], pts[1][1], len / d1));
  } else {
    ctx.lineTo(pts[1][0], pts[1][1]);
    const k = (len - d1) / d2;
    ctx.lineTo(lerp(pts[1][0], pts[2][0], k), lerp(pts[1][1], pts[2][1], k));
  }
  ctx.stroke();
  ctx.restore();
}

/** the brand mark: a mathematically drawn sigma inside a rounded square */
function sigmaMark(ctx, x, y, s, o = {}) {
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0.003) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y);
  ctx.scale(o.scale || 1, o.scale || 1);
  const r = s * 0.26;
  if (o.plate !== false) {
    if (o.shadow !== false) { ctx.shadowColor = rgba(P.teal, 0.5); ctx.shadowBlur = s * 0.5; }
    roundRect(ctx, -s / 2, -s / 2, s, s, r);
    ctx.fillStyle = lingrad(ctx, -s / 2, -s / 2, s / 2, s / 2, [[0, P.royalLight], [1, P.navy]]);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = Math.max(1.4, s * 0.022);
    ctx.strokeStyle = lingrad(ctx, -s / 2, -s / 2, s / 2, s / 2, [[0, rgba(P.teal, 0.95)], [1, rgba(P.gold, 0.75)]]);
    roundRect(ctx, -s / 2, -s / 2, s, s, r);
    ctx.stroke();
  }
  // sigma glyph
  const w = s * 0.4, h = s * 0.44;
  ctx.beginPath();
  ctx.moveTo(w / 2, -h / 2);
  ctx.lineTo(-w / 2, -h / 2);
  ctx.lineTo(w * 0.08, 0);
  ctx.lineTo(-w / 2, h / 2);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineWidth = Math.max(2, s * 0.055);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = o.markColor || lingrad(ctx, -w / 2, -h / 2, w / 2, h / 2, [[0, P.white], [1, P.tealSoft]]);
  ctx.stroke();
  ctx.restore();
}

/* ---------------------------------------------------------- background */
let _grainTile = null;
let _gridTile = null;
function gridTile() {
  if (_gridTile) return _gridTile;
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(143,182,218,0.5)';
  g.fillRect(0, 0, 96, 1);
  g.fillRect(0, 0, 1, 96);
  _gridTile = c;
  return c;
}

function grainTile() {
  if (_grainTile) return _grainTile;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  _grainTile = c;
  return c;
}

/** deep cinematic backdrop shared by every scene */
let _bgLow = null;
const BG_K = 0.4;          // backdrop is rendered at 0.4 res and upscaled:
                           // it is pure smooth gradient, so this is visually
                           // identical and ~4x cheaper to rasterise.
function drawBackdrop(ctx, t) {
  if (!_bgLow) {
    _bgLow = document.createElement('canvas');
    _bgLow.width = Math.round(W * BG_K);
    _bgLow.height = Math.round(H * BG_K);
    _bgLow.ctx = _bgLow.getContext('2d', { alpha: false });
  }
  const b = _bgLow.ctx;
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.globalAlpha = 1;
  b.globalCompositeOperation = 'source-over';
  b.setTransform(BG_K, 0, 0, BG_K, 0, 0);

  b.fillStyle = lingrad(b, 0, 0, W * 0.35, H, [
    [0, '#0A2140'],
    [0.45, P.navy],
    [1, '#040E1C'],
  ]);
  b.fillRect(0, 0, W, H);

  // slow moving colour fields
  const b1 = 0.5 + 0.5 * Math.sin(t * 0.19);
  glow(b, lerp(300, 620, b1), lerp(240, 380, 0.5 + 0.5 * Math.sin(t * 0.13)), 760, P.royalLight, 0.5);
  glow(b, lerp(1680, 1400, 0.5 + 0.5 * Math.sin(t * 0.17 + 1.2)), lerp(760, 620, 0.5 + 0.5 * Math.sin(t * 0.11)), 700, P.tealDeep, 0.34);
  glow(b, lerp(1500, 1720, 0.5 + 0.5 * Math.sin(t * 0.1 + 2.4)), 980, 620, P.goldDeep, 0.12);

  ctx.drawImage(_bgLow, 0, 0, W, H);

  // technical grid — one patterned fill instead of 31 stroked lines
  ctx.save();
  ctx.globalAlpha = 0.13;
  const gs = 96;
  const ox = (t * 6) % gs;
  const oy = (t * 3.2) % gs;
  const pat = ctx.createPattern(gridTile(), 'repeat');
  ctx.translate(-ox, -oy);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W + gs, H + gs);
  ctx.restore();

  // horizon light
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = lingrad(ctx, 0, H * 0.55, 0, H, [[0, rgba(P.royal, 0)], [1, rgba(P.royalLight, 0.16)]]);
  ctx.fillRect(0, H * 0.55, W, H * 0.45);
  ctx.restore();
}

function drawVignette(ctx, strength = 0.9) {
  ctx.save();
  ctx.fillStyle = radial(ctx, W / 2, H * 0.46, W * 0.78, [
    [0.42, 'rgba(0,0,0,0)'],
    [0.78, `rgba(0,6,14,${0.28 * strength})`],
    [1, `rgba(0,4,10,${0.72 * strength})`],
  ]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawGrain(ctx, t) {
  const tile = grainTile();
  const pat = ctx.createPattern(tile, 'repeat');
  const f = Math.floor(t * 30);
  const ox = (f * 37) % 256, oy = (f * 71) % 256;
  ctx.save();
  ctx.globalAlpha = 0.028;
  ctx.globalCompositeOperation = 'overlay';
  ctx.translate(-ox, -oy);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}

/* ---------------------------------------------------------- ambient fx */
/** floating mathematical particles with parallax */
function mathParticles(ctx, t, o = {}) {
  const n = o.count || 46;
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0.004) return;
  ctx.save();
  ctx.globalAlpha *= a;
  for (let i = 0; i < n; i++) {
    const s = rnd(i * 3.7 + 1);
    const sp = rrange(i + 0.11, 0.25, 0.85) * (o.speed || 1);
    const x = ((rrange(i * 2.1, 0, W) + t * 14 * sp) % (W + 240)) - 120;
    const y = (rrange(i * 5.3, 0, H) - t * 22 * sp * (0.4 + s)) % H;
    const yy = y < -60 ? y + H + 120 : y;
    const r = lerp(1.2, 3.4, s) * (o.scale || 1);
    const al = lerp(0.12, 0.5, rnd(i * 7.7));
    ctx.fillStyle = rnd(i * 1.9) > 0.72 ? rgba(P.gold, al) : rgba(P.tealSoft, al);
    ctx.beginPath();
    ctx.arc(x, yy, r, 0, TAU);
    ctx.fill();
    if (r > 2.6) glow(ctx, x, yy, r * 7, rnd(i * 2.7) > 0.7 ? P.gold : P.teal, al * 0.5);
  }
  ctx.restore();
}

const GLYPHS = ['∑', '∫', 'π', '√', '∞', 'Δ', 'θ', '≈', '∠', 'ƒ', '∂', '≠', '±', '∴'];

function glyphField(ctx, t, o = {}) {
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0.004) return;
  ctx.save();
  ctx.globalAlpha *= a;
  for (let i = 0; i < GLYPHS.length; i++) {
    const bx = rrange(i * 4.3 + 2, 60, W - 60);
    const by = rrange(i * 8.1 + 5, 80, H - 60);
    const drift = Math.sin(t * (0.22 + 0.1 * rnd(i)) + i) * (18 + 22 * rnd(i * 1.3));
    const size = lerp(34, 88, rnd(i * 5.5)) * (o.scale || 1);
    const al = lerp(0.05, 0.16, rnd(i * 2.9)) * a;
    ctx.save();
    ctx.translate(bx + drift * 0.6, by + drift * 0.35 - (o.rise || 0));
    ctx.rotate(Math.sin(t * 0.14 + i) * 0.12);
    drawText(ctx, GLYPHS[i], 0, 0, {
      size, family: F.en, weight: 500, color: rgba('#C9E6FF', al),
      align: 'center', baseline: 'middle', spacing: 0,
    });
    ctx.restore();
  }
  ctx.restore();
}

/** a diagonal light sweep across a region (premium sheen) */
function sheen(ctx, t, x, y, w, h, o = {}) {
  const p = o.p;              // 0..1 travel
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (p <= 0 || p >= 1 || a <= 0.002) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= a * Math.sin(Math.PI * clamp(p)) * 0.9;
  ctx.beginPath();
  if (o.r) roundRect(ctx, x, y, w, h, o.r); else ctx.rect(x, y, w, h);
  ctx.clip();
  const cx = x - 320 + (w + 640) * E.inOutQ(p);
  const sk = (o.skew === undefined ? 0.35 : o.skew) * h;
  ctx.fillStyle = lingrad(ctx, cx - 150, y, cx + 150 + sk, y + h * 0.35, [
    [0, 'rgba(255,255,255,0)'],
    [0.34, 'rgba(170,238,255,0.13)'],
    [0.47, 'rgba(255,255,255,0.40)'],
    [0.5, 'rgba(255,255,255,0.52)'],
    [0.53, 'rgba(255,255,255,0.40)'],
    [0.66, 'rgba(170,238,255,0.13)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** 3D wireframe polyhedron — rotates, projects */
function wireframe(ctx, cx, cy, R, t, o = {}) {
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0.004) return;
  const az = t * (o.speed || 0.45) + (o.phase || 0);
  const el = 0.55 + Math.sin(t * 0.3) * 0.12;
  const verts = [
    [0, 1, 0], [0.894, 0.447, 0], [0.276, -0.447, 0.851], [-0.724, -0.447, 0.526],
    [-0.724, -0.447, -0.526], [0.276, -0.447, -0.851], [0.724, 0.447, 0.526],
    [-0.276, 0.447, 0.851], [-0.894, 0.447, 0], [-0.276, 0.447, -0.851], [0.724, 0.447, -0.526],
    [0, -1, 0],
  ];
  const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [6, 1], [6, 2], [7, 2], [7, 3], [8, 3],
    [8, 4], [9, 4], [9, 5], [10, 5], [10, 1], [6, 7], [7, 8], [8, 9], [9, 10], [10, 6],
    [11, 6], [11, 7], [11, 8], [11, 9], [11, 10]];
  const proj = verts.map(([x, y, z]) => {
    const x1 = x * Math.cos(az) - z * Math.sin(az);
    const z1 = x * Math.sin(az) + z * Math.cos(az);
    const y2 = y * Math.cos(el) - z1 * Math.sin(el);
    const z2 = y * Math.sin(el) + z1 * Math.cos(el);
    const persp = 2.6 / (2.6 + z2);
    return [cx + x1 * R * persp, cy + y2 * R * persp, z2, persp];
  });
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.lineCap = 'round';
  for (const [i, j] of edges) {
    const [x1, y1, z1] = proj[i];
    const [x2, y2, z2] = proj[j];
    const depth = (z1 + z2) / 2;
    const al = lerp(0.24, 0.9, inv(1, -1, depth));
    ctx.strokeStyle = rgba(depth > 0 ? P.tealSoft : '#9CC7F0', al * 0.75);
    ctx.lineWidth = lerp(1, 2.6, inv(1, -1, depth));
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  for (const [x, y, z, p] of proj) {
    const al = lerp(0.4, 1, inv(1, -1, z));
    ctx.fillStyle = rgba(z > 0 ? P.tealSoft : P.white, al);
    ctx.beginPath();
    ctx.arc(x, y, 3.2 * p, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** animated dashed measurement line with arrows */
function measureLine(ctx, x1, y1, x2, y2, prog, o = {}) {
  if (prog <= 0.001) return;
  const p = clamp(prog);
  const x2c = lerp(x1, x2, p), y2c = lerp(y1, y2, p);
  ctx.save();
  ctx.strokeStyle = o.color || rgba(P.gold, 0.95);
  ctx.lineWidth = o.lw || 2.2;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 16; }
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2c, y2c);
  ctx.stroke();
  // arrow heads
  ctx.setLineDash([]);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ar = o.arrow || 9;
  for (const [px, py, aa] of [[x1, y1, ang], [x2c, y2c, ang + Math.PI]]) {
    if (py === y2c && aa === ang + Math.PI && p < 0.98) continue;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(aa - 0.4) * ar, py + Math.sin(aa - 0.4) * ar);
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(aa + 0.4) * ar, py + Math.sin(aa + 0.4) * ar);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------------------------------------------------------- text metrics */
function measure(ctx, text, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 600} ${o.size || 40}px ${o.family || F.bn}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = (o.spacing || 0) + 'px';
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w;
}

/** wrap a plain string to lines of max width */
function wrapText(ctx, text, maxW, o = {}) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const cand = cur ? cur + ' ' + w : w;
    if (cur && measure(ctx, cand, o) > maxW) { lines.push(cur); cur = w; }
    else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines;
}
