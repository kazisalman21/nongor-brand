/**
 * @module push-notifications
 * @description Enterprise-grade Web Push Notification manager for Nongorr.
 * Features: VAPID-based subscription, topic preferences, in-app notification
 * center, engagement tracking, smart re-subscribe, post-order prompts.
 */

// ─── Constants ───────────────────────────────────────────────
const PUSH_STORAGE_KEY = 'nongorr_push_status';       // 'subscribed' | null
const PUSH_DISMISSED_KEY = 'nongorr_push_dismissed';   // 'true' | null
const PUSH_TOPICS_KEY = 'nongorr_push_topics';         // JSON array
const PUSH_ENDPOINT_KEY = 'nongorr_push_endpoint';     // subscription endpoint
const PUSH_NOTIF_CENTER_KEY = 'nongorr_notifications'; // JSON array of recent notifs
const API_BASE = '/api';

// ─── State ───────────────────────────────────────────────────
let vapidPublicKey = null;
let swRegistration = null;
let currentSubscription = null;

// ─── Helpers ─────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function getStoredTopics() {
    try {
        const stored = localStorage.getItem(PUSH_TOPICS_KEY);
        return stored ? JSON.parse(stored) : ['orders', 'arrivals', 'offers'];
    } catch { return ['orders', 'arrivals', 'offers']; }
}

function storeNotification(notif) {
    try {
        const list = JSON.parse(localStorage.getItem(PUSH_NOTIF_CENTER_KEY) || '[]');
        list.unshift({ ...notif, read: false, time: Date.now() });
        // Keep only last 20
        localStorage.setItem(PUSH_NOTIF_CENTER_KEY, JSON.stringify(list.slice(0, 20)));
        updateBellBadge();
    } catch (e) { console.error('[Push] Store notification error:', e); }
}

function getNotifications() {
    try {
        return JSON.parse(localStorage.getItem(PUSH_NOTIF_CENTER_KEY) || '[]');
    } catch { return []; }
}

function getUnreadCount() {
    return getNotifications().filter(n => !n.read).length;
}

function markAllRead() {
    try {
        const list = getNotifications().map(n => ({ ...n, read: true }));
        localStorage.setItem(PUSH_NOTIF_CENTER_KEY, JSON.stringify(list));
        updateBellBadge();
    } catch (e) { /* ignore */ }
}

// ─── Bell Badge ──────────────────────────────────────────────
function updateBellBadge() {
    const badge = document.getElementById('push-bell-badge');
    const count = getUnreadCount();
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// ─── API Calls ───────────────────────────────────────────────
async function fetchVapidKey() {
    try {
        const res = await fetch(`${API_BASE}?action=pushVapidKey`);
        const data = await res.json();
        if (data.result === 'success' && data.vapidPublicKey) {
            vapidPublicKey = data.vapidPublicKey;
            return true;
        }
    } catch (e) {
        console.error('[Push] Failed to fetch VAPID key:', e);
    }
    return false;
}

async function sendSubscriptionToServer(subscription, topics) {
    try {
        const res = await fetch(`${API_BASE}?action=subscribePush`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription, topics })
        });
        return (await res.json()).result === 'success';
    } catch (e) {
        console.error('[Push] Server subscribe error:', e);
        return false;
    }
}

async function removeSubscriptionFromServer(endpoint) {
    try {
        await fetch(`${API_BASE}?action=unsubscribePush`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint })
        });
    } catch (e) { /* silent */ }
}

