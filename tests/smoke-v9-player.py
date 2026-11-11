from playwright.sync_api import sync_playwright
from pathlib import Path
import re
root=Path(__file__).resolve().parent.parent
html=re.sub(r'<script\b[^>]*src="[^"]+"[^>]*></script>','',(root/'pokoj/index.html').read_text())
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 pg=b.new_page(reduced_motion='reduce');errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.set_content(html)
 pg.evaluate('''Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>null,setItem:()=>{}}});window.history.replaceState=()=>{};''')
 for f in ['assets/dice-geometry.js','assets/dice-ritual.js','assets/room.js']:
  pg.add_script_tag(content=(root/f).read_text())
 pg.add_script_tag(content=(root/'pokoj/room-ui.js').read_text().replace("const params=new URLSearchParams(location.search);","const params=new URLSearchParams('demo=camp-demo&role=player&layout=classic');"))
 pg.wait_for_timeout(500)
 assert pg.locator('#classic-panel').is_visible()
 assert not pg.locator('#gm-notes-panel').is_visible()
 assert not pg.locator('#handout-panel').is_visible()
 assert not pg.locator('#initiative-controls').is_visible()
 assert not pg.locator('#token-control').is_visible()
 assert pg.locator('.hero-entry-session').count()==2
 pg.locator('#room-mode-switch').click()
 assert pg.locator('#map-panel').is_visible()
 assert not pg.locator('#token-control').is_visible()
 print('PLAYER MOCK PASS: mode switch, no GM controls, sample heroes')
 print('JS ERRORS',errors)
 b.close()
