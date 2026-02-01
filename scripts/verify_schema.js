require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    const client = await pool.connect();
    try {
        console.log('🔍 Verifying Schema...');

        const resOrders = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='orders' AND column_name='customer_email';
        `);

        if (resOrders.rows.length > 0) {
            console.log('✅ orders.customer_email exists.');
        } else {
            console.error('❌ orders.customer_email MISSING.');
        }

        const resProducts = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='products' AND column_name='stock_quantity';
        `);

        if (resProducts.rows.length > 0) {
            console.log('✅ products.stock_quantity exists.');
        } else {
            console.error('❌ products.stock_quantity MISSING.');
        }

    } catch (err) {
        console.error('Verify failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

verify();
