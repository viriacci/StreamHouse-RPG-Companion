# StreamHouse RPG Companion v11.9 · optymalizacja i porządki

## Cel

Zmniejszenie powtarzanych pobrań, obciążenia JavaScript i duplikacji kodu, bez zmieniania danych użytkowników, uprawnień, wyglądu ani zakresu funkcji v11.8.

## Wspólne zasoby v21

Pojedyncze panele MG i gracza zawierały takie same bloki CSS i JavaScript. Zostały wydzielone do:

- `rozgrywka/assets/v21-shared-base.css`
- `rozgrywka/assets/v21-shared-foundation.js`
- `rozgrywka/assets/v21-shared-dice-ui.js`
- `rozgrywka/assets/v21-shared-library.js`

Pliki HTML zachowują kolejność ładowania i wykonywania skryptów: zewnętrzne skrypty nie używają `async` ani `defer` w miejscach dawnych skryptów inline. Różniący się kod paneli MG i gracza pozostał oddzielny.

| Panel | HTML przed | HTML po | Różnica |
| --- | ---: | ---: | ---: |
| MG | 287 573 B | 90 402 B | -197 171 B |
| Gracz | 264 709 B | 67 538 B | -197 171 B |

Wspólne pliki mają łącznie 197 059 znaków. Pierwsze wejście musi je nadal pobrać. Korzyścią jest mniejszy HTML i możliwość ponownego wykorzystania tych samych zasobów z pamięci podręcznej przeglądarki przy przechodzeniu między panelami. Nie są to wyniki pomiaru czasu ładowania ani gwarancja identycznego zysku na każdym urządzeniu.

## Mniej pracy w tle

- Pokój online: odstęp awaryjnego odświeżania zwiększono z 6,5 s do 18 s, zachowując reakcje na zdarzenia Realtime. To około 64% mniej zaplanowanych cykli pollingowych na bezczynnej karcie, nie 64% mniej wszystkich zapytań w aktywnej sesji.
- Krótkie serie zdarzeń pokojowych są łączone przez 200 ms, bez odpalania wielu tych samych pobrań.
- Heartbeat obecności nie powoduje już dodatkowego pełnego odczytu po każdym zapisie.
- Porównanie składu drużyny i kart w pokoju ponownie używa poprzednio zapisanych reprezentacji danych, zamiast wielokrotnie serializować poprzedni snapshot.
- Portal pobiera samą listę zaproszeń po powiadomieniu o nowym zaproszeniu, bez ponownego pobierania wszystkich kart, archiwum i profilu. Przy istotnej zmianie członkostwa lub powrocie do karty pobiera pełny stan.
- Lista znajomych: nakładające się odczyty współdzielą krótkotrwałą pamięć podręczną (4 s), unieważnianą po dodaniu, przyjęciu i usunięciu znajomego oraz po odpowiednim zdarzeniu Realtime.
- Lista kampanii: rola MG jest wyznaczana ze sprawdzonego właściciela kampanii, z pominięciem zbędnego drugiego pobrania tabeli członkostwa. RLS w Supabase nadal decyduje, które kampanie użytkownik może zobaczyć.
- Okresowe pobieranie listy kart v21 nie uruchamia drugiego żądania, jeśli poprzednie nie zakończyło się.
- Animacja D20 na stronie powitalnej zatrzymuje własną pętlę `requestAnimationFrame` poza ekranem lub na ukrytej karcie.
- Portal nie przebudowuje całego widoku po czynnościach, które nie zmieniają danych panelu (np. skopiowanie linku).

## Porządki w kodzie

Usunięto komentarze niebędące wykonywalnym kodem z autorskich plików HTML, JS, CSS i skryptów wdrożeniowych; pozostawiono powłokowe shebangi oraz dokumentację poza kodem. Zachowano historyczne migracje Supabase bez modyfikacji, ponieważ są już zastosowane w produkcyjnej bazie i mają znaczenie dla historii wdrożeń. Nie zmieniano schematu bazy ani zasad RLS.

## Weryfikacja

- Parsowanie JavaScript: 13 kluczowych samodzielnych skryptów oraz 30 skryptów inline na 10 stronach zakończyło się bez błędów.
- Sprawdzono istnienie wszystkich czterech nowych zasobów i odnośniki w obu panelach v21.
- Test z mockiem Supabase potwierdził rolę właściciela i gracza, brak dodatkowego odczytu członkostwa, współdzielenie równoległych odczytów znajomych oraz unieważnienie cache po zmianie.
- Skrypty publikacji VPS kopiują cały folder `rozgrywka`, w tym nowe zasoby.
- Kontrola nie obejmuje testu graficznego przeglądarki, wydajności mierzonej w DevTools ani kompletnej sesji dwóch kont Discord.

## Uruchomienie

Zmiany są statyczne i mogą zostać pobrane przez istniejący aktualizator VPS z gałęzi `main`. Nie potrzeba nowej migracji SQL. Na produkcji należy sprawdzić oba panele, bibliotekę kości, czat i przechodzenie między kampaniami; szczególnie warto zweryfikować pamięć podręczną przeglądarki po publikacji.
