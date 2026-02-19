// ==============================================
// CART — Cart CRUD, drawer, quantity
// ==============================================

// Helper to get fresh cart state
function getCart() {
    try {
        return JSON.parse(localStorage.getItem('nongor_cart')) || [];
    } catch (e) {
        return [];
    }
}

window.initCart = function () {
    updateCartUI();
};

window.addToCart = function () {
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
            showToast("ম মাপ সঠিক দিন", 'error');
            return;
        }

        const note = document.getElementById('custom-note').value.trim();

        cartItem.size = 'Custom';
        cartItem.sizeType = 'custom';
        cartItem.measurements = measurements;
        cartItem.unit = currentMeasurementUnit;
        cartItem.notes = note;
        cartItem.sizeLabel = `Custom (${Object.keys(measurements).length || ''})`;

    } else {
        if (!selectedSize) {
            showToast("সাইজ নির্বাচন করুন", 'error');
            return;
        }
        cartItem.size = selectedSize;
        cartItem.sizeType = 'standard';
    }

    const cart = getCart();
    cart.push(cartItem);
    localStorage.setItem('nongor_cart', JSON.stringify(cart));

    updateCartUI();
    showToast("কার্টে যোগ করা হয়েছে");
    closeModal();
    openCart();
};

window.removeFromCart = function (index) {
    const cart = getCart();
    cart.splice(index, 1);
    localStorage.setItem('nongor_cart', JSON.stringify(cart));
    updateCartUI();
};

window.updateCartUI = function () {
    const cart = getCart(); // Always read fresh from storage
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    const drawerBadge = document.getElementById('drawer-count');

    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
    if (drawerBadge) drawerBadge.textContent = count;

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
                    <img src="${escapeHtml(getOptimizedImage(item.image, 'thumb'))}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="handleImageError(this)">
                </div>
                
                <div class="flex-grow min-w-0">
                    <div class="flex justify-between items-start mb-1">
                        <h4 class="font-bold text-base text-brand-deep font-serif line-clamp-1 pr-6">${escapeHtml(item.name)}</h4>
                    </div>
                    
                    <p class="text-xs text-brand-terracotta uppercase tracking-wider font-bold mb-2">Size: ${escapeHtml(item.size)}</p>
                    
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1">
                            <span class="text-xs text-gray-500 font-bold">Qty:</span>
                            <span class="text-xs font-bold text-brand-deep">${item.quantity}</span>
                        </div>
                        <p class="font-bold text-brand-deep font-mono">৳${(parseFloat(item.price) * item.quantity).toLocaleString()}</p>
                    </div>
                </div>

                <button onclick="removeFromCart(${index})" class="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100" title="Remove">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `).join('');
    }

    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const subtotalEl = document.getElementById('cart-subtotal');
    if (subtotalEl) subtotalEl.textContent = `৳${subtotal.toLocaleString()}`;
};

function saveCart(cartData) {
    localStorage.setItem('nongor_cart', JSON.stringify(cartData || getCart()));
}
window.saveCart = saveCart;

// Drawer Logic
window.openCart = function () {
    const drawer = document.getElementById('cart-drawer');
    const panel = document.getElementById('cart-panel');
    if (drawer && panel) {
        drawer.classList.remove('hidden');
        setTimeout(() => {
            panel.classList.remove('translate-x-full');
        }, 10);
        document.body.style.overflow = 'hidden';
        initCart();
    }
};

window.closeCart = function () {
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

window.updateQuantity = function (change) {
    const newQuantity = currentQuantity + change;
    if (newQuantity >= 1 && newQuantity <= 10) {
        currentQuantity = newQuantity;
        const disp = document.getElementById('quantity-display');
        if (disp) disp.textContent = currentQuantity;
    }
};

// --- Show Checkout (Buy Now / Cart Checkout) ---
window.showCheckout = function (fromCart = false) {
    if (fromCart) {
        const cart = getCart();
        if (cart.length === 0) {
            showToast("কার্ট খালি!");
            return;
        }
        localStorage.removeItem('nongor_direct_buy');
        window.location.href = `checkout.html`;
    } else {
        const id = currentProductId;
        const product = allProducts.find(p => p.id == id);

        if (!product) {
            showToast("Product data not found. Please reload.", 'error');
            return;
        }

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
