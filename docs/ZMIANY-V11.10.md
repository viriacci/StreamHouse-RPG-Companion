# StreamHouse RPG Companion v11.10

## Zmiany

### Kości
- Mniejsza szerokość geometrii rantów WebGL (wewnętrzny obrys z 0.885 do 0.940 szerokości powierzchni, krawędź z promienia 0.0145 do 0.009).
- Metaliczniejsze, kierunkowe refleksy na srebrnej ramie.
- Zmniejszona szerokość obramowania we fallbacku Canvas (inset 0.11 → 0.062).
- Bez zmiany logiki losowania wartości lub tekstur.

### MG a drużyna
- Karty udostępniane przez właściciela kampanii (MG) są filtrowane z list postaci drużyny w panelu MG, panelu gracza, widoku pokoju i portalu.
- Konto MG pozostaje właścicielem kampanii, a jego prywatne postacie nie są usuwane.
- MG jest pokazany osobno w liście członków, nie jako gracz z postacią.

### Zarządzanie kampanią
- Gracz otrzymuje opcję **Porzuć kampanię**, z potwierdzeniem.
- MG otrzymuje **Archiwizuj kampanię** i **Przywróć kampanię**, z potwierdzeniem.
- Zarchiwizowane kampanie są przenoszone z listy aktywnych do archiwum. Gracz nadal może opuścić zarchiwizowaną kampanię.
- W bazie zapisuje się data archiwizacji `sh_campaigns.archived_at`, bez kasowania danych.
- RPC `sh_campaign_leave` usuwa wyłącznie członkostwo i obecność danego gracza. Udostępnienia jego kart i ich stan sesyjny są usuwane przez istniejące klucze obce `ON DELETE CASCADE`, a prywatne karty pozostają.
- RPC `sh_campaign_set_archived` zezwala na archiwizację/przywrócenie wyłącznie właścicielowi.
- Trigger członkostwa odmawia dołączania do zarchiwizowanej kampanii, także ze starych linków. Zaproszenia osobiste z takich kampanii znikają z aktywnej skrzynki zaproszeń do czasu przywrócenia.
- Nie zmieniano ani nie kasowano istniejących kampanii przy migracji.

### Znajomi i czat
- **Udostępnij** kopiuje pełny URL `StreamHouse-Portal.html?friend=<UUID>` do schowka i pokazuje komunikat o powodzeniu.
- Link zachowuje ID po przejściu przez logowanie Discord OAuth. Odbiorca musi zatwierdzić wysłanie zaproszenia do znajomych.
- Globalny czat dodano do dziesięciu stron HTML, w tym pokoju, pracowni kości, dziennika i archiwum rycin.
- Stan otwarcia okna jest zapisywany na czas sesji przeglądarki.
- Osoba niezalogowana widzi wejście do portalu, a nie pusty panel.
- W zagnieżdżonej pracowni kości `?embed=1` nie wyświetla się drugi czat, aby nie zasłaniał animacji.

### Identyfikacja wizualna i intro
- `assets/favicon.svg`: uproszczony srebrno-zielony znak D20 ze złotą ścianką, spójny z wyglądem kości i logo StreamHouse; dołączony do wszystkich dziesięciu stron.
- `assets/intro-audio.js`: **oryginalny** efekt dźwiękowy wytwarzany w Web Audio API (narastanie, głębokie uderzenie, magiczne wybrzmienie).
- Nie kopiowano ani nie redystrybuowano plików z bibliotek stockowych i nie użyto utworów chronionych Content ID.
- Domyślnie intro jest ciche ze względu na ograniczenia autoplay. Kliknięcie **Włącz dźwięk intro** lub **Odtwórz intro** odtwarza dźwięk za zgodą użytkownika.

## Migracje Supabase

Wykonano w projekcie StreamHouseRPG i zapisano w repozytorium:

1. `supabase/migrations/20261114015459_streamhouse_campaign_archive_leave_v11_10.sql`
2. `supabase/migrations/20261114020727_streamhouse_archive_pending_invites_v11_10.sql`

Nie uruchamiać ponownie na tym samym projekcie. Na nowych instalacjach wykonać po migracjach v11.8.

## Kontrole

- Funkcje archiwizacji i porzucania mają kontrolę `auth.uid()` i odpowiednich uprawnień.
- W próbie SQL z fikcyjnymi użytkownikami: właściciel archiwizuje i przywraca, link do archiwum jest blokowany, gracz nie może odarchiwizować, gracz może opuścić kampanię, właściciel nie może opuścić własnej. Dane testowe wycofano transakcyjnie.
- Sprawdzono składnię JS zmienianych plików i wszystkich skryptów inline w dziesięciu stronach.
- Sprawdzono odnośniki do favicon i globalnego czatu; repozytorium nadal zawiera zasoby multimedialne `bundles/media.part*`, rozpakowywane przez `scripts/unpack-media.sh`.

## Testy końcowe do przeprowadzenia w przeglądarce

1. MG i gracz na dwóch realnych kontach Discord: drużyna bez karty MG.
2. Gracz opuszcza kampanię, tracąc dostęp, MG zachowuje postacie i dane świata.
3. MG archiwizuje, próbuje dołączyć starym linkiem, przywraca kampanię.
4. Udostępnij link znajomego, skopiuj i otwórz w trybie incognito.
5. Chatuj na stronie głównej, w panelach, pokoju, dzienniku i kreatorze, sprawdź mobile.
6. Sprawdź metalowe krawędzie D20 w WebGL oraz Canvas fallback i dźwięk po kliknięciu.

Nie ma jeszcze pomiaru wydajności ani wizualnego testu na realnym GPU. Statyczny commit w GitHubie nie oznacza automatycznie potwierdzonego wdrożenia produkcyjnego.
