#!/usr/bin/env python3
"""
Builds data/timeline.json : cue list, word-level timings, phrase chunks and the
master timing model for the Bengali mathematics course promo.

Word timings come from data/alignment.json (forced alignment of the narration,
see scripts/align_words.py). The syllable model below is only the fallback
used when that file is missing.

Fallback timing strategy
------------------------
The supplied SRT gives sentence order and approximate times; the supplied
voice-over WAV is the master clock. We
  1. run a lightweight energy VAD on the WAV to find real speech segments,
  2. lay every word on one continuous timeline whose speaking time is
     syllable-weight proportional over the *real* speech span,
  3. drop the pauses found by the VAD in between the words, so pauses always
     land where the narrator actually breathes,
  4. derive sentence + phrase boundaries from the words.
"""
import array
import json
import math
import os
import re
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRT = os.path.join(ROOT, "math_course_update_bn.srt")
WAV = os.path.join(ROOT, "Generated Audio November 13, 2026 - 7_35PM.wav")
OUT = os.path.join(ROOT, "data", "timeline.json")
ALIGN = os.path.join(ROOT, "data", "alignment.json")
SYNCED_SRT = os.path.join(ROOT, "math_course_update_bn.synced.srt")


def parse_srt(path):
    raw = open(path, encoding="utf-8-sig").read().replace("\r\n", "\n").strip()
    cues = []
    for block in re.split(r"\n{2,}", raw):
        lines = [l for l in block.split("\n") if l.strip()]
        if len(lines) < 3:
            continue
        a, b = [x.strip() for x in lines[1].split("-->")]

        def sec(s):
            h, m, rest = s.split(":")
            ss, ms = rest.split(",")
            return int(h) * 3600 + int(m) * 60 + int(ss) + int(ms) / 1000.0

        cues.append({"i": len(cues) + 1, "srtStart": sec(a), "srtEnd": sec(b),
                     "text": " ".join(lines[2:]).strip()})
    return cues


def vad_segments(path, hop=0.01, win=0.03, min_gap=0.28, min_len=0.22):
    w = wave.open(path)
    sr = w.getframerate()
    a = array.array("h")
    a.frombytes(w.readframes(w.getnframes()))
    if w.getnchannels() > 1:
        a = array.array("h", a[0::w.getnchannels()])
    hopN, winN = int(hop * sr), int(win * sr)
    env = []
    for i in range(0, len(a) - winN, hopN):
        seg = a[i:i + winN:2]
        env.append(math.sqrt(sum(v * v for v in seg) / max(len(seg), 1)) / 32768.0)
    k = 5
    sm = [sum(env[max(0, i - k):i + k + 1]) / len(env[max(0, i - k):i + k + 1]) for i in range(len(env))]
    p90 = sorted(sm)[int(len(sm) * 0.9)]
    thr = max(0.02, p90 * 0.06)
    voiced = [v > thr for v in sm]
    runs, i = [], 0
    while i < len(voiced):
        if voiced[i]:
            j = i
            while j < len(voiced) and voiced[j]:
                j += 1
            runs.append([i * hop, j * hop])
            i = j
        else:
            i += 1
    merged = []
    for s, e in runs:
        if merged and s - merged[-1][1] < min_gap:
            merged[-1][1] = e
        else:
            merged.append([s, e])
    return [(s, e) for s, e in merged if e - s > min_len]


BENGALI_VOWEL_SIGNS = set("ািীুূৃেৈোৌৗ")
INDEP_VOWELS = set("অআইঈউঊঋএঐওঔ")
CONSONANTS = set("কখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহৎয়ড়ঢ়")
DIGIT_CHARS = set("০১২৩৪৫৬৭৮৯")

PAUSE_AFTER = {"।": 0.5, "!": 0.45, "?": 0.45, ",": 0.3, "—": 0.25}


def syllables(word):
    w = word.strip()
    if not w:
        return 0
    if re.fullmatch(r"[A-Za-z0-9+%/\-–—.,:!?'\"()]+", w):
        groups = re.findall(r"[aeiouy]+", w.lower())
        return max(1, len(groups) + (1 if re.search(r"\d", w) else 0))
    n, chars, i = 0, list(w), 0
    while i < len(chars):
        c = chars[i]
        if c in INDEP_VOWELS or c in DIGIT_CHARS:
            n += 1
        elif c in CONSONANTS:
            nxt = chars[i + 1] if i + 1 < len(chars) else ""
            if nxt not in BENGALI_VOWEL_SIGNS and nxt != "্":
                n += 1
        elif c in BENGALI_VOWEL_SIGNS:
            n += 1
        i += 1
    return max(1, n)


def word_weights(text):
    out = []
    for t in text.split():
        w = syllables(t) + 0.4 + 0.3 * len(re.findall(r"\d", t))
        if re.fullmatch(r"[A-Za-z0-9+]+", t):
            w += 0.3
        pause = 0.0
        for p, v in PAUSE_AFTER.items():
            if t.endswith(p):
                pause = v
        out.append((t, w, pause))
    return out


