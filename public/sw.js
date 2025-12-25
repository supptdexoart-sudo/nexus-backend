
const CACHE_NAME = 'nexus-tactical-cache-v5';
const STATIC_ASSETS = [
  './',
  './index.html',
  './index.tsx',
  './vite.svg',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;800&family=JetBrains+Mono:wght@400;700&display=swap'
];

// Knihovny z esm.sh a další externí zdroje
const EXTERNAL_LIBS = [
  'https://esm.sh/react@^18.2.0',
  'https://esm.sh/react-dom@^18.2.0',
  'https://esm.sh/@google/genai@^1.34.0',
  'https://esm.sh/lucide-react@^0.395.0',
  'https://esm.sh/framer-motion@^11.0.8',
  'https://esm.sh/react@^19.2.3',
  'https://esm.sh/react-dom@^19.2.3/',
  'https://esm.sh/framer-motion@^12.23.26',
  'https://esm.sh/lucide-react@^0.562.0'
];

self.addEventListener('install', (event) => {
  console.log('[NEXUS SW] Zahajuji hloubkové cacheování HUD assetů...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Použijeme force-cache pro externí zdroje při instalaci
      return cache.addAll([...STATIC_ASSETS, ...EXTERNAL_LIBS]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[NEXUS SW] Systém aktivní. Čištění starých datových struktur...');
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// Strategie: Cache-First pro HUD a Statické assety, Network-First pro zbytek
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API a real-time data ignorujeme (řešeno v apiService)
  if (url.pathname.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Pokud je v cache, okamžitě vracíme (bleskové načtení HUD)
      if (cachedResponse) {
        // Volitelně: Na pozadí zkusíme aktualizovat (Stale-While-Revalidate pro ikony/písma)
        if (url.origin !== location.origin) {
            fetch(event.request).then(response => {
                if (response.ok) {
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
                }
            }).catch(() => {});
        }
        return cachedResponse;
      }

      // 2. Pokud není v cache, jdeme na síť
      return fetch(event.request).then((response) => {
        // Nekachejeme neúspěšné odpovědi
        if (!response || response.status !== 200 || response.type !== 'basic' && !url.href.includes('esm.sh') && !url.href.includes('fonts.gstatic.com')) {
          return response;
        }

        // Dynamické kacheování písem a ikon za běhu
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch((err) => {
        console.warn('[NEXUS SW] Síť nedostupná pro:', url.href);
        // Zde by mohl být návrat fallback obrázku nebo offline.html
      });
    })
  );
});

// Background Sync pro odeslání dat po obnovení signálu
self.addEventListener('sync', (event) => {
  if (event.tag === 'nexus-sync-scans') {
    event.waitUntil(syncScans());
  }
});

async function syncScans() {
    // Implementace je v apiService, zde jen trigger
    console.log('[NEXUS SW] Pokouším se o synchronizaci fronty...');
}
