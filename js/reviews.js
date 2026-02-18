/**
 * Reviews & Wishlist Module
 * - Fetches and displays product reviews
 * - Handles review submission
 * - Manages wishlist via localStorage
 */

// === REVIEWS ===
let selectedRating = 0;
let currentProductId = null;

window.setReviewRating = function (rating) {
    selectedRating = rating;
    document.querySelectorAll('.star-select').forEach(btn => {
        const r = parseInt(btn.dataset.rating);
        btn.style.color = r <= rating ? '#FBBF24' : '#D1D5DB';
    });
};

window.loadReviews = async function (productId) {
    if (!productId) return;
    currentProductId = productId;

    try {
        const res = await fetch(`${API_URL}?action=getReviews&productId=${productId}`);
        const data = await res.json();
        console.log('📝 Reviews Data:', data);

        if (data.result === 'success') {
            renderReviewsSummary(data.avgRating, data.totalReviews);
            renderReviewsList(data.reviews);
        }
    } catch (err) {
        console.error('Failed to load reviews:', err);
    }
};

function renderReviewsSummary(avgRating, totalReviews, distribution = {}) {
    // 1. Update Big Score
    const avgEl = document.getElementById('avg-rating-display');
    const starsEl = document.getElementById('avg-stars');
    const totalEl = document.getElementById('total-reviews-text');

    if (avgEl) avgEl.textContent = avgRating;
    if (totalEl) {
        totalEl.textContent = totalReviews > 0
            ? `${totalReviews} Review${totalReviews !== 1 ? 's' : ''}`
            : 'No reviews yet';
    }
    if (starsEl) {
        starsEl.innerHTML = renderStars(parseFloat(avgRating));
    }

    // 2. Render Distribution Bars (New Desktop/Mobile Widget)
    // We need to inject this HTML likely below the main score if it doesn't exist
    // For now, let's assume we replace the content of a container or append it.
    // Actually, let's find the container `reviews-summary-container` or create it.

    // Existing structure in product.html might be simple.
    // Let's look for a place to put the bars. 
    // If not present, we can append them to the summary box.
    const summaryBox = document.querySelector('.bg-white.rounded-2xl.shadow-sm.p-6.mb-8');
    if (summaryBox) {
        // Check if bars already exist
        let barsContainer = document.getElementById('review-bars-container');
        if (!barsContainer) {
            barsContainer = document.createElement('div');
            barsContainer.id = 'review-bars-container';
            barsContainer.className = 'mt-6 pt-6 border-t border-gray-100 flex flex-col gap-2';
            summaryBox.appendChild(barsContainer);
        }

        // Calculate percentages
        const total = totalReviews || 1; // avoid divide by zero
        const getPct = (count) => ((count / total) * 100).toFixed(1) + '%';

        barsContainer.innerHTML = [5, 4, 3, 2, 1].map(star => {
            const count = distribution[star] || 0;
            const pct = getPct(count);
            return `
                <div class="flex items-center gap-3 text-sm">
                    <div class="flex items-center gap-1 w-12 flex-shrink-0 font-medium text-gray-600">
                        <span>${star}</span><span class="text-yellow-400">★</span>
                    </div>
                    <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-brand-accent rounded-full" style="width: ${pct}"></div>
                    </div>
                    <div class="w-8 text-right text-gray-400 text-xs">${count}</div>
                </div>
            `;
        }).join('');
    }
}

function renderStars(rating, size = 'text-xl') {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        const fill = i <= Math.floor(rating) ? 'text-yellow-400' : 'text-gray-200';
        html += `<span class="${fill} ${size}">★</span>`;
    }
    return html;
}

