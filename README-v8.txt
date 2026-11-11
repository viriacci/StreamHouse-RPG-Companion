STREAMHOUSE RPG COMPANION | WERSJA V8
POKÓJ SESJI: MG + GRACZE + SCENA + MAPA + INICJATYWA + RZUTY
===========================================================

CO JEST NOWE

- Pokój sesji w pokoj/index.html, dostępny z listy kampanii w portalu.
- Dwa faktyczne widoki tego samego pokoju: Mistrz Gry i gracz.
- Współdzielona scena: tytuł, rozdział, opis i 3 ilustracje z projektu.
- Mapa taktyczna 10 x 8 z pionkami, wybieraniem i przesuwaniem (MG).
- Inicjatywa z kolejką i aktualną turą (MG).
- Publiczne ustalenia, prywatne notatki MG (oddzielna tabela, oddzielne RLS).
- Kronika czatu i ujawnionych wskazówek; nazwa autora przy wpisie.
- Kości D4/D6/D8/D10/D12/D20/D100 z modyfikatorem i zapisem wyniku.
- Aktywność członków kampanii odświeżana podczas sesji.
- Supabase Realtime Postgres Changes + odczyt co ok. 6,5 s jako fallback.
- Kontrola jednoczesnych edycji sceny (revision check zamiast nadpisywania zmian).
- Stare narzędzia v21, 20 skórek kości, kreator i biblioteka postaci nadal w pakiecie.

NAJWAŻNIEJSZA ZMIANA W STOSUNKU DO V7

Pokój v8 synchronizuje stan pomiędzy różnymi urządzeniami, jeżeli działa
aktywna baza Supabase oraz logowanie Discord. Wcześniejsze ekrany v21
porozumiewają się lokalnie i NIE zostały automatycznie przełączone na nowy
serwer. W nowym pokoju można otworzyć osobno Pracownię Kości v21, ale
jej rzuty NIE są przekazywane do kroniki v8. Do kroniki zapisują się
rzuty wykonane przyciskami w samym pokoju v8.

SZYBKI TEST BEZ SERWERA

1. Wypakuj cały ZIP. Nie uruchamiaj pojedynczego HTML bez katalogów assets.
2. Uruchom w folderze z plikiem index.html:
      python -m http.server 8000
3. Wejdź na http://localhost:8000/StreamHouse-Portal.html
4. Naciśnij "Otwórz tryb lokalny" > "Moje kampanie" > "Pokój sesji".
5. Kliknij "Otwórz widok gracza" (druga karta tej samej przeglądarki).
6. W oknie MG zmień scenę, dodaj pionek, ustaw inicjatywę, ujawnij wskazówkę.
   Gracz zobaczy zmiany. Gracz może wysłać wiadomość i rzucić kością.
7. Fallback demo używa localStorage i BroadcastChannel, w obrębie tej samej
   przeglądarki i tego samego originu HTTP. TO NIE JEST ROZGRYWKA SIECIOWA.
8. W demo rolę wybiera adres URL; nie traktuj tego jako zabezpieczenia.
   Lokalne notatki MG nie są chronione przed innym użytkownikiem tego PC.

URUCHOMIENIE ONLINE (WYMAGA AKTYWNEGO PROJEKTU SUPABASE)

1. Wdroż migrację v7 (supabase/migrations/20261110190000_streamhouse_private_campaigns.sql).
2. NASTĘPNIE w tym samym projekcie uruchom NOWĄ migrację:
      supabase/migrations/20261110230000_streamhouse_live_room.sql
   Ta migracja dodaje 4 tabele, polityki RLS, dwie funkcje RPC oraz
   Postgres Changes do publikacji supabase_realtime (jeżeli istnieje).
3. Skonfiguruj Discord OAuth, adresy przekierowania i publiczne URL + key
   w assets/cloud-config.js zgodnie z README-v7.txt.
4. Publikuj całą wypakowaną zawartość na hostingu HTTPS / VPS.
   Pokój jest statyczny, nie wymaga osobnego serwera Node.js.
5. Zaloguj się przez Discord, utwórz kampanię, wygeneruj zaproszenie,
   zaloguj się na drugim koncie i dołącz jako gracz.
6. Wybierz "Pokój sesji" w kampanii na obu kontach. Link otwiera adres
      pokoj/index.html?campaign=<UUID_KAMPANII>
   Nie musisz podawać roli w linku. Jest ustalana z członkostwa w bazie.
7. Role i dostęp do danych MUSZĄ być sprawdzone na żywym projekcie zgodnie
   z supabase/TESTY-v8-PRZED-WDROZENIEM.txt.

BEZPIECZEŃSTWO

- Widok MG to nie tylko ukryte przyciski. sh_room_update weryfikuje
  właściciela kampanii i wersję stanu po stronie PostgreSQL.
- Przesyłanie rzutu odbywa się przez sh_room_roll, wynik jest generowany
  w bazie (random PostgreSQL, wystarczający do zwykłych rzutów RPG).
  Gracz nie może wstrzyknąć własnego wyniku rzutu przez zwykły INSERT.
- sh_room_gm_notes jest prywatne na poziomie bazy (tylko właściciel MG).
- sh_room_events są czytelne wyłącznie dla członków kampanii (RLS).
- sh_room_presence nie pozwala podpisać się pod innym kontem przez user_id.
- Kod nie trzyma ani nie wymaga klucza service_role/sb_secret/Discord secret.
- Treść wiadomości i opisy są wstawiane do DOM jako tekst, nie HTML.

OGRANICZENIA I STAN TESTÓW

ZROBIONE:
  OK: kontrola składni JS w Node.
  OK: scenariusze akcji MG i gracza w uruchomionym silniku Chromium
      (testy interfejsu przez set_content, bo polityki Chromium blokują
      nawigację do localhost w środowisku testowym).
  OK: makieta synchronizacji sceny/inicjatywy/wskazówek między dwoma
      widokami przez zasymulowany event storage.
  OK: adapter Supabase z symulowanym backendem: role, update, eventy, rzuty.
  OK: SVG trzech ilustracji przechodzą parsowanie XML.
NIEZROBIONE:
  BRAK testu migracji na żywym Supabase, testu rzeczywistego RLS i Discord
      OAuth na dwóch kontach; projekt podłączony do środowiska jest INACTIVE.
  BRAK potwierdzonego WebSocket w rzeczywistym środowisku internetowym.

NIE OBEJMUJE JESZCZE:
  - Synchronizacji zmian w oryginalnych panelach v21.
  - WebRTC/voice chatu i muzyki.
  - Mapy z przesyłaniem własnych zdjęć i mgłą wojny.
  - Pełnej integracji HP, ekwipunku, czarów i awansu postaci z v21.
  - Usuwania starych zdarzeń kroniki z bazy (klient pokazuje ostatnie 80).
  - Pełnego systemu uprawnień dla dodatkowych pomocniczych MG.

README-v7.txt zawiera nadal właściwą instrukcję przygotowania Discord OAuth.
