
// Job PWA Service Worker
const CACHE_NAME = 'job-pwa-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests and non-GET requests
  if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response;
        }

        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Add to cache for future use
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Return offline page or default response for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
      })
  );
});

// Background sync for offline job submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-job') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(backgroundSyncJobs());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: 'icons/icon-192x192.png',
      badge: 'icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: data,
      actions: [
        {
          action: 'view',
          title: 'عرض الوظيفة',
          icon: 'icons/icon-96x96.png'
        },
        {
          action: 'close',
          title: 'إغلاق',
          icon: 'icons/icon-96x96.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'view') {
    // Open the app and navigate to jobs
    event.waitUntil(
      clients.openWindow('/?action=search')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.addAll(event.data.urls);
        })
    );
  }
});

// Background sync function
async function backgroundSyncJobs() {
  try {
    // Get queued job submissions from IndexedDB or localStorage
    const queuedJobs = await getQueuedJobs();
    
    for (const job of queuedJobs) {
      try {
        await submitJob(job);
        await removeQueuedJob(job.id);
        console.log('Service Worker: Synced job', job.id);
      } catch (error) {
        console.error('Service Worker: Failed to sync job', job.id, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Helper functions for background sync
async function getQueuedJobs() {
  // This would typically read from IndexedDB
  // For now, return empty array
  return [];
}

async function submitJob(jobData) {
  // Submit job to Firebase
  const response = await fetch('/api/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobData)
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit job');
  }
  
  return response.json();
}

async function removeQueuedJob(jobId) {
  // Remove job from queue
  console.log('Service Worker: Removed queued job', jobId);
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-jobs') {
    console.log('Service Worker: Periodic sync triggered');
    event.waitUntil(refreshJobs());
  }
});

async function refreshJobs() {
  try {
    // Refresh job data in background
    const cache = await caches.open(CACHE_NAME);
    const jobsResponse = await fetch('/api/jobs');
    
    if (jobsResponse.ok) {
      await cache.put('/api/jobs', jobsResponse.clone());
      console.log('Service Worker: Jobs refreshed');
    }
  } catch (error) {
    console.error('Service Worker: Failed to refresh jobs', error);
  }
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker: Global error', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Unhandled promise rejection', event.reason);
});

console.log('Service Worker: Loaded');
