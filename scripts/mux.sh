#!/usr/bin/env bash
# Final master: full-range frames -> limited-range BT.709 H.264 + the mixed audio.
set -euo pipefail
cd "$(dirname "$0")/.."
FF=$(.venv/bin/python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
TARGET="out/Basic-to-Advanced-Mathematics-Course-Promo-BN-1080p.mp4"
"$FF" -y -loglevel error \
  -i out/video_silent.mp4 -i out/audio_master.wav \
  -map 0:v:0 -map 1:a:0 \
  -vf "scale=in_range=full:out_range=limited:out_color_matrix=bt709:flags=bicubic,format=yuv420p" \
  -c:v libx264 -preset medium -crf 15 -profile:v high -level 4.1 -g 60 -bf 2 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -movflags +faststart -shortest "$TARGET"
echo "wrote $TARGET"
ls -lh "$TARGET"
