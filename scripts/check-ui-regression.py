#!/usr/bin/env python3
"""Basic v7/v21 visual regression safeguards for StreamHouse releases."""
from pathlib import Path
import sys
from html.parser import HTMLParser
BASE=Path(__file__).resolve().parent.parent
bad=[]
def must(path, min_size=1):
 p=BASE/path
 if not p.is_file() or p.stat().st_size<min_size:bad.append(f'Brak/zbyt mały plik: {path}')
 return p.read_text('utf8') if p.is_file() and p.suffix in {'.js','.html'} else ''
landing=must('index.html',28000)
login=must('StreamHouse-Portal.html',60000)
room=must('pokoj/index.html',22000)
roomjs=must('pokoj/room-ui.js',20000)
gm=must('rozgrywka/StreamHouse-v21-MG.html',280000)
player=must('rozgrywka/StreamHouse-v21-Gracz.html',260000)
workshop=must('rozgrywka/StreamHouse-v21-Pracownia-Kosci.html',15000)
welcome=must('assets/welcome-d20.js',6000)
for path,size in {
 'assets/emerald-d20-albedo.webp':300000,
 'assets/scenes/castle.svg':2000,
 'rozgrywka/assets/premium-atlases.js':7000000,
 'rozgrywka/assets/premium-library.js':1500000,
 'rozgrywka/assets/premium-webgl.js':20000,
 'rozgrywka/assets/premium-canvas.js':12000,
 'rozgrywka/assets/dice-geometry.js':4000,
 'rozgrywka/assets/malachite-source.webp':50000,
 'assets/portrety/elf-v3-1.webp':1000,
}.items():must(path,size)
checks=[
 ('D20 start', 'id="portal-die"' in landing),
 ('D20 logowanie', 'id="portal-die"' in login),
 ('PBR start', 'emerald-d20-albedo.webp' in welcome),
 ('Panel MG oryginalny', 'class="main-layout"' in gm and 'Księga scenariusza' in gm),
 ('Panel gracza oryginalny', 'class="player-layout"' in player),
 ('20 zestawów', workshop.count('data-theme=')>=20),
 ('20 zestawów na żywo', 'display-server-roll' in workshop and 'premium-dice-frame' in room),
 ('Rzut bierze wynik z serwera', 'const result=await room.roll' in roomjs),
 ('Domyślny panel offline v21', "if(!c.cloudId&&layout==='classic')" in login),
 ('Tryb taktyczny opcjonalny', "layout==='tactical'" in (BASE/'assets/room.js').read_text() or 'tactical' in room),
 ('Lokalne uruchamianie', (BASE/'Uruchom-StreamHouse.bat').is_file() and (BASE/'scripts/start-local.py').is_file()),
]
for name,passed in checks:
 if not passed:bad.append('Nie przeszedł test: '+name)
print(f'Kontrole v7/v21: {len(checks)}; błędy: {len(bad)}')
for e in bad: print('BŁĄD:',e)
raise SystemExit(bool(bad))
