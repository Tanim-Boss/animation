/* ============================================================
   scenes.js — the 11 cinematic scenes.
   Each scene is drawn as a pure function of absolute time `t`;
   `s` / `e` are its start / end.  Visual beats are anchored to
   the narration word times (WT) so every animation lands on the
   word that mentions it.
   ============================================================ */

/* word-time lookup: WT(cue, wordIndex) */
function WT(cue, i) {
  const c = TL.cues[cue - 1];
  if (!c) return 0;
  const w = c.words[Math.min(i, c.words.length - 1)];
  return w ? w.start : c.start;
}
function CUE(cue) { return TL.cues[cue - 1]; }

/* --- little entrance helper: returns {a, y, s} --------------------------- */
function enter(t, t0, dur = 0.65, dy = 26, scaleFrom = 0.965) {
  const p = clamp((t - t0) / dur);
  const e = E.out(p);
  return { a: p <= 0 ? 0 : E.out5(clamp(p * 1.35)), dy: (1 - e) * dy, s: lerp(scaleFrom, 1, E.back(clamp(p * 1.15), 1.3)) };
}
function exitTo(t, t0, dur = 0.4, dy = -18) {
  const p = clamp((t - t0) / dur);
  return { a: 1 - E.outQ(p), dy: -dy * E.outQ(p) };
}
/** pop with slight overshoot */
function pop(t, t0, dur = 0.5) {
  const p = clamp((t - t0) / dur);
  return p <= 0 ? 0 : E.back(p, 2.1);
}

/* ------------------------------------------------------------------ chips */
function labelChip(ctx, text, x, y, o = {}) {
  const size = o.size || 26;
  const font = o.font || F.en;
  const w = measure(ctx, text, { size, weight: o.weight || 600, family: font, spacing: o.spacing || 2.4 }) + (o.padX || 34) * 2;
  const h = o.h || size * 2.1;
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0.004) return w;
  ctx.save();
  ctx.globalAlpha *= a;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fillStyle = o.fill || rgba(P.teal, 0.12);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = o.stroke || rgba(P.teal, 0.5);
  ctx.stroke();
  drawText(ctx, text, x, y + size * 0.35, {
    size, family: font, weight: o.weight || 600, color: o.color || P.tealSoft,
    align: 'center', spacing: o.spacing || 2.4,
  });
  ctx.restore();
  return w;
}

/* ================================================================
   SCENE 1 — GREETING / PRESENTER
   ================================================================ */
