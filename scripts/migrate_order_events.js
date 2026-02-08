const pool = require('../api/db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Beginning migration for order_events table...');

        await client.query('BEGIN');

        // Create Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS order_events (
                id SERIAL PRIMARY KEY,
                order_id VARCHAR(50) NOT NULL,
                event_type VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(100) DEFAULT 'System'
            );
        `);

        // Create Index
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
        `);

        await client.query('COMMIT');
        console.log('Migration successful: order_events table created.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
