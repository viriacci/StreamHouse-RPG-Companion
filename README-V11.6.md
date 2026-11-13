# StreamHouse v11.6: portal tylko po zalogowaniu

## Najważniejsze

- **Usunięto przycisk trybu lokalnego i demonstracyjne dane z portalu.** Dostęp do dashboardu wymaga zweryfikowanej sesji Discord przez Supabase Auth (`getUser`). Nie można już wejść przez link, poprzedni znacznik `sessionStorage` ani dane z dawnej wersji.
- **Przeglądarka nadal pomaga w wydajności:** po weryfikacji konta odczytujemy krótkotrwały, osobny dla każdego konta cache w `sessionStorage` (do 12 godzin), a następnie pobieramy aktualne dane z Supabase. Cache znika po wylogowaniu. Portrety i tekstury pozostają zwykłymi zasobami przeglądarki. Prywatne szkice kreatora są przechowywane pod kluczem danego użytkownika, ale ostateczny zapis karty odbywa się w Supabase.
- **Online jest źródłem prawdy:** tworzenie i edycja kampanii, postacie, profil (nazwa, podpis, pomniejszony portret) i archiwum sesji są zapisywane w Supabase. Błąd zapisu nie staje się po cichu sukcesem lokalnym. Zaproszenia demonstracyjne i lokalny notatnik kontaktów zostały usunięte z portalu; znajomości online zostają.
- **Głębokie linki do gry:** kreator, pokój online, klasyczne panele MG i gracza, dziennik, Pracownia Kości oraz katalog rycin sprawdzają sesję przed odsłonięciem UI. Pokój online nie obsługuje już parametru `?demo=`.
- **Nie zmieniano wyglądu kości, układu paneli ani istniejących plików Nginx.**

## Baza danych

Nowa migracja `supabase/migrations/20261113174000_streamhouse_online_only.sql` dodaje `profile_title` i `avatar_data` do `sh_profiles` oraz tabelę `sh_archive_entries` z politykami RLS właściciela. Została uruchomiona w projekcie `StreamHouseRPG` na Supabase w dniu 13.11.2026. **Nie uruchamiaj jej ponownie ręcznie.**

## Ograniczenia i bezpieczeństwo

- Strona powitalna i statyczne pliki HTML/JS/grafiki są publicznie pobieralne. Wymóg logowania dotyczy korzystania z aplikacji i dostępu do prywatnych danych. **Autoryzację danych wymuszają na serwerze polityki Supabase RLS**, nie skrypt ukrywający ekran. Wyłączenie JavaScript nie daje możliwości odczytania cudzych danych przez API.
- Klasyczny panel v21 nadal ma lokalny stan części mechanik, choć UI jest dostępny tylko po zalogowaniu. Mechaniki oryginalnego v21 poza czatem nie są jeszcze pełnym multiplayerem.
- Szkic w pamięci przeglądarki pozostaje na urządzeniu w razie chwilowego błędu zapisu; nie zastępuje poprawnego zapisu w Supabase. Nie używaj współdzielonych urządzeń do prywatnych kampanii bez wylogowania i czyszczenia danych przeglądarki.
- Automatyczne aktualizacje plików na Mikrusie nadal sprawdzają GitHuba co ~5 minut. Struktura bazy jest zarządzana oddzielnie.

## Kontrola

- Test odrzuconego gościa, braku przykładowych bohaterów, zapisu kampanii i profilu oraz ukrycia ekranu po wylogowaniu w lokalnym Chromium z symulowanym adapterem chmury.
- Test SQL dwóch tymczasowych kont w transakcji wycofanej przez `ROLLBACK`: obce konto nie widziało cudzej kroniki i profilu.
- Kontrola składni 45 fragmentów JS i kompletności 9 ekranów/83 odniesień przeszła prawidłowo.

Dalszy krok na działającej domenie: sprawdzenie na dwóch realnych kontach Discord: profil, kampania, zaproszenie, karta bohatera, kronika i czat.
