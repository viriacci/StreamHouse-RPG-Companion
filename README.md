# StreamHouse RPG Companion

Wspólna aplikacja internetowa do prowadzenia sesji RPG. **Wersja integracyjna v10**. Frontend działa jako statyczna strona HTML/JS hostowana przez Nginx. Konta, postacie i sesje online wymagają osobnego, aktywnego Supabase z Discord OAuth. Nie uruchamiamy bazy na niewielkim VPS.

## Wejścia do aplikacji

| Adres | Funkcja |
|---|---|
| `/` | Ekran powitalny StreamHouse |
| `/StreamHouse-Portal.html` | Portal konta, bohaterowie, kampanie, zaproszenia |
| `/Kreator-Postaci.html` | Kreator postaci (8 kroków) |
| `/Katalog-Rycin-PD.html` | Katalog ilustracji |
| `/pokoj/index.html?demo=camp-demo&role=gm&layout=classic` | Lokalny pokój fabularny (demo) |
| `/pokoj/index.html?campaign=UUID&layout=classic` | Pokój fabularny online (po skonfigurowaniu Supabase) |
| `/pokoj/index.html?campaign=UUID&layout=tactical` | Opcjonalny widok z planszą |
| `/rozgrywka/StreamHouse-v21-MG.html` | Oryginalny panel MG v21, **lokalny/offline** |
| `/rozgrywka/StreamHouse-v21-Gracz.html` | Oryginalny panel gracza v21, **lokalny/offline** |
| `/rozgrywka/StreamHouse-v21-Dziennik.html` | Oryginalny dziennik v21 |
| `/rozgrywka/StreamHouse-v21-Pracownia-Kosci.html` | 20 zestawów kości PBR |

**Uwaga:** Stare panele v21 wymieniają zdarzenia lokalnie. Nie są tym samym pokojem online co `/pokoj/index.html`; połączenie tych silników pozostaje osobnym zadaniem. Domyślny tryb sesji to *fabularny*, a plansza taktyczna jest opcjonalna.

## Szybki start lokalny

```bash
python3 -m http.server 8000
# otwórz http://localhost:8000/
node scripts/verify.mjs
```

W portalu wybierz „Otwórz tryb lokalny”. To demonstracja jednego originu przeglądarki, nie sieć pomiędzy graczami.

## Wdrożenie na Ubuntu VPS

Kompletny opis od DNS przez HTTPS, Supabase, OAuth, migracje i aktualizacje jest w **[docs/WDROZENIE-VPS.md](docs/WDROZENIE-VPS.md)**. Na VPS wystarczą Nginx, Git i Python 3. Nie instalujemy Node.js ani bazy danych w produkcji. 1 GB RAM wystarczy do serwowania plików statycznych, ale **Supabase musi działać oddzielnie**.

Przygotowane skrypty:

- `deploy/install-vps.sh`: instalacja Nginx, konfiguracja vhost, publikacja plików
- `deploy/deploy.sh`: bezpieczna nowa wersja + przełączenie symlinka
- `deploy/update.sh`: `git pull --ff-only` i wdrożenie nowej wersji
- `scripts/verify.mjs`: podstawowe testy integralności plików i JS

## Konfiguracja i bezpieczeństwo

- W GitHubie **nigdy** nie umieszczaj `service_role`, `sb_secret`, Discord Client Secret ani tokenów dostępu.
- `/etc/streamhouse/streamhouse.env` na VPS zawiera wyłącznie publiczny URL Supabase i publishable key. Skrypt generuje z tego publiczny `/assets/cloud-config.js`.
- Secret Discord OAuth pozostaje wyłącznie w ustawieniach Supabase Auth.
- Migruj SQL **w kolejności v7 → v8 → v9** z folderu `supabase/migrations/`, tylko do projektu przeznaczonego dla StreamHouse.
- RLS i dostęp dwóch różnych kont wymagają testów przed udostępnieniem realnym użytkownikom: `supabase/TESTY-v9-PRZED-WDROZENIEM.txt`.

## Stan projektu

Fizyczne pliki, ścieżki i skrypty startowe są scalone oraz przechodzą testy lokalne. Funkcje online wymagają aktywnego projektu Supabase i realnego sprawdzenia Discord OAuth/RLS. Dalsza rozbudowa powinna odbywać się przez commity/PR-y, nie osobne archiwa HTML.