#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
git pull --ff-only origin main
bash scripts/unpack-media.sh
sudo bash scripts/deploy.sh
sudo nginx -t
sudo systemctl reload nginx
echo 'StreamHouse: aktualizacja zakończona.'
