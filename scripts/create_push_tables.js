/**
 * Database Migration: Push Notification Tables
 * Creates push_subscriptions and notification_log tables
 * Run: node scripts/create_push_tables.js
 */
const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL is not set.');
    process.exit(1);
}

async function createPushTables() {
    const client = new Client({ connectionString });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected!');

        // ─── Table 1: push_subscriptions ───
        console.log('Creating push_subscriptions table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id SERIAL PRIMARY KEY,
                endpoint TEXT UNIQUE NOT NULL,
                keys_p256dh TEXT NOT NULL,
                keys_auth TEXT NOT NULL,
                topics TEXT[] DEFAULT '{orders,arrivals,offers}',
                user_agent TEXT,
                engagement_score INTEGER DEFAULT 100,
                last_clicked_at TIMESTAMP,
                last_sent_at TIMESTAMP,
                total_sent INTEGER DEFAULT 0,
                total_clicked INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ push_subscriptions table created!');

        // Index on endpoint for fast lookups
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions (endpoint)
        `);
        console.log('✅ Index on endpoint created!');

        // Index on active + topics for filtered broadcasts
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_push_active_topics ON push_subscriptions (is_active) WHERE is_active = TRUE
        `);
        console.log('✅ Partial index on active subscriptions created!');

        // ─── Table 2: notification_log ───
        console.log('Creating notification_log table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS notification_log (
                id SERIAL PRIMARY KEY,
                type VARCHAR(30) DEFAULT 'broadcast',
                title TEXT NOT NULL,
                body TEXT,
                image_url TEXT,
                action_url TEXT,
                topic VARCHAR(30),
                total_sent INTEGER DEFAULT 0,
                total_delivered INTEGER DEFAULT 0,
                total_clicked INTEGER DEFAULT 0,
                sent_by VARCHAR(50) DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ notification_log table created!');

        console.log('\n🎉 Push notification tables setup complete!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

createPushTables();
