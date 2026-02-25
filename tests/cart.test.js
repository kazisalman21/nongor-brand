/**
 * Smoke Tests — Cart Module
 * Tests cart CRUD, localStorage handling, and price calculations
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mock localStorage ---
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = String(value); }),
        removeItem: vi.fn((key) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// --- Replicate cart functions ---
function getCart() {
    try {
        return JSON.parse(localStorage.getItem('nongor_cart')) || [];
    } catch (e) {
        localStorage.removeItem('nongor_cart');
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('nongor_cart', JSON.stringify(cart));
}

function addToCart(product) {
    const cart = getCart();
    const existing = cart.find(item =>
        item.id === product.id && item.selectedSize === product.selectedSize
    );
    if (existing) {
        existing.quantity = (existing.quantity || 1) + (product.quantity || 1);
    } else {
        cart.push({ ...product, quantity: product.quantity || 1 });
    }
    saveCart(cart);
    return cart;
}

function removeFromCart(index) {
    const cart = getCart();
    if (index >= 0 && index < cart.length) {
        cart.splice(index, 1);
        saveCart(cart);
    }
    return cart;
}

function getCartTotal(cart) {
    return cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0);
}

// ========== TESTS ==========

describe('getCart', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('should return empty array when localStorage is empty', () => {
        expect(getCart()).toEqual([]);
    });

    it('should return parsed cart data', () => {
        const cartData = [{ id: 1, name: 'হরিদ্রা', price: 870, quantity: 1 }];
        localStorage.setItem('nongor_cart', JSON.stringify(cartData));
        expect(getCart()).toEqual(cartData);
    });

    it('should handle corrupted localStorage data gracefully', () => {
        localStorage.setItem('nongor_cart', '{invalid json!!!');
        localStorageMock.getItem.mockReturnValueOnce('{invalid json!!!');
        expect(getCart()).toEqual([]);
    });

    it('should clean up corrupted data from localStorage', () => {
        localStorageMock.getItem.mockReturnValueOnce('{corrupt}');
        getCart();
        expect(localStorage.removeItem).toHaveBeenCalledWith('nongor_cart');
    });
});

describe('addToCart', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('should add a new product to empty cart', () => {
        const cart = addToCart({ id: 1, name: 'হরিদ্রা', price: 870, selectedSize: 'M', quantity: 1 });
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe('হরিদ্রা');
    });

    it('should increment quantity for duplicate product+size', () => {
        addToCart({ id: 1, name: 'হরিদ্রা', price: 870, selectedSize: 'M', quantity: 1 });
        const cart = addToCart({ id: 1, name: 'হরিদ্রা', price: 870, selectedSize: 'M', quantity: 2 });
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(3);
    });

    it('should add separate entries for different sizes', () => {
        addToCart({ id: 1, name: 'হরিদ্রা', price: 870, selectedSize: 'M', quantity: 1 });
        const cart = addToCart({ id: 1, name: 'হরিদ্রা', price: 870, selectedSize: 'L', quantity: 1 });
        expect(cart).toHaveLength(2);
    });
});

describe('removeFromCart', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('should remove item at valid index', () => {
        addToCart({ id: 1, name: 'A', price: 100, selectedSize: 'M', quantity: 1 });
        addToCart({ id: 2, name: 'B', price: 200, selectedSize: 'L', quantity: 1 });
        const cart = removeFromCart(0);
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe('B');
    });

    it('should handle invalid index gracefully', () => {
        addToCart({ id: 1, name: 'A', price: 100, selectedSize: 'M', quantity: 1 });
        const cart = removeFromCart(5);
        expect(cart).toHaveLength(1);
    });

    it('should handle negative index gracefully', () => {
        addToCart({ id: 1, name: 'A', price: 100, selectedSize: 'M', quantity: 1 });
        const cart = removeFromCart(-1);
        expect(cart).toHaveLength(1);
    });
});

describe('getCartTotal', () => {
    it('should calculate total correctly', () => {
        const cart = [
            { price: 870, quantity: 2 },
            { price: 1000, quantity: 1 },
        ];
        expect(getCartTotal(cart)).toBe(2740);
    });

    it('should handle missing quantity (default to 1)', () => {
        const cart = [{ price: 500 }];
        expect(getCartTotal(cart)).toBe(500);
    });

    it('should handle empty cart', () => {
        expect(getCartTotal([])).toBe(0);
    });

    it('should handle string prices', () => {
        const cart = [{ price: '870', quantity: '2' }];
        expect(getCartTotal(cart)).toBe(1740);
    });
});
