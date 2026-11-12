# StreamHouse RPG Companion v11.1: przywrócenie interfejsów i launcher

Ta wersja naprawia regresje powstałe podczas scalania v10. Bazą są oryginalny ekran wejściowy v7 oraz przekazane przez autora panele MG/Gracza/Pracowni Kości v21.

## Co zostało naprawione

1. **Start i logowanie:** niezmieniony projekt graficzny z v7, oryginalna animowana kość D20 z teksturą malachitu. W paczce zawarto `assets/emerald-d20-albedo.webp`, więc grafika nie wymaga dodatkowego rozpakowania. Jeżeli plik jest uszkodzony, pojawia się awaryjny symbol zamiast pustego obszaru.
2. **Pokój fabularny:** tryb lokalny otwiera **oryginalny panel MG/gracza v21** z ilustracjami, drużyną, kroniką, kartami i całym układem. Portal posiada też powrót do swoich kampanii.
3. **20 zestawów kości:** przywrócono oryginalną Pracownię Kości v21 (WebGL2 PBR, atlas UV i fallback Canvas), z pełnym zestawem atlasów/tekstur. Rzut wykonany w pokoju sieciowym wyświetla wynik za pośrednictwem tej samej Pracowni, zamiast starej uproszczonej zielonej bryły. Wynik nadal pochodzi z pokoju i nie jest losowany ponownie.
4. **Sceny i portrety:** grafiki i tekstury są obecne fizycznie w ZIP; demo sceny w panelach v21 korzysta także z oryginalnych ilustracji osadzonych w HTML.
5. **Uruchamianie:** `Uruchom-StreamHouse.bat` uruchamia serwer localhost zamiast otwierać plik `file://`. Jeżeli kod pobrano z GitHuba, skrypt automatycznie odtwarza media z `bundles/media.part*`.

## Uruchomienie na Windows

1. Rozpakuj **cały** plik ZIP v11.1 do osobnego katalogu. Nie uruchamiaj aplikacji z podglądu archiwum.
2. Otwórz `Uruchom-StreamHouse.bat`.
3. Skrypt uruchomi serwer przez Python 3 lub Node.js, jeśli są dostępne. W przeciwnym razie użyje **Windows PowerShell**, wbudowanego w Windows 10/11. Python i Node.js nie są wymagane. Adres zostanie pokazany w oknie, zwykle `http://127.0.0.1:8765/`. Okno serwera pozostaw otwarte podczas testów.
4. W portalu wybierz „Otwórz tryb lokalny”, a następnie kampanię demonstracyjną i „Pokój fabularny”.
5. Jeśli port `8765` jest zajęty, launcher automatycznie wybierze kolejny wolny port (do `8780`). Jeśli start się nie powiedzie, okno **nie zamknie się**: pokaże komunikat błędu. Zrób zrzut komunikatu, zamiast zgadywać przyczynę.
6. Na ekranie logowania **kliknij zieloną kość D20**: lekko podskoczy, zachowując normalny obrót. Działa również klawisz Enter po wybraniu jej klawiszem Tab.

**Nie otwieraj `index.html` dwuklikiem**. Tryb `file://` blokuje pobieranie JSON i może zepsuć kreator, portal oraz obrazy. Na Windows 10/11 wystarcza również wbudowany Windows PowerShell, bez żadnych dodatkowych instalacji.

## Uruchomienie na Linux/macOS

```bash
bash Uruchom-StreamHouse.sh
```

Alternatywnie `python3 scripts/start-local.py`.

## Wdrożenie VPS

W repozytorium GitHub pozostają media w postaci części `bundles/media.part*`, ponieważ są duże. Podczas wdrażania:

```bash
cd /opt/streamhouse-rpg
git pull --ff-only origin main
bash scripts/unpack-media.sh
python3 scripts/check-project.py
sudo bash scripts/deploy.sh
sudo nginx -t && sudo systemctl reload nginx
```

Gotowy wariant jednym poleceniem po pierwszej instalacji: `bash scripts/update-vps.sh`. Szczegóły DNS, HTTPS i OAuth: `docs/WDROZENIE-VPS.md`.

## Ważna granica integracji

- **Fabularny v21** jest oryginalnym, piękniejszym prototypem **lokalnym**, a nie pełnoprawnym połączonym przez internet pokojem. Zachowuje lokalną komunikację między panelami.
- **Pokój online (beta)** to osobny moduł `pokoj/` z Supabase; posiada stan kampanii i opcjonalną mapę. Nie udajemy, że ma już identyczny układ i funkcje jak v21. Połączenie całej logiki v21 z synchronizacją sieciową wymaga kolejnego etapu.
- **D20 i PBR**: wygląd odtworzony z oryginalnych plików. Wybór materiału w Pracowni jest zapamiętywany w tej przeglądarce. Do rendering-u WebGL2 potrzebny jest obsługiwany sprzęt, w przeciwnym razie aktywuje się Canvas UV.
- **Supabase:** nadal wymaga aktywnego projektu, OAuth i migracji v7–v9; niczego tu automatycznie nie migrowano. Gra online nie była przetestowana na dwóch rzeczywistych kontach.

## Kontrola przed publikacją

```bash
python3 scripts/check-project.py
python3 scripts/check-ui-regression.py
```

Skrypt wykrywa utratę plików atlasów lub pomylenie oryginalnego panelu v21 z uproszczonym pokojem. Nie zastępuje testów przeglądarkowych ani prawdziwej sesji online.
