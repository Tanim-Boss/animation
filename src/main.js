/* ============================================================
   main.js — the compositor.  paint(t) renders the whole frame
   for an arbitrary time t (frame accurate, deterministic).
   ============================================================ */

let SCENE_BOUNDS = [];   // filled from data/scenes.json (or computed)

function computeBounds() {
  const out = [];
  for (let i = 0; i < SCENES.length; i++) {
    const sc = SCENES[i];
    let s = i === 0 ? 0 : CUE(sc.from).start - 0.24;
    out.push({ id: sc.id, draw: sc.draw, s, from: sc.from, to: sc.to });
  }
  for (let i = 0; i < out.length; i++) {
    out[i].e = i === out.length - 1 ? TL.duration : out[i + 1].s;
  }
  // guarantee monotone, sane durations
  for (let i = 1; i < out.length; i++) {
    if (out[i].s < out[i - 1].s + 1.2) out[i].s = out[i - 1].s + 1.2;
    if (out[i].e <= out[i].s + 0.8) out[i].e = out[i].s + 0.8;
  }
  for (let i = 0; i < out.length - 1; i++) out[i].e = out[i + 1].s;
  return out;
}

function transitionFx(ctx, t) {
  // --- NEW: distinct geometric transition per scene cut ---
  for (let i = 1; i < SCENE_BOUNDS.length; i++) {
    const b = SCENE_BOUNDS[i].s;
    const p = (t - (b - 0.30)) / 0.60;
    if (p <= 0 || p >= 1) continue;
    const a = Math.sin(Math.PI * p);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a * 0.15;
    // --- Scene-specific geometric sweep ---
    const sceneId = SCENE_BOUNDS[i].id;
    if (sceneId === 'identity' || sceneId === 'progress' || sceneId === 'geometry') {
      // 1. Identity / Progress / Geometry: diamond grid wipe
      const bx = lerp(-260, W + 260, E.inOut(p));
      const size = 120 * (1 + Math.sin(t * 8));
      ctx.fillStyle = lingrad(ctx, bx - size, 0, bx + size, H, [
        [0, rgba('#16C6B7', 0.45)], [0.5, rgba('#FFFFFF', 0.10)], [1, rgba('#16C6B7', 0)]
      ]);
      ctx.fillRect(0, 0, W, H);
    } else if (sceneId === 'content' || sceneId === 'goal' || sceneId === 'live') {
      // 2. Content / Goal / Live: radial iris burst
      const bx = W / 2, by = H / 2;
      const radius = lerp(0, Math.max(W, H) * 1.5, E.inOut(p));
      ctx.fillStyle = radial(ctx, bx, by, radius, [
        [0, rgba('#123B70', 0.45)], [0.5, rgba('#FFFFFF', 0.05)], [1, rgba('#123B70', 0)]
      ]);
      ctx.fillRect(0, 0, W, H);
    } else {
      // 3. Teacher / Offer / CTA: horizontal sweep bands
      const bx = lerp(-260, W + 260, E.inOut(p));
      ctx.fillStyle = lingrad(ctx, bx - 400, 0, bx + 400, H, [
        [0, rgba('#071B35', 0.55)], [0.5, rgba('#FFFFFF', 0.15)], [1, rgba('#071B35', 0)]
      ]);
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
}

function paint(t) {
  const ctx = window.__ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);

  // ---- backdrop ----
  drawBackdrop(ctx, t);

  // ---- ambient layer (shared, gives continuity across cuts) ----
  mathParticles(ctx, t, { count: 54, alpha: 0.85 });
  glyphField(ctx, t, { alpha: 0.5, scale: 1 });

  // ---- scenes (crossfade centred on the cut, with a slow camera push) ----
  const XF = 0.24;   // half-width of the crossfade
  for (const sc of SCENE_BOUNDS) {
    if (t < sc.s - XF - 0.1 || t > sc.e + XF + 0.1) continue;
    const inP = clamp((t - (sc.s - XF)) / (XF * 2));
    const outP = clamp((t - (sc.e - XF)) / (XF * 2));
    const alpha = E.inOutQ(inP) * (1 - E.inOutQ(outP));
    if (alpha <= 0.004) continue;
    const zoom = lerp(0.988, 1.0, E.outQ(inP)) * lerp(1, 1.016, E.inOutQ(outP));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
    // gentle parallax sway
    ctx.translate(Math.sin(t * 0.23 + sc.s) * 5, Math.cos(t * 0.19 + sc.s) * 4);
    try { sc.draw(ctx, t, sc.s, sc.e); } catch (err) { /* keep rendering */ }
    ctx.restore();
  }

  // ---- transition fx ----
  transitionFx(ctx, t);

  // ---- subtitles ----
  drawSubtitles(ctx, t);

  // ---- grade ----
  drawVignette(ctx, 0.95);
  drawGrain(ctx, t);

  // global fades
  // fades sit on the brand navy, never on pure black
  const fin = clamp(t / 0.55);
  if (fin < 1) {
    ctx.save();
    ctx.globalAlpha = 0.92 * (1 - E.out(fin));
    ctx.fillStyle = '#0A2140';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  const fout = clamp((t - (TL.duration - 0.85)) / 0.85);
  if (fout > 0) {
    ctx.save();
    ctx.globalAlpha = 0.95 * E.inOutQ(fout);
    ctx.fillStyle = '#071B35';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  return t;
}

window.paint = paint;

/* Canvas text only triggers a webfont download on first *use*, so every face is
   explicitly loaded (and verified) before the first frame is painted.        */
const FACE_SPECS = [];
for (const fam of [F.bn, F.bnText, F.bnDisp]) for (const w of [300, 400, 500, 600, 700, 800]) FACE_SPECS.push(`${w} 40px ${fam}`);
for (const w of [400, 500, 600, 700, 800, 900]) FACE_SPECS.push(`${w} 40px ${F.en}`);

async function preloadFonts() {
  const sample = 'দূরত্ব শিক্ষার্থীরা সংখ্যাতত্ত্ব A+ ৳৩৯৯ MOHAMMAD';
  await Promise.all(FACE_SPECS.map((f) => document.fonts.load(f, sample).catch(() => null)));
  await document.fonts.ready;
  // warm-up glyph cache for every word that will ever be drawn
  const ctx = window.__ctx;
  const all = TL.cues.flatMap((c) => c.words.map((w) => w.t)).join(' ');
  for (const f of FACE_SPECS) {
    ctx.save();
    ctx.font = f;
    ctx.fillText(all, -4000, -4000);
    ctx.restore();
  }
  const bad = FACE_SPECS.filter((f) => !document.fonts.check(f, sample));
  return bad;
}

window.boot = async function () {
  const cv = document.getElementById('c');
  window.__ctx = cv.getContext('2d', { alpha: false });
  const bad = await preloadFonts();
  if (bad.length) console.warn('fonts not ready:', bad.join(', '));
  SCENE_BOUNDS = computeBounds();
  window.SUB_HIDE_AT = TL.cues[TL.cues.length - 1].end - 0.22;
  return {
    duration: TL.duration,
    badFonts: bad,
    scenes: SCENE_BOUNDS.map((s) => ({ id: s.id, s: +s.s.toFixed(2), e: +s.e.toFixed(2) })),
  };
};
