# Wdrożenie StreamHouse na VPS Ubuntu 24.04

Przewodnik dla VPS z Ubuntu 24.04 i Nginx, także małych maszyn. **Nie wymaga Node.js, Dockera ani procesu systemd dla samego StreamHouse.** Potrzebujesz dostępu SSH/sudo, własnej domeny/subdomeny, aktywnego projektu Supabase i aplikacji OAuth Discord. Przed zmianą Nginx zachowaj backup obecnej konfiguracji, zwłaszcza jeśli VPS obsługuje inne strony.

## 1. DNS i SSH

Ustaw rekord DNS `A` subdomeny, np. `rpg.example.com`, na publiczne IP VPS. Otwórz na firewallu TCP 80 i 443. Połącz się:

```bash
ssh TWOJ_UZYTKOWNIK@IP_VPS
```

Jeśli na VPS działa już inna witryna pod Nginx, instalator doda osobny vhost, nie usunie istniejących konfiguracji. Upewnij się, że wybrana subdomena nie jest już przypisana do innego vhosta. Sprawdź `sudo nginx -t`.

## 2. Pobierz projekt

```bash
sudo apt update
sudo apt install -y git
sudo git clone https://github.com/viriacci/StreamHouse-RPG-Companion.git /opt/streamhouse-rpg
cd /opt/streamhouse-rpg
```

W repo źródła są jawne, a duże tekstury do kości są spakowane w `bundles/media.part*`.

## 3. Instalacja Nginx i HTTPS

Zastąp przykładowe wartości własną subdomeną i adresem e-mail. DNS musi już wskazywać na VPS:

```bash
cd /opt/streamhouse-rpg
sudo DOMAIN=rpg.example.com EMAIL=admin@example.com bash scripts/install-vps.sh
```

Skrypt instaluje Nginx, rsync, unzip, certbot; rozpakowuje zasoby, weryfikuje kompletność plików, publikuje wyłącznie katalog publiczny w `/var/www/streamhouse/current`, tworzy osobny plik Nginx `/etc/nginx/sites-available/streamhouse` i pobiera certyfikat Let's Encrypt. Nie kopiuje SQL/testów do katalogu WWW. Bez poprawnego DNS operacja certyfikatu się nie uda. Certbot może wymagać konfiguracji sieciowego firewallu.

Po instalacji sprawdź:

```bash
sudo nginx -t
systemctl status nginx --no-pager
curl -I https://rpg.example.com/
curl -I https://rpg.example.com/pokoj/index.html
```

## 4. Supabase i Discord OAuth

**Stan obecny:** poprzednio podłączony projekt Supabase był nieaktywny. Nie zakładaj, że działa. Możesz go przywrócić w panelu lub utworzyć dedykowany projekt, najlepiej odrębny od innych aplikacji.

W aktywnym, nowym projekcie Supabase wejdź w SQL Editor i kolejno uruchom zawartość plików:

1. `supabase/migrations/20261110190000_streamhouse_private_campaigns.sql`
2. `supabase/migrations/20261110230000_streamhouse_live_room.sql`
3. `supabase/migrations/20261110235000_streamhouse_character_state.sql`

**Nie** uruchamiaj tych migracji bez przeglądu w bazie zawierającej inne dane. Nie powtarzaj ich na oślep. Po wdrożeniu sprawdź RLS zgodnie z checklistą w repo. Nie przenoś danych produkcyjnych przed testami na dwóch kontach.

