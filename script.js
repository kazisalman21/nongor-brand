
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
import './js/product-details.js';
import './js/reviews.js';



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

    // --- Remove App Loading Overlay (Robust) ---
    try {
        const loader = document.getElementById('app-loading-overlay');
        if (loader) {
            // Immediately prevent blocking user interaction
            loader.style.pointerEvents = 'none';
            // Fade out after a short delay
            setTimeout(() => {
                loader.style.transition = 'opacity 0.8s ease';
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                    loader.remove();
                }, 900);
            }, 300);
        }
    } catch (e) {
        console.error('Failed to remove loader:', e);
        const loader = document.getElementById('app-loading-overlay');
        if (loader) loader.remove();
    }
});

// Failsafe: If DOMContentLoaded already fired or modules load late, use window.onload
window.addEventListener('load', () => {
    const loader = document.getElementById('app-loading-overlay');
    if (loader) {
        loader.style.pointerEvents = 'none';
        loader.style.transition = 'opacity 0.6s ease';
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 700);
    }

    // --- Scroll Reveal System ---
    initScrollReveal();
});

// --- Premium Scroll Reveal ---
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-scale');

    if (revealElements.length === 0) {
        // Auto-add reveal classes to key sections if not manually set
        const sections = document.querySelectorAll('section, footer, .product-card');
        sections.forEach((el, i) => {
            if (!el.classList.contains('reveal') && !el.classList.contains('reveal-up')) {
                el.classList.add('reveal-up');
                el.style.transitionDelay = `${Math.min(i * 0.05, 0.3)}s`;
            }
        });
    }

    const allRevealEls = document.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-scale');

    if ('IntersectionObserver' in window && allRevealEls.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });

        allRevealEls.forEach(el => observer.observe(el));
    } else {
        // Fallback: just show everything
        allRevealEls.forEach(el => el.classList.add('visible'));
    }
}
