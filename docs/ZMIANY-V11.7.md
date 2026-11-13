# StreamHouse RPG Companion v11.7 · 13 listopada 2026

## Zmiany

- Jedna widoczna opcja wejścia do kampanii: **Wejdź do świata**, prowadząca do klasycznego panelu v21 z czatem.
- Usunięta nadmiarowa nawigacja i objaśnienia logowania; wylogowanie umieszczone pod „Mój profil”.
- Logo w portalu otwiera przegląd dla zalogowanego użytkownika.
- Wycentrowane hasło na końcu strony głównej, bez przycisku obok.
- Sekcja znajomych na pełnej szerokości, z udostępnianiem ID i wysyłaniem wiadomości Enterem.
- MG może wygenerować zaproszenie do kampanii i wysłać je zaakceptowanemu znajomemu bezpośrednio na czacie.
- Nowa nakładka prywatnego czatu dla zalogowanych kont na wszystkich stronach portalu i panelach.
- Panel v21 MG/gracza pobiera udostępnione karty kampanii online z Supabase. Nie wyświetla trzech przykładowych bohaterów jako prawdziwej drużyny. Brak udostępnionych kart jest sygnalizowany pustym stanem.
- Naprawione odnośniki do widoku gracza w v21.
- Ranty kości w rysowanym modelu Canvas są o 50% cieńsze, z metalicznym gradientem rozświetlenia.
- Mniej wyeksponowane teksty pomocnicze w edycji profilu; poprawiony odstęp nazwy i opisu umiejętności w kreatorze.

## Zakres wersji

Czat prywatny i udostępnione karty bazują na istniejących tabelach, uprawnieniach i RLS Supabase. Ta wersja **nie** dodaje migracji SQL.

**Nie jest jeszcze ukończone:** wyrzucanie członka z kampanii przez MG, pełna synchronizacja wszystkich mechanik/scen klasycznych paneli v21 oraz system wspólnej rozgrywki w czasie rzeczywistym. Panel v21 nadal zawiera mechaniki demonstracyjne poza czatem i prezentacją kart. Nie należy ich mylić z zapisem sesji online.

Wdrożenie: automatyczny proces aktualizacji VPS powinien pobrać commit z gałęzi main i uruchomić dotychczasowy skrypt wdrożenia. Baza nie wymaga nowej migracji.
