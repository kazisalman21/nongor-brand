const pool = require('./db');

module.exports = async (req, res) => {
  try {
    const baseUrl = 'https://www.nongorr.com';

    // 1. Fetch Dynamic Products
    const client = await pool.connect();
    const result = await client.query('SELECT slug, name, image, updated_at, stock_quantity FROM products WHERE stock_quantity > 0 ORDER BY created_at DESC');
    const products = result.rows;
    client.release();

    // 2. Generate XML
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- ════════════════ COLLECTION / SHOP PAGE ════════════════ -->
  <url>
    <loc>${baseUrl}/index.html#collection</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- ════════════════ PRODUCT PAGES ════════════════ -->`;

    products.forEach(product => {
      const lastMod = product.updated_at ? new Date(product.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      let imageUrl = product.image || 'https://www.nongorr.com/assets/logo.jpeg';
      if (!imageUrl.startsWith('http')) {
        const cleanPath = imageUrl.replace(/^(\.\/|\/)/, '');
        imageUrl = `${baseUrl}/${cleanPath}`;
      }

      // Escape special chars for XML
      const escapedName = product.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

      xml += `
  <url>
    <loc>${baseUrl}/p/${product.slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${escapedName}</image:title>
      <image:caption>${escapedName} - Available at Nongor</image:caption>
    </image:image>
  </url>`;
    });

    xml += `
</urlset>`;

    // 3. Send Response
    res.status(200).send(xml);

  } catch (error) {
    console.error('Sitemap Products Generation Error:', error);
    res.status(500).send('Error generating products sitemap');
  }
};
