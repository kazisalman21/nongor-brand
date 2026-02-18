// JS Module for Product Details
// Dependencies: Assumes utils.js or similar provides basic utilities, but we'll include local fallbacks.

// We will adapt the code to be a module but attach necessary functions to window for HTML onclick compatibility

// Local state
window.quantity = 1;
window.selectedSize = null;
let currentProduct = null;
const ANIMATION_MIN_TIME = 3000;

// Dual-ready pattern: both animation timer AND data must be ready before reveal
let animDone = false;
let dataReady = false;
let revealed = false;
let errorPending = false;

export function initProductPage() {
    // Reset state
    window.currentSizeType = 'standard';
    window.currentMeasurementUnit = 'inch';
    animDone = false;
    dataReady = false;
    revealed = false;
    errorPending = false;

    // Start the animation minimum timer from NOW (not module load time)
    setTimeout(() => {
        animDone = true;
        tryReveal();
    }, ANIMATION_MIN_TIME);

    // 1. Check for Preloaded Data (SSR)
    if (window.preloadedProduct) {
        console.log('⚡ Hydrating from SSR data...');
        currentProduct = window.preloadedProduct;
        renderProduct(currentProduct);
        dataReady = true;
        tryReveal();
        return;
    }

    // 2. Fallback: CSR
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    const productSlug = params.get('slug');

    if (!productId && !productSlug) {
        // Try to parse slug from URL path
        const pathParts = window.location.pathname.split('/');
        const pIndex = pathParts.indexOf('p');
        if (pIndex > -1 && pathParts[pIndex + 1]) {
            loadProduct(null, pathParts[pIndex + 1]);
            return;
        }

        // Only show error if we are actually ON the product page and missing ID/Slug
        if (document.getElementById('product-title')) {
            errorPending = true;
            dataReady = true;
            tryReveal();
        }
        return;
    }

    loadProduct(productId, productSlug);
}

