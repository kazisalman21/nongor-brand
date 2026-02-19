/**
 * Dynamic Google Shopping Feed
 * Generates XML feed from database products
 * URL: /feed.xml (via Vercel rewrite)
 */
const pool = require('./db');

function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

module.exports = async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(
            `SELECT id, name, description, price, image, category_name, stock_quantity, slug 
             FROM products ORDER BY id`
        );
        client.release();

        const products = result.rows;
        const baseUrl = 'https://www.nongorr.com';

        let items = '';
        for (const p of products) {
            // Resolve image URL to absolute
            let image = p.image || `${baseUrl}/assets/logo.jpeg`;
            if (!image.startsWith('http')) {
                image = `${baseUrl}/${image.replace(/^\.\//, '')}`;
            }

            items += `
    <item>
        <g:id>NG${String(p.id).padStart(3, '0')}</g:id>
        <g:title>${escapeXml(p.name)}</g:title>
        <g:description>${escapeXml(p.description || 'Premium Bangladeshi clothing from Nongor.')}</g:description>
        <g:link>${baseUrl}/p/${p.slug || p.id}</g:link>
        <g:image_link>${escapeXml(image)}</g:image_link>
        <g:brand>Nongor</g:brand>
        <g:condition>new</g:condition>
        <g:availability>${parseInt(p.stock_quantity) > 0 ? 'in stock' : 'out of stock'}</g:availability>
        <g:price>${parseFloat(p.price).toFixed(2)} BDT</g:price>
        <g:product_type>${escapeXml(p.category_name || 'Clothing')}</g:product_type>
        <g:shipping>
            <g:country>BD</g:country>
            <g:service>Standard</g:service>
            <g:price>70.00 BDT</g:price>
        </g:shipping>
    </item>`;
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
    <title>Nongor Brand</title>
    <link>${baseUrl}</link>
    <description>Premium Bangladeshi Clothing Brand</description>${items}
</channel>
</rss>`;

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
        res.status(200).send(xml);
    } catch (err) {
        console.error('Feed Error:', err);
        res.status(500).send('<?xml version="1.0"?><error>Feed generation failed</error>');
    }
};
