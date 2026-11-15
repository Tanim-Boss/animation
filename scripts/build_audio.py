#!/usr/bin/env python3
"""Create the voice + discrete sound-design master (no music or ambience).

Every sound is a short, event-triggered cue tied to a scene transition or a
visual beat. The rest of the soundtrack is deliberately silent beneath the
Bangla narration.
"""
from __future__ import annotations

import array
import json
import math
import os
import random
import struct
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = os.path.join(ROOT, "audio", "python-interpreter-bn.wav")
TIMELINE = os.path.join(ROOT, "data", "timeline.json")
PROJECT = os.path.join(ROOT, "data", "project.json")
OUT = os.path.join(ROOT, "out", "audio_master.wav")
SCHEDULE = os.path.join(ROOT, "data", "sfx_schedule.json")
SR = 44100
TAU = math.tau


def read_voice(path: str) -> tuple[array.array, int]:
    with wave.open(path, "rb") as w:
        sr, channels, width = w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(w.getnframes())
    if width != 2:
        raise ValueError("Voice-over must be a 16-bit PCM WAV")
    samples = array.array("h")
    samples.frombytes(raw)
    if channels == 1:
        mono = array.array("f", (v / 32768.0 for v in samples))
    else:
        mono = array.array("f", (sum(samples[i:i + channels]) / (channels * 32768.0)
                                   for i in range(0, len(samples), channels)))
    return mono, sr


def resample_linear(values: array.array, in_sr: int, out_sr: int) -> array.array:
    if in_sr == out_sr:
        return values
    length = round(len(values) * out_sr / in_sr)
    out = array.array("f", [0.0]) * length
    scale = in_sr / out_sr
    for i in range(length):
        x = i * scale
        a = int(x)
        b = min(a + 1, len(values) - 1)
        f = x - a
        out[i] = values[a] * (1 - f) + values[b] * f
    return out


def add_sample(mix_l: list[float], mix_r: list[float], idx: int, value: float, pan: float = 0.0) -> None:
    if idx < 0 or idx >= len(mix_l):
        return
    # Equal-power pan; mono narration stays centered.
    angle = (max(-1.0, min(1.0, pan)) + 1.0) * math.pi / 4.0
    mix_l[idx] += value * math.cos(angle)
    mix_r[idx] += value * math.sin(angle)


def tone(mix_l: list[float], mix_r: list[float], start: float, freq: float,
         duration: float, amp: float, pan: float = 0.0, decay: float = 5.0,
         bend: float = 0.0, phase: float = 0.0) -> None:
    first = max(0, round(start * SR))
    n = min(round(duration * SR), len(mix_l) - first)
    if n <= 0:
        return
    for j in range(n):
        t = j / SR
        x = j / max(1, n - 1)
        env = min(1.0, x * 24.0) * math.exp(-decay * x)
        f = freq * (1 + bend * x)
        sample = math.sin(TAU * (freq * t + 0.5 * freq * bend * t * x) + phase)
        add_sample(mix_l, mix_r, first + j, amp * env * sample, pan)


def noise_sweep(mix_l: list[float], mix_r: list[float], start: float,
                duration: float, amp: float, pan: float = 0.0, seed: int = 1) -> None:
    rng = random.Random(seed)
    first = max(0, round(start * SR))
    n = min(round(duration * SR), len(mix_l) - first)
    if n <= 0:
        return
    low = 0.0
    for j in range(n):
        x = j / max(1, n - 1)
        # Soft filtered air with a rising spectral edge; no sustained noise bed.
        raw = rng.uniform(-1.0, 1.0)
        cutoff = 0.025 + 0.24 * x
        low += cutoff * (raw - low)
        high = raw - low
        env = (math.sin(math.pi * x) ** 1.6) * (0.4 + 0.6 * x)
        add_sample(mix_l, mix_r, first + j, amp * env * (0.72 * high + 0.28 * raw), pan)


def click(mix_l: list[float], mix_r: list[float], start: float,
          amp: float = 0.042, pan: float = 0.0, seed: int = 2) -> None:
    rng = random.Random(seed)
    first = max(0, round(start * SR))
    n = min(round(0.045 * SR), len(mix_l) - first)
    for j in range(max(0, n)):
        x = j / max(1, n - 1)
        env = math.exp(-22.0 * x)
        snap = rng.uniform(-1.0, 1.0) * (1 - x) * 0.32
        ping = math.sin(TAU * (960 + 260 * x) * j / SR) * math.exp(-13 * x)
        add_sample(mix_l, mix_r, first + j, amp * env * (snap + 0.68 * ping), pan)


