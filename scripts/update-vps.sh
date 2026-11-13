#!/usr/bin/env bash
# StreamHouse: bezpieczna aktualizacja z GitHuba, bez zmian w konfiguracji Nginx/SSL.
set -euo pipefail
PROJECT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT"

if [[ "$EUID" -ne 0 ]]; then
  echo 'Wykonaj jako root: sudo bash scripts/update-vps.sh' >&2
  exit 1
fi
for cmd in git flock unzip rsync python3 nginx systemctl; do
  command -v "$cmd" >/dev/null || { echo "Brak polecenia: $cmd" >&2; exit 1; }
done

# Jednoczesne uruchomienie ręczne i przez timer nie może uszkodzić wydania.
exec 9>/run/lock/streamhouse-update.lock
if ! flock -n 9; then
  echo 'StreamHouse: aktualizacja już trwa w innym procesie.'
  exit 0
fi

state_dir=/var/lib/streamhouse
state_file="$state_dir/deployed.sha"
current="$(git rev-parse HEAD)"
git fetch --quiet --no-tags origin main
target="$(git rev-parse FETCH_HEAD)"

if [[ "$current" != "$target" ]]; then
  if ! git merge-base --is-ancestor "$current" "$target"; then
    echo 'StreamHouse: lokalna historia Git różni się od origin/main. Niczego nie nadpisano.' >&2
    exit 1
  fi
  git merge --ff-only "$target"
fi

# Znacznik powstaje dopiero po poprawnym zakończeniu całego wdrożenia.
if [[ -f "$state_file" ]] && [[ "$(cat "$state_file")" == "$target" ]]; then
  echo "StreamHouse: bez zmian ($(git rev-parse --short HEAD))."
  exit 0
fi

bash scripts/unpack-media.sh
bash scripts/deploy.sh
nginx -t
systemctl reload nginx
install -d -m 0755 "$state_dir"
printf '%s\n' "$target" > "$state_file"

# VPS Mikrus ma mały dysk: zachowuj tylko pięć ostatnich wydań do rollbacku.
site_root="${STREAMHOUSE_SITE_ROOT:-/var/www/streamhouse}"
if [[ -d "$site_root/releases" ]]; then
  mapfile -t releases < <(find "$site_root/releases" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r)
  if (( ${#releases[@]} > 5 )); then
    for name in "${releases[@]:5}"; do
      if [[ "$name" =~ ^[0-9]{14}-[0-9]+$ ]]; then
        rm -rf -- "$site_root/releases/$name"
      fi
    done
  fi
fi

echo "StreamHouse: wdrożono $(git rev-parse --short HEAD) ($(date '+%Y-%m-%d %H:%M:%S %Z'))."