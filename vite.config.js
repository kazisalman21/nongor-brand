import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
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
            }
        }
    }
});
