/**
 * Tests — Products Module
 * Tests filtering, searching, price parsing, and category logic
 */
import { describe, it, expect, beforeEach } from 'vitest';

// --- Replicate product filtering logic ---

const mockProducts = [
    { id: 1, name: 'টিউলিপ কুর্তি', price: 1000, category_slug: 'kurti', category_name: 'কুর্তি', description: 'রঙিন টিউলিপ ফুলের নকশা', stock_quantity: 10, is_featured: true },
    { id: 2, name: 'পাঞ্জাবি সিল্ক', price: 2500, category_slug: 'panjabi', category_name: 'পাঞ্জাবি', description: 'প্রিমিয়াম সিল্ক', stock_quantity: 5, is_featured: false },
    { id: 3, name: 'কটন শাড়ি', price: 1800, category_slug: 'saree', category_name: 'শাড়ি', description: 'হ্যান্ডলুম কটন', stock_quantity: 0, is_featured: true },
    { id: 4, name: 'থ্রি পিস সেট', price: 3500, category_slug: 'three-piece', category_name: 'থ্রি পিস', description: 'এলিগ্যান্ট থ্রি পিস', stock_quantity: 8, is_featured: false },
    { id: 5, name: 'ক্যাজুয়াল কুর্তি', price: 750, category_slug: 'kurti', category_name: 'কুর্তি', description: 'দৈনন্দিন ব্যবহারের', stock_quantity: 15, is_featured: false },
];

function filterByCategory(products, category) {
    if (category === 'all') return products;
    return products.filter(p => p.category_slug === category);
}

function filterBySearch(products, query) {
    if (!query) return products;
    const q = query.toLowerCase().trim();
    return products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category_name && p.category_name.toLowerCase().includes(q))
    );
}

function filterByPrice(products, min, max) {
    return products.filter(p => {
        const price = parseFloat(p.price);
        if (min && price < parseFloat(min)) return false;
        if (max && price > parseFloat(max)) return false;
        return true;
    });
}

function filterInStock(products) {
    return products.filter(p => parseInt(p.stock_quantity) > 0);
}

function sortProducts(products, sortBy) {
    const sorted = [...products];
    switch (sortBy) {
        case 'price-low': return sorted.sort((a, b) => a.price - b.price);
        case 'price-high': return sorted.sort((a, b) => b.price - a.price);
        case 'name-az': return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'name-za': return sorted.sort((a, b) => b.name.localeCompare(a.name));
        case 'newest':
        default: return sorted;
    }
}

function parseProductData(rawProduct) {
    return {
        ...rawProduct,
        price: parseFloat(rawProduct.price),
        images: typeof rawProduct.images === 'string'
            ? (() => { try { return JSON.parse(rawProduct.images || '[]'); } catch { return []; } })()
            : (rawProduct.images || []),
        category: {
            name: rawProduct.category_name || 'অন্যান্য',
            slug: rawProduct.category_slug || 'other'
        }
    };
}

// ========== TESTS ==========

describe('Category Filtering', () => {
    it('should return all products for "all" category', () => {
        expect(filterByCategory(mockProducts, 'all')).toHaveLength(5);
    });

    it('should filter by kurti category', () => {
        const result = filterByCategory(mockProducts, 'kurti');
        expect(result).toHaveLength(2);
        expect(result.every(p => p.category_slug === 'kurti')).toBe(true);
    });

    it('should filter by saree category', () => {
        expect(filterByCategory(mockProducts, 'saree')).toHaveLength(1);
    });

    it('should return empty for non-existent category', () => {
        expect(filterByCategory(mockProducts, 'shoes')).toHaveLength(0);
    });
});

describe('Search Filtering', () => {
    it('should return all products for empty query', () => {
        expect(filterBySearch(mockProducts, '')).toHaveLength(5);
    });

    it('should search by product name (Bengali)', () => {
        const result = filterBySearch(mockProducts, 'কুর্তি');
        expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should search by description', () => {
        const result = filterBySearch(mockProducts, 'সিল্ক');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });

    it('should search by category name', () => {
        const result = filterBySearch(mockProducts, 'শাড়ি');
        expect(result).toHaveLength(1);
    });

    it('should be case-insensitive for English text', () => {
        // Add an English-named product for this test
        const products = [...mockProducts, { id: 6, name: 'Cotton Kurti', price: 900, category_slug: 'kurti', category_name: 'কুর্তি', description: 'Premium cotton', stock_quantity: 5 }];
        const result = filterBySearch(products, 'COTTON');
        expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty for unmatched search', () => {
        expect(filterBySearch(mockProducts, 'জুতা')).toHaveLength(0);
    });
});