function renderReviewsList(reviews) {
    const container = document.getElementById('reviews-list');
    if (!container) return;

    if (!reviews || reviews.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <div class="text-6xl mb-4 opacity-50">📝</div>
                <h4 class="text-xl font-bold text-gray-800 mb-2">No reviews yet</h4>
                <p class="text-gray-500">Be the first to share your experience with this product!</p>
            </div>`;
        return;
    }

    container.innerHTML = reviews.map(review => {
        const date = new Date(review.created_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        const initials = review.reviewer_name.charAt(0).toUpperCase();

        // Random gradient for avatar based on name length
        const gradients = [
            'from-pink-500 to-rose-500',
            'from-purple-500 to-indigo-500',
            'from-blue-400 to-cyan-500',
            'from-emerald-400 to-teal-500',
            'from-orange-400 to-amber-500'
        ];
        const gradient = gradients[review.reviewer_name.length % gradients.length];

        return `
        <div class="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            <!-- Header -->
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-4">
                    <div class="relative">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-bold text-lg shadow-inner">
                            ${initials}
                        </div>
                        <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <div class="w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h5 class="font-bold text-gray-900">${escapeHtml(review.reviewer_name)}</h5>
                            <span class="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wide rounded-full border border-green-100">
                                Verified Purchase
                            </span>
                        </div>
                        <div class="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span>${date}</span>
                            <span>•</span>
                            <span>${review.rating}.0 Rating</span>
                        </div>
                    </div>
                </div>
                <!-- Menu / Report (Visual) -->
                <button class="text-gray-300 hover:text-gray-600 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </button>
            </div>

            <!-- Content -->
            <div class="pl-16">
                <div class="flex gap-1 mb-3 text-yellow-400 text-sm">
                    ${renderStars(review.rating, 'text-sm')} 
                </div>
                ${review.comment ? `<p class="text-gray-600 leading-relaxed mb-4">${escapeHtml(review.comment)}</p>` : ''}
                
                <!-- Footer / Helpful -->
                <div class="flex items-center gap-6 pt-4 border-t border-gray-50">
                    <button class="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-accent transition-colors group/btn">
                        <svg class="w-4 h-4 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path></svg>
                        Helpful
                    </button>
                    <button class="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                        Share
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

window.submitReview = async function () {
    if (!currentProductId) return;
    if (selectedRating === 0) {
        window.showToast('Please select a rating', 'error');
        return;
    }

    const name = document.getElementById('review-name')?.value?.trim();
    const comment = document.getElementById('review-comment')?.value?.trim();

    if (!name) {
        window.showToast('Please enter your name', 'error');
        return;
    }

    const btn = document.getElementById('btn-submit-review');
    const originalText = btn.textContent;
    btn.textContent = 'Submitting...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'submitReview',
                productId: currentProductId,
                name: name,
                rating: selectedRating,
                comment: comment
            })
        });

        const data = await res.json();

        if (data.result === 'success') {
            window.showToast(data.message || 'Review submitted for moderation! 🕒', 'success');
            // Reset form
            document.getElementById('review-name').value = '';
            document.getElementById('review-comment').value = '';
            selectedRating = 0;
            document.querySelectorAll('.star-select').forEach(btn => btn.style.color = '#D1D5DB');

            // Do NOT reload reviews immediately because the new one is pending
            // await loadReviews(currentProductId); 

            // Optional: Show a more persistent message in the UI?
            const container = document.getElementById('reviews-list');
            if (container) {
                const pendingMsg = document.createElement('div');
                pendingMsg.className = 'bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center text-yellow-700 text-sm mb-4 animate-fade-in';
                pendingMsg.innerHTML = '✨ Thanks! Your review has been submitted and is pending approval.';
                container.prepend(pendingMsg);
            }
        } else {
            window.showToast(data.message || 'Failed to submit review', 'error');
        }
    } catch (err) {
        window.showToast('Network error. Please try again.', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
};

// === WISHLIST ===
const WISHLIST_KEY = 'nongor_wishlist';

function getWishlist() {
    try {
        return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
    } catch { return []; }
}

function saveWishlist(list) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
}

window.isInWishlist = function (productId) {
    return getWishlist().includes(String(productId));
};

window.toggleWishlist = function () {
    if (!currentProductId) return;
    const id = String(currentProductId);
    let list = getWishlist();

    if (list.includes(id)) {
        list = list.filter(x => x !== id);
        updateWishlistUI(false);
        window.showToast('Removed from wishlist', 'info');
    } else {
        list.push(id);
        updateWishlistUI(true);
        window.showToast('Added to wishlist! ❤️', 'success');
    }
    saveWishlist(list);
};

window.toggleWishlistCard = function (e, productId) {
    e.stopPropagation();
    e.preventDefault();
    const id = String(productId);
    let list = getWishlist();

    const heartEl = e.currentTarget.querySelector('svg') || e.currentTarget;

    if (list.includes(id)) {
        list = list.filter(x => x !== id);
        heartEl.style.fill = 'none';
        heartEl.style.color = '#9CA3AF';
    } else {
        list.push(id);
        heartEl.style.fill = '#EF4444';
        heartEl.style.color = '#EF4444';
        heartEl.style.transform = 'scale(1.3)';
        setTimeout(() => heartEl.style.transform = 'scale(1)', 200);
    }
    saveWishlist(list);
};

function updateWishlistUI(isWishlisted) {
    const icon = document.getElementById('wishlist-icon');
    const text = document.getElementById('wishlist-text');
    const btn = document.getElementById('wishlist-btn');

    if (icon) {
        icon.style.fill = isWishlisted ? '#EF4444' : 'none';
        icon.style.color = isWishlisted ? '#EF4444' : '#9CA3AF';
        if (isWishlisted) {
            icon.style.transform = 'scale(1.3)';
            setTimeout(() => icon.style.transform = 'scale(1)', 200);
        }
    }
    if (text) text.textContent = isWishlisted ? 'Wishlisted' : 'Wishlist';
    if (btn) btn.classList.toggle('text-red-500', isWishlisted);
}

window.initWishlist = function (productId) {
    if (!productId) return;
    currentProductId = productId;
    updateWishlistUI(isInWishlist(productId));
};
