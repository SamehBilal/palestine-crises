
// Service Worker for Palestine Crisis
// Provides offline support and caching
const CACHE_NAME = 'palestine-crisis-v8';
const DATA_CACHE_NAME = 'palestine-crisis-data-v8';
// Files to cache on install. Paths are relative to sw.js so the site also works from a subfolder,
// and every entry must exist: cache.addAll() fails the whole install on a single 404.
const filesToCache = [
'index.html',
'live.html',
'map.html',
'brands.html',
'celebrities.html',
'barcodes.html',
'landing.html',
'landing-ar.html',
'offline.html',
'404.html',
'manifest.json',
'logo.png',
'images/icons/icon-192.png',
'images/icons/icon-512.png',
'images/icons/maskable-192.png',
'images/icons/maskable-512.png',
'images/icons/apple-touch-icon.png',
'assets/css/style.css',
'assets/css/bootstrap.min.css',
'assets/css/select2.min.css',
'assets/css/datatables.min.css',
'assets/css/chart.min.css',
'assets/js/app.js',
'assets/js/pwa.js',
'assets/js/live.js',
'assets/js/map.js',
'assets/js/brands.js',
'assets/js/celebrities.js',
'assets/js/barcodes.js',
'assets/js/jquery.min.js',
'assets/js/select2.full.min.js',
'assets/js/datatables.min.js',
'assets/js/chart.min.js',
'assets/img/logo2.webp',
'assets/img/palestine-flag.webp',
'assets/img/people.webp',
'assets/img/patient.webp',
'assets/img/man-2.webp',
'assets/img/woman-3.webp',
'assets/palestine_favicon.png'
];
// Data files to cache separately (updated more frequently)
const dataFiles = [
'data/livetracker.json',
'data/history.json',
'data/regions.json',
'data/attacks.json',
'data/timeline.json',
'data/translations.json',
'data/brands.json',
'data/barcodes.json',
'data/celebrities.json'
];
// Install event - cache files
self.addEventListener('install', function(event) {
event.waitUntil(
    Promise.all([
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(filesToCache);
        }),
        caches.open(DATA_CACHE_NAME).then(function(cache) {
            return cache.addAll(dataFiles);
        })
    ])
);

// First install takes over at once; an update waits until the page's "Update now" (pwa.js)
// sends skipWaiting, so a page never runs half old, half new code
if (!self.registration.active) {
    self.skipWaiting();
}
});
// Activate event - cleanup old caches
self.addEventListener('activate', function(event) {
event.waitUntil(
    caches.keys().then(function(cacheNames) {
        return Promise.all(
            cacheNames.map(function(cacheName) {
                if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
                    return caches.delete(cacheName);
                }
            })
        );
    })
);

return self.clients.claim();
});
// Fetch event - network first for app files, cache first for images
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

// Only GET requests can be cached
if (event.request.method !== 'GET') {
    return;
}

// Pages, scripts, styles and data: network first so updates show up straight away,
// cached copy when offline
const isData = requestUrl.pathname.includes('/data/');
if (isData || event.request.mode === 'navigate' || /\.(html|js|css)$/.test(requestUrl.pathname)) {
    const cacheName = isData ? DATA_CACHE_NAME : CACHE_NAME;
    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                if (response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(cacheName).then(function(cache) {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(function() {
                // ignoreSearch: live.html?source=pwa or ?lang=ar is still live.html
                return caches.match(event.request, { ignoreSearch: event.request.mode === 'navigate' }).then(function(cached) {
                    // Offline page only stands in for pages, not for scripts or data
                    if (cached || event.request.mode !== 'navigate') {
                        return cached;
                    }
                    return caches.match('offline.html');
                });
            })
    );
    return;
}

// Images and fonts rarely change: cache first, network fallback
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
        });
    })
);
});
// Handle messages from the client
self.addEventListener('message', function(event) {
if (!event.data) {
    return;
}
if (event.data === 'skipWaiting' || event.data.action === 'skipWaiting') {
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