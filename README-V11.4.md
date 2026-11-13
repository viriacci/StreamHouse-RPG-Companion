# StreamHouse v11.4 · Czat kampanii i wiadomości znajomych

## Co dodano

- **Oryginalne pokoje v21 (MG i gracz):** w prawym dolnym rogu przycisk „✉ Czat drużyny”. UI otwiera się w wysuwanym oknie i nie zmienia wcześniejszego wyglądu panelu.
- **Pokój lokalny:** oba okna tej samej przeglądarki korzystają z tej samej historii, ale nie są połączone przez internet.
- **Pokój online:** przez portal w kampanii online wybierz „Klasyczny pokój + czat (beta)”. Wiadomości trafiają do `sh_room_events` i są widoczne w nowszym pokoju online `/pokoj/`. **Uwaga:** pozostałe funkcje v21, w tym scena, rzuty v21 i wyposażenie, nadal pozostają lokalne. W v11.4 online synchronizowany jest czat, nie cała gra.
- **Znajomi → Poczta kronikarzy:** identyfikator własnego konta (UUID) można skopiować, wysłać zaproszenie po ID znajomego, zaakceptować/odrzucić je, usunąć znajomego i prowadzić prywatną rozmowę 1:1.
- **Wiadomości:** historia ostatnich 60 wpisów, z odświeżaniem Realtime i fallbackiem co 20 sekund. LocalStorage nie przechowuje prywatnych rozmów.

## Wymagania online

1. Aktywny projekt Supabase i poprawnie skonfigurowany Discord OAuth z wersji v7.
2. Wykonane wcześniejsze migracje **v7 → v8 → v9**.
3. Nowa migracja: `supabase/migrations/20261113140000_streamhouse_friends_messages.sql`.
4. `supabase_realtime` musi zawierać tabele `sh_friend_links`, `sh_direct_messages` i `sh_room_events`.
5. Wszyscy rozmówcy muszą być zalogowani na **różne konta**. Dodanie nicku do lokalnej listy nie oznacza zaproszenia w systemie.

## Bezpieczeństwo

- Przechowuj w frontendzie tylko **publishable key**, nigdy `service_role` ani Discord Client Secret.
- Zaproszenia obsługują sprawdzające `auth.uid()` funkcje RPC. `sh_friend_links` nie pozwala na bezpośrednie modyfikacje z poziomu klienta.
- Odczyt wiadomości wymaga zaakceptowanej znajomości, a wysłanie wymaga zgodności `sender_id` z `auth.uid()`.
- Treść 1–1000 znaków, limit 30 wiadomości prywatnych na minutę na konto (trigger w bazie). Historia w UI ma limit 60 rekordów, nie wczytuje całego archiwum.
- RLS dla czatu kampanii dopuszcza członków właściwej kampanii. Gracz spoza kampanii nie może odczytywać ani wysyłać wiadomości.
- Przy usunięciu znajomego jego prywatne wiadomości przestają być widoczne przez API. Nie są automatycznie kasowane z bazy.

## Wdrożenie

```bash
cd /opt/streamhouse-rpg
bash scripts/update-vps.sh
```

**Ważne:** skrypt aktualizacji serwera nie uruchamia migracji. Wykonaj nową migrację osobno w Supabase SQL Editor i sprawdź dwa konta przed publicznym uruchomieniem.

## Scenariusz testu z dwiema osobami

1. A i B logują się przez Discord na osobnych profilach. A kopiuje swoje ID z zakładki Znajomi; B wysyła zaproszenie do A.
2. A akceptuje zaproszenie. B widzi A w sekcji Znajomi online.
3. A wysyła wiadomość. B widzi ją bez przeładowania strony (lub w ciągu 20 s przy niedostępnym Realtime).
4. C, niebędący znajomym A/B, nie może odczytać wiadomości. B po usunięciu A traci do nich dostęp.
5. MG dodaje gracza do kampanii. Otwierają oryginalne pokoje z URL `?campaign=UUID` i piszą w czacie.
6. Osoba niezaproszona do kampanii otrzymuje błąd uprawnień, a nie dane rozmowy.
7. Sprawdź limit 30 DM/min i treści o długości ponad 1000 znaków.

**Stan w tej paczce:** funkcje są zaimplementowane, można je uruchomić w trybie demonstracyjnym i testować UI. Nie zostały przetestowane na rzeczywistych kontach Supabase, ponieważ projekt podłączony do ChatGPT był nieaktywny. W tym wydaniu nie wdrażałem migracji do produkcyjnej bazy.
