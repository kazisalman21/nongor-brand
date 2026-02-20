const pool = require('./db');

module.exports = async (req, res) => {
    try {
        // 1. Define Static Pages
        const baseUrl = 'https://www.nongorr.com';
        const staticPages = [
            { url: '/', priority: 1.0, changefreq: 'daily' },
            { url: '/about.html', priority: 0.8, changefreq: 'monthly' },
            { url: '/collection.html', priority: 0.9, changefreq: 'weekly' }, // New Collection Page
            { url: '/shipping-info.html', priority: 0.7, changefreq: 'monthly' },
            { url: '/checkout.html', priority: 0.8, changefreq: 'never' },
            { url: '/faq.html', priority: 0.6, changefreq: 'monthly' },
            { url: '/track.html', priority: 0.7, changefreq: 'always' },
            { url: '/return-policy.html', priority: 0.5, changefreq: 'yearly' },
            { url: '/privacy-policy.html', priority: 0.5, changefreq: 'yearly' },
            { url: '/terms.html', priority: 0.5, changefreq: 'yearly' }
        ];

        // 2. Fetch Dynamic Products
        const client = await pool.connect();
        const result = await client.query('SELECT slug, updated_at FROM products WHERE stock_quantity > 0 ORDER BY created_at DESC');
        const products = result.rows;
        client.release();

        // 3. Generate XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        // Add Static Pages
        staticPages.forEach(page => {
            xml += `
    <url>
        <loc>${baseUrl}${page.url}</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>`;
        });

        // Add Product Pages
        products.forEach(product => {
            const lastMod = product.updated_at ? new Date(product.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            xml += `
    <url>
        <loc>${baseUrl}/p/${product.slug}</loc>
        <lastmod>${lastMod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
        });

        xml += `
</urlset>`;

        // 4. Send Response
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400'); // Cache for 1 hour
        res.status(200).send(xml);

    } catch (error) {
        console.error('Sitemap Generation Error:', error);
        res.status(500).send('Error generating sitemap');
    }
};
