#!/usr/bin/env bash
# Fetches the acoustic model used by scripts/align_words.py:
# OpenAI Whisper "small" (multilingual) converted to CTranslate2/int8, which is
# published on npm in four parts (MIT). ~250 MB, cached outside of git.
set -euo pipefail
cd "$(dirname "$0")/.."
DST=".cache/whisper-small-ct2"
if [ -f "$DST/model.bin" ]; then echo "model already present: $DST"; exit 0; fi
TMP=$(mktemp -d)
mkdir -p "$DST"
for i in 0 1 2 3; do
  (cd "$TMP" && npm pack --silent "@skillninja/shortmovie-telop-model-p$i@1.0.0" >/dev/null)
  mkdir -p "$TMP/p$i" && tar xzf "$TMP"/skillninja-shortmovie-telop-model-p$i-1.0.0.tgz -C "$TMP/p$i"
done
cat "$TMP"/p{0,1,2,3}/package/model.bin.part* > "$DST/model.bin"
cp "$TMP"/p0/package/{config.json,preprocessor_config.json,tokenizer.json,vocabulary.json} "$DST/"
echo "$(cat "$TMP/p0/package/model.sha256" | awk '{print $1}')  $DST/model.bin" | sha256sum -c -
rm -rf "$TMP"
echo "model ready: $DST"
