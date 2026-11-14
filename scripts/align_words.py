#!/usr/bin/env python3
"""
Forced alignment of the narration: finds the real start/end of every spoken
word in the voice-over and writes data/alignment.json.

How
---
1. The Bengali script (SRT) is paired 1:1 with a romanised reading
   (data/translit_bn.txt, one line per cue, same number of words). Whisper
   "small" cannot write Bengali script reliably, but it follows romanised
   Bengali very confidently, so the romanised words are what we force-align.
2. stable-ts drives the model's cross-attention (DTW) alignment over the whole
   read (median of several runs) to decide which words sit between which pauses.
3. Real pauses (>= 160 ms of silence in a 10 ms energy envelope) cut the read
   into speech islands; every island is aligned again on its own, and word
   edges next to a pause are taken from the waveform itself.

The result is committed, so the render pipeline does not need the model.
Run:  scripts/fetch_align_model.sh && .venv/bin/python scripts/align_words.py
"""
import json
import os
import statistics
import subprocess
import sys
import tempfile
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_timeline import ROOT, SRT, WAV, parse_srt  # noqa: E402

MODEL = os.path.join(ROOT, ".cache", "whisper-small-ct2")
TRANSLIT = os.path.join(ROOT, "data", "translit_bn.txt")
OUT = os.path.join(ROOT, "data", "alignment.json")
SR = 16000
PAUSE = 0.16          # seconds of silence that count as a real pause


def load_16k():
    import imageio_ffmpeg
    tmp = os.path.join(tempfile.mkdtemp(), "vo16.wav")
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-i", WAV,
                    "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", tmp], check=True)
    w = wave.open(tmp)
    return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0


def envelope(a, hop=0.01, win=0.03, k=2):
    hopN, winN = int(hop * SR), int(win * SR)
    n = (len(a) - winN) // hopN
    env = np.array([np.sqrt(np.mean(a[i * hopN:i * hopN + winN] ** 2)) for i in range(n)])
    ker = np.ones(2 * k + 1) / (2 * k + 1)
    return np.convolve(env, ker, mode="same"), hop


def silences(env, hop, min_len=0.07):
    thr = max(0.012, float(np.percentile(env, 90)) * 0.05)
    quiet = env < thr
    runs, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if (j - i) * hop >= min_len:
                # envelope frame i covers [i*hop, i*hop+win]; centre it
                runs.append((i * hop + 0.015, j * hop + 0.015))
            i = j
        else:
            i += 1
    return runs


