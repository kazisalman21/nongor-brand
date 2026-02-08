const pool = require('./db');

async function migrate() {
    console.log('Starting migration: Custom Sizing...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Add columns to order_items
        const queries = [
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size_type TEXT DEFAULT 'standard'`,
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size_label TEXT`,
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS measurement_unit TEXT DEFAULT 'inch'`,
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS measurements JSONB`,
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS measurement_notes TEXT`
        ];

        for (const q of queries) {
            console.log(`Executing: ${q}`);
            await client.query(q);
        }

        await client.query('COMMIT');
        console.log('✅ Migration successful!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
