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

        // Create coupons table
        console.log('Creating coupons table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
                discount_value DECIMAL(10,2) NOT NULL,
                min_order_value DECIMAL(10,2) DEFAULT 0,
                max_discount_amount DECIMAL(10,2),
                expires_at TIMESTAMP,
                usage_limit INTEGER,
                usage_count INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Coupons table created!');

        // Add coupon columns to orders table
        console.log('Adding coupon columns to orders table...');
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50)`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0`);
        console.log('✅ Order columns added!');

        // Insert some sample coupons
        console.log('Inserting sample coupons...');
        await client.query(`
            INSERT INTO coupons (code, discount_type, discount_value, min_order_value, is_active)
            VALUES 
                ('WELCOME10', 'percent', 10, 500, true),
                ('SAVE50', 'fixed', 50, 1000, true)
            ON CONFLICT (code) DO NOTHING
        `);
        console.log('✅ Sample coupons inserted!');

        console.log('\n🎉 Database update complete!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

updateSchema();
