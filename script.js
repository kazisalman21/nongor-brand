
// =================================================================
// MAIN ENTRY POINT
// =================================================================
// This file aggregates all modules and initializes the application.
// =================================================================

import './js/config.js';
import './js/utils.js';
import './js/navigation.js';
import './js/products.js';
import './js/modal.js';
import './js/custom-sizing.js';
import './js/cart.js';
import './js/checkout.js';

console.log('🚀 Nongor Brand: All modules loaded');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // 1. Navigation
    if (window.initNavigation) window.initNavigation();

    // 2. Categories
    if (window.initCategories) window.initCategories();

    // 3. Products
    // Parse URL params for initial load (e.g. ?category=panjabi)
    const params = new URLSearchParams(window.location.search);
    const initialFilter = {
        category: params.get('category') || 'all',
        search: params.get('search') || '',
        sort: params.get('sort') || 'newest'
    };

    // Only init products if we are on a page with the grid
    if (document.getElementById('products-grid')) {
        if (window.initProducts) window.initProducts(initialFilter);
    }

    // 4. Cart
    if (window.initCart) window.initCart();

    // 5. Checkout
    // Only if we are on checkout page
    if (window.location.pathname.includes('checkout.html')) {
        if (window.initCheckout) window.initCheckout();
    }

    // --- Restore App Loader Removal ---
    const loader = document.getElementById('app-loading-overlay');
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
                loader.remove(); // Remove from DOM entirely
            }, 1000);
        }, 800);
    }
});