function sceneIntro(ctx, t, s, e) {
  const lt = t - s;

  // coordinate axes + sine curve
  const curveT0 = s + 0.25;
  const cp = clamp((t - curveT0) / 2.6);
  if (cp > 0) {
    ctx.save();
    ctx.globalAlpha *= 0.75 * Math.min(1, cp * 3);
    const baseY = 800, amp = 68;
    ctx.beginPath();
    const n = 160;
    for (let i = 0; i <= n * E.out(cp); i++) {
      const x = 120 + (i / n) * 1680;
      const y = baseY - Math.sin((i / n) * 7.2 + t * 0.55) * amp * (0.35 + 0.65 * (i / n));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(P.teal, 0.5);
    ctx.lineWidth = 2;
    ctx.shadowColor = rgba(P.teal, 0.7);
    ctx.shadowBlur = 18;
    ctx.stroke();
    // travelling dot
    if (cp > 0.15) {
      const k = (Math.sin(t * 0.55) * 0.5 + 0.5);
      const i = k * n * E.out(cp);
      const x = 120 + (i / n) * 1680;
      const y = baseY - Math.sin((i / n) * 7.2 + t * 0.55) * amp * (0.35 + 0.65 * (i / n));
      glow(ctx, x, y, 60, P.teal, 0.85);
      ctx.fillStyle = P.white;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // brand mark
  const mA = enter(t, s + 0.12, 0.9, 30, 0.6);
  const markY = lt < 2.6 ? 352 : lerp(352, 300, E.out(clamp((lt - 2.6) / 0.7)));
  ctx.save();
  ctx.translate(960, markY + mA.dy);
  ctx.scale(mA.s, mA.s);
  // halo rings
  ctx.save();
  ctx.globalAlpha *= mA.a * 0.55;
  for (let i = 0; i < 2; i++) {
    const ph = ((t * 0.32 + i * 0.5) % 1);
    ctx.beginPath();
    ctx.arc(0, 0, 78 + ph * 96, 0, TAU);
    ctx.strokeStyle = rgba(P.teal, (1 - ph) * 0.35);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();
  glow(ctx, 0, 0, 210, P.teal, 0.55 * mA.a);
  sigmaMark(ctx, 0, 0, 132, { alpha: mA.a });
  ctx.restore();

  // greeting kicker
  const k1 = enter(t, s + 0.65, 0.7, 20, 0.97);
  labelChip(ctx, 'গণিত কোর্স · SSC ও দাখিল', 960, 168 + k1.dy, {
    size: 27, font: F.bnText, weight: 600, alpha: k1.a, spacing: 3.2,
    fill: rgba('#FFFFFF', 0.06), stroke: rgba('#FFFFFF', 0.22), color: rgba('#DDEBFA', 0.92),
  });

  // presenter name — revealed exactly on the spoken name
  const tMoh = WT(2, 1), tFai = WT(2, 2);
  const a1 = enter(t, tMoh - 0.06, 0.75, 34, 0.94);
  if (a1.a > 0.004) {
    ctx.save();
    ctx.globalAlpha *= a1.a;
    ctx.translate(0, a1.dy);
    drawText(ctx, 'MOHAMMAD', 960, 500, {
      size: 76, family: F.en, weight: 700, color: rgba('#EAF4FF', 0.95),
      align: 'center', spacing: 12,
    });
    ctx.restore();
  }
  const a2 = enter(t, tFai - 0.05, 0.8, 40, 0.92);
  if (a2.a > 0.004) {
    ctx.save();
    ctx.globalAlpha *= a2.a;
    ctx.translate(0, a2.dy);
    ctx.scale(1 + (1 - a2.s), 1 + (1 - a2.s));
    drawText(ctx, 'FAISAL', 960, 596, {
      size: 116, family: F.en, weight: 800, align: 'center', spacing: 14,
      grad: [[0, P.goldLight], [0.45, P.gold], [1, P.goldDeep]],
      glow: rgba(P.gold, 0.32), glowBlur: 46,
    });
    ctx.restore();
    // light sweep across the name
    sheen(ctx, t, 560, 500, 800, 110, { p: clamp((t - tFai - 0.15) / 0.9) * 1.0, alpha: a2.a * 0.9 });
  }

  const tBn = WT(2, 2) + 0.12;
  const a3 = enter(t, tBn, 0.9, 22, 0.98);
  if (a3.a > 0.004) {
    drawText(ctx, 'মোহাম্মাদ ফয়সাল', 960, 678 + a3.dy, {
      size: 46, family: F.bnText, weight: 600, color: rgba(P.tealSoft, 0.96),
      align: 'center', spacing: 1.2, alpha: a3.a,
    });
  }

  // golden rule + role
  const rp = clamp((t - tBn - 0.15) / 0.8);
  if (rp > 0) {
    const w = 210 * E.out(rp);
    ctx.save();
    ctx.globalAlpha *= 0.9;
    ctx.fillStyle = lingrad(ctx, 960 - w, 0, 960 + w, 0, [[0, rgba(P.gold, 0)], [0.5, rgba(P.gold, 0.95)], [1, rgba(P.gold, 0)]]);
    ctx.fillRect(960 - w, 716, w * 2, 2);
    ctx.restore();
  }
  const a4 = enter(t, tBn + 0.35, 0.8, 16, 0.99);
  if (a4.a > 0.004) {
    drawText(ctx, 'গণিত প্রশিক্ষক   ·   MATHEMATICS MENTOR', 960, 762 + a4.dy, {
      size: 25, family: F.en, weight: 500, color: rgba('#B9D2EA', 0.85),
      align: 'center', spacing: 3.6, alpha: a4.a,
    });
  }
}

/* ================================================================
   SCENE 2 — COURSE IDENTITY (SSC · DAKHIL · BASIC TO ADVANCED)
   ================================================================ */
function sceneIdentity(ctx, t, s, e) {
  const tSSC = WT(3, 1), tDak = WT(3, 3);
  const tBasic = WT(4, 1), tMath = WT(4, 4), tBn = WT(4, 3);

  // rotating wireframe on the right
  wireframe(ctx, 1655, 400, 148, t, { alpha: 0.36 });
  wireframe(ctx, 1655, 400, 92, t * 1.35, { alpha: 0.18, phase: 1.2 });

  // top kicker
  const k = enter(t, s + 0.12, 0.7, 18, 0.97);
  drawText(ctx, 'COURSE  OVERVIEW', 960, 176 + k.dy, {
    size: 24, family: F.en, weight: 600, color: rgba('#9FC4E8', 0.8),
    align: 'center', spacing: 8, alpha: k.a,
  });

  // class chips
  const pS = pop(t, tSSC - 0.04, 0.55);
  if (pS > 0.01) {
    ctx.save();
    ctx.translate(760, 268);
    ctx.scale(pS, pS);
    glow(ctx, 0, 0, 130, P.teal, 0.35 * pS);
    labelChip(ctx, 'SSC', 0, 0, { size: 34, weight: 700, padX: 40, h: 74, spacing: 4, fill: rgba(P.teal, 0.16), stroke: rgba(P.tealSoft, 0.8), color: P.white });
    ctx.restore();
  }
  const pD = pop(t, tDak - 0.04, 0.55);
  if (pD > 0.01) {
    ctx.save();
    ctx.translate(1160, 268);
    ctx.scale(pD, pD);
    glow(ctx, 0, 0, 130, P.gold, 0.3 * pD);
    labelChip(ctx, 'DAKHIL', 0, 0, { size: 34, weight: 700, padX: 40, h: 74, spacing: 4, fill: rgba(P.gold, 0.14), stroke: rgba(P.gold, 0.8), color: P.white });
    ctx.restore();
  }
  // connecting line between chips
  const lp = clamp((t - tSSC - 0.25) / 0.5);
  if (lp > 0) {
    ctx.save();
    ctx.globalAlpha *= 0.5 * E.out(lp);
    ctx.strokeStyle = rgba('#FFFFFF', 0.35);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(760, 268);
    ctx.lineTo(lerp(760, 1160, E.out(lp)), 268);
    ctx.stroke();
    ctx.restore();
  }

  // headline
  const a1 = enter(t, tBasic, 0.8, 30, 0.95);
  drawTextWipe(ctx, 'BASIC TO ADVANCED', 960, 452 + a1.dy, {
    size: 80, family: F.en, weight: 800, align: 'center', spacing: 6,
    grad: [[0, P.goldLight], [0.5, P.gold], [1, P.goldDeep]],
    glow: rgba(P.gold, 0.25), glowBlur: 40, alpha: a1.a,
  }, clamp((t - tBasic) / 0.95));

  const a2 = enter(t, tMath, 0.85, 36, 0.95);
  drawText(ctx, 'MATHEMATICS COURSE', 960, 566 + a2.dy, {
    size: 86, family: F.en, weight: 800, color: P.white, align: 'center',
    spacing: 4, alpha: a2.a, shadow: 'rgba(0,10,25,0.75)', shadowBlur: 26, shadowY: 8,
  });
  sheen(ctx, t, 240, 480, 1440, 110, { p: clamp((t - tMath - 0.2) / 1.0), alpha: a2.a * 0.75 });

  const a3 = enter(t, tBn + 0.25, 0.9, 20, 0.98);
  drawText(ctx, 'বেসিক টু অ্যাডভান্স গণিত কোর্স', 960, 664 + a3.dy, {
    size: 48, family: F.bnText, weight: 600, color: rgba(P.tealSoft, 0.95),
    align: 'center', spacing: 1, alpha: a3.a,
  });

  // floating equations, kept clear of the headline block
  const eqs = [['x² + y² = r²', 196, 668, 0.0], ['∫ f(x) dx', 156, 742, 0.7], ['a² + b² = c²', 1588, 726, 1.4]];
  eqs.forEach(([txt, x, y, ph], i) => {
    const ap = enter(t, s + 0.4 + i * 0.18, 0.8, 24, 0.98);
    ctx.save();
    ctx.globalAlpha *= ap.a * 0.4;
    ctx.translate(x, y + ap.dy + Math.sin(t * 0.7 + ph) * 8);
    drawText(ctx, txt, 0, 0, { size: 36, family: F.en, weight: 500, color: '#9FD8F5', align: 'center', spacing: 2 });
    ctx.restore();
  });

  // four topic accents
  const bp = clamp((t - tMath - 0.1) / 0.7);
  if (bp > 0) {
    const items = ['সংখ্যাতত্ত্ব', 'বীজগণিত', 'জ্যামিতি', 'ত্রিকোণমিতি'];
    const f = { size: 26, family: F.bnText, weight: 600 };
    const gapX = 46;
    const widths = items.map((it) => measure(ctx, it, f));
    const totalW = widths.reduce((a, b) => a + b, 0) + gapX * (items.length - 1);
    let ax = 960 - totalW / 2;
    items.forEach((txt, i) => {
      const a = clamp((bp - i * 0.16) / 0.5);
      if (a <= 0) { ax += widths[i] + gapX; return; }
      ctx.save();
      ctx.globalAlpha *= a;
      drawText(ctx, txt, ax, 736 + (1 - E.out(a)) * 8, { ...f, color: '#CFE4F7', alpha: 0.92 });
      if (i < items.length - 1) {
        ctx.fillStyle = rgba(P.teal, 0.85);
        ctx.beginPath();
        ctx.arc(ax + widths[i] + gapX / 2, 727, 3.6, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      ax += widths[i] + gapX;
    });
  }
}

/* ================================================================
   SCENE 3 — COURSE PROGRESS
   ================================================================ */
function sceneProgress(ctx, t, s, e) {
  const tCount = WT(5, 2);
  const tClass = WT(6, 0);
  const tCh17 = WT(7, 1), tDone4 = WT(7, 4), tFinished = WT(7, 6);

  // header
  const hk = enter(t, s + 0.1, 0.7, 18, 0.97);
  drawText(ctx, 'LIVE  COURSE  PROGRESS', 960, 130 + hk.dy, {
    size: 22, family: F.en, weight: 600, color: rgba('#9FC4E8', 0.75), align: 'center', spacing: 9, alpha: hk.a,
  });

  /* ---- enrolled students counter ---- */
  const aA = enter(t, s + 0.16, 0.7, 34, 0.96);
  const cx = 150, cy = 190, cw = 720, chh = 250;
  glass(ctx, cx, cy + aA.dy, cw, chh, 26, { alpha: aA.a });
  if (aA.a > 0.01) {
    ctx.save();
    ctx.globalAlpha *= aA.a;
    ctx.translate(0, aA.dy);
    drawText(ctx, 'কোর্সে এনরোলড', cx + 44, cy + 66, { size: 30, family: F.bnText, weight: 600, color: '#CFE4F7' });
    const cnt = Math.round(100 * E.out(clamp((t - tCount) / 1.15)));
    const numW = drawText(ctx, String(cnt), cx + 44, cy + 180, {
      size: 112, family: F.en, weight: 800, spacing: -2,
      grad: [[0, P.white], [1, P.tealSoft]], glow: rgba(P.teal, 0.4), glowBlur: 34,
      alpha: clamp((t - tCount + 0.12) / 0.3),
    });
    const plusA = clamp((t - tCount - 0.8) / 0.4);
    const pw = drawText(ctx, '+', cx + 54 + numW, cy + 172, {
      size: 78, family: F.en, weight: 800, color: P.gold, glow: rgba(P.gold, 0.45), glowBlur: 30,
      alpha: plusA,
    });
    drawText(ctx, 'শিক্ষার্থী', cx + 74 + numW + pw, cy + 172, {
      size: 28, family: F.bnText, weight: 500, color: '#A9C6E0', alpha: plusA,
    });
    drawText(ctx, 'এনরোলড', cx + 74 + numW + pw, cy + 206, {
      size: 28, family: F.bnText, weight: 500, color: '#7E9CB8', alpha: plusA,
    });
    // mini avatar pips filling with the count
    const filled = Math.round(20 * E.out(clamp((t - tCount) / 1.2)));
    for (let i = 0; i < 20; i++) {
      const px = cx + 46 + (i % 10) * 26, py = cy + 216 + Math.floor(i / 10) * 22;
      ctx.beginPath();
      ctx.arc(px, py, 5.2, 0, TAU);
      ctx.fillStyle = i < filled ? rgba(P.teal, 0.95) : rgba('#FFFFFF', 0.14);
      ctx.fill();
      if (i === filled - 1) glow(ctx, px, py, 26, P.teal, 0.8);
    }
    ctx.restore();
  }

  /* ---- completed classes ---- */
  const aB = enter(t, s + 0.3, 0.7, 30, 0.97);
  const bx = 920, by = 190, bw = 850, bh = 250;
  glass(ctx, bx, by + aB.dy, bw, bh, 26, { alpha: aB.a });
  if (aB.a > 0.01) {
    ctx.save();
    ctx.globalAlpha *= aB.a;
    ctx.translate(0, aB.dy);
    drawText(ctx, 'ক্লাস সম্পন্ন', bx + 40, by + 66, { size: 30, family: F.bnText, weight: 600, color: '#CFE4F7' });
    const done = clamp((t - tClass - 0.1) / 1.25);
    const nDone = Math.round(10 * E.out(done));
    const nw2 = drawText(ctx, String(nDone), bx + 40, by + 176, {
      size: 104, family: F.en, weight: 800, grad: [[0, P.white], [1, P.gold]], glow: rgba(P.gold, 0.3), glowBlur: 30,
      alpha: clamp((t - tClass + 0.12) / 0.3),
    });
    drawText(ctx, '/ ১৭', bx + 56 + nw2, by + 172, {
      size: 40, family: F.bnText, weight: 600, color: '#93B4D2',
      alpha: clamp((t - tClass + 0.12) / 0.3),
    });
    // 10 pips
    for (let i = 0; i < 10; i++) {
      const p = clamp((t - tClass - 0.1 - i * 0.105) / 0.22);
      const px = bx + 330 + i * 50, py = by + 150;
      const scl = lerp(0.7, 1, E.back(p, 2));
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(scl, scl);
      roundRect(ctx, -18, -18, 36, 36, 10);
      ctx.fillStyle = p > 0.02 ? rgba(P.teal, 0.18 + 0.35 * p) : rgba('#FFFFFF', 0.06);
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = p > 0.6 ? rgba(P.tealSoft, 0.9) : rgba('#FFFFFF', 0.18);
      ctx.stroke();
      check(ctx, 0, 1, 22, { prog: clamp((p - 0.35) / 0.6), color: P.white, lw: 3.4, glow: rgba(P.teal, 0.8) });
      ctx.restore();
    }
    // progress bar 10/17
    const barP = clamp((t - tClass - 0.1) / 1.3);
    const barW = 770;
    roundRect(ctx, bx + 40, by + 208, barW, 8, 4);
    ctx.fillStyle = rgba('#FFFFFF', 0.1);
    ctx.fill();
    const fillW = barW * (0.588) * E.out(barP);
    ctx.save();
    roundRect(ctx, bx + 40, by + 208, Math.max(fillW, 0.1), 8, 4);
    ctx.fillStyle = lingrad(ctx, bx, 0, bx + barW, 0, [[0, P.teal], [1, P.tealSoft]]);
    ctx.shadowColor = rgba(P.teal, 0.9);
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();
    drawText(ctx, '10 / 17', bx + bw - 40, by + 226, {
      size: 24, family: F.en, weight: 600, color: rgba('#9FC4E8', 0.9), align: 'right', spacing: 1,
      alpha: clamp((t - tClass + 0.12) / 0.3),
    });
    ctx.restore();
  }

  /* ---- 17 chapter cards ---- */
  const gridA = enter(t, tCh17 - 0.45, 0.7, 26, 0.98);
  if (gridA.a > 0.004) {
    const cols = 9, cwid = 176, chei = 112, gap = 18, gx = 96, gy = 488;
    ctx.save();
    ctx.globalAlpha *= gridA.a;
    for (let i = 0; i < 17; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = gx + col * (cwid + gap), y = gy + row * (chei + gap) + gridA.dy;
      const app = clamp((t - tCh17 + 0.25 - i * 0.035) / 0.45);
      if (app <= 0) continue;
      const isDone = i < 4;
      const doneAt = tDone4 + (i * 0.16);
      const dp = clamp((t - doneAt) / 0.45);
      const active = isDone && dp > 0;      // turns teal when "৪টি" is spoken
      const lift = active ? E.out(dp) : 0;
      const sc = lerp(0.86, 1, E.back(app, 1.6)) * (1 + 0.06 * lift);
      ctx.save();
      ctx.translate(x + cwid / 2, y + chei / 2);
      ctx.scale(sc, sc);
      ctx.globalAlpha *= app;
      // card
      roundRect(ctx, -cwid / 2, -chei / 2, cwid, chei, 16);
      ctx.fillStyle = active
        ? lingrad(ctx, -cwid / 2, -chei / 2, cwid / 2, chei / 2, [[0, rgba(P.teal, 0.34)], [1, rgba(P.tealDeep, 0.16)]])
        : rgba('#FFFFFF', 0.05);
      ctx.fill();
      ctx.lineWidth = active ? 1.8 : 1.2;
      ctx.strokeStyle = active ? rgba(P.tealSoft, 0.9) : rgba('#FFFFFF', 0.16);
      if (active) { ctx.shadowColor = rgba(P.teal, 0.5 * lift); ctx.shadowBlur = 24; }
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      drawText(ctx, String(i + 1).padStart(2, '0'), -cwid / 2 + 18, -chei / 2 + 34, {
        size: 24, family: F.en, weight: 700, color: active ? P.white : rgba('#A9C6E0', 0.6), spacing: 1,
      });
      drawText(ctx, isDone ? 'শেষ' : (i === 4 ? 'পরবর্তী' : 'বাকি'), cwid / 2 - 16, chei / 2 - 16, {
        size: i === 4 ? 19 : 20, family: F.bnText, weight: 600,
        color: active ? P.tealSoft : (i === 4 ? rgba(P.gold, 0.95) : rgba('#7E9CB8', 0.65)), align: 'right',
      });
      if (dp > 0.05) {
        ctx.beginPath();
        ctx.arc(-cwid / 2 + 34, chei / 2 - 34, 13, 0, TAU);
        ctx.fillStyle = rgba(P.teal, 0.25 + 0.4 * lift);
        ctx.fill();
        check(ctx, -cwid / 2 + 34, chei / 2 - 33, 17, { prog: clamp(dp / 0.6), color: P.white, lw: 2.8, glow: rgba(P.teal, 0.9) });
      }
      ctx.restore();
    }
    // next-chapter highlight travelling to card 05
    const nx = clamp((t - tFinished) / 0.6);
    if (nx > 0) {
      const col = 4, row = 0;
      const x = gx + col * (cwid + gap), y = gy + row * (chei + gap);
      ctx.save();
      ctx.globalAlpha *= E.out(nx) * (0.75 + 0.25 * Math.sin(t * 6));
      roundRect(ctx, x - 3, y - 3 + gridA.dy, cwid + 6, chei + 6, 19);
      ctx.strokeStyle = rgba(P.gold, 0.9);
      ctx.lineWidth = 2.4;
      ctx.shadowColor = rgba(P.gold, 0.8);
      ctx.shadowBlur = 26;
      ctx.stroke();
      ctx.restore();
    }
    // legend
    drawText(ctx, 'মোট ১৭টি চ্যাপ্টার   ·   ৪টি সম্পন্ন   ·   পরবর্তী অধ্যায় ১০', gx, gy + 2 * (chei + gap) + 40 + gridA.dy, {
      size: 28, family: F.bnText, weight: 600, color: rgba('#A9C6E0', 0.8), alpha: clamp((t - tDone4) / 0.6),
    });
    ctx.restore();
  }
}

/* ================================================================
   SCENE 4 — DISTANCE & HEIGHT (CHAPTER 10)
   ================================================================ */
function sceneGeometry(ctx, t, s, e) {
  const tDist = WT(8, 2), tHeight = WT(8, 4), tCh = WT(8, 5);

  const groundY = 806;
  const obsX = 560, bldX = 1300, bldW = 210, bldTop = 300;

  // title block (left)
  const a1 = enter(t, s + 0.1, 0.7, 24, 0.97);
  labelChip(ctx, 'CHAPTER 10', 300, 232 + a1.dy, {
    size: 26, weight: 700, spacing: 4, padX: 28, h: 56, alpha: a1.a,
    fill: rgba(P.gold, 0.14), stroke: rgba(P.gold, 0.8), color: P.gold,
  });
  const a2 = enter(t, tCh - 0.1, 0.75, 28, 0.96);
  drawText(ctx, 'DISTANCE &', 152, 330 + a2.dy, {
    size: 62, family: F.en, weight: 800, color: P.white, spacing: 2, alpha: a2.a,
    shadow: 'rgba(0,10,25,0.7)', shadowBlur: 22, shadowY: 6,
  });
  drawText(ctx, 'HEIGHT', 152, 402 + a2.dy, {
    size: 62, family: F.en, weight: 800, spacing: 2, alpha: a2.a,
    grad: [[0, P.goldLight], [1, P.goldDeep]], glow: rgba(P.gold, 0.28), glowBlur: 30,
  });
  const a3 = enter(t, WT(8, 4), 0.8, 22, 0.98);
  drawText(ctx, 'দূরত্ব ও উচ্চতা', 152, 480 + a3.dy, {
    size: 42, family: F.bnDisp, weight: 700, color: P.tealSoft, spacing: 0.5, alpha: a3.a,
  });
  const a4 = enter(t, s + 0.5, 0.7, 14, 0.99);
  drawText(ctx, 'tan θ  =  উচ্চতা ÷ দূরত্ব', 152, 556 + a4.dy, {
    size: 26, family: F.bnText, weight: 500, color: '#A9C6E0', alpha: a4.a * 0.85,
  });

  // ground
  const gp = clamp((t - s - 0.1) / 0.8);
  ctx.save();
  ctx.globalAlpha *= E.out(gp);
  ctx.strokeStyle = rgba('#9FC4E8', 0.45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, groundY);
  ctx.lineTo(lerp(80, 1840, E.out(gp)), groundY);
  ctx.stroke();
  ctx.globalAlpha *= 0.25;
  ctx.strokeStyle = rgba(P.teal, 0.6);
  for (let x = 100; x < 1840; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x - 12, groundY + 16);
    ctx.stroke();
  }
  ctx.restore();

  // distant skyline for depth
  const skyP = clamp((t - s - 0.05) / 0.8);
  if (skyP > 0) {
    ctx.save();
    ctx.globalAlpha *= E.out(skyP) * 0.6;
    const towers = [[1690, 400, 118], [1830, 500, 84], [960, 520, 64], [880, 560, 48]];
    for (let i = 0; i < towers.length; i++) {
      const [tx, th, tw2] = towers[i];
      roundRect(ctx, tx, groundY - th * E.out(clamp(skyP * 1.3 - i * 0.06)), tw2, th * E.out(clamp(skyP * 1.3 - i * 0.06)), 3);
      ctx.fillStyle = lingrad(ctx, tx, groundY - th, tx + tw2, groundY, [
        [0, rgba('#173F6E', 0.34)], [1, rgba('#08182A', 0.5)],
      ]);
      ctx.fill();
      ctx.strokeStyle = rgba('#4B7DB5', 0.35);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  // building
  const bp = clamp((t - s - 0.35) / 0.9);
  if (bp > 0) {
    const bh = (groundY - bldTop) * E.out(bp);
    const y0 = groundY - bh;
    ctx.save();
    ctx.globalAlpha *= E.out(clamp(bp * 1.6));
    roundRect(ctx, bldX, y0, bldW, bh, 4);
    ctx.fillStyle = lingrad(ctx, bldX, y0, bldX + bldW, groundY, [
      [0, rgba(P.royalLight, 0.85)], [1, rgba('#0A1B2E', 0.95)],
    ]);
    ctx.fill();
    ctx.strokeStyle = rgba(P.tealSoft, 0.5);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // right-hand facade (gives the tower a 3D read)
    ctx.beginPath();
    ctx.moveTo(bldX + bldW, y0);
    ctx.lineTo(bldX + bldW + 44, y0 - 22);
    ctx.lineTo(bldX + bldW + 44, groundY - 22);
    ctx.lineTo(bldX + bldW, groundY);
    ctx.closePath();
    ctx.fillStyle = lingrad(ctx, bldX + bldW, 0, bldX + bldW + 44, 0, [
      [0, rgba('#0C2C4F', 0.95)], [1, rgba('#061525', 0.95)],
    ]);
    ctx.fill();
    ctx.strokeStyle = rgba(P.tealSoft, 0.28);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // roof line
    ctx.strokeStyle = rgba(P.tealSoft, 0.85);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(bldX, y0);
    ctx.lineTo(bldX + bldW, y0);
    ctx.stroke();
    // windows
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        const ww2 = 40, wh2 = 30;
        const wx = bldX + 24 + c * 58, wy = y0 + 34 + r * ((bh - 70) / 5);
        if (wy > groundY - 40) continue;
        const on = clamp((t - s - 0.6 - (r * 0.09 + c * 0.05)) / 0.4);
        if (on <= 0) continue;
        roundRect(ctx, wx, wy, ww2, wh2, 3);
        ctx.fillStyle = rgba(P.gold, (0.14 + 0.44 * on * (0.55 + 0.45 * Math.sin(t * 1.6 + r + c))));
        ctx.fill();
      }
    }
    // left rim light
    ctx.strokeStyle = rgba(P.tealSoft, 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bldX, y0);
    ctx.lineTo(bldX, groundY);
    ctx.stroke();
    ctx.restore();
  }

  // observer / pole
  const op = clamp((t - s - 0.15) / 0.5);
  if (op > 0) {
    ctx.save();
    ctx.globalAlpha *= E.out(op);
    ctx.strokeStyle = rgba('#FFFFFF', 0.85);
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(obsX, groundY);
    ctx.lineTo(obsX, groundY - 74);
    ctx.stroke();
    glow(ctx, obsX, groundY - 80, 60, P.teal, 0.6);
    ctx.fillStyle = P.tealSoft;
    ctx.beginPath();
    ctx.arc(obsX, groundY - 80, 5.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // distance measurement
  const dp = clamp((t - tDist) / 0.75);
  measureLine(ctx, obsX, groundY + 46, bldX, groundY + 46, dp, { color: rgba(P.tealSoft, 0.95), glow: rgba(P.teal, 0.8), lw: 2.4 });
  if (dp > 0.35) {
    ctx.save();
    ctx.globalAlpha *= clamp((dp - 0.35) / 0.5);
    roundRect(ctx, (obsX + bldX) / 2 - 78, groundY + 22, 156, 48, 24);
    ctx.fillStyle = rgba(P.navyDeep, 0.92);
    ctx.fill();
    ctx.strokeStyle = rgba(P.teal, 0.7);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    drawText(ctx, 'দূরত্ব', (obsX + bldX) / 2, groundY + 55, { size: 26, family: F.bnText, weight: 600, color: P.tealSoft, align: 'center' });
    ctx.restore();
  }

  // height measurement
  const hp = clamp((t - tHeight) / 0.7);
  measureLine(ctx, bldX - 46, groundY, bldX - 46, bldTop + 26, hp, { color: rgba(P.gold, 0.95), glow: rgba(P.gold, 0.7), lw: 2.4 });
  if (hp > 0.35) {
    ctx.save();
    ctx.globalAlpha *= clamp((hp - 0.35) / 0.5);
    ctx.translate(bldX - 92, (groundY + bldTop) / 2);
    ctx.rotate(-Math.PI / 2);
    roundRect(ctx, -78, -24, 156, 48, 24);
    ctx.fillStyle = rgba(P.navyDeep, 0.92);
    ctx.fill();
    ctx.strokeStyle = rgba(P.gold, 0.7);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    drawText(ctx, 'উচ্চতা', 0, 9, { size: 26, family: F.bnText, weight: 600, color: P.gold, align: 'center' });
    ctx.restore();
  }

  // hypotenuse + right angle
  const tp = clamp((t - WT(8, 4) + 0.15) / 0.8);
  if (tp > 0) {
    ctx.save();
    ctx.setLineDash([12, 12]);
    ctx.lineDashOffset = -t * 40;
    ctx.strokeStyle = rgba(P.white, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(obsX, groundY - 80);
    ctx.lineTo(lerp(obsX, bldX, E.out(tp)), lerp(groundY - 80, bldTop + 26, E.out(tp)));
    ctx.stroke();
    ctx.restore();
    // angle arc
    if (tp > 0.5) {
      ctx.save();
      ctx.globalAlpha *= (tp - 0.5) * 2;
      ctx.strokeStyle = rgba(P.tealSoft, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(obsX, groundY - 80, 62, Math.atan2(bldTop + 26 - (groundY - 80), bldX - obsX), 0);
      ctx.stroke();
      drawText(ctx, 'θ', obsX + 84, groundY - 96, { size: 30, family: F.en, weight: 600, color: P.tealSoft });
      ctx.restore();
    }
    // right-angle box + formula
    if (tp > 0.85) {
      ctx.save();
      ctx.globalAlpha *= (tp - 0.85) * 6;
      ctx.strokeStyle = rgba('#FFFFFF', 0.5);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bldX - 26, groundY);
      ctx.lineTo(bldX - 26, groundY - 26);
      ctx.lineTo(bldX, groundY - 26);
      ctx.stroke();
      labelChip(ctx, 'tan θ = h / d', 1620, 700, {
        size: 28, weight: 600, spacing: 2, padX: 26, h: 58,
        fill: rgba(P.navyDeep, 0.8), stroke: rgba(P.teal, 0.55), color: rgba(P.tealSoft, 0.95),
      });
      ctx.restore();
    }
  }
}

/* ================================================================
   SCENE 5 — COMPLETE COURSE CONTENT
   ================================================================ */
function sceneContent(ctx, t, s, e) {
  const tBook = WT(9, 2), tAtoZ = WT(10, 0), tNotes = WT(11, 1), tQuiz = WT(12, 0);

  // ---------- book ----------
  const coverIn = enter(t, s + 0.1, 0.8, 40, 0.9);
  const open = clamp((t - tAtoZ + 0.1) / 0.9);
  const shiftX = lerp(0, -170, E.inOut(clamp((t - tNotes + 0.3) / 0.8)));
  const bw = lerp(390, 720, E.inOut(open)), bh = lerp(520, 440, E.inOut(open));
  const bcx = 700 + shiftX, bcy = 500;
  if (coverIn.a > 0.004) {
    ctx.save();
    ctx.globalAlpha *= coverIn.a;
    ctx.translate(bcx, bcy + coverIn.dy);
    ctx.scale(coverIn.s, coverIn.s);
    // shadow
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = radial(ctx, 0, bh / 2 + 30, bw * 0.8, [[0, rgba('#000000', 0.55)], [1, rgba('#000000', 0)]]);
    ctx.fillRect(-bw, bh / 2 - 40, bw * 2, 140);
    ctx.restore();
    // pages behind
    for (let i = 3; i >= 1; i--) {
      roundRect(ctx, -bw / 2 + i * 5, -bh / 2 + i * 4, bw, bh, 10);
      ctx.fillStyle = rgba('#DCE8F5', 0.1 + 0.04 * i);
      ctx.fill();
    }
    // cover
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 12);
    ctx.fillStyle = lingrad(ctx, -bw / 2, -bh / 2, bw / 2, bh / 2, [
      [0, '#1B4A86'], [0.5, P.royal], [1, '#0A1F38'],
    ]);
    ctx.fill();
    ctx.strokeStyle = rgba(P.tealSoft, 0.55);
    ctx.lineWidth = 2;
    ctx.stroke();
    // spine
    ctx.fillStyle = rgba('#000000', 0.28);
    ctx.fillRect(-bw / 2, -bh / 2, 16, bh);
    // gold frame
    ctx.strokeStyle = rgba(P.gold, 0.45);
    ctx.lineWidth = 1.4;
    roundRect(ctx, -bw / 2 + 30, -bh / 2 + 30, bw - 60, bh - 60, 8);
    ctx.stroke();
    sigmaMark(ctx, 0, -bh / 2 + 138, 92, { alpha: 0.95 });
    drawText(ctx, 'সাধারণ', 0, -bh / 2 + 250, { size: 52, family: F.bnDisp, weight: 700, color: P.white, align: 'center' });
    drawText(ctx, 'গণিত', 0, -bh / 2 + 318, { size: 58, family: F.bnDisp, weight: 700, color: P.gold, align: 'center' });
    drawText(ctx, 'GENERAL MATHEMATICS', 0, bh / 2 - 108, {
      size: 19, family: F.en, weight: 600, color: rgba('#CFE4F7', 0.8), align: 'center', spacing: 3.4,
    });
    drawText(ctx, 'SSC  ·  DAKHIL', 0, bh / 2 - 70, {
      size: 20, family: F.en, weight: 700, color: rgba(P.tealSoft, 0.9), align: 'center', spacing: 4,
    });
    ctx.restore();

    // specs caption under the book
    const capA = clamp((t - tBook) / 0.6) * (1 - clamp((t - tNotes) / 0.5));
    if (capA > 0.01) {
      drawText(ctx, 'সম্পূর্ণ বই  ·  ১৭টি চ্যাপ্টার', bcx, bcy + bh / 2 + 78, {
        size: 30, family: F.bnText, weight: 600, color: rgba('#CFE4F7', 0.9), align: 'center', alpha: capA,
      });
    }
  }

  // open book spread (two pages with content bars)
  if (open > 0) {
    ctx.save();
    ctx.globalAlpha *= E.out(clamp(open * 1.4));
    const pgW = bw / 2;
    for (const side of [-1, 1]) {
      const px = bcx + side * pgW / 2;
      roundRect(ctx, px - pgW / 2, bcy - bh / 2, pgW - 2, bh, 6);
      ctx.fillStyle = side < 0
        ? lingrad(ctx, px - pgW / 2, 0, px + pgW / 2, 0, [[0, '#F2F7FC'], [1, '#DCE8F5']])
        : lingrad(ctx, px - pgW / 2, 0, px + pgW / 2, 0, [[0, '#E6EFF9'], [1, '#FFFFFF']]);
      ctx.fill();
      // text bars
      const nLines = 11;
      for (let i = 0; i < nLines; i++) {
        const la = clamp((open * 1.6) - i * 0.05);
        if (la <= 0) continue;
        const lw = (pgW - 96) * (0.5 + 0.5 * rnd(i * 3.3 + side));
        ctx.fillStyle = rgba('#94A9BF', 0.55 * la);
        roundRect(ctx, px - pgW / 2 + 48, bcy - bh / 2 + 54 + i * 30, lw * la, 8, 4);
        ctx.fill();
      }
      // chapter tab
      ctx.fillStyle = rgba(P.teal, 0.85);
      roundRect(ctx, px - pgW / 2 + 34, bcy - bh / 2 + 18, 84, 24, 6);
      ctx.fill();
    }
    // gutter
    ctx.fillStyle = lingrad(ctx, bcx - 30, 0, bcx + 30, 0, [[0, rgba('#0B2138', 0)], [0.5, rgba('#0B2138', 0.45)], [1, rgba('#0B2138', 0)]]);
    ctx.fillRect(bcx - 30, bcy - bh / 2, 60, bh);
    ctx.restore();

    // "A → Z" badge
    const az = pop(t, tAtoZ - 0.05, 0.6);
    if (az > 0.01) {
      ctx.save();
      ctx.translate(bcx, bcy + bh / 2 + 76);
      ctx.scale(az, az);
      labelChip(ctx, 'A  →  Z', 0, 0, {
        size: 34, weight: 800, spacing: 6, padX: 36, h: 66,
        fill: rgba(P.gold, 0.16), stroke: rgba(P.gold, 0.85), color: P.gold,
      });
      ctx.restore();
    }
  }

  /* ---------------- notes card ---------------- */
  const na = enter(t, tNotes - 0.35, 0.7, 44, 0.95);
  if (na.a > 0.004) {
    const nx = 1080, ny = 180, nw = 700, nh = 292;
    glass(ctx, nx, ny + na.dy, nw, nh, 24, { alpha: na.a });
    ctx.save();
    ctx.globalAlpha *= na.a;
    ctx.translate(0, na.dy);
    // doc icon
    roundRect(ctx, nx + 36, ny + 40, 54, 68, 8);
    ctx.fillStyle = rgba(P.teal, 0.2);
    ctx.fill();
    ctx.strokeStyle = rgba(P.tealSoft, 0.85);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rgba(P.tealSoft, 0.75);
      ctx.fillRect(nx + 46, ny + 58 + i * 14, 34 - i * 6, 3.4);
    }
    drawText(ctx, 'CLASS NOTES', nx + 110, ny + 68, { size: 22, family: F.en, weight: 700, color: rgba(P.tealSoft, 0.95), spacing: 3.4 });
    drawText(ctx, 'প্রতিটি চ্যাপ্টারের নোট', nx + 110, ny + 108, { size: 34, family: F.bnText, weight: 600, color: P.white });
    const items = ['চ্যাপ্টারভিত্তিক সূত্র', 'সহজ ভাষায় ব্যাখ্যা', 'বোর্ড স্ট্যান্ডার্ড সমাধান'];
    items.forEach((it, i) => {
      const ia = clamp((t - tNotes - 0.15 - i * 0.22) / 0.5);
      if (ia <= 0) return;
      ctx.globalAlpha *= 1;
      const y = ny + 162 + i * 42;
      ctx.save();
      ctx.globalAlpha *= ia;
      ctx.beginPath();
      ctx.arc(nx + 48, y - 9, 12, 0, TAU);
      ctx.fillStyle = rgba(P.teal, 0.22);
      ctx.fill();
      check(ctx, nx + 48, y - 9, 15, { prog: clamp((ia - 0.3) / 0.6), color: P.tealSoft, lw: 2.6 });
      drawText(ctx, it, nx + 76, y, { size: 27, family: F.bnText, weight: 500, color: rgba('#D9E9F7', 0.92) });
      ctx.restore();
    });
    ctx.restore();
  }

  /* ---------------- quiz card ---------------- */
  const qa = enter(t, tQuiz - 0.3, 0.7, 44, 0.95);
  if (qa.a > 0.004) {
    const qx = 1080, qy = 498, qw = 700, qh = 292;
    glass(ctx, qx, qy + qa.dy, qw, qh, 24, { alpha: qa.a });
    ctx.save();
    ctx.globalAlpha *= qa.a;
    ctx.translate(0, qa.dy);
    drawText(ctx, 'QUIZ  +  ASSIGNMENT', qx + 36, qy + 56, { size: 21, family: F.en, weight: 700, color: rgba(P.gold, 0.95), spacing: 3.2 });
    drawText(ctx, 'নিয়মিত কুইজ ও অ্যাসাইনমেন্ট', qx + 36, qy + 102, { size: 32, family: F.bnText, weight: 600, color: P.white });
    const opts = ['ক', 'খ', 'গ', 'ঘ'];
    opts.forEach((o, i) => {
      const oa = clamp((t - tQuiz + 0.34 - i * 0.11) / 0.4);
      if (oa <= 0) return;
      const ox = qx + 36 + i * 162, oy = qy + 136;
      const correct = i === 1 && t > tQuiz + 0.55;
      const cpulse = correct ? 1 + 0.04 * Math.sin((t - tQuiz) * 8) : 1;
      ctx.save();
      ctx.translate(ox + 70, oy + 34);
      ctx.scale(oa * cpulse, oa * cpulse);
      roundRect(ctx, -70, -34, 140, 68, 18);
      ctx.fillStyle = correct ? rgba(P.teal, 0.28) : rgba('#FFFFFF', 0.06);
      ctx.fill();
      ctx.lineWidth = correct ? 2 : 1.2;
      ctx.strokeStyle = correct ? rgba(P.tealSoft, 0.95) : rgba('#FFFFFF', 0.2);
      if (correct) { ctx.shadowColor = rgba(P.teal, 0.7); ctx.shadowBlur = 22; }
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      drawText(ctx, o, -46, 11, { size: 28, family: F.bnText, weight: 600, color: correct ? P.white : rgba('#B9D2EA', 0.9), align: 'center' });
      if (correct) check(ctx, 34, 0, 26, { prog: clamp((t - tQuiz - 0.62) / 0.4), color: P.white, lw: 3.2, glow: rgba(P.teal, 1) });
      ctx.restore();
    });
    // assignment progress ring
    const ap = clamp((t - tQuiz + 0.1) / 1.4);
    if (ap > 0) {
      const rcx = qx + 590, rcy = qy + 210, rr = 52;
      ring(ctx, rcx, rcy, rr, ap * 0.8, { lw: 10, glow: rgba(P.teal, 0.6) });
      drawText(ctx, `${Math.round(ap * 100)}%`, rcx, rcy + 11, { size: 28, family: F.en, weight: 700, color: P.white, align: 'center' });
      drawText(ctx, 'অ্যাসাইনমেন্ট', rcx, rcy + 92, { size: 21, family: F.bnText, weight: 500, color: rgba('#A9C6E0', 0.85), align: 'center' });
    }
    ctx.restore();
  }

  // right-hand content chips fill the frame before the notes card arrives
  const chipA = clamp((t - s - 0.35) / 0.6) * (1 - clamp((t - tNotes + 0.5) / 0.5));
  if (chipA > 0.004) {
    const items = [['নোট', 'CHAPTER NOTES'], ['কুইজ', 'QUIZ'], ['অ্যাসাইনমেন্ট', 'ASSIGNMENT'], ['সমাধান', 'SOLUTIONS']];
    items.forEach(([bn, en], i) => {
      const a = clamp((chipA - i * 0.12) / 0.6);
      if (a <= 0) return;
      const y = 214 + i * 118 + (1 - E.out(a)) * 22;
      const x = 1120;
      ctx.save();
      ctx.globalAlpha *= a;
      roundRect(ctx, x, y, 620, 96, 22);
      ctx.fillStyle = rgba('#FFFFFF', 0.045);
      ctx.fill();
      ctx.strokeStyle = rgba('#FFFFFF', 0.14);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 52, y + 48, 20, 0, TAU);
      ctx.fillStyle = rgba(P.teal, 0.18);
      ctx.fill();
      check(ctx, x + 52, y + 49, 22, { color: P.tealSoft, lw: 3 });
      drawText(ctx, bn, x + 92, y + 40, { size: 27, family: F.bnText, weight: 600, color: P.white });
      drawText(ctx, en, x + 92, y + 70, { size: 16, family: F.en, weight: 600, color: rgba(P.tealSoft, 0.8), spacing: 3 });
      ctx.restore();
    });
  }
}

/* ================================================================
   SCENE 6 — TARGET A+ / 90+ MARKS
   ================================================================ */
function sceneGoal(ctx, t, s, e) {
  const tGuide = WT(13, 0), tAplus = WT(14, 2), t90 = WT(14, 4), tDream = WT(15, 0);
  const sheetOut = clamp((t - (tAplus - 0.55)) / 0.6);

  /* ---- practice sheet (left) ---- */
  const sp = enter(t, tGuide - 0.25, 0.8, 40, 0.94);
  const sheetA = sp.a * (1 - E.inOut(sheetOut));
  if (sheetA > 0.004) {
    const sx = 130, sy = 178, sw = 540, shh = 468;
    ctx.save();
    ctx.globalAlpha *= sheetA;
    ctx.translate(sx + sw / 2, sy + shh / 2 + sp.dy - sheetOut * 26);
    ctx.rotate(-0.022);
    const sc = lerp(1, 0.94, E.inOut(sheetOut));
    ctx.scale(sc, sc);
    ctx.translate(-sw / 2, -shh / 2);
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    roundRect(ctx, 0, 0, sw, shh, 14);
    ctx.fillStyle = lingrad(ctx, 0, 0, sw, shh, [[0, '#F7FBFF'], [1, '#DCE8F5']]);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = rgba('#7FA9CE', 0.26);
    ctx.lineWidth = 1;
    for (let x = 22; x < sw; x += 26) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, shh); ctx.stroke(); }
    for (let y = 22; y < shh; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(sw, y); ctx.stroke(); }
    const lines = ['x² − 5x + 6 = 0', '(x−2)(x−3) = 0', 'x = 2, 3', 'sin²θ + cos²θ = 1', 'a² + b² = c²'];
    lines.forEach((ln, i) => {
      const p = clamp((t - tGuide - 0.25 - i * 0.3) / 0.5);
      if (p <= 0) return;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, p * 1.6);
      drawText(ctx, ln, 40, 88 + i * 76, { size: 36, family: F.en, weight: 600, color: '#17334F', spacing: 1 });
      const uw = measure(ctx, ln, { size: 36, weight: 600, family: F.en }) * p;
      ctx.strokeStyle = rgba(P.tealDeep, 0.45);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(36, 102 + i * 76);
      ctx.lineTo(36 + uw, 102 + i * 76);
      ctx.stroke();
      ctx.restore();
    });
    for (let i = 0; i < 3; i++) {
      const p = clamp((t - tGuide - 0.85 - i * 0.3) / 0.4);
      if (p <= 0) continue;
      check(ctx, sw - 62, 74 + i * 76, 32, { prog: p, color: P.tealDeep, lw: 5 });
    }
    ctx.restore();
    drawText(ctx, 'প্র্যাকটিস শিট', sx + sw / 2, 706, {
      size: 26, family: F.bnText, weight: 600, color: '#9FC4E8', align: 'center', alpha: sheetA * 0.95,
    });
  }

  /* ---- digital progress panel ---- */
  const pp = enter(t, tGuide + 0.2, 0.8, 40, 0.95);
  if (pp.a > 0.004) {
    const px = 758, py = 168, pw = 1082, ph = 252;
    glass(ctx, px, py + pp.dy, pw, ph, 26, { alpha: pp.a });
    ctx.save();
    ctx.globalAlpha *= pp.a;
    ctx.translate(0, pp.dy);
    drawText(ctx, 'YOUR  PROGRESS', px + 44, py + 58, { size: 21, family: F.en, weight: 700, color: rgba(P.tealSoft, 0.9), spacing: 4 });
    drawText(ctx, 'গাইডলাইন মেনে নিয়মিত প্র্যাকটিস', px + 44, py + 106, {
      size: 33, family: F.bnText, weight: 600, color: P.white,
    });
    const metrics = [['ক্লাস উপস্থিতা', 0.94], ['অ্যাসাইনমেন্ট', 0.88], ['কুইজ', 0.9]];
    metrics.forEach(([label, v], i) => {
      const y = py + 158 + i * 32;
      const p = E.out(clamp((t - tGuide - 0.45 - i * 0.2) / 0.9));
      drawText(ctx, label, px + 44, y + 6, { size: 21, family: F.bnText, weight: 500, color: '#B9D2EA' });
      const barX = px + 330, barW = 580;
      roundRect(ctx, barX, y - 7, barW, 11, 6);
      ctx.fillStyle = rgba('#FFFFFF', 0.1);
      ctx.fill();
      roundRect(ctx, barX, y - 7, Math.max(2, barW * v * p), 11, 6);
      ctx.fillStyle = lingrad(ctx, barX, 0, barX + barW, 0, [[0, P.teal], [1, P.tealSoft]]);
      ctx.shadowColor = rgba(P.teal, 0.8);
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      drawText(ctx, `${Math.round(v * 100 * p)}%`, px + pw - 44, y + 6, {
        size: 21, family: F.en, weight: 700, color: '#CFE4F7', align: 'right',
      });
    });
    ctx.restore();
  }

  /* ---- weekly practice streak (fills the frame before the badge) ---- */
  const streakOut = clamp((t - (tAplus - 0.5)) / 0.5);
  const sa = enter(t, tGuide + 0.6, 0.8, 36, 0.95);
  const streakA = sa.a * (1 - E.inOut(streakOut));
  if (streakA > 0.004) {
    const wx = 758, wy = 462, ww = 1082, wh = 186;
    glass(ctx, wx, wy, ww, wh, 24, { alpha: streakA });
    ctx.save();
    ctx.globalAlpha *= streakA;
    drawText(ctx, 'সাপ্তাহিক প্র্যাকটিস', wx + 40, wy + 52, {
      size: 28, family: F.bnText, weight: 600, color: '#CFE4F7',
    });
    drawText(ctx, 'WEEKLY  PRACTICE', wx + ww - 40, wy + 52, {
      size: 19, family: F.en, weight: 600, color: rgba(P.tealSoft, 0.85), align: 'right', spacing: 3.6,
    });
    const bars = [0.55, 0.8, 0.42, 0.9, 0.68, 0.96, 0.5];
    const baseY = wy + wh - 34;
    bars.forEach((v, i) => {
      const p = E.out(clamp((t - tGuide - 0.85 - i * 0.11) / 0.6));
      const bx = wx + 46 + i * 40, bh = 96 * v * p;
      roundRect(ctx, bx, baseY - bh, 22, Math.max(bh, 2), 7);
      ctx.fillStyle = i === 5 ? lingrad(ctx, 0, baseY - bh, 0, baseY, [[0, P.gold], [1, rgba(P.goldDeep, 0.6)]])
        : lingrad(ctx, 0, baseY - bh, 0, baseY, [[0, P.tealSoft], [1, rgba(P.teal, 0.45)]]);
      ctx.fill();
    });
    // headline stat
    const doneP = clamp((t - tGuide - 1.1) / 1.4);
    drawText(ctx, `${Math.round(48 * E.out(doneP))}+`, wx + 470, wy + 108, {
      size: 62, family: F.en, weight: 800, grad: [[0, P.white], [1, P.tealSoft]], glow: rgba(P.teal, 0.35), glowBlur: 28,
    });
    drawText(ctx, 'অনুশীলনী সমস্যা সমাধান', wx + 470, wy + 150, {
      size: 26, family: F.bnText, weight: 500, color: '#A9C6E0', alpha: clamp((t - tGuide - 1.2) / 0.6),
    });
    drawText(ctx, 'প্রতিদিন ৩০ মিনিট', wx + ww - 44, wy + 120, {
      size: 26, family: F.bnText, weight: 600, color: rgba(P.gold, 0.9), align: 'right', alpha: clamp((t - tGuide - 1.4) / 0.6),
    });
    ctx.restore();
  }

  /* ---- TARGET A+ badge (right) ---- */
  const badgeIn = pop(t, tAplus - 0.1, 0.8);
  if (badgeIn > 0.01) {
    const bx = 1450, by = 604, R = 168;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, badgeIn) * 0.55;
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(bx, by);
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * TAU + t * 0.1;
      const len = R * (1.7 + 0.3 * Math.sin(t * 0.9 + i));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a0) * len, Math.sin(a0) * len);
      ctx.strokeStyle = rgba(i % 2 ? P.gold : P.tealSoft, 0.14);
      ctx.lineWidth = 9;
      ctx.stroke();
    }
    ctx.restore();
    glow(ctx, bx, by, 330, P.gold, 0.32 * badgeIn);
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(badgeIn, badgeIn);
    ring(ctx, 0, 0, 142, 1, { lw: 2.4, color: rgba(P.gold, 0.4), track: rgba('#FFFFFF', 0.07) });
    ring(ctx, 0, 0, 124, 0.9, {
      lw: 13,
      color: lingrad(ctx, -124, -124, 124, 124, [[0, P.goldLight], [1, P.goldDeep]]),
      glow: rgba(P.gold, 0.9), track: rgba('#FFFFFF', 0.06),
    });
    drawText(ctx, 'TARGET', 0, -44, { size: 22, family: F.en, weight: 700, color: rgba(P.gold, 0.95), align: 'center', spacing: 7 });
    drawText(ctx, 'A+', 0, 46, {
      size: 108, family: F.en, weight: 800, align: 'center', spacing: 2,
      grad: [[0, '#FFFFFF'], [1, P.goldLight]], glow: rgba(P.gold, 0.55), glowBlur: 44,
    });
    ctx.restore();
  }

  /* ---- 90+ marks card (bottom left, after the sheet leaves) ---- */
  const n90 = pop(t, t90 - 0.05, 0.7);
  if (n90 > 0.01) {
    const cx = 392, cy = 612;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(n90, n90);
    glass(ctx, -252, -140, 504, 280, 28, { alpha: n90 });
    glow(ctx, 0, 0, 290, P.teal, 0.26 * n90);
    const shown = Math.round(90 * E.out(clamp((t - t90) / 1.1)));
    drawText(ctx, '৯০+ মার্ক', 0, -86, { size: 28, family: F.bnText, weight: 600, color: rgba(P.tealSoft, 0.95), align: 'center' });
    const numTxt = String(shown);
    const numW = measure(ctx, numTxt, { size: 148, weight: 800, family: F.en, spacing: -3 });
    const pW = measure(ctx, '+', { size: 80, weight: 800, family: F.en });
    const gx0 = -(numW + pW + 6) / 2;
    drawText(ctx, numTxt, gx0 + numW / 2, 52, {
      size: 148, family: F.en, weight: 800, align: 'center', spacing: -3,
      grad: [[0, P.white], [0.55, P.tealSoft], [1, P.teal]],
      glow: rgba(P.teal, 0.45), glowBlur: 46,
    });
    drawText(ctx, '+', gx0 + numW + pW / 2 + 4, 46, {
      size: 80, family: F.en, weight: 800, align: 'center', color: P.gold, glow: rgba(P.gold, 0.6), glowBlur: 30,
      alpha: clamp((t - t90 - 0.5) / 0.5),
    });
    drawText(ctx, 'MARKS', 0, 108, { size: 26, family: F.en, weight: 700, color: '#CFE4F7', align: 'center', spacing: 9 });
    ctx.restore();
  }

  /* ---- dream / light reveal ---- */
  const br = clamp((t - tDream) / 1.1);
  if (br > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= Math.sin(Math.PI * clamp(br)) * 0.45;
    ctx.fillStyle = radial(ctx, 960, 470, 940, [[0, rgba(P.tealSoft, 0.32)], [1, rgba(P.teal, 0)]]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const da = enter(t, tDream + 0.25, 0.7, 20, 0.98);
    drawText(ctx, 'স্বপ্ন বাস্তব করা সম্ভব — ইনশাআল্লাহ', 960, 800 + da.dy, {
      size: 38, family: F.bnDisp, weight: 700, color: P.white, align: 'center', alpha: da.a,
      glow: rgba(P.teal, 0.4), glowBlur: 30,
    });
    drawText(ctx, 'লক্ষ্য নির্ধারিত · ফলাফল পরীক্ষার উপর নির্ভরশীল', 960, 843, {
      size: 20, family: F.bnText, weight: 400, color: rgba('#9FC4E8', 0.72), align: 'center', alpha: da.a * 0.85,
    });
  }
}

