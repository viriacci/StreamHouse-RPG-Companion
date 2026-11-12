# StreamHouse v11.1: launcher i podskok D20

## Windows

1. Rozpakuj caly ZIP do nowego folderu, nie uruchamiaj .bat wewnatrz WinRAR/7-Zip.
2. Kliknij dwukrotnie **Uruchom-StreamHouse.bat**.
3. Okno uruchomienia pozostaje otwarte. W przegladarce otworzy sie strona, zwykle http://127.0.0.1:8765/.
4. Jesli przegladarka nie otworzy sie automatycznie, przepisz adres widoczny w oknie.
5. Jesli launcher sie nie uruchomi, przeczytaj komunikat (okno bedzie czekalo na klawisz) i skopiuj jego tresc.

Dostepne sposoby startu: Python 3, Node.js, **Windows PowerShell 5.1** (wbudowany w Windows 10/11). Skrypt wybiera automatycznie kolejna wolna koncowke portu, jezeli 8765 jest zajety.

## Kostka

Klikniecie zielonej D20 w portalu wywoluje krotki podskok, bez zastapienia oryginalnego obrotu lub tekstury. Kość można aktywowac takze Enterem lub Spacja po wybraniu przyciskiem Tab.

## Ograniczenia

Testy wykonano w srodowisku Linux (skrypty Python/Node i test zdarzenia klikniecia w Chromium). Start .bat / PowerShell wymaga potwierdzenia na prawdziwym Windows. Poprawka nie zmienia bazy danych Supabase ani wspolnej synchronizacji pokoju v21.
