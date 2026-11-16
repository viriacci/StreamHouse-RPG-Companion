#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
OUT="${1:-dist/seohost-sh1}"
rm -rf "$OUT"
mkdir -p "$OUT/admin/assets" "$OUT/admin/control-center" "$OUT/testrpg/assets"

# Testowa wersja RPG. Brak danych i kluczy produkcyjnego Supabase.
for f in index.html StreamHouse-Portal.html Kreator-Postaci.html Katalog-Rycin-PD.html favicon.ico; do
  cp "$f" "$OUT/testrpg/$f"
done
cp -a assets rozgrywka pokoj gotowe-karty admin control-center "$OUT/testrpg/"

# Panel ma osobny katalog główny na subdomenie admin.
# Linki w plikach źródłowych są względne do /admin/ na stagingu RPG.
# Po wdrożeniu na osobną subdomenę ścieżki muszą być względne do /.
sed -e 's@href="../assets/@href="assets/@g' \
    -e 's@src="../assets/@src="assets/@g' \
    -e 's@href="../StreamHouse-Portal.html"@href="https://testrpg.panszczesniak.pl/StreamHouse-Portal.html"@g' \
    admin/index.html > "$OUT/admin/index.html"
cp admin/admin.css "$OUT/admin/admin.css"
sed 's@../control-center/projects.example.json@control-center/projects.example.json@g' \
  admin/admin.js > "$OUT/admin/admin.js"
cp assets/cloud.js assets/favicon.svg assets/favicon-32.png "$OUT/admin/assets/"
cp control-center/projects.example.json "$OUT/admin/control-center/"

# Bezpieczny tryb demonstracyjny; backend i produkcyjne Supabase są ODŁĄCZONE.
for folder in "$OUT/admin" "$OUT/testrpg"; do
  cat > "$folder/assets/cloud-config.js" <<'EOF'
window.STREAMHOUSE_CLOUD_DEFAULT_CONFIG=Object.freeze({url:'',publishableKey:''});
window.STREAMHOUSE_CLOUD_CONFIG=window.STREAMHOUSE_CLOUD_DEFAULT_CONFIG;
EOF
  cat > "$folder/assets/cloud-config.local.js" <<'EOF'
window.STREAMHOUSE_CLOUD_CONFIG={url:'',publishableKey:''};
window.STREAMHOUSE_ADMIN_ENV='staging';
window.STREAMHOUSE_ADMIN_DEMO=true;
EOF
done
test -f "$OUT/admin/index.html"
test -f "$OUT/admin/admin.js"
test -f "$OUT/admin/control-center/projects.example.json"
test -f "$OUT/testrpg/StreamHouse-Portal.html"
node --check "$OUT/admin/admin.js"
node --check "$OUT/testrpg/admin/admin.js"
python3 - "$OUT" <<'PY'
import json,sys
from pathlib import Path
p=Path(sys.argv[1])
data=json.loads((p/'admin/control-center/projects.example.json').read_text())
assert data['control_center']['deployments_enabled'] is False
assert all(not v['publish_enabled'] for t in data['projects'] for v in (t['production'],t['staging']))
for part in ('admin','testrpg'):
 for cfg in ('cloud-config.js','cloud-config.local.js'):
  assert 'xqfglhaapojxnjdmxkrm' not in (p/part/'assets'/cfg).read_text()
print('OK: niezależny panel i RPG przygotowane na SEOHOST SH1 w trybie demo')
PY
