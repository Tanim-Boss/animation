# Basic to Advanced Mathematics — Course Promo (Bengali, 1080p)

A 81-second cinematic motion-graphics advertisement for an online **Basic to Advanced
Mathematics course for SSC & Dakhil students**, fully synchronised to the supplied
Bengali narration.

**Deliverable:** `out/Basic-to-Advanced-Mathematics-Course-Promo-BN-1080p.mp4`
— 1920×1080, 16:9, 30 fps, H.264 High@4.1 + AAC 192 kbps, ~81 s.

---

## What is in the box

| Path | Purpose |
| --- | --- |
| `math_course_update_bn.srt` | supplied narration script (source of truth) |
| `Generated Audio … .wav` | supplied AI male voice-over (master clock, 79.2 s) |
| `math_course_update_bn.synced.srt` | the same script with cue times measured from the voice-over |
| `data/translit_bn.txt` | romanised reading of the script, word for word (used only for alignment) |
| `scripts/align_words.py` | forced alignment of the narration → `data/alignment.json` (start/end of every spoken word) |
| `scripts/build_timeline.py` | alignment + script → cues, words, subtitle phrases → `data/timeline.json` |
| `scripts/prepare.mjs` | inlines the fonts (`src/fonts.css`) and the timeline for the page |
| `src/lib.js` | drawing primitives: easing, glass cards, glows, wireframes, particles, grading |
| `src/scenes.js` | the 11 scenes, every beat anchored to a spoken word |
| `src/sub.js` | word-by-word kinetic Bengali subtitles |
| `src/main.js` | compositor (`paint(t)`), crossfades, transition FX, font pre-loading |
| `src/audio.js` | procedural score + sound design (Web Audio, offline render) |
| `render.mjs` | headless Chromium frame renderer → PNG pipe → x264 |
| `scripts/mix_audio.sh` | narration + score with side-chain ducking → `-15.9 LUFS` master |
| `scripts/mux.sh` | final mux |
| `Makefile` | `make` runs the whole pipeline |

## The pipeline

```
SRT + voice-over WAV
        │
        ├─ align_words.py      forced alignment → data/alignment.json (per-word times)
        ├─ build_timeline.py   cues, words and subtitle phrases on the measured times
        ▼
   data/timeline.json ── prepare.mjs ──► src/data/timeline.js + src/fonts.css
        │
        ├─ audio.js (OfflineAudioContext) ──► data/bed.wav  (music + all SFX)
        │                                     │
        │                                     ├─ mix_audio.sh ──► out/audio_master.wav
        ▼                                     │
   render.mjs ── Chromium --screenshot ──► out/video_silent.mp4 ── mux.sh ──► final MP4
```

Nothing is drawn from a fixed video timeline: `paint(t)` is a pure function of time,
so any frame can be re-rendered in isolation — the result is frame-accurate and
free of flicker or first-frame font substitution (all faces are pre-loaded and warmed
up before frame 0).

## Timing model

Word timings are **measured from the voice-over**, not estimated
(`scripts/align_words.py`, result committed in `data/alignment.json`):

1. A 10 ms energy envelope of the narration finds every real pause (≥ 160 ms of
   silence). They cut the 79 s read into 35 speech islands; the short stop
   closures inside words ("আপডেট", "চারটি") are shorter than that and never cut.
2. Whisper *small* (CTranslate2) is force-aligned to the script with stable-ts.
   The model cannot write Bengali script reliably but follows romanised Bengali
   well, so each Bengali word is paired 1:1 with a romanised reading
   (`data/translit_bn.txt`, digits spelled as they are spoken: ১০০+ → "eksho plus").
3. A global pass (median of 5 runs) decides which words belong to which island;
   each island is then aligned again on its own (median of 3 runs).
4. Every word edge next to a pause is taken from the waveform itself: a word
   ends where the voice stops, the next one starts where it comes back.

The subtitle highlight, the scene beats (`WT(cue, word)` in `src/scenes.js`) and
the sound effects all read these times, so they move together. `make align`
re-runs the measurement (needs `pip install faster-whisper stable-ts` and
`scripts/fetch_align_model.sh`, ~250 MB, cached in `.cache/`); plain `make`
only needs the committed `data/alignment.json`.

## Scenes (auto-derived from the narration)

| # | Scene | Narration cues |
| --- | --- | --- |
| 01 | Greeting, brand mark, presenter name reveal | 1–2 |
| 02 | SSC · Dakhil, “Basic to Advanced Mathematics Course” | 3–4 |
| 03 | 100+ enrolled, 10 classes, 4 of 17 chapters | 5–7 |
| 04 | Chapter 10 — Distance & Height (geometry build) | 8 |
| 05 | Whole book A→Z, notes, quiz, assignments | 9–12 |
| 06 | Practice → Target A+ / 90+ marks | 13–15 |
| 07 | Private Facebook live class, 3 days, 1–1.5 h | 16–17 |
| 08 | Recordings, notes, student support | 18–19 |
| 09 | Taught by Mohammad Faisal — 9 years, 42,000+ | 20–22 |
| 10 | 7-day offer, ৳499 → ৳399 | 23–24 |
| 11 | Enroll now, link in comments, end card | 25 |

Goals are presented as academic targets (“লক্ষ্য নির্ধারিত · ফলাফল পরীক্ষার উপর
নির্ভরশীল”), never as guaranteed exam results.

## Sound design

Everything you hear under the voice was synthesised for this edit in
`src/audio.js` (no stock assets):

* 96 BPM bed in F major — detuned pads, sub bass, plucked arpeggio with dotted-8th
  delay, kick/shaker/clap, energy lift curve across the scenes and a resolving
  chord under the end card.
* Sound effects: risers and whooshes into every cut, low impacts on scene starts,
  UI ticks for the counters/chapter grid/calendar, notification blips for the
  numbers, a chime + boom for the ৳399 reveal and a soft “pop” on every subtitle
  phrase.
* The narration is ducked by a side-chain compressor so the score never fights it.

## Re-rendering

```bash
python3 -m venv .venv && .venv/bin/pip install pillow numpy imageio-ffmpeg fonttools brotli
npm install                      # @sparticuz/chromium, puppeteer-core, expo-google-fonts
make                            # timeline → assets → score → frames → mix → mux
make stills                     # quick contact sheet in out/stills
```

Chromium's headless shell needs two extra shared libraries on this image; the
renderer extracts them automatically from the `@sparticuz/chromium` package.

## Design system

Deep navy `#071B35` · royal blue `#123B70` · teal `#16C6B7` · white `#FFFFFF` ·
gold `#F5C451`. Bengali: **Noto Sans Bengali** (UI/subtitles), **Hind Siliguri**,
**Baloo Da 2** (display). Latin/figures: **Poppins**.