def effect(mix_l: list[float], mix_r: list[float], start: float,
           kind: str, seed: int = 1) -> None:
    if kind == "rise":
        noise_sweep(mix_l, mix_r, start, 0.52, 0.035, -0.12, seed)
        tone(mix_l, mix_r, start + 0.02, 392, 0.48, 0.022, 0.10, 4.5, bend=1.25)
        tone(mix_l, mix_r, start + 0.20, 784, 0.42, 0.013, 0.12, 5.0)
    elif kind == "air":
        noise_sweep(mix_l, mix_r, start, 0.40, 0.047, 0.22, seed)
        tone(mix_l, mix_r, start + 0.24, 660, 0.32, 0.018, 0.15, 6.0)
    elif kind == "chime":
        for f, delay, level in ((587.33, 0.00, 0.026), (880.0, 0.07, 0.018), (1174.66, 0.14, 0.011)):
            tone(mix_l, mix_r, start + delay, f, 0.56, level, -0.08 + delay, 5.2)
    elif kind == "mechanical":
        click(mix_l, mix_r, start, 0.046, -0.18, seed)
        tone(mix_l, mix_r, start + 0.045, 740, 0.34, 0.021, 0.05, 7.0)
        tone(mix_l, mix_r, start + 0.07, 1479, 0.28, 0.009, 0.08, 8.0)
    elif kind == "pulse":
        tone(mix_l, mix_r, start, 118, 0.38, 0.056, 0.0, 6.2, bend=-0.42)
        noise_sweep(mix_l, mix_r, start + 0.04, 0.29, 0.024, 0.1, seed)
        tone(mix_l, mix_r, start + 0.13, 660, 0.30, 0.015, 0.0, 7.0)
    elif kind == "double":
        click(mix_l, mix_r, start, 0.045, -0.45, seed)
        tone(mix_l, mix_r, start + 0.07, 540, 0.26, 0.018, -0.35, 7.0)
        click(mix_l, mix_r, start + 0.18, 0.038, 0.45, seed + 1)
        tone(mix_l, mix_r, start + 0.24, 810, 0.28, 0.016, 0.35, 7.0)
    elif kind == "warm":
        tone(mix_l, mix_r, start, 440, 0.64, 0.022, -0.10, 5.5)
        tone(mix_l, mix_r, start + 0.07, 554.37, 0.56, 0.019, 0.12, 5.7)
        tone(mix_l, mix_r, start + 0.14, 659.25, 0.46, 0.012, 0.18, 6.2)
    elif kind == "alert":
        click(mix_l, mix_r, start, 0.032, 0.0, seed)
        tone(mix_l, mix_r, start + 0.02, 660, 0.25, 0.020, 0.0, 8.0, bend=-0.10)
        tone(mix_l, mix_r, start + 0.19, 523.25, 0.34, 0.017, 0.06, 7.0)
    elif kind == "stereo":
        tone(mix_l, mix_r, start, 698.46, 0.37, 0.022, -0.6, 6.2)
        tone(mix_l, mix_r, start + 0.16, 932.33, 0.40, 0.019, 0.6, 6.2)
    elif kind == "resolve":
        for f, delay, level in ((523.25, 0.00, 0.019), (659.25, 0.08, 0.018), (783.99, 0.16, 0.015)):
            tone(mix_l, mix_r, start + delay, f, 0.82, level, 0.0, 4.5)
        noise_sweep(mix_l, mix_r, start, 0.50, 0.018, 0.0, seed)
    elif kind == "tick":
        click(mix_l, mix_r, start, 0.035, 0.0, seed)
        tone(mix_l, mix_r, start + 0.015, 988, 0.24, 0.013, 0.02, 8.0)
    elif kind == "softclick":
        click(mix_l, mix_r, start, 0.026, -0.06, seed)
    else:
        raise ValueError(f"Unknown sound effect: {kind}")


def main() -> None:
    voice, in_sr = read_voice(VOICE)
    voice = resample_linear(voice, in_sr, SR)
    with open(TIMELINE, encoding="utf-8") as f:
        timeline = json.load(f)
    with open(PROJECT, encoding="utf-8") as f:
        project = json.load(f)

    total = max(round(timeline["duration"] * SR), len(voice) + round(0.35 * SR))
    left = array.array("f", [0.0]) * total
    right = array.array("f", [0.0]) * total
    for i, sample in enumerate(voice):
        left[i] = sample * 0.94
        right[i] = sample * 0.94

    events: list[dict] = []
    for scene in timeline["scenes"]:
        # A tiny lead places the transition sonically in the visual cut, not on
        # top of the first consonant of the next narration line.
        events.append({"time": max(0.0, scene["start"] + 0.08), "sound": scene["sound"],
                       "scene": scene["id"], "kind": "scene"})
    for beat in project.get("beats", []):
        cue = timeline["cues"][beat["cue"] - 1]
        word = cue["words"][min(beat["word"], len(cue["words"]) - 1)]
        events.append({"time": word["start"] + 0.035, "sound": beat["sound"],
                       "scene": timeline["scenes"][beat["cue"] - 1]["id"],
                       "kind": "animation-beat", "cue": beat["cue"], "word": word["i"]})

    events.sort(key=lambda e: e["time"])
    for idx, event_row in enumerate(events):
        effect(left, right, event_row["time"], event_row["sound"], seed=37 + idx * 13)
        event_row["time"] = round(event_row["time"], 3)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    interleaved = array.array("h")
    for l, r in zip(left, right):
        # gentle clip guard; the narration is already well below full scale.
        interleaved.append(round(max(-0.985, min(0.985, l)) * 32767))
        interleaved.append(round(max(-0.985, min(0.985, r)) * 32767))
    with wave.open(OUT, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(interleaved.tobytes())
    with open(SCHEDULE, "w", encoding="utf-8") as f:
        json.dump({"music": False, "ambience": False, "events": events}, f, ensure_ascii=False, indent=2)
    print(f"wrote {OUT} ({total / SR:.2f}s), {len(events)} discrete SFX events; no music bed")


if __name__ == "__main__":
    main()
