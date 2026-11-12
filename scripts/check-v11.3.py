#!/usr/bin/env python3
"""Guardrails for the v11.3 visual simplification."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parent.parent
for f in ['StreamHouse-v21-MG.html','StreamHouse-v21-Gracz.html']:
 s=(ROOT/'rozgrywka'/f).read_text(encoding='utf-8')
 assert not re.search(r'<nav\b[^>]*class=\"rail\"',s),f
 assert s.count('class=\"sh-leave-room\"')==1,f
 assert 'href=\"../StreamHouse-Portal.html#campaigns\"' in s,f
 assert 'minmax(235px,290px)' in s and '@media(max-width:750px)' in s,f
p=(ROOT/'pokoj/index.html').read_text(encoding='utf-8')
assert '← Opuść pokój</a>' in p
p=(ROOT/'StreamHouse-Portal.html').read_text(encoding='utf-8')
assert 'Pokój fabularny v21' not in p and 'Wejdź do świata' in p
assert '.dialog .form-fields .field > span.field-note' in p
assert 'const inset=.065;' in (ROOT/'assets/welcome-d20.js').read_text()
assert 'const inset=.11;' in (ROOT/'rozgrywka/assets/premium-canvas.js').read_text()
gl=(ROOT/'rozgrywka/assets/premium-webgl.js').read_text()
assert 'mul(sub(p,center),.885)' in gl and 'const radius=.0145' in gl
print('OK: 7 kontroli regresji v11.3')
