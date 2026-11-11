#!/usr/bin/env python3
"""Wywołaj przy publikacji kompletnego pakietu tekstur / dużych atlasów."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
root=Path(__file__).resolve().parent.parent
bundle=root/'bundles'
bundle.mkdir(exist_ok=True)
parts=list(bundle.glob('media.part*'))
for f in parts:f.unlink()
assets=[p for p in (root/'rozgrywka/assets').rglob('*') if p.is_file()]
assets += [p for p in (root/'assets/portrety').rglob('*') if p.is_file()]
for p in ['assets/emerald-d20-albedo.webp','rozgrywka/StreamHouse-v21-Pergamin.jpg','podglad-v9-fabularny.png','podglad-v9-taktyczny.png']:
 if (root/p).exists():assets.append(root/p)
zip_path=bundle/'media.full.zip'
with ZipFile(zip_path,'w',compression=ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted(assets):z.write(f,f.relative_to(root))
data=zip_path.read_bytes()
(bundle/'media.sha256').write_text(hashlib.sha256(data).hexdigest()+'\n',encoding='ascii')
for ix,off in enumerate(range(0,len(data),650000)):
 (bundle/f'media.part{ix:03}').write_bytes(data[off:off+650000])
zip_path.unlink()
print('packaged',len(assets),'assets,',len(data),'compressed bytes,',ix+1,'parts')
