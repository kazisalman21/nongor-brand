const { Client } = require('pg');
// Note: JWT removed - using session-based auth

// Vercel Serverless Function (Standard Node.js HTTP)
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-password, x-admin-user, x-admin-pass, x-admin-secret');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    const JWT_SECRET = process.env.JWT_SECRET;

    // --- AUTH HELPERS ---
    async function verifySession(req, client) {
        const sessionToken = req.headers['x-session-token'] ||
            req.headers['authorization']?.replace('Bearer ', '');

        if (!sessionToken) {
            return { valid: false, error: 'No session token' };
        }

        try {
            const result = await client.query('SELECT * FROM auth.verify_session_v3($1::TEXT)', [sessionToken]);

            if (result.rows.length === 0) {
                return { valid: false, error: 'Invalid session' };
            }

            return {
                valid: true,
                user: {
                    id: result.rows[0].user_id,
                    email: result.rows[0].res_email,
                    role: result.rows[0].res_role,
                    fullName: result.rows[0].res_full_name
                }
            };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    let client;

    try {
        const method = req.method;
        const query = req.query || {};
        const body = req.body || {};

        // --- 1. GET REQUESTS ---
        if (method === 'GET') {
            // Login handled by api/auth.js now

            if (!process.env.NETLIFY_DATABASE_URL) {
                throw new Error("Missing NETLIFY_DATABASE_URL");
            }

            client = new Client({
                connectionString: process.env.NETLIFY_DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            await client.connect();

            // --- GET PRODUCTS (Public) ---
            if (query.action === 'getProducts') {
                // Ensure products table exists (Keeping this logic as is for now)
                await client.query(`
                    CREATE TABLE IF NOT EXISTS products (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        price DECIMAL(10,2) NOT NULL,
                        image TEXT,
                        description TEXT,
                        category_slug VARCHAR(100),
                        category_name VARCHAR(100),
                        is_featured BOOLEAN DEFAULT false,
                        is_active BOOLEAN DEFAULT true,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                `);

                const result = await client.query('SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC');
                await client.end();
                return res.status(200).json({ result: 'success', data: result.rows });
            }

            if (query.action === 'getAllProducts') {
                const auth = await verifySession(req, client);
                if (!auth.valid) {
                    await client.end();
                    return res.status(401).json({ result: 'error', message: 'Unauthorized: ' + auth.error });
                }

                // Check role
                if (auth.user.role !== 'admin') {
                    await client.end();
                    return res.status(403).json({ result: 'error', message: 'Forbidden: Admin access required' });
                }

                const result = await client.query('SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC');
                await client.end();
                return res.status(200).json({ result: 'success', data: result.rows });
            }

            // Tracking (Public)
            if (query.orderId) {
                const result = await client.query('SELECT * FROM orders WHERE order_id = $1', [query.orderId]);
                await client.end();

                if (result.rows.length > 0) {
                    return res.status(200).json({ result: 'success', data: result.rows[0] });
                } else {
                    return res.status(404).json({ result: 'error', message: 'Order not found' });
                }
            }

            // Admin - Get All Orders
            if (query.action === 'getAllOrders') {
                const auth = await verifySession(req, client);
                if (!auth.valid) {
                    await client.end();
                    return res.status(401).json({ result: 'error', message: 'Unauthorized: ' + auth.error });
                }

                if (auth.user.role !== 'admin') {
                    await client.end();
                    return res.status(403).json({ result: 'error', message: 'Forbidden: Admin access required' });
                }

                const result = await client.query('SELECT * FROM orders ORDER BY created_at DESC');
                await client.end();
                return res.status(200).json({ result: 'success', data: result.rows });
            }

            await client.end();
            return res.status(200).json({ message: 'API Ready' });
        }

        // --- 2. POST REQUESTS ---
        if (method === 'POST') {
            const data = typeof body === 'string' ? JSON.parse(body) : body;

            // Connect DB if not connected
            if (!client) {
                if (!process.env.NETLIFY_DATABASE_URL) {
                    throw new Error("Missing NETLIFY_DATABASE_URL");
                }
                client = new Client({
                    connectionString: process.env.NETLIFY_DATABASE_URL,
                    ssl: { rejectUnauthorized: false }
                });
                await client.connect();
            }

            // --- ADD PRODUCT (Protected) ---
            if (query.action === 'addProduct') {
                const auth = await verifySession(req, client);
                if (!auth.valid) {
                    await client.end();
                    return res.status(401).json({ result: 'error', message: 'Forbidden: ' + auth.error });
                }
                if (auth.user.role !== 'admin') {
                    await client.end();
                    return res.status(403).json({ result: 'error', message: 'Forbidden: Admin access required' });
                }

                // Ensure products table exists
                await client.query(`
                    CREATE TABLE IF NOT EXISTS products (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        price DECIMAL(10,2) NOT NULL,
                        image TEXT,
                        description TEXT,
                        category_slug VARCHAR(100),
                        category_name VARCHAR(100),
                        is_featured BOOLEAN DEFAULT false,
                        is_active BOOLEAN DEFAULT true,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                `);

                // Validate product data
                if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
                    await client.end();
                    return res.status(400).json({ result: 'error', message: 'Product name is required' });
                }
                if (data.name.length > 255) {
                    await client.end();
                    return res.status(400).json({ result: 'error', message: 'Product name too long (maximum 255 characters)' });
                }
                if (!data.price || isNaN(data.price) || parseFloat(data.price) <= 0) {
                    await client.end();
                    return res.status(400).json({ result: 'error', message: 'Valid price greater than 0 is required' });
                }
                if (!data.category_slug || !data.category_name) {
                    await client.end();
                    return res.status(400).json({ result: 'error', message: 'Product category is required' });
                }
                // Sanitize
                data.name = data.name.trim();
                data.description = (data.description || '').trim();

                const insertQuery = `
                    INSERT INTO products (name, price, image, images, description, category_slug, category_name, is_featured)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                `;
                const values = [
                    data.name,
                    data.price,
                    data.image || '',
                    data.images || [],
                    data.description || '',
                    data.category_slug || '',
                    data.category_name || '',
                    data.is_featured || false
                ];

                const result = await client.query(insertQuery, values);
                await client.end();
                return res.status(200).json({ result: 'success', message: 'Product added', data: result.rows[0] });
            }

            // --- CREATE ORDER (Legacy, Public) ---
            // ... (Order creation remains public)
            // Determine Initial Statuses
            let initialDelivery = 'Pending';
            let initialPayment = 'Unpaid';

            if (data.paymentMethod === 'Bkash' || data.paymentMethod === 'Nagad' || data.paymentMethod === 'Bank') {
                initialPayment = 'Verifying';
            } else if (data.paymentMethod === 'COD') {
                initialPayment = 'Due';
            }

            // Ensure orders table
            await client.query(`
                CREATE TABLE IF NOT EXISTS orders (
                    order_id TEXT PRIMARY KEY,
                    customer_name TEXT,
                    phone TEXT,
                    address TEXT,
                    product_name TEXT,
                    total_price NUMERIC,
                    status TEXT DEFAULT 'Pending',
                    delivery_status TEXT DEFAULT 'Pending',
                    payment_status TEXT DEFAULT 'Unpaid',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    payment_method TEXT DEFAULT 'COD',
                    trx_id TEXT,
                    sender_number TEXT,
                    delivery_date TEXT,
                    size TEXT,
                    quantity INTEGER
                );
            `);

            // Auto-Migration for Old Tables
            try {
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_price NUMERIC;`);
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS size TEXT;`);
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER;`);
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS sender_number TEXT;`);
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS trx_id TEXT;`);
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'Pending';`);
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Unpaid';`);
            } catch (err) {
                console.warn("Migration warning:", err.message);
            }

            const insertQuery = `
                INSERT INTO orders 
                (order_id, customer_name, phone, address, product_name, total_price, status, delivery_status, payment_status, trx_id, payment_method, delivery_date, size, quantity, sender_number)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `;

            const values = [
                data.orderId,
                data.customerName,
                data.customerPhone,
                data.address,
                data.productName,
                data.totalPrice,
                initialDelivery,
                initialDelivery,
                initialPayment,
                data.trxId || '',
                data.paymentMethod,
                data.deliveryDate,
                data.size,
                data.quantity,
                data.senderNumber || ''
            ];

            await client.query(insertQuery, values);
            await client.end();

            return res.status(200).json({ result: 'success', message: 'Order Placed' });
        }

        // --- 3. PUT REQUESTS ---
        if (method === 'PUT') {
            const data = typeof body === 'string' ? JSON.parse(body) : body;

            if (!client) {
                if (!process.env.NETLIFY_DATABASE_URL) {
                    throw new Error("Missing NETLIFY_DATABASE_URL");
                }
                client = new Client({
                    connectionString: process.env.NETLIFY_DATABASE_URL,
                    ssl: { rejectUnauthorized: false }
                });
                await client.connect();
            }

            // --- UPDATE PRODUCT (Protected) ---
            if (query.action === 'updateProduct') {
                const auth = await verifySession(req, client);
                if (!auth.valid) {
                    await client.end();
                    return res.status(401).json({ result: 'error', message: 'Forbidden: ' + auth.error });
                }
                if (auth.user.role !== 'admin') {
                    await client.end();
                    return res.status(403).json({ result: 'error', message: 'Forbidden: Admin access required' });
                }

                const updateQuery = `
                    UPDATE products 
                    SET name = $1, price = $2, image = $3, images = $4, description = $5, 
                    category_slug = $6, category_name = $7, is_featured = $8, 
                    is_active = $9, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $10
                    RETURNING *
                `;
                const values = [
                    data.name,
                    data.price,
                    data.image || '',
                    data.images || [],
                    data.description || '',
                    data.category_slug || '',
                    data.category_name || '',
                    data.is_featured || false,
                    data.is_active !== false,
                    data.id
                ];

                const result = await client.query(updateQuery, values);
                await client.end();

                if (result.rows.length > 0) {
                    return res.status(200).json({ result: 'success', message: 'Product updated', data: result.rows[0] });
                } else {
                    return res.status(404).json({ result: 'error', message: 'Product not found' });
                }
            }

            // --- UPDATE ORDER STATUS (Protected) ---
            const auth = await verifySession(req, client);
            if (!auth.valid) {
                await client.end();
                return res.status(401).json({ error: 'Unauthorized: ' + auth.error });
            }
            if (auth.user.role !== 'admin') {
                await client.end();
                return res.status(403).json({ result: 'error', message: 'Forbidden: Admin access required' });
            }

            try {
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'Pending';`);
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Unpaid';`);
            } catch (err) { }

            if (data.type === 'delivery') {
                await client.query('UPDATE orders SET delivery_status = $1, status = $2 WHERE order_id = $3', [data.status, data.status, data.orderId]);
            } else if (data.type === 'payment') {
                await client.query('UPDATE orders SET payment_status = $1 WHERE order_id = $2', [data.status, data.orderId]);
            } else {
                await client.query('UPDATE orders SET status = $1, delivery_status = $2 WHERE order_id = $3', [data.status, data.status, data.orderId]);
            }

            await client.end();
            return res.status(200).json({ result: 'success' });
        }

        // --- 4. DELETE REQUESTS ---
        if (method === 'DELETE') {
            // --- DELETE PRODUCT (Protected) ---
            // Need to connect first for DELETE as it doesn't have auto-connect block in original code? 
            // Original code: if (!client) connect...
            // Logic check: The original code logic for DELETE checked auth BEFORE connecting (using verifyAdminToken which was sync and JWT only).
            // Now verifySession needs DB. So we MUST connect before auth.

            if (!client) {
                if (!process.env.NETLIFY_DATABASE_URL) {
                    throw new Error("Missing NETLIFY_DATABASE_URL");
                }
                client = new Client({
                    connectionString: process.env.NETLIFY_DATABASE_URL,
                    ssl: { rejectUnauthorized: false }
                });
                await client.connect();
            }

            const auth = await verifySession(req, client);
            if (!auth.valid) {
                await client.end();
                return res.status(401).json({ result: 'error', message: 'Forbidden: ' + auth.error });
            }
            if (auth.user.role !== 'admin') {
                await client.end();
                return res.status(403).json({ result: 'error', message: 'Forbidden: Admin access required' });
            }

            const productId = query.id;
            if (!productId) {
                return res.status(400).json({ result: 'error', message: 'Product ID required' });
            }

            // Client already connected above at line 381-390

            // Soft delete by setting is_active to false
            const result = await client.query('UPDATE products SET is_active = false WHERE id = $1 RETURNING *', [productId]);
            await client.end();

            if (result.rows.length > 0) {
                return res.status(200).json({ result: 'success', message: 'Product deleted' });
            } else {
                return res.status(404).json({ result: 'error', message: 'Product not found' });
            }
        }

        if (client) await client.end();
        return res.status(405).json({ error: 'Method Not Allowed' });

    } catch (error) {
        console.error("API Error:", error);
        if (client) {
            try { await client.end(); } catch (e) { }
        }
        return res.status(500).json({
            result: 'error',
            message: 'Internal Server Error: ' + error.message
        });
    }
};
