// ==============================================
// MODAL — Product modal, lightbox, size selection
// ==============================================

window.openModal = function (productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    currentProductId = productId;

    const images = product.images && product.images.length > 0
        ? product.images
        : [product.image].filter(Boolean);

    const mainImgData = images[0];
    const mainImgSrc = getOptimizedImage(mainImgData, 'main');
    const mainImgOriginal = mainImgData && mainImgData.startsWith('http') ? mainImgData : `./assets/${(mainImgData || 'logo.jpeg').replace(/^\.?\/?assets\//, '')}`;

    const modalImgEl = document.getElementById('modal-image');
    modalImgEl.src = mainImgSrc;
    modalImgEl.onerror = function () { handleImageError(this, mainImgOriginal); };

    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-price').textContent = `৳${product.price} `;
    document.getElementById('modal-category').textContent = product.category.name;
    document.getElementById('modal-description').textContent = product.description;

    const imgElement = document.getElementById('modal-image');
    imgElement.style.display = 'block';
    if (imgElement.parentElement) imgElement.parentElement.style.backgroundColor = 'transparent';

    // Render gallery thumbnails
    const galleryContainer = document.getElementById('modal-gallery');
    if (galleryContainer && images.length > 1) {
        galleryContainer.innerHTML = images.map((img, index) => {
            const thumbSrc = getOptimizedImage(img, 'thumb');
            const originalSrc = img && img.startsWith('http') ? img : `./assets/${(img || 'logo.jpeg').replace(/^\.?\/?assets\//, '')}`;
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

    // Render sizes
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

    document.getElementById('modal-actions').classList.remove('hidden');

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

    document.getElementById('product-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeModal = function () {
    document.getElementById('product-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
};

// Change Main Image in Modal with Fade & Active State
window.changeMainImage = function (src, thumbnail, originalSrc) {
    const mainImg = document.getElementById('modal-image');

    mainImg.style.opacity = '0';
    mainImg.style.transform = 'scale(0.98)';

    setTimeout(() => {
        mainImg.src = src;
        mainImg.onerror = function () {
            if (originalSrc) this.src = originalSrc;
        };
        mainImg.style.opacity = '1';
        mainImg.style.transform = 'scale(1)';
    }, 200);

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
function handleLightboxEscape(e) {
    if (e.key === 'Escape') {
        closeLightbox();
    }
}

window.openLightbox = function () {
    const modalImage = document.getElementById('modal-image');
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');

    if (!modalImage || !lightbox || !lightboxImage) return;

    lightboxImage.src = modalImage.src;
    lightboxImage.alt = modalImage.alt;

    lightbox.classList.remove('hidden');

    lightboxImage.style.animation = 'none';
    lightboxImage.offsetHeight;
    lightboxImage.style.animation = 'lightbox-zoom-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards';

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleLightboxEscape);
};

window.closeLightbox = function () {
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');

    if (!lightbox) return;

    lightboxImage.style.animation = 'lightbox-zoom-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';

    setTimeout(() => {
        lightbox.classList.add('hidden');
        const modal = document.getElementById('product-modal');
        if (modal && modal.classList.contains('hidden')) {
            document.body.style.overflow = 'auto';
        }
    }, 300);

    document.removeEventListener('keydown', handleLightboxEscape);
};

// --- Size Selection ---
window.selectSize = function (size) {
    selectedSize = size;
    window.selectedSize = size;
    document.querySelectorAll('.size-btn').forEach(btn => {
        const btnSize = btn.innerText.trim();
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
