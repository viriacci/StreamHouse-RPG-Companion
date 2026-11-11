#!/usr/bin/env python3
"""Kontrola kompletności publicznych dokumentów i podstawowych ścieżek."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import sys

ROOT=Path(__file__).resolve().parent.parent
PUBLIC=['index.html','StreamHouse-Portal.html','Kreator-Postaci.html','Katalog-Rycin-PD.html',
        'pokoj/index.html','rozgrywka/StreamHouse-v21-MG.html','rozgrywka/StreamHouse-v21-Gracz.html',
        'rozgrywka/StreamHouse-v21-Pracownia-Kosci.html','rozgrywka/StreamHouse-v21-Dziennik.html']

class Scanner(HTMLParser):
    def __init__(self):
        super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        data=dict(attrs)
        for attr in ('href','src'):
            value=data.get(attr)
            if value and not value.startswith(('#','mailto:','tel:','data:','javascript:')):
                self.links.append((attr,value))

def check():
    errors=[];count=0
    for f in PUBLIC:
        path=ROOT/f
        if not path.exists(): errors.append(f'Brakuje strony: {f}');continue
        parser=Scanner();parser.feed(path.read_text(encoding='utf-8'))
        for attr,ref in parser.links:
            u=urlsplit(ref)
            if u.scheme or u.netloc or not u.path or '${' in u.path:continue
            name=unquote(u.path)
            if name.startswith('/'): target=ROOT/name.lstrip('/')
            else:target=path.parent/name
            if not target.exists():errors.append(f'Brak zasobu: {f} -> {ref}')
            count+=1
    extras=['assets/room.js','assets/cloud.js','assets/cloud-config.local.js','gotowe-karty/manifest.json',
            'rozgrywka/assets/premium-atlases.js','rozgrywka/assets/premium-library.js',
            'supabase/migrations/20261110190000_streamhouse_private_campaigns.sql',
            'supabase/migrations/20261110230000_streamhouse_live_room.sql',
            'supabase/migrations/20261110235000_streamhouse_character_state.sql']
    for item in extras:
        if not (ROOT/item).exists():errors.append('Brak kluczowego pliku: '+item)
    if errors:
        print('\n'.join(errors),file=sys.stderr);return 1
    print(f'OK: {len(PUBLIC)} ekranów, {count} odnośników i zasobów oraz pliki migracji.')
    return 0
if __name__=='__main__':sys.exit(check())
