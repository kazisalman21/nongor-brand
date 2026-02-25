/**
 * Blog API Handler
 * Handles blog post CRUD operations
 */
const pool = require('./db');
const { sanitizeObject } = require('./sanitize');

module.exports = async (req, res) => {
    const { setSecureCorsHeaders } = require('./cors');
    setSecureCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    let client;
    try {
        const method = req.method;
        const query = sanitizeObject(req.query || {});
        let rawBody = req.body || {};
        if (typeof rawBody === 'string') {
            try { rawBody = JSON.parse(rawBody); } catch (e) { }
        }
        const body = sanitizeObject(rawBody);

        client = await pool.connect();

        // ========== GET ==========
        if (method === 'GET') {

            // --- Get all published posts ---
            if (query.action === 'getPosts') {
                const limit = parseInt(query.limit) || 20;
                const offset = parseInt(query.offset) || 0;
                const tag = query.tag || null;

                let sql = `SELECT id, title, slug, excerpt, cover_image, author, tags, views, created_at 
                           FROM blog_posts WHERE is_published = true`;
                const params = [];
                let paramCount = 1;

                if (tag) {
                    sql += ` AND $${paramCount} = ANY(tags)`;
                    params.push(tag);
                    paramCount++;
                }

                sql += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
                params.push(limit, offset);

                const result = await client.query(sql, params);

                // Get total count
                let countSql = 'SELECT COUNT(*) FROM blog_posts WHERE is_published = true';
                const countParams = [];
                if (tag) {
                    countSql += ' AND $1 = ANY(tags)';
                    countParams.push(tag);
                }
                const countResult = await client.query(countSql, countParams);

                client.release();
                return res.status(200).json({
                    result: 'success',
                    data: result.rows,
                    total: parseInt(countResult.rows[0].count),
                    limit,
                    offset
                });
            }

            // --- Get single post by slug ---
            if (query.action === 'getPost') {
                const slug = query.slug;
                if (!slug) {
                    client.release();
                    return res.status(400).json({ result: 'error', message: 'Slug is required' });
                }

                const result = await client.query(
                    `SELECT * FROM blog_posts WHERE slug = $1 AND is_published = true`,
                    [slug]
                );

                if (result.rows.length === 0) {
                    client.release();
                    return res.status(404).json({ result: 'error', message: 'Post not found' });
                }

                // Increment views
                await client.query('UPDATE blog_posts SET views = views + 1 WHERE slug = $1', [slug]);

                client.release();
                return res.status(200).json({ result: 'success', data: result.rows[0] });
            }

            // --- Admin: Get all posts (including drafts) ---
            if (query.action === 'getAllPosts') {
                // Auth check would go here
                const result = await client.query(
                    'SELECT id, title, slug, excerpt, is_published, views, created_at, updated_at FROM blog_posts ORDER BY created_at DESC'
                );
                client.release();
                return res.status(200).json({ result: 'success', data: result.rows });
            }
        }

        // ========== POST ==========
        if (method === 'POST') {
            const action = body.action;

            // --- Create blog post ---
            if (action === 'createPost') {
                const { title, slug, excerpt, content, cover_image, author, tags, meta_title, meta_description, is_published } = body;

                if (!title || !slug || !content) {
                    client.release();
                    return res.status(400).json({ result: 'error', message: 'Title, slug, and content are required' });
                }

                const result = await client.query(
                    `INSERT INTO blog_posts (title, slug, excerpt, content, cover_image, author, tags, meta_title, meta_description, is_published)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     RETURNING id, slug`,
                    [title, slug, excerpt || '', content, cover_image || '', author || 'নোঙর টিম', tags || [], meta_title || title, meta_description || excerpt || '', is_published || false]
                );

                client.release();
                return res.status(201).json({ result: 'success', data: result.rows[0] });
            }

            // --- Update blog post ---
            if (action === 'updatePost') {
                const { id, title, slug, excerpt, content, cover_image, author, tags, meta_title, meta_description, is_published } = body;

                if (!id) {
                    client.release();
                    return res.status(400).json({ result: 'error', message: 'Post ID is required' });
                }

                const result = await client.query(
                    `UPDATE blog_posts SET 
                        title = COALESCE($2, title),
                        slug = COALESCE($3, slug),
                        excerpt = COALESCE($4, excerpt),
                        content = COALESCE($5, content),
                        cover_image = COALESCE($6, cover_image),
                        author = COALESCE($7, author),
                        tags = COALESCE($8, tags),
                        meta_title = COALESCE($9, meta_title),
                        meta_description = COALESCE($10, meta_description),
                        is_published = COALESCE($11, is_published),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    RETURNING id, slug`,
                    [id, title, slug, excerpt, content, cover_image, author, tags, meta_title, meta_description, is_published]
                );

                if (result.rows.length === 0) {
                    client.release();
                    return res.status(404).json({ result: 'error', message: 'Post not found' });
                }

                client.release();
                return res.status(200).json({ result: 'success', data: result.rows[0] });
            }

            // --- Delete blog post ---
            if (action === 'deletePost') {
                const { id } = body;
                if (!id) {
                    client.release();
                    return res.status(400).json({ result: 'error', message: 'Post ID is required' });
                }

                await client.query('DELETE FROM blog_posts WHERE id = $1', [id]);
                client.release();
                return res.status(200).json({ result: 'success', message: 'Post deleted' });
            }
        }

        // No matching action
        if (client) client.release();
        return res.status(400).json({ result: 'error', message: 'Invalid blog action' });

    } catch (error) {
        console.error('Blog API Error:', error);
        if (client) client.release();
        return res.status(500).json({ result: 'error', message: error.message });
    }
};
