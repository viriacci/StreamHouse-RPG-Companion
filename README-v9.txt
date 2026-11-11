STREAMHOUSE RPG COMPANION — WERSJA v9
DWA TRYBY SESJI + HP + EKWIPUNEK + RZUTY 3D
=======================================================

NAJWAŻNIEJSZA ZMIANA

Plansza NIE jest obowiązkowa. Domyślnie otwiera się Pokój fabularny.
Każda kampania ma w portalu dwa główne wejścia:
  • Pokój fabularny: bez planszy, z ilustracją sceny, zapiskami, kartami,
    kroniką, inicjatywą i rzutami.
  • Plansza taktyczna: te same dane kampanii, dodatkowo mapa 10×8 i pionki.
W samym pokoju można jednym przyciskiem przejść między tymi widokami.

To dwa WIDOKI TEJ SAMEJ sesji. Rozmowy, wspólne notatki i rzuty nie
znikają po przełączeniu. Wybór widoku nie daje żadnych nowych uprawnień.
Każdy uczestnik wybiera widok dla własnego ekranu. Gracze i MG mogą więc
używać jednocześnie różnych widoków tej samej kampanii.

ORYGINALNY POKÓJ v21

Zachowaliśmy ORYGINALNE pliki w rozgrywka/:
  StreamHouse-v21-MG.html
  StreamHouse-v21-Gracz.html
  StreamHouse-v21-Pracownia-Kosci.html
W portalu jest osobny skrót „Oryginalny v21 (offline)”, a w pokoju
fabularnym przycisk otwarcia oryginalnego panelu.

WAŻNE: oryginalne panele v21 nadal wymieniają zdarzenia lokalnie między
kartami / oknami przeglądarki, nie zostały całkowicie przepisane na Supabase.
Sieciowy Pokój fabularny v9 odtwarza ich narracyjny sposób prowadzenia
sesji i współdzieli z widokiem taktycznym stan w nowym module pokoju.
W pełnym sensie nie jest to jeszcze synchronizacja wszystkich narzędzi v21.

KARTY POSTACI W POKOJU

- Kliknij bohatera w sekcji „Karty drużyny”.
- Zobaczysz rasę/klasę, atrybuty, HP i ekwipunek.
- MG lub właściciel może zmieniać HP i listę przedmiotów (po jednej
  nazwie w linii). Inni członkowie kampanii widzą podgląd.
- Ten stan należy tylko do danej kampanii. Nie nadpisuje oryginalnej
  karty i szkicu w 8-etapowym kreatorze.
- W chmurze zapisy przechodzą przez RPC PostgreSQL z kontrolą członkostwa,
  własności i wersji rekordu. Konflikt wersji wymaga odświeżenia.
- W lokalnym demo zapis korzysta z localStorage i nie daje bezpieczeństwa
  bazy; użytkownik tego samego komputera może podglądać te dane.

KOŚCI

- Przyciski D4, D6, D8, D10, D12, D20, D100 zapisują wynik do kroniki.
- Po serwerowym rzucie w oknie gry wyświetla się animacja wielościennej
  bryły 3D i ZATWIERDZONY wynik. Animacja nie losuje ponownie.
- Modele 3D w v9 wykorzystują geometrię z oryginalnego pakietu.
- Pracownia pełnych 20 zestawów PBR v21 pozostaje dostępna osobno.
  Jej własne rzuty nie są jeszcze automatycznie zapisywane do kroniki v9.

SZYBKI TEST LOKALNY

1. Wypakuj całe archiwum do folderu.
2. Uruchom serwer HTTP, np. w folderze z index.html:
       python -m http.server 8000
3. Otwórz http://localhost:8000/StreamHouse-Portal.html
4. Włącz tryb lokalny, przejdź do „Moje kampanie”.
5. Naciśnij „Pokój fabularny”. Otwórz drugą kartę jako gracz.
6. Przetestuj edycję HP, kronikę i rzuty. Kliknij „Włącz planszę”.
7. Dane demo działają tylko w tym samym originie przeglądarki.
   Nie można na tej podstawie obiecywać sesji internetowej.

WERSJA ONLINE (WYMAGA AKTYWNEGO SUPABASE I DISCORD OAUTH)

1. W nowym, dedykowanym projekcie uruchom kolejno trzy migracje:
   supabase/migrations/20261110190000_streamhouse_private_campaigns.sql (v7)
   supabase/migrations/20261110230000_streamhouse_live_room.sql (v8)
   supabase/migrations/20261110235000_streamhouse_character_state.sql (v9)
2. Skonfiguruj Discord OAuth zgodnie z README-v7.txt.
3. W assets/cloud-config.js wpisz tylko URL projektu i publishable key.
4. Uruchom platformę pod HTTPS. Utwórz kampanię, zaproś graczy i
   udostępnij kartę postaci przez portal.
5. Wejdź na dwa różne konta Discord i wykonaj testy opisane w
   supabase/TESTY-v9-PRZED-WDROZENIEM.txt.

UWAGA O BEZPIECZEŃSTWIE I STANIE WDROŻENIA

- Projekt Supabase widoczny wcześniej jako INACTIVE nie został aktywowany.
- Żadna migracja nie została uruchomiona na produkcyjnym serwerze.
- Działanie RLS/Realtime/Discord z realną bazą jest NIEPRZETESTOWANE.
- Zweryfikowane: składnia JS, izolacja GUI gracza i MG w teście
  przeglądarkowym, przełączanie widoków, lokalny zapis HP/ekwipunku,
  testowane rzuty 3D, czat i transport w symulowanym API Supabase.
- Pełna zgodność wszystkich mechanik z v21 nadal jest osobnym etapem.