def main():
    import stable_whisper

    cues = parse_srt(SRT)
    roman = [l.split() for l in open(TRANSLIT, encoding="utf-8").read().strip().split("\n")]
    assert len(roman) == len(cues), "translit: one line per SRT cue"
    bn_words, ro_words = [], []
    for c, r in zip(cues, roman):
        b = c["text"].split()
        assert len(b) == len(r), f"cue {c['i']}: {len(b)} bn words vs {len(r)} romanised"
        bn_words += [(c["i"], t) for t in b]
        ro_words += r
    text = " ".join(ro_words)

    audio = load_16k()
    dur = len(audio) / SR
    model = stable_whisper.load_faster_whisper(MODEL, device="cpu", compute_type="int8",
                                               cpu_threads=os.cpu_count() or 2)
    passes = []
    for lang, shift in (("bn", 0.0), ("en", 0.0), ("bn", 0.37), ("en", 0.73), ("hi", 0.19)):
        a = np.concatenate([np.zeros(int(shift * SR), np.float32), audio])
        r = model.align(a, text, language=lang, vad=False, suppress_silence=False,
                        regroup=False, verbose=None)
        ws = [w for s in r.segments for w in s.words]
        if len(ws) != len(ro_words):
            print(f"pass {lang}+{shift}: word count mismatch, skipped")
            continue
        passes.append([(float(w.start) - shift, float(w.end) - shift) for w in ws])
        print(f"pass {lang} shift {shift:.2f}s ok")
    assert len(passes) >= 3, "alignment failed"

    n = len(ro_words)
    st = [statistics.median(p[i][0] for p in passes) for i in range(n)]
    en = [statistics.median(p[i][1] for p in passes) for i in range(n)]

    # ---- stage 2: speech islands ---------------------------------------------
    # Real pauses (>= PAUSE s of silence) cut the narration into islands. Stops
    # inside words ("আপডেট", "চারটি") are shorter than that, so they never cut.
    env, hop = envelope(audio)
    sil = [x for x in silences(env, hop, 0.05)]
    pauses = [x for x in sil if x[1] - x[0] >= PAUSE]
    edges = [0.0] + [t for x in pauses for t in x] + [dur]
    islands = [(edges[k], edges[k + 1]) for k in range(0, len(edges), 2)
               if edges[k + 1] - edges[k] > 0.05]

    def overlap(i, k):
        return max(0.0, min(en[i], islands[k][1]) - max(st[i], islands[k][0]))

    def dist(i, k):
        mid = (st[i] + en[i]) / 2
        return max(0.0, islands[k][0] - mid, mid - islands[k][1])

    # every word goes to the island it overlaps most (nearest one if it fell
    # into a pause); the order of words is kept
    owner, k0 = [], 0
    for i in range(n):
        cand = range(k0, len(islands))
        k = max(cand, key=lambda k: (overlap(i, k) > 0.02, overlap(i, k), -dist(i, k)))
        if overlap(i, k) <= 0.02:
            k = min(cand, key=lambda k: dist(i, k))
        owner.append(k)
        k0 = k
    # an island without a word is the second half of a word broken by a long
    # stop ("অধ্যায় · দশ"): glue it to the island of the word that spans it
    groups = []                                   # [island indices], [word indices]
    for k in range(len(islands)):
        ws = [i for i in range(n) if owner[i] == k]
        if ws or not groups:
            groups.append([[k], ws])
        else:
            groups[-1][0].append(k)
    if not groups[0][1]:
        groups[1][0] = groups[0][0] + groups[1][0]
        groups.pop(0)

    spread = [0.0] * n
    for isl, ws in groups:
        s0, e0 = islands[isl[0]][0], islands[isl[-1]][1]
        if len(ws) == 1:
            st[ws[0]], en[ws[0]] = s0, e0
            continue
        pad = 0.5
        clip = np.concatenate([np.zeros(int(pad * SR), np.float32),
                               audio[int(s0 * SR):int(e0 * SR)],
                               np.zeros(int(pad * SR), np.float32)])
        txt = " ".join(ro_words[i] for i in ws)
        runs = []
        for lang in ("bn", "en", "hi"):
            r = model.align(clip, txt, language=lang, vad=False, suppress_silence=False,
                            regroup=False, verbose=None)
            got = [w for sg in r.segments for w in sg.words]
            if len(got) == len(ws):
                runs.append([(float(w.start) - pad + s0, float(w.end) - pad + s0) for w in got])
        if not runs:                               # keep the global pass
            runs = [[(st[i], en[i]) for i in ws]]
        cuts = []
        for j in range(len(ws) - 1):
            v = [(r[j][1] + r[j + 1][0]) / 2 for r in runs]
            cuts.append(statistics.median(v))
            spread[ws[j + 1]] = max(v) - min(v)
        cuts = [s0] + cuts + [e0]
        for j in range(1, len(cuts)):              # monotonic, >= 60 ms per word
            cuts[j] = max(cuts[j], cuts[j - 1] + 0.06)
        for j in range(len(cuts) - 2, 0, -1):
            cuts[j] = min(cuts[j], cuts[j + 1] - 0.06)
        for j, i in enumerate(ws):
            st[i], en[i] = cuts[j], cuts[j + 1]
        # a word edge that lands in a short stop closure: the word before ends
        # where the voice stops
        for j, i in enumerate(ws[:-1]):
            for a, b in sil:
                if b - a < PAUSE and a - 0.03 <= en[i] <= b + 0.03 and a > st[i] + 0.06 and b < en[ws[j + 1]] - 0.06:
                    en[i], st[ws[j + 1]] = a, b
    snapped = len(groups)

    isl_of = {i: g for g, (_, ws) in enumerate(groups) for i in ws}
    words = [{"cue": bn_words[i][0], "t": bn_words[i][1], "roman": ro_words[i],
              "start": round(st[i], 3), "end": round(en[i], 3), "island": isl_of[i],
              "spread": round(spread[i], 3)}
             for i in range(n)]
    json.dump({"audio": os.path.basename(WAV), "audioDuration": round(dur, 3),
               "model": "whisper-small (ct2 int8) cross-attention DTW via stable-ts, "
                        f"global pass + per-island pass, pause edges taken from the waveform",
               "islands": [[round(islands[i[0]][0], 3), round(islands[i[-1]][1], 3)] for i, _ in groups],
               "words": words}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{n} words in {snapped} speech islands, "
          f"pass spread: median {statistics.median(spread) * 1000:.0f} ms, max {max(spread) * 1000:.0f} ms")
    for w in words:
        flag = "  <-- passes disagree" if w["spread"] > 0.12 else ""
        print(f"c{w['cue']:2d} i{w['island']:2d} {w['start']:7.3f} {w['end']:7.3f}  {w['t']}  ({w['roman']}){flag}")


if __name__ == "__main__":
    main()
