# StreamHouse RPG Companion — automatyczne aktualizacje

Od 13 listopada 2026 r. repozytorium ma wbudowane aktualizacje bez GitHub Actions i bez udostępniania kluczy SSH.

## Jednorazowa instalacja (konto root na Mikrusie)

Wklej w WebSSH **jedno polecenie**:

```bash
cd /opt/streamhouse-rpg && git pull --ff-only && bash scripts/install-auto-updates.sh
```

Instalator zakłada dwa pliki systemd (`streamhouse-update.service`, `streamhouse-update.timer`) i włącza timer. Nie edytuje Nginx, certyfikatu Let's Encrypt, DNS ani danych Supabase.

**Ważne:** od tej chwili każdy poprawny commit do `main` na GitHubie jest automatycznie publikowany na VPS, zwykle w ciągu kilku minut. Publikuj na `main` tylko zmiany gotowe do wdrożenia. Timer wykonuje sprawdzenie co około pięć minut. Nowe migracje SQL Supabase **nie wykonują się automatycznie**.

## Jak sprawdzić, czy działa

```bash
systemctl status streamhouse-update.timer --no-pager
```

Ostatnie aktualizacje i błędy:

```bash
journalctl -u streamhouse-update.service -n 35 --no-pager
```

Ręczne natychmiastowe wdrożenie:

```bash
cd /opt/streamhouse-rpg && bash scripts/update-vps.sh
```

Jeśli commit się nie zmienił i był już poprawnie wdrożony, skrypt niczego ponownie nie kopiuje. Odtwarza tekstury, kontroluje projekt, atomowo przełącza katalog wydania i przeładowuje Nginx dopiero po sprawdzeniu konfiguracji. Zachowuje pięć ostatnich wydań (limit dyskowy Mikrusa).

## Wstrzymywanie i wycofywanie

```bash
systemctl disable --now streamhouse-update.timer
```

To wyłącza automatyczne wdrożenia, ale pozostawia aktualną stronę online. Możesz ponownie włączyć timer:

```bash
systemctl enable --now streamhouse-update.timer
```

Przed ręcznym przywróceniem starego wydania wyłącz timer, inaczej nowe wydanie zostanie wdrożone ponownie. Starsze wersje znajdują się w `/var/www/streamhouse/releases/`.

**Zakres:** dotyczy tylko plików strony. Nie zmienia ustawień Cloudflare, Nginx, HTTPS, poświadczeń OAuth ani struktury bazy danych. Nie zastępuje testów poprawności po publikacji.