def main():
    cues = parse_srt(SRT)
    segs = vad_segments(WAV)
    speech_start = segs[0][0]
    speech_end = segs[-1][1]
    gaps = [(a[1], b[0]) for a, b in zip(segs, segs[1:]) if b[0] - a[1] > 0.12]
    gap_total = sum(e - s for s, e in gaps)
    speak_time = (speech_end - speech_start) - gap_total

    # ---- sentence boundaries -------------------------------------------------
    # syllable-proportional layout across the real speech span, then a gentle
    # nudge onto a nearby real silence when one is close (keeps the text rhythm)
    weights = [sum(w + p for _, w, p in word_weights(c["text"])) for c in cues]
    tot_w = sum(weights)
    prop, cum = [], 0.0
    for w in weights:
        prop.append(speech_start + (speech_end - speech_start) * (cum / tot_w))
        cum += w
    prop.append(speech_end)

    bounds = list(prop)
    for i in range(1, len(bounds)):
        bounds[i] = max(bounds[i], bounds[i - 1] + 1.2)
    bounds[-1] = speech_end
    # centres the leftover time so no cue is starved
    over = bounds[-1] - speech_end
    if over > 0:
        for i in range(1, len(bounds) - 1):
            bounds[i] -= over * i / (len(bounds) - 2)
    # never let two sentences overlap (subtitles are laid out per sentence)
    for i in range(1, len(bounds)):
        bounds[i] = max(bounds[i], bounds[i - 1] + 0.35)

    aligned = json.load(open(ALIGN, encoding="utf-8"))["words"] if os.path.exists(ALIGN) else None
    if not aligned:
        print("!! data/alignment.json missing - falling back to the syllable estimate")

    out_cues = []
    for ci, c in enumerate(cues):
        s, e = bounds[ci], bounds[ci + 1]
        ww = word_weights(c["text"])
        inside = [(gs, ge) for gs, ge in gaps if s + 0.05 < gs and ge < e - 0.05]
        tw = sum(w + p for _, w, p in ww)
        speak = (e - s) - sum(ge - gs for gs, ge in inside)
        scale = speak / tw if tw > 0 else 1.0
        cursor, gi = s, 0
        words = []
        for tok, w, p in ww:
            d = w * scale
            while gi < len(inside) and cursor + d * 0.5 >= inside[gi][0]:
                cursor = max(cursor, inside[gi][1])
                gi += 1
            words.append({"t": tok, "start": round(cursor, 3),
                          "end": round(cursor + d, 3), "syl": syllables(tok)})
            cursor = cursor + d + p * scale
        if words:
            words[-1]["end"] = round(e, 3)
        if aligned:
            # measured word timings (scripts/align_words.py) replace the estimate
            mine = [w for w in aligned if w["cue"] == c["i"]]
            assert [w["t"] for w in mine] == [w["t"] for w in words], f"alignment is stale for cue {c['i']}"
            for w, m in zip(words, mine):
                w["start"], w["end"] = m["start"], m["end"]
        out_cues.append({
            "i": c["i"],
            "start": words[0]["start"],
            "end": words[-1]["end"],
            "srtStart": c["srtStart"],
            "srtEnd": c["srtEnd"],
            "text": c["text"],
            "words": words,
        })

    # phrase chunks for the kinetic subtitles
    MAXW, MAXC = 5, 33
    for c in out_cues:
        chunks, cur = [], []
        for w in c["words"]:
            chars = len(" ".join([x["t"] for x in cur] + [w["t"]]))
            brk = cur and (len(cur) + 1 > MAXW or chars > MAXC or cur[-1]["t"][-1] in "।,!?")
            if brk:
                chunks.append(cur)
                cur = [w]
            else:
                cur.append(w)
        if cur:
            chunks.append(cur)
        c["chunks"] = [{"start": ch[0]["start"], "end": ch[-1]["end"],
                        "words": [x["t"] for x in ch]} for ch in chunks]

    data = {
        "duration": 81.0,
        "audioDuration": 79.2,
        "voiceStart": round(speech_start, 3),
        "voiceEnd": round(speech_end, 3),
        "segments": [[round(s, 3), round(e, 3)] for s, e in segs],
        "gaps": [[round(s, 3), round(e, 3)] for s, e in gaps],
        "aligned": bool(aligned),
        "cues": out_cues,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    if aligned:
        def ts(x):
            ms = int(round(x * 1000))
            return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
        with open(SYNCED_SRT, "w", encoding="utf-8") as f:
            for c in out_cues:
                f.write(f"{c['i']}\n{ts(c['start'])} --> {ts(c['end'])}\n{c['text']}\n\n")

    print(f"speech {speech_start:.2f}-{speech_end:.2f}  segments {len(segs)}  gaps {len(gaps)}")
    bad = 0
    for c in out_cues:
        d = c["end"] - c["start"]
        n = len(c["words"])
        wps = n / max(d, .01)
        if wps > 3.6:
            bad += 1
        print(f"c{c['i']:2d} {c['start']:6.2f}-{c['end']:6.2f} {d:5.2f}s {n:2d}w {wps:4.2f}wps "
              f"chunks={len(c['chunks'])}  {'!!' if wps > 3.6 else ''} {c['text']}")
    print("words", sum(len(c["words"]) for c in out_cues), "suspicious cues", bad)


if __name__ == "__main__":
    main()
