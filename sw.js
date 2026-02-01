
// Service Worker for Palestine Crisis
// Provides offline support and caching
const CACHE_NAME = 'palestine-crisis-v1';
const DATA_CACHE_NAME = 'palestine-crisis-data-v1';
// Files to cache on install
const filesToCache = [
'/',
'/live.html',
'/live-ar.html',
'/index.html',
'/offline.html',
'/assets/css/style.css',
'/assets/css/bootstrap.min.css',
'/assets/js/app.js',
'/assets/js/live.js',
'/assets/js/active.js',
'/assets/js/jquery.min.js',
'/assets/js/bootstrap.min.js',
'/assets/js/chart.min.js',
'/assets/img/logo2.png',
'/assets/img/palestine.webp',
'/assets/palestine_favicon.png'
];
// Data files to cache separately (updated more frequently)
const dataFiles = [
'/data/livetracker.json',
'/data/regions.json',
'/data/attacks.json',
'/data/translations.json',
'/data/brands.json',
'/data/barcodes.json',
'/data/celebrities.json',
'/data/hashtags.json'
];
// Install event - cache files
self.addEventListener('install', function(event) {
console.log('[ServiceWorker] Install');
event.waitUntil(
    Promise.all([
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[ServiceWorker] Caching app shell');
            return cache.addAll(filesToCache);
        }),
        caches.open(DATA_CACHE_NAME).then(function(cache) {
            console.log('[ServiceWorker] Caching data files');
            return cache.addAll(dataFiles);
        })
    ])
);

self.skipWaiting();
});
// Activate event - cleanup old caches
self.addEventListener('activate', function(event) {
console.log('[ServiceWorker] Activate');
event.waitUntil(
    caches.keys().then(function(cacheNames) {
        return Promise.all(
            cacheNames.map(function(cacheName) {
                if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
                    console.log('[ServiceWorker] Removing old cache', cacheName);
                    return caches.delete(cacheName);
                }
            })
        );
    })
);

return self.clients.claim();
});
// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', function(event) {
const requestUrl = new URL(event.request.url);
// Skip non-http requests
if (!event.request.url.startsWith('http')) {
    return;
}

// Skip external requests (CDNs, analytics, etc.)
if (requestUrl.origin !== location.origin) {
    return;
}

// Handle data files - network first, cache fallback
if (requestUrl.pathname.startsWith('/data/')) {
    event.respondWith(
        caches.open(DATA_CACHE_NAME).then(function(cache) {
            return fetch(event.request)
                .then(function(response) {
                    // Update cache with fresh data
                    if (response.status === 200) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                })
                .catch(function() {
                    // Network failed, return cached version
                    return cache.match(event.request);
                });
        })
    );
    return;
}

// Handle other requests - cache first, network fallback
event.respondWith(
    caches.match(event.request).then(function(response) {
        if (response) {
            return response;
        }

        return fetch(event.request).then(function(response) {
            // Don't cache if not successful
            if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
            }

            // Clone response to cache it
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
                cache.put(event.request, responseToCache);
            });

            return response;
        }).catch(function() {
            // Show offline page if available
            return caches.match('/offline.html');
        });
    })
);
});
// Handle messages from the client
self.addEventListener('message', function(event) {
if (event.data.action === 'skipWaiting') {
self.skipWaiting();
}
if (event.data.action === 'clearCache') {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    return caches.delete(cacheName);
                })
            );
        }).then(function() {
            return self.clients.matchAll();
        }).then(function(clients) {
            clients.forEach(function(client) {
                client.postMessage({ action: 'cacheCleared' });
            });
        })
    );
}
});