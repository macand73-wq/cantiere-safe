// CantiereSafe Service Worker v2.2
const CACHE_NAME = 'cantiere-safe-v2.2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Some assets could not be cached:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Le chiamate API non vanno mai in cache: ne' Supabase in produzione, ne' lo
  // stack locale di sviluppo (127.0.0.1:54321), altrimenti una risposta vecchia
  // resta servita per sempre e l'interfaccia mostra dati che non esistono piu'.
  const url = new URL(e.request.url);
  if (url.hostname.endsWith('supabase.co') || url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Rete prima, cache come riserva.
  //
  // Prima era il contrario: `if (cached) return cached` serviva app.js dalla
  // cache per sempre, senza mai richiedere la versione nuova. In sviluppo
  // significa provare codice vecchio senza accorgersene, ed e' costata diverse
  // diagnosi sbagliate. In produzione significa che un utente resta su una
  // versione con difetti gia' corretti finche' non cambia CACHE_NAME.
  //
  // Con questa strategia l'app resta comunque utilizzabile offline: se la rete
  // non risponde si ricade sulla copia in cache.
  e.respondWith(
    fetch(e.request).then(response => {
      if (response && response.status === 200 && response.type !== 'opaque') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return response;
    }).catch(() =>
      caches.match(e.request).then(cached =>
        cached || (e.request.destination === 'document' ? caches.match('./index.html') : undefined)
      )
    )
  );
});