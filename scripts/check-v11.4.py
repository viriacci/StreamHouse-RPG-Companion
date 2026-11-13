#!/usr/bin/env python3
"""Smoketest v11.4: wyjścia do czatu, stary wygląd pokoi, SQL i uprawnienia."""
from pathlib import Path
import re
root=Path(__file__).resolve().parent.parent
checks={
 'assets/cloud.js': ['requestFriend','listFriends','listDirectMessages','subscribeMessages','sendDirectMessage'],
 'assets/messages-ui.js': ['shm-root','shm-friends','shm-invite','shm-send','C.respondFriend','C.sendDirectMessage'],
 'assets/room-chat.js': ['sh-chat-toggle','sh-chat-form','sh_room_events','transport.online','transport.local'],
 'StreamHouse-Portal.html': ['assets/messages-ui.js','assets/messages.css','Klasyczny pokój + czat (beta)'],
 'rozgrywka/StreamHouse-v21-MG.html': ['../assets/room-chat.js','sh-leave-room'],
 'rozgrywka/StreamHouse-v21-Gracz.html': ['../assets/room-chat.js','sh-leave-room'],
 'supabase/migrations/20261113140000_streamhouse_friends_messages.sql': ['enable row level security','sh_dm_friends_read','sh_friend_request','sh_friend_respond','sh_dm_before_insert'],
}
errors=[]
for rel,terms in checks.items():
 p=root/rel
 if not p.is_file():errors.append(f'Brakuje {rel}');continue
 s=p.read_text(encoding='utf-8')
 errors += [f'{rel}: brak {x}' for x in terms if x not in s]
for rel in ['rozgrywka/StreamHouse-v21-MG.html','rozgrywka/StreamHouse-v21-Gracz.html']:
 s=(root/rel).read_text()
 if 'class="rail"' in s:errors.append(f'{rel}: wrocil usuniety pasek ikon')
 if s.count('../assets/room-chat.js')!=1:errors.append(f'{rel}: wielokrotne wstrzykniecie czatu')
if errors:
 for line in errors:print('FAIL:',line)
 raise SystemExit(1)
print(f'OK: {sum(len(v) for v in checks.values())} warunkow integracyjnych v11.4')
