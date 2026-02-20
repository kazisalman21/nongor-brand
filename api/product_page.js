const fs = require('fs');
const path = require('path');
const pool = require('./db');

// Helper: Escape HTML characters
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

module.exports = async (req, res) => {
    // Enable CORS (using shared secure handler) & Caching
    const { setSecureCorsHeaders } = require('./cors');
    setSecureCorsHeaders(req, res);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300'); // Cache for 60s, serve stale for 5m

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { slug } = req.query;

    if (!slug) {
        return res.status(404).send('Product Not Found');
    }

    let client;
    try {
        client = await pool.connect();

        // 1. Fetch Product
        const result = await client.query('SELECT * FROM products WHERE slug = $1', [slug]);
        const product = result.rows[0];

        client.release();

        if (!product) {
            // Redirect to home or show 404 page?
            // Let's read the 404.html if exists, or redirect.
            return res.redirect('/404.html');
        }

        // 2. Read HTML Template
        const filePath = path.join(process.cwd(), 'product.html');
        let html = fs.readFileSync(filePath, 'utf8');

        // 3. Prepare Data
        // Resolve Image URL (ensure absolute for FB/WhatsApp)
        let mainImage = product.image || 'https://www.nongorr.com/assets/logo.jpeg';
        if (!mainImage.startsWith('http')) {
            // Remove leading ./ or /
            const cleanPath = mainImage.replace(/^(\.\/|\/)/, '');
            mainImage = `https://www.nongorr.com/${cleanPath}`;
        }

        const title = `${product.name} | নোঙর`;
        const description = product.description || 'Premium quality Bangladeshi clothing from Nongor.';
        const price = `${product.price}`;
        const currency = 'BDT';
        const url = `https://www.nongorr.com/p/${slug}`;

        // 4. Inject Meta Tags (Replace Placeholders or Inject in Head)
        // We will maintain the existing HTML structure and replace specific IDs/meta tags.
        // However, regex replacement is risky. Best to use a placeholder system if possible.
        // But since we are editing an existing file, let's use robust replacement on the known meta tags.

        // Strategy: Replace content="..." for known property/id combinations.

        // Title
        html = html.replace(/<title[^>]*>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
        // Add Canonical (Inject before </head> or replace placeholder if exists - using injection for safety)
        html = html.replace('</head>', `<link rel="canonical" href="${url}" /></head>`);

        // Inject Keywords
        const keywords = `${product.name}, ${product.category || 'Kurti'}, Nongorr, Best Kurti, Bangladeshi Kurti, Ethnic Wear, Women Dress, Gift for Women`;
        html = html.replace('</head>', `<meta name="keywords" content="${escapeHtml(keywords)}" /></head>`);

        html = html.replace(/name="description"\s+id="meta-description"\s+content="[^"]*"/, `name="description" id="meta-description" content="${escapeHtml(description)}"`);

        // Open Graph
        html = html.replace(/property="og:url"\s+id="og-url"\s+content="[^"]*"/, `property="og:url" id="og-url" content="${escapeHtml(url)}"`);
        html = html.replace(/property="og:title"\s+id="og-title"\s+content="[^"]*"/, `property="og:title" id="og-title" content="${escapeHtml(title)}"`);
        html = html.replace(/property="og:description"\s+id="og-description"\s+content="[^"]*"/, `property="og:description" id="og-description" content="${escapeHtml(description)}"`);
        html = html.replace(/property="og:image"\s+id="og-image"\s+content="[^"]*"/, `property="og:image" id="og-image" content="${escapeHtml(mainImage)}"`);
        html = html.replace(/property="product:price:amount"\s+id="og-price"\s+content="[^"]*"/, `property="product:price:amount" id="og-price" content="${escapeHtml(price)}"`);

        // Twitter
        html = html.replace(/name="twitter:title"\s+id="twitter-title"\s+content="[^"]*"/, `name="twitter:title" id="twitter-title" content="${escapeHtml(title)}"`);
        html = html.replace(/name="twitter:description"\s+id="twitter-description"\s+content="[^"]*"/, `name="twitter:description" id="twitter-description" content="${escapeHtml(description)}"`);
        html = html.replace(/name="twitter:image"\s+id="twitter-image"\s+content="[^"]*"/, `name="twitter:image" id="twitter-image" content="${escapeHtml(mainImage)}"`);

        // 5. Inject JSON-LD Schema (Structured Data)
        const schema = {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": product.name,
            "alternateName": product.name, // Fallback for alternate name
            "description": description,
            "image": [mainImage],
            "sku": `NONGORR-${product.id}`,
            "brand": {
                "@type": "Brand",
                "name": "নোঙর"
            },
            "offers": {
                "@type": "Offer",
                "url": url,
                "priceCurrency": currency,
                "price": price,
                "priceValidUntil": "2026-12-31",
                "availability": parseInt(product.stock_quantity) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "itemCondition": "https://schema.org/NewCondition",
                "seller": {
                    "@type": "Organization",
                    "name": "নোঙর"
                }
            },
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "5",
                "reviewCount": "1"
            }
        };

        const breadcrumbSchema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [{
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://www.nongorr.com"
            }, {
                "@type": "ListItem",
                "position": 2,
                "name": "Collection",
                "item": "https://www.nongorr.com/index.html#collection"
            }, {
                "@type": "ListItem",
                "position": 3,
                "name": product.name,
                "item": url
            }]
        };

        const schemaScript = `
        <script type="application/ld+json">
            ${JSON.stringify(schema, null, 2).replace(/</g, '\\u003c')}
        </script>
        <script type="application/ld+json">
            ${JSON.stringify(breadcrumbSchema, null, 2).replace(/</g, '\\u003c')}
        </script>
        `;

        // Insert Schema before </head>
        html = html.replace('</head>', `${schemaScript}</head>`);

        // 6. Preload Data for Client Side (Hydration)
        // This avoids the double-fetch in script.js specific to product.html
        const preloadScript = `
        <script>
            window.preloadedProduct = ${JSON.stringify(product).replace(/</g, '\\u003c')};
        </script>
        `;
        html = html.replace('</body>', `${preloadScript}</body>`);

        // Send Response
        res.setHeader('Content-Type', 'text/html');
        res.send(html);

    } catch (e) {
        console.error('SSR Error:', e);
        if (client) client.release();
        res.status(500).send('Internal Server Error');
    }
};
