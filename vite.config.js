import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        // Minify HTML and JS output
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: false, // Keep console.warn for debugging
                drop_debugger: true,
                passes: 2
            },
            format: {
                comments: false
            }
        },
        // CSS minification
        cssMinify: true,
        // Chunk splitting for better caching
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                about: resolve(__dirname, 'about.html'),
                track: resolve(__dirname, 'track.html'),
                notfound: resolve(__dirname, '404.html'),
                terms: resolve(__dirname, 'terms.html'),
                privacy: resolve(__dirname, 'privacy-policy.html'),
                shipping: resolve(__dirname, 'shipping-info.html'),
                returns: resolve(__dirname, 'return-policy.html'),
                faq: resolve(__dirname, 'faq.html'),
                admin: resolve(__dirname, 'admin.html'),
                adminReset: resolve(__dirname, 'admin-reset.html'),
                adminSlip: resolve(__dirname, 'admin-slip.html'),
                checkout: resolve(__dirname, 'checkout.html'),
                product: resolve(__dirname, 'product.html')
            },
            output: {
                // Smart chunk naming for long-term caching
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
                // Manual chunk splitting
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        return 'vendor';
                    }
                }
            }
        },
        // Generate source maps for debugging
        sourcemap: false,
        // Asset inlining threshold (4KB)
        assetsInlineLimit: 4096
    },
    test: {
        environment: 'jsdom',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'text-summary', 'html', 'json-summary'],
            reportsDirectory: './coverage',
            include: [
                'js/**/*.js',
                'api/**/*.js'
            ],
            exclude: [
                'node_modules/**',
                'tests/**',
                'scripts/**',
                'Bot/**'
            ]
        }
    }
});
