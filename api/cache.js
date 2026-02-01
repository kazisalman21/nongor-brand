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

module.exports = { cache, CACHE_KEYS, invalidateProductCache };
