# SEOHOST SH1 · ręczna publikacja demo z GitHub Actions

Workflow może zostać uruchomiony z gałęzi feature/admin-staging-v11.11 przez ściśle nazwany commit, a po dodaniu pliku workflow do gałęzi głównej także przyciskiem workflow_dispatch. **Żaden zwyczajny push nie powoduje publikacji.** Wybór docelowy jest ograniczony do `admin` lub `testrpg`. Nie wdraża na Mikrus, nie zmienia DNS, nie używa produkcyjnej bazy i nie publikuje main.

## Potwierdzone przez właściciela

- SSH: h108.seohost.pl, port 57185, login srv130039.
- ADMIN: /home/srv130039/domains/admin.panszczesniak.pl/public_html
- RPG STAGING: /home/srv130039/domains/testrpg.panszczesniak.pl/public_html

W obydwu katalogach początkowo jest tylko index.html i cgi-bin. Przed pierwszym wdrożeniem aktywuj HTTPS i rozważ ochronę hasłem dla panelu, np. przez DirectAdmin (katalog z hasłem), aby publiczny gość nie mylił demonstracyjnych uprawnień z prawdziwymi.

## Sekrety GitHub Environment: seohost-staging

- `SH1_DEPLOY_PRIVATE_KEY`: osobny, **bezhasłowy** klucz Ed25519 wygenerowany tylko do automatycznych deployów na testowy serwer. Nigdy nie umieszczaj w repo.
- `SH1_KNOWN_HOSTS`: wpis dla [h108.seohost.pl]:57185 ze zweryfikowanym fingerprintem klucza **serwera**. Wpis w OpenSSH known_hosts nie jest tym samym co klucz prywatny użytkownika.

Environment **seohost-staging** najlepiej ograniczyć do gałęzi feature/admin-staging-v11.11 oraz ustawić wymagane zatwierdzenie wdrożeń, jeżeli panel GitHub udostępnia tę opcję. Workflow_dispatch wymaga obecności pliku w default branch, dlatego na obecnym etapie gałęzi testowej uruchomienie polega na commicie z dokładnym tematem `deploy(sh1): admin staging` albo `deploy(sh1): testrpg staging`. Dowolny inny commit przeprowadzi tylko istniejące testy z admin-staging.yml. Przed użyciem koniecznie skonfiguruj sekrety i ograniczenia środowiska. Nie zmieniamy main na tym etapie.

## Konfiguracja klucza na Windows

1. PowerShell: `ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\github_sh1_deploy" -C "github-actions-sh1"`. Dla klucza używanego bezobsługowo hasło musi pozostać puste; ryzyko należy zredukować ograniczeniem konta i sekretami środowiska.
2. Publiczny klucz (`github_sh1_deploy.pub`) dodaj do autoryzowanych w DirectAdmin (Klucze SSH).
3. Prywatny (`github_sh1_deploy`) dodaj do `SH1_DEPLOY_PRIVATE_KEY` w sekretach environment na GitHub; nigdy nie wysyłaj do czatu.
4. Z komputerowego SSH sprawdź klucz serwera SSH, zgodny z informacją SEOHOST; wpis `[h108.seohost.pl]:57185 ...` z pliku known_hosts (lub wynik ssh-keyscan po osobnym zweryfikowaniu fingerprintu) dodaj do `SH1_KNOWN_HOSTS`. Nie używaj `StrictHostKeyChecking=no`.

## Bezpieczeństwo i ograniczenia

Osobny klucz do tego samego konta `srv130039` **nie ogranicza uprawnień** do subdomen. Posiadacz takiego klucza nadal ma uprawnienia konta hostingowego, w tym potencjalny dostęp do pozostałych plików. Docelowo warto uzyskać od hostingu dedykowane, ograniczone konto SFTP lub użyć innego bezpiecznego adaptera. Tu ograniczony jest **kod workflow**, nie uprawnienia samego klucza.

Wdrożenie wykonuje kopię dotychczasowej zawartości do katalogu prywatnego `~/.panszczesniak-deploy/backups/<target>/<run-id>` i kopiuje nowe pliki bez kasowania pozostałych, więc możliwe są przestarzałe resztki; nie jest to atomowy deployment ani automatyczny rollback. Nie edytuje katalogu produkcji RPG ani poczty. Zewnętrzny test HTTPS pozostaje po stronie operatora.
