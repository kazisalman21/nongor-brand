/**
 * Service Worker — Nongorr Push Notifications & Offline Cache
 * @description Handles push notification display with rich media,
 * click-to-open with deep linking, click tracking, and offline caching.
 * @version 2.0
 */

const CACHE_NAME = 'nongorr-v3';
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
                // Silently fail if some assets can't be cached
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

// --- Push: Show rich notification ---
self.addEventListener('push', (event) => {
    let data = {
        title: 'নোঙর | Nongorr',
        body: 'নতুন আপডেট আছে!',
        icon: '/assets/icon-192.png',
        badge: '/assets/icon-192.png',
        image: '',
        url: '/',
        type: 'broadcast',
        tag: 'nongorr-notification'
    };

    try {
        if (event.data) {
            const payload = event.data.json();
            data = { ...data, ...payload };
        }
    } catch (e) {
        if (event.data) {
            data.body = event.data.text();
        }
    }

    // Dynamic action buttons based on notification type
    let actions = [];
    switch (data.type) {
        case 'order_update':
            actions = [
                { action: 'track', title: 'ট্র্যাক করুন', icon: '/assets/icon-192.png' },
                { action: 'close', title: 'বন্ধ করুন' }
            ];
            break;
        case 'broadcast':
        case 'arrivals':
            actions = [
                { action: 'open', title: 'দেখুন', icon: '/assets/icon-192.png' },
                { action: 'close', title: 'বন্ধ করুন' }
            ];
            break;
        case 'offers':
            actions = [
                { action: 'shop', title: 'শপ করুন', icon: '/assets/icon-192.png' },
                { action: 'close', title: 'বন্ধ করুন' }
            ];
            break;
        case 'welcome':
            actions = [
                { action: 'open', title: 'ব্রাউজ করুন' }
            ];
            break;
        default:
            actions = [
                { action: 'open', title: 'দেখুন' },
                { action: 'close', title: 'বন্ধ করুন' }
            ];
    }

    const options = {
        body: data.body,
        icon: data.icon || '/assets/icon-192.png',
        badge: data.badge || '/assets/icon-192.png',
        image: data.image || undefined,
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
            type: data.type,
            notificationId: data.notificationId || null,
            endpoint: data.endpoint || null
        },
        actions: actions,
        tag: data.tag || 'nongorr-notification',
        renotify: true,
        requireInteraction: data.type === 'order_update',
        silent: data.type === 'welcome'
    };

    // Remove undefined image
    if (!options.image) delete options.image;

    event.waitUntil(
        self.registration.showNotification(data.title, options).then(() => {
            // Notify all clients about the received push (for notification center)
            return self.clients.matchAll({ type: 'window' }).then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'PUSH_RECEIVED',
                        notification: {
                            title: data.title,
                            body: data.body,
                            type: data.type,
                            url: data.url
                        }
                    });
                });
            });
        })
    );
});

// --- Notification Click: Track + Open URL ---
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const url = event.notification.data?.url || '/';
    const notificationId = event.notification.data?.notificationId;

    event.waitUntil(
        // Track click (fire-and-forget)
        (async () => {
            // Try to track the click
            try {
                const endpoint = event.notification.data?.endpoint;
                if (endpoint) {
                    await fetch('/api?action=trackPushClick', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ endpoint, notificationId })
                    });
                }
            } catch (e) { /* silent */ }

            // Navigate to URL
            const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

            // If a Nongorr tab is already open, focus and navigate
            for (const client of windowClients) {
                if (client.url.includes('nongorr') && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }

            // Otherwise open a new tab
            return clients.openWindow(url);
        })()
    );
});

// --- Fetch: Network-first with cache fallback ---
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
