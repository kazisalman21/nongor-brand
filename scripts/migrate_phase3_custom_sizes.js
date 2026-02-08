require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL + "?sslmode=require",
});

async function migrate() {
    console.log('🚀 Starting Phase 3 Migration: Custom Sizing...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Add columns to order_items
        const queries = [
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size_type TEXT DEFAULT 'standard'`, // 'standard' or 'custom'
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size_label TEXT`, // e.g. 'XL' or 'Custom'
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS measurement_unit TEXT DEFAULT 'inch'`, // 'inch' or 'cm'
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS measurements JSONB`, // { bust: 40, ... }
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS measurement_notes TEXT`
        ];

        for (const q of queries) {
            console.log(`Executing: ${q}`);
            await client.query(q);
        }

        await client.query('COMMIT');
        console.log('✅ Migration Phase 3 Success!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration Failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
