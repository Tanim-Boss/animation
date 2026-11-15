/* Burned-in Bangla subtitle renderer with active-word highlighting. */
const SUB_STYLE = { size: 40, maxWidth: 1480, y: 988, gap: 26 };
function subtitleFont(word) {
  const latin = /^[A-Za-z0-9_+%./:-]+$/.test(word.replace(/[০-৯৳]/g, 'x'));
  return latin ? { family: F.en, weight: 600 } : { family: F.bn, weight: 600 };
}
function drawSubtitles(ctx, t) {
  let selected = null;
  for (let ci = 0; ci < TL.cues.length && !selected; ci++) {
    const cue = TL.cues[ci];
    for (let hi = 0; hi < cue.chunks.length; hi++) {
      const chunk = cue.chunks[hi];
      const next = cue.chunks[hi + 1];
      const displayEnd = next ? Math.min(next.start, chunk.end + 0.35) : chunk.end + 0.62;
      if (t >= chunk.start - 0.08 && t < displayEnd) {
        selected = { cue, chunk, ci, hi, displayEnd };
        break;
      }
    }
  }
  if (!selected) return;
  const { cue, chunk, displayEnd } = selected;
  const inP = clamp((t - (chunk.start - 0.08)) / 0.18);
  const outP = clamp((t - (displayEnd - 0.14)) / 0.14);
  const alpha = out(inP) * (1 - smooth(outP));
  if (alpha < 0.004) return;
  const tokens = chunk.indices.map(i => cue.words[i]);
  let current = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (t >= tokens[i].start - 0.025) current = i;
  }
  const base = SUB_STYLE.size;
  const metas = tokens.map(w => {
    const f = subtitleFont(w.t);
    return { ...w, ...f, width: measure(ctx, w.t, base, f.weight, f.family) };
  });
  const gap = SUB_STYLE.gap;
  const total = metas.reduce((sum, x) => sum + x.width, 0) + gap * Math.max(0, metas.length - 1);
  const scale = Math.min(1, SUB_STYLE.maxWidth / Math.max(1, total));
  const drawWidth = total * scale;
  const x0 = (W - drawWidth) / 2;
  const y = SUB_STYLE.y + (1 - out(inP)) * 10;
  // soft lower-third scrim and a quiet glass subtitle plate
  const scrim = ctx.createLinearGradient(0, 870, 0, H);
  scrim.addColorStop(0, 'rgba(3,10,17,0)');
  scrim.addColorStop(0.28, 'rgba(3,10,17,0.27)');
  scrim.addColorStop(1, 'rgba(3,10,17,0.76)');
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = scrim; ctx.fillRect(0, 870, W, 210); ctx.restore();
  const plateX = Math.max(116, x0 - 46), plateW = Math.min(W - 232, drawWidth + 92);
  panel(ctx, plateX, 930, plateW, 92, { r: 24, fill: '#0A1C29', fill2: '#071721', stroke: 'rgba(145,190,210,0.13)', alpha: alpha * 0.92, shadowBlur: 22, shadowY: 5 });
  // subtle timing bar; the active word fill tracks the spoken span.
  rounded(ctx, plateX + 30, 1006, plateW - 60, 3, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
  const word = metas[current];
  const activeP = clamp((t - word.start) / Math.max(0.06, word.end - word.start));
  const barWidth = (plateW - 60) * ((current + activeP) / Math.max(1, metas.length));
  rounded(ctx, plateX + 30, 1006, barWidth, 3, 2); ctx.fillStyle = P.teal; ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1;

  let x = x0;
  for (let i = 0; i < metas.length; i++) {
    const m = metas[i]; const active = i === current;
    const spoken = i < current;
    const pop = active ? out(clamp((t - m.start + 0.01) / 0.14)) : 0;
    const center = x + m.width * scale / 2;
    if (active) {
      ctx.save(); ctx.globalAlpha = alpha * (0.68 + 0.32 * pop);
      rounded(ctx, center - (m.width * scale + 22) / 2, y - 29, m.width * scale + 22, 58, 15);
      ctx.fillStyle = rgba(P.teal, 0.13); ctx.fill();
      ctx.strokeStyle = rgba(P.teal, 0.25); ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    }
    const color = active ? P.teal2 : spoken ? '#E6F1F6' : '#A8BBC6';
    ctx.save(); ctx.translate(center, y); ctx.scale(scale * (active ? 1.035 : 1), scale * (active ? 1.035 : 1));
    text(ctx, m.t, 0, 0, { size: base, color, weight: active ? 700 : 600,
      family: m.family, align: 'center', alpha: alpha * (active ? 1 : 0.88),
      glow: active ? rgba(P.teal, 0.42) : null, glowBlur: 20,
      shadow: 'rgba(0,5,10,0.78)', shadowBlur: 7, shadowY: 2 });
    ctx.restore();
    x += m.width * scale + gap * scale;
  }
}
