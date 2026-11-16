# StreamHouse v11.11 · Administracja i staging

## Zakres tej gałęzi

Kod znajduje się wyłącznie na `feature/admin-staging-v11.11`. Produkcyjna gałąź `main`, jej deploy oraz projekt Supabase `xqfglhaapojxnjdmxkrm` pozostają bez zmian.

Panel: `/admin/index.html`. Funkcje:
- **Przegląd**: liczba kont, bohaterów, kampanii, wydarzeń; ostatnie kampanie i operacje
- **Użytkownicy**: wyszukiwanie po nazwie/UUID, liczby postaci i kampanii, nadanie lub odebranie moderatora (tylko właściciel)
- **Kampanie**: filtrowanie, archiwizacja/przywracanie, członkowie kampanii, usuwanie graczy
- **Audyt**: zapis aktora, celu, czasu i uzasadnienia każdej zmiany
- **System**: status konfiguracji, ról, zakres uprawnień i izolacji

Domyślnie NIE MA możliwości czytania prywatnych rozmów, edycji prywatnych kart, usuwania kont ani trwałego kasowania kampanii. Treść prywatnych wiadomości nie jest dostępna przez RPC. Działania moderacyjne wymagają uzasadnienia (minimum pięć znaków).

## Szybki podgląd bez bazy i bez kosztów

Gałąź ma workflow `.github/workflows/admin-staging.yml`, który na każdy push przygotowuje w **GitHub Actions** artefakt `streamhouse-admin-v11.11-preview`. To osobny statyczny podgląd (nie jest to automatycznie publiczny URL). Podczas budowania:
1. Odtwarzane są tekstury i media.
2. Uruchamiane są kontrole projektu, skryptów admina, JavaScript i Bash.
3. Zastępowana jest konfiguracja Cloud domyślnymi pustymi wartościami.
4. Włączany jest WYŁĄCZNIE tryb demo administratora z fikcyjnymi danymi.

Pobierz artefakt z GitHub Actions, rozpakuj go lokalnie, wejdź do katalogu głównego i uruchom:

```bash
python3 -m http.server 8091 --bind 127.0.0.1
```

Otwórz `http://localhost:8091/admin/`. Możesz zmieniać przykładowe dane w pamięci karty, ale nie zapisują się one w Supabase i nie są prawdziwymi kontami.

## Testowy deploy na VPS obok produkcji

Na VPS utwórz ODDZIELNY katalog repozytorium:

```bash
git clone --branch feature/admin-staging-v11.11 --single-branch \
  https://github.com/viriacci/StreamHouse-RPG-Companion.git \
  /opt/streamhouse-admin-staging
cd /opt/streamhouse-admin-staging
bash scripts/unpack-media.sh
sudo bash scripts/deploy-staging.sh
```

Skrypt:
- Odmawia uruchomienia z innej gałęzi oraz w katalogu produkcyjnym.
- Publikuje do `/var/www/streamhouse-staging/releases/...` i oddzielnego symlinku `current`.
- Tworzy usługę systemd `streamhouse-staging.service` na **127.0.0.1:8091**.
- Nie zmienia vhostów Nginx, prodowego `/var/www/streamhouse/current`, głównej gałęzi ani produkcyjnej bazy.
- Zawsze czyści domyślną produkcyjną konfigurację Supabase w wydaniu testowym.
- Bez osobnej konfiguracji uruchamia bezpieczny tryb demonstracyjny.

Na swoim komputerze (w osobnym terminalu):

```bash
ssh -L 8091:127.0.0.1:8091 TWOJ_UZYTKOWNIK@ADRES_VPS
```

Otwórz `http://localhost:8091/admin/`. Port nie jest wystawiany publicznie. Jeśli serwer wymaga innego portu, użyj `STREAMHOUSE_STAGING_PORT`.

### Aktualizacja stagingu

```bash
cd /opt/streamhouse-admin-staging
git pull --ff-only
bash scripts/unpack-media.sh
sudo bash scripts/deploy-staging.sh
```

