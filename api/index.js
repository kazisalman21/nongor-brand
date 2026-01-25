const { Client } = require('pg');

// Vercel Serverless Function (Standard Node.js HTTP)
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');

    // --- AUTH HELPER ---
    const users = {
        'admin': process.env.ADMIN_PASSWORD || 'nongor@2025',
        'manager': 'nongor@1234'
    };

    const isAuthenticated = (req) => {
        const user = req.headers['x-admin-user'];
        const pass = req.headers['x-admin-pass'];
        // Legacy fallback
        const legacyPass = req.headers['x-admin-password'];

        if (legacyPass && (legacyPass === process.env.ADMIN_PASSWORD || legacyPass === 'nongor1234')) return true;
        if (user && users[user] && users[user] === pass) return true;
        return false;
    };

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
            // Login Check
            if (query.action === 'login') {
                if (isAuthenticated(req)) {
                    return res.status(200).json({ result: 'success', message: 'Logged in' });
                } else {
                    return res.status(401).json({ result: 'error', message: 'Invalid Credentials' });
                }
            }

            if (!process.env.NETLIFY_DATABASE_URL) {
                throw new Error("Missing NETLIFY_DATABASE_URL");
            }

            client = new Client({
                connectionString: process.env.NETLIFY_DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            await client.connect();

            // Tracking
            if (query.orderId) {
                const result = await client.query('SELECT * FROM orders WHERE order_id = $1', [query.orderId]);
                await client.end();

                if (result.rows.length > 0) {
                    return res.status(200).json({ result: 'success', data: result.rows[0] });
                } else {
                    return res.status(404).json({ result: 'error', message: 'Order not found' });
                }
            }

            // Admin
            if (query.action === 'getAllOrders') {
                if (!isAuthenticated(req)) {
                    await client.end();
                    return res.status(401).json({ result: 'error', message: 'Unauthorized' });
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

            // Determine Initial Statuses
            let initialDelivery = 'Pending';
            let initialPayment = 'Unpaid';

            if (data.paymentMethod === 'Bkash' || data.paymentMethod === 'Nagad' || data.paymentMethod === 'Bank') {
                initialPayment = 'Verifying';
            } else if (data.paymentMethod === 'COD') {
                initialPayment = 'Due';
            }

            // Connect DB
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

            // Ensure table
            // Added payment_status, delivery_status
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

            // --- Auto-Migration for Old Tables ---
            try {
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_price NUMERIC;`);
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS size TEXT;`);
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER;`);
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS sender_number TEXT;`);
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS trx_id TEXT;`);

                // New Columns
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'Pending';`);
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Unpaid';`);

                // --- BACKFILL: Sync old 'status' to new columns if they are empty (simplistic check) ---
                // We'll trust new columns will populate for new orders. For old ones, we can just leave them or basic map.
                // Let's do a simple update for nulls to default.
                // Not doing complex backfill here to keep it fast, unless requested.

            } catch (err) {
                console.warn("Migration warning:", err.message);
            }

            const insertQuery = `
                INSERT INTO orders 
                (order_id, customer_name, phone, address, product_name, total_price, status, delivery_status, payment_status, trx_id, payment_method, delivery_date, size, quantity, sender_number)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `;

            // We still save 'status' as 'Pending' for backward campatibility if needed, or just map delivery status to it.
            const values = [
                data.orderId,
                data.customerName,
                data.customerPhone,
                data.address,
                data.productName,
                data.totalPrice,
                initialDelivery, // Mapping status to delivery status for legacy
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

            if (!isAuthenticated(req)) {
                await client.end();
                return res.status(401).json({ error: 'Unauthorized' });
            }

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

            // Ensure columns exist (Migration) in case it wasn't run by a POST yet
            try {
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'Pending';`);
                await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Unpaid';`);
            } catch (err) { }

            // Handle Specific Updates
            if (data.type === 'delivery') {
                await client.query('UPDATE orders SET delivery_status = $1, status = $2 WHERE order_id = $3', [data.status, data.status, data.orderId]);
            } else if (data.type === 'payment') {
                await client.query('UPDATE orders SET payment_status = $1 WHERE order_id = $2', [data.status, data.orderId]);
            } else {
                // Fallback / Legacy
                await client.query('UPDATE orders SET status = $1, delivery_status = $2 WHERE order_id = $3', [data.status, data.status, data.orderId]);
            }

            await client.end();
            return res.status(200).json({ result: 'success' });
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
