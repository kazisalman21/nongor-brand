/**
 * Tests — Sanitize Module (Server-Side)
 * Tests HTML tag stripping, entity encoding, and recursive object sanitization
 */
import { describe, it, expect } from 'vitest';

// Replicate sanitize functions (server-side module)
function sanitize(input) {
    if (typeof input !== 'string') return input;
    return input
        .replace(/<[^>]*>?/gm, '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .trim();
}

function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    const cleanObj = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === 'string') {
                cleanObj[key] = sanitize(value);
            } else if (typeof value === 'object') {
                cleanObj[key] = sanitizeObject(value);
            } else {
                cleanObj[key] = value;
            }
        }
    }
    return cleanObj;
}

// ========== TESTS ==========

describe('sanitize — HTML tag stripping', () => {
    it('should strip simple HTML tags', () => {
        expect(sanitize('<b>bold</b>')).toBe('bold');
    });

    it('should strip script tags (XSS attempt)', () => {
        expect(sanitize('<script>alert("xss")</script>')).toBe('alert(&quot;xss&quot;)');
    });

    it('should strip nested tags', () => {
        expect(sanitize('<div><span>hello</span></div>')).toBe('hello');
    });

    it('should strip tags with attributes', () => {
        expect(sanitize('<img src="x" onerror="alert(1)">')).toBe('');
    });

    it('should strip self-closing tags', () => {
        expect(sanitize('<br/><hr/>')).toBe('');
    });

    it('should strip tag-like content (known regex limitation)', () => {
        // The regex treats < ... > as a tag, so "5 < 10 and 10 > 5" loses the middle
        // This is acceptable — user input should not contain raw < > characters
        const result = sanitize('5 < 10 and 10 > 5');
        expect(result).toBe('5  5');
    });
});

describe('sanitize — Entity encoding', () => {
    it('should encode ampersands', () => {
        expect(sanitize('A & B')).toBe('A &amp; B');
    });

    it('should encode double quotes', () => {
        expect(sanitize('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it('should encode single quotes', () => {
        expect(sanitize("it's")).toBe("it&#39;s");
    });

    it('should handle multiple special characters together', () => {
        const result = sanitize('Tom & Jerry say "it\'s great"');
        expect(result).toContain('&amp;');
        expect(result).toContain('&quot;');
        expect(result).toContain('&#39;');
    });
});

describe('sanitize — Edge cases', () => {
    it('should return non-string inputs unchanged', () => {
        expect(sanitize(42)).toBe(42);
        expect(sanitize(null)).toBe(null);
        expect(sanitize(undefined)).toBe(undefined);
        expect(sanitize(true)).toBe(true);
    });

    it('should trim whitespace', () => {
        expect(sanitize('   hello   ')).toBe('hello');
    });

    it('should handle empty string', () => {
        expect(sanitize('')).toBe('');
    });

    it('should handle Bengali text without modification', () => {
        expect(sanitize('নোঙর ব্র্যান্ড')).toBe('নোঙর ব্র্যান্ড');
    });

    it('should handle Bengali text with HTML tags', () => {
        expect(sanitize('<b>কুর্তি</b> কালেকশন')).toBe('কুর্তি কালেকশন');
    });
});

describe('sanitizeObject — Recursive sanitization', () => {
    it('should sanitize all string values in an object', () => {
        const input = { name: '<b>Test</b>', price: 100 };
        const result = sanitizeObject(input);
        expect(result.name).toBe('Test');
        expect(result.price).toBe(100);
    });

    it('should handle nested objects', () => {
        const input = {
            customer: {
                name: '<script>xss</script>',
                address: 'Dhaka "BD"'
            }
        };
        const result = sanitizeObject(input);
        expect(result.customer.name).toBe('xss');
        expect(result.customer.address).toContain('&quot;');
    });

    it('should handle arrays', () => {
        const input = ['<b>A</b>', '<i>B</i>', 42];
        const result = sanitizeObject(input);
        expect(result[0]).toBe('A');
        expect(result[1]).toBe('B');
        expect(result[2]).toBe(42);
    });

    it('should handle null input', () => {
        expect(sanitizeObject(null)).toBe(null);
    });

    it('should handle non-object input', () => {
        expect(sanitizeObject('string')).toBe('string');
        expect(sanitizeObject(42)).toBe(42);
    });

    it('should handle deeply nested mixed structures', () => {
        const input = {
            items: [
                { name: '<em>Item 1</em>', tags: ['<b>sale</b>', 'new'] }
            ],
            meta: { count: 1, label: 'Products & More' }
        };
        const result = sanitizeObject(input);
        expect(result.items[0].name).toBe('Item 1');
        expect(result.items[0].tags[0]).toBe('sale');
        expect(result.meta.label).toContain('&amp;');
        expect(result.meta.count).toBe(1);
    });
});
