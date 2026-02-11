
// --- Data ---
const categoriesData = [
    { "id": 1, "name": "পাঞ্জাবি", "slug": "panjabi" },
    { "id": 2, "name": "কুর্তি", "slug": "kurti" },
    { "id": 3, "name": "শাড়ি", "slug": "saree" },
    { "id": 4, "name": "থ্রি পিস", "slug": "three-piece" },
    { "id": 5, "name": "অন্যান্য", "slug": "other" }
];

// Fallback products (used if API fails)
const fallbackProducts = [
    {
        "id": 1,
        "name": "টিউলিপ",
        "price": "1000.00",
        "image": "https://res.cloudinary.com/daalopsqn/image/upload/f_auto,q_auto/v1769523623/lsxxuqx26gef8ujbktm9.webp",
        "description": "আরামদায়ক কাপড়ে রঙিন টিউলিপ ফুলের নকশা।",
        "category_slug": "kurti",
        "category_name": "কুর্তি",
        "is_featured": true
    },
    {
        "id": 2,
        "name": "একটা কমলা রঙের প্রজাপতি",
        "price": "900.00",
        "image": "https://res.cloudinary.com/daalopsqn/image/upload/f_auto,q_auto/v1769523623/lsxxuqx26gef8ujbktm9.webp",
        "description": "কালো পোশাকে রঙিন প্রজাপতির ছোঁয়া।",
        "category_slug": "kurti",
        "category_name": "কুর্তি",
        "is_featured": true
    }
];

let allProducts = [];
let currentCategory = 'all';
const API_URL = '/api';

// Modal state variables
let currentProductId = null;
const availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];


// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // Sticky Navbar Logic with Throttle for Smooth Performance
    const navbar = document.getElementById('navbar');
    let ticking = false;

    const updateNavbar = () => {
        if (!navbar) return;
        const isMobile = window.innerWidth < 768;

        if (window.scrollY > 50) {
            if (!isMobile) {
                navbar.classList.remove('bg-transparent', 'text-brand-light');
                navbar.classList.add('bg-white/95', 'backdrop-blur-md', 'shadow-md', 'text-brand-deep');
            } else {
                navbar.classList.add('shadow-md', 'py-3');
                navbar.classList.remove('py-6');
            }
        } else {
            if (!isMobile) {
                navbar.classList.add('bg-transparent', 'text-brand-light');
                navbar.classList.remove('bg-white/95', 'backdrop-blur-md', 'shadow-md', 'text-brand-deep');
            } else {
                navbar.classList.remove('shadow-md', 'py-3');
                navbar.classList.add('py-6');
            }
        }
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateNavbar);
            ticking = true;
        }
    }, { passive: true });

    // Load data
    initCategories();
    initProducts();

    // Hide Loading Overlay
    const overlay = document.getElementById('app-loading-overlay');
    if (overlay) {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => overlay.remove(), 300);
    }

    // Mobile Menu Logic
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', toggleMobileMenu);
    }

    // --- Manual Payment Logic (for product modal ONLY, not checkout page) ---
    const paymentOptions = document.getElementById('payment-options');
    const isCheckoutPage = window.location.pathname.includes('checkout');
    if (paymentOptions && !isCheckoutPage) {
        paymentOptions.addEventListener('change', (e) => {
            if (e.target.name === 'payment_method') {
                const method = e.target.value;
                const manualContainer = document.getElementById('manual-payment-info');

                // Remove existing if any
                if (manualContainer) manualContainer.remove();

                if (method === 'Bkash') {
                    let number = '01872647323 (Personal)'; // bKash Number

                    // Calculate Total
                    let total = 0;
                    if (window.currentProduct && window.currentQuantity) {
                        // Checkout Page Context
                        total = window.currentProduct.price * window.currentQuantity;
                    } else {
                        // Fallback (Rare/Legacy)
                        const priceText = document.getElementById('modal-price')?.textContent.replace(/[^\d.]/g, '') || '0';
                        total = (parseFloat(priceText) || 0) * (window.currentQuantity || 1);
                    }

                    const div = document.createElement('div');
                    div.id = 'manual-payment-info';
                    div.className = 'mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm animate-fade-in-up';
                    div.innerHTML = `
                        <p class="font-bold text-yellow-800 mb-2">Instructions:</p>
                        <p class="text-gray-700 mb-3">Please 'Send Money' <span class="font-bold text-brand-deep bg-white px-1 rounded shadow-sm">৳${total}</span> to <span class="font-mono font-bold select-all bg-yellow-100 px-1 rounded">${number}</span>.</p>
                        
                        <div class="grid gap-3">
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Sender Number</label>
                                <input type="text" id="manual-sender" placeholder="e.g. 017XXXXXXXX" class="w-full p-2 border rounded focus:outline-brand-terracotta">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Transaction ID (TrxID)</label>
                                <input type="text" id="manual-trx" placeholder="e.g. 8X3D..." class="w-full p-2 border rounded focus:outline-brand-terracotta font-mono uppercase">
                            </div>
                        </div>
                    `;
                    // Insert after the grid
                    paymentOptions.insertAdjacentElement('afterend', div);
                }
            }
        });
    }
    // Fix Mobile Menu Stuck on Link Click
    const mobileLinks = document.querySelectorAll('#mobile-menu a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            const menu = document.getElementById('mobile-menu');
            if (menu && !menu.classList.contains('translate-x-full')) {
                toggleMobileMenu();
            }
        });
    });
});

window.toggleMobileMenu = () => {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('mobile-menu-btn');

    if (menu.classList.contains('translate-x-full')) {
        // Open
        menu.classList.remove('translate-x-full');
        btn.innerHTML = '&times;'; // Close icon
        btn.classList.add('text-brand-light');
        btn.style.color = '#F4F1DE';
        // Block scroll
        document.body.style.overflow = 'hidden';
    } else {
        // Close
        menu.classList.add('translate-x-full');
        btn.innerHTML = '&#9776;'; // Hamburger icon
        btn.classList.remove('text-brand-light');
        btn.style.color = '';
        // Restore scroll
        document.body.style.overflow = '';
    }
};

// --- Product Logic ---

function initCategories() {
    const filterContainer = document.getElementById('category-filter');
    if (!filterContainer) return;

    filterContainer.innerHTML = `
        <button onclick="filterProducts('all', event)"
            class="category-btn active px-8 py-3 rounded-full bg-brand-terracotta text-white shadow-lg shadow-brand-terracotta/30 transform scale-105 transition-all duration-300 font-medium border border-transparent">
            সব
        </button>
    `;

    categoriesData.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn px-8 py-3 rounded-full text-base font-medium transition-all duration-300 border border-transparent hover:bg-brand-terracotta/10 hover:text-brand-terracotta text-gray-500';
        btn.textContent = cat.name;
        btn.onclick = (e) => filterProducts(cat.slug, e);
        filterContainer.appendChild(btn);
    });
}

// ==============================================
// FILTER PRODUCTS BY CATEGORY
// ==============================================
window.filterProducts = function (category, event) {
    console.log('🔍 Filtering by category:', category);

    currentCategory = category;

    // Update active button
    if (event) {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-brand-terracotta', 'text-white', 'shadow-lg', 'scale-105');
            btn.classList.add('text-gray-500');
        });
        event.target.classList.add('active', 'bg-brand-terracotta', 'text-white', 'shadow-lg', 'scale-105');
        event.target.classList.remove('text-gray-500');
    }

    // Filter and render
    if (category === 'all') {
        renderProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category_slug === category);
        console.log(`  Found ${filtered.length} products in category`);
        renderProducts(filtered);
    }
};

// ==============================================
// SEARCH LOGIC
// ==============================================
let searchDebounceTimer;
window.handleSearch = (query) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        console.log('🔎 Searching for:', query);
        // Call initProducts with search param
        // We need to maintain current category? Or reset to all? 
        // Usually search resets category or searches within.
        // Let's reset category to 'all' for global search, or keep it if we want to filter within category.
        // For now, let's keep currentCategory if it's not 'all', otherwise search all.
        // Actually best to search ALL.

        // Update UI active state if needed
        if (query.length > 0) {
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active', 'bg-brand-terracotta', 'text-white'));
        }

        initProducts({ search: query, category: currentCategory });
    }, 500); // 500ms debounce
};

// ==============================================
// UNIFIED FILTER/SORT/SEARCH LOGIC
// ==============================================
let filterDebounceTimer;
window.applyAllFilters = () => {
    clearTimeout(filterDebounceTimer);
    filterDebounceTimer = setTimeout(() => {
        const searchQuery = document.getElementById('search-input')?.value?.trim().toLowerCase() || '';
        const minPrice = parseFloat(document.getElementById('min-price')?.value) || 0;
        const maxPrice = parseFloat(document.getElementById('max-price')?.value) || Infinity;
        const sortBy = document.getElementById('sort-select')?.value || 'newest';
        const inStockOnly = document.getElementById('instock-toggle')?.checked || false;

        console.log('🔍 Applying filters:', { searchQuery, minPrice, maxPrice, sortBy, inStockOnly, category: currentCategory });

        let filtered = [...allProducts];

        // Category filter
        if (currentCategory && currentCategory !== 'all') {
            filtered = filtered.filter(p => p.category_slug === currentCategory);
        }

        // Search filter (name + category)
        if (searchQuery) {
            filtered = filtered.filter(p =>
                p.name?.toLowerCase().includes(searchQuery) ||
                p.category_name?.toLowerCase().includes(searchQuery) ||
                p.description?.toLowerCase().includes(searchQuery)
            );
        }

        // Price filter
        filtered = filtered.filter(p => {
            const price = parseFloat(p.price) || 0;
            return price >= minPrice && price <= maxPrice;
        });

        // In-Stock filter
        if (inStockOnly) {
            filtered = filtered.filter(p => parseInt(p.stock_quantity) > 0);
        }

        // Sorting
        switch (sortBy) {
            case 'price-low':
                filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                break;
            case 'price-high':
                filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
                break;
            case 'name':
                filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'newest':
            default:
                filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                break;
        }

        console.log(`✅ Filtered to ${filtered.length} products`);
        renderProducts(filtered);
    }, 300);
};


