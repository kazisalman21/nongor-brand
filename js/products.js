// ==============================================
// PRODUCTS — Listing, filtering, rendering, cards
// ==============================================

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

window.filterProducts = function (category, event) {
    currentCategory = category;

    if (event) {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-brand-terracotta', 'text-white', 'shadow-lg', 'scale-105');
            btn.classList.add('text-gray-500');
        });
        event.target.classList.add('active', 'bg-brand-terracotta', 'text-white', 'shadow-lg', 'scale-105');
        event.target.classList.remove('text-gray-500');
    }

    if (category === 'all') {
        renderProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category_slug === category);
        renderProducts(filtered);
    }
};

// --- Filter Toggle & Clear ---
window.toggleFilters = function () {
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

window.clearAllFilters = function () {
    document.getElementById('search-input').value = '';
    document.getElementById('min-price').value = '';
    document.getElementById('max-price').value = '';
    document.getElementById('sort-select').value = 'newest';
    document.getElementById('instock-toggle').checked = false;
    currentCategory = 'all';

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

window.toggleFilterDrawer = function () {
    const drawer = document.getElementById('filter-drawer');
    if (drawer) {
        drawer.classList.toggle('hidden');
    }
};

// --- Fetch & Initialize Products ---
async function initProducts(params = {}) {

    const container = document.getElementById('products-grid');
    if (!container) return;

    showLoading(container);

    try {
        const urlP = new URLSearchParams();
        urlP.append('action', 'getProducts');

        if (params.search) urlP.append('search', params.search);
        if (params.category && params.category !== 'all') urlP.append('category', params.category);
        if (params.min) urlP.append('min', params.min);
        if (params.max) urlP.append('max', params.max);
        if (params.sort) urlP.append('sort', params.sort);



        const response = await fetch(`${API_URL}?${urlP.toString()}`);


        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();


        if (result.result === 'success' && result.data && Array.isArray(result.data)) {
            let fetchedProducts = result.data.map(p => ({
                ...p,
                price: parseFloat(p.price),
                images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : (p.images || []),
                category: {
                    name: p.category_name || 'অন্যান্য',
                    slug: p.category_slug || 'other'
                }
            }));

            if (params.inStock) {
                fetchedProducts = fetchedProducts.filter(p => parseInt(p.stock_quantity) > 0);
            }

            allProducts = fetchedProducts;

            if (fetchedProducts.length === 0) {
                showEmptyState(container);
            } else {
                renderProducts(fetchedProducts);
            }
        } else {
            throw new Error('Invalid API response format');
        }

    } catch (error) {
        console.error('Error loading products:', error);
        showError(container, error.message);
        allProducts = fallbackProducts;
        renderProducts(fallbackProducts);
    }
}

// --- Apply All Filters ---
window.applyAllFilters = function () {
    clearTimeout(filterDebounceTimer);
    filterDebounceTimer = setTimeout(() => {
        const searchQuery = document.getElementById('search-input')?.value?.trim() || '';
        const minPrice = document.getElementById('min-price')?.value;
        const maxPrice = document.getElementById('max-price')?.value;
        const sortBy = document.getElementById('sort-select')?.value || 'newest';
        const inStockOnly = document.getElementById('instock-toggle')?.checked || false;



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

// Legacy backward compatibility alias
window.applyPriceFilter = window.applyAllFilters;

// --- Search ---
window.handleSearch = function (query) {

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

    renderProducts(filtered);
};

// ==============================================
// RENDER PRODUCTS TO GRID
// ==============================================
function renderProducts(products) {
    const container = document.getElementById('products-grid');
    if (!container) return;

    container.innerHTML = '';

    if (!products || !Array.isArray(products)) {
        showError(container, 'Invalid product data');
        return;
    }

    if (products.length === 0) {
        showEmptyState(container);
        return;
    }

    products.forEach((product, index) => {
        try {
            const card = createProductCard(product, index);
            container.appendChild(card);
        } catch (error) {
            console.error('Error rendering product:', error);
        }
    });
}

// ==============================================
// CREATE PRODUCT CARD ELEMENT (PREMIUM VERSION)
// ==============================================
function createProductCard(product, index) {
    if (!product || !product.id) {
        return document.createElement('div');
    }

    const isMobile = window.innerWidth < 640;

    const card = document.createElement('div');
    card.className = 'product-card group relative bg-white rounded-2xl overflow-hidden cursor-pointer animate-fade-in-up';
    let cardStyles = `
        animation-delay: ${index * 0.1}s;
        box-shadow: 0 4px 20px rgba(61, 64, 91, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: 1px solid rgba(244, 241, 222, 0.8);
    `;

    if (isMobile) {
        cardStyles = `
            animation-delay: ${index * 0.1}s;
            box-shadow: 0 2px 10px rgba(61, 64, 91, 0.05);
            transition: all 0.3s ease;
            border: 1px solid rgba(244, 241, 222, 1);
        `;
    }
    card.style.cssText = cardStyles;

    if (!isMobile) {
        card.style.willChange = 'transform, box-shadow';
        card.onmouseenter = function () {
            this.style.transform = 'translateY(-8px)';
            this.style.boxShadow = '0 20px 40px rgba(61, 64, 91, 0.12)';
            this.style.borderColor = 'rgba(224, 122, 95, 0.3)';
        };
        card.onmouseleave = function () {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 20px rgba(61, 64, 91, 0.08)';
            this.style.borderColor = 'rgba(244, 241, 222, 0.8)';
        };
    }

    // Create image container
    const imgContainer = document.createElement('div');
    imgContainer.className = 'relative overflow-hidden';

    if (isMobile) {
        imgContainer.style.cssText = 'aspect-ratio: 3/4; width: 100%;';
    } else {
        imgContainer.style.cssText = 'height: 280px; width: 100%;';
    }

    const img = document.createElement('img');
    img.src = product.image || './assets/logo.jpeg';
    img.alt = product.name || 'Product';
    img.className = 'w-full h-full object-cover';
    img.loading = 'lazy';
    img.style.cssText = 'transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94); will-change: transform; backface-visibility: hidden;';

    if (!isMobile) {
        card.addEventListener('mouseenter', () => {
            img.style.transform = 'scale(1.08)';
        });
        card.addEventListener('mouseleave', () => {
            img.style.transform = 'scale(1)';
        });
    }

    let fallbackAttempted = false;
    img.onerror = function () {
        if (!fallbackAttempted) {
            fallbackAttempted = true;
            this.src = './assets/logo.jpeg';
        } else {
            this.onerror = null;
        }
    };

    const overlay = document.createElement('div');
    overlay.className = 'absolute inset-0 pointer-events-none';
    overlay.style.cssText = 'background: linear-gradient(180deg, transparent 50%, rgba(61, 64, 91, 0.03) 100%);';

    imgContainer.appendChild(img);
    imgContainer.appendChild(overlay);

    if (!isMobile) {
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
        imgContainer.appendChild(shine);
    }

    // Create content section
    const content = document.createElement('div');
    content.className = isMobile ? 'p-3 relative' : 'p-5 relative';
    content.style.cssText = 'background: linear-gradient(180deg, #ffffff 0%, #fdfcfa 100%);';

    const category = document.createElement('span');
    category.className = isMobile
        ? 'inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-full mb-2'
        : 'inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full mb-3';
    category.style.cssText = `
        background: linear-gradient(135deg, rgba(224, 122, 95, 0.12) 0%, rgba(224, 122, 95, 0.08) 100%);
        color: #E07A5F;
        letter-spacing: 0.5px;
        border: 1px solid rgba(224, 122, 95, 0.15);
    `;
    category.textContent = product.category_name || product.category?.name || 'অন্যান্য';

    const title = document.createElement('h3');
    title.className = isMobile
        ? 'font-bold text-brand-deep mb-1 line-clamp-2 font-bengali leading-tight text-base'
        : 'font-bold text-brand-deep mb-2 line-clamp-2 font-bengali leading-tight text-[1.15rem]';
    title.style.cssText = 'transition: color 0.3s ease;';
    title.textContent = product.name || 'Unknown Product';

    const description = document.createElement('p');
    description.className = 'text-gray-500 text-sm mb-3 md:mb-4 line-clamp-2 leading-relaxed';
    description.style.cssText = 'font-weight: 400;';
    description.textContent = product.description || '';
    if (isMobile) description.style.fontSize = '0.8rem';

    const footer = document.createElement('div');
    footer.className = 'flex items-center justify-between mt-auto pt-3 md:pt-4';
    footer.style.cssText = 'border-top: 1px solid rgba(244, 241, 222, 0.6);';

    const priceContainer = document.createElement('div');
    priceContainer.className = 'flex flex-col';

    const price = document.createElement('span');
    price.className = 'font-bold';

    if (isMobile) {
        price.style.cssText = `font-size: 1.1rem; color: #E07A5F;`;
    } else {
        price.style.cssText = `
            font-size: 1.5rem;
            background: linear-gradient(135deg, #E07A5F 0%, #d4694f 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        `;
    }

    const priceValue = parseFloat(product.price) || 0;
    price.textContent = `৳${priceValue.toLocaleString()}`;
    priceContainer.appendChild(price);

    const button = document.createElement('button');

    if (isMobile) {
        button.className = 'relative overflow-hidden text-white px-4 py-1.5 rounded-lg font-medium text-xs';
        button.style.cssText = `background: #3D405B; box-shadow: 0 2px 5px rgba(61, 64, 91, 0.2);`;
    } else {
        button.className = 'relative overflow-hidden text-white px-7 py-3 rounded-full font-semibold text-base';
        button.style.cssText = `
            background: linear-gradient(135deg, #3D405B 0%, #2d3047 100%);
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 4px 15px rgba(61, 64, 91, 0.25);
            min-width: 110px;
        `;
    }

    button.textContent = 'বিস্তারিত';

    if (!isMobile) {
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
    }

    button.onclick = function (e) {
        e.stopPropagation();
        if (product.slug) {
            window.location.href = `/p/${product.slug}`;
        } else {
            window.location.href = `product.html?id=${product.id}`;
        }
    };

    card.onclick = function () {
        if (product.slug) {
            window.location.href = `/p/${product.slug}`;
        } else {
            window.location.href = `product.html?id=${product.id}`;
        }
    };

    footer.appendChild(priceContainer);
    footer.appendChild(button);

    content.appendChild(category);
    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(footer);

    card.appendChild(imgContainer);
    card.appendChild(content);

    return card;
}

// ==============================================
// LOADING / EMPTY / ERROR STATES
// ==============================================
function showLoading(container) {
    container.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-20 animate-fade-in animate-fabric-bg rounded-xl">
            <div class="relative flex flex-col items-center">
                <!-- Premium Anchor Stitch Animation -->
                <div class="relative w-24 h-24 mb-6">
                    <svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-xl" style="animation: needlePulse 3s ease-in-out infinite;">
                        <!-- Anchor Shape Path -->
                        <path d="M50 20 V70 M30 50 Q50 85 70 50" 
                              fill="none" 
                              stroke="#E07A5F" 
                              stroke-width="3" 
                              stroke-linecap="round" 
                              stroke-linejoin="round"
                              class="animate-stitch" />
                        <!-- Needle Eye (Top) -->
                        <circle cx="50" cy="15" r="4" stroke="#3D405B" stroke-width="2" fill="white" />
                    </svg>
                </div>

                <!-- Text Reveal -->
                <h3 class="mt-4 text-2xl font-serif tracking-[0.3em] uppercase relative">
                    <!-- Base Layer (Ghost Text) -->
                    <span class="text-gray-200">Nongor</span>
                    <!-- Fill Layer (Animated) -->
                    <span class="absolute inset-0 text-brand-deep animate-liquid-fill overflow-hidden whitespace-nowrap border-r-2 border-brand-terracotta/50 pr-1" style="animation-timing-function: cubic-bezier(0.8, 0, 0.2, 1);">Nongor</span>
                </h3>
                <p class="text-[10px] text-brand-terracotta font-sans tracking-[0.3em] mt-3 uppercase opacity-0 animate-fade-in-up" style="animation-delay: 1.5s">Handcrafting...</p>
            </div>
        </div>
    `;
}

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

function showError(container, errorMsg) {
    const safeMsg = escapeHtml(errorMsg || 'অজানা ত্রুটি');
    container.innerHTML = `
        <div class="col-span-full text-center py-20">
            <div class="text-6xl mb-4">⚠️</div>
            <h3 class="text-2xl font-bold text-red-500 mb-2">পণ্য লোড করতে সমস্যা হয়েছে</h3>
            <p class="text-gray-600 mb-6">${safeMsg}</p>
            <button onclick="initProducts()" class="bg-brand-terracotta text-white px-6 py-3 rounded-full hover:bg-brand-deep transition-colors">
                আবার চেষ্টা করুন
            </button>
        </div>
    `;
}

// Make functions globally accessible
window.initProducts = initProducts;
window.initCategories = initCategories;
window.renderProducts = renderProducts;
window.createProductCard = createProductCard;
