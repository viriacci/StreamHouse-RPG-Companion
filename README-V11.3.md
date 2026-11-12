# StreamHouse v11.3 – Poprawki interfejsu

## Zmiany
- Obramowania D20 i pozostałych kości zmniejszono o 50% (zarówno na ekranie powitalnym i logowania, jak i w renderingu Canvas/WebGL pracowni kości). Nie zmieniono tekstur ani efektu wyniku.
- Usunięto wąski, nieaktywny pionowy pasek nawigacji z paneli MG i gracza v21, zachowano responsywny układ trzech sekcji.
- Dodano widoczne „← Opuść pokój” w nagłówku paneli MG i gracza oraz w pokoju sieciowym. Powrót kieruje do listy kampanii.
- „Pokój fabularny v21” w portalu zastąpiono „Wejdź do świata”. Zmieniono też przycisk fabularny w nagłówku przeglądu na tę samą nazwę.
- Opisy pomocnicze pól edycji profilu są teraz wyraźnie mniejsze, lżejsze i z niższym kontrastem. Poprawka nadpisuje starszą, silniejszą regułę CSS `.field > span`.

## Architektura czatu (propozycja na kolejny etap)
Czat tekstowy kampanii i wiadomości między znajomymi mogą działać na Supabase (tabele wiadomości + RLS + Realtime). Statyczny VPS przez Nginx dostarcza wyłącznie pliki; wysyłanie wiadomości nie zużywa jego RAM/CPU poza serwowaniem aplikacji. Potrzebne jest logowanie, kontrola uprawnień, ograniczenia częstotliwości, paginacja historii, polityka retencji i testy dwóch użytkowników. Ta wersja **nie zawiera** jeszcze czatu prywatnego i nie tworzy żadnych nowych tabel SQL.

## Start
Rozpakuj do nowego folderu, uruchom `Uruchom-StreamHouse.bat`, wejdź do portalu. Testy lokalne i kodowe nie dowodzą poprawności produkcyjnego Supabase.
