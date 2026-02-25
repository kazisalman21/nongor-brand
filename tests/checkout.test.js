/**
 * Smoke Tests — Checkout Module
 * Tests order data construction, phone validation, payment method fallback
 */
import { describe, it, expect } from 'vitest';

// --- Replicate checkout helpers ---

function buildOrderPayload(items, customerInfo, paymentMethod, shippingFee = 70) {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0);

    return {
        items: items.map(item => ({
            product_id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity) || 1,
            size: item.selectedSize || item.size || '',
            custom_note: item.customNote || ''
        })),
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        payment_method: paymentMethod || 'COD',
        subtotal,
        shipping_fee: shippingFee,
        total: subtotal + shippingFee
    };
}

function validateCheckoutForm(name, phone, address) {
    const errors = [];
    if (!name || name.trim().length < 2) errors.push('নাম দিন (Enter your name)');
    if (!phone || !/^01[3-9]\d{8}$/.test(phone.replace(/\D/g, ''))) errors.push('সঠিক ফোন নম্বর দিন');
    if (!address || address.trim().length < 5) errors.push('ঠিকানা দিন (Enter your address)');
    return errors;
}

function getPaymentMethod(radioSelector) {
    // Simulates: document.querySelector(radioSelector)?.value || 'COD'
    return radioSelector || 'COD';
}

// ========== TESTS ==========

describe('buildOrderPayload', () => {
    const sampleItems = [
        { id: 1, name: 'হরিদ্রা', price: 870, quantity: 2, selectedSize: 'M' },
        { id: 2, name: 'টিউলিপ', price: 1000, quantity: 1, selectedSize: 'L', customNote: 'Extra large' }
    ];
    const customerInfo = { name: 'কাজী সালমান', phone: '01712345678', address: 'ঢাকা, বাংলাদেশ' };

    it('should construct valid order payload', () => {
        const payload = buildOrderPayload(sampleItems, customerInfo, 'COD');
        expect(payload.customer_name).toBe('কাজী সালমান');
        expect(payload.payment_method).toBe('COD');
        expect(payload.items).toHaveLength(2);
    });

    it('should calculate subtotal correctly', () => {
        const payload = buildOrderPayload(sampleItems, customerInfo, 'COD');
        expect(payload.subtotal).toBe(2740); // 870*2 + 1000*1
    });

    it('should add shipping fee to total', () => {
        const payload = buildOrderPayload(sampleItems, customerInfo, 'COD', 70);
        expect(payload.total).toBe(2810); // 2740 + 70
    });

    it('should default quantity to 1 for missing quantity', () => {
        const items = [{ id: 1, name: 'Test', price: 500 }];
        const payload = buildOrderPayload(items, customerInfo, 'COD');
        expect(payload.subtotal).toBe(500);
    });

    it('should default payment method to COD', () => {
        const payload = buildOrderPayload(sampleItems, customerInfo, null);
        expect(payload.payment_method).toBe('COD');
    });

    it('should include custom note in items', () => {
        const payload = buildOrderPayload(sampleItems, customerInfo, 'COD');
        expect(payload.items[1].custom_note).toBe('Extra large');
    });
});

describe('validateCheckoutForm', () => {
    it('should pass with valid inputs', () => {
        const errors = validateCheckoutForm('কাজী সালমান', '01712345678', 'ঢাকা, ধানমন্ডি');
        expect(errors).toHaveLength(0);
    });

    it('should reject empty name', () => {
        const errors = validateCheckoutForm('', '01712345678', 'ঢাকা');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('নাম');
    });

    it('should reject short name', () => {
        const errors = validateCheckoutForm('A', '01712345678', 'ঢাকা, ধানমন্ডি');
        expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid phone numbers', () => {
        const errors = validateCheckoutForm('Test User', '0101234567', 'ঢাকা, ধানমন্ডি');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('ফোন');
    });

    it('should reject short address', () => {
        const errors = validateCheckoutForm('Test User', '01712345678', 'ঢাকা');
        expect(errors.length).toBeGreaterThan(0);
    });

    it('should return multiple errors for multiple invalid fields', () => {
        const errors = validateCheckoutForm('', '', '');
        expect(errors.length).toBe(3);
    });
});

describe('getPaymentMethod', () => {
    it('should return selected value when available', () => {
        expect(getPaymentMethod('bKash')).toBe('bKash');
        expect(getPaymentMethod('Nagad')).toBe('Nagad');
    });

    it('should default to COD when no selection', () => {
        expect(getPaymentMethod(null)).toBe('COD');
        expect(getPaymentMethod(undefined)).toBe('COD');
        expect(getPaymentMethod('')).toBe('COD');
    });
});
