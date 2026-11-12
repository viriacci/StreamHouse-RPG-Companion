#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  python3 scripts/start-local.py
elif command -v node >/dev/null 2>&1; then
  if [[ ! -f rozgrywka/assets/premium-atlases.js ]]; then bash scripts/unpack-media.sh; fi
  node scripts/start-local.mjs
else
  echo 'Zainstaluj Python 3 lub Node.js i uruchom ponownie.' >&2
  exit 1
fi
