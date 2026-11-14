#!/usr/bin/env bash
set -euo pipefail
PROJECT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_ROOT="${STREAMHOUSE_SITE_ROOT:-/var/www/streamhouse}"
CONFIG="${STREAMHOUSE_RUNTIME_CONFIG:-/etc/streamhouse/cloud-config.local.js}"
cd "$PROJECT"
if [[ ! -f rozgrywka/assets/premium-atlases.js ]]; then
  echo 'Brakuje zasobów. W katalogu projektu uruchom: bash scripts/unpack-media.sh (jako właściciel repozytorium).' >&2
  exit 1
fi
python3 scripts/check-project.py
release_id="$(date -u +%Y%m%d%H%M%S)-$$"
release="$SITE_ROOT/releases/$release_id"
mkdir -p "$release" "$SITE_ROOT/releases"
install -m 0644 favicon.ico "$release/favicon.ico"
for f in index.html StreamHouse-Portal.html Kreator-Postaci.html Katalog-Rycin-PD.html; do
  install -m 0644 "$f" "$release/$f"
done
for dir in assets rozgrywka pokoj gotowe-karty; do
  rsync -a --exclude='*.bak' "$dir/" "$release/$dir/"
done
if [[ -f "$CONFIG" ]]; then
  install -m 0644 "$CONFIG" "$release/assets/cloud-config.local.js"
else
  echo 'UWAGA: /etc/streamhouse/cloud-config.local.js nie istnieje. Dostępny jest wyłącznie tryb lokalny.' >&2
fi
ln -sfn "releases/$release_id" "$SITE_ROOT/.current-next"
mv -Tf "$SITE_ROOT/.current-next" "$SITE_ROOT/current"
chmod -R a+rX "$release"
echo "OK: uruchomiono wydanie $release_id w $SITE_ROOT/current"
