// A version for the cache. Change this value to force the service worker to update.
const CACHE_NAME = 'constant-driver-cache-v2';

// A list of files to cache when the service worker is installed.
// This is the "app shell" - the minimal HTML, CSS, and JS required for the app to run.
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/hooks/useLocalStorage.ts',
  '/utils/date.ts',
  '/components/Icons.tsx',
];

// Install event: cache the app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Activate event: clean up old caches.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: serve cached content when offline, and update cache from network
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Try to get the response from the cache
      const cachedResponse = await cache.match(event.request);

      // 2. Fetch from the network in the background (stale-while-revalidate)
      const networkPromise = fetch(event.request).then((networkResponse) => {
        // If we got a valid response, clone it, cache it.
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(err => {
        // Network failed, which is expected when offline.
        // The cachedResponse will be used if it exists.
        console.log('Network request for ', event.request.url, ' failed:', err);
      });

      // 3. Return the cached response if it exists, otherwise wait for the network response
      return cachedResponse || networkPromise;
    })
  );
});