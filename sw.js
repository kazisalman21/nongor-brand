/**
 * Service Worker — Nongorr Push Notifications & Offline Cache
 * @description Handles push notification display, click-to-open,
 * and basic offline caching for static assets.
 */

const CACHE_NAME = 'nongorr-v1';
const STATIC_ASSETS = [
    '/',
    '/assets/logo.jpeg',
    '/assets/icon-192.png',
    '/assets/styles.css',
    '/assets/animations.css'
];

// --- Install: Pre-cache critical assets ---
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {
                // Silently fail if some assets can't be cached (e.g. offline)
            });
        })
    );
    self.skipWaiting();
});

// --- Activate: Clean old caches ---
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// --- Push: Show notification ---
self.addEventListener('push', (event) => {
    let data = {
        title: 'নোঙর | Nongorr',
        body: 'নতুন আপডেট আছে!',
        icon: '/assets/icon-192.png',
        badge: '/assets/icon-192.png',
        url: '/'
    };

    try {
        if (event.data) {
            const payload = event.data.json();
            data = { ...data, ...payload };
        }
    } catch (e) {
        // If data isn't JSON, use text
        if (event.data) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/assets/icon-192.png',
        badge: data.badge || '/assets/icon-192.png',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' },
        actions: [
            { action: 'open', title: 'দেখুন' },
            { action: 'close', title: 'বন্ধ করুন' }
        ],
        tag: data.tag || 'nongorr-notification',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// --- Notification Click: Open URL ---
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If a Nongorr tab is already open, focus it
            for (const client of windowClients) {
                if (client.url.includes('nongorr') && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Otherwise open a new tab
            return clients.openWindow(url);
        })
    );
});

// --- Fetch: Network-first with cache fallback ---
self.addEventListener('fetch', (event) => {
    // Only cache GET requests for same-origin
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    // Skip API requests
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Serve from cache if network fails
                return caches.match(event.request);
            })
    );
});
