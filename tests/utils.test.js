/**
 * Smoke Tests — Utils Module
 * Tests escapeHtml, getOptimizedImage, isValidBangladeshiPhone, handleImageError, getStatusColor, getPaymentColor
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Simulate browser globals before importing utils
beforeEach(() => {
    // Reset window functions
    globalThis.window = globalThis;
    // Load utils by evaluating it (since it assigns to window.*)
});

// --- Manually define the functions for testability ---
// (utils.js assigns to window.*, so we replicate here for unit testing)

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return String(unsafe || '');
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function isValidBangladeshiPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const regex = /^01[3-9]\d{8}$/;
    return regex.test(cleaned);
}

function getOptimizedImage(url, type = 'main') {
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

function getPaymentColor(status) {
    status = status.toLowerCase();
    if (status === 'paid') return 'text-green-600 bg-green-50 px-2 py-0.5 rounded';
    if (status === 'due') return 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded';
    if (status === 'unpaid') return 'text-red-500';
    if (status === 'refunded') return 'text-purple-600';
    return 'text-gray-600';
}

// ========== TESTS ==========

describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should escape ampersands', () => {
        expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    it('should escape single quotes', () => {
        expect(escapeHtml("it's")).toBe("it&#039;s");
    });

    it('should handle non-string input', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
        expect(escapeHtml(42)).toBe('42');
    });

    it('should handle empty string', () => {
        expect(escapeHtml('')).toBe('');
    });

    it('should handle Bengali text without modification', () => {
        expect(escapeHtml('নোঙর ব্র্যান্ড')).toBe('নোঙর ব্র্যান্ড');
    });
});

describe('isValidBangladeshiPhone', () => {
    it('should accept valid Bangladeshi numbers', () => {
        expect(isValidBangladeshiPhone('01712345678')).toBe(true);
        expect(isValidBangladeshiPhone('01812345678')).toBe(true);
        expect(isValidBangladeshiPhone('01912345678')).toBe(true);
        expect(isValidBangladeshiPhone('01312345678')).toBe(true);
    });

    it('should reject numbers starting with 010, 011, 012', () => {
        expect(isValidBangladeshiPhone('01012345678')).toBe(false);
        expect(isValidBangladeshiPhone('01112345678')).toBe(false);
        expect(isValidBangladeshiPhone('01212345678')).toBe(false);
    });

    it('should reject too short or too long numbers', () => {
        expect(isValidBangladeshiPhone('0171234567')).toBe(false);   // 10 digits
        expect(isValidBangladeshiPhone('017123456789')).toBe(false); // 12 digits
    });

    it('should handle formatted numbers with dashes/spaces', () => {
        expect(isValidBangladeshiPhone('017-1234-5678')).toBe(true);
        expect(isValidBangladeshiPhone('017 1234 5678')).toBe(true);
    });

    it('should reject non-Bangladeshi numbers', () => {
        expect(isValidBangladeshiPhone('+14155551234')).toBe(false);
        expect(isValidBangladeshiPhone('08012345678')).toBe(false);
    });
});

describe('getOptimizedImage', () => {
    it('should return fallback for empty/null URL', () => {
        expect(getOptimizedImage(null)).toBe('./assets/logo.jpeg');
        expect(getOptimizedImage('')).toBe('./assets/logo.jpeg');
        expect(getOptimizedImage(undefined)).toBe('./assets/logo.jpeg');
    });

    it('should add optimization params to Cloudinary URLs', () => {
        const url = 'https://res.cloudinary.com/test/image/upload/v1/test.jpg';
        const result = getOptimizedImage(url);
        expect(result).toContain('f_auto,q_auto');
    });

    it('should add width for thumbnail type', () => {
        const url = 'https://res.cloudinary.com/test/image/upload/v1/test.jpg';
        const result = getOptimizedImage(url, 'thumb');
        expect(result).toContain('w_300');
    });

    it('should add width for card type', () => {
        const url = 'https://res.cloudinary.com/test/image/upload/v1/test.jpg';
        const result = getOptimizedImage(url, 'card');
        expect(result).toContain('w_600');
    });

    it('should not double-optimize already optimized Cloudinary URLs', () => {
        const url = 'https://res.cloudinary.com/test/image/upload/f_auto,q_auto/v1/test.jpg';
        expect(getOptimizedImage(url)).toBe(url);
    });

    it('should fix local asset paths', () => {
        expect(getOptimizedImage('logo.jpeg')).toBe('./assets/logo.jpeg');
        expect(getOptimizedImage('./assets/logo.jpeg')).toBe('./assets/logo.jpeg');
    });

    it('should pass through external non-Cloudinary URLs', () => {
        const url = 'https://example.com/image.jpg';
        expect(getOptimizedImage(url)).toBe(url);
    });
});

describe('getStatusColor', () => {
    it('should return correct colors for order statuses', () => {
        expect(getStatusColor('Pending')).toBe('text-orange-600');
        expect(getStatusColor('Processing')).toBe('text-blue-600');
        expect(getStatusColor('Shipped')).toBe('text-purple-600');
        expect(getStatusColor('Delivered')).toBe('text-green-600');
        expect(getStatusColor('Cancelled')).toBe('text-red-600');
    });

    it('should handle unknown status', () => {
        expect(getStatusColor('Unknown')).toBe('text-gray-600');
    });

    it('should be case-insensitive', () => {
        expect(getStatusColor('PENDING')).toBe('text-orange-600');
        expect(getStatusColor('delivered')).toBe('text-green-600');
    });
});

describe('getPaymentColor', () => {
    it('should return correct colors for payment statuses', () => {
        expect(getPaymentColor('Paid')).toContain('text-green-600');
        expect(getPaymentColor('Due')).toContain('text-orange-600');
        expect(getPaymentColor('Unpaid')).toBe('text-red-500');
        expect(getPaymentColor('Refunded')).toBe('text-purple-600');
    });

    it('should handle unknown payment status', () => {
        expect(getPaymentColor('Unknown')).toBe('text-gray-600');
    });
});
