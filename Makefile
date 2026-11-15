PYTHON ?= $(shell if [ -x .venv/bin/python ]; then echo .venv/bin/python; else command -v python3; fi)
NODE ?= node

.PHONY: all timeline prepare audio render mux stills test clean preview

all: mux

timeline:
	$(PYTHON) scripts/build_timeline.py

prepare: timeline
	$(NODE) scripts/prepare.mjs

audio: timeline
	$(PYTHON) scripts/build_audio.py

render: prepare
	$(NODE) render.mjs --out out/video_silent.mp4

mux: render audio
	$(NODE) scripts/mux.mjs

stills: prepare
	$(NODE) render.mjs --stills 4,14,29,40,53,67,77,87,96,101

test: prepare audio
	$(NODE) scripts/validate.mjs

preview:
	$(NODE) scripts/preview.mjs

clean:
	rm -rf src/fonts.css src/data out/stills out/video_silent.mp4 out/audio_master.wav out/*.log