// Mobile Filter Toggle
window.toggleFilters = () => {
    const controls = document.getElementById('filter-controls');
    const btnText = document.getElementById('filter-toggle-text');
    const chevron = document.getElementById('filter-toggle-chevron');

    if (controls.classList.contains('hidden')) {
        controls.classList.remove('hidden');
        controls.classList.add('flex');
        btnText.textContent = 'Hide Filters';
        chevron.style.transform = 'rotate(180deg)';
    } else {
        controls.classList.add('hidden');
        controls.classList.remove('flex');
        btnText.textContent = 'Show Filters';
        chevron.style.transform = 'rotate(0deg)';
    }
};

window.clearAllFilters = () => {
    document.getElementById('search-input').value = '';
    document.getElementById('min-price').value = '';
    document.getElementById('max-price').value = '';
    document.getElementById('sort-select').value = 'newest';
    document.getElementById('instock-toggle').checked = false;
    currentCategory = 'all';

    // Reset category button states
    document.querySelectorAll('.category-btn').forEach((btn, i) => {
        if (i === 0) {
            btn.classList.add('active', 'bg-brand-terracotta', 'text-white', 'shadow-lg', 'scale-105');
            btn.classList.remove('text-gray-500');
        } else {
            btn.classList.remove('active', 'bg-brand-terracotta', 'text-white', 'shadow-lg', 'scale-105');
            btn.classList.add('text-gray-500');
        }
    });

    renderProducts(allProducts);
};

// Legacy function for backward compatibility
window.applyPriceFilter = applyAllFilters;


// ==============================================
// FETCH AND INITIALIZE PRODUCTS
// ==============================================
// ==============================================
// FETCH AND INITIALIZE PRODUCTS
// ==============================================
async function initProducts(params = {}) {
    console.log('🚀 initProducts() called with:', params);

    const container = document.getElementById('products-grid');
    if (!container) return;

    // Show loading spinner
    showLoading(container);

    try {
        // Construct Query
        const urlP = new URLSearchParams();
        urlP.append('action', 'getProducts');

        if (params.search) urlP.append('search', params.search);
        if (params.category && params.category !== 'all') urlP.append('category', params.category);
        if (params.min) urlP.append('min', params.min);
        if (params.max) urlP.append('max', params.max);
        if (params.sort) urlP.append('sort', params.sort);
        // Note: 'inStock' is client-side filter for now or we can add API support.
        // Let's do API support later if needed, for now client-side is fine for small catalog.
        // Actually, let's keep it client side filtering after fetch if the API doesn't support it yet
        // OR better: fetch all matching criteria and filter in memory if "In Stock" is toggled?
        // Since getProducts returns result based on DB query, let's trust the DB params.
        // We added min/max/sort to API. inStock isn't there yet explicitly but we can filter results.

        console.log('📡 Fetching from:', `${API_URL}?${urlP.toString()}`);

        const response = await fetch(`${API_URL}?${urlP.toString()}`);
        console.log('📥 Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('📦 API Result:', result);

        if (result.result === 'success' && result.data && Array.isArray(result.data)) {
            let fetchedProducts = result.data.map(p => ({
                ...p, // Keep all original props
                price: parseFloat(p.price),
                images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : (p.images || []),
                category: {
                    name: p.category_name || 'অন্যান্য',
                    slug: p.category_slug || 'other'
                }
            }));

            // Client-side In-Stock Filter (until API support)
            if (params.inStock) {
                fetchedProducts = fetchedProducts.filter(p => parseInt(p.stock_quantity) > 0);
            }

            allProducts = fetchedProducts; // Update global state

            if (fetchedProducts.length === 0) {
                console.warn('⚠️ API returned empty array');
                showEmptyState(container);
            } else {
                console.log(`✅ Got ${fetchedProducts.length} products, rendering...`);
                renderProducts(fetchedProducts);
                console.log('✅ Render complete');
            }
        } else {
            throw new Error('Invalid API response format');
        }

    } catch (error) {
        console.error('❌ Error in initProducts:', error);
        console.error('Stack:', error.stack);

        // Show error to user
        showError(container, error.message);

        // Use fallback products as last resort
        console.warn('⚠️ Using fallback products');
        allProducts = fallbackProducts;
        renderProducts(fallbackProducts);
    }
}

window.toggleFilterDrawer = () => {
    const drawer = document.getElementById('filter-drawer');
    if (drawer) {
        drawer.classList.toggle('hidden');
    }
};

window.applyAllFilters = () => {
    clearTimeout(filterDebounceTimer);
    filterDebounceTimer = setTimeout(() => {
        const searchQuery = document.getElementById('search-input')?.value?.trim() || '';
        const minPrice = document.getElementById('min-price')?.value;
        const maxPrice = document.getElementById('max-price')?.value;
        const sortBy = document.getElementById('sort-select')?.value || 'newest';
        const inStockOnly = document.getElementById('instock-toggle')?.checked || false;

        console.log('🔍 Applying filters:', { searchQuery, minPrice, maxPrice, sortBy, inStockOnly, category: currentCategory });

        // Update UI active state for category if needed (handled in filterProducts)

        // Call initProducts with ALL params
        initProducts({
            search: searchQuery,
            category: currentCategory,
            min: minPrice,
            max: maxPrice,
            sort: sortBy,
            inStock: inStockOnly
        });

    }, 500);
};

// (filterProducts is now defined in initCategories above with enhanced animations)

// ==============================================
// SEARCH PRODUCTS
// ==============================================
window.handleSearch = function (query) {
    console.log('🔍 Searching for:', query);

    const q = query.toLowerCase().trim();

    if (!q) {
        renderProducts(allProducts);
        return;
    }

    const filtered = allProducts.filter(p => {
        return p.name.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            (p.category_name && p.category_name.toLowerCase().includes(q));
    });

    console.log(`  Found ${filtered.length} matching products`);
    renderProducts(filtered);
};

// --- Smart Image Optimization ---
window.getOptimizedImage = (url, type = 'main') => {
    if (!url || typeof url !== 'string') return './assets/logo.jpeg';

    // 1. Cloudinary Optimization
    if (url.includes('cloudinary.com')) {
        // If already optimized, return as is (unless we need thumb sizing)
        if (url.includes('f_auto,q_auto') && type !== 'thumb' && type !== 'card') return url;

        // Inject transformations
        // Pattern: /upload/v1234/id -> /upload/f_auto,q_auto/v1234/id
        let params = 'f_auto,q_auto';
        if (type === 'thumb') params += ',w_300';
        if (type === 'card') params += ',w_600'; // Mid-size for cards

        // Handle existing params or lack thereof
        if (url.includes('/upload/')) {
            const parts = url.split('/upload/');
            return `${parts[0]}/upload/${params}/${parts[1]}`;
        }
        return url;
    }

    // 2. Local Asset Optimization (WebP)
    // Assume local if not http/https or starts with ./assets
    if (!url.startsWith('http') || url.startsWith('./assets/')) {
        let path = url;
        if (!path.startsWith('./assets/')) {
            path = './assets/' + path.replace(/^\.?\/?assets\//, '');
        }

        // Replace extension with webp
        // DISABLE WEBP OPTIMIZATION FOR NOW (Files don't exist)
        return path;

        /* 
        const base = path.replace(/\.(jpg|jpeg|png)$/i, '');

        if (type === 'thumb') {
            return `${base}-thumb.webp`;
        } else {
            return `${base}.webp`;
        }
        */
    }

    // External regular URL - return as is
    return url;
};

// --- Safe Image Handler (Prevents Infinite Loop) ---
window.handleImageError = (img, fallbackSrc = './assets/logo.jpeg') => {
    if (!img.dataset.fallbackAttempted) {
        img.dataset.fallbackAttempted = 'true';
        img.src = fallbackSrc;
    } else {
        img.onerror = null; // Stop infinite loop
        console.warn('Image fallback failed:', img.src);
    }
};

// --- Product Logic ---
// ... (initCategories, initProducts omitted for brevity) ...

// --- Skeleton Loader ---
// ==============================================
// RENDER PRODUCTS TO GRID
// ==============================================
function renderProducts(products) {
    console.log('🎨 renderProducts() called with', products?.length, 'products');

    const container = document.getElementById('products-grid');
    if (!container) {
        console.error('❌ Container not found in renderProducts');
        return;
    }

    // Clear container
    container.innerHTML = '';

    // Validate products
    if (!products || !Array.isArray(products)) {
        console.error('❌ Invalid products array:', products);
        showError(container, 'Invalid product data');
        return;
    }

    if (products.length === 0) {
        showEmptyState(container);
        return;
    }

    // Render each product
    products.forEach((product, index) => {
        try {
            console.log(`  Rendering product ${index + 1}:`, product.name);
            const card = createProductCard(product, index);
            container.appendChild(card);
        } catch (error) {
            console.error(`❌ Error rendering product ${index}:`, error);
        }
    });

    console.log('✅ All products rendered successfully');
}

// ==============================================
// CREATE PRODUCT CARD ELEMENT (PREMIUM VERSION)
// ==============================================
function createProductCard(product, index) {
    // Validate product
    if (!product || !product.id) {
        console.error('Invalid product object:', product);
        return document.createElement('div');
    }

    // Create card container with premium styling
    const card = document.createElement('div');
    card.className = 'product-card group relative bg-white rounded-2xl overflow-hidden cursor-pointer animate-fade-in-up';
    card.style.cssText = `
        animation-delay: ${index * 0.1}s;
        box-shadow: 0 4px 20px rgba(61, 64, 91, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: 1px solid rgba(244, 241, 222, 0.8);
    `;

    // Card hover effects
    card.onmouseenter = function () {
        this.style.transform = 'translateY(-12px) scale(1.02)';
        this.style.boxShadow = '0 25px 50px rgba(61, 64, 91, 0.15), 0 10px 20px rgba(224, 122, 95, 0.1)';
        this.style.borderColor = 'rgba(224, 122, 95, 0.3)';
    };
    card.onmouseleave = function () {
        this.style.transform = 'translateY(0) scale(1)';
        this.style.boxShadow = '0 4px 20px rgba(61, 64, 91, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)';
        this.style.borderColor = 'rgba(244, 241, 222, 0.8)';
    };

    // Create image container with gradient overlay
    const imgContainer = document.createElement('div');
    imgContainer.className = 'relative overflow-hidden w-full';
    imgContainer.style.cssText = 'aspect-ratio: 3/4;';

    const img = document.createElement('img');
    img.src = product.image || './assets/logo.jpeg';
    img.alt = product.name || 'Product';
    img.className = 'w-full h-full object-cover';
    img.loading = 'lazy';
    img.style.cssText = 'transition: transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.5s ease;';

    // Image hover zoom
    card.addEventListener('mouseenter', () => {
        img.style.transform = 'scale(1.1)';
        img.style.filter = 'brightness(1.05)';
    });
    card.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
        img.style.filter = 'brightness(1)';
    });

    // Image fallback
    let fallbackAttempted = false;
    img.onerror = function () {
        if (!fallbackAttempted) {
            fallbackAttempted = true;
            this.src = './assets/logo.jpeg';
            console.warn('⚠️ Image failed, using fallback for:', product.name);
        } else {
            this.onerror = null;
            console.error('❌ Fallback image also failed');
        }
    };

    // Gradient overlay for depth
    const overlay = document.createElement('div');
    overlay.className = 'absolute inset-0 pointer-events-none';
    overlay.style.cssText = 'background: linear-gradient(180deg, transparent 50%, rgba(61, 64, 91, 0.03) 100%);';

    // Shine effect element
    const shine = document.createElement('div');
    shine.className = 'absolute inset-0 pointer-events-none';
    shine.style.cssText = `
        background: linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.4) 45%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.4) 55%, transparent 60%);
        transform: translateX(-100%) skewX(-15deg);
        transition: transform 0.7s ease;
    `;
    card.addEventListener('mouseenter', () => {
        shine.style.transform = 'translateX(100%) skewX(-15deg)';
    });
    card.addEventListener('mouseleave', () => {
        shine.style.transform = 'translateX(-100%) skewX(-15deg)';
    });

    imgContainer.appendChild(img);
    imgContainer.appendChild(overlay);
    imgContainer.appendChild(shine);

    // Create content section with premium padding
    const content = document.createElement('div');
    content.className = 'p-5 relative';
    content.style.cssText = 'background: linear-gradient(180deg, #ffffff 0%, #fdfcfa 100%);';

    // Category badge with gradient
    const category = document.createElement('span');
    category.className = 'inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full mb-3';
    category.style.cssText = `
        background: linear-gradient(135deg, rgba(224, 122, 95, 0.12) 0%, rgba(224, 122, 95, 0.08) 100%);
        color: #E07A5F;
        letter-spacing: 0.5px;
        border: 1px solid rgba(224, 122, 95, 0.15);
    `;
    category.textContent = product.category_name || product.category?.name || 'অন্যান্য';

    // Product name with premium typography
    const title = document.createElement('h3');
    title.className = 'font-bold text-brand-deep mb-2 line-clamp-2 font-bengali leading-tight';
    title.style.cssText = 'font-size: 1.15rem; transition: color 0.3s ease;';
    title.textContent = product.name || 'Unknown Product';

    // Description with refined styling
    const description = document.createElement('p');
    description.className = 'text-gray-500 text-sm mb-4 line-clamp-2 leading-relaxed';
    description.style.cssText = 'font-weight: 400;';
    description.textContent = product.description || '';

    // Price and button container
    const footer = document.createElement('div');
    footer.className = 'flex items-center justify-between mt-auto pt-4';
    footer.style.cssText = 'border-top: 1px solid rgba(244, 241, 222, 0.6);';

    // Price with gradient text effect
    const priceContainer = document.createElement('div');
    priceContainer.className = 'flex flex-col';

    const price = document.createElement('span');
    price.className = 'font-bold';
    price.style.cssText = `
        font-size: 1.5rem;
        color: #E07A5F;
    `;
    const priceValue = parseFloat(product.price) || 0;
    price.textContent = `৳${priceValue.toLocaleString()}`;
    priceContainer.appendChild(price);

    // Premium button with ripple effect
    const button = document.createElement('button');
    button.className = 'relative overflow-hidden text-white px-5 py-2 rounded-lg font-medium text-sm md:px-6 md:py-2.5';
    button.style.cssText = `
        background: #3D405B;
        transition: all 0.3s ease;
        box-shadow: 0 4px 10px rgba(61, 64, 91, 0.2);
    `;

    button.textContent = 'বিস্তারিত';

    // Button hover effects
    button.onmouseenter = function () {
        this.style.background = 'linear-gradient(135deg, #E07A5F 0%, #d4694f 100%)';
        this.style.transform = 'scale(1.05)';
        this.style.boxShadow = '0 6px 20px rgba(224, 122, 95, 0.4)';
    };
    button.onmouseleave = function () {
        this.style.background = 'linear-gradient(135deg, #3D405B 0%, #2d3047 100%)';
        this.style.transform = 'scale(1)';
        this.style.boxShadow = '0 4px 15px rgba(61, 64, 91, 0.25)';
    };
    button.onmousedown = function () {
        this.style.transform = 'scale(0.95)';
    };
    button.onmouseup = function () {
        this.style.transform = 'scale(1.05)';
    };

    button.onclick = function (e) {
        e.stopPropagation();
        // openModal(product.id); 
        if (product.slug) {
            window.location.href = `/p/${product.slug}`;
        } else {
            window.location.href = `product.html?id=${product.id}`;
        }
    };

    // Also make card clickable
    card.onclick = function () {
        // openModal(product.id); // Old Modal Logic
        // Navigate to Single Product Page (Premium)
        if (product.slug) {
            window.location.href = `/p/${product.slug}`;
        } else {
            window.location.href = `product.html?id=${product.id}`;
        }
    };

    // Assemble footer
    footer.appendChild(priceContainer);
    footer.appendChild(button);

    // Assemble content
    content.appendChild(category);
    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(footer);

    // Assemble card
    card.appendChild(imgContainer);
    card.appendChild(content);

    return card;
}


