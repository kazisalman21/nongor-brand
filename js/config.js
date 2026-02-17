// ==============================================
// CONFIG — Data constants, shared state
// ==============================================

window.categoriesData = [
    { "id": 1, "name": "পাঞ্জাবি", "slug": "panjabi" },
    { "id": 2, "name": "কুর্তি", "slug": "kurti" },
    { "id": 3, "name": "শাড়ি", "slug": "saree" },
    { "id": 4, "name": "থ্রি পিস", "slug": "three-piece" },
    { "id": 5, "name": "অন্যান্য", "slug": "other" }
];

window.fallbackProducts = [
    {
        "id": 1,
        "name": "টিউলিপ",
        "price": "1000.00",
        "image": "https://res.cloudinary.com/daalopsqn/image/upload/f_auto,q_auto/v1769523623/lsxxuqx26gef8ujbktm9.webp",
        "description": "আরামদায়ক কাপড়ে রঙিন টিউলিপ ফুলের নকশা।",
        "category_slug": "kurti",
        "category_name": "কুর্তি",
        "is_featured": true
    },
    {
        "id": 2,
        "name": "একটা কমলা রঙের প্রজাপতি",
        "price": "900.00",
        "image": "https://res.cloudinary.com/daalopsqn/image/upload/f_auto,q_auto/v1769523623/lsxxuqx26gef8ujbktm9.webp",
        "description": "কালো পোশাকে রঙিন প্রজাপতির ছোঁয়া।",
        "category_slug": "kurti",
        "category_name": "কুর্তি",
        "is_featured": true
    }
];

// Shared state
window.allProducts = [];
window.currentCategory = 'all';
window.API_URL = '/api';

// Modal state
window.currentProductId = null;
window.availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];

// Cart state
window.cart = JSON.parse(localStorage.getItem('nongor_cart')) || [];
window.selectedSize = 'M';
window.currentQuantity = 1;

// Checkout state
window.discountAmount = 0;
window.appliedCouponCode = null;
window.shippingFee = 70;
window.checkoutPayload = null;
window.checkoutTotal = 0;

// Custom sizing state
window.currentProduct = {};
window.currentSizeType = 'standard';
window.currentMeasurementUnit = 'inch';

// Filter state
window.filterDebounceTimer = null;
