#!/usr/bin/env bash
set -euo pipefail
PROJECT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
STAGING_ROOT="${STREAMHOUSE_STAGING_ROOT:-/var/www/streamhouse-staging}"
STAGING_CONFIG="${STREAMHOUSE_STAGING_CONFIG:-/etc/streamhouse/staging-cloud-config.local.js}"
PROD_CONFIG="${STREAMHOUSE_RUNTIME_CONFIG:-/etc/streamhouse/cloud-config.local.js}"
STAGING_PROJECT_REF="${STREAMHOUSE_STAGING_PROJECT_REF:-}"
STAGING_PORT="${STREAMHOUSE_STAGING_PORT:-8091}"
PROD_PROJECT_REF="xqfglhaapojxnjdmxkrm"
BRANCH="feature/admin-staging-v11.11"
if [[ "$EUID" -ne 0 ]]; then
  echo 'Uruchom: sudo -E bash scripts/deploy-staging.sh' >&2
  exit 1
fi
case "$STAGING_ROOT" in
  /var/www/streamhouse|/var/www/streamhouse/|/var/www/streamhouse/*)
    echo 'Błąd: staging wskazuje na produkcyjny katalog.' >&2;exit 1;;
esac
if [[ -z "$STAGING_ROOT" || "$STAGING_ROOT" == "/" ]];then exit 1;fi
if ! [[ "$STAGING_PORT" =~ ^[0-9]{4,5}$ ]] || (( STAGING_PORT < 1024 || STAGING_PORT > 65535 ));then
  echo 'Niepoprawny port staging.' >&2;exit 1
fi
cd "$PROJECT"
branch_name="$(git -c safe.directory="$PROJECT" symbolic-ref --quiet --short HEAD || true)"
if [[ "$branch_name" != "$BRANCH" ]];then
  printf 'Błąd: wymagany branch %s (wykryto %s)\n' "$BRANCH" "$branch_name" >&2;exit 1
fi
if [[ ! -f rozgrywka/assets/premium-atlases.js ]];then
  echo 'Rozpakuj zasoby: bash scripts/unpack-media.sh' >&2;exit 1
fi
python3 scripts/check-project.py
python3 scripts/check-admin.py
if [[ -f "$STAGING_CONFIG" ]];then
  if [[ -z "$STAGING_PROJECT_REF" || ! "$STAGING_PROJECT_REF" =~ ^[a-z0-9]{20}$ ||
       "$STAGING_PROJECT_REF" == "$PROD_PROJECT_REF" ]];then
    echo 'Podaj oddzielny STREAMHOUSE_STAGING_PROJECT_REF (nie produkcyjny).' >&2;exit 1
  fi
  if grep -Fq "$PROD_PROJECT_REF" "$STAGING_CONFIG" ||
     { [[ -f "$PROD_CONFIG" ]] && cmp -s "$STAGING_CONFIG" "$PROD_CONFIG"; };then
    echo 'Odmowa: konfiguracja staging używa bazy produkcyjnej.' >&2;exit 1
  fi
  if ! grep -Fq "https://${STAGING_PROJECT_REF}.supabase.co" "$STAGING_CONFIG";then
    echo 'Konfiguracja staging nie wskazuje oczekiwanego projektu Supabase.' >&2;exit 1
  fi
fi
release_id="$(date -u +%Y%m%d%H%M%S)-$$"
release="$STAGING_ROOT/releases/$release_id"
install -d -m 0755 "$release" "$STAGING_ROOT/releases"
for f in index.html StreamHouse-Portal.html Kreator-Postaci.html Katalog-Rycin-PD.html favicon.ico;do
  install -m 0644 "$f" "$release/$f"
done
for dir in assets rozgrywka pokoj gotowe-karty admin control-center;do
  install -d -m 0755 "$release/$dir"
  rsync -a --exclude='*.bak' "$dir/" "$release/$dir/"
done
cat > "$release/assets/cloud-config.js" <<'EOF'
window.STREAMHOUSE_CLOUD_DEFAULT_CONFIG=Object.freeze({url:'',publishableKey:''});
window.STREAMHOUSE_CLOUD_CONFIG=window.STREAMHOUSE_CLOUD_DEFAULT_CONFIG;
EOF
if [[ -f "$STAGING_CONFIG" ]];then
  install -m 0644 "$STAGING_CONFIG" "$release/assets/cloud-config.local.js"
  printf "\nwindow.STREAMHOUSE_ADMIN_ENV='staging';window.STREAMHOUSE_ADMIN_DEMO=false;\n" >> "$release/assets/cloud-config.local.js"
  mode="STAGING DB"
else
  cat > "$release/assets/cloud-config.local.js" <<'EOF'
window.STREAMHOUSE_CLOUD_CONFIG={url:'',publishableKey:''};
window.STREAMHOUSE_ADMIN_ENV='staging';
window.STREAMHOUSE_ADMIN_DEMO=true;
EOF
  mode="DEMO OFFLINE"
fi
if grep -Fq "$PROD_PROJECT_REF" "$release/assets/cloud-config.js" ||
   grep -Fq "$PROD_PROJECT_REF" "$release/assets/cloud-config.local.js";then
  echo 'Odmowa: wykryto produkcyjny projekt w configu staging.' >&2
  rm -rf -- "$release";exit 1
fi
chmod -R a+rX "$release"
ln -sfn "releases/$release_id" "$STAGING_ROOT/.next"
mv -Tf "$STAGING_ROOT/.next" "$STAGING_ROOT/current"
cat >/etc/systemd/system/streamhouse-staging.service <<EOF
[Unit]
Description=StreamHouse staging (localhost only)
After=network.target
[Service]
Type=simple
User=www-data
Group=www-data
ExecStart=/usr/bin/python3 -m http.server $STAGING_PORT --bind 127.0.0.1 --directory $STAGING_ROOT/current
Restart=on-failure
RestartSec=2
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now streamhouse-staging.service
systemctl restart streamhouse-staging.service
sleep 1
curl -fsS --max-time 6 "http://127.0.0.1:$STAGING_PORT/admin/" >/dev/null
printf 'OK: wersja testowa %s (%s)\n' "$release_id" "$mode"
printf 'Dostęp przez tunel: ssh -L %s:127.0.0.1:%s UZYTKOWNIK@VPS\n' "$STAGING_PORT" "$STAGING_PORT"
printf 'Następnie: http://localhost:%s/admin/\n' "$STAGING_PORT"
printf 'Nie zmieniono main, Nginx ani /var/www/streamhouse/current.\n'
