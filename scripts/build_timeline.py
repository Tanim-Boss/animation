#!/usr/bin/env python3
"""Build word-level subtitle timing from the supplied Bangla narration WAV.

The speech engine does not expose phoneme timestamps. This script measures the
real speech/silence regions in the generated voice-over, snaps paragraph cuts to
nearby pauses, then distributes syllable-weighted word cues across voiced time.
The active word therefore freezes over a breath instead of racing through it.
"""
from __future__ import annotations

import array
import json
import math
import os
import re
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, "audio", "python-interpreter-bn.wav")
SCRIPT = os.path.join(ROOT, "data", "narration_bn.txt")
PROJECT = os.path.join(ROOT, "data", "project.json")
OUT = os.path.join(ROOT, "data", "timeline.json")
SRT = os.path.join(ROOT, "data", "subtitles-bn.srt")

VOWEL_SIGNS = set("ািীুূৃেৈোৌৗ")
INDEP_VOWELS = set("অআইঈউঊঋএঐওঔ")
CONSONANTS = set("কখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহৎয়ড়ঢ়")
DIGITS = set("০১২৩৪৫৬৭৮৯")


def parse_wav(path: str) -> tuple[array.array, int]:
    with wave.open(path, "rb") as w:
        sr, channels, width = w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(w.getnframes())
    if width != 2:
        raise ValueError(f"Expected 16-bit PCM voice WAV; got {width * 8}-bit")
    samples = array.array("h")
    samples.frombytes(raw)
    if channels > 1:
        mono = array.array("h")
        for i in range(0, len(samples), channels):
            mono.append(round(sum(samples[i:i + channels]) / channels))
        samples = mono
    # Float32 keeps a two-minute voice-over compact while preserving RMS precision.
    return array.array("f", (v / 32768.0 for v in samples)), sr


def percentile(values: list[float], q: float) -> float:
    s = sorted(values)
    return s[min(len(s) - 1, int((len(s) - 1) * q))]


