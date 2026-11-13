#!/usr/bin/env bash
set -euo pipefail
if [[ "${EUID}" -ne 0 ]]; then echo 'Uruchom przez sudo.' >&2; exit 1; fi
DOMAIN="${DOMAIN:-}"; EMAIL="${EMAIL:-}"
if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$ ]]; then
  echo 'Ustaw DOMAIN na prawdziwą domenę / subdomenę (bez https://).' >&2; exit 1
fi
if [[ ! "$EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  echo 'Ustaw EMAIL na adres do powiadomień o certyfikacie.' >&2; exit 1
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx git unzip rsync python3 certbot python3-certbot-nginx
mkdir -p /var/www/streamhouse/releases /etc/streamhouse
if [[ ! -e /etc/streamhouse/cloud-config.local.js ]]; then
  cat > /etc/streamhouse/cloud-config.local.js <<'JS'
// Uzupełnij wyłącznie publiczne wartości Supabase. NIE WPISUJ SECRET KEY.
window.STREAMHOUSE_CLOUD_CONFIG = {
  url: '',
  publishableKey: ''
};
JS
fi
cat > /etc/nginx/sites-available/streamhouse <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    root /var/www/streamhouse/current;
    index index.html;
    charset utf-8;
    server_tokens off;

    location / {
        try_files \$uri \$uri/ =404;
    }
    location ~ /\\. { deny all; }
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-Frame-Options SAMEORIGIN always;
}
EOF
ln -sfn /etc/nginx/sites-available/streamhouse /etc/nginx/sites-enabled/streamhouse
bash "$(dirname "${BASH_SOURCE[0]}")/deploy.sh"
nginx -t
systemctl enable --now nginx
systemctl reload nginx
certbot --nginx --redirect --non-interactive --agree-tos --email "$EMAIL" -d "$DOMAIN"
nginx -t && systemctl reload nginx
echo "StreamHouse udostępniony pod https://${DOMAIN}"
