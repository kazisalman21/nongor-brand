/**
 * API Response Cache
 * Caches frequent queries for 5 minutes
 */
const NodeCache = require('node-cache');

// Cache configuration
const cache = new NodeCache({
    stdTTL: 300,        // 5 minutes default TTL
    checkperiod: 60,    // Check for expired keys every 60s
    useClones: false,   // Don't clone objects (faster)
    maxKeys: 100        // Maximum 100 cached items
});

// Cache keys
const CACHE_KEYS = {
    ALL_PRODUCTS: 'all_products',
    FEATURED_PRODUCTS: 'featured_products',
    CATEGORIES: 'categories'
};

// Helper to invalidate product cache
function invalidateProductCache() {
    cache.del(CACHE_KEYS.ALL_PRODUCTS);
    cache.del(CACHE_KEYS.FEATURED_PRODUCTS);
    cache.del(CACHE_KEYS.CATEGORIES);
    console.log('🗑️ Product cache invalidated');
}

// Rate Limiting Maps (In-Memory)
const rateLimits = {
    login: new Map(), // IP -> { count, expires }
    order: new Map(),  // IP -> { count, expires }
    passwordReset: new Map(), // IP -> { count, expires }
    otpRequest: new Map(), // IP -> { count, expires } - for SMS OTP
    otpVerify: new Map(), // IP -> { count, expires } - for OTP verification
    telegramOtpRequest: new Map(), // IP -> { count, expires } - Telegram OTP request
    telegramOtpVerify: new Map(), // IP -> { count, expires } - Telegram OTP verify
    totpVerify: new Map() // IP -> { count, expires } - TOTP verify (higher limit)
};

// Rate Limit Checker
function checkRateLimit(type, ip) {
    // Limits configuration
    let limit = 10;
    let window = 60 * 60 * 1000;

    if (type === 'login' || type === 'passwordReset' || type === 'otpRequest' || type === 'telegramOtpRequest') {
        limit = 5;
        window = 15 * 60 * 1000; // 15 mins
    } else if (type === 'otpVerify' || type === 'telegramOtpVerify') {
        limit = 10;
        window = 15 * 60 * 1000; // 15 mins
    } else if (type === 'totpVerify') {
        limit = 30; // Higher limit for TOTP to avoid lockout
        window = 15 * 60 * 1000; // 15 mins
    }

    const now = Date.now();
    const record = rateLimits[type].get(ip);

    // Clean up expired or invalid records
    if (record && now > record.expires) {
        rateLimits[type].delete(ip);
    }

    if (!rateLimits[type].has(ip)) {
        rateLimits[type].set(ip, { count: 1, expires: now + window });
        return { allowed: true };
    }

    const current = rateLimits[type].get(ip);
    if (current.count >= limit) {
        return { allowed: false, retryAfter: Math.ceil((current.expires - now) / 1000) };
    }

    current.count++;
    return { allowed: true };
}

module.exports = { cache, CACHE_KEYS, invalidateProductCache, checkRateLimit };