async function updateTopicsOnServer(endpoint, topics) {
    try {
        await fetch(`${API_BASE}?action=updatePushTopics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint, topics })
        });
    } catch (e) { /* silent */ }
}

// ─── Core Subscribe ──────────────────────────────────────────
async function subscribeToPush(topics) {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('[Push] Permission denied');
            return false;
        }

        if (!vapidPublicKey) {
            const fetched = await fetchVapidKey();
            if (!fetched) return false;
        }

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });
        }

        const selectedTopics = topics || getStoredTopics();
        const success = await sendSubscriptionToServer(subscription, selectedTopics);

        if (success) {
            currentSubscription = subscription;
            localStorage.setItem(PUSH_STORAGE_KEY, 'subscribed');
            localStorage.setItem(PUSH_TOPICS_KEY, JSON.stringify(selectedTopics));
            localStorage.setItem(PUSH_ENDPOINT_KEY, subscription.endpoint);

            // Show bell icon
            const bellContainer = document.getElementById('push-bell-container');
            if (bellContainer) bellContainer.classList.remove('hidden');

            // Store welcome notification locally
            storeNotification({
                title: '🎉 স্বাগতম!',
                body: 'নোটিফিকেশন চালু হয়েছে। অর্ডার আপডেট ও নতুন কালেকশনের খবর পাবেন!',
                type: 'welcome'
            });

            if (window.showToast) {
                window.showToast('🔔 নোটিফিকেশন চালু হয়েছে!');
            }
            console.log('[Push] Subscribed successfully');
        }

        return success;
    } catch (err) {
        console.error('[Push] Subscribe error:', err);
        return false;
    }
}

// ─── Unsubscribe ─────────────────────────────────────────────
async function unsubscribeFromPush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await removeSubscriptionFromServer(subscription.endpoint);
            await subscription.unsubscribe();
        }
        localStorage.removeItem(PUSH_STORAGE_KEY);
        localStorage.removeItem(PUSH_ENDPOINT_KEY);
        localStorage.removeItem(PUSH_TOPICS_KEY);
        currentSubscription = null;

        // Hide bell icon
        const bellContainer = document.getElementById('push-bell-container');
        if (bellContainer) bellContainer.classList.add('hidden');

        if (window.showToast) {
            window.showToast('🔕 নোটিফিকেশন বন্ধ হয়েছে');
        }
        console.log('[Push] Unsubscribed');
    } catch (e) {
        console.error('[Push] Unsubscribe error:', e);
    }
}

// ─── Premium Opt-in Banner ───────────────────────────────────
let bannerAutoTimer = null;

function showPushBanner() {
    if (document.getElementById('push-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'push-banner';
    banner.className = 'push-banner';
    banner.innerHTML = `
        <div class="push-banner-content">
            <button id="push-close-btn" class="push-close-btn" aria-label="Close">&times;</button>

            <!-- Main state: opt-in -->
            <div id="push-banner-main">
                <div class="push-banner-header">
                    <div class="push-banner-icon">🔔</div>
                    <div class="push-banner-text">
                        <strong>নোটিফিকেশন চালু করুন</strong>
                        <p>অর্ডার আপডেট, নতুন কালেকশন ও অফারের খবর পান</p>
                    </div>
                </div>
                <div class="push-topics-selector">
                    <button class="push-topic-chip active" data-topic="orders">
                        <span class="push-topic-emoji">📦</span> অর্ডার আপডেট
                    </button>
                    <button class="push-topic-chip active" data-topic="arrivals">
                        <span class="push-topic-emoji">✨</span> নতুন কালেকশন
                    </button>
                    <button class="push-topic-chip active" data-topic="offers">
                        <span class="push-topic-emoji">🏷️</span> অফার
                    </button>
                </div>
                <div class="push-banner-actions">
                    <button id="push-enable-btn" class="push-btn-enable">
                        <svg class="push-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                        </svg>
                        চালু করুন
                    </button>
                    <button id="push-dismiss-btn" class="push-btn-dismiss">পরে দেখব</button>
                </div>
            </div>

            <!-- Success state (hidden by default) -->
            <div id="push-banner-success" style="display:none; text-align:center; padding: 0.5rem 0;">
                <div class="push-success-check">✅</div>
                <strong style="display:block; font-size:0.9rem; color:#f0e6d3; margin-top:0.4rem;">নোটিফিকেশন চালু হয়েছে!</strong>
                <p style="font-size:0.72rem; color:rgba(255,255,255,0.5); margin-top:0.2rem;">আপনার অর্ডার ও নতুন কালেকশনের আপডেট পাবেন</p>
            </div>

            <!-- Progress bar for auto-dismiss -->
            <div class="push-banner-progress">
                <div id="push-progress-bar" class="push-banner-progress-bar"></div>
            </div>
        </div>
    `;

    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            banner.classList.add('push-banner-visible');
        });
    });

    // Start auto-dismiss countdown (15s with progress bar)
    startProgressBar(15);

    // Topic chip toggles
    banner.querySelectorAll('.push-topic-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
            // Ensure at least one topic stays selected
            const activeCount = banner.querySelectorAll('.push-topic-chip.active').length;
            if (activeCount === 0) chip.classList.add('active');
        });
    });

    // Close × button — permanently dismiss
    document.getElementById('push-close-btn').addEventListener('click', () => {
        localStorage.setItem(PUSH_DISMISSED_KEY, 'true');
        clearProgressTimer();
        removeBanner();
    });

    // Enable button — subscribe then show success
    document.getElementById('push-enable-btn').addEventListener('click', async () => {
        const btn = document.getElementById('push-enable-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="push-spinner"></span> সংযুক্ত হচ্ছে...';
        clearProgressTimer();

        const selectedTopics = Array.from(banner.querySelectorAll('.push-topic-chip.active'))
            .map(c => c.dataset.topic);

        const success = await subscribeToPush(selectedTopics.length > 0 ? selectedTopics : undefined);

        if (success) {
            // Show success state with animation
            const mainEl = document.getElementById('push-banner-main');
            const successEl = document.getElementById('push-banner-success');
            const closeBtn = document.getElementById('push-close-btn');

            if (mainEl) mainEl.style.display = 'none';
            if (closeBtn) closeBtn.style.display = 'none';
            if (successEl) {
                successEl.style.display = 'block';
                successEl.style.animation = 'pushSuccessFadeIn 0.4s ease-out';
            }

            // Hide progress bar
            const progressBar = document.querySelector('.push-banner-progress');
            if (progressBar) progressBar.style.display = 'none';

            // Auto-remove after 2.5s
            setTimeout(() => removeBanner(), 2500);
        } else {
            btn.disabled = false;
            btn.innerHTML = `
                <svg class="push-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                আবার চেষ্টা করুন
            `;
            // Restart progress timer
            startProgressBar(15);
        }
    });

    // Dismiss button — permanently dismiss
    document.getElementById('push-dismiss-btn').addEventListener('click', () => {
        localStorage.setItem(PUSH_DISMISSED_KEY, 'true');
        clearProgressTimer();
        removeBanner();
    });
}

function startProgressBar(durationSeconds) {
    const bar = document.getElementById('push-progress-bar');
    if (!bar) return;

    bar.style.transition = 'none';
    bar.style.width = '100%';

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            bar.style.transition = `width ${durationSeconds}s linear`;
            bar.style.width = '0%';
        });
    });

    clearProgressTimer();
    bannerAutoTimer = setTimeout(() => {
        removeBanner();
    }, durationSeconds * 1000);
}

function clearProgressTimer() {
    if (bannerAutoTimer) {
        clearTimeout(bannerAutoTimer);
        bannerAutoTimer = null;
    }
}

function removeBanner() {
    const banner = document.getElementById('push-banner');
    if (!banner) return;
    clearProgressTimer();
    banner.classList.remove('push-banner-visible');
    banner.classList.add('push-banner-hiding');
    setTimeout(() => { banner.remove(); }, 400);
}

// ─── Notification Center ─────────────────────────────────────
function createNotificationCenter() {
    const bellContainer = document.getElementById('push-bell-container');
    const panel = document.getElementById('push-notif-panel');
    if (!bellContainer || !panel) return;

    const isSubscribed = localStorage.getItem(PUSH_STORAGE_KEY) === 'subscribed';

    // Show/hide bell based on subscription status
    if (isSubscribed) {
        bellContainer.classList.remove('hidden');
    } else {
        bellContainer.classList.add('hidden');
    }

    // Populate the notification panel HTML
    panel.innerHTML = `
        <div class="push-notif-header">
            <strong>নোটিফিকেশন</strong>
            <button id="push-notif-settings" class="push-notif-settings" aria-label="Settings">⚙️</button>
        </div>
        <div id="push-notif-list" class="push-notif-list"></div>
        <div id="push-notif-empty" class="push-notif-empty">
            <span class="push-notif-empty-icon">⚓</span>
            <p>কোনো নোটিফিকেশন নেই</p>
        </div>
        <div id="push-notif-settings-panel" class="push-notif-settings-panel hidden">
            <div class="push-settings-topics">
                <label class="push-settings-topic"><input type="checkbox" value="orders" checked> 📦 অর্ডার আপডেট</label>
                <label class="push-settings-topic"><input type="checkbox" value="arrivals" checked> ✨ নতুন কালেকশন</label>
                <label class="push-settings-topic"><input type="checkbox" value="offers" checked> 🏷️ অফার</label>
            </div>
            <button id="push-save-topics" class="push-save-topics">সেভ করুন</button>
            <button id="push-unsubscribe-btn" class="push-unsubscribe-btn">নোটিফিকেশন বন্ধ করুন</button>
        </div>
    `;

    // Toggle notification panel
    const bellBtn = document.getElementById('push-bell-btn');
    if (bellBtn) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('hidden');
            if (!panel.classList.contains('hidden')) {
                renderNotifications();
                markAllRead();
            }
        });
    }

    // Close panel on outside click
    document.addEventListener('click', (e) => {
        if (bellContainer && !bellContainer.contains(e.target)) {
            panel.classList.add('hidden');
        }
    });

    // Settings toggle
    document.getElementById('push-notif-settings').addEventListener('click', (e) => {
        e.stopPropagation();
        const settingsPanel = document.getElementById('push-notif-settings-panel');
        settingsPanel.classList.toggle('hidden');

        // Load current topics
        if (!settingsPanel.classList.contains('hidden')) {
            const currentTopics = getStoredTopics();
            settingsPanel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = currentTopics.includes(cb.value);
            });
        }
    });

    // Save topics
    document.getElementById('push-save-topics').addEventListener('click', async () => {
        const newTopics = Array.from(
            document.querySelectorAll('#push-notif-settings-panel input:checked')
        ).map(cb => cb.value);

        localStorage.setItem(PUSH_TOPICS_KEY, JSON.stringify(newTopics));
        const endpoint = localStorage.getItem(PUSH_ENDPOINT_KEY);
        if (endpoint) {
            await updateTopicsOnServer(endpoint, newTopics);
        }
        document.getElementById('push-notif-settings-panel').classList.add('hidden');
        if (window.showToast) window.showToast('✅ সেটিংস সেভ হয়েছে');
    });

    // Unsubscribe
    document.getElementById('push-unsubscribe-btn').addEventListener('click', async () => {
        await unsubscribeFromPush();
        panel.classList.add('hidden');
    });

    updateBellBadge();
}

function renderNotifications() {
    const list = document.getElementById('push-notif-list');
    const empty = document.getElementById('push-notif-empty');
    const notifications = getNotifications();

    if (notifications.length === 0) {
        list.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    list.classList.remove('hidden');
    empty.classList.add('hidden');

    list.innerHTML = notifications.map(n => {
        const timeAgo = getTimeAgo(n.time);
        const typeIcons = {
            welcome: '🎉', order_update: '📦', broadcast: '📢',
            arrivals: '✨', offers: '🏷️', price_drop: '📉'
        };
        const icon = typeIcons[n.type] || '🔔';
        return `
            <div class="push-notif-item ${n.read ? '' : 'unread'}">
                <span class="push-notif-icon">${icon}</span>
                <div class="push-notif-body">
                    <strong>${escapeHtml(n.title)}</strong>
                    <p>${escapeHtml(n.body)}</p>
                    <span class="push-notif-time">${timeAgo}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'এইমাত্র';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} মিনিট আগে`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ঘণ্টা আগে`;
    return `${Math.floor(seconds / 86400)} দিন আগে`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Post-Order Push Prompt ──────────────────────────────────
export function promptPushAfterOrder() {
    // Only prompt if not already subscribed
    if (localStorage.getItem(PUSH_STORAGE_KEY) === 'subscribed') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Show a mini prompt after a short delay
    setTimeout(() => {
        const prompt = document.createElement('div');
        prompt.id = 'push-order-prompt';
        prompt.className = 'push-order-prompt';
        prompt.innerHTML = `
            <div class="push-order-prompt-content">
                <span class="push-order-prompt-icon">🔔</span>
                <p>অর্ডার আপডেট পেতে নোটিফিকেশন চালু করুন</p>
                <button id="push-order-enable" class="push-order-enable">চালু করুন</button>
                <button id="push-order-skip" class="push-order-skip">&times;</button>
            </div>
        `;
        document.body.appendChild(prompt);

        requestAnimationFrame(() => {
            prompt.classList.add('push-order-prompt-visible');
        });

        document.getElementById('push-order-enable').addEventListener('click', async () => {
            await subscribeToPush(['orders']);
            prompt.remove();
        });

        document.getElementById('push-order-skip').addEventListener('click', () => {
            prompt.classList.remove('push-order-prompt-visible');
            setTimeout(() => prompt.remove(), 300);
        });

        // Auto-dismiss after 12 seconds
        setTimeout(() => {
            if (document.getElementById('push-order-prompt')) {
                prompt.classList.remove('push-order-prompt-visible');
                setTimeout(() => prompt.remove(), 300);
            }
        }, 12000);
    }, 2000);
}

// ─── Listen for SW Messages (notification received) ──────────
function listenForPushMessages() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'PUSH_RECEIVED') {
                storeNotification(event.data.notification);
            }
        });
    }
}

