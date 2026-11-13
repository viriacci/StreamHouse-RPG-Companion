# StreamHouseRPG: stan bazy i uruchomienie kont

Aktualizacja 13.11.2026. Supabase Project ID: `xqfglhaapojxnjdmxkrm`, region eu-west-3.

## Wykonane na prawdziwej bazie

- V7: profile, postacie, kampanie, czlonkowie, udostepnianie kart, kody zaproszen
- V8: stan pokoju, chat i kronika, obecnosci, notatki MG, funkcje rzutow
- V9: HP i ekwipunek bohatera
- V11.4: znajomosci, zaproszenia, wiadomosci prywatne
- Bezpieczenstwo: limit 30 wiadomosci / minuta na konto dla DM i czatu pokojowego, dodatkowe indeksy i laczona polityka profilu

**Stan:** 13 tabel publicznych aplikacji, wszystkie z RLS; 6 tabel z publikacja do Supabase Realtime. Wszystkie piec migracji widoczne w Supabase. Testy transakcyjne A/B/C przeszly, po rollbacku brak testowych kont i postaci.

## Co pozostaje w panelu Supabase i Discord

1. Utworz aplikacje w [Discord Developer Portal](https://discord.com/developers/applications) i w OAuth2 dodaj URL callback wskazany przez Supabase:
   `https://xqfglhaapojxnjdmxkrm.supabase.co/auth/v1/callback`.
2. W Supabase: `Authentication -> Sign In / Providers -> Discord`, wlacz providera. Wklej Client ID i Client Secret **wyłącznie w panelu Supabase**. Nie wysylaj sekretu do GitHuba ani do HTML.
3. W Supabase: `Authentication -> URL Configuration`, ustaw Site URL na `https://TWOJA-SUBDOMENA/StreamHouse-Portal.html` i dodaj ten sam Redirect URL. Dla lokalnego testu dodaj `http://127.0.0.1:8765/StreamHouse-Portal.html` i/lub port uzywany przez launcher.
4. Nie uruchamiaj ponownie juz wykonanych migracji. Kolejne schema changes przechowuj w nowych plikach SQL i nakladaj pojedynczo.
5. Po wdrozeniu strony na VPS wykonaj test dwoch prawdziwych kont: OAuth, tworzenie kampanii, zaproszenie, HP, rzuty, notatki MG, czat i DM.

## Konfiguracja polaczenia

W repozytorium `assets/cloud-config.js` zawiera **tylko** publiczny adres projektu i publishable key. Takie dane sa przeznaczone do frontendu. Plik `assets/cloud-config.local.js` oraz zewnetrzna konfiguracja VPS moga nadpisac oba ustawienia; jezeli oba pola runtime sa puste, aplikacja uzyje ustawien domyslnych.

Nie wpisuj w kod `service_role`, `sb_secret_`, hasla bazy lub Discord Client Secret.

## Uwagi do audytu

- Brak polityki odczytu dla `sh_campaign_invites` jest celowy: kody obsluguja tylko funkcje RPC.
- Osiem funkcji RPC `SECURITY DEFINER` jest celowo wywolywanych przez `authenticated`, ale kazda musi weryfikowac `auth.uid()` i uprawnienia. Doradca Supabase nadal oznacza je jako WARN. Przed publicznym startem zalecany reczny przeglad ich kodu.
- Ostrzezenia o nieuzywanych indeksach po utworzeniu pustej bazy sa normalne; nie usuwaj indeksow na tej podstawie.
- Symulacje SQL nie zastepuja testu na dwoch prawdziwych kontach z przegladarek.
