/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./**/*.{html,js}"],
    theme: {
        extend: {
            colors: {
                brand: {
                    // Main Site (Index)
                    terracotta: '#E07A5F',
                    sand: '#F2CC8F',
                    deep: '#3D405B',
                    light: '#F4F1DE',
                    dark: '#2d2f36',

                    // Admin Panel (Renamed to avoid conflicts)
                    'admin-dark': '#1a1c23',
                    sidebar: '#24262d',
                    accent: '#7e3af2',
                    success: '#0e9f6e',
                    warning: '#ff5a1f',

                    // Checkout (Renamed to avoid conflicts)
                    'checkout-deep': '#2F3E46',
                    'checkout-light': '#84A98C',
                    'checkout-sand': '#F4F1DE',
                }
            },
            fontFamily: {
                // Main Site + Checkout
                bengali: ['"Noto Serif Bengali"', 'serif'],
                'bengali-display': ['"Tiro Bangla"', 'serif'],
                serif: ['"Playfair Display"', 'serif'],
                sans: ['"Montserrat"', 'sans-serif'],

                // Admin Panel
                'admin-sans': ['Outfit', 'sans-serif'],
                'admin-bengali': ['Hind Siliguri', 'sans-serif'],
            }
        }
    },
    plugins: [],
}
