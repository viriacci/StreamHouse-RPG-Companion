# Architektura StreamHouse

```
Przeglądarka użytkownika
  index.html ────────► StreamHouse-Portal.html
                          ├── Kreator-Postaci.html
                          ├── pokoj/index.html?campaign=<UUID>&layout=classic
                          │      └── ten sam pokój: ...&layout=tactical
                          └── rozgrywka/* (v21, oddzielny wariant offline)

  assets/cloud.js ─────► Supabase Auth (Discord OAuth)
                        └── PostgreSQL: kampanie, członkostwo, karty, kronika
  assets/room.js ──────► RPC + Realtime (wymaga aktywnego Supabase)
```

## Granice

Strona główna, portal, kreator i pokój v9 są połączone linkami i korzystają z jednej konfiguracji chmury. Na VPS aplikacja jest **statyczna**, a prawdziwe zapisy i synchronizacja przechodzą przez Supabase. Nginx nie przechowuje kont ani danych graczy.

### Dwa warianty rozgrywki

- **Fabularny (domyślny):** sceny, kronika, HP, ekwipunek, inicjatywa, kostki.
- **Taktyczny (opcjonalny):** ten sam stan kampanii plus plansza 10×8 i pionki.
- **Oryginalne panele v21:** zachowane bez przepisywania ich stanu lokalnego. Nie mają synchronizacji Supabase ani wspólnych postaci w czasie rzeczywistym. Użytkownik wraca do portalu przez link na każdym ekranie.

`?role=gm` w lokalnym demo nie jest zabezpieczeniem: rola w trybie online wywodzi się wyłącznie z bazy.

## Baza

Trzy migracje: v7 konta/kampanie/karty/zaproszenia; v8 pokój/kronika/rzuty; v9 HP i ekwipunek w kampanii. Polityki RLS i RPC są mechanizmem autoryzacji; ukryte przyciski w HTML nie są zabezpieczeniem.

## Publikacja

`scripts/deploy.sh` kopiuje na publiczny serwer tylko wybrane strony i katalogi `assets/`, `rozgrywka/`, `pokoj/`, `gotowe-karty/`. Nie publikuje migracji, testów ani `.git`. Publikacja jest atomowa przez symlink `current`, a konfiguracja chmury pochodzi z `/etc/streamhouse/cloud-config.local.js`.

Repozytorium dzieli media na `bundles/media.part*`; `scripts/unpack-media.sh` odtwarza je po `git clone`, weryfikując SHA-256. Do testów i uruchomienia bez Nginx wystarczy Python HTTP server.
