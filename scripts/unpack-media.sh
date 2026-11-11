#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ ! -d bundles ]] || ! compgen -G 'bundles/media.part*' > /dev/null; then
  echo 'Brak paczek bundles/media.part*. Sprawdź kompletność repozytorium.' >&2
  exit 1
fi
archive="$(mktemp --suffix=.zip)"
trap 'rm -f "$archive"' EXIT
cat bundles/media.part* > "$archive"
expected="$(cat bundles/media.sha256)"
actual="$(sha256sum "$archive" | awk '{print $1}')"
if [[ "$expected" != "$actual" ]]; then
  echo "Błąd sumy kontrolnej: oczekiwano $expected, otrzymano $actual" >&2
  exit 1
fi
unzip -qo "$archive" -d .
echo 'OK: zasoby graficzne i silnik kości zostały odtworzone.'