def voiced_spans(samples: array.array, sr: int) -> list[tuple[float, float]]:
    hop = max(1, round(sr * 0.01))
    win = max(hop, round(sr * 0.03))
    env: list[float] = []
    # Decimate each RMS window by four; enough resolution for speech boundaries.
    step = max(1, sr // 11025)
    for i in range(0, len(samples) - win, hop):
        part = samples[i:i + win:step]
        env.append(math.sqrt(sum(v * v for v in part) / max(1, len(part))))
    if not env:
        return []
    baseline = percentile(env, 0.90)
    threshold = max(0.008, baseline * 0.06)
    smooth = [sum(env[max(0, i - 2):min(len(env), i + 3)]) /
              len(env[max(0, i - 2):min(len(env), i + 3)]) for i in range(len(env))]
    active = [v >= threshold for v in smooth]
    runs: list[list[float]] = []
    i = 0
    while i < len(active):
        if not active[i]:
            i += 1
            continue
        j = i + 1
        while j < len(active) and active[j]:
            j += 1
        runs.append([max(0.0, i * hop / sr - 0.015), min(len(samples) / sr, j * hop / sr + 0.025)])
        i = j
    # Keep small within-word gaps together; leave clear phrase breaths intact.
    merged: list[list[float]] = []
    for start, end in runs:
        if merged and start - merged[-1][1] < 0.12:
            merged[-1][1] = end
        else:
            merged.append([start, end])
    return [(a, b) for a, b in merged if b - a >= 0.055]


def syllables(word: str) -> int:
    w = re.sub(r"^[,;:!?।]+|[,;:!?।]+$", "", word.strip())
    if not w:
        return 0
    # Keep Latin/code tokens readable too, should the script add any later.
    if re.fullmatch(r"[A-Za-z0-9_+%./-]+", w):
        return max(1, len(re.findall(r"[aeiouy]+", w.lower())) + bool(re.search(r"\d", w)))
    chars = list(w)
    count = 0
    for i, ch in enumerate(chars):
        if ch in INDEP_VOWELS or ch in DIGITS:
            count += 1
        elif ch in CONSONANTS:
            nxt = chars[i + 1] if i + 1 < len(chars) else ""
            if nxt not in VOWEL_SIGNS and nxt != "্":
                count += 1
        elif ch in VOWEL_SIGNS:
            count += 1
    return max(1, count)


def word_weight(word: str) -> float:
    return syllables(word) + 0.42 + 0.28 * len(re.findall(r"[০-৯0-9]", word))


def active_duration(spans: list[tuple[float, float]]) -> float:
    return sum(max(0.0, b - a) for a, b in spans)


def time_at_active_position(spans: list[tuple[float, float]], position: float) -> float:
    if not spans:
        return 0.0
    remaining = max(0.0, position)
    for start, end in spans:
        duration = end - start
        if remaining <= duration:
            return start + remaining
        remaining -= duration
    return spans[-1][1]


def active_position_at_time(spans: list[tuple[float, float]], t: float) -> float:
    total = 0.0
    for start, end in spans:
        if t <= start:
            break
        total += max(0.0, min(end, t) - start)
        if t <= end:
            break
    return total


def clipped_spans(spans: list[tuple[float, float]], start: float, end: float) -> list[tuple[float, float]]:
    return [(max(a, start), min(b, end)) for a, b in spans
            if min(b, end) - max(a, start) >= 0.025]


def split_words(text: str) -> list[str]:
    # Em dashes mark a spoken pause in the narration, not one subtitle token.
    normalized = re.sub(r"\s*[—–]\s*", ", ", text.strip())
    return [w for w in normalized.split() if w not in {"—", "–"}]


def timestamp(seconds: float) -> str:
    ms = max(0, round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def make_chunks(words: list[dict]) -> list[dict]:
    chunks: list[list[dict]] = []
    current: list[dict] = []
    for word in words:
        chars = len(" ".join([x["t"] for x in current] + [word["t"]]))
        punctuation = bool(current and re.search(r"[।!?]$", current[-1]["t"]))
        if current and (len(current) >= 5 or chars > 39 or punctuation):
            chunks.append(current)
            current = []
        current.append(word)
    if current:
        chunks.append(current)
    return [{"start": part[0]["start"], "end": part[-1]["end"],
             "words": [w["t"] for w in part],
             "indices": [w["i"] for w in part]} for part in chunks]


def main() -> None:
    samples, sr = parse_wav(AUDIO)
    duration = len(samples) / sr
    spans = voiced_spans(samples, sr)
    if not spans:
        raise RuntimeError("No voice activity found in the narration WAV")
    script = open(SCRIPT, encoding="utf-8").read().strip()
    paragraphs = [re.sub(r"\s+", " ", p.strip()) for p in script.splitlines() if p.strip()]
    if len(paragraphs) != len(json.load(open(PROJECT, encoding="utf-8"))["scenes"]):
        raise ValueError("Narration paragraph count must match the project scene count")
    project = json.load(open(PROJECT, encoding="utf-8"))
    words_by_cue = [split_words(p) for p in paragraphs]
    weights = [sum(word_weight(w) for w in row) for row in words_by_cue]
    total_weight = sum(weights)
    total_active = active_duration(spans)

    # Speech-weight boundaries provide a prior. Snap each scene cut to the
    # nearest measured breath when the pause is reasonably close to that prior.
    boundaries = [spans[0][0]]
    cumulative_weight = 0.0
    used_gap = -1
    gaps = [(spans[i][1], spans[i + 1][0]) for i in range(len(spans) - 1)
            if spans[i + 1][0] - spans[i][1] >= 0.16]
    for ci in range(len(paragraphs) - 1):
        cumulative_weight += weights[ci]
        expected = time_at_active_position(spans, total_active * cumulative_weight / total_weight)
        options = [(abs((a + b) / 2 - expected), gi, (a + b) / 2)
                   for gi, (a, b) in enumerate(gaps)
                   if gi > used_gap and (a + b) / 2 > boundaries[-1] + 2.0]
        if options:
            distance, gi, midpoint = min(options, key=lambda x: x[0])
            if distance <= 1.65:
                boundary = midpoint
                used_gap = gi
            else:
                boundary = expected
        else:
            boundary = expected
        # Keep a scene long enough to breathe; boundaries remain monotonic.
        boundary = max(boundaries[-1] + 2.4, boundary)
        boundaries.append(boundary)
    boundaries.append(spans[-1][1])
    if any(b <= a for a, b in zip(boundaries, boundaries[1:])):
        raise RuntimeError(f"Non-monotonic cue boundaries: {boundaries}")

    cues: list[dict] = []
    for ci, (paragraph, tokens, start, end) in enumerate(zip(paragraphs, words_by_cue, boundaries, boundaries[1:]), 1):
        active = clipped_spans(spans, start, end)
        if not active:
            # A boundary can fall very close to a low-energy syllable; include
            # the closest measured run rather than inventing a long silent cue.
            nearest = min(spans, key=lambda s: abs((s[0] + s[1]) / 2 - (start + end) / 2))
            active = [nearest]
        cue_active = active_duration(active)
        token_weights = [word_weight(w) for w in tokens]
        sum_weights = sum(token_weights)
        cursor = 0.0
        word_rows: list[dict] = []
        for wi, (token, weight) in enumerate(zip(tokens, token_weights)):
            w0 = cue_active * cursor / sum_weights
            cursor += weight
            w1 = cue_active * cursor / sum_weights
            ws = time_at_active_position(active, w0)
            we = time_at_active_position(active, w1)
            if we - ws < 0.065:
                we = min(active[-1][1], ws + 0.065)
            word_rows.append({"i": wi, "t": token, "start": round(ws, 3),
                              "end": round(we, 3), "syl": syllables(token)})
        # Clamp rounding noise and guarantee a strictly advancing highlight.
        for wi in range(1, len(word_rows)):
            if word_rows[wi]["start"] < word_rows[wi - 1]["start"]:
                word_rows[wi]["start"] = word_rows[wi - 1]["start"]
            if word_rows[wi]["start"] < word_rows[wi - 1]["end"] - 0.08:
                word_rows[wi]["start"] = round(word_rows[wi - 1]["end"] - 0.08, 3)
        cues.append({
            "i": ci,
            "text": paragraph,
            "displayText": " ".join(tokens),
            "start": word_rows[0]["start"],
            "end": word_rows[-1]["end"],
            "words": word_rows,
            "chunks": make_chunks(word_rows),
        })

    fps = project["format"]["fps"]
    # Scenes change just before the next paragraph starts, using the actual
    # measured pause as a clean transition window.
    scenes = []
    for i, meta in enumerate(project["scenes"]):
        start = 0.0 if i == 0 else max(0.0, cues[i]["start"] - 0.34)
        end = max(start + 1.0, cues[i + 1]["start"] - 0.34) if i + 1 < len(cues) else duration + 1.35
        scenes.append({**meta, "start": round(start, 3), "end": round(end, 3)})
    final_duration = round(max(duration + 1.35, cues[-1]["end"] + 1.25), 3)

    timeline = {
        "duration": final_duration,
        "audioDuration": round(duration, 3),
        "voiceStart": round(spans[0][0], 3),
        "voiceEnd": round(spans[-1][1], 3),
        "fps": fps,
        "aligned": "voice-activity + pause-snapped syllable timing",
        "voiceSpans": [[round(a, 3), round(b, 3)] for a, b in spans],
        "scenes": scenes,
        "cues": cues,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(timeline, f, ensure_ascii=False, indent=2)
    srt_blocks = []
    n = 1
    for cue in cues:
        for chunk in cue["chunks"]:
            phrase = " ".join(chunk["words"])
            srt_blocks.append(f"{n}\n{timestamp(chunk['start'])} --> {timestamp(chunk['end'])}\n{phrase}")
            n += 1
    with open(SRT, "w", encoding="utf-8") as f:
        f.write("\n\n".join(srt_blocks) + "\n")

    print(f"voice: {duration:.2f}s | active: {total_active:.2f}s | spans: {len(spans)} | cues: {len(cues)}")
    for cue, scene in zip(cues, scenes):
        print(f"{cue['i']:02d} {scene['id']:<10} {cue['start']:6.2f}–{cue['end']:6.2f} "
              f"{len(cue['words']):2d} words | scene {scene['start']:6.2f}–{scene['end']:6.2f} | {cue['text'][:72]}")
    print(f"duration: {final_duration:.2f}s | wrote data/timeline.json and data/subtitles-bn.srt")


if __name__ == "__main__":
    main()
