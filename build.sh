#!/bin/sh
# Baut dist/firefox und dist/chrome aus src/ und erzeugt ZIPs.
set -eu
cd "$(dirname "$0")"

python3 tools/gen_icons.py

rm -rf dist
mkdir -p dist/firefox dist/chrome

rsync -a --exclude 'manifest.firefox.json' --exclude 'manifest.chrome.json' src/ dist/firefox/
rsync -a --exclude 'manifest.firefox.json' --exclude 'manifest.chrome.json' src/ dist/chrome/
cp src/manifest.firefox.json dist/firefox/manifest.json
cp src/manifest.chrome.json dist/chrome/manifest.json
# Firefox lädt den Chrome-Service-Worker-Einstieg nicht
rm -f dist/firefox/background/sw.js

(cd dist/firefox && zip -qr ../datenspur-firefox.zip .)
(cd dist/chrome && zip -qr ../datenspur-chrome.zip .)

echo "Fertig:"
echo "  dist/firefox/  (+ dist/datenspur-firefox.zip)"
echo "  dist/chrome/   (+ dist/datenspur-chrome.zip)"
