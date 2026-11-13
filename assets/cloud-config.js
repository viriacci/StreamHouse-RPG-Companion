/* PUBLICZNA konfiguracja polaczenia Supabase; klucz publishable jest przeznaczony dla przegladarki.
   NIGDY nie umieszczaj tu sb_secret_, service_role ani Discord Client Secret.
   Opcjonalny /etc/streamhouse/cloud-config.local.js z kompletnym URL+kluczem moze nadpisac te wartosci. */
window.STREAMHOUSE_CLOUD_DEFAULT_CONFIG = Object.freeze({
  url: 'https://xqfglhaapojxnjdmxkrm.supabase.co',
  publishableKey: 'sb_publishable_ju6hLX_zATR0_N621l-4fg_ydo0ZaJU'
});
window.STREAMHOUSE_CLOUD_CONFIG = window.STREAMHOUSE_CLOUD_DEFAULT_CONFIG;
