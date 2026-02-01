require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function updateSchema() {
    const client = await pool.connect();
    try {
        console.log('🔄 Checking database schema...');

        // 1. Add email column to orders
        console.log('🔄 Adding customer_email to orders table...');
        await client.query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
        `);
        console.log('✅ orders.customer_email column checked/added.');

        // 2. Add stock_quantity to products
        console.log('🔄 Adding stock_quantity to products table...');
        await client.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
        `);
        console.log('✅ products.stock_quantity column checked/added.');

        // 3. Add email column index
        await client.query(`
             CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
        `);
        console.log('✅ Index added on customer_email.');

        console.log('🎉 Schema update completed successfully!');
    } catch (err) {
        console.error('❌ Schema update failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

updateSchema();
