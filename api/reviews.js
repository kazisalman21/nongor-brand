/**
 * Reviews API
 * GET  /api/reviews?productId=123  → Get approved reviews
 * POST /api/reviews               → Submit a new review
 */
const pool = require('./db');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    let client;
    try {
        client = await pool.connect();

        // Auto-create reviews table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL,
                reviewer_name VARCHAR(100) NOT NULL,
                rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
                comment TEXT,
                is_approved BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id)
        `);

        // --- GET: Fetch reviews for a product ---
        if (req.method === 'GET') {
            const productId = parseInt(req.query.productId);
            if (!productId) {
                client.release();
                return res.status(400).json({ result: 'error', message: 'productId required' });
            }

            const result = await client.query(
                `SELECT id, reviewer_name, rating, comment, created_at 
                 FROM reviews 
                 WHERE product_id = $1 AND is_approved = true 
                 ORDER BY created_at DESC 
                 LIMIT 50`,
                [productId]
            );

            // Also get average rating
            const avgResult = await client.query(
                `SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as total_reviews 
                 FROM reviews 
                 WHERE product_id = $1 AND is_approved = true`,
                [productId]
            );

            client.release();
            return res.status(200).json({
                result: 'success',
                reviews: result.rows,
                avgRating: parseFloat(avgResult.rows[0].avg_rating).toFixed(1),
                totalReviews: parseInt(avgResult.rows[0].total_reviews)
            });
        }

        // --- POST: Submit a new review ---
        if (req.method === 'POST') {
            let body = req.body || {};
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) { }
            }

            const { productId, name, rating, comment } = body;

            // Validate
            if (!productId || !name || !rating) {
                client.release();
                return res.status(400).json({ result: 'error', message: 'productId, name, and rating are required' });
            }

            const ratingNum = parseInt(rating);
            if (ratingNum < 1 || ratingNum > 5) {
                client.release();
                return res.status(400).json({ result: 'error', message: 'Rating must be 1-5' });
            }

            const safeName = String(name).trim().substring(0, 100);
            const safeComment = comment ? String(comment).trim().substring(0, 1000) : '';

            // Rate limit: max 3 reviews per product per IP per day
            // (Simple approach - check by name+product combo in last 24h)
            const recentCheck = await client.query(
                `SELECT COUNT(*) FROM reviews 
                 WHERE product_id = $1 AND reviewer_name = $2 
                 AND created_at > NOW() - INTERVAL '24 hours'`,
                [productId, safeName]
            );

            if (parseInt(recentCheck.rows[0].count) >= 3) {
                client.release();
                return res.status(429).json({ result: 'error', message: 'আপনি ইতিমধ্যে রিভিউ দিয়েছেন। ২৪ ঘণ্টা পরে আবার চেষ্টা করুন।' });
            }

            // Insert review
            await client.query(
                `INSERT INTO reviews (product_id, reviewer_name, rating, comment) 
                 VALUES ($1, $2, $3, $4)`,
                [productId, safeName, ratingNum, safeComment]
            );

            client.release();
            return res.status(201).json({ result: 'success', message: 'রিভিউ সফলভাবে জমা হয়েছে!' });
        }

        client.release();
        return res.status(405).json({ result: 'error', message: 'Method not allowed' });

    } catch (err) {
        if (client) client.release();
        console.error('Reviews API error:', err);
        return res.status(500).json({ result: 'error', message: 'Server error' });
    }
};
