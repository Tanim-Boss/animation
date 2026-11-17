#!/usr/bin/env python3
"""
Builds the complete sound track for the film.

  * places every narration clip at its scene offset (scene timing mirrors src/film/timeline.ts)
  * synthesises an original ambient score (no samples, no third-party audio)
  * synthesises short UI sound effects on the animation beats
  * ducks the score under the voice, then writes public/audio/master.wav

Everything is generated from first principles so the mix is reproducible and
royalty-free. Requires only the Python standard library.
"""
from __future__ import annotations

import array
import json
import math
import os
import random
import struct
import wave

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
PUBLIC = os.path.join(ROOT, "public")
OUT = os.path.join(PUBLIC, "audio")

LEAD = 0.45
TAIL = 0.70

# --------------------------------------------------------------------------- wav io


def read_audio(path: str):
    """Decode a RIFF/WAVE file (PCM 8/16/24/32-bit or float32) to mono float32 @ SR."""
    with open(path, "rb") as fh:
        blob = fh.read()
    if blob[:4] != b"RIFF" or blob[8:12] != b"WAVE":
        raise ValueError(f"{path}: not a RIFF/WAVE file")

    fmt = None
    pcm = None
    pos = 12
    while pos + 8 <= len(blob):
        cid = blob[pos : pos + 4]
        size = struct.unpack("<I", blob[pos + 4 : pos + 8])[0]
        body = blob[pos + 8 : pos + 8 + size]
        if cid == b"fmt ":
            fmt = body
        elif cid == b"data":
            pcm = body
        pos += 8 + size + (size & 1)
    if fmt is None or pcm is None:
        raise ValueError(f"{path}: missing fmt/data chunk")

    tag, channels, rate, _, block_align, bits = struct.unpack("<HHIIHH", fmt[:16])
    if tag == 0xFFFE and len(fmt) >= 40:  # WAVE_FORMAT_EXTENSIBLE
        tag = struct.unpack("<H", fmt[24:26])[0]

    if tag == 3 and bits == 32:
        count = len(pcm) // 4
        vals = array.array("f")
        vals.frombytes(pcm[: count * 4])
    elif tag == 1 and bits == 16:
        count = len(pcm) // 2
        ints = array.array("h")
        ints.frombytes(pcm[: count * 2])
        vals = array.array("f", (v / 32768.0 for v in ints))
    elif tag == 1 and bits == 24:
        count = len(pcm) // 3
        vals = array.array("f")
        for i in range(count):
            b0, b1, b2 = pcm[3 * i], pcm[3 * i + 1], pcm[3 * i + 2]
            v = (b2 << 16) | (b1 << 8) | b0
            if v & 0x800000:
                v -= 1 << 24
            vals.append(v / 8388608.0)
    elif tag == 1 and bits == 32:
        count = len(pcm) // 4
        ints = array.array("i")
        ints.frombytes(pcm[: count * 4])
        vals = array.array("f", (v / 2147483648.0 for v in ints))
    elif tag == 1 and bits == 8:
        vals = array.array("f", ((v - 128) / 128.0 for v in pcm))
    else:
        raise ValueError(f"{path}: unsupported wav format tag={tag} bits={bits}")

    # downmix
    if channels > 1:
        mono = array.array("f", [0.0]) * (len(vals) // channels)
        for c in range(channels):
            idx = c
            for i in range(len(mono)):
                mono[i] += vals[idx] / channels
                idx += channels
        vals = mono

    # linear resample to SR
    if rate != SR and len(vals) > 1:
        ratio = SR / float(rate)
        n_out = int(len(vals) * ratio)
        out = array.array("f", [0.0]) * n_out
        last = len(vals) - 1
        for i in range(n_out):
            src = i / ratio
            i0 = int(src)
            if i0 >= last:
                out[i] = vals[last]
            else:
                frac = src - i0
                out[i] = vals[i0] * (1 - frac) + vals[i0 + 1] * frac
        vals = out
    return vals


def write_wav_stereo(path: str, left, right):
    n = min(len(left), len(right))
    data = array.array("h", [0]) * (n * 2)
    for i in range(n):
        l = max(-1.0, min(1.0, left[i]))
        r = max(-1.0, min(1.0, right[i]))
        data[2 * i] = int(l * 32767)
        data[2 * i + 1] = int(r * 32767)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


# --------------------------------------------------------------------------- helpers


def db(x):
    return 10 ** (x / 20.0)


def smoothstep(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


class Buf:
    """Simple mono float buffer with additive mixing helpers."""

    def __init__(self, seconds: float):
        self.n = int(seconds * SR)
        self.data = array.array("f", [0.0]) * self.n

    def add(self, at_sec: float, samples):
        start = int(at_sec * SR)
        if start >= self.n:
            return
        end = min(self.n, start + len(samples))
        data = self.data
        for i in range(start, end):
            data[i] += samples[i - start]


# --------------------------------------------------------------------------- score

BPM = 80.0
BEAT = 60.0 / BPM
CHORDS = [
    [110.00, 164.81, 220.00, 261.63, 329.63],  # Am9
    [87.31, 130.81, 174.61, 220.00, 261.63],   # Fmaj7
    [130.81, 196.00, 246.94, 329.63, 392.00],  # Cmaj7
    [98.00, 146.83, 196.00, 246.94, 329.63],   # G6
]
CHORD_SECONDS = 8 * BEAT


def build_score(duration: float, rng: random.Random):
    buf = Buf(duration)
    bar = int(duration / CHORD_SECONDS) + 1
    for b in range(bar):
        notes = CHORDS[b % len(CHORDS)]
        t0 = b * CHORD_SECONDS
        fade = 1.4
        att = 1.6
        length = CHORD_SECONDS + fade
        n = int(length * SR)
        seg = array.array("f", [0.0]) * n
        for k, f in enumerate(notes):
            detune = 1.0 + (k - 2) * 0.0016
            amp = 0.11 / (1 + 0.34 * k)
            phase = rng.random() * math.tau
            lfo_rate = 0.09 + 0.03 * k
            for i in range(n):
                t = i / SR
                env = smoothstep(t / att) * (1 - smoothstep((t - (length - fade)) / fade))
                wob = 1.0 + 0.0016 * math.sin(math.tau * lfo_rate * t + k)
                s = math.sin(math.tau * f * detune * t + phase)
                s += 0.22 * math.sin(math.tau * f * 2 * detune * t + phase)
                s += 0.07 * math.sin(math.tau * f * 3 * detune * t + phase)
                seg[i] += s * amp * env * wob
        buf.add(t0, seg)

    # slow pulse on the beat + airy shaker on the off-beat
    beat = 0
    while beat * BEAT < duration:
        t0 = beat * BEAT
        # sub pulse
        n = int(0.34 * SR)
        seg = array.array("f", [0.0]) * n
        for i in range(n):
            t = i / SR
            env = math.exp(-t * 11.0)
            seg[i] = math.sin(math.tau * 55.0 * t) * env * 0.16
        buf.add(t0, seg)
        # shaker
        n = int(0.09 * SR)
        seg = array.array("f", [0.0]) * n
        prev = 0.0
        for i in range(n):
            t = i / SR
            env = math.exp(-t * 55.0)
            noise = rng.random() * 2 - 1
            prev = prev * 0.55 + noise * 0.45
            seg[i] = prev * env * 0.05
        buf.add(t0 + BEAT / 2, seg)
        beat += 1

    # arpeggio sparkle
    step = 0
    while step * (BEAT / 2) < duration:
        t0 = step * (BEAT / 2)
        notes = CHORDS[int(t0 / CHORD_SECONDS) % len(CHORDS)]
        f = notes[[0, 2, 4, 2][step % 4]] * 2
        n = int(0.55 * SR)
        seg = array.array("f", [0.0]) * n
        for i in range(n):
            t = i / SR
            env = math.exp(-t * 8.0) * smoothstep(t / 0.01)
            seg[i] = math.sin(math.tau * f * t) * env * 0.028
        buf.add(t0, seg)
        step += 1
    return buf


# --------------------------------------------------------------------------- sfx


def fx_whoosh(rng, dur=0.62, amp=0.1):
    n = int(dur * SR)
    seg = array.array("f", [0.0]) * n
    prev = 0.0
    for i in range(n):
        t = i / SR
        p = t / dur
        env = smoothstep(p / 0.18) * (1 - smoothstep((p - 0.25) / 0.75))
        cutoff = 0.04 + 0.5 * math.sin(math.pi * min(1.0, p * 1.15)) ** 2
        prev = prev + cutoff * ((rng.random() * 2 - 1) - prev)
        seg[i] = prev * env * amp
    return seg


def fx_click(rng, amp=0.16, dur=0.06, freq=1500.0):
    n = int(dur * SR)
    seg = array.array("f", [0.0]) * n
    for i in range(n):
        t = i / SR
        env = math.exp(-t * 65.0)
        noise = (rng.random() * 2 - 1) * math.exp(-t * 140.0)
        tone = math.sin(math.tau * freq * t * (1 - t * 4))
        seg[i] = (noise * 0.5 + tone * 0.6) * env * amp
    return seg


def fx_blip(f0, f1, dur, amp, decay=9.0):
    n = int(dur * SR)
    seg = array.array("f", [0.0]) * n
    phase = 0.0
    for i in range(n):
        t = i / SR
        f = f0 + (f1 - f0) * (t / dur)
        phase += math.tau * f / SR
        env = math.exp(-t * decay) * smoothstep(t / 0.006)
        seg[i] = math.sin(phase) * env * amp
    return seg


def fx_impact(rng, amp=0.34):
    n = int(1.1 * SR)
    seg = array.array("f", [0.0]) * n
    phase = 0.0
    prev = 0.0
    for i in range(n):
        t = i / SR
        f = 62.0 * math.exp(-t * 1.2) + 32.0
        phase += math.tau * f / SR
        env = math.exp(-t * 3.4)
        prev = prev * 0.86 + (rng.random() * 2 - 1) * 0.14
        seg[i] = (math.sin(phase) * 0.85 + prev * 0.5) * env * amp
    return seg


def fx_riser(rng, dur=1.3, amp=0.1):
    n = int(dur * SR)
    seg = array.array("f", [0.0]) * n
    prev = 0.0
    for i in range(n):
        t = i / SR
        p = t / dur
        cutoff = 0.02 + 0.55 * p**2
        prev = prev + cutoff * ((rng.random() * 2 - 1) - prev)
        tone = math.sin(math.tau * (220 + 660 * p**2) * t) * 0.35
        seg[i] = (prev + tone) * (p**1.6) * amp
    return seg


# --------------------------------------------------------------------------- mix


def main():
    with open(os.path.join(DATA, "script.json")) as fh:
        script = json.load(fh)
    with open(os.path.join(DATA, "narration.json")) as fh:
        narration = json.load(fh).get("scenes", {})

    scenes = []
    cursor = 0.0
    for scene in script["scenes"]:
        entry = narration.get(scene["id"])
        ndur = float(entry["duration"]) if entry else 0.0
        dur = max(float(scene["minSeconds"]), LEAD + ndur + TAIL)
        scenes.append({"id": scene["id"], "start": cursor, "dur": dur, "narr": entry, "ndur": ndur})
        cursor += dur
    total = cursor + 0.2

    rng = random.Random(20261117)
    score = build_score(total, rng)
    fx = Buf(total)

    # ---- sound effects on the animation beats (seconds inside each scene)
    schedule = {
        "open": [("impact", 0.05), ("click", 1.25)],
        "sign": [("click", 1.10), ("click", 1.19), ("click", 1.28), ("click", 1.37), ("blip", 2.65), ("whoosh", 4.95)],
        "positive": [("click", 1.50), ("click", 1.59), ("click", 1.68), ("click", 1.77), ("blip", 5.05)],
        "flip": [("whoosh", 0.10), ("click", 2.25), ("click", 2.59), ("click", 2.93), ("click", 3.27), ("blip", 5.10)],
        "addone": [("click", 2.10), ("click", 4.05), ("blip", 5.10)],
        "proof": [("click", 3.35), ("click", 3.67), ("click", 3.99), ("click", 4.31), ("blip", 4.75), ("whoosh", 6.40)],
        "range": [("whoosh", 0.12)],
        "recap": [("click", 1.00), ("click", 1.34), ("click", 1.68), ("riser", 4.30), ("impact", 5.10)],
    }
    log = []
    for scene in scenes:
        for kind, offset in schedule.get(scene["id"], []):
            at = scene["start"] + offset
            if kind == "whoosh":
                seg = fx_whoosh(rng)
            elif kind == "click":
                seg = fx_click(rng)
            elif kind == "impact":
                seg = fx_impact(rng)
            elif kind == "riser":
                seg = fx_riser(rng)
            else:
                seg = fx_blip(520, 980, 0.22, 0.2, decay=7.0)
            fx.add(at, seg)
            log.append({"scene": scene["id"], "kind": kind, "time": round(at, 3)})

    # range scene: a tick for every value that lands on the wheel
    range_scene = next((s for s in scenes if s["id"] == "range"), None)
    if range_scene:
        for i in range(0, 16, 1):
            seg = fx_click(rng, amp=0.055, dur=0.045, freq=2200 + i * 40)
            at = range_scene["start"] + 1.35 + i * 0.045
            fx.add(at, seg)
            log.append({"scene": "range", "kind": "tick", "time": round(at, 3)})

    # ---- narration
    voice = Buf(total)
    placed = []
    for scene in scenes:
        entry = scene["narr"]
        if not entry:
            continue
        path = os.path.join(PUBLIC, entry["file"])
        if not os.path.exists(path):
            print(f"missing narration: {path}")
            continue
        clip = read_audio(path)
        at = scene["start"] + LEAD
        voice.add(at, clip)
        placed.append({"scene": scene["id"], "start": round(at, 3), "duration": round(len(clip) / SR, 3)})

    # ---- ducking envelope from the voice track
    duck = array.array("f", [0.0]) * voice.n
    win = int(0.18 * SR)
    level = 0.0
    tap = 0.0
    for i in range(voice.n):
        v = abs(voice.data[i])
        level = max(v, level * 0.99965)
        tap = level
        duck[i] = tap
    # normalise and smooth the envelope
    peak = max(duck) or 1.0
    smoothing = int(0.22 * SR)
    acc = 0.0
    coef = 1.0 / smoothing
    for i in range(voice.n):
        target = min(1.0, (duck[i] / peak) * 3.2)
        acc += (target - acc) * coef
        duck[i] = acc

    # ---- balance: keep the score ~14 dB under the voice
    def rms(buf):
        if not len(buf):
            return 0.0
        return math.sqrt(sum(v * v for v in buf) / len(buf))

    active = [voice.data[i] for i in range(0, voice.n, 37) if duck[i] > 0.5]
    voice_rms = rms(active) if active else 0.05
    score_rms = rms(score.data) or 0.05
    fx_rms = rms(fx.data) or 0.05
    voice_gain = db(-17.0) / max(voice_rms, 1e-4)
    bed_gain = (voice_rms * voice_gain * db(-14.0)) / max(score_rms, 1e-6)
    fx_gain = (voice_rms * voice_gain * db(-8.0)) / max(fx_rms, 1e-6)

    # ---- assemble
    left = array.array("f", [0.0]) * voice.n
    right = array.array("f", [0.0]) * voice.n
    delay = int(0.011 * SR)
    for i in range(voice.n):
        d = duck[i]
        bed = score.data[i] * bed_gain * (1.0 - 0.55 * d)
        l = bed + fx.data[i] * fx_gain + voice.data[i] * voice_gain
        r = bed * 0.96 + fx.data[i] * fx_gain + voice.data[i] * voice_gain
        if i >= delay:
            r += score.data[i - delay] * bed_gain * 0.22 * (1.0 - 0.55 * d)
        left[i] = l
        right[i] = r

    # soft limiter + peak normalisation
    peak = 0.0
    for i in range(voice.n):
        v = max(abs(left[i]), abs(right[i]))
        if v > peak:
            peak = v
    gain = (10 ** (-1.0 / 20.0)) / peak if peak > 0 else 1.0
    for i in range(voice.n):
        left[i] *= gain
        right[i] *= gain

    os.makedirs(OUT, exist_ok=True)
    master = "audio/master.wav"
    write_wav_stereo(os.path.join(PUBLIC, master), left, right)

    with open(os.path.join(DATA, "audio.json"), "w") as fh:
        json.dump(
            {
                "master": master,
                "duration": round(voice.n / SR, 3),
                "score": {"bpm": BPM, "chords": ["Am9", "Fmaj7", "Cmaj7", "G6"], "bedDb": -13.0},
                "narrationPlaced": placed,
            },
            fh,
            indent=2,
        )
        fh.write("\n")

    with open(os.path.join(DATA, "sfx_schedule.json"), "w") as fh:
        json.dump({"events": sorted(log, key=lambda e: e["time"])}, fh, indent=2)
        fh.write("\n")

    print(f"master: public/{master}  ({voice.n / SR:.2f}s, peak gain {gain:.3f})")
    print(f"narration clips placed: {len(placed)}")


if __name__ == "__main__":
    main()
