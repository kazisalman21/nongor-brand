require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL + "?sslmode=require",
});

async function migrate() {
    console.log('🚀 Starting Phase 4 Migration: Operations...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create order_events table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS order_events (
                id SERIAL PRIMARY KEY,
                order_id TEXT NOT NULL,
                event_type TEXT NOT NULL, -- 'status_change', 'note', 'email_sent'
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT DEFAULT 'system'
            );
        `;
        console.log('Executing: CREATE TABLE order_events');
        await client.query(createTableQuery);

        // Add index
        console.log('Executing: CREATE INDEX idx_order_events_order_id');
        await client.query('CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id)');

        await client.query('COMMIT');
        console.log('✅ Migration Phase 4 Success!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration Failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
