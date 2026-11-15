/* Ten explainers, each drawn at any timestamp without accumulating state. */

function sceneTiming(scene) { return TL.scenes.find(s => s.id === scene.id) || scene; }
function cueWord(cueId, needle, fallback = 0) {
  const cue = TL.cues[cueId - 1];
  if (!cue || !cue.words.length) return 0;
  if (needle) {
    const i = cue.words.findIndex(w => String(w.t).toLowerCase().includes(String(needle).toLowerCase()));
    if (i >= 0) return cue.words[i].start;
  }
  return cue.words[Math.min(fallback, cue.words.length - 1)].start;
}
function wordAnim(cueId, needle, t, duration = 0.48, fallback = 0) {
  return out(clamp((t - cueWord(cueId, needle, fallback)) / duration));
}
function sceneAnim(scene, t, delay = 0, duration = 0.65) {
  return out(clamp((t - scene.start - delay) / duration));
}
function enterCard(ctx, x, y, w, h, p, color = P.teal, opts = {}) {
  if (p <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= p;
  const dy = (1 - out(p)) * (opts.lift || 20);
  ctx.translate(0, dy);
  panel(ctx, x, y, w, h, { r: opts.r || 20, fill: opts.fill || '#10293A', fill2: '#0A1B29', stroke: rgba(color, 0.34), shadowBlur: 22, shadowY: 10 });
  ctx.restore();
}
function node(ctx, x, y, w, h, title, subtitle, color, p = 1, opts = {}) {
  if (p <= 0.003) return;
  enterCard(ctx, x, y, w, h, p, color, { r: opts.r || 18, lift: opts.lift || 16 });
  const a = clamp(p);
  circle(ctx, x + 24, y + 26, 5, color, 0.92 * a);
  text(ctx, title, x + 42, y + 28, { size: opts.titleSize || 23, color: P.white, weight: 650, family: opts.family || F.en, alpha: a });
  if (subtitle) text(ctx, subtitle, x + 42, y + h - 24, { size: opts.subSize || 16, color: P.muted, weight: 500, alpha: a });
  if (opts.value) text(ctx, opts.value, x + w - 24, y + h / 2, { size: opts.valueSize || 25, color, weight: 700, family: F.en, align: 'right', alpha: a });
}
function codeLine(ctx, x, y, number, parts, opts = {}) {
  const size = opts.size || 25, spacing = opts.spacing === undefined ? 11 : opts.spacing;
  text(ctx, String(number).padStart(2, '0'), x, y, { size: size * 0.68, color: P.dim, family: F.en, weight: 500 });
  let xx = x + 45;
  for (const part of parts) {
    const label = part.t;
    const w = text(ctx, label, xx, y, { size, color: part.c || P.white, family: F.en, weight: part.weight || 500, glow: part.glow ? rgba(part.c || P.teal, 0.36) : null, glowBlur: 12, alpha: part.a === undefined ? 1 : part.a });
    xx += w + (part.gap === undefined ? spacing : part.gap);
  }
}
function section(ctx, scene, t) {
  const p = sceneAnim(scene, t, 0.02, 0.55);
  sectionHeading(ctx, scene, p);
}
function glowRing(ctx, x, y, r, t, color = P.teal, speed = 1) {
  const phase = t * 0.65 * speed;
  for (let i = 0; i < 3; i++) {
    const rr = r + i * 22 + Math.sin(phase + i * 1.3) * 7;
    circle(ctx, x, y, rr, null, 1, rgba(color, 0.20 - i * 0.045), 2);
  }
  glow(ctx, x, y, r * 1.45, color, 0.12);
}
function lineReveal(ctx, x1, y1, x2, y2, p, color = P.teal, width = 3) {
  p = clamp(p); if (p <= 0.002) return;
  line(ctx, x1, y1, lerp(x1, x2, p), lerp(y1, y2, p), color, width, 0.78);
  if (p > 0.84) circle(ctx, x2, y2, 4, color, (p - 0.84) / 0.16);
}
function smallLabel(ctx, label, x, y, color = P.teal2, p = 1, family = F.en) {
  pill(ctx, label, x, y, { color, alpha: p, size: 14, h: 30, padX: 11, family, weight: 600 });
}

function drawIntro(ctx, t, scene) {
  section(ctx, scene, t);
  const p = sceneAnim(scene, t, 0.24, 0.8);
  const box = codeWindow(ctx, 124, 390, 744, 364, { title: 'lesson.py' });
  text(ctx, '01', box.x, box.y + 28, { size: 17, color: P.dim, family: F.en });
  codeLine(ctx, box.x, box.y + 85, 2, [{ t: 'total', c: P.blue }, { t: '=', c: P.muted }, { t: '4', c: P.amber }, { t: '+', c: P.muted }, { t: '6', c: P.amber }], { size: 33, spacing: 18 });
  line(ctx, box.x, box.y + 135, box.x + 628, box.y + 135, rgba(P.lineBright, 0.52), 1.2, p);
  smallLabel(ctx, 'SOURCE CODE', box.x, box.y + 185, P.blue, p);
  text(ctx, 'Human-readable instructions', box.x, box.y + 232, { size: 21, color: P.muted, alpha: p });
  // Route the source through a single, luminous interpreter core.
  lineReveal(ctx, 883, 564, 1085, 564, p, P.teal, 4);
  circle(ctx, 1014, 564, 7, P.teal2, p, null, 0);
  glowRing(ctx, 1300, 556, 128, t, P.teal, 1.05);
  circle(ctx, 1300, 556, 112, '#0B2A3A', 0.98, rgba(P.teal, 0.62), 2.4);
  circle(ctx, 1300, 556, 83, '#0B1D2B', 0.96, rgba(P.blue, 0.28), 1.5);
  text(ctx, 'CPython', 1300, 534, { size: 37, family: F.en, weight: 700, color: P.white, align: 'center', glow: rgba(P.teal, 0.34), glowBlur: 18, alpha: p });
  text(ctx, 'INTERPRETER', 1300, 580, { size: 15, family: F.en, weight: 600, color: P.teal2, align: 'center', spacing: 2.4, alpha: p });
  // floating stages around the core
  const orbit = [
    { x: 1145, y: 405, s: 'PARSE', c: P.violet },
    { x: 1440, y: 421, s: 'BYTECODE', c: P.amber },
    { x: 1450, y: 696, s: 'EXECUTE', c: P.green },
  ];
  orbit.forEach((o, i) => {
    const q = out(clamp((t - scene.start - 0.75 - i * 0.26) / 0.42));
    smallLabel(ctx, o.s, o.x, o.y, o.c, q);
  });
  lineReveal(ctx, 1415, 556, 1636, 556, p, P.teal, 4);
  panel(ctx, 1598, 489, 198, 135, { r: 22, fill: '#123044', fill2: '#091C2B', stroke: rgba(P.green, 0.38), alpha: p });
  text(ctx, 'OUTPUT', 1697, 525, { size: 14, color: P.muted, family: F.en, align: 'center', spacing: 2 });
  text(ctx, '10', 1697, 574, { size: 52, color: P.green, family: F.en, weight: 700, align: 'center', glow: rgba(P.green, 0.3), glowBlur: 16, alpha: p });
  const labels = ['SOURCE', 'TOKENIZE', 'PARSE', 'BYTECODE', 'RUN'];
  const colors = [P.blue, P.teal, P.violet, P.amber, P.green];
  const startX = 126, y = 804, gap = 329;
  labels.forEach((label, i) => {
    const q = out(clamp((t - scene.start - 1.1 - i * 0.14) / 0.48));
    if (i < labels.length - 1) arrow(ctx, startX + i * gap + 183, y + 17, startX + (i + 1) * gap - 16, y + 17, rgba(colors[i], 0.74), 2, q);
    smallLabel(ctx, label, startX + i * gap, y, colors[i], q);
  });
}

function drawTokens(ctx, t, scene) {
  section(ctx, scene, t);
  const p = wordAnim(2, 'টোকেনাইজার', t, 0.55, 0);
  const b = codeWindow(ctx, 124, 390, 772, 320, { title: 'example.py' });
  text(ctx, 'total = 4 + 6', b.x, b.y + 68, { size: 37, family: F.en, weight: 600, color: P.white, alpha: p });
  const codeParts = [
    { x: b.x + 2, w: 112, label: 'total', color: P.blue, caption: 'NAME' },
    { x: b.x + 150, w: 50, label: '=', color: P.violet, caption: 'OP' },
    { x: b.x + 236, w: 38, label: '4', color: P.amber, caption: 'NUMBER' },
    { x: b.x + 311, w: 50, label: '+', color: P.violet, caption: 'OP' },
    { x: b.x + 397, w: 38, label: '6', color: P.amber, caption: 'NUMBER' },
  ];
  codeParts.forEach((o, i) => {
    const q = wordAnim(2, ['নাম', 'চিহ্ন', 'সংখ্যা', 'চিহ্ন', 'সংখ্যা'][i], t, 0.38, 3 + i * 2);
    rounded(ctx, o.x - 9, b.y + 112, o.w + 18, 58, 11); ctx.fillStyle = rgba(o.color, 0.13 * q); ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(o.color, 0.44 * q); ctx.stroke();
    text(ctx, o.caption, o.x + o.w / 2, b.y + 197, { size: 13, color: o.color, family: F.en, align: 'center', weight: 600, spacing: 1.4, alpha: q });
  });
  // tokenize stream: visible cards arrive as the narration names each class.
  const stream = [
    ['NAME', 'total', P.blue, 4], ['OPERATOR', '=', P.violet, 7], ['NUMBER', '4', P.amber, 8],
    ['OPERATOR', '+', P.violet, 10], ['NUMBER', '6', P.amber, 12],
  ];
  stream.forEach(([type, value, color, wi], i) => {
    const q = wordAnim(2, '', t, 0.38, wi);
    const x = 1014 + (i % 2) * 360, y = 394 + Math.floor(i / 2) * 116;
    node(ctx, x, y, 326, 84, type, `token  ·  ${value}`, color, q, { titleSize: 17, subSize: 18 });
    if (i > 0) line(ctx, x - 16, y + 42, x - 3, y + 42, rgba(color, 0.56), 2, q);
  });
  const errorP = wordAnim(2, 'ইন্ডেন্টেশন', t, 0.42, 18);
  panel(ctx, 124, 751, 1718, 83, { r: 18, fill: '#251C26', fill2: '#161923', stroke: rgba(P.rose, 0.30), alpha: errorP });
  circle(ctx, 160, 792, 11, P.rose, errorP);
  text(ctx, 'SYNTAX CHECK', 190, 792, { size: 15, color: P.rose, family: F.en, weight: 700, spacing: 1.4, alpha: errorP });
  text(ctx, 'ভুল ইন্ডেন্টেশন বা অসমাপ্ত স্ট্রিং → parsing শুরু হওয়ার আগেই থামুন', 390, 792, { size: 22, color: '#F0D6DA', alpha: errorP });
}

function drawParser(ctx, t, scene) {
  section(ctx, scene, t);
  const p = wordAnim(3, 'পার্সার', t, 0.48, 0);
  const left = codeWindow(ctx, 124, 400, 484, 326, { title: 'source' });
  codeLine(ctx, left.x, left.y + 74, 1, [{ t: 'total', c: P.blue }, { t: '=', c: P.muted }], { size: 27, spacing: 12 });
  codeLine(ctx, left.x, left.y + 129, 2, [{ t: '4', c: P.amber }, { t: '+', c: P.violet }, { t: '6', c: P.amber }], { size: 27, spacing: 12 });
  smallLabel(ctx, 'TOKENS IN ORDER', left.x, left.y + 213, P.blue, p);
  text(ctx, 'সিনট্যাক্স যাচাই', left.x, left.y + 262, { size: 21, color: P.muted, alpha: p });
  // AST edges reveal first, then their nodes.
  const a = wordAnim(3, 'গাছ', t, 0.48, 7);
  lineReveal(ctx, 625, 563, 930, 456, a, P.violet, 3);
  lineReveal(ctx, 625, 563, 1192, 456, a, P.violet, 3);
  lineReveal(ctx, 1225, 497, 1123, 620, wordAnim(3, 'যোগ', t, 0.45, 15), P.teal, 3);
  lineReveal(ctx, 1250, 497, 1390, 620, wordAnim(3, 'যোগ', t, 0.45, 15), P.teal, 3);
  node(ctx, 902, 398, 260, 98, 'Assign', 'assignment statement', P.violet, a, { titleSize: 22 });
  node(ctx, 1168, 398, 276, 98, 'BinaryOp', 'operator: +', P.teal, wordAnim(3, 'যোগ', t, 0.46, 15), { titleSize: 22 });
  node(ctx, 568, 520, 214, 92, 'Name', 'total', P.blue, a, { titleSize: 21 });
  node(ctx, 1012, 620, 214, 92, 'Constant', '4', P.amber, wordAnim(3, 'মান', t, 0.44, 19), { titleSize: 20, value: '4' });
  node(ctx, 1292, 620, 214, 92, 'Constant', '6', P.amber, wordAnim(3, 'মান', t, 0.44, 19), { titleSize: 20, value: '6' });
  // A small readable parse-tree legend.
  panel(ctx, 1530, 405, 295, 280, { r: 20, fill: '#0C2030', fill2: '#091824', stroke: rgba(P.violet, 0.26), alpha: p });
  text(ctx, 'AST', 1560, 445, { size: 32, family: F.en, weight: 700, color: P.violet, alpha: p });
  text(ctx, 'Abstract Syntax Tree', 1560, 486, { size: 17, family: F.en, weight: 500, color: P.muted, alpha: p });
  line(ctx, 1560, 515, 1788, 515, rgba(P.lineBright, 0.62), 1.5, p);
  text(ctx, 'রানটাইমে আগে থেকেই', 1560, 555, { size: 19, color: P.white, alpha: p });
  text(ctx, 'গঠিত অর্থবহ structure', 1560, 591, { size: 19, color: P.teal2, weight: 600, alpha: p });
  text(ctx, 'অপারেশনের ক্রম স্পষ্ট', 1560, 640, { size: 18, color: P.muted, alpha: p });
}

function drawCompiler(ctx, t, scene) {
  section(ctx, scene, t);
  const p = wordAnim(4, 'কম্পাইলার', t, 0.5, 0);
  panel(ctx, 124, 405, 440, 344, { r: 22, fill: '#0B1D2B', fill2: '#081622', stroke: rgba(P.violet, 0.27), alpha: p });
  text(ctx, 'AST', 162, 444, { size: 17, color: P.violet, family: F.en, weight: 700, spacing: 1.8, alpha: p });
  // tree glyph
  lineReveal(ctx, 244, 517, 244, 580, p, P.violet, 3);
  lineReveal(ctx, 244, 580, 192, 638, p, P.violet, 3);
  lineReveal(ctx, 244, 580, 302, 638, p, P.violet, 3);
  circle(ctx, 244, 514, 18, rgba(P.violet, 0.22 * p), p, rgba(P.violet, 0.68), 2);
  circle(ctx, 192, 641, 14, rgba(P.blue, 0.26 * p), p, rgba(P.blue, 0.65), 2);
  circle(ctx, 302, 641, 14, rgba(P.amber, 0.26 * p), p, rgba(P.amber, 0.68), 2);
  circle(ctx, 352, 641, 14, rgba(P.teal, 0.26 * p), p, rgba(P.teal, 0.68), 2);
  text(ctx, 'structured program', 162, 709, { size: 19, color: P.muted, family: F.en, alpha: p });
  // compilation core
  const compP = wordAnim(4, 'রূপ', t, 0.56, 12);
  glowRing(ctx, 825, 572, 98, t, P.amber, 0.8);
  circle(ctx, 825, 572, 76, '#142B3A', 0.98, rgba(P.amber, 0.52), 2);
  text(ctx, 'COMPILE', 825, 556, { size: 18, family: F.en, weight: 700, color: P.amber, align: 'center', alpha: compP });
  text(ctx, 'AST → code', 825, 591, { size: 15, family: F.en, color: P.muted, align: 'center', alpha: compP });
  lineReveal(ctx, 570, 570, 725, 570, compP, P.amber, 3);
  lineReveal(ctx, 925, 570, 1076, 570, compP, P.amber, 3);
  // bytecode instructions
  const code = codeWindow(ctx, 1090, 390, 714, 363, { title: 'code object · illustrative CPython bytecode' });
  const rows = [
    ['01', 'LOAD_CONST', '4', P.amber],
    ['02', 'LOAD_CONST', '6', P.amber],
    ['03', 'BINARY_OP', '+', P.violet],
    ['04', 'STORE_NAME', 'total', P.blue],
  ];
  rows.forEach((r, i) => {
    const q = wordAnim(4, i < 2 ? 'বাইটকোডে' : 'ক্যাশ', t, 0.42, 9 + i * 2);
    const yy = code.y + 57 + i * 52;
    rounded(ctx, code.x - 8, yy - 21, code.w, 42, 9); ctx.fillStyle = rgba(r[3], 0.08 * q); ctx.fill();
    text(ctx, r[0], code.x, yy, { size: 16, color: P.dim, family: F.en, alpha: q });
    text(ctx, r[1], code.x + 58, yy, { size: 18, color: r[3], family: F.en, weight: 600, alpha: q });
    text(ctx, r[2], code.x + 284, yy, { size: 19, color: P.white, family: F.en, weight: 500, alpha: q });
    if (i < rows.length - 1) line(ctx, code.x, yy + 25, code.x + code.w - 20, yy + 25, rgba(P.line, 0.55), 1, q);
  });
  const cacheP = wordAnim(4, 'পি-ওয়াই-সি', t, 0.45, 18);
  panel(ctx, 1090, 778, 714, 71, { r: 16, fill: '#10283A', fill2: '#0A1D2B', stroke: rgba(P.blue, 0.28), alpha: cacheP });
  text(ctx, '__pycache__ / module.pyc', 1121, 813, { size: 18, family: F.en, weight: 600, color: P.blue, alpha: cacheP });
  text(ctx, 'optional bytecode cache', 1773, 813, { size: 15, family: F.en, align: 'right', color: P.muted, alpha: cacheP });
}

function drawVm(ctx, t, scene) {
  section(ctx, scene, t);
  const p = wordAnim(5, 'ভার্চুয়াল', t, 0.5, 5);
  const left = codeWindow(ctx, 124, 400, 470, 386, { title: 'bytecode' });
  const ops = ['LOAD_CONST  4', 'LOAD_CONST  6', 'BINARY_OP  +', 'STORE_NAME total'];
  ops.forEach((op, i) => {
    const q = wordAnim(5, i < 2 ? 'বাইটকোড' : 'নির্দেশ', t, 0.32, 7 + i * 3);
    const yy = left.y + 42 + i * 58;
    const active = i === Math.floor(((t - scene.start) * 0.7) % ops.length);
    rounded(ctx, left.x - 8, yy - 20, 414, 42, 9); ctx.fillStyle = rgba(active ? P.teal : P.blue, (active ? 0.17 : 0.045) * q); ctx.fill();
    text(ctx, op, left.x + 4, yy, { size: 17, family: F.en, color: active ? P.teal2 : '#BBD0DC', weight: active ? 700 : 500, alpha: q });
  });
  smallLabel(ctx, 'NOT NATIVE MACHINE CODE', 145, 741, P.amber, wordAnim(5, 'মেশিন', t, 0.5, 3));
  // Evaluation loop with a rotating dispatch marker.
  const cx = 1054, cy = 571, r = 182;
  glowRing(ctx, cx, cy, r - 28, t, P.teal, 1.3);
  ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = rgba(P.teal, 0.52); ctx.beginPath(); ctx.arc(cx, cy, r, -2.45, 2.40); ctx.stroke(); ctx.restore();
  const a = t * 0.9 - 1.6;
  const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
  circle(ctx, px, py, 11, P.teal2, 0.98, '#E7FFFB', 2); glow(ctx, px, py, 38, P.teal, 0.42);
  const steps = [
    { x: 914, y: 385, l: 'READ', c: P.blue }, { x: 1126, y: 385, l: 'DISPATCH', c: P.violet },
    { x: 1144, y: 720, l: 'EXECUTE', c: P.green }, { x: 886, y: 720, l: 'REPEAT', c: P.amber },
  ];
  steps.forEach((s, i) => smallLabel(ctx, s.l, s.x, s.y, s.c, out(clamp((t - scene.start - 0.55 - i * 0.12) / 0.38))));
  circle(ctx, cx, cy, 110, '#0A1D2A', 0.97, rgba(P.teal, 0.25), 1.5);
  text(ctx, 'EVALUATION', cx, cy - 23, { size: 17, family: F.en, color: P.muted, weight: 600, align: 'center', spacing: 1.5, alpha: p });
  text(ctx, 'LOOP', cx, cy + 23, { size: 42, family: F.en, color: P.teal2, weight: 700, align: 'center', glow: rgba(P.teal, 0.22), glowBlur: 16, alpha: p });
  // operand stack on right
  panel(ctx, 1395, 395, 408, 385, { r: 22, fill: '#0B1C2A', fill2: '#091722', stroke: rgba(P.violet, 0.28), alpha: p });
  text(ctx, 'VALUE STACK', 1430, 435, { size: 17, family: F.en, color: P.violet, weight: 700, spacing: 1.8, alpha: p });
  const stack = [{ v: '4', c: P.amber }, { v: '6', c: P.amber }, { v: '10', c: P.green }];
  stack.forEach((o, i) => {
    const q = wordAnim(5, i === 2 ? 'ফল' : 'স্ট্যাক', t, 0.42, 18 + i * 3);
    const yy = 682 - i * 80;
    panel(ctx, 1450, yy, 296, 60, { r: 14, fill: '#132B3C', fill2: '#0B202F', stroke: rgba(o.c, 0.40), alpha: q });
    text(ctx, o.v, 1480, yy + 30, { size: 25, family: F.en, color: o.c, weight: 700, alpha: q });
    text(ctx, i === 2 ? 'result' : 'operand', 1718, yy + 30, { size: 14, family: F.en, color: P.muted, align: 'right', alpha: q });
  });
}

function drawFrames(ctx, t, scene) {
  section(ctx, scene, t);
  const p = wordAnim(6, 'ফ্রেম', t, 0.48, 4);
  panel(ctx, 124, 394, 542, 435, { r: 22, fill: '#0A1B29', fill2: '#081722', stroke: rgba(P.blue, 0.28), alpha: p });
  text(ctx, 'CALL STACK', 160, 431, { size: 17, family: F.en, weight: 700, color: P.blue, spacing: 1.8, alpha: p });
  const frameData = [
    { title: 'FRAME 02 · add()', locals: 'a  =  4     b  =  6', color: P.teal, y: 492 },
    { title: 'FRAME 01 · <module>', locals: 'total  =  <pending>', color: P.violet, y: 666 },
  ];
  frameData.forEach((f, i) => {
    const q = wordAnim(6, i === 0 ? 'ফাংশন' : 'স্ট্যাক', t, 0.45, 3 + i * 4);
    panel(ctx, 160, f.y, 470, 132, { r: 16, fill: '#10283A', fill2: '#0A1E2D', stroke: rgba(f.color, 0.38), alpha: q });
    text(ctx, f.title, 188, f.y + 35, { size: 16, family: F.en, weight: 700, color: f.color, alpha: q });
    text(ctx, f.locals, 188, f.y + 82, { size: 19, family: F.en, color: P.white, weight: 500, alpha: q });
  });
  arrow(ctx, 394, 656, 394, 638, P.teal, 3, p);
  const code = codeWindow(ctx, 740, 394, 1064, 304, { title: 'function call · frame state' });
  codeLine(ctx, code.x, code.y + 59, 1, [{ t: 'def', c: P.violet }, { t: ' add(a, b):', c: P.blue }], { size: 27, spacing: 2 });
  codeLine(ctx, code.x, code.y + 111, 2, [{ t: 'return', c: P.violet }, { t: ' a + b', c: P.white }], { size: 27, spacing: 2 });
  line(ctx, code.x, code.y + 154, code.x + 940, code.y + 154, rgba(P.lineBright, 0.55), 1.2, p);
  smallLabel(ctx, 'LOCALS', code.x, code.y + 199, P.blue, p);
  smallLabel(ctx, 'INSTRUCTION POINTER', code.x + 170, code.y + 199, P.amber, p);
  smallLabel(ctx, 'EVALUATION STACK', code.x + 460, code.y + 199, P.teal, p);
  // return value path
  const ret = wordAnim(6, 'ফল', t, 0.45, 12);
  panel(ctx, 740, 742, 1064, 90, { r: 18, fill: '#0F2A36', fill2: '#091D28', stroke: rgba(P.green, 0.35), alpha: ret });
  text(ctx, 'RETURN VALUE', 774, 787, { size: 15, family: F.en, color: P.muted, weight: 700, spacing: 1.5, alpha: ret });
  text(ctx, '10', 1745, 787, { size: 36, family: F.en, color: P.green, weight: 700, align: 'right', glow: rgba(P.green, 0.26), alpha: ret });
}

function drawMemory(ctx, t, scene) {
  section(ctx, scene, t);
  const p = wordAnim(7, 'ভেরিয়েবল', t, 0.5, 0);
  const names = [
    { x: 174, y: 432, name: 'total', value: '10', c: P.blue, word: 'নামগুলো' },
    { x: 174, y: 638, name: 'answer', value: '10', c: P.violet, word: 'অবজেক্টকে' },
  ];
  names.forEach((n, i) => {
    const q = wordAnim(7, n.word, t, 0.44, i * 4 + 7);
    panel(ctx, n.x, n.y, 330, 112, { r: 19, fill: '#10283A', fill2: '#0A1D2C', stroke: rgba(n.c, 0.40), alpha: q });
    text(ctx, 'NAME', n.x + 26, n.y + 28, { size: 13, family: F.en, color: P.muted, weight: 700, spacing: 1.7, alpha: q });
    text(ctx, n.name, n.x + 26, n.y + 73, { size: 24, family: F.en, color: n.c, weight: 700, alpha: q });
  });
  const objectP = wordAnim(7, 'অবজেক্ট', t, 0.46, 11);
  // Distinct object boxes illustrate the name → object relationship (not value containers).
  lineReveal(ctx, 512, 488, 842, 488, objectP, P.blue, 3);
  lineReveal(ctx, 512, 694, 842, 694, objectP, P.violet, 3);
  [
    { y: 434, c: P.blue, label: 'INTEGER OBJECT', value: '10' },
    { y: 640, c: P.violet, label: 'INTEGER OBJECT', value: '10' },
  ].forEach((o, i) => {
    panel(ctx, 850, o.y, 390, 108, { r: 20, fill: '#12293A', fill2: '#0A1D2B', stroke: rgba(o.c, 0.42), alpha: objectP });
    text(ctx, o.label, 880, o.y + 32, { size: 14, family: F.en, color: P.muted, weight: 700, spacing: 1.4, alpha: objectP });
    text(ctx, o.value, 880, o.y + 74, { size: 29, family: F.en, color: o.c, weight: 700, alpha: objectP });
    circle(ctx, 1196, o.y + 54, 7, o.c, objectP);
  });
  // Count metaphor / collector
  panel(ctx, 1332, 405, 470, 396, { r: 22, fill: '#0B1D2B', fill2: '#081722', stroke: rgba(P.amber, 0.28), alpha: p });
  text(ctx, 'CPYTHON MEMORY', 1370, 449, { size: 16, family: F.en, color: P.amber, weight: 700, spacing: 1.7, alpha: p });
  const gaugeP = wordAnim(7, 'রেফারেন্স', t, 0.48, 13);
  const gx = 1423, gy = 560, gr = 58;
  circle(ctx, gx, gy, gr, null, 1, rgba(P.amber, 0.15), 9);
  ctx.save(); ctx.beginPath(); ctx.arc(gx, gy, gr, -Math.PI * 0.80, -Math.PI * 0.80 + Math.PI * 1.52 * clamp(gaugeP)); ctx.strokeStyle = P.amber; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
  text(ctx, '2', gx, gy - 2, { size: 35, family: F.en, color: P.amber, weight: 700, align: 'center', alpha: gaugeP });
  text(ctx, 'references', gx, gy + 32, { size: 12, family: F.en, color: P.muted, align: 'center', alpha: gaugeP });
  text(ctx, 'reference counting', 1528, 544, { size: 18, family: F.en, color: P.white, weight: 600, alpha: gaugeP });
  text(ctx, 'plus cyclic garbage collection', 1528, 578, { size: 15, family: F.en, color: P.muted, alpha: gaugeP });
  line(ctx, 1370, 650, 1766, 650, rgba(P.lineBright, 0.56), 1.3, p);
  const collectP = wordAnim(7, 'মেমরি', t, 0.42, 19);
  circle(ctx, 1392, 703, 8, P.rose, collectP);
  text(ctx, 'unreachable cycles can be collected', 1414, 703, { size: 14, family: F.en, color: P.muted, alpha: collectP });
  text(ctx, 'names point to objects — they are not boxes', 1338, 846, { size: 16, family: F.en, color: P.dim, alpha: p });
}

function drawErrors(ctx, t, scene) {
  section(ctx, scene, t);
  const p = wordAnim(8, 'এক্সেপশন', t, 0.46, 5);
  const code = codeWindow(ctx, 124, 395, 770, 354, { title: 'broken_example.py' });
  codeLine(ctx, code.x, code.y + 74, 1, [{ t: 'total', c: P.blue }, { t: '=', c: P.muted }, { t: '4', c: P.amber }, { t: '+', c: P.violet }, { t: '"6"', c: P.rose }], { size: 27, spacing: 10 });
  line(ctx, code.x - 2, code.y + 107, code.x + 650, code.y + 107, rgba(P.rose, 0.28), 2, p);
  text(ctx, 'int  +  str  →  unsupported operation', code.x, code.y + 166, { size: 18, family: F.en, color: P.muted, alpha: p });
  const q = wordAnim(8, 'ট্রেসব্যাক', t, 0.45, 10);
  panel(ctx, 1012, 395, 790, 354, { r: 22, fill: '#1D1B29', fill2: '#101923', stroke: rgba(P.rose, 0.42), alpha: q });
  rounded(ctx, 1013, 396, 788, 55, 20); ctx.fillStyle = rgba(P.rose, 0.13 * q); ctx.fill();
  circle(ctx, 1045, 423, 6, P.rose, q);
  text(ctx, 'EXCEPTION TRACEBACK', 1067, 423, { size: 15, family: F.en, color: P.rose, weight: 700, spacing: 1.6, alpha: q });
  text(ctx, 'File "broken_example.py", line 1', 1050, 504, { size: 18, family: F.en, color: '#D4E0E8', alpha: q });
  text(ctx, 'total = 4 + "6"', 1050, 552, { size: 20, family: F.en, color: P.white, weight: 600, alpha: q });
  rounded(ctx, 1048, 579, 692, 44, 9); ctx.fillStyle = rgba(P.rose, 0.12 * q); ctx.fill();
  text(ctx, 'TypeError: cannot add int and str', 1068, 601, { size: 16, family: F.en, color: '#FFA6B1', weight: 600, alpha: q });
  // vertical trace path
  const pathP = wordAnim(8, 'কোন', t, 0.45, 15);
  line(ctx, 158, 801, 1749, 801, rgba(P.lineBright, 0.62), 2, pathP);
  const trace = [
    ['FILE', 'broken_example.py', P.blue], ['LINE', '01', P.amber], ['CALL', '<module>', P.violet], ['ERROR', 'TypeError', P.rose],
  ];
  trace.forEach((row, i) => {
    const x = 148 + i * 420; const a = wordAnim(8, i === 3 ? 'ত্রুটি' : 'ফাইল', t, 0.36, 17 + i * 2);
    circle(ctx, x, 801, 8, row[2], a);
    text(ctx, row[0], x, 839, { size: 12, family: F.en, color: row[2], weight: 700, spacing: 1.5, align: 'center', alpha: a });
    text(ctx, row[1], x, 868, { size: 15, family: F.en, color: P.muted, align: 'center', alpha: a });
  });
}

function drawEngines(ctx, t, scene) {
  section(ctx, scene, t);
  const p = wordAnim(9, 'পাইথন', t, 0.48, 0);
  panel(ctx, 620, 387, 684, 112, { r: 22, fill: '#102B3B', fill2: '#0B1E2C', stroke: rgba(P.teal, 0.38), alpha: p });
  text(ctx, 'PYTHON LANGUAGE', 962, 426, { size: 17, family: F.en, color: P.teal2, weight: 700, align: 'center', spacing: 2, alpha: p });
  text(ctx, 'shared syntax · shared semantics', 962, 465, { size: 17, family: F.en, color: P.muted, align: 'center', alpha: p });
  const b = wordAnim(9, 'ইমপ্লিমেন্টেশন', t, 0.5, 13);
  lineReveal(ctx, 960, 508, 575, 596, b, P.teal, 3);
  lineReveal(ctx, 960, 508, 1346, 596, b, P.teal, 3);
  const cards = [
    { x: 188, title: 'CPython', color: P.blue, subtitle: 'bytecode · evaluation loop', badge: 'DEFAULT IMPLEMENTATION', parts: ['compiler', 'VM'] },
    { x: 1028, title: 'PyPy', color: P.violet, subtitle: 'bytecode · tracing JIT', badge: 'ALTERNATIVE ENGINE', parts: ['JIT', 'runtime'] },
  ];
  cards.forEach((c, i) => {
    const q = wordAnim(9, i === 0 ? 'সিপাইথন' : 'পাইপাই', t, 0.48, 4 + i * 8);
    panel(ctx, c.x, 596, 704, 218, { r: 24, fill: '#102536', fill2: '#091925', stroke: rgba(c.color, 0.44), alpha: q });
    smallLabel(ctx, c.badge, c.x + 30, 621, c.color, q);
    text(ctx, c.title, c.x + 34, 689, { size: 40, family: F.en, color: c.color, weight: 700, alpha: q });
    text(ctx, c.subtitle, c.x + 34, 741, { size: 18, family: F.en, color: P.white, alpha: q });
    c.parts.forEach((part, j) => {
      const xx = c.x + 474 + (j % 2) * 104;
      panel(ctx, xx, 665, 95, 56, { r: 12, fill: '#0B1C29', fill2: '#081620', stroke: rgba(c.color, 0.32), alpha: q });
      text(ctx, part, xx + 47, 693, { size: 13, family: F.en, color: P.muted, align: 'center', weight: 600, alpha: q });
    });
  });
  pill(ctx, 'same language · different runtime design', 714, 844, { size: 15, h: 34, color: P.amber, family: F.en, alpha: b, padX: 18 });
}

function drawRecap(ctx, t, scene) {
  section(ctx, scene, t);
  const p = sceneAnim(scene, t, 0.14, 0.6);
  const flow = [
    { x: 124, title: 'SOURCE', sub: '.py', color: P.blue },
    { x: 468, title: 'TOKENS', sub: 'lexical units', color: P.teal },
    { x: 812, title: 'AST', sub: 'program structure', color: P.violet },
    { x: 1156, title: 'BYTECODE', sub: 'code object', color: P.amber },
    { x: 1500, title: 'VM', sub: 'execute', color: P.green },
  ];
  flow.forEach((o, i) => {
    const q = wordAnim(10, ['', 'টোকেন', 'ট্রি', 'বাইটকোড', 'ভার্চুয়াল'][i], t, 0.48, i * 4);
    const x = o.x, y = 460;
    panel(ctx, x, y, 292, 190, { r: 24, fill: '#10293A', fill2: '#091B29', stroke: rgba(o.color, 0.40), alpha: q });
    circle(ctx, x + 34, y + 36, 7, o.color, q);
    text(ctx, o.title, x + 30, y + 88, { size: 23, family: F.en, color: o.color, weight: 700, alpha: q });
    text(ctx, o.sub, x + 30, y + 133, { size: 16, family: F.en, color: P.muted, alpha: q });
    if (i < flow.length - 1) arrow(ctx, x + 297, y + 96, x + 333, y + 96, P.teal, 3, q);
  });
  const answer = wordAnim(10, 'ফলাফল', t, 0.46, 14);
  panel(ctx, 694, 721, 532, 108, { r: 24, fill: '#10323B', fill2: '#0A202B', stroke: rgba(P.green, 0.52), alpha: answer });
  text(ctx, 'EXECUTION RESULT', 737, 756, { size: 14, family: F.en, color: P.muted, weight: 700, spacing: 1.5, alpha: answer });
  text(ctx, '10', 1180, 776, { size: 46, family: F.en, color: P.green, weight: 700, align: 'right', glow: rgba(P.green, 0.30), glowBlur: 18, alpha: answer });
  text(ctx, 'Source → meaning → execution', 960, 866, { size: 17, family: F.en, color: P.dim, align: 'center', alpha: p });
}

const DRAW = {
  intro: drawIntro, tokens: drawTokens, parser: drawParser, compiler: drawCompiler,
  vm: drawVm, frames: drawFrames, memory: drawMemory, errors: drawErrors,
  engines: drawEngines, recap: drawRecap,
};
function drawScene(ctx, t, scene) {
  const fn = DRAW[scene.id];
  if (!fn) return;
  fn(ctx, t, sceneTiming(scene));
}
