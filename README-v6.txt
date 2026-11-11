STREAMHOUSE RPG COMPANION | KREATOR POSTACI V6
=============================================

NOWOŚĆ: BIBLIOTEKA GOTOWYCH POSTACI Z SERWERA

- W etapie „Tożsamość” wybierz „Gotowe postacie”.
- Kreator czyta gotowe-karty/manifest.json z serwera HTTP(S).
- Każdą wybraną kartę pobiera osobno z folderu gotowe-karty/.
- Przy niedostępnym serwerze działa 12 wbudowanych kart offline.
- Zawartość kart jest weryfikowana przed importem; nie jest wykonywany
  żaden kod z JSON. Nieobsługiwane formaty i brakujące pliki są odrzucane.
- „Odśwież bibliotekę” ponownie pobiera manifest.
- Zachowano 8 etapów kreatora, portrety, kadrowanie, wyposażenie klas,
  zapis szkiców, eksport/import własnych plików JSON i pozostałe ekrany.

URUCHOMIENIE LOKALNE

1. Wypakuj CAŁE archiwum ZIP do jednego folderu.
2. Dwuklik w StreamHouse-Portal-Podglad.html otwiera prototyp portalu.
   Możesz też otworzyć Kreator-Postaci.html samodzielnie.
3. Z pliku file:// używaj lokalnej biblioteki. Przeglądarki blokują
   żądania fetch do lokalnych plików JSON; to normalne zachowanie.
4. Aby przetestować serwowanie kart jak na VPS, uruchom serwer HTTP.
   Przykład dla komputera z Pythonem:
       python -m http.server 8000
   Wejdź na http://localhost:8000/Kreator-Postaci.html
5. Na serwerze WWW odświeżenie biblioteki powinno pokazać status
   „Biblioteka online” i liczbę kart (domyślnie 12).

UMIESZCZENIE NA VPS Z NGINX

1. Umieść wszystkie pliki aplikacji w katalogu, który już obsługuje
   Twoja witryna (np. /var/www/streamhouse/).
2. Upewnij się, że manifest i pliki są publicznie dostępne:
       https://TWOJA-DOMENA/gotowe-karty/manifest.json
       https://TWOJA-DOMENA/gotowe-karty/postac-01-barbarian.json
3. Domyślnie w assets/library-config.js zapisane jest:
       window.STREAMHOUSE_LIBRARY_BASE = 'gotowe-karty/';
   To działa, gdy strona i biblioteka znajdują się w tym samym folderze
   witryny; nie potrzebujesz dodatkowej konfiguracji CORS.
4. Jeśli biblioteka jest na innym serwerze, wpisz PEŁNY URL HTTPS
   katalogu (kończący się /). Wtedy serwer biblioteki musi dopuszczać
   żądania CORS z domeny StreamHouse. Nie otwieraj CORS dla wszystkich
   domen bez potrzeby.
5. Nowe postacie dopisuj do gotowe-karty/manifest.json. Każda pozycja
   zawiera name, classId, speciesId, backgroundId, bio i file. Nazwa
   pliku musi składać się z liter/cyfr/-, _ i kończyć .json.
   JSON karty ma format streamhouse-character-v1 i pole character.
6. Karty są publiczne. NIE umieszczaj w tej bibliotece prywatnych
   kart graczy, tokenów, haseł, danych Discord ani informacji osobowych.
   Prywatne karty wymagają autoryzacji i własnej bazy (oddzielny etap).

OGRANICZENIA

- Nie wdrożono jeszcze Discord OAuth, prywatnych kart w Supabase ani
  udostępniania postaci między kontami. VPS NIE został automatycznie
  zaktualizowany. Ta paczka zawiera gotowy frontend i pliki statyczne.
- Nie ma automatycznego importu PDF D&D Beyond. Można importować własne
  pliki JSON zgodne z formatem StreamHouse; nie pobieramy cudzych kart.
- Do paczki dodano wyłącznie przykładowe, fikcyjne postacie StreamHouse.

KONTROLA TECHNICZNA

- Parsowanie JavaScript przez node --check: OK
- Test DOM w Chromium: manifest online -> lista 12 kart -> wybór karty
  -> dane w kreatorze: OK (zastępcze odpowiedzi HTTP, bez zewnętrznej sieci).
- Test trybu offline: lista 12 kart -> wybór karty: OK.
- Bezpośredni E2E HTTP w Chromium nie był możliwy w środowisku testowym
  (ograniczenie przeglądarki ERR_BLOCKED_BY_ADMINISTRATOR).
