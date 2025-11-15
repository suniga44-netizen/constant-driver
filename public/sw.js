// A version for the cache. Change this value to force the service worker to update.
const CACHE_NAME = 'constant-driver-cache-v1';

// A list of files to cache when the service worker is installed.
// This is the "app shell" - the minimal HTML, CSS, and JS required.
const URLS_TO_CACHE = [
  '/',
  '/index.html',
];

// Install event: cache the app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
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
});

// Fetch event: serve cached content when offline.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response from the cache
        if (response) {
          return response;
        }

        // Not in cache - fetch from the network
        return fetch(event.request);
      }
    )
  );
});