// ==============================================
// LOADING STATE
// ==============================================
function showLoading(container) {
    container.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-20">
            <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-terracotta mb-4"></div>
            <p class="text-gray-500 text-lg">পণ্য লোড হচ্ছে...</p>
        </div>
    `;
}

// ==============================================
// EMPTY STATE
// ==============================================
function showEmptyState(container) {
    container.innerHTML = `
        <div class="col-span-full text-center py-20">
            <div class="text-6xl mb-4">🛍️</div>
            <h3 class="text-2xl font-bold text-gray-400 mb-2 font-bengali">কোনো পণ্য পাওয়া যায়নি</h3>
            <p class="text-gray-500 mb-6">শীঘ্রই নতুন পণ্য যোগ করা হবে!</p>
            <button onclick="clearAllFilters()" class="bg-brand-terracotta text-white px-6 py-3 rounded-full hover:bg-brand-deep transition-colors">
                আবার চেষ্টা করুন
            </button>
        </div>
    `;
}

// ==============================================
// ERROR STATE
// ==============================================
function showError(container, errorMsg) {
    container.innerHTML = `
        <div class="col-span-full text-center py-20">
            <div class="text-6xl mb-4">⚠️</div>
            <h3 class="text-2xl font-bold text-red-500 mb-2">পণ্য লোড করতে সমস্যা হয়েছে</h3>
            <p class="text-gray-600 mb-6">${errorMsg || 'অজানা ত্রুটি'}</p>
            <button onclick="initProducts()" class="bg-brand-terracotta text-white px-6 py-3 rounded-full hover:bg-brand-deep transition-colors">
                আবার চেষ্টা করুন
            </button>
        </div>
    `;
}

// Make functions globally accessible
window.initProducts = initProducts;
window.renderProducts = renderProducts;
window.createProductCard = createProductCard;

// --- Modal Logic ---
window.openModal = (productId) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    currentProductId = productId; // Store ID

    // Get all images (use images array if available, fallback to single image)
    const images = product.images && product.images.length > 0
        ? product.images
        : [product.image].filter(Boolean);

    // Set main image
    // Optimized Main Image
    const mainImgData = images[0];
    const mainImgSrc = getOptimizedImage(mainImgData, 'main');
    const mainImgOriginal = mainImgData && mainImgData.startsWith('http') ? mainImgData : `./assets/${(mainImgData || 'logo.jpeg').replace(/^\.?\/?assets\//, '')}`;

    const modalImgEl = document.getElementById('modal-image');
    modalImgEl.src = mainImgSrc;
    // Add error handler specific to modal to fallback
    modalImgEl.onerror = function () { handleImageError(this, mainImgOriginal); };

    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-price').textContent = `৳${product.price} `;
    document.getElementById('modal-category').textContent = product.category.name;
    document.getElementById('modal-description').textContent = product.description;

    // Reset image display
    const imgElement = document.getElementById('modal-image');
    imgElement.style.display = 'block';
    if (imgElement.parentElement) imgElement.parentElement.style.backgroundColor = 'transparent';

    // Render gallery thumbnails
    const galleryContainer = document.getElementById('modal-gallery');
    if (galleryContainer && images.length > 1) {
        galleryContainer.innerHTML = images.map((img, index) => {
            const thumbSrc = getOptimizedImage(img, 'thumb');
            const originalSrc = img && img.startsWith('http') ? img : `./assets/${(img || 'logo.jpeg').replace(/^\.?\/?assets\//, '')}`;

            // For click, we want the high-res version (optimized main)
            const mainSwapSrc = getOptimizedImage(img, 'main');

            return `
                <img src="${thumbSrc}" alt="Thumbnail ${index + 1}" 
                    onclick="changeMainImage('${mainSwapSrc.replace(/'/g, "\\'")}', this, '${originalSrc.replace(/'/g, "\\'")}')"
                    class="w-14 h-14 object-cover rounded-lg border-2 cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-lg ${index === 0 ? 'border-brand-terracotta shadow-md scale-105' : 'border-gray-200 opacity-70 hover:opacity-100'} gpu-accelerated"
                    onerror="this.src='${originalSrc}'">
            `;
        }).join('');
        galleryContainer.classList.remove('hidden');
    } else if (galleryContainer) {
        galleryContainer.innerHTML = '';
        galleryContainer.classList.add('hidden');
    }

    // Reset state
    currentQuantity = 1;
    selectedSize = 'M';
    document.getElementById('quantity-display').textContent = currentQuantity;

    // Render sizes with premium styling
    const sizeContainer = document.getElementById('size-selector');
    sizeContainer.innerHTML = availableSizes.map(size => `
        <button onclick="selectSize('${size}')" 
            class="size-btn w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 transform hover:scale-110 
            ${size === 'M'
            ? 'bg-gradient-to-br from-brand-deep to-brand-terracotta text-white shadow-lg shadow-brand-deep/30 ring-2 ring-brand-deep/20 ring-offset-2'
            : 'bg-white text-brand-deep border-2 border-gray-200 hover:border-brand-terracotta hover:text-brand-terracotta hover:shadow-lg hover:shadow-brand-terracotta/20'
        }">
            ${size}
        </button>
    `).join('');
    // Actions reset
    document.getElementById('modal-actions').classList.remove('hidden');

    // Legacy cleanup (safe check)
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) checkoutForm.classList.add('hidden');

    const orderSuccess = document.getElementById('order-success');
    if (orderSuccess) orderSuccess.classList.add('hidden');

    // Stock Logic
    const stock = product.stock_quantity !== undefined ? parseInt(product.stock_quantity) : 100;
    const isOutOfStock = stock <= 0;

    const addToCartBtn = document.getElementById('modal-add-to-cart-btn');
    const orderBtn = document.getElementById('modal-order-btn');

    if (isOutOfStock) {
        if (addToCartBtn) {
            addToCartBtn.disabled = true;
            addToCartBtn.classList.add('opacity-50', 'cursor-not-allowed', 'grayscale');
            addToCartBtn.textContent = 'Out of Stock';
        }
        if (orderBtn) {
            orderBtn.disabled = true;
            orderBtn.classList.add('opacity-50', 'cursor-not-allowed', 'grayscale');
            orderBtn.textContent = 'Restocking Soon';
        }
    } else {
        if (addToCartBtn) {
            addToCartBtn.disabled = false;
            addToCartBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'grayscale');
            addToCartBtn.textContent = 'Add to Cart';
        }
        if (orderBtn) {
            orderBtn.disabled = false;
            orderBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'grayscale');
            orderBtn.textContent = 'Order Now';
        }
    }

    // Show modal
    document.getElementById('product-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeModal = () => {
    document.getElementById('product-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
};

// Change Main Image in Modal with Fade & Active State
// Change Main Image in Modal with Fade & Active State
window.changeMainImage = (src, thumbnail, originalSrc) => {
    const mainImg = document.getElementById('modal-image');

    // Smooth Fade Out
    mainImg.style.opacity = '0';
    mainImg.style.transform = 'scale(0.98)';

    setTimeout(() => {
        mainImg.src = src;
        // Update error handler for dynamic swap
        mainImg.onerror = function () {
            if (originalSrc) this.src = originalSrc;
        };

        // Smooth Fade In
        mainImg.style.opacity = '1';
        mainImg.style.transform = 'scale(1)';
    }, 200);

    // Update Thumbnail Styles
    if (thumbnail) {
        document.querySelectorAll('#modal-gallery img').forEach(img => {
            img.classList.remove('border-brand-terracotta', 'shadow-md', 'scale-105', 'opacity-100');
            img.classList.add('border-gray-200', 'opacity-70');
        });

        thumbnail.classList.remove('border-gray-200', 'opacity-70');
        thumbnail.classList.add('border-brand-terracotta', 'shadow-md', 'scale-105', 'opacity-100');
    }
};

// --- Fullscreen Image Lightbox ---
window.openLightbox = () => {
    const modalImage = document.getElementById('modal-image');
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');

    if (!modalImage || !lightbox || !lightboxImage) return;

    // Set image source
    lightboxImage.src = modalImage.src;
    lightboxImage.alt = modalImage.alt;

    // Show lightbox
    lightbox.classList.remove('hidden');

    // Reset and trigger animation
    lightboxImage.style.animation = 'none';
    lightboxImage.offsetHeight; // Trigger reflow
    lightboxImage.style.animation = 'lightbox-zoom-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards';

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Close on Escape key
    document.addEventListener('keydown', handleLightboxEscape);
};

window.closeLightbox = () => {
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');

    if (!lightbox) return;

    // Animate out
    lightboxImage.style.animation = 'lightbox-zoom-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';

    setTimeout(() => {
        lightbox.classList.add('hidden');
        // Only restore scroll if modal is also closed
        const modal = document.getElementById('product-modal');
        if (modal && modal.classList.contains('hidden')) {
            document.body.style.overflow = 'auto';
        }
    }, 300);

    document.removeEventListener('keydown', handleLightboxEscape);
};

function handleLightboxEscape(e) {
    if (e.key === 'Escape') {
        closeLightbox();
    }
}

window.updateQuantity = (change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity >= 1 && newQuantity <= 10) {
        currentQuantity = newQuantity;
        document.getElementById('quantity-display').textContent = currentQuantity;
    }
};

