# How the Python Interpreter Works — বাংলা অ্যানিমেশন

A polished, approximately **103-second** educational motion-graphics film explaining what happens between a Python source file and its result. The narration and burned-in karaoke-style subtitles are in Bangla; the active word is highlighted as it is spoken.

**Final video:** `out/Python-Interpreter-Works-Bangla-1080p.mp4`

**Picture:** 1920×1080 · 24 fps · H.264 · 16:9

**Sound:** Bangla narration plus short, event-triggered sound effects only — **no music or ambient bed**.

## The film

Ten scenes follow one example through the interpreter pipeline:

1. Source code enters CPython
2. Lexical analysis and tokenization
3. Parsing into an abstract syntax tree (AST)
4. Compilation to a code object and bytecode, with an optional `.pyc` cache
5. CPython's evaluation loop and value stack
6. Function call frames and the call stack
7. Names, objects, reference counting, and cyclic garbage collection
8. Exceptions and tracebacks
9. CPython and PyPy as different Python implementations
10. A visual recap from source to execution result

Scene cuts use distinct wipes, branching-line reveals, scans, an iris, stacked panels, glitch bands, split-screen motion, and a resolving ring. Scene entrances and selected visual beats have restrained, original UI-style sound cues.

## Word-highlight timing

`audio/python-interpreter-bn.wav` is the master narration. `scripts/build_timeline.py` measures its voiced and silent spans, snaps paragraph/scene boundaries to nearby breaths, and distributes each word over the measured speech windows using Bengali syllable weights. This keeps the highlight moving with the narration and lets it hold during breaths. The resulting word timings and subtitle chunks are in `data/timeline.json`; a plain phrase-level SRT is also written to `data/subtitles-bn.srt`.

## Sound policy

`scripts/build_audio.py` creates short, one-shot transition and animation sounds, then mixes them under the narration. There is no continuous score, room tone, or ambience. The schedule is saved in `data/sfx_schedule.json` (`music: false`, `ambience: false`) so the mix is auditable and reproducible.

## Rebuild

Requirements: Node.js 22+, Python 3.10+, and the bundled local fonts in `assets/fonts/`.

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm ci
npm run build
```

Or run `make`. The build regenerates the voice-derived timeline, inline font/runtime files, narration-plus-SFX master, silent animation, and final MP4. `npm run stills` renders representative frames; `npm test` validates the timeline, sound schedule, and source syntax.

## Project map

| Path | Purpose |
| --- | --- |
| `data/narration_bn.txt` | Bangla narration script, one scene per line |
| `audio/python-interpreter-bn.wav` | Synthesized Bangla voice-over |
| `data/project.json` | Scene titles, transition styles, and SFX beats |
| `data/timeline.json` | Voice activity, scene bounds, chunks, and per-word start/end times |
| `data/subtitles-bn.srt` | Phrase-level subtitle sidecar |
| `scripts/build_timeline.py` | Voice activity analysis and word-highlight timeline generation |
| `scripts/build_audio.py` | Discrete original SFX plus narration; intentionally no music |
| `scripts/prepare.mjs` | Inlines bundled typefaces and runtime data for local Chromium rendering |
| `src/lib.js` | Typography, color, panels, code-window, and canvas primitives |
| `src/scenes.js` | Ten deterministic explainer scenes |
| `src/sub.js` | Burned-in Bangla subtitles with an active-word highlight |
| `src/main.js` | Frame-accurate compositor and scene transitions |
| `render.mjs` | Chromium frame renderer and H.264 silent-video encoder |
| `scripts/mux.mjs` | Final H.264/AAC mux |

The graphics are generated procedurally from canvas paths and bundled local fonts; no remote images, stock footage, or external media are needed.
