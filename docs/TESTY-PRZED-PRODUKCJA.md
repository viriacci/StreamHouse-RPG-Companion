# Testy przed udostępnieniem online

## Lokalnie

1. `bash scripts/unpack-media.sh` i `python3 scripts/check-project.py` bez błędów.
2. `python3 -m http.server 8000`; otwórz `http://localhost:8000` i przejdź przez stronę główną, portal, kreator, pokój fabularny i taktyczny, panel v21 oraz Pracownię Kości.
3. Sprawdź `DevTools → Console/Network`: brak błędów 404 dla zasobów aplikacji i brak błędów JS (nie skonfigurowany Supabase oznacza świadomie niedostępne funkcje online).
4. Upewnij się, że zwykły tryb fabularny działa bez mapy i nie wymusza pionków.

## Online: dwie osobne osoby/urządzenia

1. Zaloguj użytkownika A i B przez Discord; sprawdź, czy nie współdzielą sesji.
2. A tworzy kampanię i zaprasza B. B dołącza tylko przez poprawny, aktualny link.
3. A i B otwierają **tę samą** kampanię w pokoju fabularnym: wiadomości, inicjatywa, sceny i rzuty synchronizują się w obu przeglądarkach. Zmień layout u B na taktyczny: stan kroniki zostaje.
4. Postać A nie jest prywatnie widoczna dla B do czasu wyraźnego udostępnienia w kampanii. Po udostępnieniu B widzi kartę w dozwolonym zakresie.
5. B nie może zmienić sceny MG, jego notatek, właściciela kampanii, wyniku rzutu ani cudzej prywatnej karty przez bezpośrednie żądania API. Samo ukrycie przycisków nie wystarcza.
6. Sprawdź uprawnienia RLS, wygasanie tokenu zaproszenia, limit użyć, konflikt równoczesnej edycji, wylogowanie i wygaśnięcie sesji.
7. Po odświeżeniu obu stron zapisy pozostają w bazie. Odłącz/reconnect sieć: Realtime i okresowe odświeżanie odtwarzają stan.
8. Na telefonie sprawdź lokalizację przycisków, dostępność, mapę jako opcję i stabilność rzutów 3D.

Zobacz także: `supabase/SCENARIUSZE-TESTOW-BEZPIECZENSTWA.txt`, `supabase/TESTY-v8-PRZED-WDROZENIEM.txt`, `supabase/TESTY-v9-PRZED-WDROZENIEM.txt`.

**Nie oznaczaj produkcji jako zweryfikowanej**, dopóki nie przejdzie test na rzeczywistym Supabase oraz dwóch różnych kontach Discord.
