/* ============================================================
   audio.js — procedural score + sound design.
   Renders a complete 48 kHz stereo bed (music + all SFX) with
   the Web Audio API inside an OfflineAudioContext, then hands
   the PCM to the renderer as a WAV file.
   ============================================================ */

const SR = 48000;

function buildBed(TL, bounds, duration) {
  const ctx = new OfflineAudioContext(2, Math.round(SR * duration), SR);
  const R = (a, b) => a + Math.random() * (b - a);
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------------- buses ---------------- */
  const master = ctx.createGain();
  master.gain.value = 0.82;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 6;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.16;
  master.connect(limiter).connect(ctx.destination);

  const music = ctx.createGain();
  music.gain.value = 0.62;
  const sfx = ctx.createGain();
  sfx.gain.value = 0.95;

  // shared reverb
  const verb = ctx.createConvolver();
  const irLen = Math.round(SR * 2.8);
  const ir = ctx.createBuffer(2, irLen, SR);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < irLen; i++) {
      const t = i / SR;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t / 2.8, 2.6) * (1 - Math.exp(-t * 60));
    }
  }
  verb.buffer = ir;
  const verbSend = ctx.createGain();
  verbSend.gain.value = 0.5;
  verbSend.connect(verb);
  const verbOut = ctx.createGain();
  verbOut.gain.value = 0.5;
  verb.connect(verbOut).connect(master);

  music.connect(master);
  music.connect(verbSend);
  sfx.connect(master);
  const sfxVerb = ctx.createGain();
  sfxVerb.gain.value = 0.22;
  sfx.connect(sfxVerb).connect(verbSend);

  /* delay for the plucks */
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.3125;      // dotted 8th @96bpm
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const delayLp = ctx.createBiquadFilter();
  delayLp.type = 'lowpass';
  delayLp.frequency.value = 2600;
  const delayOut = ctx.createGain();
  delayOut.gain.value = 0.35;
  delay.connect(delayLp).connect(fb).connect(delay);
  delayLp.connect(delayOut).connect(music);

  /* ---------------- helpers ---------------- */
  function noiseBuffer(sec) {
    const b = ctx.createBuffer(1, Math.round(SR * sec), SR);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  const noise = noiseBuffer(3.2);

  function env(g, t0, a, d, peak, sus, rel, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    if (sus !== undefined) g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0002), t0 + a + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + rel);
  }

  /* pad: three detuned saws through a slow filter */
  function pad(freq, t0, dur, gain = 0.1) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(700, t0);
    lp.frequency.linearRampToValueAtTime(1500 + R(-200, 400), t0 + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(900, t0 + dur + 0.9);
    lp.Q.value = 0.6;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.55);
    g.gain.linearRampToValueAtTime(gain * 0.92, t0 + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.85);
    lp.connect(g).connect(music);
    for (const det of [-6, 0, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = det;
      o.connect(lp);
      o.start(t0);
      o.stop(t0 + dur + 1.0);
    }
    // sub octave sine keeps it warm
    const s = ctx.createOscillator();
    s.type = 'sine';
    s.frequency.value = freq / 2;
    const sg = ctx.createGain();
    sg.gain.value = 0.5;
    s.connect(sg).connect(g);
    s.start(t0);
    s.stop(t0 + dur + 1.0);
  }

  /* pluck / marimba-ish — the "corporate" sparkle */
  function pluck(midi, t0, gain = 0.12, decay = 0.5) {
    const f = mtof(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 2.2;
    bp.Q.value = 0.9;
    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    o1.connect(g);
    o2.connect(g2).connect(g);
    g.connect(bp).connect(music);
    g.connect(delay);
    o1.start(t0); o1.stop(t0 + decay + 0.05);
    o2.start(t0); o2.stop(t0 + decay + 0.05);
  }

  function sub(t0, dur, midi = 41, gain = 0.2) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(mtof(midi) * 1.01, t0);
    o.frequency.exponentialRampToValueAtTime(mtof(midi), t0 + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(music);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function kick(t0, gain = 0.32) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t0);
    o.frequency.exponentialRampToValueAtTime(46, t0 + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.30);
    o.connect(g).connect(music);
    o.start(t0); o.stop(t0 + 0.35);
  }

  function shaker(t0, gain = 0.055) {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    s.playbackRate.value = 1.4;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    s.connect(hp).connect(g).connect(music);
    s.start(t0, R(0, 2), 0.09);
  }

  function clap(t0, gain = 0.09) {
    for (let i = 0; i < 3; i++) {
      const s = ctx.createBufferSource();
      s.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1500 + i * 220;
      bp.Q.value = 1.1;
      const g = ctx.createGain();
      const tt = t0 + i * 0.012;
      g.gain.setValueAtTime(gain * (1 - i * 0.22), tt);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.10);
      s.connect(bp).connect(g).connect(music);
      s.start(tt, R(0, 2), 0.12);
    }
  }

  /* ---------------- sound design ---------------- */
  function whoosh(t0, dur = 0.55, gain = 0.30, up = false) {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.5;
    const f0 = up ? 260 : 2600, f1 = up ? 3400 : 220;
    bp.frequency.setValueAtTime(f0, t0);
    bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(-0.7, t0);
    pan.pan.linearRampToValueAtTime(0.7, t0 + dur);
    s.connect(bp).connect(g).connect(pan).connect(sfx);
    s.start(t0, R(0, 0.5), dur + 0.05);
  }

  function riser(t0, dur = 1.1, gain = 0.11) {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2.2;
    bp.frequency.setValueAtTime(320, t0);
    bp.frequency.exponentialRampToValueAtTime(6200, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.92);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.06);
    s.connect(bp).connect(g).connect(sfx);
    s.start(t0, R(0, 0.5), dur + 0.1);
    // pitched riser on top
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t0);
    o.frequency.exponentialRampToValueAtTime(900, t0 + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(gain * 0.25, t0 + dur * 0.95);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.05);
    o.connect(lp).connect(og).connect(sfx);
    o.start(t0); o.stop(t0 + dur + 0.08);
  }

  function boom(t0, gain = 0.26) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(72, t0);
    o.frequency.exponentialRampToValueAtTime(34, t0 + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    o.connect(g).connect(sfx);
    o.start(t0); o.stop(t0 + 0.95);
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t0);
    lp.frequency.exponentialRampToValueAtTime(160, t0 + 0.4);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(gain * 0.5, t0);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    s.connect(lp).connect(g2).connect(sfx);
    s.start(t0, R(0, 2), 0.5);
  }

  function tick(t0, freq = 2400, gain = 0.05) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
    o.connect(g).connect(sfx);
    o.start(t0); o.stop(t0 + 0.06);
  }

  function blip(t0, freq = 1320, gain = 0.10) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.exponentialRampToValueAtTime(freq * 1.5, t0 + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    o.connect(g).connect(sfx);
    g.connect(verbSend);
    o.start(t0); o.stop(t0 + 0.25);
  }

  function chime(t0, gain = 0.16) {
    const root = mtof(84);
    [1, 2.0, 2.76, 4.07].forEach((mult, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = root * mult * (1 + R(-0.001, 0.001));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0 + i * 0.012);
      g.gain.exponentialRampToValueAtTime(gain / (1 + i * 1.3), t0 + i * 0.012 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.012 + 1.8 - i * 0.22);
      o.connect(g).connect(sfx);
      g.connect(verbSend);
      o.start(t0); o.stop(t0 + 2.0);
    });
    // shimmer
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * 0.42, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    s.connect(hp).connect(g).connect(sfx);
    g.connect(verbSend);
    s.start(t0, R(0, 1), 1.0);
  }

  function textPop(t0, gain = 0.032) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(760, t0);
    o.frequency.exponentialRampToValueAtTime(1180, t0 + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    o.connect(g).connect(sfx);
    o.start(t0); o.stop(t0 + 0.08);
  }

  /* =================  MUSIC  ================= */
  const beat = 60 / 96;             // 0.625 s
  const bar = beat * 4;             // 2.5 s
  const chords = [
    [53, 57, 60, 64, 67],   // Fmaj9     (F A C E G)
    [50, 53, 57, 60, 64],   // Dm9       (D F A C E)
    [46, 50, 53, 57, 60],   // Bbmaj7    (Bb D F A C)
    [48, 52, 55, 59, 62],   // Cadd9     (C E G B D)
  ];
  const arpSteps = [0, 2, 1, 3, 4, 2, 3, 1];
  const totalBars = Math.ceil(duration / bar);

  // energy curve: intro is light, builds around the offer, resolves at the end
  const lift = (t) => {
    if (t < 5) return 0.35;
    if (t < 11.5) return 0.55;
    if (t < 23.6) return 0.7;
    if (t < 43.4) return 0.78;
    if (t < 66.7) return 0.86;
    if (t < 72.7) return 1.0;
    if (t < 78.8) return 0.95;
    return 0.7;
  };

  for (let b = 0; b < totalBars; b++) {
    const t0 = b * bar;
    if (t0 > duration - 0.2) break;
    const ch = chords[b % 4];
    const lv = lift(t0);
    // pad
    pad(mtof(ch[0] + 12), t0, bar * 0.96, 0.075 * lv);
    // bass on 1 and 3.5
    sub(t0 + 0.02, 0.55, ch[0] - 12, 0.22 * lv);
    sub(t0 + beat * 2.5, 0.45, ch[0] - 12, 0.15 * lv);
    if (t0 > 12 && t0 < 76) sub(t0 + beat * 3.5, 0.28, ch[0] - 12, 0.1 * lv);
    // pluck arpeggio (8ths) — enters after the intro
    if (t0 >= 5) {
      for (let s2 = 0; s2 < 8; s2++) {
        const step = arpSteps[s2];
        const midi = ch[1 + (step % 3)] + 12 + (step === 4 ? 12 : 0);
        const g = (s2 % 2 === 0 ? 0.095 : 0.06) * lv;
        pluck(midi, t0 + s2 * (beat / 2) + R(-0.004, 0.004), g, 0.42);
      }
    }
    // percussion
    if (t0 > 11.5) {
      kick(t0, 0.28 * lv);
      kick(t0 + beat * 2, 0.2 * lv);
    }
    if (t0 > 5) {
      for (let s2 = 0; s2 < 8; s2++) shaker(t0 + s2 * (beat / 2), (s2 % 2 ? 0.028 : 0.05) * lv);
    }
    if (t0 > 23.6 && t0 < 78) clap(t0 + beat * 2, 0.055 * lv);
    // soft bell accent at each chord change after the mid point
    if (t0 > 33 && b % 2 === 0) pluck(ch[3] + 24, t0 + beat * 3.5, 0.05 * lv, 0.9);
  }

  // final resolve chord (end card)
  const endT = Math.min(duration - 3.4, TL.cues[TL.cues.length - 1].end + 0.35);
  pad(mtof(41), endT, 2.9, 0.1);
  pad(mtof(53), endT, 2.9, 0.085);
  pad(mtof(60), endT, 2.9, 0.07);
  pad(mtof(65), endT, 2.9, 0.06);
  for (let i = 0; i < 6; i++) pluck([77, 81, 84, 88, 84, 89][i], endT + i * 0.14, 0.06, 1.2);
  chime(endT + 0.02, 0.1);
  boom(endT, 0.16);

  /* =================  SFX  ================= */
  // scene transitions
  for (let i = 1; i < bounds.length; i++) {
    const b = bounds[i].s;
    if (b > duration - 1.2) continue;
    riser(b - 1.05, 1.05, 0.085);
    whoosh(b - 0.16, 0.6, 0.20);
    boom(b + 0.02, 0.15);
  }

  // subtitle phrase pops (quiet, so they only "tick" the typography)
  for (const c of TL.cues) {
    for (const ch of c.chunks) textPop(ch.start + 0.01, 0.028);
  }

  // 100+ enrolment counter
  const c5 = TL.cues[4];
  const tCount = c5.words[2].start;
  for (let i = 0; i < 10; i++) tick(tCount + i * 0.105, 1900 + i * 60, 0.035);
  blip(tCount + 1.15, 1560, 0.09);

  // ten completed classes
  const c6 = TL.cues[5];
  for (let i = 0; i < 10; i++) tick(c6.words[0].start + i * 0.105, 2200, 0.03);
  blip(c6.words[3].start, 1760, 0.075);

  // chapter cards
  const c7 = TL.cues[6];
  for (let i = 0; i < 17; i++) tick(c7.words[1].start - 0.2 + i * 0.035, 1500 + i * 28, 0.02);
  for (let i = 0; i < 4; i++) blip(c7.words[4].start + i * 0.16, 1180 + i * 120, 0.07);

  // geometry drawing
  const c8 = TL.cues[7];
  whoosh(c8.words[2].start - 0.05, 0.5, 0.12, true);
  tick(c8.words[4].start, 1400, 0.05);
  boom(c8.words[4].start + 0.05, 0.1);

  // book open + A→Z
  const c10 = TL.cues[9];
  whoosh(c10.start - 0.1, 0.7, 0.16);
  blip(c10.start + 0.25, 980, 0.08);

  // notes / quiz
  const c11 = TL.cues[10], c12 = TL.cues[11];
  tick(c11.words[1].start, 2100, 0.045);
  for (let i = 0; i < 3; i++) tick(c11.words[1].start + 0.3 + i * 0.22, 2350, 0.028);
  tick(c12.words[0].start, 2000, 0.04);
  blip(c12.words[1].start + 0.3, 1480, 0.07);

  // practice / goal
  const c14 = TL.cues[13], c15 = TL.cues[14];
  for (let i = 0; i < 4; i++) tick(TL.cues[12].start + 0.4 + i * 0.3, 1700, 0.026);
  boom(c14.words[2].start - 0.05, 0.13);
  chime(c14.words[2].start + 0.02, 0.09);
  for (let i = 0; i < 8; i++) tick(c14.words[4].start + i * 0.12, 1900 + i * 90, 0.03);
  blip(c15.words[0].start, 2100, 0.08);

  // live class
  const c16 = TL.cues[15], c17 = TL.cues[16];
  blip(c16.words[5].start, 1320, 0.09);
  for (let i = 0; i < 3; i++) blip(c17.words[2].start + 0.5 + i * 0.26, 1250 + i * 180, 0.08);
  tick(c17.words[6].start, 1600, 0.05);

  // recordings + support
  const c18 = TL.cues[17], c19 = TL.cues[18];
  tick(c18.words[0].start, 1900, 0.04);
  blip(c18.words[4].start + 0.2, 1420, 0.07);
  blip(c19.words[6].start + 0.3, 1180, 0.08);
  blip(c19.words[7].start + 0.2, 1560, 0.06);

  // teacher
  const c20 = TL.cues[19], c21 = TL.cues[20], c22 = TL.cues[21];
  blip(c20.words[2].start, 1100, 0.08);
  boom(c21.words[1].start - 0.04, 0.12);
  chime(c21.words[1].start + 0.02, 0.07);
  for (let i = 0; i < 9; i++) tick(c21.words[1].start + 0.1 + i * 0.06, 2300, 0.022);
  for (let i = 0; i < 12; i++) tick(c22.words[1].start + i * 0.13, 1500 + i * 40, 0.024);
  boom(c22.words[1].start - 0.05, 0.14);

  // offer
  const c23 = TL.cues[22], c24 = TL.cues[23];
  riser(c23.words[2].start - 0.9, 0.9, 0.1);
  boom(c23.words[2].start - 0.02, 0.2);
  for (let i = 0; i < 7; i++) tick(c23.words[2].start + i * 0.07, 2400 + i * 80, 0.035);
  whoosh(c24.words[0].start - 0.1, 0.5, 0.16);
  // strike through
  const strike = (() => {
    const s = ctx.createBufferSource();
    return c24.words[0].start + 0.42;
  })();
  {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(320, strike);
    o.frequency.exponentialRampToValueAtTime(90, strike + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16, strike);
    g.gain.exponentialRampToValueAtTime(0.0001, strike + 0.24);
    o.connect(g).connect(sfx);
    o.start(strike); o.stop(strike + 0.26);
  }
  // price reveal — the premium accent
  const reveal = c24.words[5].start;
  riser(reveal - 0.55, 0.55, 0.08);
  chime(reveal, 0.22);
  boom(reveal, 0.24);
  blip(reveal + 0.1, 1980, 0.1);

  // final call to action
  const c25 = TL.cues[24];
  boom(c25.start - 0.1, 0.2);
  chime(c25.start + 0.05, 0.1);
  blip(c25.words[1].start, 1320, 0.09);
  blip(c25.words[6].start + 0.2, 1760, 0.08);

  return ctx.startRendering();
}

function bufferToWavBase64(buf) {
  const numCh = buf.numberOfChannels;
  const len = buf.length;
  const bytes = 44 + len * numCh * 2;
  const ab = new ArrayBuffer(bytes);
  const view = new DataView(ab);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF');
  view.setUint32(4, bytes - 8, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, SR, true);
  view.setUint32(28, SR * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, len * numCh * 2, true);
  // interleave with a gentle soft clip
  const chans = [];
  for (let c = 0; c < numCh; c++) chans.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      let v = chans[c][i];
      v = Math.tanh(v * 1.15) * 0.94;
      view.setInt16(o, Math.max(-32768, Math.min(32767, v * 32767)), true);
      o += 2;
    }
  }
  const u8 = new Uint8Array(ab);
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) {
    bin += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
  }
  return btoa(bin);
}

window.renderBed = async function (chunkIndex) {
  const TL = window.TL;
  const bounds = window.SCENE_BOUNDS || [];
  const buf = await buildBed(TL, bounds, TL.duration);
  return { b64: bufferToWavBase64(buf), sr: SR, dur: buf.duration };
};