/* ================================================================
   SCENE 7 — LIVE CLASS EXPERIENCE
   ================================================================ */
function sceneLive(ctx, t, s, e) {
  const tLive = WT(16, 0), tFb = WT(16, 3), tLiveW = WT(16, 5);
  const t3days = WT(17, 2), tHour = WT(17, 6);

  /* ---- live room window ---- */
  const winA = enter(t, tLive - 0.2, 0.75, 40, 0.95);
  if (winA.a > 0.004) {
    const wx = 140, wy = 152, ww = 1010, wh = 430;
    glass(ctx, wx, wy + winA.dy, ww, wh, 24, { alpha: winA.a });
    ctx.save();
    ctx.globalAlpha *= winA.a;
    ctx.translate(0, winA.dy);
    // window chrome
    ctx.fillStyle = rgba('#FFFFFF', 0.05);
    roundRect(ctx, wx + 1, wy + 1, ww - 2, 52, 22);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(wx + 30 + i * 20, wy + 27, 5.5, 0, TAU);
      ctx.fillStyle = rgba(['#FF5F57', '#FEBC2E', '#28C840'][i], 0.75);
      ctx.fill();
    }
    // live badge
    const pulse = 0.6 + 0.4 * Math.sin(t * 4.2);
    const lbp = clamp((t - tLiveW) / 0.45);
    if (lbp > 0) {
      ctx.save();
      ctx.globalAlpha *= lbp;
      roundRect(ctx, wx + ww - 190, wy + 12, 96, 34, 17);
      ctx.fillStyle = rgba(P.red, 0.9);
      ctx.shadowColor = rgba(P.red, 0.8);
      ctx.shadowBlur = 20 * pulse;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.arc(wx + ww - 168, wy + 29, 5.5, 0, TAU);
      ctx.fillStyle = rgba('#FFFFFF', 0.55 + 0.45 * pulse);
      ctx.fill();
      drawText(ctx, 'LIVE', wx + ww - 152, wy + 37, { size: 20, family: F.en, weight: 800, color: P.white, spacing: 2 });
      ctx.restore();
    }
    // viewer count
    drawText(ctx, '১২৮ জন দেখছেন', wx + ww - 300, wy + 37, {
      size: 21, family: F.bnText, weight: 500, color: rgba('#B9D2EA', 0.8), align: 'right',
      alpha: lbp,
    });
    // teacher tile + student tiles
    const tiles = [
      [wx + 24, wy + 76, 600, 320, true],
      [wx + 648, wy + 76, 160, 152, false],
      [wx + 824, wy + 76, 160, 152, false],
      [wx + 648, wy + 244, 160, 152, false],
      [wx + 824, wy + 244, 160, 152, false],
    ];
    tiles.forEach(([x, y, w2, h2, main], i) => {
      const ta = clamp((t - tLive - 0.25 - i * 0.1) / 0.45);
      if (ta <= 0) return;
      ctx.save();
      ctx.globalAlpha *= ta;
      roundRect(ctx, x, y, w2, h2, 14);
      ctx.fillStyle = main
        ? lingrad(ctx, x, y, x + w2, y + h2, [[0, '#1B4A86'], [1, '#0A1D33']])
        : lingrad(ctx, x, y, x + w2, y + h2, [[0, '#173A63'], [1, '#0A1D33']]);
      ctx.fill();
      ctx.strokeStyle = main ? rgba(P.teal, 0.55) : rgba('#FFFFFF', 0.14);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      if (main) {
        // abstract teaching board inside the tile
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, x, y, w2, h2, 14);
        ctx.clip();
        ctx.strokeStyle = rgba(P.tealSoft, 0.35);
        ctx.lineWidth = 2;
        const eqp = clamp((t - tLive - 0.5) / 1.6);
        ctx.beginPath();
        ctx.moveTo(x + 60, y + 110);
        ctx.lineTo(x + 60 + 300 * eqp, y + 110);
        ctx.stroke();
        ctx.strokeStyle = rgba(P.gold, 0.5);
        ctx.beginPath();
        ctx.moveTo(x + 60, y + 170);
        ctx.lineTo(x + 60 + 220 * clamp(eqp * 1.4), y + 170);
        ctx.stroke();
        // graph curve
        ctx.strokeStyle = rgba(P.teal, 0.8);
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let k = 0; k <= 60 * eqp; k++) {
          const u = k / 60;
          const px = x + 380 + u * 180;
          const py = y + 210 - Math.sin(u * 4.2) * 70;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        glow(ctx, x + 120, y + 60, 200, P.teal, 0.16);
        ctx.restore();
        // teacher avatar mark
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + 60, y + h2 - 52, 30, 0, TAU);
        ctx.fillStyle = rgba(P.teal, 0.25);
        ctx.fill();
        drawText(ctx, 'MF', x + 60, y + h2 - 42, { size: 24, family: F.en, weight: 800, color: P.white, align: 'center' });
        drawText(ctx, 'মোহাম্মাদ ফয়সাল', x + 102, y + h2 - 42, { size: 24, family: F.bnText, weight: 600, color: rgba('#DDEBFA', 0.95) });
        ctx.restore();
      } else {
        // abstract student avatars (no faces)
        const cx2 = x + w2 / 2, cy2 = y + h2 / 2;
        glow(ctx, cx2, cy2, 90, ['#2C6FB5', '#1C8C86', '#B4863A', '#33557F'][i - 1], 0.5);
        ctx.beginPath();
        ctx.arc(cx2, cy2 - 12, 26, 0, TAU);
        ctx.fillStyle = rgba('#CFE4F7', 0.35);
        ctx.fill();
        roundRect(ctx, cx2 - 40, cy2 + 24, 80, 34, 16);
        ctx.fillStyle = rgba('#CFE4F7', 0.3);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
  }

  /* ---- facebook group chip ---- */
  const fa = enter(t, tFb - 0.1, 0.6, 22, 0.94);
  if (fa.a > 0.004) {
    const fx = 1360, fy = 190, fw = 400, fh = 96;
    glass(ctx, fx, fy + fa.dy, fw, fh, 20, { alpha: fa.a, top: 0.5 });
    ctx.save();
    ctx.globalAlpha *= fa.a;
    ctx.translate(0, fa.dy);
    roundRect(ctx, fx + 20, fy + 22, 52, 52, 14);
    ctx.fillStyle = rgba(P.fbBlue, 0.9);
    ctx.fill();
    glow(ctx, fx + 46, fy + 48, 70, P.fbBlue, 0.55);
    // speech-bubble glyph
    ctx.beginPath();
    ctx.moveTo(fx + 30, fy + 34);
    ctx.lineTo(fx + 62, fy + 34);
    ctx.quadraticCurveTo(fx + 68, fy + 34, fx + 68, fy + 41);
    ctx.lineTo(fx + 68, fy + 52);
    ctx.quadraticCurveTo(fx + 68, fy + 59, fx + 62, fy + 59);
    ctx.lineTo(fx + 40, fy + 59);
    ctx.lineTo(fx + 30, fy + 66);
    ctx.lineTo(fx + 30, fy + 41);
    ctx.quadraticCurveTo(fx + 30, fy + 34, fx + 37, fy + 34);
    ctx.closePath();
    ctx.fillStyle = rgba('#FFFFFF', 0.95);
    ctx.fill();
    drawText(ctx, 'প্রাইভেট ফেসবুক গ্রুপ', fx + 92, fy + 42, { size: 24, family: F.bnText, weight: 600, color: P.white });
    drawText(ctx, 'PRIVATE  GROUP', fx + 92, fy + 72, { size: 16, family: F.en, weight: 600, color: rgba(P.fbBlue, 0.95), spacing: 2.6 });
    ctx.restore();
  }

  /* ---- clock card: 1 – 1.5 hours ---- */
  const ca = enter(t, WT(16, 4) - 0.2, 0.7, 26, 0.95);
  if (ca.a > 0.004) {
    const cx = 1360, cy = 316, cw = 400, chh = 266;
    glass(ctx, cx, cy + ca.dy, cw, chh, 24, { alpha: ca.a });
    ctx.save();
    ctx.globalAlpha *= ca.a;
    ctx.translate(0, ca.dy);
    const dcx = cx + 112, dcy = cy + 132, dr = 64;
    ctx.beginPath();
    ctx.arc(dcx, dcy, dr, 0, TAU);
    ctx.strokeStyle = rgba('#FFFFFF', 0.1);
    ctx.lineWidth = 9;
    ctx.stroke();
    const arcEnd = lerp(0, TAU * 0.62, E.out(clamp((t - tHour) / 1.3)));
    ctx.beginPath();
    ctx.arc(dcx, dcy, dr, -Math.PI / 2, -Math.PI / 2 + arcEnd);
    ctx.strokeStyle = lingrad(ctx, dcx - dr, dcy - dr, dcx + dr, dcy + dr, [[0, P.gold], [1, P.teal]]);
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.shadowColor = rgba(P.gold, 0.7);
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    // clock hands
    ctx.save();
    ctx.translate(dcx, dcy);
    ctx.rotate(t * 0.6);
    ctx.strokeStyle = rgba('#FFFFFF', 0.7);
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -34);
    ctx.stroke();
    ctx.rotate(1.4 + t * 0.2);
    ctx.strokeStyle = rgba(P.tealSoft, 0.8);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -21);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(dcx, dcy, 4.4, 0, TAU);
    ctx.fillStyle = P.white;
    ctx.fill();
    const hA = clamp((t - tHour) / 0.6);
    drawText(ctx, '১ – ১.৫', cx + 288, cy + 118, {
      size: 44, family: F.bnText, weight: 700, color: P.white, align: 'center', alpha: 0.3 + 0.7 * hA,
    });
    drawText(ctx, 'ঘণ্টা', cx + 288, cy + 158, { size: 21, family: F.bnText, weight: 500, color: rgba(P.tealSoft, 0.9), align: 'center' });
    drawText(ctx, 'প্রতি ক্লাস', cx + 288, cy + 202, { size: 20, family: F.bnText, weight: 400, color: '#A9C6E0', align: 'center' });
    ctx.restore();
  }

  /* ---- weekly calendar ---- */
  const calA = enter(t, t3days - 0.4, 0.7, 30, 0.97);
  if (calA.a > 0.004) {
    const days = ['শুক্র', 'শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ'];
    const on = [0, 1, 0, 1, 0, 1, 0];  // 3 days a week
    const cw2 = 176, gap = 22, totalW = days.length * cw2 + (days.length - 1) * gap;
    const x0 = 960 - totalW / 2, y0 = 660;
    ctx.save();
    ctx.globalAlpha *= calA.a;
    drawText(ctx, 'সপ্তাহে কমপক্ষে ৩ দিন লাইভ ক্লাস', 960, y0 - 42 + calA.dy, {
      size: 30, family: F.bnText, weight: 600, color: rgba('#CFE4F7', 0.92), align: 'center',
    });
    days.forEach((d, i) => {
      const da = clamp((t - t3days - 0.3 + i * 0.05) / 0.5);
      if (da <= 0) return;
      const lit = on[i] ? clamp((t - t3days - 0.5 - i * 0.12) / 0.5) : 0;
      const x = x0 + i * (cw2 + gap), y = y0 + calA.dy;
      const scl = lerp(0.8, 1, E.back(da, 1.5));
      ctx.save();
      ctx.translate(x + cw2 / 2, y + 62);
      ctx.scale(scl, scl);
      ctx.globalAlpha *= da;
      roundRect(ctx, -cw2 / 2, -62, cw2, 124, 20);
      ctx.fillStyle = lit > 0 ? rgba(P.teal, 0.14 + 0.16 * lit) : rgba('#FFFFFF', 0.05);
      ctx.fill();
      ctx.lineWidth = lit > 0.2 ? 2 : 1.2;
      ctx.strokeStyle = lit > 0.2 ? rgba(P.tealSoft, 0.9) : rgba('#FFFFFF', 0.16);
      if (lit > 0.2) { ctx.shadowColor = rgba(P.teal, 0.6); ctx.shadowBlur = 22; }
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      drawText(ctx, d, 0, 6, {
        size: 28, family: F.bnText, weight: 600,
        color: lit > 0.2 ? P.white : rgba('#9FC4E8', 0.7), align: 'center',
      });
      drawText(ctx, 'CLASS', 0, 38, {
        size: 15, family: F.en, weight: 600, spacing: 2.2,
        color: lit > 0.2 ? rgba(P.tealSoft, 0.95) : rgba('#7E9CB8', 0.6), align: 'center',
      });
      if (lit > 0.5) check(ctx, 0, -34, 20, { prog: clamp((lit - 0.5) * 2.4), color: P.tealSoft, lw: 2.8 });
      ctx.restore();
    });
    ctx.restore();
  }
}

