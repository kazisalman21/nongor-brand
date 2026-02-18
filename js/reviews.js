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

function renderReviewsSummary(avgRating, totalReviews) {
    const avgEl = document.getElementById('avg-rating-display');
    const starsEl = document.getElementById('avg-stars');
    const totalEl = document.getElementById('total-reviews-text');

    if (avgEl) avgEl.textContent = avgRating;
    if (totalEl) {
        totalEl.textContent = totalReviews > 0
            ? `${totalReviews} review${totalReviews > 1 ? 's' : ''}`
            : 'No reviews yet — be the first!';
    }
    if (starsEl) {
        starsEl.innerHTML = renderStars(parseFloat(avgRating));
    }
}

function renderStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            html += '<span class="text-yellow-400 text-xl">★</span>';
        } else if (i - 0.5 <= rating) {
            html += '<span class="text-yellow-400 text-xl">★</span>';
        } else {
            html += '<span class="text-gray-300 text-xl">★</span>';
        }
    }
    return html;
}

function renderReviewsList(reviews) {
    const container = document.getElementById('reviews-list');
    if (!container) return;

    if (!reviews || reviews.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-5xl mb-4">📝</div>
                <h4 class="text-lg font-bold text-gray-400 mb-2">No reviews yet</h4>
                <p class="text-gray-500 text-sm">Be the first to share your experience!</p>
            </div>`;
        return;
    }

    container.innerHTML = reviews.map(review => {
        const date = new Date(review.created_at).toLocaleDateString('bn-BD', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        const initials = review.reviewer_name.charAt(0).toUpperCase();

        return `
        <div class="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-deep to-brand-terracotta text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    ${initials}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                        <h5 class="font-semibold text-brand-deep text-sm">${escapeHtml(review.reviewer_name)}</h5>
                        <span class="text-xs text-gray-400">${date}</span>
                    </div>
                    <div class="flex gap-0.5 mb-2">${renderStars(review.rating)}</div>
                    ${review.comment ? `<p class="text-gray-600 text-sm leading-relaxed">${escapeHtml(review.comment)}</p>` : ''}
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