async function loadProduct(id, slug) {
    try {
        let url = `${window.API_URL}?action=getProduct`;
        if (id) url += `&id=${encodeURIComponent(id)}`;
        else if (slug) url += `&slug=${encodeURIComponent(slug)}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.result !== 'success' || !data.data) {
            errorPending = true;
            dataReady = true;
            tryReveal();
            return;
        }

        currentProduct = data.data;
        renderProduct(currentProduct);
        updateMetaTags(currentProduct);

        dataReady = true;
        tryReveal();

    } catch (e) {
        console.error(e);
        errorPending = true;
        dataReady = true;
        tryReveal();
    }
}

// Only reveal when BOTH animation has played AND data is ready
function tryReveal() {
    if (revealed || !animDone || !dataReady) return;
    revealed = true;

    if (errorPending) {
        const errorEl = document.getElementById('product-error');
        if (errorEl) errorEl.classList.remove('hidden');
    }

    revealContent();
}

function revealContent() {
    const loader = document.getElementById('product-loading');
    const content = document.getElementById('product-content');

    if (content) {
        content.classList.remove('hidden');
        content.style.opacity = '0';
        content.style.transform = 'translateY(20px)';
        content.style.transition = 'none';
    }

    if (loader) {
        loader.style.pointerEvents = 'none';
        loader.style.transition = 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1)';
        loader.style.opacity = '0';
        loader.style.transform = 'scale(0.95)';

        setTimeout(() => {
            if (content) {
                content.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                content.style.opacity = '1';
                content.style.transform = 'translateY(0)';
            }
        }, 300);

        setTimeout(() => loader.remove(), 1100);
    } else if (content) {
        content.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';
    }
}

function renderProduct(product) {
    if (!document.getElementById('product-title')) return;

    document.getElementById('product-title').textContent = product.name;
    document.getElementById('page-title').textContent = `${product.name} | নোঙর`;
    document.getElementById('product-category').textContent = product.category_name || 'Collection';
    document.getElementById('product-price').textContent = `৳${parseFloat(product.price).toLocaleString()}`;
    document.getElementById('product-description').textContent = product.description || 'Premium quality Bangladeshi clothing.';

    const stock = parseInt(product.stock_quantity) || 0;
    window.maxStock = stock;
    const stockEl = document.getElementById('stock-status');
    const btnAdd = document.getElementById('btn-add-cart');
    const btnBuy = document.getElementById('btn-buy-now');

    if (stock > 0) {
        stockEl.innerHTML = `<span class="w-2 h-2 bg-green-500 rounded-full"></span><span class="text-sm text-green-600 font-medium">In Stock (${stock} available)</span>`;
    } else {
        stockEl.innerHTML = `<span class="w-2 h-2 bg-red-500 rounded-full"></span><span class="text-sm text-red-600 font-medium">Out of Stock</span>`;
        if (btnAdd) btnAdd.disabled = true;
        if (btnBuy) btnBuy.disabled = true;
    }

    const mainImg = document.getElementById('main-image');
    // Ensure we handle image paths correctly (relative vs absolute)
    const imgSrc = product.image?.startsWith('http') ? product.image : `./assets/${product.image || 'logo.jpeg'}`;
    mainImg.src = imgSrc;
    mainImg.alt = product.name;

    const thumbContainer = document.getElementById('thumbnails');
    let images = [product.image];
    if (product.images && Array.isArray(product.images)) {
        images = [...new Set([product.image, ...product.images])].filter(Boolean);
    }
    thumbContainer.innerHTML = images.map((img, i) => {
        const src = img?.startsWith('http') ? img : `./assets/${img || 'logo.jpeg'}`;
        return `<img src="${src}" alt="Thumbnail ${i + 1}" onclick="changeMainImage('${src}')" class="w-16 h-20 object-cover rounded-lg cursor-pointer border-2 ${i === 0 ? 'border-brand-terracotta' : 'border-gray-200'} hover:border-brand-terracotta transition">`;
    }).join('');

    const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const selector = document.getElementById('size-selector');
    if (selector) {
        selector.innerHTML = sizes.map(s => `
            <button onclick="selectSize('${s}')" class="size-btn px-4 py-2 border-2 rounded-lg font-medium transition ${s === window.selectedSize ? 'border-brand-terracotta bg-brand-terracotta/10 text-brand-terracotta' : 'border-gray-200 text-gray-600 hover:border-brand-terracotta'}">${s}</button>
        `).join('');
    }

    if (window.updateSizeTypeUI) window.updateSizeTypeUI();
}

function updateMetaTags(product) {
    const url = window.location.href;
    const imgSrc = product.image?.startsWith('http') ? product.image : `https://nongor-brand.vercel.app/assets/${product.image || 'logo.jpeg'}`;
    const desc = product.description || 'Premium quality Bangladeshi clothing from Nongor.';

    const setMeta = (id, val) => { const el = document.getElementById(id); if (el) el.content = val; };

    setMeta('meta-description', desc);
    setMeta('og-url', url);
    setMeta('og-title', `${product.name} | নোঙর`);
    setMeta('og-description', desc);
    setMeta('og-image', imgSrc);
    setMeta('og-price', product.price);
    setMeta('twitter-title', `${product.name} | নোঙর`);
    setMeta('twitter-description', desc);
    setMeta('twitter-image', imgSrc);
}

// Expose functions to global scope for HTML onclick
// Only define if not already defined by modal.js (prevents collision on index.html)
if (!window.changeMainImage) {
    window.changeMainImage = function (src) {
        document.getElementById('main-image').src = src;
        document.querySelectorAll('#thumbnails img').forEach(img => {
            img.classList.toggle('border-brand-terracotta', img.src === src);
            img.classList.toggle('border-gray-200', img.src !== src);
        });
    };
}

if (!window.selectSize) {
    window.selectSize = function (size) {
        window.selectedSize = size;
        document.querySelectorAll('.size-btn').forEach(btn => {
            const isSelected = btn.textContent.trim() === size;
            btn.classList.toggle('border-brand-terracotta', isSelected);
            btn.classList.toggle('bg-brand-terracotta/10', isSelected);
            btn.classList.toggle('text-brand-terracotta', isSelected);
            btn.classList.toggle('border-gray-200', !isSelected);
            btn.classList.toggle('text-gray-600', !isSelected);
        });
    };
}

window.updateQty = function (delta) {
    const maxQty = Math.min(10, window.maxStock || 10);
    window.quantity = Math.min(maxQty, Math.max(1, window.quantity + delta));
    document.getElementById('qty-display').textContent = window.quantity;
};

window.addToCartFromPage = function () {
    if (!currentProduct) return;

    let finalSize = window.selectedSize;
    let measurements = null;
    let sizeType = 'standard';
    let unit = 'inch';
    let notes = '';

    if (window.currentSizeType === 'custom') {
        if (window.getAndValidateMeasurements) {
            const val = window.getAndValidateMeasurements();
            if (!val.valid) return;

            sizeType = 'custom';
            measurements = val.measurements;
            unit = val.unit;
            notes = val.notes;
            finalSize = `Custom (${unit})`;
        }
    } else {
        if (!window.selectedSize) {
            window.showToast('Please select a size', 'error');
            return;
        }
    }

    const cart = JSON.parse(localStorage.getItem('nongor_cart')) || [];
    cart.push({
        id: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price,
        image: currentProduct.image,
        size: finalSize,
        sizeType: sizeType,
        unit: unit,
        measurements: measurements,
        notes: notes,
        quantity: window.quantity,
        timestamp: Date.now()
    });
    localStorage.setItem('nongor_cart', JSON.stringify(cart));

    if (window.updateCartUI) window.updateCartUI();
    if (window.openCart) window.openCart();

    window.showToast('Added to cart! 🛒');
};

window.buyNowFromPage = function () {
    if (!currentProduct) return;

    let finalSize = window.selectedSize;
    let measurements = null;
    let sizeType = 'standard';
    let unit = 'inch';
    let notes = '';

    if (window.currentSizeType === 'custom') {
        if (window.getAndValidateMeasurements) {
            const val = window.getAndValidateMeasurements();
            if (!val.valid) return;

            sizeType = 'custom';
            measurements = val.measurements;
            unit = val.unit;
            notes = val.notes;
            finalSize = `Custom (${unit})`;
        }
    } else {
        if (!window.selectedSize) {
            window.showToast('Please select a size', 'error');
            return;
        }
    }

    const buyNowItem = [{
        id: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price,
        image: currentProduct.image,
        size: finalSize,
        sizeType: sizeType,
        unit: unit,
        measurements: measurements,
        notes: notes,
        quantity: window.quantity
    }];
    localStorage.setItem('nongor_direct_buy', JSON.stringify(buyNowItem));
    window.location.href = `checkout.html?mode=direct`;
};

window.shareProduct = function () {
    if (navigator.share) {
        navigator.share({
            title: currentProduct ? (currentProduct.name + ' | নোঙর') : 'নোঙর',
            text: currentProduct ? `Check out ${currentProduct.name} from Nongor!` : 'Check this out!',
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href);
        // Using the local showToast if available, otherwise window.showToast if defined elsewhere
        // The inline script defined its own showToast. We should probably use the one from utils/cart.
        // For now, we'll assume showToast function is available or we define it:
        if (typeof window.showToast === 'function') window.showToast('Link copied! 📋');
        else window.alert('Link copied!');
    }
};


// Use showToast from utils.js (window.showToast)

// Attach init to DOMContentLoaded if we are the script entry point, 
// OR export it.
// Since we are likely importing this, we can auto-init if we detect we are on the product page.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('product-title')) initProductPage();
    });
} else {
    if (document.getElementById('product-title')) initProductPage();
}