window.selectSize = (size) => {
    selectedSize = size;
    document.querySelectorAll('.size-btn').forEach(btn => {
        const btnSize = btn.innerText.trim();
        // Premium selected state
        const selectedClasses = ['bg-gradient-to-br', 'from-brand-deep', 'to-brand-terracotta', 'text-white', 'shadow-lg', 'shadow-brand-deep/30', 'ring-2', 'ring-brand-deep/20', 'ring-offset-2'];
        const unselectedClasses = ['bg-white', 'text-brand-deep', 'border-2', 'border-gray-200'];

        if (btnSize === size) {
            btn.classList.remove(...unselectedClasses, 'hover:border-brand-terracotta', 'hover:text-brand-terracotta', 'hover:shadow-brand-terracotta/20');
            btn.classList.add(...selectedClasses);
        } else {
            btn.classList.remove(...selectedClasses);
            btn.classList.add(...unselectedClasses);
        }
    });
};


// --- Cart Logic ---

let cart = JSON.parse(localStorage.getItem('nongor_cart')) || [];
let selectedSize = 'M';
let currentQuantity = 1;

window.initCart = () => {
    updateCartUI();
};

window.addToCart = () => {
    if (!currentProductId) return;

    const product = allProducts.find(p => p.id === currentProductId);
    if (!product) return;

    let cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: currentQuantity,
        timestamp: Date.now()
    };

    if (currentSizeType === 'custom') {
        // validate inputs
        const inputs = document.querySelectorAll('#custom-size-form input[data-measure]');
        const measurements = {};
        let isValid = true;

        inputs.forEach(input => {
            const val = parseFloat(input.value);
            if (isNaN(val) || val <= 0) {
                isValid = false;
                input.classList.add('border-red-500');
            } else {
                input.classList.remove('border-red-500');
                measurements[input.dataset.measure] = val;
            }
        });

        if (!isValid) {
            showToast("Please enter valid measurements for all fields", 'error');
            return;
        }

        const note = document.getElementById('custom-note').value.trim();

        cartItem.size = 'Custom';
        cartItem.sizeType = 'custom';
        cartItem.measurements = measurements;
        cartItem.unit = currentMeasurementUnit;
        cartItem.notes = note;
        cartItem.sizeLabel = `Custom (${measurements.length || ''})`; // helper for display

    } else {
        if (!selectedSize) {
            showToast("Please select a size", 'error');
            return;
        }
        cartItem.size = selectedSize;
        cartItem.sizeType = 'standard';
    }

    // Add to cart array
    cart.push(cartItem);
    saveCart();
    updateCartUI();
    showToast("Added to Bag");
    closeModal();
    openCart();
};

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
};

