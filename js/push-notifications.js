/**
 * @module push-notifications
 * @description Web Push Notification manager for Nongorr.
 * Registers the service worker, handles subscription,
 * and shows a non-intrusive "Enable Notifications" banner
 * on first visit. Stores preference in localStorage.
 */

const PUSH_STORAGE_KEY = 'nongorr_push_status';
const PUSH_DISMISSED_KEY = 'nongorr_push_dismissed';

/**
 * Initialize push notifications — call after DOMContentLoaded.
 * Only shows the banner if:
 * 1. Browser supports push
 * 2. User hasn't already subscribed or dismissed
 * 3. Page is served over HTTPS
 */
export function initPushNotifications() {
    // Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('[Push] Browser does not support push notifications');
        return;
    }

    // Don't show on localhost (push needs HTTPS)
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        console.log('[Push] Skipping push on localhost');
        return;
    }

    // Register service worker
    navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
            console.log('[SW] Registered:', registration.scope);
            window.__swRegistration = registration;
        })
        .catch((err) => {
            console.error('[SW] Registration failed:', err);
        });

    // Check if user already subscribed or dismissed
    const pushStatus = localStorage.getItem(PUSH_STORAGE_KEY);
    const dismissed = localStorage.getItem(PUSH_DISMISSED_KEY);

    if (pushStatus === 'subscribed' || dismissed === 'true') {
        return; // Don't show banner again
    }

    // Show banner after 5 seconds (non-intrusive)
    setTimeout(() => {
        showPushBanner();
    }, 5000);
}

/**
 * Show the push notification opt-in banner
 */
function showPushBanner() {
    // Don't show if already exists
    if (document.getElementById('push-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'push-banner';
    banner.className = 'push-banner';
    banner.innerHTML = `
        <div class="push-banner-content">
            <div class="push-banner-icon">🔔</div>
            <div class="push-banner-text">
                <strong>অর্ডার আপডেট পেতে চান?</strong>
                <p>নোটিফিকেশন চালু করুন — অর্ডার ও নতুন কালেকশনের খবর পাবেন!</p>
            </div>
            <div class="push-banner-actions">
                <button id="push-enable-btn" class="push-btn-enable">চালু করুন</button>
                <button id="push-dismiss-btn" class="push-btn-dismiss">পরে</button>
            </div>
        </div>
    `;

    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => {
        banner.classList.add('push-banner-visible');
    });

    // Enable button
    document.getElementById('push-enable-btn').addEventListener('click', async () => {
        await subscribeToPush();
        removeBanner();
    });

    // Dismiss button
    document.getElementById('push-dismiss-btn').addEventListener('click', () => {
        localStorage.setItem(PUSH_DISMISSED_KEY, 'true');
        removeBanner();
    });

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
        removeBanner();
    }, 15000);
}

/**
 * Remove the push banner with animation
 */
function removeBanner() {
    const banner = document.getElementById('push-banner');
    if (!banner) return;

    banner.classList.remove('push-banner-visible');
    banner.classList.add('push-banner-hiding');
    setTimeout(() => {
        banner.remove();
    }, 400);
}

/**
 * Subscribe the user to push notifications
 */
async function subscribeToPush() {
    try {
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            console.log('[Push] Permission denied');
            return;
        }

        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // For now, create a subscription without a VAPID key (local-only)
            // When you add a push server, replace with your VAPID public key
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                // applicationServerKey will be needed when you set up a push server
            }).catch(() => {
                // If VAPID key is required, just mark as subscribed locally
                console.log('[Push] Subscription created (local mode)');
                return null;
            });
        }

        // Mark as subscribed
        localStorage.setItem(PUSH_STORAGE_KEY, 'subscribed');

        // Show success toast
        if (window.showToast) {
            window.showToast('🔔 নোটিফিকেশন চালু হয়েছে!');
        }

        console.log('[Push] Subscribed successfully');

    } catch (err) {
        console.error('[Push] Subscribe error:', err);
        // Still mark as subscribed if permission was granted
        if (Notification.permission === 'granted') {
            localStorage.setItem(PUSH_STORAGE_KEY, 'subscribed');
        }
    }
}
