# Pierwsze wdrożenie Control Center do SEOHOST SH1

Cel: demonstracyjny panel admin.panszczesniak.pl.

Środowisko: seohost-staging, wyłącznie gałąź feature/admin-staging-v11.11.
Przed kopiowaniem plików obowiązkowy test HTTPS + HTTP 401 + WWW-Authenticate: Basic.
W przypadku braku ochrony katalogu workflow ma przerwać się bez dotykania serwera.
Nie wdraża na main ani rpg.panszczesniak.pl, nie używa produkcyjnego Supabase.

Wdrożenie wyzwalane przez dokładny tytuł commita: deploy(sh1): admin staging.