window.updateCartUI = () => {
    // 1. Badge Count
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    const drawerBadge = document.getElementById('drawer-count');

    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
    if (drawerBadge) drawerBadge.textContent = count;

    // 2. Drawer Items
    const container = document.getElementById('cart-items');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-gray-400">
                <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                <p>Your cart is empty</p>
                <button onclick="closeCart()" class="text-brand-terracotta text-sm font-bold mt-2">Start Shopping</button>
            </div>
        `;
    } else {
        container.innerHTML = cart.map((item, index) => `
            <div class="group flex items-center gap-4 bg-white p-3 pr-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in relative overflow-hidden">
                <div class="relative h-20 w-20 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden">
                    <img src="${getOptimizedImage(item.image, 'thumb')}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="handleImageError(this)">
                </div>
                
                <div class="flex-grow min-w-0">
                    <div class="flex justify-between items-start mb-1">
                        <h4 class="font-bold text-base text-brand-deep font-serif line-clamp-1 pr-6">${item.name}</h4>
                    </div>
                    
                    <p class="text-xs text-brand-terracotta uppercase tracking-wider font-bold mb-2">Size: ${item.size}</p>
                    
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1">
                            <span class="text-xs text-gray-500 font-bold">Qty:</span>
                            <span class="text-xs font-bold text-brand-deep">${item.quantity}</span>
                        </div>
                        <p class="font-bold text-brand-deep font-mono">৳${(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                </div>

                <button onclick="removeFromCart(${index})" class="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100" title="Remove">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `).join('');
    }

    // 3. Subtotal
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const subtotalEl = document.getElementById('cart-subtotal');
    if (subtotalEl) subtotalEl.textContent = `৳${subtotal.toLocaleString()}`;
};

function saveCart() {
    localStorage.setItem('nongor_cart', JSON.stringify(cart));
}

// Drawer Logic
window.openCart = () => {
    const drawer = document.getElementById('cart-drawer');
    const panel = document.getElementById('cart-panel');
    if (drawer && panel) {
        drawer.classList.remove('hidden');
        setTimeout(() => {
            panel.classList.remove('translate-x-full');
        }, 10);
        document.body.style.overflow = 'hidden';
        initCart(); // ensure UI is fresh
    }
};

window.closeCart = () => {
    const drawer = document.getElementById('cart-drawer');
    const panel = document.getElementById('cart-panel');
    if (drawer && panel) {
        panel.classList.add('translate-x-full');
        setTimeout(() => {
            drawer.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }
};

window.updateQuantity = (change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity >= 1 && newQuantity <= 10) {
        currentQuantity = newQuantity;
        const disp = document.getElementById('quantity-display');
        if (disp) disp.textContent = currentQuantity;
    }
};

console.log('✅ Script loaded successfully');

console.log('✅ Script loaded successfully');

// --- Checkout Logic ---

window.showCheckout = (fromCart = false) => {
    if (fromCart) {
        if (cart.length === 0) {
            showToast("Cart is empty!");
            return;
        }
        // Build cart is default
        localStorage.removeItem('nongor_direct_buy');
        window.location.href = `checkout.html`;
    } else {
        // Buy Now Mode (Single Item)
        const id = currentProductId;
        const product = allProducts.find(p => p.id == id); // Loose equality safe check

        if (!product) {
            showToast("Product data not found. Please reload.", 'error');
            return;
        }

        // Save Exact Product State to LocalStorage (bypassing re-fetch consistency issues)
        const buyNowItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            size: selectedSize,
            quantity: currentQuantity
        };

        localStorage.setItem('nongor_direct_buy', JSON.stringify([buyNowItem]));
        window.location.href = `checkout.html?mode=direct`;
    }
};

// --- Validation Helpers ---
function isValidBangladeshiPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const regex = /^01[3-9]\d{8}$/; // Matches 01712345678 (11 digits)
    return regex.test(cleaned);
}

function validatePhoneRealtime(input) {
    const phone = input.value.trim();
    // Use closest wrapper or create a feedback element if missing
    // Assuming UI structure, we'll toggle classes directly on input
    const submitBtn = document.getElementById('btn-confirm-order');

    // Reset styles
    input.classList.remove('border-green-500', 'border-red-500', 'ring-2', 'ring-red-500', 'ring-green-500');

    if (phone.length === 0) {
        if (submitBtn) submitBtn.disabled = true;
        return;
    }

    if (isValidBangladeshiPhone(phone)) {
        input.classList.add('border-green-500', 'ring-2', 'ring-green-500');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    } else {
        input.classList.add('border-red-500', 'ring-2', 'ring-red-500');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

window.initCheckout = async () => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');

    // Legacy support for ID param (backwards compatibility)
    const legacyId = params.get('id');

    let checkoutItems = [];

    if (mode === 'direct') {
        // New Direct Buy Mode
        try {
            checkoutItems = JSON.parse(localStorage.getItem('nongor_direct_buy')) || [];
        } catch (e) {
            console.error('Error reading direct buy data', e);
        }
    } else if (legacyId) {
        // --- Legacy Buy Now Mode (Fetch) ---
        // Fallback if someone shares a link with ?id=...
        const id = parseInt(legacyId);
        if (allProducts.length === 0) {
            try {
                console.log('📡 Checkout: Fetching products for Legacy Mode...');
                const response = await fetch(`${API_URL}?action=getProducts`);
                const data = await response.json();
                if (data.success && data.products) {
                    allProducts = data.products;
                } else {
                    allProducts = fallbackProducts;
                }
            } catch (err) {
                console.warn('⚠️ API failed, using fallback products');
                allProducts = fallbackProducts;
            }
        }

        const qty = parseInt(params.get('qty')) || 1;
        const size = params.get('size') || 'M';
        const product = allProducts.find(p => p.id == id); // Loose equality

        if (product) {
            checkoutItems.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                size: size,
                quantity: qty,
                sizeType: 'standard' // Legacy fallback
            });
        }
    } else {
        // --- Cart Mode ---
        checkoutItems = JSON.parse(localStorage.getItem('nongor_cart')) || [];
    }

    if (checkoutItems.length === 0) {
        // Empty state
        document.getElementById('checkout-items-container').innerHTML = '<p class="text-center text-red-500">No items in checkout.</p>';
        return;
    }


    // Render Items
    const container = document.getElementById('checkout-items-container');
    container.innerHTML = checkoutItems.map(item => `
    <div class="flex gap-4 items-start bg-gray-50/50 p-2 rounded-lg">
        <img src="${item.image && item.image.startsWith('http') ? item.image : './assets/' + (item.image || 'logo.jpeg').replace(/^\.?\/?assets\//, '')}" class="w-16 h-20 object-cover rounded-md bg-white border border-gray-100" onerror="this.src='./assets/logo.jpeg'">
            <div class="flex-grow">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-gray-900 text-sm line-clamp-1">${item.name}</h4>
                        ${item.sizeType === 'custom'
            ? `<p class="text-xs text-gray-500 mt-1">Custom: <span class="font-bold text-brand-deep">${item.unit}</span></p>
                               <p class="text-[10px] text-gray-400 leading-tight mt-0.5">
                                 ${Object.entries(item.measurements || {}).map(([k, v]) => `${k}:${v}`).join(', ')}
                               </p>`
            : `<p class="text-xs text-gray-500 mt-1">Size: <span class="font-bold text-brand-deep">${item.size}</span></p>`
        }
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-brand-terracotta text-sm">৳${((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)).toLocaleString()}</p>
                        <p class="text-xs text-gray-500">Qty: ${item.quantity}</p>
                    </div>
                </div>
            </div>
        </div>
`).join('');

    // Calculate Totals (ensure price is numeric)
    const total = checkoutItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0);
    document.getElementById('checkout-subtotal').textContent = `৳${total.toLocaleString()} `;

    // CRITICAL FIX: Expose payload for confirm implementation
    window.checkoutPayload = checkoutItems;
    window.checkoutTotal = total;
    // Initial total will be updated by updateTotalWithShipping() below

    // Store globally for submission
    // ...

    // Attach Real-time Validation
    const phoneInput = document.getElementById('cust-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function () { validatePhoneRealtime(this); });
        phoneInput.addEventListener('blur', function () { validatePhoneRealtime(this); });
    }

    window.checkoutPayload = checkoutItems;
    window.checkoutTotal = total;
    window.shippingFee = 70; // Default: Inside Dhaka

    // Update Initial Total with default shipping
    updateTotalWithShipping();

    // Payment Method Change Listener (for manual bKash fields)
    const paymentInputs = document.querySelectorAll('input[name="payment_method"]');
    paymentInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const method = e.target.value;
            const container = document.getElementById('payment-options');
            const existing = document.getElementById('manual-payment-info');
            if (existing) existing.remove();

            if (method === 'Bkash') {
                // Get displayed total from DOM for reliability
                const displayedTotal = document.getElementById('checkout-total')?.textContent || '৳0';

                const div = document.createElement('div');
                div.id = 'manual-payment-info';
                div.className = 'mt-6 p-6 bg-pink-50/50 border border-pink-100 rounded-xl text-sm animate-fade-in ring-1 ring-pink-200';
                div.innerHTML = `
    <div class="flex items-start gap-4 mb-4">
                        <div class="bg-pink-100 p-2 rounded-full">
                            <svg class="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <div>
                            <p class="font-bold text-gray-800 mb-1">bKash Payment Instructions</p>
                            <p class="text-gray-600 leading-relaxed">
                                Please <strong>Send Money</strong> <span class="font-bold text-brand-deep bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">${displayedTotal}</span> to:
                                <br><span class="font-mono font-bold text-lg select-all text-brand-deep mt-1 inline-block">01872647323</span> <span class="text-xs text-gray-400 font-medium ml-1">(Personal)</span>
                            </p>
                        </div>
                    </div >

    <div class="space-y-4">
        <div>
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your bKash Number</label>
            <input type="tel" id="manual-sender" placeholder="e.g. 017XXXXXXXX" maxlength="11" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all bg-white font-mono text-gray-700 placeholder-gray-300 shadow-sm">
        </div>
        <div>
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Transaction ID (TrxID)</label>
            <input type="text" id="manual-trx" placeholder="e.g. 8X3D7..." class="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all bg-white font-mono uppercase text-gray-700 placeholder-gray-300 shadow-sm">
        </div>
    </div>
`;
                // Insert after options
                container.parentNode.insertBefore(div, container.nextSibling);
            }
        });
    });
};

// --- Shipping Logic ---
window.updateShipping = (fee) => {
    window.shippingFee = fee;
    updateTotalWithShipping();
};

function updateTotalWithShipping() {
    const deliveryEl = document.getElementById('checkout-delivery');
    const totalEl = document.getElementById('checkout-total');

    const couponMsgEl = document.getElementById('coupon-message');

    if (deliveryEl) deliveryEl.textContent = `৳${window.shippingFee} `;

    let total = (window.checkoutTotal || 0) + (window.shippingFee || 0);

    // Subtract Discount
    if (window.discountAmount) {
        total -= window.discountAmount;
        // Show discount in UI if not already shown? 
        // Better to just update total for now, or add a row dynamically.
        // Let's stick to updating total and showing message.
        if (couponMsgEl) {
            couponMsgEl.textContent = `Coupon applied! You saved ৳${window.discountAmount}`;
            couponMsgEl.className = "text-xs mt-1 min-h-[1.25rem] font-medium text-green-600";
        }
    }

    if (totalEl) totalEl.textContent = `৳${Math.max(0, total).toLocaleString()} `;

    // Re-render bKash instructions to show new total
    const manualInfo = document.getElementById('manual-payment-info');
    if (manualInfo) {
        const inputs = document.querySelectorAll('input[name="payment_method"]');
        inputs.forEach(i => {
            if (i.checked && i.value === 'Bkash') i.dispatchEvent(new Event('change'));
        });
    }
}



// --- Coupon Logic ---
window.discountAmount = 0;
window.appliedCouponCode = null;

window.checkCoupon = async () => {
    const codeInput = document.getElementById('coupon-code');
    const msgEl = document.getElementById('coupon-message');
    const code = codeInput.value.trim();

    if (!code) {
        msgEl.textContent = "Please enter a code";
        msgEl.className = "text-xs mt-1 min-h-[1.25rem] font-medium text-red-500";
        return;
    }

    try {
        const subtotal = window.checkoutTotal || 0;
        const res = await fetch(`${API_URL}?action=validateCoupon&code=${encodeURIComponent(code)}&amount=${subtotal}`);
        const data = await res.json();

        if (data.result === 'success') {
            window.discountAmount = data.discount;
            window.appliedCouponCode = data.coupon.code;

            msgEl.textContent = `Success! ${data.message}`;
            msgEl.className = "text-xs mt-1 min-h-[1.25rem] font-medium text-green-600";

            updateTotalWithShipping(); // Update UI
        } else {
            window.discountAmount = 0;
            window.appliedCouponCode = null;
            msgEl.textContent = data.message;
            msgEl.className = "text-xs mt-1 min-h-[1.25rem] font-medium text-red-500";
            updateTotalWithShipping();
        }
    } catch (e) {
        console.error(e);
        msgEl.textContent = "Error validation coupon";
        msgEl.className = "text-xs mt-1 min-h-[1.25rem] font-medium text-red-500";
    }
};

// --- Confirm Order from Page ---
window.confirmOrderFromPage = async () => {
    const confirmBtn = document.getElementById('btn-confirm-order');
    const originalText = confirmBtn.innerHTML;

    // 1. Collect Data
    const name = document.getElementById('cust-name').value.trim();
    let phone = document.getElementById('cust-phone').value.trim(); // cleaned up below
    const address = document.getElementById('cust-address').value.trim();
    const email = document.getElementById('cust-email')?.value.trim();

    if (!name || !phone || !address) {
        showToast("Please fill all fields", 'error');
        return;
    }

    if (!window.checkoutPayload || window.checkoutPayload.length === 0) {
        showToast("Cart is empty", 'error');
        return;
    }

    // Phone Validation (Using shared helper)
    if (!isValidBangladeshiPhone(phone)) {
        showToast("Invalid Phone Number (Must be 11 digits starting with 01)", 'error');
        return;
    }
    // Normalize format for backend (remove +88 if user typed it, though validation expects 01...)
    // Our helper checks 01..., so cleanPhone logic inside helper is what we trust.
    // We'll re-clean here just to be safe for payload.
    let fullPhone = phone.replace(/\D/g, '');
    if (fullPhone.startsWith('8801')) fullPhone = fullPhone.substring(2);

    // Payment Logic
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
    const shippingZone = document.querySelector('input[name="shipping_zone"]:checked')?.value || 'inside_dhaka';
    let senderNumber = '', trxId = '';

    if (paymentMethod === 'Bkash') {
        senderNumber = document.getElementById('manual-sender')?.value.trim();
        trxId = document.getElementById('manual-trx')?.value.trim();
        if (!senderNumber || !trxId) {
            showToast("Please enter bKash details", 'error');
            return;
        }
    }

    // Prepare Payload
    const itemsDescription = window.checkoutPayload.map(i => {
        if (i.sizeType === 'custom') {
            const m = Object.entries(i.measurements || {}).map(([k, v]) => `${k}:${v}`).join(', ');
            return `${i.name} [Custom ${i.unit}: ${m}] x${i.quantity}`;
        }
        return `${i.name} (${i.size}) x${i.quantity}`;
    }).join(', ');
    const finalTotal = window.checkoutTotal + window.shippingFee; // Include Shipping

    const orderData = {
        // orderId: generated on server
        customerName: name,
        customerEmail: email,
        customerPhone: fullPhone,
        address: address,
        productName: itemsDescription, // Keep for legacy/email?
        items: window.checkoutPayload, // Send full items array
        price: '0', // Server calculates
        size: 'Mixed',
        quantity: window.checkoutPayload.reduce((s, i) => s + i.quantity, 0),
        // totalPrice: Server calculates
        deliveryDate: new Date(Date.now() + 259200000).toLocaleDateString('en-GB'),
        paymentMethod: paymentMethod,
        senderNumber: senderNumber,
        trxId: trxId,
        couponCode: window.appliedCouponCode,
        shippingZone: shippingZone, // Added: explicit zone for backend calculation
        shippingFee: window.shippingFee, // Server validates/recalculates
        status: 'Pending'
    };

    // UI Loading
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Processing...";

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        const result = await res.json();

        if (result.result === 'success') {
            const serverOrderId = result.data.order_id; // Use server ID
            document.getElementById('success-order-id').textContent = serverOrderId;
            document.getElementById('order-success').classList.replace('hidden', 'flex');
            document.getElementById('checkout-form').classList.add('hidden'); // Hide form
            document.body.style.overflow = 'hidden'; // Lock Scroll

            // Clear Cart after successful order
            localStorage.removeItem('nongor_cart');
        } else {
            throw new Error(result.error || result.message || "Failed");
        }
    } catch (e) {
        alert("Error: " + e.message);
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
};

window.hideCheckout = () => {
    document.getElementById('checkout-form').classList.add('hidden');
    document.getElementById('modal-actions').classList.remove('hidden');
};

// --- Real-time Phone Validation ---
window.validatePhoneRealtime = (input) => {
    // 1. Remove non-digits
    let cleanVal = input.value.replace(/[^0-9]/g, '');

    const validIcon = document.getElementById('phone-valid-icon');
    const invalidIcon = document.getElementById('phone-invalid-icon');
    const feedback = document.getElementById('phone-feedback');

    // Safety check if elements missing
    if (!feedback) return;

    // Strict BD Phone Regex: starts with 01, follows by 3-9, then 8 digits
    const bdPhoneRegex = /^01[3-9]\d{8}$/;

    if (bdPhoneRegex.test(cleanVal)) {
        // Valid
        if (validIcon) validIcon.classList.remove('hidden');
        if (invalidIcon) invalidIcon.classList.add('hidden');
        feedback.textContent = "নম্বর সঠিক আছে (Valid Number)";
        feedback.className = "text-xs font-bengali ml-1 mb-3 h-4 text-green-600 font-bold";
    } else {
        // Invalid
        if (cleanVal.length > 0) {
            if (validIcon) validIcon.classList.add('hidden');
            if (invalidIcon) invalidIcon.classList.remove('hidden');
            feedback.textContent = "সঠিক মোবাইল নম্বর দিন (Example: 01712345678)";
            feedback.className = "text-xs font-bengali ml-1 mb-3 h-4 text-brand-terracotta";
        } else {
            // Empty
            if (validIcon) validIcon.classList.add('hidden');
            if (invalidIcon) invalidIcon.classList.add('hidden');
            feedback.textContent = "";
        }
    }
};

// --- Order Submission Logic ---

window.confirmOrder = async () => {
    console.log("🔵 Confirm Order Clicked");

    const name = document.getElementById('cust-name').value.trim();
    let phoneInput = document.getElementById('cust-phone').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const confirmBtn = document.getElementById('btn-confirm-order');

    // Validation
    if (!name || !phoneInput || !address) {
        showToast("অনুগ্রহ করে সব তথ্য দিন (Please fill all details)", 'error');
        return;
    }

    // Phone validation
    phoneInput = phoneInput.replace(/\D/g, ''); // Remove non-digits
    const bdPhoneRegex = /^01[3-9]\d{8}$/;

    if (!bdPhoneRegex.test(phoneInput)) {
        showToast("মোবাইল নম্বরটি সঠিক নয় (Invalid Phone Number)", 'error');
        return;
    }

    const phone = '+88' + phoneInput; // Add Country Code standard
    const orderId = 'NG-' + Math.floor(10000000 + Math.random() * 90000000);

    const date = new Date();
    date.setDate(date.getDate() + 3);
    const deliveryDate = date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || "COD";
    let senderNumber = '';
    let trxId = '';

    // Validate Manual Payment
    if (paymentMethod === 'Bkash') {
        senderNumber = document.getElementById('manual-sender')?.value.trim();
        trxId = document.getElementById('manual-trx')?.value.trim();

        if (!senderNumber || !trxId) {
            alert("Please enter your Sender Number and Transaction ID to proceed.");
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = "অর্ডার নিশ্চিত করুন"; // Reset button text
            return;
        }
    }

    // Validation (Custom Size)
    let measurements = null;
    let sizeLabel = selectedSize;
    let unit = 'inch';
    let notes = '';
    let sizeType = 'standard';

    if (window.getAndValidateMeasurements) {
        // If we are in custom mode
        if (typeof currentSizeType !== 'undefined' && currentSizeType === 'custom') {
            const val = getAndValidateMeasurements();
            if (!val.valid) {
                confirmBtn.innerHTML = "অর্ডার নিশ্চিত করুন";
                confirmBtn.disabled = false;
                return;
            }
            sizeType = 'custom';
            measurements = val.measurements;
            unit = val.unit;
            notes = val.notes;
            const mStr = Object.entries(measurements).map(([k, v]) => `${k}:${v}`).join(', ');
            sizeLabel = `Custom (${unit}): ${mStr}`;
        }
    }

    // Prepare Items for Backend
    const items = [{
        id: currentProductId,
        quantity: currentQuantity,
        size: sizeLabel, // Descriptive
        sizeType: sizeType,
        unit: unit,
        measurements: measurements,
        notes: notes
    }];

    const orderData = {
        // orderId: Generated on server
        customerName: name,
        customerPhone: phone,
        address: address,
        productName: document.getElementById('modal-title').textContent + (sizeType === 'custom' ? ` - ${sizeLabel}` : ''),
        // price: parseFloat(document.getElementById('modal-price').textContent.replace(/[^\d.]/g, '')),
        items: items, // Send items!
        size: sizeLabel,
        quantity: currentQuantity,
        // totalPrice: Server calculates
        deliveryDate: deliveryDate,
        paymentMethod: paymentMethod,
        senderNumber: senderNumber, // Added
        trxId: trxId,               // Added
        shippingFee: window.shippingFee || 70, // Default to 70 if not set
        status: 'Pending'
    };

    // Show loading
    const originalHTML = confirmBtn.innerHTML;
    confirmBtn.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        অর্ডার প্রসেস হচ্ছে...
    `;
    confirmBtn.disabled = true;

    try {
        console.log("📤 Sending order data...");

        // Send POST request to API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (result.result === "success") {
            console.log("✅ Order saved!");
            const serverOrderId = result.data.order_id;

            // Hide checkout form
            const checkoutForm = document.getElementById('checkout-form');
            const modalActions = document.getElementById('modal-actions');
            const orderSuccess = document.getElementById('order-success');

            if (checkoutForm) checkoutForm.classList.add('hidden');
            if (modalActions) modalActions.classList.add('hidden');
            if (orderSuccess) {
                orderSuccess.classList.remove('hidden');
                document.body.style.overflow = 'hidden'; // Lock Scroll

                // Update success screen
                const orderIdEl = document.getElementById('success-order-id');
                const deliveryDateEl = document.getElementById('success-delivery-date');

                if (orderIdEl) orderIdEl.textContent = serverOrderId;
                if (deliveryDateEl) deliveryDateEl.textContent = deliveryDate;
            }

            // Also copy ID to clipboard purely for convenience? Optional.
            // navigator.clipboard.writeText(orderId);

            showToast("✅ অর্ডার সফল হয়েছে!");
        } else {
            throw new Error(result.message || "Unknown Error");
        }

    } catch (e) {
        console.error("❌ Order failed:", e);
        showToast("Order Failed: " + e.message, 'error'); // Show the real error!
        confirmBtn.innerHTML = originalHTML;
        confirmBtn.disabled = false;
    }
};

// --- Tracking Logic ---

window.openTrackingModal = () => {
    document.getElementById('tracking-modal').classList.remove('hidden');
};

window.closeTrackingModal = () => {
    document.getElementById('tracking-modal').classList.add('hidden');
    document.getElementById('track-result').classList.add('hidden');
    document.getElementById('track-id-input').value = '';
};

window.trackOrder = async () => {
    const idInput = document.getElementById('track-id-input').value.trim();
    if (!idInput) {
        showToast('অর্ডারের আইডি দিন (Enter Order ID)', 'error');
        return;
    }

    const trackBtn = document.querySelector('#btn-track-submit');

    try {
        // Show loading state
        const originalText = trackBtn.innerHTML;
        trackBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white inline-block mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Searching...</span>
        `;
        trackBtn.disabled = true;

        // Fetch (GET request with cache busting and token support)
        let idInput = document.getElementById('track-id-input').value.trim();
        let queryParam = 'orderId=' + encodeURIComponent(idInput);

        // Auto-detect if input might be a token (length checking or if passed as arg)
        if (idInput.length > 20) {
            queryParam = 'tracking_token=' + encodeURIComponent(idInput);
        }

        const response = await fetch(`${API_URL}?${queryParam}&_t=${Date.now()}`);
        const result = await response.json();

        if (result.result === "success") {
            const order = result.data;
            document.getElementById('track-result').classList.remove('hidden');
            document.getElementById('track-id-display').textContent = order.order_id;

            // Populate Payment Details
            document.getElementById('track-amount').textContent = `৳${parseFloat(order.total_price || 0).toLocaleString('bn-BD')} `;
            const paymentStatusEl = document.getElementById('track-payment-status');

            if (order.status === 'Paid') {
                paymentStatusEl.innerHTML = `<span class="text-green-600 bg-green-100 px-2 py-1 rounded text-xs">Paid ✅</span>`;
            } else {
                paymentStatusEl.innerHTML = `<span class="text-red-600 bg-red-100 px-2 py-1 rounded text-xs">${order.payment_status || 'Due'} ⚠️</span>`;
            }

            // Status Container (XSS FIX: Use textContent)
            const statusContainer = document.getElementById('track-status-container');
            const deliveryStatus = order.delivery_status || order.status || 'Pending';
            const paymentStatus = order.payment_status || 'Unpaid';
            const statusColor = getStatusColor(deliveryStatus);

            // Clear and rebuild using DOM methods for XSS safety
            statusContainer.innerHTML = '';
            const statusDiv = document.createElement('div');
            statusDiv.className = 'flex flex-col gap-1';

            const statusSpan = document.createElement('span');
            statusSpan.className = `text-2xl font-bold ${statusColor} block`;
            statusSpan.textContent = deliveryStatus;

            const itemsSpan = document.createElement('span');
            itemsSpan.className = 'text-gray-400 text-xs text-left block mt-1';
            itemsSpan.innerHTML = '<span class="font-bold">Items:</span> ';
            const itemsText = document.createTextNode(order.product_name || '');
            itemsSpan.appendChild(itemsText);

            statusDiv.appendChild(statusSpan);
            statusDiv.appendChild(itemsSpan);
            statusContainer.appendChild(statusDiv);

            // Separate Payment Status Box
            const paymentBox = document.getElementById('track-payment-status');
            const paymentColor = getPaymentColor(paymentStatus);
            paymentBox.innerHTML = `<span class="${paymentColor}">${paymentStatus}</span>`;

            // Delivery Date
            document.getElementById('track-delivery-date').textContent = order.delivery_date || 'Processing...';

        } else {
            showToast("Order not found! (অর্ডারটি পাওয়া যায়নি)", 'error');
            document.getElementById('track-result').classList.add('hidden');
        }

    } catch (e) {
        console.error("Tracking Error:", e);
        showToast("Tracking Failed: " + e.message, 'error');
    } finally {
        trackBtn.innerHTML = `<span>TRACK NOW</span>`;
        trackBtn.disabled = false;
    }
};

function getPaymentColor(status) {
    status = status.toLowerCase();
    if (status === 'paid') return 'text-green-600 bg-green-50 px-2 py-0.5 rounded';
    if (status === 'due') return 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded';
    if (status === 'unpaid') return 'text-red-500';
    if (status === 'refunded') return 'text-purple-600';
    return 'text-gray-600';
}

function getStatusColor(status) {
    status = status.toLowerCase();
    if (status.includes('pending')) return 'text-orange-600';
    if (status.includes('processing')) return 'text-blue-600';
    if (status.includes('shipped')) return 'text-purple-600';
    if (status.includes('delivered')) return 'text-green-600';
    if (status.includes('cancel')) return 'text-red-600';
    return 'text-gray-600';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    // Safety check
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;

    // Reset Icon
    if (toastIcon) {
        if (type === 'error') {
            toastIcon.className = 'w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
        } else if (type === 'processing') {
            toastIcon.className = 'w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
        } else {
            // Default Success
            toastIcon.className = 'w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]';
        }
    }

    toast.classList.remove('hidden');
    // Trigger reflow
    void toast.offsetWidth;
    toast.classList.remove('opacity-0', 'translate-y-20');

    // Auto hide
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-20');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Cart everywhere
    if (typeof initCart === 'function') initCart();

    // Initialize Products on Home Page
    const grid = document.getElementById('products-grid');
    if (grid) {
        if (typeof initProducts === 'function') initProducts();
        if (typeof initCategories === 'function') initCategories();
    }

    // Auto-Tracking from URL
    const urlParams = new URLSearchParams(window.location.search);
    const trackToken = urlParams.get('track');
    if (trackToken) {
        // Clean up URL without reload
        window.history.replaceState({}, document.title, window.location.pathname);

        openTrackingModal();
        document.getElementById('track-id-input').value = trackToken;
        setTimeout(() => trackOrder(), 500); // Small delay to ensure modal render
    }
});
// Copy Order ID
function copyOrderId() {
    const orderId = document.getElementById('success-order-id').innerText;
    if (!orderId) return;

    // Remove fallback #NG-XXXX placeholder if copied
    const textToCopy = orderId.includes('XXXX') ? '' : orderId;
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
        // Show Toast
        showToast('Order ID Copied!', 'green');

        // Visual Feedback (Toggle Icons) - For Index Modal
        const copyIcon = document.getElementById('copy-icon');
        const checkIcon = document.getElementById('check-icon');
        if (copyIcon && checkIcon) {
            copyIcon.classList.add('hidden');
            checkIcon.classList.remove('hidden');
            setTimeout(() => {
                copyIcon.classList.remove('hidden');
                checkIcon.classList.add('hidden');
            }, 2000);
        }

        // Visual Feedback (Toggle Icons) - For Checkout Page
        const copyIconCk = document.getElementById('copy-icon-checkout');
        const checkIconCk = document.getElementById('check-icon-checkout');
        if (copyIconCk && checkIconCk) {
            copyIconCk.classList.add('hidden');
            checkIconCk.classList.remove('hidden');
            setTimeout(() => {
                copyIconCk.classList.remove('hidden');
                checkIconCk.classList.add('hidden');
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy', 'red');
    });
}



// ==============================================
// CUSTOM SIZING LOGIC (Appended)
// ==============================================

// --- Product Modal Logic ---
// --- Product Modal Logic ---
window.currentProduct = {};
window.currentSizeType = 'standard'; // 'standard' | 'custom'
window.currentMeasurementUnit = 'inch'; // 'inch' | 'cm'

window.openProductModal = (product) => {
    console.log('Opening modal for:', product.name);
    window.currentProduct = product;
    window.currentSizeType = 'standard';
    window.currentMeasurementUnit = 'inch';

    document.getElementById('product-modal').classList.remove('hidden');
    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-category').textContent = product.category || 'Apparel';
    document.getElementById('modal-description').textContent = product.description || '';

    // Ensure numeric price for display logic
    const price = parseFloat(product.price) || 0;
    document.getElementById('modal-price').textContent = `৳${price.toLocaleString()}`;

    const qtyDisp = document.getElementById('quantity-display');
    if (qtyDisp) qtyDisp.textContent = '1';
    window.modalQuantity = 1;

    updateSizeTypeUI();

    // Size Selector
    const sizeContainer = document.getElementById('size-selector');
    if (sizeContainer) {
        sizeContainer.innerHTML = '';
        const sizes = (product.sizes && product.sizes.length > 0) ? product.sizes : ['M', 'L', 'XL', 'XXL'];
        window.selectedSize = sizes[0];

        sizes.forEach(size => {
            const btn = document.createElement('button');
            btn.textContent = size;
            btn.className = `w-10 h-10 rounded-full border border-gray-200 hover:border-brand-terracotta transition flex items-center justify-center font-bold ${size === window.selectedSize ? 'bg-brand-deep text-white border-brand-deep' : 'text-gray-600'}`;
            btn.onclick = () => {
                window.selectedSize = size;
                Array.from(sizeContainer.children).forEach(b => b.className = 'w-10 h-10 rounded-full border border-gray-200 hover:border-brand-terracotta transition flex items-center justify-center font-bold text-gray-600');
                btn.className = 'w-10 h-10 rounded-full border border-brand-deep transition flex items-center justify-center font-bold bg-brand-deep text-white';
            };
            sizeContainer.appendChild(btn);
        });
    }

    // Gallery
    const galleryContainer = document.getElementById('modal-gallery');
    const mainImage = document.getElementById('main-modal-image');
    if (mainImage) mainImage.src = product.image;

    if (galleryContainer && product.images && product.images.length > 0) {
        galleryContainer.innerHTML = '';
        [product.image, ...product.images].forEach(img => {
            const thumb = document.createElement('img');
            thumb.src = img;
            thumb.className = "w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:border-brand-terracotta transition";
            thumb.onclick = () => mainImage.src = img;
            galleryContainer.appendChild(thumb);
        });
    }
};

window.toggleSizeType = (type) => {
    currentSizeType = type;
    updateSizeTypeUI();
};

window.toggleUnit = (unit) => {
    currentMeasurementUnit = unit;
    const btnInch = document.getElementById('btn-unit-inch');
    const btnCm = document.getElementById('btn-unit-cm');

    if (btnInch) btnInch.className = `px-2 py-0.5 text-xs font-bold rounded-l ${unit === 'inch' ? 'bg-brand-terracotta text-white' : 'text-gray-500 bg-white'}`;
    if (btnCm) btnCm.className = `px-2 py-0.5 text-xs font-bold rounded-r ${unit === 'cm' ? 'bg-brand-terracotta text-white' : 'text-gray-500 bg-white'}`;
};

function updateSizeTypeUI() {
    const stdBtn = document.getElementById('btn-size-standard');
    const cstBtn = document.getElementById('btn-size-custom');
    const stdSelector = document.getElementById('size-selector');
    const cstForm = document.getElementById('custom-size-form');

    if (!stdBtn || !cstBtn || !stdSelector || !cstForm) return;

    if (currentSizeType === 'standard') {
        stdBtn.className = "px-4 py-1.5 rounded-md text-sm font-bold transition-all bg-white shadow-sm text-brand-deep ring-1 ring-gray-200";
        cstBtn.className = "px-4 py-1.5 rounded-md text-sm font-bold transition-all text-gray-500 hover:text-brand-deep";
        stdSelector.classList.remove('hidden');
        cstForm.classList.add('hidden');
    } else {
        stdBtn.className = "px-4 py-1.5 rounded-md text-sm font-bold transition-all text-gray-500 hover:text-brand-deep";
        cstBtn.className = "px-4 py-1.5 rounded-md text-sm font-bold transition-all bg-white shadow-sm text-brand-deep ring-1 ring-gray-200";
        stdSelector.classList.add('hidden');
        cstForm.classList.remove('hidden');
    }
}

function getAndValidateMeasurements() {
    if (currentSizeType === 'standard') return { valid: true };

    const inputs = document.querySelectorAll('#custom-size-form input[data-measure]');
    const measurements = {};
    let isValid = true;

    inputs.forEach(i => i.classList.remove('border-red-500'));

    inputs.forEach(input => {
        const val = parseFloat(input.value);
        const name = input.getAttribute('data-measure');

        if (isNaN(val) || val <= 0) {
            isValid = false;
            input.classList.add('border-red-500');
        } else {
            // Range checks
            if (currentMeasurementUnit === 'inch' && (val < 5 || val > 100)) {
                isValid = false;
                input.classList.add('border-red-500');
            } else if (currentMeasurementUnit === 'cm' && (val < 10 || val > 250)) {
                isValid = false;
                input.classList.add('border-red-500');
            }
            measurements[name] = val;
        }
    });

    if (!isValid) {
        showToast('Please check highlighted measurements', 'error');
        return { valid: false };
    }

    const noteEl = document.getElementById('custom-note');
    const note = noteEl ? noteEl.value.trim() : '';
    return {
        valid: true,
        measurements,
        unit: currentMeasurementUnit,
        notes: note
    };
}

window.addToCart = () => {
    const validation = getAndValidateMeasurements();
    if (!validation.valid) return;

    const cart = JSON.parse(localStorage.getItem('nongor_cart')) || [];

    const newItem = {
        id: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price,
        image: currentProduct.image,
        quantity: window.modalQuantity || 1,
        sizeType: currentSizeType,
        size: currentSizeType === 'standard' ? window.selectedSize : `Custom (${validation.unit})`,
        unit: validation.unit,
        measurements: validation.measurements,
        notes: validation.notes
    };

    // Smart merge
    const existingIndex = cart.findIndex(item =>
        item.id === newItem.id &&
        item.sizeType === newItem.sizeType &&
        item.size === newItem.size &&
        JSON.stringify(item.measurements) === JSON.stringify(newItem.measurements)
    );

    if (existingIndex > -1) {
        cart[existingIndex].quantity += newItem.quantity;
    } else {
        cart.push(newItem);
    }

    localStorage.setItem('nongor_cart', JSON.stringify(cart));
    updateCartCount();
    showToast(`${currentProduct.name} added to cart!`);


    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.add('hidden');
};

console.log('✅ Custom Sizing Logic Loaded');

// ==============================================
// FORM VALIDATION
// ==============================================
window.validatePhoneRealtime = function (input) {
    const phone = input.value.replace(/\D/g, ''); // Remove non-digits for check
    const feedback = document.getElementById('phone-feedback');
    const submitBtn = document.getElementById('btn-complete-order');

    // Regex: Starts with 01, followed by 3-9, and exactly 11 digits total
    const phoneRegex = /^01[3-9]\d{8}$/;

    if (phone.length === 0) {
        if (feedback) feedback.textContent = '';
        input.classList.remove('border-red-500', 'border-green-500', 'bg-red-50', 'bg-green-50');
        return;
    }

    if (phoneRegex.test(phone)) {
        // Valid
        if (feedback) {
            feedback.textContent = '✓ Valid Number';
            feedback.classList.remove('text-red-500');
            feedback.classList.add('text-green-600');
        }
        input.classList.remove('border-red-500', 'bg-red-50');
        input.classList.add('border-green-500', 'bg-green-50');
    } else {
        // Invalid
        if (feedback) {
            feedback.textContent = 'Invalid Phone Number (017... 11 digits)';
            feedback.classList.remove('text-green-600');
            feedback.classList.add('text-red-500');
        }
        input.classList.remove('border-green-500', 'bg-green-50');
        input.classList.add('border-red-500', 'bg-red-50');
    }
};
