#!/usr/bin/env bash
# Wdrożenie wyłącznie plików publicznych, bez SQL, testów, README i .git.
set -euo pipefail
PROJECT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_ROOT="${STREAMHOUSE_SITE_ROOT:-/var/www/streamhouse}"
CONFIG="${STREAMHOUSE_RUNTIME_CONFIG:-/etc/streamhouse/cloud-config.local.js}"
cd "$PROJECT"
[[ -f rozgrywka/assets/premium-atlases.js ]] || bash scripts/unpack-media.sh
python3 scripts/check-project.py
release_id="$(date -u +%Y%m%d%H%M%S)-$$"
release="$SITE_ROOT/releases/$release_id"
mkdir -p "$release" "$SITE_ROOT/releases"
# Przenoś tylko dokumenty i zasoby przeznaczone do publicznego serwowania.
for f in index.html StreamHouse-Portal.html Kreator-Postaci.html Katalog-Rycin-PD.html; do
  install -m 0644 "$f" "$release/$f"
done
for dir in assets rozgrywka pokoj gotowe-karty; do
  rsync -a --exclude='*.bak' "$dir/" "$release/$dir/"
done
# Zewnętrzna konfiguracja pozostaje niezmieniona przy git pull.
if [[ -f "$CONFIG" ]]; then
  install -m 0644 "$CONFIG" "$release/assets/cloud-config.local.js"
else
  echo 'UWAGA: /etc/streamhouse/cloud-config.local.js nie istnieje. Dostępny jest wyłącznie tryb lokalny.' >&2
fi
# Atomowy przełącznik na nową wersję.
ln -sfn "releases/$release_id" "$SITE_ROOT/.current-next"
mv -Tf "$SITE_ROOT/.current-next" "$SITE_ROOT/current"
# Dla statycznego Nginx pliki muszą być czytelne dla www-data.
chmod -R a+rX "$release"
echo "OK: uruchomiono wydanie $release_id w $SITE_ROOT/current"
