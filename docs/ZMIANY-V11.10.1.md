# StreamHouse RPG Companion v11.10.1

## Dwa czaty bez kolizji
- W panelach MG i gracza czat znajomych ma przycisk i okno z lewej strony, czat konkretnej kampanii z prawej.
- Powyżej 960 px można otworzyć oba okna jednocześnie.
- Przy szerokości do 960 px otwarcie jednego panelu zamyka drugi (dwa niezależne przyciski nadal są widoczne).
- Czat kampanii nadal wysyła i pobiera wyłącznie wiadomości filtrowane po `campaign_id`; czat znajomych korzysta z prywatnych wiadomości Supabase.

## Naprawa favicon
- Dodatkowe pliki: `favicon.ico` w katalogu głównym, `assets/favicon-16.png` i `assets/favicon-32.png`.
- Dziesięć stron ma odwołania do SVG, PNG 16/32 oraz ICO z parametrem odświeżającym cache `?v=11101`.
- `scripts/deploy.sh` kopiuje ICO do katalogu głównego wdrożenia; `scripts/check-project.py` sprawdza nowe pliki.

## Intro i audio
- Animacja może rozpocząć się sama, ale dźwięk uruchamia się po pierwszym `pointerdown` w dokumencie lub klawiszu Enter/Spacja. To obsługa polityki autoplay Chrome, Edge, Opera i Safari.
- Jeśli użytkownik kliknie podczas trwania intro, animacja restartuje się i odtwarza dźwięk.
- Jeśli intro zdążyło się zamknąć, pierwszy gest uruchamia sam dźwięk, bez blokowania przechodzenia na inne strony.
- Przyciski włączania dźwięku i odtwarzania intro zachowano, ale pominięto podwójne odtwarzanie przy kliknięciu.
- Dźwięk Web Audio jest planowany synchronicznie w obsłudze gestu; `AudioContext.resume()` nie opóźnia już utworzenia węzłów.

## Weryfikacja
Zmiany w JS sprawdzono pod kątem składni, linki do faviconów oraz zasoby deploymentu sprawdzono w repozytorium. Testy dźwięku na fizycznym urządzeniu i ocena UI w prawdziwej przeglądarce wymagają weryfikacji po aktualizacji serwera. Brak możliwości zagwarantowania audio autoplay bez interakcji.
