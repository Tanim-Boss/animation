# Full production pipeline for the course promo.
#   make            -> timeline + assets + score + render + mux
#   make stills     -> a contact sheet of key frames
PY := .venv/bin/python

.PHONY: all assets timeline score render mix mux stills clean

all: assets score render mix mux

assets:
	$(PY) scripts/build_timeline.py
	node scripts/prepare.mjs

score:
	node scripts/build_audio.mjs

render:
	node render.mjs --out out/video_silent.mp4

mix:
	./scripts/mix_audio.sh

mux:
	./scripts/mux.sh

stills:
	node render.mjs --stills 3.6,10,19.6,23.5,26.5,31,41,49.6,55,64,72.6,79.9

clean:
	rm -rf out/stills out/video_silent.mp4 out/audio_master.wav data/bed.wav src/fonts.css src/data
