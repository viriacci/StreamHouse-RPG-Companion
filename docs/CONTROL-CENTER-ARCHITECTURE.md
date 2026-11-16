# PanSzczesniak Control Center: architektura multi-project

## Status

Specyfikacja i rejestr projektów, a nie jeszcze działający backend. Wszystkie zmiany wyłącznie na gałęzi feature/admin-staging-v11.11. Produkcyjny main, DNS, SEOHOST i baza Supabase bez zmian.

## Architektura

- Panel UI: admin.panszczesniak.pl na SEOHOST SH1.
- Backend, autoryzacja, kolejka wdrożeń, audyt i zbieranie agregatów: api.panszczesniak.pl na Mikrus VPS.
- Oficjalne RPG: rpg.panszczesniak.pl na Mikrus.
- Testowe RPG: testrpg.panszczesniak.pl na SEOHOST SH1.
- Nowe strony na dowolnej domenie i hostingu rejestrujemy w niezależnym katalogu projektów.
- Cloudflare zapewnia DNS, HTTPS i dostarcza część analityki.
- Poczta kontakt@panszczesniak.pl: SEOHOST.

## Rejestr projektów

Plik control-center/projects.example.json jest deklaratywnym punktem startu. Każdy projekt ma niezależne production i staging, repozytorium, hosting i listę modułów. Użyte pola obejmują identyfikatory hostów, URL, status, moduły analytics, deployments, rpg-admin, cms, bookings, a także deklarację izolacji danych.

Wszystkie flagi deployments_enabled i publish_enabled mają wartość false do momentu zabezpieczenia backendu i wykonania próbnego rollbacku. Plik nie zawiera haseł ani kluczy dostępowych.

## Funkcje docelowe

1. Globalny pulpit: lista projektów, domeny, ostatnie wydania, health-check.
2. Analityka: statystyki Cloudflare pobierane przez serwerowy token i uzupełniane własnymi zdarzeniami konwersji poszczególnych aplikacji.
3. Deployment: zatwierdzony commit, build/test, allowlista akcji, wąskie uprawnienia, logowanie operacji, automatyczny rollback.
4. CMS: moduł edycji treści i usług dla projektów, które go obsługują.
5. Bookings: dostępność, rezerwacje i powiadomienia, izolowane dla strony szkoleniowca.
6. RPG Admin: dotychczasowe funkcje moderacji, składów kampanii i audytu.

Mikrus ma ograniczone zasoby. Nie przechowujemy tam pełnych logów ruchu ze wszystkich witryn; zbieramy wybrane agregaty do lekkiej bazy z backupem. Operacje administracyjne mają być odporne na ponowienie żądania.

## Zabezpieczenia

Panel w przeglądarce NIE wykonuje komend shell ani nie ma sekretów SSH, Cloudflare, GitHub czy Supabase. Mikrus weryfikuje sesję i uprawnienia użytkownika osobno dla każdego projektu. Adaptery deploymentu wykonują tylko wcześniej zatwierdzone kroki dla danego hosta i wskazanego SHA. Bez generycznego wykonania poleceń. Każda operacja ma audyt, limit uprawnień, test zdrowia i ścieżkę cofnięcia. CORS nie zastępuje autoryzacji. Dane osobowe rezerwacji pozostają w izolowanej bazie projektu.

## DNS zrzutu SEOHOST

Na obrazie ze strefą SEOHOST widoczne są:
- A admin i A test -> 213.239.134.18.
- A apex, mail, ftp, www -> 213.239.134.18.
- MX 10 mail.panszczesniak.pl oraz rekordy SPF, DKIM i DMARC.
- NS ns1.seohost.pl, ns2.seohost.pl.

Jeżeli Cloudflare jest autorytatywnym DNS, zmian dokonuje się w Cloudflare, a nie wyłącznie w strefie SEOHOST. Rekord test NIE oznacza testrpg.

Plan rekordów w aktywnej strefie Cloudflare:
- A admin -> 213.239.134.18 (SH1), po skonfigurowaniu vhost.
- A testrpg -> 213.239.134.18 (SH1), po skonfigurowaniu vhost.
- A rpg -> publiczne IP Mikrus do potwierdzenia.
- A api -> publiczne IP Mikrus do potwierdzenia.
- A @ -> IP SH1 wyłącznie jeśli główna witryna ma się tam znaleźć i po sprawdzeniu istniejącej konfiguracji.
- A mail -> 213.239.134.18, DNS only; MX oraz dokładne rekordy SPF/DKIM/DMARC należy sprawdzić i zachować, nie duplikować SPF.

Nie zmieniać delegacji NS w Cloudflare na NS SEOHOST. Wpis DNS nie uruchamia witryny: potrzebne są vhost, certyfikat i pliki.

## Plan bez kosztów dodatkowych

1. Sprawdzić rzeczywistą strefę Cloudflare i potwierdzić delegację oraz rekordy pocztowe.
2. Dodać subdomeny admin i testrpg w DirectAdmin pod panszczesniak.pl.
3. Podpiąć rpg i api do Mikrusa z prawidłowym TLS.
4. Wystawić demonstracyjny panel z oddzielnej gałęzi na SH1.
5. Wdrożyć na Mikrusie autoryzowane API registry/health/audit, początkowo bez możliwości publikacji.
6. Dodać analitykę, bezpieczne adaptery deployu i rollback, a następnie moduły kolejnych stron.

Bez dodatkowego SH2 i bez płatnego Supabase Branching. Migracja administracyjna nie jest wykonywana na produkcji.
