NODE ?= node
PYTHON ?= $(shell if [ -x .venv/bin/python ]; then echo .venv/bin/python; else command -v python3; fi)

.PHONY: all setup audio stills render typecheck clean

all: render

setup:
	$(NODE) scripts/prepare-browser.mjs
	$(NODE) scripts/make-grain.mjs

audio:
	$(PYTHON) scripts/build_audio.py

stills: setup
	$(NODE) scripts/stills.mjs --times=3,12,25,37,49,62,75,85

typecheck:
	$(NODE) node_modules/typescript/bin/tsc --noEmit

render: setup audio
	$(NODE) scripts/render.mjs

clean:
	rm -rf out/stills out/test*.mp4 public/audio/master.wav src/film/*.js
