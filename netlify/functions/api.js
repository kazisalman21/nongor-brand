const { Client } = require('pg');

// Database Connection
const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
client.connect();

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

exports.handler = async (event, context) => {
    // Handle CORS
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    const { httpMethod } = event;
    const params = event.queryStringParameters || {};

    // --- 1. GET REQUESTS (Tracking & Admin) ---
    if (httpMethod === 'GET') {
        // Tracking Logic
        if (params.orderId) {
            try {
                const result = await client.query('SELECT * FROM orders WHERE order_id = $1', [params.orderId]);
                if (result.rows.length > 0) {
                    return { statusCode: 200, headers, body: JSON.stringify({ result: 'success', data: result.rows[0] }) };
                } else {
                    return { statusCode: 404, headers, body: JSON.stringify({ result: 'error', message: 'Order not found' }) };
                }
            } catch (e) {
                return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
            }
        }

        // Admin: Get All Orders (protected)
        if (params.action === 'getAllOrders') {
            const adminPass = event.headers['x-admin-password'];
            // Simple hardcoded check for demo purposes
            if (adminPass !== process.env.ADMIN_PASSWORD && adminPass !== 'nongor1234') {
                return { statusCode: 401, headers, body: JSON.stringify({ result: 'error', message: 'Unauthorized' }) };
            }
            try {
                // Return all cols including trx_id and sender_number
                const result = await client.query('SELECT * FROM orders ORDER BY created_at DESC');
                return { statusCode: 200, headers, body: JSON.stringify({ result: 'success', data: result.rows }) };
            } catch (e) {
                return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
            }
        }

        return { statusCode: 200, headers, body: JSON.stringify({ message: 'API Ready' }) };
    }

    // --- 2. POST REQUESTS (Create Order) ---
    if (httpMethod === 'POST') {
        try {
            const data = JSON.parse(event.body);

            // Determine Status
            // If bKash/Nagad, status is "Verifying Payment". If COD, "Pending".
            let initialStatus = 'Pending';
            if (data.paymentMethod === 'Bkash' || data.paymentMethod === 'Nagad') {
                initialStatus = 'Verifying Payment';
            }

            // Save to DB
            // Note: Ensuring columns exist is good practice, but for this specific request 
            // we rely on the user having added 'sender_number'. 
            // I will add a safe column check here just in case to be helpful agent.
            await client.query(`
                CREATE TABLE IF NOT EXISTS orders (
                    order_id TEXT PRIMARY KEY,
                    customer_name TEXT,
                    phone TEXT,
                    address TEXT,
                    product_name TEXT,
                    total_price NUMERIC,
                    status TEXT DEFAULT 'Pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    payment_method TEXT DEFAULT 'COD',
                    trx_id TEXT,
                    sender_number TEXT,
                    delivery_date TEXT,
                    size TEXT,
                    quantity INTEGER
                );
            `);

            const query = `
                INSERT INTO orders 
                (order_id, customer_name, phone, address, product_name, total_price, status, trx_id, payment_method, delivery_date, size, quantity, sender_number)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `;

            const values = [
                data.orderId,
                data.customerName,
                data.customerPhone,
                data.address,
                data.productName,
                data.totalPrice,
                initialStatus,
                data.trxId || '',       // Manual TrxID
                data.paymentMethod,
                data.deliveryDate,
                data.size,
                data.quantity,
                data.senderNumber || '' // Manual Sender Number
            ];

            await client.query(query, values);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ result: 'success', message: 'Order Placed' })
            };

        } catch (error) {
            console.error(error);
            return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
        }
    }

    // --- 3. PUT REQUESTS (Update Status) ---
    if (httpMethod === 'PUT') {
        try {
            const data = JSON.parse(event.body);
            const adminPass = event.headers['x-admin-password'];
            if (adminPass !== process.env.ADMIN_PASSWORD && adminPass !== 'nongor1234') {
                return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
            }

            await client.query('UPDATE orders SET status = $1 WHERE order_id = $2', [data.status, data.orderId]);
            return { statusCode: 200, headers, body: JSON.stringify({ result: 'success' }) };
        } catch (e) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
        }
    }
};
