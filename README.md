# Two's Complement — a Remotion motion-graphics film

An 83-second, 1920×1080 motion-graphics explainer on **two's complement**, the way
computers store negative numbers. Everything on screen is drawn in code with
Remotion (React → frames → H.264); there is no stock footage, no screen capture
and no bitmap artwork apart from a procedurally generated film-grain texture.

**Final film:** `out/Two-Complement-1080p.mp4` — 1920×1080, 30 fps, 83 s, H.264 + AAC.

## The film

| # | Chapter | What happens on screen |
| - | ------- | ---------------------- |
| 00 | Title | Kinetic type over a field of drifting binary; a `0101 → 1011` teaser strip |
| 01 | The sign bit | A 4-bit register; the MSB lifts out, gets bracketed, and two rule cards explain `0 → positive`, `1 → negative` |
| 02 | A positive number | `+5 = 0101` with place values, per-bit contributions, `4 + 1 = 5` |
| 03 | Step 1 — flip every bit | Every tile rotates 180° in 3D, `0101 → 1010`, the one's complement |
| 04 | Step 2 — add one | `1010 + 1` in column form; the LSB flips `0 → 1` with an amber pulse, result `1011 = −5` |
| 05 | Why it works | `0101 + 1011` with a carry rippling right-to-left; the 5th bit is produced, then discarded; `a + (−a) = 0` |
| 06 | The range of four bits | A 16-value wheel from `−8` to `+7`, with zero taking a slot |
| 07 | Recap | Three cards — flip, add one, read as negative — then the end lockup |

Captions are burned in and timed from the measured narration, with a word-by-word
reveal. Scene cuts carry a light sweep, and the whole piece mixes a synthesised
ambient score, UI sound effects and narration with side-chain ducking.

## Build

Requirements: Node.js 22+ and Python 3.10+ (standard library only for audio).

```bash
npm install
npm run setup        # provisions the headless Chromium used by Remotion
npm run audio        # synthesises score + SFX and mixes public/audio/master.wav
npm run render       # renders out/Two-Complement-1080p.mp4
```

`npm run build` runs setup → audio → render. `npm run stills -- --times=3,12,25`
writes reference frames to `out/stills/`, and `npm run typecheck` type-checks the
whole composition.

### Why the custom browser provisioning?

Remotion normally downloads Chrome Headless Shell from `remotion.media`. In this
sandbox that host is unreachable, so `scripts/prepare-browser.mjs` unpacks the
Chromium build that ships on npm (`@sparticuz/chromium`) plus its shared
libraries, and every script launches Remotion against that binary with
`LD_LIBRARY_PATH` pointed at the extracted libraries.

## Timing model

The edit is audio-first. Each scene declares a `minSeconds` floor in
`data/script.json`; the real duration is `max(minSeconds, 0.45 + narration + 0.7)`.
`src/film/timeline.ts` and `scripts/build_audio.py` implement exactly the same
rule, so the picture and the mix stay in sync. Caption cues are distributed over
the spoken window by character weight, which keeps each line on screen for about
as long as it takes to say it.

## Project map

| Path | Purpose |
| --- | --- |
| `src/index.ts` | Remotion entry point |
| `src/Root.tsx` | Composition registration (1920×1080, 30 fps) |
| `src/film/Film.tsx` | Scene sequencing, audio track, caption layer, end fade |
| `src/film/timeline.ts` | Scene durations, caption cues, cut list |
| `src/film/theme.ts` | Palette, tone system, typography constants |
| `src/film/ui.tsx` | 3D bit tiles, kickers, masked headlines, chips, brackets |
| `src/film/Background.tsx` | Grid, ambient light, binary rain, vignette, grain |
| `src/film/scenes/*.tsx` | The eight scenes |
| `data/script.json` | Narration script, captions, scene floors |
| `data/narration.json` | Measured narration durations and clip paths |
| `data/sfx_schedule.json` | Every sound event with its timestamp (written by the build) |
| `scripts/build_audio.py` | Score synthesis, SFX, narration placement, ducking, master WAV |
| `scripts/prepare-browser.mjs` | Chromium provisioning for offline rendering |
| `scripts/render.mjs` | Bundles the composition and encodes the MP4 |
| `scripts/make-grain.mjs` | Generates the tileable grain texture |
| `public/fonts/` | Poppins (bundled, loaded through `@font-face`) |

## Sound

`scripts/build_audio.py` writes the whole soundtrack from oscillators and noise:
a four-chord pad (Am9 · Fmaj7 · Cmaj7 · G6 at 80 BPM), a soft sub pulse, shaker,
arpeggio, and short UI effects (whoosh, click, blip, impact, riser, wheel ticks).
The score is ducked under the voice by an envelope derived from the narration
track itself, then the master is peak-normalised to −1 dBFS.