/* ================================================================
   SCENE 8 — RECORDINGS, NOTES & SUPPORT
   ================================================================ */
function sceneSupport(ctx, t, s, e) {
  const tRec = WT(18, 0), tNote = WT(18, 2), tWeb = WT(18, 3);
  const tSup = WT(19, 6), tFb2 = WT(19, 3);

  /* ---- player ---- */
  const pa = enter(t, tRec - 0.15, 0.75, 40, 0.95);
  if (pa.a > 0.004) {
    const px = 140, py = 190, pw = 880, ph = 500;
    glass(ctx, px, py + pa.dy, pw, ph, 26, { alpha: pa.a });
    ctx.save();
    ctx.globalAlpha *= pa.a;
    ctx.translate(0, pa.dy);
    // video canvas
    const vx = px + 28, vy = py + 28, vw = pw - 56, vh = 300;
    roundRect(ctx, vx, vy, vw, vh, 16);
    ctx.fillStyle = lingrad(ctx, vx, vy, vx + vw, vy + vh, [[0, '#0B2340'], [0.55, '#123B70'], [1, '#08243F']]);
    ctx.fill();
    ctx.save();
    roundRect(ctx, vx, vy, vw, vh, 16);
    ctx.clip();
    // abstract lesson board
    ctx.strokeStyle = rgba(P.tealSoft, 0.25);
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const ly = vy + 60 + i * 38;
      const lw = (vw - 160) * (0.35 + 0.5 * rnd(i * 5.7));
      ctx.beginPath();
      ctx.moveTo(vx + 80, ly);
      ctx.lineTo(vx + 80 + lw, ly);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(P.gold, 0.5);
    ctx.lineWidth = 3;
    ctx.beginPath();
    const gp = clamp((t - tRec - 0.5) / 1.6);
    for (let k = 0; k <= 90 * gp; k++) {
      const u = k / 90;
      const gx2 = vx + 60 + u * (vw - 120);
      const gy2 = vy + vh - 60 - Math.abs(Math.sin(u * 5)) * 120;
      if (k === 0) ctx.moveTo(gx2, gy2); else ctx.lineTo(gx2, gy2);
    }
    ctx.stroke();
    glow(ctx, vx + vw * 0.5, vy + vh * 0.5, 340, P.teal, 0.16);
    ctx.restore();
    // play button
    const pp2 = pop(t, tRec + 0.15, 0.6);
    if (pp2 > 0.01) {
      ctx.save();
      ctx.translate(vx + vw / 2, vy + vh / 2);
      ctx.scale(pp2, pp2);
      glow(ctx, 0, 0, 140, P.teal, 0.55 * (0.8 + 0.2 * Math.sin(t * 3)));
      ctx.beginPath();
      ctx.arc(0, 0, 54, 0, TAU);
      ctx.fillStyle = rgba('#071B35', 0.55);
      ctx.fill();
      ctx.strokeStyle = rgba('#FFFFFF', 0.85);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-14, -20);
      ctx.lineTo(24, 0);
      ctx.lineTo(-14, 20);
      ctx.closePath();
      ctx.fillStyle = P.white;
      ctx.fill();
      ctx.restore();
    }
    // timeline
    const tlY = vy + vh + 44;
    roundRect(ctx, vx, tlY, vw, 8, 4);
    ctx.fillStyle = rgba('#FFFFFF', 0.12);
    ctx.fill();
    const prog = 0.28 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.35));
    roundRect(ctx, vx, tlY, vw * prog, 8, 4);
    ctx.fillStyle = lingrad(ctx, vx, 0, vx + vw, 0, [[0, P.teal], [1, P.tealSoft]]);
    ctx.shadowColor = rgba(P.teal, 0.8);
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.arc(vx + vw * prog, tlY + 4, 9, 0, TAU);
    ctx.fillStyle = P.white;
    ctx.fill();
    // controls row (drawn, so no missing-glyph boxes)
    const ctlY = tlY + 48;
    ctx.save();
    ctx.strokeStyle = rgba('#CFE4F7', 0.75);
    ctx.fillStyle = rgba('#CFE4F7', 0.75);
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    // prev
    for (const dx of [0, 12]) {
      ctx.beginPath();
      ctx.moveTo(vx + 14 + dx, ctlY - 9);
      ctx.lineTo(vx + 14 + dx, ctlY + 9);
      ctx.lineTo(vx + 26 + dx, ctlY);
      ctx.closePath();
      ctx.fill();
    }
    // pause
    ctx.fillRect(vx + 50, ctlY - 10, 5, 20);
    ctx.fillRect(vx + 60, ctlY - 10, 5, 20);
    // next
    for (const dx of [0, 12]) {
      ctx.beginPath();
      ctx.moveTo(vx + 96 - dx, ctlY - 9);
      ctx.lineTo(vx + 96 - dx, ctlY + 9);
      ctx.lineTo(vx + 84 - dx, ctlY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    drawText(ctx, 'রেকর্ডেড ক্লাস', vx, py + ph - 34, {
      size: 28, family: F.bnText, weight: 600, color: P.white,
    });
    drawText(ctx, 'RECORDED  CLASSES', vx + vw, py + ph - 36, {
      size: 20, family: F.en, weight: 700, color: rgba(P.tealSoft, 0.95), align: 'right', spacing: 3.2,
    });
    ctx.restore();
  }

  /* ---- notes download card ---- */
  const na = enter(t, tNote - 0.2, 0.7, 34, 0.95);
  if (na.a > 0.004) {
    const nx = 1080, ny = 190, nw = 700, nh = 236;
    glass(ctx, nx, ny + na.dy, nw, nh, 24, { alpha: na.a });
    ctx.save();
    ctx.globalAlpha *= na.a;
    ctx.translate(0, na.dy);
    // download arrow animation
    const dp = (t * 0.55) % 1;
    roundRect(ctx, nx + 30, ny + 34, 86, 106, 12);
    ctx.fillStyle = rgba(P.teal, 0.14);
    ctx.fill();
    ctx.strokeStyle = rgba(P.tealSoft, 0.8);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rgba(P.tealSoft, 0.55);
      ctx.fillRect(nx + 46, ny + 54 + i * 16, 54 - (i % 2) * 16, 3.2);
    }
    ctx.save();
    ctx.translate(nx + 73, ny + 126 + Math.sin(dp * Math.PI) * 6);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 8);
    ctx.moveTo(-7, 1);
    ctx.lineTo(0, 9);
    ctx.lineTo(7, 1);
    ctx.strokeStyle = rgba(P.gold, 0.75 + 0.25 * Math.sin(dp * Math.PI));
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
    drawText(ctx, 'CLASS NOTES', nx + 148, ny + 74, { size: 22, family: F.en, weight: 700, color: rgba(P.tealSoft, 0.95), spacing: 3.4 });
    drawText(ctx, 'ওয়েবসাইটে নোট', nx + 148, ny + 118, { size: 34, family: F.bnText, weight: 600, color: P.white });
    drawText(ctx, 'প্রিন্ট ও ডাউনলোড করো', nx + 148, ny + 162, { size: 24, family: F.bnText, weight: 400, color: rgba('#A9C6E0', 0.85) });
    // small website pill
    labelChip(ctx, 'ONLINE', nx + nw - 100, ny + 60, {
      size: 19, weight: 700, spacing: 3, padX: 20, h: 40,
      fill: rgba(P.teal, 0.16), stroke: rgba(P.teal, 0.6), color: P.tealSoft,
    });
    ctx.restore();
  }

  /* ---- support card ---- */
  const sa = enter(t, CUE(19).start - 0.45, 0.75, 40, 0.95);
  if (sa.a > 0.004) {
    const sx = 1080, sy = 452, sw = 700, shh = 238;
    glass(ctx, sx, sy + sa.dy, sw, shh, 24, { alpha: sa.a });
    ctx.save();
    ctx.globalAlpha *= sa.a;
    ctx.translate(0, sa.dy);
    drawText(ctx, 'STUDENT SUPPORT', sx + 34, sy + 58, { size: 22, family: F.en, weight: 700, color: rgba(P.gold, 0.95), spacing: 3.4 });
    drawText(ctx, 'ফেসবুক গ্রুপ ও হোয়াটসঅ্যাপে সাপোর্ট', sx + 34, sy + 102, { size: 32, family: F.bnText, weight: 600, color: P.white });
    // chat bubbles
    const bubbles = [
      [0, 0, 250, P.fbBlue, 'প্রশ্ন করো', 1],
      [70, 46, 210, P.green, 'সাথে সাথে উত্তর', 0],
    ];
    bubbles.forEach(([ox, oy, bw2, col, txt, side], i) => {
      const ba = clamp((t - tSup - 0.4 + i * 0.35) / 0.5);
      if (ba <= 0) return;
      const x = sx + 34 + ox, y = sy + 130 + oy;
      ctx.save();
      ctx.globalAlpha *= ba;
      roundRect(ctx, x, y, bw2, 54, 16);
      ctx.fillStyle = rgba(col, 0.22);
      ctx.fill();
      ctx.strokeStyle = rgba(col, 0.65);
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 26, y + 27, 8, 0, TAU);
      ctx.fillStyle = rgba(col, 0.95);
      ctx.fill();
      drawText(ctx, txt, x + 46, y + 36, { size: 23, family: F.bnText, weight: 500, color: rgba('#EAF4FF', 0.95) });
      ctx.restore();
    });
    // floating support icon
    const ip = pop(t, tSup - 0.3, 0.7);
    if (ip > 0.01) {
      ctx.save();
      ctx.translate(sx + sw - 130, sy + 96);
      ctx.scale(ip, ip);
      glow(ctx, 0, 0, 120, P.green, 0.5);
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, TAU);
      ctx.fillStyle = rgba(P.green, 0.18);
      ctx.fill();
      ctx.strokeStyle = rgba(P.green, 0.8);
      ctx.lineWidth = 2;
      ctx.stroke();
      // headset-ish glyph
      ctx.beginPath();
      ctx.arc(0, -2, 20, Math.PI * 0.95, Math.PI * 2.05);
      ctx.strokeStyle = P.white;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
      roundRect(ctx, -26, -2, 10, 20, 5);
      ctx.fillStyle = P.white;
      ctx.fill();
      roundRect(ctx, 16, -2, 10, 20, 5);
      ctx.fillStyle = P.white;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

}