W [Discord Developer Portal](https://discord.com/developers/applications) utwórz aplikację. W jej ustawieniach OAuth2 dodaj URL przekierowania **z Supabase**, nie adres swojej strony:

```text
https://TWOJ-PROJECT-REF.supabase.co/auth/v1/callback
```

W Supabase: `Authentication → Sign In / Providers → Discord` włącz providera i wklej Client ID i Client Secret. **Secret pozostaje wyłącznie w Supabase**, nigdy w GitHubie, HTML czy na publicznym Nginx.

W Supabase: `Authentication → URL Configuration` ustaw:

```text
Site URL:      https://rpg.example.com/StreamHouse-Portal.html
Redirect URLs: https://rpg.example.com/StreamHouse-Portal.html
```

Ustawienie redirect pozwala Supabase wrócić do portalu po autoryzacji. Dla dodatkowego lokalnego testu można dodać osobny `http://localhost:8000/StreamHouse-Portal.html`.

## 5. Konfiguracja publicznego klucza

Na VPS zmień *tylko* plik zewnętrzny (nieedytowany przez Git):

```bash
sudo nano /etc/streamhouse/cloud-config.local.js
```

Wklej (podstaw wartości z `Supabase → Project Settings → API Keys` / Connect):

```javascript
window.STREAMHOUSE_CLOUD_CONFIG = {
  url: 'https://TWOJ-PROJECT-REF.supabase.co',
  publishableKey: 'sb_publishable_TUTAJ_TWOJ_KLUCZ'
};
```

Klucz `sb_publishable_...` jest celowo publiczny i używany w przeglądarce. **Nigdy** nie wpisuj `sb_secret_...`, `service_role` ani Discord Client Secret. RLS musi ograniczać dostęp do danych.

Załaduj konfigurację ponownie na serwer WWW:

```bash
cd /opt/streamhouse-rpg
sudo bash scripts/deploy.sh
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Uruchomienie, testy i aktualizacje

Odwiedź `https://rpg.example.com/`. W portalu sprawdź logowanie Discord na dwóch **różnych** kontach, kampanię, zaproszenie, postać, HP, kronikę, rzuty oraz dwa widoki pokoju. Osobno sprawdź, czy gracz nie może przez API zmieniać danych MG. Pełne testy: `docs/TESTY-PRZED-PRODUKCJA.md`.

Po kolejnych zmianach wrzuconych na GitHub:

```bash
cd /opt/streamhouse-rpg
bash scripts/update-vps.sh
```

Skrypt wykona `git pull --ff-only`, odtworzy zasoby, wdroży nowy katalog, przełączy symlink i przeładuje Nginx. **Nie wykonuje automatycznie przyszłych migracji SQL**. Jeśli nowa wersja dodaje migrację, uruchom ją zgodnie z instrukcją tej wersji, zanim włączysz wymagające jej funkcje.

### Wycofanie wersji

```bash
ls -l /var/www/streamhouse/releases
# Skopiuj z listy ID poprzedniego wydania:
sudo ln -sfn releases/POPRZEDNIE_ID /var/www/streamhouse/.current-next
sudo mv -Tf /var/www/streamhouse/.current-next /var/www/streamhouse/current
sudo nginx -t && sudo systemctl reload nginx
```

Rollback plików **nie cofa migracji danych**. Przed zmianą schematu wykonaj backup bazy.

### Diagnostyka

```bash
sudo nginx -t
sudo journalctl -u nginx -n 100 --no-pager
sudo tail -n 100 /var/log/nginx/error.log
curl -I https://rpg.example.com/assets/cloud-config.local.js
curl -I https://rpg.example.com/rozgrywka/assets/premium-atlases.js
```

Jeśli strona działa, ale Discord się nie loguje, sprawdź ustawienia URL i providera w Supabase, błędy sieciowe w DevTools, aktywny projekt oraz poprawny klucz `publishable`.

## 7. Ograniczenia

- Wersja v21 działa lokalnie w przeglądarce, bez sieciowego stanu v9. Dostęp do niej jest zachowany w portalu.
- Demo w jednej przeglądarce nie dowodzi prawdziwej synchronizacji między urządzeniami.
- Wersja v9 nie zapewnia jeszcze pełnej synchronizacji narzędzi v21, voice chatu ani wszystkiego z pracowni kości ze wspólną kroniką.
- Supabase/Auth/RLS wymagają ręcznej weryfikacji produkcyjnej; same pliki na VPS nie tworzą internetowej kampanii.
- Własne tekstury i 8-MB atlas kości przechodzą przez archiwum zasobów, które trzeba rozpakować.
