# StreamHouse RPG Companion v11.8 · 13 listopada 2026

## Zarządzanie drużyną online

- W szczegółach kampanii przycisk **Zarządzaj drużyną** (MG) / **Skład drużyny** (gracz).
- Skład jest pobierany z Supabase i wyświetla realnych członków zamiast przykładów.
- MG może wysłać **imienne zaproszenie** tylko zaakceptowanemu znajomemu StreamHouse.
- Zaproszenia pojawiają się w **Moje kampanie** na koncie odbiorcy: **Akceptuj / Odrzuć**.
- Lista znajomych pokazuje, kiedy zaproszenie czeka na odpowiedź.
- Dotychczasowe linki zaproszeń i wysyłanie ich przez czat pozostają dostępne.
  Wysyłka linku wybranemu znajomemu tworzy teraz również zaproszenie przypisane do konta.
- Odbiorca otrzymuje aktualizację przez Realtime, a po powrocie na kartę dane są również odświeżane.
- MG może usunąć gracza z kampanii po potwierdzeniu.
- Usunięcie odbiera członkostwo i dostęp do pokoju, usuwa obecność gracza,
  udostępnienia jego kart w tej kampanii oraz stan sesji powiązany z udostępnieniem.
  **Prywatna karta na koncie gracza nie jest kasowana.**
- Usunięty gracz nie może wrócić za pomocą starego linku. Nowe imienne zaproszenie
  od MG i jego akceptacja przywracają członkostwo.

## Bezpieczeństwo

- Zmiany członkostwa wykonywane wyłącznie przez funkcje PostgreSQL RPC
  z kontrolą tożsamości po `auth.uid()` i uprawnień właściciela kampanii.
- Gracze nie mają uprawnień bezpośredniego zapisu w `sh_campaign_members`
  ani w `sh_campaign_direct_invites`.
- RLS pozwala odczytywać zaproszenia tylko odbiorcy i MG danej kampanii.
- MG nie może wyrzucić siebie ani drugiego MG. Kod nie ufa rolom podawanym przez przeglądarkę.
- Rejestr usuniętych członków znajduje się w prywatnym schemacie `private`;
  nie jest udostępniany przez Data API.
- Dotychczasowa tabela kodów i jej limity pozostają bez zmian.

## Migracja bazy

`supabase/migrations/20261113200747_streamhouse_campaign_member_management_v11_8.sql`

Migracja została wykonana na Supabase `StreamHouseRPG` 13.11.2026 i
zarejestrowana w historii migracji. **Nie uruchamiać jej ponownie na tym projekcie.**
Wgrywanie statycznych plików na VPS nie wykonuje migracji automatycznie.
Dla nowej instalacji należy wykonać migracje w historycznej kolejności.

## Testy

- Sprawdzono składnię JS dodanych skryptów oraz zachowanie RPC w transakcyjnym
  teście integracyjnym: zaproszenie, akceptacja, lista członków, usunięcie,
  próba użycia starego linku, ponowne zaproszenie i odmowa.
- Testowe rekordy zostały automatycznie wycofane bez trwałych zmian.

**Przed pełnym odbiorem interfejsu** należy przetestować dwie prawdziwe sesje
Discord w osobnych przeglądarkach:
1. MG wysyła zaproszenie w oknie „Zarządzaj drużyną”.
2. Drugi użytkownik widzi je w „Moje kampanie” i akceptuje.
3. MG widzi gracza na liście, po czym go usuwa.
4. Gracz traci dostęp do pokoju; nie może ponownie wejść starym linkiem.
5. MG wysyła nowe zaproszenie; gracz po akceptacji może ponownie wejść.
6. Zweryfikuj brak dostępu do prywatnych kart innego gracza po usunięciu.

## Poza zakresem v11.8

Pełna synchronizacja wszystkich demonstracyjnych mechanik
oryginalnych paneli v21 i system wspólnej rozgrywki w czasie rzeczywistym
nie są jeszcze ukończone. Nie należy mylić zarządzania członkostwem
z pełnym połączeniem scen i mechanik sesji.
