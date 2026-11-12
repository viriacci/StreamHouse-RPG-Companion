# StreamHouse v11.2 · Interakcje portalu

- Kliknięcie kości na stronie powitalnej i logowania powoduje trzy pełne obroty malachitowej D20 w rendererze, **bez wyniku i bez podświetlenia**. Działa też Enter/Spacja.
- W „Moi bohaterowie” każda karta, także przykładowa, otrzymała przycisk czaszki. Zamykanie potwierdzenia zostawia bohatera, potwierdzenie usuwa go lokalnie lub z zalogowanego konta Supabase. Chmura wymaga aktywnego Supabase.
- Imię i przydomek pobierane są z karty postaci (`name`, `sheet.title`).
- Profil ma edytowalny podpis wyświetlany konsekwentnie w menu i w profilu. Podpis zapisywany jest lokalnie i (dla zalogowanego użytkownika) w Supabase Auth user metadata, bez migracji SQL.
- Usunięto wskazaną informację techniczną pod profilem. Link do Discorda w menu zamieniono na samą ikonę.

## Uruchomienie

Rozpakuj paczkę i uruchom `Uruchom-StreamHouse.bat`, ewentualnie `python3 scripts/start-local.py`. Otwórz portal na tym samym adresie serwera.

**Ostrzeżenie:** usunięcie bohatera jest nieodwracalne. Demo nie jest prawdziwym kontem online.
