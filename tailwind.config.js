/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./**/*.{html,js}"],
    theme: {

        extend: {
            animation: {
                'fade-out': 'fadeOut 0.5s ease-in-out forwards',
                'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'fade-in': 'fadeIn 0.3s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
            },
            keyframes: {
                fadeOut: {
                    '0%': { opacity: '1', visibility: 'visible' },
                    '100%': { opacity: '0', visibility: 'hidden' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.9) translateY(10px)', opacity: '0' },
                    '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            },
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
