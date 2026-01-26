
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
        "price": 1000.00,
        "image": "tulip.jpg",
        "description": "আরামদায়ক কাপড়ে রঙিন টিউলিপ ফুলের নকশা।",
        "is_featured": true,
        "category_slug": "kurti",
        "category_name": "কুর্তি"
    },
    {
        "id": 2,
        "name": "একটা কমলা রঙের প্রজাপতি",
        "price": 900.00,
        "image": "butterfly.jpg",
        "description": "কালো পোশাকে রঙিন প্রজাপতির ছোঁয়া।",
        "is_featured": true,
        "category_slug": "kurti",
        "category_name": "কুর্তি"
    },

];

let allProducts = [];
let currentCategory = 'all';

// 🔴 IMPORTANT: Paste your Web App URL here after deployment
const API_URL = '/api';


// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // Sticky Navbar Logic with Throttle for Smooth Performance
    const navbar = document.getElementById('navbar');
    let ticking = false;

    const updateNavbar = () => {
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

    // Hide Loading Overlay with Premium Delay
    const overlay = document.getElementById('app-loading-overlay');
    if (overlay) {
        setTimeout(() => {
            overlay.classList.add('opacity-0', 'scale-105', 'pointer-events-none');
            setTimeout(() => overlay.remove(), 700);
        }, 800);
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

async function initProducts() {
    try {
        // Show loading state
        const grid = document.getElementById('products-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full flex justify-center items-center py-20">
                    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-terracotta"></div>
                </div>
            `;
        }

        // Fetch products from API
        const response = await fetch(`${API_URL}?action=getProducts`);
        const result = await response.json();

        if (result.result === 'success' && result.data && result.data.length > 0) {
            // Transform API data to match expected format
            allProducts = result.data.map(p => ({
                id: p.id,
                name: p.name,
                price: parseFloat(p.price),
                image: p.image,
                images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : (p.images || []),
                description: p.description,
                is_featured: p.is_featured,
                category: {
                    name: p.category_name || 'অন্যান্য',
                    slug: p.category_slug || 'other'
                }
            }));
        } else {
            console.warn('No products from API, using fallback data');
            allProducts = fallbackProducts.map(p => ({
                ...p,
                category: { name: p.category_name, slug: p.category_slug }
            }));
        }

        renderProducts(allProducts);
        if (window.location.pathname.includes('checkout')) initCheckout();
    } catch (error) {
        console.error('Error fetching products:', error);
        // Use fallback data on error
        allProducts = fallbackProducts.map(p => ({
            ...p,
            category: { name: p.category_name, slug: p.category_slug }
        }));
        renderProducts(allProducts);
        if (window.location.pathname.includes('checkout')) initCheckout();
    }
}

window.filterProducts = (category, event) => {
    currentCategory = category;

    if (event) {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.className = 'category-btn px-8 py-3 rounded-full text-base font-medium transition-all duration-300 border border-transparent hover:bg-brand-terracotta/10 hover:text-brand-terracotta text-gray-500';
        });

        event.target.className = 'category-btn active px-8 py-3 rounded-full bg-brand-terracotta text-white shadow-lg shadow-brand-terracotta/30 transform scale-105 transition-all duration-300 font-medium border border-transparent';
    }

    if (category === 'all') {
        renderProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category.slug === category);
        renderProducts(filtered);
    }
};

function renderProducts(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20 animate-fade-in-up">
                <!-- Animated Icon -->
                <div class="relative mb-8">
                    <div class="w-32 h-32 rounded-full bg-gradient-to-br from-brand-terracotta/20 to-brand-deep/10 flex items-center justify-center animate-pulse">
                        <svg class="w-16 h-16 text-brand-terracotta/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                        </svg>
                    </div>
                    <!-- Floating particles -->
                    <div class="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-brand-terracotta/30 animate-bounce" style="animation-delay: 0.1s"></div>
                    <div class="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-brand-deep/20 animate-bounce" style="animation-delay: 0.3s"></div>
                    <div class="absolute top-1/2 -right-4 w-2 h-2 rounded-full bg-brand-terracotta/40 animate-bounce" style="animation-delay: 0.5s"></div>
                </div>
                
                <!-- Message -->
                <h3 class="text-2xl font-bold text-gray-700 mb-3 font-bengali-display text-center">
                    এই ক্যাটেগরিতে কোনো পণ্য নেই
                </h3>
                <p class="text-gray-500 font-bengali text-center max-w-md mb-6 leading-relaxed">
                    আমরা শীঘ্রই নতুন পণ্য নিয়ে আসছি। অনুগ্রহ করে অপেক্ষা করুন! ✨
                </p>
                
                <!-- Coming Soon Badge -->
                <div class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-terracotta/10 to-brand-deep/10 rounded-full border border-brand-terracotta/20">
                    <span class="relative flex h-3 w-3">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-terracotta opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-3 w-3 bg-brand-terracotta"></span>
                    </span>
                    <span class="text-sm font-semibold text-brand-deep font-bengali">শীঘ্রই আসছে</span>
                </div>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map((product, index) => {
        return `
        <div class="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group border border-gray-100 flex flex-col h-full animate-fade-in-up opacity-0 relative" 
             style="animation-delay: ${index * 100}ms"
             onmouseenter="startCardSlideshow(${product.id}, this)"
             onmouseleave="stopCardSlideshow(${product.id}, this)">
            <div class="relative h-80 bg-gray-100 overflow-hidden">
                <!-- Main Image -->
                <img src="${product.image && product.image.startsWith('http') ? product.image : './assets/' + (product.image || 'logo.jpeg').replace(/^\.?\/?assets\//, '')}" alt="${product.name}"  
                     class="product-main-image w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out will-animate relative z-0"
                     loading="lazy"
                     decoding="async"
                     onerror="this.style.display='none'; this.parentElement.style.backgroundColor='#f3f4f6'">
                
                <!-- Overlay Gradient (z-20 to stay on top) -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none"></div>

                <!-- Badges (z-30) -->
                <div class="absolute top-4 left-4 flex flex-col gap-2 z-30 pointer-events-none">
                    ${product.is_featured ? '<span class="bg-white/90 backdrop-blur-sm text-brand-deep text-xs font-bold px-3 py-1.5 rounded-full shadow-sm font-bengali">🔥 জনপ্রিয়</span>' : ''}
                    ${product.images && product.images.length > 1 ? '<span class="bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> ' + product.images.length + '</span>' : ''}
                </div>
            </div>
            
            <div class="p-6 flex flex-col flex-grow">
                <div class="mb-4">
                    <span class="inline-block px-3 py-1 bg-brand-light/30 text-brand-terracotta text-xs font-bold rounded-lg mb-2 font-bengali">
                        ${product.category.name}
                    </span>
                    <h3 class="text-xl font-bold text-gray-900 leading-tight font-bengali-display group-hover:text-brand-terracotta transition-colors">
                        ${product.name}
                    </h3>
                </div>
                
                <p class="text-gray-500 text-sm font-bengali line-clamp-2 mb-6 flex-grow leading-relaxed">
                    ${product.description || ''}
                </p>
                
                <div class="flex items-center justify-between gap-4 mt-auto border-t border-gray-100 pt-5">
                    <div class="flex flex-col">
                        <span class="text-xs text-gray-400 font-medium">মূল্য</span>
                        <span class="text-2xl font-bold text-brand-deep">৳${product.price.toLocaleString('bn-BD')}</span>
                    </div>
                    <button onclick="openModal(${product.id})" class="flex-1 bg-brand-deep text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand-deep/20 hover:bg-brand-terracotta hover:shadow-[0_8px_30px_rgba(224,122,95,0.4)] hover:scale-[1.02] active:scale-95 transition-all duration-300 font-bengali flex items-center justify-center gap-2">
                        <span>অর্ডার করুন</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}


// --- Modal Logic ---

let currentQuantity = 1;
let selectedSize = 'M';
let currentProductId = null; // Added tracking
const availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];

// --- Card Slideshow Logic ---
window.startCardSlideshow = (productId, card) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product || !product.images || product.images.length <= 1) return;

    const img = card.querySelector('.product-main-image');
    if (!img) return;

    // If already running, don't restart
    if (card.dataset.slideshowInterval) return;

    let idx = 0;
    // Immediate swap on hover? No, wait 1s. Or maybe 800ms.
    // User said "move like loop".
    // Let's do 1200ms interval.

    // Store original src to reset later
    if (!card.dataset.originalSrc) {
        card.dataset.originalSrc = img.src;
    }

    const interval = setInterval(() => {
        idx = (idx + 1) % product.images.length;
        const nextImg = product.images[idx];
        const nextSrc = nextImg && nextImg.startsWith('http') ? nextImg : './assets/' + (nextImg || 'logo.jpeg').replace(/^\.?\/?assets\//, '');

        // Smooth transition? Just src swap for now.
        // To make it smooth, we'd need dual images cross-fading.
        // Given complexity, src swap is standard for simple slideshows.
        img.src = nextSrc;
    }, 1200);

    card.dataset.slideshowInterval = interval;
};

window.stopCardSlideshow = (productId, card) => {
    const interval = card.dataset.slideshowInterval;
    if (interval) {
        clearInterval(interval);
        delete card.dataset.slideshowInterval;
    }

    const img = card.querySelector('.product-main-image');
    if (img && card.dataset.originalSrc) {
        img.src = card.dataset.originalSrc;
    }
};

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
    const mainImgSrc = images[0] && images[0].startsWith('http') ? images[0] : `./assets/${(images[0] || 'logo.jpeg').replace(/^\.?\/?assets\//, '')}`;
    document.getElementById('modal-image').src = mainImgSrc;
    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-price').textContent = `৳${product.price}`;
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
            const imgSrc = img && img.startsWith('http') ? img : `./assets/${(img || 'logo.jpeg').replace(/^\.?\/?assets\//, '')}`;
            return `
                <img src="${imgSrc}" alt="Thumbnail ${index + 1}" 
                    onclick="changeMainImage('${imgSrc.replace(/'/g, "\\'")}', this)"
                    class="w-14 h-14 object-cover rounded-lg border-2 cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-lg ${index === 0 ? 'border-brand-terracotta shadow-md scale-105' : 'border-gray-200 opacity-70 hover:opacity-100'}"
                    onerror="this.style.display='none'">
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

    // Render sizes
    const sizeContainer = document.getElementById('size-selector');
    sizeContainer.innerHTML = availableSizes.map(size => `
        <button onclick="selectSize('${size}')" 
            class="size-btn w-10 h-10 rounded-full border border-brand-deep flex items-center justify-center font-bold text-sm transition ${size === 'M' ? 'bg-brand-deep text-white' : 'text-brand-deep hover:bg-gray-100'}">
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

    // Show modal
    document.getElementById('product-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeModal = () => {
    document.getElementById('product-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
};

// Change Main Image in Modal with Fade & Active State
window.changeMainImage = (src, thumbnail) => {
    const mainImg = document.getElementById('modal-image');

    // Smooth Fade Out
    mainImg.style.opacity = '0';
    mainImg.style.transform = 'scale(0.98)';

    setTimeout(() => {
        mainImg.src = src;
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
        if (btn.innerText === size) {
            btn.classList.add('bg-brand-deep', 'text-white');
            btn.classList.remove('text-brand-deep', 'hover:bg-gray-100');
        } else {
            btn.classList.remove('bg-brand-deep', 'text-white');
            btn.classList.add('text-brand-deep', 'hover:bg-gray-100');
        }
    });
};


// --- Cart Logic ---

let cart = JSON.parse(localStorage.getItem('nongor_cart')) || [];

window.initCart = () => {
    updateCartUI();
};

window.addToCart = () => {
    if (!currentProductId) return;

    const product = allProducts.find(p => p.id === currentProductId);
    if (!product) return;

    const newItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: selectedSize,
        quantity: currentQuantity,
        timestamp: Date.now()
    };

    // Optional: Check if same item (id + size) exists and merge?
    // For now, let's just push (simple)
    cart.push(newItem);
    saveCart();
    updateCartUI();

    // Feedback
    showToast("Added to Cart! 🛒");
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
                    <img src="${item.image && item.image.startsWith('http') ? item.image : './assets/' + (item.image || 'logo.jpeg').replace(/^\.?\/?assets\//, '')}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.src='./assets/logo.jpeg'">
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
    drawer.classList.remove('hidden');
    // Small delay to allow display:block to apply before transform
    setTimeout(() => {
        panel.classList.remove('translate-x-full');
    }, 10);
    document.body.style.overflow = 'hidden';
};

window.closeCart = () => {
    const drawer = document.getElementById('cart-drawer');
    const panel = document.getElementById('cart-panel');
    panel.classList.add('translate-x-full');
    setTimeout(() => {
        drawer.classList.add('hidden');
        document.body.style.overflow = '';
    }, 300);
};


// --- Checkout Logic ---

window.showCheckout = (fromCart = false) => {
    if (fromCart) {
        if (cart.length === 0) {
            showToast("Cart is empty!");
            return;
        }
        window.location.href = `checkout.html`; // No params = Cart Mode
    } else {
        // Buy Now Mode (Single Item)
        const id = currentProductId;
        if (!id) {
            alert("Something went wrong. Please reload.");
            return;
        }
        const params = new URLSearchParams({
            id: id,
            qty: currentQuantity,
            size: selectedSize
        });
        window.location.href = `checkout.html?${params.toString()}`;
    }
};

window.initCheckout = () => {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id')); // If ID exists, it's "Buy Now" mode

    let checkoutItems = [];

    if (id) {
        // --- Buy Now Mode ---
        const qty = parseInt(params.get('qty')) || 1;
        const size = params.get('size') || 'M';
        const product = allProducts.find(p => p.id === id);

        if (product) {
            checkoutItems.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                size: size,
                quantity: qty
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
                        <p class="text-xs text-gray-500 mt-1">Size: <span class="font-bold text-brand-deep">${item.size}</span></p>
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
    document.getElementById('checkout-subtotal').textContent = `৳${total.toLocaleString()}`;
    // Initial total will be updated by updateTotalWithShipping() below

    // Store globally for submission
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
                    </div>
                    
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

    if (deliveryEl) deliveryEl.textContent = `৳${window.shippingFee}`;

    const finalTotal = (window.checkoutTotal || 0) + (window.shippingFee || 0);
    if (totalEl) totalEl.textContent = `৳${finalTotal.toLocaleString()}`;

    // Re-render bKash instructions to show new total
    const manualInfo = document.getElementById('manual-payment-info');
    if (manualInfo) {
        const inputs = document.querySelectorAll('input[name="payment_method"]');
        inputs.forEach(i => {
            if (i.checked && i.value === 'Bkash') i.dispatchEvent(new Event('change'));
        });
    }
}

// --- Confirm Order from Page ---
window.confirmOrderFromPage = async () => {
    const confirmBtn = document.getElementById('btn-confirm-order');
    const originalText = confirmBtn.innerHTML;

    // 1. Collect Data
    const name = document.getElementById('cust-name').value.trim();
    let phone = document.getElementById('cust-phone').value.trim(); // cleaned up below
    const address = document.getElementById('cust-address').value.trim();

    if (!name || !phone || !address) {
        alert("Please fill all fields");
        return;
    }

    if (!window.checkoutPayload || window.checkoutPayload.length === 0) {
        alert("Cart is empty");
        return;
    }

    // Phone Validation
    phone = phone.replace(/\D/g, '');
    if (phone.length === 11 && phone.startsWith('0')) phone = phone.substring(1);
    if (phone.length !== 10) { alert("Invalid Phone Number"); return; }
    const fullPhone = '+880' + phone;

    // Payment Logic
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
    let senderNumber = '', trxId = '';

    if (paymentMethod === 'Bkash') {
        senderNumber = document.getElementById('manual-sender')?.value.trim();
        trxId = document.getElementById('manual-trx')?.value.trim();
        if (!senderNumber || !trxId) {
            alert("Please enter bKash details");
            return;
        }
    }

    // Prepare Payload
    const itemsDescription = window.checkoutPayload.map(i => `${i.name} (${i.size}) x${i.quantity}`).join(', ');
    const finalTotal = window.checkoutTotal + window.shippingFee; // Include Shipping

    const orderData = {
        orderId: '#NG-' + Math.floor(10000 + Math.random() * 90000),
        customerName: name,
        customerPhone: fullPhone,
        address: address,
        productName: itemsDescription,
        price: '0',
        size: 'Mixed',
        quantity: window.checkoutPayload.reduce((s, i) => s + i.quantity, 0),
        totalPrice: finalTotal, // Send total with shipping
        deliveryDate: new Date(Date.now() + 259200000).toLocaleDateString('en-GB'),
        paymentMethod: paymentMethod,
        senderNumber: senderNumber,
        trxId: trxId,
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
            document.getElementById('success-order-id').textContent = orderData.orderId;
            document.getElementById('order-success').classList.replace('hidden', 'flex');
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

    // 2. Handle 11 digits (remove leading 0)
    if (cleanVal.length === 11 && cleanVal.startsWith('0')) {
        cleanVal = cleanVal.substring(1);
    }

    const validIcon = document.getElementById('phone-valid-icon');
    const invalidIcon = document.getElementById('phone-invalid-icon');
    const feedback = document.getElementById('phone-feedback');

    // Safety check if elements missing
    if (!feedback) return;

    if (cleanVal.length === 10) {
        // Valid
        if (validIcon) validIcon.classList.remove('hidden');
        if (invalidIcon) invalidIcon.classList.add('hidden');
        feedback.textContent = "নম্বর সঠিক আছে (Valid Number)";
        feedback.className = "text-xs font-bengali ml-1 mb-3 h-4 text-green-600 font-bold";
    } else {
        // Invalid or incomplete
        if (cleanVal.length > 0) {
            if (validIcon) validIcon.classList.add('hidden');
            if (invalidIcon) invalidIcon.classList.remove('hidden');
            feedback.textContent = "১১ সংখ্যার নম্বর প্রয়োজন (Must be 11 digits)";
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
        alert("অনুগ্রহ করে সব তথ্য দিন (Please fill all details)");
        return;
    }

    // Phone validation
    phoneInput = phoneInput.replace(/\D/g, '');
    if (phoneInput.length === 11 && phoneInput.startsWith('0')) {
        phoneInput = phoneInput.substring(1);
    }
    if (phoneInput.length !== 10) {
        alert("মোবাইল নম্বরটি সঠিক নয়\nExample: 01712345678");
        return;
    }

    const phone = '+880' + phoneInput;
    const orderId = '#NG-' + Math.floor(1000 + Math.random() * 9000);

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

    const orderData = {
        orderId: orderId,
        customerName: name,
        customerPhone: phone,
        address: address,
        productName: document.getElementById('modal-title').textContent,
        price: parseFloat(document.getElementById('modal-price').textContent.replace(/[^\d.]/g, '')),
        size: selectedSize,
        quantity: currentQuantity,
        totalPrice: parseFloat(document.getElementById('modal-price').textContent.replace(/[^\d.]/g, '')) * currentQuantity,
        deliveryDate: deliveryDate,
        paymentMethod: paymentMethod,
        senderNumber: senderNumber, // Added
        trxId: trxId,               // Added
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
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (result.result === "success") {
            console.log("✅ Order saved!");

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

                if (orderIdEl) orderIdEl.textContent = orderId;
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
        alert("Server Error: " + e.message); // Show the real error!
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
        alert('অর্ডারের আইডি দিন (Enter Order ID)');
        return;
    }

    const trackBtn = document.querySelector('#btn-track-submit');

    try {
        // Show loading state
        const originalText = trackBtn.innerHTML;
        trackBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>খোঁজা হচ্ছে...</span>
        `;
        trackBtn.disabled = true;

        // Fetch from Netlify Function (GET request)
        const response = await fetch(`${API_URL}?orderId=${encodeURIComponent(idInput)}`);
        const result = await response.json();

        if (result.result === "success") {
            const order = result.data;
            document.getElementById('track-result').classList.remove('hidden');
            document.getElementById('track-id-display').textContent = order.order_id; // DB column: order_id

            // Populate Payment Details
            document.getElementById('track-amount').textContent = `৳${parseFloat(order.total_price || 0).toLocaleString('bn-BD')}`;
            const paymentStatusEl = document.getElementById('track-payment-status');
            if (order.status === 'Paid') {
                paymentStatusEl.innerHTML = `<span class="text-green-600 bg-green-100 px-2 py-1 rounded text-xs">Paid ✅</span>`;
            } else {
                paymentStatusEl.innerHTML = `<span class="text-red-600 bg-red-100 px-2 py-1 rounded text-xs">Due ⚠️</span>`;
            }

            const statusContainer = document.getElementById('track-status-container');
            const deliveryStatus = order.delivery_status || order.status || 'Pending';
            const paymentStatus = order.payment_status || 'Unpaid';

            const statusColor = getStatusColor(deliveryStatus);

            statusContainer.innerHTML = `
                <div class="flex flex-col gap-1">
                    <span class="text-2xl font-bold ${statusColor} block">${deliveryStatus}</span>
                    <span class="text-gray-400 text-xs text-left block mt-1"><span class="font-bold">Items:</span> ${order.product_name}</span>
                </div>
            `;

            // Separate Payment Status Box Update
            const paymentBox = document.getElementById('track-payment-status');
            const paymentColor = getPaymentColor(paymentStatus);
            paymentBox.innerHTML = `<span class="${paymentColor}">${paymentStatus}</span>`;

            // DB column: delivery_date
            document.getElementById('track-delivery-date').textContent = order.delivery_date || 'Processing...';

        } else {
            alert("Order not found! (অর্ডারটি পাওয়া যায়নি)");
            document.getElementById('track-result').classList.add('hidden');
        }

    } catch (e) {
        console.error("Tracking Error:", e);
        alert("Tracking Failed: " + e.message);
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

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.remove('opacity-0');
    setTimeout(() => {
        toast.classList.add('opacity-0');
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