describe('Price Filtering', () => {
    it('should filter by minimum price', () => {
        const result = filterByPrice(mockProducts, 1500, null);
        expect(result.every(p => p.price >= 1500)).toBe(true);
    });

    it('should filter by maximum price', () => {
        const result = filterByPrice(mockProducts, null, 1500);
        expect(result.every(p => p.price <= 1500)).toBe(true);
    });

    it('should filter by price range', () => {
        const result = filterByPrice(mockProducts, 1000, 2500);
        expect(result.every(p => p.price >= 1000 && p.price <= 2500)).toBe(true);
        expect(result.length).toBe(3); // 1000, 1800, 2500
    });

    it('should return all when no price filters', () => {
        expect(filterByPrice(mockProducts, null, null)).toHaveLength(5);
    });

    it('should handle string price inputs', () => {
        const result = filterByPrice(mockProducts, '1000', '2000');
        expect(result.length).toBe(2); // 1000, 1800
    });
});

describe('Stock Filtering', () => {
    it('should filter out out-of-stock products', () => {
        const result = filterInStock(mockProducts);
        expect(result).toHaveLength(4); // product 3 has stock_quantity: 0
        expect(result.find(p => p.id === 3)).toBeUndefined();
    });

    it('should keep all in-stock items', () => {
        const result = filterInStock(mockProducts);
        expect(result.every(p => parseInt(p.stock_quantity) > 0)).toBe(true);
    });
});

describe('Product Sorting', () => {
    it('should sort by price low to high', () => {
        const result = sortProducts(mockProducts, 'price-low');
        expect(result[0].price).toBe(750);
        expect(result[result.length - 1].price).toBe(3500);
    });

    it('should sort by price high to low', () => {
        const result = sortProducts(mockProducts, 'price-high');
        expect(result[0].price).toBe(3500);
        expect(result[result.length - 1].price).toBe(750);
    });

    it('should sort by name A-Z', () => {
        const result = sortProducts(mockProducts, 'name-az');
        for (let i = 1; i < result.length; i++) {
            expect(result[i].name.localeCompare(result[i - 1].name)).toBeGreaterThanOrEqual(0);
        }
    });

    it('should default to original order for "newest"', () => {
        const result = sortProducts(mockProducts, 'newest');
        expect(result[0].id).toBe(1);
    });

    it('should not mutate the original array', () => {
        const original = [...mockProducts];
        sortProducts(mockProducts, 'price-high');
        expect(mockProducts[0].id).toBe(original[0].id);
    });
});

describe('Product Data Parsing', () => {
    it('should parse string prices to numbers', () => {
        const raw = { name: 'Test', price: '1500.00', category_name: 'কুর্তি', category_slug: 'kurti' };
        const result = parseProductData(raw);
        expect(result.price).toBe(1500);
        expect(typeof result.price).toBe('number');
    });

    it('should parse JSON image strings', () => {
        const raw = { name: 'Test', price: 100, images: '["img1.jpg","img2.jpg"]', category_name: 'কুর্তি', category_slug: 'kurti' };
        const result = parseProductData(raw);
        expect(result.images).toHaveLength(2);
    });

    it('should handle invalid JSON images gracefully', () => {
        const raw = { name: 'Test', price: 100, images: '{invalid', category_name: 'কুর্তি', category_slug: 'kurti' };
        const result = parseProductData(raw);
        expect(result.images).toEqual([]);
    });

    it('should handle array images directly', () => {
        const raw = { name: 'Test', price: 100, images: ['img1.jpg'], category_name: 'কুর্তি', category_slug: 'kurti' };
        const result = parseProductData(raw);
        expect(result.images).toEqual(['img1.jpg']);
    });

    it('should default category name to অন্যান্য', () => {
        const raw = { name: 'Test', price: 100 };
        const result = parseProductData(raw);
        expect(result.category.name).toBe('অন্যান্য');
        expect(result.category.slug).toBe('other');
    });
});