// ─── Main Init ───────────────────────────────────────────────
export function initPushNotifications() {
    // Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('[Push] Browser does not support push notifications');
        return;
    }

    // Don't run on localhost
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        console.log('[Push] Skipping on localhost');
        return;
    }

    // Register service worker
    navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
            console.log('[SW] Registered:', registration.scope);
            swRegistration = registration;
        })
        .catch((err) => {
            console.error('[SW] Registration failed:', err);
        });

    // Create notification center in navbar
    createNotificationCenter();

    // Listen for push messages from SW
    listenForPushMessages();

    // Smart re-subscribe: if permission granted but subscription missing from server
    if (Notification.permission === 'granted' && localStorage.getItem(PUSH_STORAGE_KEY) === 'subscribed') {
        navigator.serviceWorker.ready.then(async (registration) => {
            const sub = await registration.pushManager.getSubscription();
            if (!sub) {
                console.log('[Push] Re-subscribing (subscription lost)...');
                await subscribeToPush();
            } else {
                currentSubscription = sub;
            }
        });
        return; // Already subscribed, don't show banner
    }

    // Check if user already subscribed or dismissed
    const pushStatus = localStorage.getItem(PUSH_STORAGE_KEY);
    const dismissed = localStorage.getItem(PUSH_DISMISSED_KEY);

    if (pushStatus === 'subscribed' || dismissed === 'true') {
        return;
    }

    // Show banner after 8 seconds
    setTimeout(() => {
        showPushBanner();
    }, 8000);
}
