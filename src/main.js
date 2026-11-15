/* Frame-accurate compositor. window.paint(t) is deterministic for any t. */
let __ctx = null;
const __renderErrors = [];
const XF = 0.34;

function transitionFx(ctx, t) {
  for (let i = 1; i < TL.scenes.length; i++) {
    const scene = TL.scenes[i];
    const p = (t - (scene.start - 0.38)) / 0.76;
    if (p <= 0 || p >= 1) continue;
    const q = Math.sin(Math.PI * p);
    const e = inOut(p);
    ctx.save(); ctx.globalAlpha = 0.8 * q;
    if (scene.transition === 'wipe') {
      const x = lerp(-420, W + 420, e);
      const g = ctx.createLinearGradient(x - 250, 0, x + 250, 0);
      g.addColorStop(0, 'rgba(55,214,193,0)'); g.addColorStop(0.44, 'rgba(55,214,193,0.06)');
      g.addColorStop(0.50, 'rgba(226,255,250,0.20)'); g.addColorStop(0.56, 'rgba(55,214,193,0.08)'); g.addColorStop(1, 'rgba(55,214,193,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else if (scene.transition === 'branch') {
      const cx = W / 2, cy = H / 2;
      for (let k = -4; k <= 4; k++) {
        line(ctx, cx, cy, lerp(cx, k < 0 ? 0 : W, e), cy + k * 78 * e, rgba(P.violet, 0.5), 3, 0.55 * q);
      }
      circle(ctx, cx, cy, 46 + e * 340, null, 1, rgba(P.teal2, 0.45 * q), 4);
    } else if (scene.transition === 'scan') {
      const x = lerp(-100, W + 100, e);
      const g = ctx.createLinearGradient(x - 170, 0, x + 170, 0);
      g.addColorStop(0, 'rgba(255,204,114,0)'); g.addColorStop(0.48, 'rgba(255,204,114,0.08)');
      g.addColorStop(0.5, 'rgba(255,244,218,0.28)'); g.addColorStop(0.53, 'rgba(255,204,114,0.08)');
      g.addColorStop(1, 'rgba(255,204,114,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      line(ctx, x, 140, x, 850, rgba(P.amber, 0.30 * q), 2, 1);
    } else if (scene.transition === 'iris') {
      const radius = lerp(72, 1180, e);
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.max(0, radius - 190), W / 2, H / 2, radius);
      g.addColorStop(0, 'rgba(55,214,193,0)'); g.addColorStop(0.68, 'rgba(55,214,193,0.06)');
      g.addColorStop(0.92, 'rgba(239,255,250,0.19)'); g.addColorStop(1, 'rgba(55,214,193,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      circle(ctx, W / 2, H / 2, radius, null, 1, rgba(P.teal2, 0.42 * q), 3);
    } else if (scene.transition === 'stack') {
      for (let k = 0; k < 4; k++) {
        const yy = lerp(1080 + k * 18, -260 + k * 235, e);
        const h = 100 + k * 18;
        rounded(ctx, 70 + k * 95, yy, W - 140 - k * 190, h, 24);
        ctx.fillStyle = rgba(k % 2 ? P.blue : P.violet, 0.055 * q); ctx.fill();
        ctx.strokeStyle = rgba(P.teal, 0.18 * q); ctx.lineWidth = 1.4; ctx.stroke();
      }
    } else if (scene.transition === 'glitch') {
      const bands = [0.24, 0.42, 0.64, 0.79];
      bands.forEach((y, k) => {
        const shift = (k % 2 ? 1 : -1) * (1 - Math.abs(0.5 - p) * 2) * (35 + k * 9);
        const yy = H * y;
        ctx.fillStyle = rgba(k % 2 ? P.rose : P.blue, 0.07 * q);
        ctx.fillRect(shift, yy, W * 0.74, 18 + k * 7);
      });
    } else if (scene.transition === 'split') {
      const offset = lerp(0, W / 2 + 80, e);
      const gL = ctx.createLinearGradient(-offset, 0, 340 - offset, 0);
      gL.addColorStop(0, 'rgba(169,148,255,0)'); gL.addColorStop(1, 'rgba(169,148,255,0.15)');
      const gR = ctx.createLinearGradient(W + offset - 340, 0, W + offset, 0);
      gR.addColorStop(0, 'rgba(55,214,193,0.15)'); gR.addColorStop(1, 'rgba(55,214,193,0)');
      ctx.fillStyle = gL; ctx.fillRect(0, 0, 340, H); ctx.fillStyle = gR; ctx.fillRect(W - 340, 0, 340, H);
    } else if (scene.transition === 'resolve') {
      const radius = lerp(30, 600, e);
      const g = ctx.createRadialGradient(W / 2, 520, 0, W / 2, 520, radius);
      g.addColorStop(0, 'rgba(129,224,160,0.09)'); g.addColorStop(0.72, 'rgba(55,214,193,0.035)'); g.addColorStop(1, 'rgba(55,214,193,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      circle(ctx, W / 2, 520, radius, null, 1, rgba(P.green, 0.42 * q), 3);
      for (let k = 0; k < 16; k++) {
        const a = k * Math.PI / 8, r1 = radius * 0.78, r2 = radius * 1.04;
        line(ctx, W / 2 + Math.cos(a) * r1, 520 + Math.sin(a) * r1,
          W / 2 + Math.cos(a) * r2, 520 + Math.sin(a) * r2, rgba(P.green, 0.27 * q), 2, 1);
      }
    }
    ctx.restore();
  }
}

function paint(t) {
  const ctx = __ctx;
  if (!ctx) return;
  t = clamp(t, 0, TL.duration);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, t);
  brandMark(ctx, t);

  for (const scene of TL.scenes) {
    if (t < scene.start - XF - 0.06 || t > scene.end + XF + 0.06) continue;
    const enter = smooth((t - (scene.start - XF)) / (XF * 2));
    const leave = 1 - smooth((t - (scene.end - XF)) / (XF * 2));
    const alpha = clamp(enter * leave);
    if (alpha < 0.003) continue;
    const zoom = lerp(0.988, 1, out(enter)) * lerp(1, 1.012, smooth(leave));
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
    try { drawScene(ctx, t, scene); }
    catch (error) { __renderErrors.push({ scene: scene.id, time: t, message: String(error?.stack || error) }); }
    ctx.restore();
  }

  transitionFx(ctx, t);
  drawSubtitles(ctx, t);
  // In/out fades stay on the deep navy brand color.
  const fin = clamp(t / 0.58);
  if (fin < 1) { ctx.save(); ctx.globalAlpha = 0.90 * (1 - out(fin)); ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  const fout = clamp((t - (TL.duration - 0.52)) / 0.52);
  if (fout > 0) { ctx.save(); ctx.globalAlpha = 0.96 * smooth(fout); ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  return t;
}
window.paint = paint;

const FACE_SPECS = [
  ...['NotoBengali', 'Hind', 'Baloo'].flatMap(f => [400, 600, 700, 800].map(w => `${w} 48px "${f}"`)),
  ...[400, 500, 600, 700, 800].map(w => `${w} 42px "Poppins"`),
];
async function preloadFonts() {
  const sample = 'ইন্টারপ্রেটার টোকেনাইজার সিনট্যাক্স ট্রি বাইটকোড পাইথন ১০';
  await Promise.all(FACE_SPECS.map(face => document.fonts.load(face, sample).catch(() => [])));
  await document.fonts.ready;
  const ctx = __ctx;
  for (const face of FACE_SPECS) {
    ctx.save(); ctx.font = face; ctx.fillText(sample, -5000, -5000); ctx.restore();
  }
  return FACE_SPECS.filter(face => !document.fonts.check(face, sample));
}
window.boot = async function () {
  const canvas = document.getElementById('frame');
  __ctx = canvas.getContext('2d', { alpha: false, desynchronized: false });
  const badFonts = await preloadFonts();
  window.paint(0);
  return { duration: TL.duration, fps: TL.fps, scenes: TL.scenes.map(s => ({ id: s.id, start: s.start, end: s.end })), badFonts };
};
window.renderErrors = () => __renderErrors;