/* ================================================================
   SCENE 9 — TEACHER CREDENTIALS
   ================================================================ */
function sceneTeacher(ctx, t, s, e) {
  const tSelf = WT(20, 2), tYears = WT(21, 1), tStudents = WT(22, 1);

  /* ---- profile card ---- */
  const pa = enter(t, s + 0.1, 0.8, 40, 0.94);
  if (pa.a > 0.004) {
    const px = 170, py = 210, pw = 640, ph = 560;
    glass(ctx, px, py + pa.dy, pw, ph, 28, { alpha: pa.a });
    ctx.save();
    ctx.globalAlpha *= pa.a;
    ctx.translate(0, pa.dy);
    const cx = px + pw / 2, cy = py + 176;
    // monogram
    glow(ctx, cx, cy, 220, P.teal, 0.4);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 0.5) * 0.03);
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 104 + i * 16, t * (0.4 + i * 0.2), t * (0.4 + i * 0.2) + Math.PI * 1.35);
      ctx.strokeStyle = rgba(i ? P.gold : P.teal, 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, 88, 0, TAU);
    ctx.fillStyle = lingrad(ctx, cx - 88, cy - 88, cx + 88, cy + 88, [[0, P.royalLight], [1, '#0A1E36']]);
    ctx.fill();
    ctx.strokeStyle = rgba(P.tealSoft, 0.75);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    drawText(ctx, 'MF', cx, cy + 26, { size: 76, family: F.en, weight: 800, color: P.white, align: 'center', spacing: 2 });
    // name
    drawText(ctx, 'মোহাম্মাদ ফয়সাল', cx, py + 340, { size: 52, family: F.bnDisp, weight: 700, color: P.white, align: 'center' });
    drawText(ctx, 'MOHAMMAD  FAISAL', cx, py + 388, {
      size: 22, family: F.en, weight: 600, color: rgba(P.gold, 0.95), align: 'center', spacing: 4.4,
    });
    drawText(ctx, 'গণিত প্রশিক্ষক  ·  প্রতিষ্ঠাতা', cx, py + 440, { size: 26, family: F.bnText, weight: 500, color: rgba('#A9C6E0', 0.9), align: 'center' });
    // "he teaches himself" active indicator
    const ip = clamp((t - tSelf - 0.4) / 0.6);
    if (ip > 0) {
      ctx.save();
      ctx.globalAlpha *= ip;
      roundRect(ctx, cx - 150, py + ph - 74, 300, 52, 26);
      ctx.fillStyle = rgba(P.teal, 0.16);
      ctx.fill();
      ctx.strokeStyle = rgba(P.teal, 0.7);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - 118, py + ph - 48, 6, 0, TAU);
      ctx.fillStyle = rgba(P.tealSoft, 0.6 + 0.4 * Math.sin(t * 5));
      ctx.fill();
      drawText(ctx, 'প্রতিষ্ঠাতা ও প্রশিক্ষক', cx + 12, py + ph - 39, {
        size: 23, family: F.bnText, weight: 600, color: rgba('#DDEBFA', 0.95), align: 'center',
      });
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---- years of experience ---- */
  const ya = enter(t, tYears - 0.35, 0.7, 34, 0.95);
  if (ya.a > 0.004) {
    const yx = 890, yy = 210, yw = 880, yh = 220;
    glass(ctx, yx, yy + ya.dy, yw, yh, 24, { alpha: ya.a });
    ctx.save();
    ctx.globalAlpha *= ya.a;
    ctx.translate(0, ya.dy);
    drawText(ctx, 'EXPERIENCE', yx + 40, yy + 52, { size: 21, family: F.en, weight: 700, color: rgba(P.gold, 0.95), spacing: 4.4 });
    const numIn = clamp((t - tYears) / 0.7);
    const sc = lerp(0.7, 1, E.back(numIn, 1.8));
    ctx.save();
    ctx.translate(yx + 86, yy + 138);
    ctx.scale(sc, sc);
    drawText(ctx, '9', 0, 0, {
      size: 108, family: F.en, weight: 800, align: 'center',
      grad: [[0, P.white], [1, P.gold]], glow: rgba(P.gold, 0.45), glowBlur: 40, alpha: numIn,
    });
    ctx.restore();
    drawText(ctx, 'বছরের অভিজ্ঞতা', yx + 156, yy + 124, { size: 38, family: F.bnDisp, weight: 700, color: P.white });
    drawText(ctx, '৯ বছরের ধারাবাহিক শিক্ষাদান', yx + 156, yy + 168, { size: 24, family: F.bnText, weight: 400, color: rgba('#A9C6E0', 0.85) });
    // 9 year pips
    for (let i = 0; i < 9; i++) {
      const p = clamp((t - tYears - 0.15 - i * 0.06) / 0.3);
      const px2 = yx + 46 + i * 30, py2 = yy + 192;
      ctx.save();
      ctx.translate(px2, py2);
      ctx.scale(lerp(0.5, 1, E.back(p, 2)), lerp(0.5, 1, E.back(p, 2)));
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, TAU);
      ctx.fillStyle = p > 0 ? rgba(P.gold, 0.25 + 0.7 * p) : rgba('#FFFFFF', 0.12);
      if (p > 0.9) { ctx.shadowColor = rgba(P.gold, 0.9); ctx.shadowBlur = 14; }
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---- 42,000+ students ---- */
  const sa = enter(t, tStudents - 0.4, 0.75, 44, 0.94);
  if (sa.a > 0.004) {
    const sx = 890, sy = 460, sw = 880, shh = 310;
    glass(ctx, sx, sy + sa.dy, sw, shh, 24, { alpha: sa.a });
    ctx.save();
    ctx.globalAlpha *= sa.a;
    ctx.translate(0, sa.dy);
    glow(ctx, sx + sw / 2, sy + 140, 380, P.teal, 0.22);
    drawText(ctx, 'STUDENTS  TAUGHT', sx + 40, sy + 54, { size: 21, family: F.en, weight: 700, color: rgba(P.tealSoft, 0.95), spacing: 4.4 });
    const target = 42000;
    const shown = Math.round(target * E.outExpo(clamp((t - tStudents) / 1.6)));
    const numStr = shown.toLocaleString('en-US');
    const nw = measure(ctx, numStr, { size: 110, weight: 800, family: F.en, spacing: -1 });
    const plusA = clamp((t - tStudents - 1.2) / 0.4);
    const plusW = measure(ctx, '+', { size: 84, weight: 800, family: F.en });
    const startX = sx + sw / 2 - (nw + plusW + 12) / 2;
    drawText(ctx, numStr, startX, sy + 172, {
      size: 110, family: F.en, weight: 800, spacing: -1,
      grad: [[0, P.white], [0.6, P.tealSoft], [1, P.teal]], glow: rgba(P.teal, 0.4), glowBlur: 40,
    });
    drawText(ctx, '+', startX + nw + 6, sy + 166, {
      size: 84, family: F.en, weight: 800, color: P.gold, glow: rgba(P.gold, 0.55), glowBlur: 30,
      alpha: plusA,
    });
    drawText(ctx, 'শিক্ষার্থীকে শেখানোর সুযোগ', sx + sw / 2, sy + 236, {
      size: 34, family: F.bnText, weight: 600, color: rgba('#DDEBFA', 0.95), align: 'center',
    });
    drawText(ctx, 'আলহামদুলিল্লাহ', sx + sw / 2, sy + 276, {
      size: 24, family: F.bnText, weight: 400, color: rgba(P.gold, 0.85), align: 'center',
      alpha: clamp((t - tStudents + 0.2) / 0.6),
    });
    ctx.restore();
    if (shown > 0 && t < tStudents + 1.7) {
      // sparkle while counting
      const k = (t * 1.6) % 1;
      glow(ctx, sx + sw / 2, sy + 140, 200 + k * 160, P.teal, (1 - k) * 0.3);
    }
  }
}

