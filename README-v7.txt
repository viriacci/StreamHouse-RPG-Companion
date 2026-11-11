STREAMHOUSE RPG COMPANION | WERSJA V7
PRYWATNE KARTY + DISCORD OAUTH + KAMPANIE W CHMURZE
==================================================

CO DOSZŁO

1. Logowanie kontem Discord przez Supabase Auth (OAuth PKCE).
2. Każda prywatna postać przypisana do właściciela, zapis JSON w bazie.
3. Edycja postaci pobranej z konta przez 8-etapowy kreator.
4. Kampanie w chmurze i członkowie: MG albo gracz.
5. Zaproszenia przez 32-znakowy losowy kod, link, "Udostępnij" i "Kopiuj link".
6. Udostępnianie pełnych kart w kampanii, widok kart drużyny.
7. SQL z politykami RLS: niepubliczne karty i ograniczone zaproszenia.
8. Lokalny tryb demo, 12 kart publicznej biblioteki i stare ekrany działają
   nadal bez chmury. Pakiet 20 zestawów kości jest zachowany.

WAŻNE: CHMURA NIE JEST JESZCZE WDROŻONA NA ŻYWYM SUPABASE.
Podłączony projekt Supabase o ID dxrnijmpnjegsxaliwmc jest nieaktywny.
Nie reaktywowano go ani nie zmodyfikowano bez zgody użytkownika.
Do działania online trzeba przygotować aktywny projekt (najlepiej osobny,
przeznaczony wyłącznie dla StreamHouse) oraz aplikację Discord.

URUCHOMIENIE BEZ CHMURY

1. Wypakuj całe archiwum.
2. Otwórz StreamHouse-Portal.html (lub index.html i kliknij wejście).
3. Kliknij "Otwórz tryb lokalny".
4. Kreator, publiczne karty i przykładowe kampanie nie wymagają logowania.
5. Do stabilniejszych testów lokalnych użyj serwera: python -m http.server 8000
   i wejdź na http://localhost:8000/StreamHouse-Portal.html.

WDROŻENIE CHMURY (NA AKTYWNYM PROJEKCIE)

1. Supabase > SQL Editor: uruchom JEDNORAZOWO cały plik:
   supabase/migrations/20261110190000_streamhouse_private_campaigns.sql
   Skrypt tworzy tabele sh_* i polityki RLS. Nie używaj go na projekcie
   innej aplikacji bez uprzedniego przeglądu migracji.
2. Discord Developer Portal > Applications > New Application > OAuth2.
   Dodaj Redirect URI:
      https://TWOJ-PROJECT-REF.supabase.co/auth/v1/callback
   Skopiuj Client ID oraz Client Secret.
3. Supabase > Authentication > Sign In / Providers > Discord: włącz provider
   i wpisz Client ID + Client Secret (TYLKO W DASHBOARDZIE SUPABASE).
4. Supabase > Authentication > URL Configuration:
      Site URL: https://TWOJA-DOMENA/StreamHouse-Portal.html
      Redirect URLs: https://TWOJA-DOMENA/StreamHouse-Portal.html
   Wymagany HTTPS. Link zaproszenia jest na czas logowania przechowywany
   w sessionStorage, więc Redirect URL nie potrzebuje wildcardów.
   Dla testów localhost dodaj osobny adres, np.:
      http://localhost:8000/StreamHouse-Portal.html
5. Otwórz assets/cloud-config.js i uzupełnij TYLKO:
      url: 'https://TWOJ-PROJECT-REF.supabase.co',
      publishableKey: 'sb_publishable_...'
   Klucz publishable jest publiczny. NIE wpisuj tu service_role, sb_secret,
   Discord Client Secret, ani żadnego tokena użytkownika.
6. Prześlij CAŁY katalog na serwer HTTPS (statyczny Nginx wystarczy).
   W katalogu wraz z HTML MUSZĄ być foldery assets/, gotowe-karty/, rozgrywka/.
7. Po zalogowaniu nowy bohater zapisuje się prywatnie w Supabase.
   Na pierwszym uruchomieniu naciśnij "Prześlij lokalne dane", jeśli chcesz
   przenieść dotychczasowe szkice. Nic nie jest kopiowane automatycznie.
8. Utwórz kampanię w portalu -> "Szczegóły kampanii" -> "Zaproś graczy".
   Zaproszony gracz wchodzi w link, loguje się przez Discord i dołącza.
   Następnie "Udostępnij bohatera" -> "Karty drużyny".

ZASADY DOSTĘPU

- `sh_characters`: właściciel może odczytywać / edytować / usuwać swoje karty;
  pozostali członkowie kampanii odczytują kartę dopiero po udostępnieniu.
- `sh_campaigns`: widoczne dla MG i członków; edycja tylko dla właściciela.
- `sh_campaign_members`: członkostwo nadawane przy tworzeniu kampanii przez
  trigger lub po dołączeniu przez kontrolowane RPC z kodem zaproszenia.
- `sh_campaign_characters`: gracz może udostępnić tylko swoją kartę.
- `sh_campaign_invites`: brak bezpośredniego dostępu do tokenów przez REST.
  Token ważny przez 7 dni albo do 20 wykorzystań.
- Weryfikacja uprawnień odbywa się w PostgreSQL RLS, nie po samym ukryciu
  przycisków we frontendzie.

OGRANICZENIA WERSJI

- Aby działała chmura, przeglądarka musi pobrać przypięty Supabase JS z
  CDN jsDelivr. Bez sieci działa wyłącznie tryb lokalny.
- Nie było testu z prawdziwym Discord OAuth i aktywnym Supabase: do tego
  potrzebne są ustawienia dostawcy i działający projekt.
- Lista znajomych jest nadal lokalna; zapraszanie do kampanii działa przez
  link, nie przez wyszukiwanie zewnętrznego nicku Discord.
- Nie ma jeszcze współdzielonego na żywo stanu mapy, notatek MG, tur,
  dziennika i ekwipunku podczas sesji. Moduł rozgrywki v21 działa osobno.
- Dla dużych portretów PNG limit karty to 750 kB po serializacji; zmniejsz
  obraz przed synchronizacją.
- Dodatkowych kart z publicznej biblioteki nie wolno traktować jako prywatne.
- Bez aktywnego Supabase nie można potwierdzić RLS na prawdziwych kontach.
  Przed upublicznieniem przetestuj co najmniej dwóch różnych użytkowników.

TESTY WYKONANE LOKALNIE

OK: node --check: assets/cloud.js i komplet skryptów HTML.
OK: Playwright, bez chmury: wejście lokalne, panel, tworzenie kampanii,
    12 przykładowych kart, import do kreatora.
OK: jednostkowy adapter w Node: OAuth init, zapisy / pobrania / usunięcie
    kart, zapis kampanii, zaproszenia i powiązanie postaci.
OK: Playwright z mockiem Supabase: autologowanie, zapis kampanii, rola MG,
    wygenerowanie linku zaproszenia.
NIEZWERYFIKOWANE: migracja na żywej bazie, faktyczne RLS, logowanie przez
    Discord, dostarczanie zaproszeń w różnych przeglądarkach.

DODATKOWA UWAGA DOT. WERSJI

W README-v5.txt i README-v6.txt zachowano poprzednie instrukcje.
Plik README-v7.txt jest aktualnym punktem startu.
