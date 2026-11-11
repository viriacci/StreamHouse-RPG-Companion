# StreamHouse RPG Companion

Portal i narzędzia do prowadzenia sesji D&D online, stworzone z zachowaniem oryginalnego pokoju v21.

**Wejście:** `index.html` → `StreamHouse-Portal.html` → `Kreator-Postaci.html` lub `pokoj/index.html`.

## Moduły

| Moduł | Plik | Działanie |
| --- | --- | --- |
| Strona główna | `index.html` | Wprowadzenie i wejście do portalu |
| Konto, bohaterowie, kampanie | `StreamHouse-Portal.html` | Local demo albo Discord OAuth + Supabase |
| Kuźnia bohatera | `Kreator-Postaci.html` | 8 etapów, portrety, zapisy i import |
| Pokój fabularny | `pokoj/index.html?...&layout=classic` | Narracja bez obowiązkowej planszy |
| Pokój taktyczny | `pokoj/index.html?...&layout=tactical` | Dodatkowo plansza i pionki |
| Oryginalny pokój v21 | `rozgrywka/StreamHouse-v21-{MG,Gracz}.html` | Prototyp lokalny, nie wspólna chmura |
| Pracownia Kości | `rozgrywka/StreamHouse-v21-Pracownia-Kosci.html` | 20 zestawów i efekty 3D |
| Katalog rycin | `Katalog-Rycin-PD.html` | Katalog pomocniczy |

Ważne: oryginalne okna v21 mają lokalną komunikację, **nie** łączą się automatycznie z pokojem online. Pełna sesja sieciowa w v9 to `pokoj/` z aktywną bazą Supabase. Mapa jest **opcjonalna**, a domyślny jest pokój fabularny.

## Uruchom lokalnie

```bash
bash scripts/unpack-media.sh       # tylko po pobraniu repozytorium z GitHub
python3 scripts/check-project.py
python3 -m http.server 8000
```

Otwórz `http://localhost:8000` i wybierz tryb demonstracyjny. Otwieranie HTML przez `file://` może blokować pobieranie JSON. Lokalne demo korzysta z danych w przeglądarce, **nie** łączy komputerów zdalnie.

## Produkcyjne uruchomienie

Najpierw rozpakuj media jako zwykły użytkownik repozytorium, nie przez sudo. Zobacz **[Instrukcję wdrożenia VPS](docs/WDROZENIE-VPS.md)**. System publikuje Nginx; nie wymaga Node.js ani uruchamiania usługi w tle. Osobno konfigurujesz Supabase i Discord OAuth.

Do kolejnych aktualizacji na VPS:

```bash
cd /opt/streamhouse-rpg
bash scripts/update-vps.sh
```

Plik `/etc/streamhouse/cloud-config.local.js` zawiera tylko **publiczny** URL i klucz `sb_publishable_...`. Nie wpisuj tam `service_role`, `sb_secret_...`, tokenów ani Discord Client Secret. Projekt GitHub pozostaje bez danych wrażliwych.

## Projekt i stan

- Architektura i granice integracji: [`docs/ARCHITEKTURA.md`](docs/ARCHITEKTURA.md).
- Testy przed publicznym udostępnieniem: [`docs/TESTY-PRZED-PRODUKCJA.md`](docs/TESTY-PRZED-PRODUKCJA.md).
- Migracje bazy znajdują się w `supabase/migrations/`; **uruchom je kolejno**, dopiero na przygotowanym projekcie Supabase.
- Trzeba przetestować na prawdziwych kontach Discord / aktywnej bazie: OAuth, RLS i synchronizację. Dotychczasowe wyniki testów lokalnych i mocków nie są gwarancją produkcyjną.
- Repo zawiera źródła HTML/CSS/JS oraz podzielone archiwum zasobów (`bundles/media.part*`), które `scripts/unpack-media.sh` automatycznie rozpakowuje. To konieczne, ponieważ biblioteki tekstur kości są duże.
