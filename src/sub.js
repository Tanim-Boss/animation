/* ============================================================
   sub.js — word-by-word kinetic Bengali subtitles.
   The phrase is fully readable, the word being pronounced right
   now is highlighted (teal / gold), pops and glows.
   ============================================================ */

const SUB = {
  y: 986,          // baseline
  size: 46,
  maxW: 1560,
  gapEm: 0.40,
};

let _chunks = null;
function subtitleChunks() {
  if (_chunks) return _chunks;
  _chunks = [];
  for (const c of TL.cues) {
    for (const ch of c.chunks) {
      const words = ch.words.map((txt, i) => {
        const w = c.words.find((x) => x.t === txt && x.start >= ch.start - 1e-6);
        return { t: txt };
      });
      _chunks.push({ start: ch.start, end: ch.end, words: ch.words, cue: c.i });
    }
  }
  // word-level times for the chunk: take them from the cue's word list in order
  let k = 0;
  for (const c of TL.cues) {
    for (const ch of c.chunks) {
      const ws = c.words.filter((w) => w.start >= ch.start - 1e-6 && w.end <= ch.end + 1e-6);
      _chunks[k].wordTimes = (ws.length === ch.words.length ? ws : c.words.slice(
        c.words.findIndex((w) => w.t === ch.words[0]),
        c.words.findIndex((w) => w.t === ch.words[0]) + ch.words.length,
      )).map((w) => ({ t: w.t, start: w.start, end: w.end }));
      k++;
    }
  }
  // display window = until the next chunk starts
  for (let i = 0; i < _chunks.length; i++) {
    const nx = _chunks[i + 1];
    _chunks[i].dispEnd = nx ? Math.min(nx.start, _chunks[i].end + 0.9) : _chunks[i].end + 0.9;
  }
  return _chunks;
}

const isLatin = (s) => /^[A-Za-z0-9+%·.,:!?'"()\-–—/]+$/.test(s.replace(/[০-৯৳]/g, 'x'));
function wordFont(w) {
  return /[A-Za-z]/.test(w) && !/[\u0980-\u09FF]/.test(w)
    ? { family: F.en, weight: 700, size: SUB.size * 0.94 }
    : { family: F.bn, weight: 600, size: SUB.size };
}
const EMPH = /([০-৯0-9])|A\+|জয়েন|অফার|ফ্রি|সম্পূর্ণ/;

function drawSubtitles(ctx, t) {
  const chunks = subtitleChunks();
  let idx = -1;
  for (let i = 0; i < chunks.length; i++) {
    if (t >= chunks[i].start - 0.04 && t < chunks[i].dispEnd) { idx = i; break; }
  }
  if (idx < 0) return;
  const ch = chunks[idx];

  // entrance / exit
  const inP = clamp((t - (ch.start - 0.04)) / 0.18);
  const outP = clamp((t - (ch.dispEnd - 0.12)) / 0.12);
  const hide = window.SUB_HIDE_AT ? clamp((t - window.SUB_HIDE_AT) / 0.3) : 0;
  const a0 = E.out(inP) * (1 - E.inOut(outP)) * (1 - E.inOutQ(hide));
  if (a0 <= 0.004) return;

  // scrim
  ctx.save();
  ctx.globalAlpha = a0;
  ctx.fillStyle = lingrad(ctx, 0, 820, 0, 1058, [
    [0, 'rgba(3,10,20,0)'],
    [0.32, 'rgba(3,10,20,0.30)'],
    [0.62, 'rgba(3,10,20,0.62)'],
    [0.88, 'rgba(3,10,20,0.55)'],
    [1, 'rgba(3,10,20,0.15)'],
  ]);
  ctx.fillRect(0, 820, W, 238);
  ctx.restore();

  // measure
  const words = ch.words;
  const gap = SUB.size * SUB.gapEm;
  const metas = words.map((w) => {
    const f = wordFont(w);
    return { w, f, width: measure(ctx, w, { size: f.size, weight: f.weight, family: f.family, spacing: 0.4 }) };
  });
  let total = metas.reduce((s, m) => s + m.width, 0) + gap * (metas.length - 1);
  let sc = 1;
  if (total > SUB.maxW) { sc = SUB.maxW / total; total = SUB.maxW; }

  // current word
  let cur = -1;
  for (let i = 0; i < ch.wordTimes.length; i++) if (t >= ch.wordTimes[i].start - 0.02) cur = i;

  const baseY = SUB.y + (1 - E.out(inP)) * 10;
  let x = 960 - total / 2;
  ctx.save();
  ctx.globalAlpha = a0;
  ctx.textAlign = 'left';
  for (let i = 0; i < metas.length; i++) {
    const m = metas[i];
    const isCur = i === cur;
    const spoken = i < cur;
    const pop = isCur ? E.out(clamp((t - ch.wordTimes[i].start + 0.02) / 0.16)) : 0;
    const emph = EMPH.test(m.w) && metas.length > 1;
    let alpha = isCur ? 1 : spoken ? 0.97 : 0.70;
    let color = '#FFFFFF';
    let glowC = null;
    if (isCur) {
      color = emph ? P.gold : P.tealSoft;
      glowC = emph ? rgba(P.gold, 0.85) : rgba(P.teal, 0.9);
    }
    const scale = (1 + 0.10 * pop) * sc;
    const drawX = x + m.width / 2;
    const drawY = baseY - (isCur ? 3 * pop : 0);

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.scale(scale, scale);
    // soft dark plate under the active word for punch
    if (isCur && pop > 0.05) {
      ctx.save();
      ctx.globalAlpha *= pop * 0.55;
      roundRect(ctx, -m.width / 2 - 12, -SUB.size * 0.78, m.width + 24, SUB.size * 1.16, 14);
      ctx.fillStyle = emph ? rgba(P.goldDeep, 0.20) : rgba(P.teal, 0.18);
      ctx.fill();
      ctx.restore();
    }
    drawText(ctx, m.w, 0, 0, {
      size: m.f.size, family: m.f.family, weight: m.f.weight, color, alpha,
      align: 'center', spacing: 0.4,
      glow: glowC, glowBlur: 26,
      shadow: 'rgba(0,6,14,0.85)', shadowBlur: 12, shadowY: 3,
    });
    ctx.restore();

    x += m.width + gap;
  }
  ctx.restore();
}
