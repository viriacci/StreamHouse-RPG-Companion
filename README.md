### v11.9 · Optymalizacja paneli i zapytań

Wspólny CSS i JavaScript paneli MG oraz gracza został wydzielony do buforowanych zasobów. Każdy plik HTML v21 jest krótszy o 197 KB. Ograniczono cykliczne odświeżania pokoju, powtarzane pobrania listy znajomych i kampanii oraz działanie animacji poza ekranem. Usunięto niepotrzebne komentarze z kodu, zachowując historyczne migracje SQL. Szczegóły, testy i ograniczenia: [docs/ZMIANY-V11.9.md](docs/ZMIANY-V11.9.md).

### v11.8 · Zarządzanie drużyną i zaproszeniami

MG może zaprosić zaakceptowanego znajomego bezpośrednio do kampanii, przeglądać rzeczywisty skład i usuwać graczy. Odbiorca akceptuje lub odrzuca zaproszenie w „Moje kampanie”. Usunięty gracz nie wróci starym kodem, ale może zostać ponownie zaproszony. Migracja Supabase jest już wykonana w projekcie StreamHouseRPG, a szczegóły i testy opisano w [docs/ZMIANY-V11.8.md](docs/ZMIANY-V11.8.md).

### v11.6 · Portal tylko online

Usunięto dostęp do portalu bez logowania Discord. Profil, postacie, kampanie i archiwum zapisują się w Supabase, a przeglądarka wykorzystuje jedynie cache po zweryfikowaniu sesji. Szczegóły: [README-V11.6.md](README-V11.6.md).

**NOWOŚĆ v11.4:** czat v21 i wiadomości prywatne znajomych. Szczegóły: [README-V11.4.md](README-V11.4.md).

# StreamHouse RPG Companion

## Poprawki v11.3 (interfejs)

- Połowę węższe obrzeża kości w rendererach powitalnym, WebGL i Canvas.
- Panele MG i gracza bez nieużywanej nawigacji ikonowej; przycisk „Opuść pokój” przy nagłówku.
- W kampaniach przycisk „Wejdź do świata” i mniejsze, niepogrubione opisy profilu.
- Szczegóły i założenia lekkiego czatu w [`README-V11.3.md`](README-V11.3.md).


> **POPRAWKA v11.1 / launcher i klikana D20.** Przywrócono szatę v7 i oryginalny pokój/kości v21. Wersja ZIP zawiera wszystkie tekstury fizycznie. Uruchamiaj przez `Uruchom-StreamHouse.bat`, nie przez dwuklik `index.html`. Kostka na portalu lekko podskakuje po kliknięciu. Zobacz [README-V11-NAPRAWA.md](README-V11-NAPRAWA.md).


Portal i narzędzia do prowadzenia sesji D&D online, stworzone z zachowaniem oryginalnego pokoju v21.

**Wejście:** `index.html` → `StreamHouse-Portal.html` → `Kreator-Postaci.html` lub `pokoj/index.html`.

## Moduły

| Moduł | Plik | Działanie |
| --- | --- | --- |
| Strona główna | `index.html` | Wprowadzenie i wejście do portalu |
| Konto, bohaterowie, kampanie | `StreamHouse-Portal.html` | Discord OAuth wymagany + Supabase; cache po zalogowaniu |
| Kuźnia bohatera | `Kreator-Postaci.html` | 8 etapów, portrety, zapisy i import |
| Pokój fabularny | `pokoj/index.html?...&layout=classic` | Narracja bez obowiązkowej planszy |
| Pokój taktyczny | `pokoj/index.html?...&layout=tactical` | Dodatkowo plansza i pionki |
| Oryginalny pokój v21 | `rozgrywka/StreamHouse-v21-{MG,Gracz}.html` | Prototyp lokalny, nie wspólna chmura |
| Pracownia Kości | `rozgrywka/StreamHouse-v21-Pracownia-Kosci.html` | 20 zestawów i efekty 3D |
| Katalog rycin | `Katalog-Rycin-PD.html` | Katalog pomocniczy |

Ważne: oryginalne okna v21 mają lokalną komunikację, **nie** łączą się automatycznie z pokojem online. Pełna sesja sieciowa w v9 to `pokoj/` z aktywną bazą Supabase. Mapa jest **opcjonalna**, a domyślny jest pokój fabularny.

## Uruchom lokalnie (v11)

**Windows 10/11:** kliknij `Uruchom-StreamHouse.bat`. Skrypt użyje Pythona lub Node.js, jeśli są zainstalowane, a w przeciwnym razie wbudowanego Windows PowerShell. **Nie trzeba instalować** Pythona lub Node.js. **Linux/macOS:** `bash Uruchom-StreamHouse.sh`. ZIP v11.1 zawiera gotowe grafiki; kod z GitHuba odtwarza tekstury automatycznie.

### Uruchomienie ręczne

```bash
bash scripts/unpack-media.sh       # tylko po pobraniu repozytorium z GitHub
python3 scripts/check-project.py
python3 -m http.server 8000
```

Otwórz `http://localhost:8000/StreamHouse-Portal.html` i zaloguj się przez Discord. Lokalny adres musi być dopisany do dozwolonych Redirect URLs w Supabase Auth. Otwieranie HTML przez `file://` nie obsługuje logowania OAuth.

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
- Migracje bazy znajdują się w `supabase/migrations/`. W projekcie StreamHouseRPG są już wykonane (łącznie z v11.6); nie uruchamiaj ich ponownie.
- Pierwsze logowanie Discord potwierdzono. Trzeba jeszcze przetestować synchronizację i uprawnienia na dwóch różnych kontach. Testy lokalne nie zastępują testu produkcyjnego.
- Repo zawiera źródła HTML/CSS/JS oraz podzielone archiwum zasobów (`bundles/media.part*`), które `scripts/unpack-media.sh` automatycznie rozpakowuje. To konieczne, ponieważ biblioteki tekstur kości są duże.

## v11.2 — interakcje portalu

Kość D20 na stronie powitalnej i logowania obraca się po kliknięciu bez wyróżniania wyniku. Bohaterów (także przykładowych) usuwa się przez przycisk czaszki, z potwierdzeniem i powiadomieniem. W profilu można ustawić własny podpis pod nazwą użytkownika, wspólny dla widoku profilu i bocznego menu. W bocznym menu Discord widoczny jest jako sama ikona. Szczegóły: [README-V11.2.md](README-V11.2.md).

## Baza danych Supabase (13.11.2026)

Projekt **StreamHouseRPG** `xqfglhaapojxnjdmxkrm` ma wgrane wszystkie migracje od v7 do v11.4 oraz migracje zabezpieczajaca `20261113154000_streamhouse_chat_hardening.sql`. Publiczny adres i **publishable key** sa wpisane w `assets/cloud-config.js`. Discord OAuth został już skonfigurowany i potwierdzono pierwsze logowanie. Szczegoly: [docs/SUPABASE-URUCHOMIENIE.md](docs/SUPABASE-URUCHOMIENIE.md). Strona została opublikowana na Mikrusie z HTTPS, a aktualizacje plików są pobierane automatycznie z GitHuba.
