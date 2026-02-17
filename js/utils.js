// ==============================================
// UTILS — Helper functions
// ==============================================

// --- Security: HTML Escape Helper (prevents XSS in innerHTML) ---
window.escapeHtml = function (unsafe) {
    if (typeof unsafe !== 'string') return String(unsafe || '');
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// --- Toast Notification ---
window.showToast = function (message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;

    if (toastIcon) {
        if (type === 'error') {
            toastIcon.className = 'w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
        } else if (type === 'processing') {
            toastIcon.className = 'w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
        } else {
            toastIcon.className = 'w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]';
        }
    }

    toast.classList.remove('hidden');
    void toast.offsetWidth;
    toast.classList.remove('opacity-0', 'translate-y-20');

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-20');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3000);
};

// --- Smart Image Optimization ---
window.getOptimizedImage = function (url, type = 'main') {
    if (!url || typeof url !== 'string') return './assets/logo.jpeg';

    if (url.includes('cloudinary.com')) {
        if (url.includes('f_auto,q_auto') && type !== 'thumb' && type !== 'card') return url;

        let params = 'f_auto,q_auto';
        if (type === 'thumb') params += ',w_300';
        if (type === 'card') params += ',w_600';

        if (url.includes('/upload/')) {
            const parts = url.split('/upload/');
            return `${parts[0]}/upload/${params}/${parts[1]}`;
        }
        return url;
    }

    if (!url.startsWith('http') || url.startsWith('./assets/')) {
        let path = url;
        if (!path.startsWith('./assets/')) {
            path = './assets/' + path.replace(/^\.?\/?assets\//, '');
        }
        return path;
    }

    return url;
};

// --- Safe Image Handler (Prevents Infinite Loop) ---
window.handleImageError = function (img, fallbackSrc = './assets/logo.jpeg') {
    if (!img.dataset.fallbackAttempted) {
        img.dataset.fallbackAttempted = 'true';
        img.src = fallbackSrc;
    } else {
        img.onerror = null;
        console.warn('Image fallback failed:', img.src);
    }
};

// --- Validation Helpers ---
window.isValidBangladeshiPhone = function (phone) {
    const cleaned = phone.replace(/\D/g, '');
    const regex = /^01[3-9]\d{8}$/;
    return regex.test(cleaned);
};

window.validatePhoneRealtime = function (input) {
    const phone = input.value.replace(/\D/g, '');
    const feedback = document.getElementById('phone-feedback');
    const submitBtn = document.getElementById('btn-complete-order');

    const phoneRegex = /^01[3-9]\d{8}$/;

    if (phone.length === 0) {
        if (feedback) feedback.textContent = '';
        input.classList.remove('border-red-500', 'border-green-500', 'bg-red-50', 'bg-green-50');
        return;
    }

    if (phoneRegex.test(phone)) {
        if (feedback) {
            feedback.textContent = '✓ Valid Number';
            feedback.classList.remove('text-red-500');
            feedback.classList.add('text-green-600');
        }
        input.classList.remove('border-red-500', 'bg-red-50');
        input.classList.add('border-green-500', 'bg-green-50');
    } else {
        if (feedback) {
            feedback.textContent = 'Invalid Phone Number (017... 11 digits)';
            feedback.classList.remove('text-green-600');
            feedback.classList.add('text-red-500');
        }
        input.classList.remove('border-green-500', 'bg-green-50');
        input.classList.add('border-red-500', 'bg-red-50');
    }
};

// --- Status Color Helpers ---
window.getPaymentColor = function (status) {
    status = status.toLowerCase();
    if (status === 'paid') return 'text-green-600 bg-green-50 px-2 py-0.5 rounded';
    if (status === 'due') return 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded';
    if (status === 'unpaid') return 'text-red-500';
    if (status === 'refunded') return 'text-purple-600';
    return 'text-gray-600';
};

window.getStatusColor = function (status) {
    status = status.toLowerCase();
    if (status.includes('pending')) return 'text-orange-600';
    if (status.includes('processing')) return 'text-blue-600';
    if (status.includes('shipped')) return 'text-purple-600';
    if (status.includes('delivered')) return 'text-green-600';
    if (status.includes('cancel')) return 'text-red-600';
    return 'text-gray-600';
};