## Prawdziwy test autoryzacji z odrębną bazą

**Wymaga osobnego projektu lub gałęzi Supabase.** Utworzenie płatnej gałęzi Supabase wymaga jawnego potwierdzenia kosztu. Bez zgody nie tworzymy jej i nie wykonujemy migracji administracyjnej na produkcji.

1. Utwórz testową bazę Supabase i zastosuj wyłącznie na niej migracje projektu, a na końcu `supabase/migrations/20261116090000_streamhouse_admin_console.sql`.
2. Skonfiguruj Discord OAuth dla projektu staging. Zarejestruj redirect URI w Supabase Authentication, np. `http://localhost:8091/admin/index.html`, a w Discord Developer Portal ustaw callback Supabase `https://STAGING_REF.supabase.co/auth/v1/callback`.
3. Zaloguj się na **testowe** konto Discord przez staging, sprawdź UUID użytkownika w `Authentication → Users`.
4. W SQL Editor **bazy staging** nadaj rolę właściciela konkretnemu użytkownikowi:

```sql
insert into private.sh_admin_roles(user_id,role)
values ('TUTAJ_UUID_Z_STAGING_AUTH_USERS'::uuid,'owner')
on conflict (user_id) do update set role=excluded.role;
```

5. Na VPS utwórz osobny plik `/etc/streamhouse/staging-cloud-config.local.js`:

```javascript
window.STREAMHOUSE_CLOUD_CONFIG = {
  url: 'https://STAGING_REF.supabase.co',
  publishableKey: 'sb_publishable_KLUCZ_STAGING'
};
```

6. Uruchom z własnym staging ref:

```bash
cd /opt/streamhouse-admin-staging
sudo STREAMHOUSE_STAGING_PROJECT_REF=STAGING_REF bash scripts/deploy-staging.sh
```

Skrypt weryfikuje, czy konfiguracja nie wskazuje na produkcyjne Supabase. Nie przekazuj `service_role`, `sb_secret_` ani Discord Client Secret do JavaScript, pliku `cloud-config.local.js` ani GitHub.

## Kontrola dostępu

Role są przechowywane w tabeli `private.sh_admin_roles` dostępnej tylko z bazy, a nie w edytowalnym `user_metadata`. Backend sprawdza `auth.uid()` i rolę w **każdym** RPC. Konto bez roli nie odczyta żadnych rekordów panelu. Właściciel może nadawać/odbierać rolę moderatora, ale z panelu nie może utworzyć innego właściciela ani odebrać roli właściciela. Moderator może przeglądać metadane, archiwizować i usuwać graczy; nie zarządza rolami.

Dodatkowa weryfikacja przed udostępnieniem:
- Niezalogowane konto: brak dostępu do wszystkich RPC z danymi.
- Zalogowany zwykły użytkownik: wszystkie RPC administracyjne zwracają brak uprawnień.
- Moderator: nie może nadać uprawnień sobie ani innym.
- Właściciel: może wykonać zatwierdzoną akcję z zapisem w audycie.
- Konta ze zmienioną rolą: ponowna próba RPC musi uwzględniać zmianę bez polegania na starym JWT.
- Konta testowe, wpisy i powiadomienia nie trafiają do bazy produkcyjnej.

## Ograniczenia

- Artefakt GitHub Actions jest gotową paczką demonstracyjną; nie jest to opublikowana publicznie domena.
- Nie ma poświadczeń SSH do VPS w tej sesji, dlatego uruchomienie na serwerze pozostaje do wykonania przez jego operatora.
- Bez osobnej bazy nie można jeszcze zweryfikować migracji SQL w rzeczywistym środowisku testowym. Nie wykonujemy jej na produkcji tylko po to, żeby „sprawdzić”.
- Panel jest pierwszą wersją administracji platformą, nie pełnym panelem operatora Supabase. Zarządzanie konfiguracją OAuth, serwerem oraz usuwaniem danych pozostaje poza zakresem v11.11.
