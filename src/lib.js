/* Core canvas toolkit: all geometry is a pure function of absolute time. */
const W = 1920, H = 1080;
const P = {
  bg: '#06121E', bg2: '#081B2A', panel: '#0D2232', panel2: '#102B3D',
  line: '#1B3A50', lineBright: '#2C5268', white: '#F4F8FB', muted: '#9CB2C1',
  dim: '#648092', teal: '#37D6C1', teal2: '#78F1DD', blue: '#69A8FF',
  amber: '#FFCC72', violet: '#A994FF', rose: '#FF8296', green: '#81E0A0',
  red: '#FF6D78', ink: '#04101A',
};
const F = { bn: 'Hind', display: 'Baloo', en: 'Poppins', mono: 'Poppins' };
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const out = (x) => 1 - Math.pow(1 - clamp(x), 3);
const inOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const back = (x, s = 1.45) => { x = clamp(x); return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const rgba = (hex, a) => {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
};
const seeded = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function rounded(ctx, x, y, w, h, r = 18) {
  const q = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.arcTo(x + w, y, x + w, y + h, q);
  ctx.arcTo(x + w, y + h, x, y + h, q);
  ctx.arcTo(x, y + h, x, y, q);
  ctx.arcTo(x, y, x + w, y, q);
  ctx.closePath();
}
function rect(ctx, x, y, w, h, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.fillRect(x, y, w, h); ctx.restore();
}
function circle(ctx, x, y, r, color, alpha = 1, stroke = null, lw = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  if (color) { ctx.fillStyle = color; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  ctx.restore();
}
function line(ctx, x1, y1, x2, y2, color, width = 2, alpha = 1, dash = []) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.setLineDash(dash); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
function text(ctx, value, x, y, opts = {}) {
  const { size = 30, color = P.white, weight = 500, family = F.bn,
    align = 'left', baseline = 'middle', alpha = 1, glow = null, shadow = null,
    spacing = 0, maxWidth = undefined } = opts;
  if (alpha <= 0.002 || value === undefined || value === null || value === '') return 0;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.textAlign = align; ctx.textBaseline = baseline;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = opts.glowBlur || 20; }
  else if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = opts.shadowBlur || 10; ctx.shadowOffsetY = opts.shadowY || 3; }
  ctx.fillStyle = color;
  ctx.fillText(String(value), x, y, maxWidth);
  const width = ctx.measureText(String(value)).width;
  ctx.restore(); return width;
}
function measure(ctx, value, size = 30, weight = 500, family = F.bn) {
  ctx.save(); ctx.font = `${weight} ${size}px "${family}"`;
  const w = ctx.measureText(String(value)).width; ctx.restore(); return w;
}
function wrapText(ctx, value, maxWidth, size = 28, weight = 500, family = F.bn) {
  const words = String(value).split(/\s+/); const rows = []; let row = '';
  for (const word of words) {
    const next = row ? `${row} ${word}` : word;
    if (row && measure(ctx, next, size, weight, family) > maxWidth) { rows.push(row); row = word; }
    else row = next;
  }
  if (row) rows.push(row); return rows;
}
function paragraph(ctx, value, x, y, maxWidth, opts = {}) {
  const size = opts.size || 28, leading = opts.leading || size * 1.42;
  const rows = wrapText(ctx, value, maxWidth, size, opts.weight || 500, opts.family || F.bn);
  rows.forEach((row, i) => text(ctx, row, x, y + i * leading, opts));
  return rows.length * leading;
}
function panel(ctx, x, y, w, h, opts = {}) {
  const r = opts.r || 22; const a = opts.alpha === undefined ? 1 : opts.alpha;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.shadowColor = opts.shadowColor || 'rgba(0,0,0,0.30)'; ctx.shadowBlur = opts.shadowBlur || 28;
  ctx.shadowOffsetY = opts.shadowY || 12;
  rounded(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, opts.fill || '#10293A'); g.addColorStop(1, opts.fill2 || '#0A1C2A');
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.lineWidth = opts.lw || 1.5;
  ctx.strokeStyle = opts.stroke || 'rgba(115,165,195,0.20)';
  rounded(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r); ctx.stroke();
  if (opts.shine !== false) {
    ctx.beginPath(); ctx.moveTo(x + r, y + 2); ctx.lineTo(x + w - r, y + 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
}
function pill(ctx, label, x, y, opts = {}) {
  const size = opts.size || 18, padX = opts.padX || 16, h = opts.h || 38;
  const family = opts.family || F.en, weight = opts.weight || 600;
  const w = measure(ctx, label, size, weight, family) + padX * 2;
  const a = opts.alpha === undefined ? 1 : opts.alpha;
  ctx.save(); ctx.globalAlpha *= a;
  rounded(ctx, x, y, w, h, h / 2); ctx.fillStyle = opts.fill || rgba(opts.color || P.teal, 0.11); ctx.fill();
  ctx.lineWidth = 1.2; ctx.strokeStyle = opts.stroke || rgba(opts.color || P.teal, 0.35); ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + 1, { size, color: opts.textColor || opts.color || P.teal2,
    weight, family, align: 'center', alpha: 1 });
  ctx.restore(); return w;
}
function glow(ctx, x, y, r, color, alpha = 0.4) {
  if (alpha <= 0.002) return;
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, 0.48)); g.addColorStop(0.42, rgba(color, 0.16)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
}
function drawBackground(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#06121E'); g.addColorStop(0.52, '#081A28'); g.addColorStop(1, '#07131F');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  glow(ctx, 1460 + Math.sin(t * 0.11) * 65, 150, 590, '#12547A', 0.23);
  glow(ctx, 230, 790 + Math.cos(t * 0.08) * 42, 520, '#0B786F', 0.12);
  ctx.save(); ctx.globalAlpha = 0.11; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 80) { ctx.strokeStyle = x % 320 === 0 ? '#4A7188' : '#274253'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 80) { ctx.strokeStyle = y % 320 === 0 ? '#4A7188' : '#274253'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
  // Deterministic soft particles; their motion is time-based, never randomized per frame.
  for (let i = 0; i < 38; i++) {
    const x = seeded(i + 1) * W;
    const y = (seeded(i + 51) * H + t * (8 + seeded(i + 92) * 18)) % H;
    const r = 1.4 + seeded(i + 150) * 2.5;
    circle(ctx, x, y, r, i % 5 === 0 ? P.teal2 : '#8FB7CC', 0.08 + seeded(i + 200) * 0.11);
  }
  // Restrained edge vignette.
  const v = ctx.createRadialGradient(W * 0.5, H * 0.48, 300, W * 0.5, H * 0.48, 1120);
  v.addColorStop(0, 'rgba(2,9,15,0)'); v.addColorStop(1, 'rgba(1,7,12,0.52)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
function brandMark(ctx, t = 0) {
  const x = 112, y = 62;
  panel(ctx, x, y, 44, 44, { r: 13, fill: '#103449', fill2: '#0A2737', stroke: 'rgba(55,214,193,0.45)', shadowBlur: 16, shadowY: 5 });
  text(ctx, 'Py', x + 22, y + 22, { size: 20, color: P.teal2, weight: 700, family: F.en, align: 'center', glow: rgba(P.teal, 0.36), glowBlur: 12 });
  text(ctx, 'PYTHON / UNDER THE HOOD', x + 58, y + 13, { size: 14, color: P.muted, weight: 600, family: F.en, spacing: 2.0 });
  text(ctx, 'ইন্টারপ্রেটার অ্যানিমেশন', x + 58, y + 37, { size: 18, color: P.white, weight: 600 });
  // progress indicator for the full short film
  const ratio = TL.duration ? clamp(t / TL.duration) : 0;
  rounded(ctx, 1490, 70, 310, 5, 3); ctx.fillStyle = 'rgba(180,214,232,0.15)'; ctx.fill();
  rounded(ctx, 1490, 70, 310 * ratio, 5, 3); ctx.fillStyle = P.teal; ctx.fill();
}
function sectionHeading(ctx, scene, entrance = 1) {
  const x = 116, y = 175;
  pill(ctx, scene.chapter, x, y, { size: 15, h: 34, color: P.teal, family: F.en, padX: 15 });
  const a = clamp(entrance);
  text(ctx, scene.headline, x, y + 93, { size: 58, color: P.white, weight: 700, family: F.display, alpha: a, shadow: 'rgba(0,0,0,0.45)', shadowBlur: 12, shadowY: 4 });
  text(ctx, scene.dek, x + 2, y + 145, { size: 26, color: P.muted, weight: 500, alpha: a });
  // small accent rule to lock the section to the visual system
  ctx.save(); ctx.globalAlpha *= 0.92; rounded(ctx, x, y + 179, 76, 5, 3); ctx.fillStyle = P.teal; ctx.fill(); ctx.restore();
}
function arrow(ctx, x1, y1, x2, y2, color = P.teal, width = 3, alpha = 1) {
  line(ctx, x1, y1, x2, y2, color, width, alpha);
  const a = Math.atan2(y2 - y1, x2 - x1), len = 13;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x2, y2); ctx.lineTo(x2 - len * Math.cos(a - 0.55), y2 - len * Math.sin(a - 0.55));
  ctx.lineTo(x2 - len * Math.cos(a + 0.55), y2 - len * Math.sin(a + 0.55)); ctx.closePath(); ctx.fill(); ctx.restore();
}
function codeWindow(ctx, x, y, w, h, opts = {}) {
  panel(ctx, x, y, w, h, { r: opts.r || 18, fill: '#0A1A27', fill2: '#0A1724', stroke: opts.stroke || 'rgba(107,157,186,0.24)', shadowBlur: 20, shadowY: 9 });
  const barH = opts.barH || 48;
  rounded(ctx, x + 1, y + 1, w - 2, barH + 10, 17); ctx.fillStyle = 'rgba(27,54,72,0.50)'; ctx.fill();
  for (let i = 0; i < 3; i++) circle(ctx, x + 22 + i * 21, y + 24, 5, ['#FA7B78', '#FFC76B', '#69D69B'][i], 0.85);
  text(ctx, opts.title || 'main.py', x + 92, y + 24, { size: 15, color: P.dim, family: F.en, weight: 500 });
  return { x: x + 24, y: y + barH + 26, w: w - 48, h: h - barH - 36 };
}
function fit(ctx, value, maxWidth, size, weight = 500, family = F.bn) {
  let s = size;
  while (s > 16 && measure(ctx, value, s, weight, family) > maxWidth) s -= 1;
  return s;
}
