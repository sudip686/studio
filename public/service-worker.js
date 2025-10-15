const CACHE_NAME = 'geospatial-cache-v1';
const CACHE_URLS = [
    'assets.ion.cesium.com',
    'api.maptiler.com'
];

// Function to check if the request is for a local data file that should be cached
const shouldCacheLocalFile = (url) => {
    const fileExtensions = ['.geojson', '.json', '.kmz', '.kml', '.glb', '.bin'];
    return fileExtensions.some(ext => url.pathname.endsWith(ext));
};

self.addEventListener('install', event => {
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    // Clean up old caches
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Become the active service worker for all clients immediately.
    return self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Check if the URL should be cached based on hostname or file type
    const isCacheable = CACHE_URLS.some(hostname => url.hostname.includes(hostname)) || 
                        (url.origin === self.location.origin && shouldCacheLocalFile(url));

    if (!isCacheable) {
        // Not a resource we want to cache, so we let it pass through.
        return;
    }

    // Cache-first strategy
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                // If we have a match in the cache, return it.
                if (response) {
                    return response;
                }

                // Otherwise, fetch from the network.
                return fetch(event.request).then(networkResponse => {
                    // Cache the new response for future use.
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        })
    );
});