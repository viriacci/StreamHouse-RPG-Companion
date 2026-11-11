from playwright.sync_api import sync_playwright
from pathlib import Path
import re, json
root=Path(__file__).resolve().parent.parent
html=(root/'pokoj/index.html').read_text()
html=re.sub(r'<script\b[^>]*src="[^"]+"[^>]*></script>','',html)
mock_store='''
window.__SH_TEST_STORE = {};
Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__SH_TEST_STORE[k]??null,setItem:(k,v)=>window.__SH_TEST_STORE[k]=String(v),removeItem:k=>delete window.__SH_TEST_STORE[k]}});
try{window.history.replaceState=function(){};}catch(e){}
window.__SH_TEST_STORE['streamhouse:portal:v1']=JSON.stringify({heroes:[{id:'hero01',name:'Ragna',kind:'Goliat',className:'Barbarzyńca',level:3,sheet:{derived:{attributes:{str:16,dex:14},hitPoints:22,startingEquipment:['Topór']}}}],campaigns:[{id:'camp-demo',name:'Cienie nad Czarnym Szlakiem'}],archive:[]});
'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1400,'height':950},reduced_motion='reduce')
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html)
 page.evaluate(mock_store)
 page.add_script_tag(content=(root/'assets/dice-geometry.js').read_text())
 page.add_script_tag(content=(root/'assets/dice-ritual.js').read_text())
 page.add_script_tag(content=(root/'assets/room.js').read_text())
 script=(root/'pokoj/room-ui.js').read_text().replace("const params=new URLSearchParams(location.search);","const params=new URLSearchParams('demo=camp-demo&role=gm&layout=classic');")
 page.add_script_tag(content=script)
 page.wait_for_timeout(750)
 print('workspace',page.locator('#workspace').is_visible(),'room error',page.locator('#room-error').inner_text())
 print('classic',page.locator('#classic-panel').is_visible(),'tactical',page.locator('#map-panel').is_visible())
 page.locator('#room-mode-switch').click();print('tactical switched',page.locator('#map-panel').is_visible())
 page.locator('#room-mode-switch').click();print('classic back',page.locator('#classic-panel').is_visible())
 print('heroes',page.locator('.hero-entry-session').count())
 page.locator('.hero-entry-session').first.click()
 print('initial HP',page.locator('#hero-hp').input_value())
 page.locator('#hero-hp').fill('9');page.locator('#hero-inventory').fill('Topór\nLina')
 page.locator('#hero-save').click();page.wait_for_timeout(300)
 print('HP after save',page.locator('#hero-hp').input_value(),'inventory after',page.locator('#hero-inventory').input_value())
 page.locator('#chat-input').fill('Test kroniki 9');page.locator('#chat-form button[type="submit"]').click();page.wait_for_timeout(300)
 print('feed',page.locator('#feed-entries').inner_text()[-130:])
 page.locator('#roll-form button[type="submit"]').click();page.wait_for_timeout(400)
 print('dice modal',page.locator('#dice-view').is_visible(),'result',page.locator('#dice-total').inner_text())
 page.locator('#dice-close').click()
 page.screenshot(path=str(root/'podglad-v9-fabularny.png'))
 page.locator('#room-mode-switch').click();page.screenshot(path=str(root/'podglad-v9-taktyczny.png'))
 print('JS ERRORS',errors)
 b.close()
