const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL is not set.');
    process.exit(1);
}

async function updateSchema() {
    const client = new Client({ connectionString });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected!');

        // Add tracking_token column
        console.log('Adding tracking_token column...');
        await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE');
        console.log('✅ Column added!');

        // Generate tokens for existing orders (optional, but good for consistency)
        console.log('Generating tokens for existing orders...');
        const res = await client.query('SELECT order_id FROM orders WHERE tracking_token IS NULL');

        // We use a simple update loop here. For huge datasets, this should be better optimized.
        const crypto = require('crypto');
        for (const row of res.rows) {
            const token = crypto.randomBytes(16).toString('hex');
            await client.query('UPDATE orders SET tracking_token = $1 WHERE order_id = $2', [token, row.order_id]);
        }
        console.log(`✅ Updated ${res.rowCount} existing orders.`);

        console.log('\n🎉 Database update complete!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

updateSchema();