/* ================================================================
   SCENE 10 — SPECIAL OFFER
   ================================================================ */
function sceneOffer(ctx, t, s, e) {
  const tOffer = WT(23, 2);
  const tOld = WT(24, 0), tNew = WT(24, 5);

  // energetic rays
  ctx.save();
  ctx.globalAlpha *= 0.5;
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(960, 430);
  for (let i = 0; i < 26; i++) {
    const a0 = (i / 26) * TAU + t * 0.06;
    ctx.save();
    ctx.rotate(a0);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1400, 0);
    ctx.strokeStyle = rgba(i % 3 === 0 ? P.gold : P.teal, 0.055 + 0.03 * Math.sin(t * 1.4 + i));
    ctx.lineWidth = 46;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  const ca = enter(t, s + 0.05, 0.8, 46, 0.93);
  if (ca.a <= 0.004) return;

  const cw = 1180, chh = 620, cx = 960 - cw / 2, cy = 122;
  glass(ctx, cx, cy + ca.dy, cw, chh, 34, { alpha: ca.a, top: 0.55 });
  ctx.save();
  ctx.globalAlpha *= ca.a;
  ctx.translate(0, ca.dy);
  ctx.strokeStyle = lingrad(ctx, cx, cy, cx + cw, cy + chh, [
    [0, rgba(P.gold, 0.85)], [0.5, rgba(P.teal, 0.45)], [1, rgba(P.gold, 0.85)],
  ]);
  ctx.lineWidth = 2.2;
  roundRect(ctx, cx, cy, cw, chh, 34);
  ctx.stroke();
  glow(ctx, 960, cy + 80, 620, P.gold, 0.1);

  // ribbon
  const rb = pop(t, tOffer - 0.05, 0.65);
  if (rb > 0.01) {
    ctx.save();
    ctx.translate(960, cy + 72);
    ctx.scale(rb, rb);
    const rw = 632, rh = 80;
    roundRect(ctx, -rw / 2, -rh / 2, rw, rh, rh / 2);
    ctx.fillStyle = lingrad(ctx, -rw / 2, 0, rw / 2, 0, [[0, rgba(P.gold, 0.98)], [1, rgba('#E9A93A', 0.98)]]);
    ctx.shadowColor = rgba(P.gold, 0.7);
    ctx.shadowBlur = 36;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    drawText(ctx, '৭ দিনের বিশেষ অফার', 0, 13, {
      size: 36, family: F.bnText, weight: 700, color: '#1E1607', align: 'center',
    });
    ctx.restore();
  }
  drawText(ctx, '7  DAYS  SPECIAL  OFFER', 960, cy + 146, {
    size: 25, family: F.en, weight: 700, color: rgba(P.tealSoft, 0.95), align: 'center', spacing: 6,
    alpha: clamp((t - tOffer - 0.25) / 0.6),
  });
  // divider between the two prices
  const dv = clamp((t - tOld - 0.2) / 0.6);
  if (dv > 0) {
    ctx.save();
    ctx.globalAlpha *= dv * 0.5;
    ctx.strokeStyle = rgba('#FFFFFF', 0.35);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 9]);
    ctx.beginPath();
    ctx.moveTo(960, cy + 232);
    ctx.lineTo(960, cy + 466);
    ctx.stroke();
    ctx.restore();
  }

  // seven-day indicator, lights up with "৭ দিনের"
  for (let i = 0; i < 7; i++) {
    const p = clamp((t - tOffer - i * 0.07) / 0.3);
    const dx = 960 + (i - 3) * 40;
    ctx.save();
    ctx.globalAlpha *= p;
    glow(ctx, dx, cy + 192, 34, P.gold, 0.35 * p);
    ctx.beginPath();
    ctx.arc(dx, cy + 192, 7.5, 0, TAU);
    ctx.fillStyle = lingrad(ctx, 0, cy + 184, 0, cy + 200, [[0, P.goldLight], [1, P.goldDeep]]);
    ctx.fill();
    ctx.restore();
  }

  /* ---- old price ---- */
  const oldA = clamp((t - (s + 0.7)) / 0.55);
  if (oldA > 0) {
    const ox = 700, oy = cy + 366;
    ctx.save();
    ctx.globalAlpha *= oldA;
    drawText(ctx, 'আগের মূল্য', ox, oy - 132, {
      size: 23, family: F.bnText, weight: 400, color: rgba('#8FB0CC', 0.9), align: 'center',
    });
    drawText(ctx, '৳৪৯৯', ox, oy, {
      size: 96, family: F.bnText, weight: 700, color: rgba('#9FC4E8', 0.8), align: 'center',
    });
    const strike = clamp((t - tOld - 0.4) / 0.5);
    if (strike > 0) {
      const w = measure(ctx, '৳৪৯৯', { size: 96, weight: 700, family: F.bnText }) + 24;
      ctx.strokeStyle = rgba('#FFFFFF', 0.78);
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.shadowColor = rgba('#06111F', 0.9);
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.moveTo(ox - w / 2 - 8, oy - 32);
      ctx.lineTo(ox - w / 2 - 8 + (w + 16) * E.out(strike), oy - 32);
      ctx.stroke();
      ctx.shadowColor = 'transparent';
    }
    // thumbnail of the course sits under the old price
    drawText(ctx, 'BASIC TO ADVANCED · MATHEMATICS', ox, oy + 74, {
      size: 19, family: F.en, weight: 600, color: rgba('#8FB0CC', 0.75), align: 'center', spacing: 3,
    });
    ctx.restore();
  }

  /* ---- placeholder so the new-price half is never empty before the reveal ---- */
  const phA = clamp((t - tOld - 0.2) / 0.4) * (1 - clamp((t - tNew + 0.25) / 0.2));
  if (phA > 0.01) {
    const px2 = 1190, py2 = cy + 366;
    ctx.save();
    ctx.globalAlpha *= phA;
    drawText(ctx, 'মাত্র', px2, py2 - 136, {
      size: 34, family: F.bnText, weight: 600, color: rgba(P.tealSoft, 0.55), align: 'center',
    });
    const sk = 1 + 0.012 * Math.sin(t * 4.2);
    ctx.translate(px2, py2 - 26);
    ctx.scale(sk, sk);
    roundRect(ctx, -132, -46, 264, 92, 26);
    ctx.fillStyle = rgba('#FFFFFF', 0.05);
    ctx.fill();
    ctx.strokeStyle = rgba(P.tealSoft, 0.22);
    ctx.lineWidth = 1.6;
    ctx.setLineDash([7, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /* ---- new price ---- */
  const nA = pop(t, tNew - 0.08, 0.75);
  if (nA > 0.01) {
    const nx = 1190, ny = cy + 366;
    ctx.save();
    ctx.translate(nx, ny);
    ctx.scale(nA, nA);
    const flash = clamp((t - tNew) / 0.55);
    glow(ctx, 0, -10, 400, P.gold, 0.5 * (1 - flash * 0.5));
    drawText(ctx, 'মাত্র', 0, -136, {
      size: 34, family: F.bnText, weight: 600, color: rgba(P.tealSoft, 0.95), align: 'center',
    });
    drawText(ctx, '৳৩৯৯', 0, 22, {
      size: 152, family: F.bnText, weight: 700, align: 'center',
      grad: [[0, P.goldLight], [0.45, P.gold], [1, P.goldDeep]],
      glow: rgba(P.gold, 0.6), glowBlur: 60,
    });
    const onlyA = clamp((t - tNew - 0.35) / 0.4);
    if (onlyA > 0.01) {
      const wOnly = measure(ctx, 'ONLY', { size: 27, weight: 800, family: F.en, spacing: 5 });
      const wPrice = measure(ctx, '৳৩৯৯', { size: 34, weight: 700, family: F.bnText });
      const gx = -(wOnly + 14 + wPrice) / 2;
      drawText(ctx, 'ONLY', gx, 86, { size: 27, family: F.en, weight: 800, color: P.white, spacing: 5, alpha: onlyA });
      drawText(ctx, '৳৩৯৯', gx + wOnly + 14, 88, {
        size: 34, family: F.bnText, weight: 700, color: P.white, alpha: onlyA,
      });
    }
    ctx.restore();
    for (let i = 0; i < 16; i++) {
      const k = clamp((t - tNew - i * 0.03) / 0.9);
      if (k <= 0 || k >= 1) continue;
      const ang = rrange(i * 3.1, 0, TAU);
      const rr = lerp(60, 380, E.outExpo(k));
      const x = nx + Math.cos(ang) * rr, y = ny + Math.sin(ang) * rr * 0.62;
      ctx.fillStyle = rgba(i % 2 ? P.gold : P.white, (1 - k) * 0.9);
      ctx.beginPath();
      ctx.arc(x, y, lerp(6, 1.5, k), 0, TAU);
      ctx.fill();
    }
  }

  // saving badge + note
  const sb = pop(t, tNew + 0.45, 0.6);
  if (sb > 0.01) {
    ctx.save();
    ctx.translate(960, cy + chh - 96);
    ctx.scale(sb, sb);
    labelChip(ctx, 'সাশ্রয় ১০০ টাকা', 0, 0, {
      size: 25, font: F.bnText, weight: 600, padX: 30, h: 56, spacing: 0,
      fill: rgba(P.teal, 0.15), stroke: rgba(P.tealSoft, 0.85), color: P.white,
    });
    ctx.restore();
  }
  drawText(ctx, 'সীমিত সময়ের জন্য', 960, cy + chh - 34, {
    size: 21, family: F.bnText, weight: 400, color: rgba('#8FB0CC', 0.8), align: 'center',
    alpha: clamp((t - tOffer - 0.8) / 0.6),
  });
  ctx.restore();
}

/* ================================================================
   SCENE 11 — FINAL CALL TO ACTION + END CARD
   ================================================================ */
function sceneCTA(ctx, t, s, e) {
  const tLink = WT(25, 1), tJoin = WT(25, 6), tBye = WT(25, 9);
  const ctaA = 1 - clamp((t - (tBye + 0.1)) / 0.45);

  /* ---- enroll button ---- */
  const ba = pop(t, s + 0.12, 0.75) * ctaA;
  if (ba > 0.01) {
    const bw = 700, bh = 132;
    ctx.save();
    ctx.translate(960, 296);
    ctx.scale(ba, ba);
    glow(ctx, 0, 0, 430, P.gold, 0.32 + 0.1 * Math.sin(t * 3));
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
    ctx.fillStyle = lingrad(ctx, -bw / 2, 0, bw / 2, 0, [[0, P.gold], [1, '#EFAC33']]);
    ctx.shadowColor = rgba(P.gold, 0.7);
    ctx.shadowBlur = 50;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = rgba('#FFFFFF', 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();
    drawText(ctx, 'ENROLL  NOW', 0, 18, {
      size: 56, family: F.en, weight: 800, color: '#23190A', align: 'center', spacing: 5,
    });
    sheen(ctx, t, -bw / 2, -bh / 2, bw, bh, { p: ((t - s) % 3.2) / 1.1, alpha: 0.9, r: bh / 2 });
    ctx.restore();
  }

  /* ---- link in the comment box ---- */
  const la = enter(t, tLink - 0.15, 0.7, 24, 0.97);
  if (la.a > 0.004 && ctaA > 0.01) {
    const a = la.a * ctaA;
    drawText(ctx, 'লিংক কমেন্ট বক্সে', 960, 452 + la.dy, {
      size: 44, family: F.bnDisp, weight: 700, color: P.white, align: 'center', alpha: a,
    });
    drawText(ctx, 'LINK  IN  THE  COMMENT  BOX', 960, 500 + la.dy, {
      size: 23, family: F.en, weight: 600, color: rgba(P.tealSoft, 0.9), align: 'center', spacing: 5, alpha: a,
    });
    const ap = pop(t, tLink + 0.2, 0.6);
    if (ap > 0.01) {
      const bounce = Math.sin((t - tLink) * 4.2) * 11;
      ctx.save();
      ctx.translate(960, 578 + bounce);
      ctx.scale(ap, ap);
      ctx.globalAlpha *= ctaA;
      glow(ctx, 0, 26, 130, P.gold, 0.4);
      ctx.strokeStyle = P.gold;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(0, 32);
      ctx.moveTo(-23, 7);
      ctx.lineTo(0, 34);
      ctx.lineTo(23, 7);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ---- the comment box the arrow points at ---- */
  const cma = enter(t, tLink + 0.45, 0.6, 22, 0.97).a * ctaA;
  if (cma > 0.004) {
    const cw = 680, ch = 116, cx0 = 960 - cw / 2, cy0 = 648;
    ctx.save();
    ctx.globalAlpha *= cma;
    glass(ctx, cx0, cy0, cw, ch, 26, { top: 0.52, bottom: 0.74, shadowBlur: 26, shadowY: 12 });
    // avatar
    ctx.beginPath();
    ctx.arc(cx0 + 64, cy0 + ch / 2, 31, 0, TAU);
    ctx.fillStyle = lingrad(ctx, cx0 + 33, cy0 + 27, cx0 + 95, cy0 + 89, [[0, P.teal], [1, P.royal]]);
    ctx.fill();
    drawText(ctx, 'MF', cx0 + 64, cy0 + ch / 2 + 8, { size: 20, family: F.en, weight: 800, color: P.white, align: 'center' });
    // comment field
    roundRect(ctx, cx0 + 118, cy0 + ch / 2 - 31, cw - 168, 62, 31);
    ctx.fillStyle = rgba('#FFFFFF', 0.06);
    ctx.fill();
    ctx.strokeStyle = rgba(P.tealSoft, 0.35);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    drawText(ctx, 'এনরোলমেন্টের লিংক', cx0 + 150, cy0 + ch / 2 + 9, {
      size: 25, family: F.bnText, weight: 600, color: P.gold, align: 'left',
    });
    // little send glyph
    ctx.save();
    ctx.translate(cx0 + cw - 64, cy0 + ch / 2);
    ctx.strokeStyle = rgba(P.tealSoft, 0.95);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-13, 10);
    ctx.lineTo(13, -10);
    ctx.moveTo(13, -10);
    ctx.lineTo(2, -11);
    ctx.moveTo(13, -10);
    ctx.lineTo(11, 1);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  /* ---- join today / limited time chips ---- */
  const ja = pop(t, tJoin - 0.3, 0.65) * ctaA;
  if (ja > 0.01) {
    ctx.save();
    ctx.translate(1560, 296);
    ctx.scale(ja, ja);
    ctx.rotate(-0.05);
    roundRect(ctx, -168, -54, 336, 108, 54);
    ctx.fillStyle = rgba(P.teal, 0.2);
    ctx.fill();
    ctx.strokeStyle = rgba(P.tealSoft, 0.9);
    ctx.lineWidth = 2;
    ctx.shadowColor = rgba(P.teal, 0.8);
    ctx.shadowBlur = 30;
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    drawText(ctx, 'আজই জয়েন করো', 0, 8, { size: 30, family: F.bnText, weight: 700, color: P.white, align: 'center' });
    drawText(ctx, 'JOIN TODAY', 0, 40, { size: 17, family: F.en, weight: 700, color: rgba(P.tealSoft, 0.95), align: 'center', spacing: 3.2 });
    ctx.restore();
  }
  const jb = pop(t, tJoin + 0.15, 0.65) * ctaA;
  if (jb > 0.01) {
    ctx.save();
    ctx.translate(390, 296);
    ctx.scale(jb, jb);
    ctx.rotate(0.04);
    labelChip(ctx, 'সীমিত সময়', 0, 0, {
      size: 25, font: F.bnText, weight: 600, padX: 32, h: 70, spacing: 0,
      fill: rgba(P.gold, 0.14), stroke: rgba(P.gold, 0.8), color: P.gold,
    });
    ctx.restore();
  }

  /* ---- trust row ---- */
  const ta = enter(t, s + 0.6, 0.7, 18, 0.98) * ctaA;
  if (ta.a > 0.004) {
    const items = ['রেকর্ডেড ক্লাস', 'নোট', 'সাপোর্ট'];
    const f = { size: 25, family: F.bnText, weight: 600 };
    const gapX = 54;
    const widths = items.map((it) => measure(ctx, it, f) + 44);
    const totalW = widths.reduce((a, b) => a + b, 0) + gapX * (items.length - 1);
    let x = 960 - totalW / 2;
    ctx.save();
    ctx.globalAlpha *= ta.a;
    items.forEach((it, i) => {
      roundRect(ctx, x, 660 + ta.dy, widths[i], 52, 26);
      ctx.fillStyle = rgba('#FFFFFF', 0.05);
      ctx.fill();
      ctx.strokeStyle = rgba('#FFFFFF', 0.16);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 26, 686 + ta.dy, 9, 0, TAU);
      ctx.fillStyle = rgba(P.teal, 0.25);
      ctx.fill();
      check(ctx, x + 26, 687 + ta.dy, 13, { color: P.tealSoft, lw: 2.4 });
      drawText(ctx, it, x + 44, 694 + ta.dy, { ...f, color: '#CFE4F7' });
      x += widths[i] + gapX;
    });
    ctx.restore();
  }

  /* ---- end card ---- */
  const ec = clamp((t - (tBye + 0.12)) / 0.62);
  if (ec > 0) {
    const eA = E.out(ec);
    ctx.save();
    ctx.globalAlpha *= eA;
    ctx.fillStyle = rgba('#03101F', 0.94);
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = radial(ctx, 960, 520, 820, [[0, rgba(P.teal, 0.16)], [1, rgba(P.teal, 0)]]);
    ctx.fillRect(0, 0, W, H);
    const scl = lerp(0.95, 1, eA);
    ctx.translate(960, 500);
    ctx.scale(scl, scl);
    glow(ctx, 0, -196, 460, P.teal, 0.22);
    sigmaMark(ctx, 0, -186, 112, { alpha: 1 });
    drawText(ctx, 'BASIC TO ADVANCED', 0, 16, {
      size: 36, family: F.en, weight: 700, color: '#CFE4F7', align: 'center', spacing: 8,
    });
    drawText(ctx, 'MATHEMATICS  COURSE', 0, 100, {
      size: 76, family: F.en, weight: 800, align: 'center', spacing: 3,
      grad: [[0, P.goldLight], [0.5, P.gold], [1, P.goldDeep]], glow: rgba(P.gold, 0.32), glowBlur: 42,
    });
    drawText(ctx, 'SSC  ·  DAKHIL  ·  CLASS 9–10', 0, 158, {
      size: 24, family: F.en, weight: 600, color: rgba(P.tealSoft, 0.95), align: 'center', spacing: 5,
    });
    ctx.save();
    ctx.globalAlpha *= 0.7;
    const dw = 300 * eA;
    ctx.fillStyle = lingrad(ctx, -dw, 0, dw, 0, [[0, rgba(P.gold, 0)], [0.5, rgba(P.gold, 0.9)], [1, rgba(P.gold, 0)]]);
    ctx.fillRect(-dw, 204, dw * 2, 2);
    ctx.restore();
    drawText(ctx, 'মোহাম্মাদ ফয়সাল', 0, 274, { size: 38, family: F.bnDisp, weight: 700, color: P.white, align: 'center' });
    drawText(ctx, 'আল্লাহ হাফেজ', 0, 336, { size: 27, family: F.bnText, weight: 500, color: rgba('#9FC4E8', 0.85), align: 'center' });
    ctx.restore();
    sheen(ctx, t, 260, 240, 1400, 460, { p: clamp((t - tBye - 0.5) / 1.1), alpha: 0.4 });
  }
}

/* scene registry — start/end come from the narration timeline */
const SCENES = [
  { id: 'intro', from: 1, to: 2, draw: sceneIntro },
  { id: 'identity', from: 3, to: 4, draw: sceneIdentity },
  { id: 'progress', from: 5, to: 7, draw: sceneProgress },
  { id: 'geometry', from: 8, to: 8, draw: sceneGeometry },
  { id: 'content', from: 9, to: 12, draw: sceneContent },
  { id: 'goal', from: 13, to: 15, draw: sceneGoal },
  { id: 'live', from: 16, to: 17, draw: sceneLive },
  { id: 'support', from: 18, to: 19, draw: sceneSupport },
  { id: 'teacher', from: 20, to: 22, draw: sceneTeacher },
  { id: 'offer', from: 23, to: 24, draw: sceneOffer },
  { id: 'cta', from: 25, to: 25, draw: sceneCTA },
];

function sceneBounds() {
  const out = [];
  for (let i = 0; i < SCENES.length; i++) {
    const sc = SCENES[i];
    const s = CUE(sc.from).start - (sc.from === 1 ? 0.15 : 0.28);
    let e = i === SCENES.length - 1 ? TL.duration : CUE(sc.to).end - 0.28;
    out.push({ ...sc, s: Math.max(0, s), e });
  }
  return out;
}
