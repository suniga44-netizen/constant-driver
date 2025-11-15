// A version for the cache. Change this value to force the service worker to update.
const CACHE_NAME = 'constant-driver-cache-v3'; // Incremented version

// A list of critical files for the app shell.
// We keep this list small to ensure the SW installs reliably.
// The fetch handler below will cache other assets (like .tsx files) as they are requested.
const URLS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdn.tailwindcss.com' // Added missing critical CSS dependency
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

// Fetch event: serve cached content when offline, and update cache from network (stale-while-revalidate)
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests for http or https protocols.
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Try to get the response from the cache
      const cachedResponse = await cache.match(event.request);

      // 2. Fetch from the network in the background
      const networkPromise = fetch(event.request).then((networkResponse) => {
        // If we got a valid response, clone it and cache it.
        if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(err => {
        // Network failed, which is expected when offline.
        // The cachedResponse will be used if it exists.
      });

      // 3. Return the cached response if it exists, otherwise wait for the network response
      return cachedResponse || networkPromise;
    })
  );
});