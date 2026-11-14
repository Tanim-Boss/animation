#!/usr/bin/env bash
# Mixes the narration with the procedural score (with side-chain ducking) and
# produces the final 48 kHz master audio track.
set -euo pipefail
cd "$(dirname "$0")/.."

FF=$(.venv/bin/python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
VO="Generated Audio November 13, 2026 - 7_35PM.wav"
BED="data/bed.wav"
OUT="out/audio_master.wav"
DUR=81.0

mkdir -p out

"$FF" -y -loglevel error \
  -i "$VO" -i "$BED" \
  -filter_complex "
    [0:a]aresample=48000,highpass=f=95,lowpass=f=13500,
         equalizer=f=280:t=q:w=0.9:g=-1.8,
         equalizer=f=2800:t=q:w=1.1:g=1.8,
         acompressor=threshold=-20dB:ratio=2.4:attack=6:release=190:makeup=2,
         apad,atrim=0:${DUR},aformat=sample_fmts=fltp:channel_layouts=stereo[vo];
    [1:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[bed];
    [bed][vo]sidechaincompress=threshold=0.045:ratio=3.2:attack=22:release=420:makeup=1[bedd];
    [vo][bedd]amix=inputs=2:duration=longest:weights=1 0.78:normalize=0,
    loudnorm=I=-15:TP=-1.0:LRA=11,
    alimiter=limit=0.95:level=disabled
  " -t ${DUR} -ar 48000 -ac 2 -c:a pcm_s16le "$OUT"

echo "wrote $OUT"
"$FF" -hide_banner -i "$OUT" -af "ebur128=peak=true" -f null - 2>&1 | grep -A6 "Summary" | tail -8
