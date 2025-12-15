const CACHE_NAME = 'job-portal-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
];

// Install Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: Install complete');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Cache failed', error);
            })
    );
});

// Activate Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activate complete');
            return self.clients.claim();
        })
    );
});

// Fetch Event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return response;
                }

                console.log('Service Worker: Fetching from network', event.request.url);
                return fetch(event.request).then(response => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch(error => {
                    console.error('Service Worker: Fetch failed', error);
                    
                    // Return offline page for navigation requests
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                    
                    // For other requests, just show an error
                    return new Response('Network Error', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});

// Background Sync for offline job submissions
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync-job') {
        console.log('Service Worker: Background sync triggered');
        event.waitUntil(syncOfflineJobs());
    }
});

function syncOfflineJobs() {
    // This would sync any offline job submissions when connection is restored
    return new Promise(resolve => {
        console.log('Service Worker: Syncing offline jobs...');
        resolve();
    });
}

// Push notifications (for future job alerts)
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'لديك إشعار جديد من موقع الوظائف',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'عرض الوظائف',
                icon: '/icon-192.png'
            },
            {
                action: 'close',
                title: 'إغلاق',
                icon: '/icon-192.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('موقع الوظائف', options)
    );
});

// Notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // Just close the notification
    } else {
        // Default action - open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handling for communication with main thread
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('Service Worker: Loaded and ready');
